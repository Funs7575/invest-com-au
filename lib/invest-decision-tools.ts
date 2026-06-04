/**
 * Listing-aware decision tools for /invest (Wave 5).
 *
 * Thin, listing-shaped layer over the existing AU-tax engines:
 *   - lib/tax/brackets.ts            → marginalRate, incomeTax
 *   - lib/franking-math.ts           → computeFranking
 *   - lib/calculators/cgt.ts         → CGT discount constants
 *   - lib/firb-data.ts               → getFirbFee
 *
 * This module deliberately does NOT re-implement bracket maths or
 * franking gross-up — it composes the canonical engines and adds the
 * structure-aware, per-listing view that the marketplace UI needs:
 *
 *   1. afterTaxReturn()        — gross return → after-tax return by
 *                                investment structure (individual /
 *                                SMSF accumulation / SMSF pension /
 *                                company / trust). The "defensible
 *                                white space" flagged in the gap audit:
 *                                no AU marketplace shows structure-aware
 *                                after-tax returns on listings.
 *   2. frankingAdjustedYield() — cash yield ↔ grossed-up yield toggle.
 *   3. firbFeeForListing()     — FIRB application fee estimate for a
 *                                foreign buyer, picking the right $ value
 *                                from the listing.
 *   4. sivComplianceScore()    — % of a shortlist's value that is
 *                                SIV-complying (Significant Investor Visa
 *                                needs ≥ specified mix of complying assets).
 *   5. cgtDiscountStatus()     — 12-month CGT-discount countdown for an
 *                                already-held asset.
 *
 * Everything here is a pure function — unit-tested in
 * __tests__/lib/invest-decision-tools.test.ts — so the components stay
 * thin and the tax logic stays verifiable.
 */

import { CGT_DISCOUNT_INDIVIDUAL, CGT_DISCOUNT_SUPER } from "@/lib/calculators/cgt";
import { computeFranking } from "@/lib/franking-math";
import { getFirbFee } from "@/lib/firb-data";
import { deriveListingKind } from "@/lib/listing-kind";
import type { ListingKind } from "@/lib/types";

/**
 * Structural listing shape the decision tools read. Looser than the full
 * `InvestmentListing` so the detail pages (which hold the narrower
 * ListingCard type) can pass `l` directly without a cast. Every field the
 * tools touch is optional except the identity trio.
 */
export type DecisionToolListing = {
  id: number;
  vertical: string;
  slug: string;
  title?: string | null;
  key_metrics?: Record<string, unknown> | null;
  asking_price_cents?: number | null;
  price_display?: string | null;
  listing_kind?: string | null;
  firb_eligible?: boolean | null;
  siv_complying?: boolean | null;
};

const MEDICARE = 0.02;

// ─── Investment structures ────────────────────────────────────────────────

export type InvestmentStructure =
  | "individual_top"
  | "individual_37"
  | "smsf_accumulation"
  | "smsf_pension"
  | "company"
  | "trust";

export interface StructureMeta {
  key: InvestmentStructure;
  label: string;
  /** Marginal rate applied to the income component of a return. */
  incomeRate: number;
  /** Effective rate on a capital gain realised AFTER 12 months, i.e.
   *  the headline rate already reduced by the structure's CGT discount.
   *  Companies get no discount; SMSF pension is exempt. */
  capitalRateDiscounted: number;
  /** Effective rate on a capital gain realised WITHIN 12 months (no
   *  discount available). */
  capitalRateUndiscounted: number;
  /** Short explainer shown in the widget tooltip. */
  note: string;
}

const TOP = 0.45 + MEDICARE;       // 47%
const R37 = 0.37 + MEDICARE;       // 39%
const SMSF = 0.15;                 // accumulation phase
const COMPANY = 0.30;              // full company rate (conservative vs 25% base-rate)

