// Pure streak math — no I/O. All functions are deterministic given the same inputs.

export interface CheckinRow {
  check_in_date: string; // ISO date: "2026-05-25"
  streak_count: number;
}

// Determine the current streak length from a sorted (descending) list of checkins.
// A streak is a consecutive sequence of days ending today or yesterday.
export function computeCurrentStreak(checkins: CheckinRow[], todayIso: string): number {
  if (checkins.length === 0) return 0;

  const sorted = [...checkins].sort((a, b) => b.check_in_date.localeCompare(a.check_in_date));
  const today = dateFromIso(todayIso);
  const mostRecent = dateFromIso(sorted[0]!.check_in_date);
  const gapDays = diffDays(today, mostRecent);

  // Most recent checkin is more than 1 day ago — streak is broken
  if (gapDays > 1) return 0;

  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = dateFromIso(sorted[i - 1]!.check_in_date);
    const curr = dateFromIso(sorted[i]!.check_in_date);
    if (diffDays(prev, curr) === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

// Compute the streak_count value to record when inserting a new checkin for todayIso.
// Looks at the most recent existing checkin; if it was yesterday, extends by 1.
export function computeNewStreakCount(existingCheckins: CheckinRow[], todayIso: string): number {
  if (existingCheckins.length === 0) return 1;

  const sorted = [...existingCheckins].sort((a, b) => b.check_in_date.localeCompare(a.check_in_date));
  const most = sorted[0]!;
  const mostDate = dateFromIso(most.check_in_date);
  const today = dateFromIso(todayIso);
  const gap = diffDays(today, mostDate);

  if (gap === 1) return most.streak_count + 1; // consecutive day — extend
  if (gap === 0) return most.streak_count;      // same day — preserve
  return 1;                                      // gap > 1 — streak broken, restart
}

// Returns true if the user has a streak that will break if they don't check in today.
export function isStreakAtRisk(checkins: CheckinRow[], todayIso: string): boolean {
  if (checkins.length === 0) return false;
  const sorted = [...checkins].sort((a, b) => b.check_in_date.localeCompare(a.check_in_date));
  const most = sorted[0]!;
  const streakActive = most.streak_count > 1;
  const checkedInToday = most.check_in_date === todayIso;
  const wasYesterday = diffDays(dateFromIso(todayIso), dateFromIso(most.check_in_date)) === 1;
  return streakActive && !checkedInToday && wasYesterday;
}

// ── Helpers ──────��──────────────────────���────────────────────────────────────

function dateFromIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d));
}

function diffDays(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 86_400_000);
}
