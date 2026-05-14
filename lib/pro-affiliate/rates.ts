/**
 * Pro affiliate program — credit-reward rates.
 *
 * Each awardable event yields a fixed number of credits to the
 * attributed pro / team. Constants for now; the admin tooling will
 * make these tunable per-event when the program graduates from MVP.
 */

import type { AffiliateSourceEvent } from "./types";

/**
 * Credit awards per attributed event.
 *
 *   signup          1 credit — low-cost top-of-funnel reward.
 *   brief_created   3 credits — mid-funnel; their lead actually posted.
 *   brief_accepted 10 credits — bottom-of-funnel; a real billable event.
 *
 * These ratios were calibrated against the existing `brief_credit_prices`
 * table (general accept cost = 2 credits, foreign_investor = 30) so a
 * brief_accepted reward pays for ~5 cheap accepts but only ~1/3 of a
 * foreign-investor accept — generous on funnel-tops, conservative on
 * the most-expensive bottom-funnel events.
 */
export const AFFILIATE_CREDIT_RATES: Record<AffiliateSourceEvent, number> = {
  signup: 1,
  brief_created: 3,
  brief_accepted: 10,
};

export function getCreditAwardForEvent(event: AffiliateSourceEvent): number {
  return AFFILIATE_CREDIT_RATES[event];
}
