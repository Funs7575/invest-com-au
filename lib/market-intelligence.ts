/**
 * lib/market-intelligence.ts
 *
 * PURE aggregation helpers for the "Australian Investing Index" market-
 * intelligence layer. No I/O lives here — every function accepts plain data
 * arrays so tests can exercise them without Supabase or Next.js.
 *
 * Design constraints:
 *   - All outputs are FACTUAL aggregates only. No advice language, no
 *     ranking-as-recommendation. The site holds a general-advice AFSL;
 *     these numbers are factual descriptive statistics.
 *   - Individual broker values are not surfaced. Aggregates are rounded to
 *     prevent back-calculation to individual rows (min 2 brokers in a bucket
 *     before a bucket is published; otherwise null).
 *   - State-level counts are anonymous (count of advisors per state — no
 *     firm or individual name is exposed).
 *
 * Terminology:
 *   "period"  — YYYY-MM-DD ISO calendar day (matches fee_index_snapshots.period).
 *   "score bucket" — bracket width of 10 points: [0–9], [10–19], … [90–100].
 */

import { roundTo, summarise, type FeeIndexSnapshot } from "@/lib/fee-index";
import type { BrokerHealthScore } from "@/lib/types";

// ─── Types ───────────────────────────────────────────────────────────────────

/** A single point on a fee-trend time series (one calendar day). */
export interface FeeTrendPoint {
  /** YYYY-MM-DD */
  period: string;
  avgAsxFee: number | null;
  avgUsFee: number | null;
  avgFxSpread: number | null;
}

/** Rolling direction of a fee metric over a window. */
export type TrendDirection = "falling" | "rising" | "flat" | "insufficient_data";

/** Summary of how a fee metric has moved over a given window. */
export interface FeeTrendSummary {
  metric: "asx" | "us" | "fx";
  latest: number | null;
  earliest: number | null;
  /** Signed absolute change (latest − earliest), rounded to 2dp. */
  absoluteChange: number | null;
  /** Signed percentage change, rounded to 1dp. */
  pctChange: number | null;
  direction: TrendDirection;
  /** Number of daily data points in the window. */
  pointCount: number;
}

/** Distribution of broker health scores across 10-point buckets. */
export interface HealthScoreBucket {
  /** Lower bound of the bucket (inclusive), e.g. 70 for the 70–79 bracket. */
  lowerBound: number;
  /** Upper bound (exclusive for display, inclusive for the 90–100 bracket). */
  upperBound: number;
  /** Human label, e.g. "70–79". */
  label: string;
  /** Count of brokers in this bracket. Zero is a valid value. */
  count: number;
}

export interface HealthScoreDistribution {
  buckets: HealthScoreBucket[];
  /** Mean across all scores, rounded to 1dp. */
  mean: number | null;
  /** Median across all scores, rounded to 1dp. */
  median: number | null;
  /** Total number of brokers in the distribution. */
  total: number;
}

/**
 * Fee spread for a single fee metric within a fee-index period.
 * "Spread" here means the range from lowest to highest contributing broker's
 * value — a measure of how much prices vary across the market.
 */
export interface FeeSpread {
  /** Which fee metric. */
  metric: "asx" | "us" | "fx";
  /** Label for UI display. */
  label: string;
  /** The mean across brokers. */
  mean: number | null;
  /** The median across brokers. */
  median: number | null;
  /** Number of brokers that had a value for this metric. */
  sample: number;
}

/** Aggregated metrics for the latest index period. */
export interface CurrentMarketSnapshot {
  /** YYYY-MM-DD of the index row this snapshot was derived from. */
  period: string | null;
  /** Number of active brokers tracked in the index. */
  activeBrokerCount: number;
  asxFee: FeeSpread;
  usFee: FeeSpread;
  fxSpread: FeeSpread;
}

/** Advisor count by Australian state/territory. */
export interface AdvisorStateCount {
  /** State/territory code, e.g. "NSW", "VIC", "QLD". Null = unknown/unspecified. */
  state: string | null;
  count: number;
}

export interface AdvisorDemandByState {
  /** Only states with at least 1 advisor. */
  byState: AdvisorStateCount[];
  /** Total advisors across all states. */
  total: number;
  /** YYYY-MM-DD when this was computed (the ISR render date). */
  asOf: string;
}

