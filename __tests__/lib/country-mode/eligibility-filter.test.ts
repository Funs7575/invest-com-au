import { describe, it, expect } from "vitest";
import {
  isEligibleForCountry,
  filterByCountryEligibility,
  requiresVisaForCountry,
} from "@/lib/country-mode/eligibility-filter";

describe("isEligibleForCountry", () => {
  it("includes when intent country is null (no filter)", () => {
    expect(isEligibleForCountry({ country_eligibility: { blocked_countries: ["GB"] } }, null)).toBe(true);
  });

  it("includes when country_eligibility is undefined", () => {
    expect(isEligibleForCountry({}, "uk")).toBe(true);
  });

  it("includes when country_eligibility is empty object", () => {
    expect(isEligibleForCountry({ country_eligibility: {} }, "uk")).toBe(true);
  });

  it("includes when country_eligibility is null", () => {
    expect(isEligibleForCountry({ country_eligibility: null }, "uk")).toBe(true);
  });

  it("EXCLUDES when blocked_countries includes visitor ISO", () => {
    expect(
      isEligibleForCountry({ country_eligibility: { blocked_countries: ["GB", "US"] } }, "uk"),
    ).toBe(false);
  });

  it("EXCLUDES with case-insensitive ISO match in blocked", () => {
    expect(
      isEligibleForCountry({ country_eligibility: { blocked_countries: ["gb"] } }, "uk"),
    ).toBe(false);
  });

  it("EXCLUDES when allowed_countries set and visitor ISO not in it", () => {
    expect(
      isEligibleForCountry(
        { country_eligibility: { allowed_countries: ["HK", "SG"] } },
        "uk",
      ),
    ).toBe(false);
  });

  it("includes when allowed_countries set and visitor ISO IS in it", () => {
    expect(
      isEligibleForCountry(
        { country_eligibility: { allowed_countries: ["GB", "HK", "SG"] } },
        "uk",
      ),
    ).toBe(true);
  });

  it("includes when allowed_countries is empty array (treats as 'no opinion')", () => {
    expect(
      isEligibleForCountry({ country_eligibility: { allowed_countries: [] } }, "uk"),
    ).toBe(true);
  });

  it("blocked beats allowed (defense in depth)", () => {
    expect(
      isEligibleForCountry(
        {
          country_eligibility: {
            allowed_countries: ["GB", "HK"],
            blocked_countries: ["GB"],
          },
        },
        "uk",
      ),
    ).toBe(false);
  });

  it("visa_required does NOT exclude (informational only)", () => {
    expect(
      isEligibleForCountry({ country_eligibility: { visa_required: ["GB"] } }, "uk"),
    ).toBe(true);
  });

  it("non-object country_eligibility returns true (defensive)", () => {
    expect(
      isEligibleForCountry({ country_eligibility: "garbage" as unknown as Record<string, unknown> }, "uk"),
    ).toBe(true);
  });
});

describe("filterByCountryEligibility", () => {
  const brokers = [
    { id: 1, name: "AU-only", country_eligibility: { allowed_countries: ["AU"] } },
    { id: 2, name: "Global, blocks US", country_eligibility: { blocked_countries: ["US"] } },
    { id: 3, name: "UK + HK", country_eligibility: { allowed_countries: ["GB", "HK"] } },
    { id: 4, name: "Unverified", country_eligibility: {} },
    { id: 5, name: "No metadata" },
  ];

  it("returns all when intent country is null", () => {
    expect(filterByCountryEligibility(brokers, null)).toHaveLength(5);
  });

  it("filters for UK visitor (GB) — keeps eligible only", () => {
    const result = filterByCountryEligibility(brokers, "uk");
    // 1 excluded (AU-only allow-list), 2 included (no GB block), 3 included (GB in allow), 4+5 included (no opinion)
    expect(result.map((b) => b.id)).toEqual([2, 3, 4, 5]);
  });

  it("filters for US visitor (US) — excludes 2 (blocks US) and 1+3 (allow-list excludes US)", () => {
    const result = filterByCountryEligibility(brokers, "us");
    expect(result.map((b) => b.id)).toEqual([4, 5]);
  });

  it("filters for HK visitor (HK) — keeps 3 (HK in allow), 2+4+5 (no opinion / no block)", () => {
    const result = filterByCountryEligibility(brokers, "hk");
    expect(result.map((b) => b.id)).toEqual([2, 3, 4, 5]);
  });

  it("preserves array order", () => {
    const ordered = [
      { id: "z", country_eligibility: {} },
      { id: "a", country_eligibility: {} },
      { id: "m", country_eligibility: {} },
    ];
    expect(filterByCountryEligibility(ordered, "uk").map((e) => e.id)).toEqual(["z", "a", "m"]);
  });
});

describe("requiresVisaForCountry", () => {
  it("returns false when intent country is null", () => {
    expect(requiresVisaForCountry({ country_eligibility: { visa_required: ["GB"] } }, null)).toBe(false);
  });

  it("returns false when no visa list present", () => {
    expect(requiresVisaForCountry({ country_eligibility: {} }, "uk")).toBe(false);
  });

  it("returns true when visitor ISO in visa_required", () => {
    expect(
      requiresVisaForCountry({ country_eligibility: { visa_required: ["GB", "US"] } }, "uk"),
    ).toBe(true);
  });

  it("case-insensitive match", () => {
    expect(
      requiresVisaForCountry({ country_eligibility: { visa_required: ["gb"] } }, "uk"),
    ).toBe(true);
  });
});
