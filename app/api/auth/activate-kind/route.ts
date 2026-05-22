import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { isWorkspaceKind, setActiveKind } from "@/lib/account-kinds";

/**
 * Sets the iv_active_kind cookie and redirects back to the requested portal.
 *
 * Called from enforcePortalKind when a user has a valid Supabase session and
 * holds the expected workspace kind, but the cookie isn't set yet (e.g. after
 * password login, which skips the magic-link auth/callback route that normally
 * sets the cookie). Cookies can only be set in Route Handlers or Server
 * Actions — not during Server Component render — so the layout redirects here
 * rather than calling setActiveKind() directly.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const kind = searchParams.get("kind");
  const next = searchParams.get("next") ?? "/account";

  const safeNext =
    next.startsWith("/") && !next.startsWith("//") ? next : "/account";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      new URL(`/auth/login?next=${encodeURIComponent(safeNext)}`, origin),
    );
  }

  if (kind && isWorkspaceKind(kind)) {
    await setActiveKind(kind);
  }

  return NextResponse.redirect(new URL(safeNext, origin));
}
