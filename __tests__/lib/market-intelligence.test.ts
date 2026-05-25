import { describe, it, expect } from "vitest";
import {
  buildFeeTrendPoints,
  computeFeeTrendSummary,
  computeAllFeeTrends,
  buildHealthScoreDistribution,
  buildCurrentMarketSnapshot,
  buildFeeSpreadsByCategory,
  buildAdvisorDemandByState,
  feeTrendNarrative,
  trimTrendWindow,
  type FeeTrendPoint,
} from "@/lib/market-intelligence";
import type { FeeIndexSnapshot } from "@/lib/fee-index";
import type { BrokerHealthScore } from "@/lib/types";

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeIndexRow(
  period: string,
  partial: Partial<FeeIndexSnapshot> = {},
): FeeIndexSnapshot {
  return {
    period,
    computed_at: `${period}T02:00:00.000Z`,
    broker_count: 10,
    asx_fee_sample: 10,
    us_fee_sample: 10,
    fx_spread_sample: 10,
    avg_asx_fee: 10,
    avg_us_fee: 8,
    avg_fx_spread: 0.6,
    median_asx_fee: 10,
    median_us_fee: 8,
    median_fx_spread: 0.6,
    source: "cron",
    ...partial,
  };
}

// DESC-ordered history (newest first), matching what readFeeIndex() returns.
const descHistory: FeeIndexSnapshot[] = [
  makeIndexRow("2026-05-01", { avg_asx_fee: 8, avg_us_fee: 6, avg_fx_spread: 0.5 }),
  makeIndexRow("2026-04-01", { avg_asx_fee: 9, avg_us_fee: 7, avg_fx_spread: 0.55 }),
  makeIndexRow("2026-03-01", { avg_asx_fee: 10, avg_us_fee: 8, avg_fx_spread: 0.6 }),
];

