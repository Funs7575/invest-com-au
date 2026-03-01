import { describe, it, expect } from "vitest";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  SITE_NAME,
  SITE_URL,
  SITE_DESCRIPTION,
  formatRole,
  REVIEW_AUTHOR,
} from "@/lib/seo";

describe("SEO constants", () => {
  describe("SITE_NAME", () => {
    it('equals "Invest.com.au"', () => {
      expect(SITE_NAME).toBe("Invest.com.au");
    });
  });

  describe("SITE_URL", () => {
    it("is a non-empty string", () => {
      expect(typeof SITE_URL).toBe("string");
      expect(SITE_URL.length).toBeGreaterThan(0);
    });

    it("uses NEXT_PUBLIC_SITE_URL env var", () => {
      expect(SITE_URL).toBe("https://invest.com.au");
    });
  });

  describe("SITE_DESCRIPTION", () => {
    it("starts with \"Compare Australia's\"", () => {
      expect(SITE_DESCRIPTION).toMatch(/^Compare Australia's/);
    });

    it("is a non-empty string", () => {
      expect(typeof SITE_DESCRIPTION).toBe("string");
      expect(SITE_DESCRIPTION.length).toBeGreaterThan(0);
    });
  });
});

describe("absoluteUrl", () => {
  it("prepends SITE_URL to a path with leading slash", () => {
    expect(absoluteUrl("/compare")).toBe("https://invest.com.au/compare");
  });

  it("adds leading slash when path does not start with one", () => {
    expect(absoluteUrl("about")).toBe("https://invest.com.au/about");
  });

  it("handles root path", () => {
    expect(absoluteUrl("/")).toBe("https://invest.com.au/");
  });

  it("handles nested paths", () => {
    expect(absoluteUrl("/broker/cmc-markets")).toBe(
      "https://invest.com.au/broker/cmc-markets"
    );
  });

  it("handles deeply nested paths", () => {
    expect(absoluteUrl("/best/brokers/asx")).toBe(
      "https://invest.com.au/best/brokers/asx"
    );
  });
});

describe("breadcrumbJsonLd", () => {
  it("generates correct BreadcrumbList schema", () => {
    const result = breadcrumbJsonLd([
      { name: "Home", url: "/" },
      { name: "Compare" },
    ]);

    expect(result["@context"]).toBe("https://schema.org");
    expect(result["@type"]).toBe("BreadcrumbList");
    expect(result.itemListElement).toHaveLength(2);
  });

  it("assigns 1-indexed positions", () => {
    const result = breadcrumbJsonLd([
      { name: "Home", url: "/" },
      { name: "Brokers", url: "/best" },
      { name: "CMC Markets" },
    ]);

    expect(result.itemListElement[0].position).toBe(1);
    expect(result.itemListElement[1].position).toBe(2);
    expect(result.itemListElement[2].position).toBe(3);
  });

  it('sets @type to "ListItem" for each element', () => {
    const result = breadcrumbJsonLd([{ name: "Home", url: "/" }]);
    expect(result.itemListElement[0]["@type"]).toBe("ListItem");
  });

  it('includes "item" property for items with url', () => {
    const result = breadcrumbJsonLd([
      { name: "Home", url: "/" },
      { name: "Compare" },
    ]);

    expect(result.itemListElement[0]).toEqual({
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: "/",
    });
  });

  it('omits "item" property for items without url', () => {
    const result = breadcrumbJsonLd([
      { name: "Home", url: "/" },
      { name: "Compare" },
    ]);

    expect(result.itemListElement[1]).toEqual({
      "@type": "ListItem",
      position: 2,
      name: "Compare",
    });
  });

  it("handles single breadcrumb item", () => {
    const result = breadcrumbJsonLd([{ name: "Home", url: "/" }]);
    expect(result.itemListElement).toHaveLength(1);
  });

  it("handles many breadcrumb items", () => {
    const result = breadcrumbJsonLd([
      { name: "Home", url: "/" },
      { name: "Best", url: "/best" },
      { name: "Brokers", url: "/best/brokers" },
      { name: "CMC Markets" },
    ]);
    expect(result.itemListElement).toHaveLength(4);
    expect(result.itemListElement[3].position).toBe(4);
  });
});

describe("formatRole", () => {
  it('formats "staff_writer" to "Staff Writer"', () => {
    expect(formatRole("staff_writer")).toBe("Staff Writer");
  });

  it('formats "contributor" to "Contributor"', () => {
    expect(formatRole("contributor")).toBe("Contributor");
  });

  it("passes through unknown roles unchanged", () => {
    expect(formatRole("unknown_role")).toBe("unknown_role");
  });

  it("returns the input string for an unrecognized role", () => {
    expect(formatRole("mystery")).toBe("mystery");
  });
});

describe("REVIEW_AUTHOR", () => {
  it("has a name property that is a non-empty string", () => {
    expect(typeof REVIEW_AUTHOR.name).toBe("string");
    expect(REVIEW_AUTHOR.name.length).toBeGreaterThan(0);
  });

  it("has a jobTitle property that is a non-empty string", () => {
    expect(typeof REVIEW_AUTHOR.jobTitle).toBe("string");
    expect(REVIEW_AUTHOR.jobTitle.length).toBeGreaterThan(0);
  });

  it("has a description property that is a non-empty string", () => {
    expect(typeof REVIEW_AUTHOR.description).toBe("string");
    expect(REVIEW_AUTHOR.description.length).toBeGreaterThan(0);
  });

  it("has a url property that is a non-empty string", () => {
    expect(typeof REVIEW_AUTHOR.url).toBe("string");
    expect(REVIEW_AUTHOR.url.length).toBeGreaterThan(0);
  });
});
