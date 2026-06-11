/**
 * Question of the Day (Community master plan, Phase 1.4) — the daily
 * prompt surface on the community hub.
 *
 * ── FLAG-GATED OFF ──────────────────────────────────────────────────
 * The whole surface sits behind the `community_qotd` feature flag, which
 * has NO row in `feature_flags` and therefore evaluates to **off**
 * everywhere (`evaluateFlag(null) === false`). Founder decisions §11
 * D2/D3 (Founding Experts incentives / Research-Team answer cadence) are
 * still pending — do NOT create or enable the flag row without that
 * sign-off. The posting cadence (editorial agent cron, PR-C6 in the
 * plan) is intentionally NOT built here either.
 * ────────────────────────────────────────────────────────────────────
 *
 * Data contract (schema-free, per the Phase 0–1 constraint): a thread is
 * "today's question" when it is an ordinary visible discussion thread
 * authored under the attributed editorial byline and fresh enough to
 * still be "of the day". No fake users, no new columns, no new
 * thread_type (the live CHECK constraint only allows
 * discussion/confessions/debate).
 */

import { isFlagEnabled } from "@/lib/feature-flags";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

const log = logger("community-qotd");

export const QOTD_FLAG_KEY = "community_qotd";

/**
 * Attributed byline for daily prompts — matches the honest-attribution
 * rule (plan §3.5): prompts are always visibly from the platform, never
 * a fake persona. Same byline the seeded threads use.
 */
export const QOTD_AUTHOR_NAME = "Invest.com.au Community";

/**
 * A prompt older than this is no longer "today's question" — the card
 * disappears rather than presenting stale content as a daily ritual.
 */
export const QOTD_FRESHNESS_HOURS = 36;

export interface QotdThread {
  id: number;
  title: string;
  body: string;
  category_slug: string;
  created_at: string;
  reply_count: number;
}

/**
 * Returns today's question, or null when (in order):
 *  1. the `community_qotd` flag is off (the default — no DB read happens),
 *  2. no fresh prompt thread exists,
 *  3. anything errors (fail-soft).
 */
export async function getQuestionOfTheDay(): Promise<QotdThread | null> {
  const enabled = await isFlagEnabled(QOTD_FLAG_KEY);
  if (!enabled) return null;

  try {
    const supabase = await createClient();
    const cutoff = new Date(
      Date.now() - QOTD_FRESHNESS_HOURS * 3_600_000,
    ).toISOString();

    const { data, error } = await supabase
      .from("forum_threads")
      .select("id, title, body, category_slug, created_at, reply_count")
      .eq("is_removed", false)
      .eq("thread_type", "discussion")
      .eq("author_name", QOTD_AUTHOR_NAME)
      .gte("created_at", cutoff)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      log.warn("qotd fetch failed", { error: error.message });
      return null;
    }
    return (data as QotdThread | null) ?? null;
  } catch (err) {
    log.warn("qotd fetch threw", {
      err: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}
