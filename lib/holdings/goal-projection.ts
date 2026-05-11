/**
 * Goal projection (PR-X5h).
 *
 * Pure function. Inputs: current portfolio value, target amount, target
 * date, monthly contribution assumption, annual return assumption.
 * Outputs: projected value at the target date + status (on-track / short
 * / ahead) + monthly contribution needed to actually hit the goal.
 *
 * Compliance: projection-only output framed as a factual computation, the
 * same legal lane as the CGT estimator or switching coach. Never says
 * "you should contribute X" — the UI labels the contribution-needed
 * number "to reach your goal you would need to add ~$X/mo at this return"
 * (a comparison-driven calculation, not advice). ASIC MoneySmart's
 * compound-interest calculator uses the same maths; we're not introducing
 * a new compliance surface.
 */

export interface GoalProjectionInput {
  /** Current portfolio value in cents (the starting principal). */
  currentValueCents: number;
  /** Goal target in cents. */
  targetCents: number;
  /** Months from "now" to the target date. Caller computes this from the
   *  target_date column + a clock the caller controls (`new Date()` in
   *  prod; injectable in tests). Negative values are clamped to 0. */
  monthsToTarget: number;
  /** Monthly contribution in cents. 0 = no contribution. */
  monthlyContributionCents: number;
  /** Annual expected return as a percentage (e.g. 6 = 6.00%). Negative
   *  allowed (worst-case modelling); typical inputs 0–15. */
  annualReturnPct: number;
}

export type GoalStatus = "on-track" | "short" | "ahead" | "past-due";

export interface GoalProjectionResult {
  /** Months used in the projection (input clamped to ≥ 0). */
  monthsUsed: number;
  /** Future value of the portfolio at the target date, in cents. */
  projectedValueAtTargetCents: number;
  /** Gap = target − projected. Positive = short; negative = ahead. */
  gapCents: number;
  /** Monthly contribution (in cents) required to exactly hit the target,
   *  given the same return assumption + months. null when no plausible
   *  contribution can close the gap (e.g. target already reached without
   *  contributions, or months=0). */
  requiredMonthlyContributionCents: number | null;
  status: GoalStatus;
  /** Plain-English summary line for the UI. */
  summary: string;
}

const CENTS_PER_DOLLAR = 100;

export function projectGoal(input: GoalProjectionInput): GoalProjectionResult {
  const monthsUsed = Math.max(0, Math.floor(input.monthsToTarget));
  const monthlyRate = input.annualReturnPct / 100 / 12;
  const monthlyContrib = Math.max(0, input.monthlyContributionCents);
  const startValue = Math.max(0, input.currentValueCents);

  const projectedValueAtTargetCents = futureValueCents(
    startValue,
    monthlyContrib,
    monthlyRate,
    monthsUsed,
  );

  const gapCents = input.targetCents - projectedValueAtTargetCents;

  const requiredMonthlyContributionCents = solveRequiredContributionCents({
    startValue,
    targetCents: input.targetCents,
    months: monthsUsed,
    monthlyRate,
  });

  const status: GoalStatus = monthsUsed === 0
    ? (startValue >= input.targetCents ? "ahead" : "past-due")
    : (gapCents < 0
        ? "ahead"
        : gapCents <= input.targetCents * 0.05
          ? "on-track"
          : "short");

  return {
    monthsUsed,
    projectedValueAtTargetCents,
    gapCents,
    requiredMonthlyContributionCents,
    status,
    summary: buildSummary({
      status,
      monthsUsed,
      projectedValueAtTargetCents,
      gapCents,
      targetCents: input.targetCents,
      monthlyContributionCents: monthlyContrib,
      requiredMonthlyContributionCents,
    }),
  };
}

/**
 * Compute the calendar months between two dates (signed). Helper for callers
 * who store target_date as a YYYY-MM-DD string and want to feed
 * `monthsToTarget` into projectGoal.
 *
 * Returns the floor of (end - start) in calendar months — a target 1 day
 * away returns 0, a target 31 days away returns 1.
 */
