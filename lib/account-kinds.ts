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
 */

import { cookies } from "next/headers";
// eslint-disable-next-line no-restricted-imports -- cross-user / service-role-managed reads with no per-user JWT path (see CLAUDE.md § "Two Supabase clients").
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import type { AccountKind } from "@/lib/account-types";

const log = logger("account-kinds");

export const ACTIVE_KIND_COOKIE = "iv_active_kind";
export const ACTIVE_TEAM_COOKIE = "iv_active_team_id";
export const ACTIVE_KIND_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

// AccountKind covers the 5 base workspace kinds plus 'squad', a team-scoped
// workspace where the user acts on behalf of an expert_team they're an
// active member of. WorkspaceKind is kept as a readability alias.
export type WorkspaceKind = AccountKind;

export interface KindMembership {
  authUserId: string;
  kind: WorkspaceKind;
  kindId: string;
  status: string;
  displayLabel: string;
  /**
   * For team-scoped workspaces (currently only kind='squad'), the team's
   * slug — used for routing to /teams/<slug>/dashboard. NULL for base kinds.
   */
  scopeSlug: string | null;
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
      .select("auth_user_id, kind, kind_id, status, display_label, scope_slug, created_at")
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
      scopeSlug: (r.scope_slug as string | null) ?? null,
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
 * is TRUE (Phase 3 hardening) — no client-side reader exists today and
 * the WorkspaceSwitcher resolves active state via `/api/account/active-kind`
 * GET. Defence-in-depth against XSS-driven workspace pivoting; RLS still
 * enforces data isolation per kind regardless of cookie value.
 */
export async function setActiveKind(kind: WorkspaceKind): Promise<void> {
  const c = await cookies();
  c.set(ACTIVE_KIND_COOKIE, kind, {
    maxAge: ACTIVE_KIND_TTL_SECONDS,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearActiveKind(): Promise<void> {
  const c = await cookies();
  c.delete(ACTIVE_KIND_COOKIE);
  c.delete(ACTIVE_TEAM_COOKIE);
}

/**
 * Read the active team id from the cookie. Only meaningful when the active
 * kind is 'squad'. Returns null when unset.
 */
export async function getActiveTeamId(): Promise<string | null> {
  const c = await cookies();
  return c.get(ACTIVE_TEAM_COOKIE)?.value ?? null;
}

/**
 * Set the active team id (squad workspace scope). 30-day TTL mirrors the
 * kind cookie. httpOnly TRUE (Phase 3 hardening) for the same reason
 * as setActiveKind — no client reader exists; team-scope active state
 * is resolved server-side. RLS still enforces team-scoped data isolation.
 */
export async function setActiveTeamId(teamId: string): Promise<void> {
  const c = await cookies();
  c.set(ACTIVE_TEAM_COOKIE, teamId, {
    maxAge: ACTIVE_KIND_TTL_SECONDS,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearActiveTeamId(): Promise<void> {
  const c = await cookies();
  c.delete(ACTIVE_TEAM_COOKIE);
}

const KNOWN_WORKSPACE_KINDS = new Set<WorkspaceKind>([
  "advisor",
  "broker_partner",
  "investor",
  "business_owner",
  "listing_owner",
  "squad",
  "wholesale_operator",
  "embed_customer",
]);

export function isWorkspaceKind(value: string): value is WorkspaceKind {
  return KNOWN_WORKSPACE_KINDS.has(value as WorkspaceKind);
}

/**
 * Pure helper: pick the post-callback redirect URL based on the user's
 * memberships and (optionally) their stored preferences. Used by
 * `/auth/callback/route.ts` after a successful authentication.
 *
 *   0 kinds  → `/account` (default investor surface; new users can
 *              create non-investor kinds from there)
 *   1 kind   → that kind's portal, set cookie (+ team cookie if squad)
 *   2+ kinds → if preferences.defaultKind is set AND the user still holds
 *              it → that workspace (auto-route, set cookies)
 *              else if preferences.lastActiveKind is set AND the user
 *              still holds it → that workspace
 *              else → `/account/select-workspace`
 *
 * Preferences are optional — pass `null` (or omit) to keep the original
 * "always chooser for multi-kind" behaviour.
 */
export function chooseCallbackRedirect(
  memberships: ReadonlyArray<KindMembership>,
  fallbackNext: string,
  preferences?: {
    defaultKind: WorkspaceKind | null;
    defaultTeamId: string | null;
    lastActiveKind: WorkspaceKind | null;
    lastActiveTeamId: string | null;
  } | null,
): {
  redirect: string;
  setKind: WorkspaceKind | null;
  setTeamId: string | null;
} {
  if (memberships.length === 0) {
    return { redirect: fallbackNext, setKind: "investor", setTeamId: null };
  }
  if (memberships.length === 1) {
    const only = memberships[0]!;
    return {
      redirect: portalForKind(only.kind, {
        teamSlug: only.scopeSlug,
        fallback: fallbackNext,
      }),
      setKind: only.kind,
      setTeamId: only.kind === "squad" ? only.kindId : null,
    };
  }

  // Multi-membership: try preferences before falling to chooser.
  const tryAutoRoute = (
    kind: WorkspaceKind | null,
    teamId: string | null,
  ): {
    redirect: string;
    setKind: WorkspaceKind | null;
    setTeamId: string | null;
  } | null => {
    if (!kind) return null;
    const match = memberships.find((m) =>
      kind === "squad"
        ? m.kind === "squad" && m.kindId === teamId
        : m.kind === kind,
    );
    if (!match) return null;
    return {
      redirect: portalForKind(match.kind, {
        teamSlug: match.scopeSlug,
        fallback: fallbackNext,
      }),
      setKind: match.kind,
      setTeamId: match.kind === "squad" ? match.kindId : null,
    };
  };

  if (preferences) {
    const fromDefault = tryAutoRoute(preferences.defaultKind, preferences.defaultTeamId);
    if (fromDefault) return fromDefault;
    const fromLast = tryAutoRoute(preferences.lastActiveKind, preferences.lastActiveTeamId);
    if (fromLast) return fromLast;
  }

  return { redirect: "/account/select-workspace", setKind: null, setTeamId: null };
}

/**
 * Map a workspace kind to its primary portal URL. The investor kind keeps
 * the existing /account namespace; specialised kinds get their own. The
 * squad kind requires options.teamSlug to route to /teams/<slug>/dashboard
 * — if absent the caller falls back to the workspace chooser.
 */
export function portalForKind(
  kind: WorkspaceKind,
  options: { teamSlug?: string | null; fallback?: string } = {},
): string {
  const fallback = options.fallback ?? "/account";
  switch (kind) {
    case "advisor": return "/advisor-portal";
    case "broker_partner": return "/broker-portal";
    case "business_owner": return "/business-portal";
    case "listing_owner": return "/invest/my-listings";
    case "investor": return fallback;
    case "squad":
      return options.teamSlug
        ? `/teams/${options.teamSlug}/dashboard`
        : "/account/select-workspace";
    case "wholesale_operator": return "/wholesale-portal";
    case "embed_customer": return "/embed-portal";
    default: return fallback;
  }
}
