import { describe, it, expect } from "vitest";
import { computeSquadTier, TIER_SORT_ORDER } from "@/lib/expert-teams/badge-tier";

describe("computeSquadTier", () => {
  it("returns gold when ≥5 members + ≥80% completion + ≥3 outcomes", () => {
    const r = computeSquadTier({
      memberCount: 5,
      uniqueDisciplineCount: 3,
      completionRatePct: 85,
      outcomesSubmitted: 12,
    });
    expect(r.tier).toBe("gold");
    expect(r.label).toBe("Gold Pro Squad");
    expect(r.nextStep).toBeNull();
  });

  it("returns silver with 3 members + 2 disciplines but no outcomes yet", () => {
    const r = computeSquadTier({
      memberCount: 3,
      uniqueDisciplineCount: 2,
      completionRatePct: null,
      outcomesSubmitted: 0,
    });
    expect(r.tier).toBe("silver");
    expect(r.nextStep).toContain("3+ submitted client outcomes");
  });

  it("silver tier with high completion but only 4 members shows upgrade path", () => {
    const r = computeSquadTier({
      memberCount: 4,
      uniqueDisciplineCount: 3,
      completionRatePct: 90,
      outcomesSubmitted: 8,
    });
    expect(r.tier).toBe("silver");
    expect(r.nextStep).toContain("1 more verified members");
    expect(r.nextStep).not.toContain("completion");
  });

  it("silver tier with low completion lists the gap", () => {
    const r = computeSquadTier({
      memberCount: 5,
      uniqueDisciplineCount: 3,
      completionRatePct: 60,
      outcomesSubmitted: 5,
    });
    expect(r.tier).toBe("silver");
    expect(r.nextStep).toContain("completion rate ≥80%");
    expect(r.nextStep).toContain("(currently 60%)");
  });

  it("bronze when only 1-2 members", () => {
    const r = computeSquadTier({
      memberCount: 2,
      uniqueDisciplineCount: 1,
      completionRatePct: null,
      outcomesSubmitted: 0,
    });
    expect(r.tier).toBe("bronze");
    expect(r.nextStep).toContain("1 more verified members");
  });

  it("bronze even with high members if only 1 discipline", () => {
    const r = computeSquadTier({
      memberCount: 6,
      uniqueDisciplineCount: 1,
      completionRatePct: 90,
      outcomesSubmitted: 10,
    });
    expect(r.tier).toBe("bronze");
    expect(r.nextStep).toContain("1 more discipline");
  });

  it("TIER_SORT_ORDER puts gold first", () => {
    expect(TIER_SORT_ORDER.gold).toBeGreaterThan(TIER_SORT_ORDER.silver);
    expect(TIER_SORT_ORDER.silver).toBeGreaterThan(TIER_SORT_ORDER.bronze);
  });
});
