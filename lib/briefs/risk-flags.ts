/**
 * Brief risk-flag scanner.
 *
 * Reads the active patterns from `brief_risk_patterns` and scans the
 * supplied text for matches. Used by /api/briefs POST to set
 * `risk_flags` and `risk_review_status` on the new row.
 *
 * Severity precedence: block > review > warn.
 *   - block  → admin must approve before any routing happens. UI tells
 *              the user the brief is held for review.
 *   - review → routes after admin approves; admin queue surfaces it.
 *   - warn   → routes immediately; admin queue shows it as a soft flag.
 *   - clear  → no patterns matched.
 */

// eslint-disable-next-line no-restricted-imports -- public/anon path; risk patterns are not RLS-readable by anon. Service-role-legitimate per CLAUDE.md.
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

import type { RiskReviewStatus, RiskSeverity } from "./types";

const log = logger("briefs:risk-flags");

export interface RiskPattern {
  pattern: string;
  category: string;
  severity: RiskSeverity;
}

export interface RiskScanResult {
  /** Distinct flag categories matched. */
  flags: string[];
  /** Highest severity hit, or 'clear'. */
  severity: RiskSeverity | "clear";
  /** Suggested `risk_review_status` value for the brief row. */
  reviewStatus: RiskReviewStatus;
  /** Whether the brief should be routed immediately. */
  shouldRouteNow: boolean;
}

const SEVERITY_RANK: Record<RiskSeverity, number> = {
  warn: 1,
  review: 2,
  block: 3,
};

/**
 * Loads enabled patterns and scans `text` for case-insensitive substring
 * matches. Returns the flag set + the suggested review status. Falls back
 * to `{ flags: [], severity: 'clear', reviewStatus: 'clear', shouldRouteNow: true }`
 * if the DB read fails — better to ship the brief than to hard-block on a
 * scanner outage; the admin queue still gets a visibility-level row in
 * the same outage.
 */
export async function scanBrief(text: string): Promise<RiskScanResult> {
  const haystack = text.toLowerCase();
  let patterns: RiskPattern[] = [];

  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("brief_risk_patterns")
      .select("pattern, category, severity")
      .eq("enabled", true);
    patterns = (data ?? []) as RiskPattern[];
  } catch (err) {
    log.warn("scanBrief failed to load patterns", {
      err: err instanceof Error ? err.message : String(err),
    });
    return {
      flags: [],
      severity: "clear",
      reviewStatus: "clear",
      shouldRouteNow: true,
    };
  }

  const hits = new Map<string, RiskSeverity>();
  for (const p of patterns) {
    if (!p.pattern) continue;
    if (haystack.includes(p.pattern.toLowerCase())) {
      const current = hits.get(p.category);
      if (!current || SEVERITY_RANK[p.severity] > SEVERITY_RANK[current]) {
        hits.set(p.category, p.severity);
      }
    }
  }

  if (hits.size === 0) {
    return {
      flags: [],
      severity: "clear",
      reviewStatus: "clear",
      shouldRouteNow: true,
    };
  }

  const flags = [...hits.keys()];
  const topSeverity = [...hits.values()].reduce<RiskSeverity>(
    (best, s) => (SEVERITY_RANK[s] > SEVERITY_RANK[best] ? s : best),
    "warn",
  );

  const reviewStatus: RiskReviewStatus =
    topSeverity === "warn" ? "clear" : "pending_review";
  return {
    flags,
    severity: topSeverity,
    reviewStatus,
    shouldRouteNow: topSeverity === "warn",
  };
}

/** Pure variant for unit tests — caller supplies the pattern list. */
export function scanBriefSync(text: string, patterns: RiskPattern[]): RiskScanResult {
  const haystack = text.toLowerCase();
  const hits = new Map<string, RiskSeverity>();
  for (const p of patterns) {
    if (!p.pattern) continue;
    if (haystack.includes(p.pattern.toLowerCase())) {
      const current = hits.get(p.category);
      if (!current || SEVERITY_RANK[p.severity] > SEVERITY_RANK[current]) {
        hits.set(p.category, p.severity);
      }
    }
  }
  if (hits.size === 0) {
    return {
      flags: [],
      severity: "clear",
      reviewStatus: "clear",
      shouldRouteNow: true,
    };
  }
  const flags = [...hits.keys()];
  const topSeverity = [...hits.values()].reduce<RiskSeverity>(
    (best, s) => (SEVERITY_RANK[s] > SEVERITY_RANK[best] ? s : best),
    "warn",
  );
  return {
    flags,
    severity: topSeverity,
    reviewStatus: topSeverity === "warn" ? "clear" : "pending_review",
    shouldRouteNow: topSeverity === "warn",
  };
}
