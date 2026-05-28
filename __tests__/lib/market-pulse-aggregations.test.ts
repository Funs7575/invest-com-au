/**
 * Unit tests for Market Pulse aggregation helpers.
 *
 * These cover the three new pure functions added to lib/market-intelligence.ts:
 *   - buildHealthScoreTrendPoints / computeHealthScoreTrendSummary
 *   - buildSavingsRateTrendPoints / computeSavingsRateTrendSummary
 *   - buildFeeIndexDeltaSeries
 *
 * All tests use plain data fixtures — no Supabase, no Next.js.
 */

import { describe, it, expect } from "vitest";
import {
  buildHealthScoreTrendPoints,
  computeHealthScoreTrendSummary,
  buildSavingsRateTrendPoints,
  computeSavingsRateTrendSummary,
  buildFeeIndexDeltaSeries,
  type HealthScoreHistoryRow,
  type SavingsRateRow,
  type FeeTrendPoint,
} from "@/lib/market-intelligence";

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeHealthRow(
  broker_slug: string,
  overall_score: number,
  captured_at: string,
): HealthScoreHistoryRow {
  return { broker_slug, overall_score, captured_at };
}

function makeSavingsRow(
  broker_id: number,
  rate_bps: number,
  captured_at: string,
  product_kind = "savings_account",
): SavingsRateRow {
  return {
    broker_id,
    rate_bps,
    captured_at,
    product_kind,
    intro_rate_bps: null,
  };
}

function makeFeePoint(
  period: string,
  avgAsxFee: number | null,
  avgUsFee: number | null = null,
  avgFxSpread: number | null = null,
): FeeTrendPoint {
  return { period, avgAsxFee, avgUsFee, avgFxSpread };
}

// ─── buildHealthScoreTrendPoints ─────────────────────────────────────────────

describe("buildHealthScoreTrendPoints", () => {
  it("returns empty for no input", () => {
    expect(buildHealthScoreTrendPoints([])).toEqual([]);
  });

  it("returns empty when only one broker per day (privacy guard)", () => {
    const rows = [
      makeHealthRow("broker-a", 80, "2026-05-01T02:00:00Z"),
    ];
    expect(buildHealthScoreTrendPoints(rows)).toHaveLength(0);
  });

  it("emits a point when >= 2 brokers are in the same day", () => {
    const rows = [
      makeHealthRow("broker-a", 80, "2026-05-01T02:00:00Z"),
      makeHealthRow("broker-b", 60, "2026-05-01T03:00:00Z"),
    ];
    const points = buildHealthScoreTrendPoints(rows);
    expect(points).toHaveLength(1);
    expect(points[0]!.day).toBe("2026-05-01");
  });

  it("computes the correct average score", () => {
    const rows = [
      makeHealthRow("broker-a", 80, "2026-05-01T02:00:00Z"),
      makeHealthRow("broker-b", 60, "2026-05-01T03:00:00Z"),
    ];
    const points = buildHealthScoreTrendPoints(rows);
    expect(points[0]!.avgScore).toBe(70.0);
    expect(points[0]!.brokerCount).toBe(2);
  });

  it("groups multiple rows per broker per day — uses one vote per broker", () => {
    // broker-a has 2 rows for the same day; should count as 1 broker
    const rows = [
      makeHealthRow("broker-a", 80, "2026-05-01T02:00:00Z"),
      makeHealthRow("broker-a", 82, "2026-05-01T08:00:00Z"), // later capture
      makeHealthRow("broker-b", 60, "2026-05-01T03:00:00Z"),
    ];
    const points = buildHealthScoreTrendPoints(rows);
    expect(points).toHaveLength(1);
    expect(points[0]!.brokerCount).toBe(2);
    // avg of 82 (latest broker-a) and 60 (broker-b) = 71
    expect(points[0]!.avgScore).toBe(71.0);
  });

  it("suppresses a day with only 1 distinct broker even if multiple rows", () => {
    const rows = [
      makeHealthRow("broker-a", 80, "2026-05-01T02:00:00Z"),
      makeHealthRow("broker-a", 85, "2026-05-01T08:00:00Z"),
    ];
    expect(buildHealthScoreTrendPoints(rows)).toHaveLength(0);
  });

  it("handles multiple days and sorts chronologically", () => {
    const rows = [
      // Day 2 — 2 brokers
      makeHealthRow("broker-a", 80, "2026-05-02T02:00:00Z"),
      makeHealthRow("broker-b", 60, "2026-05-02T03:00:00Z"),
      // Day 1 — 2 brokers
      makeHealthRow("broker-a", 75, "2026-05-01T02:00:00Z"),
      makeHealthRow("broker-b", 65, "2026-05-01T03:00:00Z"),
    ];
    const points = buildHealthScoreTrendPoints(rows);
    expect(points).toHaveLength(2);
    expect(points[0]!.day).toBe("2026-05-01");
    expect(points[1]!.day).toBe("2026-05-02");
  });

  it("skips rows with non-finite overall_score", () => {
    const rows = [
      makeHealthRow("broker-a", NaN, "2026-05-01T02:00:00Z"),
      makeHealthRow("broker-b", 60, "2026-05-01T03:00:00Z"),
      // Only broker-b has valid score → single broker → suppressed
    ];
    expect(buildHealthScoreTrendPoints(rows)).toHaveLength(0);
  });

  it("rounds avgScore to 1dp", () => {
    const rows = [
      makeHealthRow("broker-a", 77, "2026-05-01T02:00:00Z"),
      makeHealthRow("broker-b", 88, "2026-05-01T03:00:00Z"),
      makeHealthRow("broker-c", 66, "2026-05-01T04:00:00Z"),
    ];
    const points = buildHealthScoreTrendPoints(rows);
    expect(points[0]!.avgScore).toBe(77.0); // (77+88+66)/3 = 77
  });
});

