/**
 * Unit tests for the currency hedging cost calculator.
 *
 * `lib/calculators/currency-hedging-cost.ts`
 *
 * What this tests
 * ----------------
 * The hedging cost model is based on Covered Interest Rate Parity (CIP):
 *
 *   Forward rate ≈ Spot × (1 + r_aud) / (1 + r_foreign)
 *   Annual hedging cost (approx.) ≈ r_aud − r_foreign
 *
 * The reference cases below are derived from:
 *  1. The mathematical identity itself (exact closed-form arithmetic —
 *     no tolerance needed beyond floating-point noise).
 *  2. Published RBA / Betashares hedging-cost commentary (illustrative
 *     rate scenarios cited in publicly available ETF education material).
 *
 * Why CIP rather than a "regulator worked example"
 * -------------------------------------------------
 * The CIP formula is a financial identity, not a regulation — there is
 * no ATO or ASIC worked example for "here is the hedging cost at 4.35% vs
 * 5.25%". The reference cases here pin the exact arithmetic so that:
 *  (a) regressions in the formula surface immediately, and
 *  (b) edge cases (zero rates, very large differentials, partial hedge) are
 *      explicitly covered.
 *
 * Pattern mirrors the CGT and mortgage regulator-reference tests but uses
 * `describe + it` directly (no `assertCalculatorMatchesRegulator` wrapper
 * because the "regulator" here is the mathematical identity, not a
 * published ATO worked example with a URL).
 */

import { describe, it, expect } from "vitest";
import {
  computeHedgingCost,
  type HedgingCostInput,
  type HedgingCostResult,
} from "@/lib/calculators/currency-hedging-cost";

// Tolerance for floating-point comparison.
const EPSILON = 1e-8;

function expectClose(actual: number, expected: number, msg?: string) {
  expect(Math.abs(actual - expected), msg ?? `${actual} ≈ ${expected}`).toBeLessThan(
    EPSILON,
  );
}

function expectPctClose(actual: number, expected: number, msg?: string) {
  // Percentage-point comparison — allow 0.00001% slop.
  expect(Math.abs(actual - expected), msg ?? `${actual} ≈ ${expected}`).toBeLessThan(1e-6);
}

