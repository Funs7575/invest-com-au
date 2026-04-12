import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminEmails } from "@/lib/admin";
import { logger } from "@/lib/logger";

const log = logger("admin-verify");

/**
 * GET /api/admin/verify
 * Checks if the current authenticated user is an admin.
 * Returns 200 if admin, 401 if not authenticated, 403 if not admin.
 * Used by the AdminAuthGuard client component.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ admin: false }, { status: 401 });
    }

    const adminEmails = getAdminEmails();
    if (!adminEmails.includes(user.email?.toLowerCase() || "")) {
      return NextResponse.json({ admin: false, email: user.email }, { status: 403 });
    }

    return NextResponse.json({ admin: true, email: user.email });
  } catch (err) {
    log.error("Admin verify failed", { err: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ admin: false }, { status: 500 });
  }
}
