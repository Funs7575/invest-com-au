import { describe, it, expect } from "vitest";
import {
  convertAudCents,
  formatCurrency,
  formatAUD,
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

  it("falls back to AUD for empty string", () => {
    expect(resolveCurrencyPreference("")).toBe("AUD");
    expect(resolveCurrencyPreference(undefined)).toBe("AUD");
  });
});

describe("formatAUD", () => {
  it("formats whole dollars with default 0 fraction digits", () => {
    expect(formatAUD(1234)).toMatch(/1,234/);
    expect(formatAUD(1234)).not.toMatch(/\.\d/);
  });

  it("formats zero", () => {
    expect(formatAUD(0)).toMatch(/0/);
  });

  it("formats with fractionDigits=2", () => {
    expect(formatAUD(1234.56, 2)).toMatch(/1,234\.56/);
  });

  it("formats large amounts (>$1M)", () => {
    expect(formatAUD(1_500_000)).toMatch(/1,500,000/);
  });

  it("formats negative amounts", () => {
    expect(formatAUD(-500)).toMatch(/-/);
    expect(formatAUD(-500)).toMatch(/500/);
  });
});

describe("convertAudCents — additional edge cases", () => {
  it("handles negative AUD amounts", () => {
    const r = convertAudCents(-5000, "USD", [{ target: "USD", rate: 0.66, effectiveDate: "" }]);
    expect(r).toBe(-3300);
  });

  it("returns 0 for zero input", () => {
    expect(convertAudCents(0, "AUD", [])).toBe(0);
    expect(convertAudCents(0, "USD", [{ target: "USD", rate: 0.66, effectiveDate: "" }])).toBe(0);
  });

  it("handles very large amounts (> AUD 1B in cents)", () => {
    // $1,000,000,000 AUD = 100,000,000,000 cents
    const r = convertAudCents(100_000_000_000, "USD", [
      { target: "USD", rate: 0.66, effectiveDate: "" },
    ]);
    expect(r).toBe(66_000_000_000);
  });
});

describe("formatCurrency — additional edge cases", () => {
  it("renders CNY as zero-decimal currency", () => {
    // 100000 cents = 1000 CNY (zero-decimal)
    const out = formatCurrency(100000, "CNY");
    expect(out).not.toMatch(/\.\d/);
  });

  it("renders EUR with correct amount", () => {
    const out = formatCurrency(500000, "EUR");
    expect(out).toMatch(/5,000/);
  });
});

describe("abbreviateCurrency — additional edge cases", () => {
  it("handles zero", () => {
    expect(abbreviateCurrency(0, "AUD")).toContain("0.00");
  });

  it("uses B for billions", () => {
    // 200,000,000,000 cents = $2B AUD
    expect(abbreviateCurrency(200_000_000_000, "AUD")).toMatch(/2\.0B/);
  });

  it("boundary: exactly $1,000 (100,000 cents) — uses k", () => {
    expect(abbreviateCurrency(100_000, "AUD")).toMatch(/1\.0k/);
  });

  it("uses symbol for non-AUD currencies", () => {
    expect(abbreviateCurrency(100_000, "USD")).toMatch(/US\$/);
  });
});
