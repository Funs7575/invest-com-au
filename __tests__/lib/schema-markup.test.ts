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
  definedTermJsonLd,
  definedTermSetJsonLd,
  definedTermPageJsonLd,
  speakableSpecification,
  speakableWebPageJsonLd,
  qaPageJsonLd,
  articleAnswerFirstJsonLd,
  glossaryTermQaJsonLd,
  comparisonPageItemListJsonLd,
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

describe("definedTermJsonLd", () => {
  const BASE = {
    term: "Franking Credit",
    slug: "franking-credit",
    definition: "A tax credit passed to shareholders for company tax already paid.",
  };

  it("emits a DefinedTerm with @context and term identity", () => {
    const out = definedTermJsonLd(BASE) as Bag;
    expect(out["@context"]).toBe("https://schema.org");
    expect(out["@type"]).toBe("DefinedTerm");
    expect(out.name).toBe("Franking Credit");
    expect(out.termCode).toBe("franking-credit");
  });

  it("links each term to its own /glossary/<slug> URL", () => {
    const out = definedTermJsonLd(BASE) as Bag;
    expect(String(out.url)).toContain("/glossary/franking-credit");
  });

  it("references the shared DefinedTermSet identity", () => {
    const out = definedTermJsonLd(BASE) as Bag;
    const set = out.inDefinedTermSet as Bag;
    expect(set["@type"]).toBe("DefinedTermSet");
    expect(String(set.url)).toContain("/glossary");
  });
});

describe("definedTermSetJsonLd", () => {
  const TERMS = [
    { term: "ASX", slug: "asx", definition: "Australian Securities Exchange." },
    { term: "ETF", slug: "etf", definition: "Exchange-traded fund." },
  ];

  it("names the corpus and lists every term", () => {
    const out = definedTermSetJsonLd({ terms: TERMS }) as Bag;
    expect(out["@type"]).toBe("DefinedTermSet");
    expect(out.name).toBeDefined();
    expect(out.hasDefinedTerm).toHaveLength(2);
  });

  it("gives each listed term a citable URL", () => {
    const out = definedTermSetJsonLd({ terms: TERMS }) as Bag;
    const first = (out.hasDefinedTerm as Bag[])[0];
    expect(String(first.url)).toContain("/glossary/asx");
    expect(first.termCode).toBe("asx");
  });

  it("omits description when not provided", () => {
    const out = definedTermSetJsonLd({ terms: TERMS }) as Bag;
    expect(out.description).toBeUndefined();
  });
});

describe("speakableSpecification", () => {
  it("wraps css selectors in a SpeakableSpecification", () => {
    const out = speakableSpecification(["#a", "#b"]) as Bag;
    expect(out["@type"]).toBe("SpeakableSpecification");
    expect(out.cssSelector).toEqual(["#a", "#b"]);
  });
});

describe("definedTermPageJsonLd", () => {
  const BASE = {
    term: "Dividend",
    slug: "dividend",
    definition: "A share of company profit paid to shareholders.",
  };

  it("emits a WebPage carrying speakable + a DefinedTerm mainEntity", () => {
    const out = definedTermPageJsonLd(BASE) as Bag;
    expect(out["@type"]).toBe("WebPage");
    expect((out.speakable as Bag)["@type"]).toBe("SpeakableSpecification");
    expect((out.mainEntity as Bag)["@type"]).toBe("DefinedTerm");
  });

  it("does not repeat @context on the nested mainEntity", () => {
    const out = definedTermPageJsonLd(BASE) as Bag;
    expect((out.mainEntity as Bag)["@context"]).toBeUndefined();
  });

  it("defaults speakable selectors to the answer-first heading + definition", () => {
    const out = definedTermPageJsonLd(BASE) as Bag;
    expect((out.speakable as Bag).cssSelector).toEqual([
      "#glossary-term-name",
      "#glossary-term-definition",
    ]);
  });

  it("honours custom speakable selectors", () => {
    const out = definedTermPageJsonLd({ ...BASE, speakableSelectors: ["#x"] }) as Bag;
    expect((out.speakable as Bag).cssSelector).toEqual(["#x"]);
  });
});

