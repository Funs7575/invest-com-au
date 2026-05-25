/**
 * Scenario Planning Engine — pure, composed projection model.
 *
 * Chains the retirement projection, super-contributions tax logic,
 * investment-income-tax estimator, and property/CGT projection into a single
 * typed result so the planner page can drive all four from one input form
 * without duplicating any formulas.
 *
 * Design decisions
 * ----------------
 * - PURE function at the top level (`computeScenario`). No I/O, no state.
 *   Trivially testable and sharable between server (RSC) and client.
 * - Calls the EXISTING pure helpers:
 *     `computeInvestmentIncomeTax`  (lib/calculators/investment-income-tax.ts)
 *     `computeCgt`                  (lib/calculators/cgt.ts)
 *   Retirement and super-contributions maths are extracted verbatim from the
 *   existing inline component maths (RetirementCalculatorClient.tsx,
 *   SuperContributionsClient.tsx) into this module so they can be tested
 *   independently and composed without touching the component tree.
 * - The result is a value-object — all numbers pre-computed, no lazy getters.
 *   This makes serialisation (save to user_calculator_state) trivial.
 *
 * AFSL scope
 * ----------
 * Outputs are factual projections only. Every surface that renders these
 * results MUST display `GENERAL_ADVICE_WARNING` from `lib/compliance.ts`.
 * No personalised recommendations are produced here.
 *
 * Tax-year assumptions
 * --------------------
 * Uses FY2026 rates (SG 11.5%, concessional cap $30k, resident Stage-3
 * brackets). Annotated where a future rate-change would need updating.
 */

import { computeInvestmentIncomeTax } from "@/lib/calculators/investment-income-tax";
import { computeCgt, type CgtResult } from "@/lib/calculators/cgt";

// ─── FY2026 super constants (keep in sync with SuperContributionsClient.tsx) ──
export const CONCESSIONAL_CAP = 30_000;
export const NON_CONCESSIONAL_CAP = 120_000;
export const BRING_FORWARD_CAP = 360_000;
export const DIV293_THRESHOLD = 250_000;
export const DIV293_EXTRA_RATE = 0.15;
export const SUPER_TAX_RATE = 0.15;
export const CARRY_FORWARD_BALANCE_THRESHOLD = 500_000;
/** SG rate from 1 July 2025 (FY2026). Next step: 12% from 1 July 2026. */
export const DEFAULT_SG_RATE = 0.115;

// ─── Input type ────────────────────────────────────────────────────────────────

export interface ScenarioInput {
  // ── Identity / time ──────────────────────────────────────────────────────────
  /** Current age in years (integer, 18–75). */
  currentAge: number;
  /** Target retirement age (integer, currentAge+1–85). */
  retirementAge: number;

  // ── Income ───────────────────────────────────────────────────────────────────
  /** Gross annual employment income (pre-tax, AUD). */
  annualSalary: number;
  /**
   * Employer super guarantee rate as a fraction (e.g. 0.115 for 11.5%).
   * Defaults to DEFAULT_SG_RATE when not supplied.
   */
  employerSgRate?: number;

  // ── Super ─────────────────────────────────────────────────────────────────────
  /** Current super balance (AUD, ≥ 0). */
  currentSuperBalance: number;
  /** Extra concessional contributions per year (salary sacrifice + personal deductible, AUD). */
  extraConcessionalContribs?: number;
  /** Non-concessional contributions per year (after-tax money into super, AUD). */
  nonConcessionalContribs?: number;
  /** Unused carry-forward cap from prior years (AUD, only applies when balance < $500k). */
  unusedCarryForwardCap?: number;

  // ── Investment assumptions ───────────────────────────────────────────────────
  /**
   * Expected nominal return on super p.a. as a percentage (e.g. 7 for 7%).
   * Defaults to 7.
   */
  expectedReturnPct?: number;
  /**
   * Expected inflation rate p.a. as a percentage (e.g. 3 for 3%).
   * Defaults to 3.
   */
  inflationRatePct?: number;
  /**
   * Desired annual income in retirement (today's dollars, AUD).
   * Defaults to 60,000.
   */
  desiredRetirementIncome?: number;

