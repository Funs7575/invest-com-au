/**
 * Homepage personalisation decision helper.
 *
 * Pure function: given resolved auth + quiz signals, classify the visitor
 * into one of three buckets so the homepage can choose what to render
 * above the fold.
 *
 * Three states:
 *   "signed-in"  — Supabase user session is present (may or may not have a
 *                  quiz profile; investor_profiles row is optional).
 *   "returning"  — No active auth session, but the visitor has a completed
 *                  quiz session cookie (iv_quiz_session + completedAt set)
 *                  or a recognised intent-country cookie, so we have a
 *                  personalisation signal without requiring login.
 *   "anonymous"  — First-time or cookieless visitor. No signal available.
 *                  Render the default static homepage without the strip.
 *
 * AFSL compliance: this function controls WHICH strip renders, not WHAT it
 * says. The strip itself only surfaces factual "next step" links. Copy that
 * implies a personal recommendation must include GENERAL_ADVICE_WARNING
 * (see lib/compliance.ts). No personalised advice copy lives here.
 *
 * Designed to be called once per homepage render, then passed as props into
 * server sub-components. React cache() deduplication is applied at the
 * call-site in the page component (shared with SmartRecommendationsStrip).
 */

export type VisitorKind = "signed-in" | "returning" | "anonymous";

export interface PersonalisationSignals {
  /** Whether a Supabase auth session exists for the current request. */
  isSignedIn: boolean;
  /**
   * Whether the visitor completed the quiz at some point in the past
   * (the iv_quiz_session cookie resolves to a row with completedAt set).
   */
  quizCompleted: boolean;
  /**
   * Whether the visitor has any intent-country signal (from the quiz or the
   * iv_intent_country cookie). Used as a fallback "returning" signal when the
   * quiz is incomplete.
   */
  hasIntentCountry: boolean;
  /**
   * Display name from the investor_profiles row (signed-in path only).
   * Null when absent or when the row doesn't exist yet.
   */
  displayName: string | null;
}

/**
 * Classify the visitor into a bucket for homepage personalisation.
 *
 * Bucket resolution order:
 *   1. isSignedIn → "signed-in" (always, even without a quiz profile)
 *   2. quizCompleted || hasIntentCountry → "returning"
 *   3. else → "anonymous"
 */
export function classifyVisitor(signals: PersonalisationSignals): VisitorKind {
  if (signals.isSignedIn) return "signed-in";
  if (signals.quizCompleted || signals.hasIntentCountry) return "returning";
  return "anonymous";
}

/**
 * Build a short welcome greeting for the personalised strip header.
 * Factual and friendly — does NOT imply a recommendation or financial advice.
 * Returns null for anonymous visitors (no strip is rendered in that case).
 */
export function buildWelcomeGreeting(
  kind: VisitorKind,
  displayName: string | null,
): string | null {
  if (kind === "anonymous") return null;
  if (kind === "signed-in") {
    const first = displayName?.trim().split(/\s+/)[0] || null;
    return first ? `Welcome back, ${first}` : "Welcome back";
  }
  // "returning" — quiz-signal visitor without a session
  return "Welcome back";
}
