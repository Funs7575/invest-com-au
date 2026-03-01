import { describe, it, expect } from "vitest";
import {
  SITE_URL, SITE_NAME, SITE_DESCRIPTION, CURRENT_YEAR,
  absoluteUrl, breadcrumbJsonLd, websiteJsonLd,
  ORGANIZATION_JSONLD, formatRole, articleFaqJsonLd,
} from "@/lib/seo";

describe("constants", () => {
  it("SITE_NAME is set", () => {
    expect(SITE_NAME).toBe("Invest.com.au");
  });

  it("SITE_URL uses env override", () => {
    expect(SITE_URL).toBe("https://invest.com.au");
  });

  it("SITE_DESCRIPTION is non-empty", () => {
    expect(SITE_DESCRIPTION.length).toBeGreaterThan(20);
  });

  it("CURRENT_YEAR is a valid year", () => {
    expect(CURRENT_YEAR).toBeGreaterThanOrEqual(2025);
  });
});

describe("absoluteUrl", () => {
  it("prepends site URL to path with slash", () => {
    expect(absoluteUrl("/compare")).toBe("https://invest.com.au/compare");
  });

  it("prepends site URL to path without slash", () => {
    expect(absoluteUrl("compare")).toBe("https://invest.com.au/compare");
  });

  it("handles root path", () => {
    expect(absoluteUrl("/")).toBe("https://invest.com.au/");
  });
});

describe("breadcrumbJsonLd", () => {
  it("returns valid BreadcrumbList schema", () => {
    const result = breadcrumbJsonLd([
      { name: "Home", url: "https://invest.com.au" },
      { name: "Compare" },
    ]);
    expect(result["@type"]).toBe("BreadcrumbList");
    expect(result.itemListElement).toHaveLength(2);
    expect(result.itemListElement[0].position).toBe(1);
    expect(result.itemListElement[0].name).toBe("Home");
    expect(result.itemListElement[0].item).toBe("https://invest.com.au");
    expect(result.itemListElement[1].position).toBe(2);
    expect(result.itemListElement[1]).not.toHaveProperty("item");
  });
});

describe("websiteJsonLd", () => {
  it("returns WebSite schema with SearchAction", () => {
    const result = websiteJsonLd();
    expect(result["@type"]).toBe("WebSite");
    expect(result.name).toBe(SITE_NAME);
    expect(result.potentialAction["@type"]).toBe("SearchAction");
  });
});

describe("ORGANIZATION_JSONLD", () => {
  it("has correct structure", () => {
    expect(ORGANIZATION_JSONLD["@type"]).toBe("Organization");
    expect(ORGANIZATION_JSONLD.name).toBe(SITE_NAME);
    expect(ORGANIZATION_JSONLD.sameAs.length).toBeGreaterThan(0);
  });
});

describe("formatRole", () => {
  it("formats known roles", () => {
    expect(formatRole("staff_writer")).toBe("Staff Writer");
    expect(formatRole("editor")).toBe("Editor");
    expect(formatRole("expert_reviewer")).toBe("Expert Reviewer");
  });

  it("passes through unknown roles", () => {
    expect(formatRole("unknown_role")).toBe("unknown_role");
  });
});

describe("articleFaqJsonLd", () => {
  it("returns null for fewer than 2 question sections", () => {
    const sections = [{ heading: "What is this?", body: "A test." }];
    expect(articleFaqJsonLd(sections)).toBeNull();
  });

  it("builds FAQPage schema for question-like headings", () => {
    const sections = [
      { heading: "What is brokerage?", body: "Brokerage is a fee charged..." },
      { heading: "How do I start investing?", body: "Open an account..." },
      { heading: "Our Methodology", body: "We test every broker..." },
    ];
    const result = articleFaqJsonLd(sections)!;
    expect(result["@type"]).toBe("FAQPage");
    // Only 2 match (What/How), "Our Methodology" doesn't
    expect(result.mainEntity).toHaveLength(2);
  });

  it("includes question mark headings", () => {
    const sections = [
      { heading: "Is this safe?", body: "Yes." },
      { heading: "Really safe?", body: "Very." },
    ];
    const result = articleFaqJsonLd(sections)!;
    expect(result.mainEntity).toHaveLength(2);
  });
});
