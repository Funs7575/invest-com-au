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
  archived_at: string | null;
}

const CACHE_TTL_MS = 30_000;
const cache = new Map<string, { row: FlagRow | null; at: number }>();

// Fail-fast timeout for the Supabase round-trip. Layout-level
// flag reads block server render on every request, so we'd rather
// treat an unresponsive Supabase as "flag off" than wedge the page.
// Real Supabase p99 is well under 2s; 3s leaves headroom without
// stalling Playwright's 15s navigation timeout.
const FETCH_TIMEOUT_MS = 3_000;

// Negative-cache TTL for thrown fetches (DNS fail, timeout, network
// error). Prevents every subsequent loadFlag() in the same render
// from repeating the full timeout wait — critical for `app/layout.tsx`
// which reads three flags back-to-back. Shorter than the positive
// TTL so a recovered Supabase starts serving fresh values quickly.
const NEGATIVE_CACHE_TTL_MS = 5_000;

/**
 * CI and preview environments build with placeholder Supabase creds
 * (see `.github/workflows/ci.yml` → `NEXT_PUBLIC_SUPABASE_URL:
 * https://placeholder.supabase.co`). That hostname resolves in DNS
 * but never answers, so fetch() hangs until its own timeout. The
 * chain of awaits in app/layout.tsx then blows past Playwright's 15s
 * navigationTimeout and every a11y / e2e assertion fails.
 *
 * Short-circuit here so builds against a placeholder URL evaluate
 * every flag as "off" instantly. Production with a real URL is
 * unaffected — the check is a string match against the sentinel
 * value CI sets, nothing more.
 */
function isPlaceholderSupabase(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return true;
  return url.includes("placeholder");
}

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

  // Placeholder creds (CI / local build without .env) → short-circuit
  // to null so the page renders instantly. Cached for the positive
  // TTL to avoid repeating the env check on every read.
  if (isPlaceholderSupabase()) {
    cache.set(flagKey, { row: null, at: now });
    return null;
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("feature_flags")
      .select("flag_key, enabled, rollout_pct, allowlist, denylist, segments, archived_at")
      .eq("flag_key", flagKey)
      .is("archived_at", null)
      .abortSignal(AbortSignal.timeout(FETCH_TIMEOUT_MS))
      .maybeSingle();
    if (error) {
      log.warn("feature_flags fetch failed", {
        flag: flagKey,
        error: error.message,
      });
      // Short negative-cache so a transient Supabase blip doesn't
      // bury every flag in the 30s positive cache, but repeated
      // reads within one render don't each pay the timeout.
      cache.set(flagKey, { row: null, at: now - CACHE_TTL_MS + NEGATIVE_CACHE_TTL_MS });
      return null;
    }
    const row = (data as FlagRow | null) || null;
    cache.set(flagKey, { row, at: now });
    // FF-04: fire-and-forget — lets the expiry cron tell an actively-used
    // disabled flag from a truly dormant one without blocking the caller.
    if (row) {
      void supabase
        .from("feature_flags")
        .update({ last_evaluated_at: new Date().toISOString() })
        .eq("flag_key", flagKey)
        .then(({ error: writeErr }) => {
          if (writeErr) {
            log.warn("feature_flags last_evaluated_at update failed", {
              flag: flagKey,
              error: writeErr.message,
            });
          }
        });
    }
    return row;
  } catch (err) {
    log.warn("feature_flags threw", {
      flag: flagKey,
      err: err instanceof Error ? err.message : String(err),
    });
    // Same short negative-cache window on thrown errors (timeout,
    // DNS failure, network) so the next read in this render returns
    // immediately instead of waiting another FETCH_TIMEOUT_MS.
    cache.set(flagKey, { row: null, at: now - CACHE_TTL_MS + NEGATIVE_CACHE_TTL_MS });
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
