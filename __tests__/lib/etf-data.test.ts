import { describe, it, expect } from "vitest";
import {
  ETF_DATA,
  ALL_TICKERS,
  getETFByTicker,
  getETFsByAssetClass,
  type ETF,
} from "@/lib/etf-data";

// ── data integrity ────────────────────────────────────────────────────────────

describe("ETF_DATA registry", () => {
  it("has at least 20 ETFs", () => {
    expect(ETF_DATA.length).toBeGreaterThanOrEqual(20);
  });

  it("every ETF has all required fields", () => {
    for (const etf of ETF_DATA) {
      expect(etf.ticker, `${etf.ticker}.ticker`).toBeTruthy();
      expect(etf.name, `${etf.ticker}.name`).toBeTruthy();
      expect(etf.provider, `${etf.ticker}.provider`).toBeTruthy();
      expect(etf.assetClass, `${etf.ticker}.assetClass`).toBeTruthy();
      expect(etf.benchmark, `${etf.ticker}.benchmark`).toBeTruthy();
      expect(typeof etf.mer, `${etf.ticker}.mer`).toBe("number");
      expect(etf.aumMillions, `${etf.ticker}.aumMillions`).toBeGreaterThan(0);
      expect(etf.description, `${etf.ticker}.description`).toBeTruthy();
      expect(Array.isArray(etf.highlights), `${etf.ticker}.highlights`).toBe(true);
      expect(Array.isArray(etf.relatedTickers), `${etf.ticker}.relatedTickers`).toBe(true);
    }
  });

  it("tickers are unique", () => {
    const tickers = ETF_DATA.map((e) => e.ticker);
    expect(new Set(tickers).size).toBe(tickers.length);
  });

  it("tickers are uppercase alphanumeric (ASX format)", () => {
    for (const etf of ETF_DATA) {
      expect(etf.ticker, `${etf.ticker} format`).toMatch(/^[A-Z0-9]+$/);
    }
  });

  it("MER values are between 0% and 2% (sanity — Australian ETFs are low cost)", () => {
    for (const etf of ETF_DATA) {
      expect(etf.mer, `${etf.ticker}.mer`).toBeGreaterThanOrEqual(0);
      expect(etf.mer, `${etf.ticker}.mer`).toBeLessThanOrEqual(2);
    }
  });

  it("frankingPercent is 0-100 for every ETF", () => {
    for (const etf of ETF_DATA) {
      expect(etf.frankingPercent, `${etf.ticker}.frankingPercent`).toBeGreaterThanOrEqual(0);
      expect(etf.frankingPercent, `${etf.ticker}.frankingPercent`).toBeLessThanOrEqual(100);
    }
  });

  it("distributionYield is non-negative", () => {
    for (const etf of ETF_DATA) {
      expect(etf.distributionYield, `${etf.ticker}.distributionYield`).toBeGreaterThanOrEqual(0);
    }
  });

  it("inceptionYear is a plausible ASX year (2000–current)", () => {
    const currentYear = new Date().getFullYear();
    for (const etf of ETF_DATA) {
      expect(etf.inceptionYear, `${etf.ticker}.inceptionYear`).toBeGreaterThanOrEqual(2000);
      expect(etf.inceptionYear, `${etf.ticker}.inceptionYear`).toBeLessThanOrEqual(currentYear);
    }
  });

  it("every ETF has at least one highlight", () => {
    for (const etf of ETF_DATA) {
      expect(etf.highlights.length, `${etf.ticker}.highlights`).toBeGreaterThan(0);
    }
  });

  it("distributionFrequency is a recognised value", () => {
    const valid = new Set(["quarterly", "semi-annual", "annual", "monthly"]);
    for (const etf of ETF_DATA) {
      expect(valid.has(etf.distributionFrequency), `${etf.ticker}.distributionFrequency`).toBe(true);
    }
  });
});

// ── ALL_TICKERS ───────────────────────────────────────────────────────────────

describe("ALL_TICKERS", () => {
  it("has the same length as ETF_DATA", () => {
    expect(ALL_TICKERS).toHaveLength(ETF_DATA.length);
  });

  it("matches ETF_DATA tickers in order", () => {
    expect(ALL_TICKERS).toEqual(ETF_DATA.map((e) => e.ticker));
  });
});

// ── getETFByTicker ────────────────────────────────────────────────────────────

describe("getETFByTicker", () => {
  it("returns the matching ETF for an uppercase ticker", () => {
    const etf = getETFByTicker("VAS");
    expect(etf?.ticker).toBe("VAS");
    expect(etf?.provider).toBe("Vanguard");
  });

  it("is case-insensitive", () => {
    const lower = getETFByTicker("vas");
    expect(lower?.ticker).toBe("VAS");
  });

  it("returns undefined for an unknown ticker", () => {
    expect(getETFByTicker("FAKE123")).toBeUndefined();
  });

  it("returns undefined for an empty string", () => {
    expect(getETFByTicker("")).toBeUndefined();
  });
});

// ── getETFsByAssetClass ────────────────────────────────────────────────────────

describe("getETFsByAssetClass", () => {
  it("returns multiple results for australian-shares", () => {
    const result = getETFsByAssetClass("australian-shares");
    expect(result.length).toBeGreaterThan(0);
  });

  it("every returned ETF has the requested assetClass", () => {
    const result = getETFsByAssetClass("bonds");
    for (const etf of result) {
      expect(etf.assetClass).toBe("bonds");
    }
  });

  it("returns an empty array for an unknown class (type cast)", () => {
    const result = getETFsByAssetClass("not-a-class" as ETF["assetClass"]);
    expect(result).toEqual([]);
  });

  it("result is a subset of ETF_DATA", () => {
    const tickers = new Set(ETF_DATA.map((e) => e.ticker));
    for (const etf of getETFsByAssetClass("us-shares")) {
      expect(tickers.has(etf.ticker)).toBe(true);
    }
  });
});