export const INVESTMENT_STRUCTURES: Record<InvestmentStructure, StructureMeta> = {
  individual_top: {
    key: "individual_top",
    label: "Individual (top bracket)",
    incomeRate: TOP,
    capitalRateDiscounted: TOP * (1 - CGT_DISCOUNT_INDIVIDUAL), // 23.5%
    capitalRateUndiscounted: TOP,
    note: "47% marginal (45% + 2% Medicare). 50% CGT discount on assets held > 12 months → 23.5% on gains.",
  },
  individual_37: {
    key: "individual_37",
    label: "Individual ($135k–$190k)",
    incomeRate: R37,
    capitalRateDiscounted: R37 * (1 - CGT_DISCOUNT_INDIVIDUAL), // 19.5%
    capitalRateUndiscounted: R37,
    note: "39% marginal (37% + 2% Medicare). 50% CGT discount → 19.5% on gains held > 12 months.",
  },
  smsf_accumulation: {
    key: "smsf_accumulation",
    label: "SMSF (accumulation)",
    incomeRate: SMSF,
    capitalRateDiscounted: SMSF * (1 - CGT_DISCOUNT_SUPER), // 10%
    capitalRateUndiscounted: SMSF,
    note: "15% on income. ⅓ CGT discount on assets held > 12 months → 10% on gains.",
  },
  smsf_pension: {
    key: "smsf_pension",
    label: "SMSF (pension)",
    incomeRate: 0,
    capitalRateDiscounted: 0,
    capitalRateUndiscounted: 0,
    note: "Retirement-phase pension assets are tax-exempt on both income and capital gains (subject to the transfer-balance cap).",
  },
  company: {
    key: "company",
    label: "Company",
    incomeRate: COMPANY,
    capitalRateDiscounted: COMPANY, // companies get NO CGT discount
    capitalRateUndiscounted: COMPANY,
    note: "30% flat (25% for base-rate entities). Companies do NOT receive the 50% CGT discount.",
  },
  trust: {
    key: "trust",
    label: "Discretionary trust",
    incomeRate: TOP, // approximated at top-beneficiary rate; trusts flow through
    capitalRateDiscounted: TOP * (1 - CGT_DISCOUNT_INDIVIDUAL),
    capitalRateUndiscounted: TOP,
    note: "Income flows to beneficiaries and is taxed at their rates — shown at the top individual rate as a conservative estimate. The 50% CGT discount flows through to individual beneficiaries.",
  },
};

export const STRUCTURE_OPTIONS: StructureMeta[] = Object.values(INVESTMENT_STRUCTURES);

// ─── Income vs growth split by listing kind ───────────────────────────────

/**
 * Default split of a total return into income vs capital-growth
 * components, by listing kind. Used when the listing doesn't carry an
 * explicit yield. These are deliberately conservative archetype splits;
 * the widget lets the user override.
 */
export function defaultReturnSplit(kind: ListingKind): { income: number; growth: number } {
  switch (kind) {
    case "fund":             return { income: 0.65, growth: 0.35 };
    case "for_sale_asset":   return { income: 0.55, growth: 0.45 }; // commercial property / farmland / water
    case "for_sale_business":return { income: 0.80, growth: 0.20 };
    case "royalty":          return { income: 0.95, growth: 0.05 };
    case "project_equity":   return { income: 0.25, growth: 0.75 };
    case "equity_raise":     return { income: 0.0,  growth: 1.0 };
    case "listed_security":  return { income: 0.40, growth: 0.60 };
    case "physical_asset":   return { income: 0.0,  growth: 1.0 }; // bullion, collectibles — pure capital
    default:                 return { income: 0.5,  growth: 0.5 };
  }
}

// ─── 1. After-tax return ──────────────────────────────────────────────────

export interface AfterTaxReturnInput {
  /** Gross expected total return, percent per annum (e.g. 8 = 8% p.a.). */
  grossReturnPct: number;
  structure: InvestmentStructure;
  /** Fraction of the return that is income (0..1). Defaults from kind. */
  incomeShare?: number;
  /** Whether the capital component qualifies for the > 12-month CGT discount. */
  heldOver12Months?: boolean;
  /** For listed/dividend income, the franking percentage (0..100). When
   *  set, the income component is treated as franked and grossed-up. */
  frankingPct?: number;
}

export interface AfterTaxReturnResult {
  grossReturnPct: number;
  afterTaxReturnPct: number;
  /** Effective blended tax drag, percentage points (gross − afterTax). */
  taxDragPct: number;
  /** Effective blended tax rate on the whole return (0..1). */
  effectiveTaxRate: number;
  incomeComponentPct: number;
  growthComponentPct: number;
  structure: StructureMeta;
}

/**
 * Convert a gross annual return into an after-tax annual return for a
 * given investment structure. Splits the return into income and capital
 * components, taxes each appropriately, and (when the income is franked)
 * applies the franking-credit offset via the canonical franking engine.
 *
 * This is a single-year approximation — it models the annualised tax
 * drag, not a full multi-year IRR with deferred CGT. Clearly labelled as
 * an estimate in the UI.
 */
