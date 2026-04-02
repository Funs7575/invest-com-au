import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 60;

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

// Sort order helper: premium > featured > standard, then created_at DESC
// We use a CASE expression via .order() chaining
const LISTING_TYPE_ORDER: Record<string, number> = {
  premium: 0,
  featured: 1,
  standard: 2,
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const vertical = searchParams.get("vertical");
    const state = searchParams.get("state");
    const minPriceParam = searchParams.get("min_price");
    const maxPriceParam = searchParams.get("max_price");
    const firbEligible = searchParams.get("firb_eligible");
    const sivComplying = searchParams.get("siv_complying");
    const listingType = searchParams.get("listing_type");
    const limitParam = searchParams.get("limit");
    const offsetParam = searchParams.get("offset");

    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, parseInt(limitParam || String(DEFAULT_LIMIT), 10))
    );
    const offset = Math.max(0, parseInt(offsetParam || "0", 10));

    const supabase = await createClient();

    let query = supabase
      .from("investment_listings")
      .select("*", { count: "exact" })
      .eq("status", "active");

    if (vertical) {
      query = query.eq("vertical", vertical);
    }

    if (state) {
      query = query.eq("location_state", state);
    }

    if (minPriceParam) {
      const minPrice = parseInt(minPriceParam, 10);
      if (!isNaN(minPrice)) {
        query = query.gte("asking_price_cents", minPrice);
      }
    }

    if (maxPriceParam) {
      const maxPrice = parseInt(maxPriceParam, 10);
      if (!isNaN(maxPrice)) {
        query = query.lte("asking_price_cents", maxPrice);
      }
    }

    if (firbEligible === "true") {
      query = query.eq("firb_eligible", true);
    }

    if (sivComplying === "true") {
      query = query.eq("siv_complying", true);
    }

    if (listingType) {
      query = query.eq("listing_type", listingType);
    }

    // Sort: premium first, then featured, then standard; within each tier sort by created_at DESC.
    // Supabase doesn't support CASE ordering directly, so we use two chained .order() calls:
    // first by listing_type (alphabetical puts 'featured' < 'premium' < 'standard' so we
    // need a secondary approach). Instead we fetch with created_at and re-sort in JS for
    // the tier ordering, but to avoid loading full result sets we use a workaround:
    // We run three separate queries unioned in order of priority, limited to requested range.
    // For simplicity and performance on this dataset, we'll sort in-memory after fetching
    // all matching rows (with a practical upper bound of MAX_LIMIT * 3 rows prefetch).
    // For production scale, a DB-level sort_key column would be preferred.

    // Fetch all matching rows (up to MAX_LIMIT * 3 rows to cover pagination needs)
    const prefetchLimit = Math.min(offset + limit + MAX_LIMIT, 500);

    query = query
      .order("created_at", { ascending: false })
      .range(0, prefetchLimit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("[listings] query error:", error);
      return NextResponse.json(
        { error: "Failed to fetch listings." },
        { status: 500 }
      );
    }

    // Re-sort by listing_type tier, then preserve created_at DESC within tier
    const sorted = (data ?? []).sort(
      (
        a: { listing_type: string; created_at: string },
        b: { listing_type: string; created_at: string }
      ) => {
        const tierA = LISTING_TYPE_ORDER[a.listing_type] ?? 99;
        const tierB = LISTING_TYPE_ORDER[b.listing_type] ?? 99;
        if (tierA !== tierB) return tierA - tierB;
        // Within same tier, newest first
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      }
    );

    const paginated = sorted.slice(offset, offset + limit);

    return NextResponse.json({
      listings: paginated,
      total: count ?? sorted.length,
    });
  } catch (err) {
    console.error("[listings] unexpected error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
