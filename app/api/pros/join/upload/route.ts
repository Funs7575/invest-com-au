/**
 * POST /api/pros/join/upload
 *
 * Pre-auth verification-doc upload for the /pros/join wizard. Stores the file
 * in the private `pro-verification-docs` bucket and returns the storage path
 * the client passes to /api/pros/join.
 *
 * Public (anon) so we deliberately:
 *   - Rate-limit per IP via isAllowed (DB-backed token bucket).
 *   - Cap file size / MIME tightly.
 *   - Use a random storage path (no PII in the path).
 *
 * The admin preview later in /admin/professionals/queue uses createSignedUrl
 * to expose the doc; the bucket itself denies anon reads.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";

const log = logger("api:pros-join-upload");

export const runtime = "nodejs";
export const maxDuration = 60;

const ALLOWED_MIMES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];
const MAX_BYTES = 10 * 1024 * 1024; // 10MB — matches bucket limit
const STORAGE_BUCKET = "pro-verification-docs";

export async function POST(request: NextRequest): Promise<NextResponse> {
  // IP rate-limit: 8 uploads / 15 min per IP. Wizard retries should fit
  // comfortably; scripted abuse won't.
  if (
    !(await isAllowed("pros_join_upload", ipKey(request), {
      max: 8,
      refillPerSec: 8 / 900,
    }))
  ) {
    return NextResponse.json(
      { error: "Too many uploads. Try again shortly." },
      { status: 429 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid multipart body" },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!ALLOWED_MIMES.includes(file.type)) {
    return NextResponse.json(
      {
        error:
          "Unsupported file type. Upload PDF, JPG, PNG, or WebP.",
      },
      { status: 400 },
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 10MB." },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();
  const ext =
    file.type === "application/pdf"
      ? "pdf"
      : file.type === "image/webp"
        ? "webp"
        : file.type === "image/png"
          ? "png"
          : "jpg";

  const timestamp = Date.now();
  const randomId = Math.random().toString(36).slice(2, 12);
  const storagePath = `pending/${timestamp}-${randomId}.${ext}`;

  let buffer: Buffer;
  try {
    buffer = Buffer.from(await file.arrayBuffer());
  } catch (err) {
    log.error("Failed to read uploaded file", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    log.error("Verification doc upload failed", { error: uploadError.message });
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }

  // Return only the storage path. The /pros/join POST passes it through; the
  // admin queue mints signed URLs on demand.
  return NextResponse.json({ storage_path: storagePath });
}
