/**
 * Country Mode supply thresholds — the runtime check for "Don't fake
 * supply." A country-tailored homepage strip only renders if it has at
 * least N real rows. Below threshold, the strip hides and the global
 * teaser below carries the experience instead.
 *
 * Numbers are deliberately conservative for Phase 1 launch:
 * - listings: 2 — anything fewer reads as "we have one thing for you,"
 *   which over-promises a curated funnel
 * - experts: 2 — same reasoning; one expert looks like a token mention
 * - platforms: 3 — comparison strips read as a "compare" surface; with
 *   fewer than three options there's nothing to compare
 *
 * Centralised here so the supply rule stays consistent across all
 * homepage strips and is easy to tune as country supply matures.
 */

export const SUPPLY_THRESHOLDS = {
  listings: 2,
  experts: 2,
  platforms: 3,
} as const;

export type SupplyKind = keyof typeof SUPPLY_THRESHOLDS;

/**
 * Per-country overrides for supply thresholds. Only populated where a
 * country's market size justifies a lower bar than the global default.
 *
 * NZ experts: 1 instead of 2. The NZ advisor market is legitimately
 * smaller — one qualified NZ-focused expert is enough to surface a
 * real recommendation rather than hiding the strip entirely.
 */
export const PER_COUNTRY_THRESHOLDS: Partial<
  Record<string, Partial<Record<SupplyKind, number>>>
> = {
  NZ: { experts: 1 },
};

export interface SupplyResult<T> {
  /** Rows the caller should render. Empty when below threshold. */
  rows: ReadonlyArray<T>;
  /**
   * True when `rows` is empty because the input was below threshold.
   * Distinguishes "below threshold, hide the strip" from "got the
   * rows we asked for, but the country happens to have zero of X."
   * Either way the strip hides — but `didFallback` tells analytics /
   * the docs/architecture which case fired.
   */
  didFallback: boolean;
}

/**
 * Apply the supply threshold for a given kind. If `rows.length` meets
 * or exceeds the threshold, returns the rows unchanged. Otherwise
 * returns an empty array with `didFallback: true` — the consumer
 * should hide the country-specific strip and let the global teaser
 * carry the experience.
 *
 * Intentionally does NOT return a partial slice; the rule is "show all
 * or none" so a near-miss country isn't ambiguously presented as a
 * curated set.
 */
export function applySupplyThresholds<T>(
  rows: ReadonlyArray<T>,
  kind: SupplyKind,
  countryCode?: string | null,
): SupplyResult<T> {
  const perCountry = countryCode ? PER_COUNTRY_THRESHOLDS[countryCode] : undefined;
  const threshold = perCountry?.[kind] ?? SUPPLY_THRESHOLDS[kind];
  if (rows.length < threshold) {
    return { rows: [], didFallback: true };
  }
  return { rows, didFallback: false };
}
