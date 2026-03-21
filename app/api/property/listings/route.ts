import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get("city");
    const type = searchParams.get("type");
    const priceMin = searchParams.get("price_min");
    const priceMax = searchParams.get("price_max");
    const bedsMin = searchParams.get("beds_min");
    const firbApproved = searchParams.get("firb_approved");
    const offThePlan = searchParams.get("off_the_plan");
    const newDevelopment = searchParams.get("new_development");
    const foreignBuyer = searchParams.get("foreign_buyer_eligible");
    const featured = searchParams.get("featured");
    const sort = searchParams.get("sort") || "default";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const perPage = 12;
    const offset = (page - 1) * perPage;

    const supabase = await createClient();

    let query = supabase
      .from("property_listings")
      .select("*, property_developers(name, logo_url, slug)", { count: "exact" })
      .in("status", ["active", "coming_soon"])
      .range(offset, offset + perPage - 1);

    // Sorting — sponsored always floats to top, then sort by chosen key
    if (sort === "price_asc") {
      query = query
        .order("sponsored", { ascending: false })
        .order("price_from_cents", { ascending: true });
    } else if (sort === "price_desc") {
      query = query
        .order("sponsored", { ascending: false })
        .order("price_from_cents", { ascending: false });
    } else if (sort === "yield_desc") {
      query = query
        .order("sponsored", { ascending: false })
        .order("rental_yield_estimate", { ascending: false, nullsFirst: false });
    } else {
      // default: newest
      query = query
        .order("sponsored", { ascending: false })
        .order("featured", { ascending: false })
        .order("created_at", { ascending: false });
    }

    // Filters
    if (city && city !== "All") query = query.eq("city", city);
    if (type && type !== "All") query = query.eq("property_type", type);
    if (priceMin) query = query.gte("price_from_cents", parseInt(priceMin, 10));
    if (priceMax) query = query.lte("price_from_cents", parseInt(priceMax, 10));
    if (bedsMin && bedsMin !== "0") query = query.gte("bedrooms_min", parseInt(bedsMin, 10));
    if (firbApproved === "true") query = query.eq("firb_approved", true);
    if (offThePlan === "true") query = query.eq("off_the_plan", true);
    if (newDevelopment === "true") query = query.eq("new_development", true);
    if (foreignBuyer === "true") query = query.eq("foreign_buyer_eligible", true);
    if (featured === "true") query = query.eq("featured", true);

    const { data, count, error } = await query;

    if (error) {
      console.error("Listings query error:", error);
      return NextResponse.json({ error: "Failed to fetch listings" }, { status: 500 });
    }

    return NextResponse.json({
      listings: data || [],
      total: count || 0,
      page,
      per_page: perPage,
      total_pages: Math.ceil((count || 0) / perPage),
    });
  } catch (error) {
    console.error("Listings API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
