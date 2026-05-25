/**
 * Tests for the `alternatives` VerticalConfig entry in lib/verticals.ts.
 *
 * Verifies the config satisfies the VerticalConfig interface contract,
 * is accessible via getVerticalBySlug, and its subcategories/tools
 * match the directory-page cross-links.
 */
import { describe, it, expect } from "vitest";
import { getVerticalBySlug, getAllVerticalSlugs } from "@/lib/verticals";

describe("alternatives VerticalConfig", () => {
  it("is findable by slug", () => {
    const v = getVerticalBySlug("alternatives");
    expect(v).toBeDefined();
    expect(v!.slug).toBe("alternatives");
  });

  it("appears in getAllVerticalSlugs()", () => {
    const slugs = getAllVerticalSlugs();
    expect(slugs).toContain("alternatives");
  });

  it("has all required VerticalConfig fields", () => {
    const v = getVerticalBySlug("alternatives");
    expect(v).toBeDefined();
    const a = v!;

    expect(a.title).toBeTruthy();
    expect(a.h1).toBeTruthy();
    expect(a.metaDescription).toBeTruthy();
    expect(a.heroHeadline).toBeTruthy();
    expect(a.heroSubtext).toBeTruthy();
    expect(a.platformTypes.length).toBeGreaterThan(0);
  });

  it("has a complete color palette", () => {
    const v = getVerticalBySlug("alternatives")!;
    expect(v.color.bg).toBeTruthy();
    expect(v.color.border).toBeTruthy();
    expect(v.color.text).toBeTruthy();
    expect(v.color.accent).toBeTruthy();
    expect(v.color.gradient).toBeTruthy();
  });

  it("has at least 7 subcategories covering main asset classes", () => {
    const v = getVerticalBySlug("alternatives")!;
    expect(v.subcategories.length).toBeGreaterThanOrEqual(7);

    const hrefs = v.subcategories.map((s) => s.href);
    // Must link into the listings sub-routes
    expect(hrefs.some((h) => h.includes("/invest/alternatives/listings"))).toBe(true);
  });

  it("includes wine, art, watches, cars, whisky, coins asset classes in subcategories", () => {
    const v = getVerticalBySlug("alternatives")!;
    const labels = v.subcategories.map((s) => s.label.toLowerCase());
    expect(labels.some((l) => l.includes("wine"))).toBe(true);
    expect(labels.some((l) => l.includes("art"))).toBe(true);
    expect(labels.some((l) => l.includes("watch"))).toBe(true);
    expect(labels.some((l) => l.includes("car"))).toBe(true);
    expect(labels.some((l) => l.includes("whisky"))).toBe(true);
    expect(labels.some((l) => l.includes("coin"))).toBe(true);
  });

  it("has at least 3 tools pointing to platform, listings, and guides pages", () => {
    const v = getVerticalBySlug("alternatives")!;
    expect(v.tools.length).toBeGreaterThanOrEqual(3);

    const hrefs = v.tools.map((t) => t.href);
    expect(hrefs).toContain("/invest/alternatives/platforms");
    expect(hrefs).toContain("/invest/alternatives/listings");
    expect(hrefs).toContain("/invest/alternatives/guides");
  });

  it("has at least 4 content sections", () => {
    const v = getVerticalBySlug("alternatives")!;
    expect(v.sections.length).toBeGreaterThanOrEqual(4);
    for (const section of v.sections) {
      expect(section.heading).toBeTruthy();
      expect(section.body.length).toBeGreaterThan(100);
    }
  });

  it("has at least 6 FAQs covering key investor questions", () => {
    const v = getVerticalBySlug("alternatives")!;
    expect(v.faqs.length).toBeGreaterThanOrEqual(6);
    for (const faq of v.faqs) {
      expect(faq.question).toBeTruthy();
      expect(faq.answer).toBeTruthy();
    }
  });

  it("has 4 stats entries", () => {
    const v = getVerticalBySlug("alternatives")!;
    expect(v.stats.length).toBe(4);
    for (const stat of v.stats) {
      expect(stat.label).toBeTruthy();
      expect(stat.value).toBeTruthy();
    }
  });

  it("includes SMSF advisor type in advisorTypes", () => {
    const v = getVerticalBySlug("alternatives")!;
    expect(v.advisorTypes).toBeDefined();
    const types = (v.advisorTypes ?? []).map((at) => at.type);
    expect(types).toContain("smsf_accountant");
  });

  it("includes alternatives-relevant expert tags", () => {
    const v = getVerticalBySlug("alternatives")!;
    expect(v.expertTags).toBeDefined();
    const tags = v.expertTags ?? [];
    expect(tags).toContain("alternatives");
    expect(tags).toContain("wine");
    expect(tags).toContain("art");
  });
});
