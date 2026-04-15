import { NextRequest, NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/cron-auth";
import { wrapCronHandler } from "@/lib/cron-run-log";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("cron-cron-freshness");

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Cron: Watchdog that alerts when another cron hasn't run in
 * its expected window.
 *
 * Every cron we ship writes a row to `cron_run_log` on each
 * execution. This watchdog reads the latest `ended_at` for each
 * cron name and compares it to the expected cadence:
 *
 *   hourly → 2h since last success
 *   every-15m → 45m
 *   daily → 30h
 *   weekly → 8 days
 *   monthly → 33 days
 *
 * Missed crons surface as entries on the /admin/automation page
 * and trigger an slo_incident row so PagerDuty picks them up.
 */
interface CronExpectation {
  name: string;
  maxAgeMs: number;
  cadence: string;
}

// Tolerances are deliberately generous so a slightly-late run
// doesn't wake anyone up. The goal is to catch crons that have
// silently stopped running for hours on end, not to alert on
// a one-cycle miss.
const EXPECTATIONS: CronExpectation[] = [
  // Every-few-minutes
  { name: "retry-webhooks", maxAgeMs: 45 * 60_000, cadence: "15m" },
  { name: "job-queue-worker", maxAgeMs: 20 * 60_000, cadence: "5m" },
  { name: "confirm-lead-notify", maxAgeMs: 30 * 60_000, cadence: "10m" },
  { name: "slo-monitor", maxAgeMs: 45 * 60_000, cadence: "15m" },
  // Hourly
  { name: "auto-resolve-disputes", maxAgeMs: 2 * 3_600_000, cadence: "hourly" },
  { name: "embeddings-refresh", maxAgeMs: 2 * 3_600_000, cadence: "hourly" },
  { name: "automation-verdict-rollup", maxAgeMs: 2 * 3_600_000, cadence: "hourly" },
  // Daily
  { name: "month-end-close", maxAgeMs: 33 * 86_400_000, cadence: "monthly" },
  { name: "revenue-reconciliation", maxAgeMs: 30 * 3_600_000, cadence: "daily" },
  { name: "complaints-sla", maxAgeMs: 30 * 3_600_000, cadence: "daily" },
  { name: "gdpr-retention-purge", maxAgeMs: 30 * 3_600_000, cadence: "daily" },
  { name: "cleanup", maxAgeMs: 30 * 3_600_000, cadence: "daily" },
  { name: "check-fees", maxAgeMs: 30 * 3_600_000, cadence: "daily" },
  { name: "expire-deals", maxAgeMs: 30 * 3_600_000, cadence: "daily" },
  { name: "data-integrity-audit", maxAgeMs: 30 * 3_600_000, cadence: "daily" },
  // Weekly
  { name: "weekly-newsletter", maxAgeMs: 8 * 86_400_000, cadence: "weekly" },
  { name: "content-staleness", maxAgeMs: 8 * 86_400_000, cadence: "weekly" },
];

async function handler(req: NextRequest): Promise<NextResponse> {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const supabase = createAdminClient();
  const now = Date.now();
  const stale: Array<{
    name: string;
    last_ended_at: string | null;
    age_ms: number;
    max_age_ms: number;
    cadence: string;
  }> = [];

  for (const exp of EXPECTATIONS) {
    const { data } = await supabase
      .from("cron_run_log")
      .select("ended_at, status")
      .eq("name", exp.name)
      .eq("status", "ok")
      .not("ended_at", "is", null)
      .order("ended_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const lastEndedAt =
      (data as { ended_at: string | null } | null)?.ended_at || null;
    const age = lastEndedAt ? now - new Date(lastEndedAt).getTime() : Infinity;

    if (age > exp.maxAgeMs) {
      stale.push({
        name: exp.name,
        last_ended_at: lastEndedAt,
        age_ms: Number.isFinite(age) ? age : -1,
        max_age_ms: exp.maxAgeMs,
        cadence: exp.cadence,
      });
    }
  }

  if (stale.length > 0) {
    log.warn("stale crons detected", { count: stale.length, stale });
    // Upsert into slo_incidents so the SLO monitor + PagerDuty
    // picks it up through the existing alert chain. We keep one
    // row per cron name so repeat detections just bump updated_at.
    for (const s of stale) {
      try {
        await supabase.from("slo_incidents").upsert(
          {
            slo_name: `cron_freshness:${s.name}`,
            severity: "high",
            description: `Cron ${s.name} last ran ${Math.round(s.age_ms / 60_000)}m ago (max ${Math.round(s.max_age_ms / 60_000)}m)`,
            opened_at: new Date().toISOString(),
          },
          { onConflict: "slo_name" },
        );
      } catch {
        /* slo_incidents may not exist in some envs — log only */
      }
    }
  }

  return NextResponse.json({
    ok: true,
    checked: EXPECTATIONS.length,
    stale_count: stale.length,
    stale,
  });
}

export const GET = wrapCronHandler("cron-freshness", handler);
