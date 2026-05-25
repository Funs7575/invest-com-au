/**
 * __tests__/lib/advisor-reputation.test.ts
 *
 * Unit tests for the Advisor Reputation Score.
 *
 * Covers:
 *   - Weight constants sum to 1.0
 *   - reputationLabel / reputationLabelColor helpers
 *   - Each dimension scorer in isolation
 *   - Overall computation (weighted average)
 *   - Edge cases: null/undefined inputs, verified > total clamp,
 *     fractional avg_rating, zero reviews, fully-populated advisor
 */

import { describe, it, expect } from "vitest";
import {
  computeAdvisorReputation,
  reputationLabel,
  reputationLabelColor,
  REPUTATION_WEIGHT_VERIFIED_COUNT,
  REPUTATION_WEIGHT_TOTAL_COUNT,
  REPUTATION_WEIGHT_AVG_RATING,
  REPUTATION_WEIGHT_VERIFIED_PCT,
  type AdvisorReputationInput,
} from "@/lib/advisor-reputation";

/* ─── Helpers ─── */

function input(overrides: Partial<AdvisorReputationInput> = {}): AdvisorReputationInput {
  return {
    total_reviews: null,
    verified_reviews: null,
    avg_rating: null,
    ...overrides,
  };
}

/* ─── Weight constants ─── */

describe("weight constants", () => {
  it("weights sum to 1.0", () => {
    const total =
      REPUTATION_WEIGHT_VERIFIED_COUNT +
      REPUTATION_WEIGHT_TOTAL_COUNT +
      REPUTATION_WEIGHT_AVG_RATING +
      REPUTATION_WEIGHT_VERIFIED_PCT;
    expect(total).toBeCloseTo(1.0);
  });
});

/* ─── reputationLabel ─── */

describe("reputationLabel", () => {
  it("returns Excellent for 75+", () => {
    expect(reputationLabel(75)).toBe("Excellent");
    expect(reputationLabel(100)).toBe("Excellent");
  });
  it("returns Good for 55–74", () => {
    expect(reputationLabel(55)).toBe("Good");
    expect(reputationLabel(74)).toBe("Good");
  });
  it("returns Developing for 35–54", () => {
    expect(reputationLabel(35)).toBe("Developing");
    expect(reputationLabel(54)).toBe("Developing");
  });
  it("returns New below 35", () => {
    expect(reputationLabel(0)).toBe("New");
    expect(reputationLabel(34)).toBe("New");
  });
});

/* ─── reputationLabelColor ─── */

describe("reputationLabelColor", () => {
  it("returns emerald for 75+", () => {
    expect(reputationLabelColor(75)).toContain("emerald");
  });
  it("returns teal for 55–74", () => {
    expect(reputationLabelColor(55)).toContain("teal");
  });
  it("returns amber for 35–54", () => {
    expect(reputationLabelColor(35)).toContain("amber");
  });
  it("returns slate for below 35", () => {
    expect(reputationLabelColor(0)).toContain("slate");
  });
});

/* ─── No reviews (zero baseline) ─── */

describe("no reviews", () => {
  it("returns overall 0 when no reviews exist", () => {
    const result = computeAdvisorReputation(input());
    expect(result.overall).toBe(0);
  });

  it("label is New", () => {
    const result = computeAdvisorReputation(input());
    expect(result.label).toBe("New");
  });

  it("all dimension scores are 0", () => {
    const result = computeAdvisorReputation(input());
    for (const dim of result.dimensions) {
      expect(dim.score).toBe(0);
    }
  });

  it("convenience fields are 0 / null", () => {
    const result = computeAdvisorReputation(input());
    expect(result.totalReviews).toBe(0);
    expect(result.verifiedReviews).toBe(0);
    expect(result.verifiedPct).toBe(0);
    expect(result.avgRating).toBeNull();
  });
});

/* ─── verified_count dimension ─── */

describe("verified_count dimension", () => {
  function dim(v: number, t: number) {
    return computeAdvisorReputation(
      input({ verified_reviews: v, total_reviews: t }),
    ).dimensions.find((d) => d.key === "verified_count")!;
  }

  it("0 verified → 0", () => {
    expect(dim(0, 5).score).toBe(0);
  });

  it("1 verified → 30", () => {
    expect(dim(1, 5).score).toBe(30);
  });

  it("3 verified → 60", () => {
    expect(dim(3, 5).score).toBe(60);
  });

  it("5 verified → 80", () => {
    expect(dim(5, 10).score).toBe(80);
  });

  it("10 verified → 100", () => {
    expect(dim(10, 15).score).toBe(100);
  });

  it("20 verified → 100 (capped)", () => {
    expect(dim(20, 20).score).toBe(100);
  });
});

