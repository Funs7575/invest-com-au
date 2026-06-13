/**
 * Canonical list of advisor `type` values stored on `professionals` rows.
 *
 * This is the single source of truth Country Mode (and any other surface
 * that filters professionals by type) imports against. The DB column is
 * untyped TEXT so Postgres won't catch drift; this union is what stops
 * a typo in a country config from turning the homepage experts strip
 * into a silent zero-row query.
 *
 * Audited 2026-05-08 against `SELECT DISTINCT type FROM professionals` —
 * the 26 entries with `total > 0` plus 11 forward-looking categories
 * accepted by `lib/advisor-opt-ins.ts` for opt-in routing even when no
 * rows are seeded yet (smsf_auditor, classic_car_specialist, etc.).
 *
 * If you add a new advisor specialty in seed data or in a country
 * config, add it here too. The compile-time check is the load-bearing
 * one — the test in __tests__/lib/country-config-advisor-types.test.ts
 * is belt-and-braces.
 */
export const ADVISOR_TYPES = [
  // Active+verified supply in DB (audited 2026-05-08)
  "mortgage_broker",
  "insurance_broker",
  "buyers_agent",
  "financial_planner",
  "tax_agent",
  "real_estate_agent",
  "smsf_accountant",
  "property_advisor",
  "estate_planner",
  "wealth_manager",
  "debt_counsellor",
  "aged_care_advisor",
  "crypto_advisor",
  // Seeded but currently zero active+verified — Country Mode strips
  // pass through them silently until rows are verified
  "migration_agent",
  "stockbroker_firm",
  "business_broker",
  "commercial_lawyer",
  "mining_lawyer",
  "commercial_property_agent",
  "rural_property_agent",
  "foreign_investment_lawyer",
  "resources_fund_manager",
  "energy_financial_planner",
  "petroleum_royalties_advisor",
  "mining_tax_advisor",
  "energy_consultant",
  // Forward-looking categories accepted by lib/advisor-opt-ins.ts opt-in
  // routing even before any rows are seeded
  "private_wealth_manager",
  "smsf_auditor",
  "smsf_specialist",
  "immigration_investment_lawyer",
  "fund_manager",
  "conveyancer",
  "property_lawyer",
  "classic_car_specialist",
  "luxury_asset_broker",
  "wine_advisor",
  "art_advisor",
  "royalty_broker",
  // New in 20260612 — CR-04a grants marketplace (CAPITAL_RAISING_OPPORTUNITIES.md)
  "grant_writer",
] as const;

export type AdvisorType = (typeof ADVISOR_TYPES)[number];

const ADVISOR_TYPE_SET: ReadonlySet<string> = new Set(ADVISOR_TYPES);

/** Runtime type guard — useful for narrowing free-text inputs. */
export function isAdvisorType(value: string): value is AdvisorType {
  return ADVISOR_TYPE_SET.has(value);
}
