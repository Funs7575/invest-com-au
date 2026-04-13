import type { InvestmentListing, InvestListingVertical } from "@/lib/types";

/**
 * Maps each `vertical` value from the database to its corresponding
 * URL category slug used in the /invest/{category}/listings/{slug} routes.
 */
export const VERTICAL_TO_CATEGORY: Record<InvestListingVertical, string> = {
  business: "buy-business",
  commercial_property: "commercial-property",
  energy: "renewable-energy",
  farmland: "farmland",
  franchise: "franchise",
  fund: "funds",
  mining: "mining",
  startup: "startups",
};

/**
 * Some `fund` listings actually belong to a different category based on
 * their `sub_category` value. For example, a fund with sub_category "art"
 * is an "alternatives" category listing.
 */
export const FUND_SUB_TO_CATEGORY: Record<string, string> = {
  art: "alternatives",
  wine: "alternatives",
  watches: "alternatives",
  cars: "alternatives",
  coins: "alternatives",
  whisky: "alternatives",
  private_credit: "private-credit",
  infrastructure: "infrastructure",
};

/**
 * Returns the canonical category slug for an investment listing.
 * Used to construct correct URLs for listing detail pages.
 */
export function categoryForListing(listing: Pick<InvestmentListing, "vertical" | "sub_category">): string {
  if (listing.vertical === "fund" && listing.sub_category) {
    const override = FUND_SUB_TO_CATEGORY[listing.sub_category];
    if (override) return override;
  }
  return VERTICAL_TO_CATEGORY[listing.vertical] ?? "funds";
}

/**
 * Returns the canonical URL path for an investment listing detail page.
 * Format: /invest/{category}/listings/{slug}
 *
 * Use this everywhere instead of hardcoded URL templates to ensure links
 * always go to the correct category-specific route.
 */
export function listingUrl(listing: Pick<InvestmentListing, "vertical" | "sub_category" | "slug">): string {
  return `/invest/${categoryForListing(listing)}/listings/${listing.slug}`;
}
