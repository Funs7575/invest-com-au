import { describe, it, expect } from "vitest";
import {
  parseInvestFilters,
  matchesInvestFilters,
  matchSignature,
  describeInvestFilters,
} from "@/lib/listings/saved-searches";

const farm = {
  vertical: "farmland",
  sub_category: null,
  listing_kind: null,
  location_state: "NSW",
  asking_price_cents: 420_000_000, // $4.2M → 1m-10m bucket
  firb_eligible: true,
  title: "Riverina Aggregation",
  description: "412ha irrigated cropping with water entitlements",
  key_metrics: {},
};

describe("parseInvestFilters", () => {
  it("keeps known string params and drops junk", () => {
    expect(
      parseInvestFilters({
        category: "farmland",
        state: "NSW",
        price: "1m-10m",
        bogus: "x",
        kind: 42,
        q: "  water  ",
      }),
    ).toEqual({ category: "farmland", state: "NSW", price: "1m-10m", q: "water" });
  });

  it("is total on garbage input", () => {
    for (const raw of [null, undefined, "str", 7, []]) {
      expect(parseInvestFilters(raw)).toEqual({});
    }
  });
});

describe("matchesInvestFilters", () => {
  it("matches on the full filter vocabulary", () => {
    expect(
      matchesInvestFilters(farm, {
        category: "farmland",
        state: "nsw",
        price: "1m-10m",
        firb: "eligible",
        q: "water",
      }),
    ).toBe(true);
  });

  it("treats category=all as a pass-through", () => {
    expect(matchesInvestFilters(farm, { category: "all" })).toBe(true);
  });

  it("fails the specific check that does not hold", () => {
    expect(matchesInvestFilters(farm, { category: "mining" })).toBe(false);
    expect(matchesInvestFilters(farm, { state: "VIC" })).toBe(false);
    expect(matchesInvestFilters(farm, { price: "under-10k" })).toBe(false);
    expect(matchesInvestFilters(farm, { q: "uranium" })).toBe(false);
    expect(matchesInvestFilters({ ...farm, firb_eligible: false }, { firb: "eligible" })).toBe(false);
  });

  it("never matches POA rows against a ticket band", () => {
    expect(
      matchesInvestFilters({ ...farm, asking_price_cents: null }, { price: "1m-10m" }),
    ).toBe(false);
    // …but POA rows still match band-free searches.
    expect(
      matchesInvestFilters({ ...farm, asking_price_cents: null }, { category: "farmland" }),
    ).toBe(true);
  });

  it("matches any of a comma-list of kinds", () => {
    expect(matchesInvestFilters(farm, { kind: "fund,for_sale_asset" })).toBe(true);
    expect(matchesInvestFilters(farm, { kind: "fund,royalty" })).toBe(false);
  });

  it("ignores an unknown ticket-bucket key (defaults to any)", () => {
    expect(matchesInvestFilters(farm, { price: "not-a-bucket" })).toBe(true);
  });
});

describe("matchSignature", () => {
  it("is order-independent and stable", () => {
    expect(matchSignature([3, 1, 2])).toBe("1,2,3");
    expect(matchSignature([1, 2, 3])).toBe(matchSignature([3, 2, 1]));
  });
});

describe("describeInvestFilters", () => {
  it("summarises the saved filters for the email subject", () => {
    expect(
      describeInvestFilters({ category: "water-rights", state: "vic", price: "100k-1m" }),
    ).toBe("water rights · in VIC · $100k – $1M");
  });

  it("falls back for empty filters", () => {
    expect(describeInvestFilters({})).toBe("All new listings");
  });
});
