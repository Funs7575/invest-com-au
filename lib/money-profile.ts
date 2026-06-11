/**
 * Money Profile — ONE saved financial picture that pre-fills tools across
 * the site (calculators today; quizzes and brief intake ride the same
 * loader).
 *
 * Two kinds of field:
 *   - EDITABLE: self-declared numbers the user maintains in one place
 *     (/account/investor-profile → "Money details"). Stored under
 *     `investor_profiles.meta.money` — jsonb, so no schema change.
 *   - DERIVED: assembled read-only from data the user already keeps
 *     elsewhere, so there is exactly one source of truth per number:
 *       savings / super / property → manual_balances category sums
 *       portfolio value           → investor_holdings cost-basis sum,
 *                                    falling back to fee_profiles
 *       current broker            → fee_profiles.current_broker_slug
 *
 * Compliance: this is the user's own stored data echoed back as input
 * defaults — the same legal footing as /account/net-worth. Nothing here
 * recommends a product or an amount.
 *
 * Pure helpers live up top (unit-tested without a DB); the assembly
 * loader takes the caller's user-scoped Supabase client so RLS owner
 * policies (manual_balances / investor_holdings / fee_profiles) do the
 * authorisation. investor_profiles reads/writes go through the existing
 * lib/investor-profiles helpers.
 */

import { getInvestorProfile, upsertInvestorProfile } from "@/lib/investor-profiles";
import type { BudgetBand, ExperienceLevel } from "@/lib/investor-profiles";
import { logger } from "@/lib/logger";

const log = logger("money-profile");

export const MONEY_META_KEY = "money";

export const MONEY_STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"] as const;
export type MoneyState = (typeof MONEY_STATES)[number];

/** Self-declared fields stored in investor_profiles.meta.money. */
export interface MoneyMeta {
  state: MoneyState | null;
  age: number | null;
  annual_income: number | null;
  monthly_savings: number | null;
  target_retirement_age: number | null;
}

export interface MoneyProfile extends MoneyMeta {
  // Derived (read-only) — dollars, null when the source has no data.
  savings_balance: number | null;
  super_balance: number | null;
  property_value: number | null;
  portfolio_value: number | null;
  /** portfolio + savings + super (skipping nulls); null when all null. */
  investable_assets: number | null;
  current_broker_slug: string | null;
  // Pass-through context from investor_profiles (useful for briefs/quizzes).
  budget_band: BudgetBand | null;
  experience_level: ExperienceLevel | null;
}

export const EMPTY_MONEY_META: MoneyMeta = {
  state: null,
  age: null,
  annual_income: null,
  monthly_savings: null,
  target_retirement_age: null,
};

// ─── Pure helpers ────────────────────────────────────────────────────────

function asBoundedNumber(v: unknown, min: number, max: number): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  if (!Number.isFinite(n)) return null;
  if (n < min || n > max) return null;
  return Math.round(n);
}

/** Tolerant read of meta.money — never throws on malformed jsonb. */
export function parseMoneyMeta(meta: Record<string, unknown> | null | undefined): MoneyMeta {
  const raw = meta?.[MONEY_META_KEY];
  if (!raw || typeof raw !== "object") return { ...EMPTY_MONEY_META };
  const m = raw as Record<string, unknown>;
  const state =
    typeof m.state === "string" && (MONEY_STATES as readonly string[]).includes(m.state)
      ? (m.state as MoneyState)
      : null;
  return {
    state,
    age: asBoundedNumber(m.age, 16, 100),
    annual_income: asBoundedNumber(m.annual_income, 0, 100_000_000),
    monthly_savings: asBoundedNumber(m.monthly_savings, 0, 1_000_000),
    target_retirement_age: asBoundedNumber(m.target_retirement_age, 40, 90),
  };
}

export interface DerivedParts {
  /** manual_balances sums by category, in dollars. */
  savingsBalance: number | null;
  superBalance: number | null;
  propertyValue: number | null;
  /** investor_holdings cost-basis sum in dollars (null when no holdings). */
  holdingsValue: number | null;
  /** fee_profiles fallbacks. */
  feeProfilePortfolioValue: number | null;
  currentBrokerSlug: string | null;
  budgetBand: BudgetBand | null;
  experienceLevel: ExperienceLevel | null;
}

export function buildMoneyProfile(metaFields: MoneyMeta, derived: DerivedParts): MoneyProfile {
  const portfolio =
    derived.holdingsValue !== null && derived.holdingsValue > 0
      ? derived.holdingsValue
      : derived.feeProfilePortfolioValue;
  const investableParts = [portfolio, derived.savingsBalance, derived.superBalance].filter(
    (v): v is number => v !== null,
  );
  return {
    ...metaFields,
    savings_balance: derived.savingsBalance,
    super_balance: derived.superBalance,
    property_value: derived.propertyValue,
    portfolio_value: portfolio,
    investable_assets:
      investableParts.length > 0 ? investableParts.reduce((a, b) => a + b, 0) : null,
    current_broker_slug: derived.currentBrokerSlug,
    budget_band: derived.budgetBand,
    experience_level: derived.experienceLevel,
  };
}

export interface MoneyCoverage {
  filled: number;
  total: number;
  pct: number;
  /** Human labels of the missing fields, with where to fix them. */
  missing: { label: string; href: string }[];
}

