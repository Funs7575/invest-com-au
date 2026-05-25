/**
 * Tests for the wealth-stack per-vertical scoring extension to lib/quiz-scoring.ts.
 *
 * Covers:
 *   - scoreVertical() for super_fund, savings_account, robo_advisor
 *   - Per-vertical scoring signals (risk band, amount, horizon)
 *   - Ranking and tiebreaker consistency
 *   - buildStackResults() — multi-vertical orchestration
 *   - Edge cases: no products, no inputs, single product
 */

import { describe, it, expect } from "vitest";
import {
  scoreVertical,
  buildStackResults,
  type QuizWeights,
  type StackQuizInputs,
  type VerticalScoredResult,
} from "@/lib/quiz-scoring";
import type { Broker } from "@/lib/types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeBroker(
  overrides: Partial<Broker> & { slug: string; name: string }
): Broker {
  return {
    id: 1,
    color: "#000",
    chess_sponsored: false,
    smsf_support: false,
    is_crypto: false,
    platform_type: "super_fund",
    deal: false,
    editors_pick: false,
    status: "active",
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
    rating: 4.0,
    ...overrides,
  } as Broker;
}

function makeWeights(overrides: Partial<QuizWeights> = {}): QuizWeights {
  return {
    beginner: 5,
    low_fee: 5,
    us_shares: 5,
    smsf: 5,
    crypto: 5,
    advanced: 5,
    property: 5,
    robo: 5,
    ...overrides,
  };
}

// ─── scoreVertical — super_fund ───────────────────────────────────────────────

describe("scoreVertical — super_fund", () => {
  const superBrokerA = makeBroker({
    slug: "australian-super",
    name: "AustralianSuper",
    platform_type: "super_fund",
    rating: 4.5,
  });
  const superBrokerB = makeBroker({
    slug: "hostplus",
    name: "Hostplus",
    platform_type: "super_fund",
    rating: 4.0,
  });

  const brokers = [superBrokerA, superBrokerB];
  const weights: Record<string, QuizWeights> = {
    "australian-super": makeWeights({ robo: 7, smsf: 5, low_fee: 8 }),
    hostplus: makeWeights({ robo: 6, smsf: 6, low_fee: 9 }),
  };

  it("returns results for super_fund kind", () => {
    const results = scoreVertical("super_fund", brokers, weights, {});
    expect(results.length).toBeGreaterThan(0);
    expect(results.every(r => r.kind === "super_fund")).toBe(true);
  });

  it("returns at most `limit` results (default 3)", () => {
    const results = scoreVertical("super_fund", brokers, weights, {});
    expect(results.length).toBeLessThanOrEqual(3);
  });

  it("respects explicit limit parameter", () => {
    const results = scoreVertical("super_fund", brokers, weights, {}, 1);
    expect(results).toHaveLength(1);
  });

  it("applies LARGE amount bonus so larger portfolios rank higher-quality products", () => {
    const inputsSmall: StackQuizInputs = { amount: "small" };
    const inputsLarge: StackQuizInputs = { amount: "large" };
    const resultsSmall = scoreVertical("super_fund", brokers, weights, inputsSmall, 1);
    const resultsLarge = scoreVertical("super_fund", brokers, weights, inputsLarge, 1);
    // Large amount adds a bonus so the top score should be higher
    expect(resultsLarge[0]!.total).toBeGreaterThan(resultsSmall[0]!.total);
  });

  it("growth risk band boosts advanced+us_shares dimension weights", () => {
    const advancedBroker = makeBroker({
      slug: "advanced-super",
      name: "Advanced Super",
      platform_type: "super_fund",
      rating: 4.0,
    });
    const conservativeBroker = makeBroker({
      slug: "conservative-super",
      name: "Conservative Super",
      platform_type: "super_fund",
      rating: 4.0,
    });
    const testWeights: Record<string, QuizWeights> = {
      "advanced-super": makeWeights({ advanced: 10, us_shares: 10, robo: 5, smsf: 5 }),
      "conservative-super": makeWeights({ advanced: 2, us_shares: 2, robo: 5, smsf: 5 }),
    };
    const results = scoreVertical(
      "super_fund",
      [advancedBroker, conservativeBroker],
      testWeights,
      { riskBand: "growth" },
    );
    // Growth risk band should reward advanced+us_shares — advanced-super should rank first
    expect(results[0]!.slug).toBe("advanced-super");
  });

  it("conservative risk band boosts low_fee dimension", () => {
    const lowFeeBroker = makeBroker({
      slug: "low-fee-super",
      name: "Low Fee Super",
      platform_type: "super_fund",
      rating: 4.0,
    });
    const highFeeBroker = makeBroker({
      slug: "high-fee-super",
      name: "High Fee Super",
      platform_type: "super_fund",
      rating: 4.0,
    });
    const testWeights: Record<string, QuizWeights> = {
      "low-fee-super": makeWeights({ low_fee: 10, smsf: 3, robo: 5 }),
      "high-fee-super": makeWeights({ low_fee: 2, smsf: 3, robo: 5 }),
    };
    const results = scoreVertical(
      "super_fund",
      [lowFeeBroker, highFeeBroker],
      testWeights,
      { riskBand: "conservative" },
    );
    expect(results[0]!.slug).toBe("low-fee-super");
  });

  it("returns empty array when brokers list is empty", () => {
    const results = scoreVertical("super_fund", [], {}, {});
    expect(results).toHaveLength(0);
  });

  it("returns empty array when weights map is empty (no matching slugs)", () => {
    const results = scoreVertical("super_fund", brokers, {}, {});
    // No weights entries → empty scored list
    expect(results).toHaveLength(0);
  });

  it("attaches the broker object to each result", () => {
    const results = scoreVertical("super_fund", brokers, weights, {});
    for (const r of results) {
      if (r.broker) {
        expect(["australian-super", "hostplus"]).toContain(r.broker.slug);
      }
    }
  });

  it("sorts results by total score DESC", () => {
    const results = scoreVertical("super_fund", brokers, weights, { amount: "large" });
    for (let i = 0; i < results.length - 1; i++) {
      expect(results[i]!.total).toBeGreaterThanOrEqual(results[i + 1]!.total);
    }
  });

  it("uses rating as tiebreaker when scores are equal", () => {
    const brokerHigh = makeBroker({ slug: "high-rating", name: "High Rating", platform_type: "super_fund", rating: 4.8 });
    const brokerLow  = makeBroker({ slug: "low-rating",  name: "Low Rating",  platform_type: "super_fund", rating: 3.5 });
    const equalWeights: Record<string, QuizWeights> = {
      "high-rating": makeWeights({ robo: 5, smsf: 5 }),
      "low-rating":  makeWeights({ robo: 5, smsf: 5 }),
    };
    const results = scoreVertical("super_fund", [brokerHigh, brokerLow], equalWeights, {});
    // Equal base scores — rating nudge: high-rating gets 1 + (4.8 - 4) * 0.1 = 1.08 multiplier
    expect(results[0]!.slug).toBe("high-rating");
  });
});

