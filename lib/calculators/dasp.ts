/**
 * DASP (Departing Australia Superannuation Payment) tax math.
 *
 * A temporary resident who permanently leaves Australia can claim their
 * super as a DASP. The payment is taxed at fixed Government rates that
 * CANNOT be reduced — so the cash received is materially less than the
 * account balance. This estimator surfaces that gap. FIN_NOTEBOOK #24
 * (cross-border, audience D — departing temp-visa holders).
 *
 * Rates for a DASP paid on or after 1 July 2017 (ATO):
 *   - Tax-free component:                 0%
 *   - Taxable component, taxed element:   35%
 *   - Taxable component, untaxed element: 45%
 *   - Working Holiday Maker (subclass 417/462) — "DASP WHM payment":
 *       65% on the ENTIRE taxable component (both taxed and untaxed
 *       elements). The tax-free component is still nil.
 *
 * Reference: ATO "Tax on DASP"
 * https://www.ato.gov.au/.../departing-australia-superannuation-payment
 *
 * Pure functions, no state — mirrors lib/calculators/cgt.ts. Used by the
 * DASP calculator component and any scenario helper. Low-income offsets,
 * proportioning rules and fund-specific fees are NOT modelled — this is a
 * headline withholding estimate, not personal tax advice (see DASP_WARNING
 * in lib/compliance.ts).
 */

export const DASP_TAXED_ELEMENT_RATE = 0.35;
export const DASP_UNTAXED_ELEMENT_RATE = 0.45;
export const DASP_WHM_RATE = 0.65;

export interface DaspInput {
  /**
   * Taxable component — taxed element. For most accumulation super this
   * is effectively the whole balance (employer + salary-sacrifice contits
   * and earnings). $.
   */
  taxedElement: number;
  /**
   * Taxable component — untaxed element (e.g. some public-sector /
   * untaxed funds). Defaults to 0. $.
   */
  untaxedElement?: number;
  /**
   * Tax-free component (non-concessional / after-tax contributions).
   * Taxed at 0%. Defaults to 0. $.
   */
  taxFreeComponent?: number;
  /**
   * True if the claimant held a Working Holiday Maker visa (subclass
   * 417 or 462) at any time — the DASP is then a "DASP WHM payment"
   * taxed at 65% on the whole taxable component.
   */
  isWorkingHolidayMaker?: boolean;
}

export interface DaspResult {
  /** Total super balance considered (sum of all components). */
  grossBalance: number;
  /** Tax-free component (taxed at 0%). */
  taxFreeComponent: number;
  /** Taxable component (taxed + untaxed elements). */
  taxableComponent: number;
  /** Tax withheld on the taxed element. */
  taxOnTaxedElement: number;
  /** Tax withheld on the untaxed element. */
  taxOnUntaxedElement: number;
  /** Total DASP tax withheld. */
  totalTax: number;
  /** Net cash the claimant receives after withholding. */
  netPayment: number;
  /** Total tax as a fraction of the gross balance (0-1). */
  effectiveRate: number;
  /** Whether WHM rates were applied. */
  isWorkingHolidayMaker: boolean;
}

/**
 * Estimate the tax withheld on, and net value of, a DASP claim.
 *
 * Negative inputs are floored to 0. When `isWorkingHolidayMaker` is set,
 * the entire taxable component is taxed at 65%; otherwise the taxed and
 * untaxed elements are taxed at 35% and 45% respectively. The tax-free
 * component is never taxed.
 */
export function computeDasp(input: DaspInput): DaspResult {
  const taxed = Math.max(0, input.taxedElement || 0);
  const untaxed = Math.max(0, input.untaxedElement || 0);
  const taxFree = Math.max(0, input.taxFreeComponent || 0);
  const isWhm = input.isWorkingHolidayMaker === true;

  const taxableComponent = taxed + untaxed;
  const grossBalance = taxableComponent + taxFree;

  const taxOnTaxedElement = isWhm
    ? taxed * DASP_WHM_RATE
    : taxed * DASP_TAXED_ELEMENT_RATE;
  const taxOnUntaxedElement = isWhm
    ? untaxed * DASP_WHM_RATE
    : untaxed * DASP_UNTAXED_ELEMENT_RATE;

  const totalTax = taxOnTaxedElement + taxOnUntaxedElement;
  const netPayment = grossBalance - totalTax;
  const effectiveRate = grossBalance > 0 ? totalTax / grossBalance : 0;

  return {
    grossBalance,
    taxFreeComponent: taxFree,
    taxableComponent,
    taxOnTaxedElement,
    taxOnUntaxedElement,
    totalTax,
    netPayment,
    effectiveRate,
    isWorkingHolidayMaker: isWhm,
  };
}
