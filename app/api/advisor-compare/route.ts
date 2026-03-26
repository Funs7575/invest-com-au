import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 300;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slugs = searchParams.getAll("slugs").slice(0, 4); // max 4

  if (slugs.length === 0) {
    return NextResponse.json({ advisors: [] });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("professionals")
    .select(
      "id, slug, name, firm_name, type, photo_url, rating, review_count, verified, location_display, specialties, fee_structure, fee_description, hourly_rate_cents, flat_fee_cents, aum_percentage, initial_consultation_free, afsl_number, bio, booking_link",
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
