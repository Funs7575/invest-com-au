import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowed } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";

const log = logger("api:startups:esic-verify");

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const STORAGE_BUCKET = "esic-evidence";
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIMES = ["application/pdf", "image/jpeg", "image/png"] as const;

// POST — founder submits ESIC verification request
export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Rate limit: 3 per hour — ESIC submission is a deliberate one-time action
  if (!(await isAllowed("esic_submit", `user:${user.id}`, { max: 3, refillPerSec: 3 / 3600 }))) {
    return NextResponse.json({ error: "Too many submissions. Try again later." }, { status: 429 });
  }

  // Resolve startup_id from owner's profile
  const { data: profile } = await supabase
    .from("startup_profiles")
    .select("id, esic_verified_at")
    .eq("owner_user_id", user.id)
    .in("status", ["active", "draft"])
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ error: "Startup profile not found" }, { status: 404 });
  }

  if (profile.esic_verified_at) {
    return NextResponse.json({ error: "ESIC verification already approved for this startup" }, { status: 409 });
  }

  // Prevent duplicate pending submission
  const { data: existing } = await supabase
    .from("esic_verifications")
    .select("id, outcome")
    .eq("startup_id", profile.id)
    .eq("outcome", "pending")
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "A verification request is already pending review.", verificationId: existing.id },
      { status: 409 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart body" }, { status: 400 });
  }

  const evidenceFile = formData.get("evidence_doc");
  // ato_register_check_json is optional — allows text-based ATO register lookup info
  const atoRegisterCheckRaw = formData.get("ato_register_check") as string | null;
  let atoRegisterCheck: Record<string, string> = {};
  if (atoRegisterCheckRaw) {
    try {
      atoRegisterCheck = JSON.parse(atoRegisterCheckRaw) as Record<string, string>;
    } catch {
      return NextResponse.json({ error: "ato_register_check must be valid JSON if provided" }, { status: 400 });
    }
  }

  if (!(evidenceFile instanceof File) && Object.keys(atoRegisterCheck).length === 0) {
    return NextResponse.json(
      { error: "Provide either an evidence_doc file or ato_register_check JSON fields" },
      { status: 400 },
    );
  }

  let storagePath = "";

  if (evidenceFile instanceof File) {
    if (!(ALLOWED_MIMES as readonly string[]).includes(evidenceFile.type)) {
      return NextResponse.json({ error: "Upload PDF, JPG, or PNG." }, { status: 400 });
    }
    if (evidenceFile.size > MAX_BYTES) {
      return NextResponse.json({ error: "File too large (max 10 MB)." }, { status: 400 });
    }

    const evidenceId = crypto.randomUUID();
    const ext = evidenceFile.type === "application/pdf" ? "pdf" : evidenceFile.type === "image/jpeg" ? "jpg" : "png";
    const safeFilename = evidenceFile.name.replace(/[^\w.\-]/g, "_").slice(0, 200) || `evidence.${ext}`;
    storagePath = `${profile.id}/${evidenceId}/${safeFilename}`;

    const buffer = Buffer.from(await evidenceFile.arrayBuffer());
    const { error: storageErr } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, buffer, { contentType: evidenceFile.type, upsert: false });

    if (storageErr) {
      log.error("ESIC evidence upload failed", { startupId: profile.id, error: storageErr.message });
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }
  } else {
    // No file — text-only ATO register check; use placeholder path
    storagePath = `${profile.id}/text-only`;
  }

  const { data: inserted, error: dbErr } = await supabase
    .from("esic_verifications")
    .insert({
      startup_id: profile.id,
      evidence_doc_path: storagePath,
      ato_register_check: atoRegisterCheck,
      outcome: "pending",
    })
    .select("id")
    .single();

  if (dbErr) {
    if (storagePath && !storagePath.endsWith("text-only")) {
      await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
    }
    log.error("ESIC verification DB insert failed", { startupId: profile.id, error: dbErr.message });
    return NextResponse.json({ error: "Submission failed" }, { status: 500 });
  }

  log.info("ESIC verification submitted", { startupId: profile.id, verificationId: inserted.id });
  return NextResponse.json({ verificationId: inserted.id, outcome: "pending" }, { status: 201 });
}

// PATCH — admin approves or rejects a pending ESIC verification
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  let body: {
    verificationId: string;
    action: "approve" | "reject";
    notes?: string;
  };
  try {
    // eslint-disable-next-line invest/no-unvalidated-req-json -- admin-only PATCH; fields validated inline (verificationId + action enum)
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { verificationId, action, notes } = body;
  if (!verificationId || !action || !["approve", "reject"].includes(action)) {
    return NextResponse.json(
      { error: "verificationId and action ('approve'|'reject') are required" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  const { data: verification } = await admin
    .from("esic_verifications")
    .select("id, startup_id, outcome")
    .eq("id", verificationId)
    .single();

  if (!verification) {
    return NextResponse.json({ error: "Verification not found" }, { status: 404 });
  }
  if (verification.outcome !== "pending") {
    return NextResponse.json(
      { error: `Verification outcome is already '${verification.outcome}'` },
      { status: 409 },
    );
  }

  const now = new Date().toISOString();

  const { error: updateErr } = await admin
    .from("esic_verifications")
    .update({
      outcome: action === "approve" ? "approved" : "rejected",
      reviewed_at: now,
      notes: notes ?? null,
    })
    .eq("id", verificationId);

  if (updateErr) {
    log.error("ESIC verification update failed", { verificationId, error: updateErr.message });
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  // On approval: stamp esic_verified_at on the startup profile so the badge renders
  if (action === "approve") {
    const { error: profileErr } = await admin
      .from("startup_profiles")
      .update({
        esic_verified_at: now,
        esic_verified_by: guard.email ?? "admin",
      })
      .eq("id", verification.startup_id);

    if (profileErr) {
      log.warn("Failed to stamp esic_verified_at on startup_profiles", {
        startupId: verification.startup_id,
        error: profileErr.message,
      });
    }
  }

  await admin.from("admin_audit_log").insert({
    action: `esic_verification:${action === "approve" ? "approved" : "rejected"}`,
    entity_type: "esic_verification",
    entity_id: verificationId,
    entity_name: verification.startup_id,
    admin_email: guard.email ?? null,
    details: { startup_id: verification.startup_id, notes: notes ?? null },
  });

  log.info("ESIC verification reviewed", { verificationId, action, adminEmail: guard.email });
  return NextResponse.json({ success: true, outcome: action === "approve" ? "approved" : "rejected" });
}
