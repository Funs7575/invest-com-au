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
import { createClient } from "@/lib/supabase/server";
import { getAdminEmails } from "@/lib/admin";

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

export async function requireAdmin(): Promise<AdminGuardResult> {
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
  return { ok: true, email: user.email, userId: user.id };
}
