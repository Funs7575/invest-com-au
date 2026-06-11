/**
 * Rate-change log — data layer for /rates/today and /today.
 *
 * `rate_change_log` is written by the rate-snapshot cron (one row per
 * detected savings-account / term-deposit rate movement, diffed from
 * successive daily snapshots). This module is the single read path +
 * shared display helpers so the daily surfaces don't each re-declare
 * the row shape.
 *
 * RLS: `rate_change_log` has a public SELECT policy, so reads go
 * through the standard server client.
 */

import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

const log = logger("rate-changes");

export type RateChangeDirection = "up" | "down" | "new";

export interface RateChangeRow {
  id: string;
  broker_slug: string;
  broker_name: string;
  product_kind: string;
  old_rate_bps: number | null;
  new_rate_bps: number;
  delta_bps: number;
  direction: RateChangeDirection;
  snapshot_captured_at: string;
  logged_at: string;
}

export const RATE_PRODUCT_LABELS: Record<string, string> = {
  savings_account: "Savings Account",
  term_deposit: "Term Deposit",
};

/** Format basis points as a percentage string, e.g. 510 → "5.10%". */
export function bpsToPercent(bps: number): string {
  return (bps / 100).toFixed(2) + "%";
}

/**
 * Filter change rows to those logged within the last `days` days of
 * `now`. Pure — used for the "changes this week" counts on /today.
 */
export function filterChangesWithinDays(
  rows: RateChangeRow[],
  days: number,
  now: Date = new Date(),
): RateChangeRow[] {
  const cutoff = new Date(now.getTime() - days * 86_400_000).toISOString();
  return rows.filter((row) => row.logged_at >= cutoff);
}

/**
 * Read the most recent rate changes (newest first). Returns [] on any
 * error so pages degrade to an honest empty state.
 */
export async function readRecentRateChanges(limit = 100): Promise<RateChangeRow[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("rate_change_log")
      .select(
        "id, broker_slug, broker_name, product_kind, old_rate_bps, new_rate_bps, delta_bps, direction, snapshot_captured_at, logged_at",
      )
      .order("logged_at", { ascending: false })
      .limit(limit);
    if (error) {
      log.error("readRecentRateChanges failed", { error: error.message });
      return [];
    }
    return (data as RateChangeRow[] | null) ?? [];
  } catch (err) {
    log.error("readRecentRateChanges threw", {
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}
