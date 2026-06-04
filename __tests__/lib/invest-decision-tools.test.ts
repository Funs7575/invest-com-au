import { describe, it, expect } from "vitest";
import {
  afterTaxReturn,
  frankingAdjustedYield,
  firbFeeForListing,
  sivComplianceScore,
  cgtDiscountStatus,
  defaultReturnSplit,
  INVESTMENT_STRUCTURES,
  STRUCTURE_OPTIONS,
} from "@/lib/invest-decision-tools";
import type { InvestmentListing } from "@/lib/types";

function listing(overrides: Record<string, unknown>): InvestmentListing {
  return {
    id: 1,
    vertical: "funds",
    title: "T",
    slug: "t",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  } as unknown as InvestmentListing;
}

describe("afterTaxReturn", () => {
  it("SMSF pension keeps the full gross return (0% tax)", () => {
    const r = afterTaxReturn({ grossReturnPct: 8, structure: "smsf_pension", incomeShare: 0.5 });
    expect(r.afterTaxReturnPct).toBeCloseTo(8, 1);
    expect(r.taxDragPct).toBeCloseTo(0, 1);
    expect(r.effectiveTaxRate).toBeCloseTo(0, 2);
  });

  it("individual top bracket pays more tax than SMSF accumulation", () => {
    const ind = afterTaxReturn({ grossReturnPct: 10, structure: "individual_top", incomeShare: 0.5, heldOver12Months: true });
    const smsf = afterTaxReturn({ grossReturnPct: 10, structure: "smsf_accumulation", incomeShare: 0.5, heldOver12Months: true });
    expect(ind.afterTaxReturnPct).toBeLessThan(smsf.afterTaxReturnPct);
    expect(ind.taxDragPct).toBeGreaterThan(smsf.taxDragPct);
  });

  it("growth-heavy returns are taxed less than income-heavy for individuals (CGT discount)", () => {
    const incomeHeavy = afterTaxReturn({ grossReturnPct: 10, structure: "individual_top", incomeShare: 1, heldOver12Months: true });
    const growthHeavy = afterTaxReturn({ grossReturnPct: 10, structure: "individual_top", incomeShare: 0, heldOver12Months: true });
    expect(growthHeavy.afterTaxReturnPct).toBeGreaterThan(incomeHeavy.afterTaxReturnPct);
  });

  it("companies get no CGT discount — held>12mo and held<12mo are identical on capital", () => {
    const long = afterTaxReturn({ grossReturnPct: 10, structure: "company", incomeShare: 0, heldOver12Months: true });
    const short = afterTaxReturn({ grossReturnPct: 10, structure: "company", incomeShare: 0, heldOver12Months: false });
    expect(long.afterTaxReturnPct).toBeCloseTo(short.afterTaxReturnPct, 2);
    // 30% flat → 7% kept on a 10% pure-growth return
    expect(long.afterTaxReturnPct).toBeCloseTo(7, 1);
  });

  it("undiscounted (held < 12mo) capital is taxed harder than discounted for individuals", () => {
    const long = afterTaxReturn({ grossReturnPct: 10, structure: "individual_top", incomeShare: 0, heldOver12Months: true });
    const short = afterTaxReturn({ grossReturnPct: 10, structure: "individual_top", incomeShare: 0, heldOver12Months: false });
    expect(short.afterTaxReturnPct).toBeLessThan(long.afterTaxReturnPct);
  });

  it("franked income improves the after-tax outcome vs unfranked", () => {
    const franked = afterTaxReturn({ grossReturnPct: 6, structure: "individual_37", incomeShare: 1, frankingPct: 100 });
    const unfranked = afterTaxReturn({ grossReturnPct: 6, structure: "individual_37", incomeShare: 1 });
    expect(franked.afterTaxReturnPct).toBeGreaterThan(unfranked.afterTaxReturnPct);
  });

  it("effectiveTaxRate is 0..1 and afterTax never exceeds gross", () => {
    for (const s of STRUCTURE_OPTIONS) {
      const r = afterTaxReturn({ grossReturnPct: 12, structure: s.key, incomeShare: 0.5 });
      expect(r.effectiveTaxRate).toBeGreaterThanOrEqual(0);
      expect(r.effectiveTaxRate).toBeLessThanOrEqual(1);
      expect(r.afterTaxReturnPct).toBeLessThanOrEqual(r.grossReturnPct + 0.01);
    }
  });
});

describe("frankingAdjustedYield", () => {
  it("grossed-up yield exceeds cash yield for franked dividends", () => {
    const r = frankingAdjustedYield(4.2, 100, 0.45);
    expect(r.grossedUpYieldPct).toBeGreaterThan(r.cashYieldPct);
    // 100% franked: 4.2 / (1-0.3) = 6.0 grossed up
    expect(r.grossedUpYieldPct).toBeCloseTo(6.0, 1);
  });

  it("0% franking leaves cash == grossed-up", () => {
    const r = frankingAdjustedYield(5, 0, 0.45);
    expect(r.grossedUpYieldPct).toBeCloseTo(r.cashYieldPct, 1);
  });

  it("a low marginal rate keeps more net yield than a high one", () => {
    const low = frankingAdjustedYield(5, 100, 0.19);
    const high = frankingAdjustedYield(5, 100, 0.45);
    expect(low.netYieldPct).toBeGreaterThan(high.netYieldPct);
  });
});

