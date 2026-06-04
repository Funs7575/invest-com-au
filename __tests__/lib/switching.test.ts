/**
 * Unit tests for lib/switching — checklist integrity + saving calc.
 *
 * Mirrors the test-file naming convention: __tests__/lib/<x>.test.ts
 * No mocks needed — all functions are pure.
 */

import { describe, it, expect } from "vitest";
import {
  BROKER_CHECKLIST,
  SUPER_CHECKLIST,
  SAVINGS_CHECKLIST,
  SWITCH_TYPES,
  getChecklist,
} from "@/lib/switching/checklist";
import {
  parseFee,
  calcBrokerSaving,
  calcSuperSaving,
  calcSavingsSaving,
} from "@/lib/switching/savings";

// ─── Checklist integrity ──────────────────────────────────────────────────────

describe("BROKER_CHECKLIST", () => {
  it("has at least 8 steps (minimum viable checklist)", () => {
    expect(BROKER_CHECKLIST.steps.length).toBeGreaterThanOrEqual(8);
  });

  it("type is 'broker'", () => {
    expect(BROKER_CHECKLIST.type).toBe("broker");
  });

  it("every step has a non-empty heading and body", () => {
    for (const step of BROKER_CHECKLIST.steps) {
      expect(step.heading.length).toBeGreaterThan(0);
      expect(step.body.length).toBeGreaterThan(0);
    }
  });

  it("phases are restricted to prepare/open/transfer/close", () => {
    const allowedPhases = new Set(["prepare", "open", "transfer", "close"]);
    for (const step of BROKER_CHECKLIST.steps) {
      expect(allowedPhases.has(step.phase)).toBe(true);
    }
  });

  it("steps appear in logical phase order (prepare before open before transfer before close)", () => {
    const phaseOrder = ["prepare", "open", "transfer", "close"];
    const stepPhases = BROKER_CHECKLIST.steps.map((s) => s.phase);
    let lastIdx = -1;
    for (const phase of stepPhases) {
      const idx = phaseOrder.indexOf(phase);
      // Allow same phase to repeat but never go backwards
      expect(idx).toBeGreaterThanOrEqual(lastIdx);
      lastIdx = idx;
    }
  });

  it("does not contain personal-advice phrases", () => {
    const forbidden = [
      "you should",
      "we recommend",
      "i recommend",
      "best for you",
      "advise you to",
      "you must invest",
    ];
    for (const step of BROKER_CHECKLIST.steps) {
      const text = (step.heading + " " + step.body).toLowerCase();
      for (const phrase of forbidden) {
        expect(text).not.toContain(phrase);
      }
    }
  });

  it("includes a CHESS-related step", () => {
    const hasCHESS = BROKER_CHECKLIST.steps.some(
      (s) =>
        s.body.toLowerCase().includes("chess") ||
        s.heading.toLowerCase().includes("chess"),
    );
    expect(hasCHESS).toBe(true);
  });

  it("includes a cost-base / CGT record-keeping step", () => {
    const hasCostBase = BROKER_CHECKLIST.steps.some(
      (s) =>
        s.body.toLowerCase().includes("cost base") ||
        s.body.toLowerCase().includes("cgt"),
    );
    expect(hasCostBase).toBe(true);
  });

  it("includes a step covering the HIN (Holder Identification Number)", () => {
    const hasHIN = BROKER_CHECKLIST.steps.some(
      (s) =>
        s.body.toLowerCase().includes("hin") ||
        s.heading.toLowerCase().includes("hin"),
    );
    expect(hasHIN).toBe(true);
  });
});

