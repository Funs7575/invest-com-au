import { describe, it, expect } from "vitest";
import {
  scoreQuizResults,
  ANSWER_WEIGHT_MAP,
  type QuizWeights,
} from "@/lib/quiz-scoring";
import type { Broker } from "@/lib/types";

// Minimal mock broker factory
const mockBroker = (overrides: Partial<Broker>): Broker =>
  ({
    id: 1,
    name: "Test Broker",
    slug: "test",
    color: "#000",
    chess_sponsored: false,
    smsf_support: false,
    is_crypto: false,
    deal: false,
    editors_pick: false,
    status: "active",
    rating: 4,
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
    ...overrides,
  }) as Broker;

const makeWeights = (overrides: Partial<QuizWeights> = {}): QuizWeights => ({
  beginner: 5,
  low_fee: 5,
  us_shares: 5,
  smsf: 5,
  crypto: 5,
  advanced: 5,
  ...overrides,
});

describe("ANSWER_WEIGHT_MAP", () => {
  it("maps crypto to crypto", () => {
    expect(ANSWER_WEIGHT_MAP["crypto"]).toBe("crypto");
  });

  it("maps trade to advanced", () => {
    expect(ANSWER_WEIGHT_MAP["trade"]).toBe("advanced");
  });

  it("maps income to low_fee", () => {
    expect(ANSWER_WEIGHT_MAP["income"]).toBe("low_fee");
  });

  it("maps grow to beginner", () => {
    expect(ANSWER_WEIGHT_MAP["grow"]).toBe("beginner");
  });

  it("maps beginner to beginner", () => {
    expect(ANSWER_WEIGHT_MAP["beginner"]).toBe("beginner");
  });

  it("maps intermediate to low_fee", () => {
    expect(ANSWER_WEIGHT_MAP["intermediate"]).toBe("low_fee");
  });

  it("maps pro to advanced", () => {
    expect(ANSWER_WEIGHT_MAP["pro"]).toBe("advanced");
  });

  it("maps small to beginner", () => {
    expect(ANSWER_WEIGHT_MAP["small"]).toBe("beginner");
  });

  it("maps medium to low_fee", () => {
    expect(ANSWER_WEIGHT_MAP["medium"]).toBe("low_fee");
  });

  it("maps large to us_shares", () => {
    expect(ANSWER_WEIGHT_MAP["large"]).toBe("us_shares");
  });

  it("maps whale to advanced", () => {
    expect(ANSWER_WEIGHT_MAP["whale"]).toBe("advanced");
  });

  it("maps fees to low_fee", () => {
    expect(ANSWER_WEIGHT_MAP["fees"]).toBe("low_fee");
  });

  it("maps safety to beginner", () => {
    expect(ANSWER_WEIGHT_MAP["safety"]).toBe("beginner");
  });

  it("maps tools to advanced", () => {
    expect(ANSWER_WEIGHT_MAP["tools"]).toBe("advanced");
  });

  it("maps simple to beginner", () => {
    expect(ANSWER_WEIGHT_MAP["simple"]).toBe("beginner");
  });
});

