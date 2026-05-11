import { describe, it, expect } from "vitest";
import {
  projectGoal,
  monthsBetween,
} from "@/lib/holdings/goal-projection";

describe("projectGoal", () => {
  it("returns past-due when months=0 and target not yet reached", () => {
    const r = projectGoal({
      currentValueCents: 10_000_00,
      targetCents: 50_000_00,
      monthsToTarget: 0,
      monthlyContributionCents: 0,
      annualReturnPct: 6,
    });
    expect(r.status).toBe("past-due");
    expect(r.monthsUsed).toBe(0);
    expect(r.projectedValueAtTargetCents).toBe(10_000_00);
    expect(r.summary).toMatch(/past/i);
  });

  it("returns ahead when months=0 and already at or above target", () => {
    const r = projectGoal({
      currentValueCents: 60_000_00,
      targetCents: 50_000_00,
      monthsToTarget: 0,
      monthlyContributionCents: 0,
      annualReturnPct: 6,
    });
    expect(r.status).toBe("ahead");
    expect(r.summary).toMatch(/already/i);
  });

  it("flat-rate (0% return) projection sums principal + contributions", () => {
    const r = projectGoal({
      currentValueCents: 10_000_00,
      targetCents: 25_000_00,
      monthsToTarget: 60, // 5y
      monthlyContributionCents: 250_00, // $250/mo
      annualReturnPct: 0,
    });
    // FV = 10000 + 250 * 60 = 25000 exact ⇒ on-track (within 5% of target)
    expect(r.projectedValueAtTargetCents).toBe(25_000_00);
    expect(r.gapCents).toBe(0);
    expect(r.status).toBe("on-track");
  });

  it("compound projection matches the standard FV formula", () => {
    // FV = 1000 * (1.005)^12 + 100 * ((1.005)^12 − 1)/0.005
    //    ≈ 1061.68 + 1233.56 ≈ 2295.24
    const r = projectGoal({
      currentValueCents: 1000_00,
      targetCents: 3000_00,
      monthsToTarget: 12,
      monthlyContributionCents: 100_00,
      annualReturnPct: 6, // 6% APR ⇒ 0.5% monthly
    });
    expect(r.projectedValueAtTargetCents).toBeGreaterThan(2294_00);
    expect(r.projectedValueAtTargetCents).toBeLessThan(2296_00);
    expect(r.gapCents).toBeGreaterThan(700_00); // ~$705 short
    expect(r.status).toBe("short");
  });

  it("flags 'on-track' when projection is within 5% of target", () => {
    const r = projectGoal({
      currentValueCents: 95_000_00,
      targetCents: 100_000_00,
      monthsToTarget: 12, // future deadline so months>0 path applies
      monthlyContributionCents: 0,
      annualReturnPct: 0,
    });
    // 95k still 5% short with no growth → projected = 95k, gap = 5k = 5% of target ⇒ on-track
    expect(r.projectedValueAtTargetCents).toBe(95_000_00);
    expect(r.status).toBe("on-track");
    expect(r.gapCents).toBe(5_000_00);
  });

  it("flags 'ahead' when projection exceeds target", () => {
    const r = projectGoal({
      currentValueCents: 110_000_00,
      targetCents: 100_000_00,
      monthsToTarget: 12,
      monthlyContributionCents: 0,
      annualReturnPct: 6,
    });
    expect(r.status).toBe("ahead");
    expect(r.gapCents).toBeLessThan(0);
  });

  it("solves required contribution for a shortfall", () => {
    // To reach $20k from $10k in 60 months at 0% return:
    //   gap = 10000, required = 10000 / 60 = $166.67/mo ⇒ 16667 cents
    const r = projectGoal({
      currentValueCents: 10_000_00,
      targetCents: 20_000_00,
      monthsToTarget: 60,
      monthlyContributionCents: 0,
      annualReturnPct: 0,
    });
    expect(r.requiredMonthlyContributionCents).toBe(166_67);
    expect(r.summary).toMatch(/need ~/);
  });

  it("returns null required contribution when already ahead", () => {
    const r = projectGoal({
      currentValueCents: 100_000_00,
      targetCents: 50_000_00,
      monthsToTarget: 60,
      monthlyContributionCents: 0,
      annualReturnPct: 0,
    });
    expect(r.requiredMonthlyContributionCents).toBeNull();
    expect(r.status).toBe("ahead");
  });

  it("clamps negative months to 0", () => {
    const r = projectGoal({
      currentValueCents: 10_000_00,
      targetCents: 50_000_00,
      monthsToTarget: -5,
      monthlyContributionCents: 0,
      annualReturnPct: 6,
    });
    expect(r.monthsUsed).toBe(0);
    expect(r.status).toBe("past-due");
  });

  it("handles negative annual return (drawdown scenario)", () => {
    // -2% APR over 12 months on $10k = ~$9802
    const r = projectGoal({
      currentValueCents: 10_000_00,
      targetCents: 12_000_00,
      monthsToTarget: 12,
      monthlyContributionCents: 0,
      annualReturnPct: -2,
    });
    expect(r.projectedValueAtTargetCents).toBeLessThan(10_000_00);
    expect(r.status).toBe("short");
  });
});

describe("monthsBetween", () => {
  it("computes positive months across a year boundary", () => {
    expect(monthsBetween(new Date("2026-01-15"), new Date("2027-01-15"))).toBe(12);
  });

  it("returns 0 when end is before start of the same month", () => {
    expect(monthsBetween(new Date("2026-05-20"), new Date("2026-05-25"))).toBe(0);
  });

  it("returns negative months when end is before start", () => {
    expect(monthsBetween(new Date("2026-05-15"), new Date("2026-02-15"))).toBe(-3);
  });

  it("handles partial-month tail correctly", () => {
    // Same month difference, but end day is earlier → one less month
    expect(monthsBetween(new Date("2026-01-20"), new Date("2026-06-10"))).toBe(4);
    expect(monthsBetween(new Date("2026-01-20"), new Date("2026-06-21"))).toBe(5);
  });
});
