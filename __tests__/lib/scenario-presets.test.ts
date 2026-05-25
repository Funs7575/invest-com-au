/**
 * Tests for scenario-presets registry and scenario-delta calculations.
 *
 * Coverage:
 *   1. Preset integrity — slugs unique, inputs valid, a/b labels distinct.
 *   2. computeScenarioDelta — absolute delta, % delta, size indicators.
 *   3. Neutral framing — "larger/smaller/equal", never "better/worse".
 *   4. computeScenario property/CGT dimension — new 4th engine dimension.
 *   5. Composition parity — property CGT result matches computeCgt standalone.
 *   6. PRESET_SLUGS / getPreset / allPresetMeta helpers.
 */

import { describe, it, expect } from "vitest";

import {
  SCENARIO_PRESETS,
  PRESET_SLUGS,
  getPreset,
  allPresetMeta,
} from "@/lib/scenario-presets";

import { computeScenarioDelta } from "@/lib/scenario-delta";

import { computeScenario, type ScenarioInput } from "@/lib/scenario-engine";

import { computeCgt } from "@/lib/calculators/cgt";

// ─── Preset registry integrity ────────────────────────────────────────────────

describe("SCENARIO_PRESETS — registry integrity", () => {
  it("contains at least 1 preset", () => {
    expect(SCENARIO_PRESETS.length).toBeGreaterThan(0);
  });

  it("all slugs are unique", () => {
    const slugs = SCENARIO_PRESETS.map((p) => p.slug);
    const unique = new Set(slugs);
    expect(unique.size).toBe(slugs.length);
  });

  it("all slugs are non-empty kebab-case strings", () => {
    for (const p of SCENARIO_PRESETS) {
      expect(p.slug).toMatch(/^[a-z][a-z0-9-]+$/);
    }
  });

  it("all presets have non-empty title, summary, a.label, b.label", () => {
    for (const p of SCENARIO_PRESETS) {
      expect(p.title.length).toBeGreaterThan(0);
      expect(p.summary.length).toBeGreaterThan(0);
      expect(p.a.label.length).toBeGreaterThan(0);
      expect(p.b.label.length).toBeGreaterThan(0);
    }
  });

  it("all preset a/b labels are distinct", () => {
    for (const p of SCENARIO_PRESETS) {
      expect(p.a.label).not.toBe(p.b.label);
    }
  });

  it("all preset inputs have required ScenarioInput fields", () => {
    for (const p of SCENARIO_PRESETS) {
      for (const side of [p.a, p.b]) {
        const inp = side.inputs;
        expect(typeof inp.currentAge).toBe("number");
        expect(typeof inp.retirementAge).toBe("number");
        expect(typeof inp.annualSalary).toBe("number");
        expect(typeof inp.currentSuperBalance).toBe("number");
        expect(inp.retirementAge).toBeGreaterThan(inp.currentAge);
      }
    }
  });

  it("all preset inputs produce valid ScenarioResult without throwing", () => {
    for (const p of SCENARIO_PRESETS) {
      expect(() => computeScenario(p.a.inputs)).not.toThrow();
      expect(() => computeScenario(p.b.inputs)).not.toThrow();
    }
  });

  it("all preset results have positive projected super at retirement", () => {
    for (const p of SCENARIO_PRESETS) {
      const ra = computeScenario(p.a.inputs);
      const rb = computeScenario(p.b.inputs);
      expect(ra.retirement.projectedSuperAtRetirement).toBeGreaterThan(0);
      expect(rb.retirement.projectedSuperAtRetirement).toBeGreaterThan(0);
    }
  });

  it("highlights is a non-empty array for every preset", () => {
    for (const p of SCENARIO_PRESETS) {
      expect(Array.isArray(p.highlights)).toBe(true);
      expect(p.highlights.length).toBeGreaterThan(0);
    }
  });
});

// ─── PRESET_SLUGS helper ─────────────────────────────────────────────────────

describe("PRESET_SLUGS", () => {
  it("contains the same slugs as SCENARIO_PRESETS in the same order", () => {
    expect(PRESET_SLUGS).toEqual(SCENARIO_PRESETS.map((p) => p.slug));
  });
});

// ─── getPreset helper ────────────────────────────────────────────────────────

