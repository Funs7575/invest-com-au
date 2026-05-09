/**
 * Country-schemes data layer.
 *
 * Reads `country_schemes` rows for a given ISO-2 country code. The table
 * is RLS-public-on-active so we use the anon `createClient()` from
 * `lib/supabase/server.ts` — no service-role key needed.
 *
 * Editorial team writes via /admin/country-schemes (service-role); public
 * readers go through this helper.
 */

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const SchemeAudienceSchema = z.enum([
  "inbound_migrant",
  "us_au_dual",
  "non_resident_investor",
  "outbound_australian",
]);
export type SchemeAudience = z.infer<typeof SchemeAudienceSchema>;

export const SchemeCategorySchema = z.enum([
  "visa_pathway",
  "firb_threshold",
  "tax_concession",
  "super_rule",
  "pension_transfer",
  "first_home_buyer",
  "investor_grant",
  "dual_tax_treaty",
]);
export type SchemeCategory = z.infer<typeof SchemeCategorySchema>;

export const CountrySchemeSchema = z.object({
  id: z.number(),
  country_code: z.string(),
  audience: SchemeAudienceSchema,
  category: SchemeCategorySchema,
  name: z.string(),
  summary: z.string(),
  body_md: z.string(),
  threshold_cents: z.number().nullable(),
  threshold_label: z.string().nullable(),
  source_name: z.string(),
  source_url: z.string(),
  sourced_at: z.string(),
  stales_at: z.string(),
  display_order: z.number(),
  active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type CountryScheme = z.infer<typeof CountrySchemeSchema>;

export const CATEGORY_LABELS: Record<SchemeCategory, string> = {
  visa_pathway: "Visa pathways",
  firb_threshold: "FIRB & property",
  tax_concession: "Tax concessions",
  super_rule: "Superannuation",
  pension_transfer: "Pension transfer",
  first_home_buyer: "First-home buyer",
  investor_grant: "Investor grants",
  dual_tax_treaty: "Tax treaty",
};

export const AUDIENCE_LABELS: Record<SchemeAudience, string> = {
  inbound_migrant: "Moving to Australia",
  us_au_dual: "US-AU dual citizens",
  non_resident_investor: "Investing without moving",
  outbound_australian: "Leaving Australia",
};

export interface GetSchemesOptions {
  audience?: SchemeAudience;
}

/**
 * Fetch active schemes for a country, ordered by display_order. Pass an
 * `audience` to narrow further (the typical caller passes none and groups
 * client-side because most country pages show all four audiences).
 */
export async function getSchemesForCountry(
  countryCode: string,
  options: GetSchemesOptions = {},
): Promise<CountryScheme[]> {
  const code = countryCode.trim().toUpperCase();
  if (!code) return [];

  try {
    const supabase = await createClient();
    let query = supabase
      .from("country_schemes")
      .select("*")
      .eq("country_code", code)
      .eq("active", true)
      .order("display_order", { ascending: true });

    if (options.audience) {
      query = query.eq("audience", options.audience);
    }

    const { data } = await query;
    if (!data) return [];

    return data
      .map((row) => CountrySchemeSchema.safeParse(row))
      .flatMap((parsed) => (parsed.success ? [parsed.data] : []));
  } catch {
    return [];
  }
}

/**
 * Group schemes by category, preserving the order they came back in.
 */
export function groupByCategory(
  schemes: readonly CountryScheme[],
): Array<{ category: SchemeCategory; rows: CountryScheme[] }> {
  const map = new Map<SchemeCategory, CountryScheme[]>();
  for (const s of schemes) {
    const list = map.get(s.category) ?? [];
    list.push(s);
    map.set(s.category, list);
  }
  return Array.from(map.entries()).map(([category, rows]) => ({ category, rows }));
}
