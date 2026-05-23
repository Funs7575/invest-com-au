/**
 * Unit tests for lib/calculators/investment-income-tax.ts
 *
 * References:
 *   ATO "Individual income tax rates" (resident, 2024-25):
 *     https://www.ato.gov.au/tax-rates-and-codes/tax-rates-australian-residents
 *   ATO "Medicare levy" (2% flat):
 *     https://www.ato.gov.au/individuals-and-families/medicare-and-private-health-insurance/medicare-levy
 */
import { describe, it, expect } from "vitest";
import {
  computeInvestmentIncomeTax,
  incomeTaxOnTaxableIncome,
  RESIDENT_TAX_BRACKETS_2024_25,
  CGT_DISCOUNT_INDIVIDUAL,
  MEDICARE_LEVY_RATE,
  CORPORATE_TAX_RATE_DEFAULT,
} from "@/lib/calculators/investment-income-tax";

describe("constants", () => {
  it("CGT individual discount is 50%", () => {
    expect(CGT_DISCOUNT_INDIVIDUAL).toBe(0.5);
  });
  it("Medicare levy is 2%", () => {
    expect(MEDICARE_LEVY_RATE).toBe(0.02);
  });
  it("corporate tax default is 30%", () => {
    expect(CORPORATE_TAX_RATE_DEFAULT).toBe(0.3);
  });
});

describe("incomeTaxOnTaxableIncome — progressive scale (2024-25)", () => {
  it("is $0 in the tax-free threshold", () => {
    expect(incomeTaxOnTaxableIncome(18_200)).toBe(0);
    expect(incomeTaxOnTaxableIncome(0)).toBe(0);
  });

  it("floors negative income to 0", () => {
    expect(incomeTaxOnTaxableIncome(-5_000)).toBe(0);
  });

  it("taxes only the slice above $18,200 at 16%", () => {
    // $30,000 → (30,000 − 18,200) × 0.16 = 1,888
    expect(incomeTaxOnTaxableIncome(30_000)).toBeCloseTo(1_888, 2);
  });

  it("matches the ATO published figure at $45,000", () => {
    // (45,000 − 18,200) × 0.16 = 4,288
    expect(incomeTaxOnTaxableIncome(45_000)).toBeCloseTo(4_288, 2);
  });

  it("matches the ATO published figure at $100,000", () => {
    // 4,288 + (100,000 − 45,000) × 0.30 = 4,288 + 16,500 = 20,788
    expect(incomeTaxOnTaxableIncome(100_000)).toBeCloseTo(20_788, 2);
  });

  it("matches the ATO published figure at $135,000", () => {
    // 4,288 + (135,000 − 45,000) × 0.30 = 4,288 + 27,000 = 31,288
    expect(incomeTaxOnTaxableIncome(135_000)).toBeCloseTo(31_288, 2);
  });

  it("matches the ATO published figure at $190,000", () => {
    // 31,288 + (190,000 − 135,000) × 0.37 = 31,288 + 20,350 = 51,638
    expect(incomeTaxOnTaxableIncome(190_000)).toBeCloseTo(51_638, 2);
  });

  it("taxes the top slice at 45%", () => {
    // 51,638 + (250,000 − 190,000) × 0.45 = 51,638 + 27,000 = 78,638
    expect(incomeTaxOnTaxableIncome(250_000)).toBeCloseTo(78_638, 2);
  });

  it("brackets are contiguous and cover from 0 to Infinity", () => {
    const b = RESIDENT_TAX_BRACKETS_2024_25;
    expect(b[0]?.min).toBe(0);
    expect(b[b.length - 1]?.max).toBe(Infinity);
    for (let i = 1; i < b.length; i++) {
      expect(b[i]?.min).toBe(b[i - 1]?.max);
    }
  });
});