/* ─── total_count dimension ─── */

describe("total_count dimension", () => {
  function dim(t: number) {
    return computeAdvisorReputation(
      input({ total_reviews: t }),
    ).dimensions.find((d) => d.key === "total_count")!;
  }

  it("0 reviews → 0", () => {
    expect(dim(0).score).toBe(0);
  });

  it("1 review → 20", () => {
    expect(dim(1).score).toBe(20);
  });

  it("2 reviews → 40", () => {
    expect(dim(2).score).toBe(40);
  });

  it("5 reviews → 60", () => {
    expect(dim(5).score).toBe(60);
  });

  it("10 reviews → 80", () => {
    expect(dim(10).score).toBe(80);
  });

  it("20 reviews → 100", () => {
    expect(dim(20).score).toBe(100);
  });

  it("100 reviews → 100 (capped)", () => {
    expect(dim(100).score).toBe(100);
  });
});

/* ─── avg_rating dimension ─── */

describe("avg_rating dimension", () => {
  function dim(rating: number | null, total: number) {
    return computeAdvisorReputation(
      input({ avg_rating: rating, total_reviews: total }),
    ).dimensions.find((d) => d.key === "avg_rating")!;
  }

  it("null avg_rating → 0", () => {
    expect(dim(null, 0).score).toBe(0);
  });

  it("avg_rating present but no reviews → 0", () => {
    expect(dim(5.0, 0).score).toBe(0);
  });

  it("3.0 avg → 0 (floor)", () => {
    expect(dim(3.0, 5).score).toBe(0);
  });

  it("5.0 avg → 100 (ceiling)", () => {
    expect(dim(5.0, 5).score).toBe(100);
  });

  it("4.0 avg → 50 (midpoint)", () => {
    expect(dim(4.0, 5).score).toBe(50);
  });

  it("4.5 avg → 75", () => {
    expect(dim(4.5, 5).score).toBe(75);
  });

  it("below 3.0 avg → clamped to 0", () => {
    expect(dim(1.0, 5).score).toBe(0);
    expect(dim(2.9, 5).score).toBe(0);
  });
});

/* ─── verified_pct dimension ─── */

describe("verified_pct dimension", () => {
  function dim(v: number, t: number) {
    return computeAdvisorReputation(
      input({ verified_reviews: v, total_reviews: t }),
    ).dimensions.find((d) => d.key === "verified_pct")!;
  }

  it("no reviews → 0", () => {
    expect(dim(0, 0).score).toBe(0);
  });

  it("0% verified → 0", () => {
    expect(dim(0, 5).score).toBe(0);
  });

  it("50% verified → 50", () => {
    expect(dim(5, 10).score).toBe(50);
  });

  it("100% verified → 100", () => {
    expect(dim(10, 10).score).toBe(100);
  });

  it("75% verified → 75", () => {
    expect(dim(6, 8).score).toBe(75);
  });
});

/* ─── Convenience fields ─── */

describe("convenience fields", () => {
  it("totalReviews, verifiedReviews, verifiedPct, avgRating match input", () => {
    const result = computeAdvisorReputation(
      input({ total_reviews: 10, verified_reviews: 4, avg_rating: 4.5 }),
    );
    expect(result.totalReviews).toBe(10);
    expect(result.verifiedReviews).toBe(4);
    expect(result.verifiedPct).toBe(40);
    expect(result.avgRating).toBeCloseTo(4.5);
  });
});

/* ─── verified > total clamp ─── */

describe("verified count clamped to total", () => {
  it("verified_reviews cannot exceed total_reviews", () => {
    const result = computeAdvisorReputation(
      input({ total_reviews: 5, verified_reviews: 20 }),
    );
    expect(result.verifiedReviews).toBe(5);
    expect(result.verifiedPct).toBe(100);
  });
});

/* ─── Null / undefined / negative inputs ─── */

describe("null / undefined inputs", () => {
  it("handles all-undefined gracefully", () => {
    const result = computeAdvisorReputation({
      total_reviews: undefined,
      verified_reviews: undefined,
      avg_rating: undefined,
    });
    expect(result.overall).toBe(0);
    expect(result.totalReviews).toBe(0);
  });

  it("negative total treated as 0", () => {
    const result = computeAdvisorReputation(
      input({ total_reviews: -5, verified_reviews: -2 }),
    );
    expect(result.totalReviews).toBe(0);
    expect(result.verifiedReviews).toBe(0);
  });
});

