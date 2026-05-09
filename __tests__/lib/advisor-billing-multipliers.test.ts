import { describe, it, expect } from "vitest";
import {
  CROSS_BORDER_SPECIALTIES,
  CROSS_BORDER_PRICE_MULTIPLIER,
  isCrossBorderSpecialty,
  crossBorderLeadMultiplier,
  calculateLeadPriceCents,
} from "@/lib/advisor-billing-multipliers";

describe("CROSS_BORDER_SPECIALTIES", () => {
  it("includes the 4 canonical cross-border specialties", () => {
    expect(CROSS_BORDER_SPECIALTIES).toContain("UK Pension Transfer");
    expect(CROSS_BORDER_SPECIALTIES).toContain("FATCA-Aware US Expat Planning");
    expect(CROSS_BORDER_SPECIALTIES).toContain("DASP Processing");
    expect(CROSS_BORDER_SPECIALTIES).toContain("FIRB Property (Non-Resident)");
    expect(CROSS_BORDER_SPECIALTIES).toHaveLength(4);
  });
});

describe("isCrossBorderSpecialty", () => {
  it("returns false for null", () => {
    expect(isCrossBorderSpecialty(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isCrossBorderSpecialty(undefined)).toBe(false);
  });

  it("returns false for empty array", () => {
    expect(isCrossBorderSpecialty([])).toBe(false);
  });

  it("returns false for non-cross-border specialties", () => {
    expect(isCrossBorderSpecialty(["First Home Buyers", "Small Business Owners"])).toBe(false);
  });

  it("returns true when UK Pension Transfer is present", () => {
    expect(isCrossBorderSpecialty(["UK Pension Transfer"])).toBe(true);
  });

  it("returns true when FATCA-Aware US Expat Planning is present", () => {
    expect(isCrossBorderSpecialty(["First Home Buyers", "FATCA-Aware US Expat Planning"])).toBe(true);
  });

  it("returns true when DASP Processing is present", () => {
    expect(isCrossBorderSpecialty(["DASP Processing"])).toBe(true);
  });

  it("returns true when FIRB Property (Non-Resident) is present", () => {
    expect(isCrossBorderSpecialty(["FIRB Property (Non-Resident)", "Property Investment"])).toBe(true);
  });

  it("returns true when multiple cross-border specialties are present", () => {
    expect(
      isCrossBorderSpecialty(["UK Pension Transfer", "DASP Processing"]),
    ).toBe(true);
  });

  it("is case-sensitive (canonical names only)", () => {
    expect(isCrossBorderSpecialty(["uk pension transfer"])).toBe(false);
  });
});

describe("crossBorderLeadMultiplier", () => {
  it("returns 1.0 for non-cross-border", () => {
    expect(crossBorderLeadMultiplier(["First Home Buyers"])).toBe(1.0);
    expect(crossBorderLeadMultiplier(null)).toBe(1.0);
    expect(crossBorderLeadMultiplier([])).toBe(1.0);
  });

  it("returns 1.75 for cross-border specialty", () => {
    expect(crossBorderLeadMultiplier(["UK Pension Transfer"])).toBe(1.75);
  });

  it("returns 1.75 only once (not multiplied per matching specialty)", () => {
    expect(
      crossBorderLeadMultiplier(["UK Pension Transfer", "DASP Processing", "FATCA-Aware US Expat Planning"]),
    ).toBe(1.75);
  });

  it("matches the exported constant", () => {
    expect(crossBorderLeadMultiplier(["UK Pension Transfer"])).toBe(CROSS_BORDER_PRICE_MULTIPLIER);
  });
});

describe("calculateLeadPriceCents", () => {
  // Standard tier (×1.0), no cross-border, $39 base
  it("standard lead, no cross-border = base price", () => {
    expect(calculateLeadPriceCents(3900, 1, ["First Home Buyers"])).toBe(3900);
  });

  // Standard tier (×1.0), cross-border = base × 1.75 = $68.25 → 6825 cents
  it("standard lead with cross-border specialty = 1.75× base", () => {
    expect(calculateLeadPriceCents(3900, 1, ["UK Pension Transfer"])).toBe(6825);
  });

  // Qualified tier (×2.0), no cross-border = $78
  it("qualified lead, no cross-border = 2× base", () => {
    expect(calculateLeadPriceCents(3900, 2, [])).toBe(7800);
  });

  // Qualified tier (×2.0), cross-border = $39 × 2 × 1.75 = $136.50
  it("qualified lead with cross-border = stacks both multipliers", () => {
    expect(calculateLeadPriceCents(3900, 2, ["DASP Processing"])).toBe(13650);
  });

  // International tier (×3.0), cross-border = $39 × 3 × 1.75 = $204.75
  it("international lead with cross-border = full premium stack", () => {
    expect(calculateLeadPriceCents(3900, 3, ["FATCA-Aware US Expat Planning"])).toBe(20475);
  });

  // Free lead (base = 0)
  it("free lead is always 0 regardless of multipliers", () => {
    expect(calculateLeadPriceCents(0, 3, ["UK Pension Transfer"])).toBe(0);
  });

  // Rounding behaviour
  it("rounds to nearest cent (Math.round)", () => {
    // 1234 × 1.75 = 2159.5 → rounds to 2160
    expect(calculateLeadPriceCents(1234, 1, ["UK Pension Transfer"])).toBe(2160);
  });
});
