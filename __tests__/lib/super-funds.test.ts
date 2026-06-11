import { describe, it, expect } from "vitest";
import {
  superFundsMeta,
  allSuperFunds,
  fundBySlug,
  searchSuperFunds,
  similarFunds,
  fundTypeCounts,
  FUND_SEARCH_MAX_RESULTS,
} from "@/lib/super-funds";
import { parseApraCsv, slugifyFund } from "@/lib/super-funds-ingest";

describe("super-funds loader", () => {
  it("loads a coherent dataset (meta count matches rows, slugs/abns unique)", () => {
    const funds = allSuperFunds();
    expect(superFundsMeta().count).toBe(funds.length);
    expect(new Set(funds.map((f) => f.slug)).size).toBe(funds.length);
    expect(new Set(funds.map((f) => f.abn)).size).toBe(funds.length);
    expect(superFundsMeta().period.length).toBeGreaterThan(0);
  });

  it("resolves slugs and misses cleanly", () => {
    const first = allSuperFunds()[0]!;
    expect(fundBySlug(first.slug)?.abn).toBe(first.abn);
    expect(fundBySlug("not-a-real-fund-slug")).toBeNull();
  });

  it("search ranks name prefix first, caps results, ignores short queries", () => {
    const first = allSuperFunds()[0]!;
    const prefix = first.name.slice(0, 4);
    const results = searchSuperFunds(prefix);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.name.toLowerCase().startsWith(prefix.toLowerCase())).toBe(true);
    expect(searchSuperFunds("x").length).toBe(0);
    expect(searchSuperFunds("su").length).toBeLessThanOrEqual(FUND_SEARCH_MAX_RESULTS);
  });

  it("finds by exact ABN", () => {
    const first = allSuperFunds()[0]!;
    expect(searchSuperFunds(first.abn)[0]?.abn).toBe(first.abn);
  });

  it("similar funds share the type, exclude self, order by asset proximity", () => {
    const fund = allSuperFunds().find((f) => f.totalAssetsBn !== undefined)!;
    const peers = similarFunds(fund, 4);
    expect(peers.length).toBeLessThanOrEqual(4);
    let prevDelta = -1;
    for (const p of peers) {
      expect(p.fundType).toBe(fund.fundType);
      expect(p.abn).not.toBe(fund.abn);
      const delta = Math.abs((p.totalAssetsBn ?? 0) - (fund.totalAssetsBn ?? 0));
      expect(delta).toBeGreaterThanOrEqual(prevDelta);
      prevDelta = delta;
    }
  });

  it("fundTypeCounts orders by count and sums to the dataset", () => {
    const counts = fundTypeCounts();
    expect(counts.reduce((s, c) => s + c.count, 0)).toBe(allSuperFunds().length);
    for (let i = 1; i < counts.length; i++) {
      expect(counts[i - 1]!.count).toBeGreaterThanOrEqual(counts[i]!.count);
    }
  });
});

describe("parseApraCsv", () => {
  const HEADER =
    "FUND NAME,ABN,FUND TYPE,RSE LICENSEE NAME,TOTAL ASSETS ($M),NUMBER OF MEMBER ACCOUNTS,ROR 1 YEAR (%),ROR 5 YEARS (% P.A.),ROR 10 YEARS (% P.A.),OPERATING EXPENSE RATIO (%)";

  it("normalises funds, converts $M assets to $bn, skips aggregate rows", () => {
    const csv = [
      HEADER,
      'Example Industry Fund,11222333444,Industry,"Example Trustee Pty Ltd","12,500","1,200,000",9.1,6.8,7.4,0.55',
      "Total,,,,999999,99999999,,,,",
    ].join("\n");
    const { funds, skipped } = parseApraCsv(csv);
    expect(funds.length).toBe(1);
    expect(skipped.aggregates).toBe(1);
    const f = funds[0]!;
    expect(f.slug).toBe("example-industry-fund");
    expect(f.totalAssetsBn).toBe(12.5);
    expect(f.memberAccounts).toBe(1_200_000);
    expect(f.ror10yr).toBe(7.4);
    expect(f.expenseRatioPct).toBe(0.55);
  });

  it("treats missing/placeholder numerics as absent, not zero", () => {
    const csv = [HEADER, "Sparse Fund,99888777666,Retail,Trustee,*,n/a,-,,5.5,"].join("\n");
    const { funds } = parseApraCsv(csv);
    const f = funds[0]!;
    expect(f.totalAssetsBn).toBeUndefined();
    expect(f.memberAccounts).toBeUndefined();
    expect(f.ror1yr).toBeUndefined();
    expect(f.ror10yr).toBe(5.5);
  });

  it("dedupes by ABN and suffixes colliding slugs", () => {
    const csv = [
      HEADER,
      "Same Name Fund,11111111111,Industry,T1,100,10,1,1,1,1",
      "Same Name Fund,22222222222,Retail,T2,200,20,2,2,2,2",
      "Same Name Fund,22222222222,Retail,T2 Updated,300,30,3,3,3,3",
    ].join("\n");
    const { funds } = parseApraCsv(csv);
    expect(funds.length).toBe(2);
    expect(new Set(funds.map((f) => f.slug)).size).toBe(2);
    expect(funds.find((f) => f.abn === "22222222222")!.trustee).toBe("T2 Updated");
  });

  it("fails loudly when required columns are missing, naming found headers", () => {
    expect(() => parseApraCsv("FOO,BAR\n1,2")).toThrowError(/missing a recognisable/);
    expect(() => parseApraCsv("FOO,BAR\n1,2")).toThrowError(/FOO, BAR/);
  });
});

describe("slugifyFund", () => {
  it("kebab-cases with ampersand expansion", () => {
    expect(slugifyFund("Health & Community Services Super")).toBe("health-and-community-services-super");
    expect(slugifyFund("  ")).toBe("fund");
  });
});
