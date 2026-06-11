/**
 * Typed JSON-LD schema builders for every page type.
 *
 * Keeps schema markup consistent across pages and gives search
 * engines richer results. Each function returns a plain object
 * ready for JSON.stringify + <script type="application/ld+json">.
 *
 * Output types:
 *   - Article      — editorial content (/article/[slug])
 *   - FAQPage      — Q&A sections on articles and advisor pages
 *   - FinancialProduct — broker review pages
 *   - LocalBusiness + Person — advisor profile pages
 *   - ItemList     — best-for ranked broker lists, versus pages
 *   - Product      — marketplace listings (/invest/listings/[slug])
 *   - WebApplication — calculator pages (/franking-credits-calculator etc.)
 *   - QAPage        — question-detail & glossary term pages (GEO: answer-first)
 *   - DefinedTerm / DefinedTermSet — glossary terms & index
 *   - Speakable     — voice / AI answer-extraction selectors
 *   - ComparisonPage — versus/compare pages (Article + ItemList + FinancialProducts)
 *   - ArticleKeyTakeaways — answer-first Article with hasPart ClaimReview hints
 *   - BlogPosting      — advisor short-form insights (/advisor/[slug]/insights/[id])
 *
 * Every builder accepts the minimum required fields and gracefully
 * omits optional ones so empty values don't leak into the rendered
 * JSON-LD.
 */

import { SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/seo";
import { SHOW_RATINGS, SHOW_ADVISOR_RATINGS } from "@/lib/compliance-config";

const ORG = {
  "@type": "Organization" as const,
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
};

/** Drop null / undefined keys so JSON-LD output is clean. */
function compact<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out as T;
}

// ─── Article ──────────────────────────────────────────────────

export interface ArticleSchemaInput {
  title: string;
  slug: string;
  description: string | null;
  authorName?: string | null;
  authorUrl?: string | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
  coverImageUrl?: string | null;
  category?: string | null;
}

export function articleJsonLd(input: ArticleSchemaInput) {
  return compact({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.title,
    description: input.description ?? undefined,
    image: input.coverImageUrl
      ? absoluteUrl(input.coverImageUrl)
      : `${SITE_URL}/api/og?title=${encodeURIComponent(input.title)}`,
    datePublished: input.publishedAt ?? undefined,
    dateModified: input.updatedAt ?? input.publishedAt ?? undefined,
    author: input.authorName
      ? compact({
          "@type": "Person",
          name: input.authorName,
          url: input.authorUrl ?? undefined,
        })
      : ORG,
    publisher: ORG,
    articleSection: input.category ?? undefined,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": absoluteUrl(`/article/${input.slug}`),
    },
  });
}

// ─── BlogPosting — advisor insights ──────────────────────────

export interface BlogPostingSchemaInput {
  postId: number;
  advisorSlug: string;
  body: string;
  postType: string;
  publishedAt: string;
  authorName: string;
  authorSlug: string;
  authorPhotoUrl?: string | null;
}

/** Schema.org BlogPosting for advisor short-form insights.
 *  Helps Google surface the post in search + AI citation engines. */
export function blogPostingJsonLd(input: BlogPostingSchemaInput) {
  const url = absoluteUrl(`/advisor/${input.advisorSlug}/insights/${input.postId}`);
  const headline = input.body.slice(0, 110);
  const description = input.body.slice(0, 160);

  return compact({
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline,
    description,
    articleBody: input.body,
    keywords: input.postType,
    url,
    datePublished: input.publishedAt,
    dateModified: input.publishedAt,
    author: compact({
      "@type": "Person",
      name: input.authorName,
      url: absoluteUrl(`/advisor/${input.authorSlug}`),
      image: input.authorPhotoUrl ?? undefined,
    }),
    publisher: ORG,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
  });
}

// ─── FAQ page ─────────────────────────────────────────────────

export interface FaqItem {
  q: string;
  a: string;
}

