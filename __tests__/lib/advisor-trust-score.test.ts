/**
 * __tests__/lib/advisor-trust-score.test.ts
 *
 * Unit tests for the Advisor Trust Score scorer.
 *
 * Covers:
 *   - Each dimension in isolation (happy path + edge cases)
 *   - Weighting / overall calculation
 *   - Edge cases: no reviews, brand-new advisor, missing fields,
 *     fully-populated advisor, all-zeros, all-maxed
 */

import { describe, it, expect } from "vitest";
import {
  computeAdvisorTrustScore,
  trustScoreLabel,
  trustScoreLabelColor,
  WEIGHT_VERIFICATION,
  WEIGHT_TRACK_RECORD,
  WEIGHT_TRANSPARENCY,
  WEIGHT_CLIENT_FEEDBACK,
  type AdvisorTrustScoreInput,
} from "@/lib/advisor-trust-score";

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

/**
 * Returns an ISO-8601 date N years ago from a fixed reference date.
 * Uses millisecond arithmetic so fractional years work correctly
 * (setFullYear truncates floats, so yearsAgo(0.2) would give 1 year with that approach).
 */
function yearsAgo(n: number): string {
  const REF_MS = new Date("2026-05-25T00:00:00Z").getTime();
  return new Date(REF_MS - n * 365.25 * 24 * 60 * 60 * 1000).toISOString();
}

/** Minimal valid input with no positive signals. */
const BLANK: AdvisorTrustScoreInput = {
  verified: null,
  afsl_number: null,
  registration_number: null,
  verified_at: null,
  created_at: null,
  years_experience: null,
  bio: null,
  photo_url: null,
  qualifications: null,
  education: null,
  memberships: null,
  fee_structure: null,
  fee_description: null,
  linkedin_url: null,
  website: null,
  languages: null,
  rating: null,
  review_count: null,
};

/** Fully-populated "gold standard" advisor. */
const GOLD: AdvisorTrustScoreInput = {
  verified: true,
  afsl_number: "123456",
  registration_number: "1234567",
  verified_at: new Date("2026-03-01T00:00:00Z").toISOString(), // within 12 months of 2026-05-25
  created_at: yearsAgo(15),
  years_experience: 20,
  bio: "I have more than 20 years helping clients achieve financial independence.",
  photo_url: "https://example.com/photo.jpg",
  qualifications: ["CFP", "CPA"],
  education: [{ institution: "UNSW", degree: "B.Comm" }],
  memberships: ["FPA", "CFA Institute"],
  fee_structure: "fee_only",
  fee_description: "Flat annual retainer from $2,000",
  linkedin_url: "https://linkedin.com/in/example",
  website: "https://example.com",
  languages: ["English", "Mandarin"],
  rating: 5.0,
  review_count: 30,
};

/* ─── Weight constants ─────────────────────────────────────────────────────── */

describe("weight constants", () => {
  it("weights sum to 1.0", () => {
    const total =
      WEIGHT_VERIFICATION +
      WEIGHT_TRACK_RECORD +
      WEIGHT_TRANSPARENCY +
      WEIGHT_CLIENT_FEEDBACK;
    expect(total).toBeCloseTo(1.0);
  });
});

/* ─── trustScoreLabel ──────────────────────────────────────────────────────── */

describe("trustScoreLabel", () => {
  it("returns Strong for 80+", () => {
    expect(trustScoreLabel(80)).toBe("Strong");
    expect(trustScoreLabel(100)).toBe("Strong");
  });
  it("returns Good for 65–79", () => {
    expect(trustScoreLabel(65)).toBe("Good");
    expect(trustScoreLabel(79)).toBe("Good");
  });
  it("returns Moderate for 50–64", () => {
    expect(trustScoreLabel(50)).toBe("Moderate");
    expect(trustScoreLabel(64)).toBe("Moderate");
  });
  it("returns Limited below 50", () => {
    expect(trustScoreLabel(0)).toBe("Limited");
    expect(trustScoreLabel(49)).toBe("Limited");
  });
});

/* ─── trustScoreLabelColor ────────────────────────────────────────────────── */

describe("trustScoreLabelColor", () => {
  it("returns emerald for 65+", () => {
    expect(trustScoreLabelColor(65)).toContain("emerald");
    expect(trustScoreLabelColor(80)).toContain("emerald");
  });
  it("returns amber for 50–64", () => {
    expect(trustScoreLabelColor(50)).toContain("amber");
  });
  it("returns slate for below 50", () => {
    expect(trustScoreLabelColor(40)).toContain("slate");
  });
});

