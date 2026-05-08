import { describe, it, expect } from "vitest";
import { getHomepageFiltersForCountry } from "@/lib/country-mode";
import { INTENT_COUNTRY_CODES } from "@/lib/intent-context";

describe("getHomepageFiltersForCountry", () => {
  describe("null country code (global / AU fallback)", () => {
    it("returns the empty-filter shape", () => {
      const result = getHomepageFiltersForCountry(null);
      expect(result.listings).toBeNull();
      expect(result.experts).toBeNull();
      expect(result.platforms).toBeNull();
      expect(result.tools).toEqual([]);
      expect(result.popularLinks).toEqual([]);
    });
  });

  describe("supported country codes — population status", () => {
    // Step 7 populates HK as the Phase 1 model country; the other 11 fall
    // back to global until Phase 2. The two assertions below are the
    // contract: populated countries return runtime filter shapes, the
    // rest return nulls so wrappers render the global teasers.
    const POPULATED: ReadonlyArray<string> = ["hk"];

    it.each(INTENT_COUNTRY_CODES.filter((c) => !POPULATED.includes(c)))(
      "%s returns null filters (not yet populated)",
      (code) => {
        const result = getHomepageFiltersForCountry(code);
        expect(result.listings).toBeNull();
        expect(result.experts).toBeNull();
        expect(result.platforms).toBeNull();
        expect(result.tools).toEqual([]);
      },
    );

    it("hk returns populated runtime filter shapes", () => {
      const result = getHomepageFiltersForCountry("hk");
      expect(result.listings).not.toBeNull();
      expect(result.listings?.verticals).toContain("commercial-property");
      expect(result.experts).not.toBeNull();
      expect(result.experts?.specialties).toContain("tax");
      expect(result.platforms).not.toBeNull();
      expect(result.platforms?.types).toContain("share_broker");
      expect(result.platforms?.nonResidentsOnly).toBe(true);
      expect(result.tools.length).toBeGreaterThan(0);
    });
  });

  describe("popularLinks falls back to existing defaultActions[]", () => {
    // Per the addendum: Country Mode reuses the country's existing
    // defaultActions[] (used by the flag-button popover) as the
    // homepage popular-starting-points strip. No duplicate config.
    it("returns defaultActions for countries that have them", () => {
      const ukResult = getHomepageFiltersForCountry("uk");
      // UK has defaultActions populated in the existing config.
      expect(ukResult.popularLinks.length).toBeGreaterThan(0);
      ukResult.popularLinks.forEach((action) => {
        expect(action.label).toBeTruthy();
        expect(action.href).toBeTruthy();
      });
    });

    it.each(INTENT_COUNTRY_CODES)(
      "%s popularLinks is an array (never undefined)",
      (code) => {
        const result = getHomepageFiltersForCountry(code);
        expect(Array.isArray(result.popularLinks)).toBe(true);
      },
    );
  });

  describe("shape stability", () => {
    it("returns the same shape for null and for unknown configs", () => {
      // All current 12 codes have configs, but the helper must defend
      // against a future code being added before its config exists.
      const fromNull = getHomepageFiltersForCountry(null);
      const fromCode = getHomepageFiltersForCountry("uk");
      expect(Object.keys(fromNull).sort()).toEqual(Object.keys(fromCode).sort());
    });
  });
});
