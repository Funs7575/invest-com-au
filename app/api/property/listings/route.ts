import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get("city");
    const type = searchParams.get("type");
    const priceMin = searchParams.get("price_min");
    const priceMax = searchParams.get("price_max");
    const firbApproved = searchParams.get("firb_approved");
    const offThePlan = searchParams.get("off_the_plan");
    const featured = searchParams.get("featured");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const perPage = 12;
    const offset = (page - 1) * perPage;

    const supabase = await createClient();

    let query = supabase
      .from("property_listings")
      .select("*, property_developers(name, logo_url, slug)", { count: "exact" })
      .in("status", ["active", "coming_soon"])
      .order("sponsored", { ascending: false })
      .order("featured", { ascending: false })
      .order("created_at", { ascending: false })
      .range(offset, offset + perPage - 1);

    if (city && city !== "All") query = query.eq("city", city);
    if (type && type !== "All") query = query.eq("property_type", type);
    if (priceMin) query = query.gte("price_from_cents", parseInt(priceMin, 10));
    if (priceMax) query = query.lte("price_from_cents", parseInt(priceMax, 10));
    if (firbApproved === "true") query = query.eq("firb_approved", true);
    if (offThePlan === "true") query = query.eq("off_the_plan", true);
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
