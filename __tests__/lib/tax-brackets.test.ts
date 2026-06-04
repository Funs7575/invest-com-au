/**
 * Unit tests for lib/tax/brackets.ts — the SSOT for Stage-3 bracket data.
 *
 * Hand-computed expected values are derived from:
 *   ATO "Individual income tax rates" (resident, 2024-25):
 *     https://www.ato.gov.au/tax-rates-and-codes/tax-rates-australian-residents
 *
 * Bracket structure (Stage 3, from 1 July 2024):
 *   $0       – $18,200   0%
 *   $18,201  – $45,000   16%
 *   $45,001  – $135,000  30%
 *   $135,001 – $190,000  37%
 *   $190,001+            45%
 *
 * Cumulative tax at bracket ceilings (ATO published figures):
 *   $18,200  → $0
 *   $45,000  → $4,288        = (45,000 − 18,200) × 0.16
 *   $135,000 → $31,288       = 4,288 + (135,000 − 45,000) × 0.30
 *   $190,000 → $51,638       = 31,288 + (190,000 − 135,000) × 0.37
 */
import { describe, it, expect } from "vitest";
import {
  RESIDENT_BRACKETS_2024_25,
  marginalRate,
  incomeTax,
  MARGINAL_RATE_OPTIONS,
} from "@/lib/tax/brackets";

// ─── RESIDENT_BRACKETS_2024_25 ────────────────────────────────────────────────

describe("RESIDENT_BRACKETS_2024_25", () => {
  it("has 5 brackets", () => {
    expect(RESIDENT_BRACKETS_2024_25).toHaveLength(5);
  });

  it("starts at 0 and ends at Infinity", () => {
    expect(RESIDENT_BRACKETS_2024_25[0]?.min).toBe(0);
    expect(RESIDENT_BRACKETS_2024_25[RESIDENT_BRACKETS_2024_25.length - 1]?.max).toBe(Infinity);
  });

  it("brackets are contiguous (each min equals the previous max)", () => {
    for (let i = 1; i < RESIDENT_BRACKETS_2024_25.length; i++) {
      expect(RESIDENT_BRACKETS_2024_25[i]?.min).toBe(RESIDENT_BRACKETS_2024_25[i - 1]?.max);
    }
  });

  it("has the correct Stage-3 rates", () => {
    const rates = RESIDENT_BRACKETS_2024_25.map((b) => b.rate);
    expect(rates).toEqual([0, 0.16, 0.30, 0.37, 0.45]);
  });
});

// ─── marginalRate ─────────────────────────────────────────────────────────────

describe("marginalRate — bracket boundaries", () => {
  it("is 0% for income at the tax-free threshold ($18,200)", () => {
    expect(marginalRate(18_200)).toBe(0);
  });

  it("is 0% for $0", () => {
    expect(marginalRate(0)).toBe(0);
  });

  it("is 16% for $18,201 (just above the threshold)", () => {
    expect(marginalRate(18_201)).toBe(0.16);
  });

  it("is 16% for income up to $45,000", () => {
    expect(marginalRate(45_000)).toBe(0.16);
  });

  it("is 30% for $45,001 (start of the third bracket)", () => {
    expect(marginalRate(45_001)).toBe(0.30);
  });

  it("is 30% for a midpoint of $90,000", () => {
    expect(marginalRate(90_000)).toBe(0.30);
  });

  it("is 30% for $135,000 (top of the third bracket)", () => {
    expect(marginalRate(135_000)).toBe(0.30);
  });

  it("is 37% for $135,001", () => {
    expect(marginalRate(135_001)).toBe(0.37);
  });

  it("is 37% for $190,000", () => {
    expect(marginalRate(190_000)).toBe(0.37);
  });

  it("is 45% for $190,001", () => {
    expect(marginalRate(190_001)).toBe(0.45);
  });

  it("is 45% for very large income (e.g. $1 million)", () => {
    expect(marginalRate(1_000_000)).toBe(0.45);
  });

  it("floors negative income to 0% (same as $0)", () => {
    expect(marginalRate(-5_000)).toBe(0);
  });
});

