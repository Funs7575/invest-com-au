import { describe, it, expect } from "vitest";
import {
  curateHomepageListings,
  isPaidTier,
  HOME_TEASER_PAID_CAP,
  HOME_TEASER_VISIBLE,
  type CuratableListing,
} from "@/lib/home-listing-curation";

let nextId = 1;

interface TestListing extends CuratableListing {
  id: number;
}

function listing(over: Partial<TestListing> = {}): TestListing {
  return {
    id: nextId++,
    vertical: "farmland",
    images: ["photo.jpg"],
    listing_type: "standard",
    listing_kind: "for_sale_asset",
    ...over,
  };
}

describe("isPaidTier", () => {
  it("treats featured and premium as paid, everything else as organic", () => {
    expect(isPaidTier("featured")).toBe(true);
    expect(isPaidTier("premium")).toBe(true);
    expect(isPaidTier("standard")).toBe(false);
    expect(isPaidTier(null)).toBe(false);
    expect(isPaidTier(undefined)).toBe(false);
  });
});

describe("curateHomepageListings", () => {
  it("excludes equity raises outright (no s708 gate on the startup portal)", () => {
    const raise = listing({ vertical: "startups", listing_kind: "equity_raise" });
    const ok = listing({ vertical: "mining" });
    const result = curateHomepageListings([raise, ok]);
    expect(result.map((l) => l.id)).toEqual([ok.id]);
  });

  it("ranks imaged listings above imageless ones regardless of paid tier", () => {
    const imagelessPremium = listing({ vertical: "bullion", images: null, listing_type: "premium" });
    const imagedStandard = listing({ vertical: "mining", listing_type: "standard" });
    const result = curateHomepageListings([imagelessPremium, imagedStandard]);
    expect(result[0]?.id).toBe(imagedStandard.id);
  });

  it("round-robins verticals — max 2 per vertical before others get a slot", () => {
    const farm = [listing(), listing(), listing(), listing()];
    const mining = [listing({ vertical: "mining" }), listing({ vertical: "mining" })];
    const result = curateHomepageListings([...farm, ...mining]);
    const headVerticals = result.slice(0, 4).map((l) => l.vertical);
    expect(headVerticals.filter((v) => v === "farmland")).toHaveLength(2);
    expect(headVerticals.filter((v) => v === "mining")).toHaveLength(2);
  });

  it("caps paid placements in the visible window and backfills with organic", () => {
    const verticals = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];
    const paid = verticals
      .slice(0, 6)
      .map((v) => listing({ vertical: v, listing_type: "premium" }));
    const organic = verticals
      .slice(6)
      .map((v) => listing({ vertical: v, listing_type: "standard" }));
    const result = curateHomepageListings([...paid, ...organic]);
    const visible = result.slice(0, HOME_TEASER_VISIBLE);
    expect(visible).toHaveLength(HOME_TEASER_VISIBLE);
    expect(visible.filter((l) => isPaidTier(l.listing_type))).toHaveLength(
      HOME_TEASER_PAID_CAP,
    );
  });

  it("relaxes the paid cap rather than rendering an empty slot when supply is all paid", () => {
    const paidOnly = ["a", "b", "c", "d", "e", "f"].map((v) =>
      listing({ vertical: v, listing_type: "featured" }),
    );
    const result = curateHomepageListings(paidOnly);
    expect(result.slice(0, HOME_TEASER_VISIBLE)).toHaveLength(6);
  });

  it("returns every eligible listing exactly once", () => {
    const rows = [
      listing(),
      listing({ vertical: "mining", images: null }),
      listing({ vertical: "bullion", listing_type: "premium" }),
      listing({ vertical: "startups", listing_kind: "equity_raise" }),
    ];
    const result = curateHomepageListings(rows);
    expect(result).toHaveLength(3);
    expect(new Set(result.map((l) => l.id)).size).toBe(3);
  });
});
