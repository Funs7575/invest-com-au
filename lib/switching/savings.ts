/**
 * "Cost of staying vs switching" estimate for each asset class.
 *
 * Pure functions — no side effects, no I/O, fully testable.
 * Reuses the same fee parsing logic as SwitchingCalculatorClient.tsx
 * so the two tools stay in sync. The broker calc is the existing logic
 * extracted into a named export; super and savings add new asset classes.
 *
 * AFSL note: these functions produce FACTUAL ESTIMATES based on user-
 * supplied inputs. They do not recommend a specific product. The UI layer
 * is responsible for surfacing the GENERAL_ADVICE_WARNING alongside any
 * estimate output.
 */

// ─── Fee string parser (shared with switching-calculator) ─────────────────────

/**
 * Parses a fee string like "$19.95", "0.5%", "$0", "Free" into a
 * {flat, pct} pair. Mirrors parseFee() in SwitchingCalculatorClient.tsx.
 */
export function parseFee(feeStr: string | null | undefined): {
  flat: number;
  pct: number;
} {
  if (!feeStr) return { flat: 0, pct: 0 };
  const s = feeStr.replace(/,/g, "").trim();
  const pctMatch = s.match(/([\d.]+)%/);
  if (pctMatch) {
    const pctRaw = pctMatch[1];
    return { flat: 0, pct: parseFloat(pctRaw ?? "0") / 100 };
  }
  const flatMatch = s.match(/\$([\d.]+)/);
  if (flatMatch) {
    const flatRaw = flatMatch[1];
    return { flat: parseFloat(flatRaw ?? "0"), pct: 0 };
  }
  // "$0", "free", "0" all collapse to zero
  if (s === "0" || s.toLowerCase().includes("free") || s === "$0") {
    return { flat: 0, pct: 0 };
  }
  return { flat: 0, pct: 0 };
}

// ─── Broker switching saving ──────────────────────────────────────────────────

export interface BrokerFeeInputs {
  /** ASX fee string for the current broker, e.g. "$19.95" or "0.5%" */
  currentAsxFee: string | null | undefined;
  /** ASX fee string for the target broker */
  targetAsxFee: string | null | undefined;
  /** US fee string for current broker */
  currentUsFee?: string | null;
  /** US fee string for target broker */
  targetUsFee?: string | null;
  /** FX rate in whole-number form (e.g. 0.70 means 0.70% = 0.007) */
  currentFxRate?: number | null;
  targetFxRate?: number | null;
  /** Annual inactivity fee as a raw dollar string, e.g. "$50" */
  currentInactivityFee?: string | null;
  targetInactivityFee?: string | null;
  /** Number of trades per year */
  tradesPerYear: number;
  /** Average trade size in AUD */
  avgTradeSize: number;
  /** Percentage of trades that are US shares (0–100) */
  usAllocationPct: number;
}

export interface BrokerSavingResult {
  currentAnnualCost: number;
  targetAnnualCost: number;
  /** Positive = saving by switching; negative = more expensive */
  annualDifference: number;
  /** Projection at [1, 2, 3, 5] years */
  projectedSavings: { years: number; saving: number }[];
}

/**
 * Estimates the annual cost difference between a current and target broker.
 *
 * Uses the same math as SwitchingCalculatorClient.tsx / calcAnnualCost().
 * Both sides are calculated deterministically from the inputs — no randomness.
 */
export function calcBrokerSaving(inputs: BrokerFeeInputs): BrokerSavingResult {
  const { tradesPerYear, avgTradeSize, usAllocationPct } = inputs;

  const asxTrades = Math.round(tradesPerYear * (1 - usAllocationPct / 100));
  const usTrades = tradesPerYear - asxTrades;

  function annualCost(
    asxFee: string | null | undefined,
    usFee: string | null | undefined,
    fxRate: number | null | undefined,
    inactivityFee: string | null | undefined,
  ): number {
    const { flat: asxFlat, pct: asxPct } = parseFee(asxFee);
    const { flat: usFlat, pct: usPct } = parseFee(usFee);
    const fx = fxRate ? fxRate / 100 : 0.007;
    const inactivity = inactivityFee
      ? parseFloat(inactivityFee.replace(/[^0-9.]/g, "")) || 0
      : 0;

    const asxCost = asxTrades * Math.max(asxFlat, asxPct * avgTradeSize);
    const usCost = usTrades * Math.max(usFlat, usPct * avgTradeSize);
    const fxCost = usTrades * avgTradeSize * fx;

    return asxCost + usCost + fxCost + inactivity;
  }

  const currentAnnualCost = annualCost(
    inputs.currentAsxFee,
    inputs.currentUsFee,
    inputs.currentFxRate,
    inputs.currentInactivityFee,
  );
  const targetAnnualCost = annualCost(
    inputs.targetAsxFee,
    inputs.targetUsFee,
    inputs.targetFxRate,
    inputs.targetInactivityFee,
  );

  const annualDifference = currentAnnualCost - targetAnnualCost;

  const projectedSavings = [1, 2, 3, 5].map((years) => ({
    years,
    saving: Math.round(annualDifference * years),
  }));

  return {
    currentAnnualCost: Math.round(currentAnnualCost * 100) / 100,
    targetAnnualCost: Math.round(targetAnnualCost * 100) / 100,
    annualDifference: Math.round(annualDifference * 100) / 100,
    projectedSavings,
  };
}

