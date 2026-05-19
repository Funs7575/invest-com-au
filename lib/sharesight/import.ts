/**
 * Sharesight → `investor_holdings` normalization + dedup (W2.11 / X5g).
 *
 * Sharesight expresses a portfolio as portfolios → holdings. Each holding
 * is the aggregated position for one (instrument_code, market_code) pair.
 * We mirror that into our `investor_holdings` table — one row per holding,
 * stamped with broker_slug `sharesight` so the user can tell where it
 * came from later.
 *
 * Dedup contract (matches the CSV-import pipeline's expectation):
 *
 *   A Sharesight holding is considered "already present" iff the user
 *   already has a row in `investor_holdings` with the same
 *   (ticker, exchange, broker_slug=sharesight). On second import we
 *   UPDATE the share / cost-basis numbers in place rather than appending
 *   duplicates — Sharesight is the source of truth once connected.
 *
 *   Non-sharesight rows for the same (ticker, exchange) — i.e. ones the
 *   user added manually or imported from a broker CSV — are NEVER
 *   overwritten. The user owns those.
 *
 * Multi-currency: Sharesight returns cost basis in the holding's native
 * currency. Until per-currency FX conversion ships (tracked in the W2
 * backlog alongside the CSV-import FX kill-switches) we accept only
 * AUD-denominated AU markets (ASX). USD / GBP / HKD / etc. rows surface
 * as skipped errors so the user can see exactly what wasn't imported and
 * follow up manually.
 */

import type { SharesightHolding } from "./client";

const SHARESIGHT_BROKER_SLUG = "sharesight";

/** Allowed exchange codes for `investor_holdings.exchange`. */
type ExchangeCode =
  | "ASX"
  | "NASDAQ"
  | "NYSE"
  | "LSE"
  | "HKEX"
  | "SGX"
  | "TYO"
  | "KRX"
  | "CRYPTO"
  | "OTHER";

export interface NormalizedSharesightRow {
  ticker: string;
  exchange: ExchangeCode;
  shares: number;
  cost_basis_per_share_cents: number;
  acquired_at: string;
  broker_slug: typeof SHARESIGHT_BROKER_SLUG;
  notes: string | null;
}

export interface SharesightImportError {
  /** Sharesight's holding id, as a string. */
  holdingId: string;
  reason: string;
}

export interface SharesightNormalizeResult {
  rows: NormalizedSharesightRow[];
  errors: SharesightImportError[];
}

/**
 * Map a Sharesight `market_code` to one of the
 * `investor_holdings.exchange` CHECK constraint values.
 *
 * Sharesight uses ISO MIC-ish codes — "ASX" for Australia, "NASDAQ" /
 * "NYSE" for US, "LSE" for UK, etc. We pass them through when they
 * already match; anything we don't recognise falls through to "OTHER"
 * so the import doesn't fail on novel markets.
 */
function mapMarketCode(market: string): ExchangeCode {
  const m = market.trim().toUpperCase();
  switch (m) {
    case "ASX":
      return "ASX";
    case "NASDAQ":
      return "NASDAQ";
    case "NYSE":
      return "NYSE";
    case "LSE":
      return "LSE";
    case "HKEX":
    case "HKG":
    case "SEHK":
      return "HKEX";
    case "SGX":
      return "SGX";
    case "TYO":
    case "TSE":
      return "TYO";
    case "KRX":
      return "KRX";
    case "CRYPTO":
      return "CRYPTO";
    default:
      return "OTHER";
  }
}

/** AUD-only allowlist while FX conversion is still pending. */
function isAudExchange(ex: ExchangeCode): boolean {
  return ex === "ASX";
}

function isoToday(nowMs = Date.now()): string {
  return new Date(nowMs).toISOString().slice(0, 10);
}

/**
 * Normalize a batch of Sharesight holdings to `NormalizedSharesightRow`.
 * Rows that can't be persisted (non-AUD, bad data, etc.) come back in
 * `errors` so the route can return them to the UI.
 */
export function normalizeSharesightHoldings(
  raw: SharesightHolding[],
  nowMs = Date.now(),
): SharesightNormalizeResult {
  const rows: NormalizedSharesightRow[] = [];
  const errors: SharesightImportError[] = [];

  for (const h of raw) {
    const id = String(h.id);
    const exchange = mapMarketCode(h.market_code);

    if (!isAudExchange(exchange)) {
      errors.push({
        holdingId: id,
        reason: `non-AUD market ${h.market_code} requires FX conversion — temporarily unsupported. Coming soon.`,
      });
      continue;
    }

    if (!Number.isFinite(h.quantity) || h.quantity <= 0) {
      errors.push({ holdingId: id, reason: `invalid quantity: ${h.quantity}` });
      continue;
    }

    const costBasis = h.cost_basis ?? 0;
    if (!Number.isFinite(costBasis) || costBasis < 0) {
      errors.push({ holdingId: id, reason: `invalid cost basis: ${h.cost_basis}` });
      continue;
    }
    const costBasisCents = Math.round(costBasis * 100);

    rows.push({
      ticker: h.instrument_code.trim().toUpperCase(),
      exchange,
      shares: h.quantity,
      cost_basis_per_share_cents: costBasisCents,
      acquired_at: h.first_purchase_date ?? isoToday(nowMs),
      broker_slug: SHARESIGHT_BROKER_SLUG,
      notes: null,
    });
  }

  return { rows, errors };
}

export interface ExistingHoldingKey {
  id: number;
  ticker: string;
  exchange: ExchangeCode;
  broker_slug: string | null;
}

export interface DedupPlan {
  /** New rows to INSERT — no matching sharesight row exists for the user. */
  toInsert: NormalizedSharesightRow[];
  /** Existing sharesight-tagged rows to UPDATE in place (same ticker+exchange). */
  toUpdate: Array<{ id: number; patch: NormalizedSharesightRow }>;
  /** Sharesight rows the user has already overridden manually — skipped. */
  skippedNonSharesight: NormalizedSharesightRow[];
}

/**
 * Compute the insert/update plan against the user's existing holdings.
 *
 *   - existing sharesight row → UPDATE
 *   - existing non-sharesight row (e.g. CSV-imported, manual) → SKIP
 *     (user manually-managed; we don't blow it away)
 *   - no existing row → INSERT
 */
export function planSharesightDedup(
  rows: NormalizedSharesightRow[],
  existing: ExistingHoldingKey[],
): DedupPlan {
  const toInsert: NormalizedSharesightRow[] = [];
  const toUpdate: Array<{ id: number; patch: NormalizedSharesightRow }> = [];
  const skippedNonSharesight: NormalizedSharesightRow[] = [];

  // Build lookup: key by ticker+exchange. We keep the matching row's
  // broker_slug + id so the planner can decide insert/update/skip.
  const byKey = new Map<string, ExistingHoldingKey>();
  for (const e of existing) {
    byKey.set(`${e.ticker}|${e.exchange}`, e);
  }

  for (const r of rows) {
    const match = byKey.get(`${r.ticker}|${r.exchange}`);
    if (!match) {
      toInsert.push(r);
    } else if (match.broker_slug === SHARESIGHT_BROKER_SLUG) {
      toUpdate.push({ id: match.id, patch: r });
    } else {
      skippedNonSharesight.push(r);
    }
  }

  return { toInsert, toUpdate, skippedNonSharesight };
}