// ─── computeHealthScoreTrendSummary ──────────────────────────────────────────

describe("computeHealthScoreTrendSummary", () => {
  it("returns insufficient_data for empty series", () => {
    const summary = computeHealthScoreTrendSummary([]);
    expect(summary.direction).toBe("insufficient_data");
    expect(summary.latest).toBeNull();
    expect(summary.pointCount).toBe(0);
  });

  it("returns insufficient_data for a single-point series", () => {
    const points = [{ day: "2026-05-01", avgScore: 75, brokerCount: 3 }];
    const summary = computeHealthScoreTrendSummary(points);
    expect(summary.direction).toBe("insufficient_data");
    expect(summary.latest).toBe(75);
    expect(summary.earliest).toBe(75);
    expect(summary.pointCount).toBe(1);
  });

  it("detects a rising trend (higher is better)", () => {
    const points = [
      { day: "2026-03-01", avgScore: 60, brokerCount: 3 },
      { day: "2026-04-01", avgScore: 70, brokerCount: 3 },
      { day: "2026-05-01", avgScore: 80, brokerCount: 3 },
    ];
    const summary = computeHealthScoreTrendSummary(points);
    expect(summary.direction).toBe("rising");
    expect(summary.absoluteChange).toBeGreaterThan(0);
    expect(summary.pctChange).toBeGreaterThan(0);
  });

  it("detects a falling trend", () => {
    const points = [
      { day: "2026-03-01", avgScore: 80, brokerCount: 3 },
      { day: "2026-04-01", avgScore: 70, brokerCount: 3 },
      { day: "2026-05-01", avgScore: 60, brokerCount: 3 },
    ];
    const summary = computeHealthScoreTrendSummary(points);
    expect(summary.direction).toBe("falling");
    expect(summary.absoluteChange).toBeLessThan(0);
  });

  it("reports flat when |pctChange| <= 1%", () => {
    const points = [
      { day: "2026-04-01", avgScore: 70, brokerCount: 3 },
      { day: "2026-05-01", avgScore: 70.5, brokerCount: 3 }, // 0.7% change
    ];
    const summary = computeHealthScoreTrendSummary(points);
    expect(summary.direction).toBe("flat");
  });

  it("handles null pctChange when earliest is 0", () => {
    const points = [
      { day: "2026-04-01", avgScore: 0, brokerCount: 3 },
      { day: "2026-05-01", avgScore: 10, brokerCount: 3 },
    ];
    const summary = computeHealthScoreTrendSummary(points);
    expect(summary.pctChange).toBeNull();
  });

  it("rounds to expected precision", () => {
    const points = [
      { day: "2026-04-01", avgScore: 66.666, brokerCount: 3 },
      { day: "2026-05-01", avgScore: 77.777, brokerCount: 3 },
    ];
    const summary = computeHealthScoreTrendSummary(points);
    // absoluteChange = 11.11, rounded to 2dp
    expect(summary.absoluteChange).toBe(11.11);
  });
});

