/**
 * Tests for lib/scenario-deep-link.ts
 *
 * Two concerns:
 *   1. resolveScenarioParam — parses `?scenario=` values into saved-scenario indices.
 *   2. assembleSavedScenarioPreviews — builds dashboard preview objects from the
 *      persisted snapshot (pure, no I/O).
 *
 * Both functions are pure so no mocking is needed.
 */

import { describe, it, expect } from "vitest";
import {
  resolveScenarioParam,
  assembleSavedScenarioPreviews,
  type ScenarioPreview,
} from "@/lib/scenario-deep-link";
import type { ScenarioPlannerSnapshot } from "@/lib/scenario-engine";

// ─── Shared fixture helpers ───────────────────────────────────────────────────

type SnapshotScenario = ScenarioPlannerSnapshot["scenarios"][number];

function makeScenario(
  label: string,
  overrides: Partial<SnapshotScenario["summary"]> = {},
): SnapshotScenario {
  return {
    id: Math.random().toString(36).slice(2),
    label,
    savedAt: new Date().toISOString(),
    inputs: {
      currentAge: 35,
      retirementAge: 67,
      annualSalary: 100_000,
      employerSgRate: 0.115,
      currentSuperBalance: 150_000,
      extraConcessionalContribs: 0,
      nonConcessionalContribs: 0,
      unusedCarryForwardCap: 0,
      expectedReturnPct: 7,
      inflationRatePct: 3,
      desiredRetirementIncome: 60_000,
      annualInterestIncome: 0,
      annualUnfrankedDividends: 0,
      annualFrankedDividends: 0,
      frankingPct: 100,
      annualCapitalGain: 0,
      capitalGainDiscountEligible: false,
      propertyPurchasePrice: 0,
      propertyGrowthRatePct: 0,
      propertyRentalYieldPct: 3,
      propertyHoldingCostsPct: 1.5,
      propertyHeld12Months: true,
    },
    summary: {
      projectedSuperAtRetirement: 1_200_000,
      gapToTarget: -200_000, // surplus = on track
      isOnTrack: true,
      drawdownYears: 32,
      taxSavingOnExtraContribs: 0,
      taxOnInvestmentIncome: 0,
      ...overrides,
    },
  };
}

// ─── resolveScenarioParam ─────────────────────────────────────────────────────

describe("resolveScenarioParam", () => {
  const scenarios: readonly SnapshotScenario[] = [
    makeScenario("Conservative"),
    makeScenario("Moderate"),
    makeScenario("Aggressive"),
  ];

  it("returns -1 when param is null", () => {
    expect(resolveScenarioParam(null, scenarios)).toBe(-1);
  });

  it("returns -1 when param is undefined", () => {
    expect(resolveScenarioParam(undefined, scenarios)).toBe(-1);
  });

  it("returns -1 when param is empty string", () => {
    expect(resolveScenarioParam("", scenarios)).toBe(-1);
  });

  it("returns -1 when scenarios array is empty", () => {
    expect(resolveScenarioParam("0", [])).toBe(-1);
  });

  it("resolves a numeric '0' to index 0", () => {
    expect(resolveScenarioParam("0", scenarios)).toBe(0);
  });

  it("resolves a numeric '1' to index 1", () => {
    expect(resolveScenarioParam("1", scenarios)).toBe(1);
  });

  it("resolves a numeric '2' to index 2", () => {
    expect(resolveScenarioParam("2", scenarios)).toBe(2);
  });

  it("returns -1 for a numeric index that is out of range", () => {
    expect(resolveScenarioParam("5", scenarios)).toBe(-1);
  });

  it("resolves an exact label match (case-sensitive exact)", () => {
    expect(resolveScenarioParam("Moderate", scenarios)).toBe(1);
  });

  it("resolves a case-insensitive label match", () => {
    expect(resolveScenarioParam("aggressive", scenarios)).toBe(2);
    expect(resolveScenarioParam("CONSERVATIVE", scenarios)).toBe(0);
  });

  it("returns -1 for a label that does not match any scenario", () => {
    expect(resolveScenarioParam("NotExist", scenarios)).toBe(-1);
  });

  it("trims whitespace from both param and label for matching", () => {
    const padded: readonly SnapshotScenario[] = [makeScenario("  My Plan  ")];
    expect(resolveScenarioParam("  My Plan  ", padded)).toBe(0);
    expect(resolveScenarioParam("my plan", padded)).toBe(0);
  });

  it("prefers numeric match over label match when param is all digits", () => {
    // Scenario at index 1 is "Moderate"; a scenario named "1" would be label-matched
    // but "1" as numeric selects index 1 directly.
    expect(resolveScenarioParam("1", scenarios)).toBe(1);
  });

  it("handles a single-scenario array with numeric '0'", () => {
    const one: readonly SnapshotScenario[] = [makeScenario("Solo")];
    expect(resolveScenarioParam("0", one)).toBe(0);
  });
});

