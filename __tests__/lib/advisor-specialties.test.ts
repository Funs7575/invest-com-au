import { describe, it, expect } from "vitest";
import {
  ADVISOR_SPECIALTY_CATEGORIES,
  ALL_ADVISOR_SPECIALTIES,
  SPECIALTIES_BY_TYPE,
  RADIUS_OPTIONS,
} from "@/lib/advisor-specialties";

describe("advisor specialty taxonomy", () => {
  it("has multiple categories", () => {
    expect(ADVISOR_SPECIALTY_CATEGORIES.length).toBeGreaterThan(3);
  });

  it("every category has a name + non-empty specialties", () => {
    for (const c of ADVISOR_SPECIALTY_CATEGORIES) {
      expect(c.category).toBeTruthy();
      expect(c.specialties.length).toBeGreaterThan(0);
      for (const s of c.specialties) {
        expect(typeof s).toBe("string");
        expect(s.length).toBeGreaterThan(1);
      }
    }
  });

  it("category names are unique", () => {
    const names = ADVISOR_SPECIALTY_CATEGORIES.map((c) => c.category);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe("ALL_ADVISOR_SPECIALTIES", () => {
  it("is the flattened union of all category specialties", () => {
    const flattened = ADVISOR_SPECIALTY_CATEGORIES.flatMap((c) => c.specialties);
    expect([...ALL_ADVISOR_SPECIALTIES].sort()).toEqual(flattened.sort());
  });

  it("is returned in alphabetical order", () => {
    const sorted = [...ALL_ADVISOR_SPECIALTIES].sort((a, b) =>
      a.localeCompare(b),
    );
    expect(ALL_ADVISOR_SPECIALTIES).toEqual(sorted);
  });
});

describe("SPECIALTIES_BY_TYPE", () => {
  it("covers each professional type", () => {
    // The keys come directly from ProfessionalType union — check a few we know
    expect(SPECIALTIES_BY_TYPE.smsf_accountant.length).toBeGreaterThan(0);
    expect(SPECIALTIES_BY_TYPE.financial_planner.length).toBeGreaterThan(0);
  });

  it("includes property-thread completion types (conveyancer, property_lawyer)", () => {
    expect(SPECIALTIES_BY_TYPE.conveyancer.length).toBeGreaterThan(0);
    expect(SPECIALTIES_BY_TYPE.property_lawyer.length).toBeGreaterThan(0);
    // Conveyancer specialties should reference settlement work
    expect(
      SPECIALTIES_BY_TYPE.conveyancer.some((s) =>
        /settle|contract|stamp duty|pexa/i.test(s),
      ),
    ).toBe(true);
    // Property lawyer specialties should reference disputes / SMSF / off-the-plan
    expect(
      SPECIALTIES_BY_TYPE.property_lawyer.some((s) =>
        /dispute|smsf|off-the-plan|litigation|strata/i.test(s),
      ),
    ).toBe(true);
  });

  it("every type's specialty list is non-empty", () => {
    for (const [type, specialties] of Object.entries(SPECIALTIES_BY_TYPE)) {
      expect(
        specialties.length,
        `${type} has no specialties`,
      ).toBeGreaterThan(0);
    }
  });

  it("specialties within a type are unique (no duplicates)", () => {
    for (const [type, specialties] of Object.entries(SPECIALTIES_BY_TYPE)) {
      expect(
        new Set(specialties).size,
        `${type} has duplicate specialties`,
      ).toBe(specialties.length);
    }
  });
});

describe("RADIUS_OPTIONS", () => {
  it("includes common Australian radii", () => {
    const values = RADIUS_OPTIONS.map((r) => r.value);
    expect(values).toContain(10);
    expect(values).toContain(50);
    expect(values).toContain(200);
  });

  it("includes an 'Any' option with value 0", () => {
    expect(
      RADIUS_OPTIONS.find((r) => r.value === 0)?.label,
    ).toBe("Any");
  });

  it("every option has value + label", () => {
    for (const r of RADIUS_OPTIONS) {
      expect(typeof r.value).toBe("number");
      expect(r.label).toBeTruthy();
    }
  });
});
