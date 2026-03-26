import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function getFirmAdmin(request: NextRequest) {
  const sessionToken = request.cookies.get("advisor_session")?.value;
  if (!sessionToken) return null;

  const supabase = await createClient();
  const { data: session } = await supabase
    .from("advisor_sessions")
    .select("professional_id, expires_at")
    .eq("session_token", sessionToken)
    .single();

  if (!session || new Date(session.expires_at) < new Date()) return null;

  const { data: advisor } = await supabase
    .from("professionals")
    .select("id, name, firm_id, is_firm_admin")
    .eq("id", session.professional_id)
    .single();

  if (!advisor?.is_firm_admin || !advisor.firm_id) return null;
  return advisor;
}

// PATCH — update member role
export async function PATCH(request: NextRequest) {
  const admin = await getFirmAdmin(request);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: { memberId: number; role: string; is_firm_admin?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { memberId, role, is_firm_admin } = body;
  if (!memberId || !role) return NextResponse.json({ error: "memberId and role required" }, { status: 400 });

  const validRoles = ["owner", "manager", "member"];
  if (!validRoles.includes(role)) return NextResponse.json({ error: "Invalid role" }, { status: 400 });

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
    console.error("[firm/member] role update failed:", error);
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
    console.error("[firm/member] remove failed:", error);
    return NextResponse.json({ error: "Failed to remove member" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