/* ─── Full overall calculation ─── */

describe("overall calculation", () => {
  it("overall is a rounded weighted sum of dimension scores", () => {
    const result = computeAdvisorReputation(
      input({ total_reviews: 20, verified_reviews: 10, avg_rating: 5.0 }),
    );
    // Dimensions:
    //   verified_count: 10 → 100 (weight 0.40) → 40
    //   total_count: 20    → 100 (weight 0.30) → 30
    //   avg_rating: 5.0    → 100 (weight 0.20) → 20
    //   verified_pct: 50%  →  50 (weight 0.10) →  5
    // Overall = 40+30+20+5 = 95
    expect(result.overall).toBe(95);
    expect(result.label).toBe("Excellent");
  });

  it("single review, 4.0 rating, unverified → expected overall", () => {
    const result = computeAdvisorReputation(
      input({ total_reviews: 1, verified_reviews: 0, avg_rating: 4.0 }),
    );
    // verified_count: 0 → 0 × 0.40 = 0
    // total_count: 1  → 20 × 0.30 = 6
    // avg_rating: 4.0 → 50 × 0.20 = 10
    // verified_pct: 0% → 0 × 0.10 = 0
    // overall = 16
    expect(result.overall).toBe(16);
  });

  it("single verified review, 5.0 rating → expected overall", () => {
    const result = computeAdvisorReputation(
      input({ total_reviews: 1, verified_reviews: 1, avg_rating: 5.0 }),
    );
    // verified_count: 1 → 30 × 0.40 = 12
    // total_count: 1   → 20 × 0.30 = 6
    // avg_rating: 5.0  → 100 × 0.20 = 20
    // verified_pct: 100% → 100 × 0.10 = 10
    // overall = 48
    expect(result.overall).toBe(48);
  });

  it("dimensions array has exactly 4 entries", () => {
    const result = computeAdvisorReputation(
      input({ total_reviews: 5, verified_reviews: 3, avg_rating: 4.2 }),
    );
    expect(result.dimensions).toHaveLength(4);
  });

  it("dimension keys are unique and match expected keys", () => {
    const result = computeAdvisorReputation(
      input({ total_reviews: 5, verified_reviews: 3, avg_rating: 4.2 }),
    );
    const keys = result.dimensions.map((d) => d.key);
    expect(keys).toContain("verified_count");
    expect(keys).toContain("total_count");
    expect(keys).toContain("avg_rating");
    expect(keys).toContain("verified_pct");
    expect(new Set(keys).size).toBe(4);
  });

  it("all dimension scores are in [0, 100]", () => {
    for (const tc of [
      { total_reviews: 0, verified_reviews: 0, avg_rating: null },
      { total_reviews: 1, verified_reviews: 1, avg_rating: 5.0 },
      { total_reviews: 50, verified_reviews: 50, avg_rating: 4.8 },
    ]) {
      const result = computeAdvisorReputation(tc);
      for (const dim of result.dimensions) {
        expect(dim.score).toBeGreaterThanOrEqual(0);
        expect(dim.score).toBeLessThanOrEqual(100);
      }
    }
  });

  it("overall score is in [0, 100]", () => {
    for (const tc of [
      { total_reviews: 0, verified_reviews: 0, avg_rating: null },
      { total_reviews: 100, verified_reviews: 100, avg_rating: 5.0 },
    ]) {
      const result = computeAdvisorReputation(tc);
      expect(result.overall).toBeGreaterThanOrEqual(0);
      expect(result.overall).toBeLessThanOrEqual(100);
    }
  });
});

/* ─── Weight allocation ─── */

describe("dimension weights", () => {
  it("every dimension has a non-zero weight", () => {
    const result = computeAdvisorReputation(
      input({ total_reviews: 5, verified_reviews: 2, avg_rating: 4.0 }),
    );
    for (const dim of result.dimensions) {
      expect(dim.weight).toBeGreaterThan(0);
    }
  });

  it("dimension weights sum to 1.0", () => {
    const result = computeAdvisorReputation(
      input({ total_reviews: 5, verified_reviews: 2, avg_rating: 4.0 }),
    );
    const total = result.dimensions.reduce((sum, d) => sum + d.weight, 0);
    expect(total).toBeCloseTo(1.0);
  });
});
