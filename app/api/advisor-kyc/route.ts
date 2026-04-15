import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowed } from "@/lib/rate-limit-db";
import {
  recordKycUpload,
  listKycDocuments,
  isValidKycType,
  type KycDocumentType,
} from "@/lib/advisor-kyc";
import { logger } from "@/lib/logger";

const log = logger("api:advisor-kyc");

export const runtime = "nodejs";
export const maxDuration = 60;

const ALLOWED_MIMES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 10 * 1024 * 1024; // 10MB
const STORAGE_BUCKET = "advisor-kyc";

/**
 * Resolve the authenticated advisor from the `advisor_session`
 * cookie. Returns the professional row or null. This keeps KYC
 * uploads scoped to the logged-in advisor — nobody else can see
 * or write to another advisor's documents.
 */
async function getAdvisorFromSession(request: NextRequest) {
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
    .select("id, slug")
    .eq("id", session.professional_id)
    .single();
  return advisor;
}

/**
 * GET  /api/advisor-kyc — list the authenticated advisor's
 *                        KYC documents (status + history).
 * POST /api/advisor-kyc — multipart upload
 *                        fields: file, document_type, expires_at?
 */
export async function GET(request: NextRequest) {
  const advisor = await getAdvisorFromSession(request);
  if (!advisor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const items = await listKycDocuments(advisor.id);
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const advisor = await getAdvisorFromSession(request);
  if (!advisor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate-limit — advisors shouldn't be uploading more than a
  // handful of documents per hour; this caps runaway costs if
  // a script loops uploads.
  if (
    !(await isAllowed("advisor_kyc_upload", `a:${advisor.id}`, {
      max: 10,
      refillPerSec: 10 / 3600,
    }))
  ) {
    return NextResponse.json({ error: "Too many uploads" }, { status: 429 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const documentType = formData.get("document_type") as string | null;
  const expiresAt = formData.get("expires_at") as string | null;

  if (!file || !documentType) {
    return NextResponse.json(
      { error: "Missing file or document_type" },
      { status: 400 },
    );
  }
  if (!isValidKycType(documentType)) {
    return NextResponse.json({ error: "Invalid document_type" }, { status: 400 });
  }
  if (!ALLOWED_MIMES.includes(file.type)) {
    return NextResponse.json(
      { error: "Only PDF/JPG/PNG/WebP accepted" },
      { status: 400 },
    );
  }
  if (file.size <= 0 || file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "File must be 1B–10MB" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  // Build a deterministic storage path:
  //   advisor-kyc/{professional_id}/{timestamp}-{type}.{ext}
  const ext =
    file.type === "application/pdf"
      ? "pdf"
      : file.type === "image/webp"
        ? "webp"
        : file.type === "image/png"
          ? "png"
          : "jpg";
  const timestamp = Date.now();
  const safeName = (file.name || "document")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 120);
  const storagePath = `${advisor.id}/${timestamp}-${documentType}-${safeName}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error: uploadError } = await admin.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: false,
    });
  if (uploadError) {
    log.warn("kyc upload failed", { error: uploadError.message });
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }

  const record = await recordKycUpload({
    professionalId: advisor.id,
    documentType: documentType as KycDocumentType,
    storagePath,
    originalFilename: file.name || null,
    fileSizeBytes: file.size,
    mimeType: file.type,
    expiresAt: expiresAt || null,
  });

  if (!record.ok) {
    // Roll back the storage upload so we don't leak orphan files
    await admin.storage.from(STORAGE_BUCKET).remove([storagePath]);
    return NextResponse.json(
      { error: record.error || "Record failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    id: record.id,
    storage_path: storagePath,
  });
}
