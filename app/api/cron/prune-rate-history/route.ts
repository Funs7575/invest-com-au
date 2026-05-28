import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCronAuth } from "@/lib/cron-auth";
import { logger } from "@/lib/logger";
import { selectSnapshotIdsToDelete } from "@/lib/snapshot-retention";
import type { SnapshotRow } from "@/lib/snapshot-retention";
import { wrapCronHandler } from "@/lib/cron-run-log";

const log = logger("cron:prune-rate-history");

export const maxDuration = 60;

/**
 * GET /api/cron/prune-rate-history
 *
 * Retention sweep for the two append-only snapshot tables that feed
 * Market Pulse trend charts and rate-alert comparisons.
 *
 * Problem:
 *   Both tables grow by one full set of rows per cron run (daily for health
 *   scores, daily for savings rates). Without pruning they'd blow out the
 *   database indefinitely — a silent cost escalator with no circuit-breaker.
 *
 * Policy (keep-monthly-anchor):
 *   - Retain ALL rows captured within the last RETENTION_DAYS (90) — these
 *     are the "recent" rows that power current-week/month trend views.
 *   - For rows OLDER than 90 days: keep the EARLIEST row per
 *     (broker_id × product_kind, calendar month) for savings snapshots, and
 *     the earliest row per (broker_slug, calendar month) for health scores.
 *     These are the "monthly anchors" that allow long-range charts to remain
 *     accurate without retaining every daily duplicate.
 *   - Delete all remaining old rows (intra-month daily duplicates).
 *
 * This preserves:
 *   - Full fidelity for the last 90 days (trend charts, rate alerts).
 *   - One data point per broker×product per month beyond 90 days
 *     (long-range trend lines, delta summaries).
 *
 * Safety:
 *   - Bounded per-run to BATCH_LIMIT rows so a cold catch-up can't
 *     time out the handler.
 *   - Idempotent: re-running on an already-pruned table is a no-op.
 *   - Both tables are pruned in independent try/catch blocks so a failure
 *     on one doesn't skip the other.
 *
 * Registered in: lib/cron-groups.ts  (daily-3, alongside observability-retention)
 */

const RETENTION_DAYS = 90;
const BATCH_LIMIT = 20_000;

async function handler(req: NextRequest): Promise<NextResponse> {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const supabase = createAdminClient();
  const now = Date.now();

  const cutoff = new Date(now - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  let savingsDeleted = 0;
  let healthDeleted = 0;
  let savingsAnchors = 0;
  let healthAnchors = 0;

  // ── 1. Prune savings_rate_snapshots ──────────────────────────────────────────
  try {
    const { data: oldSnapshots, error: fetchErr } = await supabase
      .from("savings_rate_snapshots")
      .select("id, broker_id, product_kind, captured_at")
      .lt("captured_at", cutoff)
      .limit(BATCH_LIMIT);

    if (fetchErr) {
      log.error("savings_rate_snapshots_fetch_failed", { err: fetchErr.message });
    } else if (oldSnapshots && oldSnapshots.length > 0) {
      const rows: SnapshotRow[] = oldSnapshots.map((r) => ({
        id: r.id as string,
        captured_at: r.captured_at as string,
        groupKey: `${r.broker_id as number}:${r.product_kind as string}`,
      }));

      const { toDelete, anchorCount } = selectSnapshotIdsToDelete(rows, RETENTION_DAYS, now);
      savingsAnchors = anchorCount;

      if (toDelete.length > 0) {
        const { error: delErr } = await supabase
          .from("savings_rate_snapshots")
          .delete()
          .in("id", toDelete as string[]);

        if (delErr) {
          log.error("savings_rate_snapshots_delete_failed", { err: delErr.message });
        } else {
          savingsDeleted = toDelete.length;
        }
      }
    }
  } catch (err) {
    log.error("savings_rate_snapshots_prune_exception", {
      err: err instanceof Error ? err.message : String(err),
    });
  }

  // ── 2. Prune broker_health_score_history ─────────────────────────────────────
  try {
    const { data: oldHealth, error: fetchErr } = await supabase
      .from("broker_health_score_history")
      .select("id, broker_slug, captured_at")
      .lt("captured_at", cutoff)
      .limit(BATCH_LIMIT);

    if (fetchErr) {
      log.error("broker_health_score_history_fetch_failed", { err: fetchErr.message });
    } else if (oldHealth && oldHealth.length > 0) {
      const rows: SnapshotRow[] = oldHealth.map((r) => ({
        id: r.id as number,
        captured_at: r.captured_at as string,
        groupKey: r.broker_slug as string,
      }));

      const { toDelete, anchorCount } = selectSnapshotIdsToDelete(rows, RETENTION_DAYS, now);
      healthAnchors = anchorCount;

      if (toDelete.length > 0) {
        const { error: delErr } = await supabase
          .from("broker_health_score_history")
          .delete()
          .in("id", toDelete as number[]);

        if (delErr) {
          log.error("broker_health_score_history_delete_failed", { err: delErr.message });
        } else {
          healthDeleted = toDelete.length;
        }
      }
    }
  } catch (err) {
    log.error("broker_health_score_history_prune_exception", {
      err: err instanceof Error ? err.message : String(err),
    });
  }

  log.info("prune-rate-history complete", {
    retentionDays: RETENTION_DAYS,
    savings_deleted: savingsDeleted,
    savings_anchors_kept: savingsAnchors,
    health_deleted: healthDeleted,
    health_anchors_kept: healthAnchors,
  });

  return NextResponse.json({
    ok: true,
    retentionDays: RETENTION_DAYS,
    savings_rate_snapshots_deleted: savingsDeleted,
    savings_rate_snapshots_anchors_kept: savingsAnchors,
    broker_health_score_history_deleted: healthDeleted,
    broker_health_score_history_anchors_kept: healthAnchors,
  });
}

export const GET = wrapCronHandler("prune-rate-history", handler);
