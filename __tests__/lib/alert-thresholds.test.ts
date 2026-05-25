/**
 * Tests for lib/alert-thresholds.ts
 *
 * Covers:
 *   - evaluateThreshold: crossed / not-crossed (both directions)
 *   - Hysteresis dead-band prevents re-fire
 *   - Cooldown window suppresses within-window fires
 *   - Interaction: cooldown wins over hysteresis once re-armed
 *   - Edge cases: exactly-at-threshold, hysteresis boundary, zero threshold
 *   - metricKindLabel and metricKindPath sanity checks
 */

import { describe, it, expect } from "vitest";
import {
  evaluateThreshold,
  metricKindLabel,
  metricKindPath,
  DEFAULT_HYSTERESIS_BPS,
  type AlertSubscription,
} from "@/lib/alert-thresholds";

// ── Helpers ───────────────────────────────────────────────────────────────────

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const WEEK_MS = 7 * DAY_MS;

/** Reference "now" used across tests (a fixed point in time). */
const NOW_MS = new Date("2026-05-25T12:00:00Z").getTime();

/** Build a minimal fresh subscription (never fired). */
function makeSub(
  overrides: Partial<AlertSubscription> = {},
): AlertSubscription {
  return {
    id: "test-sub",
    metric_kind: "savings_rate",
    threshold_bps: 500, // 5.00%
    direction: "above",
    frequency: "instant",
    last_notified_at: null,
    last_fired_value_bps: null,
    ...overrides,
  };
}

// ── Basic crossing ─────────────────────────────────────────────────────────────

describe("evaluateThreshold — direction:above", () => {
  it("fires when current >= threshold (never fired before)", () => {
    const result = evaluateThreshold(makeSub(), 500, NOW_MS);
    expect(result.crossed).toBe(true);
    expect(result.shouldFire).toBe(true);
    expect(result.suppressReason).toBeUndefined();
  });

  it("fires when current strictly above threshold", () => {
    const result = evaluateThreshold(makeSub(), 550, NOW_MS);
    expect(result.shouldFire).toBe(true);
  });

  it("does NOT fire when current < threshold", () => {
    const result = evaluateThreshold(makeSub(), 499, NOW_MS);
    expect(result.crossed).toBe(false);
    expect(result.shouldFire).toBe(false);
    expect(result.suppressReason).toBe("not_crossed");
  });

  it("does NOT fire when current is exactly 1 bps below threshold", () => {
    const result = evaluateThreshold(makeSub(), 499, NOW_MS);
    expect(result.shouldFire).toBe(false);
  });
});

describe("evaluateThreshold — direction:below", () => {
  it("fires when current <= threshold (never fired before)", () => {
    const sub = makeSub({ direction: "below", threshold_bps: 500 });
    const result = evaluateThreshold(sub, 500, NOW_MS);
    expect(result.crossed).toBe(true);
    expect(result.shouldFire).toBe(true);
  });

  it("fires when current strictly below threshold", () => {
    const sub = makeSub({ direction: "below", threshold_bps: 500 });
    const result = evaluateThreshold(sub, 450, NOW_MS);
    expect(result.shouldFire).toBe(true);
  });

  it("does NOT fire when current > threshold", () => {
    const sub = makeSub({ direction: "below", threshold_bps: 500 });
    const result = evaluateThreshold(sub, 501, NOW_MS);
    expect(result.crossed).toBe(false);
    expect(result.shouldFire).toBe(false);
  });
});

// ── Cooldown window ────────────────────────────────────────────────────────────

