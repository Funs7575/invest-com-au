/**
 * saved_searches — persistent filter snapshots + daily digest alerts.
 *
 * Users save a `/advisors` or `/teams` filter combination once; the cron
 * (`app/api/cron/saved-search-alerts/route.ts`) re-runs each saved row
 * daily and emails a digest when the matching provider set changes.
 *
 * Service-role rationale (per CLAUDE.md):
 *   - The cron is a CRON_SECRET-authenticated context with no user JWT
 *     attached, so it cannot rely on RLS — service role is documented as
 *     the legitimate path for "cross-user queries that can't be scoped to
 *     auth.uid()" (digest fan-out).
 *   - Mutating routes (POST/PATCH/DELETE under app/api/saved-searches/*)
 *     authenticate the user via createClient() from lib/supabase/server,
 *     but call the helpers in this module which use service role to scope
 *     writes by user_id — keeping the writeable scope to "the caller's own
 *     rows" via the explicit `eq("user_id", userId)` in every mutator.
 *
 * Helpers never throw — DB errors surface as `null` / `[]` so the UI never
 * displays a stack trace; the calling route handler logs + returns an
 * appropriate response code.
 */

import { createHash } from "node:crypto";

// eslint-disable-next-line no-restricted-imports -- saved-searches helpers serve two service-role-legitimate paths per CLAUDE.md: (1) the daily-digest cron has no user JWT and must scan/update rows across users; (2) mutator helpers scope writes with `.eq("user_id", userId)` where userId comes from the route handler's verified session, so cross-tenant writes remain impossible.
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("saved-searches");

export const SAVED_SEARCH_KINDS = ["advisors", "teams", "invest"] as const;
export type SavedSearchKind = (typeof SAVED_SEARCH_KINDS)[number];

export const EMAIL_FREQUENCIES = ["off", "daily", "weekly"] as const;
export type EmailFrequency = (typeof EMAIL_FREQUENCIES)[number];

export interface SavedSearchRow {
  id: number;
  user_id: string;
  kind: SavedSearchKind;
  label: string;
  filters: Record<string, unknown>;
  email_frequency: EmailFrequency;
  last_alerted_at: string | null;
  last_match_signature: string | null;
  created_at: string;
  updated_at: string;
}

/** Columns returned by every read — keep in sync with SavedSearchRow. */
const SELECT_COLUMNS =
  "id, user_id, kind, label, filters, email_frequency, last_alerted_at, last_match_signature, created_at, updated_at";

export interface CreateInput {
  userId: string;
  kind: SavedSearchKind;
  label: string;
  filters: Record<string, unknown>;
  email_frequency?: EmailFrequency;
}

export interface UpdatePatch {
  label?: string;
  filters?: Record<string, unknown>;
  email_frequency?: EmailFrequency;
}

/**
 * List a user's saved searches, newest first. Returns [] on error so the
 * page never blanks out — callers that need to surface a load failure can
 * check separately.
 */
export async function listForUser(userId: string): Promise<SavedSearchRow[]> {
  if (!userId) return [];
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("saved_searches")
      .select(SELECT_COLUMNS)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) {
      log.warn("listForUser failed", { userId, error: error.message });
      return [];
    }
    return (data as SavedSearchRow[] | null) ?? [];
  } catch (err) {
    log.warn("listForUser threw", {
      userId,
      err: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

/**
 * Create a saved search. Returns the inserted row on success, null on
 * failure (route handler returns 500 / surfaces an error message).
 */
export async function create(input: CreateInput): Promise<SavedSearchRow | null> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("saved_searches")
      .insert({
        user_id: input.userId,
        kind: input.kind,
        label: input.label,
        filters: input.filters,
        email_frequency: input.email_frequency ?? "daily",
      })
      .select(SELECT_COLUMNS)
      .single();
    if (error || !data) {
      log.warn("create failed", {
        userId: input.userId,
        error: error?.message,
      });
      return null;
    }
    return data as SavedSearchRow;
  } catch (err) {
    log.warn("create threw", {
      userId: input.userId,
      err: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/**
 * Patch a saved search owned by `userId`. The `eq("user_id", userId)`
 * scoping is what makes this safe under the service-role escape hatch —
 * the user-id is supplied by the route handler that just verified it
 * against the session cookie, so cross-tenant writes are not possible.
 */
export async function update(
  id: number,
  userId: string,
  patch: UpdatePatch,
): Promise<SavedSearchRow | null> {
  try {
    const supabase = createAdminClient();
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (patch.label !== undefined) updates.label = patch.label;
    if (patch.filters !== undefined) updates.filters = patch.filters;
    if (patch.email_frequency !== undefined)
      updates.email_frequency = patch.email_frequency;

    const { data, error } = await supabase
      .from("saved_searches")
      .update(updates)
      .eq("id", id)
      .eq("user_id", userId)
      .select(SELECT_COLUMNS)
      .maybeSingle();
    if (error) {
      log.warn("update failed", { id, userId, error: error.message });
      return null;
    }
    return (data as SavedSearchRow | null) ?? null;
  } catch (err) {
    log.warn("update threw", {
      id,
      userId,
      err: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/** Delete a saved search owned by `userId`. Returns true on success. */
export async function remove(id: number, userId: string): Promise<boolean> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("saved_searches")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);
    if (error) {
      log.warn("remove failed", { id, userId, error: error.message });
      return false;
    }
    return true;
  } catch (err) {
    log.warn("remove threw", {
      id,
      userId,
      err: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

/**
 * Stable, order-independent sha256 of a result set's ids.
 *
 * Used by the alerts cron to detect "anything new since last digest" —
 * we hash the sorted id list and compare against `last_match_signature`.
 * The hash is intentionally order-agnostic (sort before hashing) because
 * the underlying query may return matches in any order without that
 * being a meaningful change to the user.
 *
 * Empty input → hash of "". This is by design so a saved search that
 * stops matching can still be distinguished from one that has never
 * matched (null signature).
 */
export function computeMatchSignature(
  matches: Array<{ id: number | string }>,
): string {
  const ids = matches
    .map((m) => String(m.id))
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return createHash("sha256").update(ids.join(",")).digest("hex");
}
