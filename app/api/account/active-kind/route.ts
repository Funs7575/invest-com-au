/**
 * /api/account/active-kind — set the workspace cookie (W2 Phase 2.5).
 *
 * POST { kind } → validates the user has membership in that kind via
 * `account_kind_membership`, sets the `iv_active_kind` cookie, returns
 * the destination portal URL. The chooser UI navigates to that URL.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import {
  clearActiveTeamId,
  getActiveKind,
  getKindsForUser,
  isWorkspaceKind,
  portalForKind,
  setActiveKind,
  setActiveTeamId,
} from "@/lib/account-kinds";
import { logger } from "@/lib/logger";

/**
 * GET /api/account/active-kind — returns the user's memberships + the
 * currently-active kind cookie. The header WorkspaceSwitcher fetches
 * this on mount so it can render the right pill without server-rendering
 * server-component logic inside a client tree.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    // Unauthenticated → empty state. Don't 401 because this is a
    // best-effort UX endpoint.
    return NextResponse.json({ memberships: [], active: null });
  }

  const [memberships, active] = await Promise.all([
    getKindsForUser(user.id),
    getActiveKind(),
  ]);

  return NextResponse.json({
    memberships: memberships.map((m) => ({
      kind: m.kind,
      kind_id: m.kindId,
      status: m.status,
      display_label: m.displayLabel,
      scope_slug: m.scopeSlug,
    })),
    active,
  });
}

const log = logger("api:account:active-kind");

export const runtime = "nodejs";

const Body = z.object({
  kind: z.string(),
  // Required when kind === 'squad'; identifies which squad to switch into.
  team_id: z.string().optional(),
});

export const POST = withValidatedBody(Body, async (req, body) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!isWorkspaceKind(body.kind)) {
    return NextResponse.json({ error: "unknown_kind" }, { status: 400 });
  }

  if (body.kind === "squad" && !body.team_id) {
    return NextResponse.json({ error: "team_id_required" }, { status: 400 });
  }

  // Validate membership: user must hold the kind they're trying to switch
  // into. Investor is allowed for any signed-in user (lazy-provisioned).
  // For squad, must hold THE SPECIFIC team membership.
  const memberships = await getKindsForUser(user.id);
  const matching = memberships.find((m) =>
    body.kind === "squad"
      ? m.kind === "squad" && m.kindId === body.team_id
      : m.kind === body.kind,
  );
  const holds = matching !== undefined || (body.kind === "investor" && body.team_id === undefined);
  if (!holds) {
    log.warn("user attempted to switch to unheld kind", {
      userId: user.id,
      kind: body.kind,
      teamId: body.team_id ?? null,
    });
    return NextResponse.json({ error: "no_membership" }, { status: 403 });
  }

  await setActiveKind(body.kind);
  if (body.kind === "squad" && body.team_id) {
    await setActiveTeamId(body.team_id);
  } else {
    await clearActiveTeamId();
  }

  return NextResponse.json({
    ok: true,
    kind: body.kind,
    redirect: portalForKind(body.kind, { teamSlug: matching?.scopeSlug ?? null }),
  });
});
