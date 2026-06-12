/**
 * Consumer Quests — server-side award path (idea #19).
 *
 * `awardIfEligible(userId, questId)` is the ONE entry point the trigger
 * routes call. It is:
 *
 *   - Flag-gated INSIDE — `consumer_quests` off ⇒ instant no-op. Callers
 *     don't need to check the flag themselves, so a forgotten check can't
 *     leak awards.
 *   - Idempotent — INSERT ... ON CONFLICT (user_id, quest_id) DO NOTHING.
 *     Re-firing the same trigger (a 4th holding, re-saving a profile)
 *     never stacks rows and never errors on the unique constraint.
 *   - Threshold-aware — quests like `three-holdings` only award once the
 *     caller-supplied `count` meets the registry threshold.
 *   - FAIL-SOFT — every failure path (flag read, table absent in prod,
 *     insert error, unexpected throw) is logged and swallowed. An award
 *     failure must NEVER break the host action (saving a profile, posting
 *     a brief). Callers invoke this fire-and-forget: `void
 *     awardIfEligible(...)` or `.catch(...)`.
 *
 * Writes use the service-role client: `user_achievements` has no
 * authenticated INSERT policy by design (awards are granted server-side,
 * post-action), so the user-scoped client could not write here. This is
 * the "service_role-only write" scope in CLAUDE.md § Two Supabase clients.
 *
 * The badge shelf reads awards via `getUserAwards()` (also service-role —
 * the dashboard already mixes RLS reads with admin aggregate reads, and a
 * cross-render read with no per-row policy dependency is simplest here;
 * the owner SELECT policy still protects any direct client reads).
 */

import { logger } from "@/lib/logger";
import { isFlagEnabled } from "@/lib/feature-flags";
// eslint-disable-next-line no-restricted-imports -- user_achievements has no authenticated INSERT policy (awards are granted server-side, post-action); service-role is the only write path. Reads here also run cross-render with no JWT. Legitimate per CLAUDE.md § "Tables with service_role-only" write semantics.
import { createAdminClient } from "@/lib/supabase/admin";
import { buildEmailToUserIdMap } from "@/lib/notifications";
import { getQuest } from "@/lib/quests";

const log = logger("quests");

export const CONSUMER_QUESTS_FLAG = "consumer_quests";

export interface AwardOptions {
  /**
   * Current count of the underlying entity (e.g. holdings) for
   * threshold quests. When omitted, threshold-1 quests award; quests with
   * a higher threshold are skipped (we can't confirm eligibility without
   * the count, and over-awarding is worse than a missed badge).
   */
  count?: number;
  /** Optional award context persisted to meta jsonb. Never load-bearing. */
  meta?: Record<string, unknown>;
}

interface UserAwardRow {
  quest_id: string;
  awarded_at: string;
  meta: Record<string, unknown> | null;
}

/**
 * Award a quest to a user if eligible and not already earned.
 *
 * Returns `true` only when a NEW row was inserted, `false` for every
 * other outcome (flag off, already earned, threshold unmet, any failure).
 * The return value is advisory — callers fire-and-forget and ignore it.
 */
export async function awardIfEligible(
  userId: string,
  questId: string,
  opts: AwardOptions = {},
): Promise<boolean> {
  try {
    if (!userId) return false;

    const quest = getQuest(questId);
    if (!quest) {
      // Unknown quest id — a wiring typo. Log once; never throw.
      log.warn("award skipped: unknown quest", { questId });
      return false;
    }

    // Flag gate — fail-closed. Keyed by userId so a percentage rollout is
    // sticky per user.
    const enabled = await isFlagEnabled(CONSUMER_QUESTS_FLAG, {
      userKey: userId,
      segment: "user",
    });
    if (!enabled) return false;

    // Threshold gate. threshold-1 quests always pass; higher thresholds
    // need a caller-supplied count that meets the bar.
    if (quest.threshold > 1) {
      if (typeof opts.count !== "number" || opts.count < quest.threshold) {
        return false;
      }
    }

    const admin = createAdminClient();
    // INSERT ... ON CONFLICT DO NOTHING via upsert with ignoreDuplicates.
    // `count: "exact"` lets us tell a fresh award (count 1) from an
    // already-earned no-op (count 0) without a follow-up read.
    const { error, count } = await admin
      .from("user_achievements")
      .upsert(
        {
          user_id: userId,
          quest_id: questId,
          meta: opts.meta ?? {},
        },
        { onConflict: "user_id,quest_id", ignoreDuplicates: true, count: "exact" },
      );

    if (error) {
      // Table absent in prod (flag should gate this, but be defensive),
      // RLS, or any DB error — log and swallow. Host action is untouched.
      log.warn("award insert failed", {
        questId,
        error: error.message,
      });
      return false;
    }

    const inserted = (count ?? 0) > 0;
    if (inserted) {
      log.info("quest awarded", { questId, tier: quest.tier });
    }
    return inserted;
  } catch (err) {
    log.warn("awardIfEligible threw", {
      questId,
      err: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

/**
 * Award an email-keyed quest (currently `first-brief-posted`).
 *
 * Some host actions identify the user only by email (a brief is posted by
 * contact_email, with no session — the route uses the admin client). This
 * resolves that email to an auth user id, then awards normally. When no
 * matching account exists (an anonymous brief from a never-registered
 * email) it is a clean no-op — there's no user to award.
 *
 * Flag-checked first so we don't pay the user-listing cost when the
 * feature is off. Fire-and-forget + fail-soft like awardIfEligible — the
 * brief-creation response must be untouched.
 */
export async function awardByEmail(
  email: string,
  questId: string,
  opts: AwardOptions = {},
): Promise<boolean> {
  try {
    const normalized = (email ?? "").trim().toLowerCase();
    if (!normalized) return false;

    // Cheap flag gate before the (paginated) user lookup. Email-keyed, so
    // there's no userKey for sticky rollout yet — evaluate without a key;
    // a fully-on or allowlisted flag still resolves correctly.
    const enabled = await isFlagEnabled(CONSUMER_QUESTS_FLAG, { segment: "user" });
    if (!enabled) return false;

    const map = await buildEmailToUserIdMap();
    const userId = map.get(normalized);
    if (!userId) return false; // anonymous / unregistered poster — no-op

    return await awardIfEligible(userId, questId, opts);
  } catch (err) {
    log.warn("awardByEmail threw", {
      questId,
      err: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

/**
 * Read a user's earned achievements (service-role). Returns [] on any
 * failure or when the flag is off, so the badge shelf simply renders its
 * empty/locked state rather than erroring. Newest award first.
 */
export async function getUserAwards(userId: string): Promise<UserAwardRow[]> {
  try {
    if (!userId) return [];

    const enabled = await isFlagEnabled(CONSUMER_QUESTS_FLAG, {
      userKey: userId,
      segment: "user",
    });
    if (!enabled) return [];

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("user_achievements")
      .select("quest_id, awarded_at, meta")
      .eq("user_id", userId)
      .order("awarded_at", { ascending: false });

    if (error) {
      log.warn("getUserAwards failed", { error: error.message });
      return [];
    }
    return (data as UserAwardRow[] | null) ?? [];
  } catch (err) {
    log.warn("getUserAwards threw", {
      err: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}
