import { describe, it, expect } from "vitest";
import { scoreChurnRisk, type ChurnInputs } from "@/lib/churn-prediction";

function base(overrides: Partial<ChurnInputs> = {}): ChurnInputs {
  return {
    daysSinceLogin: 3,
    leadAcceptance30d: 0.85,
    leadAcceptancePrior30d: 0.8,
    disputeRate30d: 0.05,
    creditBalanceCents: 50000,
    creditBalancePrior30dCents: 60000,
    healthScore: 85,
    healthScoreDelta30d: 0,
    daysAsAdvisor: 180,
    ...overrides,
  };
}

describe("scoreChurnRisk", () => {
  it("healthy advisor → low bucket", () => {
    const r = scoreChurnRisk(base());
    expect(r.bucket).toBe("low");
    expect(r.score).toBeLessThan(20);
  });

  it("stale login 60+ days → watch or high", () => {
    const r = scoreChurnRisk(base({ daysSinceLogin: 70 }));
    expect(["watch", "high"]).toContain(r.bucket);
  });

  it("stale login + dropping acceptance + zero credit → high", () => {
    const r = scoreChurnRisk(
      base({
        daysSinceLogin: 60,
        leadAcceptance30d: 0.4,
        leadAcceptancePrior30d: 0.8,
        creditBalanceCents: 0,
        daysAsAdvisor: 90,
      }),
    );
    expect(r.bucket).toBe("high");
    expect(r.score).toBeGreaterThanOrEqual(60);
  });

  it("falling health score contributes", () => {
    const steady = scoreChurnRisk(base({ healthScoreDelta30d: 0 }));
    const falling = scoreChurnRisk(
      base({ healthScoreDelta30d: -20 }),
    );
    expect(falling.score).toBeGreaterThan(steady.score);
  });

  it("new advisor (<30 days) with zero credit is not automatically flagged", () => {
    const r = scoreChurnRisk(base({ daysAsAdvisor: 5, creditBalanceCents: 0 }));
    // They just signed up — the "credit_zero" rule only applies
    // after 30 days
    expect(r.reasons.some((x) => x.factor === "credit_zero")).toBe(false);
  });

  it("returns every active reason with points + note", () => {
    const r = scoreChurnRisk(
      base({ daysSinceLogin: 45, disputeRate30d: 0.2, healthScore: 30 }),
    );
    expect(r.reasons.length).toBeGreaterThan(0);
    for (const reason of r.reasons) {
      expect(reason.factor).toBeTruthy();
      expect(reason.note).toBeTruthy();
    }
  });
});
