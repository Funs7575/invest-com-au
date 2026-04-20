import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock("@/lib/cron-auth", () => ({
  requireCronAuth: () => null,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: () => ({}) }),
}));

import { calculatePayoutVariance } from "@/app/api/cron/affiliate-payout-recon/route";

describe("calculatePayoutVariance — affiliate payout reconciliation", () => {
  it("returns zeros for a perfectly-matched month (100/100)", () => {
    const r = calculatePayoutVariance(100, 100);
    expect(r.delta).toBe(0);
    expect(r.deltaPct).toBe(0);
    expect(r.shouldFlag).toBe(false);
  });

  it("handles tracked>reported under the 10% threshold (not flagged)", () => {
    const r = calculatePayoutVariance(104, 100);
    expect(r.delta).toBe(4);
    expect(r.deltaPct).toBeCloseTo(4, 5);
    expect(r.shouldFlag).toBe(false);
  });

  it("flags tracked exceeding reported by exactly 10% (boundary)", () => {
    const r = calculatePayoutVariance(110, 100);
    expect(r.delta).toBe(10);
    expect(r.deltaPct).toBe(10);
    expect(r.shouldFlag).toBe(true);
  });

  it("flags tracked exceeding reported by more than 10%", () => {
    const r = calculatePayoutVariance(150, 100);
    expect(r.delta).toBe(50);
    expect(r.deltaPct).toBe(50);
    expect(r.shouldFlag).toBe(true);
  });

  it("flags tracked UNDER reported by exactly 10% (symmetric)", () => {
    const r = calculatePayoutVariance(90, 100);
    expect(r.delta).toBe(-10);
    expect(r.deltaPct).toBe(-10);
    expect(r.shouldFlag).toBe(true);
  });

  it("flags tracked UNDER reported by more than 10%", () => {
    const r = calculatePayoutVariance(50, 100);
    expect(r.delta).toBe(-50);
    expect(r.deltaPct).toBe(-50);
    expect(r.shouldFlag).toBe(true);
  });

  it("reports 100% variance when reported=0 but we tracked clicks (FLAG — probable missing commission)", () => {
    const r = calculatePayoutVariance(42, 0);
    expect(r.delta).toBe(42);
    expect(r.deltaPct).toBe(100);
    expect(r.shouldFlag).toBe(true);
  });

  it("reports 0% when both tracked and reported are zero (no-op month)", () => {
    const r = calculatePayoutVariance(0, 0);
    expect(r.delta).toBe(0);
    expect(r.deltaPct).toBe(0);
    expect(r.shouldFlag).toBe(false);
  });

  it("flags when tracked=0 and reported>0 (affiliate network over-counting)", () => {
    const r = calculatePayoutVariance(0, 100);
    expect(r.delta).toBe(-100);
    expect(r.deltaPct).toBe(-100);
    expect(r.shouldFlag).toBe(true);
  });

  it("does not flag when just under threshold (9.99%)", () => {
    const r = calculatePayoutVariance(10_999, 10_000);
    expect(r.deltaPct).toBeCloseTo(9.99, 2);
    expect(r.shouldFlag).toBe(false);
  });

  it("handles large numbers without overflow", () => {
    const r = calculatePayoutVariance(1_000_000, 900_000);
    expect(r.delta).toBe(100_000);
    expect(r.deltaPct).toBeCloseTo(11.11, 2);
    expect(r.shouldFlag).toBe(true);
  });
});
