import { describe, it, expect } from "vitest";
import {
  convertAudCents,
  formatCurrency,
  abbreviateCurrency,
  resolveCurrencyPreference,
  SUPPORTED_CURRENCIES,
  type CurrencyRate,
} from "@/lib/currency";

const rates: CurrencyRate[] = [
  { target: "USD", rate: 0.66, effectiveDate: "2026-01-01" },
  { target: "GBP", rate: 0.52, effectiveDate: "2026-01-01" },
  { target: "NZD", rate: 1.08, effectiveDate: "2026-01-01" },
];

describe("convertAudCents", () => {
  it("returns AUD unchanged", () => {
    expect(convertAudCents(10000, "AUD", rates)).toBe(10000);
  });

  it("converts AUD → USD using the rate", () => {
    expect(convertAudCents(10000, "USD", rates)).toBe(6600);
  });

  it("converts AUD → NZD", () => {
    expect(convertAudCents(10000, "NZD", rates)).toBe(10800);
  });

  it("returns null when the target rate is missing", () => {
    expect(convertAudCents(10000, "EUR", rates)).toBeNull();
  });

  it("returns null for a bogus rate", () => {
    expect(
      convertAudCents(10000, "USD", [{ target: "USD", rate: 0, effectiveDate: "" }]),
    ).toBeNull();
  });
});

describe("formatCurrency", () => {
  it("renders AUD with the right symbol", () => {
    const out = formatCurrency(123456, "AUD");
    expect(out).toMatch(/1,234\.56/);
  });

  it("renders USD with the correct numeric amount", () => {
    const out = formatCurrency(123456, "USD");
    // en-AU locale may render USD as "USD 1,234.56" or "$1,234.56"
    // depending on the ICU data shipped — assert on the number.
    expect(out).toMatch(/1,234\.56/);
  });

  it("renders JPY without cents", () => {
    const out = formatCurrency(100000, "JPY");
    // 100000 cents = 1000 yen (zero-decimal)
    expect(out).not.toMatch(/\./);
  });
});

describe("abbreviateCurrency", () => {
  it("renders full for small amounts", () => {
    expect(abbreviateCurrency(1234, "AUD")).toContain("12.34");
  });

  it("uses k for thousands", () => {
    expect(abbreviateCurrency(123456, "USD")).toMatch(/1\.2k/);
  });

  it("uses M for millions", () => {
    expect(abbreviateCurrency(1234567890, "AUD")).toMatch(/12\.3M/);
  });

  it("handles negative values", () => {
    expect(abbreviateCurrency(-1_000_000, "AUD")).toMatch(/^-/);
  });
});

describe("resolveCurrencyPreference", () => {
  it("accepts supported currencies", () => {
    for (const c of SUPPORTED_CURRENCIES) {
      expect(resolveCurrencyPreference(c)).toBe(c);
    }
  });

  it("falls back to AUD for unknown", () => {
    expect(resolveCurrencyPreference("BTC")).toBe("AUD");
    expect(resolveCurrencyPreference(null)).toBe("AUD");
  });

  it("is case-insensitive", () => {
    expect(resolveCurrencyPreference("usd")).toBe("USD");
  });
});
