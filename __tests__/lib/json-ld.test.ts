import { describe, it, expect } from "vitest";
import {
  articleLd,
  breadcrumbLd,
  faqLd,
  brokerProductLd,
  advisorProfileLd,
  reviewLd,
  organizationLd,
} from "@/lib/json-ld";

describe("organizationLd", () => {
  it("has the schema.org type and a logo ImageObject", () => {
    const ld = organizationLd();
    expect(ld["@type"]).toBe("Organization");
    const logo = ld.logo as Record<string, unknown>;
    expect(logo["@type"]).toBe("ImageObject");
    expect(typeof logo.url).toBe("string");
  });
});

describe("articleLd", () => {
  it("produces a basic article with publisher", () => {
    const ld = articleLd({
      title: "How to choose a broker",
      description: "The practical guide",
      slug: "how-to-choose-a-broker",
    });
    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@type"]).toBe("Article");
    expect(ld.headline).toBe("How to choose a broker");
    expect((ld.publisher as Record<string, unknown>)["@type"]).toBe("Organization");
  });

  it("includes reviewedBy when a reviewer is supplied", () => {
    const ld = articleLd({
      title: "t",
      description: "d",
      slug: "s",
      reviewer: { name: "Editor One" },
    });
    const reviewed = ld.reviewedBy as Record<string, unknown>;
    expect(reviewed.name).toBe("Editor One");
  });

  it("truncates absurdly long titles", () => {
    const ld = articleLd({
      title: "A".repeat(200),
      description: "d",
      slug: "s",
    });
    expect((ld.headline as string).length).toBeLessThanOrEqual(110);
  });
});

describe("breadcrumbLd", () => {
  it("produces ordered positions", () => {
    const ld = breadcrumbLd([
      { name: "Home", url: "/" },
      { name: "Brokers", url: "/compare" },
      { name: "Vanguard" },
    ]);
    const items = ld.itemListElement as Array<Record<string, unknown>>;
    expect(items).toHaveLength(3);
    expect(items[0].position).toBe(1);
    expect(items[2].position).toBe(3);
    // Final crumb with no URL doesn't include item
    expect(items[2].item).toBeUndefined();
  });
});

describe("faqLd", () => {
  it("wraps Q&A into schema.org Question entities", () => {
    const ld = faqLd([
      { question: "Q1?", answer: "A1." },
      { question: "Q2?", answer: "A2." },
    ]);
    const main = ld.mainEntity as Array<Record<string, unknown>>;
    expect(main).toHaveLength(2);
    expect(main[0]["@type"]).toBe("Question");
    const answer = main[0].acceptedAnswer as Record<string, unknown>;
    expect(answer.text).toBe("A1.");
  });
});

describe("brokerProductLd", () => {
  it("emits aggregateRating when rating + reviewCount present", () => {
    const ld = brokerProductLd({
      slug: "test",
      name: "TestBroker",
      description: "A broker.",
      rating: 4.6,
      reviewCount: 42,
    });
    const agg = ld.aggregateRating as Record<string, unknown>;
    expect(agg.ratingValue).toBe(4.6);
    expect(agg.reviewCount).toBe(42);
  });

  it("omits aggregateRating when no reviews", () => {
    const ld = brokerProductLd({
      slug: "test",
      name: "TestBroker",
      description: "A broker.",
      rating: null,
      reviewCount: 0,
    });
    expect(ld.aggregateRating).toBeUndefined();
  });
});

describe("advisorProfileLd", () => {
  it("combines name + firm into a single display name", () => {
    const ld = advisorProfileLd({
      slug: "alex",
      name: "Alex Example",
      firmName: "Example Advisory",
      description: "An advisor",
    });
    expect(ld.name).toBe("Alex Example — Example Advisory");
  });

  it("sets areaServed to Australia", () => {
    const ld = advisorProfileLd({
      slug: "alex",
      name: "Alex",
      description: "An advisor",
    });
    const area = ld.areaServed as Record<string, unknown>;
    expect(area.name).toBe("Australia");
  });
});

describe("reviewLd", () => {
  it("emits a Review with itemReviewed", () => {
    const ld = reviewLd({
      itemName: "TestBroker",
      itemUrl: "https://example.com/broker/test",
      rating: 5,
      author: "Alex",
      reviewBody: "Great broker",
    });
    expect(ld["@type"]).toBe("Review");
    const rating = ld.reviewRating as Record<string, unknown>;
    expect(rating.ratingValue).toBe(5);
    const item = ld.itemReviewed as Record<string, unknown>;
    expect(item.name).toBe("TestBroker");
  });
});