export function monthsBetween(start: Date, end: Date): number {
  const years = end.getUTCFullYear() - start.getUTCFullYear();
  const months = end.getUTCMonth() - start.getUTCMonth();
  let total = years * 12 + months;
  if (end.getUTCDate() < start.getUTCDate()) total -= 1;
  return total;
}

// ─── Internals ──────────────────────────────────────────────────────────────

/**
 * Standard compound-interest future-value formula with monthly contributions
 * paid at end of each month:
 *
 *   FV = P(1+r)^n + C * [((1+r)^n − 1) / r]
 *
 * Special case r=0 collapses to P + C*n (handled to avoid divide-by-zero).
 */
function futureValueCents(
  principalCents: number,
  monthlyContribCents: number,
  monthlyRate: number,
  months: number,
): number {
  if (months <= 0) return Math.round(principalCents);
  if (Math.abs(monthlyRate) < 1e-9) {
    return Math.round(principalCents + monthlyContribCents * months);
  }
  const growthFactor = Math.pow(1 + monthlyRate, months);
  const principalGrowth = principalCents * growthFactor;
  const contribGrowth = monthlyContribCents * ((growthFactor - 1) / monthlyRate);
  return Math.round(principalGrowth + contribGrowth);
}

/**
 * Solve for the monthly contribution C that makes FV = target. Algebraically
 * inverts futureValueCents() for C, given P, target, r, n.
 *
 *   target = P(1+r)^n + C * [((1+r)^n − 1) / r]
 *   ⇒  C = (target − P(1+r)^n) / [((1+r)^n − 1) / r]
 *
 * Returns null when the gap is already closed without contributions, or when
 * months=0 (no time to contribute).
 */
function solveRequiredContributionCents(opts: {
  startValue: number;
  targetCents: number;
  months: number;
  monthlyRate: number;
}): number | null {
  const { startValue, targetCents, months, monthlyRate } = opts;
  if (months <= 0) return null;
  if (Math.abs(monthlyRate) < 1e-9) {
    const fvNoContrib = startValue;
    const gap = targetCents - fvNoContrib;
    if (gap <= 0) return null;
    return Math.round(gap / months);
  }
  const growthFactor = Math.pow(1 + monthlyRate, months);
  const fvNoContrib = startValue * growthFactor;
  const gap = targetCents - fvNoContrib;
  if (gap <= 0) return null;
  const annuityFactor = (growthFactor - 1) / monthlyRate;
  if (annuityFactor <= 0) return null;
  return Math.round(gap / annuityFactor);
}

function buildSummary(opts: {
  status: GoalStatus;
  monthsUsed: number;
  projectedValueAtTargetCents: number;
  gapCents: number;
  targetCents: number;
  monthlyContributionCents: number;
  requiredMonthlyContributionCents: number | null;
}): string {
  const projected = formatAud(opts.projectedValueAtTargetCents);
  const target = formatAud(opts.targetCents);
  switch (opts.status) {
    case "past-due":
      return `Target date is in the past. Reset the goal to keep tracking.`;
    case "ahead":
      return opts.monthsUsed === 0
        ? `You're already at or above the target.`
        : `On this projection you'd reach ${projected} by then — comfortably above the ${target} target.`;
    case "on-track":
      return `On this projection you'd reach ${projected} by then — within 5% of the ${target} target.`;
    case "short": {
      const required = opts.requiredMonthlyContributionCents;
      const reqLine = required !== null
        ? ` To close the gap at the same return you'd need ~${formatAud(required)}/mo (currently ${formatAud(opts.monthlyContributionCents)}/mo).`
        : "";
      return `On this projection you'd reach ${projected} by then — ${formatAud(opts.gapCents)} short of the ${target} target.${reqLine}`;
    }
  }
}

function formatAud(cents: number): string {
  const sign = cents < 0 ? "−" : "";
  const abs = Math.abs(cents);
  const formatted = (abs / CENTS_PER_DOLLAR).toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  });
  return `${sign}${formatted}`;
}
