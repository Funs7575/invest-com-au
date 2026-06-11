import Link from "next/link";

import Icon from "@/components/Icon";
import { buildCrossBorderMatchUrl } from "@/lib/prefill-url";
import { hrefForNeed, labelForNeed } from "@/lib/quiz-advisor-types";
import {
  BANNER_PADDING,
  BANNER_RADIUS,
  RECOMMENDATION_BG,
  RECOMMENDATION_BORDER,
  RECOMMENDATION_BODY_TEXT,
  RECOMMENDATION_CTA_BG,
  RECOMMENDATION_CTA_HOVER,
  RECOMMENDATION_CTA_TEXT,
  RECOMMENDATION_TITLE_TEXT,
} from "./banner-tokens";

/**
 * Single next-step block for the cross-border (foreign-investor) funnel.
 *
 * Every cross-border content page — the FIRB eligibility explainer, the
 * non-resident mortgage guide, the per-country hubs — should end with one
 * obvious next step so a non-resident never hits a dead end. This block
 * surfaces the two conversion points that exist for that audience:
 *
 *   1. The dedicated cross-border match flow (`/find-advisor?specialty=…`
 *      — the carve-out next.config.ts preserves for these deep-links),
 *      built via `buildCrossBorderMatchUrl` so the URL is never
 *      hand-rolled.
 *   2. A relevant advisor directory, resolved through
 *      `hrefForNeed`/`labelForNeed` (lib/quiz-advisor-types.ts) so the
 *      directory href is the single source of truth, not a literal.
 *
 * Strictly factual: it links to the match flow and a directory. It makes
 * no suitability claim and recommends no product (cross-border touches
 * the REGULATORY-AVOID-LIST — general information + referral only).
 *
 * Visual tokens come from `banner-tokens.ts` so the block stays coherent
 * with the country-aware banner stack (DirectoryBanners) it sits near.
 */

export interface CrossBorderNextStepProps {
  /**
   * Intent-country slug (the folder under app/foreign-investment/, e.g.
   * "united-kingdom"). When set, the quiz CTA pre-seeds the country
   * question. Omit on country-agnostic guides.
   */
  countrySlug?: string;
  /**
   * Whether the page is addressed to Australian expats rather than
   * foreign nationals. Defaults to the non-resident "international"
   * audience.
   */
  expat?: boolean;
  /**
   * Advisor need-slug for the secondary directory link (an `AdvisorNeed`,
   * e.g. "tax-agent", "mortgage-broker"). Resolved through
   * `hrefForNeed`/`labelForNeed` so the directory href stays canonical.
   * Defaults to the international-tax specialist directory, the most
   * common cross-border destination.
   */
  advisorNeed?: string;
  /**
   * Explicit secondary-link href + label, for curated directories that
   * aren't quiz need-slugs (e.g. `/advisors/firb-specialists`). Takes
   * precedence over `advisorNeed`. Both must be supplied together.
   */
  advisorHref?: string;
  advisorLabel?: string;
  /** Override the headline. */
  title?: string;
  /** Override the supporting line. */
  body?: string;
  /** Override the quiz CTA label. */
  quizCtaLabel?: string;
}

/**
 * The cross-border corridor's catch-all advisor directory. Not in the
 * quiz-advisor-type registry (it's a curated specialty page, not a
 * need-slug), so it's referenced directly here as the default secondary
 * link. The registry still owns every other advisor href.
 */
const INTL_TAX_DIRECTORY = "/advisors/international-tax-specialists";

export default function CrossBorderNextStep({
  countrySlug,
  expat = false,
  advisorNeed,
  advisorHref: advisorHrefProp,
  advisorLabel: advisorLabelProp,
  title = "Not sure where to start? Take the 60-second match",
  body = "Answer a few questions about your country, visa status and goal. We point you to the platforms, specialists or property route that match — no obligation.",
  quizCtaLabel = "Find my starting point",
}: CrossBorderNextStepProps) {
  const quizHref = buildCrossBorderMatchUrl({
    track: expat ? "expat" : "international",
    countrySlug,
  });

  // Secondary link precedence: explicit href override (curated directory) →
  // registry lookup by need-slug (canonical hrefs) → the international-tax
  // specialist page (the catch-all cross-border destination).
  const advisorHref =
    advisorHrefProp ?? (advisorNeed ? hrefForNeed(advisorNeed) : INTL_TAX_DIRECTORY);
  const advisorLabel =
    advisorLabelProp ??
    (advisorNeed ? labelForNeed(advisorNeed) : "International tax specialists");

  return (
    <div
      className={`${RECOMMENDATION_BG} border ${RECOMMENDATION_BORDER} ${BANNER_RADIUS} ${BANNER_PADDING}`}
      data-testid="cross-border-next-step"
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
          <Icon name="target" size={18} className="text-amber-700" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-extrabold uppercase tracking-wider text-amber-700 mb-0.5">
            Your next step
          </p>
          <h3 className={`text-base font-bold ${RECOMMENDATION_TITLE_TEXT} mb-1`}>
            {title}
          </h3>
          <p className={`text-sm ${RECOMMENDATION_BODY_TEXT} leading-snug mb-3 max-w-xl`}>
            {body}
          </p>
          <div className="flex flex-wrap gap-2.5">
            <Link
              href={quizHref}
              className={`inline-flex items-center gap-1.5 px-4 py-2 font-bold text-sm rounded-lg transition-colors ${RECOMMENDATION_CTA_BG} ${RECOMMENDATION_CTA_HOVER} ${RECOMMENDATION_CTA_TEXT}`}
            >
              {quizCtaLabel}
              <Icon name="arrow-right" size={14} />
            </Link>
            <Link
              href={advisorHref}
              className="inline-flex items-center gap-1.5 px-4 py-2 font-semibold text-sm rounded-lg border border-amber-300 bg-white/60 text-amber-800 hover:bg-white transition-colors"
            >
              {advisorLabel}
              <Icon name="arrow-right" size={14} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
