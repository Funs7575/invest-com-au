import { describe, it, expect } from "vitest";
import {
  autoMapColumns,
  buildDrafts,
  normaliseHeaderKey,
} from "@/lib/holdings/import/generic";
import { parseCsv } from "@/lib/holdings/import/csv";
import type { ColumnMapping } from "@/lib/holdings/import/types";

const DEFAULTS = {
  defaultExchange: "ASX" as const,
  brokerSlug: null,
  defaultDate: "2026-06-12",
};

describe("normaliseHeaderKey", () => {
  it("lowercases and strips non-alphanumerics", () => {
    expect(normaliseHeaderKey("Avg. Price ($)")).toBe("avgprice");
    expect(normaliseHeaderKey("Trade Date")).toBe("tradedate");
  });
});

describe("autoMapColumns", () => {
  it("maps the required trio from common synonyms", () => {
    const m = autoMapColumns(["Code", "Quantity", "Price", "Trade Date"]);
    expect(m).toEqual({ ticker: 0, units: 1, price: 2, date: 3, exchange: null, type: null });
  });

  it("claims each column at most once (Code + Symbol both present)", () => {
    const m = autoMapColumns(["Code", "Symbol", "Units", "Price"]);
    // "code" wins ticker (priority order); "symbol" is left unclaimed.
    expect(m?.ticker).toBe(0);
    expect(m?.units).toBe(2);
    expect(m?.price).toBe(3);
  });

  it("returns null when any of code/units/price is missing", () => {
    expect(autoMapColumns(["Code", "Quantity"])).toBeNull(); // no price
    expect(autoMapColumns(["Description", "Amount"])).toBeNull();
  });

  it("picks up optional exchange and type columns", () => {
    const m = autoMapColumns(["Symbol", "Market", "Shares", "Avg Price", "Side"]);
    expect(m?.exchange).toBe(1);
    expect(m?.type).toBe(4);
  });
});

describe("buildDrafts", () => {
  const map: ColumnMapping = { ticker: 0, units: 1, price: 2, date: 3, exchange: null, type: null };

  it("builds a clean importable draft", () => {
    const records = parseCsv("Code,Units,Price,Date\nBHP,100,45.00,2026-03-01").slice(1);
    const [draft] = buildDrafts(records, { ...DEFAULTS, mapping: map });
    expect(draft?.issues).toEqual([]);
    expect(draft?.ticker).toBe("BHP");
    expect(draft?.exchange).toBe("ASX");
    expect(draft?.shares).toBe(100);
    expect(draft?.costBasisPerShareCents).toBe(4500);
    expect(draft?.acquiredAt).toBe("2026-03-01");
  });

  it("flags missing code, units and price separately (not one wall of red)", () => {
    const records = parseCsv("Code,Units,Price,Date\n,,,2026-03-01").slice(1);
    const [draft] = buildDrafts(records, { ...DEFAULTS, mapping: map });
    expect(draft?.issues).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/missing code/),
        expect.stringMatching(/missing units/),
        expect.stringMatching(/missing price/),
      ]),
    );
  });

  it("rejects zero and negative units", () => {
    const zero = buildDrafts(parseCsv("c,u,p,d\nBHP,0,45,2026-03-01").slice(1), {
      ...DEFAULTS,
      mapping: map,
    });
    expect(zero[0]?.issues).toContain("units must be greater than 0");

    const neg = buildDrafts(parseCsv("c,u,p,d\nBHP,-5,45,2026-03-01").slice(1), {
      ...DEFAULTS,
      mapping: map,
    });
    expect(neg[0]?.issues.join(" ")).toMatch(/negative units/);
  });

  it("treats SELL rows as non-importable when a type column is mapped", () => {
    const typed: ColumnMapping = { ...map, type: 4 };
    const records = parseCsv(
      "c,u,p,d,type\nBHP,100,45,2026-03-01,Sell",
    ).slice(1);
    const [draft] = buildDrafts(records, { ...DEFAULTS, mapping: typed });
    expect(draft?.issues.join(" ")).toMatch(/SELL/);
  });

  it("imports BUY, DRP and opening-balance type rows", () => {
    const typed: ColumnMapping = { ...map, type: 4 };
    const records = parseCsv(
      "c,u,p,d,type\nBHP,100,45,2026-03-01,Buy\nCBA,5,110,2026-03-02,DRP\nNAB,3,30,2026-03-03,Opening Balance",
    ).slice(1);
    const drafts = buildDrafts(records, { ...DEFAULTS, mapping: typed });
    expect(drafts.every((d) => d.issues.length === 0)).toBe(true);
  });

  it("derives the exchange from the code suffix over the default", () => {
    const records = parseCsv("c,u,p,d\nBARC.L,100,5.00,2026-03-01").slice(1);
    const [draft] = buildDrafts(records, { ...DEFAULTS, mapping: map });
    expect(draft?.exchange).toBe("LSE");
  });

  it("uses the default date when no date column is mapped", () => {
    const noDate: ColumnMapping = { ...map, date: null };
    const records = parseCsv("c,u,p\nBHP,100,45.00").slice(1);
    const [draft] = buildDrafts(records, { ...DEFAULTS, mapping: noDate });
    expect(draft?.acquiredAt).toBe("2026-06-12");
  });
});
