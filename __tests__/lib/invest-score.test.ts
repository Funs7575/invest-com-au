import { describe, it, expect } from "vitest";
import { computeInvestScore, scoreLabel } from "@/lib/invest-score";

// ── scoreLabel ─────────────────────────────────────────────────────────────────

describe("scoreLabel", () => {
  it("returns 'Very Cautious' for score < 25", () => {
    expect(scoreLabel(0)).toBe("Very Cautious");
    expect(scoreLabel(24.9)).toBe("Very Cautious");
  });

  it("returns 'Cautious' for score 25–39", () => {
    expect(scoreLabel(25)).toBe("Cautious");
    expect(scoreLabel(39.9)).toBe("Cautious");
  });

  it("returns 'Neutral' for score 40–54", () => {
    expect(scoreLabel(40)).toBe("Neutral");
    expect(scoreLabel(54.9)).toBe("Neutral");
  });

  it("returns 'Constructive' for score 55–69", () => {
    expect(scoreLabel(55)).toBe("Constructive");
    expect(scoreLabel(69.9)).toBe("Constructive");
  });

  it("returns 'Positive' for score 70–84", () => {
    expect(scoreLabel(70)).toBe("Positive");
    expect(scoreLabel(84.9)).toBe("Positive");
  });

  it("returns 'Very Positive' for score >= 85", () => {
    expect(scoreLabel(85)).toBe("Very Positive");
    expect(scoreLabel(100)).toBe("Very Positive");
  });
});

// ── computeInvestScore ─────────────────────────────────────────────────────────

describe("computeInvestScore", () => {
  const neutral = {
    avgSavingsRateBps: null,
    netRateChangeBps30d: null,
    enquiriesLast7d: 0,
    enquiriesDays8to30: 0,
    activeBrokerCount: 0,
  };

  it("returns all-50 components with neutral inputs (no data)", () => {
    const { components } = computeInvestScore(neutral);
    // null inputs default to 50; zero broker count → 0 breadth
    expect(components.rateLevel).toBe(50);
    expect(components.rateMomentum).toBe(50);
    // platformActivity: 0/7 vs 0/23 — ratio undefined → absolute scale → 0
    expect(components.platformActivity).toBe(0);
    expect(components.marketBreadth).toBe(0);
  });

  it("score is a number between 0 and 100", () => {
    const { score } = computeInvestScore(neutral);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("higher savings rate produces higher rate level component", () => {
    const low = computeInvestScore({ ...neutral, avgSavingsRateBps: 200 });   // 2%
    const high = computeInvestScore({ ...neutral, avgSavingsRateBps: 450 }); // 4.5%
    expect(high.components.rateLevel).toBeGreaterThan(low.components.rateLevel);
  });

  it("500 bps savings rate gives maximum rate level score (100)", () => {
    const { components } = computeInvestScore({ ...neutral, avgSavingsRateBps: 500 });
    expect(components.rateLevel).toBe(100);
  });

  it("0 bps savings rate gives minimum rate level score (0)", () => {
    const { components } = computeInvestScore({ ...neutral, avgSavingsRateBps: 0 });
    expect(components.rateLevel).toBe(0);
  });

  it("net rate hike increases momentum component above 50", () => {
    const { components } = computeInvestScore({ ...neutral, netRateChangeBps30d: 100 });
    expect(components.rateMomentum).toBeGreaterThan(50);
  });

  it("net rate cut decreases momentum component below 50", () => {
    const { components } = computeInvestScore({ ...neutral, netRateChangeBps30d: -100 });
    expect(components.rateMomentum).toBeLessThan(50);
  });

  it("zero net rate change gives exactly 50 momentum", () => {
    const { components } = computeInvestScore({ ...neutral, netRateChangeBps30d: 0 });
    expect(components.rateMomentum).toBe(50);
  });

  it("rate momentum is clamped to [0, 100]", () => {
    const { components: low } = computeInvestScore({ ...neutral, netRateChangeBps30d: -9999 });
    const { components: high } = computeInvestScore({ ...neutral, netRateChangeBps30d: 9999 });
    expect(low.rateMomentum).toBe(0);
    expect(high.rateMomentum).toBe(100);
  });

  it("above-baseline enquiry activity produces platform score > 50", () => {
    // last7d avg = 20/day, baseline avg = 10/day → ratio 2 → score 100
    const { components } = computeInvestScore({
      ...neutral,
      enquiriesLast7d: 140,   // 20/day
      enquiriesDays8to30: 230, // 10/day
    });
    expect(components.platformActivity).toBeGreaterThan(50);
  });

  it("at-parity enquiry activity produces platform score of 50", () => {
    // last7d avg = 10/day, baseline avg = 10/day → ratio 1 → score 50
    const { components } = computeInvestScore({
      ...neutral,
      enquiriesLast7d: 70,   // 10/day
      enquiriesDays8to30: 230, // 10/day
    });
    expect(components.platformActivity).toBe(50);
  });

  it("50 active brokers gives maximum market breadth score (100)", () => {
    const { components } = computeInvestScore({ ...neutral, activeBrokerCount: 50 });
    expect(components.marketBreadth).toBe(100);
  });

  it("market breadth is clamped to 100", () => {
    const { components } = computeInvestScore({ ...neutral, activeBrokerCount: 999 });
    expect(components.marketBreadth).toBe(100);
  });

  it("returns correct composite label in the result", () => {
    const result = computeInvestScore({
      avgSavingsRateBps: 450,
      netRateChangeBps30d: 50,
      enquiriesLast7d: 70,
      enquiriesDays8to30: 230,
      activeBrokerCount: 30,
    });
    expect(result.label).toBe(scoreLabel(result.score));
  });

  it("all-maximum inputs produce a very high score", () => {
    const { score } = computeInvestScore({
      avgSavingsRateBps: 600,
      netRateChangeBps30d: 9999,
      enquiriesLast7d: 9999,
      enquiriesDays8to30: 1,
      activeBrokerCount: 999,
    });
    expect(score).toBeGreaterThanOrEqual(80);
  });
});
