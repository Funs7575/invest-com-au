import { describe, it, expect } from "vitest";
import {
  CONTEXT_CONFIG,
  NOT_SURE_ID,
  toggleContextSelection,
  budgetLabelForIntent,
  TIMELINE_OPTIONS,
  timelineContextId,
  OVERSEAS_COUNTRY_OPTIONS,
  overseasSpecialtyFor,
  isOverseasCorridor,
  overseasCountryName,
  overseasCountryIso,
  intentToNeed,
  NEED_TO_INTENT,
  isPlausiblePhone,
  type Intent,
} from "@/lib/find-advisor/quiz-config";
import { CROSS_BORDER_SPECIALTIES } from "@/lib/advisor-specialties";

const INTENTS: Intent[] = ["buy_property", "grow_wealth", "protect_assets", "business_tax"];

describe("CONTEXT_CONFIG", () => {
  it("offers an 'I'm not sure' escape hatch under every intent", () => {
    for (const intent of INTENTS) {
      const ids = CONTEXT_CONFIG[intent].options.map((o) => o.id);
      expect(ids, `${intent} should include ${NOT_SURE_ID}`).toContain(NOT_SURE_ID);
    }
  });

  it("has unique option ids within each intent", () => {
    for (const intent of INTENTS) {
      const ids = CONTEXT_CONFIG[intent].options.map((o) => o.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("includes the commercial-property path", () => {
    const ids = CONTEXT_CONFIG.buy_property.options.map((o) => o.id);
    expect(ids).toContain("commercial");
  });
});

describe("toggleContextSelection", () => {
  it("radio groups replace the selection", () => {
    expect(toggleContextSelection(["a"], "b", true)).toEqual(["b"]);
  });

  it("checkbox toggles on and off", () => {
    expect(toggleContextSelection([], "a", false)).toEqual(["a"]);
    expect(toggleContextSelection(["a"], "a", false)).toEqual([]);
  });

  it("selecting not-sure clears concrete options", () => {
    expect(toggleContextSelection(["first_home", "refinance"], NOT_SURE_ID, false)).toEqual([NOT_SURE_ID]);
  });

  it("selecting a concrete option clears not-sure", () => {
    expect(toggleContextSelection([NOT_SURE_ID], "first_home", false)).toEqual(["first_home"]);
  });
});

describe("budgetLabelForIntent", () => {
  it("frames the question for property buyers", () => {
    expect(budgetLabelForIntent("buy_property")).toMatch(/property budget/i);
  });
  it("falls back to investable assets", () => {
    expect(budgetLabelForIntent(null)).toMatch(/investable assets/i);
    expect(budgetLabelForIntent("grow_wealth")).toMatch(/investable assets/i);
  });
});

describe("timeline", () => {
  it("encodes as a timeline_* context id the server ignores", () => {
    for (const opt of TIMELINE_OPTIONS) {
      expect(timelineContextId(opt.id)).toBe(`timeline_${opt.id}`);
    }
  });
});

describe("overseas path", () => {
  it("offers the 12 corridor countries plus an 'other' fallback", () => {
    const values = OVERSEAS_COUNTRY_OPTIONS.map((o) => o.value).filter(Boolean);
    expect(values).toContain("uk");
    expect(values).toContain("other");
    expect(values.length).toBe(13);
  });

  it("maps every overseas specialty into the cross-border taxonomy", () => {
    const taxonomy = new Set(CROSS_BORDER_SPECIALTIES);
    for (const intent of INTENTS) {
      for (const country of ["uk", "us", "in", "other"]) {
        const spec = overseasSpecialtyFor(intent, country);
        if (spec !== undefined) {
          expect(taxonomy.has(spec), `${spec} must exist in CROSS_BORDER_SPECIALTIES`).toBe(true);
        }
      }
    }
  });

  it("prioritises FIRB for overseas property buyers regardless of country", () => {
    expect(overseasSpecialtyFor("buy_property", "in")).toBe("FIRB Property (Non-Resident)");
  });

  it("routes UK wealth/protection intents to pension transfer", () => {
    expect(overseasSpecialtyFor("grow_wealth", "uk")).toBe("UK Pension Transfer");
    expect(overseasSpecialtyFor("protect_assets", "uk")).toBe("UK Pension Transfer");
  });

  it("leaves unmapped combinations without a specialty", () => {
    expect(overseasSpecialtyFor("grow_wealth", "other")).toBeUndefined();
  });

  it("recognises corridor codes and rejects everything else", () => {
    expect(isOverseasCorridor("uk")).toBe(true);
    expect(isOverseasCorridor("other")).toBe(false);
    expect(isOverseasCorridor("")).toBe(false);
    expect(overseasCountryName("uk")).toBeTruthy();
    expect(overseasCountryName("other")).toBeNull();
    expect(overseasCountryIso("uk")).toBe("GB");
    expect(overseasCountryIso("other")).toBeNull();
  });
});

describe("intent/need bridges", () => {
  it("intentToNeed and NEED_TO_INTENT round-trip for the four primary needs", () => {
    for (const intent of INTENTS) {
      const need = intentToNeed(intent);
      expect(NEED_TO_INTENT[need]).toBe(intent);
    }
  });
});

describe("isPlausiblePhone", () => {
  it("accepts empty (optional field)", () => {
    expect(isPlausiblePhone("")).toBe(true);
    expect(isPlausiblePhone("   ")).toBe(true);
  });
  it("accepts AU and international formats", () => {
    expect(isPlausiblePhone("0412 345 678")).toBe(true);
    expect(isPlausiblePhone("+61 412 345 678")).toBe(true);
    expect(isPlausiblePhone("+44 (20) 7946-0958")).toBe(true);
  });
  it("rejects keyboard mash and too-short numbers", () => {
    expect(isPlausiblePhone("call me")).toBe(false);
    expect(isPlausiblePhone("123")).toBe(false);
    expect(isPlausiblePhone("0412345678901234567")).toBe(false);
  });
});
