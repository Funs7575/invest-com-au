/**
 * Income tax on investment income — pure math.
 *
 * Estimates the Australian income tax a resident individual pays on
 * a year's worth of *investment* income, run through the full
 * progressive resident tax scale (NOT a single flat marginal rate).
 *
 * This is the gap the existing single-rate calculators leave open.
 * `/cgt-calculator` (`lib/calculators/cgt.ts`) and
 * `/franking-credits-calculator` (`lib/franking-math.ts`) both ask
 * the user to pick a marginal rate and apply it flatly to ONE
 * income type. Neither models bracket progression, and neither
 * combines income streams. Investors with a salary plus a mix of
 * interest, dividends and a realised capital gain cannot see their
 * real tax bill from those tools.
 *
 * This function takes the investor's other (e.g. salary) taxable
 * income as a base, stacks the investment income on top, and reads
 * the *marginal* tax off the combined progressive scale — so the
 * franking-credit offset, CGT discount and Medicare levy all land
 * at the bracket the investment income actually pushes into.
 *
 * Scope discipline
 * ----------------
 * Intentionally narrow. It models:
 *   - The resident progressive tax scale + 2% Medicare levy.
 *   - Interest (taxed in full).
 *   - Unfranked dividends (taxed in full).
 *   - Franked dividends: grossed up by the attached franking
 *     credit, taxed, then the franking credit applied as a
 *     refundable offset (Australia refunds excess credits).
 *   - Net capital gain with the optional 50% individual CGT
 *     discount for assets held > 12 months.
 *
 * It does NOT model: the Medicare levy surcharge, the low-income
 * tax offset (LITO), private-health rebates, HELP/HECS repayments,
 * the 45-day franking holding rule, capital losses / carry-forward,
 * super-fund (15%) or company rates, non-resident scales, or the
 * base-rate-entity 25% corporate rate. Those are deliberately out
 * of scope for a general-information estimator and would each need
 * founder review of the math before shipping.
 *
 * Tax year
 * --------
 * Uses the resident scale in effect from 1 July 2024 (the "Stage 3"
 * rates), which applies for the 2024-25 and 2025-26 income years.
 *
 * References
 * ----------
 *   ATO "Individual income tax rates" (resident, 2024-25):
 *     https://www.ato.gov.au/tax-rates-and-codes/tax-rates-australian-residents
 *   ATO "Medicare levy":
 *     https://www.ato.gov.au/individuals-and-families/medicare-and-private-health-insurance/medicare-levy
 *   ATO "You and your shares" (franking credits / gross-up):
 *     https://www.ato.gov.au/individuals-and-families/investments-and-assets/investing-in-shares
 *   ATO "CGT discount":
 *     https://www.ato.gov.au/individuals-and-families/investments-and-assets/capital-gains-tax/cgt-discount
 */

/** Default corporate tax rate used to gross up franked dividends. */
export const CORPORATE_TAX_RATE_DEFAULT = 0.3;

/** Statutory Medicare levy rate applied on top of income tax. */
export const MEDICARE_LEVY_RATE = 0.02;

/** 50% individual CGT discount for assets held > 12 months. */
export const CGT_DISCOUNT_INDIVIDUAL = 0.5;

/**
 * Resident income tax scale in effect from 1 July 2024.
 *
 * Each bracket charges `rate` on income between `min` (exclusive of
 * the previous bracket's ceiling) and `max` (inclusive). The top
 * bracket has `max: Infinity`.
 */
export interface TaxBracket {
  /** Lower bound of the bracket (income at or above this is taxed). */
  min: number;
  /** Upper bound of the bracket; Infinity for the top bracket. */
  max: number;
  /** Marginal rate applied within the bracket (fraction, e.g. 0.3). */
  rate: number;
}

export const RESIDENT_TAX_BRACKETS_2024_25: readonly TaxBracket[] = [
  { min: 0, max: 18_200, rate: 0 },
  { min: 18_200, max: 45_000, rate: 0.16 },
  { min: 45_000, max: 135_000, rate: 0.3 },
  { min: 135_000, max: 190_000, rate: 0.37 },
  { min: 190_000, max: Infinity, rate: 0.45 },
];

/**
 * Progressive income tax on a taxable income, excluding the
 * Medicare levy. Pure function over {@link RESIDENT_TAX_BRACKETS_2024_25}.
 */
