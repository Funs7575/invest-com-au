/**
 * Generic header-mapped CSV engine.
 *
 * Two halves:
 *
 *   1. `autoMapColumns(header)` — guess a ColumnMapping from header
 *      synonyms ("Code"/"Symbol"/"Instrument Code" → ticker, etc.).
 *      Returns null when the required trio (code / units / price)
 *      can't all be found — the wizard then falls back to letting the
 *      user map columns by hand.
 *
 *   2. `buildDrafts(records, options)` — turn data records into
 *      ImportRowDrafts under a mapping (auto-guessed or user-chosen),
 *      with per-row validation issues instead of throwing.
 *
 * Pure functions only.
 */

import { truncate } from "../csv-import/_utils";
import type { CsvRecord } from "./csv";
import {
  exchangeFromMarket,
  normaliseInstrument,
  parseDecimal,
  parseImportDate,
} from "./normalise";
import type { ColumnMapping, ImportExchange, ImportRowDraft } from "./types";

/** Mirrors the manual-add route's Zod caps so previews match server truth. */
const MAX_SHARES = 1e12;
const MAX_COST_CENTS = 1e15;

/** Lowercase + strip non-alphanumerics: "Avg. Price ($)" → "avgprice". */
export function normaliseHeaderKey(header: string): string {
  return (header ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Synonym lists are in priority order — the first match wins. Keys are
// compared against the *whole* normalised header so "Settlement Date"
// never shadows "Trade Date".
const TICKER_SYNONYMS = [
  "code", "ticker", "symbol", "instrumentcode", "instrument", "securitycode",
  "security", "asxcode", "stockcode", "stock", "holding", "investment",
] as const;
const UNITS_SYNONYMS = [
  "units", "quantity", "qty", "shares", "volume", "noofshares",
  "numberofshares", "unitsheld", "sharesheld", "openquantity",
] as const;
const PRICE_SYNONYMS = [
  "price", "avgprice", "averageprice", "avgeprice", "unitprice", "purchaseprice",
  "costpershare", "costperunit", "avgcost", "averagecost",
  "averagepurchaseprice", "pricepershare", "buyprice", "tradeprice", "tprice",
  "costbaseperunit", "avgunitcost", "paidprice",
] as const;
const DATE_SYNONYMS = [
  "tradedate", "date", "purchasedate", "acquired", "acquireddate",
  "acquisitiondate", "buydate", "orderdate", "datepurchased", "opendate",
  "dateacquired",
] as const;
const EXCHANGE_SYNONYMS = [
  "exchange", "market", "marketcode", "listingexchange", "venue",
] as const;
const TYPE_SYNONYMS = [
  "transactiontype", "ordertype", "type", "action", "activity", "side",
  "buysell", "transaction",
] as const;

/**
 * Guess a column mapping from a header record. Each column is claimed at
 * most once (so a sheet with both "Code" and "Symbol" maps predictably).
 * Returns null unless ticker + units + price are all found.
 */
export function autoMapColumns(header: readonly string[]): ColumnMapping | null {
  const keys = header.map(normaliseHeaderKey);
  const claimed = new Set<number>();

  const find = (synonyms: readonly string[]): number | null => {
    for (const synonym of synonyms) {
      const index = keys.findIndex((k, i) => k === synonym && !claimed.has(i));
      if (index !== -1) {
        claimed.add(index);
        return index;
      }
    }
    return null;
  };

  const ticker = find(TICKER_SYNONYMS);
  const units = find(UNITS_SYNONYMS);
  const price = find(PRICE_SYNONYMS);
  if (ticker === null || units === null || price === null) return null;

  return {
    ticker,
    units,
    price,
    date: find(DATE_SYNONYMS),
    exchange: find(EXCHANGE_SYNONYMS),
    type: find(TYPE_SYNONYMS),
  };
}

// Transaction-type cells that mean "this row acquired units". DRP and
// opening-balance rows carry real units + prices, so they import cleanly.
const BUY_TYPE_KEYS = new Set([
  "buy", "b", "purchase", "bought", "buytoopen",
  "drp", "dividendreinvestment", "openingbalance",
]);
const SELL_TYPE_KEYS = new Set(["sell", "s", "sold", "sale", "selltoclose"]);

export interface BuildDraftsOptions {
  mapping: ColumnMapping;
  /** Used when neither the code nor a market column pins the exchange. */
  defaultExchange: ImportExchange;
  /** Broker tag written to `investor_holdings.broker_slug` (null = untagged). */
  brokerSlug: string | null;
  /** YYYY-MM-DD used when no date column is mapped. Injected for purity. */
  defaultDate: string;
}

/** Build preview drafts from data records under a column mapping. */
export function buildDrafts(
  records: readonly CsvRecord[],
  options: BuildDraftsOptions,
): ImportRowDraft[] {
  const { mapping, defaultExchange, brokerSlug, defaultDate } = options;
  const drafts: ImportRowDraft[] = [];

  for (const record of records) {
    const cellAt = (index: number | null): string =>
      index === null ? "" : (record.cells[index] ?? "");

    const issues: string[] = [];

    // Transaction type — only rows that acquire units become holdings.
    const typeRaw = cellAt(mapping.type);
    const typeKey = normaliseHeaderKey(typeRaw);
    if (typeKey.length > 0 && !BUY_TYPE_KEYS.has(typeKey)) {
      issues.push(
        SELL_TYPE_KEYS.has(typeKey)
          ? "SELL rows are not imported as holdings"
          : `not a BUY row (type "${truncate(typeRaw, 40)}")`,
      );
    }

    // Instrument code.
    const tickerRaw = cellAt(mapping.ticker);
    const instrument = normaliseInstrument(tickerRaw);
    if (!instrument) {
      issues.push(
        tickerRaw.trim().length === 0
          ? "missing code"
          : `"${truncate(tickerRaw, 40)}" doesn't look like an instrument code`,
      );
    }

    // Exchange: code suffix/prefix beats the market column beats the default.
    let exchange: ImportExchange | null = instrument?.exchange ?? null;
    if (exchange === null) {
      const marketRaw = cellAt(mapping.exchange);
      if (marketRaw.trim().length > 0) {
        exchange = exchangeFromMarket(marketRaw) ?? "OTHER";
      }
    }
    exchange = exchange ?? defaultExchange;

    // Units.
    const unitsRaw = cellAt(mapping.units);
    const shares = parseDecimal(unitsRaw);
    if (shares === null) {
      issues.push(
        unitsRaw.trim().length === 0
          ? "missing units"
          : `units "${truncate(unitsRaw, 40)}" is not a number`,
      );
    } else if (shares < 0) {
      issues.push("negative units — looks like a SELL row");
    } else if (shares === 0) {
      issues.push("units must be greater than 0");
    } else if (shares > MAX_SHARES) {
      issues.push("units value is implausibly large");
    }

    // Price per unit.
    const priceRaw = cellAt(mapping.price);
    const price = parseDecimal(priceRaw);
    let costBasisPerShareCents: number | null = null;
    if (price === null) {
      issues.push(
        priceRaw.trim().length === 0
          ? "missing price"
          : `price "${truncate(priceRaw, 40)}" is not a number`,
      );
    } else if (price < 0) {
      issues.push("price cannot be negative");
    } else {
      costBasisPerShareCents = Math.round(price * 100);
      if (costBasisPerShareCents > MAX_COST_CENTS) {
        issues.push("price value is implausibly large");
        costBasisPerShareCents = null;
      }
    }

    // Acquired date — only required when the file actually has one.
    let acquiredAt: string | null;
    if (mapping.date === null) {
      acquiredAt = defaultDate;
    } else {
      const dateRaw = cellAt(mapping.date);
      acquiredAt = dateRaw.trim().length === 0 ? defaultDate : parseImportDate(dateRaw);
      if (acquiredAt === null) {
        issues.push(`unrecognised date "${truncate(dateRaw, 40)}"`);
      }
    }

    // Fields keep whatever parsed successfully so the preview can show
    // partial rows; `issues` (not field nullability) decides importability.
    drafts.push({
      sourceRow: record.sourceRow,
      raw: record.raw,
      ticker: instrument?.ticker ?? null,
      exchange: instrument ? exchange : null,
      shares: shares !== null && shares > 0 && shares <= MAX_SHARES ? shares : null,
      costBasisPerShareCents,
      acquiredAt,
      brokerSlug,
      notes: null,
      issues,
    });
  }

  return drafts;
}
