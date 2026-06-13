/**
 * Account-kind multi-membership helpers (W2 Phase 2.5).
 *
 * Real-world users hold multiple kinds simultaneously: a sole-trader
 * financial planner is an advisor + business owner + investor. The
 * `account_kind_membership` view UNIONs across all `*_accounts`/profiles
 * tables so we can answer "what hats does this user wear?" in one query.
 *
 * Workspace-style UX: at sign-in, if the user holds 2+ kinds, redirect to
 * `/account/select-workspace`. The chosen kind is persisted in the
 * `iv_active_kind` cookie (30-day TTL, sameSite=lax). Portal layouts read
 * the cookie via `getActiveKind()` and redirect away if mismatch.
 *
 * Strict separation: investor `/account/holdings` is only accessible when
 * `iv_active_kind === 'investor'`. An advisor in advisor workspace
 * navigating to `/account/holdings` is redirected back to the chooser.
 * RLS already isolates each table by auth.uid(); the cookie + redirect
 * is the UX gate.
 *
 * Households (idea #6) are deliberately NOT a workspace kind. A household is an
 * OVERLAY on the investor surface (shared goals/balances/watchlist within
 * /account), not a separate portal you switch into — so it has no entry here,
 * no `portalForKind` case, and no cookie. Its entry point is the flag-gated
 * `HouseholdAccountTile` on the account home + `/account/household`. Keeping it
 * out of the kind registry avoids polluting the cookie-switched portal model.
 */

import { cookies } from "next/headers";
// eslint-disable-next-line no-restricted-imports -- cross-user membership view; account_kind_membership UNIONs across all *_accounts tables, not scopeable to auth.uid() (CLAUDE.md §"Two Supabase clients")
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import type { AccountKind } from "@/lib/account-types";

const log = logger("account-kinds");

export const ACTIVE_KIND_COOKIE = "iv_active_kind";
export const ACTIVE_KIND_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

// As of W2 Phase 3, AccountKind covers all 5 workspace kinds. WorkspaceKind
// is kept as an alias for call-site readability ("workspace" semantics
// vs "account membership" semantics) but they're the same union.
export type WorkspaceKind = AccountKind;

export interface KindMembership {
  authUserId: string;
  kind: WorkspaceKind;
  kindId: string;
  status: string;
  displayLabel: string;
  createdAt: string;
}

/**
 * List every kind the user holds. Empty array means a brand-new auth.users
 * row with no membership — onboarding flow should pick a kind to provision.
 *
 * Reads through `account_kind_membership` view via service-role so the
 * caller doesn't need a JWT.
 */
export async function getKindsForUser(userId: string): Promise<KindMembership[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("account_kind_membership")
      .select("auth_user_id, kind, kind_id, status, display_label, created_at")
      .eq("auth_user_id", userId)
      .order("created_at", { ascending: true });
    if (error) {
      log.warn("getKindsForUser failed", { userId, error: error.message });
      return [];
    }
    return (data ?? []).map((r) => ({
      authUserId: r.auth_user_id as string,
      kind: r.kind as WorkspaceKind,
      kindId: r.kind_id as string,
      status: r.status as string,
      displayLabel: r.display_label as string,
      createdAt: r.created_at as string,
    }));
  } catch (err) {
    log.warn("getKindsForUser threw", {
      userId,
      err: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

/**
 * Read the active workspace from the cookie. Returns null when unset or
 * when the cookie value isn't a known kind.
 *
 * The caller should still validate against `getKindsForUser()` membership
 * — a stale cookie pointing to a kind the user no longer holds (e.g.
 * advisor account deactivated) should redirect to the chooser.
 */
export async function getActiveKind(): Promise<WorkspaceKind | null> {
  const c = await cookies();
  const raw = c.get(ACTIVE_KIND_COOKIE)?.value;
  if (!raw) return null;
  return isWorkspaceKind(raw) ? raw : null;
}

/**
 * Set the active workspace cookie. Called from the chooser UI's server
 * action when the user picks a kind. 30-day TTL; sameSite=lax; httpOnly
 * is FALSE so the client can read for theming. Not security-critical:
 * RLS still enforces data isolation per kind regardless of cookie value.
 */
export async function setActiveKind(kind: WorkspaceKind): Promise<void> {
  const c = await cookies();
  c.set(ACTIVE_KIND_COOKIE, kind, {
    maxAge: ACTIVE_KIND_TTL_SECONDS,
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearActiveKind(): Promise<void> {
  const c = await cookies();
  c.delete(ACTIVE_KIND_COOKIE);
}

const KNOWN_WORKSPACE_KINDS = new Set<WorkspaceKind>([
  "advisor",
  "broker_partner",
  "investor",
  "business_owner",
  "listing_owner",
  "startup",
  "org_admin",
]);

export function isWorkspaceKind(value: string): value is WorkspaceKind {
  return KNOWN_WORKSPACE_KINDS.has(value as WorkspaceKind);
}

/**
 * Pure helper: pick the post-callback redirect URL based on the user's
 * memberships. Used by `/auth/callback/route.ts` after a successful
 * authentication.
 *
 *   0 kinds  → `/account` (default investor surface; new users can
 *              create non-investor kinds from there)
 *   1 kind   → that kind's portal, set cookie
 *   2+ kinds → `/account/select-workspace`
 */
export function chooseCallbackRedirect(
  memberships: ReadonlyArray<KindMembership>,
  fallbackNext: string,
): { redirect: string; setKind: WorkspaceKind | null } {
  if (memberships.length === 0) {
    return { redirect: fallbackNext, setKind: "investor" };
  }
  if (memberships.length === 1) {
    return {
      redirect: portalForKind(memberships[0]!.kind, fallbackNext),
      setKind: memberships[0]!.kind,
    };
  }
  return { redirect: "/account/select-workspace", setKind: null };
}

/**
 * Map a workspace kind to its primary portal URL. The investor kind keeps
 * the existing /account namespace; specialised kinds get their own.
 */
export function portalForKind(kind: WorkspaceKind, fallback = "/account"): string {
  switch (kind) {
    case "advisor": return "/advisor-portal";
    case "broker_partner": return "/broker-portal";
    case "business_owner": return "/business-portal";
    case "listing_owner": return "/invest/my-listings";
    case "startup": return "/startup-portal";
    case "org_admin": return "/org-portal";
    case "investor": return fallback;
    default: return fallback;
  }
}
