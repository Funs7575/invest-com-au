/**
 * AU Brokerage Fee Index — data layer.
 *
 * The index is a FACTUAL aggregate computed from the platform's own
 * `broker_price_snapshots` (the hourly capture written by the
 * broker-snapshot cron). It is NOT advice — it is a single
 * descriptive statistic ("the average ASX per-trade fee across the
 * active brokers we track"), exactly the kind of factual-information
 * carve-out the site operates under.
 *
 * How the figure is computed (see `computeFeeIndex`):
 *   1. Pull a recent window of broker_price_snapshots rows.
 *   2. Reduce to the single LATEST snapshot per active broker
 *      (one vote per broker — a broker snapshotted twice in the
 *      window must not double-count).
 *   3. For each metric (ASX per-trade fee $, US-share fee, FX spread
 *      %) take the simple MEAN and the MEDIAN across the brokers that
 *      had a parseable value. Median is reported alongside the mean as
 *      an outlier-resistant companion.
 *
 * Persistence: `computeFeeIndex` is pure (given rows). The cron calls
 * `upsertFeeIndexSnapshot` to store one row per UTC calendar day in
 * `fee_index_snapshots`, so the public page can render a stable trend
 * even though broker_price_snapshots is pruned to 90 days. QoQ / YoY
 * deltas are derived from the stored history by `computeTrend`.
 *
 * Service-role only: both the write (cron) and the page's ISR read go
 * through lib/supabase/admin — fee_index_snapshots has no anon/auth
 * RLS policy (see the D1 migration).
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("fee-index");

/**
 * How far back to look for snapshots when computing "today's" index.
 * broker-snapshot runs hourly, so 48h comfortably guarantees at least
 * one row per active broker even if a couple of cron runs were missed.
 */
export const SNAPSHOT_LOOKBACK_HOURS = 48;

/** Hard cap on rows pulled from broker_price_snapshots per computation. */
const MAX_SNAPSHOT_ROWS = 5000;

// ─── Types ───────────────────────────────────────────────────────

/** The subset of broker_price_snapshots columns the index needs. */
export interface FeeSnapshotRow {
  broker_slug: string;
  captured_at: string;
  status: string | null;
  asx_fee_value: number | null;
  us_fee_value: number | null;
  fx_rate: number | null;
}

/** A single metric's mean + median + contributing sample size. */
export interface MetricStat {
  mean: number | null;
  median: number | null;
  sample: number;
}

/** The computed index for one period, before persistence. */
export interface FeeIndexComputation {
  /** UTC calendar day (YYYY-MM-DD) this index represents. */
  period: string;
  /** Distinct active brokers that contributed any value. */
  brokerCount: number;
  asxFee: MetricStat;
  usFee: MetricStat;
  fxSpread: MetricStat;
}

/** A persisted fee_index_snapshots row, as read back for the page. */
export interface FeeIndexSnapshot {
  period: string;
  computed_at: string;
  broker_count: number;
  asx_fee_sample: number;
  us_fee_sample: number;
  fx_spread_sample: number;
  avg_asx_fee: number | null;
  avg_us_fee: number | null;
  avg_fx_spread: number | null;
  median_asx_fee: number | null;
  median_us_fee: number | null;
  median_fx_spread: number | null;
  source: string;
}

/** A single QoQ / YoY delta for one metric. */
export interface TrendDelta {
  /** Value at the comparison period, or null if no comparable row. */
  previous: number | null;
  /** Signed absolute change (current − previous), or null. */
  change: number | null;
  /** Signed percentage change, or null when previous is 0/null. */
  changePct: number | null;
}

export interface FeeIndexTrend {
  /** The reference period the deltas are measured against the latest. */
  quarter: { avgAsxFee: TrendDelta; avgUsFee: TrendDelta; avgFxSpread: TrendDelta } | null;
  year: { avgAsxFee: TrendDelta; avgUsFee: TrendDelta; avgFxSpread: TrendDelta } | null;
}

// ─── Pure stat helpers ───────────────────────────────────────────