  // ── Investment income (for annual tax estimation) ─────────────────────────────
  /** Annual interest income (bank / term deposit, AUD). Defaults to 0. */
  annualInterestIncome?: number;
  /** Annual unfranked dividends (AUD). Defaults to 0. */
  annualUnfrankedDividends?: number;
  /** Annual cash amount of franked dividends (before gross-up, AUD). Defaults to 0. */
  annualFrankedDividends?: number;
  /** Franking percentage on franked dividends (0–100). Defaults to 100. */
  frankingPct?: number;
  /** Annual gross capital gain (proceeds − cost base, AUD). Defaults to 0. */
  annualCapitalGain?: number;
  /** Whether the capital-gain assets were held > 12 months (CGT discount eligible). Defaults to false. */
  capitalGainDiscountEligible?: boolean;

  // ── Property / CGT projection (optional) ─────────────────────────────────
  /**
   * Purchase price of an investment property (AUD). When provided (> 0),
   * `computeScenario` projects the property value at retirement and
   * estimates the CGT liability on a hypothetical sale using `computeCgt`.
   * Defaults to 0 (no property dimension modelled).
   */
  propertyPurchasePrice?: number;
  /**
   * Expected annual property price growth rate as a percentage (e.g. 4 for 4%).
   * Defaults to 4 when `propertyPurchasePrice` > 0.
   */
  propertyGrowthRatePct?: number;
  /**
   * Annual gross rental yield as a percentage of purchase price (e.g. 3 for 3%).
   * Used to estimate gross rental income each year. Defaults to 3.
   */
  propertyRentalYieldPct?: number;
  /**
   * Annual property holding costs as a percentage of purchase price
   * (rates, insurance, maintenance — not including mortgage, interest, or depreciation).
   * Defaults to 1.5%.
   */
  propertyHoldingCostsPct?: number;
  /**
   * Whether the property qualifies for the 50% individual CGT discount on sale.
   * True when held > 12 months. Defaults to true when a purchase price is set.
   */
  propertyHeld12Months?: boolean;
}

// ─── Sub-result types ──────────────────────────────────────────────────────────

export interface RetirementProjection {
  /** Years between current age and retirement age. */
  yearsToRetirement: number;
  /** Employer SG contributions per year (AUD). */
  annualEmployerContrib: number;
  /** Total annual concessional + non-concessional contributions added to super each year (AUD). */
  totalAnnualContrib: number;
  /** Projected super balance at retirement age (AUD). */
  projectedSuperAtRetirement: number;
  /** Target balance needed per the 4% rule (desiredRetirementIncome / 0.04, AUD). */
  targetBalance4PctRule: number;
  /** Gap between target and projected (negative = surplus, positive = deficit, AUD). */
  gapToTarget: number;
  /** Whether the projection meets the 4% rule target. */
  isOnTrack: boolean;
  /** Approximate years the super balance lasts at the desired income (inflation-adjusted). */
  drawdownYears: number;
  /** Balance milestones: every 5 years + retirement year, for charting. */
  milestones: Array<{ age: number; balance: number }>;
}

export interface SuperContributionsSummary {
  /** Total concessional contributions for the year (employer SG + extra). */
  totalConcessional: number;
  /** Effective concessional cap (base + carry-forward where eligible). */
  effectiveCap: number;
  /** Amount by which total concessional exceeds the effective cap (0 if within). */
  concessionalExcess: number;
  /** Super tax payable on concessional contributions (15%, or 30% for high earners). */
  totalSuperTax: number;
  /** Effective super tax rate (fraction). */
  effectiveSuperTaxRate: number;
  /** Annual tax saving by contributing extra vs taking as income. */
  taxSavingOnExtraContribs: number;
  /** Net amount of concessional contributions credited to super after tax. */
  netConcessionalInSuper: number;
  /** Total new money arriving in super this year (net concessional + non-concessional). */
  totalGoingIntoSuper: number;
  /** Whether Division 293 applies (income ≥ $250k). */
  isHighEarner: boolean;
  /** Non-concessional cap applicable (standard or bring-forward). */
  ncCap: number;
  /** Amount by which non-concessional contributions exceed the cap (0 if within). */
  nonConcessionalExcess: number;
}

// ─── Property projection ──────────────────────────────────────────────────────

/**
 * Optional property / CGT dimension.
 *
 * Factual projection only — models a single investment property held from now
 * to the retirement age, then sold. Uses `computeCgt` (lib/calculators/cgt.ts)
 * for the CGT estimate so the result is identical to the standalone CGT calc.
 *
 * This is a general-information model. It does NOT model:
 *   - mortgage / interest deductibility
 *   - depreciation schedules
 *   - stamp duty / transaction costs
 *   - land tax
 *   - negative gearing or carry-forward losses
 *   - PPOR main-residence exemption
 * Callers MUST display `GENERAL_ADVICE_WARNING`.
 */