export function incomeTaxOnTaxableIncome(
  taxableIncome: number,
  brackets: readonly TaxBracket[] = RESIDENT_TAX_BRACKETS_2024_25,
): number {
  const income = Math.max(0, taxableIncome);
  let tax = 0;
  for (const b of brackets) {
    if (income <= b.min) break;
    const upper = Math.min(income, b.max);
    tax += (upper - b.min) * b.rate;
  }
  return tax;
}

export interface InvestmentIncomeInput {
  /**
   * The investor's OTHER assessable income for the year (e.g.
   * salary/wages) before any investment income. Used as the base
   * the investment income stacks on top of, so the marginal rate is
   * read at the right bracket. Defaults to 0 (investment income
   * only). Must be ≥ 0.
   */
  otherTaxableIncome?: number;
  /** Interest income (bank/term deposit/bond). Taxed in full. */
  interest?: number;
  /** Unfranked dividends / foreign dividends. Taxed in full. */
  unfrankedDividends?: number;
  /** Cash amount of franked dividends received (before gross-up). */
  frankedDividends?: number;
  /**
   * Franking percentage on the franked dividends, 0-100. 100 for
   * fully franked. Defaults to 100.
   */
  frankingPct?: number;
  /**
   * Gross realised capital gain for the year (proceeds − cost base),
   * before any CGT discount. Use 0 if none. Must be ≥ 0.
   */
  capitalGain?: number;
  /**
   * Whether the capital-gain assets were held > 12 months and so
   * qualify for the 50% individual CGT discount. Defaults to false.
   */
  capitalGainDiscountEligible?: boolean;
  /**
   * Corporate tax rate used to gross up franked dividends. Defaults
   * to 30%. Set to 0.25 for base-rate entities.
   */
  corporateTaxRate?: number;
  /**
   * Whether to apply the 2% Medicare levy. Defaults to true. (The
   * estimator does not model the levy's low-income reduction
   * threshold — it applies the flat 2%.)
   */
  includeMedicare?: boolean;
}

export interface InvestmentIncomeResult {
  /** Other (salary) income echoed back. */
  otherTaxableIncome: number;
  /** Interest component echoed back. */
  interest: number;
  /** Unfranked dividend component echoed back. */
  unfrankedDividends: number;
  /** Cash franked dividend component echoed back. */
  frankedDividends: number;
  /** Dollar value of the franking credits attached to the franked dividends. */
  frankingCredits: number;
  /** Gross capital gain echoed back. */
  capitalGain: number;
  /**
   * Assessable (taxable) portion of the capital gain after the 50%
   * discount, if eligible. Equals `capitalGain` when not eligible.
   */
  assessableCapitalGain: number;
  /**
   * Total assessable income = other + interest + unfranked +
   * (franked cash + franking credits) + assessable capital gain.
   */
  totalAssessableIncome: number;
  /** Progressive income tax on the total assessable income (pre-levy). */
  incomeTax: number;
  /** Medicare levy charged on the total assessable income. */
  medicareLevy: number;
  /**
   * Gross tax before franking offsets (incomeTax + medicareLevy).
   */
  grossTax: number;
  /**
   * Net tax payable AFTER applying the refundable franking-credit
   * offset. Negative means the franking credits exceed the tax bill
   * and a cash refund is due (shown as a positive `refund`).
   */
  netTaxPayable: number;
  /**
   * Cash refund from excess franking credits (0 if tax payable is
   * positive). Always ≥ 0.
   */
  refund: number;
  /**
   * Tax attributable to the investment income alone — the marginal
   * effect of adding it on top of `otherTaxableIncome`. This is the
   * "how much extra tax does my investing cost me" figure. Includes
   * the Medicare levy on the investment income and is net of
   * franking offsets.
   */
  taxOnInvestmentIncome: number;
  /**
   * Total cash the investor keeps from the investment income after
   * tax (cash income received − taxOnInvestmentIncome). Cash income
   * excludes the notional franking credit gross-up but the franking
   * offset is already netted into `taxOnInvestmentIncome`.
   */
  netInvestmentIncome: number;
  /**
   * Effective tax rate on the cash investment income, as a
   * percentage (0 when there is no cash investment income).
   */
  effectiveRateOnInvestmentIncome: number;
}

