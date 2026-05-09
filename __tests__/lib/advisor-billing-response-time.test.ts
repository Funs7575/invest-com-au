import { describe, it, expect } from "vitest";
import {
  RESPONSE_TIME_REWARD_THRESHOLD_MIN,
  RESPONSE_TIME_REWARD_MULTIPLIER,
  responseTimeMultiplier,
  qualifiesForResponseTimeReward,
} from "@/lib/advisor-billing-response-time";

describe("response-time reward constants", () => {
  it("threshold is 60 min", () => {
    expect(RESPONSE_TIME_REWARD_THRESHOLD_MIN).toBe(60);
  });

  it("multiplier is 0.75 (25% off)", () => {
    expect(RESPONSE_TIME_REWARD_MULTIPLIER).toBe(0.75);
  });
});

describe("responseTimeMultiplier", () => {
  it("returns 1.0 when avg is null (new advisor, no history)", () => {
    expect(responseTimeMultiplier(null)).toBe(1.0);
  });

  it("returns 1.0 when avg is undefined", () => {
    expect(responseTimeMultiplier(undefined)).toBe(1.0);
  });

  it("returns 1.0 when avg is 0 (defensive — shouldn't happen)", () => {
    expect(responseTimeMultiplier(0)).toBe(1.0);
  });

  it("returns 1.0 when avg is negative (defensive)", () => {
    expect(responseTimeMultiplier(-10)).toBe(1.0);
  });

  it("returns 0.75 when avg is exactly 60 min (boundary inclusive)", () => {
    expect(responseTimeMultiplier(60)).toBe(0.75);
  });

  it("returns 0.75 when avg is well below threshold", () => {
    expect(responseTimeMultiplier(15)).toBe(0.75);
    expect(responseTimeMultiplier(30)).toBe(0.75);
    expect(responseTimeMultiplier(59)).toBe(0.75);
  });

  it("returns 1.0 when avg is just above threshold", () => {
    expect(responseTimeMultiplier(61)).toBe(1.0);
    expect(responseTimeMultiplier(120)).toBe(1.0);
    expect(responseTimeMultiplier(1440)).toBe(1.0);
  });
});

describe("qualifiesForResponseTimeReward", () => {
  it("true when below threshold", () => {
    expect(qualifiesForResponseTimeReward(30)).toBe(true);
    expect(qualifiesForResponseTimeReward(60)).toBe(true);
  });

  it("false when above threshold or null", () => {
    expect(qualifiesForResponseTimeReward(61)).toBe(false);
    expect(qualifiesForResponseTimeReward(null)).toBe(false);
    expect(qualifiesForResponseTimeReward(undefined)).toBe(false);
  });
});

describe("stacks with cross-border + tier multipliers (composability check)", () => {
  // priceCents = base × tier × crossBorder × responseTime
  // base = $39 = 3900 cents
  it("standard tier × no cross-border × fast response = $29.25", () => {
    const result = Math.round(3900 * 1 * 1.0 * responseTimeMultiplier(30));
    expect(result).toBe(2925); // $29.25
  });

  it("international tier × cross-border × fast response = $153.56", () => {
    // 3900 × 3 × 1.75 × 0.75 = 15356.25 → 15356
    const result = Math.round(3900 * 3 * 1.75 * responseTimeMultiplier(30));
    expect(result).toBe(15356);
  });

  it("standard tier × no cross-border × slow response = $39 (no discount)", () => {
    const result = Math.round(3900 * 1 * 1.0 * responseTimeMultiplier(180));
    expect(result).toBe(3900);
  });
});
