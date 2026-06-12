import { describe, it, expect } from "vitest";
import {
  parseInvestFilters,
  matchesInvestFilters,
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

  it("falls back to disclosed minimum investment for ticket bands (browse parity)", () => {
    const fund = {
      ...farm,
      asking_price_cents: null,
      key_metrics: { min_investment_aud: 50_000 },
    };
    expect(matchesInvestFilters(fund, { price: "10k-100k" })).toBe(true);
    expect(matchesInvestFilters(fund, { price: "1m-10m" })).toBe(false);
    // Truly POA (no minimum either) still never matches a band.
    expect(
      matchesInvestFilters({ ...farm, asking_price_cents: null, key_metrics: {} }, { price: "10k-100k" }),
    ).toBe(false);
  });

  it("honours the advanced browse params: siv, wholesale, investor=retail", () => {
    expect(matchesInvestFilters({ ...farm, siv_complying: true }, { siv: "complying" })).toBe(true);
    expect(matchesInvestFilters(farm, { siv: "complying" })).toBe(false);
    const wholesale = { ...farm, key_metrics: { wholesale_only: true } };
    expect(matchesInvestFilters(wholesale, { wholesale: "true" })).toBe(true);
    expect(matchesInvestFilters(farm, { wholesale: "true" })).toBe(false);
    expect(matchesInvestFilters(wholesale, { investor: "retail" })).toBe(false);
    expect(
      matchesInvestFilters(
        { ...farm, key_metrics: { wholesale_only: true, open_to_retail: true } },
        { investor: "retail" },
      ),
    ).toBe(true);
  });

  it("honours saved m_<key> registry facets by value shape", () => {
    const lot = { ...farm, key_metrics: { hectares: 412, tenancy: "leased", territory_exclusive: true } };
    expect(matchesInvestFilters(lot, { metrics: { hectares: "100-500" } })).toBe(true);
    expect(matchesInvestFilters(lot, { metrics: { hectares: "500-900" } })).toBe(false);
    expect(matchesInvestFilters(lot, { metrics: { tenancy: "leased,vacant" } })).toBe(true);
    expect(matchesInvestFilters(lot, { metrics: { tenancy: "vacant" } })).toBe(false);
    expect(matchesInvestFilters(lot, { metrics: { territory_exclusive: "1" } })).toBe(true);
  });

  it("matches enum facets through registry aliases when the category is saved", () => {
    const mine = {
      ...farm,
      vertical: "mining",
      key_metrics: { stage: "producer", commodity: "gold" },
    };
    // The stored row says "producer"; a filter saved as the human noun
    // ("production") must still match — and vice versa.
    expect(
      matchesInvestFilters(mine, { category: "mining", metrics: { stage: "production" } }),
    ).toBe(true);
    expect(
      matchesInvestFilters(mine, { category: "mining", metrics: { stage: "producer" } }),
    ).toBe(true);
    expect(
      matchesInvestFilters(mine, { category: "mining", metrics: { stage: "explorer" } }),
    ).toBe(false);
  });

  it("parses legacy currency-string metrics for range facets", () => {
    const biz = {
      ...farm,
      vertical: "business",
      key_metrics: { annual_ebitda: "$680,000" }, // dollars → 68M cents
    };
    expect(
      matchesInvestFilters(biz, {
        category: "buy-business",
        metrics: { annual_ebitda: "50000000-100000000" },
      }),
    ).toBe(true);
    expect(
      matchesInvestFilters(biz, {
        category: "buy-business",
        metrics: { annual_ebitda: "100000000-200000000" },
      }),
    ).toBe(false);
  });

  it("parses m_<key> params out of raw saved filters", () => {
    expect(
      parseInvestFilters({ category: "farmland", m_hectares: "100-500", m_tenancy: "leased" }),
    ).toEqual({
      category: "farmland",
      metrics: { hectares: "100-500", tenancy: "leased" },
    });
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
