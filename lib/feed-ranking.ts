/**
 * Feed ranking — pure functions for the unified social feed (PR 9.1).
 *
 * No DB calls; fully unit-testable.
 *
 * Ranking formula (composite score, higher = better position):
 *   score = score_base * 0.4 + recency * 0.5 + followBoost
 *
 * Where:
 *   recency     = max(0, 100 – ageHours * 2)   (0 at 50h, 100 at 0h)
 *   followBoost = 30 if the user follows this advisor, else 0
 */

export type FeedTab = "for_you" | "markets" | "community" | "advisors";

export const FEED_TAB_LABELS: Record<FeedTab, string> = {
  for_you: "For You",
  markets: "Markets",
  community: "Community",
  advisors: "Advisors",
};

export type FeedEventType =
  | "rate_change"
  | "advisor_post"
  | "community_thread"
  | "article"
  | "deal";

export interface FeedEvent {
  id: string;
  event_type: FeedEventType;
  ref_id: string;
  headline: string;
  summary: string | null;
  actor_name: string | null;
  actor_slug: string | null;
  entity_slug: string | null;
  image_url: string | null;
  score_base: number;
  published_at: string;
}

const TAB_TYPES: Record<FeedTab, FeedEventType[] | null> = {
  for_you: null,
  markets: ["rate_change", "deal"],
  community: ["community_thread", "article"],
  advisors: ["advisor_post"],
};

/** Returns the DB-side event_type filter for a tab, or null for "all". */
export function getTabEventTypes(tab: FeedTab): FeedEventType[] | null {
  return TAB_TYPES[tab];
}

/**
 * Ranks a batch of events by composite score.
 * Safe to call with an empty set of followedAdvisorRefIds (no personalization).
 */
export function rankFeedEvents(
  events: FeedEvent[],
  followedAdvisorRefIds: ReadonlySet<string> = new Set(),
): FeedEvent[] {
  if (events.length === 0) return [];
  const now = Date.now();
  return [...events]
    .map((e) => {
      const ageHours =
        (now - new Date(e.published_at).getTime()) / 3_600_000;
      const recency = Math.max(0, 100 - ageHours * 2);
      const followBoost =
        e.event_type === "advisor_post" &&
        followedAdvisorRefIds.has(e.ref_id)
          ? 30
          : 0;
      const rank = e.score_base * 0.4 + recency * 0.5 + followBoost;
      return { e, rank };
    })
    .sort((a, b) => b.rank - a.rank)
    .map(({ e }) => e);
}

/** Returns the canonical link for a feed event. */
export function feedEventHref(event: FeedEvent): string {
  const slug = event.entity_slug ?? event.actor_slug;
  switch (event.event_type) {
    case "rate_change":
    case "deal":
      return slug ? `/broker/${slug}` : "/compare/savings-accounts";
    case "advisor_post":
      return slug ? `/advisor/${slug}` : "/advisors";
    case "community_thread":
      return slug ? `/community/${slug}` : "/community";
    case "article":
      return slug ? `/article/${slug}` : "/articles";
  }
}
