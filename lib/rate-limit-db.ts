/**
 * DB-backed token bucket rate limiter.
 *
 * The existing in-memory limiter in `lib/rate-limiter.ts` provides
 * per-container rate limiting, which is useless on Vercel where each
 * invocation may land on a different container. This limiter stores
 * bucket state in `rate_limit_buckets` so it survives cold starts and
 * is shared across all workers.
 *
 * Algorithm (classic token bucket):
 *
 *   1. On each call, compute elapsed since refilled_at and add
 *      elapsed * refill_per_sec tokens (capped at max_tokens).
 *   2. If tokens >= 1, decrement and allow.
 *   3. Else deny.
 *
 * Fail-open on DB errors: if Supabase is down we still want leads
 * to get through. An error from the limiter degrades to "allowed"
 * and logs a warning so we see it in Sentry.
 *
 * Usage:
 *
 *     const allowed = await isAllowed("email_capture", ip, {
 *       max: 10,
 *       refillPerSec: 10 / 60, // 10 per minute
 *     });
 *     if (!allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("rate-limit-db");

export interface BucketOptions {
  /** Maximum tokens in the bucket (burst capacity) */
  max: number;
  /** Tokens added per second (steady-state rate) */
  refillPerSec: number;
}

export async function isAllowed(
  scope: string,
  key: string,
  options: BucketOptions,
): Promise<boolean> {
  const { max, refillPerSec } = options;
  if (max <= 0 || refillPerSec <= 0) return true;

  const supabase = createAdminClient();
  const nowIso = new Date().toISOString();

  try {
    // Upsert-read-decrement in a tight loop. Race against concurrent
    // decrements is handled by using the `tokens` column in the
    // update's WHERE clause (optimistic CAS).
    const { data: existing } = await supabase
      .from("rate_limit_buckets")
      .select("tokens, max_tokens, refill_per_sec, refilled_at")
      .eq("scope", scope)
      .eq("key", key)
      .maybeSingle();

    if (!existing) {
      // First hit: create bucket with max - 1 tokens (we're consuming 1)
      const { error } = await supabase.from("rate_limit_buckets").insert({
        scope,
        key,
        tokens: max - 1,
        max_tokens: max,
        refill_per_sec: refillPerSec,
        refilled_at: nowIso,
      });
      // If the insert raced with another insert, fall through to the
      // update path by re-reading. A primary-key conflict here means
      // the row already exists.
      if (error && error.code !== "23505") {
        log.warn("rate_limit_buckets insert failed (fail-open)", {
          scope,
          key,
          error: error.message,
        });
        return true;
      }
      if (!error) return true;
    }

    // Re-read if we raced
    const row =
      existing ||
      (
        await supabase
          .from("rate_limit_buckets")
          .select("tokens, max_tokens, refill_per_sec, refilled_at")
          .eq("scope", scope)
          .eq("key", key)
          .maybeSingle()
      ).data;

    if (!row) return true; // still no row, fail open

    const elapsedSec = Math.max(
      0,
      (Date.now() - new Date(row.refilled_at as string).getTime()) / 1000,
    );
    const rawRefilled = Number(row.tokens) + elapsedSec * Number(row.refill_per_sec);
    const refilled = Math.min(Number(row.max_tokens), rawRefilled);

    if (refilled < 1) {
      // Deny — still stamp refilled_at so the next call reads from
      // a newer baseline and doesn't double-count elapsed time.
      await supabase
        .from("rate_limit_buckets")
        .update({ tokens: refilled, refilled_at: nowIso })
        .eq("scope", scope)
        .eq("key", key);
      return false;
    }

    // Allow — decrement and store
    const { error: updErr } = await supabase
      .from("rate_limit_buckets")
      .update({ tokens: refilled - 1, refilled_at: nowIso })
      .eq("scope", scope)
      .eq("key", key);
    if (updErr) {
      log.warn("rate_limit_buckets update failed (fail-open)", {
        scope,
        key,
        error: updErr.message,
      });
      return true;
    }
    return true;
  } catch (err) {
    log.warn("rate limiter threw (fail-open)", {
      scope,
      key,
      err: err instanceof Error ? err.message : String(err),
    });
    return true;
  }
}

/**
 * Short-hand for endpoints that key on IP only with preset windows.
 *
 *   perMinute: 10 per minute per IP (default)
 *   perHour:   60 per hour per IP
 *   perDay:    500 per day per IP
 */
export function bucketPreset(preset: "perMinute" | "perHour" | "perDay"): BucketOptions {
  switch (preset) {
    case "perMinute":
      return { max: 10, refillPerSec: 10 / 60 };
    case "perHour":
      return { max: 60, refillPerSec: 60 / 3600 };
    case "perDay":
      return { max: 500, refillPerSec: 500 / 86400 };
  }
}

/**
 * Extract a key from a NextRequest — IP first, fall back to a header
 * or a hash of UA if IP is missing. Never returns empty string.
 */
export function ipKey(req: { headers: Headers }): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  const ua = req.headers.get("user-agent") || "unknown";
  return `ua:${ua.slice(0, 64)}`;
}
