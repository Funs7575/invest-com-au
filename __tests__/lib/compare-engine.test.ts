import { describe, expect, it } from "vitest";
import type { Broker } from "@/lib/types";
import {
  CATEGORY_SCHEMAS,
  calculateAnnualCost,
  filterBrokers,
  getMobileCardFields,
  rankBrokers,
  sortRankedBrokers,
  updateShortlist,
} from "@/lib/compare-engine";

function broker(overrides: Partial<Broker>): Broker {
  return {
    id: 1,
    name: "Alpha",
    slug: "alpha",
    color: "#111827",
    chess_sponsored: true,
    smsf_support: false,
    is_crypto: false,
    deal: false,
    editors_pick: false,
    status: "active",
    platform_type: "share_broker",
    rating: 4,
    asx_fee: "$5",
    asx_fee_value: 5,
    us_fee: "$2",
    us_fee_value: 2,
    fx_rate: 0.5,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

const alpha = broker({ id: 1, slug: "alpha", name: "Alpha", asx_fee_value: 5, us_fee_value: 2, fx_rate: 0.4, rating: 4.6, smsf_support: true });
const beta = broker({ id: 2, slug: "beta", name: "Beta", asx_fee_value: 0, us_fee_value: 8, fx_rate: 0.9, rating: 3.8, chess_sponsored: false });
const crypto = broker({ id: 3, slug: "coin", name: "Coin", platform_type: "crypto_exchange", is_crypto: true, asx_fee_value: 1, rating: 4.2 });
const superFund = broker({ id: 4, slug: "super", name: "Super", platform_type: "super_fund", asx_fee_value: 0.7, rating: 4.4 });

describe("compare engine", () => {
  it("filters by category and feature without leaking irrelevant product rows", () => {
    const result = filterBrokers([alpha, beta, crypto, superFund], {
      category: "share-trading",
      features: new Set(["chess"]),
    });

    expect(result.map((item) => item.slug)).toEqual(["alpha"]);
  });

  it("uses category-specific table schemas that hide irrelevant columns", () => {
    expect(CATEGORY_SCHEMAS["crypto-exchanges"].columns.map((column) => column.label)).toContain("AUD funding");
    expect(CATEGORY_SCHEMAS["crypto-exchanges"].columns.map((column) => column.label)).not.toContain("CHESS");
    expect(CATEGORY_SCHEMAS["super-funds"].columns.map((column) => column.label)).toContain("Admin/investment fee");
  });

  it("calculates indicative annual cost from user inputs", () => {
    const cost = calculateAnnualCost(alpha, {
      tradesPerMonth: 2,
      averageTradeSize: 1000,
      usTradesPerMonth: 1,
      averageUsTradeSize: 2000,
      portfolioBalance: 50000,
    });

    expect(cost).toBe(240); // ASX $120 + US $24 + FX $96
  });

  it("sorts ranked providers by calculated annual cost", () => {
    const rows = rankBrokers([alpha, beta], "low-cost", {
      tradesPerMonth: 2,
      averageTradeSize: 1000,
      usTradesPerMonth: 0,
      averageUsTradeSize: 1000,
      portfolioBalance: 10000,
    });

    expect(sortRankedBrokers(rows, "estimated_annual_cost", 1)[0].broker.slug).toBe("beta");
  });

  it("caps and toggles the side-by-side shortlist at four providers", () => {
    expect(updateShortlist(["a", "b", "c", "d"], "e")).toEqual(["a", "b", "c", "d"]);
    expect(updateShortlist(["a", "b"], "b")).toEqual(["a"]);
  });

  it("scenario ranking boosts SMSF-friendly providers", () => {
    const rows = rankBrokers([alpha, beta], "smsf-investor");
    const alphaRow = rows.find((row) => row.broker.slug === "alpha")!;
    const betaRow = rows.find((row) => row.broker.slug === "beta")!;

    expect(alphaRow.rankScore).toBeGreaterThan(betaRow.rankScore);
    expect(alphaRow.why.join(" ")).toContain("SMSF account support");
  });

  it("provides mobile card fields from the active schema", () => {
    expect(getMobileCardFields(CATEGORY_SCHEMAS["international-shares"])).toEqual([
      "US brokerage",
      "FX markup",
      "Markets",
      "Est. annual cost",
    ]);
  });
});
