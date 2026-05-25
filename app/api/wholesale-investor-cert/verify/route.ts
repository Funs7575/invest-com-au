import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/require-admin";
import { logger } from "@/lib/logger";

const log = logger("api:wholesale-investor-cert:verify");

export const dynamic = "force-dynamic";

const CERT_EXPIRY_MONTHS = 6;

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  let body: { certId: string; action: "approve" | "reject"; rejectionReason?: string };
  try {
    // eslint-disable-next-line invest/no-unvalidated-req-json -- admin-only PATCH; fields validated inline (certId + action enum)
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { certId, action, rejectionReason } = body;
  if (!certId || !action || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "certId and action ('approve'|'reject') are required" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: cert } = await admin
    .from("wholesale_investor_certifications")
    .select("id, user_id, status, certification_type")
    .eq("id", certId)
    .single();

  if (!cert) {
    return NextResponse.json({ error: "Certification not found" }, { status: 404 });
  }
  if (cert.status !== "pending") {
    return NextResponse.json(
      { error: `Certification is already '${cert.status}' — cannot review again` },
      { status: 409 },
    );
  }

  const now = new Date();

  if (action === "reject") {
    const { error } = await admin
      .from("wholesale_investor_certifications")
      .update({
        status: "rejected",
        verified_at: now.toISOString(),
        verified_by: guard.email ?? "admin",
      })
      .eq("id", certId);

    if (error) {
      log.error("Cert rejection failed", { certId, error: error.message });
      return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }

    await admin.from("admin_audit_log").insert({
      action: "wholesale_cert:rejected",
      entity_type: "wholesale_investor_certification",
      entity_id: certId,
      entity_name: cert.certification_type,
      admin_email: guard.email ?? null,
      details: { user_id: cert.user_id, rejection_reason: rejectionReason ?? null },
    });

    log.info("Wholesale cert rejected", { certId, adminEmail: guard.email });
    return NextResponse.json({ success: true, status: "rejected" });
  }

  // APPROVE: set verified_at to now, expires_at to 6 months from now (statutory max for s708)
  const expiresAt = new Date(now);
  expiresAt.setMonth(expiresAt.getMonth() + CERT_EXPIRY_MONTHS);

  const { error } = await admin
    .from("wholesale_investor_certifications")
    .update({
      status: "verified",
      verified_at: now.toISOString(),
      verified_by: guard.email ?? "admin",
      expires_at: expiresAt.toISOString(),
    })
    .eq("id", certId);

  if (error) {
    log.error("Cert approval failed", { certId, error: error.message });
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  await admin.from("admin_audit_log").insert({
    action: "wholesale_cert:approved",
    entity_type: "wholesale_investor_certification",
    entity_id: certId,
    entity_name: cert.certification_type,
    admin_email: guard.email ?? null,
    details: {
      user_id: cert.user_id,
      expires_at: expiresAt.toISOString(),
    },
  });

  log.info("Wholesale cert approved", { certId, adminEmail: guard.email, expiresAt: expiresAt.toISOString() });
  return NextResponse.json({ success: true, status: "verified", expiresAt: expiresAt.toISOString() });
}
