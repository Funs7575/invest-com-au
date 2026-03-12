import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isRateLimited } from "@/lib/rate-limit";

export const revalidate = 300;

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;
const DEFAULT_RADIUS = 25;

export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
    if (await isRateLimited(`advisor-search:${ip}`, 30, 1)) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT), 10)));
    const offset = (page - 1) * limit;

    const latParam = searchParams.get("lat");
    const lngParam = searchParams.get("lng");
    const lat = latParam ? parseFloat(latParam) : null;
    const lng = lngParam ? parseFloat(lngParam) : null;
    const radius = parseInt(searchParams.get("radius") || String(DEFAULT_RADIUS), 10);

    const type = searchParams.get("type");
    const state = searchParams.get("state");
    const feeStructure = searchParams.get("fee_structure");
    const specialty = searchParams.get("specialty");
    const verified = searchParams.get("verified");
    const q = searchParams.get("q");
    const sort = searchParams.get("sort") || "rating";
    const includeStats = searchParams.get("include_stats") === "true";

    const supabase = await createClient();

    let advisors: unknown[] = [];
    let total = 0;

    if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
      // Distance-based search via PostGIS RPC
      const { data, error } = await supabase.rpc("search_advisors_nearby", {
        p_lat: lat,
        p_lng: lng,
        p_radius_km: radius,
        p_type: type || null,
        p_fee_structure: feeStructure || null,
        p_specialty: specialty || null,
        p_limit: limit,
        p_offset: offset,
      });

      if (error) {
        console.error("[advisor-search] RPC error:", error);
        return NextResponse.json({ error: "Search failed." }, { status: 500 });
      }

      advisors = data ?? [];
      total = advisors.length;
    } else {
      // Standard Supabase query
      let query = supabase
        .from("professionals")
        .select("id, slug, name, firm_name, type, specialties, location_state, location_suburb, location_display, location_postcode, photo_url, fee_structure, fee_description, hourly_rate_cents, flat_fee_cents, aum_percentage, initial_consultation_free, rating, review_count, verified, offer_text, offer_active, created_at", { count: "exact" })
        .eq("status", "active");

      if (type) query = query.eq("type", type);
      if (state) query = query.eq("location_state", state);
      if (feeStructure) query = query.eq("fee_structure", feeStructure);
      if (specialty) query = query.contains("specialties", [specialty]);
      if (verified === "true") query = query.eq("verified", true);
      if (q) {
        // Sanitize search input: strip Supabase filter syntax characters to prevent filter injection
        const sanitized = q.replace(/[%_.,()"'\\]/g, "");
        if (sanitized.length > 0) {
          const term = `%${sanitized}%`;
          query = query.or(`name.ilike.${term},firm_name.ilike.${term},location_display.ilike.${term},location_suburb.ilike.${term}`);
        }
      }

      switch (sort) {
        case "rating": query = query.order("rating", { ascending: false, nullsFirst: false }); break;
        case "reviews": query = query.order("review_count", { ascending: false, nullsFirst: false }); break;
        case "name": query = query.order("name", { ascending: true }); break;
        case "newest": query = query.order("created_at", { ascending: false }); break;
        case "fee_low": query = query.order("hourly_rate_cents", { ascending: true, nullsFirst: false }); break;
        case "fee_high": query = query.order("hourly_rate_cents", { ascending: false, nullsFirst: false }); break;
        default: query = query.order("rating", { ascending: false, nullsFirst: false });
      }

      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;
      if (error) {
        console.error("[advisor-search] query error:", error);
        return NextResponse.json({ error: "Search failed." }, { status: 500 });
      }

      advisors = data ?? [];
      total = count ?? advisors.length;
    }

    const response: Record<string, unknown> = {
      advisors,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };

    if (includeStats) {
      const { data: feeStats } = await supabase.rpc("advisor_fee_stats");
      if (feeStats) response.feeStats = feeStats;
    }

    return NextResponse.json(response);
  } catch (err) {
    console.error("[advisor-search] error:", err);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
