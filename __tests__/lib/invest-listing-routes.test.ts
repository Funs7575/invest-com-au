import { describe, it, expect } from "vitest";
import {
  STATIC_LISTING_SLUGS,
  GENERIC_LISTING_SLUGS,
  LISTING_PAGE_SLUGS,
  hasListingsPage,
  categoryListingsHref,
} from "@/lib/invest-listing-routes";
import { getOpportunityCategories } from "@/lib/invest-categories";

describe("invest-listing-routes", () => {
  // Drift guard: every opportunity category must be classified as either
  // static-page or generic-route, and nothing else. If someone adds a new
  // opportunity category without giving it a listings page, this fails.
  it("LISTING_PAGE_SLUGS is exactly the set of opportunity categories", () => {
    const opportunity = getOpportunityCategories()
      .map((c) => c.slug)
      .sort();
    const routed = [...LISTING_PAGE_SLUGS].sort();
    expect(routed).toEqual(opportunity);
  });

  it("static and generic slug sets are disjoint", () => {
    const generic = new Set<string>(GENERIC_LISTING_SLUGS);
    const overlap = STATIC_LISTING_SLUGS.filter((s) => generic.has(s));
    expect(overlap).toEqual([]);
  });

  it("hasListingsPage: true for opportunity sectors, false otherwise", () => {
    expect(hasListingsPage("mining")).toBe(true); // static page
    expect(hasListingsPage("income-assets")).toBe(true); // generic route
    expect(hasListingsPage("gold")).toBe(false); // guide, not opportunity
    expect(hasListingsPage("not-a-slug")).toBe(false);
  });

  describe("categoryListingsHref", () => {
    it("returns the canonical path page for a sector with a page", () => {
      expect(categoryListingsHref("mining")).toBe("/invest/mining/listings");
      expect(categoryListingsHref("bullion")).toBe("/invest/bullion/listings");
    });

    it("appends carried filters and drops category/sub/empty values", () => {
      expect(
        categoryListingsHref("mining", { state: "WA", price: "", category: "x", sub: "y" }),
      ).toBe("/invest/mining/listings?state=WA");
    });

    it("falls back to the marketplace filter for an unknown slug", () => {
      expect(categoryListingsHref("mystery")).toBe("/invest?category=mystery");
    });

    it("fallback carries non-category filters too", () => {
      expect(categoryListingsHref("mystery", { state: "NSW" })).toBe(
        "/invest?state=NSW&category=mystery",
      );
    });
  });
});
