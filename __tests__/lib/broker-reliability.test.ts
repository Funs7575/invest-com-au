import { describe, it, expect } from "vitest";
import { computeBrokerReliability, scoreLabel } from "@/lib/broker-reliability";

describe("scoreLabel", () => {
  it("returns Excellent for scores >= 90", () => {
    expect(scoreLabel(90)).toBe("Excellent");
    expect(scoreLabel(100)).toBe("Excellent");
    expect(scoreLabel(95.5)).toBe("Excellent");
  });

  it("returns Good for 70–89", () => {
    expect(scoreLabel(70)).toBe("Good");
    expect(scoreLabel(85)).toBe("Good");
    expect(scoreLabel(89.9)).toBe("Good");
  });

  it("returns Fair for 50–69", () => {
    expect(scoreLabel(50)).toBe("Fair");
    expect(scoreLabel(60)).toBe("Fair");
    expect(scoreLabel(69.9)).toBe("Fair");
  });

  it("returns Below average for 30–49", () => {
    expect(scoreLabel(30)).toBe("Below average");
    expect(scoreLabel(45)).toBe("Below average");
    expect(scoreLabel(49.9)).toBe("Below average");
  });

  it("returns Poor for scores < 30", () => {
    expect(scoreLabel(0)).toBe("Poor");
    expect(scoreLabel(29.9)).toBe("Poor");
  });
});

