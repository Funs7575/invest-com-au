import { describe, it, expect } from "vitest";
import { computeUserHealthScore, type HealthScoreInput } from "@/lib/user-health-score";

const base: HealthScoreInput = {
  holdingCount: 0,
  distinctExchanges: 0,
  maxConcentrationPct: 0,
  avgFeeScore: null,
  experienceLevel: null,
  hasGoals: false,
  goalProgressPct: null,
  activeCheckinsLast30d: 0,
  currentStreak: 0,
};

describe("computeUserHealthScore", () => {
  it("returns neutral score for empty input", () => {
    const s = computeUserHealthScore(base);
    expect(s.diversification).toBe(50);
    expect(s.cost).toBe(50);
    expect(s.overall).toBeGreaterThanOrEqual(0);
    expect(s.overall).toBeLessThanOrEqual(100);
  });

  it("returns high diversification for many holdings across exchanges", () => {
    const s = computeUserHealthScore({ ...base, holdingCount: 12, distinctExchanges: 3, maxConcentrationPct: 15 });
    expect(s.diversification).toBe(100); // 100 + 20 exchange bonus, capped at 100
  });

  it("penalises extreme concentration", () => {
    // Use 4 holdings (base=60) so the penalty is not hidden by clamping
    const concentrated = computeUserHealthScore({ ...base, holdingCount: 4, distinctExchanges: 1, maxConcentrationPct: 85 });
    const spread = computeUserHealthScore({ ...base, holdingCount: 4, distinctExchanges: 1, maxConcentrationPct: 20 });
    expect(spread.diversification).toBeGreaterThan(concentrated.diversification);
  });

  it("uses avgFeeScore directly for cost sub-score", () => {
    const s = computeUserHealthScore({ ...base, avgFeeScore: 80 });
    expect(s.cost).toBe(80);
  });

  it("defaults cost to 50 when no fee data", () => {
    const s = computeUserHealthScore({ ...base, avgFeeScore: null });
    expect(s.cost).toBe(50);
  });

  it("gives higher risk alignment to pros with goals", () => {
    const beginner = computeUserHealthScore({ ...base, experienceLevel: "beginner", hasGoals: false });
    const pro = computeUserHealthScore({ ...base, experienceLevel: "pro", hasGoals: true });
    expect(pro.riskAlignment).toBeGreaterThan(beginner.riskAlignment);
  });

  it("adds goal progress bonus when progress >= 75%", () => {
    const noProgress = computeUserHealthScore({ ...base, experienceLevel: "intermediate", hasGoals: true, goalProgressPct: 10 });
    const highProgress = computeUserHealthScore({ ...base, experienceLevel: "intermediate", hasGoals: true, goalProgressPct: 80 });
    expect(highProgress.riskAlignment).toBeGreaterThan(noProgress.riskAlignment);
  });

  it("gives 0 engagement for no checkins", () => {
    const s = computeUserHealthScore({ ...base, activeCheckinsLast30d: 0, currentStreak: 0 });
    expect(s.engagement).toBe(0);
  });

  it("gives 100+ (capped) engagement for full month activity", () => {
    const s = computeUserHealthScore({ ...base, activeCheckinsLast30d: 30, currentStreak: 30 });
    expect(s.engagement).toBe(100);
  });

  it("streak bonus caps at 20 points", () => {
    const low = computeUserHealthScore({ ...base, activeCheckinsLast30d: 16, currentStreak: 0 });
    const highStreak = computeUserHealthScore({ ...base, activeCheckinsLast30d: 16, currentStreak: 100 });
    expect(highStreak.engagement - low.engagement).toBe(20);
  });

  it("grades A for score >= 90", () => {
    const s = computeUserHealthScore({
      holdingCount: 15, distinctExchanges: 3, maxConcentrationPct: 10,
      avgFeeScore: 95, experienceLevel: "pro", hasGoals: true,
      goalProgressPct: 80, activeCheckinsLast30d: 28, currentStreak: 30,
    });
    expect(s.grade).toBe("A");
    expect(s.overall).toBeGreaterThanOrEqual(90);
  });

  it("grades E for very low score", () => {
    const s = computeUserHealthScore({
      holdingCount: 1, distinctExchanges: 1, maxConcentrationPct: 100,
      avgFeeScore: 5, experienceLevel: "beginner", hasGoals: false,
      goalProgressPct: null, activeCheckinsLast30d: 0, currentStreak: 0,
    });
    expect(s.grade).toBe("E");
  });

  it("overall is a weighted combination of sub-scores", () => {
    const s = computeUserHealthScore({
      holdingCount: 6, distinctExchanges: 2, maxConcentrationPct: 30,
      avgFeeScore: 60, experienceLevel: "intermediate", hasGoals: true,
      goalProgressPct: 50, activeCheckinsLast30d: 10, currentStreak: 5,
    });
    const expected = Math.round(
      s.diversification * 0.40 + s.cost * 0.25 + s.riskAlignment * 0.20 + s.engagement * 0.15
    );
    expect(s.overall).toBe(expected);
  });
});