describe("computeInvestmentIncomeTax — interest only", () => {
  it("taxes interest at the marginal bracket on top of salary", () => {
    // Salary $80k, $5k interest → interest sits in the 30% bracket.
    const r = computeInvestmentIncomeTax({
      otherTaxableIncome: 80_000,
      interest: 5_000,
      includeMedicare: false,
    });
    // Marginal tax on the $5k slice = 5,000 × 0.30 = 1,500.
    expect(r.taxOnInvestmentIncome).toBeCloseTo(1_500, 2);
    expect(r.netInvestmentIncome).toBeCloseTo(3_500, 2);
    expect(r.effectiveRateOnInvestmentIncome).toBeCloseTo(30, 4);
  });

  it("adds the 2% Medicare levy when enabled", () => {
    const r = computeInvestmentIncomeTax({
      otherTaxableIncome: 80_000,
      interest: 5_000,
      includeMedicare: true,
    });
    // 5,000 × (0.30 + 0.02) = 1,600.
    expect(r.taxOnInvestmentIncome).toBeCloseTo(1_600, 2);
    expect(r.effectiveRateOnInvestmentIncome).toBeCloseTo(32, 4);
  });

  it("interest in the tax-free threshold is untaxed", () => {
    const r = computeInvestmentIncomeTax({
      otherTaxableIncome: 0,
      interest: 10_000,
      includeMedicare: false,
    });
    expect(r.taxOnInvestmentIncome).toBeCloseTo(0, 2);
    expect(r.netTaxPayable).toBeCloseTo(0, 2);
  });
});

describe("computeInvestmentIncomeTax — capital gains discount", () => {
  it("halves the assessable gain when held > 12 months", () => {
    const r = computeInvestmentIncomeTax({
      otherTaxableIncome: 100_000,
      capitalGain: 20_000,
      capitalGainDiscountEligible: true,
      includeMedicare: false,
    });
    expect(r.assessableCapitalGain).toBeCloseTo(10_000, 2);
    // $10k assessable in the 30% bracket = 3,000.
    expect(r.taxOnInvestmentIncome).toBeCloseTo(3_000, 2);
  });

  it("taxes the full gain when not discount-eligible", () => {
    const r = computeInvestmentIncomeTax({
      otherTaxableIncome: 100_000,
      capitalGain: 20_000,
      capitalGainDiscountEligible: false,
      includeMedicare: false,
    });
    expect(r.assessableCapitalGain).toBeCloseTo(20_000, 2);
    expect(r.taxOnInvestmentIncome).toBeCloseTo(6_000, 2);
  });
});

describe("computeInvestmentIncomeTax — franked dividends", () => {
  it("grosses up a fully franked dividend and applies the refundable offset", () => {
    // $7,000 fully franked → credit = 7,000 × 0.30/0.70 = 3,000; grossed-up = 10,000.
    const r = computeInvestmentIncomeTax({
      otherTaxableIncome: 0,
      frankedDividends: 7_000,
      frankingPct: 100,
      includeMedicare: false,
    });
    expect(r.frankingCredits).toBeCloseTo(3_000, 2);
    // Grossed-up $10k assessable; tax on $10k = 0 (under threshold $18,200).
    // So the $3,000 credit is fully refunded.
    expect(r.totalAssessableIncome).toBeCloseTo(10_000, 2);
    expect(r.incomeTax).toBeCloseTo(0, 2);
    expect(r.refund).toBeCloseTo(3_000, 2);
    expect(r.netTaxPayable).toBeCloseTo(-3_000, 2);
  });

  it("a 30%-bracket investor roughly breaks even on a fully franked dividend", () => {
    // Salary pushes the grossed-up dividend into the 30% bracket, which
    // equals the corporate rate, so tax ≈ franking credit.
    const r = computeInvestmentIncomeTax({
      otherTaxableIncome: 90_000,
      frankedDividends: 7_000,
      frankingPct: 100,
      includeMedicare: false,
    });
    // Grossed-up $10k taxed at 30% = $3,000; credit = $3,000 → net 0.
    expect(r.taxOnInvestmentIncome).toBeCloseTo(0, 2);
  });

  it("partial franking attaches a smaller credit", () => {
    const full = computeInvestmentIncomeTax({ frankedDividends: 7_000, frankingPct: 100 });
    const half = computeInvestmentIncomeTax({ frankedDividends: 7_000, frankingPct: 50 });
    expect(half.frankingCredits).toBeLessThan(full.frankingCredits);
    expect(half.frankingCredits).toBeCloseTo(full.frankingCredits / 2, 2);
  });
});

