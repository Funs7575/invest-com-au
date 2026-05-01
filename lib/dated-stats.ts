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

/** Three-state freshness signal for visual rendering + cron alerts. */
export type FreshnessLevel = "fresh" | "aging" | "stale";

/**
 * Registry of all dated claims in the site.
 * Hub pages import this array and push their entries at module load time.
 * The cron reads from it at runtime; the CI gate reads it at build time.
 */
export const DATED_STATS: DatedStat[] = [];

/**
 * Returns true when the given stat (or stalesAt date string) is in the past.
 *
 * Two call shapes:
 *   isStale(stat, now)          — registry-entry shape (used by the cron)
 *   isStale("2026-06-30", now)  — string/Date shape (used by the badge + new helpers)
 *
 * The string shape is the founder Option-1 spec; the registry-entry shape is
 * the original PR #253 contract preserved here for backward compatibility.
 */
export function isStale(stat: DatedStat, now?: Date): boolean;
export function isStale(stalesAt: string | Date, now?: Date): boolean;
export function isStale(
  arg: DatedStat | string | Date,
  now: Date = new Date()
): boolean {
  const stalesAtDate = toDate(extractStalesAt(arg));
  if (!stalesAtDate) return false;
  return stalesAtDate < now;
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

/**
 * Default validity window for `defaultStalesAt`: 3 months after `sourcedAt`.
 *
 * Rationale: most regulatory + market datapoints (ASIC fees, ATO thresholds,
 * platform fees, headline rates) are republished quarterly. 3 months matches
 * the Australian regulatory cadence and gives the cron 7 days of warning
 * before a stat goes stale.
 */
export const DEFAULT_VALIDITY_MONTHS = 3;

/**
 * Returns an ISO date string `monthsValid` months after `sourcedAt`.
 *
 *   defaultStalesAt("2026-03-15")            // "2026-06-15" (3 months default)
 *   defaultStalesAt("2026-03-15", 6)         // "2026-09-15"
 *
 * The result is always an ISO date (YYYY-MM-DD) — no time component — so the
 * V-NEW-01 CI gate can parse it without timezone surprises.
 */
export function defaultStalesAt(
  sourcedAt: string | Date,
  monthsValid: number = DEFAULT_VALIDITY_MONTHS
): string {
  const sourced = toDate(sourcedAt);
  if (!sourced) {
    throw new Error(
      `defaultStalesAt: invalid sourcedAt: ${String(sourcedAt)}`
    );
  }
  const stales = new Date(sourced.getTime());
  stales.setUTCMonth(stales.getUTCMonth() + monthsValid);
  return stales.toISOString().slice(0, 10);
}

/**
 * Computes the three-state freshness level for a dated stat.
 *
 *   fresh  — `now` is in the first half of the [sourcedAt, stalesAt] window
 *   aging  — `now` is in the second half but stalesAt is still in the future
 *   stale  — `now` is at or past stalesAt
 *
 * If `stalesAt` is omitted, it defaults to `sourcedAt + DEFAULT_VALIDITY_MONTHS`.
 *
 * The aging state is the one the daily cron uses to send "expires within 7
 * days" warnings — see app/api/cron/dated-stats-check/route.ts.
 */
export function freshnessLevel(
  sourcedAt: string | Date,
  stalesAt?: string | Date,
  now: Date = new Date()
): FreshnessLevel {
  const sourced = toDate(sourcedAt);
  if (!sourced) {
    throw new Error(
      `freshnessLevel: invalid sourcedAt: ${String(sourcedAt)}`
    );
  }
  const stales =
    toDate(stalesAt) ?? toDate(defaultStalesAt(sourced));
  if (!stales) {
    throw new Error(
      `freshnessLevel: invalid stalesAt: ${String(stalesAt)}`
    );
  }
  if (now >= stales) return "stale";
  // Midpoint between sourcedAt and stalesAt.
  const midpoint = new Date((sourced.getTime() + stales.getTime()) / 2);
  return now < midpoint ? "fresh" : "aging";
}

// ─── internal helpers ────────────────────────────────────────────────────────

function toDate(value: unknown): Date | null {
  if (value == null) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function extractStalesAt(arg: DatedStat | string | Date): string | Date | null {
  if (arg == null) return null;
  if (arg instanceof Date) return arg;
  if (typeof arg === "string") return arg;
  if (typeof arg === "object" && "stalesAt" in arg) {
    return (arg as DatedStat).stalesAt ?? null;
  }
  return null;
}
