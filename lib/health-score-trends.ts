/**
 * lib/health-score-trends.ts
 *
 * Pure helpers for broker health-score trend analysis.
 *
 * These functions are intentionally free of Supabase / Next.js dependencies
 * so they can be exercised in fast unit tests.  Data fetching lives in the
 * page server component; this module only transforms the result.
 */

export interface HealthScoreHistoryRow {
  captured_at: string;
  overall_score: number;
  regulatory_score?: number | null;
  client_money_score?: number | null;
  financial_stability_score?: number | null;
  platform_reliability_score?: number | null;
  insurance_score?: number | null;
}

/** Direction of change derived from the first vs last data point. */
export type TrendDirection = "up" | "down" | "flat";

export interface TrendSummary {
  /** overall_score of the most recent snapshot */
  latest: number;
  /** overall_score of the oldest snapshot in the series */
  earliest: number;
  /** Point delta: latest − earliest (positive = up, negative = down) */
  delta: number;
  /** Human-readable direction */
  direction: TrendDirection;
  /** Number of snapshots in the series */
  count: number;
}

/**
 * Summarises the trend from an array of history rows.
 *
 * Rows may be in any order — the function sorts by captured_at ascending
 * internally so callers don't have to guarantee ordering.
 *
 * Returns `null` when there are no rows (nothing to summarise).
 *
 * The "flat" band is ±1 point to absorb floating-point rounding in the
 * weighted-average calculation done by the admin tooling.
 */
export function summariseTrend(
  history: readonly HealthScoreHistoryRow[],
): TrendSummary | null {
  if (history.length === 0) return null;

  const sorted = [...history].sort(
    (a, b) =>
      new Date(a.captured_at).getTime() - new Date(b.captured_at).getTime(),
  );

  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  // noUncheckedIndexedAccess guard
  if (!first || !last) return null;

  const earliest = Number(first.overall_score);
  const latest = Number(last.overall_score);
  const delta = latest - earliest;

  let direction: TrendDirection;
  if (delta > 1) direction = "up";
  else if (delta < -1) direction = "down";
  else direction = "flat";

  return { latest, earliest, delta, direction, count: sorted.length };
}

/**
 * Normalises a series of overall_score values to the [0, 1] range
 * for SVG sparkline rendering.
 *
 * - Returns an empty array for an empty input.
 * - When all values are identical the midpoint (0.5) is returned for every
 *   point so the sparkline renders as a flat centred line rather than
 *   degenerate zeroes.
 */
export function normaliseSparklinePoints(
  history: readonly HealthScoreHistoryRow[],
): number[] {
  if (history.length === 0) return [];

  const sorted = [...history].sort(
    (a, b) =>
      new Date(a.captured_at).getTime() - new Date(b.captured_at).getTime(),
  );

  const scores = sorted.map((r) => Number(r.overall_score));
  const min = Math.min(...scores);
  const max = Math.max(...scores);

  if (min === max) return scores.map(() => 0.5);

  return scores.map((s) => (s - min) / (max - min));
}

/**
 * Formats a trend delta as a human-readable string, e.g. "+3.0" or "−2.5".
 * Uses a proper minus sign (U+2212) for negative deltas.
 */
export function formatDelta(delta: number): string {
  const abs = Math.abs(delta).toFixed(1);
  return delta >= 0 ? `+${abs}` : `−${abs}`;
}
