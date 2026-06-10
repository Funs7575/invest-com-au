/**
 * NextActions — server component that resolves personalisation signals,
 * calls the `buildNextActions` engine, and renders a compact strip of
 * "your next step" cards.
 *
 * Mounted on high-traffic surfaces that currently lack SmartRecommendationsStrip:
 *   /compare, /advisors, /learn, article/[slug]
 *
 * Returns null when there are no usable signals (fully anonymous visitor
 * who hasn't taken the quiz or visited a country hub). The existing
 * SmartRecommendationsStrip continues to own broker/advisor entity cards;
 * this component owns the action-level navigation strip.
 *
 * AFSL: factual "next step" framing only. `showAdviceWarning` items
 * render the short PDS_CONSIDERATION disclaimer beneath the card.
 */

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getIntentCountry } from "@/lib/intent-context-server";
import { getQuizProfile } from "@/lib/quiz-profile";
import { getInvestorProfile } from "@/lib/investor-profiles";
import {
  buildNextActions,
  type NextAction,
  type NextActionSignals,
} from "@/lib/next-action";
import { PDS_CONSIDERATION } from "@/lib/compliance";
import { intentCountryMeta } from "@/lib/intent-context";

interface Props {
  surface: NextActionSignals["surface"];
  /**
   * Cap on how many actions to render. Defaults to 3 for strips;
   * callers that want a more complete list can pass a higher value.
   */
  maxItems?: number;
}

export default async function NextActions({ surface, maxItems = 3 }: Props) {
  // Resolve all three signal sources in parallel
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [quiz, intentCountry, investorProfile] = await Promise.all([
    getQuizProfile(),
    getIntentCountry(),
    user ? getInvestorProfile(user.id) : Promise.resolve(null),
  ]);

  // Require at least one signal — don't render for fully anonymous visitors
  // who have no quiz, no country intent, and no signed-in profile.
  if (!quiz && !intentCountry && !investorProfile) return null;

  const signals: NextActionSignals = {
    profile: investorProfile,
    quizVertical: quiz?.vertical ?? null,
    quizCompleted: !!quiz?.completedAt,
    topMatchSlug: quiz?.topMatchSlug ?? null,
    intentCountry:
      investorProfile?.intentCountrySnapshot ??
      quiz?.intentCountry ??
      intentCountry,
    surface,
  };

  const actions = buildNextActions(signals).slice(0, maxItems);
  if (actions.length === 0) return null;

  const countryMeta =
    signals.intentCountry ? intentCountryMeta(signals.intentCountry) : null;

  const headline = buildHeadline(signals, countryMeta);

  return (
    <section
      aria-label="Your next step"
      className="bg-gradient-to-br from-slate-50 via-white to-emerald-50/40 border-y border-slate-200"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 mb-1">
          <span aria-hidden className="mr-1.5">
            {countryMeta?.flag ?? "→"}
          </span>
          Next steps for you
        </p>
        <h2 className="text-base sm:text-lg font-semibold text-slate-900 mb-4">
          {headline}
        </h2>
        <ul className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {actions.map((action) => (
            <ActionCard key={action.id} action={action} />
          ))}
        </ul>
      </div>
    </section>
  );
}

function ActionCard({ action }: { action: NextAction }) {
  return (
    <li>
      <Link
        href={action.href}
        className="group flex flex-col h-full bg-white hover:bg-emerald-50/30 border border-slate-200 hover:border-emerald-300 rounded-xl p-4 transition-colors"
      >
        <p className="text-sm font-semibold text-slate-900 group-hover:text-emerald-900 mb-1">
          {action.title}
        </p>
        <p className="text-xs text-slate-500 leading-relaxed flex-1 mb-3">
          {action.description}
        </p>
        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 group-hover:text-emerald-900">
          {action.cta}
          <span aria-hidden>&rarr;</span>
        </span>
        {action.showAdviceWarning && (
          <p className="mt-2 text-[0.65rem] text-slate-500 leading-relaxed border-t border-slate-100 pt-2">
            {PDS_CONSIDERATION}
          </p>
        )}
      </Link>
    </li>
  );
}

function buildHeadline(
  signals: NextActionSignals,
  countryMeta: ReturnType<typeof intentCountryMeta> | null,
): string {
  if (signals.quizCompleted && countryMeta) {
    return `Suggested next steps — matched to your quiz + ${countryMeta.label}`;
  }
  if (signals.quizCompleted) {
    return "Suggested next steps based on your quiz answers";
  }
  if (countryMeta) {
    return `Suggested next steps for ${countryMeta.label}`;
  }
  if (signals.profile?.primaryVertical) {
    return "Suggested next steps based on your profile";
  }
  return "Suggested next steps";
}
