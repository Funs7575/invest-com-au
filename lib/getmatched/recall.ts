/**
 * Mid-quiz drop-off recovery — sessionStorage-backed partial-plan cache.
 *
 * Persists the answers the user has given so far + the current step
 * number. When the user navigates away and comes back to / or
 * /get-matched, the homepage hero and the /get-matched mount can both
 * surface a "Continue your action plan — you're 4/7 questions in →"
 * banner that resumes them.
 *
 * Storage shape:
 *   {
 *     answers: { intent: "property", property_sub: "physical", ... },
 *     stepIndex: 3,
 *     totalSteps: 7,
 *     updatedAt: 1747200000000,
 *   }
 *
 * Stored under `iv_gm_partial_plan` (separate from the session-id key
 * `iv_gm_session` so we can wipe one without the other).
 *
 * TTL: 7 days. Anything older is treated as stale and cleared on read.
 */

import type { ActionPlanAnswers } from "./types";

const STORAGE_KEY = "iv_gm_partial_plan";
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface PartialPlan {
  answers: ActionPlanAnswers;
  stepIndex: number;
  totalSteps: number;
  updatedAt: number;
}

/** Read the persisted partial plan, or null when missing / stale /
 *  corrupted. Side-effect: clears stale entries. */
export function getPartialPlan(): PartialPlan | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PartialPlan;
    if (
      !parsed ||
      typeof parsed.stepIndex !== "number" ||
      typeof parsed.totalSteps !== "number" ||
      typeof parsed.updatedAt !== "number"
    ) {
      clearPartialPlan();
      return null;
    }
    if (Date.now() - parsed.updatedAt > TTL_MS) {
      clearPartialPlan();
      return null;
    }
    // Don't surface a "partial" plan if the user actually finished it.
    if (parsed.stepIndex >= parsed.totalSteps) return null;
    return parsed;
  } catch {
    clearPartialPlan();
    return null;
  }
}

/** Persist the partial plan. Called on every successful answer. */
export function setPartialPlan(input: Omit<PartialPlan, "updatedAt">): void {
  if (typeof window === "undefined") return;
  try {
    const payload: PartialPlan = { ...input, updatedAt: Date.now() };
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Quota or disabled storage — ignore.
  }
}

/** Wipe — called when the user completes the plan, restarts, or
 *  explicitly chooses "Start over" on the resume banner. */
export function clearPartialPlan(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** Helper for the banner — pretty progress label. */
export function describePartial(p: PartialPlan): string {
  return `${p.stepIndex} of ${p.totalSteps} questions answered`;
}
