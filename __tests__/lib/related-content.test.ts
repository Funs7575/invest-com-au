import { describe, it, expect } from "vitest";
import {
  getRelatedForArticle,
  getRelatedForBroker,
  getRelatedForAdvisor,
} from "@/lib/related-content";
import type { Article, Broker, Professional } from "@/lib/types";

// ─── Fixtures ──────────────────────────────────────────────────

function makeArticle(
  overrides: Partial<Article> = {},
): Pick<Article, "id" | "slug" | "title" | "category" | "tags" | "read_time" | "published_at"> {
  return {
    id: 1,
    slug: "test-article",
    title: "Test Article",
    category: "Investing Basics",
    tags: ["beginners", "etf"],
    read_time: 5,
    published_at: "2026-01-01",
    ...overrides,
  };
}

function makeBroker(overrides: Partial<Broker> = {}): Pick<
  Broker,
  | "id"
  | "slug"
  | "name"
  | "platform_type"
  | "is_crypto"
  | "chess_sponsored"
  | "smsf_support"
  | "markets"
  | "rating"
  | "asx_fee_value"
> {
  return {
    id: 1,
    slug: "test-broker",
    name: "Test Broker",
    platform_type: "share_broker",
    is_crypto: false,
    chess_sponsored: false,
    smsf_support: false,
    markets: ["ASX", "US"],
    rating: 4.0,
    asx_fee_value: 9.5,
    ...overrides,
  };
}

function makeAdvisor(
  overrides: Partial<Professional> = {},
): Pick<
  Professional,
  | "id"
  | "slug"
  | "name"
  | "type"
  | "specialties"
  | "location_state"
  | "location_display"
  | "rating"
  | "verified"
  | "firm_name"
> {
  return {
    id: 1,
    slug: "test-advisor",
    name: "Test Advisor",
    type: "financial_planner",
    specialties: ["super", "investments"],
    location_state: "VIC",
    location_display: "Melbourne, VIC",
    rating: 4.5,
    verified: true,
    firm_name: undefined,
    ...overrides,
  };
}

// ─── getRelatedForArticle ───────────────────────────────────────

