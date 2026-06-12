import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { isRateLimited } from "@/lib/rate-limit";
import { buildSoldUpdates, isMissingSoldColumnsError } from "@/lib/listings/sold-archive";
import { timingSafeEqual } from "crypto";

const log = logger("listings-crud");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// contact_email must be a string (the EMAIL_REGEX guard below enforces
// format, matching the prior `typeof body.contact_email === "string"`
// check). `.passthrough()` keeps the UPDATABLE_FIELDS the loop reads off the
// body — they're typed/whitelisted there, not here.
const BodySchema = z.object({ contact_email: z.string() }).passthrough();

/**
 * Constant-time email comparison. Prevents timing-channel enumeration where
 * an attacker can distinguish "wrong email for this listing" from "no such
 * listing" by measuring response latency.
 */
function emailsMatch(a: string | null | undefined, b: string): boolean {
  if (!a) return false;
  const aBuf = Buffer.from(a.toLowerCase());
  const bBuf = Buffer.from(b.toLowerCase());
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

// Explicit public projection for the anonymous GET. The previous `select("*")`
// leaked owner contact details (contact_email, contact_phone) and the internal
// moderation trail (auto_classified_*, admin_overridden_*) to any unauthenticated
// caller. This route has no authenticated/owner consumer — owner edit/read flows
// go through /api/listings/my-listings* — so every column safe to expose to an
// anonymous visitor is enumerated here. Add new public columns deliberately;
// do NOT re-introduce `*`.
const PUBLIC_GET_COLUMNS = [
  "id",
  "vertical",
  "title",
  "slug",
  "description",
  "location_state",
  "location_city",
  "asking_price_cents",
  "price_display",
  "annual_revenue_cents",
  "annual_profit_cents",
  "industry",
  "sub_category",
  "key_metrics",
  "images",
  "listing_type",
  "listing_kind",
  "firb_eligible",
  "siv_complying",
  "listed_by_professional_id",
  "external_url",
  "status",
  "expires_at",
  "views",
  "enquiries",
  "created_at",
  "updated_at",
].join(", ");

const UPDATABLE_FIELDS = [
  "title",
  "description",
  "location_state",
  "location_city",
  "price_display",
  "industry",
  "firb_eligible",
  "siv_complying",
  "status",
  "listing_type",
] as const;

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/listings/[id]
 * Fetch a single listing by ID, including its enquiries count.
 */
export async function GET(
  _request: NextRequest,
  { params }: Params,
) {
  try {
    const { id } = await params;
    const listingId = Number(id);

    if (!listingId || isNaN(listingId)) {
      return NextResponse.json(
        { error: "A valid listing ID is required." },
        { status: 400 },
      );
    }

    const admin = createAdminClient();

    const { data: listing, error } = await admin
      .from("investment_listings")
      .select(PUBLIC_GET_COLUMNS)
      .eq("id", listingId)
      .single();

    if (error || !listing) {
      return NextResponse.json(
        { error: "Listing not found." },
        { status: 404 },
      );
    }

    // Get enquiries count
    const { count } = await admin
      .from("listing_enquiries")
      .select("id", { count: "exact", head: true })
      .eq("listing_id", listingId);

    return NextResponse.json({
      ...(listing as unknown as Record<string, unknown>),
      enquiries_count: count ?? 0,
    });
  } catch (err) {
    log.error("GET listing error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/listings/[id]
 * Update a listing. Requires contact_email in the body for ownership verification.
 */
export async function PUT(
  request: NextRequest,
  { params }: Params,
) {
  try {
    // Rate limit the ownership-verification surface. Without this, the
    // contact_email-based ownership check is brute-forceable: an attacker
    // with a known listing ID can try candidate emails until one succeeds.
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (await isRateLimited(`listing-edit:${ip}`, 5, 60)) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        { status: 429 },
      );
    }

    const { id } = await params;
    const listingId = Number(id);

    if (!listingId || isNaN(listingId)) {
      return NextResponse.json(
        { error: "A valid listing ID is required." },
        { status: 400 },
      );
    }

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body." },
        { status: 400 },
      );
    }

    // Validate contact_email for ownership check
    const parsed = BodySchema.safeParse(raw);
    const contactEmail = parsed.success
      ? parsed.data.contact_email.trim().toLowerCase()
      : null;

    if (!parsed.success || !contactEmail || !EMAIL_REGEX.test(contactEmail)) {
      return NextResponse.json(
        { error: "A valid contact_email is required for verification." },
        { status: 400 },
      );
    }

    const body = parsed.data;

    const admin = createAdminClient();

    // Fetch existing listing
    const { data: listing, error: fetchError } = await admin
      .from("investment_listings")
      .select("id, contact_email")
      .eq("id", listingId)
      .single();

    // Merge the "not found" and "wrong email" failure cases behind a single
    // generic 404 with an identical latency profile. Previously the route
    // returned distinct 404 and 403 responses which leaked whether a given
    // email matched a given listing — an enumeration oracle.
    const ownershipOk = listing && emailsMatch(listing.contact_email, contactEmail);
    if (fetchError || !ownershipOk) {
      log.warn("Listing edit denied", { listingId, ip });
      return NextResponse.json(
        { error: "Listing not found or not accessible with those credentials." },
        { status: 404 },
      );
    }

    // Build update payload from allowed fields only
    const updates: Record<string, unknown> = {};
    for (const field of UPDATABLE_FIELDS) {
      if (field in body && body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields provided to update." },
        { status: 400 },
      );
    }

    // Sold transition: stamp the archive columns (sold_at + optional
    // disclosed price). Pre-migration environments retry status-only.
    let soldExtras: Record<string, unknown> = {};
    if (updates.status === "sold") {
      const rawPrice = (body as Record<string, unknown>)["sold_price_cents"];
      const priceNum = typeof rawPrice === "number" ? rawPrice : Number(rawPrice);
      const { status: _status, ...extras } = buildSoldUpdates(
        rawPrice == null ? null : priceNum,
      );
      soldExtras = extras;
    }

    let { data: updated, error: updateError } = await admin
      .from("investment_listings")
      .update({ ...updates, ...soldExtras })
      .eq("id", listingId)
      .select("*")
      .single();

    if (updateError && Object.keys(soldExtras).length > 0 && isMissingSoldColumnsError(updateError.message)) {
      ({ data: updated, error: updateError } = await admin
        .from("investment_listings")
        .update(updates)
        .eq("id", listingId)
        .select("*")
        .single());
    }

    if (updateError) {
      log.error("PUT listing update error", { error: updateError.message });
      return NextResponse.json(
        { error: "Failed to update listing. Please try again." },
        { status: 500 },
      );
    }

    return NextResponse.json(updated);
  } catch (err) {
    log.error("PUT listing error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/listings/[id]
 * Soft-delete a listing by setting status to "inactive".
 * Requires contact_email in the body for ownership verification.
 */
export async function DELETE(
  request: NextRequest,
  { params }: Params,
) {
  try {
    // Same rate limit + unified-error defense as PUT. See notes there.
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (await isRateLimited(`listing-edit:${ip}`, 5, 60)) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        { status: 429 },
      );
    }

    const { id } = await params;
    const listingId = Number(id);

    if (!listingId || isNaN(listingId)) {
      return NextResponse.json(
        { error: "A valid listing ID is required." },
        { status: 400 },
      );
    }

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body." },
        { status: 400 },
      );
    }

    const parsed = BodySchema.safeParse(raw);
    const contactEmail = parsed.success
      ? parsed.data.contact_email.trim().toLowerCase()
      : null;

    if (!contactEmail || !EMAIL_REGEX.test(contactEmail)) {
      return NextResponse.json(
        { error: "A valid contact_email is required for verification." },
        { status: 400 },
      );
    }

    const admin = createAdminClient();

    const { data: listing, error: fetchError } = await admin
      .from("investment_listings")
      .select("id, contact_email")
      .eq("id", listingId)
      .single();

    const ownershipOk = listing && emailsMatch(listing.contact_email, contactEmail);
    if (fetchError || !ownershipOk) {
      log.warn("Listing delete denied", { listingId, ip });
      return NextResponse.json(
        { error: "Listing not found or not accessible with those credentials." },
        { status: 404 },
      );
    }

    const { error: updateError } = await admin
      .from("investment_listings")
      .update({ status: "inactive" })
      .eq("id", listingId);

    if (updateError) {
      log.error("DELETE listing soft-delete error", {
        error: updateError.message,
      });
      return NextResponse.json(
        { error: "Failed to delete listing. Please try again." },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    log.error("DELETE listing error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 },
    );
  }
}
