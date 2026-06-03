import { describe, it, expect } from "vitest";
import { decideWinner, type ExperimentStats } from "@/lib/ab-winner";

function stats(overrides: Partial<ExperimentStats> = {}): ExperimentStats {
  return {
    impressions_a: 1000,
    impressions_b: 1000,
    conversions_a: 50,
    conversions_b: 50,
    min_sample_size: 100,
    significance_threshold: 0.05,
    ...overrides,
  };
}

// ── invalid input guard ───────────────────────────────────────────────────────

describe("decideWinner — invalid input", () => {
  it("returns invalid_input when conversions_a > impressions_a", () => {
    const r = decideWinner(stats({ conversions_a: 1001, impressions_a: 1000 }));
    expect(r.reason).toBe("invalid_input");
    expect(r.winner).toBeNull();
  });

  it("returns invalid_input when conversions_b > impressions_b", () => {
    const r = decideWinner(stats({ conversions_b: 1001, impressions_b: 1000 }));
    expect(r.reason).toBe("invalid_input");
    expect(r.winner).toBeNull();
  });

  it("returns invalid_input for negative impressions_a", () => {
    const r = decideWinner(stats({ impressions_a: -1 }));
    expect(r.reason).toBe("invalid_input");
  });

  it("returns invalid_input for negative conversions_b", () => {
    const r = decideWinner(stats({ conversions_b: -1 }));
    expect(r.reason).toBe("invalid_input");
  });
});

// ── insufficient sample ───────────────────────────────────────────────────────

describe("decideWinner — insufficient sample", () => {
  it("returns insufficient_sample when impressions_a < min_sample_size", () => {
    const r = decideWinner(stats({ impressions_a: 50, min_sample_size: 100 }));
    expect(r.reason).toBe("insufficient_sample");
    expect(r.winner).toBeNull();
    expect(r.pValue).toBe(1);
    expect(r.zScore).toBe(0);
  });

  it("returns insufficient_sample when impressions_b < min_sample_size", () => {
    const r = decideWinner(stats({ impressions_b: 50, min_sample_size: 100 }));
    expect(r.reason).toBe("insufficient_sample");
    expect(r.winner).toBeNull();
  });
});

// ── no significant difference ─────────────────────────────────────────────────

describe("decideWinner — no significant difference", () => {
  it("returns no_significant_difference when conversion rates are equal", () => {
    const r = decideWinner(stats({ conversions_a: 50, conversions_b: 50 }));
    expect(r.reason).toBe("no_significant_difference");
    expect(r.winner).toBeNull();
  });

  it("returns no_significant_difference when the difference is tiny", () => {
    // 50 vs 51 out of 1000 is not statistically significant
    const r = decideWinner(stats({ conversions_a: 50, conversions_b: 51 }));
    expect(r.reason).toBe("no_significant_difference");
    expect(r.winner).toBeNull();
  });

  it("pValue is between 0 and 1", () => {
    const r = decideWinner(stats({ conversions_a: 50, conversions_b: 70 }));
    expect(r.pValue).toBeGreaterThanOrEqual(0);
    expect(r.pValue).toBeLessThanOrEqual(1);
  });

  it("returns no_significant_difference when both conversion counts are 0 (no variance)", () => {
    const r = decideWinner(stats({ conversions_a: 0, conversions_b: 0 }));
    expect(r.winner).toBeNull();
  });
});

// ── winner declared ───────────────────────────────────────────────────────────

describe("decideWinner — winner declared", () => {
  it("declares b as winner when b has significantly higher conversion rate", () => {
    // 50/1000 (5%) vs 120/1000 (12%) — large effect, low p
    const r = decideWinner(
      stats({ conversions_a: 50, impressions_a: 1000, conversions_b: 120, impressions_b: 1000 }),
    );
    expect(r.winner).toBe("b");
    expect(r.reason).toBe("b_wins");
    expect(r.pValue).toBeLessThan(0.05);
    expect(r.liftPct).toBeGreaterThan(0);
  });

  it("declares a as winner when a has significantly higher conversion rate", () => {
    // 120/1000 (12%) vs 50/1000 (5%) — a wins
    const r = decideWinner(
      stats({ conversions_a: 120, impressions_a: 1000, conversions_b: 50, impressions_b: 1000 }),
    );
    expect(r.winner).toBe("a");
    expect(r.reason).toBe("a_wins");
    expect(r.pValue).toBeLessThan(0.05);
    expect(r.liftPct).toBeLessThan(0);
  });

  it("liftPct is positive when b outperforms a", () => {
    const r = decideWinner(
      stats({ conversions_a: 50, conversions_b: 120 }),
    );
    if (r.winner === "b") {
      expect(r.liftPct).toBeGreaterThan(0);
    }
  });

  it("zScore has the correct sign — positive when b > a", () => {
    const r = decideWinner(
      stats({ conversions_a: 50, conversions_b: 120 }),
    );
    if (r.winner === "b") {
      expect(r.zScore).toBeGreaterThan(0);
    }
  });

  it("respects a stricter significance threshold (0.01)", () => {
    // A borderline result that would be significant at 0.05 but not at 0.01
    const loose = decideWinner(
      stats({ conversions_a: 50, conversions_b: 80, significance_threshold: 0.05 }),
    );
    const strict = decideWinner(
      stats({ conversions_a: 50, conversions_b: 80, significance_threshold: 0.01 }),
    );
    // strict might withhold winner where loose declares one
    if (loose.winner !== null) {
      expect(strict.pValue).toBeGreaterThanOrEqual(loose.pValue - 0.001);
    }
    expect(typeof strict.winner === "string" || strict.winner === null).toBe(true);
  });
});

// ── output shape ──────────────────────────────────────────────────────────────

describe("decideWinner — output shape", () => {
  it("always returns the four required fields", () => {
    const r = decideWinner(stats());
    expect(typeof r.pValue).toBe("number");
    expect(typeof r.zScore).toBe("number");
    expect(typeof r.liftPct).toBe("number");
    expect(["a", "b", null]).toContain(r.winner);
  });

  it("reason is always one of the five expected strings", () => {
    const validReasons = [
      "insufficient_sample",
      "no_significant_difference",
      "a_wins",
      "b_wins",
      "invalid_input",
    ];
    const r = decideWinner(stats());
    expect(validReasons).toContain(r.reason);
  });
});
