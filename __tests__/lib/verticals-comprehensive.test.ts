import { describe, it, expect, beforeAll } from "vitest";
import {
  getVerticalBySlug,
  getAllVerticalSlugs,
  VERTICALS,
  type VerticalConfig,
} from "@/lib/verticals";

const ALL_SLUGS = ["share-trading", "crypto", "savings", "super", "cfd"];

describe("getAllVerticalSlugs", () => {
  it("returns exactly 5 vertical slugs", () => {
    const slugs = getAllVerticalSlugs();
    expect(slugs).toHaveLength(5);
  });

  it("includes all expected slugs", () => {
    const slugs = getAllVerticalSlugs();
    for (const expected of ALL_SLUGS) {
      expect(slugs).toContain(expected);
    }
  });

  it("returns an array of strings", () => {
    const slugs = getAllVerticalSlugs();
    for (const slug of slugs) {
      expect(typeof slug).toBe("string");
    }
  });
});

describe("getVerticalBySlug", () => {
  it("returns the correct config for each known slug", () => {
    for (const slug of ALL_SLUGS) {
      const config = getVerticalBySlug(slug);
      expect(config).toBeDefined();
      expect(config!.slug).toBe(slug);
    }
  });

  it("returns undefined for an unknown slug", () => {
    expect(getVerticalBySlug("nonexistent")).toBeUndefined();
  });

  it("returns undefined for empty string", () => {
    expect(getVerticalBySlug("")).toBeUndefined();
  });
});

describe("each vertical has required fields", () => {
  for (const slug of ALL_SLUGS) {
    describe(`vertical: ${slug}`, () => {
      let vertical: VerticalConfig;

      beforeAll(() => {
        vertical = getVerticalBySlug(slug)!;
      });

      it("has a non-empty title", () => {
        expect(vertical.title.length).toBeGreaterThan(0);
      });

      it("has a non-empty h1", () => {
        expect(vertical.h1.length).toBeGreaterThan(0);
      });

      it("has a non-empty metaDescription", () => {
        expect(vertical.metaDescription.length).toBeGreaterThan(0);
      });

      it("has at least one platformType", () => {
        expect(vertical.platformTypes.length).toBeGreaterThanOrEqual(1);
      });

      it("has color object with all required keys", () => {
        expect(vertical.color).toBeDefined();
        expect(vertical.color.bg).toBeDefined();
        expect(vertical.color.border).toBeDefined();
        expect(vertical.color.text).toBeDefined();
        expect(vertical.color.accent).toBeDefined();
        expect(vertical.color.gradient).toBeDefined();
      });

      it("has at least one stat", () => {
        expect(vertical.stats.length).toBeGreaterThanOrEqual(1);
        for (const stat of vertical.stats) {
          expect(stat.label.length).toBeGreaterThan(0);
          expect(stat.value.length).toBeGreaterThan(0);
        }
      });

      it("has at least one subcategory", () => {
        expect(vertical.subcategories.length).toBeGreaterThanOrEqual(1);
      });

      it("has at least one tool", () => {
        expect(vertical.tools.length).toBeGreaterThanOrEqual(1);
      });

      it("has at least one section", () => {
        expect(vertical.sections.length).toBeGreaterThanOrEqual(1);
        for (const section of vertical.sections) {
          expect(section.heading.length).toBeGreaterThan(0);
          expect(section.body.length).toBeGreaterThan(0);
        }
      });

      it("has at least one FAQ", () => {
        expect(vertical.faqs.length).toBeGreaterThanOrEqual(1);
        for (const faq of vertical.faqs) {
          expect(faq.question.length).toBeGreaterThan(0);
          expect(faq.answer.length).toBeGreaterThan(0);
        }
      });
    });
  }
});

describe("vertical subcategory hrefs are valid", () => {
  for (const slug of ALL_SLUGS) {
    it(`${slug}: all subcategory hrefs start with /`, () => {
      const vertical = getVerticalBySlug(slug)!;
      for (const sub of vertical.subcategories) {
        expect(sub.href).toMatch(/^\//);
      }
    });

    it(`${slug}: all subcategory hrefs have no trailing whitespace`, () => {
      const vertical = getVerticalBySlug(slug)!;
      for (const sub of vertical.subcategories) {
        expect(sub.href).toBe(sub.href.trim());
      }
    });

    it(`${slug}: all subcategories have a label and description`, () => {
      const vertical = getVerticalBySlug(slug)!;
      for (const sub of vertical.subcategories) {
        expect(sub.label.length).toBeGreaterThan(0);
        expect(sub.description.length).toBeGreaterThan(0);
      }
    });
  }
});

describe("vertical tools have valid hrefs", () => {
  for (const slug of ALL_SLUGS) {
    it(`${slug}: all tool hrefs start with /`, () => {
      const vertical = getVerticalBySlug(slug)!;
      for (const tool of vertical.tools) {
        expect(tool.href).toMatch(/^\//);
      }
    });

    it(`${slug}: all tools have a label and icon`, () => {
      const vertical = getVerticalBySlug(slug)!;
      for (const tool of vertical.tools) {
        expect(tool.label.length).toBeGreaterThan(0);
        expect(tool.icon.length).toBeGreaterThan(0);
      }
    });
  }
});

describe("VERTICALS array", () => {
  it("exports exactly 5 verticals", () => {
    expect(VERTICALS).toHaveLength(5);
  });

  it("has unique slugs", () => {
    const slugs = VERTICALS.map((v) => v.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
