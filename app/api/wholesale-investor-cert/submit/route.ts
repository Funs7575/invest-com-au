import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAllowed } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";

const log = logger("api:wholesale-investor-cert:submit");

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const STORAGE_BUCKET = "wholesale-certs";
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIMES = ["application/pdf", "image/jpeg", "image/png"] as const;
const CERT_TYPES = ["s708_sophisticated", "professional_investor"] as const;
type CertType = (typeof CERT_TYPES)[number];

// s708 certifications have a 6-month statutory expiry per practice
const CERT_EXPIRY_MONTHS = 6;

function extForMime(mime: string): string {
  if (mime === "application/pdf") return "pdf";
  if (mime === "image/jpeg") return "jpg";
  return "png";
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 3 submissions per hour — cert is a rare, intentional action
  if (!(await isAllowed("wholesale_cert_submit", `user:${user.id}`, { max: 3, refillPerSec: 3 / 3600 }))) {
    return NextResponse.json({ error: "Too many submissions. Try again later." }, { status: 429 });
  }

  // Guard: prevent duplicate submission while a cert is already pending or verified
  const { data: existing } = await supabase
    .from("wholesale_investor_certifications")
    .select("id, status, expires_at")
    .eq("user_id", user.id)
    .in("status", ["pending", "verified"])
    .maybeSingle();

  if (existing) {
    if (existing.status === "verified") {
      const expiresAt = new Date(existing.expires_at);
      if (expiresAt > new Date()) {
        return NextResponse.json(
          { error: "You already have an active certification.", certId: existing.id },
          { status: 409 },
        );
      }
      // Verified but expired — allow re-submission
    } else {
      // pending
      return NextResponse.json(
        { error: "A certification is already under review.", certId: existing.id },
        { status: 409 },
      );
    }
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart body" }, { status: 400 });
  }

  const certType = formData.get("certification_type") as string | null;
  if (!certType || !(CERT_TYPES as readonly string[]).includes(certType)) {
    return NextResponse.json(
      { error: `certification_type must be one of: ${CERT_TYPES.join(", ")}` },
      { status: 400 },
    );
  }

  const file = formData.get("evidence_doc");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "evidence_doc file is required" }, { status: 400 });
  }

  if (!(ALLOWED_MIMES as readonly string[]).includes(file.type)) {
    return NextResponse.json({ error: "Upload PDF, JPG, or PNG." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 10 MB)." }, { status: 400 });
  }

  const certId = crypto.randomUUID();
  const ext = extForMime(file.type);
  const safeFilename = file.name.replace(/[^\w.\-]/g, "_").slice(0, 200) || `cert.${ext}`;
  const storagePath = `${user.id}/${certId}/${safeFilename}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: storageErr } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, buffer, { contentType: file.type, upsert: false });

  if (storageErr) {
    log.error("Storage upload failed", { userId: user.id, error: storageErr.message });
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }

  // expires_at is set to 6 months from now as the statutory maximum;
  // the admin verify route overwrites this with the exact approval date + 6 months
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + CERT_EXPIRY_MONTHS);

  const { data: inserted, error: dbErr } = await supabase
    .from("wholesale_investor_certifications")
    .insert({
      id: certId,
      user_id: user.id,
      certification_type: certType as CertType,
      evidence_doc_path: storagePath,
      status: "pending",
      expires_at: expiresAt.toISOString(),
    })
    .select("id")
    .single();

  if (dbErr) {
    await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
    log.error("DB insert failed after upload", { userId: user.id, error: dbErr.message });
    return NextResponse.json({ error: "Submission failed" }, { status: 500 });
  }

  log.info("Wholesale cert submitted", { userId: user.id, certId, certType });
  return NextResponse.json({ certId: inserted.id, status: "pending" }, { status: 201 });
}
