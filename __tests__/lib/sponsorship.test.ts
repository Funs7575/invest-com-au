import { describe, it, expect } from "vitest";
import type { Broker } from "@/lib/types";
import {
  boostFeaturedPartner,
  isSponsored,
  sortWithSponsorship,
  getSponsorSortPriority,
} from "@/lib/sponsorship";

/** Minimal broker factory for testing */
function makeBroker(overrides: Partial<Broker>): Broker {
  return {
    id: 1,
    name: "Test",
    slug: "test",
    color: "#000",
    chess_sponsored: false,
    smsf_support: false,
    is_crypto: false,
    platform_type: "share_broker",
    deal: false,
    editors_pick: false,
    status: "active",
    ...overrides,
  } as Broker;
}

describe("isSponsored", () => {
  it("returns true for sponsored broker", () => {
    expect(isSponsored(makeBroker({ sponsorship_tier: "featured_partner" }))).toBe(true);
    expect(isSponsored(makeBroker({ sponsorship_tier: "editors_pick" }))).toBe(true);
  });

  it("returns false for non-sponsored broker", () => {
    expect(isSponsored(makeBroker({ sponsorship_tier: null }))).toBe(false);
    expect(isSponsored(makeBroker({}))).toBe(false);
  });
});

describe("getSponsorSortPriority", () => {
  it("returns lower number for higher-priority tier", () => {
    expect(getSponsorSortPriority("featured_partner")).toBeLessThan(
      getSponsorSortPriority("editors_pick")
    );
    expect(getSponsorSortPriority("editors_pick")).toBeLessThan(
      getSponsorSortPriority("deal_of_month")
    );
  });

  it("returns 99 for null/undefined", () => {
    expect(getSponsorSortPriority(null)).toBe(99);
    expect(getSponsorSortPriority(undefined)).toBe(99);
  });
});

describe("sortWithSponsorship", () => {
  it("sorts sponsored brokers before non-sponsored", () => {
    const brokers = [
      makeBroker({ slug: "a", rating: 5 }),
      makeBroker({ slug: "b", sponsorship_tier: "featured_partner", rating: 3 }),
    ];
    const sorted = sortWithSponsorship(brokers);
    expect(sorted[0].slug).toBe("b");
    expect(sorted[1].slug).toBe("a");
  });

  it("sorts by rating within same tier", () => {
    const brokers = [
      makeBroker({ slug: "low", rating: 3 }),
      makeBroker({ slug: "high", rating: 5 }),
    ];
    const sorted = sortWithSponsorship(brokers);
    expect(sorted[0].slug).toBe("high");
  });

  it("does not mutate original array", () => {
    const brokers = [makeBroker({ slug: "a" })];
    const sorted = sortWithSponsorship(brokers);
    expect(sorted).not.toBe(brokers);
  });
});

describe("boostFeaturedPartner", () => {
  it("moves featured_partner to target position", () => {
    const brokers = [
      makeBroker({ slug: "a", rating: 5 }),
      makeBroker({ slug: "b", rating: 4 }),
      makeBroker({ slug: "sponsored", sponsorship_tier: "featured_partner", rating: 3 }),
    ];
    const result = boostFeaturedPartner(brokers, 0);
    expect(result[0].slug).toBe("sponsored");
    expect(result).toHaveLength(3);
  });

  it("does not move if already at or above target position", () => {
    const brokers = [
      makeBroker({ slug: "sponsored", sponsorship_tier: "featured_partner" }),
      makeBroker({ slug: "b" }),
    ];
    const result = boostFeaturedPartner(brokers, 0);
    expect(result[0].slug).toBe("sponsored");
  });

  it("returns same order if no featured_partner exists", () => {
    const brokers = [
      makeBroker({ slug: "a" }),
      makeBroker({ slug: "b" }),
    ];
    const result = boostFeaturedPartner(brokers, 0);
    expect(result[0].slug).toBe("a");
    expect(result[1].slug).toBe("b");
  });

  it("handles empty array", () => {
    const result = boostFeaturedPartner([], 0);
    expect(result).toEqual([]);
  });

  it("does not mutate original array", () => {
    const brokers = [
      makeBroker({ slug: "a" }),
      makeBroker({ slug: "sponsored", sponsorship_tier: "featured_partner" }),
    ];
    const original = [...brokers];
    boostFeaturedPartner(brokers, 0);
    expect(brokers[0].slug).toBe(original[0].slug);
  });
});
