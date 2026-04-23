import { describe, it, expect } from "vitest";
import {
  FOREIGN_INVESTOR_PERSONAS,
  DTA_COUNTRIES,
  DEFAULT_WHT,
  NON_RESIDENT_TAX_BRACKETS,
  RESIDENT_TAX_BRACKETS,
  DASP_WITHHOLDING_RATES,
  VERTICAL_FOREIGN_RULES,
  AUSTRALIAN_RESIDENCY_TESTS,
} from "@/lib/foreign-investment-data";

describe("FOREIGN_INVESTOR_PERSONAS", () => {
  it("has multiple personas", () => {
    expect(FOREIGN_INVESTOR_PERSONAS.length).toBeGreaterThan(2);
  });

  it("every persona has id/label/description/icon/keyConcerns/primaryPages/advisorType", () => {
    for (const p of FOREIGN_INVESTOR_PERSONAS) {
      expect(p.id).toBeTruthy();
      expect(p.label).toBeTruthy();
      expect(p.description).toBeTruthy();
      expect(p.icon).toBeTruthy();
      expect(Array.isArray(p.keyConcerns)).toBe(true);
      expect(Array.isArray(p.primaryPages)).toBe(true);
      expect(p.advisorType).toBeTruthy();
    }
  });

  it("persona ids are globally unique", () => {
    const ids = FOREIGN_INVESTOR_PERSONAS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("DTA_COUNTRIES", () => {
  it("covers key markets (USA, UK, China, India)", () => {
    const codes = DTA_COUNTRIES.map((c) => c.countryCode);
    for (const expected of ["US", "GB", "CN", "IN"]) {
      expect(codes, `missing ${expected}`).toContain(expected);
    }
  });

  it("every entry has numeric withholding rates", () => {
    for (const c of DTA_COUNTRIES) {
      expect(typeof c.dividendWHT).toBe("number");
      expect(typeof c.interestWHT).toBe("number");
      expect(typeof c.royaltiesWHT).toBe("number");
      expect(c.dividendWHT).toBeGreaterThanOrEqual(0);
      expect(c.dividendWHT).toBeLessThanOrEqual(50);
    }
  });
});

describe("DEFAULT_WHT", () => {
  it("is the no-DTA baseline (30% unfranked dividends, 10% interest, 30% royalties)", () => {
    expect(DEFAULT_WHT.dividendUnfranked).toBe(30);
    expect(DEFAULT_WHT.dividendFullyFranked).toBe(0);
    expect(DEFAULT_WHT.interest).toBe(10);
    expect(DEFAULT_WHT.royalties).toBe(30);
  });
});

describe("NON_RESIDENT_TAX_BRACKETS", () => {
  it("has no $0 tax-free threshold (non-residents taxed from $0)", () => {
    expect(NON_RESIDENT_TAX_BRACKETS[0]?.from).toBe(0);
    expect(NON_RESIDENT_TAX_BRACKETS[0]?.rate).toBeGreaterThan(0);
  });

  it("has a contiguous ascending `from/to` chain", () => {
    for (let i = 1; i < NON_RESIDENT_TAX_BRACKETS.length; i += 1) {
      const prev = NON_RESIDENT_TAX_BRACKETS[i - 1]!;
      const cur = NON_RESIDENT_TAX_BRACKETS[i]!;
      if (prev.to !== null) {
        expect(cur.from).toBe(prev.to + 1);
      }
    }
    const last = NON_RESIDENT_TAX_BRACKETS.at(-1)!;
    expect(last.to).toBeNull();
  });
});

describe("RESIDENT_TAX_BRACKETS", () => {
  it("starts with the $0-$18,200 tax-free threshold", () => {
    const first = RESIDENT_TAX_BRACKETS[0]!;
    expect(first.from).toBe(0);
    expect(first.to).toBe(18_200);
    expect(first.rate).toBe(0);
  });

  it("top bracket is unbounded (to=null)", () => {
    const last = RESIDENT_TAX_BRACKETS.at(-1)!;
    expect(last.to).toBeNull();
  });
});

describe("DASP_WITHHOLDING_RATES", () => {
  it("includes the three standard components", () => {
    const types = DASP_WITHHOLDING_RATES.map((r) => r.componentType);
    expect(types.some((t) => /Taxed element/.test(t))).toBe(true);
    expect(types.some((t) => /Untaxed element/.test(t))).toBe(true);
    expect(types.some((t) => /Tax-free component/.test(t))).toBe(true);
  });

  it("Untaxed element is the highest rate (45%)", () => {
    const untaxed = DASP_WITHHOLDING_RATES.find((r) =>
      /Untaxed element/.test(r.componentType),
    );
    expect(untaxed?.withholdingRate).toBe(45);
  });
});

describe("VERTICAL_FOREIGN_RULES", () => {
  it("has populated entries with vertical + content", () => {
    expect(VERTICAL_FOREIGN_RULES.length).toBeGreaterThan(0);
    for (const r of VERTICAL_FOREIGN_RULES) {
      expect(r.vertical).toBeTruthy();
    }
  });
});

describe("AUSTRALIAN_RESIDENCY_TESTS", () => {
  it("has the canonical tests populated", () => {
    expect(AUSTRALIAN_RESIDENCY_TESTS.length).toBeGreaterThanOrEqual(3);
    for (const t of AUSTRALIAN_RESIDENCY_TESTS) {
      expect(t.testName).toBeTruthy();
      expect(t.description).toBeTruthy();
      expect(t.youAreResident).toBeTruthy();
      expect(t.notes).toBeTruthy();
    }
  });
});
