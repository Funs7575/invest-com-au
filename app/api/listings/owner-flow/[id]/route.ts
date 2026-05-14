/**
 * PATCH /api/listings/owner-flow/[id]
 *
 * Update a draft listing — owner-scoped. Only fields supplied in the body
 * are mutated; anything else is left alone. Submissions to pending_review
 * go through the dedicated `/submit` route so we can stamp lifecycle audit
 * fields without callers being able to flip `status` directly.
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { LISTING_KINDS, rowToListing, type ListingRow } from "@/lib/listings/types";

const log = logger("listings:owner-flow:update");

export const runtime = "nodejs";

const UpdateListingBody = z
  .object({
    title: z.string().min(3).max(180).optional(),
    kind: z.enum(LISTING_KINDS as [string, ...string[]]).optional(),
    asking_price_cents: z.number().int().nonnegative().nullable().optional(),
    currency: z.string().length(3).optional(),
    location_state: z.string().max(80).nullable().optional(),
    description: z.string().max(8000).nullable().optional(),
    payload: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  if (
    !(await isAllowed("listings_owner_update", ipKey(req), {
      max: 30,
      refillPerSec: 30 / 60,
    }))
  ) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 },
    );
  }

  const { id } = await params;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = UpdateListingBody.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Invalid request body";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  const body = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: existing, error: fetchError } = await admin
    .from("listings")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    log.error("listing fetch failed", { id, error: fetchError.message });
    return NextResponse.json({ error: "Lookup failed." }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (existing.owner_user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  if (existing.status !== "draft") {
    return NextResponse.json(
      { error: "Only draft listings can be edited." },
      { status: 409 },
    );
  }

  const update: Record<string, unknown> = {};
  if (body.title !== undefined) update.title = body.title.trim();
  if (body.kind !== undefined) update.kind = body.kind;
  if (body.asking_price_cents !== undefined)
    update.asking_price_cents = body.asking_price_cents;
  if (body.currency !== undefined) update.currency = body.currency.toUpperCase();
  if (body.location_state !== undefined) update.location_state = body.location_state;
  if (body.description !== undefined) update.description = body.description;
  if (body.payload !== undefined) update.payload = body.payload;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No fields to update." }, { status: 400 });
  }
  update.updated_at = new Date().toISOString();

  const { data: updated, error: updateError } = await admin
    .from("listings")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();

  if (updateError || !updated) {
    log.error("listing update failed", {
      id,
      error: updateError?.message,
    });
    return NextResponse.json({ error: "Update failed." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    listing: rowToListing(updated as ListingRow),
  });
}
