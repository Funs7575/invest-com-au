import { describe, it, expect } from "vitest";
import {
  FIRB_THRESHOLDS,
  STATE_SURCHARGES,
  FIRB_FEES,
  FIRB_PROCESS_STEPS,
  FIRB_FAQS,
  getFirbFee,
  estimateForeignBuyerCosts,
} from "@/lib/firb-data";

describe("FIRB_THRESHOLDS + STATE_SURCHARGES + FIRB_FEES", () => {
  it("FIRB_THRESHOLDS has entries with category + description", () => {
    expect(FIRB_THRESHOLDS.length).toBeGreaterThan(0);
    for (const t of FIRB_THRESHOLDS) {
      expect(t.category).toBeTruthy();
      expect(t.description).toBeTruthy();
    }
  });

  it("STATE_SURCHARGES covers all 8 Australian states/territories", () => {
    const codes = STATE_SURCHARGES.map((s) => s.stateCode);
    for (const expected of ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "ACT", "NT"]) {
      expect(codes, `missing ${expected}`).toContain(expected);
    }
  });

  it("FIRB_FEES is sorted ascending by maxValueAud (null last)", () => {
    for (let i = 1; i < FIRB_FEES.length; i += 1) {
      const prev = FIRB_FEES[i - 1]!;
      const cur = FIRB_FEES[i]!;
      // cur either null (last) or >= prev
      if (prev.maxValueAud !== null && cur.maxValueAud !== null) {
        expect(cur.maxValueAud).toBeGreaterThan(prev.maxValueAud);
      }
    }
    // Last row is the "over everything" row
    expect(FIRB_FEES[FIRB_FEES.length - 1]!.maxValueAud).toBeNull();
  });

  it("FIRB_PROCESS_STEPS are numbered 1..n", () => {
    FIRB_PROCESS_STEPS.forEach((s, i) => {
      expect(s.step).toBe(i + 1);
      expect(s.title).toBeTruthy();
      expect(s.description).toBeTruthy();
    });
  });

  it("FIRB_FAQS has question + answer for each entry", () => {
    for (const f of FIRB_FAQS) {
      expect(f.question).toBeTruthy();
      expect(f.answer).toBeTruthy();
    }
  });
});

describe("getFirbFee", () => {
  it("returns the lowest-tier fee for a sub-$1M purchase", () => {
    expect(getFirbFee(500_000)).toBe(14_100);
  });

  it("exact threshold $1M is the lowest-tier fee", () => {
    expect(getFirbFee(1_000_000)).toBe(14_100);
  });

  it("$1,500,000 is in the $1M-$2M tier", () => {
    expect(getFirbFee(1_500_000)).toBe(28_200);
  });

  it("returns the 'over $10M' tier for very large values", () => {
    expect(getFirbFee(50_000_000)).toBe(451_200);
  });

  it("handles values above the highest finite threshold (uses null-bound last row)", () => {
    expect(getFirbFee(10_000_001)).toBe(451_200);
  });
});

describe("estimateForeignBuyerCosts", () => {
  it("returns a breakdown with all four component fields", () => {
    const res = estimateForeignBuyerCosts(750_000, "NSW");
    expect(res.propertyPrice).toBe(750_000);
    expect(res.standardStampDuty).toBeGreaterThan(0);
    expect(res.foreignSurcharge).toBeGreaterThan(0);
    expect(res.firbFee).toBeGreaterThan(0);
    expect(res.totalUpfrontCost).toBe(
      750_000 + res.standardStampDuty + res.foreignSurcharge + res.firbFee,
    );
  });

  it("uses NSW's surcharge (8%) for a NSW buyer", () => {
    const res = estimateForeignBuyerCosts(1_000_000, "NSW");
    // NSW surcharge = 8%
    expect(res.foreignSurcharge).toBe(80_000);
  });

  it("uses QLD's surcharge (7%) for a QLD buyer", () => {
    const res = estimateForeignBuyerCosts(1_000_000, "QLD");
    expect(res.foreignSurcharge).toBe(70_000);
  });

  it("falls back to 7% for an unknown state code", () => {
    const res = estimateForeignBuyerCosts(1_000_000, "XX");
    expect(res.foreignSurcharge).toBe(70_000);
  });

  it("applies the 2.5% stamp duty band to $400k properties", () => {
    const res = estimateForeignBuyerCosts(400_000, "NSW");
    expect(res.standardStampDuty).toBe(10_000); // 400k * 0.025
  });

  it("applies the 4% band at $750k", () => {
    const res = estimateForeignBuyerCosts(750_000, "NSW");
    expect(res.standardStampDuty).toBe(30_000); // 750k * 0.04
  });

  it("applies the 5.5% band at $1.5M", () => {
    const res = estimateForeignBuyerCosts(1_500_000, "NSW");
    expect(res.standardStampDuty).toBe(82_500); // 1.5M * 0.055
  });
});
