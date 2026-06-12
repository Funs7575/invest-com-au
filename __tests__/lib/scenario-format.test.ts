import { describe, it, expect } from "vitest";
import {
  humaniseFieldKey,
  formatScenarioValue,
  scenarioFields,
} from "@/lib/scenario-format";

describe("humaniseFieldKey", () => {
  it("splits snake_case", () => {
    expect(humaniseFieldKey("current_super_balance")).toBe(
      "Current super balance",
    );
  });
  it("splits camelCase", () => {
    expect(humaniseFieldKey("currentSuperBalance")).toBe(
      "Current super balance",
    );
  });
  it("handles single words", () => {
    expect(humaniseFieldKey("income")).toBe("Income");
  });
});

describe("formatScenarioValue", () => {
  it("renders money-ish keys as AUD currency", () => {
    expect(formatScenarioValue("super_balance", 150000)).toContain("$150,000");
    expect(formatScenarioValue("annualSalary", 90000)).toContain("$90,000");
  });

  it("renders rate/pct keys with a trailing %", () => {
    expect(formatScenarioValue("expectedReturnPct", 7)).toBe("7%");
    expect(formatScenarioValue("franking_pct", 100)).toBe("100%");
  });

  it("renders booleans as Yes/No", () => {
    expect(formatScenarioValue("capitalGainDiscountEligible", true)).toBe("Yes");
    expect(formatScenarioValue("held12Months", false)).toBe("No");
  });

  it("renders plain numbers verbatim", () => {
    expect(formatScenarioValue("currentAge", 35)).toBe("35");
  });

  it("renders an em dash for nullish/empty", () => {
    expect(formatScenarioValue("x", null)).toBe("—");
    expect(formatScenarioValue("x", undefined)).toBe("—");
    expect(formatScenarioValue("x", "")).toBe("—");
  });

  it("prefers money over pct when a key matches both (e.g. *rate* + *fee*)", () => {
    // 'fee' triggers money; rate triggers pct — money wins by design.
    expect(formatScenarioValue("fee_rate", 1200)).toContain("$1,200");
  });
});

describe("scenarioFields", () => {
  it("flattens scalars into label/display fields, skipping objects/arrays", () => {
    const fields = scenarioFields({
      income: 90000,
      nested: { a: 1 },
      list: [1, 2],
      currentAge: 35,
    });
    const keys = fields.map((f) => f.key);
    expect(keys).toContain("income");
    expect(keys).toContain("currentAge");
    expect(keys).not.toContain("nested");
    expect(keys).not.toContain("list");
  });

  it("returns [] for null/undefined", () => {
    expect(scenarioFields(null)).toEqual([]);
    expect(scenarioFields(undefined)).toEqual([]);
  });

  it("caps the number of fields", () => {
    const big: Record<string, number> = {};
    for (let i = 0; i < 100; i++) big[`f${i}`] = i;
    expect(scenarioFields(big, 10)).toHaveLength(10);
  });
});
