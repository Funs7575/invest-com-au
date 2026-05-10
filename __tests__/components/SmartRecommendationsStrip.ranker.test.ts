import { describe, it, expect } from "vitest";
import { rankBrokers, rankAdvisors } from "@/components/SmartRecommendationsStrip";
import type { QuizProfile } from "@/lib/quiz-profile";

const baseProfile = (overrides: Partial<QuizProfile> = {}): QuizProfile => ({
  sessionId: "s1",
  vertical: null,
  topMatchSlug: null,
  intentCountry: null,
  budget: null,
  experience: null,
  completedAt: null,
  createdAt: "2026-05-10T00:00:00Z",
  ...overrides,
});

describe("rankBrokers", () => {
  const brokers = [
    { slug: "premium-pricey",  name: "Premium",  rating: 4.5, logo_url: null, platform_type: "share_broker", asx_fee_value: 25, us_fee_value: 0,    country_eligibility: null },
    { slug: "mid-balanced",    name: "Mid",      rating: 4.0, logo_url: null, platform_type: "share_broker", asx_fee_value: 8,  us_fee_value: 5,    country_eligibility: null },
    { slug: "cheap-low-rating",name: "Cheap",    rating: 3.5, logo_url: null, platform_type: "share_broker", asx_fee_value: 2,  us_fee_value: 0.99, country_eligibility: null },
  ];

  it("falls back to rating order when profile is null", () => {
    const out = rankBrokers(brokers, null).map((b) => b.slug);
    expect(out).toEqual(["premium-pricey", "mid-balanced", "cheap-low-rating"]);
  });

  it("budget=small bumps cheap brokers above premium", () => {
    const out = rankBrokers(brokers, baseProfile({ budget: "small" })).map((b) => b.slug);
    // Cheap broker gets +15 (≤5 fee) → 35+15 = 50; premium loses -8 → 45-8=37
    expect(out[0]).toBe("cheap-low-rating");
  });

  it("budget=whale rewards low-US-fee brokers", () => {
    const whaleProfile = baseProfile({ budget: "whale" });
    const out = rankBrokers(brokers, whaleProfile).map((b) => b.slug);
    // premium: 45 base + 10 (us_fee 0 ≤ 1) = 55
    // cheap: 35 base + 10 (us_fee 0.99 ≤ 1) = 45
    // mid: 40 base + 0 (us_fee 5 > 1) = 40
    expect(out).toEqual(["premium-pricey", "cheap-low-rating", "mid-balanced"]);
  });

  it("experience=beginner rewards low-fee brokers", () => {
    const out = rankBrokers(brokers, baseProfile({ experience: "beginner" })).map((b) => b.slug);
    // cheap: 35 + 6 (≤5 fee) = 41
    // premium: 45 + 0 = 45 — still wins on rating
    expect(out[0]).toBe("premium-pricey"); // rating still dominates
  });

  it("budget=small + experience=beginner stack their bonuses on cheap", () => {
    const out = rankBrokers(brokers, baseProfile({ budget: "small", experience: "beginner" })).map((b) => b.slug);
    // cheap: 35 + 15 (small) + 6 (beginner) = 56
    // premium: 45 - 8 (small w/ expensive fee) = 37
    expect(out[0]).toBe("cheap-low-rating");
  });

  it("treats null fee values as no-bonus (not crash)", () => {
    const noisy = [
      { slug: "x", name: "X", rating: 4, logo_url: null, platform_type: null, asx_fee_value: null, us_fee_value: null, country_eligibility: null },
      { slug: "y", name: "Y", rating: 3, logo_url: null, platform_type: null, asx_fee_value: 3,    us_fee_value: 0,    country_eligibility: null },
    ];
    const out = rankBrokers(noisy, baseProfile({ budget: "small", experience: "beginner" })).map((b) => b.slug);
    // y: 30 + 15 + 6 = 51
    // x: 40 + 0 + 0 = 40
    expect(out[0]).toBe("y");
  });
});

describe("rankAdvisors", () => {
  const advisors = [
    { slug: "vip-advisor",    name: "VIP",      firm_name: null, type: "wealth", photo_url: null, rating: 4.0, advisor_tier: "vip",     country_eligibility: null },
    { slug: "premium-advisor",name: "Premium",  firm_name: null, type: "fp",     photo_url: null, rating: 4.2, advisor_tier: "premium", country_eligibility: null },
    { slug: "standard-advisor",name:"Standard", firm_name: null, type: "fp",     photo_url: null, rating: 4.5, advisor_tier: "standard",country_eligibility: null },
  ];

  it("falls back to rating order when profile is null", () => {
    const out = rankAdvisors(advisors, null).map((a) => a.slug);
    expect(out).toEqual(["standard-advisor", "premium-advisor", "vip-advisor"]);
  });

  it("budget=whale promotes premium + vip tiers", () => {
    const out = rankAdvisors(advisors, baseProfile({ budget: "whale" })).map((a) => a.slug);
    // standard: 45 + 0 = 45
    // premium: 42 + 12 = 54
    // vip:     40 + 12 = 52
    expect(out).toEqual(["premium-advisor", "vip-advisor", "standard-advisor"]);
  });

  it("budget=small de-prioritises VIP advisors", () => {
    const out = rankAdvisors(advisors, baseProfile({ budget: "small" })).map((a) => a.slug);
    // standard: 45
    // premium:  42
    // vip:      40 - 8 = 32
    expect(out).toEqual(["standard-advisor", "premium-advisor", "vip-advisor"]);
  });

  it("treats unknown advisor_tier values as no-bonus", () => {
    const odd = [
      { slug: "weird", name: "Weird", firm_name: null, type: "fp", photo_url: null, rating: 4.0, advisor_tier: "freelancer", country_eligibility: null },
      { slug: "premium", name: "Premium", firm_name: null, type: "fp", photo_url: null, rating: 4.0, advisor_tier: "premium", country_eligibility: null },
    ];
    const out = rankAdvisors(odd, baseProfile({ budget: "whale" })).map((a) => a.slug);
    expect(out[0]).toBe("premium"); // gets the +12 bonus
  });
});
