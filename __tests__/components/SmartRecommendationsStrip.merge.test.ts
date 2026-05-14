/**
 * Tests for the mergeProfileSignals helper. The function isn't exported
 * from SmartRecommendationsStrip.tsx (internal); we test the resulting
 * ranker behaviour indirectly via rankBrokers/rankAdvisors with merged
 * profile shapes.
 */

import { describe, it, expect } from "vitest";
import { rankBrokers } from "@/components/SmartRecommendationsStrip";
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

const brokers = [
  { slug: "premium",  name: "Premium", rating: 4.5, logo_url: null, platform_type: "share_broker", asx_fee_value: 25, us_fee_value: 0,    country_eligibility: null },
  { slug: "cheap",    name: "Cheap",   rating: 3.5, logo_url: null, platform_type: "share_broker", asx_fee_value: 2,  us_fee_value: 0.99, country_eligibility: null },
];

describe("mergeProfileSignals semantics (via ranker)", () => {
  it("investor_profiles columns drive the ranker when present", () => {
    // Simulate a profile that came from investor_profiles columns:
    // budget=small, experience=beginner. The ranker should bump cheap.
    const merged = baseProfile({ budget: "small", experience: "beginner" });
    const out = rankBrokers(brokers, merged).map((b) => b.slug);
    expect(out[0]).toBe("cheap");
  });

  it("falls back to ranking by rating when profile has no useful fields", () => {
    const merged = baseProfile();
    const out = rankBrokers(brokers, merged).map((b) => b.slug);
    expect(out).toEqual(["premium", "cheap"]);
  });

  it("treats null profile (zero signals) the same as 'rating only'", () => {
    expect(rankBrokers(brokers, null).map((b) => b.slug)).toEqual([
      "premium",
      "cheap",
    ]);
  });
});
