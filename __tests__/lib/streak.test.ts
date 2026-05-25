import { describe, it, expect } from "vitest";
import { computeCurrentStreak, computeNewStreakCount, isStreakAtRisk } from "@/lib/streak";

const day = (offset: number, base = "2026-05-25") => {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
};

// Build a checkin array for consecutive days ending at base
const streak = (length: number, base = "2026-05-25") =>
  Array.from({ length }, (_, i) => ({
    check_in_date: day(-(length - 1 - i), base),
    streak_count: i + 1,
  }));

describe("computeCurrentStreak", () => {
  const TODAY = "2026-05-25";

  it("returns 0 for empty history", () => {
    expect(computeCurrentStreak([], TODAY)).toBe(0);
  });

  it("returns 1 for single checkin today", () => {
    expect(computeCurrentStreak([{ check_in_date: TODAY, streak_count: 1 }], TODAY)).toBe(1);
  });

  it("returns 1 for single checkin yesterday", () => {
    expect(computeCurrentStreak([{ check_in_date: day(-1, TODAY), streak_count: 1 }], TODAY)).toBe(1);
  });

  it("returns 0 when last checkin is 2+ days ago", () => {
    expect(computeCurrentStreak([{ check_in_date: day(-2, TODAY), streak_count: 3 }], TODAY)).toBe(0);
  });

  it("counts a 5-day consecutive streak ending today", () => {
    expect(computeCurrentStreak(streak(5, TODAY), TODAY)).toBe(5);
  });

  it("counts a 3-day consecutive streak ending yesterday", () => {
    const checkins = streak(3, day(-1, TODAY));
    expect(computeCurrentStreak(checkins, TODAY)).toBe(3);
  });

  it("stops at gap in history", () => {
    const checkins = [
      { check_in_date: TODAY, streak_count: 1 },
      { check_in_date: day(-1, TODAY), streak_count: 2 },
      // gap here — day(-2) missing
      { check_in_date: day(-3, TODAY), streak_count: 1 },
      { check_in_date: day(-4, TODAY), streak_count: 2 },
    ];
    expect(computeCurrentStreak(checkins, TODAY)).toBe(2);
  });

  it("handles unsorted input", () => {
    const checkins = [
      { check_in_date: day(-2, TODAY), streak_count: 1 },
      { check_in_date: TODAY, streak_count: 3 },
      { check_in_date: day(-1, TODAY), streak_count: 2 },
    ];
    expect(computeCurrentStreak(checkins, TODAY)).toBe(3);
  });
});

describe("computeNewStreakCount", () => {
  const TODAY = "2026-05-25";

  it("returns 1 for first checkin ever", () => {
    expect(computeNewStreakCount([], TODAY)).toBe(1);
  });

  it("extends streak when last checkin was yesterday", () => {
    const checkins = [{ check_in_date: day(-1, TODAY), streak_count: 4 }];
    expect(computeNewStreakCount(checkins, TODAY)).toBe(5);
  });

  it("preserves streak on same-day re-trigger", () => {
    const checkins = [{ check_in_date: TODAY, streak_count: 7 }];
    expect(computeNewStreakCount(checkins, TODAY)).toBe(7);
  });

  it("resets to 1 when gap > 1 day", () => {
    const checkins = [{ check_in_date: day(-3, TODAY), streak_count: 10 }];
    expect(computeNewStreakCount(checkins, TODAY)).toBe(1);
  });
});

describe("isStreakAtRisk", () => {
  const TODAY = "2026-05-25";

  it("returns false for empty history", () => {
    expect(isStreakAtRisk([], TODAY)).toBe(false);
  });

  it("returns false when user already checked in today", () => {
    const checkins = [{ check_in_date: TODAY, streak_count: 5 }];
    expect(isStreakAtRisk(checkins, TODAY)).toBe(false);
  });

  it("returns false when streak_count is 1 (nothing to protect)", () => {
    const checkins = [{ check_in_date: day(-1, TODAY), streak_count: 1 }];
    expect(isStreakAtRisk(checkins, TODAY)).toBe(false);
  });

  it("returns true when streak > 1 and last checkin was yesterday", () => {
    const checkins = [{ check_in_date: day(-1, TODAY), streak_count: 5 }];
    expect(isStreakAtRisk(checkins, TODAY)).toBe(true);
  });

  it("returns false when streak is broken (2+ days ago)", () => {
    const checkins = [{ check_in_date: day(-2, TODAY), streak_count: 8 }];
    expect(isStreakAtRisk(checkins, TODAY)).toBe(false);
  });
});
