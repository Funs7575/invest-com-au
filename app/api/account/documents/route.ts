/**
 * GET /api/account/documents
 *
 * Lists the authenticated investor's document vault entries, each with a
 * short-lived signed URL for download. Documents are ordered newest-first.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

const log = logger("api:account:documents");

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STORAGE_BUCKET = "user-documents";
const SIGNED_URL_EXPIRY_SECONDS = 60 * 10; // 10 min

export async function GET(): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: rows, error } = await supabase
    .from("user_documents")
    .select("id, document_type, file_name, file_path, file_size_bytes, mime_type, description, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    log.error("Failed to fetch user documents", { userId: user.id, error: error.message });
    return NextResponse.json({ error: "Failed to load documents" }, { status: 500 });
  }

  const documents = await Promise.all(
    (rows ?? []).map(async (row) => {
      const { data: signed } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(row.file_path, SIGNED_URL_EXPIRY_SECONDS);
      return { ...row, download_url: signed?.signedUrl ?? null };
    }),
  );

  return NextResponse.json({ documents });
}