/* ─── Verification dimension ───────────────────────────────────────────────── */

describe("verification dimension", () => {
  it("blank profile → 0", () => {
    const result = computeAdvisorTrustScore(BLANK);
    const dim = result.dimensions.find((d) => d.key === "verification")!;
    expect(dim.score).toBe(0);
  });

  it("verified only → 50 pts", () => {
    const result = computeAdvisorTrustScore({ ...BLANK, verified: true });
    const dim = result.dimensions.find((d) => d.key === "verification")!;
    expect(dim.score).toBe(50);
  });

  it("AFSL present → +30 pts (on top of verified)", () => {
    const result = computeAdvisorTrustScore({
      ...BLANK,
      verified: true,
      afsl_number: "123456",
    });
    const dim = result.dimensions.find((d) => d.key === "verification")!;
    expect(dim.score).toBe(80);
  });

  it("registration number → +10 pts more", () => {
    const result = computeAdvisorTrustScore({
      ...BLANK,
      verified: true,
      afsl_number: "123456",
      registration_number: "AR-001",
    });
    const dim = result.dimensions.find((d) => d.key === "verification")!;
    expect(dim.score).toBe(90);
  });

  it("freshness bonus: verified within 12 months → +10 pts on top", () => {
    const result = computeAdvisorTrustScore({
      ...BLANK,
      verified: true,
      verified_at: new Date("2026-03-01T00:00:00Z").toISOString(),
    });
    const dim = result.dimensions.find((d) => d.key === "verification")!;
    // 50 (verified) + 10 (freshness) = 60
    expect(dim.score).toBe(60);
  });

  it("freshness bonus: verified > 12 months ago → no bonus", () => {
    const result = computeAdvisorTrustScore({
      ...BLANK,
      verified: true,
      verified_at: yearsAgo(2),
    });
    const dim = result.dimensions.find((d) => d.key === "verification")!;
    expect(dim.score).toBe(50); // no freshness bonus
  });

  it("AFSL with whitespace-only value → not counted", () => {
    const result = computeAdvisorTrustScore({ ...BLANK, afsl_number: "   " });
    const dim = result.dimensions.find((d) => d.key === "verification")!;
    expect(dim.score).toBe(0);
  });

  it("full gold advisor → 100 (capped)", () => {
    const result = computeAdvisorTrustScore(GOLD);
    const dim = result.dimensions.find((d) => d.key === "verification")!;
    expect(dim.score).toBe(100);
  });

  it("weight is WEIGHT_VERIFICATION", () => {
    const result = computeAdvisorTrustScore(BLANK);
    const dim = result.dimensions.find((d) => d.key === "verification")!;
    expect(dim.weight).toBe(WEIGHT_VERIFICATION);
  });
});

/* ─── Track Record dimension ───────────────────────────────────────────────── */

