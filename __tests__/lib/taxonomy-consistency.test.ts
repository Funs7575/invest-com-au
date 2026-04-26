import { describe, it, expect } from "vitest";
import {
  VERTICAL_TO_CATEGORY,
  FUND_SUB_TO_CATEGORY,
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

  it("every commodity vertical with a dedicated category is mapped", () => {
    // Uranium / oil-gas / hydrogen are the three categories the
    // 2026-04-26 audit found missing from the pill row. Lock them in
    // so a future refactor can't silently drop them again.
    const required = ["uranium", "oil-gas", "hydrogen"];
    for (const slug of required) {
      expect(slugs.has(slug)).toBe(true);
      // …and at least one DB vertical must route to that slug.
      const matchingVerticals = Object.entries(VERTICAL_TO_CATEGORY)
        .filter(([, cat]) => cat === slug)
        .map(([v]) => v);
      expect(matchingVerticals.length).toBeGreaterThan(0);
    }
  });
});
