"use client";

import type { Broker } from "@/lib/types";
import {
  trackClick,
  getAffiliateLink,
  getBenefitCta,
  renderStars,
  AFFILIATE_REL,
} from "@/lib/tracking";
import { isSponsored } from "@/lib/sponsorship";
import { buildWealthStack, type StackAnswers } from "@/lib/quiz-stack";
import Icon from "@/components/Icon";
import RiskWarningInline from "@/components/RiskWarningInline";
import SponsorBadge from "@/components/SponsorBadge";

/**
 * Renders the concrete multi-product "wealth stack" — one recommended pick
 * per applicable category (broker / super / savings / robo), each with a
 * short rationale and the correct affiliate CTA.
 *
 * Deliberately minimal: it reuses the existing result-screen primitives
 * (`getAffiliateLink`/`getBenefitCta`/`trackClick` from lib/tracking, the
 * SponsorBadge + RiskWarningInline components) rather than introducing new
 * card chrome. The pick selection + gating + rationale all live in the pure
 * `buildWealthStack` builder so this component is render-only.
 *
 * Sits below the broker top-match on the DIY results screen, replacing the
 * abstract category links (ThreadCardsStrip) with actual product picks. It's
 * suppressed when no category qualifies or the data has no products.
 */

const CATEGORY_ICON: Record<string, string> = {
  broker: "bar-chart",
  super: "landmark",
  savings: "piggy-bank",
  robo: "coins",
};

interface Props {
  brokers: Broker[];
  answers: StackAnswers;
}

export default function QuizWealthStack({ brokers, answers }: Props) {
  const stack = buildWealthStack(brokers, answers);

  // Only worth showing when the stack adds something beyond the single
  // top-match broker above (i.e. ≥2 picks, or 1 non-broker pick).
  const hasExtra =
    stack.length >= 2 || stack.some((p) => p.category !== "broker");
  if (!hasExtra) return null;

  return (
    <section
      aria-labelledby="quiz-wealth-stack-heading"
      className="mb-4 md:mb-6 result-card-in result-card-in-delay-2"
    >
      <div className="text-center mb-3 md:mb-4">
        <p className="text-[0.58rem] md:text-[0.62rem] font-bold uppercase tracking-wider text-emerald-600 mb-1">
          Your wealth stack
        </p>
        <h2
          id="quiz-wealth-stack-heading"
          className="text-base md:text-xl font-extrabold text-slate-900"
        >
          A great setup is more than just a broker
        </h2>
        <p className="text-[0.69rem] md:text-sm text-slate-500 mt-1">
          Based on your answers, here&apos;s a recommended pick for each part
          of your setup.
        </p>
      </div>

      <div className="grid gap-2.5 md:gap-3 grid-cols-1 sm:grid-cols-2">
        {stack.map((pick) => {
          const broker = pick.broker;
          return (
            <div
              key={pick.category}
              className="flex flex-col p-3 md:p-4 bg-white border border-slate-200 rounded-xl"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                  <Icon name={CATEGORY_ICON[pick.category] ?? "bar-chart"} size={16} className="text-emerald-600" />
                </div>
                <span className="text-[0.58rem] md:text-[0.62rem] font-bold uppercase tracking-wider text-slate-400">
                  {pick.label}
                </span>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                <h3 className="text-sm md:text-base font-bold text-slate-900">
                  {broker.name}
                </h3>
                {isSponsored(broker) && <SponsorBadge broker={broker} />}
              </div>
              <div className="text-[0.62rem] md:text-xs text-amber mb-1.5">
                {renderStars(broker.rating || 0)}{" "}
                <span className="text-slate-500">{broker.rating}/5</span>
              </div>

              <p className="text-[0.69rem] md:text-xs text-slate-500 leading-relaxed mb-3 flex-1">
                {pick.rationale}
              </p>

              <a
                href={getAffiliateLink(broker)}
                target="_blank"
                rel={AFFILIATE_REL}
                onClick={() =>
                  trackClick(
                    broker.slug,
                    broker.name,
                    `quiz-stack-${pick.category}`,
                    "/quiz",
                    "quiz-stack",
                  )
                }
                className="block w-full text-center px-3 py-2 md:px-4 md:py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[0.7rem] md:text-sm font-bold rounded-lg transition-colors"
              >
                {getBenefitCta(broker, "quiz")}
              </a>
              <RiskWarningInline />

              {pick.disclaimer && (
                <p className="text-[0.58rem] md:text-[0.65rem] text-slate-400 leading-tight mt-1.5">
                  {pick.disclaimer}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
