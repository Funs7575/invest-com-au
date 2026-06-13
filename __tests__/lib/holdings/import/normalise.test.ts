import { describe, it, expect } from "vitest";
import {
  normaliseInstrument,
  exchangeFromMarket,
  parseDecimal,
  parseImportDate,
  todayIsoDate,
} from "@/lib/holdings/import/normalise";

describe("normaliseInstrument", () => {
  it("returns a bare code with null exchange (caller defaults)", () => {
    expect(normaliseInstrument("BHP")).toEqual({ ticker: "BHP", exchange: null });
  });

  it("collapses BHP / bhp.ax / ASX:BHP to the same code", () => {
    expect(normaliseInstrument("bhp.ax")).toEqual({ ticker: "BHP", exchange: "ASX" });
    expect(normaliseInstrument("ASX:BHP")).toEqual({ ticker: "BHP", exchange: "ASX" });
    expect(normaliseInstrument("BHP.AU")).toEqual({ ticker: "BHP", exchange: "ASX" });
  });

  it("maps known suffixes to exchanges", () => {
    expect(normaliseInstrument("BARC.L")).toEqual({ ticker: "BARC", exchange: "LSE" });
    expect(normaliseInstrument("0700.HK")).toEqual({ ticker: "0700", exchange: "HKEX" });
    expect(normaliseInstrument("D05.SI")).toEqual({ ticker: "D05", exchange: "SGX" });
    expect(normaliseInstrument("005930.KS")).toEqual({ ticker: "005930", exchange: "KRX" });
  });

  it("maps known prefixes to exchanges", () => {
    expect(normaliseInstrument("NYSE:IBM")).toEqual({ ticker: "IBM", exchange: "NYSE" });
    expect(normaliseInstrument("NASDAQ:AAPL")).toEqual({ ticker: "AAPL", exchange: "NASDAQ" });
  });

  it("leaves US-suffixed tickers exchange-ambiguous (null)", () => {
    expect(normaliseInstrument("AAPL.US")).toEqual({ ticker: "AAPL", exchange: null });
  });

  it("treats numeric .T bodies as Tokyo but keeps alpha share classes intact", () => {
    expect(normaliseInstrument("7203.T")).toEqual({ ticker: "7203", exchange: "TYO" });
    expect(normaliseInstrument("BRK.B")).toEqual({ ticker: "BRK.B", exchange: null });
  });

  it("maps an unknown market prefix to OTHER", () => {
    expect(normaliseInstrument("XETRA:SAP")).toEqual({ ticker: "SAP", exchange: "OTHER" });
  });

  it("strips surrounding quotes and uppercases", () => {
    expect(normaliseInstrument('"bhp"')).toEqual({ ticker: "BHP", exchange: null });
  });

  it("rejects values that aren't plausibly a code", () => {
    expect(normaliseInstrument("")).toBeNull();
    expect(normaliseInstrument("  ")).toBeNull();
    expect(normaliseInstrument("Commonwealth Bank")).toBeNull(); // contains a space
    expect(normaliseInstrument("A".repeat(31))).toBeNull(); // over the 30-char DB limit
  });
});

describe("exchangeFromMarket", () => {
  it("maps free-text market names", () => {
    expect(exchangeFromMarket("ASX")).toBe("ASX");
    expect(exchangeFromMarket("Australia")).toBe("ASX");
    expect(exchangeFromMarket("NasdaqGS")).toBe("NASDAQ");
    expect(exchangeFromMarket("NYSE Arca")).toBe("NYSE");
    expect(exchangeFromMarket("London")).toBe("LSE");
    expect(exchangeFromMarket("Hong Kong")).toBe("HKEX");
    expect(exchangeFromMarket("Tokyo")).toBe("TYO");
  });
  it("returns null for unrecognised / empty markets", () => {
    expect(exchangeFromMarket("")).toBeNull();
    expect(exchangeFromMarket("Frankfurt")).toBeNull();
  });
});

describe("parseDecimal", () => {
  it("parses plain and thousands-separated numbers", () => {
    expect(parseDecimal("1,234.56")).toBe(1234.56);
    expect(parseDecimal("100")).toBe(100);
  });
  it("strips currency symbols and codes", () => {
    expect(parseDecimal("$12.30")).toBe(12.3);
    expect(parseDecimal("A$1,000")).toBe(1000);
    expect(parseDecimal("12.30 AUD")).toBe(12.3);
  });
  it("treats parenthesised values as negative", () => {
    expect(parseDecimal("(45.00)")).toBe(-45);
  });
  it("returns null for non-numeric junk", () => {
    expect(parseDecimal("")).toBeNull();
    expect(parseDecimal("n/a")).toBeNull();
    expect(parseDecimal("1.2.3")).toBeNull();
  });
});

describe("parseImportDate", () => {
  it("parses ISO with optional time tail", () => {
    expect(parseImportDate("2026-03-01")).toBe("2026-03-01");
    expect(parseImportDate("2026-03-01T10:30:00")).toBe("2026-03-01");
  });
  it("parses AU day-first dates (slash, dash, dot)", () => {
    expect(parseImportDate("1/3/2026")).toBe("2026-03-01");
    expect(parseImportDate("01-03-2026")).toBe("2026-03-01");
    expect(parseImportDate("01.03.2026")).toBe("2026-03-01");
  });
  it("parses two-digit years", () => {
    expect(parseImportDate("01/03/26")).toBe("2026-03-01");
  });
  it("parses month-name dates", () => {
    expect(parseImportDate("1 Mar 2026")).toBe("2026-03-01");
    expect(parseImportDate("01 March 2026")).toBe("2026-03-01");
  });
  it("rejects impossible and unparseable dates", () => {
    expect(parseImportDate("31/02/2026")).toBeNull();
    expect(parseImportDate("not a date")).toBeNull();
    expect(parseImportDate("")).toBeNull();
  });
});

describe("todayIsoDate", () => {
  it("formats an injected date as local YYYY-MM-DD", () => {
    // Construct via local-time components so the assertion is timezone-stable.
    const d = new Date(2026, 5, 12); // 12 Jun 2026 local
    expect(todayIsoDate(d)).toBe("2026-06-12");
  });
});
