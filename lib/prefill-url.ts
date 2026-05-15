/**
 * URL builders for pre-filled advisor matching and quiz flows.
 *
 * Centralises the URL construction logic so every CTA — hub pages, calculators,
 * onboarding results, email links — produces consistent, canonical URLs with
 * the same param names that /find-advisor and /quiz read.
 *
 * LX-04 — UX conversion stream (REMEDIATION_QUEUE.md).
 */

export interface AdvisorPrefillOptions {
  /** Advisor need key — maps to /find-advisor's NEED_TO_INTENT. */
  need: string;
  /** Pre-select Australian state (e.g. "VIC", "NSW"). */
  state?: string;
  /** Pre-fill postcode (triggers suburb/state auto-resolve in Step 3). */
  postcode?: string;
  /**
   * Pre-fill budget range displayed in Step 3.
   * Use the same values the find-advisor BUDGET_OPTIONS map accepts
   * (e.g. "under_200k", "200k_500k", "500k_1m", "over_1m").
   */
  budget?: string;
  /** Pre-fill the user's first name in Step 4. */
  firstName?: string;
}

/**
 * Build a pre-filled /find-advisor URL.
 *
 * The find-advisor wizard reads these params on mount and populates the
 * initial quiz state — users skip the intent screen and arrive at Step 2
 * (context) with state/budget/name already seeded for later steps.
 */
export function buildAdvisorUrl(options: AdvisorPrefillOptions): string {
  const params = new URLSearchParams({ need: options.need });
  if (options.state) params.set("state", options.state);
  if (options.postcode) params.set("postcode", options.postcode);
  if (options.budget) params.set("budget", options.budget);
  if (options.firstName) params.set("first_name", options.firstName);
  return `/find-advisor?${params.toString()}`;
}

export interface QuizPrefillOptions {
  /** Vertical slug (e.g. "smsf", "etfs", "crypto"). */
  vertical: string;
  /** Pre-select Australian state. */
  state?: string;
}

/**
 * Build a pre-filled /quiz URL.
 *
 * The quiz reads the `vertical` param to set the initial scoring weights
 * (smsf_weight, crypto_weight, etc.) so the first result screen is already
 * tuned to the user's context.
 */
export function buildQuizUrl(options: QuizPrefillOptions): string {
  const params = new URLSearchParams({ vertical: options.vertical });
  if (options.state) params.set("state", options.state);
  return `/quiz?${params.toString()}`;
}