describe("getRelatedForArticle", () => {
  describe("articles — relatedness", () => {
    it("returns articles in the same category", () => {
      const current = makeArticle({ id: 1, slug: "current", category: "ETFs" });
      const related = makeArticle({
        id: 2,
        slug: "related",
        category: "ETFs",
        title: "ETF Guide",
        tags: [],
      });
      const unrelated = makeArticle({
        id: 3,
        slug: "unrelated",
        category: "Property",
        tags: [],
        title: "Property Tips",
      });

      const { articles } = getRelatedForArticle(current, [related, unrelated]);
      const slugs = articles.map((a) => a.href);
      expect(slugs).toContain("/article/related");
      expect(slugs).not.toContain("/article/unrelated");
    });

    it("returns articles with shared tags even in a different category", () => {
      const current = makeArticle({
        id: 1,
        slug: "current",
        category: "ETFs",
        tags: ["etf", "passive"],
      });
      const crossCat = makeArticle({
        id: 2,
        slug: "cross",
        category: "Property",
        tags: ["etf"],
        title: "Cross Category",
      });

      const { articles } = getRelatedForArticle(current, [crossCat]);
      expect(articles[0]?.href).toBe("/article/cross");
    });

    it("ranks same-category above same-tag-only articles", () => {
      const current = makeArticle({
        id: 1,
        slug: "current",
        category: "ETFs",
        tags: ["etf"],
      });
      const sameCat = makeArticle({
        id: 2,
        slug: "same-cat",
        category: "ETFs",
        tags: [],
        title: "Same Cat",
      });
      const sameTag = makeArticle({
        id: 3,
        slug: "same-tag",
        category: "Property",
        tags: ["etf"],
        title: "Same Tag",
      });

      const { articles } = getRelatedForArticle(current, [sameTag, sameCat]);
      expect(articles[0]?.href).toBe("/article/same-cat");
    });

    it("uses recency as tiebreaker for equal scores", () => {
      const current = makeArticle({ id: 1, slug: "c", category: "Tax" });
      const older = makeArticle({
        id: 2,
        slug: "older",
        category: "Tax",
        title: "Older",
        published_at: "2025-01-01",
      });
      const newer = makeArticle({
        id: 3,
        slug: "newer",
        category: "Tax",
        title: "Newer",
        published_at: "2026-03-01",
      });

      const { articles } = getRelatedForArticle(current, [older, newer]);
      expect(articles[0]?.href).toBe("/article/newer");
    });
  });

  describe("articles — self-exclusion", () => {
    it("never includes the current article", () => {
      const current = makeArticle({ id: 1, slug: "self", category: "ETFs" });
      const pool = [
        makeArticle({ id: 1, slug: "self", title: "Same Article", category: "ETFs" }),
        makeArticle({ id: 2, slug: "other", title: "Other", category: "ETFs" }),
      ];

      const { articles } = getRelatedForArticle(current, pool);
      expect(articles.every((a) => a.href !== "/article/self")).toBe(true);
    });
  });

  describe("articles — caps", () => {
    it("caps results at 6", () => {
      const current = makeArticle({ id: 0, slug: "c", category: "ETFs" });
      const pool = Array.from({ length: 10 }, (_, i) =>
        makeArticle({ id: i + 1, slug: `a${i}`, category: "ETFs", title: `A ${i}` }),
      );

      const { articles } = getRelatedForArticle(current, pool);
      expect(articles.length).toBeLessThanOrEqual(6);
    });
  });

  describe("articles — empty cases", () => {
    it("returns empty arrays when pool is empty", () => {
      const current = makeArticle({ id: 1, slug: "c", category: "ETFs" });
      const { articles } = getRelatedForArticle(current, []);
      expect(articles).toEqual([]);
      // tools may still have calculator hints from category, so not asserted here
    });

    it("returns empty articles when no article shares category or tags", () => {
      const current = makeArticle({ id: 1, slug: "c", category: "ETFs", tags: [] });
      const pool = [
        makeArticle({ id: 2, slug: "other", category: "Crypto", tags: [], title: "Crypto" }),
      ];
      const { articles } = getRelatedForArticle(current, pool);
      expect(articles).toEqual([]);
    });
  });

  describe("tools — calculator hints", () => {
    it("uses explicit related_calc field first", () => {
      const current = makeArticle({
        id: 1,
        slug: "c",
        category: "ETFs",
        tags: [],
        related_calc: "calc-franking",
      } as Pick<Article, "id" | "slug" | "category" | "tags" | "related_calc">);

      const { tools } = getRelatedForArticle(current as Parameters<typeof getRelatedForArticle>[0], []);
      expect(tools[0]?.href).toContain("calc-franking");
      expect(tools[0]?.badgeText).toBe("Calculator");
    });

    it("derives a calculator from the category string when no related_calc", () => {
      const current = makeArticle({
        id: 1,
        slug: "c",
        category: "Tax & Strategy",
        tags: ["cgt"],
      });

      const { tools } = getRelatedForArticle(current, []);
      const hrefs = tools.map((t) => t.href);
      expect(hrefs.some((h) => h.includes("calc-cgt"))).toBe(true);
    });

    it("derives a guide link when no calculator matches", () => {
      const current = makeArticle({
        id: 1,
        slug: "c",
        category: "mortgage",
        tags: ["home loan"],
      });

      const { tools } = getRelatedForArticle(current, []);
      const hrefs = tools.map((t) => t.href);
      expect(hrefs.some((h) => h.includes("mortgage-broker"))).toBe(true);
    });

    it("caps tools at 2", () => {
      const current = makeArticle({
        id: 1,
        slug: "c",
        category: "Tax & Strategy",
        tags: ["franking", "cgt", "fx", "chess", "switch", "mortgage"],
      });

      const { tools } = getRelatedForArticle(current, []);
      expect(tools.length).toBeLessThanOrEqual(2);
    });

    it("returns no tools when no signals are present", () => {
      const current = makeArticle({
        id: 1,
        slug: "c",
        category: "Miscellaneous",
        tags: [],
      });

      const { tools } = getRelatedForArticle(current, []);
      expect(tools).toEqual([]);
    });
  });
});

// ─── getRelatedForBroker ────────────────────────────────────────

