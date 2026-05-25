/**
 * Unit tests for lib/pro-insights.ts
 *
 * All three helpers are pure transformers (no I/O) so no mocking is needed.
 * Pattern mirrors __tests__/lib/health-score-trends.test.ts and
 * __tests__/lib/fee-index.test.ts.
 */

import { describe, it, expect } from "vitest";
import {
  buildFeeComparisonRows,
  buildHealthScoreMovers,
  buildLoanRateSummary,
  formatDelta,
  type LoanRateRow,
} from "@/lib/pro-insights";
import type { FeeSnapshotRow } from "@/lib/fee-index";
import type { BrokerHealthScore } from "@/lib/types";
import type { HealthScoreHistoryRow } from "@/lib/health-score-trends";

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeSnap(
  slug: string,
  captured_at: string,
  asx: number | null = 9.5,
  us: number | null = 1.0,
  fx: number | null = 0.6,
  status = "active",
): FeeSnapshotRow {
  return {
    broker_slug: slug,
    captured_at,
    status,
    asx_fee_value: asx,
    us_fee_value: us,
    fx_rate: fx,
  };
}

function makeScore(
  slug: string,
  overall: number,
): BrokerHealthScore {
  return {
    id: 1,
    broker_slug: slug,
    overall_score: overall,
    regulatory_score: overall,
    client_money_score: overall,
    financial_stability_score: overall,
    platform_reliability_score: overall,
    insurance_score: overall,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
}

function makeHistory(
  slug: string,
  scores: number[],
): HealthScoreHistoryRow[] {
  return scores.map((s, i) => ({
    overall_score: s,
    captured_at: `2026-0${i + 1}-01T00:00:00Z`,
    regulatory_score: null,
    client_money_score: null,
    financial_stability_score: null,
    platform_reliability_score: null,
    insurance_score: null,
    broker_slug: slug,
  }));
}

function makeLoan(overrides: Partial<LoanRateRow> = {}): LoanRateRow {
  return {
    lender_name: "Test Bank",
    lender_slug: "test-bank",
    rate_pct: 6.5,
    comparison_rate_pct: 6.55,
    max_lvr: 80,
    interest_only: false,
    offset_available: true,
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

// ─── buildFeeComparisonRows ───────────────────────────────────────────────────

describe("buildFeeComparisonRows", () => {
  it("returns an empty array when no snapshots are provided", () => {
    expect(buildFeeComparisonRows([], new Map())).toEqual([]);
  });

  it("resolves display names from the nameMap, falling back to slug", () => {
    const snaps = [makeSnap("commsec", "2026-05-01T00:00:00Z")];
    const nameMap = new Map([["commsec", "CommSec"]]);
    const rows = buildFeeComparisonRows(snaps, nameMap);
    expect(rows[0]?.name).toBe("CommSec");
  });

  it("uses slug as display name when not in nameMap", () => {
    const snaps = [makeSnap("unknown-broker", "2026-05-01T00:00:00Z")];
    const rows = buildFeeComparisonRows(snaps, new Map());
    expect(rows[0]?.name).toBe("unknown-broker");
  });

  it("de-duplicates to the latest snapshot per broker", () => {
    const snaps = [
      makeSnap("commsec", "2026-04-01T00:00:00Z", 19.95),
      makeSnap("commsec", "2026-05-01T00:00:00Z", 9.95), // newer — should win
    ];
    const rows = buildFeeComparisonRows(snaps, new Map([["commsec", "CommSec"]]));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.asxFee).toBe(9.95);
  });

  it("excludes inactive brokers", () => {
    const snaps = [
      makeSnap("active-broker", "2026-05-01T00:00:00Z", 9.95, 1.0, 0.6, "active"),
      makeSnap("inactive-broker", "2026-05-01T00:00:00Z", 5.0, 1.0, 0.6, "inactive"),
    ];
    const rows = buildFeeComparisonRows(snaps, new Map());
    expect(rows).toHaveLength(1);
    expect(rows[0]?.slug).toBe("active-broker");
  });

  it("sorts by ASX fee ascending, with nulls last", () => {
    const snaps = [
      makeSnap("b", "2026-05-01T00:00:00Z", 19.95),
      makeSnap("a", "2026-05-01T00:00:00Z", 5.0),
      makeSnap("c", "2026-05-01T00:00:00Z", null),
    ];
    const rows = buildFeeComparisonRows(snaps, new Map());
    expect(rows[0]?.slug).toBe("a");
    expect(rows[1]?.slug).toBe("b");
    expect(rows[2]?.slug).toBe("c");
  });

  it("populates asxFee, usFee, fxSpread correctly", () => {
    const snaps = [makeSnap("hl", "2026-05-01T00:00:00Z", 8.0, 0.5, 0.7)];
    const rows = buildFeeComparisonRows(snaps, new Map([["hl", "Hatch"]]));
    expect(rows[0]).toMatchObject({ asxFee: 8.0, usFee: 0.5, fxSpread: 0.7 });
  });

  it("handles multiple brokers correctly", () => {
    const snaps = [
      makeSnap("sj", "2026-05-01T00:00:00Z", 3.0),
      makeSnap("hl", "2026-05-01T00:00:00Z", 8.0),
      makeSnap("commsec", "2026-05-01T00:00:00Z", 19.95),
    ];
    const rows = buildFeeComparisonRows(
      snaps,
      new Map([["sj", "SelfWealth"], ["hl", "Hatch"], ["commsec", "CommSec"]]),
    );
    expect(rows).toHaveLength(3);
    expect(rows.map((r) => r.slug)).toEqual(["sj", "hl", "commsec"]);
  });
});

// ─── buildHealthScoreMovers ───────────────────────────────────────────────────

describe("buildHealthScoreMovers", () => {
  it("returns an empty array when no scores are provided", () => {
    expect(buildHealthScoreMovers([], new Map(), new Map())).toEqual([]);
  });

  it("returns an empty array when histories are empty (no trend data)", () => {
    const scores = [makeScore("commsec", 70)];
    const histories = new Map<string, HealthScoreHistoryRow[]>([
      ["commsec", []],
    ]);
    expect(buildHealthScoreMovers(scores, histories, new Map())).toEqual([]);
  });

  it("excludes brokers with delta < 0.5 (flat)", () => {
    const scores = [makeScore("flat-broker", 72)];
    // history with near-identical scores
    const histories = new Map([
      ["flat-broker", makeHistory("flat-broker", [72, 72.3])],
    ]);
    expect(buildHealthScoreMovers(scores, histories, new Map())).toHaveLength(0);
  });

  it("includes brokers with significant delta", () => {
    const scores = [makeScore("rising", 80)];
    const histories = new Map([
      ["rising", makeHistory("rising", [60, 70, 80])],
    ]);
    const movers = buildHealthScoreMovers(scores, histories, new Map([["rising", "Rising Co"]]));
    expect(movers).toHaveLength(1);
    expect(movers[0]?.name).toBe("Rising Co");
    expect(movers[0]?.trend.direction).toBe("up");
  });

  it("sorts movers by |delta| descending", () => {
    const scores = [
      makeScore("big-mover", 80),
      makeScore("small-mover", 60),
    ];
    const histories = new Map([
      ["big-mover", makeHistory("big-mover", [55, 80])],   // delta = +25
      ["small-mover", makeHistory("small-mover", [55, 60])], // delta = +5
    ]);
    const movers = buildHealthScoreMovers(scores, histories, new Map());
    expect(movers[0]?.slug).toBe("big-mover");
    expect(movers[1]?.slug).toBe("small-mover");
  });

  it("respects the limit parameter", () => {
    const scores = [
      makeScore("a", 80),
      makeScore("b", 90),
      makeScore("c", 60),
    ];
    const histories = new Map([
      ["a", makeHistory("a", [55, 80])],
      ["b", makeHistory("b", [60, 90])],
      ["c", makeHistory("c", [80, 60])],
    ]);
    const movers = buildHealthScoreMovers(scores, histories, new Map(), 2);
    expect(movers).toHaveLength(2);
  });

  it("correctly reports currentScore from the scores array", () => {
    const scores = [makeScore("hl", 78)];
    const histories = new Map([
      ["hl", makeHistory("hl", [60, 78])],
    ]);
    const movers = buildHealthScoreMovers(scores, histories, new Map());
    expect(movers[0]?.currentScore).toBe(78);
  });

  it("uses slug as name when nameMap has no entry", () => {
    const scores = [makeScore("mystery-slug", 80)];
    const histories = new Map([
      ["mystery-slug", makeHistory("mystery-slug", [60, 80])],
    ]);
    const movers = buildHealthScoreMovers(scores, histories, new Map());
    expect(movers[0]?.name).toBe("mystery-slug");
  });
});

// ─── buildLoanRateSummary ─────────────────────────────────────────────────────

describe("buildLoanRateSummary", () => {
  it("returns all nulls and empty arrays for an empty input", () => {
    const result = buildLoanRateSummary([]);
    expect(result.lowestRate).toBeNull();
    expect(result.highestRate).toBeNull();
    expect(result.medianRate).toBeNull();
    expect(result.recentlyUpdated).toEqual([]);
    expect(result.allRates).toEqual([]);
  });

  it("returns the single row as both lowest and highest for a 1-element input", () => {
    const rows = [makeLoan({ rate_pct: 6.5 })];
    const result = buildLoanRateSummary(rows);
    expect(result.lowestRate).toBe(6.5);
    expect(result.highestRate).toBe(6.5);
    expect(result.medianRate).toBe(6.5);
  });

  it("computes median correctly for an even-length list", () => {
    const rows = [
      makeLoan({ lender_slug: "a", rate_pct: 6.0 }),
      makeLoan({ lender_slug: "b", rate_pct: 7.0 }),
      makeLoan({ lender_slug: "c", rate_pct: 8.0 }),
      makeLoan({ lender_slug: "d", rate_pct: 9.0 }),
    ];
    const result = buildLoanRateSummary(rows);
    expect(result.medianRate).toBe(7.5); // (7.0 + 8.0) / 2
    expect(result.lowestRate).toBe(6.0);
    expect(result.highestRate).toBe(9.0);
  });

  it("computes median correctly for an odd-length list", () => {
    const rows = [
      makeLoan({ lender_slug: "a", rate_pct: 5.0 }),
      makeLoan({ lender_slug: "b", rate_pct: 6.5 }),
      makeLoan({ lender_slug: "c", rate_pct: 8.0 }),
    ];
    const result = buildLoanRateSummary(rows);
    expect(result.medianRate).toBe(6.5);
  });

  it("sorts allRates by rate_pct ascending", () => {
    const rows = [
      makeLoan({ lender_slug: "c", rate_pct: 8.0 }),
      makeLoan({ lender_slug: "a", rate_pct: 5.0 }),
      makeLoan({ lender_slug: "b", rate_pct: 6.5 }),
    ];
    const result = buildLoanRateSummary(rows);
    expect(result.allRates.map((r) => r.rate_pct)).toEqual([5.0, 6.5, 8.0]);
  });

  it("classifies recentlyUpdated within 30 days correctly", () => {
    const now = new Date("2026-05-25T00:00:00Z");
    const rows = [
      makeLoan({ lender_slug: "recent", updated_at: "2026-05-10T00:00:00Z" }),    // 15 days ago — recent
      makeLoan({ lender_slug: "old", updated_at: "2026-03-01T00:00:00Z" }),        // ~85 days ago — old
      makeLoan({ lender_slug: "boundary", updated_at: "2026-04-25T00:00:00Z" }),   // 30 days ago exactly — included
    ];
    const result = buildLoanRateSummary(rows, now);
    const slugs = result.recentlyUpdated.map((r) => r.lender_slug).sort();
    expect(slugs).toContain("recent");
    expect(slugs).toContain("boundary");
    expect(slugs).not.toContain("old");
  });

  it("does not include stale entries in recentlyUpdated", () => {
    const now = new Date("2026-05-25T00:00:00Z");
    const rows = [
      makeLoan({ lender_slug: "stale", updated_at: "2025-01-01T00:00:00Z" }),
    ];
    const result = buildLoanRateSummary(rows, now);
    expect(result.recentlyUpdated).toHaveLength(0);
  });
});

// ─── formatDelta re-export ────────────────────────────────────────────────────

describe("formatDelta (re-exported from pro-insights)", () => {
  it("formats positive delta with + prefix", () => {
    expect(formatDelta(5)).toBe("+5.0");
  });

  it("formats negative delta with U+2212 minus", () => {
    const result = formatDelta(-3.5);
    expect(result.startsWith("−")).toBe(true); // U+2212
    expect(result).toContain("3.5");
  });
});
