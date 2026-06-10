import { describe, it, expect } from "vitest";
import {
  computeQualityScores,
  effectiveRateCents,
  MIN_IMPRESSIONS_FOR_CTR,
  MIN_CLICKS_FOR_CR,
  QUALITY_MULTIPLIER_MIN,
  QUALITY_MULTIPLIER_MAX,
  CTR_WEIGHT,
  CR_WEIGHT,
  type CampaignQualityInputs,
} from "@/lib/marketplace/quality-score";

function input(over: Partial<CampaignQualityInputs> & { campaign_id: number }): CampaignQualityInputs {
  return { impressions_30d: 0, clicks_30d: 0, conversions_30d: 0, ...over };
}

describe("marketplace/quality-score", () => {
  describe("cold start / insufficient data", () => {
    it("scores a campaign with zero history as neutral 1.0", () => {
      const scores = computeQualityScores([input({ campaign_id: 1 })]);
      const s = scores.get(1);
      expect(s?.multiplier).toBe(1.0);
      expect(s?.reason).toBe("insufficient_data");
      expect(s?.ctr).toBeNull();
      expect(s?.cr).toBeNull();
    });

    it("treats impressions just below the CTR threshold as insufficient", () => {
      const scores = computeQualityScores([
        input({ campaign_id: 1, impressions_30d: MIN_IMPRESSIONS_FOR_CTR - 1, clicks_30d: 5 }),
      ]);
      expect(scores.get(1)?.ctr).toBeNull();
      expect(scores.get(1)?.multiplier).toBe(1.0);
    });

    it("treats clicks just below the CR threshold as insufficient for CR", () => {
      const scores = computeQualityScores([
        input({
          campaign_id: 1,
          impressions_30d: 1000,
          clicks_30d: MIN_CLICKS_FOR_CR - 1,
          conversions_30d: 5,
        }),
      ]);
      expect(scores.get(1)?.cr).toBeNull();
      // CTR is available though
      expect(scores.get(1)?.ctr).toBeCloseTo((MIN_CLICKS_FOR_CR - 1) / 1000);
    });
  });

  describe("cohort-relative scoring", () => {
    it("scores a single campaign at exactly the cohort average → neutral 1.0", () => {
      const scores = computeQualityScores([
        input({ campaign_id: 1, impressions_30d: 1000, clicks_30d: 30, conversions_30d: 6 }),
      ]);
      const s = scores.get(1);
      // It IS the cohort, so relCtr = relCr = 1 → blended exactly 1.0
      expect(s?.multiplier).toBeCloseTo(1.0);
      expect(s?.reason).toBe("scored");
    });

    it("ranks an above-average performer above 1.0 and below-average below 1.0", () => {
      const scores = computeQualityScores([
        input({ campaign_id: 1, impressions_30d: 1000, clicks_30d: 60 }), // 6% CTR
        input({ campaign_id: 2, impressions_30d: 1000, clicks_30d: 20 }), // 2% CTR
      ]);
      // avg CTR = 4%; rel: 1.5 and 0.5
      expect(scores.get(1)!.multiplier).toBeGreaterThan(1.0);
      expect(scores.get(2)!.multiplier).toBeLessThan(1.0);
    });

    it("blends CTR and CR with the documented weights", () => {
      const scores = computeQualityScores([
        input({ campaign_id: 1, impressions_30d: 1000, clicks_30d: 40, conversions_30d: 8 }),
        input({ campaign_id: 2, impressions_30d: 1000, clicks_30d: 20, conversions_30d: 2 }),
      ]);
      // ctr: 4% and 2% (avg 3%); cr: 20% and 10% (avg 15%)
      const expected1 = CTR_WEIGHT * (0.04 / 0.03) + CR_WEIGHT * (0.2 / 0.15);
      expect(scores.get(1)!.multiplier).toBeCloseTo(Math.min(expected1, QUALITY_MULTIPLIER_MAX));
    });

    it("clamps extreme outperformance at the max multiplier", () => {
      const scores = computeQualityScores([
        input({ campaign_id: 1, impressions_30d: 10000, clicks_30d: 1000 }), // 10% CTR
        input({ campaign_id: 2, impressions_30d: 10000, clicks_30d: 10 }), // 0.1% CTR
      ]);
      expect(scores.get(1)!.multiplier).toBe(QUALITY_MULTIPLIER_MAX);
    });

    it("clamps extreme underperformance at the min multiplier", () => {
      const scores = computeQualityScores([
        input({ campaign_id: 1, impressions_30d: 10000, clicks_30d: 1000 }),
        input({ campaign_id: 2, impressions_30d: 10000, clicks_30d: 10 }),
      ]);
      expect(scores.get(2)!.multiplier).toBe(QUALITY_MULTIPLIER_MIN);
    });

    it("never penalises a cold-start campaign competing against veterans", () => {
      const scores = computeQualityScores([
        input({ campaign_id: 1, impressions_30d: 10000, clicks_30d: 800, conversions_30d: 200 }),
        input({ campaign_id: 2 }), // brand new
      ]);
      expect(scores.get(2)?.multiplier).toBe(1.0);
      expect(scores.get(2)?.reason).toBe("insufficient_data");
    });

    it("handles a zero cohort average without dividing by zero", () => {
      // Both have enough impressions but zero clicks → ctr 0, avg 0
      const scores = computeQualityScores([
        input({ campaign_id: 1, impressions_30d: 1000, clicks_30d: 0 }),
        input({ campaign_id: 2, impressions_30d: 1000, clicks_30d: 0 }),
      ]);
      expect(scores.get(1)?.multiplier).toBe(1.0);
      expect(scores.get(2)?.multiplier).toBe(1.0);
    });

    it("handles an empty candidate list", () => {
      const scores = computeQualityScores([]);
      expect(scores.size).toBe(0);
    });
  });

  describe("effectiveRateCents", () => {
    it("multiplies and rounds to whole cents", () => {
      expect(effectiveRateCents(500, 1.0)).toBe(500);
      expect(effectiveRateCents(500, 0.5)).toBe(250);
      expect(effectiveRateCents(333, 1.5)).toBe(500); // 499.5 rounds to 500
    });
  });
});