export function faqJsonLd(items: FaqItem[]) {
  if (items.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

// ─── Broker / FinancialProduct ────────────────────────────────

export interface BrokerSchemaInput {
  slug: string;
  name: string;
  description?: string | null;
  logoUrl?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  priceRange?: string | null;
}

export function brokerFinancialProductJsonLd(input: BrokerSchemaInput) {
  return compact({
    "@context": "https://schema.org",
    "@type": "FinancialProduct",
    name: input.name,
    url: absoluteUrl(`/broker/${input.slug}`),
    description: input.description ?? undefined,
    image: input.logoUrl ?? undefined,
    brand: ORG,
    // Licence-gated: schema must mirror the visible page, which hides
    // ratings entirely in factual_only mode (DISC-20260610-A).
    ...(SHOW_RATINGS && input.rating && input.reviewCount && input.reviewCount > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: input.rating,
            reviewCount: input.reviewCount,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
    priceRange: input.priceRange ?? undefined,
  });
}

// ─── Advisor / LocalBusiness + Person ─────────────────────────

export interface AdvisorSchemaInput {
  slug: string;
  name: string;
  firmName?: string | null;
  bio?: string | null;
  photoUrl?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  locationState?: string | null;
  locationSuburb?: string | null;
  jobTitle?: string | null;
  feeDescription?: string | null;
}

export function advisorJsonLd(input: AdvisorSchemaInput) {
  const url = absoluteUrl(`/advisor/${input.slug}`);
  const person = compact({
    "@type": "Person",
    name: input.name,
    url,
    image: input.photoUrl ?? undefined,
    jobTitle: input.jobTitle ?? undefined,
    telephone: input.phone ?? undefined,
    email: input.email ?? undefined,
    worksFor: input.firmName
      ? { "@type": "Organization", name: input.firmName }
      : undefined,
    description: input.bio ?? undefined,
  });

  const localBusiness = input.firmName
    ? compact({
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        name: input.firmName,
        image: input.photoUrl ?? undefined,
        url: input.website ?? url,
        telephone: input.phone ?? undefined,
        email: input.email ?? undefined,
        priceRange: input.feeDescription ?? undefined,
        address: input.locationState
          ? compact({
              "@type": "PostalAddress",
              addressRegion: input.locationState,
              addressLocality: input.locationSuburb ?? undefined,
              addressCountry: "AU",
            })
          : undefined,
        ...(SHOW_ADVISOR_RATINGS && input.rating && input.reviewCount && input.reviewCount > 0
          ? {
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: input.rating,
                reviewCount: input.reviewCount,
                bestRating: 5,
                worstRating: 1,
              },
            }
          : {}),
      })
    : null;

  return { person, localBusiness };
}

// ─── ItemList — best-for pages + versus pages ────────────────

export interface ItemListEntry {
  position: number;
  name: string;
  url: string;
  description?: string;
}

export function itemListJsonLd(name: string, items: ItemListEntry[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: items.length,
    itemListElement: items.map((i) => ({
      "@type": "ListItem",
      position: i.position,
      name: i.name,
      url: absoluteUrl(i.url),
      description: i.description,
    })),
  };
}

// ─── Product — marketplace listings ──────────────────────────

export interface ListingSchemaInput {
  slug: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  priceAud?: number | null;
  priceDisplay?: string | null;
  locationState?: string | null;
  locationCity?: string | null;
  vertical?: string | null;
}

export function listingProductJsonLd(input: ListingSchemaInput) {
  return compact({
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.title,
    description: input.description ?? undefined,
    image: input.imageUrl ?? undefined,
    category: input.vertical ?? undefined,
    url: absoluteUrl(
      input.vertical
        ? `/invest/${input.vertical}/listings/${input.slug}`
        : `/invest/listings/${input.slug}`,
    ),
    brand: ORG,
    ...(input.priceAud
      ? {
          offers: {
            "@type": "Offer",
            priceCurrency: "AUD",
            price: input.priceAud,
            url: absoluteUrl(
              input.vertical
                ? `/invest/${input.vertical}/listings/${input.slug}`
                : `/invest/listings/${input.slug}`,
            ),
            availability: "https://schema.org/InStock",
          },
        }
      : input.priceDisplay
        ? { offers: { "@type": "Offer", priceSpecification: input.priceDisplay } }
        : {}),
    ...(input.locationState
      ? {
          areaServed: compact({
            "@type": "Place",
            address: {
              "@type": "PostalAddress",
              addressRegion: input.locationState,
              addressLocality: input.locationCity ?? undefined,
              addressCountry: "AU",
            },
          }),
        }
      : {}),
  });
}

// ─── Versus comparison pages ─────────────────────────────────

export interface VersusBrokerInput {
  slug: string;
  name: string;
  description?: string | null;
  logoUrl?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
}

export interface VersusComparisonSchemaInput {
  /** URL path segment, e.g. "stake-vs-commsec" */
  slugs: string;
  title: string;
  description: string;
  brokers: VersusBrokerInput[];
}

/**
 * Returns an Article schema for the comparison page plus individual
 * FinancialProduct schemas for each broker side.
 * Emit as separate <script type="application/ld+json"> blocks.
 */
export function versusComparisonJsonLd(input: VersusComparisonSchemaInput) {
  const pageUrl = absoluteUrl(`/versus/${input.slugs}`);

  const article = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.title,
    description: input.description,
    url: pageUrl,
    image: `${SITE_URL}/api/og/versus?slugs=${encodeURIComponent(input.slugs)}`,
    author: ORG,
    publisher: ORG,
    mainEntityOfPage: { "@type": "WebPage", "@id": pageUrl },
  };

  const financialProducts = input.brokers.map((b) =>
    brokerFinancialProductJsonLd({
      slug: b.slug,
      name: b.name,
      description: b.description,
      logoUrl: b.logoUrl,
      rating: b.rating,
      reviewCount: b.reviewCount,
    }),
  );

  return { article, financialProducts };
}

// ─── Calculator / WebApplication ─────────────────────────────

export interface CalculatorSchemaInput {
  name: string;
  description: string;
  path: string;
}

export function calculatorJsonLd(input: CalculatorSchemaInput) {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: `${input.name} — ${SITE_NAME}`,
    description: input.description,
    url: absoluteUrl(input.path),
    applicationCategory: "FinanceApplication",
    operatingSystem: "Any",
    offers: { "@type": "Offer", price: "0", priceCurrency: "AUD" },
  };
}

