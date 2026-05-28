import { describe, it, expect } from "vitest";
import { computeScenarioDelta } from "@/lib/scenario-delta";
import type { ScenarioResult } from "@/lib/scenario-engine";

// ── test fixtures ─────────────────────────────────────────────────────────────

function makeScenario(overrides: {
  projectedSuperAtRetirement?: number;
  targetBalance4PctRule?: number;
  gapToTarget?: number;
  drawdownYears?: number;
  yearsToRetirement?: number;
  annualEmployerContrib?: number;
  totalConcessional?: number;
  totalSuperTax?: number;
  taxSavingOnExtraContribs?: number;
  netConcessionalInSuper?: number;
  taxOnInvestmentIncome?: number;
  netInvestmentIncome?: number;
  effectiveRateOnInvestmentIncome?: number;
  hasProperty?: boolean;
  projectedPropertyValue?: number;
  grossGain?: number;
  cgtWithDiscount?: number;
  netEquityAfterCgt?: number;
  estimatedAnnualRentalIncome?: number;
  estimatedAnnualHoldingCosts?: number;
} = {}): ScenarioResult {
  const o = overrides;
  return {
    inputs: {} as ScenarioResult["inputs"],
    retirement: {
      projectedSuperAtRetirement: o.projectedSuperAtRetirement ?? 1_000_000,
      targetBalance4PctRule: o.targetBalance4PctRule ?? 1_250_000,
      gapToTarget: o.gapToTarget ?? -250_000,
      drawdownYears: o.drawdownYears ?? 25,
      yearsToRetirement: o.yearsToRetirement ?? 20,
      annualEmployerContrib: o.annualEmployerContrib ?? 8_000,
    } as ScenarioResult["retirement"],
    superContributions: {
      totalConcessional: o.totalConcessional ?? 27_500,
      totalSuperTax: o.totalSuperTax ?? 4_125,
      taxSavingOnExtraContribs: o.taxSavingOnExtraContribs ?? 2_000,
      netConcessionalInSuper: o.netConcessionalInSuper ?? 23_375,
    } as ScenarioResult["superContributions"],
    investmentTax: {
      taxOnInvestmentIncome: o.taxOnInvestmentIncome ?? 3_000,
      netInvestmentIncome: o.netInvestmentIncome ?? 7_000,
      effectiveRateOnInvestmentIncome: o.effectiveRateOnInvestmentIncome ?? 0.30,
    } as ScenarioResult["investmentTax"],
    property: {
      hasProperty: o.hasProperty ?? false,
      projectedPropertyValue: o.projectedPropertyValue ?? 0,
      grossGain: o.grossGain ?? 0,
      cgt: { taxWithDiscount: o.cgtWithDiscount ?? 0 } as ScenarioResult["property"]["cgt"],
      netEquityAfterCgt: o.netEquityAfterCgt ?? 0,
      estimatedAnnualRentalIncome: o.estimatedAnnualRentalIncome ?? 0,
      estimatedAnnualHoldingCosts: o.estimatedAnnualHoldingCosts ?? 0,
    } as ScenarioResult["property"],
  };
}

// ── computeScenarioDelta ──────────────────────────────────────────────────────