/** Round to `dp` decimal places, preserving null. */
export function roundTo(n: number | null, dp = 2): number | null {
  if (n === null || !Number.isFinite(n)) return null;
  const factor = 10 ** dp;
  return Math.round(n * factor) / factor;
}

/**
 * Mean + median of a list of numbers. NaN / non-finite values are
 * dropped. Returns nulls (not 0) when the list is empty so a metric
 * with no data is visibly absent rather than misleadingly "free".
 */
export function summarise(values: (number | null | undefined)[]): MetricStat {
  const clean = values.filter(
    (v): v is number => typeof v === "number" && Number.isFinite(v),
  );
  if (clean.length === 0) return { mean: null, median: null, sample: 0 };

  const sum = clean.reduce((a, b) => a + b, 0);
  const mean = sum / clean.length;

  const sorted = [...clean].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0
      ? // even count → average of the two middle values. The
        // noUncheckedIndexedAccess-safe access: both indices are in
        // range because length is even and >= 2 here.
        ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2
      : (sorted[mid] as number);

  return { mean: roundTo(mean), median: roundTo(median), sample: clean.length };
}

/**
 * Reduce a window of snapshot rows to the latest row per *active*
 * broker. Append-only hourly snapshots mean a broker can appear many
 * times; we keep only its most recent row so each broker contributes
 * exactly one vote to the averages.
 */
export function latestPerActiveBroker(rows: FeeSnapshotRow[]): FeeSnapshotRow[] {
  const latest = new Map<string, FeeSnapshotRow>();
  for (const row of rows) {
    if (!row.broker_slug) continue;
    // Only count brokers active at snapshot time. A broker that was
    // de-listed shouldn't drag the live index around.
    if (row.status && row.status !== "active") continue;
    const existing = latest.get(row.broker_slug);
    if (!existing || row.captured_at > existing.captured_at) {
      latest.set(row.broker_slug, row);
    }
  }
  return [...latest.values()];
}

/**
 * Compute the index for `period` from a window of snapshot rows.
 * Pure — no I/O. Exposed for unit testing and for the cron.
 */
export function computeFeeIndex(
  rows: FeeSnapshotRow[],
  period: string,
): FeeIndexComputation {
  const brokers = latestPerActiveBroker(rows);
  return {
    period,
    brokerCount: brokers.length,
    asxFee: summarise(brokers.map((b) => b.asx_fee_value)),
    usFee: summarise(brokers.map((b) => b.us_fee_value)),
    fxSpread: summarise(brokers.map((b) => b.fx_rate)),
  };
}

/** UTC calendar-day string (YYYY-MM-DD) for a date. */
export function utcDay(d: Date = new Date()): string {
  // toISOString is always UTC; slice the date portion.
  return d.toISOString().slice(0, 10);
}

// ─── Trend (QoQ / YoY) ───────────────────────────────────────────

function delta(current: number | null, previous: number | null): TrendDelta {
  if (current === null || previous === null) {
    return { previous, change: null, changePct: null };
  }
  const change = roundTo(current - previous);
  const changePct = previous === 0 ? null : roundTo(((current - previous) / previous) * 100);
  return { previous, change, changePct };
}

/**
 * Pick the stored snapshot whose period is closest to `targetIso`
 * without being newer than it, from a history sorted DESC by period.
 * Used to locate the "≈3 months ago" / "≈12 months ago" comparison
 * rows for QoQ / YoY without requiring an exact-date match.
 */
export function nearestOnOrBefore(
  history: FeeIndexSnapshot[],
  targetIso: string,
): FeeIndexSnapshot | null {
  let best: FeeIndexSnapshot | null = null;
  for (const row of history) {
    if (row.period <= targetIso) {
      if (!best || row.period > best.period) best = row;
    }
  }
  return best;
}

function shiftDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return utcDay(d);
}

/**
 * Build QoQ (≈90 days) and YoY (≈365 days) deltas for the headline
 * means, comparing the latest snapshot against the nearest stored
 * snapshot on-or-before each target date. Returns null for a window
 * when no comparable historical row exists yet (e.g. a brand-new
 * index with < 90 days of history).
 */
