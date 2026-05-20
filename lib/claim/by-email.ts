/**
 * Canonical email-based claim helper (Phase 2.5).
 *
 * The codebase has ~14 "almost-account" tables that capture person-shaped
 * data before the user signs up (quiz_leads, professional_leads,
 * email_captures, newsletter_subscribers, professional_reviews,
 * advisor_applications, etc.). Each currently has its own ad-hoc claim
 * flow — or no flow at all, leaving orphan rows that never link back to
 * the auth.users row when the user later signs up with the same email.
 *
 * This module is the single canonical "after sign-up, link any pre-existing
 * rows keyed on this email to the new user" helper. Tables that opt in are
 * registered in CLAIMABLE_TABLES; the post-signin hook (Phase 2.5 follow-up)
 * iterates the registry on every successful auth.
 *
 * Note: the session-keyed claim path for anonymous_saves continues to live
 * in lib/bookmarks.ts (`claimAnonymousSaves`). That flow keys on a session
 * cookie, not email, so it's a different shape and stays where it is —
 * the post-signin hook calls both.
 *
 * See docs/audits/account-architecture-master-plan-2026-05-19.md Phase 2.5.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("claim:by-email");

export interface ClaimableTable {
  /** Postgres table name (public schema). */
  table: string;
  /** Column holding the email address of the claimant. */
  emailColumn: string;
  /**
   * Column to populate with the freshly authed user's id. Falsy if the
   * table has no auth_user_id column (e.g. newsletter_subscribers is
   * email-only — claim records the provenance but doesn't add a FK).
   */
  userColumn?: string | null;
  /** Optional principal_id column to populate (Phase 0.1 link). */
  principalColumn?: string | null;
  /**
   * Column flipped to a timestamptz to mark the row as claimed. Most
   * tables use `claimed_at` or `converted_at`. Skipped when null —
   * the userColumn write IS the claim signal.
   */
  claimedAtColumn?: string | null;
  /**
   * If true, only claim rows where `claimedAtColumn IS NULL`. Defaults
   * to true when claimedAtColumn is set.
   */
  onlyUnclaimed?: boolean;
}

/**
 * Registry of every table that should be linked on the post-signin hook.
 * Add entries as new "almost-account" tables ship. Each entry is the
 * minimal mapping needed to find rows by email and stamp the user id
 * + principal id without touching the rest of the row.
 *
 * Conservative defaults — only tables with confirmed email columns and
 * safe-to-stamp semantics are included. New table? Read the docstring
 * on ClaimableTable above, add the entry, and bump the post-signin
 * hook's test coverage.
 */
export const CLAIMABLE_TABLES: readonly ClaimableTable[] = [
  {
    table: "quiz_leads",
    emailColumn: "email",
    userColumn: "user_id",
    claimedAtColumn: "converted_at",
  },
  {
    table: "professional_leads",
    emailColumn: "user_email",
    userColumn: null,
    claimedAtColumn: null,
  },
  {
    table: "email_captures",
    emailColumn: "email",
    userColumn: null,
    claimedAtColumn: null,
  },
  {
    // professional_reviews has reviewer_email but NO user-id column —
    // provenance-only claim (email match recorded, no FK to stamp).
    table: "professional_reviews",
    emailColumn: "reviewer_email",
    userColumn: null,
    claimedAtColumn: null,
  },
  {
    // user_reviews keys on `email` (not reviewer_email) and has no user-id
    // column.
    table: "user_reviews",
    emailColumn: "email",
    userColumn: null,
    claimedAtColumn: null,
  },
  {
    // qa_questions has `email` only — no asker user-id column.
    table: "qa_questions",
    emailColumn: "email",
    userColumn: null,
    claimedAtColumn: null,
  },
  {
    table: "advisor_applications",
    emailColumn: "email",
    userColumn: null, // application is approved by admin, not auto-converted
    claimedAtColumn: null,
  },
  {
    table: "newsletter_subscribers",
    emailColumn: "email",
    userColumn: null,
    claimedAtColumn: null,
  },
] as const;

export interface ClaimResult {
  table: string;
  claimed: number;
  error?: string;
}

/**
 * Link rows in a single table to the freshly authed user. Returns the
 * number of rows updated. Idempotent — re-running on already-claimed
 * rows is a no-op when `onlyUnclaimed` is true (the default).
 */
export async function claimByEmail(opts: {
  email: string;
  authUserId: string;
  principalId?: string | null;
  spec: ClaimableTable;
}): Promise<ClaimResult> {
  const { email, authUserId, principalId, spec } = opts;
  const trimmedEmail = email.trim().toLowerCase();
  if (!trimmedEmail) {
    return { table: spec.table, claimed: 0, error: "empty_email" };
  }

  const supabase = createAdminClient();
  const patch: Record<string, unknown> = {};
  if (spec.userColumn) patch[spec.userColumn] = authUserId;
  if (spec.principalColumn && principalId) patch[spec.principalColumn] = principalId;
  if (spec.claimedAtColumn) patch[spec.claimedAtColumn] = new Date().toISOString();

  if (Object.keys(patch).length === 0) {
    // Nothing to stamp; the table doesn't have any of the claim columns.
    return { table: spec.table, claimed: 0 };
  }

  const onlyUnclaimed = spec.onlyUnclaimed ?? (spec.claimedAtColumn != null);

  try {
    let query = supabase.from(spec.table).update(patch).eq(spec.emailColumn, trimmedEmail);
    if (onlyUnclaimed && spec.claimedAtColumn) {
      query = query.is(spec.claimedAtColumn, null);
    }
    const { error, count } = await query.select("*", { count: "exact", head: true });
    if (error) {
      log.warn("claimByEmail update failed", {
        table: spec.table,
        email: trimmedEmail,
        error: error.message,
      });
      return { table: spec.table, claimed: 0, error: error.message };
    }
    return { table: spec.table, claimed: count ?? 0 };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.warn("claimByEmail threw", { table: spec.table, email: trimmedEmail, err: msg });
    return { table: spec.table, claimed: 0, error: msg };
  }
}

/**
 * Run claimByEmail across every entry in CLAIMABLE_TABLES. Returns the
 * per-table result list. Errors on individual tables don't stop the
 * loop — each is reported independently so the post-signin hook can
 * log the full picture even on partial failure.
 */
export async function claimAllByEmail(opts: {
  email: string;
  authUserId: string;
  principalId?: string | null;
}): Promise<ClaimResult[]> {
  const results: ClaimResult[] = [];
  for (const spec of CLAIMABLE_TABLES) {
    // Sequential — these are small writes against different tables, and
    // sequential makes the per-table error reporting cleaner. Parallel
    // would only help on a large registry.
    // eslint-disable-next-line no-await-in-loop -- see above
    results.push(await claimByEmail({ ...opts, spec }));
  }
  return results;
}
