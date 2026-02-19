import type { Broker } from "./types";

/**
 * Sort priority for sponsorship tiers.
 * Lower number = higher priority (sorted first).
 * Null/undefined tier = lowest priority (sorted by rating after sponsored).
 */
const TIER_SORT_ORDER: Record<string, number> = {
  featured_partner: 1,
  editors_pick: 2,
  deal_of_month: 3,
};

export function getSponsorSortPriority(tier: string | null | undefined): number {
  if (!tier) return 99;
  return TIER_SORT_ORDER[tier] ?? 99;
}

/**
 * Sort brokers with sponsored tiers first, then by rating.
 * Sponsored brokers are sorted by tier priority (featured > editors > deal),
 * then by rating within the same tier.
 */
export function sortWithSponsorship(brokers: Broker[]): Broker[] {
  return [...brokers].sort((a, b) => {
    const aPriority = getSponsorSortPriority(a.sponsorship_tier);
    const bPriority = getSponsorSortPriority(b.sponsorship_tier);
    if (aPriority !== bPriority) return aPriority - bPriority;
    return (b.rating ?? 0) - (a.rating ?? 0);
  });
}

/** Check if a broker has any active sponsorship */
export function isSponsored(broker: Broker): boolean {
  return !!broker.sponsorship_tier;
}
