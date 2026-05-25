import { describe, it, expect } from "vitest";

import {
  computeScenario,
  computeRetirementProjection,
  computeSuperContributions,
  marginalRateIncludingMedicare,
  CONCESSIONAL_CAP,
  DIV293_THRESHOLD,
  SUPER_TAX_RATE,
  DEFAULT_SG_RATE,
  SCENARIO_PLANNER_CALC_KEY,
  type ScenarioInput,
} from "@/lib/scenario-engine";

import { computeInvestmentIncomeTax } from "@/lib/calculators/investment-income-tax";
import { computeCgt } from "@/lib/calculators/cgt";

// ─── marginalRateIncludingMedicare ────────────────────────────────────────────

describe("marginalRateIncludingMedicare", () => {
  it("returns 0 for income at/below $18,200", () => {
    expect(marginalRateIncludingMedicare(0)).toBe(0);
    expect(marginalRateIncludingMedicare(18_200)).toBe(0);
  });

  it("returns 21% for income in [$18,201, $45,000] bracket", () => {
    expect(marginalRateIncludingMedicare(30_000)).toBeCloseTo(0.21);
  });

  it("returns 34.5% for income in [$45,001, $120,000] bracket", () => {
    expect(marginalRateIncludingMedicare(90_000)).toBeCloseTo(0.345);
  });

  it("returns 39% for income in [$120,001, $180,000] bracket", () => {
    expect(marginalRateIncludingMedicare(150_000)).toBeCloseTo(0.39);
  });

  it("returns 47% for income above $180,000", () => {
    expect(marginalRateIncludingMedicare(250_000)).toBeCloseTo(0.47);
  });
});

// ─── computeSuperContributions ────────────────────────────────────────────────

describe("computeSuperContributions", () => {
  const sg = 10_000; // employer SG
  const extra = 5_000; // salary sacrifice
  const nc = 0;
  const balance = 150_000; // under $500k — carry-forward applies
  const carryForward = 0;
  const salary = 90_000;

  it("sums employer SG + extra for totalConcessional", () => {
    const r = computeSuperContributions(salary, sg, extra, nc, balance, carryForward);
    expect(r.totalConcessional).toBe(15_000);
  });

  it("applies 15% super tax on concessional within cap", () => {
    const r = computeSuperContributions(salary, sg, extra, nc, balance, carryForward);
    // within cap → no excess, all taxed at 15%
    expect(r.totalSuperTax).toBeCloseTo(15_000 * SUPER_TAX_RATE);
    expect(r.netConcessionalInSuper).toBeCloseTo(15_000 * (1 - SUPER_TAX_RATE));
  });

  it("applies Div 293 (extra 15%) for income >= $250k", () => {
    const r = computeSuperContributions(
      DIV293_THRESHOLD,
      sg,
      extra,
      nc,
      balance,
      carryForward,
    );
    expect(r.isHighEarner).toBe(true);
    expect(r.effectiveSuperTaxRate).toBe(0.3);
    // 30% of 15k = 4500
    expect(r.totalSuperTax).toBeCloseTo(15_000 * 0.3);
  });

  it("flags concessional excess above effective cap", () => {
    const overCap = CONCESSIONAL_CAP + 5_000; // $35k
    const r = computeSuperContributions(salary, overCap, 0, nc, balance, carryForward);
    expect(r.concessionalExcess).toBe(5_000);
  });

  it("includes carry-forward when balance < $500k", () => {
    const cf = 10_000;
    const r = computeSuperContributions(salary, sg, extra, nc, balance, cf);
    // effective cap = $30k + $10k = $40k
    expect(r.effectiveCap).toBe(CONCESSIONAL_CAP + cf);
  });

  it("ignores carry-forward when balance >= $500k", () => {
    const r = computeSuperContributions(salary, sg, extra, nc, 600_000, 10_000);
    expect(r.effectiveCap).toBe(CONCESSIONAL_CAP);
  });

  it("computes positive tax saving when extra contribs reduce marginal rate exposure", () => {
    const r = computeSuperContributions(90_000, sg, 5_000, nc, balance, carryForward);
    // marginal for $90k = 34.5%, effective super = 15% → saving = 19.5% × 5000
    expect(r.taxSavingOnExtraContribs).toBeCloseTo(5_000 * (0.345 - 0.15));
  });

  it("tax saving is 0 when income is at or below the tax-free threshold", () => {
    const r = computeSuperContributions(18_000, 1_000, 500, nc, balance, carryForward);
    // marginal = 0% → no saving from contributing to super (0% < 15% clamped to 0)
    expect(r.taxSavingOnExtraContribs).toBe(0);
  });

  it("non-concessional excess is 0 when within cap", () => {
    const r = computeSuperContributions(salary, sg, extra, 50_000, balance, carryForward);
    expect(r.nonConcessionalExcess).toBe(0);
  });
});

