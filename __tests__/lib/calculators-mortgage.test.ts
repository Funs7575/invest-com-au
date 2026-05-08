/**
 * Unit tests for lib/calculators/mortgage.ts
 *
 * Reference: ASIC MoneySmart mortgage calculator
 * https://moneysmart.gov.au/home-loans/mortgage-calculator
 * APRA APG 223 serviceability buffer (+3pp)
 * https://www.apra.gov.au/sites/default/files/apg_223_residential_mortgage_lending.pdf
 */
import { describe, it, expect } from "vitest";
import {
  piMonthlyRepayment,
  ioMonthlyRepayment,
  computeMortgage,
  buildStressScenarios,
  APRA_SERVICEABILITY_BUFFER_PP,
} from "@/lib/calculators/mortgage";

describe("APRA_SERVICEABILITY_BUFFER_PP", () => {
  it("is 3 percentage points per APG 223", () => {
    expect(APRA_SERVICEABILITY_BUFFER_PP).toBe(3);
  });
});

describe("piMonthlyRepayment", () => {
  // ASIC MoneySmart reference: $500,000 at 6% p.a. over 30 years ≈ $2,998/month
  it("matches ASIC MoneySmart reference: $500k 6% 30yr", () => {
    expect(piMonthlyRepayment(500_000, 6, 30)).toBeCloseTo(2997.75, 0);
  });

  it("$300k at 5% over 25 years", () => {
    // Standard amortisation: r=0.05/12, n=300
    const r = 0.05 / 12;
    const n = 300;
    const expected = (300_000 * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    expect(piMonthlyRepayment(300_000, 5, 25)).toBeCloseTo(expected, 2);
  });

  it("zero rate uses straight-line principal repayment", () => {
    // P/n = 500000 / (30 × 12) = 1388.89
    expect(piMonthlyRepayment(500_000, 0, 30)).toBeCloseTo(1388.89, 1);
  });

  it("zero principal returns 0", () => {
    expect(piMonthlyRepayment(0, 6, 30)).toBe(0);
  });

  it("zero term returns 0", () => {
    expect(piMonthlyRepayment(500_000, 6, 0)).toBe(0);
  });

  it("negative principal is floored to 0", () => {
    expect(piMonthlyRepayment(-100_000, 6, 30)).toBe(0);
  });
});

describe("ioMonthlyRepayment", () => {
  it("$500k at 6% p.a. IO = $2,500/month", () => {
    // 500000 × 0.06 / 12 = 2500
    expect(ioMonthlyRepayment(500_000, 6)).toBeCloseTo(2_500, 2);
  });

  it("$300k at 5.5% p.a. IO", () => {
    expect(ioMonthlyRepayment(300_000, 5.5)).toBeCloseTo(1375, 2);
  });

  it("zero rate returns 0", () => {
    expect(ioMonthlyRepayment(500_000, 0)).toBe(0);
  });

  it("zero principal returns 0", () => {
    expect(ioMonthlyRepayment(0, 6)).toBe(0);
  });
});

describe("computeMortgage — P&I defaults", () => {
  it("$500k 6% 30yr headline numbers", () => {
    const r = computeMortgage({ principal: 500_000, annualRatePct: 6, termYears: 30 });
    expect(r.type).toBe("pi");
    expect(r.monthlyRepayment).toBeCloseTo(2997.75, 0);
    expect(r.totalRepaid).toBeCloseTo(2997.75 * 360, 0);
    expect(r.totalInterest).toBeCloseTo(r.totalRepaid - 500_000, 0);
    expect(r.totalCost).toBe(r.totalRepaid);
  });

  it("echoes principal, annualRatePct, termYears", () => {
    const r = computeMortgage({ principal: 400_000, annualRatePct: 5.5, termYears: 25 });
    expect(r.principal).toBe(400_000);
    expect(r.annualRatePct).toBe(5.5);
    expect(r.termYears).toBe(25);
  });

  it("total cost equals total repaid for P&I", () => {
    const r = computeMortgage({ principal: 350_000, annualRatePct: 7, termYears: 20 });
    expect(r.totalCost).toBeCloseTo(r.totalRepaid, 6);
  });
});

describe("computeMortgage — Interest-Only", () => {
  it("monthly IO repayment for $500k at 6%", () => {
    const r = computeMortgage({ principal: 500_000, annualRatePct: 6, termYears: 5, type: "io" });
    expect(r.type).toBe("io");
    expect(r.monthlyRepayment).toBeCloseTo(2_500, 2);
  });

  it("total cost = total repaid + principal for IO (principal still owed)", () => {
    const r = computeMortgage({ principal: 500_000, annualRatePct: 6, termYears: 5, type: "io" });
    expect(r.totalCost).toBeCloseTo(r.totalRepaid + 500_000, 2);
  });

  it("total interest equals total repaid for IO", () => {
    const r = computeMortgage({ principal: 300_000, annualRatePct: 5, termYears: 10, type: "io" });
    expect(r.totalInterest).toBeCloseTo(r.totalRepaid, 6);
  });
});

describe("buildStressScenarios — APRA buffer", () => {
  const base = { principal: 500_000, annualRatePct: 6, termYears: 30 };

  it("includes base scenario (offset 0) in output", () => {
    const scenarios = buildStressScenarios(base, [0, 1, 2, 3]);
    const baseScenario = scenarios.find((s) => s.offsetPp === 0);
    expect(baseScenario).toBeDefined();
    expect(baseScenario!.monthlyDelta).toBeCloseTo(0, 6);
  });

  it("+3pp APRA buffer scenario shows positive monthly delta", () => {
    const scenarios = buildStressScenarios(base, [0, 1, 2, 3]);
    const apraScenario = scenarios.find((s) => s.offsetPp === 3);
    expect(apraScenario).toBeDefined();
    expect(apraScenario!.effectiveRatePct).toBe(9);
    expect(apraScenario!.monthlyDelta).toBeGreaterThan(0);
  });

  it("each scenario's effectiveRatePct = base + offsetPp", () => {
    const scenarios = buildStressScenarios(base, [0, 1, 2, 3]);
    for (const s of scenarios) {
      expect(s.effectiveRatePct).toBeCloseTo(base.annualRatePct + s.offsetPp, 6);
    }
  });

  it("negative offset floors effective rate at 0.1% minimum", () => {
    const lowBase = { principal: 100_000, annualRatePct: 0.5, termYears: 20 };
    const scenarios = buildStressScenarios(lowBase, [-2]);
    expect(scenarios[0]!.effectiveRatePct).toBe(0.1);
  });

  it("monthly delta is negative for rate cuts", () => {
    const scenarios = buildStressScenarios(base, [-1]);
    expect(scenarios[0]!.monthlyDelta).toBeLessThan(0);
  });

  it("returns correct number of scenarios", () => {
    const scenarios = buildStressScenarios(base, [0, 1, 2, 3]);
    expect(scenarios).toHaveLength(4);
  });
});
