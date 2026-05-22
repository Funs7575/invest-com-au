import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireOrgSession, getOrgSession } from "@/lib/require-org-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("org-auth:session");

/**
 * GET /api/org-auth/session
 *
 * Returns the authenticated org and the caller's role within it.
 */
export async function GET() {
  try {
    const session = await requireOrgSession();
    const admin = createAdminClient();

    const { data: org, error } = await admin
      .from("organisations")
      .select("*")
      .eq("id", session.organisationId)
      .single();

    if (error || !org) {
      log.error("Failed to fetch org row", { organisationId: session.organisationId, error });
      return NextResponse.json({ error: "Organisation not found" }, { status: 404 });
    }

    return NextResponse.json({ org, role: session.role });
  } catch (err) {
    if (err instanceof Response) return err;
    log.error("GET /api/org-auth/session error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/org-auth/session
 *
 * Signs the user out of Supabase Auth. Returns { success: true } even on error
 * so the client can safely clear local state.
 */
export async function DELETE() {
  try {
    await getOrgSession(); // non-throwing — just used to confirm there's something to sign out
    const supabase = await createClient();
    await supabase.auth.signOut();
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: true });
  }
}
