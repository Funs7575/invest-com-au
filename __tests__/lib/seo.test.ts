import { describe, it, expect } from "vitest";
import {
  SITE_URL,
  SITE_NAME,
  SITE_DESCRIPTION,
  CURRENT_YEAR,
  absoluteUrl,
  buildTitle,
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
  brokerProductJsonLd,
  reviewerPersonJsonLd,
  courseJsonLd,
  howToJsonLd,
  qaPageJsonLd,
} from "@/lib/seo";
import type { TeamMember, Broker, Course } from "@/lib/types";

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

describe("buildTitle", () => {
  it("returns a plain string for brand-free titles so the layout template fires", () => {
    expect(buildTitle("How to Buy Shares")).toBe("How to Buy Shares");
  });

  it("returns an absolute title when the brand is already present, preventing a doubled suffix", () => {
    // Without this, the root template "%s — Invest.com.au" would produce
    // "Careers | Invest.com.au — Invest.com.au".
    expect(buildTitle(`Careers | ${SITE_NAME}`)).toEqual({
      absolute: `Careers | ${SITE_NAME}`,
    });
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

/* ─── TEST-06: brokerProductJsonLd / reviewerPersonJsonLd / courseJsonLd ─── */

describe("brokerProductJsonLd", () => {
  const base = { name: "TestBroker", slug: "test-broker" };

  it("emits FinancialProduct with a #product @id anchored to the broker URL", () => {
    const jsonLd = brokerProductJsonLd(base);
    expect(jsonLd["@context"]).toBe("https://schema.org");
    expect(jsonLd["@type"]).toBe("FinancialProduct");
    expect(jsonLd.url).toBe(absoluteUrl("/broker/test-broker"));
    expect(jsonLd["@id"]).toBe(`${absoluteUrl("/broker/test-broker")}#product`);
  });

  it("classifies a crypto broker as a Cryptocurrency Exchange", () => {
    const jsonLd = brokerProductJsonLd({ ...base, is_crypto: true });
    expect(jsonLd.category).toBe("Cryptocurrency Exchange");
  });

  it("classifies platform_type robo_advisor as Robo-Advisor", () => {
    const jsonLd = brokerProductJsonLd({ ...base, platform_type: "robo_advisor" });
    expect(jsonLd.category).toBe("Robo-Advisor");
  });

  it("classifies platform_type super_fund as Superannuation Fund", () => {
    const jsonLd = brokerProductJsonLd({ ...base, platform_type: "super_fund" });
    expect(jsonLd.category).toBe("Superannuation Fund");
  });

  it("defaults to Share Trading Platform for anything else", () => {
    const jsonLd = brokerProductJsonLd({ ...base, platform_type: "share_broker" });
    expect(jsonLd.category).toBe("Share Trading Platform");
    expect(brokerProductJsonLd(base).category).toBe("Share Trading Platform");
  });

  it("prefers is_crypto over platform_type when both set", () => {
    const jsonLd = brokerProductJsonLd({ ...base, is_crypto: true, platform_type: "robo_advisor" });
    expect(jsonLd.category).toBe("Cryptocurrency Exchange");
  });

  it("includes aggregateRating only when review_count > 0", () => {
    const withRatings = brokerProductJsonLd({ ...base, rating: 4.2, review_count: 12 });
    expect(withRatings.aggregateRating).toBeDefined();
    expect(withRatings.aggregateRating?.ratingValue).toBe(4.2);
    expect(withRatings.aggregateRating?.reviewCount).toBe(12);

    expect(brokerProductJsonLd({ ...base, rating: 4.2, review_count: 0 }).aggregateRating).toBeUndefined();
    expect(brokerProductJsonLd(base).aggregateRating).toBeUndefined();
  });

  it("clamps ratingValue to a floor of 1 for 0 / undefined / negative", () => {
    expect(brokerProductJsonLd({ ...base, rating: 0, review_count: 3 }).aggregateRating?.ratingValue).toBe(1);
    expect(brokerProductJsonLd({ ...base, rating: -5, review_count: 3 }).aggregateRating?.ratingValue).toBe(1);
    expect(brokerProductJsonLd({ ...base, review_count: 3 }).aggregateRating?.ratingValue).toBe(1);
  });

  it("includes additionalProperty only when regulated_by set", () => {
    const regulated = brokerProductJsonLd({ ...base, regulated_by: "ASIC" });
    expect(regulated.additionalProperty).toEqual({
      "@type": "PropertyValue",
      name: "Regulated By",
      value: "ASIC",
    });
    expect(brokerProductJsonLd(base).additionalProperty).toBeUndefined();
  });

  it("includes provider.foundingDate only when year_founded set", () => {
    const founded = brokerProductJsonLd({ ...base, year_founded: 2010 });
    expect(founded.provider.foundingDate).toBe("2010");
    expect(brokerProductJsonLd(base).provider.foundingDate).toBeUndefined();
  });
});

describe("reviewerPersonJsonLd", () => {
  const member: TeamMember = {
    id: 7,
    slug: "jane-reviewer",
    full_name: "Jane Reviewer",
    role: "expert_reviewer",
    linkedin_url: "https://linkedin.com/in/jane",
    status: "active",
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
  };

  it("uses the /reviewers/ path (not /authors/)", () => {
    const jsonLd = reviewerPersonJsonLd(member);
    expect(jsonLd.url).toBe(absoluteUrl("/reviewers/jane-reviewer"));
    expect(jsonLd.url).not.toContain("/authors/");
  });

  it("sets jobTitle via formatRole", () => {
    const jsonLd = reviewerPersonJsonLd(member);
    expect(jsonLd.jobTitle).toBe(formatRole("expert_reviewer"));
    expect(jsonLd.jobTitle).toBe("Expert Reviewer");
  });

  it("includes sameAs only when linkedin_url set", () => {
    expect(reviewerPersonJsonLd(member).sameAs).toEqual(["https://linkedin.com/in/jane"]);
    const noLinkedin: TeamMember = { ...member, linkedin_url: undefined };
    expect(reviewerPersonJsonLd(noLinkedin).sameAs).toBeUndefined();
  });

  it("carries SITE_NAME / SITE_URL on the worksFor Organization", () => {
    const jsonLd = reviewerPersonJsonLd(member);
    expect(jsonLd.worksFor).toEqual({
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    });
  });
});

describe("courseJsonLd", () => {
  const base: Course = {
    id: 1,
    slug: "investing-101",
    title: "Investing 101",
    description: "Learn the basics.",
    price: 9900,
    currency: "AUD",
    revenue_share_percent: 0,
    level: "beginner",
    status: "published",
    featured: false,
    sort_order: 0,
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
  };

  it("formats offers.price as dollars from cents", () => {
    expect(courseJsonLd(base, 10, 3).offers.price).toBe("99.00");
    expect(courseJsonLd({ ...base, price: 12345 }, 10, 3).offers.price).toBe("123.45");
    expect(courseJsonLd({ ...base, price: 0 }, 10, 3).offers.price).toBe("0.00");
  });

  it("maps educationalLevel from level", () => {
    expect(courseJsonLd({ ...base, level: "beginner" }, 1, 1).educationalLevel).toBe("Beginner");
    expect(courseJsonLd({ ...base, level: "intermediate" }, 1, 1).educationalLevel).toBe("Intermediate");
    expect(courseJsonLd({ ...base, level: "advanced" }, 1, 1).educationalLevel).toBe("Advanced");
  });

  it("includes instructor only when creator set", () => {
    const creator: TeamMember = {
      id: 2,
      slug: "the-creator",
      full_name: "The Creator",
      role: "course_creator",
      status: "active",
      created_at: "2024-01-01",
      updated_at: "2024-01-01",
    };
    const withCreator = courseJsonLd({ ...base, creator }, 1, 1) as ReturnType<typeof courseJsonLd> & {
      instructor?: { "@type": string; name: string; url: string };
    };
    expect(withCreator.instructor).toEqual({
      "@type": "Person",
      name: "The Creator",
      url: absoluteUrl("/authors/the-creator"),
    });
    const noCreator = courseJsonLd(base, 1, 1) as Record<string, unknown>;
    expect(noCreator.instructor).toBeUndefined();
  });

  it("includes courseWorkload only when estimated_hours set", () => {
    const withHours = courseJsonLd({ ...base, estimated_hours: 4.4 }, 1, 1);
    expect(withHours.hasCourseInstance.courseWorkload).toBe("PT4H");
    const noHours = courseJsonLd(base, 1, 1);
    expect(noHours.hasCourseInstance.courseWorkload).toBeUndefined();
  });

  it("sets numberOfCredits to totalModules and inLanguage to en-AU", () => {
    const jsonLd = courseJsonLd(base, 12, 5);
    expect(jsonLd.numberOfCredits).toBe(5);
    expect(jsonLd.inLanguage).toBe("en-AU");
    expect(jsonLd["@type"]).toBe("Course");
  });
});

/* ─── TEST-13: seo howToJsonLd / qaPageJsonLd ─── */

describe("howToJsonLd (seo)", () => {
  const guide = {
    slug: "open-a-brokerage-account",
    h1: "How to open a brokerage account",
    intro: "A short walkthrough.",
    steps: [
      { heading: "Pick a broker", body: "Compare fees and features." },
      { heading: "Sign up", body: "x".repeat(600) },
    ],
  };

  it("emits HowTo with totalTime and AUD-zero estimatedCost", () => {
    const jsonLd = howToJsonLd(guide);
    expect(jsonLd["@type"]).toBe("HowTo");
    expect(jsonLd.totalTime).toBe("PT10M");
    expect(jsonLd.estimatedCost).toEqual({
      "@type": "MonetaryAmount",
      currency: "AUD",
      value: "0",
    });
  });

  it("numbers steps from 1 and anchors step urls", () => {
    const jsonLd = howToJsonLd(guide);
    expect(jsonLd.step[0].position).toBe(1);
    expect(jsonLd.step[1].position).toBe(2);
    expect(jsonLd.step[0].url).toBe(absoluteUrl("/how-to/open-a-brokerage-account#step-1"));
    expect(jsonLd.step[1].url).toBe(absoluteUrl("/how-to/open-a-brokerage-account#step-2"));
  });

  it("truncates step text to 500 chars", () => {
    const jsonLd = howToJsonLd(guide);
    expect(jsonLd.step[1].text).toHaveLength(500);
  });

  it("sets dateModified to today's ISO date and author to REVIEW_AUTHOR", () => {
    const jsonLd = howToJsonLd(guide);
    expect(jsonLd.dateModified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(jsonLd.author.name).toBe("invest.com.au Research Team");
  });
});

describe("qaPageJsonLd (seo)", () => {
  it("uses acceptedAnswer when an answer is accepted", () => {
    const jsonLd = qaPageJsonLd(
      [
        {
          question: "Is X safe?",
          answers: [
            { answer: "Not accepted.", is_accepted: false },
            { answer: "Yes, regulated.", is_accepted: true, display_name: "Jane" },
          ],
        },
      ],
      "Broker Q&A",
      "/ignored",
    );
    expect(jsonLd["@type"]).toBe("QAPage");
    expect(jsonLd.name).toBe("Broker Q&A");
    const q = jsonLd.mainEntity[0] as unknown as Record<string, { text: string; author: { name: string } }>;
    expect(q.acceptedAnswer.text).toBe("Yes, regulated.");
    expect(q.acceptedAnswer.author.name).toBe("Jane");
    expect((jsonLd.mainEntity[0] as Record<string, unknown>).suggestedAnswer).toBeUndefined();
  });

  it("falls back to 'Editorial Team' author when display_name missing", () => {
    const jsonLd = qaPageJsonLd(
      [{ question: "Q?", answers: [{ answer: "A.", is_accepted: true }] }],
      "Page",
      "/x",
    );
    const q = jsonLd.mainEntity[0] as unknown as Record<string, { author: { name: string } }>;
    expect(q.acceptedAnswer.author.name).toBe("Editorial Team");
  });

  it("uses suggestedAnswer for all answers when none accepted", () => {
    const jsonLd = qaPageJsonLd(
      [
        {
          question: "Q?",
          answers: [
            { answer: "A1.", is_accepted: false, display_name: "Bob" },
            { answer: "A2.", is_accepted: false },
          ],
        },
      ],
      "Page",
      "/x",
    );
    const q = jsonLd.mainEntity[0] as Record<string, unknown>;
    expect(q.acceptedAnswer).toBeUndefined();
    const suggested = q.suggestedAnswer as { text: string; author: { name: string } }[];
    expect(suggested).toHaveLength(2);
    expect(suggested[0]).toEqual({
      "@type": "Answer",
      text: "A1.",
      author: { "@type": "Person", name: "Bob" },
    });
    expect(suggested[1].author.name).toBe("Editorial Team");
  });

  it("emits neither answer key when there are no answers", () => {
    const jsonLd = qaPageJsonLd(
      [{ question: "Q?", answers: [] }],
      "Page",
      "/x",
    );
    const q = jsonLd.mainEntity[0] as Record<string, unknown>;
    expect(q.acceptedAnswer).toBeUndefined();
    expect(q.suggestedAnswer).toBeUndefined();
    expect(q.name).toBe("Q?");
  });

  it("ignores the third arg — pageName drives name", () => {
    const a = qaPageJsonLd([], "The Page Name", "/path-a");
    const b = qaPageJsonLd([], "The Page Name", "/path-b-different");
    expect(a.name).toBe("The Page Name");
    expect(a).toEqual(b);
  });
});
