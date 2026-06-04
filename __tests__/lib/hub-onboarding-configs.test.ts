import { describe, expect, it } from "vitest";

import {
  SMSF_ONBOARDING_CONFIG,
  SUPER_ONBOARDING_CONFIG,
  ETF_ONBOARDING_CONFIG,
  CRYPTO_ONBOARDING_CONFIG,
  FOREIGN_INVESTMENT_ONBOARDING_CONFIG,
  HUB_ONBOARDING_CONFIGS,
} from "@/lib/hub-onboarding-configs";
import type { HubOnboardingConfig } from "@/components/HubOnboardingShell";
import type { QuizAnswers } from "@/components/EligibilityQuiz";

/**
 * Data-integrity + branch-routing coverage for the hub onboarding configs.
 *
 * Only FIRST_HOME_BUYER_ONBOARDING_CONFIG.evaluate had explicit coverage
 * (see first-home-buyer-onboarding.test.ts). This file exercises the registry
 * as a whole plus the branch routers + fallbacks of the other key configs.
 *
 * PURE — imported directly, no mocks.
 */

describe("HUB_ONBOARDING_CONFIGS registry integrity", () => {
  const entries = Object.entries(HUB_ONBOARDING_CONFIGS);

  it("has 14 entries", () => {
    expect(entries).toHaveLength(14);
  });

  it.each(entries)("'%s' is keyed by its own hubSlug", (key, config) => {
    expect(config.hubSlug).toBe(key);
  });

  it.each(entries)("'%s' declares exactly 3 questions", (_key, config) => {
    expect(config.questions).toHaveLength(3);
  });

  it.each(entries)("'%s' has unique, non-empty question ids", (_key, config) => {
    const ids = config.questions.map((q) => q.id);
    ids.forEach((id) => expect(id).toBeTruthy());
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(entries)("'%s' has options with non-empty value + label", (_key, config) => {
    for (const question of config.questions) {
      expect(question.options.length).toBeGreaterThan(0);
      for (const option of question.options) {
        expect(option.value).toBeTruthy();
        expect(option.label).toBeTruthy();
      }
    }
  });
});

/**
 * Shape assertion shared by every evaluate() result across every config.
 * Runs evaluate() against an exhaustive cartesian product of each config's
 * own answer options PLUS the empty-answers fallback, asserting structural
 * integrity (no undefined headline/summary/CTAs, all hrefs root-relative).
 */
function assertResultShape(config: HubOnboardingConfig, answers: QuizAnswers) {
  const result = config.evaluate(answers);

  expect(result).toBeTypeOf("object");
  expect(result.headline).toBeTruthy();
  expect(typeof result.headline).toBe("string");
  expect(result.summary).toBeTruthy();
  expect(typeof result.summary).toBe("string");

  // primaryCta is required and complete
  expect(result.primaryCta).toBeTruthy();
  expect(result.primaryCta.label).toBeTruthy();
  expect(result.primaryCta.href).toBeTruthy();
  expect(result.primaryCta.href.startsWith("/")).toBe(true);

  // advisorCta is required (spec) and well-formed
  expect(result.advisorCta).toBeTruthy();
  expect(result.advisorCta?.href).toBeTruthy();
  expect(result.advisorCta?.href.startsWith("/")).toBe(true);
  expect(result.advisorCta?.specialty).toBeTruthy();

  // secondaryCta is optional but if present must be root-relative
  if (result.secondaryCta) {
    expect(result.secondaryCta.label).toBeTruthy();
    expect(result.secondaryCta.href.startsWith("/")).toBe(true);
  }
}

/**
 * Build the full cartesian product of one option-value per question so we
 * sweep every branch path. Plus the empty-answers fallback case.
 */
function answerCombinations(config: HubOnboardingConfig): QuizAnswers[] {
  let combos: QuizAnswers[] = [{}];
  for (const question of config.questions) {
    const next: QuizAnswers[] = [];
    for (const combo of combos) {
      for (const option of question.options) {
        next.push({ ...combo, [question.id]: option.value });
      }
    }
    combos = next;
  }
  // include the all-empty answers case explicitly
  combos.push({});
  return combos;
}

describe("evaluate() produces a well-formed result for every answer combination", () => {
  const configs: Array<[string, HubOnboardingConfig]> = Object.entries(HUB_ONBOARDING_CONFIGS);

  it.each(configs)("'%s' never returns a broken result", (_key, config) => {
    for (const answers of answerCombinations(config)) {
      assertResultShape(config, answers);
    }
  });

  it.each(configs)("'%s' empty answers {} returns a fallback without crashing", (_key, config) => {
    expect(() => config.evaluate({})).not.toThrow();
    assertResultShape(config, {});
  });
});

describe("SMSF_ONBOARDING_CONFIG branch routing", () => {
  const evaluate = SMSF_ONBOARDING_CONFIG.evaluate;

  it("readiness 'current' -> experienced trustee", () => {
    const result = evaluate({ readiness: "current" });
    expect(result.headline).toMatch(/experienced trustee/i);
  });

  it("balance 'under_100k' -> may not stack up + /super primary CTA", () => {
    const result = evaluate({ balance: "under_100k" });
    expect(result.headline).toMatch(/may not stack up/i);
    expect(result.primaryCta.href).toBe("/super");
  });

  it("goal 'property' -> LRBA headline", () => {
    // balance set high enough not to trip the under_100k branch first
    const result = evaluate({ balance: "200k_500k", goal: "property" });
    expect(result.headline).toMatch(/right structure/i);
    expect(result.summary).toMatch(/LRBA/);
  });

  it("strong candidate: high balance + non-new readiness -> strong SMSF candidate + /smsf/setup", () => {
    const result = evaluate({ balance: "over_500k", readiness: "some", goal: "control" });
    expect(result.headline).toMatch(/strong SMSF candidate/i);
    expect(result.primaryCta.href).toBe("/smsf/setup");
  });

  it("high balance but readiness 'new' falls through to fallback (not strong candidate)", () => {
    const result = evaluate({ balance: "200k_500k", readiness: "new", goal: "control" });
    expect(result.headline).toMatch(/check the numbers/i);
  });

  it("empty answers -> 'check the numbers' fallback", () => {
    const result = evaluate({});
    expect(result.headline).toMatch(/check the numbers/i);
  });
});

describe("SUPER_ONBOARDING_CONFIG branch routing", () => {
  const evaluate = SUPER_ONBOARDING_CONFIG.evaluate;

  it("pre/at retirement -> transition to retirement planning", () => {
    expect(evaluate({ stage: "retire" }).headline).toMatch(/transition to retirement/i);
    expect(evaluate({ stage: "pre_retire" }).headline).toMatch(/transition to retirement/i);
  });

  it("high balance + fees concern -> fee-reduction headline", () => {
    const result = evaluate({ stage: "mid", balance: "over_500k", concern: "fees" });
    expect(result.headline).toMatch(/reducing fees/i);
    expect(result.primaryCta.href).toBe("/compare/super");
  });

  it("contributions concern -> extra contributions headline", () => {
    const result = evaluate({ stage: "early", balance: "under_50k", concern: "contributions" });
    expect(result.headline).toMatch(/extra contributions/i);
    expect(result.primaryCta.href).toBe("/super/contributions");
  });

  it("consolidate concern -> consolidation headline", () => {
    const result = evaluate({ stage: "mid", balance: "50k_200k", concern: "consolidate" });
    expect(result.headline).toMatch(/consolidating/i);
    expect(result.primaryCta.href).toBe("/super/consolidation");
  });

  it("empty answers -> lower-fee fund fallback", () => {
    const result = evaluate({});
    expect(result.headline).toMatch(/lower-fee fund/i);
    expect(result.primaryCta.href).toBe("/compare/super");
  });
});

describe("ETF_ONBOARDING_CONFIG branch routing", () => {
  const evaluate = ETF_ONBOARDING_CONFIG.evaluate;

  it("income goal + asx/global market -> high-yield dividend ETFs", () => {
    expect(evaluate({ goal: "income", market: "asx" }).headline).toMatch(/dividend ETFs/i);
    expect(evaluate({ goal: "income", market: "global" }).headline).toMatch(/dividend ETFs/i);
  });

  it("growth goal + us/global market -> global equity ETF core", () => {
    const result = evaluate({ goal: "growth", market: "us" });
    expect(result.headline).toMatch(/global equity ETF/i);
  });

  it("diversify goal -> diversification ETF", () => {
    expect(evaluate({ goal: "diversify" }).headline).toMatch(/diversification ETF/i);
  });

  it("simplify goal -> swapping individual shares", () => {
    expect(evaluate({ goal: "simplify" }).headline).toMatch(/individual shares/i);
  });

  it("defensive market or short horizon -> defensive ETFs", () => {
    expect(evaluate({ goal: "control", market: "bonds_defensive" }).headline).toMatch(/defensive ETFs/i);
    expect(evaluate({ goal: "control", horizon: "short" }).headline).toMatch(/defensive ETFs/i);
  });

  it("empty answers -> 2-ETF portfolio fallback", () => {
    const result = evaluate({});
    expect(result.headline).toMatch(/2-ETF portfolio/i);
    expect(result.primaryCta.href).toBe("/etfs");
  });
});

describe("CRYPTO_ONBOARDING_CONFIG branch routing", () => {
  const evaluate = CRYPTO_ONBOARDING_CONFIG.evaluate;

  it("complete beginner -> start with BTC/ETH on a regulated exchange", () => {
    expect(evaluate({ experience: "new" }).headline).toMatch(/regulated Australian exchange/i);
  });

  it("over 30% allocation -> extreme concentration risk", () => {
    const result = evaluate({ experience: "some", allocation: "over_30" });
    expect(result.headline).toMatch(/concentration risk/i);
  });

  it("income goal -> yield strategies risk headline", () => {
    expect(evaluate({ experience: "some", goal: "income" }).headline).toMatch(/yield strategies/i);
  });

  it("advanced experience -> tax records from day one", () => {
    expect(evaluate({ experience: "advanced", goal: "speculate" }).headline).toMatch(/tax records/i);
  });

  it("diversify goal -> 5–10% satellite allocation", () => {
    expect(evaluate({ experience: "some", goal: "diversify" }).headline).toMatch(/satellite allocation/i);
  });

  it("empty answers -> long-term holding fallback", () => {
    const result = evaluate({});
    expect(result.headline).toMatch(/Long-term Bitcoin and Ethereum/i);
  });
});

describe("FOREIGN_INVESTMENT_ONBOARDING_CONFIG branch routing", () => {
  const evaluate = FOREIGN_INVESTMENT_ONBOARDING_CONFIG.evaluate;

  it("property focus -> FIRB approval headline", () => {
    const result = evaluate({ focus: "property" });
    expect(result.headline).toMatch(/FIRB approval/i);
    expect(result.primaryCta.href).toBe("/foreign-investment/guides/firb-application-guide");
  });

  it("expat abroad + super -> super still growing / DASP", () => {
    const result = evaluate({ status: "expat_abroad", focus: "super" });
    expect(result.headline).toMatch(/super is still growing/i);
  });

  it("tax concern or shares focus -> withholding tax headline", () => {
    expect(evaluate({ concern: "tax" }).headline).toMatch(/withholding tax/i);
    expect(evaluate({ focus: "shares" }).headline).toMatch(/withholding tax/i);
  });

  it("new migrant or banking concern -> bank account + TFN", () => {
    expect(evaluate({ status: "new_migrant" }).headline).toMatch(/bank account and TFN/i);
    expect(evaluate({ concern: "banking" }).headline).toMatch(/bank account and TFN/i);
  });

  it("empty answers -> rules vary fallback", () => {
    const result = evaluate({});
    expect(result.headline).toMatch(/vary significantly/i);
    expect(result.primaryCta.href).toBe("/foreign-investment");
  });
});
