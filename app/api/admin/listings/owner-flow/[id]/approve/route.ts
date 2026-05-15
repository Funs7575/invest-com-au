/**
 * POST /api/admin/listings/owner-flow/[id]/approve
 *
 * Admin moderation: flip a `pending_review` listing to `approved`. The
 * approveListing helper is idempotent at the "already approved" level so
 * double-clicks are safe.
 *
 * Rate-limiting: admin endpoints are exempt per
 * scripts/rate-limit-coverage.mjs — they live behind requireAdmin() +
 * audit log already.
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { approveListing } from "@/lib/listings/moderate";

const log = logger("api:admin:listings:approve");

export const runtime = "nodejs";

const ApproveBody = z.object({}).strict();

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  // Parse empty body — same defensive pattern as the submit route.
  let raw: unknown = {};
  try {
    const contentLength = req.headers.get("content-length");
    if (contentLength && contentLength !== "0") {
      raw = await req.json();
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = ApproveBody.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Approve takes no body fields." },
      { status: 400 },
    );
  }

  const { id } = await params;

  const result = await approveListing(id, guard.userId);
  if (!result.ok) {
    const status = result.error === "not_found" ? 404 : 500;
    if (status >= 500) {
      log.error("approveListing failed", { id, error: result.error });
    }
    return NextResponse.json({ error: result.error }, { status });
  }

  // Best-effort audit log entry — failures don't block the response.
  try {
    const admin = createAdminClient();
    await admin.from("admin_audit_log").insert({
      action: "listing:approved",
      entity_type: "listing",
      entity_id: id,
      entity_name: result.listing.slug,
      admin_email: guard.email,
      details: { no_op: result.noOp },
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
