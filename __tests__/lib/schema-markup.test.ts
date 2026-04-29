import { describe, it, expect } from "vitest";
import {
  articleJsonLd,
  faqJsonLd,
  brokerFinancialProductJsonLd,
  advisorJsonLd,
  itemListJsonLd,
  listingProductJsonLd,
  calculatorJsonLd,
  versusComparisonJsonLd,
} from "@/lib/schema-markup";

describe("articleJsonLd", () => {
  const base = {
    title: "A guide to SMSFs",
    slug: "guide-to-smsfs",
    description: "A full guide",
  };

  it("emits the required @context / @type", () => {
    const out = articleJsonLd(base);
    expect(out["@context"]).toBe("https://schema.org");
    expect(out["@type"]).toBe("Article");
  });

  it("falls back to the OG preview image when coverImageUrl is missing", () => {
    const out = articleJsonLd(base);
    expect(String(out.image)).toContain("/api/og");
  });

  it("uses the absolute coverImageUrl when provided", () => {
    const out = articleJsonLd({
      ...base,
      coverImageUrl: "/covers/smsf.png",
    });
    expect(String(out.image)).toContain("/covers/smsf.png");
  });

  it("defaults dateModified to publishedAt when updatedAt is missing", () => {
    const out = articleJsonLd({
      ...base,
      publishedAt: "2026-03-01",
    });
    expect(out.dateModified).toBe("2026-03-01");
  });

  it("falls back to the organisation author when authorName is absent", () => {
    const out = articleJsonLd(base);
    expect(
      (out.author as { "@type": string })["@type"],
    ).toBe("Organization");
  });
});

describe("faqJsonLd", () => {
  it("returns null for an empty array", () => {
    expect(faqJsonLd([])).toBeNull();
  });

  it("builds a valid FAQPage for non-empty items", () => {
    const out = faqJsonLd([
      { q: "What is SMSF?", a: "Self-managed super fund." },
    ]);
    expect(out).toMatchObject({
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "What is SMSF?",
          acceptedAnswer: { "@type": "Answer", text: "Self-managed super fund." },
        },
      ],
    });
  });
});

describe("brokerFinancialProductJsonLd", () => {
  it("emits a URL and brand", () => {
    const out = brokerFinancialProductJsonLd({ slug: "commsec", name: "CommSec" });
    expect(out["@type"]).toBe("FinancialProduct");
    expect(String(out.url)).toContain("/broker/commsec");
    expect((out.brand as { "@type": string })["@type"]).toBe("Organization");
  });

  it("omits aggregateRating when review count is zero", () => {
    const out = brokerFinancialProductJsonLd({
      slug: "foo",
      name: "Foo",
      rating: 4.5,
      reviewCount: 0,
    });
    expect(out.aggregateRating).toBeUndefined();
  });

  it("includes aggregateRating when review count > 0", () => {
    const out = brokerFinancialProductJsonLd({
      slug: "foo",
      name: "Foo",
      rating: 4.5,
      reviewCount: 10,
    });
    expect(out.aggregateRating).toBeDefined();
  });
});

describe("advisorJsonLd", () => {
  it("returns person + localBusiness when firmName is set", () => {
    const { person, localBusiness } = advisorJsonLd({
      slug: "jane-doe",
      name: "Jane Doe",
      firmName: "Doe Advisers",
    });
    expect(person["@type"]).toBe("Person");
    expect(localBusiness).not.toBeNull();
    expect(localBusiness?.["@type"]).toBe("LocalBusiness");
  });

  it("returns person but null localBusiness when firmName is missing", () => {
    const { person, localBusiness } = advisorJsonLd({
      slug: "jane-doe",
      name: "Jane Doe",
    });
    expect(person["@type"]).toBe("Person");
    expect(localBusiness).toBeNull();
  });
});

describe("itemListJsonLd", () => {
  it("emits a numbered list with absolute URLs", () => {
    const out = itemListJsonLd("Top brokers", [
      { position: 1, name: "Stake", url: "/broker/stake" },
      { position: 2, name: "CommSec", url: "/broker/commsec" },
    ]);
    expect(out.numberOfItems).toBe(2);
    expect(String(out.itemListElement[0].url)).toContain("/broker/stake");
  });
});

describe("listingProductJsonLd", () => {
  // Listing product output is a discriminated union (offers key lives
  // on some branches, areaServed on others). Cast to a bag in tests
  // so we can assert on the branch that actually produced it.
  type Bag = Record<string, unknown>;

  it("emits an InStock offer when priceAud is set", () => {
    const out = listingProductJsonLd({
      slug: "acme",
      title: "Acme fund",
      priceAud: 250_000,
    }) as Bag;
    const offers = out.offers as { availability?: string; price?: number };
    expect(offers.availability).toBe("https://schema.org/InStock");
    expect(offers.price).toBe(250_000);
  });

  it("falls back to priceDisplay when priceAud is absent", () => {
    const out = listingProductJsonLd({
      slug: "acme",
      title: "Acme fund",
      priceDisplay: "From $50,000",
    }) as Bag;
    const offers = out.offers as { priceSpecification?: string };
    expect(offers.priceSpecification).toBe("From $50,000");
  });

  it("omits offers entirely when neither price is set", () => {
    const out = listingProductJsonLd({ slug: "acme", title: "Acme" }) as Bag;
    expect(out.offers).toBeUndefined();
  });

  it("embeds areaServed when locationState is provided", () => {
    const out = listingProductJsonLd({
      slug: "acme",
      title: "Acme",
      locationState: "NSW",
      locationCity: "Sydney",
    }) as Bag;
    expect(out.areaServed).toBeDefined();
  });
});

