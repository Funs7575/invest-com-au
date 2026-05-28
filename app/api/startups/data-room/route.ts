import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireStartupSession } from "@/lib/require-startup-session";
import { isAllowed } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";

const log = logger("startups-data-room");

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const STORAGE_BUCKET = "startup-data-room";
const MAX_BYTES = 50 * 1024 * 1024;
const ALLOWED_MIMES = ["application/pdf", "image/jpeg", "image/png", "image/webp"] as const;
const CATEGORIES = ["pitch_deck", "financials", "cap_table", "legal", "product_demo", "other"] as const;
type Category = (typeof CATEGORIES)[number];

function extForMime(mime: string): string {
  if (mime === "application/pdf") return "pdf";
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  return "webp";
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const startupId = await requireStartupSession(request);
  if (!startupId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();
  const { data: files, error } = await supabase
    .from("startup_data_room_files")
    .select("id, filename, category, requires_wholesale_cert, round_id, uploaded_at, storage_path")
    .eq("startup_id", startupId)
    .order("uploaded_at", { ascending: false });

  if (error) {
    log.error("Failed to list data room files", { startupId, error: error.message });
    return NextResponse.json({ error: "Failed to load files" }, { status: 500 });
  }

  const storagePaths = (files ?? []).map((f) => f.storage_path);
  const fileIds = (files ?? []).map((f) => f.id);

  const [{ data: signedUrls }, { data: grantRows }] = await Promise.all([
    storagePaths.length
      ? supabase.storage.from(STORAGE_BUCKET).createSignedUrls(storagePaths, 300)
      : Promise.resolve({ data: [] }),
    fileIds.length
      ? supabase.from("startup_data_room_access").select("file_id").in("file_id", fileIds).is("revoked_at", null)
      : Promise.resolve({ data: [] }),
  ]);

  const urlMap = new Map((signedUrls ?? []).map((s) => [s.path, s.signedUrl]));
  const grantMap = new Map<string, number>();
  for (const g of grantRows ?? []) {
    grantMap.set(g.file_id, (grantMap.get(g.file_id) ?? 0) + 1);
  }

  const filesWithMeta = (files ?? []).map((f) => ({
    ...f,
    download_url: urlMap.get(f.storage_path) ?? null,
    active_grants: grantMap.get(f.id) ?? 0,
  }));

  return NextResponse.json({ files: filesWithMeta });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const startupId = await requireStartupSession(request);
  if (!startupId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!(await isAllowed("startup_dr_upload", `startup:${startupId}`, { max: 10, refillPerSec: 10 / 3600 }))) {
    return NextResponse.json({ error: "Upload limit reached. Try again later." }, { status: 429 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart body" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const category = formData.get("category") as string | null;
  if (!category || !(CATEGORIES as readonly string[]).includes(category)) {
    return NextResponse.json({ error: `category must be one of: ${CATEGORIES.join(", ")}` }, { status: 400 });
  }

  const requiresWholesaleCert = formData.get("requires_wholesale_cert") !== "false";

  if (!(ALLOWED_MIMES as readonly string[]).includes(file.type)) {
    return NextResponse.json({ error: "Upload PDF, JPG, PNG, or WebP." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 50 MB)." }, { status: 400 });
  }

  const fileId = crypto.randomUUID();
  const ext = extForMime(file.type);
  const safeFilename = file.name.replace(/[^\w.\-]/g, "_").slice(0, 200) || `document.${ext}`;
  const storagePath = `${startupId}/${fileId}/${safeFilename}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const supabase = await createClient();
  const { error: storageErr } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, buffer, { contentType: file.type, upsert: false });

  if (storageErr) {
    log.error("Storage upload failed", { startupId, error: storageErr.message });
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }

  const { data: inserted, error: dbErr } = await supabase
    .from("startup_data_room_files")
    .insert({
      id: fileId,
      startup_id: startupId,
      filename: safeFilename,
      storage_path: storagePath,
      category: category as Category,
      requires_wholesale_cert: requiresWholesaleCert,
    })
    .select("id")
    .single();

  if (dbErr) {
    await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
    log.error("DB insert failed after upload", { startupId, error: dbErr.message });
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }

  return NextResponse.json({ id: inserted.id }, { status: 201 });
}
