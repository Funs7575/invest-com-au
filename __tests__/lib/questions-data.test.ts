import { describe, it, expect } from "vitest";
import {
  QUESTIONS,
  QUESTIONS_BY_SLUG,
  QUESTION_CATEGORIES,
  CATEGORY_LABELS,
} from "@/lib/questions-data";

describe("questions-data", () => {
  it("has at least 100 questions", () => {
    expect(QUESTIONS.length).toBeGreaterThanOrEqual(100);
  });

  it("every question has required fields", () => {
    for (const q of QUESTIONS) {
      expect(q.slug, `${q.slug} missing slug`).toBeTruthy();
      expect(q.category, `${q.slug} missing category`).toBeTruthy();
      expect(q.question, `${q.slug} missing question`).toBeTruthy();
      expect(q.shortAnswer, `${q.slug} missing shortAnswer`).toBeTruthy();
      expect(q.sections.length, `${q.slug} needs at least 1 section`).toBeGreaterThan(0);
    }
  });

  it("all slugs are unique", () => {
    const slugs = QUESTIONS.map((q) => q.slug);
    const unique = new Set(slugs);
    expect(unique.size).toBe(slugs.length);
  });

  it("QUESTIONS_BY_SLUG lookup works for all questions", () => {
    for (const q of QUESTIONS) {
      expect(QUESTIONS_BY_SLUG.get(q.slug)).toBe(q);
    }
  });

  it("QUESTION_CATEGORIES includes all used categories", () => {
    const usedCategories = new Set(QUESTIONS.map((q) => q.category));
    for (const cat of usedCategories) {
      expect(QUESTION_CATEGORIES).toContain(cat);
    }
  });

  it("CATEGORY_LABELS has a label for every used category", () => {
    const usedCategories = new Set(QUESTIONS.map((q) => q.category));
    for (const cat of usedCategories) {
      expect(CATEGORY_LABELS[cat], `Missing label for category: ${cat}`).toBeTruthy();
    }
  });

  it("each question's relatedSlugs reference existing slugs", () => {
    const slugSet = new Set(QUESTIONS.map((q) => q.slug));
    for (const q of QUESTIONS) {
      if (q.relatedSlugs) {
        for (const ref of q.relatedSlugs) {
          expect(slugSet.has(ref), `${q.slug} references missing slug: ${ref}`).toBe(true);
        }
      }
    }
  });

  it("crypto and insurance categories are present", () => {
    expect(QUESTION_CATEGORIES).toContain("crypto");
    expect(QUESTION_CATEGORIES).toContain("insurance");
  });

  it("each category has at least 5 questions", () => {
    for (const cat of QUESTION_CATEGORIES) {
      const count = QUESTIONS.filter((q) => q.category === cat).length;
      expect(count, `category ${cat} has fewer than 5 questions`).toBeGreaterThanOrEqual(5);
    }
  });
});
