/**
 * Unit tests for lib/calculators/cgt.ts
 *
 * Reference: ATO "CGT discount" worked examples
 * https://www.ato.gov.au/individuals-and-families/investments-and-assets/capital-gains-tax/cgt-discount
 */
import { describe, it, expect } from "vitest";
import {
  computeCgt,
  CGT_DISCOUNT_INDIVIDUAL,
  CGT_DISCOUNT_SUPER,
  type CgtInput,
} from "@/lib/calculators/cgt";

describe("computeCgt — constants", () => {
  it("individual discount is 50%", () => {
    expect(CGT_DISCOUNT_INDIVIDUAL).toBe(0.5);
  });

  it("super discount is 1/3 (33.33%)", () => {
    expect(CGT_DISCOUNT_SUPER).toBeCloseTo(1 / 3, 10);
  });
});

describe("computeCgt — zero gain", () => {
  it("returns all zeros when gain is 0", () => {
    const r = computeCgt({ gain: 0, marginalRate: 0.37, held12Months: true });
    expect(r.gain).toBe(0);
    expect(r.taxWithoutDiscount).toBe(0);
    expect(r.taxWithDiscount).toBe(0);
    expect(r.discountedGain).toBe(0);
    expect(r.taxSaved).toBe(0);
    expect(r.effectiveRateWithoutDiscount).toBe(0);
    expect(r.effectiveRateWithDiscount).toBe(0);
  });

  it("floors negative gain to 0", () => {
    const r = computeCgt({ gain: -1000, marginalRate: 0.37, held12Months: false });
    expect(r.gain).toBe(0);
    expect(r.taxWithoutDiscount).toBe(0);
  });
});

describe("computeCgt — no discount (held < 12 months)", () => {
  it("full gain is taxed at marginal rate", () => {
    const r = computeCgt({ gain: 50_000, marginalRate: 0.47, held12Months: false });
    expect(r.taxWithoutDiscount).toBeCloseTo(23_500, 2);
    expect(r.taxWithDiscount).toBeCloseTo(23_500, 2);
    expect(r.discountedGain).toBe(50_000);
    expect(r.taxSaved).toBeCloseTo(0, 2);
  });

  it("effective rates without and with discount are equal", () => {
    const r = computeCgt({ gain: 100_000, marginalRate: 0.32, held12Months: false });
    expect(r.effectiveRateWithoutDiscount).toBeCloseTo(32, 4);
    expect(r.effectiveRateWithDiscount).toBeCloseTo(32, 4);
  });
});

describe("computeCgt — individual 50% CGT discount (ATO reference case)", () => {
  // ATO example: $50,000 gross gain, 47% marginal rate, held > 12mo
  // Discounted gain = $25,000; tax = $11,750; saving = $11,750
  it("matches ATO worked example", () => {
    const r = computeCgt({ gain: 50_000, marginalRate: 0.47, held12Months: true });
    expect(r.discountedGain).toBeCloseTo(25_000, 2);
    expect(r.taxWithDiscount).toBeCloseTo(11_750, 2);
    expect(r.taxWithoutDiscount).toBeCloseTo(23_500, 2);
    expect(r.taxSaved).toBeCloseTo(11_750, 2);
  });

  it("holder='individual' is the same as the default", () => {
    const withDefault = computeCgt({ gain: 80_000, marginalRate: 0.37, held12Months: true });
    const withExplicit = computeCgt({
      gain: 80_000,
      marginalRate: 0.37,
      held12Months: true,
      holder: "individual",
    });
    expect(withDefault.taxWithDiscount).toBeCloseTo(withExplicit.taxWithDiscount, 6);
  });

  it("effective rate with discount is half the marginal rate", () => {
    const mr = 0.37;
    const r = computeCgt({ gain: 50_000, marginalRate: mr, held12Months: true });
    // With 50% discount applied to gain, effective rate on gross gain = 37% × 50% = 18.5%
    expect(r.effectiveRateWithDiscount).toBeCloseTo(mr * 50, 4);
  });
});

describe("computeCgt — super fund 33.33% CGT discount", () => {
  it("applies one-third discount to gain", () => {
    // $90,000 gain; discounted = $60,000 (2/3 of gain)
    const r = computeCgt({ gain: 90_000, marginalRate: 0.15, held12Months: true, holder: "super" });
    expect(r.discountedGain).toBeCloseTo(60_000, 2);
    expect(r.taxWithDiscount).toBeCloseTo(9_000, 2);
  });

  it("super discount saves less than individual discount", () => {
    const base: CgtInput = { gain: 50_000, marginalRate: 0.47, held12Months: true };
    const individual = computeCgt(base);
    const super_ = computeCgt({ ...base, holder: "super" });
    expect(super_.taxSaved).toBeLessThan(individual.taxSaved);
    expect(super_.taxWithDiscount).toBeGreaterThan(individual.taxWithDiscount);
  });
});

describe("computeCgt — boundary inputs", () => {
  it("marginal rate of 0 produces zero tax", () => {
    const r = computeCgt({ gain: 100_000, marginalRate: 0, held12Months: false });
    expect(r.taxWithoutDiscount).toBe(0);
    expect(r.taxWithDiscount).toBe(0);
    expect(r.taxSaved).toBe(0);
  });

  it("floors negative marginal rate to 0", () => {
    const r = computeCgt({ gain: 10_000, marginalRate: -0.1, held12Months: false });
    expect(r.taxWithoutDiscount).toBe(0);
  });

  it("caps marginal rate at 100% (1.0)", () => {
    const r = computeCgt({ gain: 10_000, marginalRate: 1.5, held12Months: false });
    expect(r.taxWithoutDiscount).toBeCloseTo(10_000, 2);
  });

  it("handles large gains (> AUD 1M)", () => {
    const r = computeCgt({ gain: 2_000_000, marginalRate: 0.47, held12Months: true });
    expect(r.discountedGain).toBeCloseTo(1_000_000, 0);
    expect(r.taxWithDiscount).toBeCloseTo(470_000, 0);
  });
});
