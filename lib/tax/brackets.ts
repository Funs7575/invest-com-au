/**
 * Single source of truth — Australian resident income-tax brackets (2024-25).
 *
 * This module re-exports the canonical bracket data from
 * `lib/calculators/investment-income-tax.ts` and adds a small
 * convenience API so every calculator can import from one place without
 * duplicating the Stage-3 numbers.
 *
 * Tax year
 * --------
 * Stage-3 rates in effect from 1 July 2024 — applies to the 2024-25
 * and 2025-26 income years.
 *
 * References
 * ----------
 *   ATO "Individual income tax rates" (resident, 2024-25):
 *     https://www.ato.gov.au/tax-rates-and-codes/tax-rates-australian-residents
 */

export type {
  /** A single bracket: { min, max, rate }. */
  TaxBracket,
} from "@/lib/calculators/investment-income-tax";

export {
  /** Resident tax brackets in effect from 1 July 2024 (Stage 3). */
  RESIDENT_TAX_BRACKETS_2024_25 as RESIDENT_BRACKETS_2024_25,
} from "@/lib/calculators/investment-income-tax";

import {
  RESIDENT_TAX_BRACKETS_2024_25,
  incomeTaxOnTaxableIncome,
} from "@/lib/calculators/investment-income-tax";

/**
 * Returns the marginal rate (fraction, e.g. 0.30) for a given taxable
 * income under the 2024-25 resident progressive scale.
 *
 * This is the rate on the *last dollar* earned — useful for super-
 * contribution savings calculations and ETP comparisons.
 *
 * @example
 *   marginalRate(50_000)  // → 0.30
 *   marginalRate(18_200)  // → 0  (top of the tax-free threshold)
 *   marginalRate(200_000) // → 0.45
 */
export function marginalRate(taxableIncome: number): number {
  const income = Math.max(0, taxableIncome);
  // Walk brackets from the top down so we return the first bracket
  // whose lower bound is strictly below the income.
  for (let i = RESIDENT_TAX_BRACKETS_2024_25.length - 1; i >= 0; i--) {
    const b = RESIDENT_TAX_BRACKETS_2024_25[i]!;
    if (income > b.min) return b.rate;
  }
  return 0;
}

/**
 * Cumulative resident income tax on a taxable income, *excluding* the
 * Medicare levy.  Pure function over the Stage-3 brackets.
 *
 * Boundary values (ATO published):
 *   $18,200 → $0
 *   $45,000 → $4,288
 *   $135,000 → $31,288
 *   $190,000 → $51,638
 *
 * @example
 *   incomeTax(45_000)  // → 4_288
 *   incomeTax(100_000) // → 20_788
 */
export function incomeTax(taxableIncome: number): number {
  return incomeTaxOnTaxableIncome(taxableIncome);
}

/**
 * Marginal-rate options for UI dropdowns / button-groups.
 *
 * Each entry is the distinct marginal rate that appears in the 2024-25
 * resident bracket table, in ascending order.
 *
 * @example
 *   MARGINAL_RATE_OPTIONS.map(o => o.label)
 *   // → ["0%", "16%", "30%", "37%", "45%"]
 */
export const MARGINAL_RATE_OPTIONS: ReadonlyArray<{
  /** Display label, e.g. "30%". */
  label: string;
  /** Fraction value, e.g. 0.30. */
  value: number;
}> = [
  { label: "0%",  value: 0 },
  { label: "16%", value: 0.16 },
  { label: "30%", value: 0.30 },
  { label: "37%", value: 0.37 },
  { label: "45%", value: 0.45 },
] as const;