describe("getRelatedForBroker", () => {
  describe("brokers — relatedness", () => {
    it("returns brokers of the same platform_type", () => {
      const current = makeBroker({ id: 1, slug: "curr", platform_type: "share_broker" });
      const same = makeBroker({ id: 2, slug: "same", platform_type: "share_broker", name: "Same" });
      const different = makeBroker({ id: 3, slug: "diff", platform_type: "crypto_exchange", name: "Diff" });

      const { brokers } = getRelatedForBroker(current, [same, different], []);
      const slugs = brokers.map((b) => b.href);
      expect(slugs).toContain("/broker/same");
      expect(slugs).not.toContain("/broker/diff");
    });

    it("excludes crypto brokers when current is non-crypto", () => {
      const current = makeBroker({ id: 1, slug: "curr", is_crypto: false });
      const cryptoBroker = makeBroker({
        id: 2,
        slug: "crypto",
        is_crypto: true,
        name: "Crypto",
        platform_type: "share_broker",
      });

      const { brokers } = getRelatedForBroker(current, [cryptoBroker], []);
      expect(brokers).toEqual([]);
    });

    it("respects crypto type match for crypto brokers", () => {
      const current = makeBroker({
        id: 1,
        slug: "curr",
        is_crypto: true,
        platform_type: "crypto_exchange",
      });
      const sameCrypto = makeBroker({
        id: 2,
        slug: "c2",
        is_crypto: true,
        platform_type: "crypto_exchange",
        name: "Crypto 2",
      });

      const { brokers } = getRelatedForBroker(current, [sameCrypto], []);
      expect(brokers[0]?.href).toBe("/broker/c2");
    });

    it("uses market overlap as a secondary signal", () => {
      const current = makeBroker({ id: 1, slug: "c", markets: ["ASX", "US", "HK"] });
      const manyMarkets = makeBroker({ id: 2, slug: "m", markets: ["ASX", "US", "HK"], name: "Many" });
      const fewMarkets = makeBroker({ id: 3, slug: "f", markets: ["ASX"], name: "Few" });

      const { brokers } = getRelatedForBroker(current, [fewMarkets, manyMarkets], []);
      expect(brokers[0]?.href).toBe("/broker/m");
    });
  });

  describe("brokers — self-exclusion", () => {
    it("never includes the current broker", () => {
      const current = makeBroker({ id: 1, slug: "self" });
      const pool = [
        makeBroker({ id: 1, slug: "self", name: "Self" }),
        makeBroker({ id: 2, slug: "other", name: "Other" }),
      ];

      const { brokers } = getRelatedForBroker(current, pool, []);
      expect(brokers.every((b) => b.href !== "/broker/self")).toBe(true);
    });
  });

  describe("brokers — caps", () => {
    it("caps broker results at 4", () => {
      const current = makeBroker({ id: 0, slug: "c" });
      const pool = Array.from({ length: 10 }, (_, i) =>
        makeBroker({ id: i + 1, slug: `b${i}`, name: `B${i}` }),
      );

      const { brokers } = getRelatedForBroker(current, pool, []);
      expect(brokers.length).toBeLessThanOrEqual(4);
    });
  });

  describe("brokers — guides", () => {
    it("returns a platform-type guide hint", () => {
      const current = makeBroker({ id: 1, slug: "c", platform_type: "share_broker" });
      const { guides } = getRelatedForBroker(current, [], []);
      expect(guides.length).toBe(1);
      expect(guides[0]?.title).toBe("How to Choose a Share Broker");
      expect(guides[0]?.badgeText).toBe("Guide");
    });

    it("returns no guide for an unknown platform type", () => {
      const current = makeBroker({ id: 1, slug: "c", platform_type: "unknown_xyz" as never });
      const { guides } = getRelatedForBroker(current, [], []);
      expect(guides).toEqual([]);
    });
  });

  describe("brokers — articles", () => {
    it("returns related articles", () => {
      const current = makeBroker({ id: 1, slug: "curr" });
      const articles = [makeArticle({ id: 10, slug: "art", title: "Art" })];

      const { articles: result } = getRelatedForBroker(current, [], articles);
      expect(result[0]?.href).toBe("/article/art");
    });

    it("caps articles at 3", () => {
      const current = makeBroker({ id: 1, slug: "curr" });
      const articles = Array.from({ length: 6 }, (_, i) =>
        makeArticle({ id: i, slug: `a${i}`, title: `A${i}` }),
      );

      const { articles: result } = getRelatedForBroker(current, [], articles);
      expect(result.length).toBeLessThanOrEqual(3);
    });
  });

  describe("brokers — empty cases", () => {
    it("returns empty arrays when pool is empty", () => {
      const current = makeBroker({ id: 1, slug: "c" });
      const { brokers, articles } = getRelatedForBroker(current, [], []);
      expect(brokers).toEqual([]);
      expect(articles).toEqual([]);
    });
  });
});

// ─── getRelatedForAdvisor ───────────────────────────────────────

