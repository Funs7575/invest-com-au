import { describe, it, expect } from "vitest";
import { buildMatchExplainer } from "@/lib/getmatched/explainer";

describe("buildMatchExplainer", () => {
  it("base score for empty answers is 55", () => {
    const { score, bullets } = buildMatchExplainer({
      answers: {},
      intent: null,
      route: "guide",
      vertical: null,
      advisorType: null,
    });
    expect(score).toBe(55);
    expect(bullets).toEqual(["Matched to a general starting point"]);
  });

  it("adds 9 points per signal", () => {
    const { score, bullets } = buildMatchExplainer({
      answers: {
        intent: "property",
        property_sub: "physical",
        help_preference: "individual",
        budget_band: "500k_1m",
        timeline: "1_3_months",
      },
      intent: "property",
      route: "individual",
      vertical: "property",
      advisorType: "buyers_agent",
    });
    // 6 signals: intent + sub + help + budget + timeline + advisor
    // (vertical not added for `individual` route — only for compare/browse)
    // 55 + 6*9 = 109, capped at 99.
    expect(score).toBe(99);
    expect(bullets.length).toBeGreaterThanOrEqual(5);
  });

  it("caps score at 99 when signals push above 100", () => {
    const { score } = buildMatchExplainer({
      answers: {
        intent: "crypto",
        crypto_sub: "active",
        help_preference: "compare",
        budget_band: "1m_plus",
        timeline: "now",
      },
      intent: "crypto",
      route: "compare",
      vertical: "crypto",
      advisorType: "tax_agent",
    });
    expect(score).toBe(99);
  });

  it("scales linearly below the cap", () => {
    const { score } = buildMatchExplainer({
      answers: { intent: "grow", budget_band: "10k_100k" },
      intent: "grow",
      route: "compare",
      vertical: "shares",
      advisorType: null,
    });
    // 3 signals: intent + budget + vertical(compare) = 55 + 27 = 82
    expect(score).toBe(82);
  });

  it("includes vertical bullet for compare route", () => {
    const { bullets } = buildMatchExplainer({
      answers: { intent: "crypto", help_preference: "compare" },
      intent: "crypto",
      route: "compare",
      vertical: "crypto",
      advisorType: null,
    });
    expect(bullets.some((b) => b.toLowerCase().includes("crypto"))).toBe(true);
    expect(bullets.some((b) => b.includes("platforms"))).toBe(true);
  });

  it("includes advisor type bullet for individual route", () => {
    const { bullets } = buildMatchExplainer({
      answers: { intent: "home", help_preference: "individual" },
      intent: "home",
      route: "individual",
      vertical: "lender",
      advisorType: "mortgage_broker",
    });
    expect(bullets.some((b) => b.includes("Best fit"))).toBe(true);
  });

  it("includes sub-question bullet when answered (overrides plain intent)", () => {
    const { bullets } = buildMatchExplainer({
      answers: { intent: "super", super_sub: "smsf_setup" },
      intent: "super",
      route: "expert_team",
      vertical: "super",
      advisorType: "smsf_accountant",
    });
    expect(bullets.some((b) => b.includes("set up an SMSF"))).toBe(true);
  });

  it("never returns empty bullets", () => {
    const { bullets } = buildMatchExplainer({
      answers: {},
      intent: null,
      route: "guide",
      vertical: null,
      advisorType: null,
    });
    expect(bullets.length).toBeGreaterThan(0);
  });

  it("caps bullets at 5", () => {
    const { bullets } = buildMatchExplainer({
      answers: {
        intent: "property",
        property_sub: "physical",
        help_preference: "individual",
        budget_band: "1m_plus",
        timeline: "now",
      },
      intent: "property",
      route: "individual",
      vertical: "property",
      advisorType: "buyers_agent",
    });
    expect(bullets.length).toBeLessThanOrEqual(5);
  });
});