export function afterTaxReturn(input: AfterTaxReturnInput): AfterTaxReturnResult {
  const structure = INVESTMENT_STRUCTURES[input.structure];
  const gross = Math.max(0, input.grossReturnPct);
  const incomeShare = clamp01(input.incomeShare ?? 0.5);
  const growthShare = 1 - incomeShare;

  const incomeComponent = gross * incomeShare;
  const growthComponent = gross * growthShare;

  // Income component — franked or unfranked.
  let incomeAfterTax: number;
  if (input.frankingPct != null && input.frankingPct > 0 && structure.incomeRate > 0) {
    // Use the canonical franking engine on a $-scaled dividend so the
    // refundable-offset behaviour (e.g. SMSF getting cash back) is exact.
    // We scale to $10,000 of income then convert back to a percentage.
    const scaled = computeFranking({
      dividend: incomeComponent * 1000, // arbitrary $ scale; ratio preserved
      frankingPct: input.frankingPct,
      marginalRate: structure.incomeRate - MEDICARE < 0 ? 0 : structure.incomeRate - MEDICARE,
      includeMedicare: structure.incomeRate > SMSF, // SMSF/company don't pay Medicare
    });
    // netAfterTax is dollars kept per dividend; convert back to pct scale.
    incomeAfterTax = scaled.dividend > 0 ? (scaled.netAfterTax / 1000) : incomeComponent * (1 - structure.incomeRate);
  } else {
    incomeAfterTax = incomeComponent * (1 - structure.incomeRate);
  }

  // Growth component — CGT-discounted if held > 12 months.
  const capitalRate = (input.heldOver12Months ?? true)
    ? structure.capitalRateDiscounted
    : structure.capitalRateUndiscounted;
  const growthAfterTax = growthComponent * (1 - capitalRate);

  const afterTax = incomeAfterTax + growthAfterTax;
  const effectiveTaxRate = gross > 0 ? clamp01(1 - afterTax / gross) : 0;

  return {
    grossReturnPct: round2(gross),
    afterTaxReturnPct: round2(afterTax),
    taxDragPct: round2(gross - afterTax),
    effectiveTaxRate: round4(effectiveTaxRate),
    incomeComponentPct: round2(incomeComponent),
    growthComponentPct: round2(growthComponent),
    structure,
  };
}

// ─── 2. Franking-adjusted yield ───────────────────────────────────────────

export interface FrankingYieldResult {
  cashYieldPct: number;
  grossedUpYieldPct: number;
  frankingPct: number;
  /** Net yield kept after tax + refundable offset, at the given rate. */
  netYieldPct: number;
}

/**
 * Convert a cash dividend yield into its grossed-up equivalent and the
 * after-tax net yield, for a given marginal rate. Wraps computeFranking.
 *
 * @param cashYieldPct  Cash yield, percent (e.g. 4.2).
 * @param frankingPct   Franking percentage (0..100). Default 100.
 * @param marginalRate  Investor's marginal rate fraction (default 0.45).
 */
export function frankingAdjustedYield(
  cashYieldPct: number,
  frankingPct = 100,
  marginalRate = 0.45,
): FrankingYieldResult {
  const cash = Math.max(0, cashYieldPct);
  // Scale to dollars for the engine, then back to percent.
  const r = computeFranking({
    dividend: cash * 1000,
    frankingPct,
    marginalRate,
    includeMedicare: true,
  });
  return {
    cashYieldPct: round2(cash),
    grossedUpYieldPct: round2(r.grossedUp / 1000),
    frankingPct: clampPct(frankingPct),
    netYieldPct: round2(r.netAfterTax / 1000),
  };
}

// ─── 3. FIRB fee for a listing ────────────────────────────────────────────

export interface FirbFeeEstimate {
  /** The $ value the fee is calculated on (asking price or min-investment). */
  valueAud: number;
  /** Estimated FIRB application fee in AUD. */
  feeAud: number;
  /** Whether this listing is plausibly FIRB-relevant at all. */
  applicable: boolean;
}

/**
 * Estimate the FIRB application fee a foreign buyer would pay for a
 * listing. Picks the dollar value from asking price, else a
 * min-investment key_metric. Returns applicable=false for listing kinds
 * where FIRB residential/commercial fees don't map (e.g. listed
 * securities bought on-market, managed-fund units — generally outside
 * FIRB).
 */
