/**
 * Switching tracker — pure cost-comparison functions (PR 9.3).
 *
 * Computes a factual lifetime-cost estimate for a user's current product
 * vs the current best-in-class. General information only — not personal
 * financial advice. Results are estimates based on user-supplied assumptions.
 *
 * No DB calls. Fully unit-testable.
 */

export interface BrokerCostInputs {
  /** The fee the user believes they are paying per trade, in cents. */
  currentFeePerTradeCents: number;
  /** The cheapest available fee per trade on our platform, in cents. */
  bestFeePerTradeCents: number;
  /** Self-reported estimated trades per year. */
  estimatedTradesPa: number;
  /** How many years they have held this product. */
  yearsHeld: number;
}

export interface SavingsCostInputs {
  /** The rate the user is receiving, in basis points. */
  currentRateBps: number;
  /** The best available rate on our platform, in basis points. */
  bestRateBps: number;
  /** Self-reported approximate balance, in cents. */
  estimatedBalanceCents: number;
  /** How many years they have held this product. */
  yearsHeld: number;
}

export interface SwitchingComparison {
  /** Estimated total fees/opportunity-cost paid so far, in cents. */
  totalCostToDateCents: number;
  /** What they would have paid with the best-in-class, in cents. */
  bestInClassCostToDateCents: number;
  /** Annual saving potential if they switch now, in cents. */
  annualSavingCents: number;
  /** Lifetime-to-date saving potential (retrospective), in cents. */
  lifetimeSavingCents: number;
}

/** Broker: compares fee per trade × estimated annual trades. */
export function compareBrokerCost(inputs: BrokerCostInputs): SwitchingComparison {
  const { currentFeePerTradeCents, bestFeePerTradeCents, estimatedTradesPa, yearsHeld } = inputs;
  const currentAnnualCents = currentFeePerTradeCents * estimatedTradesPa;
  const bestAnnualCents = bestFeePerTradeCents * estimatedTradesPa;
  const annualSavingCents = Math.max(0, currentAnnualCents - bestAnnualCents);
  const totalCostToDateCents = Math.round(currentAnnualCents * yearsHeld);
  const bestInClassCostToDateCents = Math.round(bestAnnualCents * yearsHeld);
  const lifetimeSavingCents = Math.max(0, totalCostToDateCents - bestInClassCostToDateCents);
  return {
    totalCostToDateCents,
    bestInClassCostToDateCents,
    annualSavingCents,
    lifetimeSavingCents,
  };
}

/** Savings/TD: compares interest earned at current vs best rate. */
export function compareSavingsCost(inputs: SavingsCostInputs): SwitchingComparison {
  const { currentRateBps, bestRateBps, estimatedBalanceCents, yearsHeld } = inputs;
  // Annual interest earned (simple, not compound) = balance × rate
  const currentAnnualInterestCents = Math.round(
    (estimatedBalanceCents * currentRateBps) / 10_000,
  );
  const bestAnnualInterestCents = Math.round(
    (estimatedBalanceCents * bestRateBps) / 10_000,
  );
  // "Cost" here is opportunity cost = foregone interest
  const annualSavingCents = Math.max(0, bestAnnualInterestCents - currentAnnualInterestCents);
  const totalCostToDateCents = Math.round(currentAnnualInterestCents * yearsHeld);
  const bestInClassCostToDateCents = Math.round(bestAnnualInterestCents * yearsHeld);
  const lifetimeSavingCents = Math.max(0, bestInClassCostToDateCents - totalCostToDateCents);
  return {
    totalCostToDateCents,
    bestInClassCostToDateCents,
    annualSavingCents,
    lifetimeSavingCents,
  };
}

/** Formats a cent amount as a dollar string, e.g. 150000 → "$1,500". */
export function formatDollars(cents: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

/** Years between a past date and today, as a decimal. Minimum 0. */
export function yearsHeld(startedAt: string | Date): number {
  const ms = Date.now() - new Date(startedAt).getTime();
  return Math.max(0, ms / (365.25 * 24 * 3600 * 1000));
}
