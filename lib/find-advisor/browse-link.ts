/**
 * Quiz-intent → /advisors filter-URL helpers for the /find-advisor
 * confirmation step.
 *
 * Extracted from the page component so the mapping is unit-testable
 * without rendering the 1612-line quiz client component.
 */

export type Intent =
  | "buy_property"
  | "grow_wealth"
  | "protect_assets"
  | "business_tax";

/**
 * Map a quiz Intent to the professional types most relevant on
 * /advisors. Returns a comma-separated string the /advisors `?type=`
 * filter splits on. Over-suggests within an intent — someone
 * "buying property" benefits from seeing mortgage broker + buyers
 * agent + property advisor side-by-side when comparing.
 */
export function intentToAdvisorTypes(intent: Intent): string {
  switch (intent) {
    case "buy_property":
      return "mortgage_broker,buyers_agent,property_advisor";
    case "grow_wealth":
      return "financial_planner,wealth_manager";
    case "protect_assets":
      return "insurance_broker,estate_planner";
    case "business_tax":
      return "tax_agent,smsf_accountant";
  }
}

/**
 * Build the deep-link href for "Browse All Advisors" on the
 * /find-advisor confirmation step. Falls through to bare /advisors
 * if neither intent nor state is set (defensive — should not happen
 * once the user has reached the confirmation step).
 */
export function browseAdvisorsHref(
  intent: Intent | null,
  state: string,
): string {
  const params = new URLSearchParams();
  if (intent) params.set("type", intentToAdvisorTypes(intent));
  if (state) params.set("state", state);
  const qs = params.toString();
  return qs ? `/advisors?${qs}` : "/advisors";
}
