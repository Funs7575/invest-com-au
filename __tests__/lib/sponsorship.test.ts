import { describe, it, expect, vi, afterEach } from "vitest";
import type { Broker } from "@/lib/types";
import {
  boostFeaturedPartner,
  isSponsored,
  sortWithSponsorship,
  getSponsorSortPriority,
  getPlacementWinners,
  applyQuizSponsorBoost,
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

  it("raw:true skips boost and preserves original order", () => {
    const brokers = [
      makeBroker({ slug: "a", rating: 5 }),
      makeBroker({ slug: "b", rating: 4 }),
      makeBroker({ slug: "sponsored", sponsorship_tier: "featured_partner", rating: 3 }),
    ];
    const result = boostFeaturedPartner(brokers, 0, { raw: true });
    expect(result[0].slug).toBe("a");
    expect(result[1].slug).toBe("b");
    expect(result[2].slug).toBe("sponsored");
  });

  it("raw:false is equivalent to the default (boost applied)", () => {
    const brokers = [
      makeBroker({ slug: "a", rating: 5 }),
      makeBroker({ slug: "sponsored", sponsorship_tier: "featured_partner", rating: 1 }),
    ];
    const withRawFalse = boostFeaturedPartner(brokers, 0, { raw: false });
    const withDefault = boostFeaturedPartner(brokers, 0);
    expect(withRawFalse.map((b) => b.slug)).toEqual(withDefault.map((b) => b.slug));
  });

  it("raw:true returns a new array (does not mutate)", () => {
    const brokers = [makeBroker({ slug: "a" })];
    const result = boostFeaturedPartner(brokers, 0, { raw: true });
    expect(result).not.toBe(brokers);
  });
});

/* ─── TEST-12: getPlacementWinners ─── */

describe("getPlacementWinners", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function stubFetch(impl: () => Promise<Partial<Response>> | Partial<Response>) {
    const mock = vi.fn(impl as never);
    vi.stubGlobal("fetch", mock);
    return mock;
  }

  it("builds a placement-only query when no broker slugs given", async () => {
    const mock = stubFetch(() => ({ ok: true, json: async () => ({ winners: [] }) }));
    await getPlacementWinners("homepage-hero");
    const url = String(mock.mock.calls[0]![0]);
    expect(url).toContain("/api/marketplace/allocation?");
    expect(url).toContain("placement=homepage-hero");
    expect(url).not.toContain("brokers=");
  });

  it("adds a brokers CSV param only when brokerSlugs non-empty", async () => {
    const mock = stubFetch(() => ({ ok: true, json: async () => ({ winners: [] }) }));
    await getPlacementWinners("hero", ["cmc", "stake"]);
    const url = String(mock.mock.calls[0]![0]);
    // URLSearchParams encodes the comma in the CSV value.
    expect(decodeURIComponent(url)).toContain("brokers=cmc,stake");
  });

  it("maps data.winners to the PlacementWinner shape", async () => {
    stubFetch(() => ({
      ok: true,
      json: async () => ({
        winners: [
          { broker_slug: "cmc", campaign_id: 9, inventory_type: "featured", rate_cents: 1500, extra: "drop me" },
        ],
      }),
    }));
    const result = await getPlacementWinners("hero");
    expect(result).toEqual([
      { broker_slug: "cmc", campaign_id: 9, inventory_type: "featured", rate_cents: 1500 },
    ]);
  });

  it("returns [] when the response is not ok", async () => {
    stubFetch(() => ({ ok: false, json: async () => ({ winners: [{ broker_slug: "x" }] }) }));
    expect(await getPlacementWinners("hero")).toEqual([]);
  });

  it("returns [] when data.winners is missing", async () => {
    stubFetch(() => ({ ok: true, json: async () => ({}) }));
    expect(await getPlacementWinners("hero")).toEqual([]);
  });

  it("returns [] when fetch throws (no rejection bubbles up)", async () => {
    stubFetch(() => {
      throw new Error("network down");
    });
    await expect(getPlacementWinners("hero")).resolves.toEqual([]);
  });
});

/* ─── TEST-12: applyQuizSponsorBoost goal-applicability branch ─── */

describe("applyQuizSponsorBoost goal branch", () => {
  // isApplicableToBrokerGoal is private — exercise it indirectly. A sponsored
  // crypto exchange is applicable to goal "crypto" but NOT to goal "super".
  function row(broker: Broker | null) {
    return { broker };
  }
  const sponsoredCrypto = makeBroker({
    slug: "sponsored-crypto",
    sponsorship_tier: "featured_partner",
    is_crypto: true,
    platform_type: "crypto_exchange",
  });
  const plain = (slug: string) => makeBroker({ slug, sponsorship_tier: null });

  it("does not swap a featured_partner that is not applicable to the goal", () => {
    const items = [row(plain("a")), row(plain("b")), row(sponsoredCrypto)];
    const result = applyQuizSponsorBoost(items, 1, 5, "super");
    expect(result.map((r) => r.broker?.slug)).toEqual(["a", "b", "sponsored-crypto"]);
  });

  it("swaps an applicable featured_partner up by one within [minRank,maxRank]", () => {
    const items = [row(plain("a")), row(plain("b")), row(sponsoredCrypto)];
    const result = applyQuizSponsorBoost(items, 1, 5, "crypto");
    // idx 2 swaps with idx 1.
    expect(result.map((r) => r.broker?.slug)).toEqual(["a", "sponsored-crypto", "b"]);
  });

  it("does not swap when the applicable partner is already first (idx < 1)", () => {
    const items = [row(sponsoredCrypto), row(plain("b")), row(plain("c"))];
    // minRank 0 lets idx 0 match, but idx < 1 short-circuits the swap.
    const result = applyQuizSponsorBoost(items, 0, 5, "crypto");
    expect(result.map((r) => r.broker?.slug)).toEqual(["sponsored-crypto", "b", "c"]);
  });

  it("does not swap when the partner sits outside [minRank,maxRank]", () => {
    const items = [row(plain("a")), row(plain("b")), row(plain("c")), row(sponsoredCrypto)];
    // maxRank 2 excludes idx 3.
    const result = applyQuizSponsorBoost(items, 1, 2, "crypto");
    expect(result.map((r) => r.broker?.slug)).toEqual(["a", "b", "c", "sponsored-crypto"]);
  });

  it("does not mutate the original array (spread copy)", () => {
    const items = [row(plain("a")), row(plain("b")), row(sponsoredCrypto)];
    const snapshot = items.map((r) => r.broker?.slug);
    const result = applyQuizSponsorBoost(items, 1, 5, "crypto");
    expect(result).not.toBe(items);
    expect(items.map((r) => r.broker?.slug)).toEqual(snapshot);
  });
});
