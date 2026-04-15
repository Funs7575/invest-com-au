/**
 * Pure A/B winner decision logic.
 *
 * Two-proportion z-test on conversions / impressions per variant.
 * Declares a winner if:
 *   1. Both variants have at least minSampleSize impressions
 *   2. The absolute p-value is below significanceThreshold
 *
 * Returns { winner: 'a' | 'b' | null, pValue, zScore, lift } so
 * the cron can both promote and log why it did. Never throws on
 * weird inputs — returns null winner if anything looks off.
 *
 * Kept pure + dependency-free so the promoter cron AND the admin
 * UI can reuse it.
 */

export interface ExperimentStats {
  impressions_a: number;
  impressions_b: number;
  /** Pass conversions OR clicks depending on what the test optimises for */
  conversions_a: number;
  conversions_b: number;
  min_sample_size: number;
  significance_threshold: number;
}

export interface WinnerDecision {
  winner: "a" | "b" | null;
  pValue: number;
  zScore: number;
  liftPct: number; // positive = b beat a
  reason:
    | "insufficient_sample"
    | "no_significant_difference"
    | "a_wins"
    | "b_wins"
    | "invalid_input";
}

/**
 * Standard normal CDF via an Abramowitz & Stegun approximation.
 * Avoids a dep on a stats library.
 */
function normalCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804 * Math.exp(-(z * z) / 2);
  const p =
    d *
    t *
    (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}

export function decideWinner(stats: ExperimentStats): WinnerDecision {
  const {
    impressions_a,
    impressions_b,
    conversions_a,
    conversions_b,
    min_sample_size,
    significance_threshold,
  } = stats;

  if (
    impressions_a < 0 ||
    impressions_b < 0 ||
    conversions_a < 0 ||
    conversions_b < 0 ||
    conversions_a > impressions_a ||
    conversions_b > impressions_b
  ) {
    return {
      winner: null,
      pValue: 1,
      zScore: 0,
      liftPct: 0,
      reason: "invalid_input",
    };
  }

  if (impressions_a < min_sample_size || impressions_b < min_sample_size) {
    return {
      winner: null,
      pValue: 1,
      zScore: 0,
      liftPct: 0,
      reason: "insufficient_sample",
    };
  }

  const p1 = conversions_a / impressions_a;
  const p2 = conversions_b / impressions_b;
  const pooled =
    (conversions_a + conversions_b) / (impressions_a + impressions_b);
  const se = Math.sqrt(
    pooled * (1 - pooled) * (1 / impressions_a + 1 / impressions_b),
  );
  if (se === 0) {
    // No variance — shouldn't happen unless both conversion counts are 0
    return {
      winner: null,
      pValue: 1,
      zScore: 0,
      liftPct: 0,
      reason: "no_significant_difference",
    };
  }
  const z = (p2 - p1) / se;
  // Two-tailed p-value
  const pValue = 2 * (1 - normalCdf(Math.abs(z)));
  const liftPct = p1 > 0 ? ((p2 - p1) / p1) * 100 : p2 > 0 ? 100 : 0;

  if (pValue >= significance_threshold) {
    return {
      winner: null,
      pValue,
      zScore: z,
      liftPct,
      reason: "no_significant_difference",
    };
  }

  if (z > 0) {
    return { winner: "b", pValue, zScore: z, liftPct, reason: "b_wins" };
  }
  return { winner: "a", pValue, zScore: z, liftPct, reason: "a_wins" };
}