describe("speakableWebPageJsonLd", () => {
  const BASE = {
    name: "How much super do I need to retire?",
    path: "/questions/how-much-super-to-retire",
    selectors: ["#question-title", "#question-short-answer"],
  };

  it("emits a WebPage with a speakable spec over the given selectors", () => {
    const out = speakableWebPageJsonLd(BASE) as Bag;
    expect(out["@type"]).toBe("WebPage");
    expect(out.name).toBe(BASE.name);
    expect((out.speakable as Bag)["@type"]).toBe("SpeakableSpecification");
    expect((out.speakable as Bag).cssSelector).toEqual(BASE.selectors);
  });

  it("resolves the path to an absolute URL", () => {
    const out = speakableWebPageJsonLd(BASE) as Bag;
    expect(String(out.url)).toContain("/questions/how-much-super-to-retire");
  });
});

describe("qaPageJsonLd", () => {
  const BASE = {
    question: "How does negative gearing work in Australia?",
    acceptedAnswer:
      "Negative gearing occurs when your investment expenses exceed the income it produces. The net loss is deductible against your other taxable income.",
    path: "/questions/how-does-negative-gearing-work",
  };

  it("emits @context and @type QAPage", () => {
    const out = qaPageJsonLd(BASE) as Bag;
    expect(out["@context"]).toBe("https://schema.org");
    expect(out["@type"]).toBe("QAPage");
  });

  it("name matches the question text", () => {
    const out = qaPageJsonLd(BASE) as Bag;
    expect(out.name).toBe(BASE.question);
  });

  it("resolves path to an absolute URL", () => {
    const out = qaPageJsonLd(BASE) as Bag;
    expect(String(out.url)).toContain("/questions/how-does-negative-gearing-work");
  });

  it("mainEntity is a Question with the correct name", () => {
    const out = qaPageJsonLd(BASE) as Bag;
    const entity = out.mainEntity as Bag;
    expect(entity["@type"]).toBe("Question");
    expect(entity.name).toBe(BASE.question);
  });

  it("acceptedAnswer text matches the provided answer", () => {
    const out = qaPageJsonLd(BASE) as Bag;
    const entity = out.mainEntity as Bag;
    const accepted = entity.acceptedAnswer as Bag;
    expect(accepted["@type"]).toBe("Answer");
    expect(accepted.text).toBe(BASE.acceptedAnswer);
  });

  it("acceptedAnswer url points to the canonical question page", () => {
    const out = qaPageJsonLd(BASE) as Bag;
    const entity = out.mainEntity as Bag;
    const accepted = entity.acceptedAnswer as Bag;
    expect(String(accepted.url)).toContain(
      "/questions/how-does-negative-gearing-work",
    );
  });

  it("defaults author to the site Organisation when authorName is absent", () => {
    const out = qaPageJsonLd(BASE) as Bag;
    const author = out.author as Bag;
    expect(author["@type"]).toBe("Organization");
  });

  it("uses a Person author when authorName is provided", () => {
    const out = qaPageJsonLd({
      ...BASE,
      authorName: "Jane Smith",
      authorUrl: "https://invest.com.au/authors/jane-smith",
    }) as Bag;
    const author = out.author as Bag;
    expect(author["@type"]).toBe("Person");
    expect(author.name).toBe("Jane Smith");
    expect(String(author.url)).toContain("jane-smith");
  });

  it("omits suggestedAnswer when no suggestedAnswers are provided", () => {
    const out = qaPageJsonLd(BASE) as Bag;
    const entity = out.mainEntity as Bag;
    expect(entity.suggestedAnswer).toBeUndefined();
  });

  it("includes suggestedAnswer nodes for each provided FAQ answer", () => {
    const faqs = ["Answer one.", "Answer two.", "Answer three."];
    const out = qaPageJsonLd({ ...BASE, suggestedAnswers: faqs }) as Bag;
    const entity = out.mainEntity as Bag;
    const suggested = entity.suggestedAnswer as Bag[];
    expect(suggested).toHaveLength(3);
    expect(suggested[0]?.["@type"]).toBe("Answer");
    expect(suggested[0]?.text).toBe("Answer one.");
  });

  it("includes datePublished on the QAPage and acceptedAnswer when provided", () => {
    const out = qaPageJsonLd({
      ...BASE,
      datePublished: "2026-05-25",
    }) as Bag;
    expect(out.datePublished).toBe("2026-05-25");
    const entity = out.mainEntity as Bag;
    const accepted = entity.acceptedAnswer as Bag;
    expect(accepted.datePublished).toBe("2026-05-25");
  });

  it("omits datePublished when not provided", () => {
    const out = qaPageJsonLd(BASE) as Bag;
    expect(out.datePublished).toBeUndefined();
  });

  it("omits authorUrl when not provided on a Person author", () => {
    const out = qaPageJsonLd({ ...BASE, authorName: "Jane Smith" }) as Bag;
    const author = out.author as Bag;
    expect(author.url).toBeUndefined();
  });
});

