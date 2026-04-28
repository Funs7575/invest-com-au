/**
 * Central registry for dated stats embedded in hub pages.
 *
 * Any page that displays a claim tied to a specific date (e.g. "30 April 2026
 * deadline", "$2B committed as of March 2026") should register the claim here
 * so the daily cron can alert when the stat's stalesAt date has passed.
 *
 * Usage: import { DATED_STATS } from "@/lib/dated-stats" and push an entry.
 * The <DatedStatBadge> component accepts the same stalesAt field so the CI
 * gate (V-NEW-01) can verify no stale badges are shipped to prod.
 */

export interface DatedStat {
  /** Unique stable identifier, e.g. "grants-total-committed-2026-q1" */
  id: string;
  /** Human-readable label, e.g. "Total Grants Committed" */
  label: string;
  /** The displayed value, e.g. "$2.1B" */
  value: string;
  /**
   * Date after which this stat is considered stale and the daily cron alerts.
   * CI gate (V-NEW-01) fails build if this date is in the past.
   */
  stalesAt: Date;
  /** Optional: where the data was sourced from (URL or description). */
  source?: string;
  /** Optional: page or hub where this stat appears. */
  page?: string;
}

/**
 * Registry of all dated claims in the site.
 * Hub pages import this array and push their entries at module load time.
 * The cron reads from it at runtime; the CI gate reads it at build time.
 */
export const DATED_STATS: DatedStat[] = [];

/**
 * Returns true when stat.stalesAt is before `now` (defaults to Date.now()).
 */
export function isStale(stat: DatedStat, now: Date = new Date()): boolean {
  return stat.stalesAt < now;
}

/**
 * Returns all registry entries whose stalesAt date has passed.
 */
export function getStaleStats(now: Date = new Date()): DatedStat[] {
  return DATED_STATS.filter((s) => isStale(s, now));
}

/**
 * Returns all registry entries whose stalesAt date is within `withinDays` days
 * from now. Useful for advance warning before a stat goes stale.
 */
export function getUpcomingStaleStats(
  withinDays: number,
  now: Date = new Date()
): DatedStat[] {
  const horizon = new Date(now.getTime() + withinDays * 24 * 60 * 60 * 1000);
  return DATED_STATS.filter((s) => !isStale(s, now) && s.stalesAt <= horizon);
}