describe("track_record dimension", () => {
  it("blank input → 10 (floor)", () => {
    const result = computeAdvisorTrustScore(BLANK);
    const dim = result.dimensions.find((d) => d.key === "track_record")!;
    expect(dim.score).toBe(10);
  });

  it("brand-new advisor (created_at < 1 year ago) → 10", () => {
    const result = computeAdvisorTrustScore({
      ...BLANK,
      created_at: yearsAgo(0.2), // ~2-3 months
    });
    const dim = result.dimensions.find((d) => d.key === "track_record")!;
    expect(dim.score).toBe(10);
  });

  it("1–2 years tenure → 25", () => {
    const result = computeAdvisorTrustScore({
      ...BLANK,
      created_at: yearsAgo(1.5),
    });
    const dim = result.dimensions.find((d) => d.key === "track_record")!;
    expect(dim.score).toBe(25);
  });

  it("3–4 years tenure → 40", () => {
    const result = computeAdvisorTrustScore({
      ...BLANK,
      created_at: yearsAgo(3.5),
    });
    const dim = result.dimensions.find((d) => d.key === "track_record")!;
    expect(dim.score).toBe(40);
  });

  it("5–6 years tenure → 55", () => {
    const result = computeAdvisorTrustScore({
      ...BLANK,
      created_at: yearsAgo(5.5),
    });
    const dim = result.dimensions.find((d) => d.key === "track_record")!;
    expect(dim.score).toBe(55);
  });

  it("7–9 years tenure → 70", () => {
    const result = computeAdvisorTrustScore({
      ...BLANK,
      created_at: yearsAgo(8),
    });
    const dim = result.dimensions.find((d) => d.key === "track_record")!;
    expect(dim.score).toBe(70);
  });

  it("10–14 years tenure → 85", () => {
    const result = computeAdvisorTrustScore({
      ...BLANK,
      created_at: yearsAgo(12),
    });
    const dim = result.dimensions.find((d) => d.key === "track_record")!;
    expect(dim.score).toBe(85);
  });

  it("15+ years tenure → 100", () => {
    const result = computeAdvisorTrustScore({
      ...BLANK,
      created_at: yearsAgo(20),
    });
    const dim = result.dimensions.find((d) => d.key === "track_record")!;
    expect(dim.score).toBe(100);
  });

  it("self-reported years_experience used when created_at is null", () => {
    const result = computeAdvisorTrustScore({
      ...BLANK,
      years_experience: 12,
    });
    const dim = result.dimensions.find((d) => d.key === "track_record")!;
    expect(dim.score).toBe(85);
  });

  it("picks max of tenure vs years_experience", () => {
    // platform tenure = 3 years → score 40
    // self-reported = 15 years → score 100
    // should use 15 years → 100
    const result = computeAdvisorTrustScore({
      ...BLANK,
      created_at: yearsAgo(3),
      years_experience: 15,
    });
    const dim = result.dimensions.find((d) => d.key === "track_record")!;
    expect(dim.score).toBe(100);
  });

  it("weight is WEIGHT_TRACK_RECORD", () => {
    const result = computeAdvisorTrustScore(BLANK);
    const dim = result.dimensions.find((d) => d.key === "track_record")!;
    expect(dim.weight).toBe(WEIGHT_TRACK_RECORD);
  });
});

/* ─── Transparency dimension ───────────────────────────────────────────────── */

describe("transparency dimension", () => {
  it("blank input → 0", () => {
    const result = computeAdvisorTrustScore(BLANK);
    const dim = result.dimensions.find((d) => d.key === "transparency")!;
    expect(dim.score).toBe(0);
  });

  it("bio under 30 chars → not counted", () => {
    const result = computeAdvisorTrustScore({ ...BLANK, bio: "Short bio." });
    const dim = result.dimensions.find((d) => d.key === "transparency")!;
    expect(dim.score).toBe(0);
  });

  it("bio 30+ chars → 20 pts", () => {
    const result = computeAdvisorTrustScore({
      ...BLANK,
      bio: "This is a long enough bio that should count for points.",
    });
    const dim = result.dimensions.find((d) => d.key === "transparency")!;
    expect(dim.score).toBe(20);
  });

  it("photo → 15 pts", () => {
    const result = computeAdvisorTrustScore({
      ...BLANK,
      photo_url: "https://example.com/photo.jpg",
    });
    const dim = result.dimensions.find((d) => d.key === "transparency")!;
    expect(dim.score).toBe(15);
  });

  it("qualifications array → 15 pts", () => {
    const result = computeAdvisorTrustScore({
      ...BLANK,
      qualifications: ["CFP"],
    });
    const dim = result.dimensions.find((d) => d.key === "transparency")!;
    expect(dim.score).toBe(15);
  });

  it("empty qualifications array → 0", () => {
    const result = computeAdvisorTrustScore({ ...BLANK, qualifications: [] });
    const dim = result.dimensions.find((d) => d.key === "transparency")!;
    expect(dim.score).toBe(0);
  });

  it("fee_description alone → 15 pts", () => {
    const result = computeAdvisorTrustScore({
      ...BLANK,
      fee_description: "Fixed annual fee from $2,000",
    });
    const dim = result.dimensions.find((d) => d.key === "transparency")!;
    expect(dim.score).toBe(15);
  });

  it("linkedin_url → online presence (+10 pts)", () => {
    const result = computeAdvisorTrustScore({
      ...BLANK,
      linkedin_url: "https://linkedin.com/in/test",
    });
    const dim = result.dimensions.find((d) => d.key === "transparency")!;
    expect(dim.score).toBe(10);
  });

  it("languages with only 1 entry → not counted (need >1)", () => {
    const result = computeAdvisorTrustScore({
      ...BLANK,
      languages: ["English"],
    });
    const dim = result.dimensions.find((d) => d.key === "transparency")!;
    expect(dim.score).toBe(0);
  });

  it("2+ languages → 5 pts", () => {
    const result = computeAdvisorTrustScore({
      ...BLANK,
      languages: ["English", "Mandarin"],
    });
    const dim = result.dimensions.find((d) => d.key === "transparency")!;
    expect(dim.score).toBe(5);
  });

  it("gold advisor → 100 (capped)", () => {
    const result = computeAdvisorTrustScore(GOLD);
    const dim = result.dimensions.find((d) => d.key === "transparency")!;
    expect(dim.score).toBe(100);
  });

  it("weight is WEIGHT_TRANSPARENCY", () => {
    const result = computeAdvisorTrustScore(BLANK);
    const dim = result.dimensions.find((d) => d.key === "transparency")!;
    expect(dim.weight).toBe(WEIGHT_TRANSPARENCY);
  });
});

