import { describe, it, expect } from "vitest";
import { toYahooSymbol } from "@/lib/holdings/value-source";

describe("toYahooSymbol", () => {
  it("appends .AX for ASX tickers without it", () => {
    expect(toYahooSymbol("BHP", "ASX")).toBe("BHP.AX");
    expect(toYahooSymbol("cba", "ASX")).toBe("CBA.AX");
  });

  it("is idempotent — already-suffixed tickers stay clean", () => {
    expect(toYahooSymbol("BHP.AX", "ASX")).toBe("BHP.AX");
  });

  it("leaves NASDAQ / NYSE bare", () => {
    expect(toYahooSymbol("AAPL", "NASDAQ")).toBe("AAPL");
    expect(toYahooSymbol("BRK.A", "NYSE")).toBe("BRK.A");
  });

  it("appends .L for LSE", () => {
    expect(toYahooSymbol("VOD", "LSE")).toBe("VOD.L");
  });

  it("appends .HK / .SI / .T / .KS per exchange", () => {
    expect(toYahooSymbol("0700", "HKEX")).toBe("0700.HK");
    expect(toYahooSymbol("D05", "SGX")).toBe("D05.SI");
    expect(toYahooSymbol("7203", "TYO")).toBe("7203.T");
    expect(toYahooSymbol("005930", "KRX")).toBe("005930.KS");
  });

  it("uppercases bare tickers", () => {
    expect(toYahooSymbol("aapl", "NASDAQ")).toBe("AAPL");
  });

  it("returns bare uppercase ticker for OTHER exchange (no known suffix)", () => {
    expect(toYahooSymbol("xyz", "OTHER")).toBe("XYZ");
  });
});