/**
 * Estimate Australian income tax on a year's investment income.
 *
 * Stacks investment income on top of `otherTaxableIncome`, runs the
 * combined total through the progressive resident scale + Medicare
 * levy, then applies the refundable franking-credit offset. The
 * "tax on investment income" figure is the marginal difference
 * between the with- and without-investment-income tax bills, which
 * correctly attributes bracket progression to the investment income.
 *
 * Pure function; no I/O, no state.
 */
export function computeInvestmentIncomeTax(
  input: InvestmentIncomeInput,
): InvestmentIncomeResult {
  const otherTaxableIncome = Math.max(0, input.otherTaxableIncome ?? 0);
  const interest = Math.max(0, input.interest ?? 0);
  const unfrankedDividends = Math.max(0, input.unfrankedDividends ?? 0);
  const frankedDividends = Math.max(0, input.frankedDividends ?? 0);
  const frankingPct = Math.max(0, Math.min(100, input.frankingPct ?? 100)) / 100;
  const capitalGain = Math.max(0, input.capitalGain ?? 0);
  const corp = clampRate(input.corporateTaxRate ?? CORPORATE_TAX_RATE_DEFAULT);
  const includeMedicare = input.includeMedicare !== false;

  // Franking credit: grossUp = cash / (1 - corp); credit = grossUp - cash,
  // scaled by the franking percentage.
  const frankingCredits =
    frankedDividends > 0 && corp > 0 && corp < 1
      ? (frankedDividends * frankingPct * corp) / (1 - corp)
      : 0;

  // CGT discount: only the discounted half is assessable when eligible.
  const assessableCapitalGain = input.capitalGainDiscountEligible
    ? capitalGain * (1 - CGT_DISCOUNT_INDIVIDUAL)
    : capitalGain;

  // Investment income that is added to assessable income. Note the
  // grossed-up franked amount (cash + credits) is what enters the
  // tax base, per the imputation rules.
  const assessableInvestmentIncome =
    interest +
    unfrankedDividends +
    frankedDividends +
    frankingCredits +
    assessableCapitalGain;

  const totalAssessableIncome = otherTaxableIncome + assessableInvestmentIncome;

  const medicareRate = includeMedicare ? MEDICARE_LEVY_RATE : 0;

  // Gross tax on the full assessable income (incl. investment income).
  const incomeTax = incomeTaxOnTaxableIncome(totalAssessableIncome);
  const medicareLevy = totalAssessableIncome * medicareRate;
  const grossTax = incomeTax + medicareLevy;

  // Refundable franking offset reduces the tax bill; excess is a cash refund.
  const netTaxRaw = grossTax - frankingCredits;
  const netTaxPayable = netTaxRaw;
  const refund = netTaxRaw < 0 ? -netTaxRaw : 0;

  // Marginal tax attributable to the investment income: the
  // difference between the tax bill with and without it. This
  // captures bracket progression correctly and nets out the
  // franking offset (which only exists because of the dividends).
  const baseIncomeTax = incomeTaxOnTaxableIncome(otherTaxableIncome);
  const baseMedicare = otherTaxableIncome * medicareRate;
  const baseTax = baseIncomeTax + baseMedicare;
  const taxOnInvestmentIncome = netTaxPayable - baseTax;

  // Cash the investor actually received from investing (excludes the
  // notional franking gross-up — that's a credit, not cash in hand).
  const cashInvestmentIncome =
    interest + unfrankedDividends + frankedDividends + capitalGain;
  const netInvestmentIncome = cashInvestmentIncome - taxOnInvestmentIncome;

  const effectiveRateOnInvestmentIncome =
    cashInvestmentIncome > 0
      ? (taxOnInvestmentIncome / cashInvestmentIncome) * 100
      : 0;

  return {
    otherTaxableIncome,
    interest,
    unfrankedDividends,
    frankedDividends,
    frankingCredits,
    capitalGain,
    assessableCapitalGain,
    totalAssessableIncome,
    incomeTax,
    medicareLevy,
    grossTax,
    netTaxPayable,
    refund,
    taxOnInvestmentIncome,
    netInvestmentIncome,
    effectiveRateOnInvestmentIncome,
  };
}

/** Clamp a rate-like fraction into [0, 1]. */
function clampRate(rate: number): number {
  if (Number.isNaN(rate)) return 0;
  return Math.max(0, Math.min(1, rate));
}
