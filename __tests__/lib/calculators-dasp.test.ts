/**
 * Unit tests for lib/calculators/dasp.ts
 *
 * Reference: ATO "Tax on a departing Australia superannuation payment"
 * (rates for a DASP paid on/after 1 July 2017).
 */
import { describe, it, expect } from "vitest";
import {
  computeDasp,
  DASP_TAXED_ELEMENT_RATE,
  DASP_UNTAXED_ELEMENT_RATE,
  DASP_WHM_RATE,
} from "@/lib/calculators/dasp";

describe("computeDasp — constants", () => {
  it("taxed element rate is 35%", () => {
    expect(DASP_TAXED_ELEMENT_RATE).toBe(0.35);
  });
  it("untaxed element rate is 45%", () => {
    expect(DASP_UNTAXED_ELEMENT_RATE).toBe(0.45);
  });
  it("working holiday maker rate is 65%", () => {
    expect(DASP_WHM_RATE).toBe(0.65);
  });
});

describe("computeDasp — ordinary temporary resident (non-WHM)", () => {
  it("taxes a pure taxed-element balance at 35%", () => {
    const r = computeDasp({ taxedElement: 100_000 });
    expect(r.grossBalance).toBe(100_000);
    expect(r.taxableComponent).toBe(100_000);
    expect(r.totalTax).toBeCloseTo(35_000, 2);
    expect(r.netPayment).toBeCloseTo(65_000, 2);
    expect(r.effectiveRate).toBeCloseTo(0.35, 6);
    expect(r.isWorkingHolidayMaker).toBe(false);
  });

  it("taxes the untaxed element at 45%", () => {
    const r = computeDasp({ taxedElement: 0, untaxedElement: 20_000 });
    expect(r.taxOnUntaxedElement).toBeCloseTo(9_000, 2);
    expect(r.totalTax).toBeCloseTo(9_000, 2);
    expect(r.netPayment).toBeCloseTo(11_000, 2);
  });

  it("blends taxed (35%) + untaxed (45%) elements", () => {
    const r = computeDasp({ taxedElement: 80_000, untaxedElement: 20_000 });
    // 80k*0.35 + 20k*0.45 = 28,000 + 9,000 = 37,000
    expect(r.taxOnTaxedElement).toBeCloseTo(28_000, 2);
    expect(r.taxOnUntaxedElement).toBeCloseTo(9_000, 2);
    expect(r.totalTax).toBeCloseTo(37_000, 2);
    expect(r.netPayment).toBeCloseTo(63_000, 2);
    expect(r.effectiveRate).toBeCloseTo(0.37, 6);
  });

  it("never taxes the tax-free component", () => {
    const r = computeDasp({ taxedElement: 50_000, taxFreeComponent: 30_000 });
    expect(r.grossBalance).toBe(80_000);
    expect(r.taxFreeComponent).toBe(30_000);
    // only the 50k taxed element is taxed: 50k*0.35 = 17,500
    expect(r.totalTax).toBeCloseTo(17_500, 2);
    expect(r.netPayment).toBeCloseTo(62_500, 2);
    // effective rate is over the whole balance, not just the taxable part
    expect(r.effectiveRate).toBeCloseTo(17_500 / 80_000, 6);
  });
});

describe("computeDasp — Working Holiday Maker (DASP WHM payment)", () => {
  it("taxes the whole taxable component at 65%", () => {
    const r = computeDasp({ taxedElement: 100_000, isWorkingHolidayMaker: true });
    expect(r.totalTax).toBeCloseTo(65_000, 2);
    expect(r.netPayment).toBeCloseTo(35_000, 2);
    expect(r.effectiveRate).toBeCloseTo(0.65, 6);
    expect(r.isWorkingHolidayMaker).toBe(true);
  });

  it("taxes both taxed and untaxed elements at 65% for WHM", () => {
    const r = computeDasp({
      taxedElement: 80_000,
      untaxedElement: 20_000,
      isWorkingHolidayMaker: true,
    });
    expect(r.taxOnTaxedElement).toBeCloseTo(52_000, 2); // 80k*0.65
    expect(r.taxOnUntaxedElement).toBeCloseTo(13_000, 2); // 20k*0.65
    expect(r.totalTax).toBeCloseTo(65_000, 2);
  });

  it("still does not tax the tax-free component for WHM", () => {
    const r = computeDasp({
      taxedElement: 100_000,
      taxFreeComponent: 10_000,
      isWorkingHolidayMaker: true,
    });
    expect(r.grossBalance).toBe(110_000);
    expect(r.totalTax).toBeCloseTo(65_000, 2); // tax-free untouched
    expect(r.netPayment).toBeCloseTo(45_000, 2);
  });
});

describe("computeDasp — edge cases", () => {
  it("returns all zeros for a zero balance", () => {
    const r = computeDasp({ taxedElement: 0 });
    expect(r.grossBalance).toBe(0);
    expect(r.totalTax).toBe(0);
    expect(r.netPayment).toBe(0);
    expect(r.effectiveRate).toBe(0);
  });

  it("floors negative inputs to 0", () => {
    const r = computeDasp({
      taxedElement: -50_000,
      untaxedElement: -10_000,
      taxFreeComponent: -5_000,
    });
    expect(r.grossBalance).toBe(0);
    expect(r.totalTax).toBe(0);
    expect(r.netPayment).toBe(0);
  });

  it("treats missing optional fields as 0", () => {
    const r = computeDasp({ taxedElement: 10_000 });
    expect(r.taxableComponent).toBe(10_000);
    expect(r.taxFreeComponent).toBe(0);
    expect(r.taxOnUntaxedElement).toBe(0);
  });
});
