/**
 * Map Sharesight API responses to the `ParsedHoldingRow` shape used by
 * the CSV-import pipeline and the bulk-insert path.
 *
 * Sharesight's holdings API returns aggregated positions per (portfolio,
 * instrument). Each holding ships its `quantity` (share count), an
 * average `purchase_price` in the listing currency, and a `market` code
 * (`ASX`, `NASDAQ`, `NYSE`, `LSE`, `HKEX`, `SGX`, `TYO`, `KRX`, ...). We
 * only import the aggregate position — individual trade history isn't
 * needed for `investor_holdings` since cost basis there is per-position.
 *
 * Like the CSV parsers, this module is pure (no DB, no network, no fs).
 * Currency handling mirrors the CSV path: non-AUD positions are pushed
 * as errors until the FX conversion layer ships. See the Codex review
 * walkback on PR #862 + the W2.9 fix commit (PR #873) for context.
 */
import type { ParsedHoldingRow, CsvParseError } from "@/lib/holdings/csv-import";

export interface SharesightHolding {
  /** Sharesight instrument code, eg "BHP", "AAPL". */
  instrument_code: string;
  /** Listing market, eg "ASX", "NASDAQ". Sharesight is global. */
  market_code: string;
  /** Aggregate quantity owned (may be fractional). */
  quantity: number | string;
  /** Average purchase price per share in the instrument's listing currency. */
  average_buy_price?: number | string | null;
  /** Earliest purchase date for the aggregate position (`YYYY-MM-DD`). */
  first_purchase_date?: string | null;
  /** ISO-4217 currency code of the listing market. */
  currency_code?: string | null;
  /** Free-text instrument name; surfaced as a holding note for clarity. */
  instrument_name?: string | null;
}

export interface MappingResult {
  rows: ParsedHoldingRow[];
  errors: CsvParseError[];
}

const SUPPORTED_EXCHANGES = new Set<ParsedHoldingRow["exchange"]>([
  "ASX",
  "NASDAQ",
  "NYSE",
  "LSE",
  "HKEX",
  "SGX",
  "TYO",
  "KRX",
  "CRYPTO",
  "OTHER",
]);

function normaliseMarket(raw: string): ParsedHoldingRow["exchange"] {
  const m = raw.toUpperCase().trim();
  if (SUPPORTED_EXCHANGES.has(m as ParsedHoldingRow["exchange"])) {
    return m as ParsedHoldingRow["exchange"];
  }
  // Common Sharesight aliases — keep tight; everything else falls back
  // to OTHER and the user corrects in the UI.
  if (m === "NMS" || m === "NDQ") return "NASDAQ";
  if (m === "NYQ") return "NYSE";
  if (m === "LON") return "LSE";
  if (m === "TYO" || m === "TSE" || m === "JPX") return "TYO";
  return "OTHER";
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function mapSharesightHoldings(
  raw: readonly SharesightHolding[],
): MappingResult {
  const rows: ParsedHoldingRow[] = [];
  const errors: CsvParseError[] = [];

  raw.forEach((h, idx) => {
    const rowIndex = idx + 1;
    const rawRow = JSON.stringify(h).slice(0, 200);

    const ticker = (h.instrument_code ?? "").trim().toUpperCase();
    if (!ticker) {
      errors.push({ rowIndex, rawRow, reason: "missing instrument code" });
      return;
    }

    const shares = Number(h.quantity);
    if (!Number.isFinite(shares) || shares <= 0) {
      errors.push({ rowIndex, rawRow, reason: `invalid quantity: ${h.quantity}` });
      return;
    }

    const price = Number(h.average_buy_price);
    if (!Number.isFinite(price) || price < 0) {
      errors.push({
        rowIndex,
        rawRow,
        reason: `invalid average_buy_price: ${h.average_buy_price}`,
      });
      return;
    }

    const acquiredAt = (h.first_purchase_date ?? "").trim();
    if (!ISO_DATE.test(acquiredAt)) {
      errors.push({
        rowIndex,
        rawRow,
        reason: `unparseable first_purchase_date: ${h.first_purchase_date}`,
      });
      return;
    }

    // Mirror the CSV path's FX gate: storing a non-AUD price in
    // `cost_basis_per_share_cents` would surface as wrong AUD basis
    // in the holdings UI + tax CSV. Block until the FX layer ships.
    const currency = (h.currency_code ?? "AUD").toUpperCase();
    if (currency !== "AUD") {
      errors.push({
        rowIndex,
        rawRow,
        reason: `non-AUD position (${currency}) requires FX conversion — temporarily unsupported. Coming soon.`,
      });
      return;
    }

    rows.push({
      ticker,
      exchange: normaliseMarket(h.market_code ?? ""),
      shares,
      cost_basis_per_share_cents: Math.round(price * 100),
      acquired_at: acquiredAt,
      broker_slug: "sharesight",
      notes: h.instrument_name ? `Imported from Sharesight (${h.instrument_name})` : "Imported from Sharesight",
    });
  });

  return { rows, errors };
}