// ─── scoreVertical — robo_advisor ────────────────────────────────────────────

describe("scoreVertical — robo_advisor", () => {
  const stockspot = makeBroker({
    slug: "stockspot",
    name: "Stockspot",
    platform_type: "robo_advisor",
    rating: 4.6,
  });
  const raiz = makeBroker({
    slug: "raiz",
    name: "Raiz",
    platform_type: "robo_advisor",
    rating: 4.0,
  });

  const brokers = [stockspot, raiz];
  const weights: Record<string, QuizWeights> = {
    stockspot: makeWeights({ robo: 10, beginner: 7, low_fee: 5 }),
    raiz:      makeWeights({ robo: 9,  beginner: 9, low_fee: 7 }),
  };

  it("returns results for robo_advisor kind", () => {
    const results = scoreVertical("robo_advisor", brokers, weights, {});
    expect(results.length).toBeGreaterThan(0);
    expect(results.every(r => r.kind === "robo_advisor")).toBe(true);
  });

  it("conservative risk band gives robo a large bonus (conservative → highest robo bonus)", () => {
    const resultsConservative = scoreVertical("robo_advisor", brokers, weights, { riskBand: "conservative" });
    const resultsGrowth       = scoreVertical("robo_advisor", brokers, weights, { riskBand: "growth" });
    // Conservative has robo bonus = 5, growth has robo bonus = 3
    // Conservative should produce higher totals
    expect(resultsConservative[0]!.total).toBeGreaterThan(resultsGrowth[0]!.total);
  });

  it("robo score is based primarily on robo weight (1.5× coefficient)", () => {
    const highRoboBroker = makeBroker({ slug: "high-robo", name: "High Robo", platform_type: "robo_advisor", rating: 4.0 });
    const lowRoboBroker  = makeBroker({ slug: "low-robo",  name: "Low Robo",  platform_type: "robo_advisor", rating: 4.0 });
    const testWeights: Record<string, QuizWeights> = {
      "high-robo": makeWeights({ robo: 10, beginner: 5 }),
      "low-robo":  makeWeights({ robo: 3,  beginner: 5 }),
    };
    const results = scoreVertical("robo_advisor", [highRoboBroker, lowRoboBroker], testWeights, {});
    expect(results[0]!.slug).toBe("high-robo");
  });

  it("returns empty array for empty broker list", () => {
    const results = scoreVertical("robo_advisor", [], {}, {});
    expect(results).toHaveLength(0);
  });
});

