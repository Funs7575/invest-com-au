import { describe, it, expect } from "vitest";
import {
  applySupplyThresholds,
  SUPPLY_THRESHOLDS,
  PER_COUNTRY_THRESHOLDS,
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

describe("PER_COUNTRY_THRESHOLDS", () => {
  it("has NZ experts threshold lower than the global default", () => {
    expect(PER_COUNTRY_THRESHOLDS["NZ"]?.experts).toBe(1);
    expect((PER_COUNTRY_THRESHOLDS["NZ"]?.experts ?? 0) < SUPPLY_THRESHOLDS.experts).toBe(true);
  });
});

describe("applySupplyThresholds — per-country overrides", () => {
  it("NZ experts: one expert passes (below global threshold of 2)", () => {
    expect(applySupplyThresholds(["nz-expert-1"], "experts", "NZ")).toEqual({
      rows: ["nz-expert-1"],
      didFallback: false,
    });
  });

  it("NZ experts: zero experts still falls back", () => {
    expect(applySupplyThresholds([], "experts", "NZ")).toEqual({
      rows: [],
      didFallback: true,
    });
  });

  it("non-NZ country still uses global experts threshold", () => {
    // AU: one expert is below global threshold of 2
    expect(applySupplyThresholds(["au-expert-1"], "experts", "AU")).toEqual({
      rows: [],
      didFallback: true,
    });
    // AU: two experts passes
    expect(applySupplyThresholds(["au-1", "au-2"], "experts", "AU")).toEqual({
      rows: ["au-1", "au-2"],
      didFallback: false,
    });
  });

  it("no countryCode falls back to global threshold", () => {
    expect(applySupplyThresholds(["x"], "experts")).toEqual({
      rows: [],
      didFallback: true,
    });
    expect(applySupplyThresholds(["x"], "experts", null)).toEqual({
      rows: [],
      didFallback: true,
    });
  });

  it("NZ listings and platforms use global thresholds (no NZ override)", () => {
    // NZ only overrides experts; listings/platforms use global
    expect(applySupplyThresholds(["a"], "listings", "NZ")).toEqual({
      rows: [],
      didFallback: true,
    });
    expect(applySupplyThresholds(["a", "b"], "listings", "NZ")).toEqual({
      rows: ["a", "b"],
      didFallback: false,
    });
  });
});
