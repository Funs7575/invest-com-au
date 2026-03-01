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

/**
 * Boost a featured_partner broker within a pre-filtered, pre-sorted list.
 * Moves the broker to `targetPosition` (0-indexed) IF they already
 * passed the category filter (i.e. they are in the list) and are below target.
 * Returns a new array — does not mutate input.
 */
export function boostFeaturedPartner(
  brokers: Broker[],
  targetPosition: number = 0
): Broker[] {
  const result = [...brokers];
  const sponsoredIdx = result.findIndex(
    (b) => b.sponsorship_tier === "featured_partner"
  );
  if (sponsoredIdx === -1 || sponsoredIdx <= targetPosition) return result;
  const [sponsored] = result.splice(sponsoredIdx, 1);
  result.splice(targetPosition, 0, sponsored);
  return result;
}

/**
 * Subtle quiz boost: if a featured_partner scored in positions
 * minRank through maxRank (0-indexed), swap it up by 1 position.
 * Only boosts by 1 slot to maintain trust.
 */
export function applyQuizSponsorBoost<
  T extends { broker: Broker | null }
>(items: T[], minRank: number = 1, maxRank: number = 5): T[] {
  const result = [...items];
  const idx = result.findIndex(
    (r, i) =>
      i >= minRank &&
      i <= maxRank &&
      r.broker?.sponsorship_tier === "featured_partner"
  );
  if (idx === -1 || idx < 1) return result;
  [result[idx - 1], result[idx]] = [result[idx], result[idx - 1]];
  return result;
}

/** Monthly pricing per sponsorship tier (AUD) */
export const TIER_PRICING: Record<string, { monthly: number; label: string }> = {
  featured_partner: { monthly: 1500, label: "Featured Partner" },
  editors_pick: { monthly: 800, label: "Editor\u2019s Pick" },
  deal_of_month: { monthly: 2000, label: "Deal of the Month" },
};

/**
 * Campaign-aware placement winners.
 * Returns { slug, campaignId }[] for a placement, or empty array if no
 * active campaigns — callers should fall back to sponsorship_tier sorting.
 *
 * This is a client-callable helper that fetches from the allocation API.
 */
export interface PlacementWinner {
  broker_slug: string;
  campaign_id: number;
  inventory_type: "featured" | "cpc";
  rate_cents: number;
}

export async function getPlacementWinners(
  placementSlug: string,
  brokerSlugs?: string[]
): Promise<PlacementWinner[]> {
  try {
    const params = new URLSearchParams({ placement: placementSlug });
    if (brokerSlugs && brokerSlugs.length > 0) {
      params.set("brokers", brokerSlugs.join(","));
    }

    const res = await fetch(`/api/marketplace/allocation?${params.toString()}`);
    if (!res.ok) return [];

    const data = await res.json();
    return (data.winners || []).map((w: PlacementWinner) => ({
      broker_slug: w.broker_slug,
      campaign_id: w.campaign_id,
      inventory_type: w.inventory_type,
      rate_cents: w.rate_cents,
    }));
  } catch {
    return [];
  }
}
