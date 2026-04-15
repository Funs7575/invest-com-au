/**
 * Franking credit math.
 *
 * Computes the after-tax return on a fully or partially franked
 * Australian dividend, given the investor's marginal rate. Pure
 * functions, no state — used by the calculator components on
 * /calculators and by any scenario helper that needs to compute
 * an investor's net yield from an ASX dividend stream.
 *
 * Accuracy notes:
 *   - Uses the 30% corporate tax rate by default (the base-rate
 *     entity rate is 25% but most listed companies are not BREs).
 *   - Applies Medicare levy on top of the quoted marginal rate
 *     unless the caller sets `includeMedicare: false`.
 *   - Franking credits are refundable in Australia, so the
 *     excess-credit case returns a positive net yield boost.
 *   - Low-income offsets are NOT modelled — they're subject to
 *     phase-outs and calculator readers rarely need them at the
 *     margin. Comment tag this as a known simplification.
 */

export const CORPORATE_TAX_RATE_DEFAULT = 0.30;
export const MEDICARE_LEVY_RATE = 0.02;

export interface FrankingInput {
  /** Cash dividend received. $ per share or per year. */
  dividend: number;
  /** Franking percentage, 0-100. Partial franking is valid. */
  frankingPct: number;
  /** Investor marginal tax rate, 0-1 (e.g. 0.325 for 32.5%). */
  marginalRate: number;
  /**
   * Corporate tax rate used for the gross-up (defaults to 30%).
   * For base-rate entities set to 0.25.
   */
  corporateTaxRate?: number;
  /**
   * Whether to apply the 2% Medicare levy on top of the marginal
   * rate. Defaults to true.
   */
  includeMedicare?: boolean;
}

export interface FrankingResult {
  /** The raw dividend passed in. */
  dividend: number;
  /** Dollar amount of franking credit attached. */
  frankingCredit: number;
  /** dividend + frankingCredit — the "grossed-up" taxable amount. */
  grossedUp: number;
  /** Tax payable on the grossed-up amount at marginal + Medicare. */
  taxPayable: number;
  /**
   * Net dollars the investor keeps after tax offsets. Includes
   * refunded excess franking credits when the investor's marginal
   * rate is below the corporate rate.
   */
  netAfterTax: number;
  /**
   * Excess franking credits (positive → refund, negative → tax
   * shortfall that the investor owes).
   */
  excessCredits: number;
  /** Effective tax rate paid on the cash dividend. */
  effectiveTaxRate: number;
  /** Net yield as a percentage of the original dividend. */
  netYieldPct: number;
}

/**
 * Compute the after-tax return on a franked dividend.
 */
export function computeFranking(input: FrankingInput): FrankingResult {
  const dividend = Math.max(0, input.dividend);
  const frankingPct = Math.max(0, Math.min(100, input.frankingPct)) / 100;
  const corp = input.corporateTaxRate ?? CORPORATE_TAX_RATE_DEFAULT;
  const baseRate = Math.max(0, Math.min(1, input.marginalRate));
  const effective =
    input.includeMedicare === false ? baseRate : baseRate + MEDICARE_LEVY_RATE;

  // Franking credit: divGross = div / (1 - corp). The credit is
  // that gross minus the cash dividend, scaled by franking%.
  const frankingCredit =
    dividend > 0 && corp > 0 && corp < 1
      ? (dividend * frankingPct * corp) / (1 - corp)
      : 0;

  const grossedUp = dividend + frankingCredit;
  const taxPayable = grossedUp * effective;

  // In Australia, franking credits are refundable. If taxPayable <
  // frankingCredit the investor gets a cash refund of the excess.
  // Net return = cash dividend − tax payable + excess credits
  // (which mathematically equals grossedUp − taxPayable).
  const netAfterTax = grossedUp - taxPayable;
  const excessCredits = frankingCredit - taxPayable;

  const effectiveTaxRate = dividend > 0 ? (dividend - netAfterTax) / dividend : 0;
  // Net yield is how many dollars you keep per dollar of cash
  // dividend after tax. >100% means you earned more than the cash
  // because the franking credit refund more than covered the tax.
  const netYieldPct = dividend > 0 ? (netAfterTax / dividend) * 100 : 0;

  return {
    dividend,
    frankingCredit,
    grossedUp,
    taxPayable,
    netAfterTax,
    excessCredits,
    effectiveTaxRate,
    netYieldPct,
  };
}

/**
 * Convenience: compute franking over a portfolio of holdings.
 *
 * Takes an array of { dividend, frankingPct } and a single
 * marginalRate / corporateTaxRate, returns a per-holding result
 * array plus a totals row.
 */
export interface PortfolioHolding {
  label?: string;
  dividend: number;
  frankingPct: number;
}

export interface PortfolioFrankingResult {
  perHolding: Array<FrankingResult & { label?: string }>;
  totals: FrankingResult;
}

export function computeFrankingForPortfolio(
  holdings: PortfolioHolding[],
  marginalRate: number,
  opts: {
    corporateTaxRate?: number;
    includeMedicare?: boolean;
  } = {},
): PortfolioFrankingResult {
  const perHolding = holdings.map((h) => ({
    label: h.label,
    ...computeFranking({
      dividend: h.dividend,
      frankingPct: h.frankingPct,
      marginalRate,
      corporateTaxRate: opts.corporateTaxRate,
      includeMedicare: opts.includeMedicare,
    }),
  }));

  // Totals — sum then recompute derived fields so the percentages
  // reflect the aggregated cash, not an average of the averages.
  const totalDividend = perHolding.reduce((s, r) => s + r.dividend, 0);
  const totalCredit = perHolding.reduce((s, r) => s + r.frankingCredit, 0);
  const totalGross = perHolding.reduce((s, r) => s + r.grossedUp, 0);
  const totalTax = perHolding.reduce((s, r) => s + r.taxPayable, 0);
  const totalNet = perHolding.reduce((s, r) => s + r.netAfterTax, 0);
  const totalExcess = perHolding.reduce((s, r) => s + r.excessCredits, 0);

  return {
    perHolding,
    totals: {
      dividend: totalDividend,
      frankingCredit: totalCredit,
      grossedUp: totalGross,
      taxPayable: totalTax,
      netAfterTax: totalNet,
      excessCredits: totalExcess,
      effectiveTaxRate:
        totalDividend > 0 ? (totalDividend - totalNet) / totalDividend : 0,
      netYieldPct: totalDividend > 0 ? (totalNet / totalDividend) * 100 : 0,
    },
  };
}