// ─── Government scheme / GovernmentService ────────────────────

export interface GovernmentSchemeSchemaInput {
  name: string;
  description: string;
  serviceType: string;            // e.g. "Visa pathway", "Tax concession"
  countryName: string;            // e.g. "United Kingdom"
  sourceName: string;             // e.g. "HMRC ROPS notification list"
  sourceUrl: string;
  pagePath: string;               // e.g. "/foreign-investment/united-kingdom"
}

/**
 * GovernmentService JSON-LD for a foreign-investment scheme/grant card.
 *
 * Schema.org's `GovernmentService` covers programmes administered by a
 * government body that change a person's legal/tax/visa standing — the
 * exact shape of the rows in `country_schemes`. Search engines surface
 * these as rich results for "<scheme> Australia" queries.
 *
 * The `provider` is the cited regulator (HMRC, ATO, IRS, FIRB, …); the
 * `mainEntityOfPage` lifts the page that hosts the card so the source
 * citation is preserved end-to-end.
 */
export function governmentServiceJsonLd(input: GovernmentSchemeSchemaInput) {
  return compact({
    "@context": "https://schema.org",
    "@type": "GovernmentService",
    name: input.name,
    description: input.description,
    serviceType: input.serviceType,
    areaServed: { "@type": "Country", name: input.countryName },
    provider: {
      "@type": "GovernmentOrganization",
      name: input.sourceName,
      url: input.sourceUrl,
    },
    mainEntityOfPage: absoluteUrl(input.pagePath),
    audience: { "@type": "Audience", audienceType: "Cross-border investor" },
  });
}

// ─── DefinedTerm / DefinedTermSet — glossary ──────────────────
//
// GEO note: definitional content is prime AI-citation material. `DefinedTerm`
// nodes tell generative engines "this page authoritatively defines X"; the
// `DefinedTermSet` on the index ties the 100+ terms into one named corpus so
// a single comprehensive AU-finance glossary is what gets cited. The set's
// identity is centralised in GLOSSARY_TERM_SET so the term page and the index
// can't drift apart. — see docs/strategy/FIN_NOTEBOOK.md 2026-05-21.

const GLOSSARY_PATH = "/glossary";

/** Canonical identity for the glossary, referenced from both the term page
 *  (`inDefinedTermSet`) and the index page (`definedTermSetJsonLd`). */
export const GLOSSARY_TERM_SET = {
  "@type": "DefinedTermSet" as const,
  name: "Invest.com.au Australian Investing Glossary",
  url: absoluteUrl(GLOSSARY_PATH),
};

export interface DefinedTermInput {
  term: string;
  slug: string;
  definition: string;
  /**
   * ISO-8601 date the term definition was last substantively updated.
   * Informs AI engines about freshness; omit when unknown.
   */
  dateModified?: string | null;
}

/** Inner DefinedTerm node (no @context) — for nesting as mainEntity or in a set. */
function definedTermNode(input: DefinedTermInput) {
  return compact({
    "@type": "DefinedTerm",
    name: input.term,
    description: input.definition,
    url: absoluteUrl(`${GLOSSARY_PATH}/${input.slug}`),
    termCode: input.slug,
    inDefinedTermSet: GLOSSARY_TERM_SET,
  });
}

/** Standalone DefinedTerm document. */
export function definedTermJsonLd(input: DefinedTermInput) {
  return compact({ "@context": "https://schema.org", dateModified: input.dateModified ?? undefined, ...definedTermNode(input) });
}

export interface DefinedTermSetInput {
  /** Defaults to the canonical glossary set name. */
  name?: string;
  description?: string | null;
  terms: DefinedTermInput[];
}

/** DefinedTermSet for the glossary index — names the whole corpus and lists
 *  every term so AI systems treat it as one comprehensive cited source. */
export function definedTermSetJsonLd(input: DefinedTermSetInput) {
  return compact({
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    name: input.name ?? GLOSSARY_TERM_SET.name,
    description: input.description ?? undefined,
    url: GLOSSARY_TERM_SET.url,
    hasDefinedTerm: input.terms.map((t) =>
      compact({
        "@type": "DefinedTerm",
        name: t.term,
        description: t.definition,
        url: absoluteUrl(`${GLOSSARY_PATH}/${t.slug}`),
        termCode: t.slug,
      }),
    ),
  });
}