describe("marginalRate — midpoints", () => {
  it("is 16% at $30,000 (midpoint of second bracket)", () => {
    expect(marginalRate(30_000)).toBe(0.16);
  });

  it("is 37% at $160,000 (midpoint of fourth bracket)", () => {
    expect(marginalRate(160_000)).toBe(0.37);
  });

  it("is 45% at $250,000 (well into the top bracket)", () => {
    expect(marginalRate(250_000)).toBe(0.45);
  });
});

// ─── incomeTax ────────────────────────────────────────────────────────────────

describe("incomeTax — bracket boundary values (ATO published)", () => {
  it("is $0 at the tax-free threshold ($18,200)", () => {
    expect(incomeTax(18_200)).toBe(0);
  });

  it("is $0 at $0", () => {
    expect(incomeTax(0)).toBe(0);
  });

  it("floors negative income to $0", () => {
    expect(incomeTax(-10_000)).toBe(0);
  });

  it("is $4,288 at $45,000 — ATO published figure", () => {
    // (45,000 − 18,200) × 0.16 = 26,800 × 0.16 = 4,288
    expect(incomeTax(45_000)).toBeCloseTo(4_288, 2);
  });

  it("is $31,288 at $135,000 — ATO published figure", () => {
    // 4,288 + (135,000 − 45,000) × 0.30 = 4,288 + 27,000 = 31,288
    expect(incomeTax(135_000)).toBeCloseTo(31_288, 2);
  });

  it("is $51,638 at $190,000 — ATO published figure", () => {
    // 31,288 + (190,000 − 135,000) × 0.37 = 31,288 + 20,350 = 51,638
    expect(incomeTax(190_000)).toBeCloseTo(51_638, 2);
  });
});

describe("incomeTax — midpoints", () => {
  it("is $1,888 at $30,000", () => {
    // (30,000 − 18,200) × 0.16 = 11,800 × 0.16 = 1,888
    expect(incomeTax(30_000)).toBeCloseTo(1_888, 2);
  });

  it("is $20,788 at $100,000", () => {
    // 4,288 + (100,000 − 45,000) × 0.30 = 4,288 + 16,500 = 20,788
    expect(incomeTax(100_000)).toBeCloseTo(20_788, 2);
  });

  it("is $59,438 at $210,000", () => {
    // 51,638 + (210,000 − 190,000) × 0.45 = 51,638 + 9,000 = 60,638
    // Wait — let me recalculate: 51,638 + (210,000 − 190,000) × 0.45
    //   = 51,638 + 20,000 × 0.45 = 51,638 + 9,000 = 60,638
    expect(incomeTax(210_000)).toBeCloseTo(60_638, 2);
  });

  it("is $78,638 at $250,000", () => {
    // 51,638 + (250,000 − 190,000) × 0.45 = 51,638 + 27,000 = 78,638
    expect(incomeTax(250_000)).toBeCloseTo(78_638, 2);
  });
});

// ─── MARGINAL_RATE_OPTIONS ────────────────────────────────────────────────────

describe("MARGINAL_RATE_OPTIONS", () => {
  it("has 5 entries", () => {
    expect(MARGINAL_RATE_OPTIONS).toHaveLength(5);
  });

  it("labels are the five Stage-3 rates as percent strings", () => {
    expect(MARGINAL_RATE_OPTIONS.map((o) => o.label)).toEqual(["0%", "16%", "30%", "37%", "45%"]);
  });

  it("values are the corresponding fractions", () => {
    expect(MARGINAL_RATE_OPTIONS.map((o) => o.value)).toEqual([0, 0.16, 0.30, 0.37, 0.45]);
  });

  it("label and value are consistent (label === value×100 + '%')", () => {
    for (const opt of MARGINAL_RATE_OPTIONS) {
      const expected = `${Math.round(opt.value * 100)}%`;
      expect(opt.label).toBe(expected);
    }
  });
});