describe("getPreset", () => {
  it("returns the correct preset for a known slug", () => {
    const first = SCENARIO_PRESETS[0];
    if (!first) return;
    const found = getPreset(first.slug);
    expect(found).toBeDefined();
    expect(found?.slug).toBe(first.slug);
    expect(found?.title).toBe(first.title);
  });

  it("returns undefined for an unknown slug", () => {
    expect(getPreset("this-slug-does-not-exist")).toBeUndefined();
  });

  it("returns undefined for empty string", () => {
    expect(getPreset("")).toBeUndefined();
  });
});

// ─── allPresetMeta helper ─────────────────────────────────────────────────────

describe("allPresetMeta", () => {
  it("returns an array the same length as SCENARIO_PRESETS", () => {
    expect(allPresetMeta()).toHaveLength(SCENARIO_PRESETS.length);
  });

  it("each entry has slug, title, summary", () => {
    for (const m of allPresetMeta()) {
      expect(typeof m.slug).toBe("string");
      expect(typeof m.title).toBe("string");
      expect(typeof m.summary).toBe("string");
    }
  });

  it("does not include inputs (only meta fields)", () => {
    for (const m of allPresetMeta()) {
      expect((m as Record<string, unknown>)["a"]).toBeUndefined();
      expect((m as Record<string, unknown>)["b"]).toBeUndefined();
    }
  });
});

// ─── computeScenarioDelta — delta math ───────────────────────────────────────

describe("computeScenarioDelta — delta math", () => {
  const baseInput: ScenarioInput = {
    currentAge: 35,
    retirementAge: 67,
    annualSalary: 100_000,
    currentSuperBalance: 150_000,
    extraConcessionalContribs: 0,
    expectedReturnPct: 7,
  };

  const highSacrificeInput: ScenarioInput = {
    ...baseInput,
    extraConcessionalContribs: 18_500,
  };

  it("returns an array of delta rows", () => {
    const rA = computeScenario(highSacrificeInput);
    const rB = computeScenario(baseInput);
    const deltas = computeScenarioDelta(rA, rB);
    expect(Array.isArray(deltas)).toBe(true);
    expect(deltas.length).toBeGreaterThan(0);
  });

  it("absoluteDelta = valueA − valueB for each row", () => {
    const rA = computeScenario(highSacrificeInput);
    const rB = computeScenario(baseInput);
    const deltas = computeScenarioDelta(rA, rB);
    for (const d of deltas) {
      expect(d.absoluteDelta).toBeCloseTo(d.valueA - d.valueB, 5);
    }
  });

  it("pctDelta = (A − B) / |B| × 100 when B ≠ 0", () => {
    const rA = computeScenario(highSacrificeInput);
    const rB = computeScenario(baseInput);
    const deltas = computeScenarioDelta(rA, rB);
    for (const d of deltas) {
      if (d.valueB !== 0 && d.pctDelta !== null) {
        expect(d.pctDelta).toBeCloseTo(
          ((d.valueA - d.valueB) / Math.abs(d.valueB)) * 100,
          5,
        );
      }
    }
  });

  it("pctDelta is null when valueB is 0", () => {
    const rA = computeScenario(baseInput);
    const rB = computeScenario(baseInput);
    // Both identical → some rows will have 0 delta but not necessarily 0 valueB.
    // Force a case with valueB = 0: no investment income.
    const deltas = computeScenarioDelta(rA, rB);
    const zeroValueBRows = deltas.filter((d) => d.valueB === 0);
    for (const d of zeroValueBRows) {
      expect(d.pctDelta).toBeNull();
    }
  });

  it("sizeA is 'larger' when valueA > valueB", () => {
    const rA = computeScenario(highSacrificeInput);
    const rB = computeScenario(baseInput);
    const deltas = computeScenarioDelta(rA, rB);
    const superRow = deltas.find((d) => d.metric === "Projected super at retirement");
    expect(superRow).toBeDefined();
    // High sacrifice → larger projected super
    expect(superRow?.sizeA).toBe("larger");
  });

  it("sizeA is 'smaller' when valueA < valueB", () => {
    const rA = computeScenario(baseInput);
    const rB = computeScenario(highSacrificeInput);
    const deltas = computeScenarioDelta(rA, rB);
    const superRow = deltas.find((d) => d.metric === "Projected super at retirement");
    expect(superRow).toBeDefined();
    expect(superRow?.sizeA).toBe("smaller");
  });

  it("sizeA is 'equal' when A and B are identical", () => {
    const r = computeScenario(baseInput);
    const deltas = computeScenarioDelta(r, r);
    for (const d of deltas) {
      // All deltas should be 0 / equal when comparing a scenario to itself
      expect(d.sizeA).toBe("equal");
      expect(d.absoluteDelta).toBeCloseTo(0, 5);
    }
  });

  it("every DeltaRow has all required fields", () => {
    const rA = computeScenario(highSacrificeInput);
    const rB = computeScenario(baseInput);
    const deltas = computeScenarioDelta(rA, rB);
    for (const d of deltas) {
      expect(typeof d.metric).toBe("string");
      expect(d.metric.length).toBeGreaterThan(0);
      expect(["retirement", "super", "investmentTax", "property"]).toContain(d.category);
      expect(typeof d.valueA).toBe("number");
      expect(typeof d.valueB).toBe("number");
      expect(typeof d.absoluteDelta).toBe("number");
      expect(["currency", "years", "percentage", "boolean"]).toContain(d.format);
      expect(["larger", "smaller", "equal"]).toContain(d.sizeA);
    }
  });

  it("includes retirement, super, and investmentTax categories by default", () => {
    const r = computeScenario(baseInput);
    const deltas = computeScenarioDelta(r, r);
    const cats = new Set(deltas.map((d) => d.category));
    expect(cats.has("retirement")).toBe(true);
    expect(cats.has("super")).toBe(true);
    expect(cats.has("investmentTax")).toBe(true);
  });

  it("does NOT include property category when neither side has a property", () => {
    const r = computeScenario(baseInput);
    const deltas = computeScenarioDelta(r, r);
    const propRows = deltas.filter((d) => d.category === "property");
    expect(propRows).toHaveLength(0);
  });

  it("includes property category when side A has a property", () => {
    const rA = computeScenario({ ...baseInput, propertyPurchasePrice: 800_000 });
    const rB = computeScenario(baseInput);
    const deltas = computeScenarioDelta(rA, rB);
    const propRows = deltas.filter((d) => d.category === "property");
    expect(propRows.length).toBeGreaterThan(0);
  });
});