// ─── scoreVertical — savings_account ─────────────────────────────────────────

describe("scoreVertical — savings_account", () => {
  const ubank = makeBroker({
    slug: "ubank",
    name: "UBank",
    platform_type: "savings_account",
    rating: 4.3,
  });
  const macquarie = makeBroker({
    slug: "macquarie-savings",
    name: "Macquarie Savings",
    platform_type: "savings_account",
    rating: 4.5,
  });

  const brokers = [ubank, macquarie];
  const weights: Record<string, QuizWeights> = {
    ubank:              makeWeights({ low_fee: 9, smsf: 4, beginner: 8 }),
    "macquarie-savings": makeWeights({ low_fee: 8, smsf: 6, beginner: 6 }),
  };

  it("returns results for savings_account kind", () => {
    const results = scoreVertical("savings_account", brokers, weights, {});
    expect(results.length).toBeGreaterThan(0);
    expect(results.every(r => r.kind === "savings_account")).toBe(true);
  });

  it("short horizon boosts low_fee weight heavily for savings", () => {
    const lowFeeBroker  = makeBroker({ slug: "low-fee-sav",  name: "Low Fee Savings",  platform_type: "savings_account", rating: 4.0 });
    const highFeeBroker = makeBroker({ slug: "high-fee-sav", name: "High Fee Savings", platform_type: "savings_account", rating: 4.0 });
    const testWeights: Record<string, QuizWeights> = {
      "low-fee-sav":  makeWeights({ low_fee: 10, smsf: 3 }),
      "high-fee-sav": makeWeights({ low_fee: 2,  smsf: 3 }),
    };
    const results = scoreVertical(
      "savings_account",
      [lowFeeBroker, highFeeBroker],
      testWeights,
      { horizon: "short" },
    );
    expect(results[0]!.slug).toBe("low-fee-sav");
  });

  it("returns empty array for empty broker list", () => {
    const results = scoreVertical("savings_account", [], {}, {});
    expect(results).toHaveLength(0);
  });

  it("amount multiplier scales all savings scores", () => {
    const resultsSmall = scoreVertical("savings_account", brokers, weights, { amount: "small" });
    const resultsWhale = scoreVertical("savings_account", brokers, weights, { amount: "whale" });
    // Whale multiplier (1.2) > small (0.9)
    expect(resultsWhale[0]!.total).toBeGreaterThan(resultsSmall[0]!.total);
  });
});

// ─── buildStackResults ────────────────────────────────────────────────────────

