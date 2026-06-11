/**
 * Fee-change detection — data layer for /fees/today and /today.
 *
 * Unlike rates (where the rate-snapshot cron pre-computes a
 * `rate_change_log` table), there is no fee_change_log table. This
 * module derives FACTUAL per-broker fee-change events at read time by
 * diffing successive `broker_price_snapshots` rows (the hourly capture
 * written by the broker-snapshot cron, 90-day retention).
 *
 * Detection rules (see `deriveFeeChanges`):
 *   - Active brokers only (a de-listed broker's stale values aren't news).
 *   - Per broker, per metric (ASX brokerage $, US-share fee $, FX
 *     spread %), walk snapshots chronologically and emit an event when
 *     the value moves from the last reported baseline by >= 0.005
 *     (i.e. it differs at 2 decimal places). Sub-threshold float
 *     jitter never reports; slow creep is measured against the last
 *     REPORTED value so cumulative drift still surfaces.
 *   - null → value and value → null transitions are NOT changes:
 *     they're almost always parsing gaps, not fee movements. Only
 *     non-null → non-null differences are honest "the fee changed"
 *     events.
 *
 * The verified, human-curated changelog (brokers.fee_changelog,
 * rendered at /fee-tracker) remains the editorial record; this module
 * is the automated detection layer.
 *
 * RLS: `broker_price_snapshots` has a service_role-only policy — the
 * read goes through lib/supabase/admin, same justification as
 * lib/fee-index.ts. Broker display names come from `brokers` (anon
 * SELECT policy) via the standard server client.
 */

// eslint-disable-next-line no-restricted-imports -- broker_price_snapshots has no anon/auth RLS policy; service-role is required (same scope as lib/fee-index.ts)
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { roundTo, type FeeSnapshotRow } from "@/lib/fee-index";

const log = logger("fee-changes");

/** Default window for "recent" fee changes (days). */
export const FEE_CHANGE_LOOKBACK_DAYS = 7;

/** Minimum absolute movement that counts as a change (differs at 2 dp). */
export const MIN_FEE_DELTA = 0.005;

/** Hard cap on snapshot rows pulled per derivation (mirrors lib/fee-index.ts). */
const MAX_SNAPSHOT_ROWS = 5000;

export type FeeMetric = "asx_fee" | "us_fee" | "fx_spread";
export type FeeChangeDirection = "up" | "down";

export const FEE_METRICS: FeeMetric[] = ["asx_fee", "us_fee", "fx_spread"];

export const FEE_METRIC_LABELS: Record<FeeMetric, string> = {
  asx_fee: "ASX brokerage",
  us_fee: "US-share fee",
  fx_spread: "FX spread",
};

const METRIC_COLUMNS: Record<FeeMetric, "asx_fee_value" | "us_fee_value" | "fx_rate"> = {
  asx_fee: "asx_fee_value",
  us_fee: "us_fee_value",
  fx_spread: "fx_rate",
};

export interface FeeChangeEvent {
  brokerSlug: string;
  metric: FeeMetric;
  oldValue: number;
  newValue: number;
  /** Signed change (newValue − oldValue), rounded to 2 dp. */
  delta: number;
  direction: FeeChangeDirection;
  /** captured_at of the snapshot where the new value first appeared. */
  changedAt: string;
}

/** Dollar metrics format as $X.XX; the FX spread is a percentage. */
export function formatFeeValue(metric: FeeMetric, value: number): string {
  return metric === "fx_spread" ? `${value.toFixed(2)}%` : `$${value.toFixed(2)}`;
}

function round2(n: number): number {
  return roundTo(n) ?? n;
}

// ─── Pure derivation (unit-tested) ───────────────────────────────

/**
 * Derive fee-change events from a window of snapshot rows. Pure — no
 * I/O. Events are returned newest-first (by changedAt).
 */
export function deriveFeeChanges(rows: FeeSnapshotRow[]): FeeChangeEvent[] {
  // Group by active broker.
  const byBroker = new Map<string, FeeSnapshotRow[]>();
  for (const row of rows) {
    if (!row.broker_slug) continue;
    if (row.status && row.status !== "active") continue;
    const arr = byBroker.get(row.broker_slug) ?? [];
    arr.push(row);
    byBroker.set(row.broker_slug, arr);
  }

  const events: FeeChangeEvent[] = [];
  for (const [slug, brokerRows] of byBroker) {
    const sorted = [...brokerRows].sort((a, b) =>
      a.captured_at.localeCompare(b.captured_at),
    );
    for (const metric of FEE_METRICS) {
      const column = METRIC_COLUMNS[metric];
      // Baseline = last REPORTED value, so sub-threshold creep still
      // accumulates into a reportable change rather than being lost.
      let baseline: number | null = null;
      for (const row of sorted) {
        const value = row[column];
        if (typeof value !== "number" || !Number.isFinite(value)) continue;
        if (baseline === null) {
          baseline = value;
          continue;
        }
        if (Math.abs(value - baseline) >= MIN_FEE_DELTA) {
          events.push({
            brokerSlug: slug,
            metric,
            oldValue: round2(baseline),
            newValue: round2(value),
            delta: round2(value - baseline),
            direction: value > baseline ? "up" : "down",
            changedAt: row.captured_at,
          });
          baseline = value;
        }
      }
    }
  }

  events.sort((a, b) => b.changedAt.localeCompare(a.changedAt));
  return events;
}

// ─── I/O ─────────────────────────────────────────────────────────

/**
 * Read the broker_price_snapshots window used for change detection.
 * Returns [] on any error so pages degrade to an honest empty state.
 */
export async function readFeeChangeWindow(
  days = FEE_CHANGE_LOOKBACK_DAYS,
  now: Date = new Date(),
): Promise<FeeSnapshotRow[]> {
  try {
    const sinceIso = new Date(now.getTime() - days * 86_400_000).toISOString();
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("broker_price_snapshots")
      .select("broker_slug, captured_at, status, asx_fee_value, us_fee_value, fx_rate")
      .gte("captured_at", sinceIso)
      .order("captured_at", { ascending: false })
      .limit(MAX_SNAPSHOT_ROWS);
    if (error) {
      log.error("readFeeChangeWindow failed", { error: error.message });
      return [];
    }
    return (data as FeeSnapshotRow[] | null) ?? [];
  } catch (err) {
    log.error("readFeeChangeWindow threw", {
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

/** Read + derive: recent fee-change events, newest first. */
export async function getRecentFeeChanges(
  days = FEE_CHANGE_LOOKBACK_DAYS,
): Promise<FeeChangeEvent[]> {
  const rows = await readFeeChangeWindow(days);
  return deriveFeeChanges(rows);
}

/**
 * Resolve broker display names for a set of slugs (anon-covered read
 * on `brokers`). Missing slugs simply aren't in the map — callers fall
 * back to the slug.
 */
export async function fetchBrokerNameMap(slugs: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(slugs)].filter(Boolean);
  if (unique.length === 0) return new Map();
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("brokers")
      .select("slug, name")
      .in("slug", unique);
    if (error) {
      log.error("fetchBrokerNameMap failed", { error: error.message });
      return new Map();
    }
    const map = new Map<string, string>();
    for (const row of (data as { slug: string; name: string }[] | null) ?? []) {
      if (row.slug && row.name) map.set(row.slug, row.name);
    }
    return map;
  } catch (err) {
    log.error("fetchBrokerNameMap threw", {
      error: err instanceof Error ? err.message : String(err),
    });
    return new Map();
  }
}
