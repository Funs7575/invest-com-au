import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { logger } from "@/lib/logger";

const log = logger("advisor-auth:firm:member");

// Mirrors the existing guards: memberId + role required, role restricted to
// the same three values, is_firm_admin an optional boolean.
const PatchBody = z.object({
  memberId: z.number(),
  role: z.enum(["owner", "manager", "member"]),
  is_firm_admin: z.boolean().optional(),
});

async function getFirmAdmin(request: NextRequest) {
  const advisorId = await requireAdvisorSession(request);
  if (!advisorId) return null;

  const admin = createAdminClient();
  const { data: advisor } = await admin
    .from("professionals")
    .select("id, name, firm_id, is_firm_admin")
    .eq("id", advisorId)
    .single();

  if (!advisor?.is_firm_admin || !advisor.firm_id) return null;
  return advisor;
}

// PATCH — update member role
export async function PATCH(request: NextRequest) {
  const admin = await getFirmAdmin(request);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = PatchBody.safeParse(rawBody);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const isRoleIssue = issue?.path[0] === "role" && issue.code !== "invalid_type";
    return NextResponse.json(
      { error: isRoleIssue ? "Invalid role" : "memberId and role required" },
      { status: 400 },
    );
  }
  const { memberId, role, is_firm_admin } = parsed.data;

  const supabase = createAdminClient();

  // Ensure the member is in the same firm
  const { data: member } = await supabase
    .from("professionals")
    .select("id, is_firm_admin")
    .eq("id", memberId)
    .eq("firm_id", admin.firm_id)
    .single();

  if (!member) return NextResponse.json({ error: "Member not found in your firm" }, { status: 404 });

  // Cannot change own role to non-admin unless someone else is owner
  if (memberId === admin.id && role !== "owner") {
    // Check if there's another owner
    const { count: ownerCount } = await supabase
      .from("professionals")
      .select("id", { count: "exact", head: true })
      .eq("firm_id", admin.firm_id)
      .eq("is_firm_admin", true)
      .neq("id", admin.id);
    if (!ownerCount || ownerCount === 0) {
      return NextResponse.json({ error: "Cannot remove your own admin role — assign another owner first" }, { status: 400 });
    }
  }

  const updates: Record<string, unknown> = { role };
  // Promote/demote firm admin based on role
  if (is_firm_admin !== undefined) {
    updates.is_firm_admin = is_firm_admin;
  } else {
    updates.is_firm_admin = role === "owner" || role === "manager";
  }

  const { error } = await supabase
    .from("professionals")
    .update(updates)
    .eq("id", memberId);

  if (error) {
    log.error("[firm/member] role update failed:", error);
    return NextResponse.json({ error: "Failed to update role" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// DELETE — remove a team member from the firm
export async function DELETE(request: NextRequest) {
  const admin = await getFirmAdmin(request);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const memberId = Number(request.nextUrl.searchParams.get("memberId"));
  if (!memberId) return NextResponse.json({ error: "memberId required" }, { status: 400 });

  // Cannot remove yourself
  if (memberId === admin.id) {
    return NextResponse.json({ error: "You cannot remove yourself from the firm" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Ensure the member is in the same firm
  const { data: member } = await supabase
    .from("professionals")
    .select("id, name")
    .eq("id", memberId)
    .eq("firm_id", admin.firm_id)
    .single();

  if (!member) return NextResponse.json({ error: "Member not found in your firm" }, { status: 404 });

  // Detach from firm (don't delete the professional record)
  const { error } = await supabase
    .from("professionals")
    .update({ firm_id: null, is_firm_admin: false, account_type: "individual", role: null })
    .eq("id", memberId);

  if (error) {
    log.error("[firm/member] remove failed:", error);
    return NextResponse.json({ error: "Failed to remove member" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