export function computeTrend(
  latest: FeeIndexSnapshot,
  history: FeeIndexSnapshot[],
): FeeIndexTrend {
  const buildFor = (targetIso: string) => {
    const prev = nearestOnOrBefore(
      // exclude the latest period itself from the comparison set
      history.filter((h) => h.period < latest.period),
      targetIso,
    );
    if (!prev) return null;
    return {
      avgAsxFee: delta(latest.avg_asx_fee, prev.avg_asx_fee),
      avgUsFee: delta(latest.avg_us_fee, prev.avg_us_fee),
      avgFxSpread: delta(latest.avg_fx_spread, prev.avg_fx_spread),
    };
  };

  return {
    quarter: buildFor(shiftDays(latest.period, -90)),
    year: buildFor(shiftDays(latest.period, -365)),
  };
}

// ─── I/O: read snapshots, persist index, read index back ─────────

/**
 * Read the recent broker_price_snapshots window used to compute the
 * current index. Returns [] on any error so the cron degrades to a
 * "thin data" run rather than throwing.
 */
export async function readRecentBrokerSnapshots(
  now: Date = new Date(),
): Promise<FeeSnapshotRow[]> {
  try {
    const sinceIso = new Date(
      now.getTime() - SNAPSHOT_LOOKBACK_HOURS * 60 * 60 * 1000,
    ).toISOString();
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("broker_price_snapshots")
      .select("broker_slug, captured_at, status, asx_fee_value, us_fee_value, fx_rate")
      .gte("captured_at", sinceIso)
      .order("captured_at", { ascending: false })
      .limit(MAX_SNAPSHOT_ROWS);
    if (error) {
      log.error("readRecentBrokerSnapshots failed", { error: error.message });
      return [];
    }
    return (data as FeeSnapshotRow[] | null) ?? [];
  } catch (err) {
    log.error("readRecentBrokerSnapshots threw", { error: err instanceof Error ? err.message : String(err) });
    return [];
  }
}

/**
 * Upsert the computed index as the row for its UTC calendar day.
 * Idempotent: re-running the cron for the same day overwrites that
 * day's row (UNIQUE (period) in the migration backs the upsert).
 */
export async function upsertFeeIndexSnapshot(
  computation: FeeIndexComputation,
  source: "cron" | "manual" | "backfill" = "cron",
): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("fee_index_snapshots")
      .upsert(
        {
          period: computation.period,
          computed_at: new Date().toISOString(),
          broker_count: computation.brokerCount,
          asx_fee_sample: computation.asxFee.sample,
          us_fee_sample: computation.usFee.sample,
          fx_spread_sample: computation.fxSpread.sample,
          avg_asx_fee: computation.asxFee.mean,
          avg_us_fee: computation.usFee.mean,
          avg_fx_spread: computation.fxSpread.mean,
          median_asx_fee: computation.asxFee.median,
          median_us_fee: computation.usFee.median,
          median_fx_spread: computation.fxSpread.median,
          source,
        },
        { onConflict: "period" },
      );
    if (error) {
      log.error("upsertFeeIndexSnapshot failed", { error: error.message, period: computation.period });
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Read the most-recent published index row plus up to `historyDays`
 * of prior daily rows (DESC). Used by the public page's ISR render.
 * Returns { latest: null, history: [] } when the table is empty or on
 * error so the page can show an honest "no data yet" state.
 */
export async function readFeeIndex(
  historyLimit = 400,
): Promise<{ latest: FeeIndexSnapshot | null; history: FeeIndexSnapshot[] }> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("fee_index_snapshots")
      .select(
        "period, computed_at, broker_count, asx_fee_sample, us_fee_sample, fx_spread_sample, avg_asx_fee, avg_us_fee, avg_fx_spread, median_asx_fee, median_us_fee, median_fx_spread, source",
      )
      .order("period", { ascending: false })
      .limit(historyLimit);
    if (error) {
      log.error("readFeeIndex failed", { error: error.message });
      return { latest: null, history: [] };
    }
    const history = (data as FeeIndexSnapshot[] | null) ?? [];
    return { latest: history[0] ?? null, history };
  } catch (err) {
    log.error("readFeeIndex threw", { error: err instanceof Error ? err.message : String(err) });
    return { latest: null, history: [] };
  }
}
