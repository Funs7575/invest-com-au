/**
 * The Invest Score — daily composite market-data index.
 *
 * Computes a 0–100 score from four observable signals in our database.
 * Framed as factual market-data composite — NOT a buy/sell signal or
 * personal financial advice.
 *
 * Weights:
 *   - Rate level       30%  — where savings rates sit (attractiveness for savers)
 *   - Rate momentum    25%  — direction of recent rate moves
 *   - Platform activity 30% — advisor enquiry volume vs baseline
 *   - Market breadth   15%  — number of active brokers (market participation proxy)
 *
 * All component scores are 0–100 before weighting.
 * Input data gracefully degrades: missing inputs default to 50 (neutral).
 */

export interface InvestScoreInputs {
  /** Average savings rate in basis points from the most recent snapshot batch.
   *  Null when no snapshot data is available. */
  avgSavingsRateBps: number | null;

  /** Net rate change in basis points over the last 30 days.
   *  Positive = net hikes, negative = net cuts, 0 = unchanged.
   *  Null when no rate_change_log entries exist. */
  netRateChangeBps30d: number | null;

  /** Total advisor enquiry events (enquiry_count) over the last 7 calendar days. */
  enquiriesLast7d: number;

  /** Total advisor enquiry events over the prior 23 calendar days (days 8–30),
   *  used to derive a 30-day baseline average. */
  enquiriesDays8to30: number;

  /** Number of active brokers in the directory. */
  activeBrokerCount: number;
}

export interface InvestScoreComponents {
  rateLevel: number;
  rateMomentum: number;
  platformActivity: number;
  marketBreadth: number;
}

export interface InvestScoreResult {
  score: number;
  label: string;
  components: InvestScoreComponents;
}

// ─── Component scorers ───────────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Rate level score (0–100).
 * Savings rates above 4% = excellent for savers (score 80+).
 * Linear scale: 1 bps ≈ 0.02 points.
 * 0 bps → 0; 500 bps (5%) → 100.
 */
function rateLevelScore(avgBps: number | null): number {
  if (avgBps == null) return 50;
  return clamp((avgBps / 500) * 100, 0, 100);
}

/**
 * Rate momentum score (0–100).
 * 50 = no change. Each 10 bps of net hike adds ~2 points; cuts subtract.
 * Bounded at ±50 from neutral (50).
 */
function rateMomentumScore(netBps: number | null): number {
  if (netBps == null) return 50;
  return clamp(50 + (netBps / 10) * 2, 0, 100);
}

/**
 * Platform activity score (0–100).
 * Compares recent 7-day enquiry rate to the 30-day baseline.
 * At parity → 50. Double the baseline → 100. Zero enquiries → 0.
 */
function platformActivityScore(last7d: number, days8to30: number): number {
  const recentDailyAvg = last7d / 7;
  const baselineDailyAvg = days8to30 / 23;

  if (baselineDailyAvg <= 0) {
    // No baseline — use absolute count with a 10/day = score 100 scale
    return clamp((recentDailyAvg / 10) * 100, 0, 100);
  }

  const ratio = recentDailyAvg / baselineDailyAvg;
  // ratio=1 → 50, ratio=2 → 100, ratio=0 → 0
  return clamp(ratio * 50, 0, 100);
}

/**
 * Market breadth score (0–100).
 * 0 active brokers → 0. 50+ active brokers → 100.
 */
function marketBreadthScore(activeBrokers: number): number {
  return clamp(activeBrokers * 2, 0, 100);
}

// ─── Label ───────────────────────────────────────────────────────────────────

export function scoreLabel(score: number): string {
  if (score < 25) return "Very Cautious";
  if (score < 40) return "Cautious";
  if (score < 55) return "Neutral";
  if (score < 70) return "Constructive";
  if (score < 85) return "Positive";
  return "Very Positive";
}

// ─── Main computation ─────────────────────────────────────────────────────────

export function computeInvestScore(inputs: InvestScoreInputs): InvestScoreResult {
  const rateLevel = Math.round(rateLevelScore(inputs.avgSavingsRateBps));
  const rateMomentum = Math.round(rateMomentumScore(inputs.netRateChangeBps30d));
  const platformActivity = Math.round(
    platformActivityScore(inputs.enquiriesLast7d, inputs.enquiriesDays8to30),
  );
  const marketBreadth = Math.round(marketBreadthScore(inputs.activeBrokerCount));

  const score =
    rateLevel * 0.3 +
    rateMomentum * 0.25 +
    platformActivity * 0.3 +
    marketBreadth * 0.15;

  const rounded = Math.round(score * 100) / 100;

  return {
    score: rounded,
    label: scoreLabel(rounded),
    components: { rateLevel, rateMomentum, platformActivity, marketBreadth },
  };
}
