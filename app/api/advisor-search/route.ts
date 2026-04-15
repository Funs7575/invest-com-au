import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isRateLimited } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const log = logger("advisor-search");

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
        log.error("[advisor-search] RPC error:", error);
        return NextResponse.json({ error: "Search failed." }, { status: 500 });
      }

      advisors = data ?? [];
      total = advisors.length;
    } else {
      // Standard Supabase query
      let query = supabase
        .from("professionals")
        .select("id, slug, name, firm_name, type, specialties, location_state, location_suburb, location_display, location_postcode, photo_url, fee_structure, fee_description, hourly_rate_cents, flat_fee_cents, aum_percentage, initial_consultation_free, rating, review_count, verified, offer_text, offer_active, created_at, avg_response_minutes, total_leads, featured_until, account_type", { count: "exact" })
        .eq("status", "active");

      if (type) query = query.eq("type", type);
      if (state) query = query.eq("location_state", state);
      if (feeStructure) query = query.eq("fee_structure", feeStructure);
      if (specialty) query = query.contains("specialties", [specialty]);
      if (verified === "true") query = query.eq("verified", true);
      if (q) {
        const term = `%${q}%`;
        query = query.or(`name.ilike.${term},firm_name.ilike.${term},location_display.ilike.${term},location_suburb.ilike.${term}`);
      }

      // For "relevance" sort, fetch more and re-rank client-side with composite score.
      // For all other sorts, use DB ordering.
      const useRelevanceSort = sort === "relevance";

      if (!useRelevanceSort) {
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
      } else {
        // Fetch all matching, score and paginate in JS
        query = query.order("rating", { ascending: false, nullsFirst: false });
      }

      const { data, error, count } = await query;
      if (error) {
        log.error("[advisor-search] query error:", error);
        return NextResponse.json({ error: "Search failed." }, { status: 500 });
      }

      if (useRelevanceSort && data) {
        // Composite relevance scoring:
        // - Rating weight: 35%
        // - Review volume: 15%  (capped at 20 reviews = 1.0)
        // - Response speed: 20% (< 2hrs = 1.0, < 12hrs = 0.7, < 24hrs = 0.4, else 0.1)
        // - Verified: 15%
        // - Featured: 10%
        // - Has leads (active advisor): 5%
        const scored = data.map((a: Record<string, unknown>) => {
          const rating = (a.rating as number) || 0;
          const reviews = (a.review_count as number) || 0;
          const avgResp = a.avg_response_minutes as number | null;
          const isVerified = a.verified as boolean;
          const isFeatured = a.featured_until && new Date(a.featured_until as string) > new Date();
          const hasLeads = ((a.total_leads as number) || 0) > 0;

          const ratingScore = rating / 5;
          const reviewScore = Math.min(reviews / 20, 1);
          let responseScore = 0.1;
          if (avgResp !== null && avgResp !== undefined) {
            if (avgResp <= 120) responseScore = 1.0;
            else if (avgResp <= 720) responseScore = 0.7;
            else if (avgResp <= 1440) responseScore = 0.4;
            else responseScore = 0.15;
          }

          const composite =
            ratingScore * 0.35 +
            reviewScore * 0.15 +
            responseScore * 0.20 +
            (isVerified ? 0.15 : 0) +
            (isFeatured ? 0.10 : 0) +
            (hasLeads ? 0.05 : 0);

          return { ...a, _relevance: composite };
        });

        scored.sort((a: { _relevance: number }, b: { _relevance: number }) => b._relevance - a._relevance);
        advisors = scored.slice(offset, offset + limit);
      } else {
        advisors = data ?? [];
      }
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
    log.error("[advisor-search] error:", err);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
