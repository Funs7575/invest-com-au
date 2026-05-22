import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const log = logger("api:admin:startups:review");

/**
 * PATCH /api/admin/startups/[id]/review
 *
 * Body: { action: 'approve' | 'reject', notes?: string }
 *
 * approve → startup_profiles.status = 'active'
 * reject  → startup_profiles.status = 'rejected'
 *
 * Logs to admin_audit_log. Admin-only (requireAdmin + createAdminClient).
 * Rollback: UPDATE startup_profiles SET status='draft' WHERE id=<id>
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { id } = params;
  if (!id) return NextResponse.json({ error: "Missing startup id" }, { status: 400 });

  let body: Record<string, unknown>;
  try {
    // eslint-disable-next-line invest/no-unvalidated-req-json -- admin-only PATCH; body fields are validated inline below (action enum + notes string guard)
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = body.action;
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "action must be 'approve' or 'reject'" }, { status: 400 });
  }

  const notes = typeof body.notes === "string" ? body.notes.trim() : null;

  const supabase = createAdminClient();

  // Verify startup exists and is in reviewable state
  const { data: startup, error: fetchError } = await supabase
    .from("startup_profiles")
    .select("id, company_name, status, owner_user_id")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    log.warn("startup fetch failed", { id, error: fetchError.message });
    return NextResponse.json({ error: "Fetch failed" }, { status: 500 });
  }
  if (!startup) return NextResponse.json({ error: "Startup not found" }, { status: 404 });
  if (startup.status !== "draft") {
    return NextResponse.json(
      { error: `Startup is '${startup.status}', not 'draft'` },
      { status: 409 },
    );
  }

  const newStatus = action === "approve" ? "active" : "rejected";
  const { error: updateError } = await supabase
    .from("startup_profiles")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (updateError) {
    log.warn("startup review update failed", { id, error: updateError.message });
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  await supabase.from("admin_audit_log").insert({
    action: `startup:${action}d`,
    entity_type: "startup_profile",
    entity_id: id,
    entity_name: startup.company_name,
    admin_email: guard.email,
    details: { previous_status: "draft", new_status: newStatus, notes },
  });

  log.info("startup reviewed", { id, action, adminEmail: guard.email });
  return NextResponse.json({ ok: true, status: newStatus });
}
