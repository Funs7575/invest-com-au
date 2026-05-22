/**
 * First Home Buyer → buyers-agent directory handoff (W3.19 lever).
 *
 * Deep-links the First Home Buyer hub into the buyers-agent directory
 * pre-filtered to FHB specialists, so the hub's "Find a Buyer's Agent" CTA
 * lands users on a curated shortlist of agents who handle first-home
 * purchases instead of the unfiltered list. This is the buy-side counterpart
 * to the mortgage-broker handoff: the broker arranges the loan, the buyer's
 * agent finds and negotiates the property.
 */

/**
 * Canonical specialty label. MUST match the value stored in
 * `professionals.specialties` and listed under `buyers_agent` in
 * `lib/advisor-specialties.ts` — the directory filters with an exact
 * `specialties.includes(...)` check, so any drift silently empties the list.
 * A test asserts this stays in sync.
 */
export const FHB_BUYERS_AGENT_SPECIALTY = "First Home Buyers";

/** Pre-filtered buyers-agent directory URL for First Home Buyer specialists. */
export function firstHomeBuyerBuyersAgentUrl(): string {
  const params = new URLSearchParams({ specialty: FHB_BUYERS_AGENT_SPECIALTY });
  return `/advisors/buyers-agents?${params.toString()}`;
}