describe("computeBrokerReliability", () => {
  const zeroNegatives = {
    positiveCount: 0,
    platformOutageCount: 0,
    hiddenFeesCount: 0,
    withdrawalDelayCount: 0,
    poorSupportCount: 0,
    totalReporters: 0,
  };

  it("returns neutral-positive defaults when there are no reports", () => {
    const result = computeBrokerReliability(zeroNegatives);
    // negativeToScore(0, 0) = 80 for each component, sentimentScore(0, 0) = 80
    // score = 80*0.25 + 80*0.25 + 80*0.25 + 80*0.15 + 80*0.1 = 80
    expect(result.score).toBe(80);
    expect(result.totalReports).toBe(0);
    expect(result.components.uptime).toBe(80);
    expect(result.components.feeTransparency).toBe(80);
    expect(result.components.withdrawal).toBe(80);
    expect(result.components.support).toBe(80);
    expect(result.components.sentiment).toBe(80);
  });

  it("gives a high score when all reports are positive", () => {
    const result = computeBrokerReliability({
      positiveCount: 10,
      platformOutageCount: 0,
      hiddenFeesCount: 0,
      withdrawalDelayCount: 0,
      poorSupportCount: 0,
      totalReporters: 10,
    });
    // negativeToScore(0, 10) = 100 for each incident type
    // sentimentScore(10, 10) = clamp(50 + 1*50, 50, 100) = 100
    // score = 100*0.25 + 100*0.25 + 100*0.25 + 100*0.15 + 100*0.1 = 100
    expect(result.score).toBe(100);
    expect(result.label).toBe("Excellent");
    expect(result.components.uptime).toBe(100);
    expect(result.components.sentiment).toBe(100);
  });

  it("lowers only the affected component for a single negative type", () => {
    const result = computeBrokerReliability({
      positiveCount: 0,
      platformOutageCount: 5,
      hiddenFeesCount: 0,
      withdrawalDelayCount: 0,
      poorSupportCount: 0,
      totalReporters: 10,
    });
    // platformOutageCount/totalReporters = 0.5, score = 100 - 0.5*200 = 0
    expect(result.components.uptime).toBe(0);
    // feeTransparency, withdrawal are 100 (0 negatives out of 10 reporters)
    expect(result.components.feeTransparency).toBe(100);
    expect(result.components.withdrawal).toBe(100);
    expect(result.components.support).toBe(100);
  });

  it("computes sentiment score as 50 when zero positives out of mixed total", () => {
    const result = computeBrokerReliability({
      positiveCount: 0,
      platformOutageCount: 2,
      hiddenFeesCount: 0,
      withdrawalDelayCount: 0,
      poorSupportCount: 0,
      totalReporters: 10,
    });
    // sentimentScore(0, 2) = clamp(50 + 0, 50, 100) = 50
    expect(result.components.sentiment).toBe(50);
  });

  it("clamps negative component scores to 0", () => {
    const result = computeBrokerReliability({
      positiveCount: 0,
      platformOutageCount: 100,
      hiddenFeesCount: 0,
      withdrawalDelayCount: 0,
      poorSupportCount: 0,
      totalReporters: 10,
    });
    expect(result.components.uptime).toBe(0);
  });

  it("counts totalReports as sum of all report types", () => {
    const result = computeBrokerReliability({
      positiveCount: 3,
      platformOutageCount: 1,
      hiddenFeesCount: 2,
      withdrawalDelayCount: 1,
      poorSupportCount: 1,
      totalReporters: 8,
    });
    expect(result.totalReports).toBe(8); // 3 + 1 + 2 + 1 + 1
  });

  it("returns a weighted composite score", () => {
    const result = computeBrokerReliability({
      positiveCount: 5,
      platformOutageCount: 2,
      hiddenFeesCount: 0,
      withdrawalDelayCount: 0,
      poorSupportCount: 0,
      totalReporters: 10,
    });
    // uptime: 100 - (2/10)*200 = 60
    // feeTransparency: 100, withdrawal: 100, support: 100
    // sentimentScore(5, 7) = clamp(50 + (5/7)*50, 50, 100) = clamp(85.71, 50, 100) = 86
    const uptime = 60;
    const feeTransparency = 100;
    const withdrawal = 100;
    const support = 100;
    const sentiment = Math.round(50 + (5 / 7) * 50);
    const expected =
      uptime * 0.25 +
      feeTransparency * 0.25 +
      withdrawal * 0.25 +
      support * 0.15 +
      sentiment * 0.1;
    expect(result.score).toBeCloseTo(Math.round(expected * 100) / 100, 1);
  });

  it("penalises poor support only through support component weight", () => {
    const result = computeBrokerReliability({
      positiveCount: 0,
      platformOutageCount: 0,
      hiddenFeesCount: 0,
      withdrawalDelayCount: 0,
      poorSupportCount: 5,
      totalReporters: 10,
    });
    // support: 100 - (5/10)*200 = 0
    // score = 80*0.25 + 80*0.25 + 80*0.25 + 0*0.15 + 50*0.1 = 20 + 20 + 20 + 0 + 5 = 65
    expect(result.components.support).toBe(0);
    expect(result.components.uptime).toBe(100);
    // But wait - totalReporters is 10, 0 negatives for uptime/fee/withdrawal so they should be 100
    // Actually... we have 5 negative reports out of 10 reporters for support
    // support score: negativeToScore(5, 10) = 100 - (5/10)*200 = 0
    // uptime: negativeToScore(0, 10) = 100 - 0 = 100
    // sentiment(0, 5) = clamp(50 + 0, 50, 100) = 50
    // score = 100*0.25 + 100*0.25 + 100*0.25 + 0*0.15 + 50*0.1 = 25 + 25 + 25 + 0 + 5 = 80
    expect(result.score).toBe(80);
  });

  it("applies label based on final composite score", () => {
    const excellent = computeBrokerReliability({
      positiveCount: 20,
      platformOutageCount: 0,
      hiddenFeesCount: 0,
      withdrawalDelayCount: 0,
      poorSupportCount: 0,
      totalReporters: 20,
    });
    expect(excellent.label).toBe("Excellent");

    const poor = computeBrokerReliability({
      positiveCount: 0,
      platformOutageCount: 10,
      hiddenFeesCount: 10,
      withdrawalDelayCount: 10,
      poorSupportCount: 10,
      totalReporters: 10,
    });
    expect(poor.label).toBe("Poor");
  });

  it("handles a single reporter correctly", () => {
    const result = computeBrokerReliability({
      positiveCount: 0,
      platformOutageCount: 1,
      hiddenFeesCount: 0,
      withdrawalDelayCount: 0,
      poorSupportCount: 0,
      totalReporters: 1,
    });
    // uptime: 100 - (1/1)*200 = -100 → clamped to 0
    expect(result.components.uptime).toBe(0);
    expect(result.totalReports).toBe(1);
  });
});
