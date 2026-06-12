"use client";

import Link from "next/link";
import Icon from "@/components/Icon";
import { trackEvent } from "@/lib/tracking";
import type { BestOutcome } from "@/lib/quiz-outcome";

interface Props {
  outcome: BestOutcome;
}

const TONE_STYLES: Record<BestOutcome["tone"], { card: string; badge: string; iconBg: string; iconColor: string; cta: string; secondaryHover: string }> = {
  amber: {
    card: "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-300",
    badge: "bg-amber-100 text-amber-800",
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    cta: "bg-amber-500 hover:bg-amber-600",
    secondaryHover: "hover:bg-amber-100/60 hover:text-amber-800",
  },
  violet: {
    card: "bg-gradient-to-br from-violet-50 to-purple-50 border-violet-300",
    badge: "bg-violet-100 text-violet-800",
    iconBg: "bg-violet-100",
    iconColor: "text-violet-600",
    cta: "bg-violet-600 hover:bg-violet-700",
    secondaryHover: "hover:bg-violet-100/60 hover:text-violet-800",
  },
  blue: {
    card: "bg-gradient-to-br from-blue-50 to-sky-50 border-blue-300",
    badge: "bg-blue-100 text-blue-800",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    cta: "bg-blue-600 hover:bg-blue-700",
    secondaryHover: "hover:bg-blue-100/60 hover:text-blue-800",
  },
  emerald: {
    card: "bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-300",
    badge: "bg-emerald-100 text-emerald-800",
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
    cta: "bg-emerald-600 hover:bg-emerald-700",
    secondaryHover: "hover:bg-emerald-100/60 hover:text-emerald-800",
  },
  slate: {
    card: "bg-slate-50 border-slate-200",
    badge: "bg-slate-200 text-slate-700",
    iconBg: "bg-slate-200",
    iconColor: "text-slate-600",
    cta: "bg-slate-900 hover:bg-slate-800",
    secondaryHover: "hover:bg-slate-200/60 hover:text-slate-800",
  },
};

const KIND_LABEL: Record<BestOutcome["kind"], string> = {
  "post-job": "Best move: post your situation",
  "advisor-match": "Best move: get matched",
  "advisor-browse": "Best move: browse the directory",
  "calculator-first": "Best move: run the numbers first",
  "education-first": "Best move: learn the basics first",
  "diy-broker": "Best move: pick a platform",
  "bundle-stack": "Best move: build a stack",
  "listings-browse": "Best move: browse the listings",
};

export default function QuizPrimaryActionHero({ outcome }: Props) {
  // The diy-broker outcome doesn't render a hero — the existing top-match
  // card does that job already. Returning null keeps the component a no-op
  // for the default flow.
  if (outcome.kind === "diy-broker") return null;

  const styles = TONE_STYLES[outcome.tone];
  const isAnchor = outcome.ctaHref.startsWith("#");

  return (
    <div className={`rounded-xl border-2 p-4 md:p-6 mb-4 md:mb-6 result-card-in result-card-in-delay-1 ${styles.card}`}>
      {/* Inferred-action badge */}
      <div className="flex items-center gap-2 mb-3">
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[0.6rem] md:text-[0.65rem] font-bold uppercase tracking-wider ${styles.badge}`}>
          <Icon name="target" size={11} />
          {KIND_LABEL[outcome.kind]}
        </span>
      </div>

      {/* Hero title + reason */}
      <div className="flex items-start gap-3 md:gap-4 mb-4 md:mb-5">
        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center shrink-0 ${styles.iconBg}`}>
          <Icon name={outcome.icon} size={20} className={styles.iconColor} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg md:text-2xl font-extrabold text-slate-900 leading-tight mb-1.5">
            {outcome.headline}
          </h2>
          <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
            {outcome.reason}
          </p>
        </div>
      </div>

      {/* Primary CTA */}
      <div className="mb-3 md:mb-4">
        {isAnchor ? (
          <a
            href={outcome.ctaHref}
            onClick={() => trackEvent("quiz_outcome_primary_cta", { kind: outcome.kind, href: outcome.ctaHref }, "/quiz")}
            className={`inline-flex items-center justify-center w-full sm:w-auto px-5 py-3 md:px-6 md:py-3.5 text-white text-sm md:text-base font-bold rounded-lg transition-colors shadow-sm hover:shadow ${styles.cta}`}
          >
            {outcome.ctaLabel}
          </a>
        ) : (
          <Link
            href={outcome.ctaHref}
            onClick={() => trackEvent("quiz_outcome_primary_cta", { kind: outcome.kind, href: outcome.ctaHref }, "/quiz")}
            className={`inline-flex items-center justify-center w-full sm:w-auto px-5 py-3 md:px-6 md:py-3.5 text-white text-sm md:text-base font-bold rounded-lg transition-colors shadow-sm hover:shadow ${styles.cta}`}
          >
            {outcome.ctaLabel}
          </Link>
        )}
      </div>

      {/* Secondary actions */}
      {outcome.secondaryActions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 md:gap-2 pt-3 border-t border-slate-200/60">
          <span className="text-[0.62rem] md:text-xs text-slate-500 font-medium self-center mr-1">
            Or:
          </span>
          {outcome.secondaryActions.map((action) => {
            const isAnchor = action.href.startsWith("#");
            const className = `text-[0.65rem] md:text-xs font-semibold text-slate-600 px-2.5 py-1.5 rounded-md transition-colors ${styles.secondaryHover}`;
            const onClick = () => trackEvent("quiz_outcome_secondary_cta", { kind: outcome.kind, label: action.label, href: action.href }, "/quiz");
            return isAnchor ? (
              <a key={action.href} href={action.href} onClick={onClick} className={className}>
                {action.label}
              </a>
            ) : (
              <Link key={action.href} href={action.href} onClick={onClick} className={className}>
                {action.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
