/**
 * Pure cohort-status / formatting helpers shared by pages and the index.
 */

import type { ChallengeRow } from "./data";
import { currentDay } from "./progress";

export type CohortStatus = "upcoming" | "active" | "ended" | "open";

/**
 * Derive a cohort's lifecycle status from its dates relative to `now`.
 *
 * - No dates           → 'open' (self-paced / always-on).
 * - now < starts_at    → 'upcoming'.
 * - within window      → 'active'.
 * - now > ends_at      → 'ended'.
 */
export function cohortStatus(
  challenge: Pick<ChallengeRow, "starts_at" | "ends_at">,
  now: Date = new Date(),
): CohortStatus {
  const { starts_at, ends_at } = challenge;
  if (!starts_at && !ends_at) return "open";

  const nowUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

  if (starts_at) {
    const start = new Date(`${starts_at}T00:00:00Z`);
    if (!Number.isNaN(start.getTime())) {
      const startUtc = Date.UTC(
        start.getUTCFullYear(),
        start.getUTCMonth(),
        start.getUTCDate(),
      );
      if (nowUtc < startUtc) return "upcoming";
    }
  }
  if (ends_at) {
    const end = new Date(`${ends_at}T00:00:00Z`);
    if (!Number.isNaN(end.getTime())) {
      const endUtc = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
      if (nowUtc > endUtc) return "ended";
    }
  }
  return "active";
}

/** True when a cohort is currently inside its active date window. */
export function isCohortActive(
  challenge: Pick<ChallengeRow, "starts_at" | "ends_at">,
  now: Date = new Date(),
): boolean {
  return cohortStatus(challenge, now) === "active";
}

/** The cohort's current day number, clamped to the program length. */
export function cohortCurrentDay(
  challenge: Pick<ChallengeRow, "starts_at">,
  durationDays: number,
  now: Date = new Date(),
): number {
  const day = currentDay(challenge.starts_at, now);
  if (day <= 0) return 0;
  return Math.min(day, durationDays);
}

const DATE_FMT: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
};

/** Format an ISO date ("2026-06-12") as "12 Jun 2026", or "" for null. */
export function formatCohortDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-AU", DATE_FMT).format(d);
}
