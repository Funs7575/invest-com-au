/**
 * URL builders for pre-filled advisor matching and quiz flows.
 *
 * Centralises the URL construction logic so every CTA — hub pages, calculators,
 * onboarding results, email links — produces consistent, canonical URLs with
 * the same param names that /find-advisor and /get-matched read.
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
  /**
   * Pre-select context checkboxes in Step 2 (comma-separated in URL).
   * Values must match the option IDs in CONTEXT_CONFIG for the resolved intent.
   * CM-01: life-event matching passes pre-selected context so Step 2 is pre-populated.
   */
  context?: string[];
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
  if (options.context && options.context.length > 0) params.set("context", options.context.join(","));
  return `/find-advisor?${params.toString()}`;
}

export interface QuizPrefillOptions {
  /** Vertical slug (e.g. "smsf", "etfs", "crypto"). */
  vertical: string;
  /** Pre-select Australian state. */
  state?: string;
}

/**
 * Build a pre-filled /get-matched URL.
 *
 * The canonical funnel reads the `vertical` param to bias the first result
 * screen toward the user's context. (`/quiz` is a permanent 308 alias of
 * `/get-matched`, so the URL is emitted against the live route directly.)
 */
export function buildQuizUrl(options: QuizPrefillOptions): string {
  const params = new URLSearchParams({ vertical: options.vertical });
  if (options.state) params.set("state", options.state);
  return `/get-matched?${params.toString()}`;
}

export interface CrossBorderMatchOptions {
  /**
   * Audience hint: "international" for non-residents, "expat" for
   * Australians living abroad. Kept in the signature so call sites stay
   * declarative about who the surface addresses.
   */
  track?: "international" | "expat";
  /**
   * Intent-country slug (e.g. "united-kingdom", "hong-kong") — the
   * folder name under app/foreign-investment/. Emitted as `?country=` so
   * the /find-advisor → /get-matched redirect carve-out keeps the
   * dedicated cross-border flow alive (next.config.ts `missing` rule).
   */
  countrySlug?: string;
  /**
   * International investment goal ("property" | "shares" | "savings" |
   * "business"). "property" maps to the FIRB specialty pre-filter;
   * anything else is ignored by the matcher, so callers can pass through.
   */
  intent?: string;
}

/**
 * Build the cross-border advisor-match URL for a non-resident / expat
 * visitor.
 *
 * Targets `/find-advisor` — per next.config.ts, cross-border deep-links
 * (`?specialty=` / `?country=`) keep the dedicated find-advisor flow (the
 * 1.75× premium line) until /get-matched consumes those params. The old
 * /quiz entry is a permanent redirect to /get-matched with no
 * international handling on the other side, so quiz-targeted links would
 * silently drop the visitor onto the domestic funnel.
 *
 * Specialty mapping (values from CROSS_BORDER_SPECIALTIES in
 * lib/advisor-specialties.ts; /find-advisor validates with
 * isCrossBorderSpecialty, so an out-of-sync value degrades to "no
 * pre-filter", never an error):
 *   - intent "property"            → "FIRB Property (Non-Resident)"
 *   - country united-kingdom / uk  → "UK Pension Transfer"
 *   - country united-states / us   → "FATCA-Aware US Expat Planning"
 * With no mappable specialty and no country, the bare /find-advisor URL
 * redirects to /get-matched — the generic funnel — the honest fallback
 * for an unscoped visitor.
 */
export function buildCrossBorderMatchUrl(options: CrossBorderMatchOptions = {}): string {
  const params = new URLSearchParams();

  const slug = options.countrySlug ?? "";
  const specialty =
    options.intent === "property"
      ? "FIRB Property (Non-Resident)"
      : slug === "united-kingdom" || slug === "uk"
        ? "UK Pension Transfer"
        : slug === "united-states" || slug === "us"
          ? "FATCA-Aware US Expat Planning"
          : null;

  if (specialty) params.set("specialty", specialty);
  if (options.countrySlug) params.set("country", options.countrySlug);
  const qs = params.toString();
  return qs ? `/find-advisor?${qs}` : "/find-advisor";
}
