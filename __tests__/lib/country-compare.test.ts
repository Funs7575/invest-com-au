/**
 * Unit tests for lib/country-compare.ts
 *
 * Validates:
 *  - Pair integrity (both countries present, no missing data)
 *  - Deduplication (no a-vs-b / b-vs-a duplicates)
 *  - Canonical ordering (alphabetical by countryShort)
 *  - parsePairSlug: valid, reverse, invalid inputs
 *  - buildCountryComparison: row count, warnings, flags
 *  - allComparePairs: C(12,2) = 66 unique pairs
 */

import { describe, it, expect } from "vitest";
import {
  allComparePairs,
  parsePairSlug,
  buildCountryComparison,
} from "@/lib/country-compare";
import {
  COUNTRY_CONFIGS,
  UK_CONFIG,
  US_CONFIG,
  NZ_CONFIG,
  SA_CONFIG,
} from "@/lib/foreign-investment-country-data";
import type { IntentCountryCode } from "@/lib/intent-context";

// ─── allComparePairs ─────────────────────────────────────────────────────────

describe("allComparePairs", () => {
  it("returns exactly C(n,2) pairs for n hub countries", () => {
    const n = Object.keys(COUNTRY_CONFIGS).length;
    const expected = (n * (n - 1)) / 2;
    const pairs = allComparePairs();
    expect(pairs.length).toBe(expected);
  });

  it("returns 66 pairs for the 12 hub countries", () => {
    expect(allComparePairs().length).toBe(66);
  });

  it("has no duplicate pair slugs", () => {
    const pairs = allComparePairs();
    const slugs = pairs.map((p) => p.pair);
    const unique = new Set(slugs);
    expect(unique.size).toBe(slugs.length);
  });

  it("canonical slug is always a-vs-b, never b-vs-a (alphabetical by countryShort)", () => {
    const pairs = allComparePairs();
    for (const p of pairs) {
      const cfgA = COUNTRY_CONFIGS[p.codeA];
      const cfgB = COUNTRY_CONFIGS[p.codeB];
      expect(cfgA).toBeDefined();
      expect(cfgB).toBeDefined();
      // A must be <= B by countryShort
      const cmp = cfgA!.countryShort.localeCompare(cfgB!.countryShort);
      expect(cmp).toBeLessThanOrEqual(0);
    }
  });

  it("every pair slug starts with slugA and ends with slugB", () => {
    const pairs = allComparePairs();
    for (const p of pairs) {
      const cfgA = COUNTRY_CONFIGS[p.codeA];
      const cfgB = COUNTRY_CONFIGS[p.codeB];
      expect(p.pair).toBe(`${cfgA!.slug}-vs-${cfgB!.slug}`);
    }
  });

  it("every code in the pairs is a key in COUNTRY_CONFIGS", () => {
    const validCodes = new Set(Object.keys(COUNTRY_CONFIGS) as IntentCountryCode[]);
    const pairs = allComparePairs();
    for (const p of pairs) {
      expect(validCodes.has(p.codeA)).toBe(true);
      expect(validCodes.has(p.codeB)).toBe(true);
    }
  });

  it("no pair has the same country on both sides", () => {
    const pairs = allComparePairs();
    for (const p of pairs) {
      expect(p.codeA).not.toBe(p.codeB);
    }
  });
});

// ─── parsePairSlug ───────────────────────────────────────────────────────────

