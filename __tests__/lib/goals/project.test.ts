import { describe, it, expect } from "vitest";
import { projectGoal } from "@/lib/goals/project";

const ms = (iso: string) => new Date(`${iso}T00:00:00Z`).getTime();

describe("projectGoal", () => {
  it("zero-rate, no balance, exact target hits at zero surplus", () => {
    const r = projectGoal({
      targetCents: 12_000_00, // $12,000
      targetDate: "2027-01-01",
      currentBalanceCents: 0,
      monthlyContributionCents: 1000_00, // $1,000/mo
      expectedReturnPct: 0,
    }, ms("2026-01-01"));
    expect(r.monthsToTarget).toBe(12);
    expect(r.projectedBalanceCents).toBe(12000_00);
    expect(r.surplusCents).toBe(0);
    expect(r.progressPct).toBe(100);
  });

  it("compounds positive returns into the projection", () => {
    const r = projectGoal({
      targetCents: 100_000_00,
      targetDate: "2036-01-01",
      currentBalanceCents: 10_000_00,
      monthlyContributionCents: 500_00,
      expectedReturnPct: 7,
    }, ms("2026-01-01"));
    // 10y, r ≈ 0.583%/mo → balance grows. Just check it's > $90k (a
    // simple-interest proxy would only reach ~$70k; compounding pushes higher).
    expect(r.projectedBalanceCents).toBeGreaterThan(90_000_00);
    expect(r.monthsToTarget).toBeGreaterThan(115);
  });

  it("surplus is positive when over-saving", () => {
    const r = projectGoal({
      targetCents: 50_000_00,
      targetDate: "2027-01-01",
      currentBalanceCents: 10_000_00,
      monthlyContributionCents: 5_000_00, // 12*5000 = 60k + 10k = 70k > 50k target
      expectedReturnPct: 0,
    }, ms("2026-01-01"));
    expect(r.surplusCents).toBeGreaterThan(0);
    expect(r.progressPct).toBeGreaterThan(100);
  });

  it("surplus is negative when under-saving", () => {
    const r = projectGoal({
      targetCents: 50_000_00,
      targetDate: "2027-01-01",
      currentBalanceCents: 0,
      monthlyContributionCents: 100_00,
      expectedReturnPct: 0,
    }, ms("2026-01-01"));
    expect(r.surplusCents).toBeLessThan(0);
    expect(r.progressPct).toBeLessThan(100);
  });

  it("required monthly contribution is computed correctly (zero rate)", () => {
    // need $50k in 12 months, $0 balance, 0% return → need $4,166.67/mo
    const r = projectGoal({
      targetCents: 50_000_00,
      targetDate: "2027-01-01",
      currentBalanceCents: 0,
      monthlyContributionCents: 0,
      expectedReturnPct: 0,
    }, ms("2026-01-01"));
    expect(r.requiredMonthlyContributionCents).toBeCloseTo(4_166_67, -2);
  });

  it("returns 0 monthly required when target is already met", () => {
    const r = projectGoal({
      targetCents: 50_000_00,
      targetDate: "2027-01-01",
      currentBalanceCents: 60_000_00,
      monthlyContributionCents: 0,
      expectedReturnPct: 0,
    }, ms("2026-01-01"));
    expect(r.requiredMonthlyContributionCents).toBe(0);
  });

  it("returns 0 months when target_date is in the past", () => {
    const r = projectGoal({
      targetCents: 50_000_00,
      targetDate: "2020-01-01",
      currentBalanceCents: 30_000_00,
      monthlyContributionCents: 1000_00,
      expectedReturnPct: 5,
    }, ms("2026-01-01"));
    expect(r.monthsToTarget).toBe(0);
    expect(r.projectedBalanceCents).toBe(30_000_00); // no compounding when months=0
  });

  it("clamps progress at 999% to handle absurd over-saving", () => {
    const r = projectGoal({
      targetCents: 100,
      targetDate: "2030-01-01",
      currentBalanceCents: 1_000_000_00,
      monthlyContributionCents: 0,
      expectedReturnPct: 7,
    }, ms("2026-01-01"));
    expect(r.progressPct).toBe(999);
  });
});
