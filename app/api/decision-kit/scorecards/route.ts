/**
 * POST /api/decision-kit/scorecards — save a post-call scorecard.
 *
 * The Decision Kit lets a consumer rate the SPECIFIC advisers who responded to
 * them (a quote auction's bidders, or an accepted brief's provider) against a
 * small fixed set of criteria after an intro call.
 *
 * Auth: email-as-key, identical to /api/quotes/[slug]/accept and the brief
 * tracker. The consumer submits the email they posted the brief/auction with;
 * we re-verify it server-side against `advisor_auctions.contact_email` before
 * writing. There is no JWT on these anonymous email-link surfaces, so the email
 * re-check IS the gate (the table is service-role-only by design).
 *
 * Flag: gated by `decision_kit`. Fails closed (403) when the flag is off so the
 * write surface can't be hit before the table/migration are live.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { isRateLimited } from "@/lib/rate-limit";
import { isFlagEnabled } from "@/lib/feature-flags";
import { logger } from "@/lib/logger";
// Admin client (allowed in app/api/* per CLAUDE.md § "Two Supabase clients"):
// email-as-key surface with no JWT — we load advisor_auctions by slug + verify
// the owner email server-side (same posture as the brief tracker and
// /api/outcomes/submit). The consumer read here can't be scoped to auth.uid().
import { createAdminClient } from "@/lib/supabase/admin";
import {
  upsertScorecard,
  normaliseOwnerKey,
} from "@/lib/decision-kit/respondents";
import {
  SCORECARD_CRITERION_KEYS,
  SCORECARD_MIN,
  SCORECARD_MAX,
  SCORECARD_NOTES_MAX,
  type ScorecardCriteria,
} from "@/lib/decision-kit/scorecards";

const log = logger("decision-kit:scorecards");

export const runtime = "nodejs";

const Rating = z.number().int().min(SCORECARD_MIN).max(SCORECARD_MAX);

const Body = z.object({
  /** The auction/brief slug (advisor_auctions.slug). */
  slug: z.string().min(1).max(200),
  /** The consumer's contact email — re-verified against the auction. */
  contact_email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.string().email("A valid email is required.").max(254)),
  /** professionals.id of the respondent being scored. */
  professional_id: z.number().int().positive(),
  /** Fixed-key 1-5 ratings; every key optional. */
  criteria: z
    .object(
      Object.fromEntries(
        SCORECARD_CRITERION_KEYS.map((k) => [k, Rating.optional()]),
      ) as Record<(typeof SCORECARD_CRITERION_KEYS)[number], z.ZodOptional<typeof Rating>>,
    )
    .strict()
    .default({}),
  notes: z.string().max(SCORECARD_NOTES_MAX).optional(),
  overall: Rating.optional(),
});

export const POST = withValidatedBody(Body, async (req, body) => {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (await isRateLimited(`decision-kit-scorecard:${ip}`, 30, 10)) {
    return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
  }

  // Flag gate — fail closed. The matrix + scripts render without the flag, but
  // scorecard writes require it (the table may not exist yet otherwise).
  const ownerKey = normaliseOwnerKey(body.contact_email);
  const enabled = await isFlagEnabled("decision_kit", { userKey: ownerKey, segment: "user" });
  if (!enabled) {
    return NextResponse.json({ error: "Scorecards aren't available yet." }, { status: 403 });
  }

  // Verify ownership against the real surface: load the auction by slug and
  // match contact_email. Covers both briefs (flow_type='accept') and quote
  // auctions (source='public_job') — they're the same advisor_auctions table.
  const admin = createAdminClient();
  const { data: auction, error: lookupErr } = await admin
    .from("advisor_auctions")
    .select("id, contact_email")
    .eq("slug", body.slug)
    .maybeSingle();

  if (lookupErr) {
    log.error("auction lookup failed", { error: lookupErr.message });
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
  if (!auction) {
    return NextResponse.json({ error: "Request not found." }, { status: 404 });
  }
  if (normaliseOwnerKey(auction.contact_email as string) !== ownerKey) {
    // Don't reveal whether the email or the slug was wrong.
    return NextResponse.json({ error: "Verification failed." }, { status: 403 });
  }

  const result = await upsertScorecard({
    ownerKey,
    briefId: auction.id as number,
    professionalId: body.professional_id,
    criteria: body.criteria as ScorecardCriteria,
    notes: body.notes?.trim() ? body.notes.trim() : null,
    overall: body.overall ?? null,
  });

  if (!result.ok) {
    if (result.reason === "table_missing") {
      // Migration not yet pushed — degrade gracefully rather than 500.
      log.warn("scorecard table missing; write skipped", { slug: body.slug });
      return NextResponse.json({ error: "Scorecards aren't available yet." }, { status: 503 });
    }
    return NextResponse.json({ error: "Couldn't save your scorecard." }, { status: 500 });
  }

  log.info("scorecard saved", {
    brief_id: auction.id,
    professional_id: body.professional_id,
  });
  return NextResponse.json({ success: true });
});