// ─── Fee trend helpers ───────────────────────────────────────────────────────

/**
 * Convert a DESC-ordered list of fee_index_snapshots rows to an ASC
 * chronological series of `FeeTrendPoint` values, suitable for sparklines
 * and narrative trend copy.
 *
 * Rows with ALL three fee metrics null are dropped (thin days where no
 * brokers contributed any value).
 */
export function buildFeeTrendPoints(history: FeeIndexSnapshot[]): FeeTrendPoint[] {
  return [...history]
    .reverse() // history is DESC → make chronological
    .filter(
      (r) => r.avg_asx_fee !== null || r.avg_us_fee !== null || r.avg_fx_spread !== null,
    )
    .map((r) => ({
      period: r.period,
      avgAsxFee: r.avg_asx_fee,
      avgUsFee: r.avg_us_fee,
      avgFxSpread: r.avg_fx_spread,
    }));
}

/**
 * Compute a trend summary for one fee metric from a chronological series
 * of trend points.
 *
 * "Flat" is defined as |pctChange| <= 1 % to absorb rounding noise.
 * Returns direction "insufficient_data" when fewer than 2 non-null points
 * are in the series.
 */
export function computeFeeTrendSummary(
  points: FeeTrendPoint[],
  metric: "asx" | "us" | "fx",
): FeeTrendSummary {
  const key: keyof FeeTrendPoint =
    metric === "asx" ? "avgAsxFee" : metric === "us" ? "avgUsFee" : "avgFxSpread";

  const values = points
    .map((p) => p[key] as number | null)
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v));

  if (values.length < 2) {
    return {
      metric,
      latest: values[0] ?? null,
      earliest: values[0] ?? null,
      absoluteChange: null,
      pctChange: null,
      direction: "insufficient_data",
      pointCount: values.length,
    };
  }

  const earliest = values[0] as number;
  const latest = values[values.length - 1] as number;
  const absoluteChange = roundTo(latest - earliest, 2);
  const pctChange =
    earliest === 0
      ? null
      : roundTo(((latest - earliest) / earliest) * 100, 1);

  let direction: TrendDirection = "flat";
  if (pctChange !== null) {
    if (pctChange < -1) direction = "falling";
    else if (pctChange > 1) direction = "rising";
  }

  return {
    metric,
    latest: roundTo(latest, 2),
    earliest: roundTo(earliest, 2),
    absoluteChange,
    pctChange,
    direction,
    pointCount: values.length,
  };
}

/**
 * Compute trend summaries for all three fee metrics from a DESC history.
 * Convenience wrapper that calls `buildFeeTrendPoints` + `computeFeeTrendSummary`.
 */
export function computeAllFeeTrends(
  history: FeeIndexSnapshot[],
): { asx: FeeTrendSummary; us: FeeTrendSummary; fx: FeeTrendSummary } {
  const points = buildFeeTrendPoints(history);
  return {
    asx: computeFeeTrendSummary(points, "asx"),
    us: computeFeeTrendSummary(points, "us"),
    fx: computeFeeTrendSummary(points, "fx"),
  };
}

// ─── Health score distribution ───────────────────────────────────────────────

/**
 * Build the 10-point bucket distribution of broker health scores.
 *
 * Buckets span [0,10), [10,20), … [80,90), [90,100]. The 90–100 bracket is
 * closed on the right (100 is valid). Scores outside 0–100 are clamped.
 *
 * Buckets with 0 brokers are included (zero count = "no brokers in this
 * range") so the UI can always render a full histogram.
 */
