/**
 * lib/getmatched/sharpen.ts
 *
 * Get Matched Showcase G7 (docs/plans/GET_MATCHED_SHOWCASE.md): the "sharpen
 * my match" confidence loop. When the match score is below threshold, we offer
 * the user up to 2 UNANSWERED high-information questions. Answering them
 * re-resolves the plan inline — demonstrating that the engine knows what it
 * still doesn't know.
 *
 * Pure — no I/O, deterministic. Draws question definitions straight from
 * FALLBACK_QUESTIONS so the chip options stay in lockstep with the live quiz.
 */

import { FALLBACK_QUESTIONS } from "./fallbacks";
import type { ActionPlanAnswers, QuestionDef } from "./types";

/**
 * High-information slugs, in priority order. These three carry the most
 * weight for the resolver (budget band, advisor-matching state, urgency) and
 * are commonly skipped on the fast track. Keyed by each question's canonical
 * answer key (`maps_to`) so we test the same field the engine reads.
 */
const SHARPEN_PRIORITY: { questionSlug: string; answerKey: string }[] = [
  { questionSlug: "budget", answerKey: "budget_band" },
  { questionSlug: "location_state", answerKey: "location_state" },
  { questionSlug: "timeline", answerKey: "timeline" },
];

/** True when the answer key has no usable value yet. */
function isUnanswered(answers: ActionPlanAnswers, key: string): boolean {
  const v = answers[key];
  if (v === undefined || v === null) return true;
  if (typeof v === "string") return v.length === 0;
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

/**
 * Pick up to `max` unanswered high-information questions, in priority order.
 * Returns the full `QuestionDef`s (with their option chips) drawn from
 * FALLBACK_QUESTIONS. Returns an empty array when every priority question is
 * already answered — the caller then hides the sharpen card.
 */
export function pickSharpeningQuestions(
  answers: ActionPlanAnswers,
  max = 2,
): QuestionDef[] {
  if (max <= 0) return [];
  const out: QuestionDef[] = [];
  for (const { questionSlug, answerKey } of SHARPEN_PRIORITY) {
    if (out.length >= max) break;
    if (!isUnanswered(answers, answerKey)) continue;
    const def = FALLBACK_QUESTIONS.find((q) => q.slug === questionSlug);
    if (def) out.push(def);
  }
  return out;
}
