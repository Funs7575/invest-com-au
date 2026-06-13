/**
 * Tests for lib/decision-kit/scripts.ts — registry integrity + resolution.
 */
import { describe, it, expect } from "vitest";
import {
  CALL_SCRIPTS,
  getCallScript,
  resolveScriptServiceType,
  type ScriptServiceType,
} from "@/lib/decision-kit/scripts";

const SERVICE_TYPES: ScriptServiceType[] = [
  "smsf",
  "property",
  "financial_planning",
  "mortgage",
  "tax_accounting",
  "generic",
];

describe("CALL_SCRIPTS registry integrity", () => {
  it("has a script for every service type", () => {
    for (const t of SERVICE_TYPES) {
      expect(CALL_SCRIPTS[t]).toBeDefined();
      expect(CALL_SCRIPTS[t].serviceType).toBe(t);
    }
  });

  it("each script has 8-12 questions", () => {
    for (const t of SERVICE_TYPES) {
      const n = CALL_SCRIPTS[t].questions.length;
      expect(n, `${t} question count`).toBeGreaterThanOrEqual(8);
      expect(n, `${t} question count`).toBeLessThanOrEqual(12);
    }
  });

  it("every question has a non-empty question and why line", () => {
    for (const t of SERVICE_TYPES) {
      for (const q of CALL_SCRIPTS[t].questions) {
        expect(q.question.trim().length).toBeGreaterThan(10);
        expect(q.why.trim().length).toBeGreaterThan(10);
      }
    }
  });

  it("each script has a label and intro", () => {
    for (const t of SERVICE_TYPES) {
      expect(CALL_SCRIPTS[t].label.trim().length).toBeGreaterThan(0);
      expect(CALL_SCRIPTS[t].intro.trim().length).toBeGreaterThan(0);
    }
  });

  it("questions within a script are unique", () => {
    for (const t of SERVICE_TYPES) {
      const qs = CALL_SCRIPTS[t].questions.map((q) => q.question);
      expect(new Set(qs).size, `${t} unique questions`).toBe(qs.length);
    }
  });
});

describe("resolveScriptServiceType", () => {
  it("falls back to generic for null/empty/unknown", () => {
    expect(resolveScriptServiceType(null)).toBe("generic");
    expect(resolveScriptServiceType(undefined)).toBe("generic");
    expect(resolveScriptServiceType("")).toBe("generic");
    expect(resolveScriptServiceType("astrology")).toBe("generic");
  });

  it("maps SMSF identifiers", () => {
    expect(resolveScriptServiceType("smsf_accountant")).toBe("smsf");
    expect(resolveScriptServiceType("smsf_property")).toBe("smsf");
    expect(resolveScriptServiceType("Self-Managed Super")).toBe("smsf");
  });

  it("maps mortgage before property (mortgage_broker → mortgage)", () => {
    expect(resolveScriptServiceType("mortgage_broker")).toBe("mortgage");
    expect(resolveScriptServiceType("home loan")).toBe("mortgage");
  });

  it("maps property / buyer's agent / conveyancer", () => {
    expect(resolveScriptServiceType("property_advisor")).toBe("property");
    expect(resolveScriptServiceType("buyers_agent")).toBe("property");
    expect(resolveScriptServiceType("conveyancer")).toBe("property");
    expect(resolveScriptServiceType("commercial_property")).toBe("property");
  });

  it("maps tax / accounting", () => {
    expect(resolveScriptServiceType("tax_agent")).toBe("tax_accounting");
    expect(resolveScriptServiceType("tax")).toBe("tax_accounting");
    expect(resolveScriptServiceType("accountant")).toBe("tax_accounting");
  });

  it("maps financial planning family", () => {
    expect(resolveScriptServiceType("financial_planner")).toBe("financial_planning");
    expect(resolveScriptServiceType("financial_adviser")).toBe("financial_planning");
    expect(resolveScriptServiceType("wealth_manager")).toBe("financial_planning");
    expect(resolveScriptServiceType("estate_planner")).toBe("financial_planning");
    expect(resolveScriptServiceType("insurance_broker")).toBe("financial_planning");
  });

  it("is case-insensitive and trims", () => {
    expect(resolveScriptServiceType("  SMSF_ACCOUNTANT  ")).toBe("smsf");
  });
});

describe("getCallScript", () => {
  it("always returns a script (generic fallback)", () => {
    expect(getCallScript(null).serviceType).toBe("generic");
    expect(getCallScript("mortgage_broker").serviceType).toBe("mortgage");
  });
});
