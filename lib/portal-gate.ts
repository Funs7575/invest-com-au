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
import { linkProfessionalAuthUser } from "@/lib/professional-auth-link";

const CHOOSER = "/account/select-workspace";

/**
 * `setActiveKind` writes the `iv_active_kind` cookie — but `enforcePortalKind`
 * runs inside layout/page *renders*, and the App Router only permits cookie
 * writes in Server Actions / Route Handlers. Calling it during render throws
 * ("Cookies can only be modified in a Server Action or Route Handler"), which
 * previously crashed the whole `/advisor-portal` with a "Server Components
 * render" error for any user without a pre-set cookie (password login, expired
 * cookie, new device). The cookie-set is therefore best-effort: if it can't be
 * written now it's a no-op (the auth callback / a later write sets it) and we
 * still let the entitled user through. RLS remains the data boundary; this gate
 * is UX-only.
 */
async function bestEffortSetActiveKind(kind: WorkspaceKind): Promise<void> {
  try {
    await setActiveKind(kind);
  } catch {
    /* render-context cookie write not permitted — proceed without persisting */
  }
}

/**
 * @param expected      the workspace kind this portal/page belongs to.
 * @param requestedPath the ACTUAL path the visitor asked for. Used only to
 *   build the `next=` deep-link on the unauthenticated → /auth/login redirect,
 *   so a logged-out visitor to e.g. `/account/holdings` lands back on holdings
 *   after sign-in instead of the workspace root. When omitted, falls back to
 *   the portal root (`currentPortalPath(expected)`) — the prior behaviour, so
 *   every existing caller is unchanged. Pass the page's own route here on
 *   deep-linkable sub-pages (Campaign 3 P3).
 */
export async function enforcePortalKind(
  expected: WorkspaceKind,
  requestedPath?: string,
): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const next = requestedPath ?? currentPortalPath(expected);
    redirect(`/auth/login?next=${encodeURIComponent(next)}`);
  }

  const [active, initialMemberships] = await Promise.all([
    getActiveKind(),
    getKindsForUser(user.id),
  ]);
  let memberships = initialMemberships;
  let holdsExpected = memberships.some((m) => m.kind === expected);

  // Self-heal an unlinked professional. Rows created via the application/
  // approval flow carry a NULL auth_user_id, so the membership view — which
  // keys off auth_user_id — reports zero kinds and the gate would bounce a
  // legitimate advisor out of their own portal (≈98% of active advisors were
  // unlinked as of 2026-06). Link on the email Supabase verified for this
  // session and re-resolve before making any redirect decision. No-op for a
  // visitor who isn't a professional, so non-pro behaviour is unchanged.
  if (!holdsExpected) {
    const linked = await linkProfessionalAuthUser(user.id, user.email);
    if (linked > 0) {
      memberships = await getKindsForUser(user.id);
      holdsExpected = memberships.some((m) => m.kind === expected);
    }
  }

  if (active === expected && holdsExpected) {
    return; // happy path
  }

  if (active === null && holdsExpected) {
    // First visit since cookie expired or new device. Set + allow.
    await bestEffortSetActiveKind(expected);
    return;
  }

  if (!holdsExpected) {
    // Brand-new user with no resolved kinds yet: investor is the implicit
    // default workspace (the post-login callback already routes 0-kind users
    // to /account, and RLS isolates all data by auth.uid()). Allow them into
    // the investor workspace instead of bouncing to an empty chooser (AJ-10).
    // Strictly scoped to "no kinds at all" — a user who holds other kinds but
    // not investor still goes to the chooser, preserving strict separation.
    if (expected === "investor" && memberships.length === 0) {
      await bestEffortSetActiveKind("investor");
      return;
    }
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
    case "startup": return "/startup-portal";
    case "org_admin": return "/org-portal";
    case "investor": return "/account";
  }
}
