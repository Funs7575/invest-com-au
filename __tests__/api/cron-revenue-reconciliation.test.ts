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

vi.mock("@/lib/cron-run-log", () => ({
  wrapCronHandler: (_name: string, h: unknown) => h,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        gte: () => ({ lte: () => ({ eq: async () => ({ data: [] }) }) }),
      }),
      upsert: async () => ({ data: null }),
    }),
  }),
}));

import {
  computeVariance,
  VARIANCE_PCT_THRESHOLD,
  VARIANCE_ABS_CENTS_THRESHOLD,
} from "@/app/api/cron/revenue-reconciliation/route";

describe("computeVariance", () => {
  it("returns zeros and no alert when both inputs are 0", () => {
    expect(computeVariance(0, 0)).toEqual({
      variance_cents: 0,
      variance_pct: 0,
      alerted: false,
    });
  });

  it("variance_cents is reported minus expected (positive = overcount)", () => {
    expect(computeVariance(10_000, 12_000).variance_cents).toBe(2_000);
    expect(computeVariance(10_000, 8_000).variance_cents).toBe(-2_000);
  });

  it("rounds variance_pct to one decimal place", () => {
    // reported=10100, expected=10000 → 1% exactly
    expect(computeVariance(10_000, 10_100).variance_pct).toBe(1);
    // reported=10123, expected=10000 → 1.23% → rounds to 1.2
    expect(computeVariance(10_000, 10_123).variance_pct).toBe(1.2);
    // reported=10999, expected=10000 → 9.99% → rounds to 10
    expect(computeVariance(10_000, 10_999).variance_pct).toBe(10);
  });

  it("returns 0% when expected is 0 (divide-by-zero guard)", () => {
    expect(computeVariance(0, 5_000).variance_pct).toBe(0);
  });

  it("does not alert when both pct and abs are within thresholds", () => {
    // 1% and $10 variance — well under both limits
    expect(computeVariance(100_000, 101_000).alerted).toBe(false);
  });

  it("alerts when variance_pct exceeds 5%", () => {
    // 100k expected, 106k reported → 6% variance, well under abs limit
    expect(computeVariance(100_000, 106_000).alerted).toBe(true);
  });

  it("alerts when absolute variance exceeds $50 even if pct is fine", () => {
    // $1M expected, $1.0055M reported → 0.55% variance (OK on pct)
    // but $5,500 absolute variance ($55 over) → should alert
    const r = computeVariance(100_000_00, 100_055_00);
    expect(r.variance_pct).toBeLessThanOrEqual(VARIANCE_PCT_THRESHOLD);
    expect(Math.abs(r.variance_cents)).toBeGreaterThan(
      VARIANCE_ABS_CENTS_THRESHOLD,
    );
    expect(r.alerted).toBe(true);
  });

  it("does NOT alert at exactly 5% (strict inequality)", () => {
    // 100000 → 105000 = exactly 5%, below-absolute-limit — not alerted
    const r = computeVariance(100_000, 105_000);
    expect(r.variance_pct).toBe(5);
    // abs variance is 5000, equal to threshold, so neither condition fires
    expect(r.variance_cents).toBe(VARIANCE_ABS_CENTS_THRESHOLD);
    expect(r.alerted).toBe(false);
  });

  it("alerts symmetrically for under-report and over-report", () => {
    // Over-report by 6%
    expect(computeVariance(100_000, 106_000).alerted).toBe(true);
    // Under-report by 6%
    expect(computeVariance(100_000, 94_000).alerted).toBe(true);
  });

  it("alerts when expected is 0 but reported is large (pct=0, abs triggers)", () => {
    // expected=0 → pct defaults to 0 (no alert on pct), but abs variance
    // is $100 which is > $50 threshold → must alert
    const r = computeVariance(0, 10_000);
    expect(r.variance_pct).toBe(0);
    expect(r.variance_cents).toBe(10_000);
    expect(r.alerted).toBe(true);
  });

  it("exports numeric thresholds so callers can introspect them", () => {
    expect(VARIANCE_PCT_THRESHOLD).toBe(5);
    expect(VARIANCE_ABS_CENTS_THRESHOLD).toBe(5000);
  });
});
