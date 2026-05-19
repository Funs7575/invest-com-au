import { describe, expect, it } from "vitest";

import { FIRST_HOME_BUYER_ONBOARDING_CONFIG } from "@/lib/hub-onboarding-configs";

const evaluate = FIRST_HOME_BUYER_ONBOARDING_CONFIG.evaluate;

describe("FIRST_HOME_BUYER_ONBOARDING_CONFIG", () => {
  it("declares three questions covering income, state, and deposit status", () => {
    expect(FIRST_HOME_BUYER_ONBOARDING_CONFIG.hubSlug).toBe("first-home-buyer");
    expect(FIRST_HOME_BUYER_ONBOARDING_CONFIG.questions).toHaveLength(3);
    const ids = FIRST_HOME_BUYER_ONBOARDING_CONFIG.questions.map((q) => q.id);
    expect(ids).toEqual(["income", "state", "deposit"]);
  });

  describe("income gate", () => {
    it("over $200k routes to FHSS calc + mortgage broker, no First Home Guarantee promise", () => {
      const result = evaluate({ income: "over_200k", state: "nsw", deposit: "ready_to_buy" });
      expect(result.headline).toMatch(/Above the First Home Guarantee cap/i);
      expect(result.summary).toMatch(/exceeds the First Home Guarantee thresholds/i);
      expect(result.primaryCta.href).toBe("/tools/fhss-calculator");
      expect(result.secondaryCta?.href).toBe("/find/mortgage-broker");
    });

    it("$125k–$200k couple band is steered to FHG + FHSS stack", () => {
      const result = evaluate({ income: "125k_200k", state: "qld", deposit: "saving_outside_super" });
      expect(result.headline).toMatch(/First Home Guarantee couple band/i);
      expect(result.summary).toMatch(/up to \$200,000.*couple/i);
      expect(result.primaryCta.href).toBe("/find/mortgage-broker");
      expect(result.secondaryCta?.href).toBe("/tools/fhss-calculator");
    });

    it("under $60k surfaces FHG + state grants and warns FHSS tax saving is small", () => {
      const result = evaluate({ income: "under_60k", state: "nsw", deposit: "not_started" });
      expect(result.headline).toMatch(/First Home Guarantee \+ state grants/i);
      expect(result.summary).toMatch(/FHSS tax saving|few cents on the dollar/i);
      expect(result.primaryCta.href).toBe("/savings");
    });
  });

  describe("deposit-journey routing within the $60k-$125k bull's-eye", () => {
    it("ready_to_buy → mortgage broker as primary CTA", () => {
      const result = evaluate({ income: "60k_125k", state: "vic", deposit: "ready_to_buy" });
      expect(result.headline).toMatch(/deposit-ready/i);
      expect(result.primaryCta.href).toBe("/find/mortgage-broker");
    });

    it("using_fhss → FHSS calculator as primary, mortgage broker as secondary", () => {
      const result = evaluate({ income: "60k_125k", state: "vic", deposit: "using_fhss" });
      expect(result.headline).toMatch(/tax-efficient deposit path/i);
      expect(result.primaryCta.href).toBe("/tools/fhss-calculator");
      expect(result.secondaryCta?.href).toBe("/find/mortgage-broker");
    });

    it("saving_outside_super → push toward FHSS for the tax saving", () => {
      const result = evaluate({ income: "60k_125k", state: "wa", deposit: "saving_outside_super" });
      expect(result.headline).toMatch(/Move your deposit savings into FHSS/i);
      expect(result.primaryCta.href).toBe("/tools/fhss-calculator");
    });

    it("not_started → FHSS planning as the first move", () => {
      const result = evaluate({ income: "60k_125k", state: "sa", deposit: "not_started" });
      expect(result.headline).toMatch(/every FHB scheme/i);
      expect(result.primaryCta.href).toBe("/tools/fhss-calculator");
    });
  });

  describe("state-grant context", () => {
    it("NSW result mentions the $800k stamp-duty exemption", () => {
      const result = evaluate({ income: "60k_125k", state: "nsw", deposit: "not_started" });
      expect(result.summary).toMatch(/NSW.*\$800,000/);
    });

    it("QLD result mentions the $30,000 First Home Owner Grant", () => {
      const result = evaluate({ income: "60k_125k", state: "qld", deposit: "not_started" });
      expect(result.summary).toMatch(/QLD.*\$30,000/);
    });

    it("TAS result calls out the $30,000 new-build grant", () => {
      const result = evaluate({ income: "60k_125k", state: "tas", deposit: "not_started" });
      expect(result.summary).toMatch(/TAS.*\$30,000/);
    });

    it("ACT result notes the Home Buyer Concession Scheme (no FHOG)", () => {
      const result = evaluate({ income: "60k_125k", state: "act", deposit: "not_started" });
      expect(result.summary).toMatch(/ACT.*Home Buyer Concession Scheme/i);
    });

    it("answers without a state still return a coherent result (no undefined-state crash)", () => {
      const result = evaluate({ income: "60k_125k", deposit: "not_started" });
      expect(result.headline).toBeTruthy();
      expect(result.primaryCta.href).toBe("/tools/fhss-calculator");
    });
  });

  it("every branch supplies an advisor CTA targeting a mortgage broker", () => {
    const cases = [
      { income: "over_200k", state: "nsw", deposit: "ready_to_buy" },
      { income: "125k_200k", state: "qld", deposit: "saving_outside_super" },
      { income: "under_60k", state: "vic", deposit: "not_started" },
      { income: "60k_125k", state: "wa", deposit: "ready_to_buy" },
      { income: "60k_125k", state: "wa", deposit: "using_fhss" },
      { income: "60k_125k", state: "wa", deposit: "saving_outside_super" },
      { income: "60k_125k", state: "wa", deposit: "not_started" },
    ] as const;

    for (const answers of cases) {
      const result = evaluate(answers);
      expect(result.advisorCta?.specialty).toMatch(/mortgage broker/i);
      expect(result.advisorCta?.href).toMatch(/vertical=mortgage/);
    }
  });
});
