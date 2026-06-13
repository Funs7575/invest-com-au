/**
 * POST /api/inbound/brief-reply — Reply-by-Email Bridge.
 *
 * Resend inbound delivers replies to brief notification emails here.
 * After the Svix signature and the HMAC reply-address both verify, the
 * stripped reply text is inserted into `brief_messages` via the same
 * `sendMessage()` helper the in-app chat API uses — so Realtime fires
 * identically and the SLA "provider has messaged" exemption counts an
 * emailed reply exactly like an in-app one.
 *
 * ── Ops setup (route is inert until this is done) ────────────────────
 *   1. Env vars:
 *        BRIEF_REPLY_SECRET            — long random string; HMAC key for
 *                                        the reply addresses. Until set,
 *                                        outbound emails carry no Reply-To
 *                                        and this route ignores everything.
 *        BRIEF_REPLY_DOMAIN            — inbound domain (default
 *                                        reply.invest.com.au).
 *        RESEND_INBOUND_WEBHOOK_SECRET — signing secret Resend shows for
 *                                        this webhook endpoint (falls back
 *                                        to RESEND_WEBHOOK_SECRET).
 *   2. Resend dashboard: add BRIEF_REPLY_DOMAIN as a receiving domain
 *      (MX records), then add a webhook for the `email.received` event
 *      pointing at https://invest.com.au/api/inbound/brief-reply and
 *      copy its signing secret into RESEND_INBOUND_WEBHOOK_SECRET.
 *
 * ── Security model ───────────────────────────────────────────────────
 *   - Svix HMAC signature (lib/resend-webhook-verify) proves the POST
 *     came from Resend; its ±5 min timestamp window bounds replays.
 *   - The recipient address carries a per-brief HMAC token
 *     (lib/briefs/reply-address) — unforgeable without BRIEF_REPLY_SECRET,
 *     unreplayable across briefs because the id is inside the MAC.
 *   - The From address must match one of the brief's actual parties
 *     (consumer contact_email, accepted professional, or an active
 *     member of the accepted team). From-spoofing is possible in SMTP,
 *     so this is a soft gate layered on the secret address, the
 *     open+accepted brief checks, and the per-brief rate limit.
 *   - Failure branches answer 200 so a forged or stale email can never
 *     make Resend retry-loop; only config errors (500), bad signatures
 *     (401), malformed JSON (400) and rate limiting (429) are non-2xx.
 *   - At-least-once delivery: a recent identical message from the same
 *     sender kind is treated as a duplicate and skipped.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Service-role is legitimate here: an inbound email webhook is an
// anonymous server path (no user JWT) doing cross-user reads — brief
// lookup + party-email matching against professionals/expert_team_members.
// Allowed per CLAUDE.md § "Two Supabase clients" (webhooks). No
// eslint-disable needed: app/api/** is exempt from the no-restricted-imports
// admin-client guard (see eslint.config.mjs — API routes need elevated access).
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import {
  extractSvixHeaders,
  verifyResendSignature,
} from "@/lib/resend-webhook-verify";
import { isAllowed } from "@/lib/rate-limit-db";
import { verifyBriefReplyRecipients } from "@/lib/briefs/reply-address";
import { extractEmailAddress, extractReplyText } from "@/lib/email-reply-parser";
import {
  BriefMessageError,
  sendMessage,
  type BriefMessageSenderKind,
} from "@/lib/brief-messages";
import { isProfessionalOnTeam } from "@/lib/expert-teams";

const log = logger("inbound:brief-reply");

export const runtime = "nodejs";

/** Window inside which an identical body from the same sender kind is
 *  treated as a webhook redelivery and skipped. */
const DEDUPE_WINDOW_MS = 10 * 60 * 1000;

// Tolerant schema: Resend inbound (`email.received`) sends `from` as an
// RFC 5322 string and `to`/`cc` as string arrays, but we accept minor
// shape drift rather than 4xx-looping the provider on it.
const AddressList = z
  .union([z.string(), z.array(z.string())])
  .nullish()
  .transform((value): string[] =>
    value == null ? [] : Array.isArray(value) ? value : [value],
  );

