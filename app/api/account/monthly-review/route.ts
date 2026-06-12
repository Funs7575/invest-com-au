/**
 * /api/account/monthly-review — complete the Monthly Money Review.
 *
 * POST records (or amends) the current period's review row in
 * user_reviews_log with a freshly-assembled snapshot. Idempotent: the
 * UNIQUE(user_id, period) constraint means re-completing the same month
 * updates the existing row rather than duplicating it.
 *
 * Gated behind the `monthly_review` feature flag (fail-closed) so the route
 * is inert until the table is applied in prod. Rate-limited and Zod-validated
 * per repo convention. RLS client only — the owner policy scopes the write to
 * auth.uid().
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { isRateLimited } from "@/lib/rate-limit";
import { isFlagEnabled } from "@/lib/feature-flags";
import { loadReviewModel } from "@/lib/monthly-review-data";
import { periodForDate } from "@/lib/monthly-review";
import { logger } from "@/lib/logger";

const log = logger("api:account:monthly-review");

export const runtime = "nodejs";

const Body = z.object({
  // Optional client-asserted period; server recomputes the canonical one and
  // only honours the client value when it matches, so a stale tab can't write
  // to an arbitrary month.
  period: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
});

export const POST = withValidatedBody(Body, async (_req, body) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Fail-closed flag gate.
  const enabled = await isFlagEnabled("monthly_review", {
    userKey: user.email ?? user.id,
    segment: "user",
  });
  if (!enabled) {
    return NextResponse.json({ error: "not_available" }, { status: 404 });
  }

  // Light rate limit — a handful of completions/amendments per hour is plenty.
  if (await isRateLimited(`monthly-review:${user.id}`, 12, 60)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const canonicalPeriod = periodForDate();
  // Only accept the client's period if it's the current one — never let a
  // stale/forged value backfill an arbitrary month.
  const period =
    body.period && body.period === canonicalPeriod ? body.period : canonicalPeriod;

  let model;
  try {
    model = await loadReviewModel(supabase, user.id, { period });
  } catch (err) {
    log.warn("review model assembly failed", {
      userId: user.id,
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "assembly_failed" }, { status: 500 });
  }

  const nowIso = new Date().toISOString();
  const { error } = await supabase.from("user_reviews_log").upsert(
    {
      user_id: user.id,
      period,
      completed_at: nowIso,
      snapshot: model.snapshot,
      updated_at: nowIso,
    },
    { onConflict: "user_id,period" },
  );

  if (error) {
    // Table-absent / RLS / transient — fail soft so the UI can degrade
    // gracefully rather than 500 the user's completion.
    log.warn("review completion write failed", {
      userId: user.id,
      period,
      error: error.message,
    });
    return NextResponse.json({ error: "write_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, period, streak: model.streak });
});
