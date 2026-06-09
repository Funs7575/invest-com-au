import { describe, it, expect } from "vitest";
import {
  buildAdvisorMatchReasons,
  type AdvisorMatchAttrs,
  type AdvisorMatchContext,
} from "@/lib/quiz-advisor-match-reasons";

const base: AdvisorMatchAttrs = {
  type: "financial_planner",
  specialties: [],
  rating: 0,
  review_count: 0,
  verified: false,
};

describe("buildAdvisorMatchReasons", () => {
  it("never returns more than `max` reasons and is never empty", () => {
    const reasons = buildAdvisorMatchReasons(base, {});
    expect(reasons.length).toBeGreaterThan(0);
    expect(reasons.length).toBeLessThanOrEqual(3);
  });

  it("respects a custom max", () => {
    const advisor: AdvisorMatchAttrs = {
      ...base,
      type: "smsf_accountant",
      specialties: ["SMSF Strategy"],
      rating: 4.8,
      review_count: 20,
      years_experience: 12,
      verified: true,
    };
    const ctx: AdvisorMatchContext = { advisorType: "smsf-accountant", userState: "NSW", budget: "100k_500k" };
    expect(buildAdvisorMatchReasons(advisor, ctx, 5).length).toBeLessThanOrEqual(5);
    expect(buildAdvisorMatchReasons(advisor, ctx, 2)).toHaveLength(2);
  });

  it("surfaces the advisor's own matching specialty", () => {
    const advisor = { ...base, type: "smsf_accountant", specialties: ["Aged Care", "SMSF Strategy"] };
    const reasons = buildAdvisorMatchReasons(advisor, { advisorType: "smsf-accountant" });
    expect(reasons).toContain("Specialises in SMSF Strategy");
  });

  it("uses the corridor (available_in_countries) for international investors", () => {
    const advisor: AdvisorMatchAttrs = { ...base, type: "tax_agent", available_in_countries: ["uk", "singapore"] };
    const reasons = buildAdvisorMatchReasons(advisor, { isInternational: true, investorCountry: "uk" });
    expect(reasons).toContain("Works with investors from the UK");
  });

  it("falls back to FIRB specialism for international property without a corridor match", () => {
    const advisor: AdvisorMatchAttrs = { ...base, type: "buyers_agent", firb_specialist: true };
    const reasons = buildAdvisorMatchReasons(advisor, {
      isInternational: true,
      investorCountry: "china",
      investorGoalIntl: "property",
    });
    expect(reasons.some((r) => r.includes("FIRB"))).toBe(true);
  });

  it("adds a language reason when the advisor speaks the investor's language", () => {
    const advisor: AdvisorMatchAttrs = {
      ...base,
      type: "tax_agent",
      available_in_countries: ["china"],
      languages: ["English", "Mandarin"],
    };
    const reasons = buildAdvisorMatchReasons(advisor, { isInternational: true, investorCountry: "china" }, 4);
    expect(reasons).toContain("Speaks Mandarin");
  });

  it("flags a local-to-you match for domestic users in the same state", () => {
    const advisor: AdvisorMatchAttrs = { ...base, type: "mortgage_broker", location_state: "VIC", location_display: "Melbourne, VIC" };
    const reasons = buildAdvisorMatchReasons(advisor, { isInternational: false, userState: "VIC" });
    expect(reasons.some((r) => r.includes("local to you"))).toBe(true);
  });

  it("does NOT claim local when states differ", () => {
    const advisor: AdvisorMatchAttrs = { ...base, type: "mortgage_broker", location_state: "QLD", location_display: "Brisbane, QLD" };
    const reasons = buildAdvisorMatchReasons(advisor, { isInternational: false, userState: "NSW" });
    expect(reasons.some((r) => r.includes("local to you"))).toBe(false);
  });

  it("includes a rating reason when well-reviewed", () => {
    const advisor: AdvisorMatchAttrs = { ...base, type: "financial_planner", rating: 4.7, review_count: 31 };
    const reasons = buildAdvisorMatchReasons(advisor, {}, 4);
    expect(reasons.some((r) => r.includes("4.7/5") && r.includes("31"))).toBe(true);
  });

  it("does not show a high-rating reason on a single review", () => {
    const advisor: AdvisorMatchAttrs = { ...base, type: "financial_planner", rating: 5, review_count: 1 };
    const reasons = buildAdvisorMatchReasons(advisor, {}, 4);
    expect(reasons.some((r) => r.includes("from 1 client reviews"))).toBe(false);
  });

  it("deduplicates reasons", () => {
    const advisor: AdvisorMatchAttrs = { ...base, type: "tax_agent", specialties: ["Tax"], verified: true };
    const reasons = buildAdvisorMatchReasons(advisor, { advisorType: "tax-agent" }, 5);
    const lower = reasons.map((r) => r.toLowerCase());
    expect(new Set(lower).size).toBe(lower.length);
  });

  it("includes a budget-fit reason when budget is provided and slots remain", () => {
    const advisor: AdvisorMatchAttrs = { ...base, type: "financial_planner" };
    const reasons = buildAdvisorMatchReasons(advisor, { budget: "500k_2m" }, 5);
    expect(reasons.some((r) => r.includes("$500k–$2m"))).toBe(true);
  });

  it("surfaces a verified free initial consultation (and drops the generic one)", () => {
    const advisor: AdvisorMatchAttrs = { ...base, type: "financial_planner", initial_consultation_free: true };
    const reasons = buildAdvisorMatchReasons(advisor, {}, 4);
    expect(reasons).toContain("Free initial consultation");
    expect(reasons).not.toContain("Free, no-obligation intro call");
  });

  it("surfaces a verified response time", () => {
    expect(buildAdvisorMatchReasons({ ...base, type: "tax_agent", avg_response_minutes: 45 }, {}, 4)).toContain("Typically replies within the hour");
    expect(buildAdvisorMatchReasons({ ...base, type: "tax_agent", avg_response_minutes: 180 }, {}, 4)).toContain("Typically replies in ~3 hours");
    expect(buildAdvisorMatchReasons({ ...base, type: "tax_agent", response_time_hours: 12 }, {}, 4)).toContain("Usually replies same business day");
  });
});
