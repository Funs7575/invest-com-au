/**
 * Portal active-kind gate (W2 strict-separation enforcement).
 *
 * Each portal layout calls `enforcePortalKind(expected)` on every render.
 * Returns null when the visitor is allowed; returns a redirect URL when
 * they should be sent elsewhere.
 *
 * Decision matrix:
 *
 *   | active-kind cookie | holds expected kind | action                                          |
 *   |--------------------|--------------------|-------------------------------------------------|
 *   | absent             | yes                | set cookie to expected, allow                  |
 *   | absent             | no                 | redirect to /account/select-workspace          |
 *   | matches expected   | yes                | allow                                           |
 *   | matches expected   | no                 | clear cookie, redirect to chooser              |
 *   | mismatch           | yes                | redirect to /account/select-workspace          |
 *   | mismatch           | no                 | redirect to /account/select-workspace          |
 *
 * The mismatch case is the load-bearing strict-separation gate. An
 * advisor in advisor workspace navigating to /business-portal hits this:
 * cookie says advisor, expected says business_owner → redirect to
 * chooser. Chooser surfaces all kinds the user holds; they pick again
 * deliberately.
 *
 * RLS on each kind's table is the underlying data isolation. This gate
 * is the UX layer — without it, multi-kind users would silently see
 * data from kinds they didn't intend to be acting as.
 */

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getActiveKind,
  getActiveTeamId,
  getKindsForUser,
  setActiveKind,
  setActiveTeamId,
  type WorkspaceKind,
} from "@/lib/account-kinds";

const CHOOSER = "/account/select-workspace";

/**
 * Enforce the active-workspace gate on a portal page.
 *
 * For base kinds (advisor / broker_partner / investor / business_owner /
 * listing_owner): redirect to chooser unless the user holds the kind AND
 * either the cookie matches or is absent (auto-set on first visit).
 *
 * For 'squad': additionally requires `scope.teamSlug` and validates that
 * (a) the user is an active member of THAT team, (b) the active-team
 * cookie matches the team. Mismatch → chooser so the switch is deliberate.
 */
export async function enforcePortalKind(
  expected: WorkspaceKind,
  scope?: { teamSlug: string },
): Promise<void> {
  if (expected === "squad" && !scope?.teamSlug) {
    throw new Error("enforcePortalKind('squad') requires scope.teamSlug");
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/account/login?redirect=${encodeURIComponent(currentPortalPath(expected, scope?.teamSlug))}`);
  }

  const [active, activeTeamId, memberships] = await Promise.all([
    getActiveKind(),
    getActiveTeamId(),
    getKindsForUser(user.id),
  ]);

  const matching = memberships.find((m) =>
    expected === "squad"
      ? m.kind === "squad" && m.scopeSlug === scope?.teamSlug
      : m.kind === expected,
  );
  const holdsExpected = matching !== undefined;

  if (!holdsExpected) {
    // User isn't entitled to this portal at all. Send to chooser; the
    // chooser will only surface kinds they actually hold.
    redirect(CHOOSER);
  }

  if (expected === "squad") {
    const teamId = matching!.kindId;
    if (active === "squad" && activeTeamId === teamId) {
      return; // happy path — cookie matches expected team
    }
    if (active === null) {
      // First visit since cookie expired or new device. Set both + allow.
      await setActiveKind("squad");
      await setActiveTeamId(teamId);
      return;
    }
    redirect(`${CHOOSER}?from=${encodeURIComponent(currentPortalPath(expected, scope?.teamSlug))}`);
  }

  if (active === expected) {
    return; // happy path
  }

  if (active === null) {
    // First visit since cookie expired or new device. Set + allow.
    await setActiveKind(expected);
    return;
  }

  // Cookie mismatches expected: user holds this kind but is currently
  // "acting as" a different one. Send to chooser to make the switch
  // deliberate.
  redirect(`${CHOOSER}?from=${encodeURIComponent(currentPortalPath(expected, scope?.teamSlug))}`);
}

function currentPortalPath(kind: WorkspaceKind, teamSlug?: string): string {
  switch (kind) {
    case "advisor": return "/advisor-portal";
    case "broker_partner": return "/broker-portal";
    case "business_owner": return "/business-portal";
    case "listing_owner": return "/invest/my-listings";
    case "investor": return "/account";
    case "squad": return teamSlug ? `/teams/${teamSlug}/dashboard` : "/teams";
    case "wholesale_operator": return "/wholesale-portal";
    case "embed_customer": return "/embed-portal";
  }
}