describe("computeInvestmentIncomeTax — combined streams", () => {
  it("sums interest, dividends and a discounted gain into one bill", () => {
    const r = computeInvestmentIncomeTax({
      otherTaxableIncome: 100_000,
      interest: 2_000,
      unfrankedDividends: 1_000,
      frankedDividends: 7_000,
      frankingPct: 100,
      capitalGain: 20_000,
      capitalGainDiscountEligible: true,
      includeMedicare: true,
    });
    // Assessable investment income = 2,000 + 1,000 + 7,000 + 3,000 (credit)
    //   + 10,000 (discounted gain) = 23,000.
    expect(r.totalAssessableIncome).toBeCloseTo(123_000, 2);
    // All of it sits in the 30% bracket (salary already at 100k, top of
    // bracket is 135k, 100k + 23k = 123k < 135k).
    // Gross marginal tax = 23,000 × (0.30 + 0.02) = 7,360.
    // Less the $3,000 refundable franking credit = 4,360 net.
    expect(r.taxOnInvestmentIncome).toBeCloseTo(4_360, 2);
  });

  it("captures bracket progression when investment income crosses a threshold", () => {
    // Salary $130k (in 30% bracket up to 135k); a $20k gross gain
    // straddles the 135k threshold: 5k @ 30%, 15k @ 37%.
    const r = computeInvestmentIncomeTax({
      otherTaxableIncome: 130_000,
      capitalGain: 20_000,
      capitalGainDiscountEligible: false,
      includeMedicare: false,
    });
    // 5,000 × 0.30 + 15,000 × 0.37 = 1,500 + 5,550 = 7,050.
    expect(r.taxOnInvestmentIncome).toBeCloseTo(7_050, 2);
  });
});

describe("computeInvestmentIncomeTax — boundary / defensive inputs", () => {
  it("returns zeros for an all-empty input", () => {
    const r = computeInvestmentIncomeTax({});
    expect(r.totalAssessableIncome).toBe(0);
    expect(r.netTaxPayable).toBe(0);
    expect(r.taxOnInvestmentIncome).toBe(0);
    expect(r.netInvestmentIncome).toBe(0);
    expect(r.effectiveRateOnInvestmentIncome).toBe(0);
    expect(r.refund).toBe(0);
  });

  it("floors negative inputs to 0", () => {
    const r = computeInvestmentIncomeTax({
      otherTaxableIncome: -50_000,
      interest: -1_000,
      capitalGain: -5_000,
    });
    expect(r.otherTaxableIncome).toBe(0);
    expect(r.interest).toBe(0);
    expect(r.capitalGain).toBe(0);
  });

  it("clamps franking percentage to [0, 100]", () => {
    const over = computeInvestmentIncomeTax({ frankedDividends: 7_000, frankingPct: 250 });
    const at100 = computeInvestmentIncomeTax({ frankedDividends: 7_000, frankingPct: 100 });
    expect(over.frankingCredits).toBeCloseTo(at100.frankingCredits, 6);
  });

  it("supports the base-rate-entity 25% corporate rate", () => {
    // credit = 7,000 × 0.25/0.75 = 2,333.33
    const r = computeInvestmentIncomeTax({
      frankedDividends: 7_000,
      frankingPct: 100,
      corporateTaxRate: 0.25,
    });
    expect(r.frankingCredits).toBeCloseTo(2_333.33, 1);
  });
});
