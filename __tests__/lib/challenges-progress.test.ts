import { describe, it, expect } from "vitest";
import {
  getCurriculum,
  percentComplete,
  isComplete,
  completedCount,
  progressFor,
  currentDay,
  tasksForDay,
  cohortDayAggregates,
  COHORT_AGGREGATE_MIN_N,
} from "@/lib/challenges/progress";
import {
  cohortStatus,
  isCohortActive,
  cohortCurrentDay,
  formatCohortDate,
} from "@/lib/challenges/status";
import type { ChallengeCurriculum } from "@/lib/challenges/curricula";

const fixture: ChallengeCurriculum = {
  key: "fixture",
  title: "Fixture",
  summary: "test",
  durationDays: 3,
  tasks: [
    { key: "t1", day: 1, title: "T1", description: "d", href: "/x", actionLabel: "a", completionTrigger: "c" },
    { key: "t2", day: 2, title: "T2", description: "d", href: "/x", actionLabel: "a", completionTrigger: "c" },
    { key: "t3", day: 3, title: "T3", description: "d", href: "/x", actionLabel: "a", completionTrigger: "c" },
  ],
};

const empty: ChallengeCurriculum = {
  key: "empty",
  title: "Empty",
  summary: "",
  durationDays: 0,
  tasks: [],
};

describe("percentComplete", () => {
  it("is 0 with no completions", () => {
    expect(percentComplete(fixture, [])).toBe(0);
  });
  it("rounds correctly for partial completion", () => {
    expect(percentComplete(fixture, ["t1"])).toBe(33); // 1/3
    expect(percentComplete(fixture, ["t1", "t2"])).toBe(67); // 2/3
  });
  it("is 100 when all done", () => {
    expect(percentComplete(fixture, ["t1", "t2", "t3"])).toBe(100);
  });
  it("ignores unknown/foreign keys", () => {
    expect(percentComplete(fixture, ["t1", "garbage", "t1"])).toBe(33);
  });
  it("never divides by zero on an empty curriculum", () => {
    expect(percentComplete(empty, [])).toBe(0);
    expect(percentComplete(empty, ["whatever"])).toBe(0);
  });
});

describe("isComplete", () => {
  it("requires every task", () => {
    expect(isComplete(fixture, ["t1", "t2"])).toBe(false);
    expect(isComplete(fixture, ["t1", "t2", "t3"])).toBe(true);
  });
  it("is false for an empty curriculum", () => {
    expect(isComplete(empty, [])).toBe(false);
  });
});

describe("completedCount", () => {
  it("counts only valid, de-duplicated keys", () => {
    expect(completedCount(fixture, ["t1", "t1", "t2", "nope"])).toBe(2);
  });
});

describe("progressFor", () => {
  it("flags completed and unlocked per current day", () => {
    const rows = progressFor(fixture, ["t1"], 2);
    expect(rows.map((r) => r.completed)).toEqual([true, false, false]);
    expect(rows.map((r) => r.unlocked)).toEqual([true, true, false]);
  });
  it("unlocks everything by default (infinite day)", () => {
    const rows = progressFor(fixture, []);
    expect(rows.every((r) => r.unlocked)).toBe(true);
  });
});

describe("currentDay", () => {
  it("returns 0 before the start date", () => {
    expect(currentDay("2026-06-20", new Date("2026-06-12T10:00:00Z"))).toBe(0);
  });
  it("returns 1 on the start date", () => {
    expect(currentDay("2026-06-12", new Date("2026-06-12T23:59:00Z"))).toBe(1);
  });
  it("counts whole UTC days from the start", () => {
    expect(currentDay("2026-06-10", new Date("2026-06-12T00:00:00Z"))).toBe(3);
  });
  it("returns 0 for null/invalid", () => {
    expect(currentDay(null)).toBe(0);
    expect(currentDay("not-a-date")).toBe(0);
  });
  it("accepts a Date instance", () => {
    expect(
      currentDay(new Date("2026-06-10T00:00:00Z"), new Date("2026-06-11T05:00:00Z")),
    ).toBe(2);
  });
});