describe("computeScenarioDelta", () => {
  describe("output shape (no property on either side)", () => {
    const a = makeScenario();
    const b = makeScenario();
    const rows = computeScenarioDelta(a, b);

    it("returns an array of DeltaRow objects", () => {
      expect(Array.isArray(rows)).toBe(true);
      expect(rows.length).toBeGreaterThan(0);
    });

    it("omits property rows when neither scenario has a property", () => {
      const propRows = rows.filter((r) => r.category === "property");
      expect(propRows).toHaveLength(0);
    });

    it("includes retirement, super, and investmentTax categories", () => {
      const cats = new Set(rows.map((r) => r.category));
      expect(cats.has("retirement")).toBe(true);
      expect(cats.has("super")).toBe(true);
      expect(cats.has("investmentTax")).toBe(true);
    });
  });

  describe("sizeA indicator", () => {
    it("is 'larger' when A > B", () => {
      const a = makeScenario({ projectedSuperAtRetirement: 1_500_000 });
      const b = makeScenario({ projectedSuperAtRetirement: 1_000_000 });
      const rows = computeScenarioDelta(a, b);
      const row = rows.find((r) => r.metric === "Projected super at retirement")!;
      expect(row.sizeA).toBe("larger");
    });

    it("is 'smaller' when A < B", () => {
      const a = makeScenario({ projectedSuperAtRetirement: 800_000 });
      const b = makeScenario({ projectedSuperAtRetirement: 1_200_000 });
      const rows = computeScenarioDelta(a, b);
      const row = rows.find((r) => r.metric === "Projected super at retirement")!;
      expect(row.sizeA).toBe("smaller");
    });

    it("is 'equal' when A === B", () => {
      const a = makeScenario({ projectedSuperAtRetirement: 1_000_000 });
      const b = makeScenario({ projectedSuperAtRetirement: 1_000_000 });
      const rows = computeScenarioDelta(a, b);
      const row = rows.find((r) => r.metric === "Projected super at retirement")!;
      expect(row.sizeA).toBe("equal");
    });
  });

  describe("absoluteDelta", () => {
    it("is valueA - valueB", () => {
      const a = makeScenario({ netInvestmentIncome: 9_000 });
      const b = makeScenario({ netInvestmentIncome: 7_000 });
      const rows = computeScenarioDelta(a, b);
      const row = rows.find((r) => r.metric === "Net investment income after tax p.a.")!;
      expect(row.absoluteDelta).toBe(2_000);
    });

    it("is negative when A < B", () => {
      const a = makeScenario({ netInvestmentIncome: 5_000 });
      const b = makeScenario({ netInvestmentIncome: 7_000 });
      const rows = computeScenarioDelta(a, b);
      const row = rows.find((r) => r.metric === "Net investment income after tax p.a.")!;
      expect(row.absoluteDelta).toBe(-2_000);
    });
  });

  describe("pctDelta", () => {
    it("is ((A-B)/|B|)*100", () => {
      const a = makeScenario({ totalConcessional: 30_000 });
      const b = makeScenario({ totalConcessional: 27_500 });
      const rows = computeScenarioDelta(a, b);
      const row = rows.find((r) => r.metric === "Total concessional contributions p.a.")!;
      const expected = ((30_000 - 27_500) / 27_500) * 100;
      expect(row.pctDelta).toBeCloseTo(expected, 4);
    });

    it("is null when B is 0 (division by zero guard)", () => {
      const a = makeScenario({ totalConcessional: 5_000 });
      const b = makeScenario({ totalConcessional: 0 });
      const rows = computeScenarioDelta(a, b);
      const row = rows.find((r) => r.metric === "Total concessional contributions p.a.")!;
      expect(row.pctDelta).toBeNull();
    });
  });

  describe("property rows included when either side has a property", () => {
    it("includes property category when A has a property", () => {
      const a = makeScenario({ hasProperty: true, projectedPropertyValue: 1_200_000, grossGain: 400_000 });
      const b = makeScenario({ hasProperty: false });
      const rows = computeScenarioDelta(a, b);
      const propRows = rows.filter((r) => r.category === "property");
      expect(propRows.length).toBeGreaterThan(0);
    });

    it("includes property category when B has a property", () => {
      const a = makeScenario({ hasProperty: false });
      const b = makeScenario({ hasProperty: true, projectedPropertyValue: 900_000, grossGain: 200_000 });
      const rows = computeScenarioDelta(a, b);
      const propRows = rows.filter((r) => r.category === "property");
      expect(propRows.length).toBeGreaterThan(0);
    });
  });

  describe("format fields", () => {
    it("retirement fields use 'currency' or 'years'", () => {
      const rows = computeScenarioDelta(makeScenario(), makeScenario());
      const retRows = rows.filter((r) => r.category === "retirement");
      for (const row of retRows) {
        expect(["currency", "years"]).toContain(row.format);
      }
    });

    it("effectiveRateOnInvestmentIncome uses 'percentage' format", () => {
      const rows = computeScenarioDelta(makeScenario(), makeScenario());
      const rateRow = rows.find((r) => r.metric === "Effective rate on investment income")!;
      expect(rateRow.format).toBe("percentage");
    });
  });

  describe("identical scenarios", () => {
    it("all deltas are zero for identical inputs", () => {
      const s = makeScenario();
      const rows = computeScenarioDelta(s, s);
      for (const row of rows) {
        expect(row.absoluteDelta).toBeCloseTo(0, 5);
        expect(row.sizeA).toBe("equal");
      }
    });
  });
});
