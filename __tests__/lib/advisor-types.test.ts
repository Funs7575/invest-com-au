import { describe, it, expect } from "vitest";
import { ADVISOR_TYPES, isAdvisorType, type AdvisorType } from "@/lib/advisor-types";

// ── ADVISOR_TYPES registry ────────────────────────────────────────────────────

describe("ADVISOR_TYPES registry", () => {
  it("contains at least 30 entries", () => {
    expect(ADVISOR_TYPES.length).toBeGreaterThanOrEqual(30);
  });

  it("has no duplicate entries", () => {
    expect(new Set(ADVISOR_TYPES).size).toBe(ADVISOR_TYPES.length);
  });

  it("all entries are non-empty strings", () => {
    for (const t of ADVISOR_TYPES) {
      expect(typeof t).toBe("string");
      expect(t.length).toBeGreaterThan(0);
    }
  });

  it("all entries use snake_case (no hyphens or spaces)", () => {
    for (const t of ADVISOR_TYPES) {
      expect(t).toMatch(/^[a-z][a-z0-9_]*$/);
    }
  });

  it.each([
    "financial_planner",
    "mortgage_broker",
    "tax_agent",
    "smsf_accountant",
    "wealth_manager",
    "estate_planner",
    "aged_care_advisor",
    "insurance_broker",
  ] satisfies AdvisorType[])("includes core type '%s'", (type) => {
    expect(ADVISOR_TYPES).toContain(type);
  });
});

// ── isAdvisorType ─────────────────────────────────────────────────────────────

describe("isAdvisorType", () => {
  it.each(ADVISOR_TYPES)("returns true for registered type '%s'", (type) => {
    expect(isAdvisorType(type)).toBe(true);
  });

  it("returns false for an unregistered type", () => {
    expect(isAdvisorType("life_coach")).toBe(false);
    expect(isAdvisorType("psychologist")).toBe(false);
  });

  it("returns false for an empty string", () => {
    expect(isAdvisorType("")).toBe(false);
  });

  it("is case-sensitive — uppercase fails", () => {
    expect(isAdvisorType("Financial_Planner")).toBe(false);
    expect(isAdvisorType("MORTGAGE_BROKER")).toBe(false);
  });

  it("returns false for a type with a typo", () => {
    expect(isAdvisorType("financial_planer")).toBe(false);
    expect(isAdvisorType("mortage_broker")).toBe(false);
  });
});
