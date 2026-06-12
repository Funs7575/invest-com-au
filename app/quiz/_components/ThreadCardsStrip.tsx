"use client";

import Link from "next/link";
import Icon from "@/components/Icon";
import { trackEvent } from "@/lib/tracking";

/**
 * Subset of UnifiedAnswers from app/quiz/page.tsx. Originally narrow for
 * thread-card selection; widened to include `experience` and `property_sub`
 * because the results screen now passes the same shape to QuizResultsFooter
 * (compare-URL params) and QuizNextBestActions (cross-sell inference).
 * Thread-card logic still only reads goal/mode/complexity/amount/priority.
 */
export interface ThreadAnswers {
  goal?: string;
  mode?: string;
  complexity?: string;
  amount?: string;
  priority?: string;
  experience?: string;
  property_sub?: string;
}

interface ThreadCard {
  key: string;
  iconName: string;
  heading: string;
  copy: string;
  ctaLabel: string;
  href: string;
}

/**
 * Decide which thread cards to surface for a quiz-taker on the DIY results screen.
 *
 * Rules (kept conservative — 2 to 4 cards max so the strip never feels noisy):
 *  • Sort your super — goal=='super' OR priority=='safety' OR amount in {large, whale}
 *  • Park your cash buffer — mode=='diy' OR amount in {medium, large, whale}
 *  • Get tax help — complexity=='complex' OR goal in {super, crypto, property}
 *  • Talk to an advisor — mode=='unsure' (DIY users still on the fence)
 *
 * "Pick your broker" is intentionally omitted — the leaderboard rendered immediately
 * below this strip already does that job.
 */
export function selectThreadCards(answers: ThreadAnswers): ThreadCard[] {
  const cards: ThreadCard[] = [];

  const isHighAmount = answers.amount === "large" || answers.amount === "whale";
  const isMeaningfulAmount = answers.amount === "medium" || isHighAmount;

  // Sort your super
  if (answers.goal === "super" || answers.priority === "safety" || isHighAmount) {
    cards.push({
      key: "super",
      iconName: "landmark",
      heading: "Sort your super",
      copy: "Compare top-performing super funds — most Aussies leave thousands on the table here.",
      ctaLabel: "Compare super funds",
      href: "/super",
    });
  }

  // Park your cash buffer
  if (answers.mode === "diy" || isMeaningfulAmount) {
    cards.push({
      key: "savings",
      iconName: "piggy-bank",
      heading: "Park your cash buffer",
      copy: "Keep your emergency fund earning interest. High-rate savings accounts compared.",
      ctaLabel: "See savings rates",
      href: "/savings",
    });
  }

  // Get tax help
  if (
    answers.complexity === "complex" ||
    answers.goal === "super" ||
    answers.goal === "crypto" ||
    answers.goal === "property"
  ) {
    const isSmsf = answers.goal === "super";
    cards.push({
      key: "tax",
      iconName: "calculator",
      heading: isSmsf ? "Get SMSF help" : "Get tax help",
      copy: isSmsf
        ? "SMSF setup, compliance and audits need a specialist accountant."
        : "A tax specialist can save more than their fee on crypto, property or complex returns.",
      ctaLabel: "Find an accountant",
      href: isSmsf ? "/advisors/smsf-accountants" : "/advisors/tax-agents",
    });
  }

  // Talk to an advisor — only for DIY users who said they're unsure
  if (answers.mode === "unsure") {
    cards.push({
      key: "advisor",
      iconName: "users",
      heading: "Talk to an advisor",
      copy: "Not sure where to start? A 30-minute chat with a planner can clarify your next move.",
      ctaLabel: "Find an advisor",
      href: "/find-advisor",
    });
  }

  // Cap at 4 — anything more is noise. Order above is intentional (super > savings > tax > advisor).
  return cards.slice(0, 4);
}

interface Props {
  answers: ThreadAnswers;
}

export default function ThreadCardsStrip({ answers }: Props) {
  const cards = selectThreadCards(answers);

  // Render nothing if no cards qualify — avoid empty section.
  if (cards.length === 0) return null;

  return (
    <section
      aria-labelledby="quiz-bundle-heading"
      className="mb-4 md:mb-6 result-card-in result-card-in-delay-2"
    >
      <div className="text-center mb-3 md:mb-4">
        <p className="text-[0.58rem] md:text-[0.62rem] font-bold uppercase tracking-wider text-emerald-600 mb-1">
          Your investing stack
        </p>
        <h2
          id="quiz-bundle-heading"
          className="text-base md:text-xl font-extrabold text-slate-900"
        >
          A great setup is more than just a broker
        </h2>
        <p className="text-[0.69rem] md:text-sm text-slate-500 mt-1">
          Based on your answers, here&apos;s what else is worth a look.
        </p>
      </div>

      <div
        className={`grid gap-2.5 md:gap-3 ${
          cards.length === 1
            ? "grid-cols-1"
            : cards.length === 2
              ? "grid-cols-1 sm:grid-cols-2"
              : "grid-cols-1 sm:grid-cols-2"
        }`}
      >
        {cards.map((card) => (
          <Link
            key={card.key}
            href={card.href}
            onClick={() =>
              trackEvent("quiz_thread_card_click", { thread: card.key }, "/quiz")
            }
            className="group flex items-start gap-3 p-3 md:p-4 bg-white border border-slate-200 rounded-xl hover:border-emerald-300 hover:shadow-sm transition-all active:scale-[0.99]"
          >
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0 group-hover:bg-emerald-100 transition-colors">
              <Icon
                name={card.iconName}
                size={18}
                className="text-emerald-600"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm md:text-base font-bold text-slate-900 mb-0.5">
                {card.heading}
              </h3>
              <p className="text-[0.69rem] md:text-xs text-slate-500 leading-relaxed mb-1.5">
                {card.copy}
              </p>
              <span className="text-[0.65rem] md:text-xs font-semibold text-emerald-700 group-hover:text-emerald-800">
                {card.ctaLabel} <span aria-hidden="true">→</span>
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
