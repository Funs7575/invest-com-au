import { describe, expect, it } from "vitest";

import { computeQualityWeights, type LeadSignals } from "@/lib/lead-quality-weights";

function lead(signals: Record<string, unknown>, converted: boolean): LeadSignals {
  return {
    quality_signals: signals,
    converted_at: converted ? "2026-05-01T00:00:00Z" : null,
  };
}

describe("computeQualityWeights", () => {
  it("returns empty rows + baseline=0 for an empty lead set", () => {
    const result = computeQualityWeights([], ["has_phone"]);
    expect(result.baselineHitRate).toBe(0);
    expect(result.rows).toEqual([]);
    expect(result.totalLeads).toBe(0);
    expect(result.totalConverted).toBe(0);
  });

  it("skips signals below the minSampleSize gate (default 20)", () => {
    // 30 total leads, but only 5 have the signal — not enough for a row.
    const leads = [
      ...Array(5).fill(0).map(() => lead({ has_phone: true }, true)),
      ...Array(25).fill(0).map(() => lead({ has_phone: false }, false)),
    ];
    const result = computeQualityWeights(leads, ["has_phone"]);
    expect(result.rows).toEqual([]);
    expect(result.totalLeads).toBe(30);
  });

  it("emits a row when sample crosses minSampleSize and lift > baseline", () => {
    // 100 leads, 20% baseline conversion. 30 have the signal, half convert
    // (50% hit rate = 2.5× lift). lift*20 = 50, clamped at 50.
    const leads = [
      ...Array(15).fill(0).map(() => lead({ has_phone: true }, true)),
      ...Array(15).fill(0).map(() => lead({ has_phone: true }, false)),
      ...Array(5).fill(0).map(() => lead({ has_phone: false }, true)),
      ...Array(65).fill(0).map(() => lead({ has_phone: false }, false)),
    ];
    const result = computeQualityWeights(leads, ["has_phone"]);
    expect(result.totalLeads).toBe(100);
    expect(result.totalConverted).toBe(20);
    expect(result.baselineHitRate).toBe(0.2);
    expect(result.rows).toHaveLength(1);
    const row = result.rows[0]!;
    expect(row.signal_name).toBe("has_phone");
    expect(row.sample_size).toBe(30);
    expect(row.hit_rate).toBe(0.5);
    expect(row.weight).toBe(50); // clamped at max
  });

  it("emits a low weight when a signal predicts conversion below baseline", () => {
    // 100 leads, 50% baseline. 30 have the signal, but only 3 convert
    // (10% hit rate = 0.2× lift). lift*20 = 4.
    const leads = [
      ...Array(3).fill(0).map(() => lead({ utm: "fb" }, true)),
      ...Array(27).fill(0).map(() => lead({ utm: "fb" }, false)),
      ...Array(47).fill(0).map(() => lead({ utm: "google" }, true)),
      ...Array(23).fill(0).map(() => lead({ utm: "google" }, false)),
    ];
    const result = computeQualityWeights(leads, ["utm"]);
    // Signal is present on all 100 leads (key exists with a truthy value).
    expect(result.rows).toHaveLength(1);
    const row = result.rows[0]!;
    expect(row.sample_size).toBe(100);
    expect(row.weight).toBeGreaterThan(0);
    expect(row.weight).toBeLessThan(50);
  });

  it("clamps the weight to 0 when no leads with the signal converted", () => {
    // 30 leads with the signal, 0 conversions. lift = 0 → weight = 0.
    const leads = [
      ...Array(30).fill(0).map(() => lead({ has_phone: true }, false)),
      ...Array(20).fill(0).map(() => lead({ has_phone: false }, true)),
    ];
    const result = computeQualityWeights(leads, ["has_phone"]);
    expect(result.rows[0]?.weight).toBe(0);
  });

  it("respects custom minSampleSize", () => {
    const leads = Array(10).fill(0).map(() => lead({ has_phone: true }, true));
    const result = computeQualityWeights(leads, ["has_phone"], { minSampleSize: 5 });
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.weight).toBeGreaterThan(0);
  });

  it("respects custom maxWeight clamp", () => {
    const leads = [
      ...Array(30).fill(0).map(() => lead({ has_phone: true }, true)),
      ...Array(70).fill(0).map(() => lead({ has_phone: false }, false)),
    ];
    const result = computeQualityWeights(leads, ["has_phone"], { maxWeight: 25 });
    expect(result.rows[0]?.weight).toBeLessThanOrEqual(25);
  });

  it("skips signals whose key is missing or falsy on every lead", () => {
    const leads = Array(50).fill(0).map(() => lead({}, true));
    const result = computeQualityWeights(leads, ["has_phone", "utm"]);
    expect(result.rows).toEqual([]);
  });

  it("emits one row per signal name that clears the gate", () => {
    const leads = [
      ...Array(30).fill(0).map(() => lead({ has_phone: true, utm: "fb" }, true)),
      ...Array(70).fill(0).map(() => lead({ has_phone: false, utm: "google" }, false)),
    ];
    const result = computeQualityWeights(leads, ["has_phone", "utm"]);
    expect(result.rows.map((r) => r.signal_name).sort()).toEqual(["has_phone", "utm"]);
  });

  it("treats null quality_signals as no signal present", () => {
    const leads = [
      ...Array(30).fill(0).map(() => lead({ has_phone: true }, true)),
      ...Array(20).fill(0).map(() => ({ quality_signals: null, converted_at: null }) as LeadSignals),
    ];
    const result = computeQualityWeights(leads, ["has_phone"]);
    expect(result.rows[0]?.sample_size).toBe(30);
    expect(result.totalLeads).toBe(50);
  });

  it("does not divide by zero when baseline is 0", () => {
    const leads = Array(30).fill(0).map(() => lead({ has_phone: true }, false));
    const result = computeQualityWeights(leads, ["has_phone"]);
    expect(result.baselineHitRate).toBe(0);
    // lift defaults to 1 when baseline is 0, so weight = 1 * liftScale clamped
    expect(result.rows[0]?.weight).toBe(20);
  });
});
