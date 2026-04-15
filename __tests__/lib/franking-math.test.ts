import { describe, it, expect } from "vitest";
import {
  computeFranking,
  computeFrankingForPortfolio,
  CORPORATE_TAX_RATE_DEFAULT,
} from "@/lib/franking-math";

describe("computeFranking — baseline cases", () => {
  it("fully franked at the corporate rate → break-even net yield", () => {
    // If the investor's effective rate equals the corporate rate,
    // the tax on grossed-up income exactly offsets the credit, so
    // net = cash dividend.
    const r = computeFranking({
      dividend: 100,
      frankingPct: 100,
      marginalRate: 0.30 - 0.02, // minus medicare so effective = 30%
      // includeMedicare defaults to true → 28% + 2% = 30%
    });
    expect(r.frankingCredit).toBeCloseTo(100 / 0.7 - 100, 4);
    expect(r.netAfterTax).toBeCloseTo(100, 4);
    expect(r.excessCredits).toBeCloseTo(0, 4);
  });

  it("zero dividend returns all zeros", () => {
    const r = computeFranking({
      dividend: 0,
      frankingPct: 100,
      marginalRate: 0.32,
    });
    expect(r.dividend).toBe(0);
    expect(r.frankingCredit).toBe(0);
    expect(r.netAfterTax).toBe(0);
    expect(r.netYieldPct).toBe(0);
  });

  it("unfranked dividend: netAfterTax = dividend * (1 - marginal)", () => {
    const r = computeFranking({
      dividend: 100,
      frankingPct: 0,
      marginalRate: 0.30,
      includeMedicare: false,
    });
    expect(r.frankingCredit).toBe(0);
    expect(r.netAfterTax).toBeCloseTo(70, 4);
  });
});

describe("computeFranking — refund case (marginal < corporate)", () => {
  it("0% marginal investor keeps the full grossed-up amount", () => {
    // Retirees in pension phase with 0% tax should get back the
    // full credit. Grossed-up = 100 / 0.7 ≈ 142.86.
    const r = computeFranking({
      dividend: 100,
      frankingPct: 100,
      marginalRate: 0,
      includeMedicare: false,
    });
    expect(r.grossedUp).toBeCloseTo(100 / 0.7, 3);
    expect(r.netAfterTax).toBeCloseTo(100 / 0.7, 3);
    expect(r.excessCredits).toBeGreaterThan(40);
    expect(r.netYieldPct).toBeGreaterThan(140);
  });

  it("19% marginal investor gets a partial refund", () => {
    const r = computeFranking({
      dividend: 100,
      frankingPct: 100,
      marginalRate: 0.19,
      includeMedicare: false,
    });
    // Gross = 142.86. Tax @ 19% = 27.14. Net = 115.71.
    expect(r.netAfterTax).toBeCloseTo(142.857 * 0.81, 2);
    expect(r.excessCredits).toBeGreaterThan(0);
  });
});

describe("computeFranking — tax-owed case (marginal > corporate)", () => {
  it("45% marginal investor still benefits from the credit but owes tax", () => {
    const r = computeFranking({
      dividend: 100,
      frankingPct: 100,
      marginalRate: 0.45,
      includeMedicare: false,
    });
    // Gross 142.86, tax @ 45% = 64.29, net = 78.57.
    expect(r.netAfterTax).toBeCloseTo(142.857 * 0.55, 2);
    expect(r.excessCredits).toBeLessThan(0);
    // Effective tax on the cash dividend is ~21% (much less than
    // 45% because the credit already paid some of it).
    expect(r.effectiveTaxRate).toBeGreaterThan(0.2);
    expect(r.effectiveTaxRate).toBeLessThan(0.3);
  });
});

