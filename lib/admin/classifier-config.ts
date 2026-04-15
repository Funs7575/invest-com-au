/**
 * Classifier threshold config — read-side helpers.
 *
 * Every classifier that wants live-editable thresholds calls
 * `getClassifierConfig("classifier_name")` at request time. The helper
 * returns a { thresholdName → value } map pulled from the
 * `classifier_config` table.
 *
 * If the table doesn't exist, is empty for that classifier, or the
 * query fails for any reason, the helper returns an EMPTY map and the
 * caller is expected to fall back to its hardcoded defaults. This
 * guarantees a safe rollout: a misconfigured row NEVER causes a
 * classifier to behave erratically, it just leaves the defaults in
 * place until someone fixes the config.
 *
 * Results are cached in-process for 60 seconds so the classifier
 * doesn't hit Supabase on every request. 60 seconds is short enough
 * that a config change propagates quickly, long enough that a hot
 * classifier doesn't hammer the DB.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("classifier-config");

// Module-level cache. Map<classifier, {cachedAt, values}>
const cache = new Map<string, { cachedAt: number; values: Record<string, number> }>();
const CACHE_TTL_MS = 60 * 1000;

export async function getClassifierConfig(
  classifier: string,
): Promise<Record<string, number>> {
  const now = Date.now();
  const cached = cache.get(classifier);
  if (cached && now - cached.cachedAt < CACHE_TTL_MS) {
    return cached.values;
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("classifier_config")
      .select("threshold_name, value")
      .eq("classifier", classifier);

    if (error) {
      log.warn("classifier_config fetch failed — falling back to defaults", {
        classifier,
        error: error.message,
      });
      cache.set(classifier, { cachedAt: now, values: {} });
      return {};
    }

    const values: Record<string, number> = {};
    for (const row of data || []) {
      values[row.threshold_name] = Number(row.value);
    }
    cache.set(classifier, { cachedAt: now, values });
    return values;
  } catch (err) {
    log.warn("classifier_config threw — falling back to defaults", {
      classifier,
      err: err instanceof Error ? err.message : String(err),
    });
    return {};
  }
}

/**
 * Read a single threshold with a hardcoded default.
 *
 *     const minSignals = await getThreshold("text_moderation", "min_spam_signals", 2);
 *
 * If the value in the DB is outside [min_value, max_value] bounds
 * (checked at write time), the value was never written in the first
 * place — there's no runtime guardrail here, just the write path.
 */
export async function getThreshold(
  classifier: string,
  thresholdName: string,
  defaultValue: number,
): Promise<number> {
  const config = await getClassifierConfig(classifier);
  const value = config[thresholdName];
  return typeof value === "number" && !Number.isNaN(value) ? value : defaultValue;
}

/**
 * Invalidate the cache for a classifier. Called by the admin
 * /api/admin/automation/config POST handler after a write so the
 * next classifier call picks up the new value immediately instead
 * of waiting up to 60 seconds.
 */
export function invalidateClassifierConfigCache(classifier?: string): void {
  if (classifier) {
    cache.delete(classifier);
  } else {
    cache.clear();
  }
}

// ─── Kill switches ─────────────────────────────────────────────────

const killSwitchCache = new Map<string, { cachedAt: number; disabled: boolean }>();

/**
 * Check whether a classifier / cron feature is currently disabled.
 * Every classifier entry point should call this and short-circuit
 * if true so a kill switch actually takes effect immediately.
 *
 * Returns true if either the global kill switch OR the per-feature
 * switch is on. Cached 30 seconds.
 */
export async function isFeatureDisabled(feature: string): Promise<boolean> {
  const now = Date.now();

  const cachedFeature = killSwitchCache.get(feature);
  if (cachedFeature && now - cachedFeature.cachedAt < 30_000 && cachedFeature.disabled) {
    return true;
  }
  const cachedGlobal = killSwitchCache.get("global");
  if (cachedGlobal && now - cachedGlobal.cachedAt < 30_000 && cachedGlobal.disabled) {
    return true;
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("automation_kill_switches")
      .select("feature, disabled")
      .in("feature", [feature, "global"]);

    if (error) return false; // fail-open: a DB error should not disable automation

    let featureDisabled = false;
    for (const row of data || []) {
      killSwitchCache.set(row.feature, { cachedAt: now, disabled: row.disabled });
      if (row.disabled) featureDisabled = true;
    }
    return featureDisabled;
  } catch {
    return false;
  }
}

export function invalidateKillSwitchCache(): void {
  killSwitchCache.clear();
}