// ─── buildSavingsRateTrendPoints ─────────────────────────────────────────────

describe("buildSavingsRateTrendPoints", () => {
  it("returns empty for no input", () => {
    expect(buildSavingsRateTrendPoints([])).toEqual([]);
  });

  it("excludes term_deposit rows", () => {
    const rows = [
      makeSavingsRow(1, 450, "2026-05-01T02:00:00Z", "term_deposit"),
      makeSavingsRow(2, 420, "2026-05-01T03:00:00Z", "term_deposit"),
    ];
    expect(buildSavingsRateTrendPoints(rows)).toHaveLength(0);
  });

  it("returns empty when only 1 broker per day (privacy guard)", () => {
    const rows = [makeSavingsRow(1, 450, "2026-05-01T02:00:00Z")];
    expect(buildSavingsRateTrendPoints(rows)).toHaveLength(0);
  });

  it("emits a point when >= 2 brokers on the same day", () => {
    const rows = [
      makeSavingsRow(1, 500, "2026-05-01T02:00:00Z"),
      makeSavingsRow(2, 450, "2026-05-01T03:00:00Z"),
    ];
    const points = buildSavingsRateTrendPoints(rows);
    expect(points).toHaveLength(1);
    expect(points[0]!.day).toBe("2026-05-01");
    expect(points[0]!.brokerCount).toBe(2);
  });

  it("converts bps to % pa correctly (best and avg)", () => {
    // 500 bps = 5.00% pa, 400 bps = 4.00% pa
    const rows = [
      makeSavingsRow(1, 500, "2026-05-01T02:00:00Z"),
      makeSavingsRow(2, 400, "2026-05-01T03:00:00Z"),
    ];
    const points = buildSavingsRateTrendPoints(rows);
    expect(points[0]!.bestRate).toBe(5.0);
    expect(points[0]!.avgRate).toBe(4.5);
  });

  it("uses the latest row per broker per day when duplicates exist", () => {
    const rows = [
      makeSavingsRow(1, 400, "2026-05-01T02:00:00Z"), // earlier
      makeSavingsRow(1, 450, "2026-05-01T10:00:00Z"), // later — should win
      makeSavingsRow(2, 500, "2026-05-01T03:00:00Z"),
    ];
    const points = buildSavingsRateTrendPoints(rows);
    expect(points[0]!.bestRate).toBe(5.0); // broker 2
    expect(points[0]!.avgRate).toBe(4.75); // (4.5 + 5.0) / 2 = 4.75
  });

  it("returns chronological order across multiple days", () => {
    const rows = [
      makeSavingsRow(1, 500, "2026-05-02T02:00:00Z"),
      makeSavingsRow(2, 450, "2026-05-02T03:00:00Z"),
      makeSavingsRow(1, 490, "2026-05-01T02:00:00Z"),
      makeSavingsRow(2, 440, "2026-05-01T03:00:00Z"),
    ];
    const points = buildSavingsRateTrendPoints(rows);
    expect(points).toHaveLength(2);
    expect(points[0]!.day).toBe("2026-05-01");
    expect(points[1]!.day).toBe("2026-05-02");
  });

  it("rounds rates to 2dp", () => {
    // 333 bps = 3.33% pa
    const rows = [
      makeSavingsRow(1, 333, "2026-05-01T02:00:00Z"),
      makeSavingsRow(2, 334, "2026-05-01T03:00:00Z"),
    ];
    const points = buildSavingsRateTrendPoints(rows);
    expect(points[0]!.bestRate).toBe(3.34);
    expect(points[0]!.avgRate).toBe(3.34); // (3.33 + 3.34) / 2 = 3.335 → 3.34 rounded
  });

  it("handles empty rows for a day gracefully", () => {
    expect(buildSavingsRateTrendPoints([])).toEqual([]);
  });
});

