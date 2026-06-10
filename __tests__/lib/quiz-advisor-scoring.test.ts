import { describe, it, expect } from "vitest";
import {
  scoreQuizAdvisors,
  confidenceBand,
  confidenceLabel,
  type QuizAdvisorCandidate,
  type QuizAdvisorScoringContext,
} from "@/lib/quiz-advisor-scoring";

function adv(over: Partial<QuizAdvisorCandidate> = {}): QuizAdvisorCandidate {
  return {
    id: 1,
    slug: "a",
    name: "Adviser A",
    type: "financial_planner",
    rating: 4,
    review_count: 10,
    specialties: [],
    ...over,
  };
}

const scoreOf = (list: ReturnType<typeof scoreQuizAdvisors>, slug: string) =>
  list.find((a) => a.slug === slug)?.matchScore ?? 0;

describe("confidenceBand / confidenceLabel", () => {
  it("bands by threshold", () => {
    expect(confidenceBand(80)).toBe("strong");
    expect(confidenceBand(75)).toBe("strong");
    expect(confidenceBand(60)).toBe("good");
    expect(confidenceBand(55)).toBe("good");
    expect(confidenceBand(40)).toBe("fair");
  });

  it("labels each band (no fake-precise %)", () => {
    expect(confidenceLabel("strong")).toBe("Strong match");
    expect(confidenceLabel("good")).toBe("Good match");
    expect(confidenceLabel("fair")).toBe("Possible match");
  });
});

