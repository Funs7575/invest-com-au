/**
 * Page-level recommendation copy for the country-aware
 * IntentCountryRecommendation card.
 *
 * Was previously a hardcoded switch statement inside
 * components/foreign-investment/IntentCountryRecommendation.tsx — moved
 * here so:
 *   1. Adding a new surface (e.g. /brokers) doesn't require editing
 *      the component, only adding a row to PAGE_RECOMMENDATIONS.
 *   2. Country-specific copy variants (rare today, expected as we add
 *      more high-friction countries) attach to the same table.
 *   3. Tests can hit the lookup without rendering the component.
 *
 * Each surface has a base recommendation. Countries can opt into a
 * softer "low-friction" variant when isHighFriction === false (NZ
 * today; trans-Tasman is the only such relationship).
 */

export type RecommendationSurface = "compare" | "advisors" | "invest";

export interface PageRecommendation {
  /** Headline for the country-specific CTA card. */
  title: string;
  /** One-line explanation of why this is being recommended. */
  body: string;
  /** Where the primary CTA lands. Pre-filtered URL where possible. */
  href: string;
  /** Primary CTA label. */
  cta: string;
}

/**
 * Strip the trailing " investors" suffix from country labels like
 * "UK investors" → "UK" so it composes naturally inside titles
 * ("FIRB-eligible — what UK can actually buy").
 */
function shortLabel(label: string): string {
  return label.replace(/ investors$/, "");
}

const RECOMMENDATION_BUILDERS: Record<
  RecommendationSurface,
  (label: string, isHighFriction: boolean) => PageRecommendation
> = {
  compare: (label) => ({
    title: `Show only brokers that accept ${shortLabel(label)} residents`,
    body: `Most retail Australian brokers don't onboard non-residents. The non-resident comparison is the right filter — it pre-filters to platforms that explicitly accept overseas applicants.`,
    href: "/compare/non-residents",
    cta: "Non-resident brokers",
  }),

  advisors: (label) => ({
    title: `Cross-border tax accountants for ${shortLabel(label)} clients`,
    body: `International tax specialists handle dual-country tax reporting, FIRB property advice, cross-border pension transfers and treaty positions — the four areas where DIY most often goes wrong.`,
    href: "/advisors/international-tax-specialists",
    cta: "Specialist advisors",
  }),

  invest: (label, isHighFriction) => {
    const short = shortLabel(label);
    if (!isHighFriction) {
      return {
        title: `New properties and FIRB-eligible listings for ${short}`,
        body: `Even with the trans-Tasman framework, FIRB rules still apply on most direct property purchases. Pre-filter to FIRB-eligible listings to skip the items you can't buy.`,
        href: "/invest?firb=eligible",
        cta: "FIRB-eligible only",
      };
    }
    return {
      title: `FIRB-eligible new properties — what ${short} can actually buy`,
      body: `The 2025–2027 ban blocks foreign buyers from established Australian dwellings. New dwellings, off-the-plan and commercial property remain open with FIRB approval. Pre-filter to those.`,
      href: "/invest?firb=eligible",
      cta: "FIRB-eligible only",
    };
  },
};

export function buildPageRecommendation(
  surface: RecommendationSurface,
  label: string,
  isHighFriction: boolean,
): PageRecommendation | null {
  const builder = RECOMMENDATION_BUILDERS[surface];
  if (!builder) return null;
  return builder(label, isHighFriction);
}
