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
 *
 * Every builder accepts the minimum required fields and gracefully
 * omits optional ones so empty values don't leak into the rendered
 * JSON-LD.
 */

import { SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/seo";

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
    ...(input.rating && input.reviewCount && input.reviewCount > 0
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
        ...(input.rating && input.reviewCount && input.reviewCount > 0
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
  return { "@context": "https://schema.org", ...definedTermNode(input) };
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
    speakable: speakableSpecification(selectors),
    mainEntity: definedTermNode(input),
  });
}
