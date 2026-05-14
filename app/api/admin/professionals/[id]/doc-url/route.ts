/**
 * GET /api/admin/professionals/[id]/doc-url
 *
 * Mints a short-lived (5 min) signed URL for the professional's verification
 * doc so the admin queue can preview it without exposing the storage bucket
 * publicly. Admin-only.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("api:admin:pros-doc-url");

export const runtime = "nodejs";

const SIGNED_URL_TTL_SECONDS = 5 * 60;
const STORAGE_BUCKET = "pro-verification-docs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  _request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { id: rawId } = await context.params;
  const id = Number.parseInt(rawId, 10);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: pro, error: fetchError } = await supabase
    .from("professionals")
    .select("verification_doc_url")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    log.error("Lookup failed", { id, error: fetchError.message });
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }
  if (!pro || !pro.verification_doc_url) {
    return NextResponse.json({ error: "No verification document" }, { status: 404 });
  }

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(pro.verification_doc_url, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    log.error("Signed URL mint failed", {
      id,
      error: error?.message,
      path: pro.verification_doc_url,
    });
    return NextResponse.json({ error: "Could not sign URL" }, { status: 500 });
  }

  return NextResponse.json({
    signed_url: data.signedUrl,
    expires_in_seconds: SIGNED_URL_TTL_SECONDS,
  });
}
