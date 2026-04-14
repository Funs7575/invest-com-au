import { describe, it, expect } from "vitest";
import { computeHealthFactors, computeOverallHealth } from "@/lib/advisor-health";

const baseInput = {
  medianResponseHours: 2,
  leadsDelivered: 20,
  leadsAccepted: 18,
  leadsDisputed: 1,
  recentRating: 4.7,
  recentReviewCount: 15,
  profileFieldsFilled: 6,
  profileFieldsTotal: 6,
  afslActive: true,
  verified: true,
};

describe("computeHealthFactors", () => {
  it("returns one factor per key", () => {
    const factors = computeHealthFactors(baseInput);
    const keys = factors.map((f) => f.key);
    expect(keys).toContain("response_speed");
    expect(keys).toContain("lead_acceptance");
    expect(keys).toContain("review_quality");
    expect(keys).toContain("dispute_rate");
    expect(keys).toContain("profile_completeness");
    expect(keys).toContain("compliance_status");
  });

  it("gives response_speed 90+ for fast responses", () => {
    const f = computeHealthFactors({ ...baseInput, medianResponseHours: 1 });
    expect(f.find((x) => x.key === "response_speed")!.score).toBeGreaterThanOrEqual(90);
  });

  it("penalises slow responses", () => {
    const f = computeHealthFactors({ ...baseInput, medianResponseHours: 48 });
    expect(f.find((x) => x.key === "response_speed")!.score).toBeLessThan(30);
  });

  it("handles null response time gracefully (not a zero)", () => {
    const f = computeHealthFactors({ ...baseInput, medianResponseHours: null });
    const r = f.find((x) => x.key === "response_speed")!;
    expect(r.score).toBeGreaterThan(0);
    expect(r.recommendation).toContain("No response data");
  });

  it("zero-acceptance is 0, perfect is 100", () => {
    const zero = computeHealthFactors({
      ...baseInput,
      leadsDelivered: 10,
      leadsAccepted: 0,
    });
    expect(zero.find((x) => x.key === "lead_acceptance")!.score).toBe(0);
    const full = computeHealthFactors({
      ...baseInput,
      leadsDelivered: 10,
      leadsAccepted: 10,
    });
    expect(full.find((x) => x.key === "lead_acceptance")!.score).toBe(100);
  });

  it("perfect profile completeness → 100", () => {
    const f = computeHealthFactors(baseInput);
    expect(f.find((x) => x.key === "profile_completeness")!.score).toBe(100);
  });

  it("partial profile completeness → proportional", () => {
    const f = computeHealthFactors({
      ...baseInput,
      profileFieldsFilled: 3,
      profileFieldsTotal: 6,
    });
    expect(f.find((x) => x.key === "profile_completeness")!.score).toBe(50);
  });

  it("dispute_rate rewards 0 disputes", () => {
    const f = computeHealthFactors({
      ...baseInput,
      leadsDelivered: 10,
      leadsDisputed: 0,
    });
    expect(f.find((x) => x.key === "dispute_rate")!.score).toBe(100);
  });

  it("compliance: AFSL + verified → 100", () => {
    const f = computeHealthFactors({ ...baseInput, afslActive: true, verified: true });
    expect(f.find((x) => x.key === "compliance_status")!.score).toBe(100);
  });

  it("compliance: AFSL ceased → low", () => {
    const f = computeHealthFactors({ ...baseInput, afslActive: false, verified: false });
    expect(f.find((x) => x.key === "compliance_status")!.score).toBeLessThan(30);
  });
});

describe("computeOverallHealth", () => {
  it("returns 0 for empty input", () => {
    expect(computeOverallHealth([])).toBe(0);
  });

  it("returns 100 when every factor is 100", () => {
    const factors = [
      { key: "response_speed", label: "r", score: 100, weight: 0.5, recommendation: "" },
      { key: "lead_acceptance", label: "l", score: 100, weight: 0.5, recommendation: "" },
    ] as const;
    expect(computeOverallHealth(factors as never)).toBe(100);
  });

  it("weighted average when factors differ", () => {
    const factors = [
      { key: "response_speed", label: "r", score: 100, weight: 0.5, recommendation: "" },
      { key: "lead_acceptance", label: "l", score: 0, weight: 0.5, recommendation: "" },
    ] as const;
    expect(computeOverallHealth(factors as never)).toBe(50);
  });

  it("higher weight on the stronger factor tilts the overall", () => {
    const factors = [
      { key: "response_speed", label: "r", score: 100, weight: 0.8, recommendation: "" },
      { key: "lead_acceptance", label: "l", score: 0, weight: 0.2, recommendation: "" },
    ] as const;
    expect(computeOverallHealth(factors as never)).toBe(80);
  });

  it("full baseline input → strong overall", () => {
    const f = computeHealthFactors(baseInput);
    expect(computeOverallHealth(f)).toBeGreaterThan(80);
  });

  it("weak everything → low overall", () => {
    const f = computeHealthFactors({
      medianResponseHours: 48,
      leadsDelivered: 10,
      leadsAccepted: 2,
      leadsDisputed: 3,
      recentRating: 3,
      recentReviewCount: 2,
      profileFieldsFilled: 2,
      profileFieldsTotal: 6,
      afslActive: false,
      verified: false,
    });
    expect(computeOverallHealth(f)).toBeLessThan(40);
  });
});
