import { describe, it, expect } from "vitest";
import {
  analyseCsv,
  analyseWithMapping,
  MAX_IMPORT_ROWS,
} from "@/lib/holdings/import";

const TODAY = "2026-06-12";

// Real broker-export fixtures (headers + data rows lifted from the legacy
// per-broker parser tests, so detection + parsing are exercised together).
const FIXTURES = {
  commsec: [
    "Date,Reference,Details,Debit($),Credit($),Balance($)",
    "01/03/2026,T123,B 100 BHP @ 45.123,4512.30,,1234.56",
    "15/03/2026,T124,B 50 CBA @ 110.50,5525.00,,710.00",
  ].join("\n"),
  selfwealth: [
    "Trade Date,Settlement Date,Account,Code,Order Type,Quantity,Price,Brokerage,Consideration,Net Value",
    "01/03/2026,03/03/2026,Trading,BHP,BUY,100,45.50,9.50,4550.00,4559.50",
    "15/03/2026,17/03/2026,Trading,CBA,BUY,50,110.00,9.50,5500.00,5509.50",
  ].join("\n"),
  // Stake exports are USD-denominated; the legacy parser currently rejects
  // them pending an FX layer (kept in its own assertion below).
  stake: [
    "Date,Reference,Activity,Symbol,Description,Quantity,Price,Total,Currency",
    "2026-03-01,T1,Buy,AAPL,Apple Inc.,10,150.25,1502.50,USD",
    "2026-03-15,T2,Buy,MSFT,Microsoft Corp.,5,310.00,1550.00,USD",
  ].join("\n"),
  nabtrade: [
    "Trade Date,Settlement Date,Account,Order #,Action,Quantity,Symbol,Description,Price,Brokerage,GST,Amount,Currency",
    "01/03/2026,03/03/2026,12345,A1,Bought,100,BHP,BHP Group Ltd,45.10,14.95,1.50,4510.00,AUD",
    "15/03/2026,17/03/2026,12345,A2,Bought,50,CBA,Commonwealth Bank,109.50,14.95,1.50,5475.00,AUD",
  ].join("\n"),
  ibkr: [
    "Statement,Header,Field Name,Field Value",
    "Statement,Data,BrokerName,Interactive Brokers",
    "Trades,Header,DataDiscriminator,Asset Category,Currency,Symbol,Date/Time,Quantity,T. Price,C. Price,Proceeds,Comm/Fee,Basis,Realized P/L,MTM P/L,Code",
    'Trades,Data,Order,Stocks,AUD,BHP,"2026-02-20, 09:45:00",50,45.10,45.20,-2255,-7.50,2262.50,0,5,O',
  ].join("\n"),
  sharesight: [
    "Market,Code,Date,Type,Quantity,Price,Brokerage,Currency",
    "ASX,BHP,2026-03-01,Buy,100,45.00,19.95,AUD",
    "ASX,CBA,2026-03-02,Buy,50,110.00,19.95,AUD",
  ].join("\n"),
} as const;