// ─── QAPage — question-detail pages ──────────────────────────
//
// GEO note: QAPage is the highest-signal schema type for AI-answer citation.
// It tells crawlers "this page is the canonical answer to a specific question"
// and makes the acceptedAnswer directly extractable. The speakable complement
// (below) marks the exact DOM region so voice/AI pipelines surface the answer
// without parsing the full page. Attach one QAPage per question-detail page;
// combine with speakableWebPageJsonLd in a separate <script> block.

export interface QaPageInput {
  /** The question text (becomes schema Question `name`). */
  question: string;
  /** The direct/accepted answer (the `shortAnswer` field or first section). */
  acceptedAnswer: string;
  /** Site-relative path, e.g. "/questions/how-does-negative-gearing-work". */
  path: string;
  /** ISO-8601 date the answer was published or last substantively updated. */
  datePublished?: string | null;
  /** Author name. Defaults to the site organisation. */
  authorName?: string | null;
  /** Absolute author profile URL. */
  authorUrl?: string | null;
  /**
   * Optional additional answers (suggestedAnswer) — FAQs related to the main
   * question. These are surfaced in rich-result panels alongside the accepted
   * answer. Only include if the additional answers are directly related.
   */
  suggestedAnswers?: string[];
}

/**
 * QAPage JSON-LD for a question-detail page.
 *
 * Emits a `QAPage` with one `acceptedAnswer` and optional `suggestedAnswer`
 * nodes. The accepted answer carries the canonical short answer; the
 * suggested answers map to related FAQ entries.
 *
 * Per schema.org spec, `QAPage` must have exactly one `mainEntity` of type
 * `Question`. The `Question` carries the answers as nested `Answer` objects.
 */
export function qaPageJsonLd(input: QaPageInput) {
  const pageUrl = absoluteUrl(input.path);
  const author = input.authorName
    ? compact({
        "@type": "Person" as const,
        name: input.authorName,
        url: input.authorUrl ?? undefined,
      })
    : ORG;

  const suggestedAnswers =
    input.suggestedAnswers && input.suggestedAnswers.length > 0
      ? input.suggestedAnswers.map((a) => ({
          "@type": "Answer",
          text: a,
          author,
        }))
      : undefined;

  return compact({
    "@context": "https://schema.org",
    "@type": "QAPage",
    name: input.question,
    url: pageUrl,
    datePublished: input.datePublished ?? undefined,
    author,
    mainEntity: compact({
      "@type": "Question",
      name: input.question,
      datePublished: input.datePublished ?? undefined,
      author,
      acceptedAnswer: {
        "@type": "Answer",
        text: input.acceptedAnswer,
        author,
        datePublished: input.datePublished ?? undefined,
        url: pageUrl,
      },
      suggestedAnswer: suggestedAnswers,
    }),
  });
}

// ─── Speakable — voice / answer-first extraction ──────────────
//
// GEO note: `speakable` marks the exact DOM nodes that hold the answer-first
// content (heading + lead sentence). Voice assistants read them aloud; the
// same selectors signal to text AI systems "this is the extractable answer",
// which is the whole point of the answer-first content rule. Attach only to a
// page-level type (WebPage/Article) per Google's spec — never to an Intangible
// like DefinedTerm. Selectors must resolve to real, unique elements on the page.

/** SpeakableSpecification node for embedding under a WebPage/Article `speakable`. */
export function speakableSpecification(cssSelectors: string[]) {
  return { "@type": "SpeakableSpecification" as const, cssSelector: cssSelectors };
}

export interface SpeakableWebPageInput {
  /** Page name (typically the question / headline). */
  name: string;
  /** Site-relative path, e.g. "/questions/how-much-super". */
  path: string;
  /** Selectors for the answer-first region — must resolve to real, unique elements. */
  selectors: string[];
}

/**
 * Generic WebPage carrying just a `speakable` answer region. Use on any
 * answer-first page that doesn't have a richer dedicated builder — Q&A pages,
 * articles, versus TL;DRs. The selectors should wrap the heading + lead/short
 * answer so AI and voice systems extract the answer directly.
 */
export function speakableWebPageJsonLd(input: SpeakableWebPageInput) {
  return compact({
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: input.name,
    url: absoluteUrl(input.path),
    speakable: speakableSpecification(input.selectors),
  });
}

export interface DefinedTermPageInput extends DefinedTermInput {
  /** Selectors for the answer-first content (heading + lead definition).
   *  Must match real, unique elements on the rendered page. */
  speakableSelectors?: string[];
}

