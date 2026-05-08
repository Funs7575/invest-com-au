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

  describe("all 12 countries return populated runtime filter shapes (Phase 2 saturation)", () => {
    // Phase 2 saturates all 12 corridors. Each must return non-null
    // listings/experts/platforms shapes — the supply-threshold gate is
    // what hides empty strips at runtime, but the filter shape itself
    // should always be defined.
    it.each(INTENT_COUNTRY_CODES)("%s returns populated filter shapes", (code) => {
      const result = getHomepageFiltersForCountry(code);
      expect(result.listings).not.toBeNull();
      expect(result.listings?.verticals.length).toBeGreaterThanOrEqual(2);
      expect(result.experts).not.toBeNull();
      expect(result.experts?.specialties.length).toBeGreaterThanOrEqual(2);
      expect(result.platforms).not.toBeNull();
      expect(result.platforms?.types.length).toBeGreaterThanOrEqual(1);
      expect(result.tools.length).toBeGreaterThanOrEqual(2);
    });

    it("uses canonical advisor type strings (snake_case from lib/verticals.ts)", () => {
      // Phase 1 shipped HK with "tax", "buyers-agent", "mortgage-broker"
      // — the wrong format. Phase 2 fixed them to the canonical
      // snake_case forms. This guards against the regression.
      const hk = getHomepageFiltersForCountry("hk");
      expect(hk.experts?.specialties).toContain("tax_agent");
      expect(hk.experts?.specialties).toContain("property_advisor");
      // Common types we expect to appear across multiple corridors:
      const allSpecialties = INTENT_COUNTRY_CODES.flatMap(
        (code) => getHomepageFiltersForCountry(code).experts?.specialties ?? [],
      );
      // At least one country uses each of the canonical types.
      ["tax_agent", "smsf_accountant", "property_advisor", "wealth_manager", "financial_planner"].forEach(
        (canonicalType) => {
          expect(allSpecialties).toContain(canonicalType);
        },
      );
    });

    it("NZ is the only nonResidentsOnly: false (Trans-Tasman gives full access)", () => {
      const nz = getHomepageFiltersForCountry("nz");
      expect(nz.platforms?.nonResidentsOnly).toBe(false);
      INTENT_COUNTRY_CODES.filter((c) => c !== "nz").forEach((code) => {
        const result = getHomepageFiltersForCountry(code);
        expect(result.platforms?.nonResidentsOnly).toBe(true);
      });
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
