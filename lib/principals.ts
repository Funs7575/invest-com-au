/**
 * Principal registry helpers (Phase 0.1 — account/identity architecture).
 *
 * A "principal" is the unified actor row that represents anyone (or anything)
 * able to act in the system and leave audit trail. Today the registry covers:
 *
 *   - kind='human'       — backed by auth.users; one principal per user.
 *                          Linked from each kind table (professionals,
 *                          broker_accounts, investor_profiles, etc.) via
 *                          their principal_id column.
 *   - kind='partner_org' — commercial-partner metadata rows (sponsors,
 *                          newsletter sponsors, partner integrations);
 *                          no auth.users row. Populated in Phase 0.3.
 *
 * The abstraction is designed to extend to agents / internal-team / regulatory
 * representatives in a future session without schema rework.
 *
 * Architectural rationale + phasing: see
 * docs/audits/account-architecture-master-plan-2026-05-19.md.
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
 * exists in auth but has no principal — should not happen in steady state
 * since the Phase 0.1 backfill migration covers every existing user and the
 * post-signin hook (Phase 2.5) provisions new signups.
 */
export async function getPrincipalForAuthUser(
  authUserId: string,
): Promise<Principal | null> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("principals")
      .select("id, kind, auth_user_id, display_name, slug, status, metadata, created_at, updated_at")
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
      .select("id, kind, auth_user_id, display_name, slug, status, metadata, created_at, updated_at")
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
