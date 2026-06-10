import { describe, it, expect } from "vitest";
import {
  actionPlanToUnified,
  allocateAdvisorsFromActionPlan,
} from "@/lib/getmatched/advisor-allocation";
import type { ActionPlanAnswers } from "@/lib/getmatched/types";

const plan = (over: ActionPlanAnswers = {}): ActionPlanAnswers => ({ ...over });

describe("actionPlanToUnified — answer-model translation", () => {
  it("maps starting_point → location and stamps intl visa", () => {
    expect(actionPlanToUnified(plan({ starting_point: "australia" })).location).toBe("australia");
    const overseas = actionPlanToUnified(plan({ starting_point: "overseas" }));
    expect(overseas.location).toBe("international");
    expect(overseas.visa_status).toBe("non_resident");
    const expat = actionPlanToUnified(plan({ starting_point: "expat" }));
    expect(expat.location).toBe("expat");
    expect(expat.visa_status).toBe("au_expat");
  });

  it("maps intent → goal (underscore→hyphen) and unknown → other", () => {
    expect(actionPlanToUnified(plan({ intent: "property" })).goal).toBe("property");
    expect(actionPlanToUnified(plan({ intent: "alt_assets" })).goal).toBe("alt-assets");
    expect(actionPlanToUnified(plan({ intent: "pre_ipo" })).goal).toBe("pre-ipo");
    expect(actionPlanToUnified(plan({ intent: "browse" })).goal).toBe("other");
  });

  it("maps timeline → readiness (now = settlement clock; researching = learning)", () => {
    expect(actionPlanToUnified(plan({ timeline: "now" })).stage).toBe("under-contract");
    expect(actionPlanToUnified(plan({ timeline: "1_3_months" })).stage).toBe("ready");
    expect(actionPlanToUnified(plan({ timeline: "6_12_months" })).stage).toBe("exploring");
    expect(actionPlanToUnified(plan({ timeline: "researching" })).stage).toBe("learning");
  });

  it("maps budget_band → amount enum", () => {
    expect(actionPlanToUnified(plan({ budget_band: "under_10k" })).amount).toBe("small");
    expect(actionPlanToUnified(plan({ budget_band: "100k_500k" })).amount).toBe("large");
    expect(actionPlanToUnified(plan({ budget_band: "1m_plus" })).amount).toBe("whale");
    expect(actionPlanToUnified(plan({ budget_band: "prefer_not" })).amount).toBeUndefined();
  });

  it("maps property_sub and help_sub (named professional) to engine slugs", () => {
    expect(actionPlanToUnified(plan({ property_sub: "smsf" })).property_sub).toBe("property-super");
    expect(actionPlanToUnified(plan({ help_sub: "mortgage_broker" })).advisor_type).toBe("mortgage-broker");
    expect(actionPlanToUnified(plan({ help_sub: "tax_agent" })).advisor_type).toBe("tax-agent");
  });

  it("derives international goal + the tax_legal corridor signal", () => {
    const u = actionPlanToUnified(plan({ starting_point: "overseas", intent: "property", foreign_focus: "property" }));
    expect(u.investor_goal_intl).toBe("property");
    const tax = actionPlanToUnified(plan({ starting_point: "overseas", foreign_focus: "tax_legal" }));
    expect(tax.advisor_type).toBe("tax-agent");
    // ...but a domestic plan never gets intl fields.
    const dom = actionPlanToUnified(plan({ starting_point: "australia", intent: "property" }));
    expect(dom.investor_goal_intl).toBeUndefined();
    expect(dom.visa_status).toBeUndefined();
  });

  it("maps help_preference → mode", () => {
    expect(actionPlanToUnified(plan({ help_preference: "compare" })).mode).toBe("diy");
    expect(actionPlanToUnified(plan({ help_preference: "individual" })).mode).toBe("help");
    expect(actionPlanToUnified(plan({ help_preference: "not_sure" })).mode).toBe("unsure");
  });
});

describe("allocateAdvisorsFromActionPlan — intent coverage via the shared engine", () => {
  // Each row of the intent matrix routes to the right single advisor. The
  // ladder is deliberate: a DOMESTIC property buy leads with the mortgage
  // broker (free, gates the purchase) with the buyer's agent on the team;
  // an under-contract buy leads with the conveyancer (settlement clock); an
  // INTERNATIONAL buy leads with the buyer's agent (the FIRB purchase is the act).
  const cases: { name: string; answers: ActionPlanAnswers; expectType: string }[] = [
    { name: "home loan", answers: { intent: "home" }, expectType: "mortgage-broker" },
    { name: "domestic property investor → broker leads", answers: { intent: "property", property_sub: "physical", timeline: "1_3_months" }, expectType: "mortgage-broker" },
    { name: "ready to settle now → conveyancer (settlement clock)", answers: { intent: "property", property_sub: "physical", timeline: "now" }, expectType: "conveyancer" },
    { name: "SMSF", answers: { intent: "super", super_sub: "smsf_setup", property_sub: "smsf" }, expectType: "smsf-accountant" },
    { name: "named a tax agent", answers: { intent: "help", help_sub: "tax_agent", help_preference: "individual" }, expectType: "tax-agent" },
    { name: "crypto → CGT", answers: { intent: "crypto" }, expectType: "tax-agent" },
    { name: "non-resident foreign property buyer → buyer's agent (FIRB act)", answers: { starting_point: "overseas", intent: "property", foreign_focus: "property" }, expectType: "buyers-agent" },
  ];

  for (const c of cases) {
    it(`${c.name} → ${c.expectType}`, () => {
      const out = allocateAdvisorsFromActionPlan(c.answers);
      expect(out.advisorType).toBe(c.expectType);
      expect(out.scoringContext.advisorType).toBe(c.expectType);
    });
  }

  it("single-lead: a domestic property buy leads with the broker, buyer's agent on the team (not a duplicate lead)", () => {
    const out = allocateAdvisorsFromActionPlan({ intent: "property", property_sub: "physical", timeline: "1_3_months" });
    expect(out.allocation.primary).toBe("mortgage-broker");
    expect(out.allocation.secondaries).toContain("buyers-agent");
    expect(out.allocation.secondaries).not.toContain(out.allocation.primary); // one lead, no fan-out
  });

  it("builds a correct scoring context (budget→scorer vocab, intl flags, state)", () => {
    const out = allocateAdvisorsFromActionPlan({
      starting_point: "overseas",
      intent: "property",
      budget_band: "1m_plus",
      country_of_residence: "uk",
      location_state: "NSW",
      foreign_focus: "property",
    });
    expect(out.scoringContext).toMatchObject({
      isInternational: true,
      investorCountry: "uk",
      investorGoalIntl: "property",
      visaStatus: "non_resident",
      userState: "NSW",
      amount: "whale",
      budget: "over_2m", // scorer vocab, not the raw band
    });
  });

  it("empty answers degrade to a sane default (domestic generalist), never throws", () => {
    const out = allocateAdvisorsFromActionPlan({});
    expect(out.scoringContext.isInternational).toBe(false);
    expect(out.advisorType.length).toBeGreaterThan(0); // a real type, not empty
    expect(out.scoringContext.budget).toBeUndefined();
  });
});
