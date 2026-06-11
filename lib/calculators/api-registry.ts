/**
 * Calculators-as-a-service registry — /api/v1/calculators/*.
 *
 * One entry per partner-facing calculator endpoint. Each entry binds:
 *   - a Zod input schema (validated by `withValidatedBody` in the route), and
 *   - a `run()` adapter that calls the EXACT pure function the on-site
 *     calculator uses (lib/calculators/*, lib/franking-math.ts).
 *
 * Hard rule: never re-implement math here. `run()` may only compose the
 * existing lib functions — the API and the site must produce identical
 * numbers for identical inputs (pinned by the golden tests in
 * `__tests__/api/v1-calculators.test.ts`).
 *
 * Field naming: inputs and results use the lib modules' camelCase field
 * names verbatim (no snake_case mapping layer). This is a deliberate
 * deviation from the DB-backed v1 endpoints (which mirror snake_case
 * column names): a key-mapping layer is a fork surface for formula
 * drift, and passing the lib types through untouched means the golden
 * tests can assert deep equality against the site's own functions.
 *
 * AFSL note: these are factual computations (general information). Every
 * response carries `GENERAL_ADVICE_WARNING` from lib/compliance.ts in its
 * `disclaimer` field — wired in lib/calculators/api-route.ts.
 */

import { z } from "zod";
import { computeCgt } from "@/lib/calculators/cgt";
import {
  buildStressScenarios,
  computeMortgage,
  type MortgageInput,
} from "@/lib/calculators/mortgage";
import { computeDasp } from "@/lib/calculators/dasp";
import { computeInvestmentIncomeTax } from "@/lib/calculators/investment-income-tax";
import { computeFranking } from "@/lib/franking-math";

/** Version stamp echoed on every calculator response. */
export const CALCULATORS_API_VERSION = "1.0.0";

/** Route slugs — one route file per entry under app/api/v1/calculators/. */
export const CALCULATOR_SLUGS = [
  "cgt",
  "mortgage-repayment",
  "franking-credits",
  "investment-income-tax",
  "dasp",
] as const;

export type CalculatorSlug = (typeof CALCULATOR_SLUGS)[number];

export interface CalculatorDefinition<S extends z.ZodType = z.ZodType> {
  slug: CalculatorSlug;
  title: string;
  summary: string;
  inputSchema: S;
  /** Modelling assumptions/limits surfaced verbatim in the response. */
  assumptions: readonly string[];
  /**
   * Compute results from a parsed input. Declared with method syntax so
   * the heterogeneous registry array stays assignable (bivariant params).
   */
  run(input: z.infer<S>): Record<string, unknown>;
}

// Shared numeric bounds. Zod rejects NaN for z.number() and the max bound
// rejects Infinity, so every amount that reaches a lib function is finite.
const AUD_AMOUNT = z.number().min(0).max(1_000_000_000_000); // ≤ $1T
const MARGINAL_RATE = z.number().min(0).max(1); // fraction, e.g. 0.37
const PCT_0_100 = z.number().min(0).max(100);

// ─── /api/v1/calculators/cgt ────────────────────────────────────────────

const CgtBody = z.object({
  /** Gross capital gain (proceeds − cost base), AUD. */
  gain: AUD_AMOUNT,
  /** Marginal tax rate as a fraction (0.37 = 37%), excluding Medicare. */
  marginalRate: MARGINAL_RATE,
  /** Held for more than 12 months (CGT discount eligibility). */
  held12Months: z.boolean(),
  /** Discount basis: individual (50%) or complying super fund (33⅓%). */
  holder: z.enum(["individual", "super"]).default("individual"),
});

export const cgtCalculator: CalculatorDefinition<typeof CgtBody> = {
  slug: "cgt",
  title: "Capital gains tax estimator",
  summary:
    "Marginal-effect CGT on a single realised gain, with the 12-month discount (50% individual / 33.33% super).",
  inputSchema: CgtBody,
  assumptions: [
    "Applies the supplied marginal rate flatly to the gain — does not model bracket progression, Medicare levy, offsets, or capital losses.",
    "Discount rates per ATO: 50% for individuals/trusts, 33.33% for complying super funds, assets held > 12 months.",
  ],
  run(input) {
    return { ...computeCgt(input) };
  },
};

// ─── /api/v1/calculators/mortgage-repayment ─────────────────────────────

const MortgageBody = z.object({
  /** Loan principal, AUD. */
  principal: z.number().min(0).max(10_000_000_000),
  /** Annual interest rate as a percentage (6 = 6.00% p.a.). */
  annualRatePct: z.number().min(0).max(50),
  /** Loan term in whole years. */
  termYears: z.number().int().min(1).max(50),
  /** Repayment type: principal & interest, or interest-only. */
  type: z.enum(["pi", "io"]).default("pi"),
  /**
   * Optional rate-shift stress scenarios, in percentage points
   * (e.g. [1, 2, 3] for the APRA-style +1/+2/+3pp shocks).
   */
  stressOffsetsPp: z.array(z.number().min(-10).max(10)).max(8).optional(),
});