// ─── computeSavingsRateTrendSummary ──────────────────────────────────────────

describe("computeSavingsRateTrendSummary", () => {
  it("returns insufficient_data for empty series", () => {
    const summary = computeSavingsRateTrendSummary([]);
    expect(summary.direction).toBe("insufficient_data");
    expect(summary.latestBest).toBeNull();
    expect(summary.pointCount).toBe(0);
  });

  it("returns insufficient_data for a single point", () => {
    const points = [{ day: "2026-05-01", bestRate: 5.0, avgRate: 4.5, brokerCount: 3 }];
    const summary = computeSavingsRateTrendSummary(points);
    expect(summary.direction).toBe("insufficient_data");
    expect(summary.latestBest).toBe(5.0);
    expect(summary.earliestBest).toBe(5.0);
    expect(summary.latestAvg).toBe(4.5);
  });

  it("detects a rising trend when best rate goes up by >1%", () => {
    const points = [
      { day: "2026-03-01", bestRate: 4.0, avgRate: 3.5, brokerCount: 3 },
      { day: "2026-05-01", bestRate: 5.0, avgRate: 4.5, brokerCount: 3 },
    ];
    const summary = computeSavingsRateTrendSummary(points);
    expect(summary.direction).toBe("rising");
    expect(summary.pctChangeBest).toBeGreaterThan(0);
  });

  it("detects a falling trend when best rate goes down by >1%", () => {
    const points = [
      { day: "2026-03-01", bestRate: 5.0, avgRate: 4.5, brokerCount: 3 },
      { day: "2026-05-01", bestRate: 4.0, avgRate: 3.5, brokerCount: 3 },
    ];
    const summary = computeSavingsRateTrendSummary(points);
    expect(summary.direction).toBe("falling");
    expect(summary.absoluteChangeBest).toBeLessThan(0);
  });

  it("reports flat when rate changes within 1%", () => {
    const points = [
      { day: "2026-04-01", bestRate: 5.0, avgRate: 4.5, brokerCount: 3 },
      { day: "2026-05-01", bestRate: 5.04, avgRate: 4.5, brokerCount: 3 }, // 0.8% change
    ];
    const summary = computeSavingsRateTrendSummary(points);
    expect(summary.direction).toBe("flat");
  });

  it("surfaces latestAvg from the most recent point", () => {
    const points = [
      { day: "2026-04-01", bestRate: 5.0, avgRate: 4.0, brokerCount: 3 },
      { day: "2026-05-01", bestRate: 5.5, avgRate: 4.8, brokerCount: 3 },
    ];
    const summary = computeSavingsRateTrendSummary(points);
    expect(summary.latestAvg).toBe(4.8);
  });
});

// ─── buildFeeIndexDeltaSeries ─────────────────────────────────────────────────

