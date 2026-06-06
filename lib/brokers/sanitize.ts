/**
 * Edge-safe broker sanitiser — single source of truth for the internal
 * commercial / affiliate-economics columns that must never reach the browser.
 *
 * Extracted from lib/request-cache.ts (which imports the server Supabase
 * client and so can't be pulled into Edge routes like /api/quiz/data). This
 * module has zero runtime imports, so both Edge and Node routes can use it.
 *
 * These are paid-placement and revenue figures (CPA, sponsorship fees, EPC,
 * affiliate ranking weight, commission terms) — useful only for server-side
 * ranking/sponsorship logic, which reads them via its own dedicated queries.
 * Any client-facing broker payload must be passed through
 * stripInternalBrokerFields() first.
 */

import type { Broker } from "@/lib/types";

export const INTERNAL_BROKER_COMMERCIAL_FIELDS = [
  "cpa_value",
  "affiliate_priority",
  "monthly_sponsorship_fee",
  "commission_type",
  "commission_value",
  "estimated_epc",
  "promoted_placement",
] as const satisfies readonly (keyof Broker)[];

/**
 * Removes internal commercial/affiliate-economics fields from a broker row so
 * it is safe to serialise to the client. Returns a shallow copy; the input is
 * not mutated.
 */
export function stripInternalBrokerFields(broker: Broker): Broker {
  const cleaned = { ...broker };
  for (const field of INTERNAL_BROKER_COMMERCIAL_FIELDS) {
    delete cleaned[field];
  }
  return cleaned;
}
