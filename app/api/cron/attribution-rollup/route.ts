import { NextRequest, NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/cron-auth";
import { wrapCronHandler } from "@/lib/cron-run-log";
import { rollupYesterdayAttribution } from "@/lib/attribution-daily";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Cron: daily attribution rollup.
 *
 * Runs at 02:00 AEST. Aggregates yesterday's attribution_touches
 * into the per-day per-channel per-vertical summary for the
 * exec dashboard. Builds on the existing rollupAttribution()
 * pure function so the math is consistent between realtime
 * and nightly views.
 *
 * Idempotent — revenue_attribution_daily uses
 * (run_date, channel, vertical) as its unique key.
 */
async function handler(req: NextRequest): Promise<NextResponse> {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const result = await rollupYesterdayAttribution();

  return NextResponse.json({
    ok: true,
    date: result.date,
    channel_count: result.channelCount,
    total_touches: result.totalTouches,
    total_conversions: result.totalConversions,
    total_revenue_cents: result.totalRevenueCents,
  });
}

export const GET = wrapCronHandler("attribution-rollup", handler);
