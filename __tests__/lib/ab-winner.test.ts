import { describe, it, expect } from "vitest";
import { decideWinner } from "@/lib/ab-winner";

function stats(o: Partial<{
  ia: number;
  ib: number;
  ca: number;
  cb: number;
  min: number;
  sig: number;
}>) {
  return {
    impressions_a: o.ia ?? 1000,
    impressions_b: o.ib ?? 1000,
    conversions_a: o.ca ?? 50,
    conversions_b: o.cb ?? 50,
    min_sample_size: o.min ?? 200,
    significance_threshold: o.sig ?? 0.05,
  };
}

describe("decideWinner", () => {
  it("returns insufficient_sample when either side is below min", () => {
    const r = decideWinner(stats({ ia: 50, ib: 500, ca: 5, cb: 50 }));
    expect(r.winner).toBeNull();
    expect(r.reason).toBe("insufficient_sample");
  });

  it("returns no_significant_difference when variants are equal", () => {
    const r = decideWinner(stats({ ia: 1000, ib: 1000, ca: 50, cb: 50 }));
    expect(r.winner).toBeNull();
    expect(r.reason).toBe("no_significant_difference");
  });

  it("declares b the winner when b clearly outperforms a", () => {
    const r = decideWinner(stats({ ia: 2000, ib: 2000, ca: 40, cb: 120 }));
    expect(r.winner).toBe("b");
    expect(r.reason).toBe("b_wins");
    expect(r.pValue).toBeLessThan(0.05);
    expect(r.liftPct).toBeGreaterThan(100);
  });

  it("declares a the winner when a clearly outperforms b", () => {
    const r = decideWinner(stats({ ia: 2000, ib: 2000, ca: 120, cb: 40 }));
    expect(r.winner).toBe("a");
    expect(r.reason).toBe("a_wins");
    expect(r.pValue).toBeLessThan(0.05);
    expect(r.liftPct).toBeLessThan(0);
  });

  it("respects a stricter significance threshold", () => {
    // Lift exists but only weakly — at 0.01 threshold it should not promote
    const r = decideWinner(stats({ ia: 1000, ib: 1000, ca: 50, cb: 60, sig: 0.01 }));
    // 6% vs 5% isn't significant at 0.01
    expect(r.winner).toBeNull();
  });

  it("returns invalid_input for impossible counts", () => {
    const r = decideWinner(stats({ ia: 100, ib: 100, ca: 200, cb: 10 }));
    expect(r.reason).toBe("invalid_input");
  });

  it("never returns a winner when both conversion counts are 0", () => {
    const r = decideWinner(stats({ ia: 1000, ib: 1000, ca: 0, cb: 0 }));
    expect(r.winner).toBeNull();
  });
});
