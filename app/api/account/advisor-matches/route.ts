import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getInvestorProfile } from "@/lib/investor-profiles";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const log = logger("api:account:advisor-matches");

/**
 * Budget band → max min_investment_cents the user can tolerate.
 * null means no upper-bound filter (either no data or large enough to
 * afford anything).
 */
const BUDGET_MAX: Record<string, number | null> = {
  small: 500_000,       // $5K — only show advisors with no or low minimums
  medium: 5_000_000,    // $50K
  large: 10_000_000,    // $100K
  whale: null,          // no upper-bound
};

export type MatchedAdvisorSummary = {
  id: number;
  slug: string;
  name: string;
  type: string;
  firm_name: string | null;
  location_display: string | null;
  photo_url: string | null;
  rating: number | null;
  review_count: number | null;
  verified: boolean | null;
  match_reason: string;
};

export type AdvisorMatchesResponse = {
  advisors: MatchedAdvisorSummary[];
  match_basis: string;
};

/**
 * GET /api/account/advisor-matches
 *
 * Returns up to 6 advisors ranked by relevance to the logged-in user's
 * investor profile. The matching is deterministic and profile-driven:
 * no real-time ML, just a priority chain of flag checks → Supabase
 * query → rating sort. Suitable for caching at the CDN layer once the
 * profile is stable (not yet — using force-dynamic in callers).
 *
 * Callers: /account/dashboard RSC (shows top 3), future /find-advisor
 * "based on your profile" banner.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const profile = await getInvestorProfile(user.id);

    // Build filter based on profile flags (priority chain — first match wins)
    let typeFilter: string | null = null;
    let specialtyFilter: string | null = null;
    let internationalFilter: boolean | null = null;
    let matchBasis = "Top-rated financial advisors";

    if (profile?.isFhb) {
      typeFilter = "mortgage_broker";
      matchBasis = "First home buyer specialists";
    } else if (profile?.isPreRetiree) {
      specialtyFilter = "retirement_planning";
      matchBasis = "Retirement planning specialists";
    } else if (profile?.isHnw) {
      specialtyFilter = "investment_advice";
      matchBasis = "High-net-worth wealth specialists";
    } else if (profile?.isBusinessOwner) {
      specialtyFilter = "business_advisory";
      matchBasis = "Business advisory specialists";
    } else if (profile?.isCrossBorder) {
      internationalFilter = true;
      matchBasis = "International investor specialists";
    } else if (profile?.primaryVertical) {
      // Map primary_vertical to advisor type where a clear mapping exists
      const verticalToType: Record<string, string> = {
        brokers: "stockbroker",
        property: "buyer_agent",
        super: "financial_advisor",
        etfs: "financial_advisor",
        crypto: "financial_advisor",
        insurance: "insurance_advisor",
      };
      typeFilter = verticalToType[profile.primaryVertical] ?? "financial_advisor";
      matchBasis = "Based on your investment focus";
    }

    const budgetMax =
      profile?.budgetBand ? (BUDGET_MAX[profile.budgetBand] ?? null) : null;

    // Build query
    let query = supabase
      .from("professionals")
      .select(
        "id, slug, name, type, firm_name, location_display, photo_url, rating, review_count, verified, min_investment_cents",
      )
      .eq("status", "active")
      .eq("accepts_new_clients", true)
      .order("rating", { ascending: false, nullsFirst: false })
      .limit(6);

    if (typeFilter) query = query.eq("type", typeFilter);
    if (specialtyFilter) query = query.contains("specialties", [specialtyFilter]);
    if (internationalFilter) query = query.eq("accepts_international", true);

    // Budget gate: if a min_investment is set on the advisor, it must be
    // within what the user's budget band indicates they can afford.
    if (budgetMax !== null) {
      query = query.or(`min_investment_cents.is.null,min_investment_cents.lte.${budgetMax}`);
    }

    const { data, error } = await query;

    if (error) {
      log.error("advisor-matches query failed", { error: error.message });
      return NextResponse.json({ error: "query failed" }, { status: 500 });
    }

    const advisors: MatchedAdvisorSummary[] = (data ?? []).map((row) => ({
      id: row.id as number,
      slug: row.slug as string,
      name: row.name as string,
      type: row.type as string,
      firm_name: row.firm_name as string | null,
      location_display: row.location_display as string | null,
      photo_url: row.photo_url as string | null,
      rating: row.rating as number | null,
      review_count: row.review_count as number | null,
      verified: row.verified as boolean | null,
      match_reason: matchBasis,
    }));

    return NextResponse.json({ advisors, match_basis: matchBasis } satisfies AdvisorMatchesResponse);
  } catch (err) {
    log.error("advisor-matches unexpected error", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
