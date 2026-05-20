import { describe, it, expect } from "vitest";
import {
  calculateStateGrants,
  STATE_GRANTS,
  STATE_LABELS,
  FHG,
  FHG_PRICE_CAPS,
  formatAud,
  type AustralianState,
} from "@/lib/first-home-buyer/state-grants";

const STATES = Object.keys(STATE_LABELS) as AustralianState[];

describe("STATE_GRANTS data integrity", () => {
  it("has a label + source URL for every Australian state/territory", () => {
    expect(STATES).toHaveLength(8);
    for (const code of STATES) {
      expect(STATE_GRANTS[code]).toBeDefined();
      expect(STATE_GRANTS[code].sourceUrl).toMatch(/^https?:\/\//);
      expect(STATE_LABELS[code]).toBeTruthy();
    }
  });

  it("uses integer cents throughout (no rounding drift)", () => {
    for (const code of STATES) {
      expect(Number.isInteger(STATE_GRANTS[code].fhogNewBuildCents)).toBe(true);
    }
  });
});

describe("calculateStateGrants — FHOG amounts", () => {
  it("NSW new build under cap returns $10,000 FHOG", () => {
    const r = calculateStateGrants({
      state: "nsw",
      propertyType: "new_build",
      purchasePriceCents: 600_000_00,
      householdIncomeCents: 100_000_00,
      coupleStatus: "single",
    });
    expect(r.fhogCents).toBe(10_000_00);
    expect(r.fhogApplies).toBe(true);
  });

  it("QLD new build returns $30,000 FHOG (highest standard rate)", () => {
    const r = calculateStateGrants({
      state: "qld",
      propertyType: "new_build",
      purchasePriceCents: 600_000_00,
      householdIncomeCents: 90_000_00,
      coupleStatus: "single",
    });
    expect(r.fhogCents).toBe(30_000_00);
  });

  it("TAS new build returns $30,000 FHOG", () => {
    const r = calculateStateGrants({
      state: "tas",
      propertyType: "new_build",
      purchasePriceCents: 500_000_00,
      householdIncomeCents: 80_000_00,
      coupleStatus: "single",
    });
    expect(r.fhogCents).toBe(30_000_00);
  });

  it("VIC regional new build stacks the regional bonus ($20,000 total)", () => {
    const r = calculateStateGrants({
      state: "vic",
      propertyType: "new_build",
      purchasePriceCents: 500_000_00,
      householdIncomeCents: 100_000_00,
      coupleStatus: "single",
      isRegional: true,
    });
    expect(r.fhogCents).toBe(20_000_00);
  });

  it("VIC metro (non-regional) returns the standard $10,000", () => {
    const r = calculateStateGrants({
      state: "vic",
      propertyType: "new_build",
      purchasePriceCents: 500_000_00,
      householdIncomeCents: 100_000_00,
      coupleStatus: "single",
    });
    expect(r.fhogCents).toBe(10_000_00);
  });

  it("ACT returns zero FHOG with an explanation", () => {
    const r = calculateStateGrants({
      state: "act",
      propertyType: "new_build",
      purchasePriceCents: 700_000_00,
      householdIncomeCents: 120_000_00,
      coupleStatus: "single",
    });
    expect(r.fhogCents).toBe(0);
    expect(r.fhogApplies).toBe(false);
    expect(r.fhogIneligibleReason).toMatch(/does not run/i);
  });

  it("NT stacks BuildBonus + HomeGrown Territory on top of FHOG", () => {
    const r = calculateStateGrants({
      state: "nt",
      propertyType: "new_build",
      purchasePriceCents: 500_000_00,
      householdIncomeCents: 100_000_00,
      coupleStatus: "single",
    });
    expect(r.fhogCents).toBe(10_000_00);
    expect(r.additionalGrantsCents).toBe(20_000_00);
    expect(r.totalGrantCents).toBe(30_000_00);
  });

  it("rejects FHOG on established homes where state requires new build", () => {
    const r = calculateStateGrants({
      state: "nsw",
      propertyType: "established",
      purchasePriceCents: 750_000_00,
      householdIncomeCents: 100_000_00,
      coupleStatus: "single",
    });
    expect(r.fhogCents).toBe(0);
    expect(r.fhogApplies).toBe(false);
    expect(r.fhogIneligibleReason).toMatch(/new builds only/i);
  });

  it("rejects FHOG over price cap (NSW above $750k)", () => {
    const r = calculateStateGrants({
      state: "nsw",
      propertyType: "new_build",
      purchasePriceCents: 900_000_00,
      householdIncomeCents: 100_000_00,
      coupleStatus: "single",
    });
    expect(r.fhogApplies).toBe(false);
    expect(r.fhogIneligibleReason).toMatch(/exceeds.*cap/i);
  });

  it("applies NSW new-build $600k cap (not the land+build $750k cap)", () => {
    // A completed new home at $650k is over the $600k new-build cap.
    const r = calculateStateGrants({
      state: "nsw",
      propertyType: "new_build",
      purchasePriceCents: 650_000_00,
      householdIncomeCents: 100_000_00,
      coupleStatus: "single",
    });
    expect(r.fhogApplies).toBe(false);
    expect(r.fhogIneligibleReason).toMatch(/\$600,000/);
  });

  it("applies NSW land+build $750k cap for land_and_build", () => {
    // Same $650k price is under the $750k land+build cap → eligible.
    const r = calculateStateGrants({
      state: "nsw",
      propertyType: "land_and_build",
      purchasePriceCents: 650_000_00,
      householdIncomeCents: 100_000_00,
      coupleStatus: "single",
    });
    expect(r.fhogApplies).toBe(true);
    expect(r.fhogCents).toBe(10_000_00);
  });
});

describe("calculateStateGrants — stamp duty concessions", () => {
  it("NSW full exemption under $800k", () => {
    const r = calculateStateGrants({
      state: "nsw",
      propertyType: "established",
      purchasePriceCents: 700_000_00,
      householdIncomeCents: 100_000_00,
      coupleStatus: "single",
    });
    expect(r.stampDutyPayableCents).toBe(0);
    expect(r.stampDutySavedCents).toBeGreaterThan(0);
  });

  it("NSW scaled concession at $900k pays roughly half the base duty", () => {
    const r = calculateStateGrants({
      state: "nsw",
      propertyType: "established",
      purchasePriceCents: 900_000_00,
      householdIncomeCents: 100_000_00,
      coupleStatus: "single",
    });
    expect(r.stampDutyPayableCents).toBeGreaterThan(0);
    expect(r.stampDutyPayableCents).toBeLessThan(
      Math.round(900_000_00 * STATE_GRANTS.nsw.approxStampDutyRate),
    );
  });

  it("NSW full duty when over the partial concession band", () => {
    const r = calculateStateGrants({
      state: "nsw",
      propertyType: "established",
      purchasePriceCents: 1_200_000_00,
      householdIncomeCents: 200_000_00,
      coupleStatus: "couple",
    });
    expect(r.stampDutyPayableCents).toBe(
      Math.round(1_200_000_00 * STATE_GRANTS.nsw.approxStampDutyRate),
    );
    expect(r.stampDutySavedCents).toBe(0);
  });
});

describe("calculateStateGrants — First Home Guarantee eligibility (post 1 Oct 2025)", () => {
  it("eligibility is price-driven, not income-driven (high income still eligible)", () => {
    const r = calculateStateGrants({
      state: "nsw",
      propertyType: "new_build",
      purchasePriceCents: 700_000_00,
      householdIncomeCents: 300_000_00, // well above the old $125k cap
      coupleStatus: "single",
    });
    expect(r.fhgEligible).toBe(true);
  });

  it("NSW under the $1.5m capital-city cap qualifies", () => {
    const r = calculateStateGrants({
      state: "nsw",
      propertyType: "established",
      purchasePriceCents: 1_400_000_00,
      householdIncomeCents: 100_000_00,
      coupleStatus: "single",
    });
    expect(r.fhgEligible).toBe(true);
    expect(r.fhgCapCents).toBe(1_500_000_00);
  });

  it("NSW above the $1.5m capital-city cap disqualified", () => {
    const r = calculateStateGrants({
      state: "nsw",
      propertyType: "established",
      purchasePriceCents: 1_600_000_00,
      householdIncomeCents: 100_000_00,
      coupleStatus: "couple",
    });
    expect(r.fhgEligible).toBe(false);
  });

  it("TAS uses the lower $700k capital cap", () => {
    const r = calculateStateGrants({
      state: "tas",
      propertyType: "established",
      purchasePriceCents: 720_000_00,
      householdIncomeCents: 90_000_00,
      coupleStatus: "single",
    });
    expect(r.fhgEligible).toBe(false);
    expect(r.fhgCapCents).toBe(700_000_00);
  });

  it("surfaces both the capital and rest-of-state caps", () => {
    const r = calculateStateGrants({
      state: "vic",
      propertyType: "new_build",
      purchasePriceCents: 700_000_00,
      householdIncomeCents: 90_000_00,
      coupleStatus: "single",
    });
    expect(r.fhgCapCents).toBe(950_000_00);
    expect(r.fhgRestOfStateCapCents).toBe(650_000_00);
  });

  it("FHG no longer has income caps or place limits", () => {
    expect(FHG.hasIncomeCap).toBe(false);
    expect(FHG.hasPlaceLimit).toBe(false);
    expect(FHG_PRICE_CAPS.nsw.capitalCents).toBe(1_500_000_00);
  });
});

describe("calculateStateGrants — ACT income-tested duty concession", () => {
  it("waives duty for buyers under the $250k income threshold regardless of price", () => {
    const r = calculateStateGrants({
      state: "act",
      propertyType: "established",
      purchasePriceCents: 900_000_00,
      householdIncomeCents: 220_000_00,
      coupleStatus: "couple",
    });
    expect(r.stampDutyPayableCents).toBe(0);
    expect(r.stampDutySavedCents).toBeGreaterThan(0);
  });
});

describe("calculateStateGrants — Tasmania established-home full exemption", () => {
  it("fully exempts duty on an established home under $750k", () => {
    const r = calculateStateGrants({
      state: "tas",
      propertyType: "established",
      purchasePriceCents: 600_000_00,
      householdIncomeCents: 90_000_00,
      coupleStatus: "single",
    });
    expect(r.stampDutyPayableCents).toBe(0);
  });
});

describe("calculateStateGrants — land_and_build caveat", () => {
  it("surfaces a duty caveat for land-and-build", () => {
    const r = calculateStateGrants({
      state: "nsw",
      propertyType: "land_and_build",
      purchasePriceCents: 700_000_00,
      householdIncomeCents: 90_000_00,
      coupleStatus: "single",
    });
    expect(r.dutyEstimateCaveat).toMatch(/land value/i);
  });

  it("no caveat for an established-home purchase", () => {
    const r = calculateStateGrants({
      state: "nsw",
      propertyType: "established",
      purchasePriceCents: 700_000_00,
      householdIncomeCents: 90_000_00,
      coupleStatus: "single",
    });
    expect(r.dutyEstimateCaveat).toBe("");
  });
});

describe("calculateStateGrants — breakdown structure", () => {
  it("breakdown includes FHOG and stamp-duty lines for a qualifying buyer", () => {
    const r = calculateStateGrants({
      state: "qld",
      propertyType: "new_build",
      purchasePriceCents: 650_000_00,
      householdIncomeCents: 100_000_00,
      coupleStatus: "single",
    });
    const labels = r.breakdown.map((b) => b.label);
    expect(labels).toContain("First Home Owner Grant");
    expect(labels).toContain("Stamp duty saved");
  });

  it("breakdown omits FHOG line when buyer is ineligible", () => {
    const r = calculateStateGrants({
      state: "act",
      propertyType: "established",
      purchasePriceCents: 700_000_00,
      householdIncomeCents: 120_000_00,
      coupleStatus: "single",
    });
    const labels = r.breakdown.map((b) => b.label);
    expect(labels).not.toContain("First Home Owner Grant");
  });

  it("every breakdown grant row has a source URL", () => {
    const r = calculateStateGrants({
      state: "nt",
      propertyType: "new_build",
      purchasePriceCents: 500_000_00,
      householdIncomeCents: 100_000_00,
      coupleStatus: "single",
    });
    for (const row of r.breakdown.filter((b) => b.kind === "grant")) {
      expect(row.sourceUrl).toMatch(/^https?:\/\//);
    }
  });
});

describe("formatAud", () => {
  it("formats whole-dollar amounts without decimals", () => {
    expect(formatAud(30_000_00)).toContain("$30,000");
  });

  it("handles zero", () => {
    expect(formatAud(0)).toContain("$0");
  });
});