// ─── articleAnswerFirstJsonLd ─────────────────────────────────

describe("articleAnswerFirstJsonLd", () => {
  const BASE = {
    title: "How to invest in ETFs in Australia",
    slug: "how-to-invest-in-etfs-australia",
    excerpt: "ETFs are low-cost baskets of securities. You buy them on the ASX through any broker. They suit passive, long-term investors.",
    keyTakeaways: [] as string[],
  };

  it("returns both article and speakable blocks", () => {
    const { article, speakable } = articleAnswerFirstJsonLd(BASE);
    expect(article).toBeDefined();
    expect(speakable).toBeDefined();
  });

  it("article @type is Article with correct @context", () => {
    const { article } = articleAnswerFirstJsonLd(BASE);
    expect((article as Bag)["@context"]).toBe("https://schema.org");
    expect((article as Bag)["@type"]).toBe("Article");
  });

  it("article headline matches title", () => {
    const { article } = articleAnswerFirstJsonLd(BASE);
    expect((article as Bag).headline).toBe(BASE.title);
  });

  it("article abstract and description match excerpt", () => {
    const { article } = articleAnswerFirstJsonLd(BASE);
    expect((article as Bag).abstract).toBe(BASE.excerpt);
    expect((article as Bag).description).toBe(BASE.excerpt);
  });

  it("article url points to /article/{slug}", () => {
    const { article } = articleAnswerFirstJsonLd(BASE);
    expect(String((article as Bag).url)).toContain(`/article/${BASE.slug}`);
  });

  it("article speakable targets #article-title and #article-summary", () => {
    const { article } = articleAnswerFirstJsonLd(BASE);
    const speakable = (article as Bag).speakable as Bag;
    expect(speakable["@type"]).toBe("SpeakableSpecification");
    const selectors = speakable.cssSelector as string[];
    expect(selectors).toContain("#article-title");
    expect(selectors).toContain("#article-summary");
  });

  it("article mainEntityOfPage points to the article URL", () => {
    const { article } = articleAnswerFirstJsonLd(BASE);
    const mainEntity = (article as Bag).mainEntityOfPage as Bag;
    expect(mainEntity["@type"]).toBe("WebPage");
    expect(String(mainEntity["@id"])).toContain(`/article/${BASE.slug}`);
  });

  it("defaults to ORG author when authorName is absent", () => {
    const { article } = articleAnswerFirstJsonLd(BASE);
    const author = (article as Bag).author as Bag;
    expect(author["@type"]).toBe("Organization");
  });

  it("uses Person author when authorName is provided", () => {
    const { article } = articleAnswerFirstJsonLd({
      ...BASE,
      authorName: "Jane Smith",
      authorUrl: "https://invest.com.au/authors/jane-smith",
    });
    const author = (article as Bag).author as Bag;
    expect(author["@type"]).toBe("Person");
    expect(author.name).toBe("Jane Smith");
    expect(String(author.url)).toContain("jane-smith");
  });

  it("carries articleSection when category is provided", () => {
    const { article } = articleAnswerFirstJsonLd({ ...BASE, category: "ETFs" });
    expect((article as Bag).articleSection).toBe("ETFs");
  });

  it("omits articleSection when category is absent", () => {
    const { article } = articleAnswerFirstJsonLd(BASE);
    expect((article as Bag).articleSection).toBeUndefined();
  });

  it("includes datePublished and dateModified when provided", () => {
    const { article } = articleAnswerFirstJsonLd({
      ...BASE,
      publishedAt: "2026-01-15",
      updatedAt: "2026-05-01",
    });
    expect((article as Bag).datePublished).toBe("2026-01-15");
    expect((article as Bag).dateModified).toBe("2026-05-01");
  });

  it("speakable block is a WebPage pointing at the article path", () => {
    const { speakable } = articleAnswerFirstJsonLd(BASE);
    expect((speakable as Bag)["@type"]).toBe("WebPage");
    expect(String((speakable as Bag).url)).toContain(`/article/${BASE.slug}`);
  });

  it("speakable block includes #article-key-takeaways selector", () => {
    const { speakable } = articleAnswerFirstJsonLd(BASE);
    const s = (speakable as Bag).speakable as Bag;
    expect((s.cssSelector as string[])).toContain("#article-key-takeaways");
  });
});

