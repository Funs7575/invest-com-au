/**
 * Presentation helpers for rendering an intent on the
 * /marketplace/[intent]/[state] directory pages.
 *
 * Two concerns live here:
 *
 *  1. `providerNounForIntent` — intent `label`s are imperative chip copy
 *     ("Assess an opportunity", "Buy a business") that read as broken English
 *     in a "Best {x} in {state}" heading. Each intent maps to a plural
 *     *provider noun* ("opportunity assessment specialists") that slots in
 *     cleanly. The DB column `intent_taxonomy.provider_noun` (added in
 *     migration 20260907020000_gm03_intent_provider_noun.sql) is the
 *     admin-editable source of truth; this map mirrors it for the
 *     code-defined fallback path and as a safety net while the migration
 *     propagates.
 *
 *  2. `complianceVariantForIntent` — picks the correct ASIC risk-warning
 *     variant for <ComplianceFooter /> from the intent's asset class (crypto,
 *     CFDs, property, foreign/FIRB) so each directory page shows the right
 *     disclosure rather than a generic one.
 */
type ComplianceVariant = "default" | "cfd" | "crypto" | "property" | "firb";

/**
 * Provider noun per intent slug. Mirror of the `intent_taxonomy.provider_noun`
 * backfill in gm03. Keyed loosely by string so NZ + any future admin-added
 * slugs resolve without a type change; the completeness test in
 * `intent-presentation.test.ts` asserts every shipped slug is covered.
 */
export const PROVIDER_NOUNS: Record<string, string> = {
  // 13 retail goals (gm02)
  grow: "investing specialists",
  income: "income & dividend specialists",
  crypto: "crypto investing specialists",
  trade: "trading & CFD specialists",
  automate: "robo-investing specialists",
  super: "super & SMSF specialists",
  property: "property investment specialists",
  home: "mortgage brokers",
  alt_assets: "alternative asset specialists",
  royalties: "royalty & income-asset specialists",
  pre_ipo: "pre-IPO & wholesale deal specialists",
  help: "financial experts",
  browse: "investment specialists",
  // niche / advisor / brief slugs (gm01)
  compare_platform: "investing platform specialists",
  start_investing: "specialists for new investors",
  smsf_property: "SMSF property specialists",
  buy_property: "buyer's agents",
  opportunity_assessment: "opportunity assessment specialists",
  business_acquisition: "business acquisition advisers",
  commercial_property: "commercial property specialists",
  foreign_investor: "foreign investment (FIRB) specialists",
  expat_investing: "expat investment specialists",
  financial_advice: "financial advisers",
  tax_help: "tax accountants",
  mortgage_help: "mortgage brokers",
  legal_help: "property & investment lawyers",
  second_opinion: "independent review specialists",
  listing_owner: "business & asset sale specialists",
  listing_readiness: "listing preparation specialists",
  not_sure: "investment specialists",
  // NZ intents (mm26)
  nz_kiwisaver: "KiwiSaver advisers",
  nz_property_buy: "NZ property specialists",
};

/**
 * Resolve the directory noun for an intent: prefer the admin-editable DB
 * value, then the code map, then a safe generic so a brand-new intent never
 * renders broken copy ("Best verified providers in NSW").
 */
export function providerNounForIntent(intent: {
  slug: string;
  provider_noun?: string | null;
}): string {
  return (
    intent.provider_noun?.trim() ||
    PROVIDER_NOUNS[intent.slug] ||
    "verified providers"
  );
}

const COMPLIANCE_VARIANTS: Record<string, ComplianceVariant> = {
  crypto: "crypto",
  trade: "cfd",
  property: "property",
  buy_property: "property",
  smsf_property: "property",
  commercial_property: "property",
  nz_property_buy: "property",
  foreign_investor: "firb",
};

/** Pick the ASIC risk-warning variant for <ComplianceFooter /> per intent. */
export function complianceVariantForIntent(intent: {
  slug: string;
}): ComplianceVariant {
  return COMPLIANCE_VARIANTS[intent.slug] ?? "default";
}