// ─── computeScenario — property/CGT dimension ────────────────────────────────

describe("computeScenario — property/CGT dimension", () => {
  const baseInput: ScenarioInput = {
    currentAge: 35,
    retirementAge: 67,
    annualSalary: 100_000,
    currentSuperBalance: 150_000,
  };

  it("property.hasProperty is false when no propertyPurchasePrice provided", () => {
    const r = computeScenario(baseInput);
    expect(r.property.hasProperty).toBe(false);
    expect(r.property.purchasePrice).toBe(0);
    expect(r.property.projectedPropertyValue).toBe(0);
    expect(r.property.grossGain).toBe(0);
  });

  it("property.hasProperty is false when propertyPurchasePrice is 0", () => {
    const r = computeScenario({ ...baseInput, propertyPurchasePrice: 0 });
    expect(r.property.hasProperty).toBe(false);
  });

  it("property.hasProperty is true when propertyPurchasePrice > 0", () => {
    const r = computeScenario({ ...baseInput, propertyPurchasePrice: 500_000 });
    expect(r.property.hasProperty).toBe(true);
    expect(r.property.purchasePrice).toBe(500_000);
  });

  it("projectedPropertyValue grows by compound growth over years to retirement", () => {
    const purchase = 600_000;
    const growthPct = 4;
    const years = 67 - 35; // 32 years
    const expected = purchase * Math.pow(1 + growthPct / 100, years);

    const r = computeScenario({
      ...baseInput,
      propertyPurchasePrice: purchase,
      propertyGrowthRatePct: growthPct,
    });

    expect(r.property.projectedPropertyValue).toBeCloseTo(expected, -2);
  });

  it("grossGain = projectedPropertyValue − purchasePrice", () => {
    const r = computeScenario({ ...baseInput, propertyPurchasePrice: 700_000 });
    expect(r.property.grossGain).toBeCloseTo(
      r.property.projectedPropertyValue - r.property.purchasePrice,
      5,
    );
  });

  it("grossGain is 0 when growth rate is 0", () => {
    const r = computeScenario({
      ...baseInput,
      propertyPurchasePrice: 500_000,
      propertyGrowthRatePct: 0,
    });
    expect(r.property.grossGain).toBeCloseTo(0, 5);
  });

  it("netEquityAfterCgt = projectedPropertyValue − cgt.taxWithDiscount", () => {
    const r = computeScenario({ ...baseInput, propertyPurchasePrice: 800_000 });
    expect(r.property.netEquityAfterCgt).toBeCloseTo(
      r.property.projectedPropertyValue - r.property.cgt.taxWithDiscount,
      5,
    );
  });

  it("estimatedAnnualRentalIncome = purchasePrice × rentalYieldPct / 100", () => {
    const r = computeScenario({
      ...baseInput,
      propertyPurchasePrice: 600_000,
      propertyRentalYieldPct: 3.5,
    });
    expect(r.property.estimatedAnnualRentalIncome).toBeCloseTo(600_000 * 0.035, 2);
  });

  it("estimatedAnnualHoldingCosts = purchasePrice × holdingCostsPct / 100", () => {
    const r = computeScenario({
      ...baseInput,
      propertyPurchasePrice: 600_000,
      propertyHoldingCostsPct: 2,
    });
    expect(r.property.estimatedAnnualHoldingCosts).toBeCloseTo(600_000 * 0.02, 2);
  });

  it("defaults growthRatePct to 4 when propertyPurchasePrice > 0 and not specified", () => {
    const r = computeScenario({ ...baseInput, propertyPurchasePrice: 500_000 });
    expect(r.property.growthRatePct).toBe(4);
  });

  it("defaults growthRatePct to 0 when propertyPurchasePrice is 0", () => {
    const r = computeScenario(baseInput);
    expect(r.property.growthRatePct).toBe(0);
  });
});

