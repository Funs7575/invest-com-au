import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ADMIN_EMAILS } from "@/lib/admin";
import { logger } from "@/lib/logger";

const ModerateBody = z.object({
  ids: z.array(z.number().int()).min(1),
  action: z.enum(["approve", "reject"]),
});

const log = logger("admin-advisor-moderation");

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

    const rawBody = await req.json();
    const parsed = ModerateBody.safeParse(rawBody);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const field = typeof issue?.path[0] === "string" ? issue.path[0] : "input";
      return NextResponse.json(
        { error: field === "action" ? "Action must be 'approve' or 'reject'" : "Missing or empty ids array" },
        { status: 400 }
      );
    }
    const { ids, action } = parsed.data;

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

    await supabase.from("admin_audit_log").insert({
      action: action === "approve" ? "professional:approved" : "professional:suspended",
      entity_type: "professional",
      admin_email: user.email ?? null,
      details: { ids, count: ids.length },
    });
    return NextResponse.json({
      success: true,
      message: `${ids.length} advisor(s) ${action === "approve" ? "approved" : "rejected"}`,
    });
  } catch (err) {
    log.error("Advisor moderation failed", { err: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
