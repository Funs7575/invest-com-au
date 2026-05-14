import { describe, it, expect } from "vitest";
import {
  formatHoldingsAsTaxSummaryCsv,
  getAustralianTaxYearBoundsForYear,
  getCurrentAustralianTaxYear,
  type TaxSummaryHolding,
} from "@/lib/holdings/tax-summary";

describe("getAustralianTaxYearBoundsForYear", () => {
  it("returns Jul-1-prev-year through Jun-30-year", () => {
    expect(getAustralianTaxYearBoundsForYear(2025)).toEqual({
      start: "2024-07-01",
      end: "2025-06-30",
    });
  });

  it("handles earlier years", () => {
    expect(getAustralianTaxYearBoundsForYear(2020)).toEqual({
      start: "2019-07-01",
      end: "2020-06-30",
    });
  });

  it("handles future years", () => {
    expect(getAustralianTaxYearBoundsForYear(2030)).toEqual({
      start: "2029-07-01",
      end: "2030-06-30",
    });
  });
});

describe("getCurrentAustralianTaxYear", () => {
  it("returns FY-ending year for mid-May (still inside FY ending June)", () => {
    expect(getCurrentAustralianTaxYear(new Date("2026-05-14T00:00:00Z"))).toBe(2026);
  });

  it("returns FY-ending year for 30 June (last day of FY)", () => {
    expect(getCurrentAustralianTaxYear(new Date("2026-06-30T00:00:00Z"))).toBe(2026);
  });

  it("rolls forward on 1 July (first day of next FY)", () => {
    expect(getCurrentAustralianTaxYear(new Date("2026-07-01T00:00:00Z"))).toBe(2027);
  });

  it("returns next year for August", () => {
    expect(getCurrentAustralianTaxYear(new Date("2026-08-01T00:00:00Z"))).toBe(2027);
  });

  it("returns same year for January", () => {
    expect(getCurrentAustralianTaxYear(new Date("2026-01-15T00:00:00Z"))).toBe(2026);
  });
});

describe("formatHoldingsAsTaxSummaryCsv", () => {
  it("returns header-only CSV when given an empty list", () => {
    const csv = formatHoldingsAsTaxSummaryCsv([], 2026);
    expect(csv).toBe(
      "Ticker,Exchange,Broker,Shares,Cost Basis Per Share (AUD),Total Cost Basis (AUD),Acquired Date,Notes\r\n",
    );
  });

  it("formats a happy-path two-row CSV with correct columns and dollar conversion", () => {
    const holdings: TaxSummaryHolding[] = [
      {
        ticker: "BHP",
        exchange: "ASX",
        shares: 100,
        cost_basis_per_share_cents: 4575, // $45.75
        acquired_at: "2023-08-12",
        broker_slug: "commsec",
        notes: "Long-term hold",
      },
      {
        ticker: "VAS",
        exchange: "ASX",
        shares: 50,
        cost_basis_per_share_cents: 9120, // $91.20
        acquired_at: "2024-02-03",
        broker_slug: null,
        notes: null,
      },
    ];
    const csv = formatHoldingsAsTaxSummaryCsv(holdings, 2025);
    const lines = csv.split("\r\n");
    // header + 2 data rows + trailing empty (from trailing CRLF)
    expect(lines).toHaveLength(4);
    expect(lines[0]).toBe(
      "Ticker,Exchange,Broker,Shares,Cost Basis Per Share (AUD),Total Cost Basis (AUD),Acquired Date,Notes",
    );
    // BHP: 100 shares × $45.75 = $4575.00 total
    expect(lines[1]).toBe("BHP,ASX,commsec,100,45.75,4575.00,2023-08-12,Long-term hold");
    // Missing broker renders as "(not set)"; null notes renders empty
    expect(lines[2]).toBe("VAS,ASX,(not set),50,91.20,4560.00,2024-02-03,");
    expect(lines[3]).toBe("");
  });

  it("quotes notes containing commas per RFC 4180", () => {
    const holdings: TaxSummaryHolding[] = [
      {
        ticker: "XRO",
        exchange: "ASX",
        shares: 10,
        cost_basis_per_share_cents: 10000,
        acquired_at: "2024-01-15",
        broker_slug: "stake",
        notes: "Bought after Q3, considering top-up",
      },
    ];
    const csv = formatHoldingsAsTaxSummaryCsv(holdings, 2025);
    expect(csv).toContain('"Bought after Q3, considering top-up"');
  });

  it("escapes inner quotes by doubling them per RFC 4180", () => {
    const holdings: TaxSummaryHolding[] = [
      {
        ticker: "AAPL",
        exchange: "NASDAQ",
        shares: 5,
        cost_basis_per_share_cents: 18000,
        acquired_at: "2024-03-10",
        broker_slug: "stake",
        notes: 'Following the "magnificent seven" thesis',
      },
    ];
    const csv = formatHoldingsAsTaxSummaryCsv(holdings, 2025);
    expect(csv).toContain('"Following the ""magnificent seven"" thesis"');
  });

  it("handles fractional shares with full precision", () => {
    const holdings: TaxSummaryHolding[] = [
      {
        ticker: "BTC",
        exchange: "CRYPTO",
        shares: 0.12345678,
        cost_basis_per_share_cents: 6000000, // $60,000.00
        acquired_at: "2024-06-01",
        broker_slug: "swyftx",
        notes: null,
      },
    ];
    const csv = formatHoldingsAsTaxSummaryCsv(holdings, 2025);
    const line = csv.split("\r\n")[1];
    // Shares preserved at full precision; cost basis dollarised
    expect(line).toContain("0.12345678");
    expect(line).toContain("60000.00");
  });

  it("treats whitespace-only broker_slug as missing", () => {
    const holdings: TaxSummaryHolding[] = [
      {
        ticker: "WBC",
        exchange: "ASX",
        shares: 1,
        cost_basis_per_share_cents: 2000,
        acquired_at: "2025-01-01",
        broker_slug: "   ",
        notes: null,
      },
    ];
    const csv = formatHoldingsAsTaxSummaryCsv(holdings, 2025);
    expect(csv).toContain("(not set)");
  });
});
