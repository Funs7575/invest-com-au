/**
 * Shared admin-guard wrapper for API routes.
 *
 * Every /api/admin/** route previously copy-pasted the same 6 lines:
 *
 *     const supabase = await createClient();
 *     const { data: { user } } = await supabase.auth.getUser();
 *     if (!user || !user.email) return 401;
 *     if (!getAdminEmails().includes(user.email.toLowerCase())) return 403;
 *
 * When someone forgets to do it, the route silently leaks admin
 * privileges. This helper exports one function to call at the top of
 * every admin route and one test-discoverable marker so CI can grep
 * for routes that never call it.
 *
 * Usage:
 *
 *     export async function POST(req: NextRequest) {
 *       const guard = await requireAdmin();
 *       if (!guard.ok) return guard.response;
 *       const { email } = guard;
 *       // ... admin-only logic ...
 *     }
 *
 * The guard object exposes the admin's email so the route doesn't
 * have to re-fetch user info.
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getAdminEmails } from "@/lib/admin";
import { verifyMfaCookie, MFA_COOKIE_NAME } from "@/lib/admin-mfa-cookie";

export interface AdminGuardOk {
  ok: true;
  email: string;
  userId: string;
}
export interface AdminGuardDeny {
  ok: false;
  response: NextResponse;
}
export type AdminGuardResult = AdminGuardOk | AdminGuardDeny;

export interface RequireAdminOptions {
  /**
   * When false, skips the MFA step-up cookie check. ONLY the MFA
   * enroll/verify routes may set this — they are how an admin obtains
   * the `admin_mfa_verified` cookie, so requiring it there is a
   * permanent lockout. Everything else must keep the default (true).
   */
  requireMfa?: boolean;
}

/**
 * Whether the MFA step-up gate is active. Mirrors proxy.ts's /admin
 * page-gate logic exactly so the API gate and the page gate switch on
 * together: enforce when the signing secret is configured, and always
 * in production (fail-closed — matches the page gate, which redirects
 * every request to /admin/mfa/verify when the secret is missing in
 * prod). In dev/test without the secret, the gate is off.
 */
function mfaEnforced(): boolean {
  const secret = process.env.ADMIN_MFA_COOKIE_SECRET;
  const secretSet = !!secret && secret.length >= 32;
  return secretSet || process.env.NODE_ENV === "production";
}

export async function requireAdmin(
  options: RequireAdminOptions = {},
): Promise<AdminGuardResult> {
  const { requireMfa = true } = options;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  const allowed = getAdminEmails();
  if (!allowed.includes(user.email.toLowerCase())) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  // ── MFA step-up gate (parity with proxy.ts's /admin page gate) ──
  // proxy.ts only gates admin *pages*; without this, a session that
  // cleared password auth but never passed MFA could call destructive
  // /api/admin/* routes directly. Enforced under the same env conditions
  // as the page gate. The MFA enroll/verify routes pass requireMfa:false
  // (they establish the cookie).
  if (requireMfa && mfaEnforced()) {
    const cookieStore = await cookies();
    const mfa = verifyMfaCookie(cookieStore.get(MFA_COOKIE_NAME)?.value);
    if (!mfa.ok) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "MFA verification required", code: "mfa_required" },
          { status: 403 },
        ),
      };
    }
  }

  return { ok: true, email: user.email, userId: user.id };
}