/**
 * Composite document for a glossary term page: a WebPage carrying both the
 * `speakable` answer region and the `DefinedTerm` as its `mainEntity`. Emit
 * as the single primary JSON-LD block on `/glossary/[term]` (breadcrumb stays
 * separate). Replaces the previously hand-rolled inline DefinedTerm.
 *
 * When `dateModified` is provided it propagates to both the WebPage wrapper
 * and the nested DefinedTerm, giving AI engines a freshness signal at both
 * levels.
 */
export function definedTermPageJsonLd(input: DefinedTermPageInput) {
  const selectors =
    input.speakableSelectors && input.speakableSelectors.length > 0
      ? input.speakableSelectors
      : ["#glossary-term-name", "#glossary-term-definition"];
  return compact({
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `What Is ${input.term}?`,
    url: absoluteUrl(`${GLOSSARY_PATH}/${input.slug}`),
    dateModified: input.dateModified ?? undefined,
    speakable: speakableSpecification(selectors),
    mainEntity: compact({ ...definedTermNode(input), dateModified: input.dateModified ?? undefined }),
  });
}

// ─── Article answer-first / key takeaways ─────────────────────
//
// GEO note: Plain `Article` schema is already on every article page but it
// carries no explicit "here is the answer" signal. Adding a QAPage-style
// `speakable` + an `hasPart` with a `Claim`-flavoured abstract as the first
// sentence pulls the answer-first excerpt into AI-answer corpora. We keep the
// primary `@type` as `Article` (Google's documented requirement for article
// rich results) and bolt on the answer-first structure as `hasPart`.
//
// The `keyTakeaways` field is derived from the article `excerpt` or the first
// section body — never fabricated — so this is AFSL-safe factual markup.

export interface ArticleAnswerFirstInput {
  title: string;
  slug: string;
  /** Lead excerpt / summary paragraph (the "answer-first" sentence). */
  excerpt: string;
  /** Up to 4 bullet-point facts derived from the article (AFSL-safe). */
  keyTakeaways: string[];
  authorName?: string | null;
  authorUrl?: string | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
  category?: string | null;
}

/**
 * Article JSON-LD enhanced with answer-first structure for GEO.
 *
 * Returns two blocks for separate `<script>` emission:
 *   - `article`   — standard Article with `abstract` (the excerpt) and
 *                   `speakable` selectors pointing at the answer-first DOM ids.
 *   - `speakable` — standalone WebPage `speakable` block (additional signal).
 *
 * Selectors assume the article page renders:
 *   `#article-title`   — the `<h1>` with the article headline
 *   `#article-summary` — the `<p>` with the article excerpt / lead sentence
 */
export function articleAnswerFirstJsonLd(input: ArticleAnswerFirstInput) {
  const pageUrl = absoluteUrl(`/article/${input.slug}`);
  const author = input.authorName
    ? compact({
        "@type": "Person" as const,
        name: input.authorName,
        url: input.authorUrl ?? undefined,
      })
    : ORG;

  const article = compact({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.title,
    abstract: input.excerpt,
    description: input.excerpt,
    url: pageUrl,
    datePublished: input.publishedAt ?? undefined,
    dateModified: input.updatedAt ?? input.publishedAt ?? undefined,
    author,
    publisher: ORG,
    articleSection: input.category ?? undefined,
    mainEntityOfPage: { "@type": "WebPage", "@id": pageUrl },
    speakable: speakableSpecification(["#article-title", "#article-summary"]),
    // `keywords` carries the key facts as a comma-joined string so AI extractors
    // surface them without needing to parse the prose body.
    keywords:
      input.keyTakeaways.length > 0
        ? input.keyTakeaways.join("; ")
        : undefined,
  });

  const speakable = speakableWebPageJsonLd({
    name: input.title,
    path: `/article/${input.slug}`,
    selectors: ["#article-title", "#article-summary", "#article-key-takeaways"],
  });

  return { article, speakable };
}

// ─── Glossary term QAPage ─────────────────────────────────────
//
// GEO note: every glossary term page already emits a DefinedTerm / WebPage
// block. When the definition can be framed as "What is X?" (which is true for
// every definitional entry), adding a QAPage on top doubles the AI-citation
// signal: the DefinedTerm marks the authoritative definition; the QAPage marks
// the page as the canonical answer to the "What is X?" question. Both are
// needed — DefinedTerm drives corpus-level citation, QAPage drives per-question
// citation. Emit in a separate <script> block alongside definedTermPageJsonLd.

export interface GlossaryTermQaInput {
  term: string;
  slug: string;
  definition: string;
  /** Optional additional question-style facts (derived from body if present). */
  additionalFacts?: string[];
}

