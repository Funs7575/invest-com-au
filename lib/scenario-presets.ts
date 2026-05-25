/**
 * Scenario comparison presets — curated decision pairs.
 *
 * Each preset defines two named `ScenarioInput` objects that represent
 * the two sides of a common financial decision. Presets are used to:
 *
 *   1. Pre-populate the Scenario Planner compare tab via a shareable URL
 *      `/scenarios/compare/[preset]` (SSG).
 *   2. Drive JSON-LD structured data (ItemList + Article breadcrumb) for SEO.
 *
 * Design rules
 * ------------
 * - Only model decisions fully supported by the existing `computeScenario`
 *   calc logic. Do NOT introduce new financial assumptions here.
 * - Inputs are realistic Australian baseline values (FY2026) illustrating
 *   the decision, not optimal advice. Every preset page MUST display
 *   `GENERAL_ADVICE_WARNING` from `lib/compliance.ts`.
 * - Preset slugs are stable once published (they become canonical URLs).
 * - The `description` field is factual and neutral — no "better" framing.
 *
 * AFSL scope
 * ----------
 * Factual projections only. The preset page shows what each path
 * *projects* given the stated assumptions, not which path is
 * *recommended*. No personalised recommendation is produced.
 *
 * FY2026 assumptions used across presets
 * ---------------------------------------
 *   SG rate        11.5% (DEFAULT_SG_RATE)
 *   Return         7% nominal p.a. (balanced-growth super / diversified ETF)
 *   Inflation      3% p.a.
 *   Concessional cap  $30,000
 */

import { type ScenarioInput, DEFAULT_SG_RATE } from "@/lib/scenario-engine";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScenarioPresetSide {
  /** Short label for this side, e.g. "Salary sacrifice" */
  label: string;
  /** One-sentence factual description of what this side models. */
  description: string;
  /** Input values for `computeScenario`. */
  inputs: ScenarioInput;
}

export interface ScenarioPreset {
  /** URL slug — stable, used as the dynamic route segment. */
  slug: string;
  /** H1 / page title. */
  title: string;
  /**
   * One-paragraph factual explanation of the decision being compared.
   * Must be neutral — no advice framing.
   */
  summary: string;
  /** The two sides of the comparison. */
  a: ScenarioPresetSide;
  b: ScenarioPresetSide;
  /**
   * Comma-separated list of key metrics this preset illustrates.
   * Used for meta description and JSON-LD keywords.
   */
  highlights: string[];
}

// ─── Preset registry ─────────────────────────────────────────────────────────

/**
 * All published presets. Slugs must be unique and stable after first deploy.
 *
 * Add new rows here only when the underlying calc logic can fully model the
 * decision being illustrated. Remove by setting `published: false` — never
 * delete (URLs become 404s).
 */
