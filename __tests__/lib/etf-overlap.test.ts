import { describe, it, expect } from "vitest";
import { computeOverlap, formatWeight, type EtfHolding } from "@/lib/etf-overlap";

const makeHolding = (ticker: string, name: string, weightBps: number): EtfHolding => ({
  ticker,
  securityName: name,
  weightBps,
});

describe("computeOverlap", () => {
  it("returns zero overlap for completely different holdings", () => {
    const a = [makeHolding("BHP", "BHP Group", 500), makeHolding("CBA", "Commonwealth Bank", 400)];
    const b = [makeHolding("AAPL", "Apple", 600), makeHolding("MSFT", "Microsoft", 500)];
    const result = computeOverlap(a, b);
    expect(result.overlapBps).toBe(0);
    expect(result.overlapPct).toBe(0);
    expect(result.overlappingHoldings).toHaveLength(0);
  });

  it("returns 100% overlap for identical holding sets", () => {
    const holdings = [makeHolding("AAPL", "Apple", 500), makeHolding("MSFT", "Microsoft", 300)];
    const result = computeOverlap(holdings, holdings);
    expect(result.overlapPct).toBe(100);
    expect(result.overlappingHoldings).toHaveLength(2);
  });

  it("uses min(wA, wB) for each overlapping ticker", () => {
    const a = [makeHolding("AAPL", "Apple", 800), makeHolding("MSFT", "Microsoft", 600)];
    const b = [makeHolding("AAPL", "Apple", 500), makeHolding("GOOGL", "Alphabet", 400)];
    const result = computeOverlap(a, b);
    // Only AAPL overlaps; min(800, 500) = 500
    expect(result.overlapBps).toBe(500);
    expect(result.overlappingHoldings).toHaveLength(1);
    expect(result.overlappingHoldings[0]?.ticker).toBe("AAPL");
    expect(result.overlappingHoldings[0]?.weightABps).toBe(800);
    expect(result.overlappingHoldings[0]?.weightBBps).toBe(500);
  });

  it("sorts overlapping holdings by average weight descending", () => {
    const a = [
      makeHolding("AAPL", "Apple", 100),
      makeHolding("MSFT", "Microsoft", 500),
      makeHolding("GOOGL", "Alphabet", 300),
    ];
    const b = [
      makeHolding("AAPL", "Apple", 200),
      makeHolding("MSFT", "Microsoft", 600),
      makeHolding("GOOGL", "Alphabet", 400),
    ];
    const result = computeOverlap(a, b);
    expect(result.overlappingHoldings[0]?.ticker).toBe("MSFT");
    expect(result.overlappingHoldings[1]?.ticker).toBe("GOOGL");
    expect(result.overlappingHoldings[2]?.ticker).toBe("AAPL");
  });

  it("computes coveredWeightABps and coveredWeightBBps correctly", () => {
    const a = [makeHolding("AAPL", "Apple", 300), makeHolding("BHP", "BHP", 500)];
    const b = [makeHolding("AAPL", "Apple", 400)];
    const result = computeOverlap(a, b);
    expect(result.coveredWeightABps).toBe(800);
    expect(result.coveredWeightBBps).toBe(400);
  });

  it("normalises overlapPct to the smaller covered weight", () => {
    // A covers 1000 bps; B covers 500 bps; overlap = 200 bps
    const a = [makeHolding("AAPL", "Apple", 500), makeHolding("MSFT", "Microsoft", 500)];
    const b = [makeHolding("AAPL", "Apple", 200), makeHolding("NVDA", "Nvidia", 300)];
    const result = computeOverlap(a, b);
    // overlapBps = min(500, 200) = 200; normBase = min(1000, 500) = 500
    // overlapPct = round(200/500 * 100) = 40
    expect(result.overlapBps).toBe(200);
    expect(result.overlapPct).toBe(40);
  });

  it("caps overlapPct at 100", () => {
    // Identical holdings with same weights
    const h = [makeHolding("X", "X Corp", 1000)];
    const result = computeOverlap(h, h);
    expect(result.overlapPct).toBeLessThanOrEqual(100);
  });

  it("handles empty holdings arrays", () => {
    const result = computeOverlap([], [makeHolding("AAPL", "Apple", 500)]);
    expect(result.overlapBps).toBe(0);
    expect(result.overlapPct).toBe(0);
    expect(result.overlappingHoldings).toHaveLength(0);
  });

  it("VAS vs IOZ — AU equity ETFs show high overlap", () => {
    const vas = [
      makeHolding("BHP", "BHP", 850), makeHolding("CBA", "CBA", 800), makeHolding("CSL", "CSL", 550),
      makeHolding("NAB", "NAB", 450), makeHolding("WBC", "WBC", 380),
    ];
    const ioz = [
      makeHolding("BHP", "BHP", 920), makeHolding("CBA", "CBA", 850), makeHolding("CSL", "CSL", 580),
      makeHolding("NAB", "NAB", 480), makeHolding("WBC", "WBC", 400),
    ];
    const result = computeOverlap(vas, ioz);
    expect(result.overlappingHoldings).toHaveLength(5);
    expect(result.overlapPct).toBeGreaterThan(90);
  });

  it("VGS vs NDQ — share US tech mega-caps", () => {
    const vgs = [
      makeHolding("AAPL", "Apple", 520), makeHolding("MSFT", "Microsoft", 490),
      makeHolding("NVDA", "Nvidia", 420), makeHolding("AMZN", "Amazon", 280),
      makeHolding("JPM", "JPMorgan", 100),
    ];
    const ndq = [
      makeHolding("MSFT", "Microsoft", 850), makeHolding("AAPL", "Apple", 830),
      makeHolding("NVDA", "Nvidia", 780), makeHolding("AMZN", "Amazon", 520),
      makeHolding("NFLX", "Netflix", 190),
    ];
    const result = computeOverlap(vgs, ndq);
    // AAPL, MSFT, NVDA, AMZN all overlap
    expect(result.overlappingHoldings).toHaveLength(4);
    expect(result.overlapPct).toBeGreaterThan(50);
  });
});

describe("formatWeight", () => {
  it("formats 100 bps as 1.0%", () => {
    expect(formatWeight(100)).toBe("1.0%");
  });

  it("formats 850 bps as 8.5%", () => {
    expect(formatWeight(850)).toBe("8.5%");
  });

  it("formats 0 bps as 0.0%", () => {
    expect(formatWeight(0)).toBe("0.0%");
  });

  it("formats 10000 bps as 100.0%", () => {
    expect(formatWeight(10000)).toBe("100.0%");
  });
});