describe("firbFeeForListing", () => {
  it("returns a tiered fee for a priced for-sale asset", () => {
    const r = firbFeeForListing(listing({
      vertical: "commercial_property", listing_kind: "for_sale_asset",
      asking_price_cents: 850_000_00, // $850k
    }));
    expect(r.applicable).toBe(true);
    expect(r.valueAud).toBe(850_000);
    expect(r.feeAud).toBeGreaterThan(0);
  });

  it("scales the fee up with value", () => {
    const small = firbFeeForListing(listing({ vertical: "farmland", listing_kind: "for_sale_asset", asking_price_cents: 900_000_00 }));
    const big = firbFeeForListing(listing({ vertical: "farmland", listing_kind: "for_sale_asset", asking_price_cents: 4_000_000_00 }));
    expect(big.feeAud).toBeGreaterThan(small.feeAud);
  });

  it("listed securities and funds are out of FIRB residential/commercial scope", () => {
    const sec = firbFeeForListing(listing({ vertical: "uranium", listing_kind: "listed_security", asking_price_cents: null, key_metrics: { asx_ticker: "PDN" } }));
    const fund = firbFeeForListing(listing({ vertical: "funds", listing_kind: "fund", asking_price_cents: null, key_metrics: { min_investment_aud: 250000 } }));
    expect(sec.applicable).toBe(false);
    expect(fund.applicable).toBe(false);
  });

  it("falls back to min_investment when no asking price", () => {
    const r = firbFeeForListing(listing({
      vertical: "commercial_property", listing_kind: "for_sale_asset",
      asking_price_cents: null, key_metrics: { min_investment_aud: 1_500_000 },
    }));
    expect(r.valueAud).toBe(1_500_000);
    expect(r.applicable).toBe(true);
  });
});

describe("sivComplianceScore", () => {
  it("computes the complying value share by dollar value", () => {
    const r = sivComplianceScore([
      listing({ siv_complying: true, asking_price_cents: 5_000_000_00 }),
      listing({ siv_complying: false, asking_price_cents: 5_000_000_00 }),
    ]);
    expect(r.complyingPct).toBe(50);
    expect(r.complyingCount).toBe(1);
    expect(r.totalCount).toBe(2);
  });

  it("returns 0% for an all-non-complying shortlist", () => {
    const r = sivComplianceScore([listing({ siv_complying: false, asking_price_cents: 100_00 })]);
    expect(r.complyingPct).toBe(0);
  });

  it("handles empty input without dividing by zero", () => {
    const r = sivComplianceScore([]);
    expect(r.complyingPct).toBe(0);
    expect(r.totalValueAud).toBe(0);
  });

  it("uses min_investment when asking price is absent", () => {
    const r = sivComplianceScore([
      listing({ siv_complying: true, asking_price_cents: null, key_metrics: { min_investment_aud: 250_000 } }),
    ]);
    expect(r.complyingValueAud).toBe(250_000);
    expect(r.complyingPct).toBe(100);
  });
});

describe("cgtDiscountStatus", () => {
  it("reports eligible once 12 months have passed", () => {
    const acquired = new Date();
    acquired.setFullYear(acquired.getFullYear() - 2);
    const r = cgtDiscountStatus(acquired.toISOString());
    expect(r.eligible).toBe(true);
    expect(r.daysRemaining).toBe(0);
  });

  it("counts down when within the first 12 months", () => {
    const acquired = new Date();
    acquired.setMonth(acquired.getMonth() - 6);
    const r = cgtDiscountStatus(acquired.toISOString());
    expect(r.eligible).toBe(false);
    expect(r.daysRemaining).toBeGreaterThan(150);
    expect(r.daysRemaining).toBeLessThan(200);
  });

  it("handles a bad date gracefully", () => {
    const r = cgtDiscountStatus("not-a-date");
    expect(r.eligible).toBe(false);
  });
});

describe("defaultReturnSplit + structures", () => {
  it("physical assets are pure capital growth", () => {
    expect(defaultReturnSplit("physical_asset")).toEqual({ income: 0, growth: 1 });
  });
  it("royalties are almost all income", () => {
    expect(defaultReturnSplit("royalty").income).toBeGreaterThan(0.9);
  });
  it("every structure has a sensible income rate (0..0.5)", () => {
    for (const s of STRUCTURE_OPTIONS) {
      expect(s.incomeRate).toBeGreaterThanOrEqual(0);
      expect(s.incomeRate).toBeLessThanOrEqual(0.5);
    }
  });
  it("SMSF pension is the only fully-exempt structure", () => {
    expect(INVESTMENT_STRUCTURES.smsf_pension.incomeRate).toBe(0);
    expect(INVESTMENT_STRUCTURES.smsf_pension.capitalRateDiscounted).toBe(0);
  });
});
