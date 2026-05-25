import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 300;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slugs = searchParams.getAll("slugs").slice(0, 3); // max 3

  if (slugs.length === 0) {
    return NextResponse.json({ advisors: [] });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("professionals")
    .select(
      // Core identity
      "id, slug, name, firm_name, type, photo_url, location_display, " +
      // Rating & reviews
      "rating, review_count, " +
      // Credentials & verification
      "verified, afsl_number, registration_number, verified_at, " +
      // Specialties
      "specialties, " +
      // Fee model
      "fee_structure, fee_description, hourly_rate_cents, flat_fee_cents, aum_percentage, initial_consultation_free, " +
      // Availability & booking
      "accepts_new_clients, booking_link, " +
      // Meeting methods
      "meeting_types, " +
      // Languages
      "languages, " +
      // Trust Score inputs — transparency & track record
      "created_at, years_experience, bio, qualifications, education, memberships, linkedin_url, website, " +
      // Additional (legacy fields kept for backwards-compat)
      "accepts_international_clients, firb_specialist",
    )
    .in("slug", slugs)
    .eq("status", "active");

  if (error) {
    return NextResponse.json({ error: "Failed to fetch advisors" }, { status: 500 });
  }

  // Return in the same order as requested
  const ordered = slugs
    .map((slug) => (data || []).find((a) => a.slug === slug))
    .filter(Boolean);

  return NextResponse.json({ advisors: ordered });
}