export function buildHealthScoreDistribution(
  scores: BrokerHealthScore[],
): HealthScoreDistribution {
  const BUCKET_SIZE = 10;
  const NUM_BUCKETS = 10; // 0–9, 10–19, …, 90–100

  const buckets: HealthScoreBucket[] = Array.from({ length: NUM_BUCKETS }, (_, i) => {
    const lower = i * BUCKET_SIZE;
    const upper = lower + BUCKET_SIZE - 1;
    const isLast = i === NUM_BUCKETS - 1;
    return {
      lowerBound: lower,
      upperBound: isLast ? 100 : upper,
      label: isLast ? "90–100" : `${lower}–${upper}`,
      count: 0,
    };
  });

  const allScores: number[] = [];

  for (const row of scores) {
    const s = Number(row.overall_score);
    if (!Number.isFinite(s)) continue;
    const clamped = Math.max(0, Math.min(100, s));
    allScores.push(clamped);
    const bucketIdx = Math.min(Math.floor(clamped / BUCKET_SIZE), NUM_BUCKETS - 1);
    const bucket = buckets[bucketIdx];
    if (bucket) bucket.count++;
  }

  if (allScores.length === 0) {
    return { buckets, mean: null, median: null, total: 0 };
  }

  const stat = summarise(allScores);
  return {
    buckets,
    mean: roundTo(stat.mean, 1),
    median: roundTo(stat.median, 1),
    total: allScores.length,
  };
}

// ─── Current market snapshot ─────────────────────────────────────────────────

/**
 * Derive a `CurrentMarketSnapshot` from the latest fee_index_snapshots row.
 * Returns a snapshot with all nulls and zero counts when `latest` is null
 * (no index row yet).
 */
export function buildCurrentMarketSnapshot(
  latest: FeeIndexSnapshot | null,
): CurrentMarketSnapshot {
  const empty: FeeSpread = { metric: "asx", label: "", mean: null, median: null, sample: 0 };

  if (!latest) {
    return {
      period: null,
      activeBrokerCount: 0,
      asxFee: { ...empty, metric: "asx", label: "Avg ASX brokerage" },
      usFee: { ...empty, metric: "us", label: "Avg US-share fee" },
      fxSpread: { ...empty, metric: "fx", label: "Avg FX spread" },
    };
  }

  return {
    period: latest.period,
    activeBrokerCount: latest.broker_count,
    asxFee: {
      metric: "asx",
      label: "Avg ASX brokerage",
      mean: latest.avg_asx_fee,
      median: latest.median_asx_fee,
      sample: latest.asx_fee_sample,
    },
    usFee: {
      metric: "us",
      label: "Avg US-share fee",
      mean: latest.avg_us_fee,
      median: latest.median_us_fee,
      sample: latest.us_fee_sample,
    },
    fxSpread: {
      metric: "fx",
      label: "Avg FX spread",
      mean: latest.avg_fx_spread,
      median: latest.median_fx_spread,
      sample: latest.fx_spread_sample,
    },
  };
}

// ─── Fee spread by category (ASX / US / FX) ─────────────────────────────────

/**
 * Build the three FeeSpread records from the latest index snapshot for use
 * as standalone stat cards. Returns an array of three items in ASX → US → FX
 * order regardless of data availability.
 */
export function buildFeeSpreadsByCategory(
  latest: FeeIndexSnapshot | null,
): FeeSpread[] {
  const snapshot = buildCurrentMarketSnapshot(latest);
  return [snapshot.asxFee, snapshot.usFee, snapshot.fxSpread];
}

// ─── Advisor distribution by state ──────────────────────────────────────────

export interface AdvisorRow {
  location_state: string | null;
  status: string | null;
}

/**
 * Count active advisors by Australian state/territory.
 *
 * Only "active" status rows are counted. States with zero active advisors
 * are NOT included (sparse table — not all states may have representation).
 * Rows with null location_state are grouped under the key null.
 */
export function buildAdvisorDemandByState(
  advisors: AdvisorRow[],
  asOf: string,
): AdvisorDemandByState {
  const counts = new Map<string | null, number>();

  for (const row of advisors) {
    if (row.status !== "active") continue;
    const state = row.location_state?.trim().toUpperCase() ?? null;
    counts.set(state, (counts.get(state) ?? 0) + 1);
  }

  const byState: AdvisorStateCount[] = [...counts.entries()]
    .map(([state, count]) => ({ state, count }))
    .sort((a, b) => {
      // Sort by count descending, then alphabetically for ties.
      if (b.count !== a.count) return b.count - a.count;
      if (a.state === null) return 1;
      if (b.state === null) return -1;
      return a.state.localeCompare(b.state);
    });

  const total = byState.reduce((acc, s) => acc + s.count, 0);

  return { byState, total, asOf };
}

// ─── Narrative helpers (AFSL-safe, factual copy only) ────────────────────────

