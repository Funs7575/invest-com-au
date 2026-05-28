import { describe, it, expect } from "vitest";
import {
  compareBrokerCost,
  compareSavingsCost,
  formatDollars,
  yearsHeld,
} from "@/lib/switching-tracker";

// ── compareBrokerCost ─────────────────────────────────────────────────────────

describe("compareBrokerCost", () => {
  it("returns zero savings when fees are equal", () => {
    const result = compareBrokerCost({
      currentFeePerTradeCents: 999,
      bestFeePerTradeCents: 999,
      estimatedTradesPa: 12,
      yearsHeld: 3,
    });
    expect(result.annualSavingCents).toBe(0);
    expect(result.lifetimeSavingCents).toBe(0);
  });

  it("computes annual saving correctly", () => {
    const result = compareBrokerCost({
      currentFeePerTradeCents: 1995, // $19.95
      bestFeePerTradeCents: 299,     // $2.99
      estimatedTradesPa: 12,
      yearsHeld: 2,
    });
    // annual = (1995 - 299) * 12 = 1696 * 12 = 20352
    expect(result.annualSavingCents).toBe(20352);
  });

  it("computes lifetime saving correctly", () => {
    const result = compareBrokerCost({
      currentFeePerTradeCents: 1995,
      bestFeePerTradeCents: 299,
      estimatedTradesPa: 12,
      yearsHeld: 2,
    });
    // lifetime = annualSaving * yearsHeld = 20352 * 2 = 40704
    expect(result.lifetimeSavingCents).toBe(40704);
  });

  it("computes totalCostToDateCents", () => {
    const result = compareBrokerCost({
      currentFeePerTradeCents: 1995,
      bestFeePerTradeCents: 299,
      estimatedTradesPa: 10,
      yearsHeld: 3,
    });
    // current annual = 1995 * 10 = 19950; lifetime = 19950 * 3 = 59850
    expect(result.totalCostToDateCents).toBe(59850);
  });

  it("computes bestInClassCostToDateCents", () => {
    const result = compareBrokerCost({
      currentFeePerTradeCents: 1995,
      bestFeePerTradeCents: 299,
      estimatedTradesPa: 10,
      yearsHeld: 3,
    });
    // best annual = 299 * 10 = 2990; lifetime = 2990 * 3 = 8970
    expect(result.bestInClassCostToDateCents).toBe(8970);
  });

  it("floors savings at 0 when current is already cheapest", () => {
    const result = compareBrokerCost({
      currentFeePerTradeCents: 100,
      bestFeePerTradeCents: 500,
      estimatedTradesPa: 10,
      yearsHeld: 1,
    });
    expect(result.annualSavingCents).toBe(0);
    expect(result.lifetimeSavingCents).toBe(0);
  });

  it("handles zero trades per year", () => {
    const result = compareBrokerCost({
      currentFeePerTradeCents: 1995,
      bestFeePerTradeCents: 299,
      estimatedTradesPa: 0,
      yearsHeld: 5,
    });
    expect(result.annualSavingCents).toBe(0);
    expect(result.totalCostToDateCents).toBe(0);
  });

  it("handles fractional years", () => {
    const result = compareBrokerCost({
      currentFeePerTradeCents: 1000,
      bestFeePerTradeCents: 0,
      estimatedTradesPa: 10,
      yearsHeld: 0.5,
    });
    // annual = 1000 * 10 = 10000
    // lifetime = round(10000 * 0.5) = 5000
    expect(result.annualSavingCents).toBe(10000);
    expect(result.lifetimeSavingCents).toBe(5000);
  });
});

// ── compareSavingsCost ────────────────────────────────────────────────────────

