import { describe, it, expect } from "vitest";
import { projectFeeImpact, buildFeeImpactSeries } from "@/components/FeeImpactChart";

describe("projectFeeImpact", () => {
  it("returns one balance per year", () => {
    const series = projectFeeImpact(50_000, 0.001, 0.07, 10);
    expect(series).toHaveLength(10);
  });

  it("grows the balance over time with a positive net return", () => {
    const series = projectFeeImpact(50_000, 0.001, 0.07, 10);
    // 7% growth minus a 0.10% fee is comfortably positive, so the final
    // balance must exceed the starting balance and rise monotonically.
    expect(series[0]!).toBeGreaterThan(50_000);
    expect(series[9]!).toBeGreaterThan(series[0]!);
  });

  it("year one applies growth then deducts the fee on the grown balance", () => {
    // 50,000 * 1.07 = 53,500, then * (1 - 0.003) = 53,339.50
    const series = projectFeeImpact(50_000, 0.003, 0.07, 1);
    expect(series[0]!).toBeCloseTo(53_339.5, 2);
  });

  it("a higher fee always leaves less money than a lower fee", () => {
    const low = projectFeeImpact(50_000, 0.001, 0.07, 10);
    const high = projectFeeImpact(50_000, 0.003, 0.07, 10);
    expect(high[9]!).toBeLessThan(low[9]!);
  });

  it("a zero fee equals pure compounding at the gross return", () => {
    const series = projectFeeImpact(10_000, 0, 0.05, 3);
    expect(series[2]!).toBeCloseTo(10_000 * Math.pow(1.05, 3), 6);
  });
});

describe("buildFeeImpactSeries", () => {
  it("produces a point for every year with both fee balances", () => {
    const points = buildFeeImpactSeries(50_000, 0.001, 0.003, 0.07, 10);
    expect(points).toHaveLength(10);
    expect(points[0]!.year).toBe(1);
    expect(points[9]!.year).toBe(10);
  });

  it("the lower-fee balance stays at or above the higher-fee balance every year", () => {
    const points = buildFeeImpactSeries(50_000, 0.001, 0.003, 0.07, 10);
    for (const p of points) {
      expect(p.balanceA).toBeGreaterThanOrEqual(p.balanceB);
    }
  });

  it("the drag widens over time as fees compound", () => {
    const points = buildFeeImpactSeries(50_000, 0.001, 0.003, 0.07, 10);
    const firstGap = points[0]!.balanceA - points[0]!.balanceB;
    const lastGap = points[9]!.balanceA - points[9]!.balanceB;
    expect(lastGap).toBeGreaterThan(firstGap);
  });

  it("identical fee rates produce no drag", () => {
    const points = buildFeeImpactSeries(50_000, 0.002, 0.002, 0.07, 5);
    for (const p of points) {
      expect(p.balanceA).toBeCloseTo(p.balanceB, 6);
    }
  });
});
