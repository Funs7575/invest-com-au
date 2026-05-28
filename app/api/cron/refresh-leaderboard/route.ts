import { NextRequest, NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/cron-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { wrapCronHandler } from "@/lib/cron-run-log";

const log = logger("cron-refresh-leaderboard");

export const runtime = "nodejs";
export const maxDuration = 300;

async function handler(req: NextRequest): Promise<NextResponse> {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const admin = createAdminClient();

  const yearMonth = new Date().toISOString().slice(0, 7); // "2026-05"

  // Get all active advisors with their stats
  const { data: advisors } = await admin
    .from("professionals")
    .select(
      "id, rating, review_count, avg_response_minutes, profile_score",
    )
    .eq("status", "active")
    .limit(500);

  if (!advisors || advisors.length === 0) {
    return NextResponse.json({ success: true, ranked: 0 });
  }

  // Get badge counts per professional
  const { data: badgeCounts } = await admin
    .from("advisor_badges")
    .select("professional_id");

  const badgeCountMap: Record<number, number> = {};
  for (const b of badgeCounts ?? []) {
    const pid = b.professional_id as number;
    badgeCountMap[pid] = (badgeCountMap[pid] ?? 0) + 1;
  }

  // Compute composite score for each advisor
  type ScoredAdvisor = {
    professional_id: number;
    score: number;
    review_count: number;
    avg_rating: number | null;
    response_score: number;
    profile_score: number;
    badge_count: number;
  };

  const scored: ScoredAdvisor[] = (
    advisors as {
      id: number;
      rating?: number | null;
      review_count?: number | null;
      avg_response_minutes?: number | null;
      profile_score?: number | null;
    }[]
  ).map((a) => {
    const reviewScore = Math.min(30, (a.review_count ?? 0) * 2);
    const ratingScore = Math.min(30, ((a.rating ?? 0) / 5) * 30);
    const responseScore = a.avg_response_minutes
      ? Math.max(0, 20 - Math.floor(a.avg_response_minutes / 60))
      : 0;
    const profileScore = Math.floor(((a.profile_score ?? 0) / 100) * 10);
    const badgeScore = Math.min(10, (badgeCountMap[a.id] ?? 0) * 2);
    const score =
      reviewScore + ratingScore + responseScore + profileScore + badgeScore;

    return {
      professional_id: a.id,
      score,
      review_count: a.review_count ?? 0,
      avg_rating: a.rating ?? null,
      response_score: responseScore,
      profile_score: a.profile_score ?? 0,
      badge_count: badgeCountMap[a.id] ?? 0,
    };
  });

  scored.sort((a, b) => b.score - a.score);

  // Upsert leaderboard rows
  const rows = scored.map((s, i) => ({
    ...s,
    year_month: yearMonth,
    rank: i + 1,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await admin
    .from("advisor_leaderboard_monthly")
    .upsert(rows, { onConflict: "professional_id,year_month" });

  if (error) {
    log.error("leaderboard upsert failed", { error: error.message });
  }

  log.info("leaderboard refreshed", { yearMonth, ranked: rows.length });
  return NextResponse.json({ success: true, ranked: rows.length });
}

export const GET = wrapCronHandler("refresh-leaderboard", handler);
