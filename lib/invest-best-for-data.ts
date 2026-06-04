/**
 * DB helper for /invest/best-for/[combo] landing pages (Wave 8 SEO).
 *
 * Returns the live listings that match a curated "best {vertical} for
 * {profile}" combo, plus a total count, so each page shows a real,
 * self-updating sample of the marketplace rather than static copy.
 *
 * Matching mirrors the /invest client: a listing belongs to a combo when
 * its canonical category (via categoryForListing) equals the combo's
 * match category, optionally narrowed by sub_category. Guide-vertical
 * sector-hub listings are excluded so they don't leak into, e.g., the
 * income-funds combos.
 *
 * Server-only; failure-tolerant (empty result on error).
 */

import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import type { InvestmentListing } from "@/lib/types";
import { categoryForListing, isCanonicalVertical } from "@/lib/listing-url";
import type { BestForCombo } from "@/lib/invest-best-for";

const log = logger("invest-best-for-data");

/** Upper bound on rows scanned — plenty of headroom for the marketplace. */
const SCAN_LIMIT = 500;

export interface BestForListings {
  /** Listings matching the combo, newest first, capped at `limit`. */
  listings: InvestmentListing[];
  /** Total matching listings (may exceed `listings.length`). */
  total: number;
}

/** Predicate: does this listing belong to the given combo? */
export function listingMatchesCombo(
  listing: Pick<InvestmentListing, "vertical" | "sub_category">,
  combo: Pick<BestForCombo, "categorySlug" | "matchCategory" | "subCategory">,
): boolean {
  if (!isCanonicalVertical(listing.vertical as string)) return false;
  const target = combo.matchCategory ?? combo.categorySlug;
  if (categoryForListing(listing) !== target) return false;
  if (combo.subCategory && listing.sub_category !== combo.subCategory) return false;
  return true;
}

export async function getBestForListings(
  combo: BestForCombo,
  limit = 6,
): Promise<BestForListings> {
  const empty: BestForListings = { listings: [], total: 0 };

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("investment_listings")
      .select("*")
      .eq("status", "active")
      .order("listing_type", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(SCAN_LIMIT);

    if (error) {
      log.warn("best-for listings query failed", {
        combo: combo.slug,
        error: error.message,
        code: error.code,
      });
      return empty;
    }

    const matched = ((data ?? []) as InvestmentListing[]).filter((l) =>
      listingMatchesCombo(l, combo),
    );
    return { listings: matched.slice(0, limit), total: matched.length };
  } catch (err) {
    log.error("getBestForListings threw", {
      combo: combo.slug,
      err: err instanceof Error ? err.message : String(err),
    });
    return empty;
  }
}
