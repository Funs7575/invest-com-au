"use client";

import { useMemo, useState } from "react";
import Icon from "@/components/Icon";
import type { ActionPlanAnswers } from "@/lib/getmatched/types";
import { pickSharpeningQuestions } from "@/lib/getmatched/sharpen";

/**
 * Get Matched Showcase G7 — "Sharpen my match" confidence loop.
 *
 * When the match score is below threshold, offers up to 2 unanswered
 * high-information questions (budget / location / timeline) as inline chips.
 * Answering one merges the answer into the stored answers, re-resolves the
 * plan, and replaces the result. Once all offered questions are answered the
 * card collapses to a "Match sharpened ✓" note.
 *
 * Compliance: this is a legitimate refinement of the user's OWN inputs, framed
 * as "answer more to sharpen" — never advice. Uses the real plan_id when one
 * exists (not a what-if) so the refinement persists.
 */

interface Props {
  score: number;
  /** The answers backing the currently displayed result. */
  answers: ActionPlanAnswers;
  /** True while a sharpen re-resolve is in flight. */
  busy: boolean;
  /** Inline error from the last failed sharpen, if any. */
  error: string | null;
  /** Answer one question — parent merges + re-resolves. */
  onAnswer: (questionSlug: string, value: string) => void;
}

export default function SharpenCard({
  score,
  answers,
  busy,
  error,
  onAnswer,
}: Props) {
  const questions = useMemo(
    () => pickSharpeningQuestions(answers, 2),
    [answers],
  );
  // High-water mark of how many questions we've offered this session, so the
  // collapse note appears once the user works through them (the offered list
  // shrinks as answers merge in). This is the React-endorsed "adjusting state
  // during render" pattern — it converges immediately (only ever increases).
  const [everOffered, setEverOffered] = useState(0);
  if (questions.length > everOffered) {
    setEverOffered(questions.length);
  }

  // All offered questions answered → collapsed confirmation.
  if (everOffered > 0 && questions.length === 0) {
    return (
      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 mb-6 flex items-center gap-2 text-sm font-semibold text-emerald-800">
        <Icon name="check-circle" size={16} className="text-emerald-600" />
        Match sharpened ✓
      </section>
    );
  }

  if (questions.length === 0) return null;

  const remaining = questions.length;

  return (
    <section
      className="rounded-2xl border border-slate-200 bg-white p-5 mb-6"
      aria-label="Sharpen your match"
    >
      <p className="text-sm font-bold text-slate-900">
        Your match is {score}% — answer {remaining} more to sharpen it.
      </p>
      <p className="text-xs text-slate-500 mt-0.5 mb-4">
        A couple more details lets the engine narrow your match. Based on your
        answers — general information only.
      </p>

      <div className="space-y-4">
        {questions.map((q) => (
          <div key={q.slug}>
            <p className="text-[11px] font-semibold text-slate-700 mb-1.5">
              {q.prompt}
            </p>
            <div className="flex flex-wrap gap-2">
              {q.options
                .filter((opt) => opt.value !== "prefer_not")
                .map((opt) => (
                  <button
                    type="button"
                    key={opt.value}
                    onClick={() => onAnswer(q.slug, opt.value)}
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 min-h-11 hover:border-amber-400 hover:bg-amber-50/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {opt.emoji && (
                      <span aria-hidden="true">{opt.emoji}</span>
                    )}
                    {opt.label}
                  </button>
                ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 mt-3 min-h-6">
        {busy && (
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
            <span className="w-3 h-3 rounded-full border-2 border-slate-300 border-t-amber-500 animate-spin" />
            Sharpening…
          </span>
        )}
        {error && (
          <span role="alert" className="text-xs text-red-700">
            {error}
          </span>
        )}
      </div>
    </section>
  );
}