describe("getRelatedForAdvisor", () => {
  describe("advisors — relatedness", () => {
    it("returns advisors of the same type only", () => {
      const current = makeAdvisor({ id: 1, slug: "c", type: "financial_planner" });
      const sameType = makeAdvisor({ id: 2, slug: "same", type: "financial_planner", name: "FP2", specialties: ["super"] });
      const diffType = makeAdvisor({ id: 3, slug: "diff", type: "tax_agent", name: "Tax", specialties: [] });

      const { advisors } = getRelatedForAdvisor(current, [sameType, diffType]);
      const slugs = advisors.map((a) => a.href);
      expect(slugs).toContain("/advisor/same");
      expect(slugs).not.toContain("/advisor/diff");
    });

    it("ranks advisors with more shared specialties higher", () => {
      const current = makeAdvisor({
        id: 1,
        slug: "c",
        specialties: ["super", "investments", "retirement"],
      });
      const highOverlap = makeAdvisor({
        id: 2,
        slug: "high",
        specialties: ["super", "investments", "retirement"],
        name: "High",
      });
      const lowOverlap = makeAdvisor({
        id: 3,
        slug: "low",
        specialties: ["super"],
        name: "Low",
      });

      const { advisors } = getRelatedForAdvisor(current, [lowOverlap, highOverlap]);
      expect(advisors[0]?.href).toBe("/advisor/high");
    });

    it("gives a bonus to advisors in the same state", () => {
      const current = makeAdvisor({ id: 1, slug: "c", location_state: "VIC", specialties: [] });
      const sameState = makeAdvisor({
        id: 2,
        slug: "vic",
        location_state: "VIC",
        specialties: [],
        name: "VIC",
        verified: false,
      });
      const diffState = makeAdvisor({
        id: 3,
        slug: "nsw",
        location_state: "NSW",
        specialties: [],
        name: "NSW",
        verified: false,
      });

      const { advisors } = getRelatedForAdvisor(current, [diffState, sameState]);
      expect(advisors[0]?.href).toBe("/advisor/vic");
    });

    it("gives a bonus to verified advisors", () => {
      const current = makeAdvisor({ id: 1, slug: "c", location_state: "WA", specialties: [] });
      const notVerified = makeAdvisor({
        id: 2,
        slug: "unv",
        location_state: "WA",
        specialties: [],
        verified: false,
        name: "Unverified",
      });
      const verified = makeAdvisor({
        id: 3,
        slug: "ver",
        location_state: "WA",
        specialties: [],
        verified: true,
        name: "Verified",
      });

      const { advisors } = getRelatedForAdvisor(current, [notVerified, verified]);
      expect(advisors[0]?.href).toBe("/advisor/ver");
    });
  });

  describe("advisors — self-exclusion", () => {
    it("never includes the current advisor", () => {
      const current = makeAdvisor({ id: 1, slug: "self" });
      const pool = [
        makeAdvisor({ id: 1, slug: "self", name: "Self" }),
        makeAdvisor({ id: 2, slug: "other", name: "Other", specialties: ["super"] }),
      ];

      const { advisors } = getRelatedForAdvisor(current, pool);
      expect(advisors.every((a) => a.href !== "/advisor/self")).toBe(true);
    });
  });

  describe("advisors — caps", () => {
    it("caps advisor results at 3", () => {
      const current = makeAdvisor({ id: 0, slug: "c" });
      const pool = Array.from({ length: 8 }, (_, i) =>
        makeAdvisor({ id: i + 1, slug: `a${i}`, name: `A${i}`, specialties: ["super"] }),
      );

      const { advisors } = getRelatedForAdvisor(current, pool);
      expect(advisors.length).toBeLessThanOrEqual(3);
    });
  });

  describe("advisors — guides", () => {
    it("returns a guide link for known advisor types", () => {
      const current = makeAdvisor({ id: 1, slug: "c", type: "financial_planner" });
      const { guides } = getRelatedForAdvisor(current, []);
      expect(guides.length).toBeGreaterThan(0);
      expect(guides[0]?.href).toContain("financial-planner");
    });

    it("returns a directory link for advisor types without a specific guide", () => {
      const current = makeAdvisor({ id: 1, slug: "c", type: "aged_care_advisor" });
      const { guides } = getRelatedForAdvisor(current, []);
      const hrefs = guides.map((g) => g.href);
      expect(hrefs.some((h) => h.includes("aged-care-advisors"))).toBe(true);
    });

    it("caps guides at 2", () => {
      const current = makeAdvisor({ id: 1, slug: "c", type: "mortgage_broker" });
      const { guides } = getRelatedForAdvisor(current, []);
      expect(guides.length).toBeLessThanOrEqual(2);
    });
  });

  describe("advisors — empty cases", () => {
    it("returns empty advisors array when no candidates match", () => {
      const current = makeAdvisor({
        id: 1,
        slug: "c",
        type: "financial_planner",
        specialties: [],
        location_state: undefined,
      });
      const pool = [
        makeAdvisor({ id: 2, slug: "o", type: "financial_planner", specialties: [], location_state: undefined, name: "Other", verified: false }),
      ];

      // The other advisor has zero score (no specialty overlap, no state match, not verified)
      const { advisors } = getRelatedForAdvisor(current, pool);
      expect(advisors).toEqual([]);
    });
  });
});