describe("buildFeeIndexDeltaSeries", () => {
  it("returns empty for empty input", () => {
    expect(buildFeeIndexDeltaSeries([])).toEqual([]);
  });

  it("returns empty for a single-point series (no prior to compare against)", () => {
    const points = [makeFeePoint("2026-05-01", 10, 8, 0.6)];
    expect(buildFeeIndexDeltaSeries(points)).toHaveLength(0);
  });

  it("returns N-1 delta points for N input points", () => {
    const points = [
      makeFeePoint("2026-03-01", 10, 8, 0.6),
      makeFeePoint("2026-04-01", 9, 7, 0.55),
      makeFeePoint("2026-05-01", 8, 6, 0.5),
    ];
    expect(buildFeeIndexDeltaSeries(points)).toHaveLength(2);
  });

  it("computes correct signed deltas (falling = negative)", () => {
    const points = [
      makeFeePoint("2026-04-01", 10, 8, 0.6),
      makeFeePoint("2026-05-01", 8, 7, 0.55),
    ];
    const deltas = buildFeeIndexDeltaSeries(points);
    expect(deltas[0]!.asxDelta).toBe(-2.0);
    expect(deltas[0]!.usDelta).toBe(-1.0);
    expect(deltas[0]!.fxDelta).toBe(-0.05);
  });

  it("computes correct signed deltas (rising = positive)", () => {
    const points = [
      makeFeePoint("2026-04-01", 8, 6, 0.5),
      makeFeePoint("2026-05-01", 10, 8, 0.6),
    ];
    const deltas = buildFeeIndexDeltaSeries(points);
    expect(deltas[0]!.asxDelta).toBe(2.0);
    expect(deltas[0]!.usDelta).toBe(2.0);
    expect(deltas[0]!.fxDelta).toBe(0.1);
  });

  it("propagates null when either side of a delta is null", () => {
    const points = [
      makeFeePoint("2026-04-01", null, 8, 0.6),
      makeFeePoint("2026-05-01", 10, null, 0.5),
    ];
    const deltas = buildFeeIndexDeltaSeries(points);
    expect(deltas[0]!.asxDelta).toBeNull(); // prev is null
    expect(deltas[0]!.usDelta).toBeNull(); // curr is null
    expect(deltas[0]!.fxDelta).toBe(-0.1);
  });

  it("uses the period of the current point (not prev) in output", () => {
    const points = [
      makeFeePoint("2026-04-01", 10),
      makeFeePoint("2026-05-01", 8),
    ];
    const deltas = buildFeeIndexDeltaSeries(points);
    expect(deltas[0]!.period).toBe("2026-05-01");
  });

  it("handles a zero-change day correctly (delta = 0)", () => {
    const points = [
      makeFeePoint("2026-04-01", 10, 8, 0.6),
      makeFeePoint("2026-05-01", 10, 8, 0.6),
    ];
    const deltas = buildFeeIndexDeltaSeries(points);
    expect(deltas[0]!.asxDelta).toBe(0);
    expect(deltas[0]!.usDelta).toBe(0);
    expect(deltas[0]!.fxDelta).toBe(0);
  });

  it("rounds deltas to 4dp", () => {
    const points = [
      makeFeePoint("2026-04-01", 10.00001),
      makeFeePoint("2026-05-01", 10.00008),
    ];
    const deltas = buildFeeIndexDeltaSeries(points);
    // 0.00007 rounded to 4dp = 0.0001
    expect(deltas[0]!.asxDelta).toBe(0.0001);
  });

  it("handles sparse data across many periods", () => {
    const points = [
      makeFeePoint("2026-01-01", 12),
      makeFeePoint("2026-02-01", null),
      makeFeePoint("2026-03-01", 10),
      makeFeePoint("2026-04-01", 9),
      makeFeePoint("2026-05-01", 8),
    ];
    const deltas = buildFeeIndexDeltaSeries(points);
    expect(deltas).toHaveLength(4);
    // 2026-02-01: prev=12, curr=null → null
    expect(deltas[0]!.asxDelta).toBeNull();
    // 2026-03-01: prev=null, curr=10 → null
    expect(deltas[1]!.asxDelta).toBeNull();
    // 2026-04-01: prev=10, curr=9 → -1
    expect(deltas[2]!.asxDelta).toBe(-1);
    // 2026-05-01: prev=9, curr=8 → -1
    expect(deltas[3]!.asxDelta).toBe(-1);
  });
});
