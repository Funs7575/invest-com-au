import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get("email");

    if (!email || !EMAIL_REGEX.test(email.trim())) {
      return NextResponse.json(
        { error: "A valid email address is required." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const supabase = await createClient();

    // Fetch listings for this email (case-insensitive via ilike)
    const { data: listings, error: listingsError } = await supabase
      .from("investment_listings")
      .select(
        "id, title, slug, vertical, status, asking_price_cents, price_display, listing_type, views, enquiries, created_at, expires_at"
      )
      .ilike("contact_email", normalizedEmail)
      .order("created_at", { ascending: false });

    if (listingsError) {
      console.error("[my-listings] listings fetch error:", listingsError);
      return NextResponse.json(
        { error: "Failed to fetch listings." },
        { status: 500 }
      );
    }

    if (!listings || listings.length === 0) {
      return NextResponse.json({ listings: [], enquiries: {} });
    }

    // Fetch enquiries for all listing IDs
    const listingIds = listings.map((l) => l.id);
    const { data: allEnquiries, error: enquiriesError } = await supabase
      .from("listing_enquiries")
      .select(
        "id, listing_id, user_name, user_email, message, created_at"
      )
      .in("listing_id", listingIds)
      .order("created_at", { ascending: false });

    if (enquiriesError) {
      console.error("[my-listings] enquiries fetch error:", enquiriesError);
      // Return listings without enquiries rather than failing entirely
      return NextResponse.json({ listings, enquiries: {} });
    }

    // Group enquiries by listing_id
    const enquiriesByListing: Record<number, typeof allEnquiries> = {};
    for (const enquiry of allEnquiries || []) {
      if (!enquiriesByListing[enquiry.listing_id]) {
        enquiriesByListing[enquiry.listing_id] = [];
      }
      enquiriesByListing[enquiry.listing_id].push(enquiry);
    }

    return NextResponse.json({
      listings,
      enquiries: enquiriesByListing,
    });
  } catch (err) {
    console.error("[my-listings] unexpected error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