export interface PropertyProjection {
  /** Whether a property was provided (false when purchasePrice = 0). */
  hasProperty: boolean;
  /** Original purchase price echoed back (AUD). */
  purchasePrice: number;
  /** Projected property value at retirement age (AUD). */
  projectedPropertyValue: number;
  /** Gross capital gain on a hypothetical sale at retirement (AUD). */
  grossGain: number;
  /** CGT result — includes taxWithDiscount, taxSaved, effectiveRateWithDiscount. */
  cgt: CgtResult;
  /**
   * Estimated annual gross rental income (purchasePrice × rentalYieldPct / 100).
   * This is gross — tenancy vacancies, agent fees, and repair costs are not
   * deducted. For general-information purposes only.
   */
  estimatedAnnualRentalIncome: number;
  /**
   * Estimated annual holding costs (purchasePrice × holdingCostsPct / 100).
   * Covers rates, insurance, and basic maintenance — not mortgage repayments.
   */
  estimatedAnnualHoldingCosts: number;
  /**
   * Net equity at retirement AFTER the estimated CGT liability:
   * projectedPropertyValue − cgt.taxWithDiscount.
   */
  netEquityAfterCgt: number;
  /** Growth rate p.a. used for the projection (%). */
  growthRatePct: number;
  /** Rental yield p.a. used (%). */
  rentalYieldPct: number;
  /** Holding costs p.a. used (%). */
  holdingCostsPct: number;
}

/** Annual investment-income tax estimate — thin wrapper re-exporting the existing result. */
export type InvestmentTaxSummary = {
  /** Total tax attributable to investment income (marginal, net of franking offsets). */
  taxOnInvestmentIncome: number;
  /** Net cash retained from investment income after tax. */
  netInvestmentIncome: number;
  /** Effective tax rate on cash investment income (%). */
  effectiveRateOnInvestmentIncome: number;
  /** Dollar value of franking credits received. */
  frankingCredits: number;
  /** Net tax payable on all income (investment + salary). */
  netTaxPayable: number;
  /** Total assessable income (salary + investment income). */
  totalAssessableIncome: number;
};

// ─── Composite result ──────────────────────────────────────────────────────────

export interface ScenarioResult {
  /** Echo of the resolved inputs (defaults filled in). */
  inputs: Required<ScenarioInput>;
  /** Retirement balance projection. */
  retirement: RetirementProjection;
  /** Super contributions summary for the current year. */
  superContributions: SuperContributionsSummary;
  /** Annual investment income tax estimate. */
  investmentTax: InvestmentTaxSummary;
  /**
   * Property / CGT projection. Present when `inputs.propertyPurchasePrice > 0`;
   * `hasProperty` is false otherwise.
   */
  property: PropertyProjection;
  /**
   * Scenario label — optional name for display and compare UX.
   * Set by the caller; `computeScenario` does not generate one.
   */
  label?: string;
}

// ─── Marginal rate helper (verbatim from SuperContributionsClient.tsx) ──────────

/**
 * Australian top marginal income tax rate including 2% Medicare levy.
 * Intentionally simple: matches the bracket look-up in SuperContributionsClient
 * so contribution tax-saving figures are identical between this engine and the
 * standalone calculator.
 *
 * NOTE: the investment-income-tax module uses the full progressive scale for
 * annual tax estimates — this function is only used for the contribution
 * tax-saving comparison (marginal vs super rate).
 */
export function marginalRateIncludingMedicare(income: number): number {
  if (income <= 18_200) return 0;
  if (income <= 45_000) return 0.19 + 0.02; // 21%
  if (income <= 120_000) return 0.325 + 0.02; // 34.5%
  if (income <= 180_000) return 0.37 + 0.02; // 39%
  return 0.45 + 0.02; // 47%
}

// ─── Retirement projection ────────────────────────────────────────────────────

/**
 * Project super balance to retirement and estimate drawdown duration.
 *
 * Formula is the same as the inline logic in RetirementCalculatorClient.tsx
 * (compound growth on opening balance + annual end-of-year contributions)
 * so the two surfaces produce identical numbers given identical inputs.
 *
 * Pure function. No I/O, no state.
 */
