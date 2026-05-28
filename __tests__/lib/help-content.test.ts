import { describe, it, expect } from "vitest";
import {
  HELP_CATEGORIES,
  getCategoryBySlug,
  getArticleBySlug,
} from "@/lib/help-content";

// ── registry integrity ────────────────────────────────────────────────────────

describe("HELP_CATEGORIES registry", () => {
  it("contains at least one category", () => {
    expect(HELP_CATEGORIES.length).toBeGreaterThanOrEqual(1);
  });

  it("all category slugs are unique", () => {
    const slugs = HELP_CATEGORIES.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("every category has a non-empty slug, title, description, and at least one article", () => {
    for (const cat of HELP_CATEGORIES) {
      expect(cat.slug.length).toBeGreaterThan(0);
      expect(cat.title.length).toBeGreaterThan(0);
      expect(cat.description.length).toBeGreaterThan(0);
      expect(cat.articles.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("every article has a non-empty slug, title, summary, at least one body paragraph, and updatedAt", () => {
    for (const cat of HELP_CATEGORIES) {
      for (const article of cat.articles) {
        expect(article.slug.length).toBeGreaterThan(0);
        expect(article.title.length).toBeGreaterThan(0);
        expect(article.summary.length).toBeGreaterThan(0);
        expect(article.body.length).toBeGreaterThanOrEqual(1);
        expect(article.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
  });

  it("article slugs are unique within each category", () => {
    for (const cat of HELP_CATEGORIES) {
      const slugs = cat.articles.map((a) => a.slug);
      expect(new Set(slugs).size).toBe(slugs.length);
    }
  });

  it("every FAQ (when present) has a non-empty question and answer", () => {
    for (const cat of HELP_CATEGORIES) {
      for (const article of cat.articles) {
        for (const faq of article.faqs ?? []) {
          expect(faq.question.length).toBeGreaterThan(0);
          expect(faq.answer.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it("includes the getting-started category", () => {
    expect(HELP_CATEGORIES.some((c) => c.slug === "getting-started")).toBe(true);
  });
});

// ── getCategoryBySlug ─────────────────────────────────────────────────────────

describe("getCategoryBySlug", () => {
  it("returns the correct category for a known slug", () => {
    const cat = getCategoryBySlug("getting-started");
    expect(cat).toBeDefined();
    expect(cat!.slug).toBe("getting-started");
  });

  it("returns undefined for an unknown slug", () => {
    expect(getCategoryBySlug("not-a-category")).toBeUndefined();
  });

  it("returns undefined for an empty string", () => {
    expect(getCategoryBySlug("")).toBeUndefined();
  });

  it("round-trips every category through getCategoryBySlug", () => {
    for (const cat of HELP_CATEGORIES) {
      const found = getCategoryBySlug(cat.slug);
      expect(found).toEqual(cat);
    }
  });
});

// ── getArticleBySlug ──────────────────────────────────────────────────────────

describe("getArticleBySlug", () => {
  // Use the first article from the first category as a known good target
  const firstCat = HELP_CATEGORIES[0]!;
  const firstArticle = firstCat.articles[0]!;

  it("returns category and article for a known slug pair", () => {
    const result = getArticleBySlug(firstCat.slug, firstArticle.slug);
    expect(result).toBeDefined();
    expect(result!.category.slug).toBe(firstCat.slug);
    expect(result!.article.slug).toBe(firstArticle.slug);
  });

  it("returns undefined for an unknown category slug", () => {
    expect(getArticleBySlug("no-such-category", firstArticle.slug)).toBeUndefined();
  });

  it("returns undefined for an unknown article slug in a known category", () => {
    expect(getArticleBySlug(firstCat.slug, "no-such-article")).toBeUndefined();
  });

  it("returns undefined when both slugs are empty", () => {
    expect(getArticleBySlug("", "")).toBeUndefined();
  });

  it("round-trips every article through getArticleBySlug", () => {
    for (const cat of HELP_CATEGORIES) {
      for (const article of cat.articles) {
        const result = getArticleBySlug(cat.slug, article.slug);
        expect(result).toBeDefined();
        expect(result!.article.slug).toBe(article.slug);
      }
    }
  });
});