describe("compareSavingsCost", () => {
  it("returns zero savings when rates are equal", () => {
    const result = compareSavingsCost({
      currentRateBps: 500,
      bestRateBps: 500,
      estimatedBalanceCents: 1_000_000,
      yearsHeld: 2,
    });
    expect(result.annualSavingCents).toBe(0);
    expect(result.lifetimeSavingCents).toBe(0);
  });

  it("computes annual saving (opportunity cost) correctly", () => {
    // current = 4.00%, best = 5.50% on $50,000
    const result = compareSavingsCost({
      currentRateBps: 400,  // 4%
      bestRateBps: 550,     // 5.5%
      estimatedBalanceCents: 5_000_000, // $50,000
      yearsHeld: 1,
    });
    // annual interest at 4% = 5_000_000 * 400 / 10000 = 200000 ($2000)
    // annual interest at 5.5% = 5_000_000 * 550 / 10000 = 275000 ($2750)
    // saving = 275000 - 200000 = 75000 ($750)
    expect(result.annualSavingCents).toBe(75000);
  });

  it("computes lifetime saving correctly", () => {
    const result = compareSavingsCost({
      currentRateBps: 400,
      bestRateBps: 550,
      estimatedBalanceCents: 5_000_000,
      yearsHeld: 3,
    });
    // lifetime saving = 75000 * 3 = 225000 ($2250)
    expect(result.lifetimeSavingCents).toBe(225000);
  });

  it("computes totalCostToDateCents as interest earned at current rate", () => {
    const result = compareSavingsCost({
      currentRateBps: 400,
      bestRateBps: 550,
      estimatedBalanceCents: 5_000_000,
      yearsHeld: 2,
    });
    // current annual = 200000; lifetime = 400000
    expect(result.totalCostToDateCents).toBe(400000);
  });

  it("floors savings at 0 when current rate is already best", () => {
    const result = compareSavingsCost({
      currentRateBps: 600,
      bestRateBps: 400,
      estimatedBalanceCents: 1_000_000,
      yearsHeld: 1,
    });
    expect(result.annualSavingCents).toBe(0);
    expect(result.lifetimeSavingCents).toBe(0);
  });

  it("handles zero balance", () => {
    const result = compareSavingsCost({
      currentRateBps: 400,
      bestRateBps: 550,
      estimatedBalanceCents: 0,
      yearsHeld: 5,
    });
    expect(result.annualSavingCents).toBe(0);
    expect(result.lifetimeSavingCents).toBe(0);
  });
});

// ── formatDollars ─────────────────────────────────────────────────────────────

describe("formatDollars", () => {
  it("formats zero as $0", () => {
    const result = formatDollars(0);
    expect(result).toBe("$0");
  });

  it("formats 10000 cents as $100", () => {
    const result = formatDollars(10000);
    expect(result).toBe("$100");
  });

  it("formats 150000 cents as $1,500", () => {
    const result = formatDollars(150000);
    expect(result).toBe("$1,500");
  });

  it("rounds to nearest dollar (no decimals)", () => {
    const result = formatDollars(9950);
    // 9950 cents = $99.50 → rounds to $100 with maximumFractionDigits:0
    expect(result).toBe("$100");
  });
});

// ── yearsHeld ─────────────────────────────────────────────────────────────────

describe("yearsHeld", () => {
  it("returns 0 for future dates", () => {
    const future = new Date(Date.now() + 1000 * 3600).toISOString();
    expect(yearsHeld(future)).toBe(0);
  });

  it("returns approximately 1 for a date one year ago", () => {
    const oneYearAgo = new Date(Date.now() - 365.25 * 24 * 3600 * 1000).toISOString();
    const result = yearsHeld(oneYearAgo);
    expect(result).toBeCloseTo(1, 1);
  });

  it("accepts a Date object", () => {
    const twoYearsAgo = new Date(Date.now() - 2 * 365.25 * 24 * 3600 * 1000);
    const result = yearsHeld(twoYearsAgo);
    expect(result).toBeCloseTo(2, 1);
  });

  it("returns a positive number for a past date string", () => {
    const result = yearsHeld("2020-01-01");
    expect(result).toBeGreaterThan(0);
  });
});