export function computeRetirementProjection(
  currentAge: number,
  retirementAge: number,
  currentSuperBalance: number,
  totalAnnualContrib: number,
  expectedReturnPct: number,
  inflationRatePct: number,
  desiredRetirementIncome: number,
): RetirementProjection {
  const yearsToRetirement = Math.max(0, retirementAge - currentAge);
  const annualReturnFraction = expectedReturnPct / 100;
  const inflationFraction = inflationRatePct / 100;
  const realReturn =
    (1 + annualReturnFraction) / (1 + inflationFraction) - 1;

  // ── Accumulation phase ────────────────────────────────────────────
  let balance = currentSuperBalance;
  const milestones: Array<{ age: number; balance: number }> = [];
  for (let y = 1; y <= yearsToRetirement; y++) {
    balance = balance * (1 + annualReturnFraction) + totalAnnualContrib;
    const age = currentAge + y;
    if (y === yearsToRetirement || age % 5 === 0) {
      milestones.push({ age, balance });
    }
  }
  const projectedSuperAtRetirement = balance;

  // ── Drawdown phase (inflation-adjusted) ─────────────────────────────
  let drawdownBalance = projectedSuperAtRetirement;
  let drawdownYears = 0;
  let annualDraw = desiredRetirementIncome;
  while (drawdownBalance > 0 && drawdownYears < 60) {
    drawdownBalance = drawdownBalance * (1 + realReturn) - annualDraw;
    annualDraw *= 1 + inflationFraction;
    drawdownYears++;
    if (drawdownBalance < 0) break;
  }

  // ── 4% rule target ────────────────────────────────────────────────
  const targetBalance4PctRule = desiredRetirementIncome / 0.04;
  const gapToTarget = targetBalance4PctRule - projectedSuperAtRetirement;
  const isOnTrack = gapToTarget <= 0;

  return {
    yearsToRetirement,
    annualEmployerContrib: 0, // caller fills this; not available in this sub-function scope
    totalAnnualContrib,
    projectedSuperAtRetirement,
    targetBalance4PctRule,
    gapToTarget,
    isOnTrack,
    drawdownYears,
    milestones,
  };
}

// ─── Super contributions ──────────────────────────────────────────────────────

/**
 * Compute super contributions cap usage and tax saving for the current year.
 *
 * Verbatim logic from the `result` memo in SuperContributionsClient.tsx so the
 * two surfaces produce identical numbers given identical inputs. Pure function.
 */
export function computeSuperContributions(
  annualSalary: number,
  employerSgContrib: number,
  extraConcessional: number,
  nonConcessional: number,
  superBalance: number,
  unusedCarryForward: number,
): SuperContributionsSummary {
  const totalConcessional = employerSgContrib + extraConcessional;
  const isHighEarner = annualSalary >= DIV293_THRESHOLD;

  const effectiveCap =
    superBalance < CARRY_FORWARD_BALANCE_THRESHOLD
      ? Math.min(CONCESSIONAL_CAP + unusedCarryForward, CONCESSIONAL_CAP * 6)
      : CONCESSIONAL_CAP;

  const concessionalExcess = Math.max(0, totalConcessional - effectiveCap);
  const concessionalWithinCap = Math.min(totalConcessional, effectiveCap);

  const superTaxOnConcessional = concessionalWithinCap * SUPER_TAX_RATE;
  const div293Tax = isHighEarner ? concessionalWithinCap * DIV293_EXTRA_RATE : 0;
  const totalSuperTax = superTaxOnConcessional + div293Tax;
  const effectiveSuperTaxRate = isHighEarner ? 0.3 : 0.15;

  const marginal = marginalRateIncludingMedicare(annualSalary);
  const taxSavingPerDollar = Math.max(0, marginal - effectiveSuperTaxRate);
  const taxSavingOnExtraContribs = extraConcessional * taxSavingPerDollar;

  const ncCap =
    superBalance < CARRY_FORWARD_BALANCE_THRESHOLD
      ? BRING_FORWARD_CAP
      : NON_CONCESSIONAL_CAP;
  const nonConcessionalExcess = Math.max(0, nonConcessional - ncCap);

  const netConcessionalInSuper = concessionalWithinCap - totalSuperTax;
  const totalGoingIntoSuper = netConcessionalInSuper + nonConcessional;

  return {
    totalConcessional,
    effectiveCap,
    concessionalExcess,
    totalSuperTax,
    effectiveSuperTaxRate,
    taxSavingOnExtraContribs,
    netConcessionalInSuper,
    totalGoingIntoSuper,
    isHighEarner,
    ncCap,
    nonConcessionalExcess,
  };
}

