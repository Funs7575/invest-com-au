/**
 * Belt-and-braces audit for the Country Mode experts strip.
 *
 * `homepageExpertFilters.specialties` is now typed as
 * `ReadonlyArray<AdvisorType>`, so a typo would fail at compile time.
 * This test covers the case where someone widens the type back to
 * string[] (e.g. via `as const` shenanigans) or adds a country config
 * via a path that bypasses the type — and also enforces that the
 * canonical list itself stays consistent (no duplicates, no empty
 * strings).
 *
 * The DB-side check (does the type actually have rows?) is a separate
 * runtime concern handled by the supply-threshold gate; see
 * `applySupplyThresholds` and the audit notes in `lib/advisor-types.ts`.
 */

import { describe, it, expect } from "vitest";
import {
  ADVISOR_TYPES,
  isAdvisorType,
  type AdvisorType,
} from "@/lib/advisor-types";
import { COUNTRY_CONFIGS } from "@/lib/foreign-investment-country-data";

describe("ADVISOR_TYPES catalog", () => {
  it("has no duplicates", () => {
    expect(new Set(ADVISOR_TYPES).size).toBe(ADVISOR_TYPES.length);
  });

  it("has no empty strings or whitespace", () => {
    ADVISOR_TYPES.forEach((t) => {
      expect(t.length).toBeGreaterThan(0);
      expect(t).toBe(t.trim());
    });
  });

  it("only contains snake_case identifiers (DB convention)", () => {
    ADVISOR_TYPES.forEach((t) => {
      expect(t).toMatch(/^[a-z][a-z0-9_]*$/);
    });
  });

  it("isAdvisorType rejects unknown values", () => {
    expect(isAdvisorType("tax_agent")).toBe(true);
    expect(isAdvisorType("not-a-real-type")).toBe(false);
    expect(isAdvisorType("")).toBe(false);
    expect(isAdvisorType("__proto__")).toBe(false);
  });
});

describe("country configs reference valid advisor types", () => {
  const entries = Object.entries(COUNTRY_CONFIGS);

  it.each(entries)(
    "%s — every homepageExpertFilters.specialties entry is a known AdvisorType",
    (_code, config) => {
      const specialties = config?.homepageExpertFilters?.specialties ?? [];
      const invalid = specialties.filter((s) => !isAdvisorType(s));
      expect(invalid).toEqual([]);
    },
  );

  it("every config that defines homepageExpertFilters has at least 2 specialties", () => {
    // Supply-threshold floor for experts is 2 — a single-specialty config
    // would always sit on the edge and is almost certainly a copy-paste
    // bug. Bumping to 0 is fine (drop the field entirely); 1 isn't.
    for (const [code, config] of entries) {
      const filter = config?.homepageExpertFilters;
      if (!filter) continue;
      expect(
        filter.specialties.length,
        `${code} has ${filter.specialties.length} specialty — needs ≥2 to clear the supply gate`,
      ).toBeGreaterThanOrEqual(2);
    }
  });

  it("uses only canonical types (compile-time-redundant smoke test)", () => {
    // If this fails the upstream interface widened from AdvisorType[]
    // back to string[]. Bring it back.
    for (const config of Object.values(COUNTRY_CONFIGS)) {
      const specialties = config?.homepageExpertFilters?.specialties ?? [];
      specialties.forEach((s: AdvisorType) => {
        expect(ADVISOR_TYPES).toContain(s);
      });
    }
  });
});
