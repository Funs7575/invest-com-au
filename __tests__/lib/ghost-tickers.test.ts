import { describe, it, expect } from "vitest";
import {
  ghostTickersMeta,
  allGhostTickers,
  ghostTickerBySlug,
  searchGhostTickers,
  recentGhostTickers,
  sameYearGhostTickers,
  ghostTickerYearCounts,
  GHOST_SEARCH_MAX_RESULTS,
} from "@/lib/ghost-tickers";
import {
  parseGhostCsv,
  classifyGhostEvent,
  extractSuccessor,
  parseAuDate,
  slugifyGhost,
} from "@/lib/ghost-tickers-ingest";

describe("ghost-tickers loader", () => {
  it("loads a coherent dataset (meta count matches, slugs unique, dates ISO)", () => {
    const tickers = allGhostTickers();
    expect(ghostTickersMeta().count).toBe(tickers.length);
    expect(new Set(tickers.map((t) => t.slug)).size).toBe(tickers.length);
    for (const t of tickers) expect(t.eventDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("resolves slugs and misses cleanly", () => {
    const first = allGhostTickers()[0]!;
    expect(ghostTickerBySlug(first.slug)?.code).toBe(first.code);
    expect(ghostTickerBySlug("zzz-not-real")).toBeNull();
  });

  it("search ranks exact code first and caps results", () => {
    const first = allGhostTickers()[0]!;
    expect(searchGhostTickers(first.code)[0]?.code).toBe(first.code);
    expect(searchGhostTickers("a").length).toBe(0);
    expect(searchGhostTickers("li").length).toBeLessThanOrEqual(GHOST_SEARCH_MAX_RESULTS);
  });

  it("recent list is newest-first; year counts sum to total", () => {
    const recent = recentGhostTickers(10);
    for (let i = 1; i < recent.length; i++) {
      expect(recent[i - 1]!.eventDate >= recent[i]!.eventDate).toBe(true);
    }
    const sum = ghostTickerYearCounts().reduce((s, y) => s + y.count, 0);
    expect(sum).toBe(allGhostTickers().length);
  });

  it("same-year peers share the year and exclude self", () => {
    const first = allGhostTickers()[0]!;
    for (const p of sameYearGhostTickers(first, 4)) {
      expect(p.eventDate.slice(0, 4)).toBe(first.eventDate.slice(0, 4));
      expect(p.slug).not.toBe(first.slug);
    }
  });
});

describe("classifyGhostEvent / extractSuccessor / parseAuDate", () => {
  it("classifies common reason wordings", () => {
    expect(classifyGhostEvent("Removed following compulsory acquisition by X")).toBe("acquired");
    expect(classifyGhostEvent("Merger by scheme of arrangement")).toBe("merged");
    expect(classifyGhostEvent("Change of name — renamed to Y")).toBe("renamed");
    expect(classifyGhostEvent("Liquidators appointed")).toBe("failed");
    expect(classifyGhostEvent("Delisted at the entity's request")).toBe("delisted");
  });

  it("extracts successor name + code", () => {
    expect(extractSuccessor("Name change — renamed to NewCo Limited (NEW).")).toEqual({
      name: "NewCo Limited",
      code: "NEW",
    });
    expect(extractSuccessor("Delisted at request")).toEqual({});
  });

  it("parses ISO, dd/mm/yyyy, and verbose dates", () => {
    expect(parseAuDate("2024-01-19")).toBe("2024-01-19");
    expect(parseAuDate("19/01/2024")).toBe("2024-01-19");
    expect(parseAuDate("19 January 2024")).toBe("2024-01-19");
    expect(parseAuDate("not a date")).toBeNull();
  });
});

describe("parseGhostCsv", () => {
  const HEADER = "ASX CODE,COMPANY NAME,REMOVAL DATE,REASON FOR REMOVAL";

  it("normalises rows, classifies events, dedupes by code+date", () => {
    const csv = [
      HEADER,
      'ABC,Acme Mining Limited,19/01/2024,"Removed following compulsory acquisition by Big Corp."',
      'ABC,Acme Mining Limited,19/01/2024,"Removed following compulsory acquisition by Big Corp."',
      "XYZ,Old Name Limited,01/02/2020,Name change — renamed to Fresh Name Limited (FNL).",
    ].join("\n");
    const { tickers } = parseGhostCsv(csv);
    expect(tickers.length).toBe(2);
    const abc = tickers.find((t) => t.code === "ABC")!;
    expect(abc.event).toBe("acquired");
    expect(abc.eventDate).toBe("2024-01-19");
    const xyz = tickers.find((t) => t.code === "XYZ")!;
    expect(xyz.event).toBe("renamed");
    expect(xyz.successorCode).toBe("FNL");
  });

  it("suffixes slug collisions across reused codes", () => {
    const csv = [
      HEADER,
      "REU,Reused Co Limited,01/01/2010,Delisted at request.",
      "REU,Reused Co Limited,01/01/2020,Delisted at request.",
    ].join("\n");
    const { tickers } = parseGhostCsv(csv);
    expect(tickers.length).toBe(2);
    expect(new Set(tickers.map((t) => t.slug)).size).toBe(2);
  });

  it("skips bad dates and incomplete rows, fails loudly on missing columns", () => {
    const csv = [HEADER, "AAA,Some Co,not-a-date,reason", ",Missing Code,01/01/2020,reason"].join("\n");
    const { tickers, skipped } = parseGhostCsv(csv);
    expect(tickers.length).toBe(0);
    expect(skipped.badDates).toBe(1);
    expect(skipped.missingFields).toBe(1);
    expect(() => parseGhostCsv("FOO,BAR\n1,2")).toThrowError(/missing a recognisable[\s\S]*FOO, BAR/);
  });
});

describe("slugifyGhost", () => {
  it("prefixes the code and truncates long names", () => {
    expect(slugifyGhost("ABC", "Acme Mining & Exploration Holdings Group Limited")).toBe(
      "abc-acme-mining-exploration-holdings-group",
    );
  });
});
