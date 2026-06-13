/**
 * Broker-format auto-detection for the import wizard.
 *
 * Looks at the first records of a parsed CSV for the headers/landmarks
 * each supported export carries. Detection is intentionally independent
 * of the legacy parsers' internal `looksLike*` helpers (those aren't
 * exported) but uses the same signatures, fixture-tested side by side.
 *
 * Order matters where headers overlap:
 *   - IBKR first — its `Trades,Header,...` landmark is unambiguous.
 *   - SelfWealth ("Order Type" + "Code") before NABTrade ("Action" +
 *     "Symbol") before Stake ("Activity" + "Symbol").
 *   - CommSec's Debit/Credit/Balance transaction shape next.
 *   - Sharesight (Market + Code + Units) last of the named formats.
 *
 * Pure functions only.
 */

import type { CsvRecord } from "./csv";
import { normaliseHeaderKey } from "./generic";
import { looksLikeSharesightHeader } from "./sharesight";
import type { ImportFormatId } from "./types";

export type DetectedFormatId = Exclude<ImportFormatId, "generic">;

export interface DetectedFormat {
  format: DetectedFormatId;
  /** 0-based record index of the header/landmark that matched. */
  headerRecordIndex: number;
}

/** How many leading records to scan for a recognisable header. */
const SCAN_LIMIT = 25;

function hasKeys(keys: readonly string[], ...wanted: readonly string[]): boolean {
  return wanted.every((w) => keys.includes(w));
}

function hasAnyKey(keys: readonly string[], ...wanted: readonly string[]): boolean {
  return wanted.some((w) => keys.includes(w));
}

export function detectFormat(records: readonly CsvRecord[]): DetectedFormat | null {
  const limit = Math.min(records.length, SCAN_LIMIT);

  // IBKR Activity Statements are multi-section; the Trades,Header row is
  // a hard landmark no other format carries.
  for (let i = 0; i < limit; i++) {
    const cells = records[i]?.cells ?? [];
    if (cells[0] === "Trades" && cells[1] === "Header") {
      return { format: "ibkr", headerRecordIndex: i };
    }
  }

  for (let i = 0; i < limit; i++) {
    const cells = records[i]?.cells ?? [];
    if (cells.length < 3) continue;
    const keys = cells.map(normaliseHeaderKey);

    if (hasKeys(keys, "tradedate", "code", "ordertype", "quantity", "price")) {
      return { format: "selfwealth", headerRecordIndex: i };
    }
    if (
      hasAnyKey(keys, "tradedate", "date") &&
      hasKeys(keys, "action", "symbol", "quantity", "price")
    ) {
      return { format: "nabtrade", headerRecordIndex: i };
    }
    if (hasKeys(keys, "date", "activity", "symbol")) {
      return { format: "stake", headerRecordIndex: i };
    }
    if (
      hasKeys(keys, "date") &&
      hasAnyKey(keys, "details", "description") &&
      hasAnyKey(keys, "debit", "credit", "balance")
    ) {
      return { format: "commsec", headerRecordIndex: i };
    }
    if (looksLikeSharesightHeader(cells)) {
      return { format: "sharesight", headerRecordIndex: i };
    }
  }

  return null;
}
