import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { requireCronAuth } from "@/lib/cron-auth";
import { wrapCronHandler } from "@/lib/cron-run-log";
import { isFeatureDisabled } from "@/lib/admin/classifier-config";
import { scoreReview, persistSentiment } from "@/lib/review-sentiment";

const log = logger("cron:review-sentiment-refresh");

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Daily cron — scores sentiment facets for broker + advisor
 * reviews that don't have a row in review_sentiment_facets yet.
 *
 * Budget-capped: BATCH_LIMIT reviews per run so a provider outage
 * doesn't cost us a giant retry. The next run picks up where this
 * one stopped.
 */
const BATCH_LIMIT = 100;

async function handler(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  if (await isFeatureDisabled("review_sentiment")) {
    return NextResponse.json({ ok: true, skipped: "kill_switch_on" });
  }

  const supabase = createAdminClient();
  const stats = { scored: 0, skipped: 0, failed: 0 };

  // Find the IDs that already have sentiment so we can skip them
  const { data: existing } = await supabase
    .from("review_sentiment_facets")
    .select("review_type, review_id");
  const seen = new Set<string>();
  for (const row of existing || []) {
    seen.add(`${row.review_type as string}:${row.review_id as number}`);
  }

  // ── Broker reviews ──
  const { data: brokerReviews } = await supabase
    .from("user_reviews")
    .select("id, body, title, rating")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(BATCH_LIMIT);

  for (const r of brokerReviews || []) {
    if (seen.has(`user_review:${r.id}`)) continue;
    try {
      const review = {
        review_type: "user_review" as const,
        review_id: r.id as number,
        body: (r.body as string) || "",
        title: (r.title as string | null) || null,
        rating: (r.rating as number | null) || null,
      };
      const result = await scoreReview(review);
      await persistSentiment(review, result);
      stats.scored++;
    } catch (err) {
      stats.failed++;
      log.error("broker review sentiment failed", {
        id: r.id,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // ── Advisor reviews ──
  const { data: advisorReviews } = await supabase
    .from("professional_reviews")
    .select("id, body, title, rating")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(BATCH_LIMIT);

  for (const r of advisorReviews || []) {
    if (seen.has(`professional_review:${r.id}`)) continue;
    try {
      const review = {
        review_type: "professional_review" as const,
        review_id: r.id as number,
        body: (r.body as string) || "",
        title: (r.title as string | null) || null,
        rating: (r.rating as number | null) || null,
      };
      const result = await scoreReview(review);
      await persistSentiment(review, result);
      stats.scored++;
    } catch (err) {
      stats.failed++;
      log.error("advisor review sentiment failed", {
        id: r.id,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  log.info("review sentiment refresh completed", stats);
  return NextResponse.json({ ok: true, ...stats });
}

export const GET = wrapCronHandler("review-sentiment-refresh", handler);