/**
 * QAPage block for a glossary term page.
 *
 * Frames the term definition as the canonical accepted answer to "What is
 * [term]?". If `additionalFacts` are provided they become `suggestedAnswer`
 * nodes (related follow-on facts from the body, max 3).
 *
 * Never call this for terms whose definitions don't read as factual
 * statements — but for a financial glossary all entries qualify.
 */
export function glossaryTermQaJsonLd(input: GlossaryTermQaInput) {
  const pageUrl = absoluteUrl(`${GLOSSARY_PATH}/${input.slug}`);
  const question = `What is ${input.term}?`;

  const suggestedAnswers =
    input.additionalFacts && input.additionalFacts.length > 0
      ? input.additionalFacts.slice(0, 3).map((fact) => ({
          "@type": "Answer",
          text: fact,
          author: ORG,
        }))
      : undefined;

  return compact({
    "@context": "https://schema.org",
    "@type": "QAPage",
    name: question,
    url: pageUrl,
    mainEntity: compact({
      "@type": "Question",
      name: question,
      author: ORG,
      acceptedAnswer: {
        "@type": "Answer",
        text: input.definition,
        author: ORG,
        url: pageUrl,
      },
      suggestedAnswer: suggestedAnswers,
    }),
  });
}

// ─── HowTo — step-by-step procedural guides ─────────────────────
//
// GEO note: HowTo schema is a high-signal type for AI-answer citation on
// procedural queries ("how to open a brokerage account", "how to choose a
// financial advisor"). Google surfaces step-by-step rich results; AI engines
// extract the ordered step list as a structured process. Steps come exclusively
// from the real guide content — no fabricated steps. Apply to /how-to/[slug]
// pages and any page whose primary purpose is to walk a user through a
// numbered sequence. Each HowToStep carries an anchor URL so AI systems can
// deep-link directly to the step.

export interface HowToStepInput {
  /** Short label shown as the step heading. */
  heading: string;
  /** Body text for the step (first 500 chars used). */
  body: string;
}

export interface HowToInput {
  /** URL slug for the guide, e.g. "open-brokerage-account". */
  slug: string;
  /** The H1 / schema name of the guide. */
  h1: string;
  /** Intro paragraph — used as the HowTo `description`. */
  intro: string;
  /** Ordered steps derived from the guide content. */
  steps: HowToStepInput[];
  /**
   * ISO-8601 date the guide was last substantively updated.
   * Defaults to the canonical UPDATED_LABEL date if omitted.
   */
  dateModified?: string | null;
  /** ISO-8601 publication date. */
  datePublished?: string | null;
}

/**
 * HowTo JSON-LD for a step-by-step guide page.
 *
 * Emits a `HowTo` with ordered `HowToStep` nodes. Steps come exclusively from
 * the real guide content; no fabricated steps are permitted. Conforms to
 * Google's HowTo rich-result guidelines and schema.org spec.
 *
 * The builder is the canonical source in `lib/schema-markup.ts`. The
 * identically-named helper in `lib/seo.ts` remains for backwards-compatibility
 * with the `/how-to/[slug]` page import — both emit valid HowTo blocks.
 */
export function howToJsonLd(input: HowToInput) {
  return compact({
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: input.h1,
    description: input.intro,
    totalTime: "PT10M",
    estimatedCost: {
      "@type": "MonetaryAmount",
      currency: "AUD",
      value: "0",
    },
    datePublished: input.datePublished ?? undefined,
    dateModified: input.dateModified ?? undefined,
    step: input.steps.map((step, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: step.heading,
      text: step.body.slice(0, 500),
      url: absoluteUrl(`/how-to/${input.slug}#step-${i + 1}`),
    })),
    author: ORG,
    publisher: ORG,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": absoluteUrl(`/how-to/${input.slug}`),
    },
  });
}

// ─── Comparison ItemList (versus / compare pages) ─────────────
//
// GEO note: versus pages already emit Article + FinancialProduct schemas via
// `versusComparisonJsonLd`. Adding a named `ItemList` on top gives AI systems
// a ranked-list citation target ("according to invest.com.au, the top options
// are…") — a different extraction path from the Article. Combine with the
// existing `versusComparisonJsonLd` output in separate <script> blocks.

export interface ComparisonBrokerEntry {
  position: number;
  name: string;
  slug: string;
  description?: string | null;
  /** The scenario where this broker wins, e.g. "Best for international shares" */
  bestFor?: string | null;
  rating?: number | null;
}

export interface ComparisonPageItemListInput {
  /** URL path segment, e.g. "stake-vs-commsec" */
  slugs: string;
  /** Full page title for the list name */
  title: string;
  brokers: ComparisonBrokerEntry[];
}

/**
 * ItemList JSON-LD for a versus/comparison page.
 *
 * Lists each broker in the comparison as a ranked `ListItem` pointing at its
 * canonical broker URL with a description. This is additive to
 * `versusComparisonJsonLd` — emit as a separate `<script>` block.
 *
 * When `bestFor` is set it becomes the `description` so AI engines can surface
 * "Stake is best for X, CommSec is best for Y" structured claims.
 */
