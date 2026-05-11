/**
 * Account-kind registry — single import surface for code that needs to
 * branch on the kind of account a Supabase `auth.users` row is acting as.
 *
 * Today only two kinds exist in production:
 *
 *   - `advisor`         → professionals.auth_user_id  (AFSL Class 1/2)
 *   - `broker_partner`  → broker_accounts.auth_user_id (marketplace)
 *
 * Both join auth.users via a unique-indexed `auth_user_id` column and own
 * their own RLS policies. A single auth.users row can have at most one of
 * each kind (enforced by the unique indexes); no central account registry
 * exists and none is needed at current volume.
 *
 * Future kinds documented in docs/architecture/account-types.md.
 *
 * This file is intentionally tiny — the architectural decision lives in
 * the doc; this module only exists so refs to AccountKind type-check and
 * future code that needs to discriminate has one obvious place to import
 * from.
 */

export type AccountKind =
  | "advisor"
  | "broker_partner"
  | "investor"        // investor_profiles.auth_user_id (end-user dashboard)
  | "business_owner"  // business_accounts.auth_user_id (W2 Phase 3)
  | "listing_owner";  // listing_owner_accounts.auth_user_id (W2 Phase 4 — table pending)

/**
 * Reserved future kinds (uncomment when the corresponding entity table
 * ships):
 *
 *   - "wholesale_operator"  → fund managers (s708 sophisticated investor)
 *   - "firm_partner"        → firm-admin role (separate from advisor)
 */

export const ACTIVE_ACCOUNT_KINDS: readonly AccountKind[] = [
  "advisor",
  "broker_partner",
  "investor",
  "business_owner",
  "listing_owner",
];

export function isAccountKind(value: unknown): value is AccountKind {
  return typeof value === "string" && (ACTIVE_ACCOUNT_KINDS as readonly string[]).includes(value);
}
