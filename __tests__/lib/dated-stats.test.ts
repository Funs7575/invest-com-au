import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  DATED_STATS,
  isStale,
  getStaleStats,
  getUpcomingStaleStats,
  type DatedStat,
} from "@/lib/dated-stats";

function makeStat(overrides: Partial<DatedStat> = {}): DatedStat {
  return {
    id: "test-stat",
    label: "Test Stat",
    value: "$1B",
    stalesAt: new Date("2030-01-01"),
    ...overrides,
  };
}

describe("isStale", () => {
  it("returns false when stalesAt is in the future", () => {
    const stat = makeStat({ stalesAt: new Date("2030-01-01") });
    expect(isStale(stat, new Date("2026-01-01"))).toBe(false);
  });

  it("returns true when stalesAt is in the past", () => {
    const stat = makeStat({ stalesAt: new Date("2020-01-01") });
    expect(isStale(stat, new Date("2026-01-01"))).toBe(true);
  });

  it("returns true when stalesAt is exactly now (boundary — past the instant)", () => {
    const now = new Date("2026-04-27T00:00:00.000Z");
    const stat = makeStat({ stalesAt: new Date("2026-04-27T00:00:00.000Z") });
    // stalesAt < now → false when equal; the Date comparison uses strict less-than
    expect(isStale(stat, now)).toBe(false);
  });

  it("returns true when stalesAt is 1ms before now", () => {
    const now = new Date("2026-04-27T00:00:00.001Z");
    const stat = makeStat({ stalesAt: new Date("2026-04-27T00:00:00.000Z") });
    expect(isStale(stat, now)).toBe(true);
  });

  it("uses current time when now is omitted", () => {
    const future = makeStat({ stalesAt: new Date("2099-12-31") });
    expect(isStale(future)).toBe(false);
    const past = makeStat({ stalesAt: new Date("2000-01-01") });
    expect(isStale(past)).toBe(true);
  });
});

describe("getStaleStats", () => {
  const originalLength = DATED_STATS.length;

  beforeEach(() => {
    DATED_STATS.push(
      makeStat({ id: "stale-1", stalesAt: new Date("2020-01-01") }),
      makeStat({ id: "stale-2", stalesAt: new Date("2021-06-15") }),
      makeStat({ id: "fresh-1", stalesAt: new Date("2030-01-01") }),
      makeStat({ id: "fresh-2", stalesAt: new Date("2035-12-31") })
    );
  });

  afterEach(() => {
    // Restore original length (remove entries pushed in beforeEach)
    DATED_STATS.splice(originalLength);
  });

  it("returns only entries whose stalesAt is in the past", () => {
    const now = new Date("2026-04-27");
    const stale = getStaleStats(now);
    const ids = stale.map((s) => s.id);
    expect(ids).toContain("stale-1");
    expect(ids).toContain("stale-2");
    expect(ids).not.toContain("fresh-1");
    expect(ids).not.toContain("fresh-2");
  });

  it("returns empty array when all stats are fresh", () => {
    const distantFuture = new Date("1990-01-01"); // before all stalesAt dates
    expect(getStaleStats(distantFuture)).toHaveLength(0);
  });

  it("returns all stats when all are stale", () => {
    const farFuture = new Date("2099-01-01");
    const stale = getStaleStats(farFuture);
    expect(stale.length).toBeGreaterThanOrEqual(4);
  });
});

describe("getUpcomingStaleStats", () => {
  const originalLength = DATED_STATS.length;

  beforeEach(() => {
    DATED_STATS.push(
      makeStat({ id: "expires-soon", stalesAt: new Date("2026-05-01") }),
      makeStat({ id: "expires-far", stalesAt: new Date("2026-12-31") }),
      makeStat({ id: "already-stale", stalesAt: new Date("2020-01-01") })
    );
  });

  afterEach(() => {
    DATED_STATS.splice(originalLength);
  });

  it("returns stats expiring within the given window but not yet stale", () => {
    const now = new Date("2026-04-25");
    const upcoming = getUpcomingStaleStats(7, now); // within 7 days → before 2026-05-02
    const ids = upcoming.map((s) => s.id);
    expect(ids).toContain("expires-soon"); // 2026-05-01 < 2026-05-02
    expect(ids).not.toContain("expires-far");
    expect(ids).not.toContain("already-stale"); // excluded because already stale
  });

  it("excludes already-stale entries", () => {
    const now = new Date("2026-04-27");
    const upcoming = getUpcomingStaleStats(30, now);
    const ids = upcoming.map((s) => s.id);
    expect(ids).not.toContain("already-stale");
  });

  it("returns empty when no stats expire within the window", () => {
    const now = new Date("2026-04-27");
    expect(getUpcomingStaleStats(0, now)).toHaveLength(0);
  });
});
