import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("listings-crud");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
      .select("*")
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
      ...listing,
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
    const { id } = await params;
    const listingId = Number(id);

    if (!listingId || isNaN(listingId)) {
      return NextResponse.json(
        { error: "A valid listing ID is required." },
        { status: 400 },
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body." },
        { status: 400 },
      );
    }

    // Validate contact_email for ownership check
    const contactEmail =
      typeof body.contact_email === "string"
        ? body.contact_email.trim().toLowerCase()
        : null;

    if (!contactEmail || !EMAIL_REGEX.test(contactEmail)) {
      return NextResponse.json(
        { error: "A valid contact_email is required for verification." },
        { status: 400 },
      );
    }

    const admin = createAdminClient();

    // Fetch existing listing
    const { data: listing, error: fetchError } = await admin
      .from("investment_listings")
      .select("id, contact_email")
      .eq("id", listingId)
      .single();

    if (fetchError || !listing) {
      return NextResponse.json(
        { error: "Listing not found." },
        { status: 404 },
      );
    }

    // Ownership check
    if (listing.contact_email?.toLowerCase() !== contactEmail) {
      return NextResponse.json(
        { error: "You are not authorised to update this listing." },
        { status: 403 },
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

    const { data: updated, error: updateError } = await admin
      .from("investment_listings")
      .update(updates)
      .eq("id", listingId)
      .select("*")
      .single();

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
    const { id } = await params;
    const listingId = Number(id);

    if (!listingId || isNaN(listingId)) {
      return NextResponse.json(
        { error: "A valid listing ID is required." },
        { status: 400 },
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body." },
        { status: 400 },
      );
    }

    const contactEmail =
      typeof body.contact_email === "string"
        ? body.contact_email.trim().toLowerCase()
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

    if (fetchError || !listing) {
      return NextResponse.json(
        { error: "Listing not found." },
        { status: 404 },
      );
    }

    if (listing.contact_email?.toLowerCase() !== contactEmail) {
      return NextResponse.json(
        { error: "You are not authorised to delete this listing." },
        { status: 403 },
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
