/**
 * Tests for lib/decision-kit/scorecards.ts — validation + summary maths.
 */
import { describe, it, expect } from "vitest";
import {
  sanitiseCriteria,
  scorecardAverage,
  ratedCount,
  buildDecisionSummary,
  SCORECARD_CRITERION_KEYS,
  SUMMARY_TIE_THRESHOLD,
} from "@/lib/decision-kit/scorecards";

describe("sanitiseCriteria", () => {
  it("returns {} for non-objects", () => {
    expect(sanitiseCriteria(null)).toEqual({});
    expect(sanitiseCriteria(undefined)).toEqual({});
    expect(sanitiseCriteria("nope")).toEqual({});
    expect(sanitiseCriteria(42)).toEqual({});
  });

  it("keeps only known criterion keys", () => {
    const out = sanitiseCriteria({ clarity: 4, made_up: 5, rapport: 3 });
    expect(out).toEqual({ clarity: 4, rapport: 3 });
    expect(out).not.toHaveProperty("made_up");
  });

  it("drops out-of-range and non-numeric values", () => {
    const out = sanitiseCriteria({
      clarity: 0,
      fee_transparency: 6,
      relevance: "x",
      rapport: 3,
      confidence: NaN,
    });
    expect(out).toEqual({ rapport: 3 });
  });

  it("rounds fractional ratings to the nearest integer", () => {
    expect(sanitiseCriteria({ clarity: 4.4 })).toEqual({ clarity: 4 });
    expect(sanitiseCriteria({ clarity: 3.6 })).toEqual({ clarity: 4 });
  });

  it("coerces numeric strings within range", () => {
    expect(sanitiseCriteria({ clarity: "5" })).toEqual({ clarity: 5 });
  });

  it("accepts all five fixed keys", () => {
    const full = Object.fromEntries(SCORECARD_CRITERION_KEYS.map((k) => [k, 4]));
    expect(sanitiseCriteria(full)).toEqual(full);
  });
});

describe("scorecardAverage", () => {
  it("returns null when nothing is rated and no overall", () => {
    expect(scorecardAverage({ criteria: {} })).toBeNull();
  });

  it("averages rated criteria, ignoring skipped ones", () => {
    expect(scorecardAverage({ criteria: { clarity: 4, rapport: 2 } })).toBe(3);
  });

  it("rounds to 1 decimal place", () => {
    expect(
      scorecardAverage({ criteria: { clarity: 4, rapport: 5, relevance: 4 } }),
    ).toBe(4.3);
  });

  it("prefers an explicit overall when set", () => {
    expect(scorecardAverage({ criteria: { clarity: 1 }, overall: 5 })).toBe(5);
  });
});

describe("ratedCount", () => {
  it("counts rated fixed criteria", () => {
    expect(ratedCount({})).toBe(0);
    expect(ratedCount({ clarity: 4, rapport: 2 })).toBe(2);
  });
});

describe("buildDecisionSummary", () => {
  const respondents = [
    { professionalId: 1, name: "Alice" },
    { professionalId: 2, name: "Bob" },
    { professionalId: 3, name: "Carol" },
  ];

  it("returns all respondents with null averages when no cards", () => {
    const s = buildDecisionSummary(respondents, []);
    expect(s.entries).toHaveLength(3);
    expect(s.scoredCount).toBe(0);
    expect(s.leaderId).toBeNull();
    expect(s.entries.every((e) => e.average === null)).toBe(true);
  });

  it("sorts scored respondents above unscored, highest average first", () => {
    const s = buildDecisionSummary(respondents, [
      { professionalId: 1, criteria: { clarity: 3 } }, // 3.0
      { professionalId: 2, criteria: { clarity: 5 } }, // 5.0
    ]);
    expect(s.entries.map((e) => e.professionalId)).toEqual([2, 1, 3]);
    expect(s.scoredCount).toBe(2);
  });

  it("names a clear leader when ahead by more than the tie threshold", () => {
    const s = buildDecisionSummary(respondents, [
      { professionalId: 1, criteria: { clarity: 5, rapport: 5 } }, // 5.0
      { professionalId: 2, criteria: { clarity: 3, rapport: 3 } }, // 3.0
    ]);
    expect(s.leaderId).toBe(1);
    expect(s.isClose).toBe(false);
  });

  it("declares no leader and isClose when within the tie threshold", () => {
    // 4.0 vs 4.0 - SUMMARY_TIE_THRESHOLD-ish
    const s = buildDecisionSummary(respondents, [
      { professionalId: 1, criteria: { clarity: 4 } }, // 4.0
      { professionalId: 2, criteria: { clarity: 4 } }, // 4.0
    ]);
    expect(s.leaderId).toBeNull();
    expect(s.isClose).toBe(true);
  });

  it("treats a gap exactly at the threshold as close (no leader)", () => {
    // Choose ratings whose averages differ by exactly the threshold.
    // clarity 5 (=5.0) vs clarity 4,confidence 5 mean=4.5 → gap 0.5 (> 0.3) leader.
    const s = buildDecisionSummary(respondents, [
      { professionalId: 1, criteria: { clarity: 5 } }, // 5.0
      { professionalId: 2, criteria: { clarity: 5, confidence: 4 } }, // 4.5
    ]);
    // gap 0.5 > 0.3 → clear leader
    expect(s.leaderId).toBe(1);
  });

  it("never names a leader with only one scored respondent", () => {
    const s = buildDecisionSummary(respondents, [
      { professionalId: 1, criteria: { clarity: 5 } },
    ]);
    expect(s.scoredCount).toBe(1);
    expect(s.leaderId).toBeNull();
  });

  it("threshold constant is the conservative 0.3", () => {
    expect(SUMMARY_TIE_THRESHOLD).toBe(0.3);
  });
});
