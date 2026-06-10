import { NextRequest, NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/cron-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("cron-refresh-leaderboard");

export const runtime = "nodejs";
export const maxDuration = 300;

/** New-column upserts fail until the ecosystem migration lands — detect and
 *  retry with the legacy shape so the leaderboard never goes stale. */
function isMissingColumnError(err: { message?: string; code?: string } | null): boolean {
  if (!err) return false;
  if (err.code === "42703" || err.code === "PGRST204") return true;
  const msg = (err.message ?? "").toLowerCase();
  return msg.includes("column") && (msg.includes("does not exist") || msg.includes("schema cache"));
}

export async function GET(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const admin = createAdminClient();

  const yearMonth = new Date().toISOString().slice(0, 7); // "2026-05"
  const monthStartIso = `${yearMonth}-01T00:00:00.000Z`;

  // Get all active advisors with their stats
  const { data: advisors } = await admin
    .from("professionals")
    .select(
      "id, rating, review_count, avg_response_minutes, profile_score, auth_user_id",
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

  // ── Community signals (current month) — all fail-soft to zero ────────

  // 1. Forum answers: replies authored this month by an advisor's auth user.
  const authToPro = new Map<string, number>();
  for (const a of advisors as { id: number; auth_user_id?: string | null }[]) {
    if (a.auth_user_id) authToPro.set(a.auth_user_id, a.id);
  }
  const forumAnswerMap: Record<number, number> = {};
  try {
    if (authToPro.size > 0) {
      const { data: forumPosts } = await admin
        .from("forum_posts")
        .select("author_id")
        .eq("post_type", "reply")
        .eq("is_removed", false)
        .gte("created_at", monthStartIso)
        .in("author_id", Array.from(authToPro.keys()))
        .limit(5000);
      for (const p of (forumPosts ?? []) as { author_id: string | null }[]) {
        const pid = p.author_id ? authToPro.get(p.author_id) : undefined;
        if (pid) forumAnswerMap[pid] = (forumAnswerMap[pid] ?? 0) + 1;
      }
    }
  } catch (err) {
    log.warn("forum answer signal failed", { err: err instanceof Error ? err.message : String(err) });
  }

  // 2. Post engagement: reactions received this month on each advisor's posts.
  const engagementMap: Record<number, number> = {};
  try {
    const { data: reactions } = await admin
      .from("advisor_post_reactions")
      .select("post_id, advisor_posts!inner(professional_id)")
      .gte("created_at", monthStartIso)
      .limit(10000);
    for (const r of (reactions ?? []) as unknown as { advisor_posts: { professional_id: number } | null }[]) {
      const pid = r.advisor_posts?.professional_id;
      if (pid) engagementMap[pid] = (engagementMap[pid] ?? 0) + 1;
    }
  } catch (err) {
    log.warn("post engagement signal failed", { err: err instanceof Error ? err.message : String(err) });
  }

  // 3. Brief completions: outcomes submitted this month.
  const briefCompletionMap: Record<number, number> = {};
  try {
    const { data: outcomes } = await admin
      .from("brief_outcomes")
      .select("professional_id")
      .eq("outcome", "completed")
      .gte("created_at", monthStartIso)
      .not("professional_id", "is", null)
      .limit(5000);
    for (const o of (outcomes ?? []) as { professional_id: number | null }[]) {
      if (o.professional_id) {
        briefCompletionMap[o.professional_id] = (briefCompletionMap[o.professional_id] ?? 0) + 1;
      }
    }
  } catch (err) {
    log.warn("brief completion signal failed", { err: err instanceof Error ? err.message : String(err) });
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
    forum_answers_count: number;
    post_engagement_score: number;
    brief_completions_count: number;
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

    // Community contribution: capped so engagement supplements — never
    // outweighs — client outcomes (ratings/reviews stay the dominant axis).
    const forumAnswers = forumAnswerMap[a.id] ?? 0;
    const postEngagement = engagementMap[a.id] ?? 0;
    const briefCompletions = briefCompletionMap[a.id] ?? 0;
    const forumScore = Math.min(15, forumAnswers * 3);
    const engagementScore = Math.min(10, postEngagement);
    const briefScore = Math.min(15, briefCompletions * 5);

    const score =
      reviewScore + ratingScore + responseScore + profileScore + badgeScore +
      forumScore + engagementScore + briefScore;

    return {
      professional_id: a.id,
      score,
      review_count: a.review_count ?? 0,
      avg_rating: a.rating ?? null,
      response_score: responseScore,
      profile_score: a.profile_score ?? 0,
      badge_count: badgeCountMap[a.id] ?? 0,
      forum_answers_count: forumAnswers,
      post_engagement_score: postEngagement,
      brief_completions_count: briefCompletions,
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

  let { error } = await admin
    .from("advisor_leaderboard_monthly")
    .upsert(rows, { onConflict: "professional_id,year_month" });

  if (error && isMissingColumnError(error)) {
    // Ecosystem migration not applied yet — write the legacy shape so the
    // board still refreshes (community columns land on the next run after
    // the migration).
    const legacyRows = rows.map(
      ({ forum_answers_count: _f, post_engagement_score: _p, brief_completions_count: _b, ...rest }) => rest,
    );
    ({ error } = await admin
      .from("advisor_leaderboard_monthly")
      .upsert(legacyRows, { onConflict: "professional_id,year_month" }));
    if (!error) {
      log.warn("leaderboard refreshed without community columns (migration pending)", { yearMonth });
    }
  }

  if (error) {
    log.error("leaderboard upsert failed", { error: error.message });
  }

  log.info("leaderboard refreshed", { yearMonth, ranked: rows.length });
  return NextResponse.json({ success: true, ranked: rows.length });
}
