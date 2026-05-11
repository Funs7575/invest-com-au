/**
 * Goal projection — pure function (W2 Phase 9).
 *
 * Given a goal's current balance + monthly contribution + expected return,
 * project the balance forward to the goal's target_date and report whether
 * it lands at-or-above the target.
 *
 * Compliance: this is a comparison-and-arithmetic function, never advice.
 * Same legal footing as /best/[slug] rankings — math on the user's
 * inputs, surfaced as fact.
 */

export interface GoalInput {
  targetCents: number;
  targetDate: string; // ISO date
  currentBalanceCents: number;
  monthlyContributionCents: number;
  /** Annual nominal return, percent (e.g. 6.5 for 6.5%/year). */
  expectedReturnPct: number;
}

export interface GoalProjection {
  /** Months between today and target_date (rounded down to whole months). */
  monthsToTarget: number;
  /** Projected balance at target_date in cents. */
  projectedBalanceCents: number;
  /** Difference: projected − target, in cents. Positive = on track / overshoot. */
  surplusCents: number;
  /** What % of the target the projection covers (clamped to 0–999). */
  progressPct: number;
  /**
   * Required monthly contribution to JUST hit the target at target_date,
   * given the current balance + expected return. Useful for the "you need
   * to save $X/mo to reach this" surface.
   */
  requiredMonthlyContributionCents: number;
}

export function projectGoal(input: GoalInput, todayMs: number = Date.now()): GoalProjection {
  const months = monthsBetween(todayMs, input.targetDate);
  const r = input.expectedReturnPct / 100 / 12; // monthly rate

  // Future value of current balance + monthly annuity, both compounded.
  // FV = PV * (1+r)^n  +  PMT * (((1+r)^n - 1) / r)
  // r=0 fallback: FV = PV + PMT*n
  const factor = r === 0 ? 1 : Math.pow(1 + r, months);
  const fvBalance = input.currentBalanceCents * factor;
  const fvContrib = r === 0
    ? input.monthlyContributionCents * months
    : input.monthlyContributionCents * ((factor - 1) / r);
  const projected = fvBalance + fvContrib;

  // Required contribution to JUST hit the target:
  // PMT = (target − PV*(1+r)^n) / (((1+r)^n - 1) / r)
  const needed = input.targetCents - fvBalance;
  let requiredMonthly = 0;
  if (months > 0) {
    requiredMonthly = r === 0
      ? Math.max(0, needed / months)
      : Math.max(0, needed / ((factor - 1) / r));
  }

  const surplus = projected - input.targetCents;
  const progress = input.targetCents > 0
    ? Math.min(999, Math.max(0, (projected / input.targetCents) * 100))
    : 0;

  return {
    monthsToTarget: months,
    projectedBalanceCents: Math.round(projected),
    surplusCents: Math.round(surplus),
    progressPct: Math.round(progress),
    requiredMonthlyContributionCents: Math.round(requiredMonthly),
  };
}

function monthsBetween(fromMs: number, toIso: string): number {
  const to = new Date(`${toIso}T00:00:00Z`);
  const from = new Date(fromMs);
  if (to.getTime() <= fromMs) return 0;
  // Calendar-month math, not millisecond-average. 2026-01-01 → 2027-01-01
  // is exactly 12 months, not 11.99 (which 365 / 30.44 would yield).
  let months =
    (to.getUTCFullYear() - from.getUTCFullYear()) * 12 +
    (to.getUTCMonth() - from.getUTCMonth());
  // Round down by one if we haven't yet passed the day-of-month threshold
  // (e.g. Jan 15 → Feb 14 should be 0 months, not 1).
  if (to.getUTCDate() < from.getUTCDate()) months -= 1;
  return Math.max(0, months);
}
