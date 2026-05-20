import IntentCountryBadge from "./IntentCountryBadge";
import IntentCountryRecommendation from "./IntentCountryRecommendation";
import CountryRuleAlerts from "../CountryRuleAlerts";
import type { RecommendationSurface } from "@/lib/page-recommendations";

/**
 * Canonical country-aware banner stack for directory pages.
 *
 * Renders three pieces in fixed order on every directory that
 * adapts to the visitor's intent country (UK/US/NZ/etc.):
 *
 *   1. IntentCountryBadge — "Browsing as <country> investors" pill
 *      with Hub / Clear actions. Server-side; reads the
 *      iv_intent_country cookie.
 *   2. CountryRuleAlerts — high-impact rule notifications
 *      (dwelling ban, visa changes, FIRB tweaks). Client-side;
 *      fetches /api/country-rule-alerts on mount.
 *   3. IntentCountryRecommendation — advisory CTA card
 *      ("Cross-border tax accountants for UK clients" etc.).
 *      Server-side; copy comes from
 *      `lib/page-recommendations.ts`.
 *
 * Renders nothing when the user has no intent country set — most
 * visitors. So adding this to a page is safe even before country
 * mode is fully wired.
 *
 * Order is deliberate: pill (passive context) → rule alerts
 * (urgent / time-bound) → recommendation (advisory next step).
 * Reordering produces a different cognitive load and was settled
 * in the directory-UX unification plan
 * (docs/plans/DIRECTORY_UX_UNIFICATION.md, decision Q6).
 */
export default function DirectoryBanners({
  surface,
}: {
  surface: RecommendationSurface;
}) {
  return (
    <>
      <div className="mb-2">
        <IntentCountryBadge />
      </div>
      <CountryRuleAlerts />
      <IntentCountryRecommendation surface={surface} />
    </>
  );
}
