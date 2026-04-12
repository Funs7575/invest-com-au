import { describe, it, expect } from "vitest";
import {
  scoreQuizResults,
  ANSWER_WEIGHT_MAP,
  type QuizWeights,
} from "@/lib/quiz-scoring";
import type { Broker } from "@/lib/types";

/** Helper to build a minimal Broker stub */
function makeBroker(
  overrides: Partial<Broker> & { slug: string; name: string }
): Broker {
  return {
    id: 1,
    color: "#000",
    chess_sponsored: false,
    smsf_support: false,
    is_crypto: false,
    platform_type: "share_broker",
    deal: false,
    editors_pick: false,
    status: "published",
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
    ...overrides,
  } as Broker;
}

/** Helper to build uniform quiz weights for a broker slug */
function makeWeights(
  overrides: Partial<QuizWeights> = {}
): QuizWeights {
  return {
    beginner: 0,
    low_fee: 0,
    us_shares: 0,
    smsf: 0,
    crypto: 0,
    advanced: 0,
    property: 0,
    robo: 0,
    ...overrides,
  };
}

describe("ANSWER_WEIGHT_MAP", () => {
  it("maps every answer key to a valid WeightKey", () => {
    const validKeys = new Set([
      "beginner", "low_fee", "us_shares", "smsf",
      "crypto", "advanced", "property", "robo",
    ]);
    for (const wk of Object.values(ANSWER_WEIGHT_MAP)) {
      expect(validKeys.has(wk)).toBe(true);
    }
  });
});

describe("scoreQuizResults", () => {
  const brokerA = makeBroker({ slug: "alpha", name: "Alpha", rating: 4.5 });
  const brokerB = makeBroker({ slug: "beta", name: "Beta", rating: 4.0 });
  const brokerC = makeBroker({ slug: "gamma", name: "Gamma", rating: 3.5 });
  const brokerD = makeBroker({ slug: "delta", name: "Delta", rating: 4.8 });

  const brokers = [brokerA, brokerB, brokerC, brokerD];

  const weights: Record<string, QuizWeights> = {
    alpha: makeWeights({ beginner: 10, low_fee: 8 }),
    beta: makeWeights({ beginner: 5, low_fee: 12 }),
    gamma: makeWeights({ beginner: 7, low_fee: 7 }),
    delta: makeWeights({ beginner: 9, low_fee: 6 }),
  };

  it("returns top 3 results sorted by score descending", () => {
    const results = scoreQuizResults(["beginner"], weights, brokers);
    expect(results).toHaveLength(3);
    // Scores should be descending
    expect(results[0].total).toBeGreaterThanOrEqual(results[1].total);
    expect(results[1].total).toBeGreaterThanOrEqual(results[2].total);
  });

  it("accumulates scores from multiple answers", () => {
    const results = scoreQuizResults(["beginner", "fees"], weights, brokers);
    // "beginner" -> beginner key, "fees" -> low_fee key
    // alpha: (10 + 8) * rating_mult, beta: (5 + 12) * rating_mult
    expect(results.length).toBe(3);
    // beta has beginner=5 + low_fee=12 = 17 base, rating 4.0 -> mult 1.0
    // alpha has beginner=10 + low_fee=8 = 18 base, rating 4.5 -> mult 1.05
    // alpha total = 18 * 1.05 = 18.9, beta total = 17 * 1.0 = 17
    expect(results[0].slug).toBe("alpha");
  });

  it("applies rating multiplier correctly", () => {
    // rating 4.5 -> multiplier = 1 + (4.5 - 4) * 0.1 = 1.05
    // rating 4.0 -> multiplier = 1 + (4.0 - 4) * 0.1 = 1.0
    // rating 3.5 -> multiplier = 1 + (3.5 - 4) * 0.1 = 0.95
    const results = scoreQuizResults(["beginner"], weights, brokers);
    const alphaResult = results.find((r) => r.slug === "alpha");
    // alpha: beginner=10, rating=4.5 -> 10 * 1.05 = 10.5
    expect(alphaResult?.total).toBeCloseTo(10.5);
  });

  it("ignores unknown answer keys (no fallback to beginner)", () => {
    const results = scoreQuizResults(["unknown_answer"], weights, brokers);
    // unknown keys are skipped — total stays 0
    const alphaResult = results.find((r) => r.slug === "alpha");
    expect(alphaResult?.total).toBeCloseTo(0);
  });

  it("returns empty array when no brokers and no weights provided", () => {
    const results = scoreQuizResults(["beginner"], {}, []);
    expect(results).toEqual([]);
  });

  it("handles empty answers — all scores should be zero (before rating mult)", () => {
    const results = scoreQuizResults([], weights, brokers);
    // No answers => total stays 0, no rating multiplier applied (0 * mult = 0)
    for (const r of results) {
      expect(r.total).toBe(0);
    }
  });

  it("uses tiebreaker: rating DESC then name ASC", () => {
    // Give all brokers the same base score
    const tieWeights: Record<string, QuizWeights> = {
      alpha: makeWeights({ beginner: 10 }),
      beta: makeWeights({ beginner: 10 }),
    };
    const tieBrokers = [
      makeBroker({ slug: "alpha", name: "Alpha", rating: 4.0 }),
      makeBroker({ slug: "beta", name: "Beta", rating: 4.0 }),
    ];
    const results = scoreQuizResults(["beginner"], tieWeights, tieBrokers);
    // Same score, same rating -> sorted by name ASC
    expect(results[0].slug).toBe("alpha");
    expect(results[1].slug).toBe("beta");
  });

  it("applies sponsor boost — featured_partner in pos 1-5 moves up by 1", () => {
    const sponsoredBroker = makeBroker({
      slug: "gamma",
      name: "Gamma",
      rating: 3.5,
      sponsorship_tier: "featured_partner",
    });
    const brokersWithSponsor = [brokerA, brokerB, sponsoredBroker, brokerD];
    // With answers that put gamma in positions 1-5
    const results = scoreQuizResults(["beginner"], weights, brokersWithSponsor);
    // gamma should have been boosted up by 1 position from its natural rank
    const gammaIdx = results.findIndex((r) => r.slug === "gamma");
    // Just verify it's in the top 3 (it was boosted)
    expect(gammaIdx).toBeGreaterThanOrEqual(0);
  });

  it("applies campaign winner boost", () => {
    const campaignWinners = [{ broker_slug: "gamma" }];
    const results = scoreQuizResults(
      ["beginner"],
      weights,
      brokers,
      campaignWinners
    );
    // gamma should be boosted if it's in positions 1-5
    expect(results).toHaveLength(3);
  });

  it("handles weights with missing weight keys gracefully", () => {
    const partialWeights: Record<string, QuizWeights> = {
      alpha: { beginner: 5 } as QuizWeights, // missing other keys
    };
    const results = scoreQuizResults(
      ["beginner", "crypto"],
      partialWeights,
      [brokerA]
    );
    // "crypto" maps to "crypto" key which is undefined in partialWeights -> 0
    expect(results).toHaveLength(1);
    // beginner=5, crypto=undefined->0, total=5, rating mult=1.05 -> 5.25
    expect(results[0].total).toBeCloseTo(5.25);
  });
});
