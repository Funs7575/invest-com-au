/**
 * Sharesight v3 portfolio API client + holdings transformer.
 *
 * Endpoints used (Sharesight Public API v3):
 *   GET /api/v3/portfolios
 *     → { portfolios: [{ id, name, ... }] }
 *
 *   GET /api/v3/portfolios/{id}/holdings
 *     → { holdings: [{ id, instrument: {...}, quantity, value, ... }] }
 *
 * Sharesight exposes `instrument.code` (ticker) + `instrument.market_code`
 * (AU / NZ / NASDAQ / NYSE / LSE / ...) which we translate to the
 * codebase's `investor_holdings.exchange` enum. Anything unmapped lands as
 * `OTHER` rather than throwing — Sharesight occasionally adds new market
 * codes for global expansion and we'd rather degrade than reject the row.
 *
 * The transformer is pure: feed it a JSON shape, get back
 * `{ rows: ParsedHoldingRow[], errors: SharesightImportError[] }`. The
 * sync layer handles the actual HTTP calls + DB writes.
 */
import type { ParsedHoldingRow } from "@/lib/holdings/csv-import";
import { logger } from "@/lib/logger";

const log = logger("sharesight:api");

const SHARESIGHT_BROKER_SLUG = "sharesight";

export interface SharesightPortfolio {
  id: number;
  name: string;
}

/** The subset of fields we read off each holding row. Sharesight returns
 *  more (purchase_price, return_value, performance, etc.) — we ignore the
 *  rest to keep the surface stable across API minor versions. */
export interface SharesightHolding {
  id: number;
  instrument: {
    id?: number;
    code: string;
    market_code: string;
    name?: string;
  };
  quantity: number;
  /** Total cost base of the position in portfolio currency, cents-as-dollars
   *  (Sharesight returns dollars not cents). */
  cost_base?: number | null;
  /** Earliest grant/purchase date for the holding, ISO-8601. */
  grant_date?: string | null;
  /** Some responses use `granted_date` instead — accept both. */
  granted_date?: string | null;
}

export interface SharesightImportError {
  holdingId: number | null;
  ticker: string | null;
  reason: string;
}

export interface SharesightImportResult {
  rows: ParsedHoldingRow[];
  errors: SharesightImportError[];
}

const MARKET_TO_EXCHANGE: Record<string, ParsedHoldingRow["exchange"]> = {
  ASX: "ASX",
  AU: "ASX",
  AX: "ASX",
  NASDAQ: "NASDAQ",
  NMS: "NASDAQ",
  NYSE: "NYSE",
  NYQ: "NYSE",
  AMEX: "NYSE",
  LSE: "LSE",
  LON: "LSE",
  L: "LSE",
  HKG: "HKEX",
  HKEX: "HKEX",
  HK: "HKEX",
  SGX: "SGX",
  SG: "SGX",
  SI: "SGX",
  TYO: "TYO",
  T: "TYO",
  JP: "TYO",
  KRX: "KRX",
  KS: "KRX",
  KQ: "KRX",
};

export function mapMarketCode(
  market: string | null | undefined,
): ParsedHoldingRow["exchange"] {
  if (!market) return "OTHER";
  return MARKET_TO_EXCHANGE[market.toUpperCase()] ?? "OTHER";
}

export async function fetchPortfolios(
  accessToken: string,
  baseUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<SharesightPortfolio[]> {
  const res = await fetchImpl(`${baseUrl}/api/v3/portfolios`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    throw new SharesightApiError(
      `Sharesight portfolios fetch failed (${res.status})`,
      res.status,
    );
  }
  const json = (await res.json()) as { portfolios?: SharesightPortfolio[] };
  return Array.isArray(json.portfolios) ? json.portfolios : [];
}

export async function fetchHoldings(
  accessToken: string,
  baseUrl: string,
  portfolioId: number,
  fetchImpl: typeof fetch = fetch,
): Promise<SharesightHolding[]> {
  const res = await fetchImpl(
    `${baseUrl}/api/v3/portfolios/${encodeURIComponent(
      String(portfolioId),
    )}/holdings`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(15_000),
    },
  );
  if (!res.ok) {
    throw new SharesightApiError(
      `Sharesight holdings fetch failed (${res.status})`,
      res.status,
    );
  }
  const json = (await res.json()) as { holdings?: SharesightHolding[] };
  return Array.isArray(json.holdings) ? json.holdings : [];
}

/**
 * Convert raw Sharesight holding rows into the codebase's
 * `ParsedHoldingRow` shape (same contract used by the CSV-import pipeline).
 *
 * Currency assumption: Sharesight returns `cost_base` in the portfolio's
 * base currency. We follow the same conservative rule that the CSV
 * parsers use post-Codex audit (W2.9 reconcile) — any non-AUD position is
 * rejected with a clear "FX conversion not yet supported" error rather
 * than silently treated as AUD. The portfolio currency reaches us via the
 * sync layer (one call per portfolio) and is passed through here.
 */
export function transformHoldings(
  holdings: SharesightHolding[],
  portfolioCurrency: string,
): SharesightImportResult {
  const rows: ParsedHoldingRow[] = [];
  const errors: SharesightImportError[] = [];

  for (const h of holdings) {
    const ticker = (h.instrument?.code || "").toUpperCase().trim();
    if (!ticker) {
      errors.push({
        holdingId: h.id ?? null,
        ticker: null,
        reason: "missing instrument code",
      });
      continue;
    }
    if (!Number.isFinite(h.quantity) || h.quantity <= 0) {
      errors.push({
        holdingId: h.id ?? null,
        ticker,
        reason: `invalid quantity: ${h.quantity}`,
      });
      continue;
    }
    if (portfolioCurrency.toUpperCase() !== "AUD") {
      errors.push({
        holdingId: h.id ?? null,
        ticker,
        reason: `non-AUD portfolio (${portfolioCurrency}) requires FX conversion — temporarily unsupported. Coming soon.`,
      });
      continue;
    }
    const exchange = mapMarketCode(h.instrument?.market_code);
    const costBaseDollars =
      typeof h.cost_base === "number" && Number.isFinite(h.cost_base)
        ? h.cost_base
        : null;
    if (costBaseDollars == null || costBaseDollars < 0) {
      errors.push({
        holdingId: h.id ?? null,
        ticker,
        reason: "missing or invalid cost_base",
      });
      continue;
    }
    const costBasisPerShareCents = Math.round(
      (costBaseDollars * 100) / h.quantity,
    );
    const acquired = isoDate(h.grant_date ?? h.granted_date ?? null);
    if (!acquired) {
      errors.push({
        holdingId: h.id ?? null,
        ticker,
        reason: "missing or unparseable grant_date / granted_date",
      });
      continue;
    }
    rows.push({
      ticker,
      exchange,
      shares: h.quantity,
      cost_basis_per_share_cents: costBasisPerShareCents,
      acquired_at: acquired,
      broker_slug: SHARESIGHT_BROKER_SLUG,
      notes: "Imported from Sharesight",
    });
  }

  if (errors.length > 0) {
    log.info("sharesight transform produced errors", {
      error_count: errors.length,
      row_count: rows.length,
    });
  }

  return { rows, errors };
}

function isoDate(raw: string | null): string | null {
  if (!raw) return null;
  // Accept "YYYY-MM-DD" directly; otherwise round-trip via Date for ISO
  // timestamps. Reject anything else.
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

export class SharesightApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "SharesightApiError";
    this.status = status;
  }
}

export { SHARESIGHT_BROKER_SLUG };
