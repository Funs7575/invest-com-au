import { describe, it, expect } from "vitest";
import { composeLeadPrice } from "@/lib/lead-pricing";

describe("composeLeadPrice", () => {
  it("returns base when both multipliers are null/undefined", () => {
    expect(composeLeadPrice({ baseLeadPriceCents: 1000 })).toBe(1000);
    expect(
      composeLeadPrice({
        baseLeadPriceCents: 1000,
        specialtyMultiplier: null,
        firmTierMultiplier: null,
      }),
    ).toBe(1000);
  });

  it("applies the specialty multiplier alone", () => {
    expect(
      composeLeadPrice({ baseLeadPriceCents: 1000, specialtyMultiplier: 1.75 }),
    ).toBe(1750);
  });

  it("applies the firm tier multiplier alone", () => {
    expect(
      composeLeadPrice({ baseLeadPriceCents: 1000, firmTierMultiplier: 0.85 }),
    ).toBe(850);
  });

  it("composes both multiplicatively", () => {
    // base $10.00 × specialty 1.75 × firm 0.85 = $14.875 → 1488 cents
    expect(
      composeLeadPrice({
        baseLeadPriceCents: 1000,
        specialtyMultiplier: 1.75,
        firmTierMultiplier: 0.85,
      }),
    ).toBe(1488);
  });

  it("rounds to whole cents", () => {
    // 333 × 1.10 = 366.3 → 366
    expect(
      composeLeadPrice({ baseLeadPriceCents: 333, specialtyMultiplier: 1.1 }),
    ).toBe(366);
  });

  it("sponsor tier discounts deeply", () => {
    expect(
      composeLeadPrice({ baseLeadPriceCents: 1000, firmTierMultiplier: 0.6 }),
    ).toBe(600);
  });
});