/* ─── Client Feedback dimension ────────────────────────────────────────────── */

describe("client_feedback dimension", () => {
  it("no reviews → 0", () => {
    const result = computeAdvisorTrustScore(BLANK);
    const dim = result.dimensions.find((d) => d.key === "client_feedback")!;
    expect(dim.score).toBe(0);
  });

  it("0 reviews via explicit zero → 0", () => {
    const result = computeAdvisorTrustScore({
      ...BLANK,
      review_count: 0,
      rating: 5.0,
    });
    const dim = result.dimensions.find((d) => d.key === "client_feedback")!;
    expect(dim.score).toBe(0);
  });

  it("1 review, 5.0 rating → (20 + 100) / 2 = 60", () => {
    const result = computeAdvisorTrustScore({
      ...BLANK,
      review_count: 1,
      rating: 5.0,
    });
    const dim = result.dimensions.find((d) => d.key === "client_feedback")!;
    expect(dim.score).toBe(60);
  });

  it("1 review, 3.0 rating → (20 + 0) / 2 = 10", () => {
    const result = computeAdvisorTrustScore({
      ...BLANK,
      review_count: 1,
      rating: 3.0,
    });
    const dim = result.dimensions.find((d) => d.key === "client_feedback")!;
    expect(dim.score).toBe(10);
  });

  it("rating below 3.0 → quality sub-score 0", () => {
    const result = computeAdvisorTrustScore({
      ...BLANK,
      review_count: 5,
      rating: 2.0,
    });
    const dim = result.dimensions.find((d) => d.key === "client_feedback")!;
    // volume: 60, quality: 0 → avg 30
    expect(dim.score).toBe(30);
  });

  it("5 reviews, 4.0 rating → expected combined", () => {
    // volume 5 → 60; quality: (4.0 - 3.0)/2.0 * 100 = 50 → avg = 55
    const result = computeAdvisorTrustScore({
      ...BLANK,
      review_count: 5,
      rating: 4.0,
    });
    const dim = result.dimensions.find((d) => d.key === "client_feedback")!;
    expect(dim.score).toBe(55);
  });

  it("10 reviews, 4.5 rating → expected combined", () => {
    // volume 10 → 80; quality: (4.5 - 3.0)/2.0 * 100 = 75 → avg = 77 (rounded from 77.5)
    const result = computeAdvisorTrustScore({
      ...BLANK,
      review_count: 10,
      rating: 4.5,
    });
    const dim = result.dimensions.find((d) => d.key === "client_feedback")!;
    expect(dim.score).toBe(78); // Math.round((80 + 75) / 2) = 78 (JS rounds 77.5 to 78)
  });

  it("20+ reviews, 5.0 → 100", () => {
    const result = computeAdvisorTrustScore({
      ...BLANK,
      review_count: 25,
      rating: 5.0,
    });
    const dim = result.dimensions.find((d) => d.key === "client_feedback")!;
    expect(dim.score).toBe(100);
  });

  it("weight is WEIGHT_CLIENT_FEEDBACK", () => {
    const result = computeAdvisorTrustScore(BLANK);
    const dim = result.dimensions.find((d) => d.key === "client_feedback")!;
    expect(dim.weight).toBe(WEIGHT_CLIENT_FEEDBACK);
  });
});

/* ─── Overall computation ───────────────────────────────────────────────────── */

