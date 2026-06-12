/**
 * Sharesight CSV preset.
 *
 * Sharesight's exports (Trades report / All Trades / Holdings) share a
 * recognisable shape: an instrument-code column plus a Market column,
 * with quantity/price and usually a transaction type. Real-world
 * header variants we match liberally:
 *
 *   "Market,Code,Date,Type,Quantity,Price,Brokerage,Currency,Comments"
 *   "Trade Date,Instrument Code,Market,Quantity,Price,Transaction Type,..."
 *   "Market,Code,Company,Units,Purchase Price,..."          (holdings view)
 *
 * Rather than a bespoke parser, the preset rides the generic engine:
 * detect the header, auto-map it, and tag rows `broker_slug='sharesight'`
 * — the same tag the Sharesight OAuth sync writes, so its skip-dedupe
 * sees CSV-imported rows too.
 *
 * Pure functions only.
 */

import type { CsvRecord } from "./csv";
import { autoMapColumns, buildDrafts, normaliseHeaderKey } from "./generic";
import type { ColumnMapping, ImportRowDraft } from "./types";

/** Matches `SHARESIGHT_BROKER_SLUG` in lib/sharesight/api.ts — the OAuth
 *  sync dedupes on this tag, so CSV imports must use the same value.
 *  (Not imported from there: that module pulls in server-only deps and
 *  this one must stay browser-safe.) */
export const SHARESIGHT_CSV_BROKER_SLUG = "sharesight";

const CODE_KEYS = new Set(["code", "instrumentcode", "symbol"]);
const UNITS_KEYS = new Set(["quantity", "units", "qty"]);

/** Sharesight signature: a code column AND a market column AND units. */
export function looksLikeSharesightHeader(header: readonly string[]): boolean {
  const keys = header.map(normaliseHeaderKey);
  const hasCode = keys.some((k) => CODE_KEYS.has(k));
  const hasMarket = keys.some((k) => k === "market" || k === "marketcode");
  const hasUnits = keys.some((k) => UNITS_KEYS.has(k));
  return hasCode && hasMarket && hasUnits;
}

export interface SharesightParseResult {
  headerRecordIndex: number;
  header: string[];
  mapping: ColumnMapping;
  drafts: ImportRowDraft[];
}

/**
 * Find the Sharesight header within the first records and build drafts
 * for everything after it. Returns null when the file doesn't carry the
 * Sharesight shape (caller falls through to generic / manual mapping).
 */
export function parseSharesightRecords(
  records: readonly CsvRecord[],
  options: { defaultDate: string },
): SharesightParseResult | null {
  const scanLimit = Math.min(records.length, 10);
  for (let i = 0; i < scanLimit; i++) {
    const record = records[i];
    if (!record || !looksLikeSharesightHeader(record.cells)) continue;
    const mapping = autoMapColumns(record.cells);
    if (!mapping) return null; // market+code present but no usable price/units trio
    return {
      headerRecordIndex: i,
      header: record.cells,
      mapping,
      drafts: buildDrafts(records.slice(i + 1), {
        mapping,
        // Market column is auto-mapped on every known Sharesight export,
        // so the default rarely fires; ASX matches Sharesight's AU base.
        defaultExchange: "ASX",
        brokerSlug: SHARESIGHT_CSV_BROKER_SLUG,
        defaultDate: options.defaultDate,
      }),
    };
  }
  return null;
}
