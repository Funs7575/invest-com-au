import { describe, it, expect } from "vitest";
import {
  NAV_HUB_REGISTRY,
  getHubNavColumns,
  getHubNavSidebar,
} from "@/lib/nav-registry";

describe("NAV_HUB_REGISTRY", () => {
  it("has at least one entry", () => {
    expect(NAV_HUB_REGISTRY.length).toBeGreaterThan(0);
  });

  it("every entry has required fields", () => {
    for (const entry of NAV_HUB_REGISTRY) {
      expect(entry.slug).toBeTruthy();
      expect(entry.navLabel).toBeTruthy();
      expect(entry.navDesc).toBeTruthy();
      expect(["investment", "tools", "advisors"]).toContain(entry.group);
    }
  });

  it("slugs are unique", () => {
    const slugs = NAV_HUB_REGISTRY.map((e) => e.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describe("getHubNavColumns", () => {
  it("returns at least one column", () => {
    const cols = getHubNavColumns();
    expect(cols.length).toBeGreaterThan(0);
  });

  it("each column has a title and items array", () => {
    const cols = getHubNavColumns();
    for (const col of cols) {
      expect(typeof col.title).toBe("string");
      expect(Array.isArray(col.items)).toBe(true);
      expect(col.items.length).toBeGreaterThan(0);
    }
  });

  it("items have label, href, and desc", () => {
    const cols = getHubNavColumns();
    for (const col of cols) {
      for (const item of col.items) {
        expect(item.label).toBeTruthy();
        expect(item.href).toMatch(/^\//);
        expect(item.desc).toBeTruthy();
      }
    }
  });

  it("groups registry entries by group field", () => {
    const cols = getHubNavColumns();
    const investmentCol = cols.find((c) => c.title === "Investment Hubs");
    expect(investmentCol).toBeDefined();
    const expectedSlugs = NAV_HUB_REGISTRY.filter((e) => e.group === "investment").map(
      (e) => `/${e.slug}`,
    );
    const actualHrefs = (investmentCol?.items ?? []).map((i) => i.href);
    expect(actualHrefs).toEqual(expectedSlugs);
  });
});

describe("getHubNavSidebar", () => {
  it("returns required fields", () => {
    const sidebar = getHubNavSidebar();
    expect(sidebar.heading).toBeTruthy();
    expect(Array.isArray(sidebar.links)).toBe(true);
    expect(sidebar.ctaLabel).toBeTruthy();
    expect(sidebar.ctaHref).toMatch(/^\//);
  });

  it("links cap at 5", () => {
    const sidebar = getHubNavSidebar();
    expect(sidebar.links.length).toBeLessThanOrEqual(5);
  });

  it("accepts custom heading, ctaLabel, ctaHref", () => {
    const sidebar = getHubNavSidebar({
      heading: "Browse",
      ctaLabel: "See all",
      ctaHref: "/hubs",
    });
    expect(sidebar.heading).toBe("Browse");
    expect(sidebar.ctaLabel).toBe("See all");
    expect(sidebar.ctaHref).toBe("/hubs");
  });
});
