import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: () => ({}) }),
}));

import {
  scoreBrokerForContext,
  type ScorableBroker,
  type BrokerRecommendationContext,
} from "@/lib/broker-recommendations";

function makeBroker(overrides: Partial<ScorableBroker> = {}): ScorableBroker {
  return {
    slug: "test-broker",
    name: "Test Broker",
    rating: 4,
    us_fee_value: null,
    asx_fee_value: null,
    ...overrides,
  };
}

describe("scoreBrokerForContext", () => {
  it("baseline is rating * 10 with no context", () => {
    expect(scoreBrokerForContext(makeBroker({ rating: 4.5 }), {})).toBe(45);
  });

  it("defaults rating to 3 when null (baseline 30)", () => {
    expect(scoreBrokerForContext(makeBroker({ rating: null }), {})).toBe(30);
  });

  it("adds +100 when the broker is the quiz top_match_slug", () => {
    const ctx: BrokerRecommendationContext = { top_match_slug: "test-broker" };
    expect(scoreBrokerForContext(makeBroker({ rating: 4 }), ctx)).toBe(
      40 + 100,
    );
  });

  it("does NOT apply the top_match boost to other brokers", () => {
    const ctx: BrokerRecommendationContext = { top_match_slug: "someone-else" };
    expect(scoreBrokerForContext(makeBroker({ rating: 4 }), ctx)).toBe(40);
  });

  it("boosts us_shares brokers by (20 - us_fee_value), floored at 0", () => {
    const ctx: BrokerRecommendationContext = { trading_interest: "us_shares" };
    expect(
      scoreBrokerForContext(makeBroker({ rating: 4, us_fee_value: 5 }), ctx),
    ).toBe(40 + 15);
    expect(
      scoreBrokerForContext(makeBroker({ rating: 4, us_fee_value: 0 }), ctx),
    ).toBe(40 + 20);
    expect(
      scoreBrokerForContext(makeBroker({ rating: 4, us_fee_value: 25 }), ctx),
    ).toBe(40); // negative capped
  });

  it("does not apply the us_shares boost when trading_interest is unrelated", () => {
    const ctx: BrokerRecommendationContext = { trading_interest: "crypto" };
    expect(
      scoreBrokerForContext(makeBroker({ rating: 4, us_fee_value: 0 }), ctx),
    ).toBe(40);
  });

  it("does not apply us_shares boost when us_fee_value is null (we don't know the fee)", () => {
    const ctx: BrokerRecommendationContext = { trading_interest: "us_shares" };
    expect(
      scoreBrokerForContext(makeBroker({ rating: 4, us_fee_value: null }), ctx),
    ).toBe(40);
  });

  it("adds +15 to beginners on brokers with rating > 4", () => {
    const ctx: BrokerRecommendationContext = { experience_level: "beginner" };
    expect(scoreBrokerForContext(makeBroker({ rating: 4.5 }), ctx)).toBe(
      45 + 15,
    );
  });

  it("does NOT apply the beginner boost at rating exactly 4 (strict >)", () => {
    const ctx: BrokerRecommendationContext = { experience_level: "beginner" };
    expect(scoreBrokerForContext(makeBroker({ rating: 4 }), ctx)).toBe(40);
  });

  it("is case-insensitive on experience_level", () => {
    const ctx: BrokerRecommendationContext = { experience_level: "BEGINNER" };
    expect(scoreBrokerForContext(makeBroker({ rating: 4.5 }), ctx)).toBe(
      45 + 15,
    );
  });

  it.each(["large", "xlarge", "whale", "$50,000", "$100,000"])(
    "applies the ASX-fee boost on investment_range '%s'",
    (range) => {
      const ctx: BrokerRecommendationContext = { investment_range: range };
      expect(
        scoreBrokerForContext(
          makeBroker({ rating: 4, asx_fee_value: 5 }),
          ctx,
        ),
      ).toBe(40 + 10); // 15 - 5
    },
  );

  it("does NOT apply the ASX boost for small/beginner cohorts", () => {
    const ctx: BrokerRecommendationContext = { investment_range: "under_5k" };
    expect(
      scoreBrokerForContext(
        makeBroker({ rating: 4, asx_fee_value: 5 }),
        ctx,
      ),
    ).toBe(40);
  });

  it("floors the ASX boost at 0 when the fee exceeds 15", () => {
    const ctx: BrokerRecommendationContext = { investment_range: "whale" };
    expect(
      scoreBrokerForContext(
        makeBroker({ rating: 4, asx_fee_value: 30 }),
        ctx,
      ),
    ).toBe(40);
  });

  it("stacks all boosts — quiz top match + us_shares + beginner + whale", () => {
    const ctx: BrokerRecommendationContext = {
      top_match_slug: "top-pick",
      trading_interest: "us_shares,etfs",
      experience_level: "beginner",
      investment_range: "whale",
    };
    const b = makeBroker({
      slug: "top-pick",
      rating: 4.5,
      us_fee_value: 0,
      asx_fee_value: 0,
    });
    // baseline 45 + top 100 + us 20 + beginner 15 + asx 15
    expect(scoreBrokerForContext(b, ctx)).toBe(195);
  });
});
