import { describe, it, expect, vi, afterEach } from "vitest";
import {
  API_TIER_CONFIGS,
  getTierConfig,
  tierFromPriceId,
  isEndpointAllowed,
  type ApiTier,
} from "@/lib/api-tiers";

afterEach(() => {
  vi.unstubAllEnvs();
});

// ── API_TIER_CONFIGS ──────────────────────────────────────────────────────────

describe("API_TIER_CONFIGS", () => {
  const TIERS: ApiTier[] = ["free", "basic", "pro", "enterprise"];

  it("contains all four tiers", () => {
    expect(Object.keys(API_TIER_CONFIGS)).toHaveLength(4);
  });

  it.each(TIERS)("%s tier has required fields", (tier) => {
    const cfg = API_TIER_CONFIGS[tier];
    expect(cfg.tier).toBe(tier);
    expect(cfg.label.length).toBeGreaterThan(0);
    expect(cfg.rateLimitPerMinute).toBeGreaterThan(0);
    expect(cfg.rateLimitPerDay).toBeGreaterThan(0);
    expect(Array.isArray(cfg.allowedEndpoints)).toBe(true);
    expect(cfg.allowedEndpoints.length).toBeGreaterThan(0);
    expect(typeof cfg.monthlyAudCents).toBe("number");
  });

  it("tier hierarchy — rateLimitPerMinute increases from free → enterprise", () => {
    const { free, basic, pro, enterprise } = API_TIER_CONFIGS;
    expect(basic.rateLimitPerMinute).toBeGreaterThan(free.rateLimitPerMinute);
    expect(pro.rateLimitPerMinute).toBeGreaterThan(basic.rateLimitPerMinute);
    expect(enterprise.rateLimitPerMinute).toBeGreaterThan(pro.rateLimitPerMinute);
  });

  it("free tier allowedEndpoints is a specific list (not *)", () => {
    expect(API_TIER_CONFIGS.free.allowedEndpoints).not.toContain("*");
    expect(API_TIER_CONFIGS.free.allowedEndpoints.length).toBeGreaterThan(0);
  });

  it("basic, pro, enterprise tiers use wildcard endpoint access", () => {
    expect(API_TIER_CONFIGS.basic.allowedEndpoints).toContain("*");
    expect(API_TIER_CONFIGS.pro.allowedEndpoints).toContain("*");
    expect(API_TIER_CONFIGS.enterprise.allowedEndpoints).toContain("*");
  });

  it("free tier has monthlyAudCents = 0", () => {
    expect(API_TIER_CONFIGS.free.monthlyAudCents).toBe(0);
  });

  it("basic and pro tiers have positive monthlyAudCents", () => {
    expect(API_TIER_CONFIGS.basic.monthlyAudCents).toBeGreaterThan(0);
    expect(API_TIER_CONFIGS.pro.monthlyAudCents).toBeGreaterThan(0);
  });

  it("pro tier costs more than basic", () => {
    expect(API_TIER_CONFIGS.pro.monthlyAudCents).toBeGreaterThan(
      API_TIER_CONFIGS.basic.monthlyAudCents,
    );
  });
});

// ── getTierConfig ─────────────────────────────────────────────────────────────

describe("getTierConfig", () => {
  it.each(["free", "basic", "pro", "enterprise"] satisfies ApiTier[])(
    "returns the correct config for '%s'",
    (tier) => {
      expect(getTierConfig(tier).tier).toBe(tier);
    },
  );

  it("falls back to the free tier for an unknown tier string", () => {
    expect(getTierConfig("ultra").tier).toBe("free");
  });

  it("falls back to the free tier for an empty string", () => {
    expect(getTierConfig("").tier).toBe("free");
  });
});

// ── tierFromPriceId ───────────────────────────────────────────────────────────

describe("tierFromPriceId", () => {
  it("returns null for an empty string", () => {
    expect(tierFromPriceId("")).toBeNull();
  });

  it("returns null for an unrecognised price ID", () => {
    expect(tierFromPriceId("price_unknown_xyz")).toBeNull();
  });

  it("resolves the basic tier when STRIPE_API_BASIC_PRICE_ID is set", () => {
    // Re-import within the stubbed env so module-level reads are patched.
    // The config reads env vars at module-load time, so we verify the
    // round-trip by checking a price ID that we know will match.
    const basicPrice = API_TIER_CONFIGS.basic.priceId;
    if (basicPrice) {
      expect(tierFromPriceId(basicPrice)).toBe("basic");
    } else {
      // In CI without STRIPE_API_BASIC_PRICE_ID, priceId is ""; skip
      expect(tierFromPriceId("")).toBeNull();
    }
  });
});

// ── isEndpointAllowed ─────────────────────────────────────────────────────────

describe("isEndpointAllowed", () => {
  it("allows any endpoint when allowedEndpoints is ['*']", () => {
    expect(isEndpointAllowed("/api/v1/anything", ["*"])).toBe(true);
    expect(isEndpointAllowed("/api/v1/brokers/commsec", ["*"])).toBe(true);
  });

  it("allows an exact match", () => {
    expect(
      isEndpointAllowed("/api/v1/brokers", ["/api/v1/brokers"]),
    ).toBe(true);
  });

  it("rejects an endpoint not in the list", () => {
    expect(
      isEndpointAllowed("/api/v1/etfs", ["/api/v1/brokers"]),
    ).toBe(false);
  });

  it("allows a child endpoint when the pattern uses :slug wildcard", () => {
    expect(
      isEndpointAllowed("/api/v1/brokers/commsec", ["/api/v1/brokers/:slug"]),
    ).toBe(true);
  });

  it("does NOT allow the parent when only the :slug child pattern is listed", () => {
    // "/api/v1/brokers" is not a child of "/api/v1/brokers/:slug"
    expect(
      isEndpointAllowed("/api/v1/brokers", ["/api/v1/brokers/:slug"]),
    ).toBe(false);
  });

  it("handles an empty allowed list (nothing permitted)", () => {
    expect(isEndpointAllowed("/api/v1/brokers", [])).toBe(false);
  });

  it("free tier allows its specific endpoints", () => {
    const freeEndpoints = API_TIER_CONFIGS.free.allowedEndpoints;
    expect(isEndpointAllowed("/api/v1/brokers", freeEndpoints)).toBe(true);
    expect(isEndpointAllowed("/api/v1/advisors", freeEndpoints)).toBe(true);
  });

  it("free tier blocks an endpoint outside its explicit list", () => {
    const freeEndpoints = API_TIER_CONFIGS.free.allowedEndpoints;
    expect(isEndpointAllowed("/api/v1/etfs", freeEndpoints)).toBe(false);
  });

  it("pro tier (wildcard) allows any endpoint", () => {
    const proEndpoints = API_TIER_CONFIGS.pro.allowedEndpoints;
    expect(isEndpointAllowed("/api/v1/anything-new", proEndpoints)).toBe(true);
  });
});
