/**
 * POST /api/account/documents/upload
 *
 * Accepts a multipart upload of a sensitive financial document and stores it
 * in the private "user-documents" Supabase Storage bucket (AES-256 at rest).
 * Inserts a metadata row into user_documents via the user's JWT so RLS
 * enforces owner-only access.
 *
 * Rate-limited: 20 uploads / hour per user to prevent abuse.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAllowed } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";

const log = logger("api:account:documents:upload");

export const runtime = "nodejs";
export const maxDuration = 60;

const STORAGE_BUCKET = "user-documents";
const MAX_BYTES = 20 * 1024 * 1024; // 20 MB
const ALLOWED_MIMES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const ALLOWED_TYPES = ["super_statement", "tax_return", "will", "insurance_policy", "bank_statement", "other"] as const;

type DocumentType = (typeof ALLOWED_TYPES)[number];

function extForMime(mime: string): string {
  if (mime === "application/pdf") return "pdf";
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  return "webp";
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userRateLimitKey = `user:${user.id}`;
  if (!(await isAllowed("account_document_upload", userRateLimitKey, { max: 20, refillPerSec: 20 / 3600 }))) {
    return NextResponse.json({ error: "Upload limit reached. Try again later." }, { status: 429 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart body" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const documentType = formData.get("document_type") as string | null;
  if (!documentType || !(ALLOWED_TYPES as readonly string[]).includes(documentType)) {
    return NextResponse.json(
      { error: `document_type must be one of: ${ALLOWED_TYPES.join(", ")}` },
      { status: 400 },
    );
  }

  const description = (formData.get("description") as string | null) ?? null;
  if (description && description.length > 500) {
    return NextResponse.json({ error: "Description too long (max 500 chars)" }, { status: 400 });
  }

  if (!ALLOWED_MIMES.includes(file.type)) {
    return NextResponse.json(
      { error: "Unsupported file type. Upload PDF, JPG, PNG, or WebP." },
      { status: 400 },
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large. Maximum size is 20 MB." }, { status: 400 });
  }

  const docId = crypto.randomUUID();
  const ext = extForMime(file.type);
  // Strip path separators and any char outside [\w.-] (so "../" cannot survive),
  // then reject names that are empty or composed solely of dots (".", "..") —
  // a "../" or ".." path segment is malformed as a storage object key. The
  // {uid}/ prefix and the storage.objects RLS policy already pin the owner
  // folder, so this is defence-in-depth, not the primary IDOR guard.
  const sanitised = file.name.replace(/[^\w.\-]/g, "_").slice(0, 255);
  const safeFileName = !sanitised || /^\.+$/.test(sanitised) ? `document.${ext}` : sanitised;
  const storagePath = `${user.id}/${docId}/${safeFileName}`;

  let buffer: Buffer;
  try {
    buffer = Buffer.from(await file.arrayBuffer());
  } catch (err) {
    log.error("Failed to read upload buffer", { err: String(err) });
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }

  const { error: storageError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, buffer, { contentType: file.type, upsert: false });

  if (storageError) {
    log.error("Storage upload failed", { userId: user.id, error: storageError.message });
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }

  const { data: inserted, error: dbError } = await supabase
    .from("user_documents")
    .insert({
      id: docId,
      user_id: user.id,
      document_type: documentType as DocumentType,
      file_name: safeFileName,
      file_path: storagePath,
      file_size_bytes: file.size,
      mime_type: file.type,
      description: description || null,
    })
    .select("id")
    .single();

  if (dbError) {
    // Clean up orphaned storage file if DB insert fails
    await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
    log.error("DB insert failed after upload", { userId: user.id, error: dbError.message });
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }

  return NextResponse.json({ id: inserted.id }, { status: 201 });
}
