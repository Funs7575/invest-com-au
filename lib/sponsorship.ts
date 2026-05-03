import { isFlagEnabled } from "./feature-flags";
import type { Broker } from "./types";

// Launch-ops kill switch: flip `sponsored_boosting` off in
// /admin/automation/flags to disable the boost without taking the
// comparison pages down. The flag is checked async (cached 30s by
// lib/feature-flags); boostFeaturedPartner stays sync by reading a
// module-level "last known" boolean and refreshing in the background.
// Trade-off: a flip takes up to 30s to propagate. Acceptable for the
// launch-ops use case (compliance flag bug, RLS leak on sponsorship_tier).
let sponsoredBoostingEnabled = true;
let sponsoredBoostingLastChecked = 0;
const SPONSORED_BOOSTING_TTL_MS = 30_000;

function refreshSponsoredBoostingFlag(): void {
  const now = Date.now();
  if (now - sponsoredBoostingLastChecked < SPONSORED_BOOSTING_TTL_MS) return;
  sponsoredBoostingLastChecked = now;
  void isFlagEnabled("sponsored_boosting").then((enabled) => {
    sponsoredBoostingEnabled = enabled;
  });
}

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
  refreshSponsoredBoostingFlag();
  if (!sponsoredBoostingEnabled) return [...brokers];
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
 * Decide whether a sponsored broker is *applicable* to the user's stated
 * goal. Without this gate, the prior boost logic could swap a sponsored
 * crypto exchange ahead of a more-relevant super fund or vice-versa, just
 * because both happened to score in the top 5. The boost should reward
 * relevant sponsors, not arbitrary ones.
 *
 * Conservative — defaults to allow when the goal is generic (grow, automate,
 * income — these brokers serve broadly), and only gates on goals with a
 * clear vertical mismatch (crypto, super, property, trade).
 */
function isApplicableToBrokerGoal(broker: Broker, goal: string | undefined): boolean {
  if (!goal) return true;
  switch (goal) {
    case "crypto":
      return broker.is_crypto === true || broker.platform_type === "crypto_exchange";
    case "super":
      return (
        broker.platform_type === "super_fund" ||
        broker.smsf_support === true
      );
    case "property":
    case "property-reit":
      return (
        broker.platform_type === "property_platform" ||
        // REITs trade as ETFs on a regular share broker — accept share brokers
        // when the goal is REIT-specific, but not when it's physical property.
        (goal === "property-reit" && (broker.platform_type === "share_broker" || !broker.platform_type))
      );
    case "property-super":
      return broker.platform_type === "super_fund" || broker.smsf_support === true;
    case "trade":
      return (
        broker.platform_type === "share_broker" ||
        broker.platform_type === "cfd_forex" ||
        !broker.platform_type
      );
    case "automate":
      return broker.platform_type === "robo_advisor" || !broker.platform_type;
    default:
      // grow, income, generic, etc. — every broker type is applicable
      return true;
  }
}

/**
 * Subtle quiz boost: if a featured_partner scored in positions
 * minRank through maxRank (0-indexed), swap it up by 1 position.
 * Only boosts by 1 slot to maintain trust.
 *
 * Vertical-aware: when `goal` is provided (last param to keep this a
 * non-breaking addition), only boost a sponsored broker that's actually
 * applicable to the user's stated goal — don't boost a sponsored share
 * broker over a super fund when the user picked "super". When `goal` is
 * omitted, falls back to the legacy goal-blind behaviour.
 */
export function applyQuizSponsorBoost<
  T extends { broker?: Broker | null }
>(items: T[], minRank: number = 1, maxRank: number = 5, goal?: string): T[] {
  const result = [...items];
  const idx = result.findIndex(
    (r, i) =>
      i >= minRank &&
      i <= maxRank &&
      r.broker?.sponsorship_tier === "featured_partner" &&
      isApplicableToBrokerGoal(r.broker, goal)
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