describe("SUPER_CHECKLIST", () => {
  it("has at least 8 steps", () => {
    expect(SUPER_CHECKLIST.steps.length).toBeGreaterThanOrEqual(8);
  });

  it("type is 'super'", () => {
    expect(SUPER_CHECKLIST.type).toBe("super");
  });

  it("every step has a non-empty heading and body", () => {
    for (const step of SUPER_CHECKLIST.steps) {
      expect(step.heading.length).toBeGreaterThan(0);
      expect(step.body.length).toBeGreaterThan(0);
    }
  });

  it("phases are restricted to check/rollover/close", () => {
    const allowedPhases = new Set(["check", "rollover", "close"]);
    for (const step of SUPER_CHECKLIST.steps) {
      expect(allowedPhases.has(step.phase)).toBe(true);
    }
  });

  it("the FIRST step has a warning about insurance loss (ASIC RG 183 requirement)", () => {
    const firstStep = SUPER_CHECKLIST.steps[0];
    expect(firstStep).toBeDefined();
    expect(firstStep?.warning).toBeDefined();
    expect(firstStep?.warning?.toLowerCase()).toContain("insurance");
  });

  it("includes a step about checking insurance before switching", () => {
    const hasInsuranceStep = SUPER_CHECKLIST.steps.some(
      (s) =>
        s.body.toLowerCase().includes("insurance") &&
        s.phase === "check",
    );
    expect(hasInsuranceStep).toBe(true);
  });

  it("includes a step mentioning myGov rollover", () => {
    const hasMyGov = SUPER_CHECKLIST.steps.some(
      (s) => s.body.toLowerCase().includes("mygov"),
    );
    expect(hasMyGov).toBe(true);
  });

  it("includes a beneficiary nomination step", () => {
    const hasBeneficiary = SUPER_CHECKLIST.steps.some(
      (s) =>
        s.body.toLowerCase().includes("beneficiary") ||
        s.heading.toLowerCase().includes("beneficiary"),
    );
    expect(hasBeneficiary).toBe(true);
  });

  it("includes a lost super search step", () => {
    const hasLostSuper = SUPER_CHECKLIST.steps.some(
      (s) =>
        s.body.toLowerCase().includes("lost") ||
        s.heading.toLowerCase().includes("lost"),
    );
    expect(hasLostSuper).toBe(true);
  });

  it("does not contain personal-advice phrases", () => {
    const forbidden = [
      "you should",
      "we recommend",
      "best for you",
      "advise you to",
    ];
    for (const step of SUPER_CHECKLIST.steps) {
      const text = (step.heading + " " + step.body).toLowerCase();
      for (const phrase of forbidden) {
        expect(text).not.toContain(phrase);
      }
    }
  });
});

describe("SAVINGS_CHECKLIST", () => {
  it("has at least 8 steps", () => {
    expect(SAVINGS_CHECKLIST.steps.length).toBeGreaterThanOrEqual(8);
  });

  it("type is 'savings'", () => {
    expect(SAVINGS_CHECKLIST.type).toBe("savings");
  });

  it("every step has a non-empty heading and body", () => {
    for (const step of SAVINGS_CHECKLIST.steps) {
      expect(step.heading.length).toBeGreaterThan(0);
      expect(step.body.length).toBeGreaterThan(0);
    }
  });

  it("phases are restricted to prepare/open/migrate/close", () => {
    const allowedPhases = new Set(["prepare", "open", "migrate", "close"]);
    for (const step of SAVINGS_CHECKLIST.steps) {
      expect(allowedPhases.has(step.phase)).toBe(true);
    }
  });

  it("includes a step about direct debit migration", () => {
    const hasDD = SAVINGS_CHECKLIST.steps.some(
      (s) =>
        s.body.toLowerCase().includes("direct debit") ||
        s.heading.toLowerCase().includes("direct debit"),
    );
    expect(hasDD).toBe(true);
  });

  it("includes a step about intro rate expiry", () => {
    const hasIntro = SAVINGS_CHECKLIST.steps.some(
      (s) =>
        s.body.toLowerCase().includes("introductory") ||
        s.body.toLowerCase().includes("intro"),
    );
    expect(hasIntro).toBe(true);
  });

  it("includes a step about payroll update", () => {
    const hasPayroll = SAVINGS_CHECKLIST.steps.some(
      (s) =>
        s.body.toLowerCase().includes("payroll") ||
        s.heading.toLowerCase().includes("payroll"),
    );
    expect(hasPayroll).toBe(true);
  });

  it("does not contain personal-advice phrases", () => {
    const forbidden = ["you should", "we recommend", "best for you"];
    for (const step of SAVINGS_CHECKLIST.steps) {
      const text = (step.heading + " " + step.body).toLowerCase();
      for (const phrase of forbidden) {
        expect(text).not.toContain(phrase);
      }
    }
  });
});

// ─── getChecklist helper ──────────────────────────────────────────────────────

describe("getChecklist", () => {
  it("returns broker checklist for 'broker'", () => {
    const result = getChecklist("broker");
    expect(result?.type).toBe("broker");
  });

  it("returns super checklist for 'super'", () => {
    const result = getChecklist("super");
    expect(result?.type).toBe("super");
  });

  it("returns savings checklist for 'savings'", () => {
    const result = getChecklist("savings");
    expect(result?.type).toBe("savings");
  });

  it("returns null for unknown type", () => {
    expect(getChecklist("unknown")).toBeNull();
    expect(getChecklist("")).toBeNull();
    expect(getChecklist("forex")).toBeNull();
  });
});

