import { describe, it, expect } from "vitest";

import {
  QUESTIONS,
  QUESTIONS_BY_SLUG,
  QUESTION_CATEGORIES,
  CATEGORY_LABELS,
} from "@/lib/questions-data";

describe("questions-data content integrity", () => {
  it.each(QUESTIONS)("$slug has the required non-empty copy fields", (q) => {
    expect(q.slug.length).toBeGreaterThan(0);
    expect(q.question.length).toBeGreaterThan(0);
    expect(q.metaTitle.length).toBeGreaterThan(0);
    expect(q.metaDescription.length).toBeGreaterThan(0);
    expect(q.shortAnswer.length).toBeGreaterThan(0);
  });

  it.each(QUESTIONS)("$slug has at least one fully-populated section", (q) => {
    expect(q.sections.length).toBeGreaterThanOrEqual(1);
    for (const section of q.sections) {
      expect(section.heading.length).toBeGreaterThan(0);
      expect(section.body.length).toBeGreaterThan(0);
    }
  });

  it("has unique slugs", () => {
    const slugs = QUESTIONS.map((q) => q.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describe("QUESTIONS_BY_SLUG lookup map", () => {
  it("indexes every question exactly once", () => {
    expect(QUESTIONS_BY_SLUG.size).toBe(QUESTIONS.length);
  });

  it.each(QUESTIONS)("resolves $slug back to its entry", (q) => {
    expect(QUESTIONS_BY_SLUG.get(q.slug)).toBe(q);
  });
});

describe("category coverage", () => {
  it.each(QUESTION_CATEGORIES)("category %s has a non-empty label", (category) => {
    expect(CATEGORY_LABELS[category]).toBeDefined();
    expect(CATEGORY_LABELS[category].length).toBeGreaterThan(0);
  });

  it("every question's category has a label", () => {
    for (const q of QUESTIONS) {
      expect(CATEGORY_LABELS[q.category]).toBeDefined();
      expect(CATEGORY_LABELS[q.category].length).toBeGreaterThan(0);
    }
  });
});

describe("internal link integrity", () => {
  it.each(QUESTIONS)("$slug relatedSlugs all resolve (no dangling links)", (q) => {
    for (const related of q.relatedSlugs) {
      expect(QUESTIONS_BY_SLUG.has(related)).toBe(true);
    }
  });

  it.each(QUESTIONS)("$slug relatedTools have a label and a rooted href", (q) => {
    if (!q.relatedTools) return;
    for (const tool of q.relatedTools) {
      expect(tool.label.length).toBeGreaterThan(0);
      expect(tool.href.startsWith("/")).toBe(true);
    }
  });
});
