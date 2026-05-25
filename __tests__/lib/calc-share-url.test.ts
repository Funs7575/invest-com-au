/**
 * Unit tests for calculator URL-state encode/decode helpers.
 *
 * Covers:
 *   - serializeToUrlParams: data → URLSearchParams with `<key>_` prefix
 *   - parseFromUrlParams: URLSearchParams → data object (strips prefix)
 *   - buildShareableUrl: constructs deep links from base path + key + data
 *   - Round-trip fidelity for all 6 calculator data shapes
 */
import { describe, it, expect } from "vitest";
import {
  serializeToUrlParams,
  parseFromUrlParams,
} from "@/lib/calculator-state";
import { buildShareableUrl } from "@/hooks/use-calculator-state";

describe("serializeToUrlParams", () => {
  it("prefixes each key with the calculator key and underscore", () => {
    const sp = serializeToUrlParams("mortgage_calculator", { loan_amount: 600000, interest_rate: 6 });
    expect(sp.get("mortgage_calculator_loan_amount")).toBe("600000");
    expect(sp.get("mortgage_calculator_interest_rate")).toBe("6");
  });

  it("omits undefined, null, and empty string values", () => {
    const sp = serializeToUrlParams("calc", { a: 1, b: undefined, c: null, d: "" });
    expect(sp.get("calc_a")).toBe("1");
    expect(sp.has("calc_b")).toBe(false);
    expect(sp.has("calc_c")).toBe(false);
    expect(sp.has("calc_d")).toBe(false);
  });

  it("converts numbers to strings", () => {
    const sp = serializeToUrlParams("savings_calculator", { balance: 25000, current_rate: 4.5 });
    expect(sp.get("savings_calculator_balance")).toBe("25000");
    expect(sp.get("savings_calculator_current_rate")).toBe("4.5");
  });

  it("converts booleans to strings", () => {
    const sp = serializeToUrlParams("cgt", { cg_12m: true });
    expect(sp.get("cgt_cg_12m")).toBe("true");
  });

  it("returns an empty URLSearchParams for an empty data object", () => {
    const sp = serializeToUrlParams("calc", {});
    expect(sp.toString()).toBe("");
  });
});

describe("parseFromUrlParams", () => {
  it("returns only the fields matching the calculator key prefix", () => {
    const sp = new URLSearchParams("mortgage_calculator_loan_amount=600000&savings_calculator_balance=10000");
    const result = parseFromUrlParams("mortgage_calculator", sp);
    expect(result).toHaveProperty("loan_amount", "600000");
    expect(result).not.toHaveProperty("balance");
  });

  it("strips the calculator key prefix from the returned field names", () => {
    const sp = new URLSearchParams("savings_calculator_balance=25000&savings_calculator_current_rate=4.5");
    const result = parseFromUrlParams("savings_calculator", sp);
    expect(result).toEqual({ balance: "25000", current_rate: "4.5" });
  });

  it("returns an empty object when no matching params exist", () => {
    const sp = new URLSearchParams("unrelated_param=value");
    const result = parseFromUrlParams("retirement_calculator", sp);
    expect(Object.keys(result)).toHaveLength(0);
  });

  it("handles multiple fields for the retirement calculator (9 params)", () => {
    const sp = new URLSearchParams(
      "retirement_calculator_current_age=35" +
      "&retirement_calculator_retirement_age=67" +
      "&retirement_calculator_current_super=150000" +
      "&retirement_calculator_annual_salary=100000" +
      "&retirement_calculator_employer_rate=12" +
      "&retirement_calculator_additional_contributions=0" +
      "&retirement_calculator_expected_return=7" +
      "&retirement_calculator_inflation_rate=3" +
      "&retirement_calculator_desired_income=60000"
    );
    const result = parseFromUrlParams("retirement_calculator", sp);
    expect(Object.keys(result)).toHaveLength(9);
    expect(result["current_age"]).toBe("35");
    expect(result["desired_income"]).toBe("60000");
  });
});

