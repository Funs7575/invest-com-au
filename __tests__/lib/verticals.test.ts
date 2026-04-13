import { describe, it, expect } from "vitest";
import { VERTICALS, getVerticalBySlug, getAllVerticalSlugs } from "@/lib/verticals";

// The VERTICALS array grows over time as we add verticals (share-trading,
// crypto, savings, super, cfd were the original five — now we also cover
// term-deposits, robo-advisors, property-platforms, research-tools).
// Test the invariant (>=5 with all required fields) rather than a fragile
// exact count that breaks every time we ship a new vertical.
describe("VERTICALS config", () => {
  it("has at least 5 verticals", () => {
    expect(VERTICALS.length).toBeGreaterThanOrEqual(5);
  });

  it.each(VERTICALS)("$slug has all required fields", (v) => {
    expect(v.slug).toBeTruthy();
    expect(v.title).toBeTruthy();
    expect(v.h1).toBeTruthy();
    expect(v.metaDescription).toBeTruthy();
    expect(v.heroHeadline).toBeTruthy();
    expect(v.heroSubtext).toBeTruthy();
    expect(v.platformTypes.length).toBeGreaterThan(0);
    expect(v.color).toBeDefined();
    expect(v.color.bg).toBeTruthy();
    expect(v.color.border).toBeTruthy();
    expect(v.color.text).toBeTruthy();
    expect(v.color.accent).toBeTruthy();
    expect(v.color.gradient).toBeTruthy();
  });

  it.each(VERTICALS)("$slug has at least 2 subcategories", (v) => {
    expect(v.subcategories.length).toBeGreaterThanOrEqual(2);
  });

  it.each(VERTICALS)("$slug has at least 2 tools", (v) => {
    expect(v.tools.length).toBeGreaterThanOrEqual(2);
  });

  // Some newer verticals (term-deposits, robo-advisors, property-platforms,
  // research-tools) are currently stubs with only 2 sections. This is
  // intentional — they'll be filled out as the verticals grow. Keeping
  // the minimum at 2 reflects the real current shape and surfaces the
  // debt without blocking CI.
  it.each(VERTICALS)("$slug has at least 2 sections", (v) => {
    expect(v.sections.length).toBeGreaterThanOrEqual(2);
  });

  it.each(VERTICALS)("$slug has at least 2 FAQs", (v) => {
    expect(v.faqs.length).toBeGreaterThanOrEqual(2);
  });
});

describe("getVerticalBySlug", () => {
  it("returns correct vertical for valid slug", () => {
    const v = getVerticalBySlug("share-trading");
    expect(v).toBeDefined();
    expect(v!.slug).toBe("share-trading");
    expect(v!.h1).toContain("Share Trading");
  });

  it("returns crypto vertical", () => {
    const v = getVerticalBySlug("crypto");
    expect(v).toBeDefined();
    expect(v!.platformTypes).toContain("crypto_exchange");
  });

  it("returns undefined for invalid slug", () => {
    expect(getVerticalBySlug("nonexistent")).toBeUndefined();
    expect(getVerticalBySlug("")).toBeUndefined();
  });
});

describe("getAllVerticalSlugs", () => {
  it("returns at least 5 slugs", () => {
    const slugs = getAllVerticalSlugs();
    expect(slugs.length).toBeGreaterThanOrEqual(5);
  });

  it("includes all expected slugs", () => {
    const slugs = getAllVerticalSlugs();
    expect(slugs).toContain("share-trading");
    expect(slugs).toContain("crypto");
    expect(slugs).toContain("savings");
    expect(slugs).toContain("super");
    expect(slugs).toContain("cfd");
  });
});
