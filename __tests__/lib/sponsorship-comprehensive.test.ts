import { describe, it, expect } from "vitest";
import {
  getSponsorSortPriority,
  sortWithSponsorship,
  isSponsored,
  boostFeaturedPartner,
  applyQuizSponsorBoost,
  TIER_PRICING,
} from "@/lib/sponsorship";
import type { Broker } from "@/lib/types";

function makeBroker(
  overrides: Partial<Broker> & { slug: string; name: string }
): Broker {
  return {
    id: 1,
    color: "#000",
    chess_sponsored: false,
    smsf_support: false,
    is_crypto: false,
    platform_type: "share_broker",
    deal: false,
    editors_pick: false,
    status: "published",
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
    ...overrides,
  } as Broker;
}

describe("getSponsorSortPriority", () => {
  it("returns 1 for featured_partner", () => {
    expect(getSponsorSortPriority("featured_partner")).toBe(1);
  });

  it("returns 2 for editors_pick", () => {
    expect(getSponsorSortPriority("editors_pick")).toBe(2);
  });

  it("returns 3 for deal_of_month", () => {
    expect(getSponsorSortPriority("deal_of_month")).toBe(3);
  });

  it("returns 99 for null/undefined/unknown tiers", () => {
    expect(getSponsorSortPriority(null)).toBe(99);
    expect(getSponsorSortPriority(undefined)).toBe(99);
    expect(getSponsorSortPriority("unknown_tier")).toBe(99);
  });
});

describe("sortWithSponsorship", () => {
  const unsponsored1 = makeBroker({ slug: "a", name: "A", rating: 4.5 });
  const unsponsored2 = makeBroker({ slug: "b", name: "B", rating: 4.8 });
  const featured = makeBroker({
    slug: "c",
    name: "C",
    rating: 3.0,
    sponsorship_tier: "featured_partner",
  });
  const editorsPick = makeBroker({
    slug: "d",
    name: "D",
    rating: 4.2,
    sponsorship_tier: "editors_pick",
  });
  const dealOfMonth = makeBroker({
    slug: "e",
    name: "E",
    rating: 4.0,
    sponsorship_tier: "deal_of_month",
  });

  it("places sponsored brokers before unsponsored", () => {
    const sorted = sortWithSponsorship([unsponsored1, featured, unsponsored2]);
    expect(sorted[0].slug).toBe("c"); // featured_partner first
  });

  it("sorts sponsored tiers by priority: featured > editors > deal", () => {
    const sorted = sortWithSponsorship([dealOfMonth, editorsPick, featured]);
    expect(sorted[0].slug).toBe("c"); // featured_partner
    expect(sorted[1].slug).toBe("d"); // editors_pick
    expect(sorted[2].slug).toBe("e"); // deal_of_month
  });

  it("sorts unsponsored brokers by rating descending", () => {
    const sorted = sortWithSponsorship([unsponsored1, unsponsored2]);
    expect(sorted[0].slug).toBe("b"); // rating 4.8
    expect(sorted[1].slug).toBe("a"); // rating 4.5
  });

  it("does not mutate the original array", () => {
    const original = [unsponsored2, featured, unsponsored1];
    const originalCopy = [...original];
    sortWithSponsorship(original);
    expect(original).toEqual(originalCopy);
  });

  it("handles empty array", () => {
    expect(sortWithSponsorship([])).toEqual([]);
  });

  it("handles all sponsored brokers", () => {
    const sorted = sortWithSponsorship([dealOfMonth, featured, editorsPick]);
    expect(sorted).toHaveLength(3);
    expect(sorted[0].slug).toBe("c");
  });
});

describe("isSponsored", () => {
  it("returns true for a broker with a sponsorship_tier", () => {
    const broker = makeBroker({
      slug: "x",
      name: "X",
      sponsorship_tier: "featured_partner",
    });
    expect(isSponsored(broker)).toBe(true);
  });

  it("returns false for a broker with null sponsorship_tier", () => {
    const broker = makeBroker({ slug: "y", name: "Y", sponsorship_tier: null });
    expect(isSponsored(broker)).toBe(false);
  });

  it("returns false for a broker with no sponsorship_tier", () => {
    const broker = makeBroker({ slug: "z", name: "Z" });
    expect(isSponsored(broker)).toBe(false);
  });
});

