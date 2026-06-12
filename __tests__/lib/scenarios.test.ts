import { describe, it, expect } from "vitest";
import {
  newScenarioShareToken,
  calculatorMetaFor,
  openInCalculatorHref,
  toOwnerView,
  CALCULATOR_REGISTRY,
  MAX_SCENARIOS_PER_USER,
  SCENARIO_NAME_MAX,
  type ScenarioRow,
} from "@/lib/scenarios";

describe("newScenarioShareToken", () => {
  it("produces a 48-char hex token (192 bits)", () => {
    const t = newScenarioShareToken();
    expect(t).toMatch(/^[0-9a-f]{48}$/);
  });

  it("is unique across calls", () => {
    const tokens = new Set(Array.from({ length: 200 }, newScenarioShareToken));
    expect(tokens.size).toBe(200);
  });
});

describe("calculatorMetaFor", () => {
  it("returns the registry entry for a known key", () => {
    const meta = calculatorMetaFor("mortgage_calculator");
    expect(meta.label).toBe("Mortgage Calculator");
    expect(meta.href).toBe("/mortgage-calculator");
    expect(meta.icon).toBeTruthy();
  });

  it("falls back gracefully for an unknown key (humanised label, /calculators href)", () => {
    const meta = calculatorMetaFor("some_new_calculator");
    expect(meta.label).toBe("Some New Calculator");
    expect(meta.href).toBe("/calculators");
    expect(meta.icon).toBe("calculator");
    expect(meta.key).toBe("some_new_calculator");
  });

  it("registry keys match their own `key` field", () => {
    for (const [k, meta] of Object.entries(CALCULATOR_REGISTRY)) {
      expect(meta.key).toBe(k);
    }
  });
});

describe("openInCalculatorHref", () => {
  it("encodes scalar inputs with the <key>_<field> prefix the hook reads", () => {
    const href = openInCalculatorHref("super_contributions_calculator", {
      income: 90000,
      extra_concessional: 5000,
    });
    expect(href).toContain("/super-contributions-calculator?");
    expect(href).toContain("super_contributions_calculator_income=90000");
    expect(href).toContain("super_contributions_calculator_extra_concessional=5000");
  });

  it("skips nested objects, nullish, and empty values", () => {
    const href = openInCalculatorHref("mortgage_calculator", {
      loan: 500000,
      nested: { a: 1 },
      empty: "",
      missing: null,
      undef: undefined,
    });
    expect(href).toContain("mortgage_calculator_loan=500000");
    expect(href).not.toContain("nested");
    expect(href).not.toContain("empty");
    expect(href).not.toContain("missing");
    expect(href).not.toContain("undef");
  });

  it("returns the bare href when there are no encodable inputs", () => {
    expect(openInCalculatorHref("mortgage_calculator", {})).toBe(
      "/mortgage-calculator",
    );
  });

  it("uses the /calculators fallback href for unknown keys", () => {
    const href = openInCalculatorHref("unknown_calc", { x: 1 });
    expect(href).toContain("/calculators?");
    expect(href).toContain("unknown_calc_x=1");
  });
});

describe("toOwnerView", () => {
  it("strips user_id, keeping every other column", () => {
    const row: ScenarioRow = {
      id: "11111111-1111-1111-1111-111111111111",
      user_id: "secret-user-uuid",
      calculator_key: "mortgage_calculator",
      name: "If we refinance",
      inputs: { loan: 500000 },
      results_snapshot: { repayment: 2500 },
      share_token: null,
      created_at: "2026-06-12T00:00:00.000Z",
      updated_at: "2026-06-12T00:00:00.000Z",
    };
    const view = toOwnerView(row);
    expect("user_id" in view).toBe(false);
    expect(view.name).toBe("If we refinance");
    expect(view.calculator_key).toBe("mortgage_calculator");
    expect(view.inputs).toEqual({ loan: 500000 });
  });
});

describe("constants", () => {
  it("cap and name-length match the brief", () => {
    expect(MAX_SCENARIOS_PER_USER).toBe(50);
    expect(SCENARIO_NAME_MAX).toBe(80);
  });
});
