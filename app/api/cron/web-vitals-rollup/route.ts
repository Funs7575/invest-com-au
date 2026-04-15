import { NextRequest, NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/cron-auth";
import { wrapCronHandler } from "@/lib/cron-run-log";
import { rollupYesterday } from "@/lib/web-vitals";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Cron: daily web-vitals rollup.
 *
 * Runs at 01:00 AEST. Aggregates yesterday's raw samples from
 * web_vitals_samples into the per-day summary table, then
 * (separately, via cleanup cron) drops raw samples older than
 * 7 days.
 *
 * Idempotent — the rollup table uses (run_date, metric,
 * page_path, device_kind) as its unique key so a re-run of the
 * same day upserts rather than duplicates.
 */
async function handler(req: NextRequest): Promise<NextResponse> {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const result = await rollupYesterday();

  return NextResponse.json({
    ok: true,
    date: result.date,
    groups: result.groups,
    samples: result.samples,
    inserted: result.inserted,
  });
}

export const GET = wrapCronHandler("web-vitals-rollup", handler);