describe("boostFeaturedPartner", () => {
  const a = makeBroker({ slug: "a", name: "A", rating: 5 });
  const b = makeBroker({ slug: "b", name: "B", rating: 4.5 });
  const sponsored = makeBroker({
    slug: "s",
    name: "S",
    rating: 3.0,
    sponsorship_tier: "featured_partner",
  });

  it("moves featured_partner to target position", () => {
    const result = boostFeaturedPartner([a, b, sponsored], 0);
    expect(result[0].slug).toBe("s");
    expect(result[1].slug).toBe("a");
    expect(result[2].slug).toBe("b");
  });

  it("does nothing if featured_partner is already at or above target", () => {
    const result = boostFeaturedPartner([sponsored, a, b], 0);
    expect(result[0].slug).toBe("s"); // already at position 0
  });

  it("does nothing if no featured_partner exists", () => {
    const result = boostFeaturedPartner([a, b], 0);
    expect(result[0].slug).toBe("a");
    expect(result[1].slug).toBe("b");
  });

  it("does not mutate the original array", () => {
    const original = [a, b, sponsored];
    const copy = [...original];
    boostFeaturedPartner(original, 0);
    expect(original.map((x) => x.slug)).toEqual(copy.map((x) => x.slug));
  });

  it("handles empty array", () => {
    expect(boostFeaturedPartner([], 0)).toEqual([]);
  });

  it("boosts to custom target position", () => {
    const c = makeBroker({ slug: "c", name: "C", rating: 4.0 });
    const result = boostFeaturedPartner([a, b, c, sponsored], 1);
    expect(result[1].slug).toBe("s");
  });
});

describe("applyQuizSponsorBoost", () => {
  const makeItem = (slug: string, tier?: string) => ({
    broker: makeBroker({
      slug,
      name: slug,
      sponsorship_tier: tier as any,
    }),
  });

  it("swaps featured_partner up by 1 position within range", () => {
    const items = [
      makeItem("a"),
      makeItem("b"),
      makeItem("c", "featured_partner"),
      makeItem("d"),
    ];
    const result = applyQuizSponsorBoost(items, 1, 5);
    expect(result[1].broker?.slug).toBe("c");
    expect(result[2].broker?.slug).toBe("b");
  });

  it("does nothing if featured_partner is at position 0", () => {
    const items = [
      makeItem("c", "featured_partner"),
      makeItem("a"),
      makeItem("b"),
    ];
    const result = applyQuizSponsorBoost(items, 0, 5);
    expect(result[0].broker?.slug).toBe("c");
  });

  it("does nothing if no featured_partner in the range", () => {
    const items = [makeItem("a"), makeItem("b"), makeItem("c")];
    const result = applyQuizSponsorBoost(items, 1, 5);
    expect(result[0].broker?.slug).toBe("a");
    expect(result[1].broker?.slug).toBe("b");
  });

  it("does not boost if featured_partner is outside maxRank", () => {
    const items = Array.from({ length: 8 }, (_, i) =>
      makeItem(`item${i}`, i === 7 ? "featured_partner" : undefined)
    );
    const result = applyQuizSponsorBoost(items, 1, 5);
    // Position 7 is outside range 1-5, no boost
    expect(result[7].broker?.slug).toBe("item7");
  });

  it("does not mutate the original array", () => {
    const items = [makeItem("a"), makeItem("b", "featured_partner")];
    const originalSlugs = items.map((i) => i.broker?.slug);
    applyQuizSponsorBoost(items, 1, 5);
    expect(items.map((i) => i.broker?.slug)).toEqual(originalSlugs);
  });

  it("handles empty array", () => {
    expect(applyQuizSponsorBoost([], 1, 5)).toEqual([]);
  });
});

describe("TIER_PRICING", () => {
  it("has pricing for all three tiers", () => {
    expect(TIER_PRICING.featured_partner).toBeDefined();
    expect(TIER_PRICING.editors_pick).toBeDefined();
    expect(TIER_PRICING.deal_of_month).toBeDefined();
  });

  it("each tier has monthly and label fields", () => {
    for (const tier of Object.values(TIER_PRICING)) {
      expect(typeof tier.monthly).toBe("number");
      expect(typeof tier.label).toBe("string");
      expect(tier.monthly).toBeGreaterThan(0);
    }
  });
});
