import { describe, it, expect } from "vitest";
import {
  compound,
  feeDragOutcomes,
  FEE_DRAG_SCENARIOS,
  feeDragScenario,
  relatedScenarios,
  formatMoney,
  PROJECTION_YEARS,
} from "@/lib/fee-drag";

describe("fee-drag math", () => {
  it("compound matches the closed-form result", () => {
    // $100k at 7% gross − 1% fee = 6% net for 10 years.
    expect(compound(100_000, 7, 1, 10)).toBeCloseTo(100_000 * Math.pow(1.06, 10), 6);
  });

  it("outcomes: lower fee always ends higher, drag grows with horizon", () => {
    const outcomes = feeDragOutcomes(100_000, 0.5, 1.5);
    expect(outcomes.map((o) => o.years)).toEqual([...PROJECTION_YEARS]);
    let prevDrag = 0;
    for (const o of outcomes) {
      expect(o.endAtLowFee).toBeGreaterThan(o.endAtHighFee);
      expect(o.drag).toBeGreaterThan(prevDrag);
      expect(o.dragPct).toBeGreaterThan(0);
      expect(o.dragPct).toBeLessThan(100);
      prevDrag = o.drag;
    }
  });

  it("a 1% difference on $100k over 30 years is six figures", () => {
    const drag30 = feeDragOutcomes(100_000, 0.5, 1.5).find((o) => o.years === 30)!;
    expect(drag30.drag).toBeGreaterThan(100_000);
  });
});

describe("scenario grid", () => {
  it("has unique slugs and resolves round-trip", () => {
    expect(new Set(FEE_DRAG_SCENARIOS.map((s) => s.slug)).size).toBe(FEE_DRAG_SCENARIOS.length);
    for (const s of FEE_DRAG_SCENARIOS) {
      expect(feeDragScenario(s.slug)).toEqual(s);
      expect(s.lowFeePct).toBeLessThan(s.highFeePct);
    }
    expect(feeDragScenario("nope")).toBeNull();
  });

  it("related scenarios never include self and stay within the grid", () => {
    const s = FEE_DRAG_SCENARIOS[0]!;
    const related = relatedScenarios(s, 6);
    expect(related.length).toBeGreaterThan(0);
    expect(related.length).toBeLessThanOrEqual(6);
    for (const r of related) {
      expect(r.slug).not.toBe(s.slug);
      expect(feeDragScenario(r.slug)).not.toBeNull();
    }
  });

  it("formatMoney rounds to whole dollars with grouping", () => {
    expect(formatMoney(1234567.89)).toBe("$1,234,568");
  });
});
