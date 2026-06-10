import { describe, it, expect } from "vitest";
import { pickPrimary, type AdvisorNeed } from "@/lib/quiz-primary-advisor";

describe("pickPrimary", () => {
  it("empty need-set → post-job, no team", () => {
    expect(pickPrimary([])).toEqual({ primary: "post-job", secondaries: [] });
  });

  it("only 'not sure' → post-job", () => {
    expect(pickPrimary(["not-sure"])).toEqual({ primary: "post-job", secondaries: [] });
  });

  it("settlement under contract → conveyancer first", () => {
    const out = pickPrimary(["mortgage-broker", "conveyancer", "tax-agent"], {
      stage: "under-contract",
      goal: "home",
    });
    expect(out.primary).toBe("conveyancer");
    expect(out.secondaries).toEqual(["mortgage-broker", "tax-agent"]);
  });

  it("complex situation with 3+ needs → financial planner coordinates", () => {
    const out = pickPrimary(["tax-agent", "estate-planner", "financial-planner"], { complexity: "complex" });
    expect(out.primary).toBe("financial-planner");
    expect(out.secondaries).toEqual(["tax-agent", "estate-planner"]);
  });

  it("overseas + property → buyer's agent (the FIRB purchase is the act)", () => {
    const out = pickPrimary(["buyers-agent", "tax-agent", "mortgage-broker"], {
      isInternational: true,
      investorGoalIntl: "property",
    });
    expect(out.primary).toBe("buyers-agent");
  });

  it("mortgage + property goal → mortgage broker (free, gates the purchase)", () => {
    const out = pickPrimary(["buyers-agent", "mortgage-broker", "conveyancer"], { goal: "property" });
    expect(out.primary).toBe("mortgage-broker");
  });

  it("SMSF need → SMSF accountant (structure gates the rest)", () => {
    expect(pickPrimary(["tax-agent", "smsf-accountant"], { goal: "super" }).primary).toBe("smsf-accountant");
  });

  it("tax need with nothing higher → tax agent", () => {
    expect(pickPrimary(["tax-agent", "insurance-broker"], {}).primary).toBe("tax-agent");
  });

  it("whale + planner → financial planner as wealth coordinator", () => {
    expect(pickPrimary(["financial-planner", "estate-planner"], { amount: "whale" }).primary).toBe("financial-planner");
  });

  it("single concrete need → that need, empty team", () => {
    expect(pickPrimary(["buyers-agent"], {})).toEqual({ primary: "buyers-agent", secondaries: [] });
  });

  it("falls back to the first stated need when no rule claims it", () => {
    expect(pickPrimary(["insurance-broker", "estate-planner"], {}).primary).toBe("insurance-broker");
  });

  it("dedupes the team and drops the primary", () => {
    const needs: AdvisorNeed[] = ["smsf-accountant", "tax-agent", "tax-agent", "smsf-accountant"];
    const out = pickPrimary(needs, {});
    expect(out.primary).toBe("smsf-accountant");
    expect(out.secondaries).toEqual(["tax-agent"]);
  });
});
