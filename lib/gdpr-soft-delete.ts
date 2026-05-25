/**
 * GDPR / APP soft-delete + redaction helpers.
 *
 * Single source of truth for the two-stage account-deletion lifecycle that is
 * wired into main's existing `account_deletion_requests` flow:
 *
 *   1. Request   — POST /api/account/delete upserts an
 *                  `account_deletion_requests` row (status='scheduled',
 *                  scheduled_purge_at = now + 30d) AND immediately stamps
 *                  `deleted_at` on the user's entity rows via
 *                  `markUserEntitiesDeleted`. PII is preserved during the
 *                  grace window so an accidental request can be cancelled.
 *
 *   2. Cancel    — DELETE /api/account/delete clears `deleted_at` via
 *                  `clearUserEntitiesDeleted`, fully restoring visibility.
 *
 *   3. Redact    — /api/cron/redact-deleted-users runs daily: for requests
 *                  past their grace window it calls `redactUserEntities`,
 *                  nulling PII columns (retaining a "Deleted user" skeleton
 *                  for the AFSL 7-year financial-record requirement) and
 *                  stamping `pii_redacted_at`.
 *
 *   4. Hard-delete — /api/cron/hard-delete-expired removes rows whose
 *                  `pii_redacted_at` is older than the 7-year retention
 *                  window.
 *
 * Keeping the table list + PII column map here (rather than inlined in each
 * caller) means adding a 6th account kind only touches this file.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * The user-facing entity tables that carry per-user PII and were given
 * `deleted_at` / `pii_redacted_at` columns by
 * 20260801000800_gdpr_soft_delete.sql. Every table here is keyed by
 * `auth_user_id`.
 */
export const SOFT_DELETE_ENTITY_TABLES = [
  "professionals",
  "broker_accounts",
  "investor_profiles",
  "business_accounts",
  "listing_owner_accounts",
] as const;

export type SoftDeleteEntityTable = (typeof SOFT_DELETE_ENTITY_TABLES)[number];

/**
 * Per-table PII redaction map. Keys are columns to clear; the value is what
 * to write — `null` for nullable columns, or a fixed placeholder for NOT NULL
 * columns (so the financial-record skeleton stays queryable under an
 * anonymised label). Column names verified against the live schema:
 *   - professionals:          name (NOT NULL), firm_name, bio, photo_url, phone, email
 *   - broker_accounts:        full_name (NOT NULL), email (NOT NULL), company_name, phone
 *   - investor_profiles:      display_name (nullable)
 *   - business_accounts:      business_name (NOT NULL), legal_name (nullable)
 *   - listing_owner_accounts: display_name (nullable)
 */
export const PII_REDACTION_MAP: Record<
  SoftDeleteEntityTable,
  Record<string, string | null>
> = {
  professionals: {
    name: "Deleted user",
    firm_name: null,
    bio: null,
    photo_url: null,
    phone: null,
    email: null,
  },
  broker_accounts: {
    full_name: "Deleted user",
    email: "deleted@privacy.invest.com.au",
    company_name: null,
    phone: null,
  },
  investor_profiles: {
    display_name: null,
  },
  business_accounts: {
    business_name: "Deleted account",
    legal_name: null,
  },
  listing_owner_accounts: {
    display_name: null,
  },
};

interface SoftDeleteResult {
  /** Tables whose update returned an error (best-effort callers log these). */
  failedTables: string[];
}

/**
 * Stamp `deleted_at = now` on every entity row owned by `authUserId` that is
 * not already soft-deleted. Best-effort and idempotent: tables the user has
 * no row in simply match nothing, and the `deleted_at IS NULL` guard means a
 * repeat request does not overwrite the original timestamp. Errors are
 * collected rather than thrown so a single failing table never blocks the
 * caller (the request row is the authoritative marker).
 */
export async function markUserEntitiesDeleted(
  supabase: SupabaseClient,
  authUserId: string,
  when: string = new Date().toISOString(),
): Promise<SoftDeleteResult> {
  const failedTables: string[] = [];
  for (const table of SOFT_DELETE_ENTITY_TABLES) {
    const { error } = await supabase
      .from(table)
      .update({ deleted_at: when })
      .eq("auth_user_id", authUserId)
      .is("deleted_at", null);
    if (error) failedTables.push(table);
  }
  return { failedTables };
}

/**
 * Clear `deleted_at` (restore visibility) on every entity row owned by
 * `authUserId` that was soft-deleted but not yet PII-redacted. Used by the
 * cancel path so a within-grace cancellation fully restores the account.
 * Rows that have already been redacted (pii_redacted_at IS NOT NULL) are left
 * alone — PII is gone and there is nothing to restore.
 */
export async function clearUserEntitiesDeleted(
  supabase: SupabaseClient,
  authUserId: string,
): Promise<SoftDeleteResult> {
  const failedTables: string[] = [];
  for (const table of SOFT_DELETE_ENTITY_TABLES) {
    const { error } = await supabase
      .from(table)
      .update({ deleted_at: null })
      .eq("auth_user_id", authUserId)
      .not("deleted_at", "is", null)
      .is("pii_redacted_at", null);
    if (error) failedTables.push(table);
  }
  return { failedTables };
}

/**
 * Null PII columns and stamp `pii_redacted_at = now` on every entity row
 * owned by `authUserId` that is soft-deleted and not yet redacted. Idempotent
 * via the `pii_redacted_at IS NULL` guard. Used by the redact-deleted-users
 * cron after the grace window has expired.
 */
export async function redactUserEntities(
  supabase: SupabaseClient,
  authUserId: string,
  when: string = new Date().toISOString(),
): Promise<SoftDeleteResult> {
  const failedTables: string[] = [];
  for (const table of SOFT_DELETE_ENTITY_TABLES) {
    const patch = { ...PII_REDACTION_MAP[table], pii_redacted_at: when };
    const { error } = await supabase
      .from(table)
      .update(patch)
      .eq("auth_user_id", authUserId)
      .not("deleted_at", "is", null)
      .is("pii_redacted_at", null);
    if (error) failedTables.push(table);
  }
  return { failedTables };
}
