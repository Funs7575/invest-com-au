/**
 * Price-source abstraction for holdings (W2 Phase 1 follow-up to PR-X5c).
 *
 * Two upstream sources, no hard dependencies on either being available:
 *   - Yahoo Finance via `yahoo-finance2` for equities (free, no key,
 *     ASX needs `.AX` suffix, NASDAQ/NYSE/etc. don't, LSE needs `.L`,
 *     HKEX `.HK`, SGX `.SI`, TYO `.T`, KRX `.KS`)
 *   - CoinGecko free API for crypto (no key required up to ~30 req/min)
 *
 * Each fetcher returns `{ priceCents, currency } | null`. null on
 * upstream failure / ticker-not-found — the cache layer will decide
 * whether to fall back to a stale row.
 *
 * Network calls are wrapped in a 4-second timeout. The cache layer
 * already absorbs most reads; a slow upstream should not block a page
 * render on the cold-cache cases.
 *
 * NOT included (deliberate):
 *   - Marketstack fallback — only worth adding if Yahoo rate-limits
 *     in practice
 *   - Pre-warm cron — premature
 *   - Multi-currency conversion — UI shows the source currency for now
 */

import { logger } from "@/lib/logger";

const log = logger("holdings:value-source");

const FETCH_TIMEOUT_MS = 4000;

export interface PriceQuote {
  priceCents: number;
  currency: string;
  source: "yahoo" | "coingecko";
}

const ASX_SUFFIX_BY_EXCHANGE: Record<string, string> = {
  ASX: ".AX",
  LSE: ".L",
  HKEX: ".HK",
  SGX: ".SI",
  TYO: ".T",
  KRX: ".KS",
  // NASDAQ / NYSE / OTHER: bare ticker (no suffix)
};

/**
 * Translate a stored ticker + exchange to a Yahoo Finance symbol.
 * Yahoo's symbol format is `<ticker><suffix>` for non-US exchanges.
 * We tolerate the user already having the suffix in `ticker` (idempotent).
 */
export function toYahooSymbol(ticker: string, exchange: string): string {
  const upper = ticker.trim().toUpperCase();
  const suffix = ASX_SUFFIX_BY_EXCHANGE[exchange];
  if (!suffix) return upper;
  if (upper.endsWith(suffix)) return upper;
  // Strip any other suffix the user may have typed in (e.g. ASX entered as .AX
  // when exchange is already ASX → already fine; but tolerate ASX entered as
  // bare without the suffix).
  return `${upper}${suffix}`;
}

/**
 * Fetch a current equity price from Yahoo Finance via the
 * `yahoo-finance2` library. Lazy-imported so the dep doesn't pollute
 * the bundle of routes that don't read prices.
 */
export async function fetchEquityPrice(
  ticker: string,
  exchange: string,
): Promise<PriceQuote | null> {
  const symbol = toYahooSymbol(ticker, exchange);
  try {
    const yfMod = await import("yahoo-finance2").catch(() => null);
    if (!yfMod) {
      log.debug("yahoo-finance2 not installed in this build");
      return null;
    }
    const yf = (yfMod as { default?: unknown }).default ?? yfMod;
    // yahoo-finance2 default export is a class instance with a `quote` method.
    const quoteFn = (yf as { quote?: (s: string, opts?: unknown) => Promise<unknown> }).quote;
    if (typeof quoteFn !== "function") {
      log.warn("yahoo-finance2 quote not a function — library shape changed?");
      return null;
    }
    const quote = await Promise.race([
      quoteFn.call(yf, symbol),
      timeoutPromise<unknown>("yahoo timeout"),
    ]);
    const q = quote as Record<string, unknown> | null;
    if (!q) return null;
    const priceRaw = q.regularMarketPrice ?? q.postMarketPrice ?? q.preMarketPrice;
    const currency = (q.currency as string) || (q.financialCurrency as string) || "USD";
    if (typeof priceRaw !== "number" || !isFinite(priceRaw) || priceRaw < 0) return null;
    return {
      priceCents: Math.round(priceRaw * 100),
      currency: currency.toUpperCase().slice(0, 3),
      source: "yahoo",
    };
  } catch (err) {
    log.debug("yahoo fetch failed", { symbol, err: errMsg(err) });
    return null;
  }
}

/**
 * Fetch a crypto spot price from CoinGecko free API in AUD.
 * Tickers stored as 'BTC' or 'BTC-AUD' both resolve. We map common
 * symbols to CoinGecko ids; unknown symbols return null.
 */
export async function fetchCryptoPrice(ticker: string): Promise<PriceQuote | null> {
  const symbol = ticker.trim().toUpperCase().replace(/-AUD$/, "");
  const id = COINGECKO_IDS[symbol];
  if (!id) {
    log.debug("coingecko id not mapped", { symbol });
    return null;
  }
  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=aud`;
    const res = await Promise.race([
      fetch(url, { headers: { accept: "application/json" } }),
      timeoutPromise<Response>("coingecko timeout"),
    ]);
    if (!res.ok) {
      log.debug("coingecko non-ok", { id, status: res.status });
      return null;
    }
    const body = (await res.json()) as Record<string, { aud?: number }>;
    const priceAud = body[id]?.aud;
    if (typeof priceAud !== "number" || !isFinite(priceAud) || priceAud <= 0) return null;
    return {
      priceCents: Math.round(priceAud * 100),
      currency: "AUD",
      source: "coingecko",
    };
  } catch (err) {
    log.debug("coingecko fetch failed", { symbol, err: errMsg(err) });
    return null;
  }
}

/**
 * Top-level dispatcher. Routes by exchange to the correct fetcher.
 */
export async function fetchPriceForHolding(
  ticker: string,
  exchange: string,
): Promise<PriceQuote | null> {
  if (exchange === "CRYPTO") return fetchCryptoPrice(ticker);
  return fetchEquityPrice(ticker, exchange);
}

// ─── Internals ──────────────────────────────────────────────────────────────

function timeoutPromise<T>(label: string): Promise<T> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(label)), FETCH_TIMEOUT_MS);
  });
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

// CoinGecko id mapping for the most common AU-investor tickers. Any
// missing symbol returns null from fetchCryptoPrice — UI renders "—".
// Extend this map as we see real holdings come in.
const COINGECKO_IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  XRP: "ripple",
  ADA: "cardano",
  DOGE: "dogecoin",
  DOT: "polkadot",
  LINK: "chainlink",
  MATIC: "matic-network",
  AVAX: "avalanche-2",
  LTC: "litecoin",
  BCH: "bitcoin-cash",
  USDC: "usd-coin",
  USDT: "tether",
  BNB: "binancecoin",
  ATOM: "cosmos",
  ALGO: "algorand",
  XLM: "stellar",
  NEAR: "near",
  TRX: "tron",
};
