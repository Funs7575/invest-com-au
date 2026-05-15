/**
 * Adaptive question walker.
 *
 * Questions live in `get_matched_questions` with a `shown_if` jsonb predicate.
 * The walker picks the next question by:
 *   1. Filtering by mode (fast/guided/both).
 *   2. Sorting by `(step, sort_order)`.
 *   3. Skipping questions that have already been answered.
 *   4. Skipping questions whose `shown_if` does not match the current answer
 *      set.
 *
 * The predicate language is intentionally small: each key in `shown_if`
 * maps to a value or array of values that the matching `maps_to` field
 * must equal. Missing keys = "no restriction".
 *
 * Example:
 *   shown_if = {"intent": ["smsf_property"]}
 *   → only show when `answers.intent === 'smsf_property'`.
 */

// eslint-disable-next-line no-restricted-imports -- public read of admin config.
import { createAdminClient } from "@/lib/supabase/admin";
import { isFlagEnabled } from "@/lib/feature-flags";
import { logger } from "@/lib/logger";

import {
  pickNextQuestionAI,
  type AiQuestionContext,
} from "./ai-engine";
import { FALLBACK_QUESTIONS } from "./fallbacks";
import type { ActionPlanAnswers, QuestionDef, QuestionMode } from "./types";

const log = logger("getmatched:questions");

export async function getQuestions(mode: QuestionMode = "both"): Promise<QuestionDef[]> {
  try {
    const admin = createAdminClient();
    let q = admin
      .from("get_matched_questions")
      .select("*")
      .eq("enabled", true);
    if (mode !== "both") q = q.in("mode", [mode, "both"]);
    const { data, error } = await q
      .order("step", { ascending: true })
      .order("sort_order", { ascending: true });
    if (error) throw error;
    if (data && data.length > 0) return data as QuestionDef[];
  } catch (err) {
    log.warn("getQuestions failed (using code-defined fallback)", {
      err: err instanceof Error ? err.message : String(err),
    });
  }
  return filterQuestionsByMode(FALLBACK_QUESTIONS, mode);
}

function filterQuestionsByMode(
  questions: QuestionDef[],
  mode: QuestionMode,
): QuestionDef[] {
  if (mode === "both") return questions;
  return questions.filter((q) => q.mode === mode || q.mode === "both");
}

export interface NextQuestionResult {
  done: false;
  question: QuestionDef;
  totalSteps: number;
  currentStep: number;
}

export interface NextQuestionDone {
  done: true;
  totalSteps: number;
  currentStep: number;
}

/**
 * Pure: given the loaded question set + current answers, return the next
 * question to show OR `done: true` if all eligible questions are answered.
 */
export function nextQuestion(
  questions: QuestionDef[],
  answers: ActionPlanAnswers,
  mode: QuestionMode = "both",
): NextQuestionResult | NextQuestionDone {
  const filtered = questions
    .filter((q) => q.enabled)
    .filter((q) => mode === "both" || q.mode === mode || q.mode === "both")
    .sort((a, b) => a.step - b.step || a.sort_order - b.sort_order);

  const eligible = filtered.filter((q) => shownIfMatches(q, answers));

  for (const q of eligible) {
    const answeredBySlug = answers[q.slug];
    const answeredByMappedKey = answers[q.maps_to];
    const isAnswered =
      (answeredBySlug !== undefined && answeredBySlug !== null) ||
      (answeredByMappedKey !== undefined && answeredByMappedKey !== null);
    if (!isAnswered) {
      const currentStep = eligible.findIndex((x) => x.slug === q.slug) + 1;
      return {
        done: false,
        question: q,
        totalSteps: eligible.length,
        currentStep,
      };
    }
  }

  return { done: true, totalSteps: eligible.length, currentStep: eligible.length };
}