export function comparisonPageItemListJsonLd(
  input: ComparisonPageItemListInput,
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: input.title,
    url: absoluteUrl(`/versus/${input.slugs}`),
    numberOfItems: input.brokers.length,
    itemListElement: input.brokers.map((b) =>
      compact({
        "@type": "ListItem",
        position: b.position,
        name: b.name,
        url: absoluteUrl(`/broker/${b.slug}`),
        description: b.bestFor ?? b.description ?? undefined,
      }),
    ),
  };
}

// ─── Person — reviewer / author profile pages ─────────────────────────────────
//
// E-E-A-T note: A standalone `Person` block on reviewer/author profile pages
// carries richer structured-data signals than the `ProfilePage > mainEntity`
// pattern already emitted by `profilePageJsonLd()` in lib/seo.ts. The key
// additions are:
//
//   - `sameAs` — LinkedIn, X/Twitter, and external publication URLs. These are
//     the most powerful E-E-A-T signals in the spec: they let search and AI
//     engines corroborate identity across authoritative third-party sources.
//
//   - `jobTitle` / `description` — already in profilePageJsonLd but we repeat
//     them here at the top-level Person so they appear on the root block, not
//     buried in a mainEntity subtree.
//
//   - `knowsAbout` — credentials list maps directly to schema.org `knowsAbout`.
//
//   - `numberOfItems` for review activity — surfaced via `performerIn` /
//     `interactionStatistic`; we use `description` additions here since
//     `performerIn` requires separately typed entities.
//
// Emit this block as an _additional_ <script> block alongside the existing
// ProfilePage + BreadcrumbList blocks — they are complementary, not
// replacements.

export interface PersonJsonLdInput {
  /** Full display name. */
  name: string;
  /** Site-relative profile URL — must match the page's canonical. */
  profileUrl: string;
  /** Short bio / description. */
  description?: string | null;
  /** Job title / role label (e.g. "Expert Reviewer"). */
  jobTitle?: string | null;
  /** Absolute URL to avatar / headshot. */
  imageUrl?: string | null;
  /** LinkedIn profile URL. Filtered if empty. */
  linkedinUrl?: string | null;
  /** Twitter / X profile URL. Filtered if empty. */
  twitterUrl?: string | null;
  /**
   * Additional sameAs URLs — external publications, ASIC register links,
   * or other authoritative third-party profile pages.
   * Each entry is filtered for non-empty strings before inclusion.
   */
  additionalSameAs?: (string | null | undefined)[];
  /**
   * Credential / expertise strings — map to schema.org `knowsAbout`.
   * Mirrors the `credentials[]` column on team_members.
   */
  credentials?: string[] | null;
  /**
   * Total number of articles reviewed. Included in an InteractionCounter
   * when > 0. Zero / null omits the counter entirely.
   */
  articlesReviewedCount?: number | null;
  /**
   * Total number of broker/product reviews. Included in a second
   * InteractionCounter when > 0.
   */
  productReviewsCount?: number | null;
  /**
   * ISO-8601 date when the reviewer first became active.
   * Used to derive a "years active" figure for voice/AI extraction.
   */
  activeFrom?: string | null;
}

/**
 * Standalone `Person` JSON-LD block for reviewer and author profile pages.
 *
 * Includes `sameAs` social/professional URLs (LinkedIn, Twitter/X, and any
 * additional URLs), filtered to non-empty strings. Empty or null values
 * degrade gracefully — the block is still valid without them.
 *
 * Emits as a separate `<script type="application/ld+json">` block alongside
 * the existing `ProfilePage` and `BreadcrumbList` blocks.
 */
export function personJsonLd(input: PersonJsonLdInput) {
  // Build sameAs: filter nulls/empties from all social + additional URLs
  const rawSameAs = [
    input.linkedinUrl,
    input.twitterUrl,
    ...(input.additionalSameAs ?? []),
  ];
  const sameAs = rawSameAs.filter(
    (url): url is string => typeof url === "string" && url.trim().length > 0,
  );

  // Build InteractionStatistic nodes for review activity
  const interactionStatistic: Array<Record<string, unknown>> = [];
  if (
    typeof input.articlesReviewedCount === "number" &&
    input.articlesReviewedCount > 0
  ) {
    interactionStatistic.push({
      "@type": "InteractionCounter",
      interactionType: "https://schema.org/ReviewAction",
      userInteractionCount: input.articlesReviewedCount,
      description: `${input.articlesReviewedCount} article${input.articlesReviewedCount === 1 ? "" : "s"} reviewed`,
    });
  }
  if (
    typeof input.productReviewsCount === "number" &&
    input.productReviewsCount > 0
  ) {
    interactionStatistic.push({
      "@type": "InteractionCounter",
      interactionType: "https://schema.org/ReviewAction",
      userInteractionCount: input.productReviewsCount,
      description: `${input.productReviewsCount} product review${input.productReviewsCount === 1 ? "" : "s"}`,
    });
  }

  return compact({
    "@context": "https://schema.org",
    "@type": "Person",
    name: input.name,
    url: absoluteUrl(input.profileUrl),
    image: input.imageUrl ?? undefined,
    jobTitle: input.jobTitle ?? undefined,
    description: input.description ?? undefined,
    worksFor: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    sameAs: sameAs.length > 0 ? sameAs : undefined,
    knowsAbout:
      input.credentials && input.credentials.length > 0
        ? input.credentials
        : undefined,
    interactionStatistic:
      interactionStatistic.length > 0 ? interactionStatistic : undefined,
  });
}