// ─── glossaryTermQaJsonLd ─────────────────────────────────────

describe("glossaryTermQaJsonLd", () => {
  const BASE = {
    term: "Franking Credit",
    slug: "franking-credit",
    definition: "A tax credit attached to Australian dividends representing company tax already paid. Reduces or eliminates your personal tax on that income.",
  };

  it("emits @context and @type QAPage", () => {
    const out = glossaryTermQaJsonLd(BASE) as Bag;
    expect(out["@context"]).toBe("https://schema.org");
    expect(out["@type"]).toBe("QAPage");
  });

  it("name is the 'What is [term]?' question", () => {
    const out = glossaryTermQaJsonLd(BASE) as Bag;
    expect(out.name).toBe("What is Franking Credit?");
  });

  it("url resolves to /glossary/{slug}", () => {
    const out = glossaryTermQaJsonLd(BASE) as Bag;
    expect(String(out.url)).toContain("/glossary/franking-credit");
  });

  it("mainEntity is a Question with the correct name", () => {
    const out = glossaryTermQaJsonLd(BASE) as Bag;
    const entity = out.mainEntity as Bag;
    expect(entity["@type"]).toBe("Question");
    expect(entity.name).toBe("What is Franking Credit?");
  });

  it("acceptedAnswer text is the definition", () => {
    const out = glossaryTermQaJsonLd(BASE) as Bag;
    const entity = out.mainEntity as Bag;
    const accepted = entity.acceptedAnswer as Bag;
    expect(accepted["@type"]).toBe("Answer");
    expect(accepted.text).toBe(BASE.definition);
  });

  it("acceptedAnswer url points to the glossary term page", () => {
    const out = glossaryTermQaJsonLd(BASE) as Bag;
    const entity = out.mainEntity as Bag;
    const accepted = entity.acceptedAnswer as Bag;
    expect(String(accepted.url)).toContain("/glossary/franking-credit");
  });

  it("acceptedAnswer author is the site Organisation", () => {
    const out = glossaryTermQaJsonLd(BASE) as Bag;
    const entity = out.mainEntity as Bag;
    const accepted = entity.acceptedAnswer as Bag;
    expect((accepted.author as Bag)["@type"]).toBe("Organization");
  });

  it("omits suggestedAnswer when additionalFacts is not provided", () => {
    const out = glossaryTermQaJsonLd(BASE) as Bag;
    const entity = out.mainEntity as Bag;
    expect(entity.suggestedAnswer).toBeUndefined();
  });

  it("includes up to 3 suggestedAnswer nodes when additionalFacts are provided", () => {
    const out = glossaryTermQaJsonLd({
      ...BASE,
      additionalFacts: ["Fact 1.", "Fact 2.", "Fact 3.", "Fact 4."],
    }) as Bag;
    const entity = out.mainEntity as Bag;
    const suggested = entity.suggestedAnswer as Bag[];
    expect(suggested).toHaveLength(3); // capped at 3
    expect(suggested[0]?.["@type"]).toBe("Answer");
    expect(suggested[0]?.text).toBe("Fact 1.");
  });

  it("suggestedAnswer author is the site Organisation", () => {
    const out = glossaryTermQaJsonLd({
      ...BASE,
      additionalFacts: ["Some fact."],
    }) as Bag;
    const entity = out.mainEntity as Bag;
    const suggested = (entity.suggestedAnswer as Bag[])[0]!;
    expect((suggested.author as Bag)["@type"]).toBe("Organization");
  });

  it("omits suggestedAnswer for an empty additionalFacts array", () => {
    const out = glossaryTermQaJsonLd({ ...BASE, additionalFacts: [] }) as Bag;
    const entity = out.mainEntity as Bag;
    expect(entity.suggestedAnswer).toBeUndefined();
  });
});

