import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCronAuth } from "@/lib/cron-auth";
import { logger } from "@/lib/logger";

const log = logger("cron:observability-retention");

export const maxDuration = 60;

/**
 * Retention sweep for observability tables.
 *
 * cron_run_log grows by ~1.5k rows/day (62 handlers * ~24 daily
 * dispatches + manuals). Without pruning it'd reach a million rows
 * inside two years, slowing the /admin/automation/cron-health
 * dashboard and blowing out backups.
 *
 *   cron_run_log         — retain 30 days
 *   cron_health_alerts   — retain 90 days (keeps longer-tail trend
 *                          analysis available without being noisy)
 *
 * Runs daily. Bounded per-run to 20k deletes so a cold catch-up run
 * can't time out the handler.
 */
export async function GET(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const supabase = createAdminClient();
  const now = Date.now();

  const runLogCutoff = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
  const alertsCutoff = new Date(now - 90 * 24 * 60 * 60 * 1000).toISOString();

  let runLogDeleted = 0;
  let alertsDeleted = 0;

  try {
    // Two-stage delete to cap the write size: select ids, then delete.
    const { data: oldRuns } = await supabase
      .from("cron_run_log")
      .select("id")
      .lt("started_at", runLogCutoff)
      .limit(20_000);
    if (oldRuns && oldRuns.length > 0) {
      const ids = oldRuns.map((r) => r.id as number);
      const { error } = await supabase
        .from("cron_run_log")
        .delete()
        .in("id", ids);
      if (error) {
        log.error("cron_run_log_delete_failed", { err: error.message });
      } else {
        runLogDeleted = ids.length;
      }
    }
  } catch (err) {
    log.error("cron_run_log_prune_exception", {
      err: err instanceof Error ? err.message : String(err),
    });
  }

  try {
    const { data: oldAlerts } = await supabase
      .from("cron_health_alerts")
      .select("id")
      .lt("alerted_at", alertsCutoff)
      .limit(20_000);
    if (oldAlerts && oldAlerts.length > 0) {
      const ids = oldAlerts.map((r) => r.id as number);
      const { error } = await supabase
        .from("cron_health_alerts")
        .delete()
        .in("id", ids);
      if (error) {
        log.error("cron_health_alerts_delete_failed", { err: error.message });
      } else {
        alertsDeleted = ids.length;
      }
    }
  } catch (err) {
    log.error("cron_health_alerts_prune_exception", {
      err: err instanceof Error ? err.message : String(err),
    });
  }

  return NextResponse.json({
    ok: true,
    cron_run_log_deleted: runLogDeleted,
    cron_health_alerts_deleted: alertsDeleted,
  });
}