export const SCENARIO_PRESETS: readonly ScenarioPreset[] = [
  // ── 1. Salary sacrifice vs ETF outside super ───────────────────────────────
  {
    slug: "salary-sacrifice-vs-etf",
    title: "Salary Sacrifice into Super vs ETF Outside Super",
    summary:
      "Salary sacrifice directs pre-tax dollars into super at 15% contributions tax, " +
      "potentially saving income tax compared with investing the same net-of-tax amount " +
      "in an ETF outside super. This projection compares the super balance at retirement " +
      "under each path, using identical age, salary, and return assumptions. " +
      "It does not account for the Age Pension, or for any restriction on early super " +
      "access before preservation age.",
    a: {
      label: "Salary sacrifice ($10k p.a.)",
      description:
        "Redirects $10,000 p.a. of pre-tax salary into super as extra concessional contributions " +
        "on top of employer SG. No outside-super ETF investment modelled here.",
      inputs: {
        currentAge: 35,
        retirementAge: 67,
        annualSalary: 100_000,
        employerSgRate: DEFAULT_SG_RATE,
        currentSuperBalance: 150_000,
        extraConcessionalContribs: 10_000,
        expectedReturnPct: 7,
        inflationRatePct: 3,
        desiredRetirementIncome: 60_000,
      },
    },
    b: {
      label: "No salary sacrifice (invest after-tax)",
      description:
        "No extra concessional contributions. The after-tax equivalent (~$6,550 at 34.5% marginal rate) " +
        "is modelled as annual franked dividends in a diversified ETF paying a 3.5% gross yield, " +
        "capturing the tax drag on dividends outside super.",
      inputs: {
        currentAge: 35,
        retirementAge: 67,
        annualSalary: 100_000,
        employerSgRate: DEFAULT_SG_RATE,
        currentSuperBalance: 150_000,
        extraConcessionalContribs: 0,
        expectedReturnPct: 7,
        inflationRatePct: 3,
        desiredRetirementIncome: 60_000,
        // ~$6,550 after-tax invest equivalent modelled as franked ETF dividends
        annualFrankedDividends: 6_550,
        frankingPct: 70,
      },
    },
    highlights: [
      "projected super at retirement",
      "super tax saving p.a.",
      "investment tax p.a.",
      "drawdown years",
    ],
  },

  // ── 2. SMSF vs industry/retail super (higher fees) ────────────────────────
  {
    slug: "smsf-vs-industry-super",
    title: "SMSF vs Industry Super — Retirement Projection",
    summary:
      "A self-managed super fund (SMSF) gives direct investment control but carries " +
      "fixed operating costs (auditor, ASIC levy, accountant) that can erode smaller " +
      "balances. This projection models the net effect on retirement balance by " +
      "representing SMSF costs as a reduction in the effective annual return, compared " +
      "with an industry super fund with lower fees and the same gross return assumption. " +
      "SMSF setup, trustee obligations, and borrowing rules are not modelled here.",
    a: {
      label: "SMSF (est. $3,000 fixed costs p.a.)",
      description:
        "SMSF with estimated $3,000 annual fixed costs deducted from fund growth, " +
        "modelled as a 0.5–0.6% drag on a $500k balance (effective return 6.4%).",
      inputs: {
        currentAge: 45,
        retirementAge: 67,
        annualSalary: 120_000,
        employerSgRate: DEFAULT_SG_RATE,
        currentSuperBalance: 500_000,
        extraConcessionalContribs: 5_000,
        expectedReturnPct: 6.4, // 7% gross − ~0.6% fixed cost drag on $500k
        inflationRatePct: 3,
        desiredRetirementIncome: 80_000,
      },
    },
    b: {
      label: "Industry/retail super (lower fees)",
      description:
        "Diversified industry super fund with 0.5% total fee, modelled as 6.65% net return " +
        "(7% gross − 0.35% MER/admin).",
      inputs: {
        currentAge: 45,
        retirementAge: 67,
        annualSalary: 120_000,
        employerSgRate: DEFAULT_SG_RATE,
        currentSuperBalance: 500_000,
        extraConcessionalContribs: 5_000,
        expectedReturnPct: 6.65, // 7% gross − 0.35% fees
        inflationRatePct: 3,
        desiredRetirementIncome: 80_000,
      },
    },
    highlights: [
      "projected super at retirement",
      "drawdown years",
      "gap to target",
      "effective return assumption",
    ],
  },

  // ── 3. Max concessional contributions vs moderate contributions ───────────
  {
    slug: "max-concessional-vs-moderate",
    title: "Maximising Concessional Cap vs Moderate Salary Sacrifice",
    summary:
      "The FY2026 concessional cap is $30,000 (employer SG + salary sacrifice + personal " +
      "deductible contributions). Maximising the cap accelerates super growth and captures the " +
      "largest possible tax saving at the marginal rate, but reduces take-home pay. This " +
      "projection compares a cap-maximisation strategy with a moderate $5,000 top-up, " +
      "assuming the same gross salary and return.",
    a: {
      label: "Max concessional cap (~$18,500 salary sacrifice)",
      description:
        "Salary sacrifice up to the $30k concessional cap after accounting for 11.5% employer SG. " +
        "At $100k salary: SG = $11,500; sacrifice = $18,500 to hit $30k.",
      inputs: {
        currentAge: 35,
        retirementAge: 67,
        annualSalary: 100_000,
        employerSgRate: DEFAULT_SG_RATE,
        currentSuperBalance: 150_000,
        extraConcessionalContribs: 18_500, // 30k − 11.5k SG
        expectedReturnPct: 7,
        inflationRatePct: 3,
        desiredRetirementIncome: 60_000,
      },
    },
    b: {
      label: "Moderate salary sacrifice ($5,000 p.a.)",
      description:
        "A common starting point — salary sacrificing $5,000 p.a. on top of employer SG, " +
        "leaving the remaining cap headroom unused.",
      inputs: {
        currentAge: 35,
        retirementAge: 67,
        annualSalary: 100_000,
        employerSgRate: DEFAULT_SG_RATE,
        currentSuperBalance: 150_000,
        extraConcessionalContribs: 5_000,
        expectedReturnPct: 7,
        inflationRatePct: 3,
        desiredRetirementIncome: 60_000,
      },
    },
    highlights: [
      "projected super at retirement",
      "super tax saving p.a.",
      "gap to target",
      "drawdown years",
    ],
  },

  // ── 4. Early retirement vs standard preservation age ─────────────────────
  {
    slug: "early-retirement-vs-standard",
    title: "Early Retirement at 60 vs Standard Retirement at 67",
    summary:
      "Retiring 7 years earlier reduces the accumulation phase, shortens the compounding " +
      "runway, and extends the drawdown period. This projection compares the same individual " +
      "retiring at 60 vs 67, with identical contributions and return assumptions. " +
      "Access to super preservation age (60 for those born after 1 July 1964), the Age " +
      "Pension eligibility age (67), and Centrelink means testing are not modelled.",
    a: {
      label: "Retire at 60 (early)",
      description:
        "Accumulates super for 25 years (age 35 → 60), then draws down over a " +
        "potentially longer retirement horizon.",
      inputs: {
        currentAge: 35,
        retirementAge: 60,
        annualSalary: 100_000,
        employerSgRate: DEFAULT_SG_RATE,
        currentSuperBalance: 150_000,
        extraConcessionalContribs: 10_000,
        expectedReturnPct: 7,
        inflationRatePct: 3,
        desiredRetirementIncome: 65_000,
      },
    },
    b: {
      label: "Retire at 67 (standard Age Pension age)",
      description:
        "Seven additional years of accumulation and compounding before drawing down.",
      inputs: {
        currentAge: 35,
        retirementAge: 67,
        annualSalary: 100_000,
        employerSgRate: DEFAULT_SG_RATE,
        currentSuperBalance: 150_000,
        extraConcessionalContribs: 10_000,
        expectedReturnPct: 7,
        inflationRatePct: 3,
        desiredRetirementIncome: 65_000,
      },
    },
    highlights: [
      "projected super at retirement",
      "drawdown years",
      "gap to target",
      "years to retire",
    ],
  },
] as const;

// ─── Lookup helpers ───────────────────────────────────────────────────────────

/** All published preset slugs — used for `generateStaticParams`. */
export const PRESET_SLUGS: string[] = SCENARIO_PRESETS.map((p) => p.slug);

/**
 * Find a preset by slug. Returns `undefined` for unknown slugs
 * (callers should `notFound()` in that case).
 */
export function getPreset(slug: string): ScenarioPreset | undefined {
  return SCENARIO_PRESETS.find((p) => p.slug === slug);
}

/**
 * All preset slugs and titles — for the index page or ItemList JSON-LD.
 */
export function allPresetMeta(): Array<{ slug: string; title: string; summary: string }> {
  return SCENARIO_PRESETS.map(({ slug, title, summary }) => ({ slug, title, summary }));
}