// ─── comparisonPageItemListJsonLd ─────────────────────────────

describe("comparisonPageItemListJsonLd", () => {
  const BASE = {
    slugs: "stake-vs-commsec",
    title: "Stake vs CommSec — Side-by-Side Comparison (2026)",
    brokers: [
      { position: 1, name: "Stake", slug: "stake", description: "Low-cost US-shares broker", rating: 4.5 },
      { position: 2, name: "CommSec", slug: "commsec", description: "Australia's most established broker", rating: 4.2 },
    ],
  };

  it("emits @context and @type ItemList", () => {
    const out = comparisonPageItemListJsonLd(BASE) as Bag;
    expect(out["@context"]).toBe("https://schema.org");
    expect(out["@type"]).toBe("ItemList");
  });

  it("name matches the provided title", () => {
    const out = comparisonPageItemListJsonLd(BASE) as Bag;
    expect(out.name).toBe(BASE.title);
  });

  it("url points to /versus/{slugs}", () => {
    const out = comparisonPageItemListJsonLd(BASE) as Bag;
    expect(String(out.url)).toContain("/versus/stake-vs-commsec");
  });

  it("numberOfItems equals the broker count", () => {
    const out = comparisonPageItemListJsonLd(BASE) as Bag;
    expect(out.numberOfItems).toBe(2);
  });

  it("itemListElement has correct length", () => {
    const out = comparisonPageItemListJsonLd(BASE) as Bag;
    expect((out.itemListElement as Bag[]).length).toBe(2);
  });

  it("each ListItem carries position, name, and url", () => {
    const out = comparisonPageItemListJsonLd(BASE) as Bag;
    const items = out.itemListElement as Bag[];
    expect(items[0]?.["@type"]).toBe("ListItem");
    expect(items[0]?.position).toBe(1);
    expect(items[0]?.name).toBe("Stake");
    expect(String(items[0]?.url)).toContain("/broker/stake");
  });

  it("ListItem description comes from description field", () => {
    const out = comparisonPageItemListJsonLd(BASE) as Bag;
    const items = out.itemListElement as Bag[];
    expect(items[0]?.description).toBe("Low-cost US-shares broker");
  });

  it("ListItem description uses bestFor when provided", () => {
    const out = comparisonPageItemListJsonLd({
      ...BASE,
      brokers: [
        { position: 1, name: "Stake", slug: "stake", bestFor: "Best for US shares", rating: 4.5 },
        { position: 2, name: "CommSec", slug: "commsec", bestFor: "Best for ASX shares", rating: 4.2 },
      ],
    }) as Bag;
    const items = out.itemListElement as Bag[];
    expect(items[0]?.description).toBe("Best for US shares");
    expect(items[1]?.description).toBe("Best for ASX shares");
  });

  it("omits description when neither bestFor nor description is provided", () => {
    const out = comparisonPageItemListJsonLd({
      ...BASE,
      brokers: [
        { position: 1, name: "Stake", slug: "stake", rating: 4.5 },
      ],
    }) as Bag;
    const items = out.itemListElement as Bag[];
    expect(items[0]?.description).toBeUndefined();
  });

  it("handles three-broker comparison", () => {
    const out = comparisonPageItemListJsonLd({
      ...BASE,
      slugs: "stake-vs-commsec-vs-moomoo",
      brokers: [
        ...BASE.brokers,
        { position: 3, name: "moomoo", slug: "moomoo", rating: 4.3 },
      ],
    }) as Bag;
    expect((out.itemListElement as Bag[]).length).toBe(3);
    expect(out.numberOfItems).toBe(3);
  });

  it("positions are preserved in order", () => {
    const out = comparisonPageItemListJsonLd(BASE) as Bag;
    const items = out.itemListElement as Bag[];
    expect(items[0]?.position).toBe(1);
    expect(items[1]?.position).toBe(2);
  });
});
