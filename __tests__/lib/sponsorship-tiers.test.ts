import { describe, it, expect } from "vitest";
import {
  SELF_SERVE_TIERS,
  SELF_SERVE_TIER_PRICES_CENTS,
  SELF_SERVE_DURATIONS,
  SELF_SERVE_DURATION_DISCOUNTS,
  VALID_SELF_SERVE_DURATIONS,
  calculateCheckoutCents,
  getSelfServeTier,
} from "@/lib/sponsorship-tiers";

describe("SELF_SERVE_TIERS", () => {
  it("declares the three canonical tier ids", () => {
    expect(SELF_SERVE_TIERS.map((t) => t.id).sort()).toEqual([
      "category_sponsor",
      "deal_of_month",
      "featured_partner",
    ]);
  });

  it("exposes prices in cents that match dollar basePrice × 100", () => {
    for (const t of SELF_SERVE_TIERS) {
      expect(SELF_SERVE_TIER_PRICES_CENTS[t.id]).toBe(t.basePrice * 100);
    }
  });

  it("has exactly one tier flagged as highlight/most-popular", () => {
    expect(SELF_SERVE_TIERS.filter((t) => t.highlight)).toHaveLength(1);
  });

  it("every tier has a non-empty feature list", () => {
    for (const t of SELF_SERVE_TIERS) {
      expect(t.includes.length).toBeGreaterThan(0);
    }
  });
});

describe("SELF_SERVE_DURATIONS", () => {
  it("exposes the four canonical durations (1/3/6/12 months)", () => {
    expect(VALID_SELF_SERVE_DURATIONS).toEqual([1, 3, 6, 12]);
  });

  it("1-month duration has zero discount; longer durations do not", () => {
    const one = SELF_SERVE_DURATIONS.find((d) => d.months === 1);
    const twelve = SELF_SERVE_DURATIONS.find((d) => d.months === 12);
    expect(one?.discount).toBe(0);
    expect(twelve?.discount).toBeGreaterThan(0);
  });

  it("discount map matches the declared durations", () => {
    for (const d of SELF_SERVE_DURATIONS) {
      expect(SELF_SERVE_DURATION_DISCOUNTS[d.months]).toBe(d.discount);
    }
  });
});

describe("calculateCheckoutCents", () => {
  it("returns monthly × months in cents for a 1-month purchase (no discount)", () => {
    // Featured Partner is $2000/mo → 1 month = 200000 cents
    expect(calculateCheckoutCents("featured_partner", 1)).toBe(200000);
  });

  it("applies the 10% discount at 3 months", () => {
    // $2000 × 3 × 0.9 = $5400 → 540000 cents
    expect(calculateCheckoutCents("featured_partner", 3)).toBe(540000);
  });

  it("applies the 30% discount at 12 months", () => {
    // $2000 × 12 × 0.7 = $16800 → 1680000 cents
    expect(calculateCheckoutCents("featured_partner", 12)).toBe(1680000);
  });

  it("computes category_sponsor correctly at the $500 base rate", () => {
    // $500 × 6 × 0.8 = $2400 → 240000 cents
    expect(calculateCheckoutCents("category_sponsor", 6)).toBe(240000);
  });

  it("computes deal_of_month correctly at the $300 base rate", () => {
    // $300 × 1 × 1.0 = $300 → 30000 cents
    expect(calculateCheckoutCents("deal_of_month", 1)).toBe(30000);
  });

  it("returns 0 for an unknown tier", () => {
    // @ts-expect-error — testing runtime fallthrough
    expect(calculateCheckoutCents("bogus_tier", 1)).toBe(0);
  });

  it("returns 0 for an unsupported duration", () => {
    expect(calculateCheckoutCents("featured_partner", 2)).toBe(0);
  });
});

describe("getSelfServeTier", () => {
  it("looks up a tier by id", () => {
    expect(getSelfServeTier("featured_partner")?.name).toBe("Featured Partner");
  });

  it("returns undefined for an unknown id", () => {
    expect(getSelfServeTier("nope")).toBeUndefined();
  });
});