// ─── assembleSavedScenarioPreviews ────────────────────────────────────────────

describe("assembleSavedScenarioPreviews", () => {
  it("returns an empty array for undefined input", () => {
    expect(assembleSavedScenarioPreviews(undefined)).toEqual([]);
  });

  it("returns an empty array for null input", () => {
    expect(assembleSavedScenarioPreviews(null)).toEqual([]);
  });

  it("returns an empty array for an empty scenarios array", () => {
    expect(assembleSavedScenarioPreviews([])).toEqual([]);
  });

  it("maps one scenario to one ScenarioPreview", () => {
    const s = makeScenario("My Plan", {
      projectedSuperAtRetirement: 900_000,
      isOnTrack: false,
      gapToTarget: 600_000,
      drawdownYears: 15,
    });
    const [preview] = assembleSavedScenarioPreviews([s]);
    expect(preview).toBeDefined();
    expect(preview!.label).toBe("My Plan");
    expect(preview!.projectedSuper).toBe(900_000);
    expect(preview!.isOnTrack).toBe(false);
    expect(preview!.gapToTarget).toBe(600_000);
    expect(preview!.drawdownYears).toBe(15);
  });

  it("generates a numeric deep-link resumeHref for each scenario", () => {
    const scenarios = [
      makeScenario("Alpha"),
      makeScenario("Beta"),
      makeScenario("Gamma"),
    ];
    const previews = assembleSavedScenarioPreviews(scenarios);
    expect(previews[0]!.resumeHref).toBe("/scenarios/plan?scenario=0");
    expect(previews[1]!.resumeHref).toBe("/scenarios/plan?scenario=1");
    expect(previews[2]!.resumeHref).toBe("/scenarios/plan?scenario=2");
  });

  it("round-trips: resolveScenarioParam can resolve hrefs produced by assembly", () => {
    const scenarios = [
      makeScenario("A"),
      makeScenario("B"),
    ];
    const previews = assembleSavedScenarioPreviews(scenarios);
    for (const [i, preview] of previews.entries()) {
      // Extract the `?scenario=<N>` value from the href.
      const param = new URLSearchParams(preview!.resumeHref.split("?")[1]).get("scenario");
      expect(resolveScenarioParam(param, scenarios)).toBe(i);
    }
  });

  it("maps three scenarios preserving order", () => {
    const scenarios = [
      makeScenario("One"),
      makeScenario("Two"),
      makeScenario("Three"),
    ];
    const previews: ScenarioPreview[] = assembleSavedScenarioPreviews(scenarios);
    expect(previews.map((p) => p.label)).toEqual(["One", "Two", "Three"]);
  });

  it("correctly marks an on-track scenario", () => {
    const s = makeScenario("On Track", { isOnTrack: true, gapToTarget: -100_000 });
    const [preview] = assembleSavedScenarioPreviews([s]);
    expect(preview!.isOnTrack).toBe(true);
  });

  it("correctly marks an off-track scenario", () => {
    const s = makeScenario("Behind", { isOnTrack: false, gapToTarget: 500_000 });
    const [preview] = assembleSavedScenarioPreviews([s]);
    expect(preview!.isOnTrack).toBe(false);
    expect(preview!.gapToTarget).toBe(500_000);
  });
});