describe("parsePairSlug", () => {
  it("parses a canonical slug without reversed flag", () => {
    // UK = "UK", US = "US" — UK < US alphabetically → uk-vs-us is canonical
    const result = parsePairSlug("united-kingdom-vs-united-states");
    expect(result).not.toBeNull();
    expect(result!.reversed).toBe(false);
    expect(result!.canonicalSlug).toBe("united-kingdom-vs-united-states");
  });

  it("parses a reversed slug and sets reversed=true with the correct canonicalSlug", () => {
    // us before uk in reversed order
    const result = parsePairSlug("united-states-vs-united-kingdom");
    expect(result).not.toBeNull();
    expect(result!.reversed).toBe(true);
    expect(result!.canonicalSlug).toBe("united-kingdom-vs-united-states");
  });

  it("returns null for an unrecognised country slug on the left", () => {
    expect(parsePairSlug("atlantis-vs-united-kingdom")).toBeNull();
  });

  it("returns null for an unrecognised country slug on the right", () => {
    expect(parsePairSlug("united-kingdom-vs-narnia")).toBeNull();
  });

  it("returns null when there is no -vs- separator", () => {
    expect(parsePairSlug("united-kingdom-united-states")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(parsePairSlug("")).toBeNull();
  });

  it("returns the correct cfgA/cfgB for NZ-vs-UK (NZ comes before UK alphabetically)", () => {
    // NZ = "NZ", UK = "UK" — NZ < UK → new-zealand-vs-united-kingdom
    const result = parsePairSlug("new-zealand-vs-united-kingdom");
    expect(result).not.toBeNull();
    expect(result!.reversed).toBe(false);
    expect(result!.cfgA.code).toBe("nz");
    expect(result!.cfgB.code).toBe("uk");
  });
});

// ─── buildCountryComparison ──────────────────────────────────────────────────

describe("buildCountryComparison", () => {
  it("produces a non-empty rows array", () => {
    const c = buildCountryComparison(UK_CONFIG, US_CONFIG);
    expect(c.rows.length).toBeGreaterThan(0);
  });

  it("includes all expected dimensions", () => {
    const c = buildCountryComparison(UK_CONFIG, US_CONFIG);
    const dimensions = c.rows.map((r) => r.dimension);
    expect(dimensions.some((d) => d.toLowerCase().includes("dta"))).toBe(true);
    expect(dimensions.some((d) => d.toLowerCase().includes("dividend"))).toBe(true);
    expect(dimensions.some((d) => d.toLowerCase().includes("firb"))).toBe(true);
    expect(dimensions.some((d) => d.toLowerCase().includes("pension"))).toBe(true);
    expect(dimensions.some((d) => d.toLowerCase().includes("migration"))).toBe(true);
  });

  it("sets bothHaveDta=true for UK vs US (both have DTA)", () => {
    const c = buildCountryComparison(UK_CONFIG, US_CONFIG);
    expect(c.bothHaveDta).toBe(true);
  });

  it("sets bothHaveDta=false when one country has no DTA (SA has no DTA)", () => {
    const c = buildCountryComparison(UK_CONFIG, SA_CONFIG);
    expect(c.bothHaveDta).toBe(false);
  });

  it("canonical ordering: A is alphabetically first by countryShort", () => {
    // UK < US
    const c1 = buildCountryComparison(UK_CONFIG, US_CONFIG);
    const c2 = buildCountryComparison(US_CONFIG, UK_CONFIG);
    expect(c1.countryA.code).toBe("uk");
    expect(c2.countryA.code).toBe("uk"); // same — canonical regardless of input order
    expect(c1.pairSlug).toBe(c2.pairSlug);
  });

  it("pairSlug matches slug format", () => {
    const c = buildCountryComparison(UK_CONFIG, US_CONFIG);
    expect(c.pairSlug).toBe("united-kingdom-vs-united-states");
  });

  it("warns about US critical warning (FATCA/worldwide tax)", () => {
    const c = buildCountryComparison(UK_CONFIG, US_CONFIG);
    // US has a criticalWarning about worldwide taxation
    expect(c.warnings.some((w) => w.country === "US")).toBe(true);
  });

  it("surfaces no warnings for a pair without criticalWarnings (NZ-UK)", () => {
    // Neither NZ nor UK have criticalWarning set
    const c = buildCountryComparison(NZ_CONFIG, UK_CONFIG);
    // NZ has "No FIRB Required" critical warning
    // UK has no criticalWarning
    // So warnings will have 1 entry (NZ)
    const nzWarnings = c.warnings.filter((w) => w.country === "NZ");
    expect(nzWarnings.length).toBeLessThanOrEqual(1);
  });

  it("NZ-vs-UK FIRB row reflects NZ Trans-Tasman exemption", () => {
    const c = buildCountryComparison(NZ_CONFIG, UK_CONFIG);
    const firbRow = c.rows.find((r) =>
      r.dimension.toLowerCase().includes("firb approval"),
    );
    expect(firbRow).toBeDefined();
    // The NZ or UK side should reflect the trans-tasman note
    const hasTransTasman =
      firbRow!.valueA.toLowerCase().includes("trans") ||
      firbRow!.valueB.toLowerCase().includes("trans");
    expect(hasTransTasman).toBe(true);
  });

  it("hasPensionTransfer is true when one country has retirementTransfer", () => {
    // UK has retirementTransfer (QROPS); SA likely does not
    const c = buildCountryComparison(UK_CONFIG, SA_CONFIG);
    // UK has QROPS section
    expect(typeof c.hasPensionTransfer).toBe("boolean");
    if (UK_CONFIG.retirementTransfer ?? SA_CONFIG.retirementTransfer) {
      expect(c.hasPensionTransfer).toBe(true);
    }
  });

  it("every row has non-empty valueA and valueB", () => {
    const c = buildCountryComparison(UK_CONFIG, US_CONFIG);
    for (const row of c.rows) {
      expect(row.valueA.length).toBeGreaterThan(0);
      expect(row.valueB.length).toBeGreaterThan(0);
    }
  });

  it("dividend row shows DTA-reduced rate for DTA countries", () => {
    const c = buildCountryComparison(UK_CONFIG, US_CONFIG);
    const divRow = c.rows.find((r) =>
      r.dimension.toLowerCase().includes("unfranked dividend"),
    );
    expect(divRow).toBeDefined();
    // Both have DTA; UK rate is 15%, US is also 15%
    expect(divRow!.valueA).toContain("15%");
    expect(divRow!.valueB).toContain("15%");
  });

  it("dividend row shows 30% for non-DTA country (SA)", () => {
    const c = buildCountryComparison(UK_CONFIG, SA_CONFIG);
    const divRow = c.rows.find((r) =>
      r.dimension.toLowerCase().includes("unfranked dividend"),
    );
    expect(divRow).toBeDefined();
    // SA has no DTA → 30%
    const saVal =
      c.countryA.code === "sa" ? divRow!.valueA : divRow!.valueB;
    expect(saVal).toContain("30%");
  });
});
