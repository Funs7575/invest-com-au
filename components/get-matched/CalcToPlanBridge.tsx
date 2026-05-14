"use client";

import Link from "next/link";
import Icon from "@/components/Icon";
import type { IntentSlug } from "@/lib/getmatched/types";

/**
 * Calculator → action-plan bridge. Drop into the bottom of every
 * calculator result section to give users a personalised next step
 * after they've crunched their numbers.
 *
 * Pre-fills the matching retail goal slug and (optionally) a budget
 * band so the quiz can skip those questions and resume directly at
 * step 3+. The /get-matched flow handles missing fields gracefully —
 * the quiz just shows whatever's left to answer.
 *
 * ROI: every calculator today is a dead-end — user crunches numbers
 * and bounces. Adding this bridge re-routes that traffic into the main
 * conversion funnel.
 */

interface Props {
  /** Retail goal slug to pre-fill (matches IntentSlug union). */
  goal: IntentSlug;
  /** Optional headline override — defaults are tuned per goal. */
  headline?: string;
  /** Optional subtitle override. */
  subtitle?: string;
  /** Optional budget band to pre-fill (matches the budget question). */
  budget?: "under_10k" | "10k_100k" | "100k_500k" | "500k_1m" | "1m_plus";
  /** Optional timeline pre-fill. */
  timeline?: "now" | "1_3_months" | "3_6_months" | "6_12_months" | "researching";
  /** Optional CTA label override. */
  cta?: string;
}

const GOAL_HEADLINES: Partial<Record<IntentSlug, string>> = {
  grow:      "Want a personalised action plan?",
  income:    "Want a personalised action plan?",
  crypto:    "Want help picking a crypto platform?",
  trade:     "Want help picking a trading platform?",
  automate:  "Want help picking a robo-advisor?",
  super:     "Want a personalised super action plan?",
  property:  "Ready to act on these numbers?",
  home:      "Want help finding the right loan?",
  alt_assets: "Want help finding the right deal?",
  pre_ipo:   "Want help finding the right deal?",
  help:      "Want a personalised action plan?",
  buy_property: "Ready to act on these numbers?",
  tax_help:  "Want help with your tax position?",
  mortgage_help: "Want help finding the right loan?",
  smsf_property: "Want a personalised SMSF action plan?",
  foreign_investor: "Want a personalised foreign-investor action plan?",
};

const DEFAULT_SUBTITLE =
  "Answer 5-7 quick questions and we'll match you to platforms, opportunities, or verified Australian pros — whichever fits.";

export default function CalcToPlanBridge({
  goal,
  headline,
  subtitle,
  budget,
  timeline,
  cta,
}: Props) {
  const params = new URLSearchParams({ goal });
  if (budget) params.set("budget", budget);
  if (timeline) params.set("timeline", timeline);
  params.set("from_calc", "1");

  const finalHeadline = headline ?? GOAL_HEADLINES[goal] ?? "Want a personalised action plan?";
  const finalSubtitle = subtitle ?? DEFAULT_SUBTITLE;
  const finalCta = cta ?? "Build my action plan";

  return (
    <section className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-6 sm:p-8 my-8">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
        <div className="flex-1 min-w-0">
          <p className="text-amber-400 text-[10px] font-bold uppercase tracking-widest mb-1.5">
            Your next step
          </p>
          <h3 className="text-xl sm:text-2xl font-extrabold mb-1.5">
            {finalHeadline}
          </h3>
          <p className="text-sm text-slate-300 leading-relaxed">
            {finalSubtitle}
          </p>
        </div>
        <Link
          href={`/get-matched?${params.toString()}`}
          className="inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-sm sm:text-base px-5 py-3 rounded-xl whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
        >
          {finalCta}
          <Icon name="arrow-right" size={14} />
        </Link>
      </div>
      <p className="text-[10px] text-slate-400 mt-4">
        Takes ~60 seconds · No account needed · General information only.
      </p>
    </section>
  );
}
