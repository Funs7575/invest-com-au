/**
 * POST /api/admin/listings/owner-flow/[id]/reject
 *
 * Admin moderation: flip a `pending_review` listing to `rejected` with a
 * non-empty notes field. Idempotent at the "already rejected with the
 * same notes" level — repeat rejects with different notes update the
 * notes and re-stamp `rejected_at`.
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { rejectListing } from "@/lib/listings/moderate";

const log = logger("api:admin:listings:reject");

export const runtime = "nodejs";

const RejectBody = z
  .object({
    notes: z.string().min(1).max(2000),
  })
  .strict();

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = RejectBody.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Invalid request body";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { id } = await params;

  const result = await rejectListing(id, guard.userId, parsed.data.notes);
  if (!result.ok) {
    const status =
      result.error === "not_found"
        ? 404
        : result.error === "notes_required"
          ? 400
          : 500;
    if (status >= 500) {
      log.error("rejectListing failed", { id, error: result.error });
    }
    return NextResponse.json({ error: result.error }, { status });
  }

  try {
    const admin = createAdminClient();
    await admin.from("admin_audit_log").insert({
      action: "listing:rejected",
      entity_type: "listing",
      entity_id: id,
      entity_name: result.listing.slug,
      admin_email: guard.email,
      details: { no_op: result.noOp, notes: parsed.data.notes.slice(0, 500) },
    });
  } catch (err) {
    log.warn("audit log insert failed", {
      id,
      err: err instanceof Error ? err.message : String(err),
    });
  }

  return NextResponse.json({
    ok: true,
    noOp: result.noOp,
    listing: result.listing,
  });
}
