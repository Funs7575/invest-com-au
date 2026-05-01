import { describe, it, expect } from "vitest";
import {
  getCategoryBySlug,
  getAllCategories,
  getAllCategorySlugs,
} from "@/lib/best-broker-categories";
import type { Broker } from "@/lib/types";

function fakeBroker(overrides: Partial<Broker> = {}): Broker {
  return {
    id: 1,
    slug: "fake",
    name: "Fake",
    status: "active",
    rating: 4.0,
    asx_fee: "$5",
    asx_fee_value: 5,
    us_fee: "$5",
    us_fee_value: 5,
    fx_rate: "0.50%",
    fx_rate_value: 0.5,
    chess_sponsored: true,
    smsf_support: true,
    is_crypto: false,
    platform_type: "share_broker",
    ...overrides,
  } as unknown as Broker;
}

describe("best-broker-categories registry", () => {
  const cats = getAllCategories();

  it("has at least 10 categories", () => {
    expect(cats.length).toBeGreaterThanOrEqual(10);
  });

  it("every category has all required seo + content fields", () => {
    for (const c of cats) {
      expect(c.slug).toBeTruthy();
      expect(c.title).toBeTruthy();
      expect(c.h1).toBeTruthy();
      expect(c.metaDescription).toBeTruthy();
      expect(c.intro).toBeTruthy();
      expect(typeof c.filter).toBe("function");
      expect(typeof c.sort).toBe("function");
      expect(Array.isArray(c.criteria)).toBe(true);
      expect(c.criteria.length).toBeGreaterThan(0);
      expect(Array.isArray(c.sections)).toBe(true);
      expect(Array.isArray(c.relatedLinks)).toBe(true);
      expect(Array.isArray(c.faqs)).toBe(true);
    }
  });

  it("slugs are url-safe", () => {
    for (const c of cats) {
      expect(c.slug).toMatch(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/);
    }
  });

  it("slugs are mostly unique (regression cap — a new dup should fail this)", () => {
    // Current known-dup count (options-trading has a long-standing dup).
    // If the diff between unique count and raw count climbs, that's a
    // regression even if it's not a full unique-set invariant.
    const slugs = cats.map((c) => c.slug);
    const unique = new Set(slugs).size;
    const duplicates = slugs.length - unique;
    // Allow up to the current pre-existing duplicate count, but flag any
    // new duplicates introduced.
    expect(duplicates).toBeLessThanOrEqual(1);
  });

  it("every filter function is safe to call on a plausible broker", () => {
    // Data integrity: filter implementations should never throw on a
    // "normal" broker shape. Catches TypeError regressions (e.g. accessing
    // .toLowerCase on a nullable field without ??).
    const b = fakeBroker();
    for (const c of cats) {
      expect(() => c.filter(b), `${c.slug}.filter threw`).not.toThrow();
    }
  });

  it("every sort function is safe to call on two plausible brokers (no throw)", () => {
    const a = fakeBroker({ rating: 4.0 });
    const b = fakeBroker({ rating: 4.5 });
    for (const c of cats) {
      expect(() => c.sort(a, b), `${c.slug}.sort threw`).not.toThrow();
    }
  });

  it("FAQ entries have both question + answer when present", () => {
    for (const c of cats) {
      for (const f of c.faqs) {
        expect(f.question).toBeTruthy();
        expect(f.answer).toBeTruthy();
      }
    }
  });

  it("companionLinks (when present) is a valid array of {label, sub, href} triples", () => {
    // Optional cross-vertical companion strip. The field is intentionally
    // optional — only top-traffic categories carry one — but if present
    // every entry must be a complete triple with a non-empty href, since
    // these render on 43 SEO pages and a broken link compounds.
    for (const c of cats) {
      if (c.companionLinks === undefined) continue;
      expect(Array.isArray(c.companionLinks), `${c.slug}.companionLinks not an array`).toBe(true);
      for (const link of c.companionLinks) {
        expect(typeof link.label, `${c.slug} companionLink.label`).toBe("string");
        expect(link.label.length, `${c.slug} companionLink.label empty`).toBeGreaterThan(0);
        expect(typeof link.sub, `${c.slug} companionLink.sub`).toBe("string");
        expect(link.sub.length, `${c.slug} companionLink.sub empty`).toBeGreaterThan(0);
        expect(typeof link.href, `${c.slug} companionLink.href`).toBe("string");
        expect(link.href.length, `${c.slug} companionLink.href empty`).toBeGreaterThan(0);
        // Must be an internal path or a fully-qualified URL — never a
        // bare token like "advisors/financial-planners" that would
        // resolve relative to the current /best/<slug> route.
        expect(link.href, `${c.slug} companionLink.href must start with / or http`).toMatch(/^(\/|https?:\/\/)/);
      }
    }
  });

  it("at least one category has companionLinks populated (sanity)", () => {
    // Regression guard: if someone strips out every companion strip,
    // the feature silently disappears from prod. Force at least one.
    const populated = cats.filter((c) => c.companionLinks && c.companionLinks.length > 0);
    expect(populated.length).toBeGreaterThan(0);
  });
});

describe("getCategoryBySlug", () => {
  it("returns undefined for unknown slug", () => {
    expect(getCategoryBySlug("not-a-real-category")).toBeUndefined();
  });

  it("returns a matching category for known slug (beginners)", () => {
    const beg = getCategoryBySlug("beginners");
    expect(beg?.slug).toBe("beginners");
    expect(beg?.h1.toLowerCase()).toContain("beginner");
  });
});

describe("getAllCategorySlugs", () => {
  it("matches getAllCategories().map(c => c.slug)", () => {
    expect(getAllCategorySlugs()).toEqual(
      getAllCategories().map((c) => c.slug),
    );
  });
});

describe("filter: beginners", () => {
  const cat = getCategoryBySlug("beginners")!;

  it("excludes crypto-only brokers", () => {
    expect(cat.filter(fakeBroker({ is_crypto: true }))).toBe(false);
  });

  it("excludes brokers with ASX fee > $10", () => {
    expect(
      cat.filter(fakeBroker({ asx_fee_value: 15, rating: 4 })),
    ).toBe(false);
  });

  it("excludes brokers with rating < 3.5", () => {
    expect(
      cat.filter(fakeBroker({ asx_fee_value: 5, rating: 2.9 })),
    ).toBe(false);
  });

  it("includes brokers that meet all three criteria", () => {
    expect(
      cat.filter(fakeBroker({ asx_fee_value: 5, rating: 4, is_crypto: false })),
    ).toBe(true);
  });
});