// ─── Super fund switching saving ──────────────────────────────────────────────

export interface SuperFeeInputs {
  /** Annual balance in AUD (used to estimate the $ impact of fee differences) */
  balance: number;
  /**
   * Current fund's annual fee as a percentage of balance (admin + investment fee).
   * Entered as percentage points (e.g. 1.5 for 1.5%).
   */
  currentFeeRatePct: number;
  /**
   * Target fund's annual fee as a percentage of balance.
   */
  targetFeeRatePct: number;
  /**
   * Current fund's fixed annual admin fee in AUD (flat $ component).
   * Defaults to 0 if not applicable.
   */
  currentFixedFeeAud?: number;
  /**
   * Target fund's fixed annual admin fee in AUD.
   */
  targetFixedFeeAud?: number;
}

export interface SuperSavingResult {
  currentAnnualFee: number;
  targetAnnualFee: number;
  /** Positive = saving by switching */
  annualDifference: number;
  projectedSavings: { years: number; saving: number }[];
}

/**
 * Estimates the annual fee saving from switching super funds.
 *
 * Calculates total fees as: (balance × rate%) + fixed fee.
 * Does NOT model investment returns or compound growth — the estimate is
 * a flat fee comparison only, surfaced as "potential annual fee saving".
 * This is intentionally conservative and factual.
 */
export function calcSuperSaving(inputs: SuperFeeInputs): SuperSavingResult {
  const {
    balance,
    currentFeeRatePct,
    targetFeeRatePct,
    currentFixedFeeAud = 0,
    targetFixedFeeAud = 0,
  } = inputs;

  const currentAnnualFee =
    balance * (currentFeeRatePct / 100) + currentFixedFeeAud;
  const targetAnnualFee =
    balance * (targetFeeRatePct / 100) + targetFixedFeeAud;

  const annualDifference = currentAnnualFee - targetAnnualFee;

  const projectedSavings = [1, 2, 3, 5].map((years) => ({
    years,
    saving: Math.round(annualDifference * years),
  }));

  return {
    currentAnnualFee: Math.round(currentAnnualFee * 100) / 100,
    targetAnnualFee: Math.round(targetAnnualFee * 100) / 100,
    annualDifference: Math.round(annualDifference * 100) / 100,
    projectedSavings,
  };
}

// ─── Savings account switching saving ────────────────────────────────────────

export interface SavingsFeeInputs {
  /** Cash balance in AUD */
  balance: number;
  /**
   * Current account's interest rate (% p.a.) — use the ongoing rate,
   * not the introductory/honeymoon rate.
   */
  currentRatePct: number;
  /**
   * Target account's interest rate (% p.a.).
   * Use the ongoing rate for a fair comparison.
   */
  targetRatePct: number;
  /**
   * Current account's monthly fee in AUD (0 if fee-free).
   */
  currentMonthlyFeeAud?: number;
  /**
   * Target account's monthly fee in AUD.
   */
  targetMonthlyFeeAud?: number;
}

export interface SavingsSavingResult {
  currentAnnualInterest: number;
  targetAnnualInterest: number;
  currentAnnualFees: number;
  targetAnnualFees: number;
  /** Net annual gain (interest gain minus any fee difference) */
  annualDifference: number;
  projectedSavings: { years: number; saving: number }[];
}

/**
 * Estimates the annual gain from switching savings accounts.
 *
 * Calculates net difference as:
 *   (target interest - current interest) - (target fees - current fees)
 *
 * Uses simple (non-compounding) interest for transparency.
 * Does NOT account for introductory rates — use the ongoing rate.
 */
export function calcSavingsSaving(
  inputs: SavingsFeeInputs,
): SavingsSavingResult {
  const {
    balance,
    currentRatePct,
    targetRatePct,
    currentMonthlyFeeAud = 0,
    targetMonthlyFeeAud = 0,
  } = inputs;

  const currentAnnualInterest = balance * (currentRatePct / 100);
  const targetAnnualInterest = balance * (targetRatePct / 100);
  const currentAnnualFees = currentMonthlyFeeAud * 12;
  const targetAnnualFees = targetMonthlyFeeAud * 12;

  const currentNet = currentAnnualInterest - currentAnnualFees;
  const targetNet = targetAnnualInterest - targetAnnualFees;
  const annualDifference = targetNet - currentNet;

  const projectedSavings = [1, 2, 3, 5].map((years) => ({
    years,
    saving: Math.round(annualDifference * years),
  }));

  return {
    currentAnnualInterest: Math.round(currentAnnualInterest * 100) / 100,
    targetAnnualInterest: Math.round(targetAnnualInterest * 100) / 100,
    currentAnnualFees: Math.round(currentAnnualFees * 100) / 100,
    targetAnnualFees: Math.round(targetAnnualFees * 100) / 100,
    annualDifference: Math.round(annualDifference * 100) / 100,
    projectedSavings,
  };
}