// ─── SWITCH_TYPES metadata ────────────────────────────────────────────────────

describe("SWITCH_TYPES", () => {
  it("has exactly 3 entries (broker, super, savings)", () => {
    expect(SWITCH_TYPES).toHaveLength(3);
  });

  it("each entry has type, label, icon, tagline, slug", () => {
    for (const entry of SWITCH_TYPES) {
      expect(entry.type).toBeTruthy();
      expect(entry.label).toBeTruthy();
      expect(entry.icon).toBeTruthy();
      expect(entry.tagline).toBeTruthy();
      expect(entry.slug).toBeTruthy();
    }
  });

  it("slugs match type values", () => {
    for (const entry of SWITCH_TYPES) {
      expect(entry.slug).toBe(entry.type);
    }
  });
});

// ─── parseFee ─────────────────────────────────────────────────────────────────

describe("parseFee", () => {
  it("parses flat dollar fee", () => {
    expect(parseFee("$19.95")).toEqual({ flat: 19.95, pct: 0 });
    expect(parseFee("$0")).toEqual({ flat: 0, pct: 0 });
    expect(parseFee("$11")).toEqual({ flat: 11, pct: 0 });
  });

  it("parses percentage fee", () => {
    const result = parseFee("0.5%");
    expect(result.flat).toBe(0);
    expect(result.pct).toBeCloseTo(0.005);
  });

  it("handles free / $0", () => {
    expect(parseFee("free")).toEqual({ flat: 0, pct: 0 });
    expect(parseFee("Free")).toEqual({ flat: 0, pct: 0 });
    expect(parseFee("$0")).toEqual({ flat: 0, pct: 0 });
  });

  it("handles null and undefined", () => {
    expect(parseFee(null)).toEqual({ flat: 0, pct: 0 });
    expect(parseFee(undefined)).toEqual({ flat: 0, pct: 0 });
    expect(parseFee("")).toEqual({ flat: 0, pct: 0 });
  });

  it("handles fee with comma-separated thousand separators", () => {
    const result = parseFee("$1,000");
    expect(result.flat).toBe(1000);
  });

  it("returns zero for malformed dollar/percent tokens (no NaN leak)", () => {
    // "$." used to match the loose /\$([\d.]+)/ → parseFloat(".") → NaN.
    expect(parseFee("$.")).toEqual({ flat: 0, pct: 0 });
    // ".%" used to match /([\d.]+)%/ → parseFloat(".") → NaN.
    expect(parseFee(".%")).toEqual({ flat: 0, pct: 0 });
  });

  it("parses a sane value from multi-dot junk like '1.2.3%'", () => {
    // The tightened regex stops at the first valid number; result must
    // be finite (the old loose regex captured "1.2.3" → parseFloat 1.2).
    const result = parseFee("1.2.3%");
    expect(Number.isFinite(result.pct)).toBe(true);
    expect(result.flat).toBe(0);
  });
});

// ─── calcBrokerSaving ─────────────────────────────────────────────────────────