// ─── computeRetirementProjection ─────────────────────────────────────────────

describe("computeRetirementProjection", () => {
  it("returns 0 milestones and projected = currentBalance when yearsToRetirement = 0", () => {
    const r = computeRetirementProjection(67, 67, 500_000, 10_000, 7, 3, 60_000);
    expect(r.yearsToRetirement).toBe(0);
    expect(r.projectedSuperAtRetirement).toBe(500_000);
    expect(r.milestones.length).toBe(0);
  });

  it("grows a zero-contribution balance by compound interest only", () => {
    // Single year: 100k × 1.07 = 107k
    const r = computeRetirementProjection(66, 67, 100_000, 0, 7, 3, 60_000);
    expect(r.projectedSuperAtRetirement).toBeCloseTo(107_000);
  });

  it("adds annual contributions correctly over multiple years", () => {
    // 2 years, 10k/yr, 0% return, start 100k → 120k
    const r = computeRetirementProjection(65, 67, 100_000, 10_000, 0, 0, 60_000);
    expect(r.projectedSuperAtRetirement).toBeCloseTo(120_000);
  });

  it("isOnTrack when projected exceeds 4% rule target", () => {
    // target for $60k = $1.5M; project with huge balance
    const r = computeRetirementProjection(64, 65, 2_000_000, 0, 0, 0, 60_000);
    expect(r.isOnTrack).toBe(true);
    expect(r.gapToTarget).toBeLessThanOrEqual(0);
  });

  it("isOnTrack is false when projected is below target", () => {
    const r = computeRetirementProjection(64, 65, 100_000, 0, 0, 0, 60_000);
    expect(r.isOnTrack).toBe(false);
    expect(r.gapToTarget).toBeGreaterThan(0);
  });

  it("drawdownYears > 0 for a reasonable balance", () => {
    const r = computeRetirementProjection(35, 67, 200_000, 15_000, 7, 3, 60_000);
    expect(r.drawdownYears).toBeGreaterThan(0);
  });

  it("milestones include retirement year", () => {
    const r = computeRetirementProjection(35, 67, 100_000, 10_000, 7, 3, 60_000);
    const lastMilestone = r.milestones[r.milestones.length - 1];
    expect(lastMilestone?.age).toBe(67);
  });

  it("milestones are at age 40, 45, 50, 55, 60, 65, 67 for age 35→67", () => {
    const r = computeRetirementProjection(35, 67, 100_000, 10_000, 7, 3, 60_000);
    const ages = r.milestones.map((m) => m.age);
    expect(ages).toContain(40);
    expect(ages).toContain(65);
    expect(ages).toContain(67);
  });

  it("balances are monotonically increasing with positive return + contributions", () => {
    const r = computeRetirementProjection(35, 67, 100_000, 10_000, 7, 3, 60_000);
    for (let i = 1; i < r.milestones.length; i++) {
      const prev = r.milestones[i - 1];
      const curr = r.milestones[i];
      if (prev && curr) {
        expect(curr.balance).toBeGreaterThan(prev.balance);
      }
    }
  });
});

// ─── computeScenario (composer) ────────────────────────────────────────────────

describe("computeScenario — default resolution", () => {
  const base: ScenarioInput = {
    currentAge: 35,
    retirementAge: 67,
    annualSalary: 100_000,
    currentSuperBalance: 150_000,
  };

  it("fills in default employerSgRate of 11.5%", () => {
    const r = computeScenario(base);
    expect(r.inputs.employerSgRate).toBe(DEFAULT_SG_RATE);
  });

  it("fills in default expectedReturnPct of 7%", () => {
    const r = computeScenario(base);
    expect(r.inputs.expectedReturnPct).toBe(7);
  });

  it("fills in default inflationRatePct of 3%", () => {
    const r = computeScenario(base);
    expect(r.inputs.inflationRatePct).toBe(3);
  });

  it("fills in default desiredRetirementIncome of $60k", () => {
    const r = computeScenario(base);
    expect(r.inputs.desiredRetirementIncome).toBe(60_000);
  });

  it("fills in zero for all optional income fields", () => {
    const r = computeScenario(base);
    expect(r.inputs.annualInterestIncome).toBe(0);
    expect(r.inputs.annualUnfrankedDividends).toBe(0);
    expect(r.inputs.annualFrankedDividends).toBe(0);
    expect(r.inputs.annualCapitalGain).toBe(0);
  });
});