export const mortgageCalculator: CalculatorDefinition<typeof MortgageBody> = {
  slug: "mortgage-repayment",
  title: "Mortgage repayment + rate stress test",
  summary:
    "Monthly repayment, total interest and total cost via the standard amortisation formula, with optional rate-shift stress scenarios.",
  inputSchema: MortgageBody,
  assumptions: [
    "Closed-form repayment maths only — no offset accounts, fees, LMI, extra repayments or amortisation schedules.",
    "Interest-only results assume the full principal is still owed at the end of the term.",
    "Stress scenarios floor the shifted rate at 0.1% p.a.",
  ],
  run(input) {
    const base: MortgageInput = {
      principal: input.principal,
      annualRatePct: input.annualRatePct,
      termYears: input.termYears,
      type: input.type,
    };
    const result: Record<string, unknown> = { ...computeMortgage(base) };
    if (input.stressOffsetsPp && input.stressOffsetsPp.length > 0) {
      result.stressScenarios = buildStressScenarios(base, input.stressOffsetsPp);
    }
    return result;
  },
};

// ─── /api/v1/calculators/franking-credits ───────────────────────────────

const FrankingBody = z.object({
  /** Cash dividend received, AUD. */
  dividend: AUD_AMOUNT,
  /** Franking percentage, 0–100 (partial franking allowed). */
  frankingPct: PCT_0_100.default(100),
  /** Marginal tax rate as a fraction (0.325 = 32.5%). */
  marginalRate: MARGINAL_RATE,
  /** Corporate tax rate used for the gross-up (0.25 for base-rate entities). */
  corporateTaxRate: z.number().min(0.01).max(0.99).default(0.3),
  /** Apply the 2% Medicare levy on top of the marginal rate. */
  includeMedicare: z.boolean().default(true),
});

export const frankingCalculator: CalculatorDefinition<typeof FrankingBody> = {
  slug: "franking-credits",
  title: "Franking credits calculator",
  summary:
    "Gross-up, tax payable and net after-tax value of a franked dividend, including refundable excess credits.",
  inputSchema: FrankingBody,
  assumptions: [
    "Franking credits are treated as fully refundable (Australian resident individual).",
    "Does not model the 45-day holding rule or trust/company structures.",
  ],
  run(input) {
    return { ...computeFranking(input) };
  },
};

// ─── /api/v1/calculators/investment-income-tax ──────────────────────────

const InvestmentIncomeBody = z.object({
  /** Other assessable income (e.g. salary) the investment income stacks on. */
  otherTaxableIncome: AUD_AMOUNT.default(0),
  /** Interest income, taxed in full. */
  interest: AUD_AMOUNT.default(0),
  /** Unfranked / foreign dividends, taxed in full. */
  unfrankedDividends: AUD_AMOUNT.default(0),
  /** Cash amount of franked dividends received (before gross-up). */
  frankedDividends: AUD_AMOUNT.default(0),
  /** Franking percentage on the franked dividends, 0–100. */
  frankingPct: PCT_0_100.default(100),
  /** Gross realised capital gain, before any CGT discount. */
  capitalGain: AUD_AMOUNT.default(0),
  /** Whether the gain qualifies for the 50% individual CGT discount. */
  capitalGainDiscountEligible: z.boolean().default(false),
  /** Corporate tax rate used to gross up franked dividends. */
  corporateTaxRate: z.number().min(0.01).max(0.99).default(0.3),
  /** Apply the flat 2% Medicare levy. */
  includeMedicare: z.boolean().default(true),
});

export const investmentIncomeTaxCalculator: CalculatorDefinition<
  typeof InvestmentIncomeBody
> = {
  slug: "investment-income-tax",
  title: "Investment income tax estimator",
  summary:
    "Stacks interest, dividends and capital gains on top of other income and reads the marginal tax off the full resident progressive scale.",
  inputSchema: InvestmentIncomeBody,
  assumptions: [
    "Resident progressive scale in effect from 1 July 2024 (Stage 3 rates, 2024-25 and 2025-26 income years) plus a flat 2% Medicare levy.",
    "Does not model the Medicare levy surcharge, LITO, HELP repayments, capital losses, super/company rates or non-resident scales.",
  ],
  run(input) {
    return { ...computeInvestmentIncomeTax(input) };
  },
};

// ─── /api/v1/calculators/dasp ───────────────────────────────────────────

const DaspBody = z.object({
  /** Taxable component — taxed element, AUD. */
  taxedElement: AUD_AMOUNT,
  /** Taxable component — untaxed element, AUD. */
  untaxedElement: AUD_AMOUNT.default(0),
  /** Tax-free component (after-tax contributions), AUD. */
  taxFreeComponent: AUD_AMOUNT.default(0),
  /** Working Holiday Maker (subclass 417/462) — 65% on the taxable component. */
  isWorkingHolidayMaker: z.boolean().default(false),
});

export const daspCalculator: CalculatorDefinition<typeof DaspBody> = {
  slug: "dasp",
  title: "DASP withholding estimator",
  summary:
    "Tax withheld on, and net value of, a Departing Australia Superannuation Payment at the fixed ATO rates (35% / 45% / 65% WHM).",
  inputSchema: DaspBody,
  assumptions: [
    "Fixed DASP withholding rates for payments on or after 1 July 2017 — these cannot be reduced.",
    "Fund fees, proportioning rules and low-income offsets are not modelled.",
  ],
  run(input) {
    return { ...computeDasp(input) };
  },
};

/** Every calculator exposed under /api/v1/calculators/. */
export const CALCULATOR_API_REGISTRY: ReadonlyArray<CalculatorDefinition> = [
  cgtCalculator,
  mortgageCalculator,
  frankingCalculator,
  investmentIncomeTaxCalculator,
  daspCalculator,
];
