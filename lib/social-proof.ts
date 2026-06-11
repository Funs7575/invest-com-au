/**
 * Social-proof aggregates — REAL counts only.
 *
 * History: the original SocialProofCounter fabricated "X investors
 * compared platforms today" from a time-of-day sine curve (ACL s18
 * misleading-conduct exposure). It was nulled out in a prior audit and
 * is re-enabled via this module, which computes honest aggregates from
 * `analytics_events` — the same table the admin funnel dashboards read.
 *
 * Honesty rules encoded here:
 *   1. Counts come from real tracked events only (see METRIC_EVENT_TYPES;
 *      each metric counts exactly the thing its label claims).
 *   2. Below SOCIAL_PROOF_MIN_COUNT the stat is hidden entirely —
 *      "3 people used this" is worse than nothing, and we never report
 *      the small number itself (the API returns only `show: false`).
 *   3. Labels are factual and time-scoped ("in the past 30 days").
 *      No urgency theatre, no "right now", no live-ness implication.
 *
 * The aggregate is cached for 24 h (a daily aggregate) via lib/cache.ts
 * so the analytics table is hit at most once per metric per day.
 */

// eslint-disable-next-line no-restricted-imports -- analytics_events SELECT is admin-only RLS (is_admin()); this is an anonymous-path aggregate with no JWT available, per CLAUDE.md service-role scope
import { createAdminClient } from "@/lib/supabase/admin";
import { cached, CacheTTL } from "@/lib/cache";
import { logger } from "@/lib/logger";

const log = logger("social-proof");

/**
 * Minimum count before a social-proof stat is shown anywhere.
 * Below this the counter renders nothing — a defensible floor so we
 * never ship "3 people viewed this" style anti-proof.
 */
export const SOCIAL_PROOF_MIN_COUNT = 25;

/** Rolling window for the aggregate, in days. Must stay well inside the
 * 90-day analytics_events retention purge (see baseline cleanup fn). */
export const SOCIAL_PROOF_WINDOW_DAYS = 30;

export type SocialProofMetric = "quiz" | "compare" | "calculator";

/**
 * Which analytics_events.event_type values genuinely back each claim.
 *
 * NOTE: app/quiz/page.tsx fires BOTH `quiz_complete` and `quiz_completed`
 * (legacy + new name) for every single completion — counting both would
 * double-count, so the quiz metric counts `quiz_complete` only.
 */
const METRIC_EVENT_TYPES: Record<SocialProofMetric, readonly string[]> = {
  quiz: ["quiz_complete"],
  compare: ["compare_select"],
  calculator: ["calculator_use"],
};

export function isSocialProofMetric(value: string): value is SocialProofMetric {
  // Own-property check — a plain `in` would also match prototype-chain
  // keys like "__proto__" or "toString" from a crafted ?metric= param.
  return Object.prototype.hasOwnProperty.call(METRIC_EVENT_TYPES, value);
}

/** Factual, time-scoped phrasing. The count is the number of events —
 * label nouns are chosen so the claim matches what was counted. */
export function socialProofLabel(metric: SocialProofMetric, count: number): string {
  const n = count.toLocaleString("en-AU");
  switch (metric) {
    case "quiz":
      return `${n} broker-match quizzes completed in the past ${SOCIAL_PROOF_WINDOW_DAYS} days`;
    case "compare":
      return `${n} platforms compared on invest.com.au in the past ${SOCIAL_PROOF_WINDOW_DAYS} days`;
    case "calculator":
      return `${n} calculator runs on invest.com.au in the past ${SOCIAL_PROOF_WINDOW_DAYS} days`;
  }
}

export type SocialProofStat =
  | { show: false }
  | { show: true; count: number; label: string };

/**
 * Count the metric's events over the rolling window and apply the
 * visibility floor. Uncached core — exported for unit tests; callers
 * should use `getSocialProofStat` (the daily-cached wrapper).
 *
 * Fails closed: any error → `{ show: false }` (hide rather than guess).
 */
export async function computeSocialProofStat(
  metric: SocialProofMetric,
): Promise<SocialProofStat> {
  try {
    const sinceIso = new Date(
      Date.now() - SOCIAL_PROOF_WINDOW_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();

    const supabase = createAdminClient();
    const { count, error } = await supabase
      .from("analytics_events")
      .select("id", { count: "exact", head: true })
      .in("event_type", [...METRIC_EVENT_TYPES[metric]])
      .gte("created_at", sinceIso);

    if (error) {
      log.warn("social-proof count failed — hiding stat", {
        metric,
        error: error.message,
      });
      return { show: false };
    }

    const total = count ?? 0;
    if (total < SOCIAL_PROOF_MIN_COUNT) {
      return { show: false };
    }

    return { show: true, count: total, label: socialProofLabel(metric, total) };
  } catch (err) {
    log.warn("social-proof count threw — hiding stat", {
      metric,
      error: err instanceof Error ? err.message : String(err),
    });
    return { show: false };
  }
}

/**
 * Daily-cached aggregate (the metric arg participates in the cache key,
 * so each metric caches independently).
 */
export const getSocialProofStat = cached(
  computeSocialProofStat,
  ["social-proof"],
  { revalidate: CacheTTL.STATIC },
);
