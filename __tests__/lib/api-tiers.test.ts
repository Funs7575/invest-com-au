import { afterEach, describe, expect, it, vi } from "vitest";
import {
  API_TIERS,
  API_TIER_CONFIG,
  rateLimitsForTier,
  isApiTier,
  isPurchasableTier,
  getPriceIdForApiTier,
  getApiTierForPriceId,
} from "@/lib/api-tiers";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("API_TIER_CONFIG", () => {
  it("has a config entry for every API tier", () => {
    for (const tier of API_TIERS) {
      expect(API_TIER_CONFIG[tier]).toBeDefined();
    }
  });

  it("keys each entry by its own tier value", () => {
    for (const tier of API_TIERS) {
      expect(API_TIER_CONFIG[tier].tier).toBe(tier);
    }
  });

  it("prices free at 0 and enterprise as talk-to-sales (null)", () => {
    expect(API_TIER_CONFIG.free.priceMonthly).toBe(0);
    expect(API_TIER_CONFIG.enterprise.priceMonthly).toBeNull();
    expect(API_TIER_CONFIG.basic.priceMonthly).toBeGreaterThan(0);
    expect(API_TIER_CONFIG.pro.priceMonthly).toBeGreaterThan(0);
  });
});

describe("rateLimitsForTier", () => {
  it("returns the per-minute/per-day pair from the catalogue", () => {
    expect(rateLimitsForTier("pro")).toEqual({
      rate_limit_per_minute: API_TIER_CONFIG.pro.ratePerMinute,
      rate_limit_per_day: API_TIER_CONFIG.pro.ratePerDay,
    });
  });
});

describe("isApiTier", () => {
  it("accepts every known tier", () => {
    for (const tier of API_TIERS) {
      expect(isApiTier(tier)).toBe(true);
    }
  });

  it("rejects unknown strings and non-strings", () => {
    expect(isApiTier("platinum")).toBe(false);
    expect(isApiTier("")).toBe(false);
    expect(isApiTier(undefined)).toBe(false);
    expect(isApiTier(null)).toBe(false);
    expect(isApiTier(42)).toBe(false);
  });
});

describe("getPriceIdForApiTier", () => {
  it("returns the configured env price id for a paid tier", () => {
    vi.stubEnv("STRIPE_PRICE_ID_API_BASIC", "price_basic_123");
    expect(getPriceIdForApiTier("basic")).toBe("price_basic_123");
  });

  it("returns null when the env var is unset", () => {
    vi.stubEnv("STRIPE_PRICE_ID_API_PRO", "");
    expect(getPriceIdForApiTier("pro")).toBeNull();
  });

  it("always returns null for the free tier", () => {
    expect(getPriceIdForApiTier("free")).toBeNull();
  });
});

describe("isPurchasableTier", () => {
  it("is false for free (price 0) and enterprise (talk-to-sales)", () => {
    vi.stubEnv("STRIPE_PRICE_ID_API_ENTERPRISE", "price_ent_123");
    expect(isPurchasableTier("free")).toBe(false);
    expect(isPurchasableTier("enterprise")).toBe(false);
  });

  it("is true for a paid tier only when its price id is configured", () => {
    vi.stubEnv("STRIPE_PRICE_ID_API_BASIC", "price_basic_123");
    expect(isPurchasableTier("basic")).toBe(true);
  });

  it("is false for a paid tier when its price id is missing", () => {
    vi.stubEnv("STRIPE_PRICE_ID_API_BASIC", "");
    expect(isPurchasableTier("basic")).toBe(false);
  });
});

describe("getApiTierForPriceId", () => {
  it("reverse-maps a configured price id back to its tier", () => {
    vi.stubEnv("STRIPE_PRICE_ID_API_PRO", "price_pro_xyz");
    expect(getApiTierForPriceId("price_pro_xyz")).toBe("pro");
  });

  it("returns null for an unknown price id or empty input", () => {
    vi.stubEnv("STRIPE_PRICE_ID_API_BASIC", "price_basic_123");
    expect(getApiTierForPriceId("price_does_not_match")).toBeNull();
    expect(getApiTierForPriceId(null)).toBeNull();
    expect(getApiTierForPriceId(undefined)).toBeNull();
    expect(getApiTierForPriceId("")).toBeNull();
  });
});
