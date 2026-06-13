import { describe, it, expect } from "vitest";
import {
  looksLikeSharesightHeader,
  parseSharesightRecords,
  SHARESIGHT_CSV_BROKER_SLUG,
} from "@/lib/holdings/import/sharesight";
import { parseCsv } from "@/lib/holdings/import/csv";

const OPTS = { defaultDate: "2026-06-12" };

describe("looksLikeSharesightHeader", () => {
  it("matches a Market + Code + Quantity header", () => {
    expect(
      looksLikeSharesightHeader(["Market", "Code", "Date", "Quantity", "Price"]),
    ).toBe(true);
  });
  it("matches the Instrument Code variant", () => {
    expect(
      looksLikeSharesightHeader(["Trade Date", "Instrument Code", "Market", "Quantity", "Price"]),
    ).toBe(true);
  });
  it("rejects headers without a market column (plain broker export)", () => {
    expect(looksLikeSharesightHeader(["Code", "Quantity", "Price"])).toBe(false);
  });
});

describe("parseSharesightRecords", () => {
  it("parses the canonical Trades export and tags broker_slug=sharesight", () => {
    const csv = [
      "Market,Code,Date,Type,Quantity,Price,Brokerage,Currency,Comments",
      "ASX,BHP,2026-03-01,Buy,100,45.00,19.95,AUD,initial",
      "NASDAQ,AAPL,2026-02-15,Buy,10,180.00,0,USD,",
    ].join("\n");
    const records = parseCsv(csv);
    const result = parseSharesightRecords(records, OPTS);
    expect(result).not.toBeNull();
    expect(result?.headerRecordIndex).toBe(0);
    expect(result?.drafts).toHaveLength(2);

    const [bhp, aapl] = result!.drafts;
    expect(bhp?.ticker).toBe("BHP");
    expect(bhp?.exchange).toBe("ASX");
    expect(bhp?.shares).toBe(100);
    expect(bhp?.costBasisPerShareCents).toBe(4500);
    expect(bhp?.acquiredAt).toBe("2026-03-01");
    expect(bhp?.brokerSlug).toBe(SHARESIGHT_CSV_BROKER_SLUG);
    expect(bhp?.issues).toEqual([]);

    expect(aapl?.ticker).toBe("AAPL");
    expect(aapl?.exchange).toBe("NASDAQ");
  });

  it("excludes SELL rows via the Type column", () => {
    const csv = [
      "Market,Code,Date,Type,Quantity,Price",
      "ASX,BHP,2026-03-01,Buy,100,45.00",
      "ASX,CBA,2026-03-02,Sell,50,110.00",
    ].join("\n");
    const result = parseSharesightRecords(parseCsv(csv), OPTS);
    const importable = result!.drafts.filter((d) => d.issues.length === 0);
    expect(importable).toHaveLength(1);
    expect(importable[0]?.ticker).toBe("BHP");
  });

  it("parses the holdings-view variant (Units / Purchase Price)", () => {
    const csv = [
      "Market,Code,Company,Units,Purchase Price",
      "ASX,WES,Wesfarmers,25,65.50",
    ].join("\n");
    const result = parseSharesightRecords(parseCsv(csv), OPTS);
    expect(result?.drafts[0]?.ticker).toBe("WES");
    expect(result?.drafts[0]?.shares).toBe(25);
    expect(result?.drafts[0]?.costBasisPerShareCents).toBe(6550);
  });

  it("returns null when the file is not Sharesight-shaped", () => {
    const csv = "Code,Quantity,Price\nBHP,100,45.00";
    expect(parseSharesightRecords(parseCsv(csv), OPTS)).toBeNull();
  });
});
