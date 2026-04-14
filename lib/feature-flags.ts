/**
 * Feature flag evaluator.
 *
 * Strictly more powerful than the existing `isFeatureDisabled`
 * kill switches: a flag can be partially on (percentage rollout),
 * targeted at specific users/segments (allowlist / denylist), or
 * fully on.
 *
 * Kill switches stay for the existing automation features — those
 * are strict on/off emergency handles. New features start here
 * and can be ramped gradually.
 *
 * API:
 *
 *     const enabled = await isFlagEnabled("new_search_ui", {
 *       userKey: user.email,
 *       segment: "admin",
 *     });
 *     if (enabled) { ... }
 *
 * The evaluator caches rows in-process for 30 seconds so flipping
 * a flag in the admin UI propagates within one cron cycle.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("feature-flags");

export interface FlagContext {
  userKey?: string | null;
  segment?: "advisor" | "broker" | "admin" | "user" | null;
}

interface FlagRow {
  flag_key: string;
  enabled: boolean;
  rollout_pct: number;
  allowlist: string[];
  denylist: string[];
  segments: string[];
}

const CACHE_TTL_MS = 30_000;
const cache = new Map<string, { row: FlagRow | null; at: number }>();

/**
 * Stable hash of (flagKey, userKey) → 0..99. Used for percentage
 * rollout. The key is hashed together so different flags get
 * different sticky assignments for the same user — otherwise a
 * 10% rollout would always pick the same people for every flag.
 */
export function rolloutHash(flagKey: string, userKey: string): number {
  const input = `${flagKey}::${userKey}`;
  // FNV-1a — deterministic, dep-free
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) % 100;
}

/**
 * Pure evaluation given a pre-loaded row. Exported so tests can
 * cover every case without mocking Supabase.
 */
export function evaluateFlag(
  row: FlagRow | null | undefined,
  context: FlagContext,
): boolean {
  if (!row) return false;

  const key = context.userKey || "";

  // 1. Denylist wins absolutely
  if (key && row.denylist.includes(key)) return false;

  // 2. Allowlist is next — a listed key is always on regardless
  //    of rollout_pct / enabled
  if (key && row.allowlist.includes(key)) return true;

  // 3. Master switch
  if (!row.enabled) return false;

  // 4. Segment targeting — if segments is set, the caller's
  //    segment must match at least one entry. Empty segments
  //    means "applies to everyone".
  if (row.segments.length > 0) {
    if (!context.segment) return false;
    if (!row.segments.includes(context.segment)) return false;
  }

  // 5. Percentage rollout
  if (row.rollout_pct >= 100) return true;
  if (row.rollout_pct <= 0) return false;
  if (!key) {
    // No stable key → flip a coin per call. That's fine for
    // anonymous read-through feature flags.
    return Math.random() * 100 < row.rollout_pct;
  }
  return rolloutHash(row.flag_key, key) < row.rollout_pct;
}

/**
 * Read a flag row from the DB, with 30-second in-process cache.
 * Fail-open: DB errors return null → evaluateFlag() returns false.
 */
export async function loadFlag(flagKey: string): Promise<FlagRow | null> {
  const now = Date.now();
  const cached = cache.get(flagKey);
  if (cached && now - cached.at < CACHE_TTL_MS) return cached.row;

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("feature_flags")
      .select("flag_key, enabled, rollout_pct, allowlist, denylist, segments")
      .eq("flag_key", flagKey)
      .maybeSingle();
    if (error) {
      log.warn("feature_flags fetch failed", {
        flag: flagKey,
        error: error.message,
      });
      cache.set(flagKey, { row: null, at: now });
      return null;
    }
    const row = (data as FlagRow | null) || null;
    cache.set(flagKey, { row, at: now });
    return row;
  } catch (err) {
    log.warn("feature_flags threw", {
      flag: flagKey,
      err: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

export async function isFlagEnabled(
  flagKey: string,
  context: FlagContext = {},
): Promise<boolean> {
  const row = await loadFlag(flagKey);
  return evaluateFlag(row, context);
}

export function invalidateFlagCache(flagKey?: string): void {
  if (flagKey) cache.delete(flagKey);
  else cache.clear();
}
