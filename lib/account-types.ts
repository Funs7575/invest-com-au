/**
 * Account-kind registry — single import surface for code that needs to
 * branch on the kind of account a Supabase `auth.users` row is acting as.
 *
 * Five kinds exist in production. Each lives in its own entity table,
 * each links to `auth.users` via a unique-indexed `auth_user_id` column,
 * and each owns its own RLS policies. A single `auth.users` row can hold
 * at most one row per kind (enforced by the unique indexes); no central
 * account registry exists and none is needed at current volume. Multi-kind
 * users are unioned via the `account_kind_membership` view (see
 * supabase/migrations/20260510240000_listing_owner_accounts.sql for the
 * current view definition).
 *
 * Architectural rationale + pattern for adding kind #6 lives in
 * docs/architecture/account-types.md.
 *
 * This file is intentionally tiny — the architectural decision lives in
 * the doc; this module only exists so refs to AccountKind type-check and
 * future code that needs to discriminate has one obvious place to import
 * from.
 */

export type AccountKind =
  | "advisor"             // professionals.auth_user_id (AFSL Class 1/2)
  | "broker_partner"      // broker_accounts.auth_user_id (marketplace)
  | "investor"            // investor_profiles.auth_user_id (end-user dashboard)
  | "business_owner"      // business_accounts.auth_user_id (grants / R&D / sell-prep)
  | "listing_owner"       // listing_owner_accounts.auth_user_id (claimed-listing owners)
  | "squad"               // expert_team_members → professionals.auth_user_id
                          // (squad workspace; team-scoped via scope_slug)
  | "wholesale_operator"  // wholesale_operators.auth_user_id (s708 fund managers)
  | "embed_customer";     // embed_customers.auth_user_id (B2B white-label widget customers)

/**
 * Reserved future kinds (uncomment when the corresponding entity table
 * ships):
 *
 *   - "firm_staff"          → non-licensed firm employees (paraplanner,
 *                              receptionist, marketing); modelled via
 *                              firm_memberships role expansion, not its
 *                              own entity table
 *   - "firm_partner"        → firm-admin role (separate from advisor)
 */

export const ACTIVE_ACCOUNT_KINDS: readonly AccountKind[] = [
  "advisor",
  "broker_partner",
  "investor",
  "business_owner",
  "listing_owner",
  "squad",
  "wholesale_operator",
  "embed_customer",
];

export function isAccountKind(value: unknown): value is AccountKind {
  return typeof value === "string" && (ACTIVE_ACCOUNT_KINDS as readonly string[]).includes(value);
}

// ─── Investor household type (AT stream) ────────────────────────────────────

/**
 * Household structure for investor-portal personalisation. Source of truth
 * is the typed `investor_profiles.household_type` column (Phase 2.2);
 * `investor_profiles.meta.account_type` JSON is kept as a fallback for one
 * release so any in-flight code reading the JSON path still works.
 *
 * Drives content routing and copy variants (AT-01..AT-04 audit stream).
 * "individual" is the default.
 */
export type InvestorAccountType = "individual" | "couple" | "family" | "business";

export const INVESTOR_ACCOUNT_TYPES: readonly {
  value: InvestorAccountType;
  label: string;
  description: string;
}[] = [
  { value: "individual", label: "Individual", description: "Solo investor — personal finances only" },
  { value: "couple", label: "Couple / household", description: "Shared finances with a partner" },
  { value: "family", label: "Family", description: "Family household with dependants" },
  { value: "business", label: "Business / SMSF", description: "Company, trust, or self-managed super" },
] as const;

function isInvestorAccountType(v: unknown): v is InvestorAccountType {
  return v === "individual" || v === "couple" || v === "family" || v === "business";
}

/**
 * Resolve household type with column-first, JSON-fallback ordering. After
 * Phase 2.2 backfill the column is the source of truth; the JSON read
 * survives until the JSON key is dropped in a follow-up.
 */
export function getInvestorAccountType(
  profile: { household_type?: unknown; meta?: Record<string, unknown> | null },
): InvestorAccountType {
  if (isInvestorAccountType(profile.household_type)) {
    return profile.household_type;
  }
  const fromJson = profile.meta?.account_type;
  return isInvestorAccountType(fromJson) ? fromJson : "individual";
}
