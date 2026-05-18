/**
 * Server-side context loader for /invest.
 *
 * One round trip on the SSR pass to gather:
 *   - `advisorOptInCounts`  — { [listing_id]: count } of distinct
 *     advisor types that have opted in to support a listing. Drives
 *     the "X advisors can assess this" badge on cards.
 *   - `claimedSlugs`        — Set<string> of slugs that have an
 *     approved listing_claims row. Drives the "Are you the owner?"
 *     badge on the inverse set (unclaimed listings).
 *   - `investorProfile`     — InvestorProfileSnapshot for the
 *     logged-in user (or null). Drives the smart-match score.
 *   - `isListingOwner`      — boolean. True when the logged-in user
 *     has a row in listing_owner_accounts. Drives the "My listings"
 *     nav surface on /invest.
 *
 * Failure-tolerant: every fetch is wrapped so the page renders even
 * if one of the satellite tables is unreachable.
 */

import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import type { InvestorProfileSnapshot } from "@/lib/listing-match";

const log = logger("invest-page-context");

export interface InvestPageContext {
  advisorOptInCounts: Record<number, number>;
  claimedSlugs: Set<string>;
  investorProfile: InvestorProfileSnapshot | null;
  isListingOwner: boolean;
  /** Logged-in user id, when present. Used for downstream sync hooks. */
  userId: string | null;
}

export async function loadInvestPageContext(listingIds: number[], listingSlugs: string[]): Promise<InvestPageContext> {
  const empty: InvestPageContext = {
    advisorOptInCounts: {},
    claimedSlugs: new Set(),
    investorProfile: null,
    isListingOwner: false,
    userId: null,
  };

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const [optInRes, claimedRes, profileRes, ownerRes] = await Promise.all([
      // Advisor opt-ins — distinct advisor_types per listing
      listingIds.length > 0
        ? supabase
            .from("listing_advisor_opt_ins")
            .select("investment_listing_id, advisor_type")
            .in("investment_listing_id", listingIds)
            .in("status", ["pending", "matched", "contacted"])
        : { data: [], error: null },
      // Approved claims (only show "Are you the owner?" on the inverse)
      listingSlugs.length > 0
        ? supabase
            .from("listing_claims")
            .select("target_slug")
            .in("target_slug", listingSlugs)
            .eq("status", "approved")
        : { data: [], error: null },
      // Investor profile (logged-in only)
      user
        ? supabase
            .from("investor_profiles")
            .select("is_fhb,is_pre_retiree,is_business_owner,is_cross_border,is_hnw,intent_country_snapshot,budget_band,experience_level,primary_vertical")
            .eq("auth_user_id", user.id)
            .maybeSingle()
        : { data: null, error: null },
      // Listing-owner status (logged-in only)
      user
        ? supabase
            .from("listing_owner_accounts")
            .select("id")
            .eq("auth_user_id", user.id)
            .eq("status", "active")
            .maybeSingle()
        : { data: null, error: null },
    ]);

    if (optInRes.error) log.warn("opt-ins fetch failed", { error: optInRes.error.message });
    if (claimedRes.error) log.warn("claims fetch failed", { error: claimedRes.error.message });
    if (profileRes.error) log.warn("profile fetch failed", { error: profileRes.error.message });
    if (ownerRes.error) log.warn("owner fetch failed", { error: ownerRes.error.message });

    const optInRows = (optInRes.data ?? []) as Array<{ investment_listing_id: number; advisor_type: string | null }>;
    const advisorOptInCounts: Record<number, number> = {};
    const seenPair = new Set<string>();
    for (const row of optInRows) {
      if (row.investment_listing_id == null) continue;
      const key = `${row.investment_listing_id}|${row.advisor_type ?? ""}`;
      if (seenPair.has(key)) continue;
      seenPair.add(key);
      advisorOptInCounts[row.investment_listing_id] = (advisorOptInCounts[row.investment_listing_id] ?? 0) + 1;
    }

    const claimedSlugs = new Set<string>(
      ((claimedRes.data ?? []) as Array<{ target_slug: string | null }>)
        .map((r) => r.target_slug)
        .filter((s): s is string => typeof s === "string"),
    );

    const investorProfile = (profileRes.data as InvestorProfileSnapshot | null) ?? null;
    const isListingOwner = !!ownerRes.data;

    return {
      advisorOptInCounts,
      claimedSlugs,
      investorProfile,
      isListingOwner,
      userId: user?.id ?? null,
    };
  } catch (err) {
    log.error("loadInvestPageContext threw", {
      err: err instanceof Error ? err.message : String(err),
    });
    return empty;
  }
}
