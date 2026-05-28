import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { isRateLimited } from "@/lib/rate-limit";
import { computeNewStreakCount } from "@/lib/streak";

// POST /api/checkin — log a daily engagement event, return streak state.
// Idempotent: same-day calls update the source but preserve streak_count.

const VALID_SOURCES = [
  "article_read", "calculator", "watchlist", "quiz",
  "feed_view", "etf_view", "broker_view", "advisor_view",
] as const;

const Schema = z.object({
  source: z.enum(VALID_SOURCES).default("article_read"),
});

export const POST = withValidatedBody(Schema, async (req: NextRequest, body) => {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (await isRateLimited(`checkin:${ip}`, 20, 60)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

   
  const todayIso = new Date().toISOString().slice(0, 10);

  // Load recent checkins (last 60 days is enough for streak calculation)
  const { data: recentRows } = await supabase
    .from("user_daily_checkins")
    .select("check_in_date, streak_count")
    .eq("user_id", user.id)
    .order("check_in_date", { ascending: false })
    .limit(60);

  const existing = (recentRows ?? []) as { check_in_date: string; streak_count: number }[];
  const alreadyToday = existing.some((r) => r.check_in_date === todayIso);
  const newStreakCount = computeNewStreakCount(existing, todayIso);

  if (alreadyToday) {
    // Already checked in today — just return current state
    const current = existing.find((r) => r.check_in_date === todayIso);
    return NextResponse.json({ streak: current?.streak_count ?? newStreakCount, isNew: false });
  }

  const { error } = await supabase
    .from("user_daily_checkins")
    .upsert(
      { user_id: user.id, check_in_date: todayIso, source: body.source, points: 1, streak_count: newStreakCount },
      { onConflict: "user_id,check_in_date" },
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ streak: newStreakCount, isNew: true });
});

// GET /api/checkin — return current streak for the authenticated user
export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (await isRateLimited(`checkin_get:${ip}`, 60, 60)) {
    return NextResponse.json({ streak: 0 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ streak: 0 });

  const { data } = await supabase
    .from("user_daily_checkins")
    .select("check_in_date, streak_count")
    .eq("user_id", user.id)
    .order("check_in_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return NextResponse.json({ streak: 0 });

   
  const todayIso = new Date().toISOString().slice(0, 10);
  const gap = Math.round((new Date(todayIso).getTime() - new Date(data.check_in_date).getTime()) / 86_400_000);

  // Streak is live only if last checkin was today or yesterday
  const streak = gap <= 1 ? data.streak_count : 0;
  return NextResponse.json({ streak });
}