// ─── Composition parity: property CGT = standalone computeCgt ────────────────

describe("composition parity — property CGT matches computeCgt standalone", () => {
  it("engine cgt.taxWithDiscount matches standalone computeCgt for the same gain and marginal rate", () => {
    const purchase = 700_000;
    const growthPct = 4;
    const years = 67 - 35;
    const salary = 100_000;

    const r = computeScenario({
      currentAge: 35,
      retirementAge: 67,
      annualSalary: salary,
      currentSuperBalance: 150_000,
      propertyPurchasePrice: purchase,
      propertyGrowthRatePct: growthPct,
      propertyHeld12Months: true,
    });

    const projectedValue = purchase * Math.pow(1 + growthPct / 100, years);
    const grossGain = projectedValue - purchase;

    // Marginal rate at $100k salary using marginalRateIncludingMedicare logic:
    // $100k is in the $45k–$120k bracket → 32.5% + 2% Medicare = 34.5%
    const marginalRate = 0.345;

    const standalone = computeCgt({
      gain: grossGain,
      marginalRate,
      held12Months: true,
      holder: "individual",
    });

    expect(r.property.cgt.taxWithDiscount).toBeCloseTo(standalone.taxWithDiscount, 0);
    expect(r.property.cgt.discountedGain).toBeCloseTo(standalone.discountedGain, 0);
    expect(r.property.cgt.taxSaved).toBeCloseTo(standalone.taxSaved, 0);
  });

  it("taxWithDiscount < taxWithoutDiscount when held12Months = true", () => {
    const r = computeScenario({
      currentAge: 35,
      retirementAge: 67,
      annualSalary: 100_000,
      currentSuperBalance: 150_000,
      propertyPurchasePrice: 800_000,
      propertyHeld12Months: true,
    });
    expect(r.property.cgt.taxWithDiscount).toBeLessThan(
      r.property.cgt.taxWithoutDiscount,
    );
  });

  it("taxWithDiscount equals taxWithoutDiscount when held12Months = false", () => {
    const r = computeScenario({
      currentAge: 35,
      retirementAge: 67,
      annualSalary: 100_000,
      currentSuperBalance: 150_000,
      propertyPurchasePrice: 800_000,
      propertyHeld12Months: false,
    });
    expect(r.property.cgt.taxWithDiscount).toBeCloseTo(
      r.property.cgt.taxWithoutDiscount,
      5,
    );
  });

  it("prior engine outputs are unchanged by adding property inputs", () => {
    const base: ScenarioInput = {
      currentAge: 35,
      retirementAge: 67,
      annualSalary: 100_000,
      currentSuperBalance: 150_000,
    };
    const withProp: ScenarioInput = { ...base, propertyPurchasePrice: 600_000 };

    const rBase = computeScenario(base);
    const rWith = computeScenario(withProp);

    // Property input must not affect retirement, super, or investmentTax
    expect(rWith.retirement.projectedSuperAtRetirement).toBeCloseTo(
      rBase.retirement.projectedSuperAtRetirement,
      5,
    );
    expect(rWith.superContributions.totalSuperTax).toBeCloseTo(
      rBase.superContributions.totalSuperTax,
      5,
    );
    expect(rWith.investmentTax.taxOnInvestmentIncome).toBeCloseTo(
      rBase.investmentTax.taxOnInvestmentIncome,
      5,
    );
  });
});