describe("serializeToUrlParams + parseFromUrlParams round-trip", () => {
  it("round-trips retirement calculator data (9 fields)", () => {
    const original = {
      current_age: 35,
      retirement_age: 67,
      current_super: 150000,
      annual_salary: 100000,
      employer_rate: 12,
      additional_contributions: 0,
      expected_return: 7,
      inflation_rate: 3,
      desired_income: 60000,
    };
    const sp = serializeToUrlParams("retirement_calculator", original);
    const decoded = parseFromUrlParams("retirement_calculator", sp);
    // Values come back as strings — compare string-coerced originals.
    for (const [k, v] of Object.entries(original)) {
      expect(decoded[k]).toBe(String(v));
    }
  });

  it("round-trips compound-interest calculator data (5 fields)", () => {
    const original = { principal: 10000, rate: 7, years: 20, monthly: 200, freq: 12 };
    const sp = serializeToUrlParams("compound_interest_calculator", original);
    const decoded = parseFromUrlParams("compound_interest_calculator", sp);
    for (const [k, v] of Object.entries(original)) {
      expect(decoded[k]).toBe(String(v));
    }
  });

  it("round-trips mortgage calculator including string enum repayment_type", () => {
    const original = { loan_amount: 600000, interest_rate: 6.0, loan_term: 30, repayment_type: "pi" };
    const sp = serializeToUrlParams("mortgage_calculator", original);
    const decoded = parseFromUrlParams("mortgage_calculator", sp);
    expect(decoded["repayment_type"]).toBe("pi");
    expect(decoded["loan_term"]).toBe("30");
  });

  it("round-trips super contributions calculator data (6 fields)", () => {
    const original = {
      income: 90000,
      current_concessional: 12000,
      extra_concessional: 5000,
      non_concessional: 0,
      super_balance: 150000,
      unused_carry_forward: 0,
    };
    const sp = serializeToUrlParams("super_contributions_calculator", original);
    const decoded = parseFromUrlParams("super_contributions_calculator", sp);
    for (const [k, v] of Object.entries(original)) {
      if (v !== 0) {
        expect(decoded[k]).toBe(String(v));
      } else {
        // zero values should be serialized
        expect(decoded[k]).toBe("0");
      }
    }
  });

  it("CGT short-key pattern round-trips (cg_amt, cg_mr, cg_12m)", () => {
    const original = { cg_amt: "50000", cg_mr: "32.5", cg_12m: "1" };
    const sp = serializeToUrlParams("cgt", original);
    const decoded = parseFromUrlParams("cgt", sp);
    expect(decoded["cg_amt"]).toBe("50000");
    expect(decoded["cg_mr"]).toBe("32.5");
    expect(decoded["cg_12m"]).toBe("1");
  });
});

describe("buildShareableUrl", () => {
  it("appends serialized params to the base URL", () => {
    const url = buildShareableUrl("/mortgage-calculator", "mortgage_calculator", { loan_amount: 600000 });
    expect(url).toContain("/mortgage-calculator?");
    expect(url).toContain("mortgage_calculator_loan_amount=600000");
  });

  it("returns just the base URL when all values are empty/undefined", () => {
    const url = buildShareableUrl("/calculator", "calc", { a: undefined, b: null, c: "" } as Record<string, unknown>);
    expect(url).toBe("/calculator");
  });

  it("correctly encodes multiple params", () => {
    const url = buildShareableUrl("/savings-calculator", "savings_calculator", { balance: 25000, current_rate: 4.5 });
    expect(url).toContain("savings_calculator_balance=25000");
    expect(url).toContain("savings_calculator_current_rate=4.5");
  });

  it("handles a path with a trailing slash", () => {
    const url = buildShareableUrl("/retirement-calculator/", "retirement_calculator", { current_age: 40 });
    expect(url).toContain("retirement_calculator_current_age=40");
  });
});