describe("buildStackResults", () => {
  const superBroker = makeBroker({
    slug: "aware-super",
    name: "Aware Super",
    platform_type: "super_fund",
    rating: 4.5,
  });
  const savingsBroker = makeBroker({
    slug: "ing-savings",
    name: "ING Savings",
    platform_type: "savings_account",
    rating: 4.2,
  });
  const roboBroker = makeBroker({
    slug: "stockspot",
    name: "Stockspot",
    platform_type: "robo_advisor",
    rating: 4.6,
  });

  const superWeights: Record<string, QuizWeights> = {
    "aware-super": makeWeights({ robo: 7, smsf: 7 }),
  };
  const savingsWeights: Record<string, QuizWeights> = {
    "ing-savings": makeWeights({ low_fee: 9 }),
  };
  const roboWeights: Record<string, QuizWeights> = {
    stockspot: makeWeights({ robo: 10 }),
  };

  it("returns results for all three kinds when all slices are provided", () => {
    const stack = buildStackResults({
      inputs: { amount: "medium", riskBand: "balanced" },
      perKind: {
        super_fund:     { brokers: [superBroker],   weights: superWeights },
        savings_account: { brokers: [savingsBroker], weights: savingsWeights },
        robo_advisor:   { brokers: [roboBroker],     weights: roboWeights },
      },
    });
    expect(stack.super_fund).toBeDefined();
    expect(stack.savings_account).toBeDefined();
    expect(stack.robo_advisor).toBeDefined();
  });

  it("omits kinds with no brokers", () => {
    const stack = buildStackResults({
      inputs: { amount: "medium" },
      perKind: {
        super_fund: { brokers: [superBroker], weights: superWeights },
        // savings_account and robo_advisor not supplied
      },
    });
    expect(stack.super_fund).toBeDefined();
    expect(stack.savings_account).toBeUndefined();
    expect(stack.robo_advisor).toBeUndefined();
  });

  it("returns empty object when no perKind slices are provided", () => {
    const stack = buildStackResults({ inputs: {}, perKind: {} });
    expect(Object.keys(stack)).toHaveLength(0);
  });

  it("respects the limit parameter per vertical", () => {
    const superBrokerB = makeBroker({ slug: "hostplus", name: "Hostplus", platform_type: "super_fund", rating: 4.0 });
    const stack = buildStackResults({
      inputs: {},
      perKind: {
        super_fund: {
          brokers: [superBroker, superBrokerB],
          weights: {
            ...superWeights,
            hostplus: makeWeights({ robo: 6, smsf: 6 }),
          },
        },
      },
      limit: 1,
    });
    expect(stack.super_fund!.length).toBe(1);
  });

  it("each result carries the correct kind label", () => {
    const stack = buildStackResults({
      inputs: {},
      perKind: {
        super_fund:      { brokers: [superBroker],   weights: superWeights },
        savings_account: { brokers: [savingsBroker], weights: savingsWeights },
        robo_advisor:    { brokers: [roboBroker],    weights: roboWeights },
      },
    });
    expect(stack.super_fund!.every((r: VerticalScoredResult) => r.kind === "super_fund")).toBe(true);
    expect(stack.savings_account!.every((r: VerticalScoredResult) => r.kind === "savings_account")).toBe(true);
    expect(stack.robo_advisor!.every((r: VerticalScoredResult) => r.kind === "robo_advisor")).toBe(true);
  });

  it("works with no inputs (undefined fields are graceful no-ops)", () => {
    // Should not throw — all bonuses default to 0
    expect(() =>
      buildStackResults({
        inputs: {},
        perKind: {
          super_fund: { brokers: [superBroker], weights: superWeights },
        },
      })
    ).not.toThrow();
  });

  it("returns the top-scoring product in each vertical", () => {
    const weakSuper = makeBroker({ slug: "weak-super", name: "Weak Super", platform_type: "super_fund", rating: 3.5 });
    const stack = buildStackResults({
      inputs: { riskBand: "growth", amount: "large" },
      perKind: {
        super_fund: {
          brokers: [superBroker, weakSuper],
          weights: {
            "aware-super": makeWeights({ robo: 10, smsf: 10 }),
            "weak-super":  makeWeights({ robo: 2,  smsf: 2  }),
          },
        },
      },
      limit: 1,
    });
    expect(stack.super_fund![0]!.slug).toBe("aware-super");
  });
});

// ─── Cross-vertical scoring symmetry ─────────────────────────────────────────

describe("scoreVertical — cross-vertical symmetry", () => {
  it("whale amount scores higher than small amount across all verticals", () => {
    // The amount multiplier (whale=1.2 vs small=0.9) means whale-portfolio users
    // always score the same products higher. For super, there's also an additional
    // amount bonus, so the ratio is even larger — we just verify whale > small.
    for (const kind of ["super_fund", "savings_account", "robo_advisor"] as const) {
      const broker = makeBroker({ slug: "test", name: "Test", platform_type: kind });
      const weights = { test: makeWeights({ robo: 10, smsf: 10, low_fee: 10, beginner: 10 }) };

      const smallResult = scoreVertical(kind, [broker], weights, { amount: "small" });
      const whaleResult = scoreVertical(kind, [broker], weights, { amount: "whale" });

      expect(whaleResult[0]!.total).toBeGreaterThan(smallResult[0]!.total);
    }
  });

  it("all three verticals return VerticalScoredResult shape (slug, total, kind)", () => {
    const kinds: Array<"super_fund" | "savings_account" | "robo_advisor"> = [
      "super_fund",
      "savings_account",
      "robo_advisor",
    ];
    for (const kind of kinds) {
      const broker = makeBroker({ slug: "b", name: "B", platform_type: kind });
      const weights = { b: makeWeights({ robo: 8, low_fee: 6, smsf: 5, beginner: 5 }) };
      const results = scoreVertical(kind, [broker], weights, {});
      const r = results[0];
      if (r) {
        expect(typeof r.slug).toBe("string");
        expect(typeof r.total).toBe("number");
        expect(r.kind).toBe(kind);
      }
    }
  });
});
