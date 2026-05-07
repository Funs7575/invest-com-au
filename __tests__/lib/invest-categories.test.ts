import { describe, it, expect } from "vitest";
import {
  getAllInvestCategories,
  getInvestCategoryBySlug,
  getAllInvestCategorySlugs,
  getSubcategoryBySlug,
  getAllSubcategorySlugs,
  getCategoryDbFilter,
  getOpportunityCategories,
  getGuideCategories,
} from "@/lib/invest-categories";

describe("invest-categories data integrity", () => {
  const cats = getAllInvestCategories();

  it("exposes several categories", () => {
    expect(cats.length).toBeGreaterThan(2);
  });

  it("every category has the required shape", () => {
    for (const cat of cats) {
      expect(cat.slug).toBeTruthy();
      expect(cat.label).toBeTruthy();
      expect(cat.dbVerticals.length).toBeGreaterThan(0);
      expect(cat.color).toBeDefined();
      expect(cat.title).toBeTruthy();
      expect(cat.h1).toBeTruthy();
      expect(cat.metaDescription).toBeTruthy();
      expect(Array.isArray(cat.faqs)).toBe(true);
      expect(Array.isArray(cat.subcategories)).toBe(true);
    }
  });

  it("slugs are url-safe", () => {
    for (const cat of cats) {
      expect(cat.slug).toMatch(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/);
    }
  });

  it("slugs are globally unique", () => {
    const slugs = cats.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("every subcategory has slug + label + dbValue + seo fields", () => {
    for (const cat of cats) {
      for (const sub of cat.subcategories) {
        expect(sub.slug).toBeTruthy();
        expect(sub.label).toBeTruthy();
        expect(sub.dbValue).toBeTruthy();
        expect(sub.title).toBeTruthy();
        expect(sub.h1).toBeTruthy();
        expect(sub.metaDescription).toBeTruthy();
        expect(Array.isArray(sub.faqs)).toBe(true);
      }
    }
  });

  it("subcategory slugs are unique within their parent category", () => {
    for (const cat of cats) {
      const subSlugs = cat.subcategories.map((s) => s.slug);
      expect(new Set(subSlugs).size).toBe(subSlugs.length);
    }
  });
});

describe("getInvestCategoryBySlug", () => {
  it("returns undefined for unknown slug", () => {
    expect(getInvestCategoryBySlug("not-a-real-category")).toBeUndefined();
  });

  it("returns the category for a known slug", () => {
    const firstSlug = getAllInvestCategorySlugs()[0];
    expect(firstSlug).toBeTruthy();
    expect(getInvestCategoryBySlug(firstSlug!)?.slug).toBe(firstSlug);
  });
});

describe("getAllInvestCategorySlugs", () => {
  it("returns a string[] matching categories.slug", () => {
    const slugs = getAllInvestCategorySlugs();
    const cats = getAllInvestCategories();
    expect(slugs).toEqual(cats.map((c) => c.slug));
  });
});

describe("getSubcategoryBySlug", () => {
  it("returns undefined for an unknown category", () => {
    expect(getSubcategoryBySlug("nope", "nope")).toBeUndefined();
  });

  it("returns undefined when the subcategory slug doesn't exist", () => {
    const firstCat = getAllInvestCategories()[0]!;
    expect(getSubcategoryBySlug(firstCat.slug, "nope")).toBeUndefined();
  });

  it("returns the matching subcategory", () => {
    const firstCat = getAllInvestCategories().find(
      (c) => c.subcategories.length > 0,
    )!;
    const firstSub = firstCat.subcategories[0]!;
    expect(
      getSubcategoryBySlug(firstCat.slug, firstSub.slug)?.slug,
    ).toBe(firstSub.slug);
  });
});

describe("getAllSubcategorySlugs", () => {
  it("flattens every category's subcategories with parent slug", () => {
    const pairs = getAllSubcategorySlugs();
    const cats = getAllInvestCategories();
    const expectedLen = cats.reduce(
      (s, c) => s + c.subcategories.length,
      0,
    );
    expect(pairs).toHaveLength(expectedLen);
    for (const p of pairs) {
      expect(typeof p.category).toBe("string");
      expect(typeof p.subcategory).toBe("string");
    }
  });
});

describe("IA intent (2026-05-07 refactor)", () => {
  const cats = getAllInvestCategories();

  it("every category carries an intent", () => {
    for (const cat of cats) {
      expect(cat.intent).toMatch(/^(opportunity|compare|guide)$/);
    }
  });

  it("getOpportunityCategories returns the 15 canonical opportunity verticals", () => {
    const slugs = getOpportunityCategories()
      .map((c) => c.slug)
      .sort();
    expect(slugs).toEqual(
      [
        "alternatives",
        "buy-business",
        "commercial-property",
        "farmland",
        "franchise",
        "funds",
        "income-assets",
        "infrastructure",
        "mining",
        "pre-ipo",
        "private-credit",
        "private-equity",
        "renewable-energy",
        "royalties",
        "startups",
      ].sort(),
    );
  });

  it("the 4 redirected slugs are tagged as compare", () => {
    const compareSlugs = cats
      .filter((c) => c.intent === "compare")
      .map((c) => c.slug)
      .sort();
    expect(compareSlugs).toEqual(
      ["dividend-investing", "forex", "ipos", "managed-funds"].sort(),
    );
  });

  it("the 13 guide slugs (sector hubs + retained education) are tagged as guide", () => {
    const guideSlugs = getGuideCategories()
      .map((c) => c.slug)
      .sort();
    expect(guideSlugs).toEqual(
      [
        "bonds",
        "commodities",
        "crypto-staking",
        "gold",
        "hybrid-securities",
        "hydrogen",
        "ipo-calendar",
        "lithium",
        "oil-gas",
        "options-trading",
        "reits",
        "smsf",
        "uranium",
      ].sort(),
    );
  });

  it("intent partitions are exhaustive and disjoint", () => {
    const buckets = { opportunity: 0, compare: 0, guide: 0 };
    for (const cat of cats) buckets[cat.intent]++;
    expect(buckets.opportunity + buckets.compare + buckets.guide).toBe(
      cats.length,
    );
  });
});

describe("getCategoryDbFilter", () => {
  it("returns just verticals when dbFundSubCategories is absent/empty", () => {
    const cat = getAllInvestCategories().find(
      (c) => !c.dbFundSubCategories || c.dbFundSubCategories.length === 0,
    )!;
    expect(cat).toBeTruthy();
    const filter = getCategoryDbFilter(cat);
    expect(filter).toEqual({ verticals: cat.dbVerticals });
  });

  it("includes sub_category filter when dbFundSubCategories is set", () => {
    const catWithSub = getAllInvestCategories().find(
      (c) => c.dbFundSubCategories && c.dbFundSubCategories.length > 0,
    );
    if (!catWithSub) return; // nothing to test
    const filter = getCategoryDbFilter(catWithSub);
    expect(filter.verticals).toEqual(catWithSub.dbVerticals);
    expect(filter.subCategories).toEqual(catWithSub.dbFundSubCategories);
  });
});
