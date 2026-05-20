/**
 * First Home Buyer → mortgage-broker directory handoff (W3.19 lever).
 *
 * Deep-links the First Home Buyer hub into the mortgage-broker directory
 * pre-filtered to FHB specialists, so the hub's "Find a Mortgage Broker"
 * CTA lands users on a curated shortlist instead of the unfiltered list.
 */

/**
 * Canonical specialty label. MUST match the value stored in
 * `professionals.specialties` and listed under `mortgage_broker` in
 * `lib/advisor-specialties.ts` — the directory filters with an exact
 * `specialties.includes(...)` check, so any drift silently empties the list.
 * A test asserts this stays in sync.
 */
export const FHB_MORTGAGE_BROKER_SPECIALTY = "First Home Buyers";

/** Pre-filtered mortgage-broker directory URL for First Home Buyer specialists. */
export function firstHomeBuyerBrokerDirectoryUrl(): string {
  const params = new URLSearchParams({ specialty: FHB_MORTGAGE_BROKER_SPECIALTY });
  return `/advisors/mortgage-brokers?${params.toString()}`;
}
