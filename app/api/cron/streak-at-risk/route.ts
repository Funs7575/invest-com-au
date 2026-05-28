import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCronAuth } from "@/lib/cron-auth";
import { withCronRunLog } from "@/lib/cron-run-log";
import { dispatchPushToUser } from "@/lib/push-dispatch";
import { isStreakAtRisk } from "@/lib/streak";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 120;

const log = logger("cron:streak-at-risk");

// Daily cron (runs 18:00 AEST ≈ 08:00 UTC) — finds users with active streaks
// who haven't checked in today and sends a streak-at-risk push notification.

export async function GET(req: NextRequest): Promise<NextResponse> {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  return withCronRunLog<NextResponse>("streak-at-risk", async () => {
    const admin = createAdminClient();

     
    const todayIso = new Date().toISOString().slice(0, 10);

    // Load all checkins from the last 3 days (enough to determine at-risk status)
    const threeDaysAgo = new Date(Date.now() - 3 * 86_400_000).toISOString().slice(0, 10);
    const { data: rows } = await admin
      .from("user_daily_checkins")
      .select("user_id, check_in_date, streak_count")
      .gte("check_in_date", threeDaysAgo)
      .order("check_in_date", { ascending: false });

    if (!rows || rows.length === 0) {
      log.info("No recent checkins — nobody to notify");
      return { response: NextResponse.json({ ok: true, sent: 0 }), stats: { sent: 0 } };
    }

    // Group by user
    const byUser = new Map<string, { check_in_date: string; streak_count: number }[]>();
    for (const r of rows as { user_id: string; check_in_date: string; streak_count: number }[]) {
      if (!byUser.has(r.user_id)) byUser.set(r.user_id, []);
      byUser.get(r.user_id)!.push({ check_in_date: r.check_in_date, streak_count: r.streak_count });
    }

    let sent = 0;
    for (const [userId, checkins] of byUser) {
      if (!isStreakAtRisk(checkins, todayIso)) continue;
      const streakLen = checkins[0]?.streak_count ?? 1;

      const result = await dispatchPushToUser(userId, {
        title: `Your ${streakLen}-day streak is at risk 🔥`,
        body: "Check in once today to keep your investing streak alive.",
        url: "/feed",
        tag: "streak-at-risk",
      });

      if (result.sent > 0) sent++;
    }

    log.info("Streak-at-risk push complete", { sent });
    return { response: NextResponse.json({ ok: true, sent }), stats: { sent } };
  }, { triggeredBy: req.headers.get("x-admin-manual") ? "admin_manual" : "cron" });
}
