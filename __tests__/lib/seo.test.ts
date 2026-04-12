import { describe, it, expect } from "vitest";
import {
  SITE_URL,
  SITE_NAME,
  SITE_DESCRIPTION,
  CURRENT_YEAR,
  absoluteUrl,
  breadcrumbJsonLd,
  websiteJsonLd,
  ORGANIZATION_JSONLD,
  formatRole,
  articleFaqJsonLd,
  brokerReviewJsonLd,
  reviewArticleJsonLd,
  profilePageJsonLd,
  articleAuthorJsonLd,
  dealOfferJsonLd,
  dealsHubJsonLd,
} from "@/lib/seo";
import type { TeamMember, Broker } from "@/lib/types";

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

  it("handles empty string by adding leading slash", () => {
    expect(absoluteUrl("")).toBe(`${SITE_URL}/`);
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

  it("handles empty items array", () => {
    const result = breadcrumbJsonLd([]);
    expect(result.itemListElement).toEqual([]);
  });

  it("assigns incrementing positions starting at 1", () => {
    const items = [
      { name: "Home", url: "/" },
      { name: "Category", url: "/cat" },
      { name: "Page" },
    ];
    const result = breadcrumbJsonLd(items);
    expect(result.itemListElement[0].position).toBe(1);
    expect(result.itemListElement[1].position).toBe(2);
    expect(result.itemListElement[2].position).toBe(3);
  });
});

describe("websiteJsonLd", () => {
  it("returns WebSite schema with SearchAction", () => {
    const result = websiteJsonLd();
    expect(result["@type"]).toBe("WebSite");
    expect(result["@context"]).toBe("https://schema.org");
    expect(result.name).toBe(SITE_NAME);
    expect(result.potentialAction["@type"]).toBe("SearchAction");
  });

  it("includes publisher organization", () => {
    const result = websiteJsonLd();
    expect(result.publisher["@type"]).toBe("Organization");
  });

  it("search action target contains search_term_string placeholder", () => {
    const result = websiteJsonLd();
    expect(result.potentialAction.target.urlTemplate).toContain(
      "{search_term_string}"
    );
  });
});

describe("ORGANIZATION_JSONLD", () => {
  it("has correct structure", () => {
    expect(ORGANIZATION_JSONLD["@type"]).toBe("Organization");
    expect(ORGANIZATION_JSONLD.name).toContain("Invest.com.au");
    expect(ORGANIZATION_JSONLD.sameAs.length).toBeGreaterThan(0);
  });
});