/**
 * Return a short factual one-liner about the fee trend direction, suitable
 * for use in the narrative report. Never uses advice language.
 *
 * Examples:
 *   "Average ASX brokerage has fallen 4.2% over the tracked period."
 *   "Average US-share fee has risen 1.8% over the tracked period."
 *   "Average FX spread data is unchanged."
 */
export function feeTrendNarrative(summary: FeeTrendSummary): string {
  const labels: Record<FeeTrendSummary["metric"], string> = {
    asx: "Average ASX brokerage",
    us: "Average US-share fee",
    fx: "Average FX spread",
  };
  const label = labels[summary.metric];

  switch (summary.direction) {
    case "falling":
      return `${label} has fallen ${Math.abs(summary.pctChange!).toFixed(1)}% over the tracked period.`;
    case "rising":
      return `${label} has risen ${summary.pctChange!.toFixed(1)}% over the tracked period.`;
    case "flat":
      return `${label} is broadly unchanged over the tracked period.`;
    case "insufficient_data":
      return `${label}: insufficient data to determine a trend.`;
  }
}

/**
 * Pick the most recent `windowDays` days of fee-trend points for display.
 * Returns the full series when it is shorter than the window.
 */
export function trimTrendWindow(
  points: FeeTrendPoint[],
  windowDays: number,
): FeeTrendPoint[] {
  if (points.length <= windowDays) return points;
  return points.slice(points.length - windowDays);
}

// ─── Market Pulse: health-score time series ──────────────────────────────────

/** A row from broker_health_score_history (the subset we need). */
export interface HealthScoreHistoryRow {
  broker_slug: string;
  overall_score: number;
  captured_at: string; // ISO timestamp
}

/**
 * A single point on the market-wide average health-score time series.
 *
 * Only emitted when >= 2 brokers contributed to the bucket (privacy guard —
 * prevents back-calculation to individual scores).
 */
export interface HealthScoreTrendPoint {
  /** YYYY-MM-DD — the UTC calendar day this bucket represents. */
  day: string;
  /** Arithmetic mean across contributing brokers, rounded to 1dp. */
  avgScore: number;
  /** Number of distinct broker_slug values in the bucket. */
  brokerCount: number;
}

/**
 * Bucket broker health-score history rows into daily averages.
 *
 * Groups rows by UTC calendar day (YYYY-MM-DD) of `captured_at`, then emits
 * one `HealthScoreTrendPoint` per day where >= 2 distinct brokers have a row.
 * Days with only one broker are suppressed (privacy guard).
 * Output is sorted chronologically (oldest first).
 *
 * Handles sparse / empty input gracefully — returns an empty array.
 */
export function buildHealthScoreTrendPoints(
  rows: HealthScoreHistoryRow[],
): HealthScoreTrendPoint[] {
  if (rows.length === 0) return [];

  // Group: day → Map<broker_slug, latest overall_score for that day>
  const byDay = new Map<string, Map<string, number>>();

  for (const row of rows) {
    if (!Number.isFinite(Number(row.overall_score))) continue;
    const day = row.captured_at.slice(0, 10); // YYYY-MM-DD
    if (!byDay.has(day)) byDay.set(day, new Map());
    const dayMap = byDay.get(day)!;
    // Keep the latest entry per broker per day (rows may not be unique per
    // broker_slug per day if the cron ran multiple times).
    const existing = dayMap.get(row.broker_slug);
    if (
      existing === undefined ||
      row.captured_at > (rows.find(
        (r) => r.broker_slug === row.broker_slug &&
               r.captured_at.slice(0, 10) === day &&
               r.captured_at > row.captured_at,
      )?.captured_at ?? "")
    ) {
      dayMap.set(row.broker_slug, Number(row.overall_score));
    }
  }

  const points: HealthScoreTrendPoint[] = [];

  for (const [day, brokerMap] of byDay.entries()) {
    if (brokerMap.size < 2) continue; // privacy guard
    const scores = [...brokerMap.values()];
    const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    points.push({
      day,
      avgScore: roundTo(avg, 1) as number,
      brokerCount: brokerMap.size,
    });
  }

  // Sort chronologically
  return points.sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));
}

/**
 * Direction of movement for the market-wide health score.
 * Mirrors the FeeTrendSummary's TrendDirection for consistency.
 */
