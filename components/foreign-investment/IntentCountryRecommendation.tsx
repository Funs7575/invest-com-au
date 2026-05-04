import { getIntentCountry, intentCountryMeta } from "@/lib/intent-context";
import IntentCountryRecommendationCard from "./IntentCountryRecommendationCard";

type SurfaceKind = "compare" | "advisors" | "invest";

interface Recommendation {
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
 * Country-aware contextual CTA card.
 *
 * Reads the iv_intent_country cookie and renders a "Recommended for
 * <country> investors" card on /compare, /advisors and /invest. The
 * card links to the most relevant pre-filtered destination on that
 * page — for example, on /compare it points to /compare/non-residents
 * because that's the strict subset of brokers that work for non-AU
 * residents.
 *
 * Renders nothing when no country is set (most users) so the standard
 * page experience is unchanged.
 */
export default async function IntentCountryRecommendation({
  surface,
}: {
  surface: SurfaceKind;
}) {
  const code = await getIntentCountry();
  if (!code) return null;

  // The "nz" code is treated as non-AU but very low-friction (free trade,
  // shared rules in many areas). Show a slightly softer recommendation.
  const meta = intentCountryMeta(code);
  const isHighFriction = code !== "nz";

  const rec = buildRecommendation(surface, code, meta.label, isHighFriction);
  if (!rec) return null;

  return (
    <IntentCountryRecommendationCard
      flag={meta.flag}
      audienceLabel={meta.label}
      title={rec.title}
      body={rec.body}
      href={rec.href}
      cta={rec.cta}
    />
  );
}

function buildRecommendation(
  surface: SurfaceKind,
  code: string,
  label: string,
  isHighFriction: boolean,
): Recommendation | null {
  switch (surface) {
    case "compare":
      return {
        title: `Show only brokers that accept ${label.replace(" investors", "")} residents`,
        body: `Most retail Australian brokers don't onboard non-residents. The non-resident comparison is the right filter — it pre-filters to platforms that explicitly accept overseas applicants.`,
        href: "/compare/non-residents",
        cta: "Non-resident brokers",
      };
    case "advisors":
      return {
        title: `Cross-border tax accountants for ${label.replace(" investors", "")} clients`,
        body: `International tax specialists handle UK/AU dual reporting, FIRB property advice, QROPS pension transfers and treaty positions — the four areas where DIY most often goes wrong.`,
        href: "/advisors/international-tax-specialists",
        cta: "Specialist advisors",
      };
    case "invest":
      if (!isHighFriction) {
        return {
          title: `New properties and FIRB-eligible listings for ${label.replace(" investors", "")}`,
          body: `Even with the trans-Tasman framework, FIRB rules still apply on most direct property purchases. Pre-filter to FIRB-eligible listings to skip the items you can't buy.`,
          href: "/invest?firb=eligible",
          cta: "FIRB-eligible only",
        };
      }
      return {
        title: `FIRB-eligible new properties — what ${label.replace(" investors", "")} can actually buy`,
        body: `The 2025–2027 ban blocks foreign buyers from established Australian dwellings. New dwellings, off-the-plan and commercial property remain open with FIRB approval. Pre-filter to those.`,
        href: "/invest?firb=eligible",
        cta: "FIRB-eligible only",
      };
    default:
      // Exhaustiveness — should never hit at runtime.
      return null;
  }
  void code;
}
