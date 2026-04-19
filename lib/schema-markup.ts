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
