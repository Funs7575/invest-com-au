import type { TeamMember, Broker, Course } from "./types";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://invest-com-au.vercel.app";

export const SITE_NAME = "Invest.com.au";

export const SITE_DESCRIPTION =
  "Compare Australia's best share trading platforms. Honest reviews, fee calculators, and CHESS-sponsored broker comparisons. No bank bias.";

/* ─── Date constants — update once here when refreshing content ─── */
export const CURRENT_YEAR = 2026;
export const CURRENT_MONTH_YEAR = "March 2026";
/** Short form for meta descriptions */
export const UPDATED_LABEL = `Updated ${CURRENT_MONTH_YEAR}`;
export const FEES_VERIFIED_LABEL = `Fees verified ${CURRENT_MONTH_YEAR}`;

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/* ─── Shared Organization block for JSON-LD ─── */

export const ORGANIZATION_JSONLD = {
  "@type": "Organization" as const,
  name: SITE_NAME,
  url: SITE_URL,
  logo: {
    "@type": "ImageObject" as const,
    url: `${SITE_URL}/icon`,
  },
  sameAs: [
    "https://x.com/investcomau",
    "https://www.linkedin.com/company/invest-com-au",
  ],
};

/**
 * Generate BreadcrumbList JSON-LD schema.
 * Last item should omit `url` (current page).
 */
export function breadcrumbJsonLd(
  items: { name: string; url?: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      ...(item.url ? { item: item.url } : {}),
    })),
  };
}

/* ─── E-E-A-T: Review author & editorial info ─── */

export const REVIEW_AUTHOR = {
  name: "Finn Webster",
  jobTitle: "Founder & Lead Editor",
  description:
    "Finn is the founder and lead editor at Invest.com.au. He has personally tested over 20 Australian brokers, comparing fees, platforms, and CHESS sponsorship status to help everyday Australians make smarter investment decisions.",
  url: absoluteUrl("/reviewers/finn-webster"),
};

export const REVIEW_METHODOLOGY_URL = absoluteUrl("/how-we-verify");

/* ─── E-E-A-T: Role formatting ─── */

const ROLE_LABELS: Record<string, string> = {
  contributor: "Contributor",
  staff_writer: "Staff Writer",
  editor: "Editor",
  expert_reviewer: "Expert Reviewer",
  course_creator: "Course Creator",
};

export function formatRole(role: string): string {
  return ROLE_LABELS[role] || role;
}

/* ─── E-E-A-T: ProfilePage JSON-LD for author/reviewer profile pages ─── */

export function profilePageJsonLd(member: TeamMember, pathPrefix: "authors" | "reviewers" = "authors") {
  const sameAs: string[] = [];
  if (member.linkedin_url) sameAs.push(member.linkedin_url);
  if (member.twitter_url) sameAs.push(member.twitter_url);
  if (member.publications?.length) {
    member.publications.forEach((p) => sameAs.push(p.url));
  }

  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    mainEntity: {
      "@type": "Person",
      name: member.full_name,
      url: absoluteUrl(`/${pathPrefix}/${member.slug}`),
      jobTitle: formatRole(member.role),
      description: member.short_bio || undefined,
      ...(sameAs.length ? { sameAs } : {}),
      ...(member.credentials?.length
        ? { knowsAbout: member.credentials }
        : {}),
      worksFor: {
        "@type": "Organization",
        name: SITE_NAME,
        url: SITE_URL,
      },
    },
  };
}

/* ─── E-E-A-T: Person block for Article JSON-LD author field ─── */

export function articleAuthorJsonLd(member: TeamMember) {
  const sameAs: string[] = [];
  if (member.linkedin_url) sameAs.push(member.linkedin_url);
  if (member.twitter_url) sameAs.push(member.twitter_url);

  return {
    "@type": "Person",
    name: member.full_name,
    url: absoluteUrl(`/authors/${member.slug}`),
    jobTitle: formatRole(member.role),
    ...(sameAs.length ? { sameAs } : {}),
    worksFor: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
  };
}

/* ─── E-E-A-T: Person block for reviewer in Review JSON-LD ─── */

export function reviewerPersonJsonLd(member: TeamMember) {
  const sameAs: string[] = [];
  if (member.linkedin_url) sameAs.push(member.linkedin_url);

  return {
    "@type": "Person",
    name: member.full_name,
    url: absoluteUrl(`/reviewers/${member.slug}`),
    jobTitle: formatRole(member.role),
    ...(sameAs.length ? { sameAs } : {}),
    worksFor: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
  };
}