describe("computeScenario — retirement sub-result", () => {
  const base: ScenarioInput = {
    currentAge: 35,
    retirementAge: 67,
    annualSalary: 100_000,
    currentSuperBalance: 150_000,
    employerSgRate: 0.115,
    expectedReturnPct: 7,
    inflationRatePct: 3,
    desiredRetirementIncome: 60_000,
  };

  it("annualEmployerContrib equals salary × SG rate", () => {
    const r = computeScenario(base);
    expect(r.retirement.annualEmployerContrib).toBeCloseTo(100_000 * 0.115);
  });

  it("yearsToRetirement equals retirementAge - currentAge", () => {
    const r = computeScenario(base);
    expect(r.retirement.yearsToRetirement).toBe(32);
  });

  it("projectedSuperAtRetirement is positive and substantially larger than starting balance", () => {
    const r = computeScenario(base);
    expect(r.retirement.projectedSuperAtRetirement).toBeGreaterThan(150_000);
  });

  it("targetBalance4PctRule equals desiredRetirementIncome / 0.04", () => {
    const r = computeScenario(base);
    expect(r.retirement.targetBalance4PctRule).toBeCloseTo(60_000 / 0.04);
  });
});

describe("computeScenario — super contributions sub-result", () => {
  const base: ScenarioInput = {
    currentAge: 35,
    retirementAge: 67,
    annualSalary: 90_000,
    currentSuperBalance: 150_000,
    employerSgRate: 0.115,
    extraConcessionalContribs: 5_000,
  };

  it("totalConcessional = employer SG + extra", () => {
    const r = computeScenario(base);
    expect(r.superContributions.totalConcessional).toBeCloseTo(
      90_000 * 0.115 + 5_000,
    );
  });

  it("taxSavingOnExtraContribs is positive when extra > 0 and marginal > 15%", () => {
    const r = computeScenario(base);
    expect(r.superContributions.taxSavingOnExtraContribs).toBeGreaterThan(0);
  });
});

describe("computeScenario — investment tax sub-result", () => {
  it("investmentTax.taxOnInvestmentIncome is 0 when all income sources are 0", () => {
    const r = computeScenario({
      currentAge: 40,
      retirementAge: 67,
      annualSalary: 80_000,
      currentSuperBalance: 200_000,
    });
    expect(r.investmentTax.taxOnInvestmentIncome).toBe(0);
  });

  it("investmentTax matches computeInvestmentIncomeTax standalone call", () => {
    const input: ScenarioInput = {
      currentAge: 40,
      retirementAge: 67,
      annualSalary: 80_000,
      currentSuperBalance: 200_000,
      annualInterestIncome: 5_000,
      annualFrankedDividends: 3_000,
      frankingPct: 100,
    };
    const scenario = computeScenario(input);
    const standalone = computeInvestmentIncomeTax({
      otherTaxableIncome: 80_000,
      interest: 5_000,
      frankedDividends: 3_000,
      frankingPct: 100,
      includeMedicare: true,
    });
    expect(scenario.investmentTax.taxOnInvestmentIncome).toBeCloseTo(
      standalone.taxOnInvestmentIncome,
    );
    expect(scenario.investmentTax.netInvestmentIncome).toBeCloseTo(
      standalone.netInvestmentIncome,
    );
    expect(scenario.investmentTax.frankingCredits).toBeCloseTo(
      standalone.frankingCredits,
    );
  });

  it("investmentTax.effectiveRateOnInvestmentIncome is 0 when no cash investment income", () => {
    const r = computeScenario({
      currentAge: 40,
      retirementAge: 67,
      annualSalary: 80_000,
      currentSuperBalance: 200_000,
    });
    expect(r.investmentTax.effectiveRateOnInvestmentIncome).toBe(0);
  });
});

// ─── Composition parity: engine vs standalone calculators ────────────────────