// ─── Person + EducationalOccupationalCredential — certificate pages ──────────
//
// E-E-A-T note: A public, shareable certificate page carries two high-value
// schema signals: (1) the Person node names the credential holder, building
// their author/expert authority in AI and search-engine corpora; (2) the
// EducationalOccupationalCredential node registers the credential with Google's
// Learning & Credentials rich-result pathway and with LinkedIn's structured-
// import format. Both are factual (educational credential, not advice) and
// AFSL-safe. The `recognizedBy` field names Invest.com.au Academy as the
// issuing authority, boosting E-E-A-T at the org level.
//
// Privacy: only the holder's chosen display name is exposed — never email,
// user_id, or any other PII. The lookup key is the random `certificate_number`,
// which is unguessable and not enumerable (no sequential endpoint exists).

export interface PersonCredentialInput {
  /** Holder display name (no PII — this is a public page). */
  holderName: string;
  /** Credential (course) title. */
  credentialTitle: string;
  /** Unguessable random certificate number, e.g. "INV-2026-00042". */
  certificateNumber: string;
  /** ISO-8601 date the certificate was issued. */
  issuedAt: string;
  /** CPD hours earned, if any. */
  cpdHours?: number | null;
  /**
   * Issuer organisation name. Defaults to "Invest.com.au Academy".
   * Override only if the credential comes from a named sub-brand.
   */
  issuerName?: string | null;
}

/**
 * Returns a pair of linked JSON-LD blocks for a public certificate page:
 *
 *   - `credential` — `EducationalOccupationalCredential` node (the certificate
 *     itself) with `recognizedBy` pointing at Invest.com.au Academy and
 *     `about` pointing at the course. Emits as the first `<script>` block.
 *
 *   - `person` — `Person` node naming the holder. Linked back to the
 *     credential via `hasCredential`. Emits as the second `<script>` block.
 *
 * Emit both as separate `<script type="application/ld+json">` blocks, in
 * addition to the existing `BreadcrumbList` block.
 *
 * The builder is intentionally minimal: it never exposes the holder's email,
 * internal user_id, or any Supabase row identifier. The `holderName` field
 * must be the user's chosen display name sourced from their profile, not
 * derived from auth metadata.
 */
export function personCredentialJsonLd(input: PersonCredentialInput) {
  const issuer = input.issuerName ?? "Invest.com.au Academy";
  const certUrl = absoluteUrl(`/certificate/${input.certificateNumber}`);

  const credential = compact({
    "@context": "https://schema.org",
    "@type": "EducationalOccupationalCredential",
    name: `Certificate of Completion — ${input.credentialTitle}`,
    description: `${input.holderName} has successfully completed ${input.credentialTitle} and earned this certificate from ${issuer}.`,
    url: certUrl,
    identifier: input.certificateNumber,
    dateCreated: input.issuedAt,
    credentialCategory: "Certificate",
    competencyRequired: input.cpdHours
      ? `${input.cpdHours} CPD hour${input.cpdHours === 1 ? "" : "s"}`
      : undefined,
    recognizedBy: {
      "@type": "Organization",
      name: issuer,
      url: absoluteUrl("/academy"),
      sameAs: SITE_URL,
    },
    educationalLevel: "Professional Development",
    about: {
      "@type": "Course",
      name: input.credentialTitle,
      provider: {
        "@type": "Organization",
        name: issuer,
        url: SITE_URL,
      },
    },
    validFor: {
      "@type": "Person",
      name: input.holderName,
    },
  });

  const person = compact({
    "@context": "https://schema.org",
    "@type": "Person",
    name: input.holderName,
    hasCredential: {
      "@type": "EducationalOccupationalCredential",
      name: `Certificate of Completion — ${input.credentialTitle}`,
      url: certUrl,
      recognizedBy: {
        "@type": "Organization",
        name: issuer,
        url: absoluteUrl("/academy"),
      },
      dateCreated: input.issuedAt,
    },
  });

  return { credential, person };
}