describe("tasksForDay", () => {
  it("returns the task for a given day", () => {
    expect(tasksForDay(fixture, 2).map((t) => t.key)).toEqual(["t2"]);
    expect(tasksForDay(fixture, 9)).toEqual([]);
  });
});

describe("cohortDayAggregates — suppression below n=5", () => {
  it("exposes the threshold constant", () => {
    expect(COHORT_AGGREGATE_MIN_N).toBe(5);
  });

  it("suppresses every day when the cohort is below n=5", () => {
    const completions = new Map([
      [1, 4],
      [2, 2],
    ]);
    const agg = cohortDayAggregates(fixture, 4, completions);
    expect(agg).toHaveLength(3);
    expect(agg.every((d) => d.suppressed)).toBe(true);
    expect(agg.every((d) => d.percent === null)).toBe(true);
  });

  it("computes percentages at exactly n=5", () => {
    const completions = new Map([
      [1, 5],
      [2, 3],
      [3, 0],
    ]);
    const agg = cohortDayAggregates(fixture, 5, completions);
    expect(agg.find((d) => d.day === 1)).toMatchObject({ percent: 100, suppressed: false });
    expect(agg.find((d) => d.day === 2)).toMatchObject({ percent: 60, suppressed: false });
    expect(agg.find((d) => d.day === 3)).toMatchObject({ percent: 0, suppressed: false });
  });

  it("clamps counts that exceed the cohort size", () => {
    const completions = new Map([[1, 99]]);
    const agg = cohortDayAggregates(fixture, 10, completions);
    expect(agg.find((d) => d.day === 1)?.percent).toBe(100);
  });

  it("suppresses when cohort size is zero", () => {
    const agg = cohortDayAggregates(fixture, 0, new Map());
    expect(agg.every((d) => d.suppressed)).toBe(true);
  });
});

describe("status helpers", () => {
  const now = new Date("2026-06-12T12:00:00Z");

  it("classifies upcoming / active / ended / open", () => {
    expect(cohortStatus({ starts_at: "2026-06-20", ends_at: "2026-07-01" }, now)).toBe("upcoming");
    expect(cohortStatus({ starts_at: "2026-06-10", ends_at: "2026-06-30" }, now)).toBe("active");
    expect(cohortStatus({ starts_at: "2026-05-01", ends_at: "2026-06-01" }, now)).toBe("ended");
    expect(cohortStatus({ starts_at: null, ends_at: null }, now)).toBe("open");
  });

  it("isCohortActive matches the active window", () => {
    expect(isCohortActive({ starts_at: "2026-06-10", ends_at: "2026-06-30" }, now)).toBe(true);
    expect(isCohortActive({ starts_at: "2026-06-20", ends_at: "2026-06-30" }, now)).toBe(false);
  });

  it("cohortCurrentDay clamps to the program length", () => {
    expect(cohortCurrentDay({ starts_at: "2026-06-01" }, 5, now)).toBe(5); // 12 days in, capped at 5
    expect(cohortCurrentDay({ starts_at: "2026-06-12" }, 14, now)).toBe(1);
    expect(cohortCurrentDay({ starts_at: "2026-06-20" }, 14, now)).toBe(0);
  });

  it("formatCohortDate renders or blanks", () => {
    // Renders a UTC-stable "<day> <month> <year>" string. The exact month token
    // (e.g. "Jan" vs "June") depends on the runtime's ICU data for en-AU, so
    // assert structure + the day/year rather than a hard-coded abbreviation.
    expect(formatCohortDate("2026-06-12")).toMatch(/^12 \w+ 2026$/);
    // January's short form is stable across ICU builds.
    expect(formatCohortDate("2026-01-12")).toBe("12 Jan 2026");
    expect(formatCohortDate(null)).toBe("");
    expect(formatCohortDate("garbage")).toBe("");
  });
});

describe("getCurriculum", () => {
  it("resolves known keys and null for unknown", () => {
    expect(getCurriculum("investment-ready-21")?.key).toBe("investment-ready-21");
    expect(getCurriculum("nope")).toBeNull();
  });
});
