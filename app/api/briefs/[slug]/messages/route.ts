import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { SendBriefMessageRequest } from "@/lib/api-schemas";
import {
  BriefMessageError,
  sendMessage,
  type BriefMessageSenderKind,
} from "@/lib/brief-messages";
import { isProfessionalOnTeam } from "@/lib/expert-teams";
import { dispatchPushToAdvisor } from "@/lib/advisor-push";
import { logger } from "@/lib/logger";

const log = logger("api:briefs:messages");

interface ResolvedSender {
  kind: BriefMessageSenderKind;
  userId: string | null;
  professionalId: number | null;
  teamId: number | null;
}

interface BriefMeta {
  id: number;
  contact_email: string | null;
  accepted_at: string | null;
  accepted_by_professional_id: number | null;
  accepted_by_team_id: number | null;
}

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  try {
    // ── Rate limits ─────────────────────────────────────────────────────
    if (
      !(await isAllowed("brief_messages_send_ip", ipKey(request), {
        max: 30,
        refillPerSec: 30 / 60,
      }))
    ) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    const { slug } = await ctx.params;

    // ── Body validation ─────────────────────────────────────────────────
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }
    const parsed = SendBriefMessageRequest.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid body." },
        { status: 400 },
      );
    }

    // ── Brief lookup ────────────────────────────────────────────────────
    const admin = createAdminClient();
    const { data: briefRaw } = await admin
      .from("advisor_auctions")
      .select(
        "id, contact_email, accepted_at, accepted_by_professional_id, accepted_by_team_id",
      )
      .eq("slug", slug)
      .eq("flow_type", "accept")
      .maybeSingle();

    if (!briefRaw) {
      return NextResponse.json({ error: "Brief not found." }, { status: 404 });
    }
    const brief = briefRaw as BriefMeta;

    if (!brief.accepted_at) {
      return NextResponse.json(
        { error: "Chat is not available until the brief has been accepted." },
        { status: 409 },
      );
    }

    // ── Sender resolution ───────────────────────────────────────────────
    const sender = await resolveSender(request, brief);
    if (!sender) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }

    // ── Per-user-per-brief throttle (max 30 messages / min) ─────────────
    const userKey =
      sender.userId ??
      (sender.professionalId ? `pro:${sender.professionalId}` : null) ??
      ipKey(request);
    if (
      !(await isAllowed("brief_messages_send_user", `${brief.id}:${userKey}`, {
        max: 30,
        refillPerSec: 30 / 60,
      }))
    ) {
      return NextResponse.json(
        { error: "You're sending messages too quickly. Try again in a minute." },
        { status: 429 },
      );
    }

    // ── Insert ──────────────────────────────────────────────────────────
    const row = await sendMessage({
      briefId: brief.id,
      senderKind: sender.kind,
      senderUserId: sender.userId,
      senderProfessionalId: sender.professionalId,
      senderTeamId: sender.teamId,
      body: parsed.data.body,
    });

    // ── Push the accepted adviser (Adviser Push Command Centre) ──────────
    // Only consumer → adviser direction; an adviser's own message must not
    // ping themselves. Flag-gated + preference-gated + fail-soft in the
    // helper. Deep-links to the shared brief tracker chat.
    if (sender.kind === "consumer" && brief.accepted_by_professional_id) {
      void dispatchPushToAdvisor(brief.accepted_by_professional_id, "new_message", {
        title: "New message on your brief",
        body: "A consumer replied — open the chat to respond.",
        url: `/briefs/${slug}`,
        tag: `advisor-new_message-${brief.id}`,
      });
    }

    return NextResponse.json({ message: row });
  } catch (err) {
    if (err instanceof BriefMessageError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    log.error("send brief message failed", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Failed to send message." }, { status: 500 });
  }
}

/**
 * Resolve who is sending. Priority:
 *   1. Advisor session → professional. If the brief was accepted by a team
 *      we belong to, send as 'team'; otherwise as 'professional'.
 *   2. Supabase Auth (auth.users) where the email matches contact_email → 'consumer'.
 *
 * Returns null if neither path matches — the route 401s in that case.
 */
async function resolveSender(
  request: NextRequest,
  brief: BriefMeta,
): Promise<ResolvedSender | null> {
  const advisorId = await requireAdvisorSession(request);
  if (advisorId) {
    // Is this advisor the accepted professional?
    if (
      brief.accepted_by_professional_id !== null &&
      brief.accepted_by_professional_id === advisorId
    ) {
      // If they accepted on behalf of a team, send-as 'team' so the
      // consumer sees the team name. Otherwise individual 'professional'.
      if (brief.accepted_by_team_id !== null) {
        const onTeam = await isProfessionalOnTeam(
          brief.accepted_by_team_id,
          advisorId,
        );
        if (onTeam) {
          return {
            kind: "team",
            userId: null,
            professionalId: advisorId,
            teamId: brief.accepted_by_team_id,
          };
        }
      }
      return {
        kind: "professional",
        userId: null,
        professionalId: advisorId,
        teamId: null,
      };
    }
    // Not the accepted lead, but still an active member of the accepted team?
    if (brief.accepted_by_team_id !== null) {
      const onTeam = await isProfessionalOnTeam(
        brief.accepted_by_team_id,
        advisorId,
      );
      if (onTeam) {
        return {
          kind: "team",
          userId: null,
          professionalId: advisorId,
          teamId: brief.accepted_by_team_id,
        };
      }
    }
    // Falls through — advisor is signed in but not on this brief's pro/team
    // side. Could still be the consumer (a pro buying advice for themselves);
    // continue to the consumer-path check below.
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.email && brief.contact_email) {
    if (user.email.toLowerCase() === brief.contact_email.toLowerCase()) {
      return {
        kind: "consumer",
        userId: user.id,
        professionalId: null,
        teamId: null,
      };
    }
  }
  return null;
}