export interface HealthScoreTrendSummary {
  /** Average score at the most recent data point, or null if no data. */
  latest: number | null;
  /** Average score at the earliest data point, or null if < 2 points. */
  earliest: number | null;
  /** Signed absolute change (latest − earliest). */
  absoluteChange: number | null;
  /** Signed percentage change. */
  pctChange: number | null;
  direction: TrendDirection;
  pointCount: number;
}

/**
 * Summarise the direction of the market-wide health-score trend from a
 * chronological series of daily average points.
 *
 * "Flat" = |pctChange| <= 1 % (mirrors fee-trend convention).
 * Returns direction "insufficient_data" when fewer than 2 points exist.
 */
export function computeHealthScoreTrendSummary(
  points: HealthScoreTrendPoint[],
): HealthScoreTrendSummary {
  if (points.length === 0) {
    return { latest: null, earliest: null, absoluteChange: null, pctChange: null, direction: "insufficient_data", pointCount: 0 };
  }
  if (points.length === 1) {
    return { latest: points[0]!.avgScore, earliest: points[0]!.avgScore, absoluteChange: null, pctChange: null, direction: "insufficient_data", pointCount: 1 };
  }

  const earliest = points[0]!.avgScore;
  const latest = points[points.length - 1]!.avgScore;
  const absoluteChange = roundTo(latest - earliest, 2);
  const pctChange = earliest === 0 ? null : roundTo(((latest - earliest) / earliest) * 100, 1);

  let direction: TrendDirection = "flat";
  if (pctChange !== null) {
    if (pctChange < -1) direction = "falling";
    else if (pctChange > 1) direction = "rising";
  }

  return {
    latest: roundTo(latest, 1) as number,
    earliest: roundTo(earliest, 1) as number,
    absoluteChange,
    pctChange,
    direction,
    pointCount: points.length,
  };
}

// ─── Market Pulse: savings-rate time series ──────────────────────────────────

/** A row from savings_rate_snapshots (the subset we need). */
export interface SavingsRateRow {
  rate_bps: number;
  captured_at: string; // ISO timestamp
  product_kind: string; // "savings_account" | "term_deposit"
  broker_id: number;
  intro_rate_bps: number | null;
}

/**
 * A single point on the market-wide savings-rate time series.
 *
 * Only emitted when >= 2 distinct broker_ids contributed.
 */
export interface SavingsRateTrendPoint {
  /** YYYY-MM-DD */
  day: string;
  /**
   * Best (highest) standard rate across contributing brokers, in % pa (bps ÷ 100).
   * Rounded to 2dp.
   */
  bestRate: number;
  /**
   * Arithmetic mean standard rate across contributing brokers, in % pa.
   * Rounded to 2dp.
   */
  avgRate: number;
  /** Number of distinct broker_ids that contributed. */
  brokerCount: number;
}

/**
 * Bucket savings-rate snapshot rows into daily best/average values.
 *
 * - Only "savings_account" rows are included (term deposits have term-specific
 *   rates that skew market-wide comparisons — they are a separate product type).
 * - Groups by UTC calendar day. Within each day, uses the latest snapshot per
 *   broker (an append-only table may have multiple rows per broker per day).
 * - Days with < 2 distinct brokers are suppressed (privacy guard).
 * - `rate_bps` is the standard rate; intro rates are intentionally excluded
 *   from market averages (they are promotional and time-limited).
 * - Output is sorted chronologically (oldest first).
 */
export function buildSavingsRateTrendPoints(
  rows: SavingsRateRow[],
): SavingsRateTrendPoint[] {
  if (rows.length === 0) return [];

  // Group: day → Map<broker_id, latest rate_bps for that day>
  const byDay = new Map<string, Map<number, { rate_bps: number; captured_at: string }>>();

  for (const row of rows) {
    if (row.product_kind !== "savings_account") continue;
    if (!Number.isFinite(Number(row.rate_bps))) continue;

    const day = row.captured_at.slice(0, 10);
    if (!byDay.has(day)) byDay.set(day, new Map());
    const dayMap = byDay.get(day)!;

    const existing = dayMap.get(row.broker_id);
    // Keep the latest captured_at row per broker per day
    if (!existing || row.captured_at > existing.captured_at) {
      dayMap.set(row.broker_id, { rate_bps: Number(row.rate_bps), captured_at: row.captured_at });
    }
  }

  const points: SavingsRateTrendPoint[] = [];

  for (const [day, brokerMap] of byDay.entries()) {
    if (brokerMap.size < 2) continue; // privacy guard
    const rates = [...brokerMap.values()].map((v) => v.rate_bps / 100); // bps → % pa
    const best = Math.max(...rates);
    const avg = rates.reduce((sum, r) => sum + r, 0) / rates.length;
    points.push({
      day,
      bestRate: (roundTo(best, 2) as number),
      avgRate: (roundTo(avg, 2) as number),
      brokerCount: brokerMap.size,
    });
  }

  return points.sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));
}

