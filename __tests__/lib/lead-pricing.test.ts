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

  // ─── Idea #3: demand axis ───────────────────────────────────────────────
  it("applies the demand multiplier", () => {
    expect(composeLeadPrice({ baseLeadPriceCents: 1000, demandMultiplier: 1.3 })).toBe(1300);
  });

  it("clamps demand above 1.5 down to 1.5", () => {
    expect(composeLeadPrice({ baseLeadPriceCents: 1000, demandMultiplier: 3.0 })).toBe(1500);
  });

  it("clamps demand below 0.8 up to 0.8", () => {
    expect(composeLeadPrice({ baseLeadPriceCents: 1000, demandMultiplier: 0.1 })).toBe(800);
  });

  it("composes all three axes (specialty × firm × demand)", () => {
    // 1000 × 1.75 × 0.85 × 1.2 = 1785
    expect(
      composeLeadPrice({
        baseLeadPriceCents: 1000,
        specialtyMultiplier: 1.75,
        firmTierMultiplier: 0.85,
        demandMultiplier: 1.2,
      }),
    ).toBe(1785);
  });
});
