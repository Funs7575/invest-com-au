/**
 * Pure progress + scheduling helpers for Cohort Challenges.
 *
 * All functions here are deterministic and I/O-free so they unit-test cleanly
 * and can run on either client or server. They operate on a challenge's
 * code-defined task list plus the set of completed task keys for one user.
 */

import type { ChallengeCurriculum, ChallengeTask } from "./curricula";
import { CHALLENGE_CURRICULA } from "./curricula";

/** Look up a curriculum by its `curriculum_key`, or null if unknown. */
export function getCurriculum(
  curriculumKey: string,
): ChallengeCurriculum | null {
  return CHALLENGE_CURRICULA[curriculumKey] ?? null;
}

/** The set of valid task keys for a curriculum (for write-time validation). */
export function taskKeySet(curriculum: ChallengeCurriculum): Set<string> {
  return new Set(curriculum.tasks.map((t) => t.key));
}

/** Total number of tasks in the curriculum. */
export function totalTasks(curriculum: ChallengeCurriculum): number {
  return curriculum.tasks.length;
}

/**
 * Percentage (0–100, integer) of the curriculum's tasks completed.
 * Empty curricula return 0 (never divide by zero).
 */
export function percentComplete(
  curriculum: ChallengeCurriculum,
  completedKeys: Iterable<string>,
): number {
  const total = curriculum.tasks.length;
  if (total === 0) return 0;
  const valid = taskKeySet(curriculum);
  const done = new Set<string>();
  for (const k of completedKeys) {
    if (valid.has(k)) done.add(k);
  }
  return Math.round((done.size / total) * 100);
}

/** True once every task in the curriculum has a completion. */
export function isComplete(
  curriculum: ChallengeCurriculum,
  completedKeys: Iterable<string>,
): boolean {
  if (curriculum.tasks.length === 0) return false;
  const done = new Set(completedKeys);
  return curriculum.tasks.every((t) => done.has(t.key));
}

export interface TaskProgress {
  task: ChallengeTask;
  completed: boolean;
  /** True when the task's day has been reached given the cohort start date. */
  unlocked: boolean;
}

/**
 * Build the per-task progress view: each task with whether it's completed and
 * whether it has unlocked yet (its `day` ≤ the current day of the cohort).
 *
 * `currentDayValue` is the 1-based current day (see {@link currentDay}); pass
 * a large number (or omit-equivalent via `Number.POSITIVE_INFINITY`) to treat
 * every task as unlocked (e.g. self-paced / no fixed start date).
 */
export function progressFor(
  curriculum: ChallengeCurriculum,
  completedKeys: Iterable<string>,
  currentDayValue: number = Number.POSITIVE_INFINITY,
): TaskProgress[] {
  const done = new Set(completedKeys);
  return curriculum.tasks.map((task) => ({
    task,
    completed: done.has(task.key),
    unlocked: task.day <= currentDayValue,
  }));
}

/** Count of completed tasks (ignoring keys not in this curriculum). */
export function completedCount(
  curriculum: ChallengeCurriculum,
  completedKeys: Iterable<string>,
): number {
  const valid = taskKeySet(curriculum);
  let n = 0;
  const seen = new Set<string>();
  for (const k of completedKeys) {
    if (valid.has(k) && !seen.has(k)) {
      seen.add(k);
      n += 1;
    }
  }
  return n;
}

/**
 * The 1-based day number of a cohort given its start date and "now".
 *
 * - Day 1 is the start date itself.
 * - Before the start date returns 0 (nothing unlocked yet — upcoming cohort).
 * - Computed on whole UTC calendar days so it's stable regardless of the time
 *   of day the page renders.
 *
 * `startDate` may be a `Date`, an ISO date string ("2026-06-12"), or null
 * (no scheduled start → returns 0, caller can treat as self-paced).
 */
export function currentDay(
  startDate: Date | string | null | undefined,
  now: Date = new Date(),
): number {
  if (startDate == null) return 0;
  const start =
    typeof startDate === "string" ? new Date(`${startDate}T00:00:00Z`) : startDate;
  if (Number.isNaN(start.getTime())) return 0;

  const startUtc = Date.UTC(
    start.getUTCFullYear(),
    start.getUTCMonth(),
    start.getUTCDate(),
  );
  const nowUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

  const diffDays = Math.floor((nowUtc - startUtc) / 86_400_000);
  if (diffDays < 0) return 0;
  return diffDays + 1;
}

/**
 * The task(s) scheduled for a given day of a curriculum. Curricula here have at
 * most one task per day, but this returns an array to stay general.
 */
export function tasksForDay(
  curriculum: ChallengeCurriculum,
  day: number,
): ChallengeTask[] {
  return curriculum.tasks.filter((t) => t.day === day);
}

/**
 * Suppression threshold for anonymised cohort aggregates. Buckets with fewer
 * than this many enrolees must NOT show a percentage — they could de-anonymise
 * a small cohort. Kept here as the single source of truth for the page + cron +
 * tests.
 */
export const COHORT_AGGREGATE_MIN_N = 5;

export interface CohortDayAggregate {
  day: number;
  /** Percentage of the cohort that completed this day's task(s), or null when suppressed. */
  percent: number | null;
  /** True when the cohort is too small (n < {@link COHORT_AGGREGATE_MIN_N}) to show a figure. */
  suppressed: boolean;
}

/**
 * Compute the anonymised per-day completion aggregate for a cohort.
 *
 * COMPLIANCE / PRIVACY: counts only — no identities. When the cohort has fewer
 * than {@link COHORT_AGGREGATE_MIN_N} enrolees the whole aggregate is
 * suppressed (every day returns `{ percent: null, suppressed: true }`) so a
 * small cohort can't be reverse-engineered into individuals.
 *
 * @param curriculum       the program
 * @param cohortSize       number of enrolled (non-waitlisted) participants
 * @param completionsByDay map of day → count of participants who completed that
 *                         day's task. Days with no entry are treated as 0.
 */
export function cohortDayAggregates(
  curriculum: ChallengeCurriculum,
  cohortSize: number,
  completionsByDay: ReadonlyMap<number, number>,
): CohortDayAggregate[] {
  const days = Array.from(new Set(curriculum.tasks.map((t) => t.day))).sort(
    (a, b) => a - b,
  );
  const suppressed = cohortSize < COHORT_AGGREGATE_MIN_N;
  return days.map((day) => {
    if (suppressed || cohortSize <= 0) {
      return { day, percent: null, suppressed: true };
    }
    const count = completionsByDay.get(day) ?? 0;
    const clamped = Math.max(0, Math.min(count, cohortSize));
    return {
      day,
      percent: Math.round((clamped / cohortSize) * 100),
      suppressed: false,
    };
  });
}
