import { describe, it, expect } from "vitest";
import {
  roundTo,
  summarise,
  latestPerActiveBroker,
  computeFeeIndex,
  utcDay,
  nearestOnOrBefore,
  computeTrend,
  type FeeSnapshotRow,
  type FeeIndexSnapshot,
} from "@/lib/fee-index";

function snap(partial: Partial<FeeSnapshotRow>): FeeSnapshotRow {
  return {
    broker_slug: "x",
    captured_at: "2026-05-20T00:00:00.000Z",
    status: "active",
    asx_fee_value: null,
    us_fee_value: null,
    fx_rate: null,
    ...partial,
  };
}

function indexRow(partial: Partial<FeeIndexSnapshot>): FeeIndexSnapshot {
  return {
    period: "2026-05-21",
    computed_at: "2026-05-21T02:00:00.000Z",
    broker_count: 5,
    asx_fee_sample: 5,
    us_fee_sample: 5,
    fx_spread_sample: 5,
    avg_asx_fee: 6,
    avg_us_fee: 5,
    avg_fx_spread: 0.6,
    median_asx_fee: 6,
    median_us_fee: 5,
    median_fx_spread: 0.6,
    source: "cron",
    ...partial,
  };
}

describe("roundTo", () => {
  it("rounds to 2dp by default and preserves null", () => {
    expect(roundTo(6.426)).toBe(6.43);
    expect(roundTo(null)).toBeNull();
    expect(roundTo(Number.NaN)).toBeNull();
  });
});

describe("summarise", () => {
  it("returns nulls (not zero) for an empty / all-null list", () => {
    expect(summarise([])).toEqual({ mean: null, median: null, sample: 0 });
    expect(summarise([null, undefined])).toEqual({
      mean: null,
      median: null,
      sample: 0,
    });
  });

  it("computes mean and median for an odd-length list", () => {
    const s = summarise([3, 9, 6]);
    expect(s.mean).toBe(6);
    expect(s.median).toBe(6);
    expect(s.sample).toBe(3);
  });

  it("averages the two middle values for an even-length list", () => {
    const s = summarise([2, 4, 6, 8]);
    expect(s.mean).toBe(5);
    expect(s.median).toBe(5); // (4 + 6) / 2
    expect(s.sample).toBe(4);
  });

  it("drops non-finite values from the sample", () => {
    const s = summarise([10, Number.NaN, null, 20]);
    expect(s.sample).toBe(2);
    expect(s.mean).toBe(15);
  });

  it("is outlier-aware: median diverges from mean", () => {
    const s = summarise([5, 5, 5, 100]);
    expect(s.median).toBe(5);
    expect(s.mean).toBe(28.75);
  });
});

describe("latestPerActiveBroker", () => {
  it("keeps only the most recent snapshot per broker", () => {
    const rows = [
      snap({ broker_slug: "a", captured_at: "2026-05-19T00:00:00Z", asx_fee_value: 3 }),
      snap({ broker_slug: "a", captured_at: "2026-05-20T00:00:00Z", asx_fee_value: 5 }),
      snap({ broker_slug: "b", captured_at: "2026-05-20T00:00:00Z", asx_fee_value: 9 }),
    ];
    const out = latestPerActiveBroker(rows);
    expect(out).toHaveLength(2);
    const a = out.find((r) => r.broker_slug === "a");
    expect(a?.asx_fee_value).toBe(5); // newer row wins
  });

  it("excludes non-active brokers", () => {
    const rows = [
      snap({ broker_slug: "a", status: "active" }),
      snap({ broker_slug: "b", status: "inactive" }),
      snap({ broker_slug: "c", status: null }), // null status treated as included
    ];
    const out = latestPerActiveBroker(rows);
    const slugs = out.map((r) => r.broker_slug).sort();
    expect(slugs).toEqual(["a", "c"]);
  });

  it("ignores rows with an empty slug", () => {
    const rows = [snap({ broker_slug: "" }), snap({ broker_slug: "a" })];
    expect(latestPerActiveBroker(rows)).toHaveLength(1);
  });
});

