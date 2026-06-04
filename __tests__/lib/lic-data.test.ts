import { describe, it, expect } from "vitest";

import { ntaPremiumDiscount, LIC_DATA, type LIC } from "@/lib/lic-data";

// A minimal LIC builder so ntaPremiumDiscount cases don't depend on the
// (intentionally fuller) seed rows in LIC_DATA.
function makeLic(overrides: Partial<LIC>): LIC {
  return {
    ticker: "TEST",
    name: "Test LIC",
    manager: "Internal",
    focus: "australian-shares",
    description: "Test",
    ntaPreTaxCents: 100,
    ntaPostTaxCents: 100,
    sharePriceCents: 100,
    managementCostPct: 0.1,
    dividendYield: 3,
    frankingPct: 100,
    aumMillions: 100,
    inceptionYear: 2000,
    highlights: [],
    dataSource: "https://example.com",
    dataAsOf: "2026-05-01",
    ...overrides,
  };
}

describe("ntaPremiumDiscount", () => {
  it("returns a negative percentage when trading at a discount", () => {
    // (850 - 880) / 880 * 100 = -3.4090…
    expect(
      ntaPremiumDiscount(makeLic({ ntaPostTaxCents: 880, sharePriceCents: 850 }))
    ).toBeCloseTo(-3.409, 3);
  });

  it("returns a positive percentage when trading at a premium", () => {
    // (215 - 205) / 205 * 100 = +4.878…
    expect(
      ntaPremiumDiscount(makeLic({ ntaPostTaxCents: 205, sharePriceCents: 215 }))
    ).toBeGreaterThan(0);
  });

  it("returns 0 at exact parity (price === post-tax NTA)", () => {
    expect(
      ntaPremiumDiscount(makeLic({ ntaPostTaxCents: 500, sharePriceCents: 500 }))
    ).toBe(0);
  });

  it("returns 0 when ntaPostTaxCents is 0 (avoids divide-by-zero)", () => {
    expect(
      ntaPremiumDiscount(makeLic({ ntaPostTaxCents: 0, sharePriceCents: 500 }))
    ).toBe(0);
  });

  it("returns 0 when sharePriceCents is 0", () => {
    expect(
      ntaPremiumDiscount(makeLic({ ntaPostTaxCents: 500, sharePriceCents: 0 }))
    ).toBe(0);
  });

  it("returns 0 when fields are missing/falsy", () => {
    expect(
      ntaPremiumDiscount(
        makeLic({
          ntaPostTaxCents: undefined as unknown as number,
          sharePriceCents: undefined as unknown as number,
        })
      )
    ).toBe(0);
  });
});

describe("LIC_DATA integrity", () => {
  it("ships the full set of seeded LICs", () => {
    expect(LIC_DATA.length).toBeGreaterThanOrEqual(15);
  });

  it("has unique, non-empty tickers", () => {
    const tickers = LIC_DATA.map((lic) => lic.ticker);
    for (const ticker of tickers) {
      expect(typeof ticker).toBe("string");
      expect(ticker.length).toBeGreaterThan(0);
    }
    expect(new Set(tickers).size).toBe(tickers.length);
  });

  // Guards against string-as-number drift in the seed data.
  const numericFields: (keyof LIC)[] = [
    "ntaPreTaxCents",
    "ntaPostTaxCents",
    "sharePriceCents",
    "managementCostPct",
    "dividendYield",
    "frankingPct",
    "aumMillions",
    "inceptionYear",
  ];

  it.each(LIC_DATA)("$ticker has finite numeric financial fields", (lic) => {
    for (const field of numericFields) {
      const value = lic[field];
      expect(typeof value).toBe("number");
      expect(Number.isFinite(value as number)).toBe(true);
    }
  });

  it.each(LIC_DATA)("$ticker has frankingPct within 0–100", (lic) => {
    expect(lic.frankingPct).toBeGreaterThanOrEqual(0);
    expect(lic.frankingPct).toBeLessThanOrEqual(100);
  });

  it.each(LIC_DATA)("$ticker has a parseable dataAsOf date", (lic) => {
    const parsed = new Date(lic.dataAsOf);
    expect(Number.isNaN(parsed.getTime())).toBe(false);
  });
});
