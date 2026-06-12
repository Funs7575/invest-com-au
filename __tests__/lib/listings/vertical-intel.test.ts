import { describe, it, expect } from "vitest";
import {
  intelForCategory,
  DEFAULT_INTEL,
  INTEL_SLUGS,
} from "@/lib/listings/vertical-intel";
import { LISTING_PAGE_SLUGS } from "@/lib/invest-listing-routes";

describe("vertical-intel registry", () => {
  it("returns DEFAULT_INTEL for unknown slugs", () => {
    expect(intelForCategory("totally-made-up")).toBe(DEFAULT_INTEL);
  });

  it("resolves a complete entry for every canonical listings category", () => {
    for (const slug of LISTING_PAGE_SLUGS) {
      const intel = intelForCategory(slug);
      expect(intel.noun.length, slug).toBeGreaterThan(0);
      expect(intel.detailsHeading.length, slug).toBeGreaterThan(0);
      expect(intel.aboutHeading.length, slug).toBeGreaterThan(0);
      expect(intel.enquiryHeading.length, slug).toBeGreaterThan(0);
      expect(intel.enquirySubcopy.length, slug).toBeGreaterThan(0);
      expect(intel.dueDiligence.length, slug).toBeGreaterThanOrEqual(3);
      expect(intel.typicalCosts.length, slug).toBeGreaterThanOrEqual(2);
      expect(intel.liquidity.length, slug).toBeGreaterThan(20);
      expect(intel.exitPaths.length, slug).toBeGreaterThanOrEqual(1);
    }
  });

  it("registry copy never promises returns or appreciation", () => {
    // Lean-lane editorial redline: factual due-diligence only. Guard the
    // phrases most likely to creep in via future copy edits.
    const banned =
      /(guaranteed (return|income|profit)|will appreciate|can't lose|sure thing|risk-free)/i;
    for (const slug of INTEL_SLUGS) {
      const intel = intelForCategory(slug);
      const corpus = [
        intel.liquidity,
        intel.riskNote ?? "",
        ...intel.dueDiligence,
        ...intel.typicalCosts,
        ...intel.exitPaths,
      ].join(" ");
      expect(corpus, slug).not.toMatch(banned);
    }
  });

  it("covers the high-traffic categories with bespoke (non-default) entries", () => {
    for (const slug of [
      "farmland",
      "commercial-property",
      "buy-business",
      "water-rights",
      "alternatives",
    ]) {
      expect(intelForCategory(slug), slug).not.toBe(DEFAULT_INTEL);
    }
  });
});