describe("scoreQuizAdvisors", () => {
  it("scores 0–100 + a confidence band on every candidate, best first", () => {
    const strong = adv({
      id: 1, slug: "strong", specialties: ["SMSF Strategy"], min_investment_cents: 0,
      location_state: "NSW", rating: 4.9, review_count: 50, trust_score_overall: 90,
    });
    const weak = adv({
      id: 2, slug: "weak", specialties: ["Aged Care"], min_investment_cents: 500_000_00,
      location_state: "WA", rating: 3.2, review_count: 1,
    });
    const ctx: QuizAdvisorScoringContext = { advisorType: "smsf-accountant", goal: "super", amount: "medium", userState: "NSW" };
    const out = scoreQuizAdvisors([weak, strong], ctx);

    expect(out[0]?.slug).toBe("strong");
    expect(scoreOf(out, "strong")).toBeGreaterThan(scoreOf(out, "weak"));
    expect(scoreOf(out, "strong")).toBeGreaterThanOrEqual(0);
    expect(scoreOf(out, "strong")).toBeLessThanOrEqual(100);
    expect(out[0]?.confidence).toBe("strong");
  });

  it("excludes advisors that block the visitor's country (eligibility gate)", () => {
    const blocked = adv({ id: 1, slug: "blocked", country_eligibility: { blocked_countries: ["GB"] }, available_in_countries: ["uk"] });
    const open = adv({ id: 2, slug: "open", available_in_countries: ["uk"] });
    const ctx: QuizAdvisorScoringContext = { advisorType: "tax-agent", isInternational: true, investorCountry: "uk" };
    const out = scoreQuizAdvisors([blocked, open], ctx);
    expect(out.map((a) => a.slug)).toEqual(["open"]);
  });

  it("does NOT apply the eligibility gate for domestic users", () => {
    const a = adv({ id: 1, slug: "x", country_eligibility: { blocked_countries: ["GB"] } });
    const out = scoreQuizAdvisors([a], { advisorType: "financial-planner", userState: "VIC" });
    expect(out).toHaveLength(1);
  });

  it("rewards a local-state match over a non-local advisor", () => {
    const local = adv({ id: 1, slug: "local", location_state: "QLD" });
    const remote = adv({ id: 2, slug: "remote", location_state: "TAS" });
    const ctx: QuizAdvisorScoringContext = { advisorType: "mortgage-broker", userState: "QLD" };
    const out = scoreQuizAdvisors([remote, local], ctx);
    expect(out[0]?.slug).toBe("local");
    expect(scoreOf(out, "local")).toBeGreaterThan(scoreOf(out, "remote"));
  });

  it("honours office_states (multi-state advisors), not just location_state", () => {
    // Both sit in VIC, but only one lists ACT among the states it serves.
    const serves = adv({ id: 1, slug: "serves", location_state: "VIC", office_states: ["NSW", "ACT"] });
    const doesnt = adv({ id: 2, slug: "doesnt", location_state: "VIC", office_states: ["NSW"] });
    const out = scoreQuizAdvisors([doesnt, serves], { advisorType: "financial-planner", userState: "ACT" });
    expect(out[0]?.slug).toBe("serves");
    expect(scoreOf(out, "serves")).toBeGreaterThan(scoreOf(out, "doesnt"));
  });

  it("rewards a corridor (available_in_countries) match for international users", () => {
    const corridor = adv({ id: 1, slug: "corridor", available_in_countries: ["uk"] });
    const none = adv({ id: 2, slug: "none", available_in_countries: ["sg"] });
    const ctx: QuizAdvisorScoringContext = { advisorType: "tax-agent", isInternational: true, investorCountry: "uk" };
    const out = scoreQuizAdvisors([none, corridor], ctx);
    expect(out[0]?.slug).toBe("corridor");
  });

  it("damps advisors that are explicitly not accepting new clients", () => {
    const open = adv({ id: 1, slug: "open", specialties: ["SMSF"], accepts_new_clients: true });
    const closed = adv({ id: 2, slug: "closed", specialties: ["SMSF"], accepts_new_clients: false });
    const ctx: QuizAdvisorScoringContext = { advisorType: "smsf-accountant", goal: "super" };
    const out = scoreQuizAdvisors([closed, open], ctx);
    expect(out[0]?.slug).toBe("open");
    expect(scoreOf(out, "closed")).toBeLessThan(scoreOf(out, "open"));
  });

  it("rewards a budget that meets the advisor's minimum", () => {
    const affordable = adv({ id: 1, slug: "affordable", min_investment_cents: 50_000_00 });
    const tooHigh = adv({ id: 2, slug: "too-high", min_investment_cents: 1_000_000_00 });
    const ctx: QuizAdvisorScoringContext = { advisorType: "financial-planner", budget: "100k_500k" };
    const out = scoreQuizAdvisors([tooHigh, affordable], ctx);
    expect(out[0]?.slug).toBe("affordable");
    expect(scoreOf(out, "affordable")).toBeGreaterThan(scoreOf(out, "too-high"));
  });

  it("respects the limit", () => {
    const many = Array.from({ length: 8 }, (_, i) => adv({ id: i, slug: `a${i}` }));
    expect(scoreQuizAdvisors(many, { advisorType: "tax-agent" }, 3)).toHaveLength(3);
  });

  it("handles candidates with minimal data without throwing", () => {
    const bare: QuizAdvisorCandidate = { id: 1, slug: "bare", name: "Bare", type: "tax_agent" };
    const out = scoreQuizAdvisors([bare], { advisorType: "tax-agent" });
    expect(out).toHaveLength(1);
    expect(scoreOf(out, "bare")).toBeGreaterThan(0);
  });

  it("corridor specialties are first-class hits for their corridor (§5.5)", () => {
    // "UK Pension Transfer" contains no generic INTL_KEYWORD — pre-fix it
    // scored as if the specialist had no relevant specialty for a UK user.
    const ukSpecialist = adv({ id: 1, slug: "uk-pension", specialties: ["UK Pension Transfer"] });
    const unrelated = adv({ id: 2, slug: "unrelated", specialties: ["Business Tax"] });
    const ukCtx: QuizAdvisorScoringContext = {
      advisorType: "financial-planner",
      isInternational: true,
      investorCountry: "uk",
    };
    const out = scoreQuizAdvisors([unrelated, ukSpecialist], ukCtx);
    expect(out[0]?.slug).toBe("uk-pension");
    expect(scoreOf(out, "uk-pension")).toBeGreaterThan(scoreOf(out, "unrelated"));

    // DASP is the temporary-visa-holder corridor.
    const dasp = adv({ id: 3, slug: "dasp", specialties: ["DASP Processing"] });
    const generic = adv({ id: 4, slug: "generic", specialties: ["Retirement Planning"] });
    const tempVisaCtx: QuizAdvisorScoringContext = {
      advisorType: "tax-agent",
      isInternational: true,
      visaStatus: "temp_visa",
    };
    const out2 = scoreQuizAdvisors([generic, dasp], tempVisaCtx);
    expect(out2[0]?.slug).toBe("dasp");

    // ...but DASP earns no corridor credit for a non-temp-visa user.
    const out3 = scoreQuizAdvisors([dasp], { advisorType: "tax-agent", isInternational: true, investorCountry: "uk" });
    expect(scoreOf(out3, "dasp")).toBeLessThan(scoreOf(out2, "dasp"));
  });
});
