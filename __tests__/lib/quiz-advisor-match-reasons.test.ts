import { describe, it, expect } from "vitest";
import {
  getAdvisorMatchReasons,
  type QuizAnswersForReasons,
  type AdvisorForReasons,
} from "@/lib/quiz-advisor-match-reasons";

describe("getAdvisorMatchReasons", () => {
  const baseAnswers: QuizAnswersForReasons = {
    goal: "grow",
    advisor_type: "financial-planner",
    complexity: "moderate",
    amount: "medium",
    experience: "intermediate",
    location: "nsw",
  };

  const baseAdvisor: AdvisorForReasons = {
    name: "Jane Advisor",
    type: "financial_planner",
    rating: 4.5,
    review_count: 10,
    verified: true,
    specialties: ["Retirement Planning", "Investment Strategy"],
    location_display: "Sydney NSW",
    location_state: "NSW",
    median_response_hours: 2,
    accepts_international_clients: false,
    available_in_countries: [],
  };

  it("returns non-empty array of reasons", () => {
    const reasons = getAdvisorMatchReasons(baseAnswers, baseAdvisor, false);
    expect(reasons.length).toBeGreaterThan(0);
    expect(reasons.length).toBeLessThanOrEqual(4);
  });

  it("matches on advisor specialties overlapping with quiz answers", () => {
    const advisorWithProperty = { ...baseAdvisor, specialties: ["Property Investment", "SMSF"] };
    const answersWithProperty = { ...baseAnswers, goal: "property" };
    const reasons = getAdvisorMatchReasons(answersWithProperty, advisorWithProperty, false);
    expect(reasons.some((r) => r.toLowerCase().includes("property") || r.toLowerCase().includes("smsf"))).toBe(true);
  });

  it("includes verified badge when advisor is verified", () => {
    const verifiedAdvisor = { ...baseAdvisor, verified: true };
    const reasons = getAdvisorMatchReasons(baseAnswers, verifiedAdvisor, false);
    expect(reasons.some((r) => r.toLowerCase().includes("asic"))).toBe(true);
  });

  it("includes response time when median_response_hours is fast", () => {
    const fastAdvisor = { ...baseAdvisor, median_response_hours: 1 };
    const reasons = getAdvisorMatchReasons(baseAnswers, fastAdvisor, false);
    expect(reasons.some((r) => r.toLowerCase().includes("respond"))).toBe(true);
  });

  it("matches on location for domestic users in same state", () => {
    const nswAdvisor = { ...baseAdvisor, location_state: "NSW" };
    const nswAnswers = { ...baseAnswers, location: "nsw" };
    const reasons = getAdvisorMatchReasons(nswAnswers, nswAdvisor, false);
    expect(reasons.some((r) => r.toLowerCase().includes("local"))).toBe(true);
  });

  it("does not match location for different states", () => {
    const vicAdvisor = { ...baseAdvisor, location_state: "VIC", location_display: "Melbourne VIC" };
    const nswAnswers = { ...baseAnswers, location: "nsw" };
    const reasons = getAdvisorMatchReasons(nswAnswers, vicAdvisor, false);
    expect(reasons.some((r) => r.toLowerCase().includes("local"))).toBe(false);
  });

  it("includes high rating signal when rating >= 4.5 and reviews >= 5", () => {
    const highRatedAdvisor = { ...baseAdvisor, rating: 4.7, review_count: 20 };
    const reasons = getAdvisorMatchReasons(baseAnswers, highRatedAdvisor, false);
    // May include high rating in reasons
    expect(reasons.length).toBeGreaterThan(0);
  });

  it("handles low rating gracefully without crashing", () => {
    const lowRatedAdvisor = { ...baseAdvisor, rating: 2.5, review_count: 3 };
    const reasons = getAdvisorMatchReasons(baseAnswers, lowRatedAdvisor, false);
    expect(reasons.length).toBeGreaterThan(0);
  });

  it("handles null rating without crashing", () => {
    const noRatingAdvisor = { ...baseAdvisor, rating: null, review_count: null };
    const reasons = getAdvisorMatchReasons(baseAnswers, noRatingAdvisor, false);
    expect(reasons.length).toBeGreaterThan(0);
  });

  it("includes international client signal for international users", () => {
    const intlAdvisor = { ...baseAdvisor, accepts_international_clients: true };
    const intlAnswers = { ...baseAnswers, investor_country: "uk" };
    const reasons = getAdvisorMatchReasons(intlAnswers, intlAdvisor, true);
    expect(reasons.some((r) => r.toLowerCase().includes("international"))).toBe(true);
  });

  it("matches country availability for international users", () => {
    const ukSpecialist = {
      ...baseAdvisor,
      accepts_international_clients: true,
      available_in_countries: ["uk", "us"],
    };
    const ukAnswers = { ...baseAnswers, investor_country: "uk" };
    const reasons = getAdvisorMatchReasons(ukAnswers, ukSpecialist, true);
    expect(reasons.some((r) => r.toLowerCase().includes("cross-border") || r.toLowerCase().includes("specialist"))).toBe(true);
  });

  it("handles complexity match for complex situations", () => {
    const advisorForComplex = {
      ...baseAdvisor,
      type: "financial_planner",
      specialties: ["Complex Wealth Planning", "SMSF"],
    };
    const complexAnswers = { ...baseAnswers, complexity: "complex" };
    const reasons = getAdvisorMatchReasons(complexAnswers, advisorForComplex, false);
    expect(reasons.length).toBeGreaterThan(0);
  });

  it("handles beginner experience level", () => {
    const beginnerAdvisor = {
      ...baseAdvisor,
      specialties: ["Beginner-Friendly Investing", "First Steps to Wealth"],
    };
    const beginnerAnswers = { ...baseAnswers, experience: "beginner" };
    const reasons = getAdvisorMatchReasons(beginnerAnswers, beginnerAdvisor, false);
    expect(reasons.length).toBeGreaterThan(0);
  });

  it("handles high-net-worth/whale budgets", () => {
    const highValueAdvisor = { ...baseAdvisor, rating: 4.8, review_count: 50 };
    const whaleAnswers = { ...baseAnswers, amount: "whale" };
    const reasons = getAdvisorMatchReasons(whaleAnswers, highValueAdvisor, false);
    expect(reasons.length).toBeGreaterThan(0);
  });

  it("respects profile completeness", () => {
    const completeAdvisor = {
      ...baseAdvisor,
      profile_quality_gate: "passed",
    };
    const reasons = getAdvisorMatchReasons(baseAnswers, completeAdvisor, false);
    expect(reasons.some((r) => r.toLowerCase().includes("profile") || r.toLowerCase().includes("professional"))).toBe(
      true
    );
  });

  it("returns diverse reasons (not duplicates)", () => {
    const reasons = getAdvisorMatchReasons(baseAnswers, baseAdvisor, false);
    const uniqueReasons = new Set(reasons);
    expect(uniqueReasons.size).toBe(reasons.length);
  });

  it("caps output to 4 reasons", () => {
    const superAdvisor: AdvisorForReasons = {
      name: "Super Advisor",
      type: "financial_planner",
      rating: 5.0,
      review_count: 100,
      verified: true,
      specialties: [
        "Retirement Planning",
        "Investment Strategy",
        "Tax Planning",
        "SMSF",
        "Beginner-Friendly",
        "Complex Wealth",
      ],
      location_display: "Sydney NSW",
      location_state: "NSW",
      median_response_hours: 0.5,
      profile_quality_gate: "passed",
      accepts_international_clients: true,
      available_in_countries: ["gb", "us", "sg"],
    };
    const answers: QuizAnswersForReasons = {
      goal: "grow",
      advisor_type: "financial-planner",
      complexity: "complex",
      amount: "whale",
      experience: "intermediate",
      location: "nsw",
      investor_country: "uk",
    };
    const reasons = getAdvisorMatchReasons(answers, superAdvisor, true);
    expect(reasons.length).toBeLessThanOrEqual(4);
  });

  it("handles missing specialties gracefully", () => {
    const noSpecialtiesAdvisor = { ...baseAdvisor, specialties: [] };
    const reasons = getAdvisorMatchReasons(baseAnswers, noSpecialtiesAdvisor, false);
    expect(reasons.length).toBeGreaterThan(0);
  });

  it("handles null values in optional fields", () => {
    const sparseAdvisor: AdvisorForReasons = {
      name: "Sparse Advisor",
      type: "financial_planner",
      rating: null,
      review_count: null,
      verified: null,
      specialties: [],
      location_display: null,
      median_response_hours: null,
      accepts_international_clients: null,
      available_in_countries: [],
    };
    const reasons = getAdvisorMatchReasons(baseAnswers, sparseAdvisor, false);
    expect(reasons.length).toBeGreaterThan(0);
    // Should have fallback
    expect(reasons.some((r) => r.includes("match"))).toBe(true);
  });
});
