/**
 * Principal registry helpers (account/identity architecture foundation).
 *
 * A "principal" is the unified actor row that represents anyone (or anything)
 * able to act in the system and leave an audit trail. Today the registry
 * covers:
 *
 *   - kind='human'       — backed by auth.users; one principal per user.
 *   - kind='partner_org' — commercial-partner metadata rows (sponsors,
 *                          newsletter sponsors, partner integrations);
 *                          no auth.users row.
 *
 * The abstraction is designed to extend to agents / internal-team /
 * regulatory representatives in a future session without schema rework.
 *
 * This module is purely additive: it reads the `principals` table created by
 * 20260801000000_principals_table.sql and does not depend on (or modify) the
 * existing account-kind membership view or the account-kind enum.
 */

// eslint-disable-next-line no-restricted-imports -- cross-user / service-role-managed reads with no per-user JWT path (see CLAUDE.md § "Two Supabase clients").
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("principals");

export type PrincipalKind = "human" | "partner_org";
export type PrincipalStatus = "active" | "suspended" | "retired" | "pending";

export interface Principal {
  id: string;
  kind: PrincipalKind;
  authUserId: string | null;
  displayName: string;
  slug: string | null;
  status: PrincipalStatus;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface PrincipalRow {
  id: string;
  kind: string;
  auth_user_id: string | null;
  display_name: string;
  slug: string | null;
  status: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

const PRINCIPAL_COLUMNS =
  "id, kind, auth_user_id, display_name, slug, status, metadata, created_at, updated_at";

function rowToPrincipal(r: PrincipalRow): Principal {
  return {
    id: r.id,
    kind: r.kind as PrincipalKind,
    authUserId: r.auth_user_id,
    displayName: r.display_name,
    slug: r.slug,
    status: r.status as PrincipalStatus,
    metadata: r.metadata ?? {},
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/**
 * Resolve the principal row for an auth.users id. Returns null when the user
 * has no principal row (e.g. before the human-backfill has run, or when called
 * for a user that never had one provisioned).
 */
export async function getPrincipalForAuthUser(
  authUserId: string,
): Promise<Principal | null> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("principals")
      .select(PRINCIPAL_COLUMNS)
      .eq("kind", "human")
      .eq("auth_user_id", authUserId)
      .maybeSingle();
    if (error) {
      log.warn("getPrincipalForAuthUser failed", { authUserId, error: error.message });
      return null;
    }
    return data ? rowToPrincipal(data as PrincipalRow) : null;
  } catch (err) {
    log.warn("getPrincipalForAuthUser threw", {
      authUserId,
      err: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

export async function getPrincipalById(principalId: string): Promise<Principal | null> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("principals")
      .select(PRINCIPAL_COLUMNS)
      .eq("id", principalId)
      .maybeSingle();
    if (error) {
      log.warn("getPrincipalById failed", { principalId, error: error.message });
      return null;
    }
    return data ? rowToPrincipal(data as PrincipalRow) : null;
  } catch (err) {
    log.warn("getPrincipalById threw", {
      principalId,
      err: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}
