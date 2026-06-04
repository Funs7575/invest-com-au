import { describe, it, expect } from "vitest";
import {
  CROSS_BORDER_PRICE_MULTIPLIER,
  CROSS_BORDER_SPECIALTIES,
  isCrossBorderSpecialty,
  crossBorderLeadMultiplier,
  calculateLeadPriceCents,
} from "@/lib/advisor-billing-multipliers";

// ── constants ─────────────────────────────────────────────────────────────────

describe("CROSS_BORDER_PRICE_MULTIPLIER", () => {
  it("is 1.75", () => {
    expect(CROSS_BORDER_PRICE_MULTIPLIER).toBe(1.75);
  });
});

describe("CROSS_BORDER_SPECIALTIES", () => {
  it("is non-empty", () => {
    expect(CROSS_BORDER_SPECIALTIES.length).toBeGreaterThan(0);
  });

  it("includes UK Pension Transfer", () => {
    expect(CROSS_BORDER_SPECIALTIES).toContain("UK Pension Transfer");
  });

  it("includes FIRB Property (Non-Resident)", () => {
    expect(CROSS_BORDER_SPECIALTIES).toContain("FIRB Property (Non-Resident)");
  });
});

// ── isCrossBorderSpecialty ────────────────────────────────────────────────────

describe("isCrossBorderSpecialty", () => {
  it("returns false for null", () => {
    expect(isCrossBorderSpecialty(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isCrossBorderSpecialty(undefined)).toBe(false);
  });

  it("returns false for an empty array", () => {
    expect(isCrossBorderSpecialty([])).toBe(false);
  });

  it("returns false for a non-cross-border specialty", () => {
    expect(isCrossBorderSpecialty(["Self-Managed Super (SMSF)"])).toBe(false);
  });

  it("returns true for a cross-border specialty", () => {
    expect(isCrossBorderSpecialty(["UK Pension Transfer"])).toBe(true);
  });

  it("returns true when cross-border is mixed with non-cross-border specialties", () => {
    expect(
      isCrossBorderSpecialty(["Self-Managed Super (SMSF)", "FATCA-Aware US Expat Planning"]),
    ).toBe(true);
  });

  it("returns true for every known cross-border specialty", () => {
    for (const s of CROSS_BORDER_SPECIALTIES) {
      expect(isCrossBorderSpecialty([s])).toBe(true);
    }
  });
});

// ── crossBorderLeadMultiplier ─────────────────────────────────────────────────

describe("crossBorderLeadMultiplier", () => {
  it("returns 1.0 for null specialties", () => {
    expect(crossBorderLeadMultiplier(null)).toBe(1.0);
  });

  it("returns 1.0 for an empty array", () => {
    expect(crossBorderLeadMultiplier([])).toBe(1.0);
  });

  it("returns 1.0 for non-cross-border specialties", () => {
    expect(crossBorderLeadMultiplier(["Retirement Planning"])).toBe(1.0);
  });

  it("returns CROSS_BORDER_PRICE_MULTIPLIER for a cross-border specialty", () => {
    expect(crossBorderLeadMultiplier(["UK Pension Transfer"])).toBe(
      CROSS_BORDER_PRICE_MULTIPLIER,
    );
  });
});

// ── calculateLeadPriceCents ───────────────────────────────────────────────────

describe("calculateLeadPriceCents", () => {
  it("returns basePriceCents × tierMultiplier for non-cross-border (rounds)", () => {
    expect(calculateLeadPriceCents(1000, 2, [])).toBe(2000);
  });

  it("applies cross-border premium on top of base × tier", () => {
    const result = calculateLeadPriceCents(1000, 2, ["UK Pension Transfer"]);
    expect(result).toBe(Math.round(1000 * 2 * CROSS_BORDER_PRICE_MULTIPLIER));
  });

  it("rounds to the nearest cent (integer result)", () => {
    const result = calculateLeadPriceCents(333, 3, ["UK Pension Transfer"]);
    expect(Number.isInteger(result)).toBe(true);
  });

  it("returns 0 for basePriceCents = 0", () => {
    expect(calculateLeadPriceCents(0, 3, ["UK Pension Transfer"])).toBe(0);
  });

  it("standard lead: tier 1 × no cross-border", () => {
    expect(calculateLeadPriceCents(500, 1, null)).toBe(500);
  });

  it("international tier × cross-border premium stacks correctly", () => {
    // typical: base=1000, international tier multiplier=3, cross-border=1.75
    const result = calculateLeadPriceCents(1000, 3, ["FIRB Property (Non-Resident)"]);
    expect(result).toBe(Math.round(1000 * 3 * 1.75));
  });
});
