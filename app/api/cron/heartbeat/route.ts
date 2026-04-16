import { NextRequest, NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/cron-auth";
import { wrapCronHandler } from "@/lib/cron-run-log";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("cron-heartbeat");

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Cron: heartbeat ping every 5 minutes.
 *
 * Writes a row to health_pings so external monitors (UptimeRobot,
 * BetterStack) can detect cron stoppage by querying /api/health.
 * If no heartbeat in last 10 minutes, /api/health returns 503 and
 * the monitor pages oncall.
 *
 * Also auto-purges health_pings older than 7 days to keep the table
 * bounded. The purge is best-effort — failure does not fail the job.
 */
async function handler(req: NextRequest): Promise<NextResponse> {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const supabase = createAdminClient();
  const start = Date.now();

  // 1. Test DB connectivity by writing the heartbeat
  const { error: insertError } = await supabase
    .from("health_pings")
    .insert({
      service: "cron-heartbeat",
      status: "ok",
      latency_ms: 0,
      details: {
        commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "local",
        region: process.env.VERCEL_REGION || "unknown",
      },
    });

  if (insertError) {
    log.error("heartbeat insert failed", insertError);
    return NextResponse.json({ ok: false, error: insertError.message }, { status: 500 });
  }

  // 2. Best-effort purge of pings older than 7 days
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { error: purgeError } = await supabase
    .from("health_pings")
    .delete()
    .lt("created_at", cutoff);

  if (purgeError) {
    log.warn("heartbeat purge failed (non-fatal)", purgeError);
  }

  return NextResponse.json({
    ok: true,
    latency_ms: Date.now() - start,
    purged_before: cutoff,
  });
}

export const GET = wrapCronHandler("heartbeat", handler);
