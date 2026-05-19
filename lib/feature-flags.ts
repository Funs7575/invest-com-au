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

import { unstable_cache } from "next/cache";
// eslint-disable-next-line no-restricted-imports -- feature_flags is service-role-only by design (no anon SELECT policy); admin client is the correct read path per CLAUDE.md § "Two Supabase clients" → "Tables with service_role-only policies"
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
 * Inner Supabase fetch — the part wrapped by Next.js `unstable_cache` for
 * cross-worker deduplication. Always returns `FlagRow | null` (never
 * throws) so cache entries are stable even on timeout / network failure.
 *
 * Telemetry (`last_evaluated_at` update) stays OUTSIDE this function so it
 * fires from the live caller, not from a cached-result replay — otherwise
 * the cron's "actively-used vs dormant" signal would only update on the
 * first call per cache lifetime.
 */
async function fetchFlagRow(flagKey: string): Promise<FlagRow | null> {
  if (isPlaceholderSupabase()) return null;
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
      return null;
    }
    return (data as FlagRow | null) || null;
  } catch (err) {
    log.warn("feature_flags threw", {
      flag: flagKey,
      err: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/**
 * L2 cross-worker cache (Next.js `unstable_cache`). Critical during
 * static export: the build spawns ~29 worker processes, each with its
 * own L1 (in-process) cache. Without L2, every worker independently
 * fetches every layout-level flag (`chatbot_widget`, `report_button`,
 * `push_notifications`, `newsletter_exit_intent`) — 29 × 4 = 116 calls
 * for the first wave alone, plus refetches every 25s as L1 entries
 * expire. Cross-Atlantic latency (Supabase eu-west-1 ↔ Vercel iad1)
 * then turns that into a fetch storm that exceeds the 60s static-page
 * generation timeout and fails the build.
 *
 * `unstable_cache` shares one entry per cacheKey across all workers via
 * the `.next/cache/fetch-cache` directory. 60s revalidate balances
 * worker dedup (fast) with admin-UI flag-flip propagation (~1 min).
 *
 * Runtime impact is also positive: serverless functions warming up
 * read from the shared cache instead of each calling Supabase.
 */
const cachedFetchFlagRow = unstable_cache(
  fetchFlagRow,
  ["feature-flag-row-v1"],
  { revalidate: 60, tags: ["feature-flags"] },
);

/**
 * Read a flag row from the DB, with two-layer caching:
 *  - L1: per-process Map (30s TTL, fastest, used by serverless hot paths)
 *  - L2: Next.js unstable_cache (cross-worker, ~60s TTL, kills build-time
 *    fetch storms)
 *
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

  // L2 fetch. fetchFlagRow already swallows errors and returns null,
  // so the unstable_cache entry is always stable (null or row, never
  // a thrown exception). On a true Supabase outage L2 caches null
  // for 60s — matching the prior negative-cache intent at scale.
  //
  // Falls back to the raw fetcher when unstable_cache throws (E469 in
  // vitest — no Next.js incremental-cache context) so unit tests and
  // any other environment without a Next request context still work.
  let row: FlagRow | null;
  try {
    row = await cachedFetchFlagRow(flagKey);
  } catch {
    row = await fetchFlagRow(flagKey);
  }

  if (row === null) {
    // Short negative-cache in L1 so repeated reads within one render
    // don't each pay the L2 (or worse, a fresh Supabase) round-trip
    // after a 60s revalidate window expires. Matches the original
    // 5s negative-cache TTL.
    cache.set(flagKey, { row: null, at: now - CACHE_TTL_MS + NEGATIVE_CACHE_TTL_MS });
    return null;
  }

  cache.set(flagKey, { row, at: now });
  // FF-04: fire-and-forget — lets the expiry cron tell an actively-used
  // disabled flag from a truly dormant one without blocking the caller.
  // Stays outside the L2 cache so it fires once per L1 miss (≈ once per
  // 30s per worker) rather than only on the first call per L2 lifetime.
  void createAdminClient()
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
  return row;
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
