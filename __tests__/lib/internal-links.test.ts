import { describe, it, expect } from "vitest";
import {
  getBestPagesForArticle,
  getArticleFiltersForBestPage,
  scoreBrokerSimilarity,
} from "@/lib/internal-links";
import type { Broker } from "@/lib/types";

function makeBroker(overrides: Partial<Broker> = {}): Broker {
  return {
    id: 1,
    slug: "test-broker",
    name: "Test Broker",
    color: "#000",
    chess_sponsored: false,
    smsf_support: false,
    is_crypto: false,
    platform_type: "share_broker",
    deal: false,
    editors_pick: false,
    status: "active",
    ...overrides,
  } as Broker;
}

describe("getBestPagesForArticle", () => {
  it("returns an empty array when category and tags are both empty", () => {
    expect(getBestPagesForArticle()).toEqual([]);
    expect(getBestPagesForArticle(undefined, [])).toEqual([]);
  });

  it("maps a known category to its best-for slug(s)", () => {
    const pages = getBestPagesForArticle("beginners");
    expect(pages.some((p) => p.slug === "beginners")).toBe(true);
  });

  it("returns an empty array for a category that maps to no slugs (e.g. 'tax')", () => {
    // `tax` is explicitly in the table with []; shouldn't throw
    expect(getBestPagesForArticle("tax")).toEqual([]);
  });

  it("maps a tag to its best-for slug(s)", () => {
    const pages = getBestPagesForArticle(undefined, ["chess"]);
    expect(pages.some((p) => p.slug === "chess-sponsored")).toBe(true);
  });

  it("de-duplicates when category + tag point at the same slug", () => {
    const pages = getBestPagesForArticle("beginners", ["beginners"]);
    const beginnersCount = pages.filter((p) => p.slug === "beginners").length;
    expect(beginnersCount).toBe(1);
  });

  it("unions multiple tags into distinct slugs", () => {
    const pages = getBestPagesForArticle(undefined, [
      "chess",
      "international",
    ]);
    const slugs = new Set(pages.map((p) => p.slug));
    expect(slugs.has("chess-sponsored")).toBe(true);
    expect(slugs.has("us-shares")).toBe(true);
    expect(slugs.has("low-fx-fees")).toBe(true);
  });

  it("ignores unknown categories and tags silently", () => {
    expect(
      getBestPagesForArticle("totally-invented", ["also-fake"]),
    ).toEqual([]);
  });

  it("builds hrefs rooted at /best/", () => {
    const pages = getBestPagesForArticle("beginners");
    for (const page of pages) {
      expect(page.href).toBe(`/best/${page.slug}`);
    }
  });
});

describe("getArticleFiltersForBestPage", () => {
  it("returns a concrete filter for known slugs", () => {
    const f = getArticleFiltersForBestPage("smsf");
    expect(f.categories).toContain("smsf");
    expect(f.tags).toContain("smsf");
  });

  it("returns empty filters for a best slug that isn't in the map", () => {
    expect(getArticleFiltersForBestPage("made-up-slug")).toEqual({
      categories: [],
      tags: [],
    });
  });

  it("returns an explicitly-empty mapping when the slug exists but has no filters", () => {
    // `crypto` is present with empty arrays — asserting that shape
    // holds stops a future refactor from silently dropping it.
    expect(getArticleFiltersForBestPage("crypto")).toEqual({
      categories: [],
      tags: [],
    });
  });
});

