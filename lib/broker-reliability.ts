/**
 * Broker reliability score computation.
 *
 * Takes aggregate counts of incident reports by type and returns a
 * 0–100 reliability score plus component breakdown.
 *
 * Pure function — no DB calls, fully unit-testable.
 *
 * Score interpretation:
 *   90–100  Excellent — very few negative reports, positive feedback present
 *   70–89   Good
 *   50–69   Fair
 *   30–49   Below average
 *   0–29    Poor — significant number of negative reports
 */

export interface ReliabilityInputs {
  /** Reports approved (status='verified') for this broker. */
  positiveCount: number;
  platformOutageCount: number;
  hiddenFeesCount: number;
  withdrawalDelayCount: number;
  poorSupportCount: number;
  /** Total number of distinct users who have submitted any report. */
  totalReporters: number;
}

export interface ReliabilityResult {
  score: number;
  label: string;
  components: {
    uptime: number;
    feeTransparency: number;
    withdrawal: number;
    support: number;
    sentiment: number;
  };
  totalReports: number;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Convert a negative report count relative to total reporters into a
 * 0–100 component score. Zero negative reports = 100.
 * Each negative report from 5% of reporters reduces the score by 10 points.
 */
function negativeToScore(negativeCount: number, totalReporters: number): number {
  if (totalReporters === 0) return 80; // no data → neutral-positive
  const rate = negativeCount / totalReporters;
  return clamp(Math.round(100 - rate * 200), 0, 100);
}

/**
 * Positive sentiment boost: adds up to +10 points based on positive
 * report rate relative to all reports.
 */
function sentimentScore(positiveCount: number, totalReports: number): number {
  if (totalReports === 0) return 80;
  const rate = positiveCount / totalReports;
  return clamp(Math.round(50 + rate * 50), 50, 100);
}

export function scoreLabel(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 50) return "Fair";
  if (score >= 30) return "Below average";
  return "Poor";
}

export function computeBrokerReliability(inputs: ReliabilityInputs): ReliabilityResult {
  const {
    positiveCount,
    platformOutageCount,
    hiddenFeesCount,
    withdrawalDelayCount,
    poorSupportCount,
    totalReporters,
  } = inputs;

  const totalNegative =
    platformOutageCount + hiddenFeesCount + withdrawalDelayCount + poorSupportCount;
  const totalReports = totalNegative + positiveCount;

  const uptime = negativeToScore(platformOutageCount, totalReporters);
  const feeTransparency = negativeToScore(hiddenFeesCount, totalReporters);
  const withdrawal = negativeToScore(withdrawalDelayCount, totalReporters);
  const support = negativeToScore(poorSupportCount, totalReporters);
  const sentiment = sentimentScore(positiveCount, totalReports);

  // Weighted composite: incident types weighted equally, sentiment is a lighter bonus
  const score =
    uptime * 0.25 +
    feeTransparency * 0.25 +
    withdrawal * 0.25 +
    support * 0.15 +
    sentiment * 0.1;

  return {
    score: Math.round(score * 100) / 100,
    label: scoreLabel(score),
    components: { uptime, feeTransparency, withdrawal, support, sentiment },
    totalReports,
  };
}
