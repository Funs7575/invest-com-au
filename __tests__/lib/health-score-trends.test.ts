import { describe, it, expect } from "vitest";
import {
  summariseTrend,
  normaliseSparklinePoints,
  formatDelta,
  type HealthScoreHistoryRow,
} from "@/lib/health-score-trends";

/* ─── Fixtures ─────────────────────────────────────────────────────────────── */

function makeRow(
  overall_score: number,
  captured_at: string,
): HealthScoreHistoryRow {
  return {
    captured_at,
    overall_score,
    regulatory_score: null,
    client_money_score: null,
    financial_stability_score: null,
    platform_reliability_score: null,
    insurance_score: null,
  };
}

const flat = [
  makeRow(72, "2026-01-01T00:00:00Z"),
  makeRow(72, "2026-02-01T00:00:00Z"),
  makeRow(72, "2026-03-01T00:00:00Z"),
];

const rising = [
  makeRow(60, "2026-01-01T00:00:00Z"),
  makeRow(70, "2026-02-01T00:00:00Z"),
  makeRow(80, "2026-03-01T00:00:00Z"),
];

const falling = [
  makeRow(85, "2026-01-01T00:00:00Z"),
  makeRow(75, "2026-02-01T00:00:00Z"),
  makeRow(60, "2026-03-01T00:00:00Z"),
];

/* Deliberately out of chronological order to test internal sort */
const outOfOrder = [
  makeRow(80, "2026-03-01T00:00:00Z"),
  makeRow(60, "2026-01-01T00:00:00Z"),
  makeRow(70, "2026-02-01T00:00:00Z"),
];

/* ─── summariseTrend ───────────────────────────────────────────────────────── */

describe("summariseTrend", () => {
  it("returns null for an empty array", () => {
    expect(summariseTrend([])).toBeNull();
  });

  it("returns a flat summary for a single-row series", () => {
    const result = summariseTrend([makeRow(70, "2026-01-01T00:00:00Z")]);
    expect(result).not.toBeNull();
    expect(result!.direction).toBe("flat");
    expect(result!.delta).toBe(0);
    expect(result!.count).toBe(1);
  });

  it("identifies rising trend", () => {
    const result = summariseTrend(rising);
    expect(result!.direction).toBe("up");
    expect(result!.delta).toBeCloseTo(20);
    expect(result!.latest).toBe(80);
    expect(result!.earliest).toBe(60);
  });

  it("identifies falling trend", () => {
    const result = summariseTrend(falling);
    expect(result!.direction).toBe("down");
    expect(result!.delta).toBeCloseTo(-25);
  });

  it("returns flat when delta is within ±1", () => {
    const nearFlat = [
      makeRow(72, "2026-01-01T00:00:00Z"),
      makeRow(72.5, "2026-02-01T00:00:00Z"),
    ];
    expect(summariseTrend(nearFlat)!.direction).toBe("flat");
  });

  it("returns flat for an array with equal scores", () => {
    expect(summariseTrend(flat)!.direction).toBe("flat");
  });

  it("sorts rows by captured_at before comparing first and last", () => {
    const result = summariseTrend(outOfOrder);
    expect(result!.earliest).toBe(60);
    expect(result!.latest).toBe(80);
    expect(result!.direction).toBe("up");
  });

  it("returns the correct count", () => {
    expect(summariseTrend(rising)!.count).toBe(3);
    expect(summariseTrend(flat)!.count).toBe(3);
  });
});

/* ─── normaliseSparklinePoints ─────────────────────────────────────────────── */

describe("normaliseSparklinePoints", () => {
  it("returns empty array for empty input", () => {
    expect(normaliseSparklinePoints([])).toEqual([]);
  });

  it("returns 0.5 for all points when all scores are equal (flat-line guard)", () => {
    const points = normaliseSparklinePoints(flat);
    expect(points).toHaveLength(3);
    expect(points.every((p) => p === 0.5)).toBe(true);
  });

  it("min maps to 0 and max maps to 1", () => {
    const points = normaliseSparklinePoints(rising);
    expect(Math.min(...points)).toBeCloseTo(0);
    expect(Math.max(...points)).toBeCloseTo(1);
  });

  it("intermediate values are proportional", () => {
    // rising: 60→70→80  → normalised: 0, 0.5, 1
    const points = normaliseSparklinePoints(rising);
    expect(points[0]).toBeCloseTo(0);
    expect(points[1]).toBeCloseTo(0.5);
    expect(points[2]).toBeCloseTo(1);
  });

  it("sorts out-of-order rows before normalising", () => {
    // outOfOrder: 60 (Jan), 70 (Feb), 80 (Mar) after sort
    const points = normaliseSparklinePoints(outOfOrder);
    expect(points[0]).toBeCloseTo(0);
    expect(points[2]).toBeCloseTo(1);
  });

  it("handles a single row — returns a single 0.5", () => {
    const points = normaliseSparklinePoints([makeRow(75, "2026-01-01T00:00:00Z")]);
    expect(points).toHaveLength(1);
    expect(points[0]).toBe(0.5);
  });
});

/* ─── formatDelta ──────────────────────────────────────────────────────────── */

describe("formatDelta", () => {
  it("formats positive deltas with a + prefix", () => {
    expect(formatDelta(5)).toBe("+5.0");
    expect(formatDelta(0.25)).toBe("+0.3");
  });

  it("formats negative deltas with a minus sign (U+2212)", () => {
    const result = formatDelta(-3.5);
    expect(result).toContain("3.5");
    expect(result.startsWith("−")).toBe(true); // U+2212, not hyphen
  });

  it("formats zero as +0.0", () => {
    expect(formatDelta(0)).toBe("+0.0");
  });

  it("rounds to 1 decimal place", () => {
    expect(formatDelta(10.15)).toBe("+10.2");
    expect(formatDelta(-2.04)).toBe("−2.0");
  });
});
