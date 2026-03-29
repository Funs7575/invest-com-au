/**
 * Foreign Investment — server-side data layer.
 *
 * All public data is fetched from Supabase (source of truth) and cached
 * with Next.js unstable_cache so pages stay fast. Admins update data via
 * the /admin/foreign-investment dashboard; cache is busted on save via
 * revalidateTag("fi-data").
 *
 * Static TypeScript files (lib/foreign-investment-data.ts,
 * lib/firb-data.ts) remain as compile-time fallbacks — if the DB is
 * unreachable or a table is empty, we fall back to the static values so
 * the site never shows blank data.
 *
 * Usage in server components:
 *   import { getNonResidentTaxBrackets, getDtaCountries } from "@/lib/fi-data-server";
 *   const brackets = await getNonResidentTaxBrackets();
 */

import { createClient } from "@supabase/supabase-js";
import { cached, CacheTTL } from "@/lib/cache";
import {
  NON_RESIDENT_TAX_BRACKETS,
  RESIDENT_TAX_BRACKETS,
  DTA_COUNTRIES,
  DEFAULT_WHT,
  DASP_WITHHOLDING_RATES,
  type TaxBracket,
  type DTACountry,
  type DASPRate,
} from "@/lib/foreign-investment-data";

// ─── Raw DB row types ──────────────────────────────────────────────────────────

interface DbTaxBracket {
  id: string;
  tax_year: string;
  taxpayer_type: "non_resident" | "resident";
  income_from: number;
  income_to: number | null;
  rate: number;
  description: string;
  sort_order: number;
}

interface DbDtaCountry {
  id: string;
  country: string;
  country_code: string;
  has_dta: boolean;
  dividend_wht: number;
  interest_wht: number;
  royalties_wht: number;
  dta_effective_year: number | null;
  notes: string | null;
  sort_order: number;
}

interface DbDaspRate {
  id: string;
  component_type: string;
  visa_category: "standard" | "whm";
  withholding_rate: number;
  notes: string | null;
  sort_order: number;
}

export interface DbWithholdingRate {
  id: string;
  income_type: string;
  standard_rate: string;
  with_dta_typical: string;
  notes: string | null;
  color: string;
  sort_order: number;
}

export interface DbPropertyRule {
  id: string;
  rule_key: string;
  rule_type: "rate" | "threshold" | "ban" | "fee" | "info";
  title: string;
  value: string;
  effective_from: string | null;
  effective_to: string | null;
  notes: string | null;
  source_url: string | null;
  sort_order: number;
}

export interface DbDataCategory {
  id: string;
  category_key: string;
  display_name: string;
  description: string;
  review_frequency_days: number;
  warning_threshold_days: number;
  urgent_threshold_days: number;
  last_verified_at: string | null;
  verified_by: string | null;
  source_url: string;
  source_name: string;
  effective_date: string | null;
  notes: string | null;
  status: "current" | "needs_review" | "stale" | "urgent";
  created_at: string;
  updated_at: string;
}

export interface DbChangeLog {
  id: string;
  category_key: string;
  action: string;
  changed_by: string;
  record_id: string | null;
  previous_value: unknown;
  new_value: unknown;
  note: string | null;
  created_at: string;
}

// ─── Plain Supabase client (no SSR cookies — safe for unstable_cache) ─────────

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// ─── Tax brackets ──────────────────────────────────────────────────────────────

export const getNonResidentTaxBrackets = cached(
  async (): Promise<TaxBracket[]> => {
    try {
      const { data, error } = await getClient()
        .from("fi_tax_brackets")
        .select("income_from, income_to, rate, description, sort_order")
        .eq("taxpayer_type", "non_resident")
        .eq("is_active", true)
        .order("sort_order");

      if (!error && data && data.length > 0) {
        return (data as DbTaxBracket[]).map((r) => ({
          from: r.income_from,
          to: r.income_to,
          rate: Number(r.rate),
          description: r.description,
        }));
      }
    } catch {
      console.error("[fi-data] non_resident_tax DB fetch failed — using static fallback");
    }
    return NON_RESIDENT_TAX_BRACKETS;
  },
  ["fi-data", "fi-tax-non-resident"],
  { revalidate: CacheTTL.STATIC }
);

export const getResidentTaxBrackets = cached(
  async (): Promise<TaxBracket[]> => {
    try {
      const { data, error } = await getClient()
        .from("fi_tax_brackets")
        .select("income_from, income_to, rate, description, sort_order")
        .eq("taxpayer_type", "resident")
        .eq("is_active", true)
        .order("sort_order");

      if (!error && data && data.length > 0) {
        return (data as DbTaxBracket[]).map((r) => ({
          from: r.income_from,
          to: r.income_to,
          rate: Number(r.rate),
          description: r.description,
        }));
      }
    } catch {
      console.error("[fi-data] resident_tax DB fetch failed — using static fallback");
    }
    return RESIDENT_TAX_BRACKETS;
  },
  ["fi-data", "fi-tax-resident"],
  { revalidate: CacheTTL.STATIC }
);

