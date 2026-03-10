import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { ADMIN_EMAILS } from "@/lib/admin";

/**
 * PATCH /api/admin/advisor-moderation
 *
 * Approve or reject pending advisor signups.
 * Body: { ids: number[], action: "approve" | "reject" }
 */
export async function PATCH(req: NextRequest) {
  try {
    // Auth check: require an authenticated admin user
    const supabaseAuth = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (
      authError ||
      !user ||
      !ADMIN_EMAILS.includes(user.email?.toLowerCase() || "")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { ids, action } = body as { ids?: number[]; action?: string };

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Missing or empty ids array" },
        { status: 400 }
      );
    }
    if (!action || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "Action must be 'approve' or 'reject'" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    if (action === "approve") {
      const { error } = await supabase
        .from("professionals")
        .update({ status: "active", verified: true, updated_at: new Date().toISOString() })
        .in("id", ids);

      if (error) {
        return NextResponse.json(
          { error: "Failed to approve advisors: " + error.message },
          { status: 500 }
        );
      }
    } else {
      const { error } = await supabase
        .from("professionals")
        .update({ status: "suspended", updated_at: new Date().toISOString() })
        .in("id", ids);

      if (error) {
        return NextResponse.json(
          { error: "Failed to reject advisors: " + error.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: `${ids.length} advisor(s) ${action === "approve" ? "approved" : "rejected"}`,
    });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