describe("computeFeeIndex", () => {
  it("computes per-metric stats over the latest active rows", () => {
    const rows = [
      snap({ broker_slug: "a", captured_at: "2026-05-20T01:00:00Z", asx_fee_value: 5, us_fee_value: 9, fx_rate: 0.5 }),
      // stale duplicate for a — should be ignored
      snap({ broker_slug: "a", captured_at: "2026-05-19T01:00:00Z", asx_fee_value: 99, us_fee_value: 99, fx_rate: 9 }),
      snap({ broker_slug: "b", captured_at: "2026-05-20T01:00:00Z", asx_fee_value: 7, us_fee_value: 11, fx_rate: 0.7 }),
      // inactive broker — excluded entirely
      snap({ broker_slug: "c", status: "inactive", asx_fee_value: 1000, us_fee_value: 1000, fx_rate: 1000 }),
    ];
    const result = computeFeeIndex(rows, "2026-05-21");
    expect(result.period).toBe("2026-05-21");
    expect(result.brokerCount).toBe(2);
    expect(result.asxFee.mean).toBe(6); // (5 + 7) / 2
    expect(result.usFee.mean).toBe(10); // (9 + 11) / 2
    expect(result.fxSpread.mean).toBe(0.6); // (0.5 + 0.7) / 2
  });

  it("reports zero brokers and null means when the window is empty", () => {
    const result = computeFeeIndex([], "2026-05-21");
    expect(result.brokerCount).toBe(0);
    expect(result.asxFee.mean).toBeNull();
    expect(result.usFee.sample).toBe(0);
  });

  it("counts a broker toward brokerCount even if one metric is missing", () => {
    const rows = [
      snap({ broker_slug: "a", asx_fee_value: 5, us_fee_value: null, fx_rate: 0.5 }),
    ];
    const result = computeFeeIndex(rows, "2026-05-21");
    expect(result.brokerCount).toBe(1);
    expect(result.asxFee.sample).toBe(1);
    expect(result.usFee.sample).toBe(0); // no US value contributed
    expect(result.usFee.mean).toBeNull();
  });
});

describe("utcDay", () => {
  it("returns the UTC calendar day", () => {
    expect(utcDay(new Date("2026-05-21T23:30:00.000Z"))).toBe("2026-05-21");
    // 13:30 UTC is next-day AEST but the index keys on UTC
    expect(utcDay(new Date("2026-05-21T13:30:00.000Z"))).toBe("2026-05-21");
  });
});

describe("nearestOnOrBefore", () => {
  const history: FeeIndexSnapshot[] = [
    indexRow({ period: "2026-05-01" }),
    indexRow({ period: "2026-02-15" }),
    indexRow({ period: "2025-05-20" }),
  ];

  it("picks the closest row not newer than the target", () => {
    expect(nearestOnOrBefore(history, "2026-02-20")?.period).toBe("2026-02-15");
  });

  it("returns null when every row is newer than the target", () => {
    expect(nearestOnOrBefore(history, "2024-01-01")).toBeNull();
  });

  it("matches an exact period", () => {
    expect(nearestOnOrBefore(history, "2026-05-01")?.period).toBe("2026-05-01");
  });
});

describe("computeTrend", () => {
  it("returns null windows when there is no comparable history", () => {
    const latest = indexRow({ period: "2026-05-21" });
    const trend = computeTrend(latest, [latest]);
    expect(trend.quarter).toBeNull();
    expect(trend.year).toBeNull();
  });

  it("computes QoQ and YoY deltas against the nearest prior rows", () => {
    const latest = indexRow({ period: "2026-05-21", avg_asx_fee: 5, avg_us_fee: 8, avg_fx_spread: 0.5 });
    const history: FeeIndexSnapshot[] = [
      latest,
      // ~3 months prior (target ≈ 2026-02-20)
      indexRow({ period: "2026-02-18", avg_asx_fee: 6, avg_us_fee: 10, avg_fx_spread: 0.6 }),
      // ~12 months prior (target ≈ 2025-05-21)
      indexRow({ period: "2025-05-19", avg_asx_fee: 8, avg_us_fee: 12, avg_fx_spread: 0.8 }),
    ];
    const trend = computeTrend(latest, history);

    expect(trend.quarter?.avgAsxFee.previous).toBe(6);
    expect(trend.quarter?.avgAsxFee.change).toBe(-1); // 5 - 6
    expect(trend.quarter?.avgAsxFee.changePct).toBeCloseTo(-16.67, 1);

    expect(trend.year?.avgAsxFee.previous).toBe(8);
    expect(trend.year?.avgAsxFee.change).toBe(-3); // 5 - 8
    expect(trend.year?.avgFxSpread.change).toBeCloseTo(-0.3, 5); // 0.5 - 0.8
  });

  it("yields a null delta when the comparison value is missing", () => {
    const latest = indexRow({ period: "2026-05-21", avg_asx_fee: 5 });
    const history: FeeIndexSnapshot[] = [
      latest,
      indexRow({ period: "2026-02-18", avg_asx_fee: null }),
    ];
    const trend = computeTrend(latest, history);
    expect(trend.quarter?.avgAsxFee.previous).toBeNull();
    expect(trend.quarter?.avgAsxFee.change).toBeNull();
    expect(trend.quarter?.avgAsxFee.changePct).toBeNull();
  });
});
