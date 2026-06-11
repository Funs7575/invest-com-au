import { describe, it, expect, vi } from "vitest";

// Pure-function tests only — mock both clients so importing the module
// never touches next/headers or service-role env vars.
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

import {
  deriveFeeChanges,
  formatFeeValue,
  MIN_FEE_DELTA,
  FEE_METRIC_LABELS,
  FEE_METRICS,
} from "@/lib/fee-changes";
import type { FeeSnapshotRow } from "@/lib/fee-index";

function snap(partial: Partial<FeeSnapshotRow>): FeeSnapshotRow {
  return {
    broker_slug: "alpha",
    captured_at: "2026-06-08T00:00:00.000Z",
    status: "active",
    asx_fee_value: null,
    us_fee_value: null,
    fx_rate: null,
    ...partial,
  };
}

describe("deriveFeeChanges", () => {
  it("emits an up event when an ASX fee rises between snapshots", () => {
    const events = deriveFeeChanges([
      snap({ captured_at: "2026-06-08T00:00:00.000Z", asx_fee_value: 9.5 }),
      snap({ captured_at: "2026-06-09T00:00:00.000Z", asx_fee_value: 11 }),
    ]);
    expect(events).toHaveLength(1);
    const ev = events[0]!;
    expect(ev.brokerSlug).toBe("alpha");
    expect(ev.metric).toBe("asx_fee");
    expect(ev.oldValue).toBe(9.5);
    expect(ev.newValue).toBe(11);
    expect(ev.delta).toBe(1.5);
    expect(ev.direction).toBe("up");
    expect(ev.changedAt).toBe("2026-06-09T00:00:00.000Z");
  });

  it("emits a down event with a negative delta", () => {
    const events = deriveFeeChanges([
      snap({ captured_at: "2026-06-08T00:00:00.000Z", us_fee_value: 5 }),
      snap({ captured_at: "2026-06-09T00:00:00.000Z", us_fee_value: 3 }),
    ]);
    expect(events).toHaveLength(1);
    expect(events[0]!.metric).toBe("us_fee");
    expect(events[0]!.direction).toBe("down");
    expect(events[0]!.delta).toBe(-2);
  });

  it("returns no events when values are unchanged", () => {
    const events = deriveFeeChanges([
      snap({ captured_at: "2026-06-08T00:00:00.000Z", asx_fee_value: 9.5, fx_rate: 0.6 }),
      snap({ captured_at: "2026-06-09T00:00:00.000Z", asx_fee_value: 9.5, fx_rate: 0.6 }),
    ]);
    expect(events).toEqual([]);
  });

  it("ignores sub-threshold float jitter but reports accumulated creep against the last reported baseline", () => {
    // Each step is below MIN_FEE_DELTA, but the cumulative move crosses it.
    const events = deriveFeeChanges([
      snap({ captured_at: "2026-06-08T00:00:00.000Z", asx_fee_value: 9.5 }),
      snap({ captured_at: "2026-06-08T06:00:00.000Z", asx_fee_value: 9.503 }),
      snap({ captured_at: "2026-06-08T12:00:00.000Z", asx_fee_value: 9.506 }),
    ]);
    expect(events).toHaveLength(1);
    expect(events[0]!.oldValue).toBe(9.5);
    expect(events[0]!.newValue).toBe(9.51);
    expect(events[0]!.changedAt).toBe("2026-06-08T12:00:00.000Z");
    // sanity: a single sub-threshold step alone reports nothing
    expect(
      deriveFeeChanges([
        snap({ captured_at: "2026-06-08T00:00:00.000Z", asx_fee_value: 9.5 }),
        snap({ captured_at: "2026-06-09T00:00:00.000Z", asx_fee_value: 9.5 + MIN_FEE_DELTA / 2 }),
      ]),
    ).toEqual([]);
  });

  it("treats null transitions as parsing gaps, not changes", () => {
    const events = deriveFeeChanges([
      snap({ captured_at: "2026-06-07T00:00:00.000Z", asx_fee_value: 9.5 }),
      snap({ captured_at: "2026-06-08T00:00:00.000Z", asx_fee_value: null }),
      snap({ captured_at: "2026-06-09T00:00:00.000Z", asx_fee_value: 9.5 }),
    ]);
    expect(events).toEqual([]);
  });

  it("detects a change across an intervening parsing gap", () => {
    const events = deriveFeeChanges([
      snap({ captured_at: "2026-06-07T00:00:00.000Z", asx_fee_value: 9.5 }),
      snap({ captured_at: "2026-06-08T00:00:00.000Z", asx_fee_value: null }),
      snap({ captured_at: "2026-06-09T00:00:00.000Z", asx_fee_value: 11 }),
    ]);
    expect(events).toHaveLength(1);
    expect(events[0]!.oldValue).toBe(9.5);
    expect(events[0]!.newValue).toBe(11);
  });

  it("skips inactive brokers and rows without a slug", () => {
    const events = deriveFeeChanges([
      snap({ status: "delisted", captured_at: "2026-06-08T00:00:00.000Z", asx_fee_value: 9.5 }),
      snap({ status: "delisted", captured_at: "2026-06-09T00:00:00.000Z", asx_fee_value: 11 }),
      snap({ broker_slug: "", captured_at: "2026-06-08T00:00:00.000Z", asx_fee_value: 1 }),
      snap({ broker_slug: "", captured_at: "2026-06-09T00:00:00.000Z", asx_fee_value: 2 }),
    ]);
    expect(events).toEqual([]);
  });

  it("tracks metrics independently and keeps brokers isolated", () => {
    const events = deriveFeeChanges([
      snap({ broker_slug: "alpha", captured_at: "2026-06-08T00:00:00.000Z", asx_fee_value: 9.5, fx_rate: 0.6 }),
      snap({ broker_slug: "alpha", captured_at: "2026-06-09T00:00:00.000Z", asx_fee_value: 9.5, fx_rate: 0.7 }),
      snap({ broker_slug: "beta", captured_at: "2026-06-08T00:00:00.000Z", asx_fee_value: 5 }),
      snap({ broker_slug: "beta", captured_at: "2026-06-09T00:00:00.000Z", asx_fee_value: 6.5 }),
    ]);
    expect(events).toHaveLength(2);
    const metrics = events.map((e) => `${e.brokerSlug}:${e.metric}`).sort();
    expect(metrics).toEqual(["alpha:fx_spread", "beta:asx_fee"]);
  });

  it("handles out-of-order input and returns events newest-first", () => {
    const events = deriveFeeChanges([
      // beta changes on the 9th; alpha changes on the 10th — input shuffled
      snap({ broker_slug: "beta", captured_at: "2026-06-09T00:00:00.000Z", asx_fee_value: 6 }),
      snap({ broker_slug: "alpha", captured_at: "2026-06-10T00:00:00.000Z", asx_fee_value: 12 }),
      snap({ broker_slug: "beta", captured_at: "2026-06-08T00:00:00.000Z", asx_fee_value: 5 }),
      snap({ broker_slug: "alpha", captured_at: "2026-06-08T00:00:00.000Z", asx_fee_value: 10 }),
    ]);
    expect(events.map((e) => e.brokerSlug)).toEqual(["alpha", "beta"]);
    expect(events[0]!.oldValue).toBe(10);
    expect(events[0]!.newValue).toBe(12);
  });

  it("reports a flap (A → B → A) as two events", () => {
    const events = deriveFeeChanges([
      snap({ captured_at: "2026-06-07T00:00:00.000Z", asx_fee_value: 9.5 }),
      snap({ captured_at: "2026-06-08T00:00:00.000Z", asx_fee_value: 11 }),
      snap({ captured_at: "2026-06-09T00:00:00.000Z", asx_fee_value: 9.5 }),
    ]);
    expect(events).toHaveLength(2);
    expect(events.map((e) => e.direction)).toEqual(["down", "up"]); // newest first
  });

  it("rounds reported values and deltas to 2 dp", () => {
    const events = deriveFeeChanges([
      snap({ captured_at: "2026-06-08T00:00:00.000Z", fx_rate: 0.601 }),
      snap({ captured_at: "2026-06-09T00:00:00.000Z", fx_rate: 0.708 }),
    ]);
    expect(events).toHaveLength(1);
    expect(events[0]!.oldValue).toBe(0.6);
    expect(events[0]!.newValue).toBe(0.71);
    expect(events[0]!.delta).toBe(0.11);
  });
});

describe("formatFeeValue", () => {
  it("formats dollar metrics as currency and fx_spread as a percentage", () => {
    expect(formatFeeValue("asx_fee", 9.5)).toBe("$9.50");
    expect(formatFeeValue("us_fee", 3)).toBe("$3.00");
    expect(formatFeeValue("fx_spread", 0.6)).toBe("0.60%");
  });
});

describe("metric registry", () => {
  it("has a label for every metric", () => {
    for (const metric of FEE_METRICS) {
      expect(FEE_METRIC_LABELS[metric]).toBeTruthy();
    }
  });
});
