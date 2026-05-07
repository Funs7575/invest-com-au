import { describe, it, expect } from "vitest";
import {
  applySupplyThresholds,
  SUPPLY_THRESHOLDS,
} from "@/lib/country-mode";

describe("SUPPLY_THRESHOLDS", () => {
  it("matches the committed Phase 1 values", () => {
    expect(SUPPLY_THRESHOLDS.listings).toBe(2);
    expect(SUPPLY_THRESHOLDS.experts).toBe(2);
    expect(SUPPLY_THRESHOLDS.platforms).toBe(3);
  });
});

describe("applySupplyThresholds", () => {
  it("returns rows unchanged when at or above the listings threshold", () => {
    const exactlyAtThreshold = ["a", "b"]; // listings = 2
    expect(applySupplyThresholds(exactlyAtThreshold, "listings")).toEqual({
      rows: exactlyAtThreshold,
      didFallback: false,
    });

    const aboveThreshold = ["a", "b", "c", "d"];
    expect(applySupplyThresholds(aboveThreshold, "listings")).toEqual({
      rows: aboveThreshold,
      didFallback: false,
    });
  });

  it("falls back when below listings threshold", () => {
    expect(applySupplyThresholds(["solo"], "listings")).toEqual({
      rows: [],
      didFallback: true,
    });
    expect(applySupplyThresholds([], "listings")).toEqual({
      rows: [],
      didFallback: true,
    });
  });

  it("uses experts threshold (2)", () => {
    expect(applySupplyThresholds(["a"], "experts")).toEqual({
      rows: [],
      didFallback: true,
    });
    expect(applySupplyThresholds(["a", "b"], "experts")).toEqual({
      rows: ["a", "b"],
      didFallback: false,
    });
  });

  it("uses platforms threshold (3) — stricter than listings/experts", () => {
    // 2 platforms is below threshold even though 2 listings/experts pass
    expect(applySupplyThresholds(["a", "b"], "platforms")).toEqual({
      rows: [],
      didFallback: true,
    });
    expect(applySupplyThresholds(["a", "b", "c"], "platforms")).toEqual({
      rows: ["a", "b", "c"],
      didFallback: false,
    });
  });

  it("preserves row identity when above threshold (referential, not a copy)", () => {
    const rows = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];
    const result = applySupplyThresholds(rows, "platforms");
    expect(result.didFallback).toBe(false);
    expect(result.rows).toBe(rows);
  });

  it("never returns a partial slice — show all or none", () => {
    // The rule: a near-miss country must not be ambiguously presented as
    // a curated set. Either we have enough, or we hide the strip.
    const oneShyOfPlatforms = ["a", "b"];
    const result = applySupplyThresholds(oneShyOfPlatforms, "platforms");
    expect(result.rows).toEqual([]);
    expect(result.didFallback).toBe(true);
  });
});