describe("calcBrokerSaving", () => {
  const baseInputs = {
    tradesPerYear: 24,
    avgTradeSize: 2000,
    usAllocationPct: 0,
  };

  it("calculates saving from $19.95 to $0 brokerage (24 ASX trades)", () => {
    const result = calcBrokerSaving({
      ...baseInputs,
      currentAsxFee: "$19.95",
      targetAsxFee: "$0",
    });
    // 24 trades × $19.95 = $478.80
    expect(result.currentAnnualCost).toBeCloseTo(478.8, 1);
    expect(result.targetAnnualCost).toBe(0);
    expect(result.annualDifference).toBeCloseTo(478.8, 1);
  });

  it("positive annualDifference means saving (current costs more than target)", () => {
    const result = calcBrokerSaving({
      ...baseInputs,
      currentAsxFee: "$29.95",
      targetAsxFee: "$9.50",
    });
    expect(result.annualDifference).toBeGreaterThan(0);
  });

  it("keeps annualDifference finite when one broker has a garbage fee string", () => {
    const result = calcBrokerSaving({
      ...baseInputs,
      currentAsxFee: "$.",
      targetAsxFee: "$9.50",
    });
    expect(Number.isFinite(result.annualDifference)).toBe(true);
    expect(Number.isFinite(result.currentAnnualCost)).toBe(true);
    expect(Number.isFinite(result.targetAnnualCost)).toBe(true);
  });

  it("negative annualDifference means target costs more (no saving)", () => {
    const result = calcBrokerSaving({
      ...baseInputs,
      currentAsxFee: "$5",
      targetAsxFee: "$19.95",
    });
    expect(result.annualDifference).toBeLessThan(0);
  });

  it("projected savings at 1y = annualDifference, at 5y ≈ 5×", () => {
    const result = calcBrokerSaving({
      ...baseInputs,
      currentAsxFee: "$19.95",
      targetAsxFee: "$0",
    });
    const yr1 = result.projectedSavings.find((p) => p.years === 1);
    const yr5 = result.projectedSavings.find((p) => p.years === 5);
    expect(yr1).toBeDefined();
    expect(yr5).toBeDefined();
    // Projections are individually rounded integers so yr5 ≈ yr1 × 5
    // Allow ±2 for rounding drift (Math.round(x) * 5 vs Math.round(x * 5))
    expect(Math.abs(yr5!.saving - yr1!.saving * 5)).toBeLessThanOrEqual(2);
  });

  it("includes FX cost for US trades", () => {
    const resultWithUS = calcBrokerSaving({
      ...baseInputs,
      currentAsxFee: "$0",
      targetAsxFee: "$0",
      currentFxRate: 1.0, // 1% FX
      targetFxRate: 0.7,  // 0.7% FX
      usAllocationPct: 50,
    });
    // Should show a positive saving due to lower FX on target
    expect(resultWithUS.annualDifference).toBeGreaterThan(0);
  });

  it("includes inactivity fee in total cost", () => {
    const withInactivity = calcBrokerSaving({
      ...baseInputs,
      currentAsxFee: "$0",
      targetAsxFee: "$0",
      currentInactivityFee: "$50",
      targetInactivityFee: "$0",
    });
    expect(withInactivity.currentAnnualCost).toBe(50);
    expect(withInactivity.targetAnnualCost).toBe(0);
    expect(withInactivity.annualDifference).toBe(50);
  });

  it("zero trades produces zero cost", () => {
    const result = calcBrokerSaving({
      ...baseInputs,
      tradesPerYear: 0,
      currentAsxFee: "$19.95",
      targetAsxFee: "$0",
    });
    expect(result.currentAnnualCost).toBe(0);
    expect(result.targetAnnualCost).toBe(0);
    expect(result.annualDifference).toBe(0);
  });

  it("percentage fee: higher trade size increases cost proportionally", () => {
    const smallTrade = calcBrokerSaving({
      tradesPerYear: 10,
      avgTradeSize: 1000,
      usAllocationPct: 0,
      currentAsxFee: "0.1%",
      targetAsxFee: "$0",
    });
    const largeTrade = calcBrokerSaving({
      tradesPerYear: 10,
      avgTradeSize: 10000,
      usAllocationPct: 0,
      currentAsxFee: "0.1%",
      targetAsxFee: "$0",
    });
    expect(largeTrade.currentAnnualCost).toBeCloseTo(
      smallTrade.currentAnnualCost * 10,
      1,
    );
  });
});

// ─── calcSuperSaving ──────────────────────────────────────────────────────────