function makeHealthScore(
  broker_slug: string,
  overall_score: number,
): BrokerHealthScore {
  return {
    id: 1,
    broker_slug,
    overall_score,
    regulatory_score: 80,
    client_money_score: 80,
    financial_stability_score: 80,
    platform_reliability_score: 80,
    insurance_score: 80,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
}

// ─── buildFeeTrendPoints ─────────────────────────────────────────────────────

describe("buildFeeTrendPoints", () => {
  it("reverses DESC history into chronological order", () => {
    const points = buildFeeTrendPoints(descHistory);
    expect(points[0]?.period).toBe("2026-03-01");
    expect(points[points.length - 1]?.period).toBe("2026-05-01");
  });

  it("returns empty array for empty history", () => {
    expect(buildFeeTrendPoints([])).toEqual([]);
  });

  it("filters out rows where all three metrics are null", () => {
    const history = [
      makeIndexRow("2026-05-01", { avg_asx_fee: null, avg_us_fee: null, avg_fx_spread: null }),
      makeIndexRow("2026-04-01", { avg_asx_fee: 9 }),
    ];
    const points = buildFeeTrendPoints(history);
    expect(points).toHaveLength(1);
    expect(points[0]?.period).toBe("2026-04-01");
  });

  it("keeps a row that has at least one non-null metric", () => {
    const history = [
      makeIndexRow("2026-05-01", { avg_asx_fee: 8, avg_us_fee: null, avg_fx_spread: null }),
    ];
    expect(buildFeeTrendPoints(history)).toHaveLength(1);
  });

  it("maps column names to camelCase keys", () => {
    const [point] = buildFeeTrendPoints([makeIndexRow("2026-05-01", {
      avg_asx_fee: 8,
      avg_us_fee: 6,
      avg_fx_spread: 0.5,
    })]);
    expect(point?.avgAsxFee).toBe(8);
    expect(point?.avgUsFee).toBe(6);
    expect(point?.avgFxSpread).toBe(0.5);
  });
});

// ─── computeFeeTrendSummary ───────────────────────────────────────────────────

describe("computeFeeTrendSummary", () => {
  it("returns insufficient_data for an empty points array", () => {
    const result = computeFeeTrendSummary([], "asx");
    expect(result.direction).toBe("insufficient_data");
    expect(result.pointCount).toBe(0);
  });

  it("returns insufficient_data for a single-point series", () => {
    const points: FeeTrendPoint[] = [
      { period: "2026-05-01", avgAsxFee: 10, avgUsFee: null, avgFxSpread: null },
    ];
    const result = computeFeeTrendSummary(points, "asx");
    expect(result.direction).toBe("insufficient_data");
    expect(result.latest).toBe(10);
  });

  it("detects a falling trend", () => {
    const points = buildFeeTrendPoints(descHistory); // ASX: 10 → 9 → 8
    const result = computeFeeTrendSummary(points, "asx");
    expect(result.direction).toBe("falling");
    expect(result.absoluteChange).toBeLessThan(0);
    expect(result.pctChange).toBeLessThan(0);
  });

  it("detects a rising trend", () => {
    const risingHistory: FeeIndexSnapshot[] = [
      makeIndexRow("2026-05-01", { avg_asx_fee: 12 }),
      makeIndexRow("2026-03-01", { avg_asx_fee: 10 }),
    ];
    const points = buildFeeTrendPoints(risingHistory);
    const result = computeFeeTrendSummary(points, "asx");
    expect(result.direction).toBe("rising");
  });

  it("identifies flat when |pctChange| <= 1%", () => {
    const flatHistory: FeeIndexSnapshot[] = [
      makeIndexRow("2026-05-01", { avg_asx_fee: 10.005 }),
      makeIndexRow("2026-04-01", { avg_asx_fee: 10 }),
    ];
    const points = buildFeeTrendPoints(flatHistory);
    const result = computeFeeTrendSummary(points, "asx");
    expect(result.direction).toBe("flat");
  });

  it("handles null pctChange when earliest is 0", () => {
    const history: FeeIndexSnapshot[] = [
      makeIndexRow("2026-05-01", { avg_asx_fee: 5 }),
      makeIndexRow("2026-04-01", { avg_asx_fee: 0 }),
    ];
    const points = buildFeeTrendPoints(history);
    const result = computeFeeTrendSummary(points, "asx");
    expect(result.pctChange).toBeNull();
  });

  it("skips null values when computing earliest/latest", () => {
    const mixedPoints: FeeTrendPoint[] = [
      { period: "2026-03-01", avgAsxFee: null, avgUsFee: null, avgFxSpread: null },
      { period: "2026-04-01", avgAsxFee: 10, avgUsFee: null, avgFxSpread: null },
      { period: "2026-05-01", avgAsxFee: 8, avgUsFee: null, avgFxSpread: null },
    ];
    const result = computeFeeTrendSummary(mixedPoints, "asx");
    expect(result.earliest).toBe(10);
    expect(result.latest).toBe(8);
    expect(result.direction).toBe("falling");
  });
});

// ─── computeAllFeeTrends ──────────────────────────────────────────────────────

describe("computeAllFeeTrends", () => {
  it("returns summaries for all three metrics", () => {
    const result = computeAllFeeTrends(descHistory);
    expect(result).toHaveProperty("asx");
    expect(result).toHaveProperty("us");
    expect(result).toHaveProperty("fx");
  });

  it("returns insufficient_data for all metrics on empty history", () => {
    const result = computeAllFeeTrends([]);
    expect(result.asx.direction).toBe("insufficient_data");
    expect(result.us.direction).toBe("insufficient_data");
    expect(result.fx.direction).toBe("insufficient_data");
  });

  it("all three are falling given consistently declining history", () => {
    const result = computeAllFeeTrends(descHistory);
    expect(result.asx.direction).toBe("falling");
    expect(result.us.direction).toBe("falling");
    expect(result.fx.direction).toBe("falling");
  });
});

// ─── buildHealthScoreDistribution ────────────────────────────────────────────

describe("buildHealthScoreDistribution", () => {
  it("returns all-zero buckets and null stats for empty input", () => {
    const result = buildHealthScoreDistribution([]);
    expect(result.total).toBe(0);
    expect(result.mean).toBeNull();
    expect(result.median).toBeNull();
    expect(result.buckets.every((b) => b.count === 0)).toBe(true);
    expect(result.buckets).toHaveLength(10);
  });

  it("puts a score of 75 in the 70–79 bucket", () => {
    const scores = [makeHealthScore("broker-a", 75)];
    const dist = buildHealthScoreDistribution(scores);
    const bucket70 = dist.buckets.find((b) => b.lowerBound === 70);
    expect(bucket70?.count).toBe(1);
  });

  it("puts a score of 100 in the 90–100 bucket (last bucket is inclusive)", () => {
    const scores = [makeHealthScore("broker-a", 100)];
    const dist = buildHealthScoreDistribution(scores);
    const lastBucket = dist.buckets[dist.buckets.length - 1];
    expect(lastBucket?.count).toBe(1);
    expect(lastBucket?.lowerBound).toBe(90);
  });

  it("puts a score of 0 in the 0–9 bucket", () => {
    const scores = [makeHealthScore("broker-a", 0)];
    const dist = buildHealthScoreDistribution(scores);
    const firstBucket = dist.buckets[0];
    expect(firstBucket?.count).toBe(1);
  });

  it("computes mean and median correctly for multiple scores", () => {
    const scores = [
      makeHealthScore("a", 60),
      makeHealthScore("b", 70),
      makeHealthScore("c", 80),
    ];
    const dist = buildHealthScoreDistribution(scores);
    expect(dist.mean).toBeCloseTo(70, 0);
    expect(dist.median).toBe(70);
    expect(dist.total).toBe(3);
  });

  it("clamps out-of-range scores to 0–100 before bucketing", () => {
    const scores = [
      makeHealthScore("a", -5),
      makeHealthScore("b", 110),
    ];
    const dist = buildHealthScoreDistribution(scores);
    const firstBucket = dist.buckets[0];
    const lastBucket = dist.buckets[dist.buckets.length - 1];
    expect(firstBucket?.count).toBe(1); // -5 clamped to 0
    expect(lastBucket?.count).toBe(1); // 110 clamped to 100
  });

  it("bucket labels are correct", () => {
    const dist = buildHealthScoreDistribution([]);
    expect(dist.buckets[0]?.label).toBe("0–9");
    expect(dist.buckets[9]?.label).toBe("90–100");
    expect(dist.buckets[7]?.label).toBe("70–79");
  });
});

// ─── buildCurrentMarketSnapshot ──────────────────────────────────────────────

describe("buildCurrentMarketSnapshot", () => {
  it("returns zeroed snapshot for null input", () => {
    const snap = buildCurrentMarketSnapshot(null);
    expect(snap.period).toBeNull();
    expect(snap.activeBrokerCount).toBe(0);
    expect(snap.asxFee.mean).toBeNull();
    expect(snap.usFee.sample).toBe(0);
  });

  it("maps all fields from the index row", () => {
    const row = makeIndexRow("2026-05-01", {
      broker_count: 12,
      avg_asx_fee: 9.5,
      median_asx_fee: 9,
      asx_fee_sample: 12,
    });
    const snap = buildCurrentMarketSnapshot(row);
    expect(snap.period).toBe("2026-05-01");
    expect(snap.activeBrokerCount).toBe(12);
    expect(snap.asxFee.mean).toBe(9.5);
    expect(snap.asxFee.median).toBe(9);
    expect(snap.asxFee.sample).toBe(12);
  });
});

// ─── buildFeeSpreadsByCategory ────────────────────────────────────────────────

describe("buildFeeSpreadsByCategory", () => {
  it("returns exactly 3 items in ASX → US → FX order", () => {
    const spreads = buildFeeSpreadsByCategory(descHistory[0] ?? null);
    expect(spreads).toHaveLength(3);
    expect(spreads[0]?.metric).toBe("asx");
    expect(spreads[1]?.metric).toBe("us");
    expect(spreads[2]?.metric).toBe("fx");
  });

  it("returns all-null spreads for null input", () => {
    const spreads = buildFeeSpreadsByCategory(null);
    expect(spreads.every((s) => s.mean === null)).toBe(true);
  });
});

// ─── buildAdvisorDemandByState ────────────────────────────────────────────────

describe("buildAdvisorDemandByState", () => {
  const advisors = [
    { location_state: "NSW", status: "active" },
    { location_state: "NSW", status: "active" },
    { location_state: "VIC", status: "active" },
    { location_state: "QLD", status: "active" },
    { location_state: "QLD", status: "inactive" }, // should be excluded
    { location_state: null, status: "active" }, // null state
    { location_state: "WA", status: "active" },
  ];

  it("counts only active advisors", () => {
    const result = buildAdvisorDemandByState(advisors, "2026-05-01");
    expect(result.total).toBe(6); // 4 named states + 1 null — inactive excluded
  });

  it("groups by state correctly", () => {
    const result = buildAdvisorDemandByState(advisors, "2026-05-01");
    const nsw = result.byState.find((s) => s.state === "NSW");
    expect(nsw?.count).toBe(2);
  });

  it("groups null states under null key", () => {
    const result = buildAdvisorDemandByState(advisors, "2026-05-01");
    const nullState = result.byState.find((s) => s.state === null);
    expect(nullState?.count).toBe(1);
  });

  it("sorts by count descending", () => {
    const result = buildAdvisorDemandByState(advisors, "2026-05-01");
    const counts = result.byState.map((s) => s.count);
    expect(counts[0]).toBeGreaterThanOrEqual(counts[1] ?? 0);
  });

  it("normalises state to uppercase", () => {
    const lower = [
      { location_state: "nsw", status: "active" },
      { location_state: "NSW", status: "active" },
    ];
    const result = buildAdvisorDemandByState(lower, "2026-05-01");
    expect(result.byState).toHaveLength(1);
    expect(result.byState[0]?.state).toBe("NSW");
    expect(result.byState[0]?.count).toBe(2);
  });

  it("returns empty byState and zero total for no active advisors", () => {
    const inactive = [{ location_state: "NSW", status: "inactive" }];
    const result = buildAdvisorDemandByState(inactive, "2026-05-01");
    expect(result.byState).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it("stores the asOf date", () => {
    const result = buildAdvisorDemandByState([], "2026-05-25");
    expect(result.asOf).toBe("2026-05-25");
  });
});

// ─── feeTrendNarrative ────────────────────────────────────────────────────────

describe("feeTrendNarrative", () => {
  it("describes a falling trend", () => {
    const summary = computeFeeTrendSummary(buildFeeTrendPoints(descHistory), "asx");
    const text = feeTrendNarrative(summary);
    expect(text).toContain("fallen");
    expect(text).toContain("Average ASX brokerage");
  });

  it("describes a rising trend", () => {
    const rising = [
      makeIndexRow("2026-05-01", { avg_asx_fee: 12 }),
      makeIndexRow("2026-03-01", { avg_asx_fee: 10 }),
    ];
    const summary = computeFeeTrendSummary(buildFeeTrendPoints(rising), "asx");
    expect(feeTrendNarrative(summary)).toContain("risen");
  });

  it("describes flat correctly", () => {
    const flat = [
      makeIndexRow("2026-05-01", { avg_asx_fee: 10.005 }),
      makeIndexRow("2026-04-01", { avg_asx_fee: 10 }),
    ];
    const summary = computeFeeTrendSummary(buildFeeTrendPoints(flat), "asx");
    expect(feeTrendNarrative(summary)).toContain("unchanged");
  });

  it("handles insufficient_data without throwing", () => {
    const summary = computeFeeTrendSummary([], "fx");
    expect(() => feeTrendNarrative(summary)).not.toThrow();
    expect(feeTrendNarrative(summary)).toContain("insufficient data");
  });
});

// ─── trimTrendWindow ──────────────────────────────────────────────────────────

describe("trimTrendWindow", () => {
  const points = buildFeeTrendPoints(descHistory); // 3 points

  it("returns full series when shorter than window", () => {
    expect(trimTrendWindow(points, 10)).toHaveLength(3);
  });

  it("trims to the last N points (most recent)", () => {
    const trimmed = trimTrendWindow(points, 2);
    expect(trimmed).toHaveLength(2);
    // Should be the last 2 (most recent) points
    expect(trimmed[trimmed.length - 1]?.period).toBe("2026-05-01");
  });

  it("returns full series when equal to window size", () => {
    expect(trimTrendWindow(points, 3)).toHaveLength(3);
  });

  it("returns empty array for empty input", () => {
    expect(trimTrendWindow([], 10)).toHaveLength(0);
  });
});
