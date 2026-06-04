import { describe, it, expect } from "vitest";
import {
  rankFeedEvents,
  getTabEventTypes,
  feedEventHref,
  type FeedEvent,
} from "@/lib/feed-ranking";

function makeEvent(
  overrides: Partial<FeedEvent> & { event_type: FeedEvent["event_type"] },
): FeedEvent {
  return {
    id: "id-1",
    ref_id: "1",
    headline: "Test event",
    summary: null,
    actor_name: null,
    actor_slug: null,
    entity_slug: null,
    image_url: null,
    score_base: 50,
    published_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("getTabEventTypes", () => {
  it("returns null for for_you (all types)", () => {
    expect(getTabEventTypes("for_you")).toBeNull();
  });

  it("returns rate_change and deal for markets tab", () => {
    expect(getTabEventTypes("markets")).toEqual(["rate_change", "deal"]);
  });

  it("returns community_thread and article for community tab", () => {
    expect(getTabEventTypes("community")).toEqual(["community_thread", "article"]);
  });

  it("returns advisor_post for advisors tab", () => {
    expect(getTabEventTypes("advisors")).toEqual(["advisor_post"]);
  });
});

describe("rankFeedEvents", () => {
  it("returns empty array for empty input", () => {
    expect(rankFeedEvents([])).toEqual([]);
  });

  it("places more-recent events above older ones (equal score_base)", () => {
    const older = makeEvent({
      id: "old",
      event_type: "rate_change",
      published_at: new Date(Date.now() - 10 * 3600 * 1000).toISOString(), // 10h ago
    });
    const newer = makeEvent({
      id: "new",
      event_type: "rate_change",
      published_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString(), // 1h ago
    });
    const [first, second] = rankFeedEvents([older, newer]);
    expect(first?.id).toBe("new");
    expect(second?.id).toBe("old");
  });

  it("places followed-advisor posts above unmatched posts with same recency", () => {
    const now = new Date().toISOString();
    const followed = makeEvent({
      id: "followed",
      event_type: "advisor_post",
      ref_id: "42",
      published_at: now,
    });
    const unfollowed = makeEvent({
      id: "unfollowed",
      event_type: "advisor_post",
      ref_id: "99",
      published_at: now,
    });
    const followedIds = new Set(["42"]);
    const [first] = rankFeedEvents([unfollowed, followed], followedIds);
    expect(first?.id).toBe("followed");
  });

  it("only boosts advisor_post type, not other types with same ref_id", () => {
    const now = new Date().toISOString();
    const rateChange = makeEvent({
      id: "rate",
      event_type: "rate_change",
      ref_id: "42",
      published_at: now,
      score_base: 50,
    });
    const advisorPost = makeEvent({
      id: "advisor",
      event_type: "advisor_post",
      ref_id: "42",
      published_at: now,
      score_base: 50,
    });
    const followedIds = new Set(["42"]);
    const [first] = rankFeedEvents([rateChange, advisorPost], followedIds);
    // advisor_post should win because of the follow boost
    expect(first?.id).toBe("advisor");
  });

  it("high score_base can outweigh moderate recency deficit", () => {
    const highScoreOld = makeEvent({
      id: "high-score",
      event_type: "article",
      score_base: 90,
      published_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString(), // 5h ago
    });
    const lowScoreNew = makeEvent({
      id: "low-score",
      event_type: "rate_change",
      score_base: 30,
      published_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString(), // 1h ago
    });
    const [first] = rankFeedEvents([lowScoreNew, highScoreOld]);
    // high score_base (90*0.4=36) + recency(90*0.5=45) = 81 vs low(30*0.4=12) + recency(98*0.5=49) = 61
    expect(first?.id).toBe("high-score");
  });

  it("does not mutate the input array", () => {
    const events = [
      makeEvent({ id: "a", event_type: "article", published_at: new Date(Date.now() - 3600000).toISOString() }),
      makeEvent({ id: "b", event_type: "rate_change", published_at: new Date().toISOString() }),
    ];
    const original = [...events];
    rankFeedEvents(events);
    expect(events[0]?.id).toBe(original[0]?.id);
    expect(events[1]?.id).toBe(original[1]?.id);
  });
});

describe("feedEventHref", () => {
  it("links rate_change to broker page", () => {
    const e = makeEvent({ event_type: "rate_change", entity_slug: "commbank" });
    expect(feedEventHref(e)).toBe("/broker/commbank");
  });

  it("falls back to savings comparison when no slug", () => {
    const e = makeEvent({ event_type: "rate_change" });
    expect(feedEventHref(e)).toBe("/compare/savings-accounts");
  });

  it("links advisor_post to advisor page via actor_slug", () => {
    const e = makeEvent({ event_type: "advisor_post", actor_slug: "jane-smith" });
    expect(feedEventHref(e)).toBe("/advisor/jane-smith");
  });

  it("prefers entity_slug over actor_slug for advisor_post", () => {
    const e = makeEvent({
      event_type: "advisor_post",
      entity_slug: "entity-slug",
      actor_slug: "actor-slug",
    });
    expect(feedEventHref(e)).toBe("/advisor/entity-slug");
  });

  it("links community_thread to /community/[slug]", () => {
    const e = makeEvent({ event_type: "community_thread", entity_slug: "general/my-thread" });
    expect(feedEventHref(e)).toBe("/community/general/my-thread");
  });

  it("links article to /article/[slug]", () => {
    const e = makeEvent({ event_type: "article", entity_slug: "how-to-invest" });
    expect(feedEventHref(e)).toBe("/article/how-to-invest");
  });

  it("links deal to broker page", () => {
    const e = makeEvent({ event_type: "deal", entity_slug: "swyftx" });
    expect(feedEventHref(e)).toBe("/broker/swyftx");
  });
});