describe("calcSuperSaving", () => {
  it("calculates correct annual saving on $100k balance", () => {
    const result = calcSuperSaving({
      balance: 100_000,
      currentFeeRatePct: 1.5,
      targetFeeRatePct: 0.5,
    });
    // 1.5% × 100k = $1,500; 0.5% × 100k = $500; difference = $1,000
    expect(result.currentAnnualFee).toBe(1500);
    expect(result.targetAnnualFee).toBe(500);
    expect(result.annualDifference).toBe(1000);
  });

  it("includes fixed admin fee in total", () => {
    const result = calcSuperSaving({
      balance: 100_000,
      currentFeeRatePct: 0.5,
      targetFeeRatePct: 0.5,
      currentFixedFeeAud: 200,
      targetFixedFeeAud: 52,
    });
    // Same % fee, but different fixed fees: $200 vs $52
    expect(result.annualDifference).toBeCloseTo(148, 1);
  });

  it("positive annualDifference means saving by switching", () => {
    const result = calcSuperSaving({
      balance: 50_000,
      currentFeeRatePct: 1.0,
      targetFeeRatePct: 0.3,
    });
    expect(result.annualDifference).toBeGreaterThan(0);
  });

  it("negative annualDifference means target is more expensive", () => {
    const result = calcSuperSaving({
      balance: 50_000,
      currentFeeRatePct: 0.3,
      targetFeeRatePct: 1.5,
    });
    expect(result.annualDifference).toBeLessThan(0);
  });

  it("5-year projection is 5× the annual difference", () => {
    const result = calcSuperSaving({
      balance: 100_000,
      currentFeeRatePct: 1.0,
      targetFeeRatePct: 0.5,
    });
    const yr1 = result.projectedSavings.find((p) => p.years === 1)!;
    const yr5 = result.projectedSavings.find((p) => p.years === 5)!;
    expect(yr5.saving).toBe(yr1.saving * 5);
  });

  it("zero balance produces zero fees", () => {
    const result = calcSuperSaving({
      balance: 0,
      currentFeeRatePct: 1.5,
      targetFeeRatePct: 0.5,
    });
    expect(result.currentAnnualFee).toBe(0);
    expect(result.targetAnnualFee).toBe(0);
    expect(result.annualDifference).toBe(0);
  });

  it("equal fee rates produce zero difference", () => {
    const result = calcSuperSaving({
      balance: 200_000,
      currentFeeRatePct: 0.8,
      targetFeeRatePct: 0.8,
    });
    expect(result.annualDifference).toBe(0);
  });
});

// ─── calcSavingsSaving ────────────────────────────────────────────────────────

describe("calcSavingsSaving", () => {
  it("calculates annual interest gain from 0.5% to 5%", () => {
    const result = calcSavingsSaving({
      balance: 50_000,
      currentRatePct: 0.5,
      targetRatePct: 5.0,
    });
    // 0.5% × $50k = $250; 5% × $50k = $2,500; difference = $2,250
    expect(result.currentAnnualInterest).toBe(250);
    expect(result.targetAnnualInterest).toBe(2500);
    expect(result.annualDifference).toBe(2250);
  });

  it("monthly fee is annualised (×12)", () => {
    const result = calcSavingsSaving({
      balance: 10_000,
      currentRatePct: 3.0,
      targetRatePct: 3.0,
      currentMonthlyFeeAud: 0,
      targetMonthlyFeeAud: 5,
    });
    expect(result.targetAnnualFees).toBe(60);
    // Same rate but target has fees: net gain is negative
    expect(result.annualDifference).toBe(-60);
  });

  it("positive difference means net gain from switching", () => {
    const result = calcSavingsSaving({
      balance: 20_000,
      currentRatePct: 0.1,
      targetRatePct: 4.5,
    });
    expect(result.annualDifference).toBeGreaterThan(0);
  });

  it("fee offset can reduce the gain from a higher rate", () => {
    // Higher rate but much higher monthly fee
    const result = calcSavingsSaving({
      balance: 1_000,
      currentRatePct: 0.0,
      targetRatePct: 5.0,
      currentMonthlyFeeAud: 0,
      targetMonthlyFeeAud: 10, // $120/yr fees vs $50 interest gain
    });
    expect(result.annualDifference).toBeLessThan(0);
  });

  it("5-year projection correctly multiplied", () => {
    const result = calcSavingsSaving({
      balance: 10_000,
      currentRatePct: 0.5,
      targetRatePct: 4.5,
    });
    const yr1 = result.projectedSavings.find((p) => p.years === 1)!;
    const yr5 = result.projectedSavings.find((p) => p.years === 5)!;
    expect(yr5.saving).toBe(yr1.saving * 5);
  });

  it("zero balance produces zero difference", () => {
    const result = calcSavingsSaving({
      balance: 0,
      currentRatePct: 0.5,
      targetRatePct: 5.0,
    });
    expect(result.annualDifference).toBe(0);
  });

  it("equal rates with equal fees produce zero difference", () => {
    const result = calcSavingsSaving({
      balance: 50_000,
      currentRatePct: 4.0,
      targetRatePct: 4.0,
      currentMonthlyFeeAud: 0,
      targetMonthlyFeeAud: 0,
    });
    expect(result.annualDifference).toBe(0);
  });

  it("projects savings for years [1,2,3,5]", () => {
    const result = calcSavingsSaving({
      balance: 10_000,
      currentRatePct: 1.0,
      targetRatePct: 4.0,
    });
    const years = result.projectedSavings.map((p) => p.years);
    expect(years).toEqual([1, 2, 3, 5]);
  });
});
