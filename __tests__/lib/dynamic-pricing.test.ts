import { describe, it, expect } from "vitest";
import { selectRule, applyRule, type PricingRule } from "@/lib/dynamic-pricing";

function rule(overrides: Partial<PricingRule> = {}): PricingRule {
  return {
    id: 1,
    name: "test",
    advisor_type: null,
    vertical: null,
    min_quality_score: null,
    max_quality_score: null,
    time_of_day_start_hour: null,
    time_of_day_end_hour: null,
    new_advisor_days: null,
    multiplier: 1,
    floor_cents: null,
    cap_cents: null,
    priority: 100,
    enabled: true,
    ...overrides,
  };
}

describe("selectRule", () => {
  it("returns null when no rules match", () => {
    const r = selectRule([rule({ advisor_type: "crypto" })], { advisorType: "stock" });
    expect(r).toBeNull();
  });

  it("matches a wildcard rule", () => {
    const r = selectRule([rule({ id: 1 })], { advisorType: "anything" });
    expect(r?.id).toBe(1);
  });

  it("filters by advisor_type when set", () => {
    const r = selectRule(
      [rule({ id: 1, advisor_type: "smsf" }), rule({ id: 2, advisor_type: "broker", priority: 200 })],
      { advisorType: "smsf" },
    );
    expect(r?.id).toBe(1);
  });

  it("highest priority wins", () => {
    const r = selectRule(
      [
        rule({ id: 1, priority: 100 }),
        rule({ id: 2, priority: 200 }),
        rule({ id: 3, priority: 150 }),
      ],
      {},
    );
    expect(r?.id).toBe(2);
  });

  it("ignores disabled rules", () => {
    const r = selectRule(
      [
        rule({ id: 1, enabled: false, priority: 999 }),
        rule({ id: 2, priority: 1 }),
      ],
      {},
    );
    expect(r?.id).toBe(2);
  });

  it("respects min_quality_score", () => {
    const r = selectRule(
      [rule({ id: 1, min_quality_score: 70 })],
      { leadQualityScore: 60 },
    );
    expect(r).toBeNull();
    const r2 = selectRule(
      [rule({ id: 1, min_quality_score: 70 })],
      { leadQualityScore: 85 },
    );
    expect(r2?.id).toBe(1);
  });

  it("handles a wrap-around time window (22→06)", () => {
    const rules = [rule({ id: 1, time_of_day_start_hour: 22, time_of_day_end_hour: 6 })];
    expect(selectRule(rules, { hourLocal: 23 })?.id).toBe(1);
    expect(selectRule(rules, { hourLocal: 2 })?.id).toBe(1);
    expect(selectRule(rules, { hourLocal: 12 })).toBeNull();
  });

  it("handles a straight time window (09→17)", () => {
    const rules = [rule({ id: 1, time_of_day_start_hour: 9, time_of_day_end_hour: 17 })];
    expect(selectRule(rules, { hourLocal: 10 })?.id).toBe(1);
    expect(selectRule(rules, { hourLocal: 18 })).toBeNull();
  });

  it("matches new_advisor_days when advisor is within window", () => {
    const rules = [rule({ id: 1, new_advisor_days: 30 })];
    expect(selectRule(rules, { advisorAgeDays: 10 })?.id).toBe(1);
    expect(selectRule(rules, { advisorAgeDays: 60 })).toBeNull();
  });
});

describe("applyRule", () => {
  it("returns base price with null rule", () => {
    const r = applyRule(5000, null);
    expect(r.finalPriceCents).toBe(5000);
    expect(r.multiplier).toBe(1);
  });

  it("applies a multiplier", () => {
    const r = applyRule(5000, rule({ multiplier: 1.5 }));
    expect(r.finalPriceCents).toBe(7500);
  });

  it("clamps the multiplier at 5.0", () => {
    const r = applyRule(5000, rule({ multiplier: 50 }));
    expect(r.finalPriceCents).toBe(25000);
  });

  it("clamps the multiplier at 0.1", () => {
    const r = applyRule(5000, rule({ multiplier: 0.001 }));
    expect(r.finalPriceCents).toBe(500);
  });

  it("applies a floor after multiplying down", () => {
    const r = applyRule(5000, rule({ multiplier: 0.5, floor_cents: 3000 }));
    expect(r.finalPriceCents).toBe(3000);
  });

  it("applies a cap after multiplying up", () => {
    const r = applyRule(5000, rule({ multiplier: 2, cap_cents: 8000 }));
    expect(r.finalPriceCents).toBe(8000);
  });

  it("surfaces the rule name in the reason", () => {
    const r = applyRule(5000, rule({ id: 42, name: "night_surge", multiplier: 1.2 }));
    expect(r.reason).toContain("night_surge");
    expect(r.ruleId).toBe(42);
  });
});