export function firbFeeForListing(listing: DecisionToolListing): FirbFeeEstimate {
  const kind = deriveListingKind(listing);
  const km = (listing.key_metrics ?? {}) as Record<string, unknown>;

  // Listed securities + fund units bought through normal channels are
  // generally outside FIRB residential/commercial fee schedules.
  const outOfScope = kind === "listed_security" || kind === "fund";
  const minInvest = num(km["min_investment_aud"]) ?? num(km["min_commit_aud"]) ?? num(km["min_investment"]);
  const valueAud = listing.asking_price_cents != null
    ? listing.asking_price_cents / 100
    : (minInvest ?? 0);

  if (outOfScope || valueAud <= 0) {
    return { valueAud, feeAud: 0, applicable: false };
  }

  return {
    valueAud,
    feeAud: getFirbFee(valueAud),
    applicable: true,
  };
}

// ─── 4. SIV compliance score ──────────────────────────────────────────────

export interface SivComplianceResult {
  /** Total $ value across the listings (asking or min-invest). */
  totalValueAud: number;
  /** $ value that is SIV-complying. */
  complyingValueAud: number;
  /** Percentage of value that is SIV-complying (0..100). */
  complyingPct: number;
  /** Count of complying vs total listings. */
  complyingCount: number;
  totalCount: number;
}

/**
 * Given a set of listings (e.g. a visitor's shortlist), compute what
 * share of the combined value is SIV-complying. The Significant Investor
 * Visa requires a $5M complying-investment portfolio with a prescribed
 * minimum mix — surfacing the mix helps prospective applicants see how
 * close their shortlist gets.
 */
export function sivComplianceScore(
  listings: Array<Pick<DecisionToolListing, "siv_complying" | "asking_price_cents" | "key_metrics">>,
): SivComplianceResult {
  let total = 0;
  let complying = 0;
  let complyingCount = 0;
  for (const l of listings) {
    const km = (l.key_metrics ?? {}) as Record<string, unknown>;
    const minInvest = num(km["min_investment_aud"]) ?? num(km["min_commit_aud"]) ?? num(km["min_investment"]);
    const value = l.asking_price_cents != null ? l.asking_price_cents / 100 : (minInvest ?? 0);
    total += value;
    if (l.siv_complying) {
      complying += value;
      complyingCount++;
    }
  }
  return {
    totalValueAud: Math.round(total),
    complyingValueAud: Math.round(complying),
    complyingPct: total > 0 ? Math.round((complying / total) * 100) : 0,
    complyingCount,
    totalCount: listings.length,
  };
}

// ─── 5. CGT discount countdown ────────────────────────────────────────────

export interface CgtDiscountStatus {
  eligible: boolean;
  /** Days until the 12-month CGT-discount threshold (0 if already past). */
  daysRemaining: number;
  /** Human-readable summary. */
  summary: string;
}

/**
 * For an asset already acquired on `acquiredISO`, report whether it has
 * crossed the 12-month CGT-discount threshold and, if not, how long
 * remains. Used on holdings the user already owns (cross-linked from the
 * portfolio tracker).
 */
export function cgtDiscountStatus(acquiredISO: string, now: Date = new Date()): CgtDiscountStatus {
  const acquired = new Date(acquiredISO);
  if (Number.isNaN(acquired.getTime())) {
    return { eligible: false, daysRemaining: 0, summary: "Unknown acquisition date." };
  }
  const threshold = new Date(acquired);
  threshold.setFullYear(threshold.getFullYear() + 1);
  const msRemaining = threshold.getTime() - now.getTime();
  if (msRemaining <= 0) {
    return { eligible: true, daysRemaining: 0, summary: "Held > 12 months — eligible for the 50% CGT discount on disposal." };
  }
  const days = Math.ceil(msRemaining / 86_400_000);
  return {
    eligible: false,
    daysRemaining: days,
    summary: `Hold ${days} more day${days !== 1 ? "s" : ""} (until ${threshold.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}) to qualify for the 50% CGT discount.`,
  };
}

// ─── helpers ──────────────────────────────────────────────────────────────

function clamp01(n: number): number { return Math.max(0, Math.min(1, n)); }
function clampPct(n: number): number { return Math.max(0, Math.min(100, n)); }
function round2(n: number): number { return Math.round(n * 100) / 100; }
function round4(n: number): number { return Math.round(n * 10000) / 10000; }
function num(v: unknown): number | undefined { return typeof v === "number" && Number.isFinite(v) ? v : undefined; }