describe("composition parity — engine results match standalone calculators", () => {
  it("super-contributions: engine totalSuperTax matches standalone computeSuperContributions", () => {
    const salary = 90_000;
    const sg = salary * 0.115;
    const extra = 5_000;

    const engineResult = computeScenario({
      currentAge: 35,
      retirementAge: 67,
      annualSalary: salary,
      currentSuperBalance: 150_000,
      employerSgRate: 0.115,
      extraConcessionalContribs: extra,
    });

    const standalone = computeSuperContributions(
      salary,
      sg,
      extra,
      0,
      150_000,
      0,
    );

    expect(engineResult.superContributions.totalSuperTax).toBeCloseTo(
      standalone.totalSuperTax,
    );
    expect(engineResult.superContributions.totalConcessional).toBe(
      standalone.totalConcessional,
    );
  });

  it("CGT: computeCgt discount logic is identical to investment-income-tax CGT path", () => {
    // Both CGT module and investment-income-tax apply 50% discount for held12Months
    const gain = 50_000;
    const mr = 0.37;

    const cgtResult = computeCgt({ gain, marginalRate: mr, held12Months: true });
    // After 50% discount, taxable = 25k; tax at 37% = 9250
    expect(cgtResult.taxWithDiscount).toBeCloseTo(25_000 * 0.37);

    // investment-income-tax: otherTaxableIncome = 0, capitalGain = 50k,
    // eligible for discount → assessable = 25k, tax at 37% bracket
    const iiResult = computeInvestmentIncomeTax({
      otherTaxableIncome: 135_000, // puts bracket at 37%
      capitalGain: gain,
      capitalGainDiscountEligible: true,
      includeMedicare: false,
    });
    // The marginal tax on the 25k assessable gain at the 37% bracket
    expect(iiResult.assessableCapitalGain).toBeCloseTo(25_000);
  });
});

// ─── Edge cases ────────────────────────────────────────────────────────────────

describe("computeScenario — edge cases", () => {
  it("clamps currentAge to [18, 75]", () => {
    const r = computeScenario({
      currentAge: 10,
      retirementAge: 20,
      annualSalary: 50_000,
      currentSuperBalance: 0,
    });
    expect(r.inputs.currentAge).toBe(18);
  });

  it("clamps retirementAge to at least currentAge + 1", () => {
    const r = computeScenario({
      currentAge: 35,
      retirementAge: 30, // below currentAge
      annualSalary: 50_000,
      currentSuperBalance: 0,
    });
    expect(r.inputs.retirementAge).toBeGreaterThan(r.inputs.currentAge);
  });

  it("handles zero salary and zero super balance without throwing", () => {
    expect(() =>
      computeScenario({
        currentAge: 25,
        retirementAge: 60,
        annualSalary: 0,
        currentSuperBalance: 0,
      }),
    ).not.toThrow();
  });

  it("handles very high salary (Div 293 territory)", () => {
    const r = computeScenario({
      currentAge: 40,
      retirementAge: 67,
      annualSalary: 400_000,
      currentSuperBalance: 300_000,
    });
    expect(r.superContributions.isHighEarner).toBe(true);
    expect(r.superContributions.effectiveSuperTaxRate).toBe(0.3);
  });

  it("handles negative-clamped inputs gracefully", () => {
    const r = computeScenario({
      currentAge: 35,
      retirementAge: 67,
      annualSalary: -1000, // clamped to 0
      currentSuperBalance: -500, // clamped to 0
    });
    expect(r.inputs.annualSalary).toBe(0);
    expect(r.inputs.currentSuperBalance).toBe(0);
  });

  it("returns a complete result with non-zero milestone array for long horizon", () => {
    const r = computeScenario({
      currentAge: 25,
      retirementAge: 67,
      annualSalary: 70_000,
      currentSuperBalance: 20_000,
      expectedReturnPct: 7,
    });
    expect(r.retirement.milestones.length).toBeGreaterThan(0);
    expect(r.retirement.projectedSuperAtRetirement).toBeGreaterThan(0);
  });

  it("zero-return scenario: balance grows only by contributions", () => {
    const annual = 10_000; // net contributions per year (ignore super tax for simplicity)
    const start = 100_000;
    const years = 5;

    // Use zero return and zero non-super income to isolate contributions path
    const r = computeScenario({
      currentAge: 60,
      retirementAge: 60 + years,
      annualSalary: 0,
      currentSuperBalance: start,
      extraConcessionalContribs: 0,
      nonConcessionalContribs: annual,
      expectedReturnPct: 0,
      inflationRatePct: 0,
    });
    // With 0% return and pure after-tax NCC: end balance ≈ 100k + 5 × 10k = 150k
    expect(r.retirement.projectedSuperAtRetirement).toBeCloseTo(start + years * annual, -2);
  });
});

// ─── SCENARIO_PLANNER_CALC_KEY ─────────────────────────────────────────────────

describe("SCENARIO_PLANNER_CALC_KEY", () => {
  it("is a non-empty string (used as key in user_calculator_state)", () => {
    expect(typeof SCENARIO_PLANNER_CALC_KEY).toBe("string");
    expect(SCENARIO_PLANNER_CALC_KEY.length).toBeGreaterThan(0);
  });
});
