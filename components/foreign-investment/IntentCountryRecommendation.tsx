import { intentCountryMeta } from "@/lib/intent-context";
import { getIntentCountry } from "@/lib/intent-context-server";
import {
  buildPageRecommendation,
  type RecommendationSurface,
} from "@/lib/page-recommendations";
import IntentCountryRecommendationCard from "./IntentCountryRecommendationCard";

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
 * Copy lives in `lib/page-recommendations.ts` (single source of truth
 * per surface). Adding a new surface means adding a row there, not
 * editing this component.
 *
 * Renders nothing when no country is set (most users) so the standard
 * page experience is unchanged.
 */
export default async function IntentCountryRecommendation({
  surface,
}: {
  surface: RecommendationSurface;
}) {
  const code = await getIntentCountry();
  if (!code) return null;

  // The "nz" code is treated as non-AU but very low-friction (free trade,
  // shared rules in many areas). Show a slightly softer recommendation.
  const meta = intentCountryMeta(code);
  const isHighFriction = code !== "nz";

  const rec = buildPageRecommendation(surface, meta.label, isHighFriction);
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