/**
 * Build FinancialProduct + Review JSON-LD for a broker review page.
 * Follows Google's review snippet guidelines for YMYL content.
 */
export function brokerReviewJsonLd(broker: {
  name: string;
  slug: string;
  tagline?: string;
  rating?: number;
  asx_fee?: string;
  regulated_by?: string;
  year_founded?: number;
  updated_at: string;
  created_at: string;
  pros?: string[];
  cons?: string[];
  fee_verified_date?: string;
  review_count?: number;
}, reviewer?: TeamMember) {
  const datePublished = broker.created_at
    ? new Date(broker.created_at).toISOString().split("T")[0]
    : new Date().toISOString().split("T")[0];
  const dateModified = broker.updated_at
    ? new Date(broker.updated_at).toISOString().split("T")[0]
    : datePublished;

  // Build a concise reviewBody from pros/cons
  const prosText = broker.pros?.length
    ? `Pros: ${broker.pros.slice(0, 3).join("; ")}.`
    : "";
  const consText = broker.cons?.length
    ? `Cons: ${broker.cons.slice(0, 3).join("; ")}.`
    : "";
  const reviewBody = [
    broker.tagline || `In-depth review of ${broker.name}.`,
    prosText,
    consText,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    "@context": "https://schema.org",
    "@type": "FinancialProduct",
    name: `${broker.name} Trading Platform`,
    description:
      broker.tagline || `Review of ${broker.name} share trading platform`,
    brand: { "@type": "Brand", name: broker.name },
    url: absoluteUrl(`/broker/${broker.slug}`),
    ...(broker.year_founded
      ? { foundingDate: String(broker.year_founded) }
      : {}),
    ...(broker.regulated_by
      ? { additionalProperty: {
          "@type": "PropertyValue",
          name: "Regulated By",
          value: broker.regulated_by,
        }}
      : {}),
    ...(broker.asx_fee
      ? { feesAndCommissionsSpecification: `ASX brokerage: ${broker.asx_fee}` }
      : {}),
    review: {
      "@type": "Review",
      author: reviewer
        ? reviewerPersonJsonLd(reviewer)
        : {
            "@type": "Person",
            name: REVIEW_AUTHOR.name,
            jobTitle: REVIEW_AUTHOR.jobTitle,
            url: REVIEW_AUTHOR.url,
            worksFor: {
              "@type": "Organization",
              name: SITE_NAME,
              url: SITE_URL,
            },
          },
      publisher: ORGANIZATION_JSONLD,
      datePublished,
      dateModified,
      reviewBody,
      reviewRating: {
        "@type": "Rating",
        ratingValue: broker.rating || 0,
        bestRating: 5,
        worstRating: 1,
      },
    },
    ...((broker.review_count ?? 0) > 0 ? {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: broker.rating || 0,
        bestRating: 5,
        worstRating: 1,
        reviewCount: broker.review_count,
      },
    } : {}),
  };
}

/**
 * Build Article JSON-LD wrapper for the review page.
 * Google uses this for authorship and freshness signals.
 */
