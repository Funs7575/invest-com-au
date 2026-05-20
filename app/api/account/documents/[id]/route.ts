/**
 * DELETE /api/account/documents/[id]
 *
 * Removes a document from the vault: deletes the storage file and the
 * metadata row. RLS on user_documents ensures the authenticated user can
 * only delete their own rows (the storage delete is validated against the
 * file_path stored in the DB row, so no path guessing is possible).
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

const log = logger("api:account:documents:delete");

export const runtime = "nodejs";

const STORAGE_BUCKET = "user-documents";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch row first (RLS ensures this only returns the user's own rows)
  const { data: doc, error: fetchError } = await supabase
    .from("user_documents")
    .select("id, file_path")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    log.error("Failed to fetch document for delete", { userId: user.id, id, error: fetchError.message });
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
  }

  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  // Delete storage file
  const { error: storageError } = await supabase.storage.from(STORAGE_BUCKET).remove([doc.file_path]);
  if (storageError) {
    log.error("Storage delete failed", { userId: user.id, id, error: storageError.message });
    // Proceed to DB delete anyway — orphaned storage files are less bad than orphaned DB rows
  }

  const { error: dbError } = await supabase.from("user_documents").delete().eq("id", id);
  if (dbError) {
    log.error("DB delete failed", { userId: user.id, id, error: dbError.message });
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