/**
 * Flag-gated AI wrapper around {@link nextQuestion}.
 *
 * Behaviour:
 *   • If the `ai_get_matched_v3` feature flag is OFF for `userKey`
 *     (the default in prod — seed migration MM-14 ships
 *     `enabled=false, rollout_pct=0`), this function delegates
 *     straight to the deterministic rule-based walker. Zero
 *     Anthropic API calls, zero token cost.
 *   • If the flag is ON, we ask Claude to pick the next slug. On
 *     success we look that slug up in the question set and return a
 *     normal `NextQuestionResult` (optionally with the model's
 *     `generated_prompt` overriding the canonical prompt). On
 *     `should_resolve_plan=true`, we return `done: true` so the
 *     caller short-circuits to /api/get-matched/resolve. On
 *     malformed output / timeout / unknown slug, we fall through to
 *     the rule-based walker so the user always sees a working flow.
 *
 * The existing {@link nextQuestion} signature is unchanged — this is
 * a strict wrapper so the rule-based path remains pure and
 * test-covered.
 */
export async function nextQuestionWithAI(
  questions: QuestionDef[],
  answers: ActionPlanAnswers,
  mode: QuestionMode = "both",
  userKey: string | null = null,
): Promise<NextQuestionResult | NextQuestionDone> {
  const ruleBased = (): NextQuestionResult | NextQuestionDone =>
    nextQuestion(questions, answers, mode);

  let enabled = false;
  try {
    enabled = await isFlagEnabled("ai_get_matched_v3", {
      userKey: userKey ?? null,
    });
  } catch (err) {
    log.warn("ai_get_matched_v3 flag read threw — using rule-based", {
      err: err instanceof Error ? err.message : String(err),
    });
    return ruleBased();
  }
  if (!enabled) return ruleBased();

  // Flag is ON — narrow the candidate slugs to UNANSWERED questions
  // in this mode. Cheaper to filter on the server than to spend
  // tokens telling the model which ones are already answered.
  const eligible = questions
    .filter((q) => q.enabled)
    .filter((q) => mode === "both" || q.mode === mode || q.mode === "both")
    .filter((q) => shownIfMatches(q, answers))
    .filter((q) => {
      const bySlug = answers[q.slug];
      const byMapped = answers[q.maps_to];
      const answered =
        (bySlug !== undefined && bySlug !== null) ||
        (byMapped !== undefined && byMapped !== null);
      return !answered;
    })
    .sort((a, b) => a.step - b.step || a.sort_order - b.sort_order);

  if (eligible.length === 0) {
    return { done: true, totalSteps: 0, currentStep: 0 };
  }

  const context: AiQuestionContext[] = eligible.map((q) => ({
    slug: q.slug,
    prompt: q.prompt,
    step: q.step,
    mapsTo: q.maps_to,
  }));

  let ai;
  try {
    ai = await pickNextQuestionAI(answers, mode, context, { userKey });
  } catch (err) {
    log.warn("pickNextQuestionAI threw — using rule-based", {
      err: err instanceof Error ? err.message : String(err),
    });
    return ruleBased();
  }

  // Short-circuit: model says "we have enough info, resolve now".
  if (ai.shouldResolve) {
    return {
      done: true,
      totalSteps: eligible.length,
      currentStep: eligible.length,
    };
  }

  if (!ai.slug) return ruleBased();

  const picked = eligible.find((q) => q.slug === ai.slug);
  if (!picked) return ruleBased();

  const idx = eligible.findIndex((q) => q.slug === picked.slug);
  const surfaced: QuestionDef = ai.generatedPrompt
    ? { ...picked, prompt: ai.generatedPrompt }
    : picked;

  return {
    done: false,
    question: surfaced,
    totalSteps: eligible.length,
    currentStep: idx + 1,
  };
}

export function shownIfMatches(
  question: QuestionDef,
  answers: ActionPlanAnswers,
): boolean {
  const conditions = question.shown_if ?? {};
  for (const [key, value] of Object.entries(conditions)) {
    if (value === undefined) continue;
    const required = Array.isArray(value) ? value : [value];
    const actual = answers[key];
    if (actual === undefined || actual === null) return false;
    if (Array.isArray(actual)) {
      if (!actual.some((a) => required.includes(String(a)))) return false;
    } else if (!required.includes(String(actual))) {
      return false;
    }
  }
  return true;
}