// ─── DTA countries ─────────────────────────────────────────────────────────────

export const getDtaCountries = cached(
  async (): Promise<DTACountry[]> => {
    try {
      const { data, error } = await getClient()
        .from("fi_dta_countries")
        .select("country, country_code, has_dta, dividend_wht, interest_wht, royalties_wht, dta_effective_year, notes")
        .eq("is_active", true)
        .order("sort_order");

      if (!error && data && data.length > 0) {
        return (data as DbDtaCountry[]).map((r) => ({
          country: r.country,
          countryCode: r.country_code,
          hasDTA: r.has_dta,
          dividendWHT: Number(r.dividend_wht),
          interestWHT: Number(r.interest_wht),
          royaltiesWHT: Number(r.royalties_wht),
          dtaEffectiveYear: r.dta_effective_year ?? undefined,
          notes: r.notes ?? undefined,
        }));
      }
    } catch {
      console.error("[fi-data] dta_countries DB fetch failed — using static fallback");
    }
    return DTA_COUNTRIES;
  },
  ["fi-data", "fi-dta-countries"],
  { revalidate: CacheTTL.STATIC }
);

// ─── DASP rates ────────────────────────────────────────────────────────────────

export const getDaspRates = cached(
  async (): Promise<DASPRate[]> => {
    try {
      const { data, error } = await getClient()
        .from("fi_dasp_rates")
        .select("component_type, withholding_rate, notes, sort_order")
        .eq("visa_category", "standard")
        .eq("is_active", true)
        .order("sort_order");

      if (!error && data && data.length > 0) {
        return (data as DbDaspRate[]).map((r) => ({
          componentType: r.component_type,
          withholdingRate: Number(r.withholding_rate),
          notes: r.notes ?? "",
        }));
      }
    } catch {
      console.error("[fi-data] dasp_rates DB fetch failed — using static fallback");
    }
    return DASP_WITHHOLDING_RATES;
  },
  ["fi-data", "fi-dasp-rates"],
  { revalidate: CacheTTL.STATIC }
);

// ─── Withholding rates by income type ─────────────────────────────────────────

export const getWithholdingRates = cached(
  async (): Promise<DbWithholdingRate[]> => {
    try {
      const { data, error } = await getClient()
        .from("fi_withholding_rates")
        .select("id, income_type, standard_rate, with_dta_typical, notes, color, sort_order")
        .eq("is_active", true)
        .order("sort_order");

      if (!error && data && data.length > 0) {
        return data as DbWithholdingRate[];
      }
    } catch {
      console.error("[fi-data] withholding_rates DB fetch failed — using static fallback");
    }
    // Static fallback — same data as WITHHOLDING_TABLE in tax/page.tsx
    return [
      { id: "static-1", income_type: "Dividends (unfranked)", standard_rate: "30%", with_dta_typical: "Typically 15% (varies by country)", notes: "Applied to the unfranked portion of dividends paid to non-residents", color: "red", sort_order: 1 },
      { id: "static-2", income_type: "Dividends (fully franked)", standard_rate: "0%", with_dta_typical: "0%", notes: "Tax already paid via imputation system. Non-residents receive the dividend gross but cannot claim the franking credit refund.", color: "green", sort_order: 2 },
      { id: "static-3", income_type: "Dividends (partially franked)", standard_rate: "30% on unfranked portion", with_dta_typical: "Typically 15% on unfranked portion", notes: "WHT applies only to the unfranked component.", color: "amber", sort_order: 3 },
      { id: "static-4", income_type: "Interest (bank deposits, bonds)", standard_rate: "10%", with_dta_typical: "Typically 10% (rarely reduced below 10%)", notes: "Final withholding tax. No Australian return required for passive interest income only.", color: "amber", sort_order: 4 },
      { id: "static-5", income_type: "Royalties", standard_rate: "30%", with_dta_typical: "Typically 5–15% (varies significantly)", notes: "Covers intellectual property, patents, copyright, software licences.", color: "red", sort_order: 5 },
      { id: "static-6", income_type: "Rental income", standard_rate: "Non-resident rates (30%+ no TFT)", with_dta_typical: "DTAs rarely reduce rental income WHT", notes: "Australian rental income is taxed at non-resident rates. Australian tax return required.", color: "orange", sort_order: 6 },
      { id: "static-7", income_type: "CGT — Australian real property", standard_rate: "Non-resident rates + 15% buyer WHT on sale >$750k", with_dta_typical: "No CGT exemption for real property", notes: "No 50% CGT discount for non-residents. 15% WHT deducted from sale price by buyer's conveyancer (rate increased from 12.5% effective 1 Jan 2025).", color: "red", sort_order: 7 },
      { id: "static-8", income_type: "CGT — Listed Australian shares (<10% holding)", standard_rate: "0% (exempt)", with_dta_typical: "0%", notes: "Section 855-10 exemption: non-residents generally exempt from CGT on portfolio share investments in listed Australian companies.", color: "green", sort_order: 8 },
    ];
  },
  ["fi-data", "fi-withholding-rates"],
  { revalidate: CacheTTL.STATIC }
);