describe("analyseCsv — per-broker detection (happy paths)", () => {
  // Brokers whose AUD exports yield importable rows (Stake is USD-only, below).
  const AUD_BROKERS = ["commsec", "selfwealth", "nabtrade", "ibkr", "sharesight"] as const;

  it.each(AUD_BROKERS)("detects and parses %s", (broker) => {
    const result = analyseCsv(FIXTURES[broker], { today: TODAY });
    expect(result.format).toBe(broker);
    expect(result.fileIssues).toEqual([]);
    const importable = result.drafts.filter((d) => d.issues.length === 0);
    expect(importable.length).toBeGreaterThanOrEqual(1);
    // Every importable row is fully populated.
    for (const d of importable) {
      expect(d.ticker).toBeTruthy();
      expect(d.exchange).toBeTruthy();
      expect(d.shares).toBeGreaterThan(0);
      expect(d.costBasisPerShareCents).toBeGreaterThanOrEqual(0);
      expect(d.acquiredAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(d.sourceRow).toBeGreaterThan(0);
    }
  });

  it("detects Stake but flags its USD rows as not-yet-importable (clear reason)", () => {
    const result = analyseCsv(FIXTURES.stake, { today: TODAY });
    expect(result.format).toBe("stake");
    expect(result.drafts.filter((d) => d.issues.length === 0)).toHaveLength(0);
    expect(result.drafts[0]?.issues.join(" ")).toMatch(/USD|FX/i);
  });

  it("tags Sharesight rows with broker_slug=sharesight", () => {
    const result = analyseCsv(FIXTURES.sharesight, { today: TODAY });
    expect(result.drafts[0]?.brokerSlug).toBe("sharesight");
  });
});

describe("analyseCsv — generic + manual fallback", () => {
  it("auto-maps an unknown-but-mappable CSV via the generic engine", () => {
    const csv = [
      "Ticker,Shares,Average Cost,Acquired",
      "TSLA,5,210.50,2026-01-10",
    ].join("\n");
    const result = analyseCsv(csv, { today: TODAY });
    expect(result.format).toBe("generic");
    expect(result.drafts[0]?.ticker).toBe("TSLA");
    expect(result.drafts[0]?.costBasisPerShareCents).toBe(21050);
  });

  it("falls back to manual mapping when columns are unrecognisable", () => {
    const csv = ["Foo,Bar,Baz", "x,y,z"].join("\n");
    const result = analyseCsv(csv, { today: TODAY });
    expect(result.format).toBeNull();
    expect(result.header).not.toBeNull();
    expect(result.fileIssues[0]).toMatch(/couldn't recognise/i);
  });

  it("re-parses under a user-chosen mapping", () => {
    // Header that auto-detect can't map (no recognisable synonyms), so the
    // user supplies the column positions by hand.
    const csv = ["Thing,Howmany,Cost", "BHP,10,45.00"].join("\n");
    const result = analyseWithMapping(csv, {
      mapping: { ticker: 0, units: 1, price: 2, date: null, exchange: null, type: null },
      defaultExchange: "ASX",
      headerRecordIndex: 0,
      today: TODAY,
    });
    expect(result.format).toBe("generic");
    expect(result.drafts[0]?.ticker).toBe("BHP");
    expect(result.drafts[0]?.acquiredAt).toBe(TODAY); // no date column → default
  });
});

describe("analyseCsv — edge cases", () => {
  it("reports an empty file", () => {
    expect(analyseCsv("", { today: TODAY }).fileIssues[0]).toMatch(/empty/i);
    expect(analyseCsv("   \n  ", { today: TODAY }).fileIssues[0]).toMatch(/empty/i);
  });

  it("keeps valid rows and flags malformed ones from a known broker", () => {
    const csv = [
      "Date,Reference,Details,Debit($),Credit($),Balance($)",
      "01/03/2026,T1,B 100 BHP @ 45.00,4500.00,,0",
      "02/03/2026,T2,S 50 CBA @ 110.00,,5500.00,5500", // SELL — not a holding
    ].join("\n");
    const result = analyseCsv(csv, { today: TODAY });
    const ok = result.drafts.filter((d) => d.issues.length === 0);
    const bad = result.drafts.filter((d) => d.issues.length > 0);
    expect(ok).toHaveLength(1);
    expect(ok[0]?.ticker).toBe("BHP");
    expect(bad.length).toBeGreaterThanOrEqual(1);
  });

  it("preserves source rows so duplicates can be detected downstream", () => {
    const csv = [
      "Ticker,Shares,Price,Date",
      "BHP,100,45.00,2026-03-01",
      "BHP,100,45.00,2026-03-01", // exact duplicate
    ].join("\n");
    const result = analyseCsv(csv, { today: TODAY });
    expect(result.drafts).toHaveLength(2);
    expect(result.drafts[0]?.sourceRow).not.toBe(result.drafts[1]?.sourceRow);
  });

  it("enforces the per-import row cap with a clear message", () => {
    const header = "Ticker,Shares,Price";
    const rows = Array.from(
      { length: MAX_IMPORT_ROWS + 1 },
      () => "BHP,1,10.00",
    );
    const result = analyseCsv([header, ...rows].join("\n"), { today: TODAY });
    expect(result.drafts).toHaveLength(0);
    expect(result.fileIssues[0]).toMatch(
      new RegExp(`max ${MAX_IMPORT_ROWS}`),
    );
  });

  it("can force a specific broker format", () => {
    // Same Sharesight data, but force generic — should still parse via mapping.
    const result = analyseCsv(FIXTURES.sharesight, {
      today: TODAY,
      forceFormat: "generic",
    });
    expect(result.format).toBe("generic");
    expect(result.drafts.some((d) => d.ticker === "BHP")).toBe(true);
  });
});