describe("formatRole", () => {
  it("formats known roles", () => {
    expect(formatRole("staff_writer")).toBe("Staff Writer");
    expect(formatRole("editor")).toBe("Editor");
    expect(formatRole("expert_reviewer")).toBe("Expert Reviewer");
    expect(formatRole("contributor")).toBe("Contributor");
    expect(formatRole("course_creator")).toBe("Course Creator");
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

  it("truncates answer text to 500 characters", () => {
    const longBody = "A".repeat(600);
    const sections = [
      { heading: "What is this?", body: longBody },
      { heading: "How does it work?", body: "It works." },
    ];
    const result = articleFaqJsonLd(sections)!;
    expect(result.mainEntity[0].acceptedAnswer.text).toHaveLength(500);
  });

  it("returns null for sections with no question-like headings", () => {
    const sections = [
      { heading: "Overview", body: "Info." },
      { heading: "Methodology", body: "Details." },
    ];
    expect(articleFaqJsonLd(sections)).toBeNull();
  });
});

describe("brokerReviewJsonLd", () => {
  const broker = {
    name: "TestBroker",
    slug: "test-broker",
    tagline: "A great broker",
    rating: 4.5,
    asx_fee: "$5",
    regulated_by: "ASIC",
    year_founded: 2010,
    updated_at: "2025-06-01T00:00:00Z",
    created_at: "2024-01-01T00:00:00Z",
    pros: ["Low fees", "Good app"],
    cons: ["Limited markets"],
    review_count: 10,
  };

  it("returns FinancialProduct type with schema context", () => {
    const jsonLd = brokerReviewJsonLd(broker);
    expect(jsonLd["@context"]).toBe("https://schema.org");
    expect(jsonLd["@type"]).toBe("FinancialProduct");
  });

  it("includes review with rating", () => {
    const jsonLd = brokerReviewJsonLd(broker);
    expect(jsonLd.review["@type"]).toBe("Review");
    expect(jsonLd.review.reviewRating.ratingValue).toBe(4.5);
    expect(jsonLd.review.reviewRating.bestRating).toBe(5);
    expect(jsonLd.review.reviewRating.worstRating).toBe(1);
  });

  it("includes aggregateRating when review_count > 0", () => {
    const jsonLd = brokerReviewJsonLd(broker) as Record<string, unknown>;
    expect(jsonLd.aggregateRating).toBeDefined();
    expect((jsonLd.aggregateRating as Record<string, unknown>).reviewCount).toBe(10);
  });

  it("omits aggregateRating when review_count is 0", () => {
    const jsonLd = brokerReviewJsonLd({ ...broker, review_count: 0 }) as Record<string, unknown>;
    expect(jsonLd.aggregateRating).toBeUndefined();
  });

  it("includes feesAndCommissionsSpecification", () => {
    const jsonLd = brokerReviewJsonLd(broker) as Record<string, unknown>;
    expect(jsonLd.feesAndCommissionsSpecification).toContain("$5");
  });

  it("builds reviewBody from pros and cons", () => {
    const jsonLd = brokerReviewJsonLd(broker);
    expect(jsonLd.review.reviewBody).toContain("Low fees");
    expect(jsonLd.review.reviewBody).toContain("Limited markets");
  });

  it("uses custom reviewer when provided", () => {
    const reviewer: TeamMember = {
      id: 1,
      slug: "jane",
      full_name: "Jane Doe",
      role: "editor",
      status: "active",
      created_at: "2024-01-01",
      updated_at: "2024-01-01",
    };
    const jsonLd = brokerReviewJsonLd(broker, reviewer);
    expect(jsonLd.review.author.name).toBe("Jane Doe");
  });

  it("includes foundingDate when year_founded is set", () => {
    const jsonLd = brokerReviewJsonLd(broker) as Record<string, unknown>;
    expect(jsonLd.foundingDate).toBe("2010");
  });
});

describe("reviewArticleJsonLd", () => {
  const broker = {
    name: "TestBroker",
    slug: "test-broker",
    tagline: "A great broker",
    updated_at: "2025-06-01T00:00:00Z",
    created_at: "2024-01-01T00:00:00Z",
  };

  it("returns Article type", () => {
    const jsonLd = reviewArticleJsonLd(broker);
    expect(jsonLd["@type"]).toBe("Article");
  });

  it("includes headline with current year and broker name", () => {
    const jsonLd = reviewArticleJsonLd(broker);
    expect(jsonLd.headline).toContain(String(CURRENT_YEAR));
    expect(jsonLd.headline).toContain("TestBroker");
  });

  it("sets correct date fields", () => {
    const jsonLd = reviewArticleJsonLd(broker);
    expect(jsonLd.datePublished).toBe("2024-01-01");
    expect(jsonLd.dateModified).toBe("2025-06-01");
  });

  it("includes mainEntityOfPage", () => {
    const jsonLd = reviewArticleJsonLd(broker);
    expect(jsonLd.mainEntityOfPage["@type"]).toBe("WebPage");
    expect(jsonLd.mainEntityOfPage["@id"]).toContain("/broker/test-broker");
  });
});

describe("profilePageJsonLd", () => {
  const member: TeamMember = {
    id: 1,
    slug: "finn-webster",
    full_name: "Finn Webster",
    role: "editor",
    short_bio: "Lead editor.",
    credentials: ["CFA", "Finance degree"],
    linkedin_url: "https://linkedin.com/in/finn",
    twitter_url: "https://twitter.com/finn",
    status: "active",
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
  };

  it("returns ProfilePage type", () => {
    const jsonLd = profilePageJsonLd(member);
    expect(jsonLd["@type"]).toBe("ProfilePage");
  });

  it("includes sameAs from linkedin and twitter", () => {
    const jsonLd = profilePageJsonLd(member);
    expect(jsonLd.mainEntity.sameAs).toContain("https://linkedin.com/in/finn");
    expect(jsonLd.mainEntity.sameAs).toContain("https://twitter.com/finn");
  });

  it("includes credentials as knowsAbout", () => {
    const jsonLd = profilePageJsonLd(member);
    expect(jsonLd.mainEntity.knowsAbout).toEqual(["CFA", "Finance degree"]);
  });

  it("uses pathPrefix for URL", () => {
    const jsonLd = profilePageJsonLd(member, "reviewers");
    expect(jsonLd.mainEntity.url).toContain("/reviewers/finn-webster");
  });

  it("defaults to authors pathPrefix", () => {
    const jsonLd = profilePageJsonLd(member);
    expect(jsonLd.mainEntity.url).toContain("/authors/finn-webster");
  });

  it("omits sameAs when no social URLs present", () => {
    const minimalMember: TeamMember = {
      id: 2,
      slug: "test",
      full_name: "Test User",
      role: "contributor",
      status: "active",
      created_at: "2024-01-01",
      updated_at: "2024-01-01",
    };
    const jsonLd = profilePageJsonLd(minimalMember);
    expect(jsonLd.mainEntity.sameAs).toBeUndefined();
  });
});

describe("articleAuthorJsonLd", () => {
  it("returns Person type with author URL", () => {
    const member: TeamMember = {
      id: 1,
      slug: "finn",
      full_name: "Finn Webster",
      role: "editor",
      status: "active",
      created_at: "2024-01-01",
      updated_at: "2024-01-01",
    };
    const jsonLd = articleAuthorJsonLd(member);
    expect(jsonLd["@type"]).toBe("Person");
    expect(jsonLd.name).toBe("Finn Webster");
    expect(jsonLd.url).toContain("/authors/finn");
  });
});

describe("dealOfferJsonLd", () => {
  it("returns Offer type with broker deal text", () => {
    const broker = {
      name: "TestBroker",
      slug: "test-broker",
      deal_text: "Get $100 free",
      deal_terms: "T&C apply",
      deal_expiry: "2025-12-31",
    } as Broker;
    const jsonLd = dealOfferJsonLd(broker);
    expect(jsonLd["@type"]).toBe("Offer");
    expect(jsonLd.name).toBe("Get $100 free");
  });

  it("falls back to broker name when deal_text is missing", () => {
    const broker = { name: "TestBroker", slug: "test-broker" } as Broker;
    const jsonLd = dealOfferJsonLd(broker);
    expect(jsonLd.name).toContain("TestBroker");
  });
});

describe("dealsHubJsonLd", () => {
  it("returns ItemList with correct item count and positions", () => {
    const brokers = [
      { name: "A", slug: "a", deal_text: "Deal A" },
      { name: "B", slug: "b", deal_text: "Deal B" },
    ] as Broker[];
    const jsonLd = dealsHubJsonLd(brokers);
    expect(jsonLd["@type"]).toBe("ItemList");
    expect(jsonLd.numberOfItems).toBe(2);
    expect(jsonLd.itemListElement).toHaveLength(2);
    expect(jsonLd.itemListElement[0].position).toBe(1);
    expect(jsonLd.itemListElement[1].position).toBe(2);
  });

  it("handles empty brokers array", () => {
    const jsonLd = dealsHubJsonLd([]);
    expect(jsonLd.numberOfItems).toBe(0);
    expect(jsonLd.itemListElement).toEqual([]);
  });
});