// ─── Composer ─────────────────────────────────────────────────────────────────

/**
 * Run the full scenario projection given a single set of inputs.
 *
 * Composes:
 *   1. `computeSuperContributions` — contribution tax and caps.
 *   2. `computeRetirementProjection` — balance at retirement + drawdown.
 *   3. `computeInvestmentIncomeTax` — annual investment income tax.
 *   4. `computeCgt` — property CGT on hypothetical sale at retirement (optional).
 *
 * Pure function. No I/O, no state. Safe to call on every render.
 *
 * @example
 * const result = computeScenario({
 *   currentAge: 35,
 *   retirementAge: 67,
 *   annualSalary: 100_000,
 *   currentSuperBalance: 150_000,
 * });
 * result.retirement.projectedSuperAtRetirement // e.g. ~$1.2M
 */
export function computeScenario(raw: ScenarioInput): ScenarioResult {
  // ── Resolve defaults ──────────────────────────────────────────────
  const rawPropertyPrice = Math.max(0, raw.propertyPurchasePrice ?? 0);
  const inputs: Required<ScenarioInput> = {
    currentAge: Math.max(18, Math.min(75, Math.round(raw.currentAge))),
    retirementAge: Math.max(raw.currentAge + 1, Math.min(85, Math.round(raw.retirementAge))),
    annualSalary: Math.max(0, raw.annualSalary),
    employerSgRate: raw.employerSgRate ?? DEFAULT_SG_RATE,
    currentSuperBalance: Math.max(0, raw.currentSuperBalance),
    extraConcessionalContribs: Math.max(0, raw.extraConcessionalContribs ?? 0),
    nonConcessionalContribs: Math.max(0, raw.nonConcessionalContribs ?? 0),
    unusedCarryForwardCap: Math.max(0, raw.unusedCarryForwardCap ?? 0),
    expectedReturnPct: raw.expectedReturnPct ?? 7,
    inflationRatePct: raw.inflationRatePct ?? 3,
    desiredRetirementIncome: raw.desiredRetirementIncome ?? 60_000,
    annualInterestIncome: Math.max(0, raw.annualInterestIncome ?? 0),
    annualUnfrankedDividends: Math.max(0, raw.annualUnfrankedDividends ?? 0),
    annualFrankedDividends: Math.max(0, raw.annualFrankedDividends ?? 0),
    frankingPct: raw.frankingPct ?? 100,
    annualCapitalGain: Math.max(0, raw.annualCapitalGain ?? 0),
    capitalGainDiscountEligible: raw.capitalGainDiscountEligible ?? false,
    propertyPurchasePrice: rawPropertyPrice,
    propertyGrowthRatePct: raw.propertyGrowthRatePct ?? (rawPropertyPrice > 0 ? 4 : 0),
    propertyRentalYieldPct: raw.propertyRentalYieldPct ?? 3,
    propertyHoldingCostsPct: raw.propertyHoldingCostsPct ?? 1.5,
    propertyHeld12Months: raw.propertyHeld12Months ?? true,
  };

  // ── 1. Super contributions ────────────────────────────────────────
  const annualEmployerContrib = inputs.annualSalary * inputs.employerSgRate;
  const superContributions = computeSuperContributions(
    inputs.annualSalary,
    annualEmployerContrib,
    inputs.extraConcessionalContribs,
    inputs.nonConcessionalContribs,
    inputs.currentSuperBalance,
    inputs.unusedCarryForwardCap,
  );

  // Total annual contribution that feeds into the retirement accumulation
  // model: net concessional (after 15% super tax) + non-concessional.
  const totalAnnualContrib = superContributions.totalGoingIntoSuper;

  // ── 2. Retirement projection ──────────────────────────────────────
  const retirementRaw = computeRetirementProjection(
    inputs.currentAge,
    inputs.retirementAge,
    inputs.currentSuperBalance,
    totalAnnualContrib,
    inputs.expectedReturnPct,
    inputs.inflationRatePct,
    inputs.desiredRetirementIncome,
  );

  const retirement: RetirementProjection = {
    ...retirementRaw,
    annualEmployerContrib,
  };

  // ── 3. Investment income tax ───────────────────────────────────────
  const rawTax = computeInvestmentIncomeTax({
    otherTaxableIncome: inputs.annualSalary,
    interest: inputs.annualInterestIncome,
    unfrankedDividends: inputs.annualUnfrankedDividends,
    frankedDividends: inputs.annualFrankedDividends,
    frankingPct: inputs.frankingPct,
    capitalGain: inputs.annualCapitalGain,
    capitalGainDiscountEligible: inputs.capitalGainDiscountEligible,
    includeMedicare: true,
  });

  const investmentTax: InvestmentTaxSummary = {
    taxOnInvestmentIncome: rawTax.taxOnInvestmentIncome,
    netInvestmentIncome: rawTax.netInvestmentIncome,
    effectiveRateOnInvestmentIncome: rawTax.effectiveRateOnInvestmentIncome,
    frankingCredits: rawTax.frankingCredits,
    netTaxPayable: rawTax.netTaxPayable,
    totalAssessableIncome: rawTax.totalAssessableIncome,
  };

  // ── 4. Property / CGT projection ──────────────────────────────────
  const hasProperty = inputs.propertyPurchasePrice > 0;
  let property: PropertyProjection;

  if (hasProperty) {
    const yearsToRetirement = Math.max(0, inputs.retirementAge - inputs.currentAge);
    const growthFraction = inputs.propertyGrowthRatePct / 100;
    const projectedPropertyValue =
      inputs.propertyPurchasePrice * Math.pow(1 + growthFraction, yearsToRetirement);
    const grossGain = Math.max(0, projectedPropertyValue - inputs.propertyPurchasePrice);

    // Use the marginal rate on the combined income + CGT gain to match the
    // investment-income-tax model's bracket-progression approach. For the CGT
    // calc we use the simple marginalRateIncludingMedicare helper (same as the
    // super contributions saving — consistent across the engine).
    const marginalRate = marginalRateIncludingMedicare(inputs.annualSalary);

    const cgt = computeCgt({
      gain: grossGain,
      marginalRate,
      held12Months: inputs.propertyHeld12Months,
      holder: "individual",
    });

    const estimatedAnnualRentalIncome =
      (inputs.propertyPurchasePrice * inputs.propertyRentalYieldPct) / 100;
    const estimatedAnnualHoldingCosts =
      (inputs.propertyPurchasePrice * inputs.propertyHoldingCostsPct) / 100;
    const netEquityAfterCgt = projectedPropertyValue - cgt.taxWithDiscount;

    property = {
      hasProperty: true,
      purchasePrice: inputs.propertyPurchasePrice,
      projectedPropertyValue,
      grossGain,
      cgt,
      estimatedAnnualRentalIncome,
      estimatedAnnualHoldingCosts,
      netEquityAfterCgt,
      growthRatePct: inputs.propertyGrowthRatePct,
      rentalYieldPct: inputs.propertyRentalYieldPct,
      holdingCostsPct: inputs.propertyHoldingCostsPct,
    };
  } else {
    // No property — return a zeroed-out placeholder so callers can
    // unconditionally access result.property without null-checks.
    const zeroCgt = computeCgt({ gain: 0, marginalRate: 0, held12Months: true });
    property = {
      hasProperty: false,
      purchasePrice: 0,
      projectedPropertyValue: 0,
      grossGain: 0,
      cgt: zeroCgt,
      estimatedAnnualRentalIncome: 0,
      estimatedAnnualHoldingCosts: 0,
      netEquityAfterCgt: 0,
      growthRatePct: 0,
      rentalYieldPct: 0,
      holdingCostsPct: 0,
    };
  }

  return {
    inputs,
    retirement,
    superContributions,
    investmentTax,
    property,
  };
}

// ─── Serialisable snapshot (for user_calculator_state) ────────────────────────

/**
 * Snapshot shape stored in `user_calculator_state` under the key
 * `"scenario_planner"`. A user can have multiple named scenarios serialised
 * as an array inside the `data` object.
 */
export interface ScenarioPlannerSnapshot {
  scenarios: Array<{
    id: string; // nanoid/uuid generated by the client
    label: string;
    savedAt: string; // ISO-8601
    inputs: Required<ScenarioInput>;
    /** Summary figures echoed back so a list-view doesn't need to recompute. */
    summary: {
      projectedSuperAtRetirement: number;
      gapToTarget: number;
      isOnTrack: boolean;
      drawdownYears: number;
      taxSavingOnExtraContribs: number;
      taxOnInvestmentIncome: number;
    };
  }>;
}

/** Key used inside `user_calculator_state.state`. */
export const SCENARIO_PLANNER_CALC_KEY = "scenario_planner";