describe("calculatorJsonLd", () => {
  it("emits a free WebApplication in the FinanceApplication category", () => {
    const out = calculatorJsonLd({
      name: "FIRB fee estimator",
      description: "Estimate your FIRB fee",
      path: "/firb-fee-estimator",
    });
    expect(out["@type"]).toBe("WebApplication");
    expect(out.applicationCategory).toBe("FinanceApplication");
    expect((out.offers as { price: string }).price).toBe("0");
  });
});

type Bag = Record<string, unknown>;

describe("versusComparisonJsonLd", () => {
  const BASE = {
    slugs: "stake-vs-commsec",
    title: "Stake vs CommSec — Side-by-Side Comparison (2026)",
    description: "Compare Stake and CommSec head to head.",
    brokers: [
      { slug: "stake", name: "Stake", rating: 4.5, reviewCount: 120 },
      { slug: "commsec", name: "CommSec", rating: 4.2, reviewCount: 300 },
    ],
  };

  it("article has @type Article and correct @context", () => {
    const { article } = versusComparisonJsonLd(BASE);
    expect(article["@context"]).toBe("https://schema.org");
    expect(article["@type"]).toBe("Article");
  });

  it("article headline matches the provided title", () => {
    const { article } = versusComparisonJsonLd(BASE);
    expect(article.headline).toBe(BASE.title);
  });

  it("article url points to /versus/<slugs>", () => {
    const { article } = versusComparisonJsonLd(BASE);
    expect(String(article.url)).toContain("/versus/stake-vs-commsec");
  });

  it("article image uses the /api/og/versus endpoint with encoded slugs", () => {
    const { article } = versusComparisonJsonLd(BASE);
    expect(String(article.image)).toContain("/api/og/versus");
    expect(String(article.image)).toContain("stake-vs-commsec");
  });

  it("article author and publisher are the site organisation", () => {
    const { article } = versusComparisonJsonLd(BASE);
    expect((article.author as Bag)["@type"]).toBe("Organization");
    expect((article.publisher as Bag)["@type"]).toBe("Organization");
  });

  it("returns one FinancialProduct per broker", () => {
    const { financialProducts } = versusComparisonJsonLd(BASE);
    expect(financialProducts).toHaveLength(2);
  });

  it("each FinancialProduct has @type FinancialProduct", () => {
    const { financialProducts } = versusComparisonJsonLd(BASE);
    for (const fp of financialProducts) {
      expect(fp["@type"]).toBe("FinancialProduct");
    }
  });

  it("FinancialProduct names match input broker names", () => {
    const { financialProducts } = versusComparisonJsonLd(BASE);
    expect(financialProducts[0]?.name).toBe("Stake");
    expect(financialProducts[1]?.name).toBe("CommSec");
  });

  it("FinancialProduct includes aggregateRating when rating + reviewCount are present", () => {
    const { financialProducts } = versusComparisonJsonLd(BASE);
    const fp = financialProducts[0] as Bag;
    const ag = fp.aggregateRating as Bag;
    expect(ag).toBeDefined();
    expect(ag["@type"]).toBe("AggregateRating");
    expect(ag.ratingValue).toBe(4.5);
    expect(ag.reviewCount).toBe(120);
  });

  it("FinancialProduct omits aggregateRating when rating is missing", () => {
    const { financialProducts } = versusComparisonJsonLd({
      ...BASE,
      brokers: [{ slug: "foo", name: "Foo", rating: null, reviewCount: null }],
    });
    expect((financialProducts[0] as Bag).aggregateRating).toBeUndefined();
  });

  it("FinancialProduct url points to /broker/<slug>", () => {
    const { financialProducts } = versusComparisonJsonLd(BASE);
    expect(String((financialProducts[0] as Bag).url)).toContain("/broker/stake");
    expect(String((financialProducts[1] as Bag).url)).toContain("/broker/commsec");
  });

  it("handles three-broker comparison", () => {
    const { financialProducts } = versusComparisonJsonLd({
      ...BASE,
      slugs: "stake-vs-commsec-vs-moomoo",
      brokers: [
        ...BASE.brokers,
        { slug: "moomoo", name: "moomoo", rating: 4.3, reviewCount: 80 },
      ],
    });
    expect(financialProducts).toHaveLength(3);
  });
});
