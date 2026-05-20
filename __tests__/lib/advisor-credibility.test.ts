import { describe, it, expect } from "vitest";
import { forumCredibilityBoost, MAX_FORUM_BOOST } from "@/lib/advisor-credibility";

const NOW = Date.parse("2026-05-20T00:00:00Z");
const recent = "2026-05-10T00:00:00Z"; // 10 days ago
const stale = "2026-01-01T00:00:00Z"; // >60 days ago

describe("forumCredibilityBoost (pure)", () => {
  it("zero for banned/suspended regardless of reputation", () => {
    expect(forumCredibilityBoost({ reputation: 1000, lastActiveAt: recent, status: "banned" }, NOW)).toBe(0);
    expect(forumCredibilityBoost({ reputation: 1000, lastActiveAt: recent, status: "suspended" }, NOW)).toBe(0);
  });

  it("zero when no recent activity", () => {
    expect(forumCredibilityBoost({ reputation: 1000, lastActiveAt: stale, status: "active" }, NOW)).toBe(0);
    expect(forumCredibilityBoost({ reputation: 1000, lastActiveAt: null, status: "active" }, NOW)).toBe(0);
  });

  it("zero below the reputation floor", () => {
    expect(forumCredibilityBoost({ reputation: 10, lastActiveAt: recent, status: "active" }, NOW)).toBe(0);
  });

  it("full boost at/above the reputation ceiling", () => {
    expect(forumCredibilityBoost({ reputation: 500, lastActiveAt: recent, status: "active" }, NOW)).toBe(MAX_FORUM_BOOST);
    expect(forumCredibilityBoost({ reputation: 9999, lastActiveAt: recent, status: "active" }, NOW)).toBe(MAX_FORUM_BOOST);
  });

  it("scales linearly between floor and ceiling", () => {
    // midpoint reputation 275 → ~half the max boost
    const b = forumCredibilityBoost({ reputation: 275, lastActiveAt: recent, status: "active" }, NOW);
    expect(b).toBeGreaterThan(0);
    expect(b).toBeLessThan(MAX_FORUM_BOOST);
    expect(b).toBeCloseTo(MAX_FORUM_BOOST / 2, 2);
  });

  it("never exceeds the cap", () => {
    const b = forumCredibilityBoost({ reputation: 100000, lastActiveAt: recent, status: "active" }, NOW);
    expect(b).toBeLessThanOrEqual(MAX_FORUM_BOOST);
  });
});
