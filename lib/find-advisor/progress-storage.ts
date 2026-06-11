/**
 * In-progress quiz persistence for /find-advisor (ADV-008, hardened).
 *
 * Deliberately PII-free by construction: the persisted shape has no
 * name / email / phone / consent fields, so nothing sensitive can land
 * in localStorage even as the quiz state grows. Contact details are
 * only ever asked at the final step and live in React state + the
 * tab-scoped sessionStorage match payload.
 *
 * Restore is capped at step 3 (the last *form* step): the step-4 match
 * preview depends on a live dry-run result that isn't persisted here,
 * so resuming straight into it would render a false "no match" state.
 * A v1 blob (which nested the whole QuizState, contact fields
 * included) fails validation and is discarded — by design, that's the
 * PII purge for legacy visitors.
 */

import type { Intent } from "./browse-link";

const PROGRESS_KEY = "quiz-progress";
const PROGRESS_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_RESUME_STEP = 3;

const INTENTS: readonly Intent[] = ["buy_property", "grow_wealth", "protect_assets", "business_tax"];

export interface QuizProgress {
  step: number;
  intent: Intent | null;
  context: string[];
  state: string;
  postcode: string;
  suburb: string;
  budget: string;
  timeline: string;
  overseas: boolean;
  country: string;
}

interface PersistedProgress extends QuizProgress {
  v: 2;
  savedAt: number;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

function isValidProgress(data: unknown): data is PersistedProgress {
  if (typeof data !== "object" || data === null) return false;
  const d = data as Record<string, unknown>;
  return (
    d.v === 2 &&
    typeof d.savedAt === "number" &&
    typeof d.step === "number" &&
    d.step >= 1 &&
    (d.intent === null || INTENTS.includes(d.intent as Intent)) &&
    isStringArray(d.context) &&
    typeof d.state === "string" &&
    typeof d.postcode === "string" &&
    typeof d.suburb === "string" &&
    typeof d.budget === "string" &&
    typeof d.timeline === "string" &&
    typeof d.overseas === "boolean" &&
    typeof d.country === "string"
  );
}

export function saveQuizProgress(progress: QuizProgress): void {
  try {
    const payload: PersistedProgress = {
      v: 2,
      savedAt: Date.now(),
      step: progress.step,
      intent: progress.intent,
      context: progress.context,
      state: progress.state,
      postcode: progress.postcode,
      suburb: progress.suburb,
      budget: progress.budget,
      timeline: progress.timeline,
      overseas: progress.overseas,
      country: progress.country,
    };
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(payload));
  } catch {
    /* storage unavailable (private mode, quota) — resume just won't offer */
  }
}

export function loadQuizProgress(): QuizProgress | null {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return null;
    const data: unknown = JSON.parse(raw);
    if (!isValidProgress(data) || Date.now() - data.savedAt > PROGRESS_TTL_MS) {
      localStorage.removeItem(PROGRESS_KEY);
      return null;
    }
    return {
      step: Math.min(data.step, MAX_RESUME_STEP),
      intent: data.intent,
      context: data.context,
      state: data.state,
      postcode: data.postcode,
      suburb: data.suburb,
      budget: data.budget,
      timeline: data.timeline,
      overseas: data.overseas,
      country: data.country,
    };
  } catch {
    try {
      localStorage.removeItem(PROGRESS_KEY);
    } catch {
      /* ignore */
    }
    return null;
  }
}

export function clearQuizProgress(): void {
  try {
    localStorage.removeItem(PROGRESS_KEY);
  } catch {
    /* ignore */
  }
}