describe("scoreQuizResults", () => {
  it("ranks broker with higher crypto weight first for crypto answer", () => {
    const brokerA = mockBroker({ slug: "a", name: "Alpha", rating: 4 });
    const brokerB = mockBroker({ slug: "b", name: "Beta", rating: 4 });

    const weights: Record<string, QuizWeights> = {
      a: makeWeights({ crypto: 10 }),
      b: makeWeights({ crypto: 3 }),
    };

    const results = scoreQuizResults(["crypto"], weights, [brokerA, brokerB]);
    expect(results[0].slug).toBe("a");
    expect(results[0].total).toBeGreaterThan(results[1].total);
  });

  it("applies rating multiplier: 4.5 rating gets total *= 1.05", () => {
    const broker = mockBroker({ slug: "x", name: "X", rating: 4.5 });
    const weights: Record<string, QuizWeights> = {
      x: makeWeights({ crypto: 10 }),
    };

    const results = scoreQuizResults(["crypto"], weights, [broker]);
    // Base total = 10, with 4.5 rating: 10 * (1 + (4.5 - 4) * 0.1) = 10 * 1.05 = 10.5
    expect(results[0].total).toBeCloseTo(10.5);
  });

  it("applies rating multiplier: 3.5 rating gets total *= 0.95", () => {
    const broker = mockBroker({ slug: "y", name: "Y", rating: 3.5 });
    const weights: Record<string, QuizWeights> = {
      y: makeWeights({ advanced: 10 }),
    };

    const results = scoreQuizResults(["trade"], weights, [broker]);
    // Base total = 10, with 3.5 rating: 10 * (1 + (3.5 - 4) * 0.1) = 10 * 0.95 = 9.5
    expect(results[0].total).toBeCloseTo(9.5);
  });

  it("breaks ties by higher rating first", () => {
    const brokerA = mockBroker({ slug: "a", name: "Alpha", rating: 4.5 });
    const brokerB = mockBroker({ slug: "b", name: "Beta", rating: 4.0 });

    // Both have equal base weights; rating multiplier should differentiate
    // But for a clean tie test, we want equal final scores.
    // Actually the rating multiplier will make them different.
    // Let's make them have the same final total by adjusting weights.

    // brokerA: total = w * (1 + (4.5 - 4) * 0.1) = w * 1.05
    // brokerB: total = w * (1 + (4.0 - 4) * 0.1) = w * 1.0
    // For equal totals: wA * 1.05 = wB * 1.0 => wA = wB / 1.05
    // Let's use wA = 20, wB = 21
    const weights: Record<string, QuizWeights> = {
      a: makeWeights({ beginner: 20 }),
      b: makeWeights({ beginner: 21 }),
    };

    // brokerA total: 20 * 1.05 = 21.0
    // brokerB total: 21 * 1.0 = 21.0
    const results = scoreQuizResults(["beginner"], weights, [brokerA, brokerB]);
    // Both totals are 21.0, tiebreaker: higher rating wins
    expect(results[0].slug).toBe("a");
    expect(results[1].slug).toBe("b");
  });

  it("breaks ties by alphabetical name when scores and ratings are equal", () => {
    const brokerA = mockBroker({ slug: "a", name: "Alpha", rating: 4.0 });
    const brokerB = mockBroker({ slug: "b", name: "Beta", rating: 4.0 });

    const weights: Record<string, QuizWeights> = {
      a: makeWeights({ beginner: 10 }),
      b: makeWeights({ beginner: 10 }),
    };

    const results = scoreQuizResults(["beginner"], weights, [brokerA, brokerB]);
    // Same score, same rating -> alphabetical: Alpha before Beta
    expect(results[0].slug).toBe("a");
    expect(results[1].slug).toBe("b");
  });

  it("applies sponsor boost: featured_partner in position 2 moves to position 1", () => {
    // Create 3 brokers; the sponsored one should rank 2nd by score, then get boosted to 1st
    const brokerTop = mockBroker({ slug: "top", name: "Top", rating: 5.0, sponsorship_tier: null });
    const brokerSponsored = mockBroker({ slug: "sponsored", name: "Sponsored", rating: 4.5, sponsorship_tier: "featured_partner" });
    const brokerThird = mockBroker({ slug: "third", name: "Third", rating: 4.0, sponsorship_tier: null });

    const weights: Record<string, QuizWeights> = {
      top: makeWeights({ beginner: 10 }),
      sponsored: makeWeights({ beginner: 9 }),
      third: makeWeights({ beginner: 5 }),
    };

    const results = scoreQuizResults(["beginner"], weights, [brokerTop, brokerSponsored, brokerThird]);

    // Without sponsor boost, order would be: top, sponsored, third
    // Sponsor boost swaps position 1 (sponsored) up to position 0
    expect(results[0].slug).toBe("sponsored");
    expect(results[1].slug).toBe("top");
  });

  it("returns exactly 3 results even with 10 brokers", () => {
    const brokers: Broker[] = [];
    const weights: Record<string, QuizWeights> = {};

    for (let i = 0; i < 10; i++) {
      const slug = `broker-${i}`;
      brokers.push(mockBroker({ slug, name: `Broker ${i}`, rating: 4.0 + i * 0.1 }));
      weights[slug] = makeWeights({ beginner: 5 + i });
    }

    const results = scoreQuizResults(["beginner"], weights, brokers);
    expect(results).toHaveLength(3);
  });

  it("returns results with empty answers, sorted by rating", () => {
    const brokerA = mockBroker({ slug: "a", name: "Alpha", rating: 4.5 });
    const brokerB = mockBroker({ slug: "b", name: "Beta", rating: 3.0 });
    const brokerC = mockBroker({ slug: "c", name: "Charlie", rating: 5.0 });

    const weights: Record<string, QuizWeights> = {
      a: makeWeights(),
      b: makeWeights(),
      c: makeWeights(),
    };

    const results = scoreQuizResults([], weights, [brokerA, brokerB, brokerC]);
    expect(results).toHaveLength(3);
    // With no answers, all base totals are 0.
    // Rating multiplier: 0 * anything = 0. All totals are 0.
    // Tiebreaker: sort by rating DESC then name ASC.
    expect(results[0].slug).toBe("c"); // rating 5.0
    expect(results[1].slug).toBe("a"); // rating 4.5
    expect(results[2].slug).toBe("b"); // rating 3.0
  });

  it("applies campaign winner boost: winner in positions 1-5 swaps up by 1", () => {
    // Create 4 brokers, the campaign winner should be in position 2 naturally and swap to 1
    const brokerTop = mockBroker({ slug: "top", name: "Top", rating: 4.5 });
    const brokerCampaign = mockBroker({ slug: "campaign", name: "Campaign", rating: 4.0 });
    const brokerThird = mockBroker({ slug: "third", name: "Third", rating: 3.5 });

    const weights: Record<string, QuizWeights> = {
      top: makeWeights({ beginner: 10 }),
      campaign: makeWeights({ beginner: 8 }),
      third: makeWeights({ beginner: 5 }),
    };

    const quizCampaignWinners = [{ broker_slug: "campaign" }];
    const results = scoreQuizResults(
      ["beginner"],
      weights,
      [brokerTop, brokerCampaign, brokerThird],
      quizCampaignWinners
    );

    // Without campaign boost, order: top, campaign, third
    // Campaign boost swaps position 1 (campaign) up to position 0
    expect(results[0].slug).toBe("campaign");
    expect(results[1].slug).toBe("top");
  });

  it("sums scores across multiple answers per broker", () => {
    const broker = mockBroker({ slug: "x", name: "X", rating: 4.0 });
    const weights: Record<string, QuizWeights> = {
      x: makeWeights({ crypto: 10, advanced: 8, low_fee: 6 }),
    };

    // answers: crypto -> crypto(10), trade -> advanced(8), fees -> low_fee(6) = 24
    // rating multiplier: 24 * (1 + (4 - 4) * 0.1) = 24 * 1.0 = 24
    const results = scoreQuizResults(
      ["crypto", "trade", "fees"],
      weights,
      [broker]
    );
    expect(results[0].total).toBeCloseTo(24);
  });

  it("falls back to beginner weight for unknown answer keys", () => {
    const broker = mockBroker({ slug: "x", name: "X", rating: 4.0 });
    const weights: Record<string, QuizWeights> = {
      x: makeWeights({ beginner: 7 }),
    };

    // Unknown key "unknown_key" falls back to beginner weight = 7
    const results = scoreQuizResults(["unknown_key"], weights, [broker]);
    expect(results[0].total).toBeCloseTo(7);
  });

  it("returns broker as null when broker is not found in broker list", () => {
    const weights: Record<string, QuizWeights> = {
      "missing-broker": makeWeights({ beginner: 10 }),
    };

    const results = scoreQuizResults(["beginner"], weights, []);
    expect(results[0].broker).toBeNull();
    expect(results[0].slug).toBe("missing-broker");
  });
});
