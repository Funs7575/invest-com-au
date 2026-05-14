import { describe, it, expect } from "vitest";
import {
  estimateBundledPrice,
  formatBundledPrice,
} from "@/lib/expert-teams/pricing";

describe("estimateBundledPrice", () => {
  it("returns nulls when no member has pricing", () => {
    const est = estimateBundledPrice([
      { hourly_rate_cents: null },
      { hourly_rate_cents: null },
    ]);
    expect(est.minAud).toBeNull();
    expect(est.maxAud).toBeNull();
    expect(est.memberCount).toBe(2);
    expect(est.pricedCount).toBe(0);
  });

  it("computes lower + upper bound from hourly rates", () => {
    const est = estimateBundledPrice([
      { hourly_rate_cents: 30000, typical_hours: 10 }, // $300/h × 10 = $3000
      { hourly_rate_cents: 25000, typical_hours: 12 }, // $250/h × 12 = $3000
    ]);
    // Min = 6000 (rounded to 100s)
    expect(est.minAud).toBe(6000);
    // Max = 6000 × 1.6 = 9600
    expect(est.maxAud).toBe(9600);
    expect(est.pricedCount).toBe(2);
  });

  it("uses the default typical_hours when not provided", () => {
    const est = estimateBundledPrice([
      { hourly_rate_cents: 20000 }, // $200/h × 12 default = $2400
    ]);
    expect(est.minAud).toBe(2400);
  });

  it("skips members with null hourly rate when computing the bound", () => {
    const est = estimateBundledPrice([
      { hourly_rate_cents: 20000, typical_hours: 10 }, // $2000
      { hourly_rate_cents: null }, // skipped
      { hourly_rate_cents: 30000, typical_hours: 10 }, // $3000
    ]);
    expect(est.minAud).toBe(5000);
    expect(est.pricedCount).toBe(2);
    expect(est.memberCount).toBe(3);
  });

  it("rounds to nearest $100", () => {
    const est = estimateBundledPrice([
      { hourly_rate_cents: 27733, typical_hours: 7 }, // $1941.31
    ]);
    expect(est.minAud).toBe(1900);
  });
});

describe("formatBundledPrice", () => {
  it("returns null when bounds are null", () => {
    expect(
      formatBundledPrice({
        minAud: null,
        maxAud: null,
        memberCount: 2,
        pricedCount: 0,
      }),
    ).toBeNull();
  });

  it("formats AUD with thousands separators", () => {
    expect(
      formatBundledPrice({
        minAud: 8500,
        maxAud: 14000,
        memberCount: 4,
        pricedCount: 3,
      }),
    ).toBe("A$8,500 — A$14,000");
  });
});
