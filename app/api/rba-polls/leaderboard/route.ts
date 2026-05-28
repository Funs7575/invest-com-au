/**
 * GET /api/rba-polls/leaderboard — top predictors by accuracy.
 *
 * Queries the rba_poll_accuracy view, joins to forum_user_profiles for
 * display names, and returns the top 20 users ordered by accuracy_pct DESC,
 * correct_predictions DESC.
 *
 * Only includes users who have predicted at least 2 revealed polls (to avoid
 * noise from one-shot correct guesses).
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("api:rba-polls:leaderboard");

export const runtime = "nodejs";

interface AccuracyRow {
  voter_user_id: string;
  polls_participated: number;
  correct_predictions: number;
  accuracy_pct: number;
}

interface ProfileRow {
  user_id: string;
  display_name: string;
  badge: string;
  reputation: number;
}

export async function GET() {
  const admin = createAdminClient();

  const { data: accuracy, error: accErr } = await admin
    .from("rba_poll_accuracy")
    .select("voter_user_id, polls_participated, correct_predictions, accuracy_pct")
    .gte("polls_participated", 2)
    .order("accuracy_pct", { ascending: false })
    .order("correct_predictions", { ascending: false })
    .limit(20);

  if (accErr) {
    log.warn("leaderboard fetch failed", { error: accErr.message });
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }

  const rows = (accuracy ?? []) as AccuracyRow[];
  if (rows.length === 0) {
    return NextResponse.json({ leaderboard: [] });
  }

  const userIds = rows.map((r) => r.voter_user_id);
  const { data: profiles } = await admin
    .from("forum_user_profiles")
    .select("user_id, display_name, badge, reputation")
    .in("user_id", userIds);

  const profileMap = new Map<string, ProfileRow>();
  for (const p of (profiles ?? []) as ProfileRow[]) {
    profileMap.set(p.user_id, p);
  }

  const leaderboard = rows.map((row, i) => {
    const profile = profileMap.get(row.voter_user_id);
    return {
      rank: i + 1,
      display_name: profile?.display_name ?? "Anonymous",
      badge: profile?.badge ?? "",
      polls_participated: row.polls_participated,
      correct_predictions: row.correct_predictions,
      accuracy_pct: Number(row.accuracy_pct),
    };
  });

  const res = NextResponse.json({ leaderboard });
  res.headers.set("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
  return res;
}
