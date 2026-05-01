/**
 * Capital gains tax (CGT) — pure math.
 *
 * Mirrors the math the on-page CGT estimator at /cgt-calculator
 * (`app/calculators/_components/CgtCalculator.tsx`) runs inline:
 * apply the user's marginal rate to the gain (optionally
 * discounted by 50% for the held-12-months individual / 33.33%
 * super case). This is the "marginal-effect" calculation a
 * taxpayer reaches for when they want to see what the discount is
 * worth at their bracket — it is NOT a full progressive-bracket
 * tax-return calculation. The component does not model bracket
 * progression, low-income offsets, Medicare levy, or any
 * carry-forward losses, so this function does not either. Adding
 * those is BB-03's full DoD work and requires founder review of
 * the math before shipping.
 *
 * Why this lives in lib/ separately from the component
 * ----------------------------------------------------
 * The W-NEW-01 regulator-reference test pattern needs a pure
 * function to call. Extracting the math into a typed export lets
 * `__tests__/lib/cgt-reference.test.ts` pin the calculator to the
 * ATO's published worked examples without touching the component
 * (Tier B: additive only).
 *
 * Future BB-03 work can swap the component to import this
 * function so the on-page calc and the regulator-reference test
 * share a single source of truth. Until then, keep these two
 * implementations behaviourally identical.
 *
 * Discount rates
 * --------------
 *   Individual / trust holding > 12 months → 50% discount
 *   Complying super fund holding > 12 months → 33.33% discount
 *   Companies → no CGT discount (not modelled here; companies
 *     don't appear in the on-page calculator's UI)
 *
 * References
 * ----------
 *   ATO "CGT discount":
 *     https://www.ato.gov.au/individuals-and-families/investments-and-assets/capital-gains-tax/cgt-discount
 *   ATO "Working out your net capital gain or loss":
 *     https://www.ato.gov.au/individuals-and-families/investments-and-assets/capital-gains-tax/working-out-your-capital-gain-or-loss/working-out-your-net-capital-gain-or-loss
 */

/** 50% individual / trust CGT discount for assets held > 12 months. */
export const CGT_DISCOUNT_INDIVIDUAL = 0.5;
/**
 * 33.33% complying-super-fund CGT discount for assets held > 12
 * months. Per ATO "CGT discount" page: super funds get one third
 * (33⅓%) instead of one half.
 */
export const CGT_DISCOUNT_SUPER = 1 / 3;

/** Holder type — drives which discount rate applies. */
export type CgtHolder = "individual" | "super";

export interface CgtInput {
  /**
   * Gross capital gain (sale proceeds − cost base) in AUD. Must
   * be ≥ 0; for losses use a different code path (carry-forward).
   */
  gain: number;
  /**
   * Investor's marginal tax rate as a fraction (e.g. `0.37` for
   * 37%). Excludes Medicare levy — the on-page calc does not
   * surface Medicare in this view.
   */
  marginalRate: number;
  /**
   * `true` if the asset was held for more than 12 months and
   * therefore qualifies for the CGT discount.
   */
  held12Months: boolean;
  /**
   * Holder type — drives the discount rate. Defaults to
   * `"individual"` (50% discount) to match the on-page calculator
   * default.
   */
  holder?: CgtHolder;
}

export interface CgtResult {
  /** Original gross gain, echoed back. */
  gain: number;
  /**
   * Tax payable IF no discount is applied (gross gain × marginal
   * rate). The ATO uses this baseline in its "the discount saves
   * you $X" worked examples.
   */
  taxWithoutDiscount: number;
  /**
   * Tax payable WITH the discount applied (discounted gain ×
   * marginal rate). Equals `taxWithoutDiscount` when
   * `held12Months` is false.
   */
  taxWithDiscount: number;
  /**
   * The discounted gain itself (the "assessable" amount that flows
   * into the tax return). Equals `gain` when no discount applies.
   */
  discountedGain: number;
  /**
   * Tax saved by the discount (`taxWithoutDiscount −
   * taxWithDiscount`). Always ≥ 0.
   */
  taxSaved: number;
  /**
   * Effective CGT rate without the discount, as a percentage of
   * the gross gain (e.g. 37 for 37%). Returns 0 when `gain` is 0.
   */
  effectiveRateWithoutDiscount: number;
  /**
   * Effective CGT rate with the discount applied, as a
   * percentage of the gross gain. Returns 0 when `gain` is 0.
   */
  effectiveRateWithDiscount: number;
}

/**
 * Compute the capital-gains-tax effect of selling a single asset
 * at a marginal tax rate. Pure function; no I/O, no state.
 *
 * Mirrors `app/calculators/_components/CgtCalculator.tsx` lines
 * 36–44 (parseFloat + Math; same semantics) plus the explicit
 * super-fund discount path that the on-page calc does not yet
 * surface.
 */
export function computeCgt(input: CgtInput): CgtResult {
  const gain = Math.max(0, input.gain);
  const mr = Math.max(0, Math.min(1, input.marginalRate));

  const discountRate =
    input.held12Months
      ? input.holder === "super"
        ? CGT_DISCOUNT_SUPER
        : CGT_DISCOUNT_INDIVIDUAL
      : 0;

  const taxWithoutDiscount = gain * mr;
  const discountedGain = gain * (1 - discountRate);
  const taxWithDiscount = discountedGain * mr;
  const taxSaved = taxWithoutDiscount - taxWithDiscount;

  const effectiveRateWithoutDiscount = gain > 0 ? (taxWithoutDiscount / gain) * 100 : 0;
  const effectiveRateWithDiscount = gain > 0 ? (taxWithDiscount / gain) * 100 : 0;

  return {
    gain,
    taxWithoutDiscount,
    taxWithDiscount,
    discountedGain,
    taxSaved,
    effectiveRateWithoutDiscount,
    effectiveRateWithDiscount,
  };
}