describe("computeAdvisorTrustScore — overall", () => {
  it("blank input → low overall score", () => {
    const result = computeAdvisorTrustScore(BLANK);
    // Only non-zero signal is track_record floor (10pts × 0.25 = 2.5)
    expect(result.overall).toBeLessThan(10);
  });

  it("gold advisor → overall ≥ 90", () => {
    const result = computeAdvisorTrustScore(GOLD);
    expect(result.overall).toBeGreaterThanOrEqual(90);
  });

  it("overall is rounded integer in [0, 100]", () => {
    for (const input of [BLANK, GOLD]) {
      const result = computeAdvisorTrustScore(input);
      expect(result.overall).toBeGreaterThanOrEqual(0);
      expect(result.overall).toBeLessThanOrEqual(100);
      expect(Number.isInteger(result.overall)).toBe(true);
    }
  });

  it("returns exactly 4 dimensions", () => {
    const result = computeAdvisorTrustScore(BLANK);
    expect(result.dimensions).toHaveLength(4);
  });

  it("overall equals weighted sum of dimension scores", () => {
    const result = computeAdvisorTrustScore(GOLD);
    const manual = Math.round(
      result.dimensions.reduce((sum, d) => sum + d.score * d.weight, 0),
    );
    expect(result.overall).toBe(manual);
  });

  it("label matches overall score band", () => {
    const strong = computeAdvisorTrustScore(GOLD);
    expect(strong.label).toBe("Strong");

    const blank = computeAdvisorTrustScore(BLANK);
    expect(blank.label).toBe("Limited");
  });

  it("computedAt defaults to a recent ISO string", () => {
    const before = Date.now();
    const result = computeAdvisorTrustScore(BLANK);
    const after = Date.now();
    const ts = new Date(result.computedAt).getTime();
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });

  it("accepts an explicit computedAt value", () => {
    const ts = "2026-01-01T00:00:00Z";
    const result = computeAdvisorTrustScore(BLANK, ts);
    expect(result.computedAt).toBe(ts);
  });
});

/* ─── Edge cases ────────────────────────────────────────────────────────────── */

describe("edge cases", () => {
  it("review_count as null treated as 0", () => {
    const result = computeAdvisorTrustScore({
      ...BLANK,
      review_count: null,
      rating: 4.8,
    });
    const dim = result.dimensions.find((d) => d.key === "client_feedback")!;
    expect(dim.score).toBe(0);
  });

  it("years_experience of 0 is ignored", () => {
    const result = computeAdvisorTrustScore({ ...BLANK, years_experience: 0 });
    const dim = result.dimensions.find((d) => d.key === "track_record")!;
    // created_at null + years_experience 0 → null → floor 10
    expect(dim.score).toBe(10);
  });

  it("brand-new advisor with no reviews, no AFSL, no bio produces a low but non-zero score", () => {
    const result = computeAdvisorTrustScore({
      ...BLANK,
      created_at: new Date().toISOString(),
    });
    // track_record floor gives 10 pts × 0.25 = 2.5 → rounds to ~3
    expect(result.overall).toBeGreaterThan(0);
    expect(result.overall).toBeLessThan(10);
  });

  it("advisor with only a photo and bio still returns a valid result", () => {
    const result = computeAdvisorTrustScore({
      ...BLANK,
      photo_url: "https://cdn.example.com/photo.jpg",
      bio: "Twenty years of experience helping clients reach their financial goals.",
    });
    expect(result.overall).toBeGreaterThan(0);
    expect(result.dimensions).toHaveLength(4);
  });

  it("rating exactly at the 3.0 floor → quality sub-score 0", () => {
    const result = computeAdvisorTrustScore({
      ...BLANK,
      review_count: 10,
      rating: 3.0,
    });
    const dim = result.dimensions.find((d) => d.key === "client_feedback")!;
    // volume 10 → 80, quality → 0, avg → 40
    expect(dim.score).toBe(40);
  });

  it("rating above 5.0 is clamped to 100 quality", () => {
    // Should not be possible in practice, but guard against bad data
    const result = computeAdvisorTrustScore({
      ...BLANK,
      review_count: 20,
      rating: 6.0, // data anomaly
    });
    const dim = result.dimensions.find((d) => d.key === "client_feedback")!;
    // quality clamped to 100, volume 100 → avg 100
    expect(dim.score).toBe(100);
  });

  it("rationale strings are non-empty for every dimension", () => {
    const result = computeAdvisorTrustScore(BLANK);
    for (const d of result.dimensions) {
      expect(typeof d.rationale).toBe("string");
      expect(d.rationale.length).toBeGreaterThan(0);
    }
  });

  it("description strings are non-empty for every dimension", () => {
    const result = computeAdvisorTrustScore(GOLD);
    for (const d of result.dimensions) {
      expect(typeof d.description).toBe("string");
      expect(d.description.length).toBeGreaterThan(0);
    }
  });
});