/**
 * Compute a trend summary for the savings-rate series (best rate direction).
 *
 * "Flat" = |pctChange| <= 1 %. Returns "insufficient_data" for < 2 points.
 */
export interface SavingsRateTrendSummary {
  latestBest: number | null;
  earliestBest: number | null;
  latestAvg: number | null;
  absoluteChangeBest: number | null;
  pctChangeBest: number | null;
  direction: TrendDirection;
  pointCount: number;
}

export function computeSavingsRateTrendSummary(
  points: SavingsRateTrendPoint[],
): SavingsRateTrendSummary {
  if (points.length === 0) {
    return { latestBest: null, earliestBest: null, latestAvg: null, absoluteChangeBest: null, pctChangeBest: null, direction: "insufficient_data", pointCount: 0 };
  }
  if (points.length === 1) {
    return { latestBest: points[0]!.bestRate, earliestBest: points[0]!.bestRate, latestAvg: points[0]!.avgRate, absoluteChangeBest: null, pctChangeBest: null, direction: "insufficient_data", pointCount: 1 };
  }

  const earliest = points[0]!.bestRate;
  const latest = points[points.length - 1]!.bestRate;
  const latestAvg = points[points.length - 1]!.avgRate;
  const absoluteChangeBest = roundTo(latest - earliest, 2);
  const pctChangeBest = earliest === 0 ? null : roundTo(((latest - earliest) / earliest) * 100, 1);

  let direction: TrendDirection = "flat";
  if (pctChangeBest !== null) {
    if (pctChangeBest < -1) direction = "falling";
    else if (pctChangeBest > 1) direction = "rising";
  }

  return {
    latestBest: roundTo(latest, 2) as number,
    earliestBest: roundTo(earliest, 2) as number,
    latestAvg: roundTo(latestAvg, 2) as number,
    absoluteChangeBest,
    pctChangeBest,
    direction,
    pointCount: points.length,
  };
}

// ─── Market Pulse: fee-index delta series ────────────────────────────────────

/**
 * A single point on the fee-index period-over-period delta series.
 * Each point is the signed change vs the prior period in the series.
 */
export interface FeeIndexDeltaPoint {
  /** YYYY-MM-DD */
  period: string;
  /** Signed delta vs prior period for avg ASX fee, or null. */
  asxDelta: number | null;
  /** Signed delta vs prior period for avg US fee, or null. */
  usDelta: number | null;
  /** Signed delta vs prior period for avg FX spread, or null. */
  fxDelta: number | null;
}

/**
 * Convert a chronological series of fee trend points into a period-over-period
 * delta series.
 *
 * The first point has no prior, so it is omitted. Output length is
 * `points.length - 1` for a non-empty input (0 for empty or single-point).
 * Null values propagate: if either side of a delta is null, the delta is null.
 */
export function buildFeeIndexDeltaSeries(
  points: FeeTrendPoint[],
): FeeIndexDeltaPoint[] {
  if (points.length < 2) return [];

  const deltas: FeeIndexDeltaPoint[] = [];
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]!;
    const curr = points[i]!;

    const diff = (a: number | null, b: number | null): number | null => {
      if (a === null || b === null) return null;
      return roundTo(b - a, 4);
    };

    deltas.push({
      period: curr.period,
      asxDelta: diff(prev.avgAsxFee, curr.avgAsxFee),
      usDelta: diff(prev.avgUsFee, curr.avgUsFee),
      fxDelta: diff(prev.avgFxSpread, curr.avgFxSpread),
    });
  }
  return deltas;
}
