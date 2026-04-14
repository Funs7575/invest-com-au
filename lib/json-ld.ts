/**
 * Structured data (JSON-LD) helpers for rich snippets.
 *
 * One helper per schema.org type we use across the site. Every
 * helper returns a plain object that the caller renders via:
 *
 *     <script
 *       type="application/ld+json"
 *       dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
 *     />
 *
 * Pure functions, no deps, so unit tests can assert exact output.
 *
 * Why so granular:
 *   - Article schema unlocks rich cards in Google search
 *   - Review schema shows star ratings on SERPs for broker pages
 *   - FAQPage shows expanded Q&A directly
 *   - BreadcrumbList helps Google understand the IA
 *   - FinancialProduct is the closest schema.org match for brokers
 *     and funds; Google doesn't render it as rich snippets but the
 *     data feeds the knowledge graph
 *   - Organization pins the publisher identity to every page
 */

import { SITE_NAME, SITE_URL } from "@/lib/seo";

/**
 * Organization / Publisher blob reused inside Article schema.
 * Centralised so a logo URL change only edits one line.
 */
export function organizationLd(): Record<string, unknown> {
  return {
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}/logo.png`,
      width: 200,
      height: 60,
    },
  };
}

export interface ArticleLdInput {
  title: string;
  description: string;
  slug: string;
  image?: string | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
  author?: { name: string; url?: string | null } | null;
  reviewer?: { name: string; url?: string | null } | null;
  keywords?: string[] | null;
}

/**
 * schema.org/Article. Tune'd for financial education / guide posts
 * rather than news. Includes `reviewedBy` when an editorial reviewer
 * is supplied — Google treats editorially-reviewed articles as more
 * authoritative, especially for YMYL topics.
 */
export function articleLd(input: ArticleLdInput): Record<string, unknown> {
  const url = `${SITE_URL}/article/${input.slug}`;
  const image = input.image || `${SITE_URL}/api/og/article?slug=${encodeURIComponent(input.slug)}`;
  const obj: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Article",
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    headline: truncate(input.title, 110),
    description: truncate(input.description, 250),
    image: [image],
    url,
    inLanguage: "en-AU",
    publisher: organizationLd(),
  };
  if (input.publishedAt) obj.datePublished = input.publishedAt;
  if (input.updatedAt) obj.dateModified = input.updatedAt;
  if (input.author) {
    obj.author = {
      "@type": "Person",
      name: input.author.name,
      ...(input.author.url ? { url: input.author.url } : {}),
    };
  }
  if (input.reviewer) {
    obj.reviewedBy = {
      "@type": "Person",
      name: input.reviewer.name,
      ...(input.reviewer.url ? { url: input.reviewer.url } : {}),
    };
  }
  if (input.keywords?.length) obj.keywords = input.keywords.join(", ");
  return obj;
}

/**
 * schema.org/BreadcrumbList. Pass an array of {name, url} from
 * Home → Section → Current. The final item's url is optional.
 */
export function breadcrumbLd(
  crumbs: Array<{ name: string; url?: string }>,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      ...(c.url ? { item: c.url } : {}),
    })),
  };
}

export interface FaqLdItem {
  question: string;
  answer: string;
}

/**
 * schema.org/FAQPage. Google renders these as expandable Q&A in
 * search results which dramatically increases CTR on FAQ-heavy
 * pages.
 */
export function faqLd(items: FaqLdItem[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((i) => ({
      "@type": "Question",
      name: i.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: i.answer,
      },
    })),
  };
}

export interface BrokerProductLdInput {
  slug: string;
  name: string;
  description: string;
  rating?: number | null;
  reviewCount?: number | null;
  logoUrl?: string | null;
  fees?: { asx?: string | null; us?: string | null } | null;
}

/**
 * schema.org/FinancialProduct for a broker. Google uses this for
 * the knowledge panel + rich rating stars on SERPs.
 */
export function brokerProductLd(input: BrokerProductLdInput): Record<string, unknown> {
  const url = `${SITE_URL}/broker/${input.slug}`;
  const obj: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "FinancialProduct",
    name: input.name,
    description: truncate(input.description, 250),
    url,
    provider: organizationLd(),
  };
  if (input.logoUrl) obj.image = input.logoUrl;
  if (input.rating != null && input.reviewCount != null && input.reviewCount > 0) {
    obj.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: input.rating,
      reviewCount: input.reviewCount,
      bestRating: 5,
      worstRating: 1,
    };
  }
  if (input.fees?.asx) {
    obj.offers = {
      "@type": "Offer",
      priceCurrency: "AUD",
      description: `ASX trade: ${input.fees.asx}${input.fees.us ? `, US trade: ${input.fees.us}` : ""}`,
    };
  }
  return obj;
}

export interface AdvisorProfileLdInput {
  slug: string;
  name: string;
  firmName?: string | null;
  description: string;
  location?: string | null;
  photoUrl?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  specialties?: string[] | null;
}

/**
 * schema.org/FinancialService for an advisor profile. Uses the
 * ProfessionalService subtype so Google understands the individual
 * vs. the firm. aggregateRating pulls stars into rich results.
 */
export function advisorProfileLd(input: AdvisorProfileLdInput): Record<string, unknown> {
  const url = `${SITE_URL}/advisor/${input.slug}`;
  const obj: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "FinancialService",
    name: input.firmName ? `${input.name} — ${input.firmName}` : input.name,
    description: truncate(input.description, 250),
    url,
    areaServed: { "@type": "Country", name: "Australia" },
    provider: organizationLd(),
  };
  if (input.photoUrl) obj.image = input.photoUrl;
  if (input.location) {
    obj.address = { "@type": "PostalAddress", addressLocality: input.location, addressCountry: "AU" };
  }
  if (input.rating != null && input.reviewCount != null && input.reviewCount > 0) {
    obj.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: input.rating,
      reviewCount: input.reviewCount,
      bestRating: 5,
      worstRating: 1,
    };
  }
  if (input.specialties?.length) obj.knowsAbout = input.specialties;
  return obj;
}

export interface ReviewLdInput {
  itemName: string;
  itemUrl: string;
  rating: number;
  author: string;
  reviewBody: string;
  datePublished?: string | null;
}

/**
 * schema.org/Review for a single broker or advisor review. Wrap
 * a list of these in the parent product's `review` field for the
 * product page itself.
 */
export function reviewLd(input: ReviewLdInput): Record<string, unknown> {
  return {
    "@type": "Review",
    reviewRating: {
      "@type": "Rating",
      ratingValue: input.rating,
      bestRating: 5,
      worstRating: 1,
    },
    author: { "@type": "Person", name: input.author },
    reviewBody: truncate(input.reviewBody, 500),
    itemReviewed: { "@type": "Thing", name: input.itemName, url: input.itemUrl },
    ...(input.datePublished ? { datePublished: input.datePublished } : {}),
  };
}

// ─── helpers ──────────────────────────────────────────────────────
function truncate(s: string, max: number): string {
  if (!s) return "";
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + "…";
}
