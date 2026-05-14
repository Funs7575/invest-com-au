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
import { logger } from "@/lib/logger";

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