const InboundEmailEvent = z.object({
  type: z.string(),
  data: z.object({
    from: z
      .union([z.string(), z.object({ email: z.string(), name: z.string().nullish() })])
      .nullish(),
    to: AddressList,
    cc: AddressList,
    bcc: AddressList,
    subject: z.string().nullish(),
    text: z.string().nullish(),
    html: z.string().nullish(),
    email_id: z.string().nullish(),
  }),
});

/** 200 with a machine-readable reason — never tempt Svix into a retry
 *  loop for mail we will never be able to process. */
function ignored(reason: string): NextResponse {
  return NextResponse.json({ received: true, ignored: reason });
}

interface ResolvedSender {
  kind: BriefMessageSenderKind;
  professionalId: number | null;
  teamId: number | null;
}

interface BriefMeta {
  id: number;
  slug: string;
  status: string;
  contact_email: string | null;
  accepted_at: string | null;
  accepted_by_professional_id: number | null;
  accepted_by_team_id: number | null;
}

export async function POST(request: NextRequest) {
  const webhookSecret =
    process.env.RESEND_INBOUND_WEBHOOK_SECRET || process.env.RESEND_WEBHOOK_SECRET;
  if (!webhookSecret) {
    log.error("inbound webhook secret not configured — rejecting");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  // Raw body ONCE — Svix signs the exact bytes.
  const rawBody = await request.text();
  const svixHeaders = extractSvixHeaders(request.headers);
  if (!verifyResendSignature(webhookSecret, rawBody, svixHeaders)) {
    log.warn("rejected: invalid svix signature", { svixId: svixHeaders.svixId });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const parsed = InboundEmailEvent.safeParse(parsedJson);
    if (!parsed.success) {
      log.warn("ignored: payload shape not recognised", {
        svixId: svixHeaders.svixId,
      });
      return ignored("unrecognised_payload");
    }
    const { type, data } = parsed.data;
    if (type !== "email.received") return ignored("not_email_received");

    // ── HMAC reply-address gate ─────────────────────────────────────
    const recipients = [...data.to, ...data.cc, ...data.bcc];
    const addressResult = verifyBriefReplyRecipients(recipients);
    if (!addressResult.ok) {
      // bad_signature = something shaped like our address failed the
      // MAC — log louder than plain misdirected mail.
      if (addressResult.reason === "bad_signature") {
        log.warn("ignored: reply address failed HMAC validation", {
          svixId: svixHeaders.svixId,
        });
      } else {
        log.info("ignored: no valid brief reply address", {
          reason: addressResult.reason,
          svixId: svixHeaders.svixId,
        });
      }
      return ignored(addressResult.reason);
    }
    const briefId = addressResult.briefId;

    // ── Per-brief rate limit (429 → Resend retries with backoff) ───
    if (
      !(await isAllowed("brief_reply_inbound", String(briefId), {
        max: 10,
        refillPerSec: 10 / 60,
      }))
    ) {
      log.warn("rate limited", { briefId });
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    // ── Brief gate: must exist, be open, and be accepted ────────────
    const admin = createAdminClient();
    const { data: briefRaw } = await admin
      .from("advisor_auctions")
      .select(
        "id, slug, status, contact_email, accepted_at, accepted_by_professional_id, accepted_by_team_id",
      )
      .eq("id", briefId)
      .eq("flow_type", "accept")
      .maybeSingle();
    if (!briefRaw) {
      log.warn("ignored: brief not found for valid reply address", { briefId });
      return ignored("brief_not_found");
    }
    const brief = briefRaw as BriefMeta;

    if (brief.status !== "open") {
      // Replaying an old notification email against a closed/expired/
      // withdrawn brief stops here even though the HMAC is forever valid.
      log.info("ignored: brief no longer open", { briefId, status: brief.status });
      return ignored("brief_closed");
    }
    if (!brief.accepted_at) {
      log.info("ignored: brief not yet accepted (no chat)", { briefId });
      return ignored("brief_not_accepted");
    }

    // ── Sender gate: From must be one of the brief's parties ────────
    const fromRaw = typeof data.from === "string" ? data.from : (data.from?.email ?? null);
    const senderEmail = extractEmailAddress(fromRaw);
    if (!senderEmail) {
      log.warn("ignored: no parseable From address", { briefId });
      return ignored("no_sender");
    }
    const sender = await resolveSenderByEmail(senderEmail, brief);
    if (!sender) {
      log.warn("ignored: sender is not a party to the brief", { briefId });
      return ignored("sender_not_party");
    }

    // ── Reply text ──────────────────────────────────────────────────
    const body = extractReplyText({ text: data.text, html: data.html });
    if (body.length === 0) {
      log.info("ignored: empty reply after stripping quotes/signature", { briefId });
      return ignored("empty_reply");
    }

    // ── Dedupe webhook redeliveries (at-least-once delivery) ────────
    const since = new Date(Date.now() - DEDUPE_WINDOW_MS).toISOString();
    const { data: dupe } = await admin
      .from("brief_messages")
      .select("id")
      .eq("brief_id", brief.id)
      .eq("sender_kind", sender.kind)
      .eq("body", body)
      .gte("created_at", since)
      .limit(1);
    if ((dupe ?? []).length > 0) {
      log.info("ignored: duplicate of a recent message", { briefId });
      return ignored("duplicate");
    }

    // ── Insert via the shared chat helper (Realtime fires the same
    //    INSERT event the in-app send path produces; the in-app POST
    //    has no other post-message side-effects to mirror). ──────────
    const row = await sendMessage({
      briefId: brief.id,
      senderKind: sender.kind,
      senderUserId: null, // email replies carry no auth session
      senderProfessionalId: sender.professionalId,
      senderTeamId: sender.teamId,
      body,
    });

    log.info("email reply bridged into brief chat", {
      briefId: brief.id,
      messageId: row.id,
      senderKind: sender.kind,
      bodyLength: body.length,
    });
    return NextResponse.json({ received: true, messageId: row.id });
  } catch (err) {
    if (err instanceof BriefMessageError) {
      // Validation-level insert failure (empty/oversized body) — the
      // email itself is at fault; retrying can never fix it.
      log.warn("ignored: message insert rejected", {
        status: err.status,
        svixId: svixHeaders.svixId,
      });
      return ignored("message_rejected");
    }
    log.error("inbound brief-reply failed", {
      err: err instanceof Error ? err.message : String(err),
    });
    // 500 → Resend retries; right call for transient DB outages.
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}

/**
 * Match the (normalised) sender address against the brief's parties.
 * Mirrors the in-app route's sender resolution: the consumer is the
 * contact_email; the accepted professional sends as 'team' when they
 * accepted on behalf of a team they're still active on, otherwise as
 * 'professional'; any active member of the accepted team sends as 'team'.
 */
async function resolveSenderByEmail(
  senderEmail: string,
  brief: BriefMeta,
): Promise<ResolvedSender | null> {
  if (brief.contact_email && brief.contact_email.toLowerCase() === senderEmail) {
    return { kind: "consumer", professionalId: null, teamId: null };
  }

  const admin = createAdminClient();

  if (brief.accepted_by_professional_id !== null) {
    const { data: pro } = await admin
      .from("professionals")
      .select("id, email")
      .eq("id", brief.accepted_by_professional_id)
      .maybeSingle();
    if (
      pro &&
      typeof pro.email === "string" &&
      pro.email.toLowerCase() === senderEmail
    ) {
      if (
        brief.accepted_by_team_id !== null &&
        (await isProfessionalOnTeam(brief.accepted_by_team_id, pro.id as number))
      ) {
        return {
          kind: "team",
          professionalId: pro.id as number,
          teamId: brief.accepted_by_team_id,
        };
      }
      return { kind: "professional", professionalId: pro.id as number, teamId: null };
    }
  }

  if (brief.accepted_by_team_id !== null) {
    const { data: members } = await admin
      .from("expert_team_members")
      .select("professional_id")
      .eq("team_id", brief.accepted_by_team_id)
      .eq("status", "active");
    const memberIds = (members ?? [])
      .map((m) => m.professional_id as number | null)
      .filter((id): id is number => typeof id === "number");
    if (memberIds.length > 0) {
      const { data: pros } = await admin
        .from("professionals")
        .select("id, email")
        .in("id", memberIds);
      const match = (pros ?? []).find(
        (p) => typeof p.email === "string" && p.email.toLowerCase() === senderEmail,
      );
      if (match) {
        return {
          kind: "team",
          professionalId: match.id as number,
          teamId: brief.accepted_by_team_id,
        };
      }
    }
  }

  return null;
}
