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
  getKindsForUser,
  setActiveKind,
  type WorkspaceKind,
} from "@/lib/account-kinds";

const CHOOSER = "/account/select-workspace";

export async function enforcePortalKind(expected: WorkspaceKind): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/account/login?redirect=${encodeURIComponent(currentPortalPath(expected))}`);
  }

  const [active, memberships] = await Promise.all([
    getActiveKind(),
    getKindsForUser(user.id),
  ]);
  const holdsExpected = memberships.some((m) => m.kind === expected);

  if (active === expected && holdsExpected) {
    return; // happy path
  }

  if (active === null && holdsExpected) {
    // First visit since cookie expired or new device. Set + allow.
    await setActiveKind(expected);
    return;
  }

  if (!holdsExpected) {
    // User isn't entitled to this portal at all. Send to chooser; the
    // chooser will only surface kinds they actually hold.
    redirect(CHOOSER);
  }

  // Cookie mismatches expected: user holds this kind but is currently
  // "acting as" a different one. Send to chooser to make the switch
  // deliberate.
  redirect(`${CHOOSER}?from=${encodeURIComponent(currentPortalPath(expected))}`);
}

function currentPortalPath(kind: WorkspaceKind): string {
  switch (kind) {
    case "advisor": return "/advisor-portal";
    case "broker_partner": return "/broker-portal";
    case "business_owner": return "/business-portal";
    case "listing_owner": return "/invest/my-listings";
    case "investor": return "/account";
  }
}