describe("evaluateThreshold — cooldown", () => {
  it("suppresses within the instant (24h) cooldown window", () => {
    // Fired 12 hours ago.
    const sub = makeSub({
      last_notified_at: new Date(NOW_MS - 12 * HOUR_MS).toISOString(),
      last_fired_value_bps: 520,
    });
    // last_fired_value_bps=520 means it previously fired above 500.
    // Re-arm check: for "above", re-arm when last_fired <= (threshold - hysteresis).
    // 520 > 500 - 10 = 490 → has NOT re-armed → hysteresis suppresses first.
    // Let's use a sub where last_fired_value_bps is low enough to pass hysteresis.
    const subReArmed = makeSub({
      last_notified_at: new Date(NOW_MS - 12 * HOUR_MS).toISOString(),
      last_fired_value_bps: 480, // below threshold - hysteresis (490) → re-armed
    });
    const result = evaluateThreshold(subReArmed, 510, NOW_MS);
    expect(result.crossed).toBe(true);
    expect(result.shouldFire).toBe(false);
    expect(result.suppressReason).toBe("cooldown");
  });

  it("fires after the instant cooldown window has elapsed", () => {
    const sub = makeSub({
      last_notified_at: new Date(NOW_MS - 25 * HOUR_MS).toISOString(),
      last_fired_value_bps: 480, // re-armed
    });
    const result = evaluateThreshold(sub, 510, NOW_MS);
    expect(result.shouldFire).toBe(true);
  });

  it("respects the weekly cooldown window", () => {
    const sub = makeSub({
      frequency: "weekly",
      last_notified_at: new Date(NOW_MS - 3 * DAY_MS).toISOString(),
      last_fired_value_bps: 480,
    });
    const result = evaluateThreshold(sub, 510, NOW_MS);
    expect(result.shouldFire).toBe(false);
    expect(result.suppressReason).toBe("cooldown");
  });

  it("fires after the weekly cooldown window has elapsed", () => {
    const sub = makeSub({
      frequency: "weekly",
      last_notified_at: new Date(NOW_MS - (WEEK_MS + HOUR_MS)).toISOString(),
      last_fired_value_bps: 480,
    });
    const result = evaluateThreshold(sub, 510, NOW_MS);
    expect(result.shouldFire).toBe(true);
  });

  it("respects the daily cooldown window", () => {
    const sub = makeSub({
      frequency: "daily",
      last_notified_at: new Date(NOW_MS - 12 * HOUR_MS).toISOString(),
      last_fired_value_bps: 480,
    });
    const result = evaluateThreshold(sub, 510, NOW_MS);
    expect(result.shouldFire).toBe(false);
    expect(result.suppressReason).toBe("cooldown");
  });
});

// ── Hysteresis ─────────────────────────────────────────────────────────────────

describe("evaluateThreshold — hysteresis", () => {
  it("suppresses re-fire when value hasn't moved beyond hysteresis band (above)", () => {
    // Fired with value = 520. Threshold = 500. hysteresis = 10.
    // Re-arm threshold = 500 - 10 = 490. last_fired = 520 > 490 → not re-armed.
    const sub = makeSub({
      last_notified_at: new Date(NOW_MS - 2 * DAY_MS).toISOString(),
      last_fired_value_bps: 520,
    });
    const result = evaluateThreshold(sub, 510, NOW_MS);
    expect(result.crossed).toBe(true);
    expect(result.shouldFire).toBe(false);
    expect(result.suppressReason).toBe("hysteresis");
  });

  it("allows re-fire once value has dipped below re-arm threshold (above)", () => {
    // last_fired = 489. threshold = 500. Re-arm = 490. 489 <= 490 → re-armed.
    const sub = makeSub({
      last_notified_at: new Date(NOW_MS - 2 * DAY_MS).toISOString(),
      last_fired_value_bps: 489,
    });
    const result = evaluateThreshold(sub, 510, NOW_MS);
    expect(result.shouldFire).toBe(true);
  });

  it("exactly at re-arm boundary (above): re-armed", () => {
    // last_fired = 490 = threshold - hysteresis. Should re-arm.
    const sub = makeSub({
      last_notified_at: new Date(NOW_MS - 2 * DAY_MS).toISOString(),
      last_fired_value_bps: 490,
    });
    const result = evaluateThreshold(sub, 510, NOW_MS);
    expect(result.shouldFire).toBe(true);
  });

  it("suppresses re-fire when value hasn't risen above re-arm threshold (below)", () => {
    // direction=below, threshold=500, hysteresis=10. Re-arm = 500 + 10 = 510.
    // last_fired = 490. 490 < 510 → not re-armed.
    const sub = makeSub({
      direction: "below",
      threshold_bps: 500,
      last_notified_at: new Date(NOW_MS - 2 * DAY_MS).toISOString(),
      last_fired_value_bps: 490,
    });
    const result = evaluateThreshold(sub, 480, NOW_MS);
    expect(result.crossed).toBe(true);
    expect(result.shouldFire).toBe(false);
    expect(result.suppressReason).toBe("hysteresis");
  });

  it("allows re-fire for below direction once value rises above re-arm threshold", () => {
    // last_fired = 511. Re-arm = 510. 511 >= 510 → re-armed.
    const sub = makeSub({
      direction: "below",
      threshold_bps: 500,
      last_notified_at: new Date(NOW_MS - 2 * DAY_MS).toISOString(),
      last_fired_value_bps: 511,
    });
    const result = evaluateThreshold(sub, 480, NOW_MS);
    expect(result.shouldFire).toBe(true);
  });

  it("respects a custom hysteresis band", () => {
    // Custom hysteresis = 50 bps. threshold=500. Re-arm threshold = 500 - 50 = 450.
    // last_fired=445 → 445 <= 450 → re-armed → should fire.
    const subReArmed = makeSub({
      last_notified_at: new Date(NOW_MS - 2 * DAY_MS).toISOString(),
      last_fired_value_bps: 445,
    });
    const resultReArmed = evaluateThreshold(subReArmed, 510, NOW_MS, 50);
    expect(resultReArmed.shouldFire).toBe(true);

    // last_fired=455 → 455 > 450 → NOT re-armed → hysteresis blocks.
    const subNotReArmed = makeSub({
      last_notified_at: new Date(NOW_MS - 2 * DAY_MS).toISOString(),
      last_fired_value_bps: 455,
    });
    const resultNotReArmed = evaluateThreshold(subNotReArmed, 510, NOW_MS, 50);
    expect(resultNotReArmed.shouldFire).toBe(false);
    expect(resultNotReArmed.suppressReason).toBe("hysteresis");
  });

  it("first-fire (last_fired_value_bps=null) skips hysteresis check", () => {
    // No previous fire — hysteresis state is null.
    const sub = makeSub({ last_fired_value_bps: null, last_notified_at: null });
    const result = evaluateThreshold(sub, 550, NOW_MS);
    expect(result.shouldFire).toBe(true);
  });
});

