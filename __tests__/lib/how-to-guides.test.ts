import { describe, it, expect } from "vitest";
import { HOW_TO_GUIDES, getAllGuideSlugs, getGuide } from "@/lib/how-to-guides";

describe("HOW_TO_GUIDES config", () => {
  it("has at least 5 guides", () => {
    expect(HOW_TO_GUIDES.length).toBeGreaterThanOrEqual(5);
  });

  it.each(HOW_TO_GUIDES)("$slug has all required fields", (g) => {
    expect(g.slug).toBeTruthy();
    expect(g.title).toBeTruthy();
    expect(g.h1).toBeTruthy();
    expect(g.metaDescription).toBeTruthy();
    expect(g.intro).toBeTruthy();
    expect(g.verticalLink).toBeTruthy();
    expect(g.relatedBestPages.length).toBeGreaterThan(0);
  });

  it.each(HOW_TO_GUIDES)("$slug has at least 4 steps with heading and body", (g) => {
    expect(g.steps.length).toBeGreaterThanOrEqual(4);
    g.steps.forEach((step) => {
      expect(step.heading).toBeTruthy();
      expect(step.body).toBeTruthy();
    });
  });

  it.each(HOW_TO_GUIDES)("$slug has at least 4 FAQs", (g) => {
    expect(g.faqs.length).toBeGreaterThanOrEqual(4);
    g.faqs.forEach((faq) => {
      expect(faq.question).toBeTruthy();
      expect(faq.answer).toBeTruthy();
    });
  });

  it.each(HOW_TO_GUIDES)("$slug relatedBrokerFilter is a function", (g) => {
    expect(typeof g.relatedBrokerFilter).toBe("function");
  });
});

describe("getGuide", () => {
  it("returns correct guide for valid slug", () => {
    const guide = getGuide("buy-shares");
    expect(guide).toBeDefined();
    expect(guide!.slug).toBe("buy-shares");
    expect(guide!.h1).toContain("Buy Shares");
  });

  it("returns bitcoin guide", () => {
    const guide = getGuide("buy-bitcoin");
    expect(guide).toBeDefined();
    expect(guide!.h1).toContain("Bitcoin");
  });

  it("returns undefined for invalid slug", () => {
    expect(getGuide("nonexistent")).toBeUndefined();
    expect(getGuide("")).toBeUndefined();
  });
});

describe("getAllGuideSlugs", () => {
  it("returns slugs matching guide count", () => {
    const slugs = getAllGuideSlugs();
    expect(slugs).toHaveLength(HOW_TO_GUIDES.length);
  });

  it("includes core guide slugs", () => {
    const slugs = getAllGuideSlugs();
    expect(slugs).toContain("buy-shares");
    expect(slugs).toContain("buy-bitcoin");
    expect(slugs).toContain("buy-etfs");
    expect(slugs).toContain("open-brokerage-account");
    expect(slugs).toContain("start-investing");
  });
});
