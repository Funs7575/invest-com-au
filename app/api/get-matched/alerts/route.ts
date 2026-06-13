/**
 * POST /api/get-matched/alerts — Showcase G9 "tell me when my match changes".
 *
 * Inline email capture on the result screen. Rather than stand up a new table
 * (CLAUDE.md DB-migration discipline — no new tables/migrations for this), we
 * reuse the existing `fee_alert_subscriptions` table: the user is subscribed
 * to change alerts on the platform slugs that make up their current top match.
 * If a matched broker's fees / availability change, the existing fee-alert
 * drip infra notifies them — which is exactly "your top match may have
 * changed". Source-tagged so analytics can split get-matched-originated
 * subscriptions from the standalone /fee-alerts flow.
 *
 * Honest copy contract (rendered client-side): "We'll email you if your top
 * match changes. Unsubscribe any time." No advice, no guarantees.
 *
 * Validation: `withValidatedBody` (satisfies invest/no-unvalidated-req-json).
 * Rate-limited like the standalone fee-alerts endpoint.
 *
 * `fee_alert_subscriptions` INSERT is anon-allowed by RLS, but the upsert
 * `onConflict` path needs to read+update an existing row regardless of owner,
 * so we use the server client (carries anon role) — the INSERT policy permits
 * it and there is no PII cross-user concern (keyed by the caller's own email).
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";

import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { createClient } from "@/lib/supabase/server";
import { isRateLimited } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const log = logger("get-matched:alerts");

const AlertSchema = z.object({
  email: z.string().email(),
  /** Platform slugs that make up the current top match (bounded). */
  match_slugs: z.array(z.string().max(120)).max(10).optional(),
  /** Optional plan share token, recorded for attribution only. */
  share_token: z.string().max(120).optional(),
});

export const POST = withValidatedBody(AlertSchema, async (request, body) => {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (await isRateLimited(`gm_match_alert:${ip}`, 5, 60)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  try {
    const supabase = await createClient();
    const unsubscribeToken = randomBytes(16).toString("hex");
    const verifyToken = randomBytes(16).toString("hex");

    const { error } = await supabase.from("fee_alert_subscriptions").upsert(
      {
        email: body.email.toLowerCase().trim(),
        broker_slugs: body.match_slugs ?? [],
        // `alert_type` is constrained to any/increase/decrease — "any" is the
        // correct value for "tell me about any change to my match".
        alert_type: "any",
        frequency: "instant",
        unsubscribe_token: unsubscribeToken,
        verify_token: verifyToken,
        verified: false,
      },
      { onConflict: "email" },
    );

    if (error) {
      log.warn("match-alert subscribe failed", { err: error.message });
      return NextResponse.json(
        { error: "Could not subscribe." },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    log.error("match-alert error", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Could not subscribe." }, { status: 500 });
  }
});