// ── DEFAULT_HYSTERESIS_BPS constant ───────────────────────────────────────────

describe("DEFAULT_HYSTERESIS_BPS", () => {
  it("is 10", () => {
    expect(DEFAULT_HYSTERESIS_BPS).toBe(10);
  });
});

// ── Edge cases ─────────────────────────────────────────────────────────────────

describe("evaluateThreshold — edge cases", () => {
  it("handles zero threshold (above): fires when current >= 0", () => {
    const sub = makeSub({ threshold_bps: 0 });
    const result = evaluateThreshold(sub, 0, NOW_MS);
    expect(result.shouldFire).toBe(true);
  });

  it("handles very large current value (above direction)", () => {
    const sub = makeSub({ threshold_bps: 500 });
    const result = evaluateThreshold(sub, 999999, NOW_MS);
    expect(result.shouldFire).toBe(true);
  });

  it("handles null last_notified_at with null last_fired_value_bps (pristine sub)", () => {
    const sub = makeSub({
      last_notified_at: null,
      last_fired_value_bps: null,
    });
    const result = evaluateThreshold(sub, 600, NOW_MS);
    expect(result.shouldFire).toBe(true);
  });

  it("uses default NOW_MS when nowMs param is omitted", () => {
    // Just verify it doesn't throw and returns a boolean.
    const sub = makeSub();
    const result = evaluateThreshold(sub, 600);
    expect(typeof result.shouldFire).toBe("boolean");
  });
});

// ── metricKindLabel ────────────────────────────────────────────────────────────

describe("metricKindLabel", () => {
  it("returns human-readable labels for all known kinds", () => {
    expect(metricKindLabel("savings_rate")).toBe("savings account rate");
    expect(metricKindLabel("term_deposit")).toBe("term deposit rate");
    expect(metricKindLabel("loan_rate")).toBe("investment loan rate");
    expect(metricKindLabel("broker_fee")).toBe("brokerage fee");
  });
});

// ── metricKindPath ─────────────────────────────────────────────────────────────

describe("metricKindPath", () => {
  it("returns correct paths for all known kinds", () => {
    expect(metricKindPath("savings_rate")).toBe("/savings");
    expect(metricKindPath("term_deposit")).toBe("/term-deposits");
    expect(metricKindPath("loan_rate")).toBe("/investment-loans");
    expect(metricKindPath("broker_fee")).toBe("/");
  });
});