describe("scoreBrokerSimilarity", () => {
  it("returns -1 when one broker is crypto and the other is not (hard filter)", () => {
    const target = makeBroker({ is_crypto: false });
    const candidate = makeBroker({ is_crypto: true });
    expect(scoreBrokerSimilarity(target, candidate)).toBe(-1);
  });

  it("adds +3 when CHESS sponsorship matches", () => {
    const a = makeBroker({ chess_sponsored: true });
    const b = makeBroker({ chess_sponsored: true });
    expect(scoreBrokerSimilarity(a, b)).toBeGreaterThanOrEqual(3);
  });

  it("adds +2 when SMSF support matches", () => {
    // two fully-matching brokers: chess + smsf both true, same fees, same rating
    const a = makeBroker({
      chess_sponsored: false,
      smsf_support: true,
      asx_fee_value: 10,
      rating: 4,
    });
    const b = makeBroker({
      chess_sponsored: false,
      smsf_support: true,
      asx_fee_value: 10,
      rating: 4,
    });
    // CHESS(+3) + SMSF(+2) + feeDiff 0 (+3) + ratingDiff 0 (+2) + 0.4 tiebreaker = 10.4
    expect(scoreBrokerSimilarity(a, b)).toBeCloseTo(10.4, 5);
  });

  it("scores fee proximity: 0-2$ diff gives +3", () => {
    const a = makeBroker({ asx_fee_value: 10, rating: 0 });
    const b = makeBroker({ asx_fee_value: 11, rating: 0 });
    // chess match +3, smsf match +2, fee +3, rating diff 0 +2
    expect(scoreBrokerSimilarity(a, b)).toBe(10);
  });

  it("scores fee proximity: 3-5$ diff gives +1", () => {
    const a = makeBroker({ asx_fee_value: 10, rating: 0 });
    const b = makeBroker({ asx_fee_value: 15, rating: 0 });
    // chess(+3) + smsf(+2) + fee(+1) + ratingDiff 0(+2) = 8
    expect(scoreBrokerSimilarity(a, b)).toBe(8);
  });

  it("scores fee proximity: >5$ diff gives 0", () => {
    const a = makeBroker({ asx_fee_value: 10, rating: 0 });
    const b = makeBroker({ asx_fee_value: 30, rating: 0 });
    // chess(+3) + smsf(+2) + fee(0) + ratingDiff 0(+2) = 7
    expect(scoreBrokerSimilarity(a, b)).toBe(7);
  });

  it("scores rating proximity: <=0.3 gives +2", () => {
    const a = makeBroker({ asx_fee_value: 10, rating: 4.0 });
    const b = makeBroker({ asx_fee_value: 10, rating: 4.25 });
    // chess(+3) + smsf(+2) + fee(+3) + rating(+2) + 0.425 tiebreaker
    expect(scoreBrokerSimilarity(a, b)).toBeCloseTo(10.425, 5);
  });

  it("scores rating proximity: 0.3-0.7 gives +1", () => {
    const a = makeBroker({ asx_fee_value: 10, rating: 4.0 });
    const b = makeBroker({ asx_fee_value: 10, rating: 4.5 });
    // chess(+3) + smsf(+2) + fee(+3) + rating(+1) + 0.45 tiebreaker
    expect(scoreBrokerSimilarity(a, b)).toBeCloseTo(9.45, 5);
  });

  it("scores rating proximity: >0.7 gives 0", () => {
    const a = makeBroker({ asx_fee_value: 10, rating: 4.0 });
    const b = makeBroker({ asx_fee_value: 10, rating: 3.0 });
    // chess(+3) + smsf(+2) + fee(+3) + rating(0) + 0.3 tiebreaker
    expect(scoreBrokerSimilarity(a, b)).toBeCloseTo(8.3, 5);
  });

  it("defaults missing rating to 0 so unrated pairs still score deterministically", () => {
    const a = makeBroker({ asx_fee_value: 10 });
    const b = makeBroker({ asx_fee_value: 10 });
    // both ratings undefined -> both treated as 0, ratingDiff 0 -> +2
    // chess(+3) + smsf(+2) + fee(+3) + rating(+2) + 0 tiebreaker = 10
    expect(scoreBrokerSimilarity(a, b)).toBe(10);
  });

  it("defaults missing fee to 99 so missing-fee pairs compare identically", () => {
    const a = makeBroker({ rating: 4 });
    const b = makeBroker({ rating: 4 });
    // both fees undefined -> both treated as 99, feeDiff 0 -> +3
    // chess(+3) + smsf(+2) + fee(+3) + rating(+2) + 0.4 tiebreaker = 10.4
    expect(scoreBrokerSimilarity(a, b)).toBeCloseTo(10.4, 5);
  });

  it("sibling higher rating breaks ties", () => {
    const target = makeBroker({ rating: 4, asx_fee_value: 10 });
    const cheaper = makeBroker({ rating: 4, asx_fee_value: 10 });
    const better = makeBroker({ rating: 4.2, asx_fee_value: 10 });
    // Both within rating tolerance; tiebreaker ships the higher-rated.
    expect(scoreBrokerSimilarity(target, better)).toBeGreaterThan(
      scoreBrokerSimilarity(target, cheaper),
    );
  });
});
