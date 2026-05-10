/**
 * Cached current-price reader for /account/holdings.
 *
 * Read path:
 *   1. Look up `holdings_price_cache` for the (ticker, exchange) pair.
 *   2. If row exists AND fetched_at < TTL → return cached price.
 *   3. Otherwise fetch from upstream:
 *      - On success: upsert cache, return fresh price.
 *      - On failure: if we have a row at all (even outside TTL), return
 *        it marked source='stale'; otherwise return null.
 *
 * TTL by exchange:
 *   - CRYPTO: 1 hour (more volatile than equities)
 *   - everything else: 24 hours
 *
 * Rate-limit hygiene:
 *   - last_attempt_at on the cache row prevents tight retry loops
 *     on a chronically-failing upstream. We won't re-attempt a cold
 *     fetch within 5 min of the last attempt.
 *   - Stale fallback caps at 7 days — anything older returns null,
 *     because a week-old equity price is worse than no price.
 *
 * No anon access (table is service-role only). Always called from
 * server contexts that hold the admin client.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import {
  fetchPriceForHolding,
  type PriceQuote,
} from "./value-source";

const log = logger("holdings:value");

const TTL_MS_EQUITY = 24 * 60 * 60 * 1000;     // 24 hours
const TTL_MS_CRYPTO = 60 * 60 * 1000;          // 1 hour
const ATTEMPT_THROTTLE_MS = 5 * 60 * 1000;     // 5 min between cold retries
const STALE_FALLBACK_MAX_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface CurrentValue {
  priceCents: number;
  currency: string;
  source: "yahoo" | "coingecko" | "stale";
  fetchedAt: string; // ISO; for the UI's "as of <time ago>" label
}

function ttlForExchange(exchange: string): number {
  return exchange === "CRYPTO" ? TTL_MS_CRYPTO : TTL_MS_EQUITY;
}

export async function getCurrentPrice(
  ticker: string,
  exchange: string,
): Promise<CurrentValue | null> {
  const supabase = createAdminClient();
  const ttl = ttlForExchange(exchange);
  const now = new Date();
  const nowMs = now.getTime();

  // 1. Look up cache.
  const { data: cached, error: cacheErr } = await supabase
    .from("holdings_price_cache")
    .select("price_cents, currency, source, fetched_at, last_attempt_at")
    .eq("ticker", ticker)
    .eq("exchange", exchange)
    .maybeSingle();

  if (cacheErr) {
    log.warn("cache read failed", { ticker, exchange, error: cacheErr.message });
  }

  if (cached) {
    const fetchedMs = new Date(cached.fetched_at as string).getTime();
    if (nowMs - fetchedMs < ttl && (cached.source as string) !== "stale") {
      return {
        priceCents: Number(cached.price_cents),
        currency: cached.currency as string,
        source: cached.source as "yahoo" | "coingecko",
        fetchedAt: cached.fetched_at as string,
      };
    }
    // Outside TTL or marked stale — check if we just attempted (don't hammer).
    const attemptMs = new Date(cached.last_attempt_at as string).getTime();
    if (nowMs - attemptMs < ATTEMPT_THROTTLE_MS) {
      // Recent attempt and still no fresh data → return stale.
      return staleFallback(cached, nowMs);
    }
  }

  // 2. Cold or expired — fetch upstream.
  const quote = await fetchPriceForHolding(ticker, exchange);

  if (quote) {
    await upsertCache(ticker, exchange, quote, now);
    return {
      priceCents: quote.priceCents,
      currency: quote.currency,
      source: quote.source,
      fetchedAt: now.toISOString(),
    };
  }

  // 3. Upstream failed — record the attempt + return stale if available.
  if (cached) {
    await markAttempt(ticker, exchange, now);
    return staleFallback(cached, nowMs);
  }
  return null;
}

/**
 * Batch helper — looks up many holdings in parallel. The page uses this
 * to avoid serial DB hits on render.
 */
export async function getCurrentPricesBatch(
  pairs: ReadonlyArray<{ ticker: string; exchange: string }>,
): Promise<Map<string, CurrentValue | null>> {
  const out = new Map<string, CurrentValue | null>();
  await Promise.all(
    pairs.map(async (p) => {
      const v = await getCurrentPrice(p.ticker, p.exchange);
      out.set(keyOf(p.ticker, p.exchange), v);
    }),
  );
  return out;
}

export function keyOf(ticker: string, exchange: string): string {
  return `${exchange}:${ticker.toUpperCase()}`;
}

// ─── Internals ──────────────────────────────────────────────────────────────

function staleFallback(
  cached: {
    price_cents: number | string;
    currency: string;
    fetched_at: string;
  },
  nowMs: number,
): CurrentValue | null {
  const fetchedMs = new Date(cached.fetched_at).getTime();
  if (nowMs - fetchedMs > STALE_FALLBACK_MAX_MS) return null;
  return {
    priceCents: Number(cached.price_cents),
    currency: cached.currency,
    source: "stale",
    fetchedAt: cached.fetched_at,
  };
}

async function upsertCache(
  ticker: string,
  exchange: string,
  quote: PriceQuote,
  now: Date,
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("holdings_price_cache")
    .upsert(
      {
        ticker,
        exchange,
        price_cents: quote.priceCents,
        currency: quote.currency,
        source: quote.source,
        fetched_at: now.toISOString(),
        last_attempt_at: now.toISOString(),
      },
      { onConflict: "ticker,exchange" },
    );
  if (error) {
    log.warn("cache upsert failed", { ticker, exchange, error: error.message });
  }
}

async function markAttempt(ticker: string, exchange: string, now: Date): Promise<void> {
  const supabase = createAdminClient();
  await supabase
    .from("holdings_price_cache")
    .update({ last_attempt_at: now.toISOString() })
    .eq("ticker", ticker)
    .eq("exchange", exchange);
}
