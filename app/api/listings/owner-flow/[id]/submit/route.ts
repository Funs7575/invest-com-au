/**
 * POST /api/listings/owner-flow/[id]/submit
 *
 * Owner-initiated lifecycle flip: draft → pending_review. The admin queue
 * at /admin/listings/moderation picks up rows from here. Idempotent —
 * already-pending submissions return ok:true with noOp:true.
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { submitListingForReview } from "@/lib/listings/moderate";

const log = logger("listings:owner-flow:submit");

export const runtime = "nodejs";

// Schema is empty (no body required), but we still parse so the validation
// helper can return a consistent 400 if a caller sends garbage.
const SubmitBody = z.object({}).strict();

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  if (
    !(await isAllowed("listings_owner_submit", ipKey(req), {
      max: 5,
      refillPerSec: 5 / 60,
    }))
  ) {
    return NextResponse.json(
      { error: "Too many submissions. Please try again later." },
      { status: 429 },
    );
  }

  const { id } = await params;

  // Body is optional but if present must be an empty object.
  let raw: unknown = {};
  try {
    const contentLength = req.headers.get("content-length");
    if (contentLength && contentLength !== "0") {
      raw = await req.json();
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = SubmitBody.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Submit takes no body fields." },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await submitListingForReview(id, user.id);
  if (!result.ok) {
    const status =
      result.error === "not_found"
        ? 404
        : result.error === "forbidden"
          ? 403
          : result.error.startsWith("cannot_submit_from_")
            ? 409
            : 500;
    if (status >= 500) {
      log.error("submitListingForReview failed", {
        id,
        error: result.error,
      });
    }
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({
    ok: true,
    noOp: result.noOp,
    status: result.listing.status,
  });
}