describe("computeHedgingCost — interest rate parity arithmetic", () => {
  // ─────────────────────────────────────────────────────────────────────
  // Case 1: AUD > foreign rate → hedging COSTS money (negative carry)
  //
  // AUD rate = 4.35% (0.0435), USD rate = 5.25% (0.0525)
  // Annual cost (linear approx.)  = 0.0435 − 0.0525 = −0.009 = −0.90%
  //   Note: negative in the "cost" sense because AUD < foreign here
  //   Wait — AUD 4.35% < USD 5.25%, so r_aud − r_foreign = −0.009
  //   A NEGATIVE differential means the hedge BENEFITS the Australian
  //   investor (selling USD forward at a PREMIUM to spot).
  //
  // Let's re-check: the model defines cost as r_aud − r_foreign.
  //   r_aud < r_foreign → result is NEGATIVE → carryDirection = "benefit"
  //   Because selling a higher-rate currency forward gives the investor a
  //   premium (positive carry).
  //
  // Case 1a: AUD 4.35% / USD 5.25% → benefit of 0.90% p.a.
  // ─────────────────────────────────────────────────────────────────────
  it("AUD 4.35% / USD 5.25% → hedging benefit of ~0.90% (USD carry)", () => {
    const input: HedgingCostInput = {
      positionAUD: 100_000,
      audRate: 0.0435,
      foreignRate: 0.0525,
      hedgeRatio: 1,
      holdingYears: 1,
    };
    const r: HedgingCostResult = computeHedgingCost(input);

    // Linear approx: 0.0435 − 0.0525 = −0.009
    expectPctClose(r.annualHedgingCostPct, -0.009, "annual pct approx");

    // Precise: (1.0435)/(1.0525) − 1 = −0.00855... (slightly less negative than −0.009)
    const expectedPrecise = 1.0435 / 1.0525 - 1;
    expectPctClose(r.annualHedgingCostPctPrecise, expectedPrecise, "annual pct precise");

    // carryDirection: benefit (AUD rates < foreign)
    expect(r.carryDirection).toBe("benefit");

    // Annual cost in AUD: 100,000 × −0.009 = −900 (negative = benefit)
    expectClose(r.annualHedgingCostAUD, -900, "annual AUD");

    // Hedged notional: 100,000 × 1.0 = 100,000
    expectClose(r.hedgedNotionalAUD, 100_000, "hedged notional");
  });

  // ─────────────────────────────────────────────────────────────────────
  // Case 2: AUD 4.35% / JPY 0.10% → significant hedging COST for AUD
  //   investor hedging JPY exposure.
  //
  //   r_aud − r_foreign = 0.0435 − 0.001 = 0.0425 → 4.25% p.a. COST
  //   (selling JPY forward at a large discount because JPY rates are
  //   near zero and AUD rates are high)
  //
  // This is the "HJPN hedging drag" scenario discussed in Betashares
  // hedging-cost commentary.
  // ─────────────────────────────────────────────────────────────────────
  it("AUD 4.35% / JPY 0.10% → hedging COST of ~4.25% (yen carry)", () => {
    const input: HedgingCostInput = {
      positionAUD: 50_000,
      audRate: 0.0435,
      foreignRate: 0.001,
      hedgeRatio: 1,
      holdingYears: 1,
    };
    const r = computeHedgingCost(input);

    expectPctClose(r.annualHedgingCostPct, 0.0425, "annual pct approx");
    expect(r.carryDirection).toBe("cost");
    expectClose(r.annualHedgingCostAUD, 50_000 * 0.0425, "annual AUD");
  });

  // ─────────────────────────────────────────────────────────────────────
  // Case 3: Partial hedge ratio (50%) halves the dollar cost.
  // ─────────────────────────────────────────────────────────────────────
  it("50% hedge ratio halves the dollar cost", () => {
    const full = computeHedgingCost({
      positionAUD: 200_000,
      audRate: 0.05,
      foreignRate: 0.02,
      hedgeRatio: 1.0,
      holdingYears: 1,
    });
    const half = computeHedgingCost({
      positionAUD: 200_000,
      audRate: 0.05,
      foreignRate: 0.02,
      hedgeRatio: 0.5,
      holdingYears: 1,
    });

    // Percentage cost is the same regardless of hedge ratio.
    expectPctClose(full.annualHedgingCostPct, half.annualHedgingCostPct, "pct same");

    // Dollar cost should be exactly half.
    expectClose(half.annualHedgingCostAUD, full.annualHedgingCostAUD / 2, "dollar halved");
    expectClose(half.hedgedNotionalAUD, 100_000, "hedged notional = 100k");
  });

  // ─────────────────────────────────────────────────────────────────────
  // Case 4: Multi-year compounding — total cost uses compound formula.
  //
  //   position = 100,000; AUD = 5%, foreign = 2%, hedge = 100%, T = 3 years
  //   totalCost = 100,000 × ((1.05)^3 / (1.02)^3 − 1)
  //             = 100,000 × (1.157625 / 1.061208 − 1)
  //             = 100,000 × 0.09088... ≈ 9,088
  // ─────────────────────────────────────────────────────────────────────
  it("3-year compounding matches (1+r_aud)^3 / (1+r_foreign)^3 − 1", () => {
    const r = computeHedgingCost({
      positionAUD: 100_000,
      audRate: 0.05,
      foreignRate: 0.02,
      hedgeRatio: 1,
      holdingYears: 3,
    });

    const expectedTotal =
      100_000 * (Math.pow(1.05, 3) / Math.pow(1.02, 3) - 1);
    expectClose(r.totalCostAUD, expectedTotal, "3-year total");
  });

  // ─────────────────────────────────────────────────────────────────────
  // Case 5: Equal rates → effectively neutral (near-zero cost).
  // ─────────────────────────────────────────────────────────────────────
  it("equal rates produce near-zero hedging cost", () => {
    const r = computeHedgingCost({
      positionAUD: 100_000,
      audRate: 0.04,
      foreignRate: 0.04,
    });

    expectPctClose(r.annualHedgingCostPct, 0, "approx pct = 0");
    expectPctClose(r.annualHedgingCostPctPrecise, 0, "precise pct = 0");
    expect(r.carryDirection).toBe("neutral");
    expectClose(r.totalCostAUD, 0, "total = 0");
  });

  // ─────────────────────────────────────────────────────────────────────
  // Case 6: Zero hedge ratio → zero dollar cost.
  // ─────────────────────────────────────────────────────────────────────
  it("zero hedge ratio → zero dollar cost regardless of rate differential", () => {
    const r = computeHedgingCost({
      positionAUD: 500_000,
      audRate: 0.06,
      foreignRate: 0.01,
      hedgeRatio: 0,
      holdingYears: 2,
    });

    expectClose(r.hedgedNotionalAUD, 0, "notional = 0");
    expectClose(r.annualHedgingCostAUD, 0, "annual AUD = 0");
    expectClose(r.totalCostAUD, 0, "total = 0");
    // The percentage cost still reflects the rate differential.
    expectPctClose(r.annualHedgingCostPct, 0.05, "pct cost still 5%");
  });

  // ─────────────────────────────────────────────────────────────────────
  // Case 7: Default inputs (hedgeRatio = 1, holdingYears = 1).
  // ─────────────────────────────────────────────────────────────────────
  it("defaults to hedgeRatio=1 and holdingYears=1 when omitted", () => {
    const withDefaults = computeHedgingCost({
      positionAUD: 80_000,
      audRate: 0.045,
      foreignRate: 0.03,
    });
    const explicit = computeHedgingCost({
      positionAUD: 80_000,
      audRate: 0.045,
      foreignRate: 0.03,
      hedgeRatio: 1,
      holdingYears: 1,
    });

    expectClose(withDefaults.annualHedgingCostAUD, explicit.annualHedgingCostAUD);
    expectClose(withDefaults.totalCostAUD, explicit.totalCostAUD);
    expect(withDefaults.inputs.hedgeRatio).toBe(1);
    expect(withDefaults.inputs.holdingYears).toBe(1);
  });

  // ─────────────────────────────────────────────────────────────────────
  // Case 8: Negative position guard — clamps to zero.
  // ─────────────────────────────────────────────────────────────────────
  it("clamps negative position size to zero", () => {
    const r = computeHedgingCost({
      positionAUD: -5_000,
      audRate: 0.04,
      foreignRate: 0.03,
    });
    expectClose(r.hedgedNotionalAUD, 0);
    expectClose(r.annualHedgingCostAUD, 0);
  });
});
