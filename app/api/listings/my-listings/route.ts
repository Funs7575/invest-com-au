import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  verifyListingOwnerCookie,
  LISTING_OWNER_COOKIE_NAME,
} from "@/lib/listing-owner-cookie";
import { logger } from "@/lib/logger";

const log = logger("listings:my-listings");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const runtime = "nodejs";

/**
 * GET /api/listings/my-listings?email=...
 *
 * Returns the listings + grouped enquiries for the listing owner
 * identified by `email`. Authorisation is gated by the
 * `listing_owner_verified` HMAC-signed cookie issued by
 * /api/listings/my-listings/verify after the OTP challenge — see
 * REMEDIATION_QUEUE.md B-09a.
 *
 * Status codes:
 *   200 — verified; { listings, enquiries } returned
 *   400 — missing or invalid email param
 *   401 — no cookie / cookie does not match the requested email; the
 *         response body includes a `next` field pointing at
 *         /api/verify-otp/send so the frontend knows where to start
 *         the OTP flow
 *
 * The DB queries run under `createAdminClient()` (service-role).
 * After B-09b drops the "anon select enquiries" policy on
 * `listing_enquiries`, the anon key cannot read enquiries at all, so
 * service-role is the only path that returns rows. The cookie
 * (validated above the query) is the actual ownership check.
 */
export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get("email");

    if (!email || !EMAIL_REGEX.test(email.trim())) {
      return NextResponse.json(
        { error: "A valid email address is required." },
        { status: 400 },
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    const cookieValue = request.cookies.get(LISTING_OWNER_COOKIE_NAME)?.value;
    const verdict = verifyListingOwnerCookie(cookieValue, {
      expectedEmail: normalizedEmail,
    });

    if (!verdict.ok) {
      return NextResponse.json(
        {
          error: "Email verification required.",
          code: `cookie_${verdict.reason}`,
          next: "/api/verify-otp/send",
        },
        { status: 401 },
      );
    }

    const supabase = createAdminClient();

    // Fetch listings for this email (case-insensitive via ilike).
    const { data: listings, error: listingsError } = await supabase
      .from("investment_listings")
      .select(
        "id, title, slug, vertical, status, asking_price_cents, price_display, listing_type, views, enquiries, created_at, expires_at",
      )
      .ilike("contact_email", normalizedEmail)
      .order("created_at", { ascending: false });

    if (listingsError) {
      log.error("[my-listings] listings fetch error:", listingsError);
      return NextResponse.json(
        { error: "Failed to fetch listings." },
        { status: 500 },
      );
    }

    if (!listings || listings.length === 0) {
      return NextResponse.json({ listings: [], enquiries: {} });
    }

    // Fetch enquiries for all listing IDs.
    const listingIds = listings.map((l) => l.id);
    const { data: allEnquiries, error: enquiriesError } = await supabase
      .from("listing_enquiries")
      .select("id, listing_id, user_name, user_email, message, created_at")
      .in("listing_id", listingIds)
      .order("created_at", { ascending: false });

    if (enquiriesError) {
      log.error("[my-listings] enquiries fetch error:", enquiriesError);
      // Return listings without enquiries rather than failing entirely.
      return NextResponse.json({ listings, enquiries: {} });
    }

    // Group enquiries by listing_id.
    const enquiriesByListing: Record<number, typeof allEnquiries> = {};
    for (const enquiry of allEnquiries || []) {
      if (!enquiriesByListing[enquiry.listing_id]) {
        enquiriesByListing[enquiry.listing_id] = [];
      }
      enquiriesByListing[enquiry.listing_id]!.push(enquiry);
    }

    return NextResponse.json({
      listings,
      enquiries: enquiriesByListing,
    });
  } catch (err) {
    log.error("[my-listings] unexpected error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 },
    );
  }
}
