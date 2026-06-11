import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("health-crons");

/**
 * Public cron-fleet liveness probe — the dead-man switch.
 *
 * Every in-platform freshness monitor (cron-freshness, cron-health-alert,
 * heartbeat) is itself a cron, so when the scheduler dies the watchdogs die
 * with it — that's how the fleet stayed dark for 19 days from 2026-05-23
 * without a single alert. This endpoint exposes ONLY the age of the newest
 * `cron_run_log` row so an external scheduler (GitHub Actions
 * `cron-watchdog.yml`) can assert liveness from OUTSIDE the system.
 *
 * No job names, stats, or errors are exposed — just an age in minutes.
 * `cron_run_log` is a service-role-only table; the admin client read is the
 * sanctioned pattern for that class.
 */

export async function GET() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("cron_run_log")
    .select("started_at")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    log.error("cron health read failed", { error: error.message });
    return NextResponse.json(
      { ok: false, status: "unknown", error: "read_failed" },
      { status: 500 },
    );
  }

  const newestRunAt = data?.started_at ?? null;
  const ageMinutes = newestRunAt
    ? Math.floor((Date.now() - new Date(newestRunAt).getTime()) / 60_000)
    : null;

  // A healthy fleet has every-15-minute groups, so age should sit near zero.
  // "stale" tolerates a deploy gap or a flaky hour; "dark" means the
  // scheduler itself is down (Vercel cron parked AND bridge disabled).
  const status =
    ageMinutes === null ? "dark" : ageMinutes <= 120 ? "fresh" : ageMinutes <= 1560 ? "stale" : "dark";

  return NextResponse.json(
    { ok: status === "fresh", status, ageMinutes, newestRunAt },
    {
      headers: {
        // Short CDN cache: liveness data is only useful fresh.
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=300",
      },
    },
  );
}