// ─── Property rules ────────────────────────────────────────────────────────────

export const getPropertyRules = cached(
  async (): Promise<DbPropertyRule[]> => {
    try {
      const { data, error } = await getClient()
        .from("fi_property_rules")
        .select("id, rule_key, rule_type, title, value, effective_from, effective_to, notes, source_url, sort_order")
        .eq("is_active", true)
        .order("sort_order");

      if (!error && data && data.length > 0) {
        return data as DbPropertyRule[];
      }
    } catch {
      console.error("[fi-data] property_rules DB fetch failed — using static fallback");
    }
    return [];
  },
  ["fi-data", "fi-property-rules"],
  { revalidate: CacheTTL.STATIC }
);

/**
 * Helper: get a single property rule by key.
 * Used for CGT withholding rate, FIRB fees, ban dates, etc.
 */
export async function getPropertyRuleValue(key: string): Promise<string | null> {
  const rules = await getPropertyRules();
  return rules.find((r) => r.rule_key === key)?.value ?? null;
}

// ─── Category metadata (admin use + public staleness banners) ─────────────────

export const getDataCategories = cached(
  async (): Promise<DbDataCategory[]> => {
    try {
      const { data, error } = await getClient()
        .from("fi_data_categories")
        .select("*")
        .order("category_key");

      if (!error && data) return data as DbDataCategory[];
    } catch {
      console.error("[fi-data] data_categories DB fetch failed");
    }
    return [];
  },
  ["fi-data", "fi-data-categories"],
  { revalidate: CacheTTL.MODERATE }
);

// ─── Change log (admin use) ────────────────────────────────────────────────────

export const getChangeLog = cached(
  async (limit = 50): Promise<DbChangeLog[]> => {
    try {
      const { data, error } = await getClient()
        .from("fi_change_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (!error && data) return data as DbChangeLog[];
    } catch {
      console.error("[fi-data] change_log DB fetch failed");
    }
    return [];
  },
  ["fi-data", "fi-change-log"],
  { revalidate: CacheTTL.DYNAMIC }
);

// ─── Default WHT (derived from DB withholding rates or static) ────────────────

export async function getDefaultWHT(): Promise<{ dividendUnfranked: number; dividendFullyFranked: number; interest: number; royalties: number }> {
  const rates = await getWithholdingRates();
  const unfranked = rates.find((r) => r.income_type === "Dividends (unfranked)");
  const interest = rates.find((r) => r.income_type === "Interest (bank deposits, bonds)");

  return {
    dividendUnfranked: unfranked
      ? parseInt(unfranked.standard_rate.replace("%", "")) || DEFAULT_WHT.dividendUnfranked
      : DEFAULT_WHT.dividendUnfranked,
    dividendFullyFranked: 0,
    interest: interest
      ? parseInt(interest.standard_rate.replace("%", "")) || DEFAULT_WHT.interest
      : DEFAULT_WHT.interest,
    royalties: DEFAULT_WHT.royalties,
  };
}

// ─── Computed staleness status ─────────────────────────────────────────────────

export function computeCategoryStatus(
  category: DbDataCategory
): "current" | "needs_review" | "stale" | "urgent" {
  if (!category.last_verified_at) return "stale";

  const daysSince = Math.floor(
    (Date.now() - new Date(category.last_verified_at).getTime()) /
      (1000 * 60 * 60 * 24)
  );

  if (daysSince >= category.urgent_threshold_days) return "urgent";
  if (daysSince >= category.warning_threshold_days) return "stale";
  if (daysSince >= category.warning_threshold_days * 0.75) return "needs_review";
  return "current";
}

export function daysSinceVerified(lastVerifiedAt: string | null): number {
  if (!lastVerifiedAt) return Infinity;
  return Math.floor(
    (Date.now() - new Date(lastVerifiedAt).getTime()) / (1000 * 60 * 60 * 24)
  );
}