// ─── Preset: salary-sacrifice-vs-etf specific checks ─────────────────────────

describe("preset: salary-sacrifice-vs-etf", () => {
  it("exists in the registry", () => {
    expect(getPreset("salary-sacrifice-vs-etf")).toBeDefined();
  });

  it("scenario A (salary sacrifice) has higher projected super than scenario B", () => {
    const p = getPreset("salary-sacrifice-vs-etf");
    if (!p) return;
    const rA = computeScenario(p.a.inputs);
    const rB = computeScenario(p.b.inputs);
    // Salary sacrifice grows super faster — A should project higher super
    expect(rA.retirement.projectedSuperAtRetirement).toBeGreaterThan(
      rB.retirement.projectedSuperAtRetirement,
    );
  });

  it("scenario A has a positive tax saving on extra contribs", () => {
    const p = getPreset("salary-sacrifice-vs-etf");
    if (!p) return;
    const rA = computeScenario(p.a.inputs);
    expect(rA.superContributions.taxSavingOnExtraContribs).toBeGreaterThan(0);
  });

  it("scenario B has positive investment tax (due to franked dividends)", () => {
    const p = getPreset("salary-sacrifice-vs-etf");
    if (!p) return;
    const rB = computeScenario(p.b.inputs);
    expect(rB.investmentTax.taxOnInvestmentIncome).toBeGreaterThan(0);
  });
});

// ─── Preset: max-concessional-vs-moderate specific checks ────────────────────

describe("preset: max-concessional-vs-moderate", () => {
  it("exists in the registry", () => {
    expect(getPreset("max-concessional-vs-moderate")).toBeDefined();
  });

  it("scenario A (max sacrifice) has higher projected super", () => {
    const p = getPreset("max-concessional-vs-moderate");
    if (!p) return;
    const rA = computeScenario(p.a.inputs);
    const rB = computeScenario(p.b.inputs);
    expect(rA.retirement.projectedSuperAtRetirement).toBeGreaterThan(
      rB.retirement.projectedSuperAtRetirement,
    );
  });

  it("scenario A tax saving is greater than scenario B tax saving", () => {
    const p = getPreset("max-concessional-vs-moderate");
    if (!p) return;
    const rA = computeScenario(p.a.inputs);
    const rB = computeScenario(p.b.inputs);
    expect(rA.superContributions.taxSavingOnExtraContribs).toBeGreaterThan(
      rB.superContributions.taxSavingOnExtraContribs,
    );
  });
});

// ─── Preset: early-retirement-vs-standard specific checks ────────────────────

describe("preset: early-retirement-vs-standard", () => {
  it("exists in the registry", () => {
    expect(getPreset("early-retirement-vs-standard")).toBeDefined();
  });

  it("standard retirement (B) projects larger super than early (A)", () => {
    const p = getPreset("early-retirement-vs-standard");
    if (!p) return;
    const rA = computeScenario(p.a.inputs);
    const rB = computeScenario(p.b.inputs);
    // B has 7 more years of accumulation → larger super
    expect(rB.retirement.projectedSuperAtRetirement).toBeGreaterThan(
      rA.retirement.projectedSuperAtRetirement,
    );
  });

  it("both yearsToRetirement values differ by 7", () => {
    const p = getPreset("early-retirement-vs-standard");
    if (!p) return;
    const rA = computeScenario(p.a.inputs);
    const rB = computeScenario(p.b.inputs);
    expect(rB.retirement.yearsToRetirement - rA.retirement.yearsToRetirement).toBe(7);
  });
});

// ─── Preset: smsf-vs-industry-super specific checks ─────────────────────────

describe("preset: smsf-vs-industry-super", () => {
  it("exists in the registry", () => {
    expect(getPreset("smsf-vs-industry-super")).toBeDefined();
  });

  it("industry super (B, higher effective return) projects larger super", () => {
    const p = getPreset("smsf-vs-industry-super");
    if (!p) return;
    const rA = computeScenario(p.a.inputs);
    const rB = computeScenario(p.b.inputs);
    // B has a higher effective return rate → larger projected super
    expect(rB.retirement.projectedSuperAtRetirement).toBeGreaterThan(
      rA.retirement.projectedSuperAtRetirement,
    );
  });
});