const COVERAGE_FIELDS: {
  key: keyof MoneyProfile;
  label: string;
  href: string;
}[] = [
  { key: "state", label: "State", href: "/account/investor-profile" },
  { key: "age", label: "Age", href: "/account/investor-profile" },
  { key: "annual_income", label: "Income", href: "/account/investor-profile" },
  { key: "monthly_savings", label: "Monthly savings", href: "/account/investor-profile" },
  {
    key: "target_retirement_age",
    label: "Retirement age",
    href: "/account/investor-profile",
  },
  { key: "savings_balance", label: "Savings balance", href: "/account/net-worth" },
  { key: "super_balance", label: "Super balance", href: "/account/net-worth" },
  { key: "portfolio_value", label: "Portfolio", href: "/account/holdings" },
  { key: "current_broker_slug", label: "Current broker", href: "/quick-audit" },
];

export function moneyProfileCoverage(profile: MoneyProfile): MoneyCoverage {
  const missing: MoneyCoverage["missing"] = [];
  let filled = 0;
  for (const f of COVERAGE_FIELDS) {
    if (profile[f.key] !== null && profile[f.key] !== undefined) {
      filled += 1;
    } else {
      missing.push({ label: f.label, href: f.href });
    }
  }
  return {
    filled,
    total: COVERAGE_FIELDS.length,
    pct: Math.round((filled / COVERAGE_FIELDS.length) * 100),
    missing,
  };
}

/** Does the profile have anything a prefill could use? */
export function hasAnyPrefillValue(profile: MoneyProfile): boolean {
  return COVERAGE_FIELDS.some((f) => profile[f.key] !== null && profile[f.key] !== undefined);
}

// ─── Server assembly ─────────────────────────────────────────────────────

/**
 * Minimal query surface this loader needs — satisfied by the user-scoped
 * server client (RLS owner policies authorise every read).
 */
export interface MoneyProfileQueryClient {
  from(table: string): {
    select(columns: string): {
      eq(
        column: string,
        value: string,
      ): PromiseLike<{ data: unknown[] | null; error: { message: string } | null }> & {
        maybeSingle(): PromiseLike<{
          data: Record<string, unknown> | null;
          error: { message: string } | null;
        }>;
      };
    };
  };
}

export async function loadMoneyProfileForUser(
  userId: string,
  supabase: MoneyProfileQueryClient,
): Promise<MoneyProfile> {
  const [investorProfile, balancesRes, holdingsRes, feeRes] = await Promise.all([
    getInvestorProfile(userId),
    supabase.from("manual_balances").select("category, amount_cents").eq("user_id", userId),
    supabase
      .from("investor_holdings")
      .select("shares, cost_basis_per_share_cents")
      .eq("auth_user_id", userId),
    supabase
      .from("fee_profiles")
      .select("portfolio_value, current_broker_slug")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  if (balancesRes.error) log.warn("manual_balances read failed", { err: balancesRes.error.message });
  if (holdingsRes.error) log.warn("investor_holdings read failed", { err: holdingsRes.error.message });

  const sums: Record<string, number> = {};
  for (const row of (balancesRes.data ?? []) as { category?: unknown; amount_cents?: unknown }[]) {
    const cat = typeof row.category === "string" ? row.category : "other";
    const cents = typeof row.amount_cents === "number" ? row.amount_cents : 0;
    sums[cat] = (sums[cat] ?? 0) + cents;
  }
  const dollars = (cat: string): number | null =>
    sums[cat] !== undefined ? Math.round(sums[cat]! / 100) : null;

  let holdingsValue: number | null = null;
  const holdingRows = (holdingsRes.data ?? []) as {
    shares?: unknown;
    cost_basis_per_share_cents?: unknown;
  }[];
  if (holdingRows.length > 0) {
    let cents = 0;
    for (const h of holdingRows) {
      const shares = typeof h.shares === "number" ? h.shares : Number(h.shares ?? 0);
      const basis =
        typeof h.cost_basis_per_share_cents === "number"
          ? h.cost_basis_per_share_cents
          : Number(h.cost_basis_per_share_cents ?? 0);
      if (Number.isFinite(shares) && Number.isFinite(basis)) cents += shares * basis;
    }
    holdingsValue = cents > 0 ? Math.round(cents / 100) : null;
  }

  const fee = feeRes.data;
  const feePortfolio =
    typeof fee?.portfolio_value === "number" && fee.portfolio_value > 0
      ? Math.round(fee.portfolio_value)
      : null;
  const brokerSlug =
    typeof fee?.current_broker_slug === "string" && fee.current_broker_slug.length > 0
      ? fee.current_broker_slug
      : null;

  return buildMoneyProfile(parseMoneyMeta(investorProfile?.meta), {
    savingsBalance: dollars("savings"),
    superBalance: dollars("super"),
    propertyValue: dollars("property"),
    holdingsValue,
    feeProfilePortfolioValue: feePortfolio,
    currentBrokerSlug: brokerSlug,
    budgetBand: investorProfile?.budgetBand ?? null,
    experienceLevel: investorProfile?.experienceLevel ?? null,
  });
}

/**
 * Merge a partial money patch into investor_profiles.meta.money without
 * clobbering sibling meta keys (account_type etc.). Null clears a field.
 */
export async function saveMoneyMeta(
  userId: string,
  patch: Partial<MoneyMeta>,
): Promise<boolean> {
  const existing = await getInvestorProfile(userId);
  const meta = { ...(existing?.meta ?? {}) };
  const current = parseMoneyMeta(meta);
  meta[MONEY_META_KEY] = { ...current, ...patch };
  return upsertInvestorProfile(userId, { meta });
}
