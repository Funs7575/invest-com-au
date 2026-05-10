import { describe, it, expect } from "vitest";
import { computeHealthScore, type HoldingForScore } from "@/lib/holdings/health-score";

const todayMinus = (days: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
};

const h = (overrides: Partial<HoldingForScore> = {}): HoldingForScore => ({
  ticker: "BHP.AX",
  exchange: "ASX",
  shares: 100,
  costBasisPerShareCents: 4500_00,
  acquiredAt: todayMinus(180),
  ...overrides,
});

describe("computeHealthScore", () => {
  it("returns the empty-portfolio response when no holdings", () => {
    const r = computeHealthScore([]);
    expect(r.overallScore).toBe(0);
    expect(r.callouts[0]).toMatch(/Add some holdings/);
  });

  it("flags single-position concentration", () => {
    const r = computeHealthScore([h({ ticker: "ALL-IN", shares: 1000 })]);
    expect(r.callouts.some((c) => /largest position/.test(c))).toBe(true);
    expect(r.diversificationScore).toBeLessThan(50);
  });

  it("scores a 10-position evenly-weighted portfolio higher than a top-heavy one", () => {
    const even: HoldingForScore[] = Array.from({ length: 10 }, (_, i) =>
      h({ ticker: `T${i}`, shares: 100, costBasisPerShareCents: 1000_00, acquiredAt: todayMinus(30 + i * 30) }),
    );
    const heavy: HoldingForScore[] = [
      h({ ticker: "BIG", shares: 9000, costBasisPerShareCents: 1000_00 }),
      ...Array.from({ length: 9 }, (_, i) => h({ ticker: `T${i}`, shares: 1, costBasisPerShareCents: 1000_00 })),
    ];
    expect(computeHealthScore(even).diversificationScore).toBeGreaterThan(
      computeHealthScore(heavy).diversificationScore,
    );
  });

  it("flags 100% AU concentration", () => {
    const r = computeHealthScore([
      h({ ticker: "BHP.AX", exchange: "ASX" }),
      h({ ticker: "CBA.AX", exchange: "ASX" }),
      h({ ticker: "WBC.AX", exchange: "ASX" }),
    ]);
    expect(r.callouts.some((c) => /Every holding is AU-listed/.test(c))).toBe(true);
  });

  it("flags 0% AU when only international names", () => {
    const r = computeHealthScore([
      h({ ticker: "AAPL", exchange: "NASDAQ" }),
      h({ ticker: "MSFT", exchange: "NASDAQ" }),
    ]);
    expect(r.callouts.some((c) => /No AU-listed/.test(c))).toBe(true);
  });

  it("rewards a balanced AU/global mix with a high exchangeSpreadScore", () => {
    const balanced = computeHealthScore([
      h({ ticker: "BHP.AX", shares: 100, exchange: "ASX" }),
      h({ ticker: "AAPL", shares: 100, exchange: "NASDAQ", costBasisPerShareCents: 4500_00 }),
    ]);
    const auOnly = computeHealthScore([
      h({ ticker: "BHP.AX", exchange: "ASX" }),
    ]);
    expect(balanced.exchangeSpreadScore).toBeGreaterThan(auOnly.exchangeSpreadScore);
  });

  it("rewards holdings spread across acquired_at dates over recent-only", () => {
    const spread = computeHealthScore(
      [10, 90, 200, 365].map((d, i) =>
        h({ ticker: `T${i}`, acquiredAt: todayMinus(d) }),
      ),
    );
    const allRecent = computeHealthScore(
      [1, 2, 3, 4].map((d, i) => h({ ticker: `T${i}`, acquiredAt: todayMinus(d) })),
    );
    expect(spread.ageDiversityScore).toBeGreaterThan(allRecent.ageDiversityScore);
  });

  it("flags fewer-than-3-positions portfolios", () => {
    const r = computeHealthScore([h(), h({ ticker: "BHP2" })]);
    expect(r.callouts.some((c) => /Only 2 positions/.test(c))).toBe(true);
  });

  it("clamps overall score between 0 and 100", () => {
    const r = computeHealthScore([h()]);
    expect(r.overallScore).toBeGreaterThanOrEqual(0);
    expect(r.overallScore).toBeLessThanOrEqual(100);
  });
});
