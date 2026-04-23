import { describe, it, expect } from "vitest";
import {
  SECTORS,
  TICKER_MAP,
  lookupTicker,
  isFrankedDividend,
  estimatedFrankingRate,
} from "@/lib/ticker-sectors";

describe("SECTORS + TICKER_MAP", () => {
  it("SECTORS covers all core categories", () => {
    expect(SECTORS).toContain("Financials");
    expect(SECTORS).toContain("Mining");
    expect(SECTORS).toContain("Healthcare");
    expect(SECTORS).toContain("ETF - Broad Market");
  });

  it("every ticker's sector is one of the SECTORS enum values", () => {
    for (const [sym, info] of Object.entries(TICKER_MAP)) {
      expect(
        (SECTORS as readonly string[]).includes(info.sector),
        `${sym}.sector=${info.sector}`,
      ).toBe(true);
    }
  });

  it("every ticker has a country in the allowed set", () => {
    for (const [sym, info] of Object.entries(TICKER_MAP)) {
      expect(
        ["AU", "US", "International"].includes(info.country),
        `${sym}.country=${info.country}`,
      ).toBe(true);
    }
  });

  it("every yield is a plausible decimal (0–0.15)", () => {
    for (const [sym, info] of Object.entries(TICKER_MAP)) {
      expect(info.dividend_yield_est, sym).toBeGreaterThanOrEqual(0);
      expect(info.dividend_yield_est, sym).toBeLessThanOrEqual(0.15);
    }
  });
});

describe("lookupTicker", () => {
  it("returns undefined for unknown tickers", () => {
    expect(lookupTicker("WHATEVER")).toBeUndefined();
  });

  it("returns info for a known ASX ticker", () => {
    const bhp = lookupTicker("BHP");
    expect(bhp?.sector).toBe("Mining");
    expect(bhp?.country).toBe("AU");
  });

  it("is case-insensitive", () => {
    expect(lookupTicker("bhp")?.sector).toBe("Mining");
    expect(lookupTicker("Bhp")?.sector).toBe("Mining");
  });

  it("strips .AX suffix", () => {
    expect(lookupTicker("BHP.AX")?.sector).toBe("Mining");
    expect(lookupTicker("bhp.ax")?.sector).toBe("Mining");
  });

  it("trims whitespace", () => {
    expect(lookupTicker("  BHP  ")?.sector).toBe("Mining");
  });
});

describe("isFrankedDividend", () => {
  it("is true for a big AU dividend stock", () => {
    expect(isFrankedDividend("CBA")).toBe(true);
    expect(isFrankedDividend("NAB")).toBe(true);
  });

  it("is false for unknown tickers", () => {
    expect(isFrankedDividend("UNKNOWN")).toBe(false);
  });

  it("is false for AU ETFs (franking passes through — not tracked here)", () => {
    expect(isFrankedDividend("VAS")).toBe(false);
  });

  it("is false for US stocks", () => {
    expect(isFrankedDividend("NVDA")).toBe(false);
  });

  it("is false for AU stocks with negligible yield (< 1%)", () => {
    // XRO has dividend_yield_est: 0.0
    expect(isFrankedDividend("XRO")).toBe(false);
  });
});

describe("estimatedFrankingRate", () => {
  it("returns 1.0 for franked stocks (assume fully franked)", () => {
    expect(estimatedFrankingRate("CBA")).toBe(1.0);
  });

  it("returns 0 for unfranked or unknown", () => {
    expect(estimatedFrankingRate("NVDA")).toBe(0);
    expect(estimatedFrankingRate("UNKNOWN")).toBe(0);
    expect(estimatedFrankingRate("VAS")).toBe(0);
  });
});
