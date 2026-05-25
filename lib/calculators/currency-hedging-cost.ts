/**
 * Currency hedging cost calculator — pure math.
 *
 * Models the total cost of hedging a foreign-currency equity exposure
 * using currency forward contracts or rolling FX swaps — the mechanism
 * underpinning "AUD-hedged" ETFs and institutional currency overlays.
 *
 * What this calculator models
 * ---------------------------
 * When an investor holds foreign-currency assets but wants to remove
 * (or reduce) the AUD/FX exchange-rate risk, they can "hedge" by
 * entering a forward contract to sell the foreign currency forward at
 * a known AUD rate. The cost of that hedge is not zero — it is driven
 * by the Interest Rate Parity (IRP) principle:
 *
 *   Forward rate ≈ Spot rate × (1 + r_domestic) / (1 + r_foreign)
 *
 * where r_domestic = AUD risk-free rate and r_foreign = foreign (e.g. USD)
 * risk-free rate. When AUD rates are HIGHER than the foreign rate, the
 * forward price of the foreign currency in AUD is LOWER than the spot
 * price — meaning you sell the FX forward at a discount, which is the
 * "roll cost" (also called "negative carry" or "hedging drag").
 *
 * The annual hedging cost as a percentage of the hedged position:
 *
 *   hedgingCostPct ≈ r_domestic − r_foreign   (approximately, small rates)
 *
 * More precisely (covering the continuous-compounding case):
 *
 *   hedgingCostPct = (1 + r_domestic) / (1 + r_foreign) − 1
 *
 * The calculator exposes both the approximate linear form (which the
 * ETF prospectuses often cite) and the precise compound form.
 *
 * Academic reference
 * ------------------
 * Covered Interest Rate Parity (CIP) — the forward premium / discount
 * equals the interest rate differential. See:
 *   RBA Research Discussion Paper 2013-02, "Currency Hedging:
 *   The Role of Foreign Exchange Risk in Long-Run International
 *   Portfolio Decisions" (John Kareken & Neil Wallace framework).
 *
 * Regulator context
 * -----------------
 * ASIC's MoneySmart notes that "currency hedging has a cost" in its ETF
 * guidance. Betashares and iShares publish the hedging cost component in
 * their hedged ETF PDS (e.g. IHVV at ~0.06% roll cost above the stated MER).
 * This calculator models that mechanics.
 *
 * Tolerance and precision
 * -----------------------
 * No floating-point accumulation risk — all arithmetic is single-step
 * multiplication/division. Outputs are fractional (e.g. 0.0150 = 1.50%).
 * The caller is responsible for display rounding.
 *
 * Why this lives in lib/ separately from the page component
 * ----------------------------------------------------------
 * The W-NEW-01 regulator-reference test pattern needs a pure function.
 * The page component at `app/global-investing/calculators/currency-hedging-cost/page.tsx`
 * runs the same math inline (browser-side) but imports from here for
 * testability.
 */

/** Inputs to the hedging cost calculation. */
export interface HedgingCostInput {
  /**
   * Position size in AUD. Must be > 0.
   * E.g. 50_000 for a $50,000 foreign-currency equity exposure.
   */
  positionAUD: number;
  /**
   * AUD risk-free rate (annualised, as a fraction, e.g. 0.043 for 4.3%).
   * Use the current RBA cash rate or the 3-month BBSW as a proxy.
   */
  audRate: number;
  /**
   * Foreign currency risk-free rate (annualised, as a fraction).
   * Use the relevant central bank policy rate or 3-month interbank rate.
   * E.g. 0.053 for 5.3% (US Federal Funds rate illustrative).
   */
  foreignRate: number;
  /**
   * Proportion of the position that is hedged (0–1, default 1.0 = fully hedged).
   * Pass 0.5 for 50% hedged.
   */
  hedgeRatio?: number;
  /**
   * Holding period in years. Default 1.0.
   * Used to scale the cost to a non-annual period.
   */
  holdingYears?: number;
}

/** Outputs of the hedging cost calculation. */
export interface HedgingCostResult {
  /** Annual hedging cost as a percentage of the hedged notional (e.g. 0.01 = 1%). */
  annualHedgingCostPct: number;
  /**
   * More precise compound version (using (1+r_aud)/(1+r_foreign) − 1).
   * Differs from the approximate linear version for large rate differentials.
   */
  annualHedgingCostPctPrecise: number;
  /** Whether the hedge has positive or negative carry. */
  carryDirection: "cost" | "benefit" | "neutral";
  /** Annual hedging cost (or benefit) in AUD dollars (approximate linear form). */
  annualHedgingCostAUD: number;
  /** Total hedging cost over the specified holding period in AUD. */
  totalCostAUD: number;
  /** Effective AUD position size after applying the hedge ratio. */
  hedgedNotionalAUD: number;
  /** Echoed inputs for consumer convenience. */
  inputs: Required<HedgingCostInput>;
}

/**
 * Compute the cost of hedging a foreign-currency equity position.
 * Pure function; no I/O, no state.
 *
 * @param input - Hedging cost inputs (rates as fractions, not percentages).
 * @returns Detailed hedging cost breakdown.
 */
export function computeHedgingCost(input: HedgingCostInput): HedgingCostResult {
  const positionAUD = Math.max(0, input.positionAUD);
  const audRate = input.audRate;
  const foreignRate = input.foreignRate;
  const hedgeRatio = Math.max(0, Math.min(1, input.hedgeRatio ?? 1));
  const holdingYears = Math.max(0, input.holdingYears ?? 1);

  // Normalised inputs echoed back.
  const normalisedInputs: Required<HedgingCostInput> = {
    positionAUD,
    audRate,
    foreignRate,
    hedgeRatio,
    holdingYears,
  };

  // ─── Annual hedging cost (approximate linear form) ──────────────────
  // hedgingCostPct ≈ r_aud − r_foreign
  // Positive = cost (AUD rates > foreign rates, forward sells at discount)
  // Negative = benefit (AUD rates < foreign rates, forward sells at premium)
  const annualHedgingCostPct = audRate - foreignRate;

  // ─── Precise compound form ──────────────────────────────────────────
  // (1 + r_aud) / (1 + r_foreign) − 1
  const annualHedgingCostPctPrecise =
    (1 + audRate) / (1 + foreignRate) - 1;

  // ─── Carry direction ─────────────────────────────────────────────────
  const carryDirection: HedgingCostResult["carryDirection"] =
    annualHedgingCostPct > 1e-8
      ? "cost"
      : annualHedgingCostPct < -1e-8
      ? "benefit"
      : "neutral";

  // ─── Dollar amounts (using approximate linear form, consistent with
  //     how ETF providers report hedging costs in PDS/TMDs) ─────────────
  const hedgedNotionalAUD = positionAUD * hedgeRatio;
  const annualHedgingCostAUD = hedgedNotionalAUD * annualHedgingCostPct;

  // Compound the cost over the holding period:
  //   totalCost = notional × ((1 + r_aud)^T / (1 + r_foreign)^T − 1)
  // This is the precise form scaled to the holding period.
  const totalCostAUD =
    hedgedNotionalAUD *
    (Math.pow(1 + audRate, holdingYears) /
      Math.pow(1 + foreignRate, holdingYears) -
      1);

  return {
    annualHedgingCostPct,
    annualHedgingCostPctPrecise,
    carryDirection,
    annualHedgingCostAUD,
    totalCostAUD,
    hedgedNotionalAUD,
    inputs: normalisedInputs,
  };
}
