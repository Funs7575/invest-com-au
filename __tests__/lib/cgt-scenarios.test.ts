import { describe, it, expect } from "vitest";
import {
  CGT_SCENARIOS,
  cgtScenario,
  cgtScenarioOutcomes,
  relatedCgtScenarios,
} from "@/lib/cgt-scenarios";

describe("cgt scenario grid", () => {
  it("has unique slugs and resolves round-trip", () => {
    expect(CGT_SCENARIOS.length).toBe(18);
    expect(new Set(CGT_SCENARIOS.map((s) => s.slug)).size).toBe(18);
    for (const s of CGT_SCENARIOS) {
      expect(cgtScenario(s.slug)).toEqual(s);
    }
    expect(cgtScenario("nope")).toBeNull();
  });

  it("outcomes match the engine: 50k at 37% saves 9,250 via the discount", () => {
    const s = cgtScenario("50k-gain-at-37pc")!;
    const { shortHold, longHold } = cgtScenarioOutcomes(s);
    expect(shortHold.taxWithDiscount).toBeCloseTo(18_500, 0);
    expect(longHold.taxWithDiscount).toBeCloseTo(9_250, 0);
    expect(longHold.taxSaved).toBeCloseTo(9_250, 0);
    expect(longHold.discountedGain).toBeCloseTo(25_000, 0);
  });

  it("super hold uses the 15% rate and one-third discount", () => {
    const s = cgtScenario("100k-gain-at-45pc")!;
    const { superHold } = cgtScenarioOutcomes(s);
    // 100k × (1 − 1/3) = 66,667 assessable × 15% ≈ 10,000
    expect(superHold.discountedGain).toBeCloseTo(66_666.67, 0);
    expect(superHold.taxWithDiscount).toBeCloseTo(10_000, -1);
  });

  it("long hold never costs more than short hold across the grid", () => {
    for (const s of CGT_SCENARIOS) {
      const { shortHold, longHold } = cgtScenarioOutcomes(s);
      expect(longHold.taxWithDiscount).toBeLessThan(shortHold.taxWithDiscount);
      expect(longHold.taxSaved).toBeGreaterThan(0);
    }
  });

  it("related scenarios exclude self and stay within the grid", () => {
    const s = CGT_SCENARIOS[0]!;
    const related = relatedCgtScenarios(s);
    expect(related.length).toBeGreaterThan(0);
    for (const r of related) {
      expect(r.slug).not.toBe(s.slug);
      expect(cgtScenario(r.slug)).not.toBeNull();
    }
  });
});