export function reviewArticleJsonLd(broker: {
  name: string;
  slug: string;
  tagline?: string;
  updated_at: string;
  created_at: string;
}, reviewer?: TeamMember) {
  const datePublished = broker.created_at
    ? new Date(broker.created_at).toISOString().split("T")[0]
    : new Date().toISOString().split("T")[0];
  const dateModified = broker.updated_at
    ? new Date(broker.updated_at).toISOString().split("T")[0]
    : datePublished;

  const authorBlock = reviewer
    ? reviewerPersonJsonLd(reviewer)
    : {
        "@type": "Person",
        name: REVIEW_AUTHOR.name,
        jobTitle: REVIEW_AUTHOR.jobTitle,
        url: REVIEW_AUTHOR.url,
        worksFor: {
          "@type": "Organization",
          name: SITE_NAME,
          url: SITE_URL,
        },
      };

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${broker.name} Review (${CURRENT_YEAR})`,
    description:
      broker.tagline ||
      `Honest review of ${broker.name}. Fees, pros, cons, and our verdict.`,
    url: absoluteUrl(`/broker/${broker.slug}`),
    datePublished,
    dateModified,
    author: authorBlock,
    publisher: ORGANIZATION_JSONLD,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": absoluteUrl(`/broker/${broker.slug}`),
    },
  };
}

/* ─── FAQ JSON-LD for article sections ─── */

/**
 * Build FAQPage JSON-LD from article sections.
 * Google uses this for rich FAQ snippets in search results.
 * Only includes sections whose headings look like questions.
 */
export function articleFaqJsonLd(
  sections: { heading: string; body: string }[]
) {
  // Filter for question-like headings (contains "?" or starts with common question words)
  const questionPattern = /\?$|^(what|how|why|when|where|which|who|can|do|does|is|are|should|will)\b/i;
  const faqSections = sections.filter((s) => questionPattern.test(s.heading.trim()));

  if (faqSections.length < 2) return null; // Need at least 2 Q&A pairs

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqSections.map((s) => ({
      "@type": "Question",
      name: s.heading,
      acceptedAnswer: {
        "@type": "Answer",
        text: s.body.slice(0, 500), // Truncate to avoid oversized schema
      },
    })),
  };
}

/* ─── Deals: Offer JSON-LD for individual deal ─── */

export function dealOfferJsonLd(broker: Broker) {
  return {
    "@context": "https://schema.org",
    "@type": "Offer",
    name: broker.deal_text || `${broker.name} Promotion`,
    ...(broker.deal_terms ? { description: broker.deal_terms } : {}),
    ...(broker.deal_expiry ? { validThrough: new Date(broker.deal_expiry).toISOString() } : {}),
    url: absoluteUrl(`/broker/${broker.slug}`),
    offeredBy: {
      "@type": "Organization",
      name: broker.name,
    },
    seller: {
      "@type": "Organization",
      name: broker.name,
    },
  };
}

/* ─── Deals: ItemList JSON-LD for /deals hub page ─── */

export function dealsHubJsonLd(dealBrokers: Broker[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Australian Broker Deals & Promotions",
    description: "Current verified deals and promotions from Australian share trading platforms and crypto exchanges.",
    numberOfItems: dealBrokers.length,
    itemListElement: dealBrokers.map((broker, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Offer",
        name: broker.deal_text || `${broker.name} Promotion`,
        url: absoluteUrl(`/broker/${broker.slug}`),
        ...(broker.deal_expiry ? { validThrough: new Date(broker.deal_expiry).toISOString() } : {}),
        offeredBy: {
          "@type": "Organization",
          name: broker.name,
        },
      },
    })),
  };
}

/* ─── Course JSON-LD ─── */

export function courseJsonLd(
  course: Course,
  totalLessons: number,
  totalModules: number
) {
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.title,
    description: course.description || course.subtitle || "",
    provider: {
      "@type": "Organization",
      name: SITE_NAME,
      url: absoluteUrl("/"),
    },
    ...(course.creator
      ? {
          instructor: {
            "@type": "Person",
            name: course.creator.full_name,
            url: absoluteUrl(`/authors/${course.creator.slug}`),
          },
        }
      : {}),
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "online",
      ...(course.estimated_hours
        ? { courseWorkload: `PT${Math.round(course.estimated_hours)}H` }
        : {}),
    },
    offers: {
      "@type": "Offer",
      price: (course.price / 100).toFixed(2),
      priceCurrency: course.currency,
      availability: "https://schema.org/InStock",
      url: absoluteUrl(`/courses/${course.slug}`),
    },
    numberOfCredits: totalModules,
    educationalLevel: course.level === "beginner" ? "Beginner" : course.level === "intermediate" ? "Intermediate" : "Advanced",
    inLanguage: "en-AU",
  };
}

/* ─── QAPage JSON-LD for broker Q&A sections ─── */

export function qaPageJsonLd(
  questions: { question: string; answers: { answer: string; is_accepted: boolean; display_name?: string }[] }[],
  pageName: string,
  pageUrl: string,
) {
  return {
    "@context": "https://schema.org",
    "@type": "QAPage",
    name: pageName,
    mainEntity: questions.map((q) => ({
      "@type": "Question",
      name: q.question,
      ...(q.answers.find((a) => a.is_accepted)
        ? {
            acceptedAnswer: {
              "@type": "Answer",
              text: q.answers.find((a) => a.is_accepted)!.answer,
              author: {
                "@type": "Person",
                name: q.answers.find((a) => a.is_accepted)!.display_name || "Editorial Team",
              },
            },
          }
        : q.answers.length > 0
          ? {
              suggestedAnswer: q.answers.map((a) => ({
                "@type": "Answer",
                text: a.answer,
                author: {
                  "@type": "Person",
                  name: a.display_name || "Editorial Team",
                },
              })),
            }
          : {}),
    })),
  };
}