describe("computeFranking — partial franking", () => {
  it("50% franking produces half the credit of fully franked", () => {
    const full = computeFranking({
      dividend: 100,
      frankingPct: 100,
      marginalRate: 0.30,
      includeMedicare: false,
    });
    const half = computeFranking({
      dividend: 100,
      frankingPct: 50,
      marginalRate: 0.30,
      includeMedicare: false,
    });
    expect(half.frankingCredit).toBeCloseTo(full.frankingCredit / 2, 4);
  });

  it("clamps franking pct to 0-100", () => {
    const neg = computeFranking({
      dividend: 100,
      frankingPct: -50,
      marginalRate: 0.30,
    });
    expect(neg.frankingCredit).toBe(0);
    const over = computeFranking({
      dividend: 100,
      frankingPct: 500,
      marginalRate: 0.30,
      includeMedicare: false,
    });
    // Clamped at 100 → full credit
    const full = computeFranking({
      dividend: 100,
      frankingPct: 100,
      marginalRate: 0.30,
      includeMedicare: false,
    });
    expect(over.frankingCredit).toBeCloseTo(full.frankingCredit, 4);
  });
});

describe("computeFranking — medicare levy toggle", () => {
  it("includeMedicare=true (default) adds 2% to the marginal rate", () => {
    const withLevy = computeFranking({
      dividend: 100,
      frankingPct: 0,
      marginalRate: 0.30,
    });
    const withoutLevy = computeFranking({
      dividend: 100,
      frankingPct: 0,
      marginalRate: 0.30,
      includeMedicare: false,
    });
    expect(withLevy.netAfterTax).toBeLessThan(withoutLevy.netAfterTax);
    // Exact delta: 2% of dividend = $2
    expect(withoutLevy.netAfterTax - withLevy.netAfterTax).toBeCloseTo(2, 4);
  });
});

describe("computeFranking — base rate entity (25% corporate)", () => {
  it("applies a smaller gross-up when corporateTaxRate=0.25", () => {
    const r30 = computeFranking({
      dividend: 100,
      frankingPct: 100,
      marginalRate: 0.30,
      includeMedicare: false,
    });
    const r25 = computeFranking({
      dividend: 100,
      frankingPct: 100,
      marginalRate: 0.30,
      corporateTaxRate: 0.25,
      includeMedicare: false,
    });
    // Smaller corporate rate → smaller gross-up → smaller credit
    expect(r25.frankingCredit).toBeLessThan(r30.frankingCredit);
  });
});

describe("computeFrankingForPortfolio", () => {
  it("sums perHolding totals into aggregate values", () => {
    const r = computeFrankingForPortfolio(
      [
        { label: "CBA", dividend: 300, frankingPct: 100 },
        { label: "BHP", dividend: 200, frankingPct: 100 },
        { label: "WES", dividend: 150, frankingPct: 80 },
      ],
      0.325, // 32.5% marginal
    );
    expect(r.perHolding).toHaveLength(3);
    expect(r.totals.dividend).toBeCloseTo(650, 4);
    // Sum-of-parts should equal the totals row arithmetic
    const summedCredit = r.perHolding.reduce(
      (s, p) => s + p.frankingCredit,
      0,
    );
    expect(r.totals.frankingCredit).toBeCloseTo(summedCredit, 4);
  });

  it("effective tax rate on totals matches sum math", () => {
    const r = computeFrankingForPortfolio(
      [
        { dividend: 100, frankingPct: 100 },
        { dividend: 100, frankingPct: 100 },
      ],
      0.19,
      { includeMedicare: false },
    );
    // Two identical holdings, should be identical to a single
    // $200 dividend. Effective rate is negative (refund).
    expect(r.totals.dividend).toBeCloseTo(200, 4);
    const single = computeFrankingForPortfolio(
      [{ dividend: 200, frankingPct: 100 }],
      0.19,
      { includeMedicare: false },
    );
    expect(r.totals.netAfterTax).toBeCloseTo(single.totals.netAfterTax, 4);
  });
});

describe("computeFranking — sanity", () => {
  it("CORPORATE_TAX_RATE_DEFAULT is 30%", () => {
    expect(CORPORATE_TAX_RATE_DEFAULT).toBe(0.30);
  });
});
