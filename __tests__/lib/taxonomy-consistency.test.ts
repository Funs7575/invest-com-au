import { describe, it, expect } from "vitest";
import {
  VERTICAL_TO_CATEGORY,
  FUND_SUB_TO_CATEGORY,
  categoryForListing,
  isCanonicalVertical,
} from "@/lib/listing-url";
import {
  getAllInvestCategories,
  getAllInvestCategorySlugs,
} from "@/lib/invest-categories";

/**
 * These tests guard against the taxonomy fork that caused the
 * 2026-04-26 listing-filter UX bug: the badge bar rendered DB-vertical
 * counts (uranium / oil_gas / hydrogen) that the pill row could not
 * filter by, because invest-categories.ts had no entry for them.
 *
 * Concretely, every value in VERTICAL_TO_CATEGORY (and every value in
 * FUND_SUB_TO_CATEGORY) MUST resolve to a real category slug declared
 * in invest-categories.ts — otherwise the filter UI drops listings on
 * the floor.
 */
describe("taxonomy consistency: listing-url ↔ invest-categories", () => {
  const slugs = new Set(getAllInvestCategorySlugs());

  it.each(Object.entries(VERTICAL_TO_CATEGORY))(
    "DB vertical %s → category slug %s exists in invest-categories.ts",
    (_vertical, categorySlug) => {
      expect(slugs.has(categorySlug)).toBe(true);
    },
  );

  it.each(Object.entries(FUND_SUB_TO_CATEGORY))(
    "fund sub_category %s → category slug %s exists in invest-categories.ts",
    (_sub, categorySlug) => {
      expect(slugs.has(categorySlug)).toBe(true);
    },
  );

  it("every category dbVertical value is a known InvestListingVertical", () => {
    const known = new Set(Object.keys(VERTICAL_TO_CATEGORY));
    for (const cat of getAllInvestCategories()) {
      for (const v of cat.dbVerticals) {
        expect(known.has(v)).toBe(true);
      }
    }
  });

  it("commodity sector listings route via listed-securities, not the vertical map", () => {
    // Uranium / oil-gas / hydrogen were the categories the 2026-04-26
    // audit found missing from the pill row. The shipped fix (2026-06-07,
    // founder sign-off) groups their listings as an instrument class:
    // listing_kind === "listed_security" routes to the
    // "listed-securities" category before the vertical map is consulted,
    // and the raw sector verticals are deliberately non-canonical.
    const required = ["uranium", "oil-gas", "hydrogen"];
    for (const slug of required) {
      // The sector hub category itself must still exist…
      expect(slugs.has(slug)).toBe(true);
      // …its listings route via the instrument-class category…
      expect(
        categoryForListing({ vertical: slug, listing_kind: "listed_security" }),
      ).toBe("listed-securities");
      // …and the raw vertical stays out of the canonical set so it can't
      // pollute category counts (see isCanonicalVertical docstring).
      expect(isCanonicalVertical(slug)).toBe(false);
    }
    expect(slugs.has("listed-securities")).toBe(true);
  });
});
