/**
 * Shared types for the holdings CSV-import wizard pipeline.
 *
 * This module powers the /account/holdings/import wizard. It builds on
 * (and reuses) the per-broker transaction parsers in
 * `lib/holdings/csv-import/` and adds the wizard-grade layers those
 * parsers don't have:
 *
 *   - a real tolerant CSV tokenizer (quoted fields, escaped quotes,
 *     newlines inside quotes, BOM, CRLF, delimiter sniffing) — `csv.ts`
 *   - instrument/number/date normalisation ("BHP" / "BHP.AX" /
 *     "ASX:BHP" all collapse to the same code) — `normalise.ts`
 *   - broker auto-detection from headers/landmarks — `detect.ts`
 *   - a generic header-mapped engine + Sharesight preset — `generic.ts`,
 *     `sharesight.ts`
 *   - dedupe planning against existing holdings — `dedupe.ts`
 *
 * Everything in `lib/holdings/import/` is a pure function: no DB, no
 * network, no Date.now() hidden inside parsing (callers inject "today").
 * That keeps the whole engine runnable client-side — the file never
 * leaves the browser until the user confirms the import.
 */

import type { ParsedHoldingRow } from "../csv-import/types";

/** Exchange union — mirrors the `investor_holdings.exchange` CHECK constraint. */
export type ImportExchange = ParsedHoldingRow["exchange"];

export const IMPORT_EXCHANGES = [
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
] as const satisfies readonly ImportExchange[];

/**
 * One row of the import preview. A draft is importable iff
 * `issues.length === 0` — in that case every nullable field except
 * `brokerSlug`/`notes` is populated.
 */
export interface ImportRowDraft {
  /** 1-based physical row in the uploaded file (matches spreadsheet apps). */
  sourceRow: number;
  /** Raw record text, truncated — shown for rows that failed to parse. */
  raw: string;
  ticker: string | null;
  exchange: ImportExchange | null;
  shares: number | null;
  costBasisPerShareCents: number | null;
  /** ISO date, YYYY-MM-DD. */
  acquiredAt: string | null;
  brokerSlug: string | null;
  notes: string | null;
  /** Human-readable problems. Empty array ⇒ row is importable. */
  issues: string[];
}

/**
 * Column mapping for the generic engine. Indices are 0-based positions
 * into each CSV record. `ticker` / `units` / `price` are required;
 * the rest are optional refinements.
 */
export interface ColumnMapping {
  ticker: number;
  units: number;
  price: number;
  date: number | null;
  exchange: number | null;
  type: number | null;
}

export type ImportFormatId =
  | "commsec"
  | "selfwealth"
  | "stake"
  | "nabtrade"
  | "ibkr"
  | "sharesight"
  | "generic";

/** Result of analysing an uploaded CSV (auto-detect or manual mapping). */
export interface AnalysedCsv {
  /** Detected/forced format; null ⇒ nothing matched, user must map columns. */
  format: ImportFormatId | null;
  /** Header cells of the detected header row (for the mapping UI). */
  header: string[] | null;
  /** 0-based record index of the header row, when one was found/used. */
  headerRecordIndex: number | null;
  /** Mapping in effect when `format` is "sharesight" or "generic". */
  mapping: ColumnMapping | null;
  drafts: ImportRowDraft[];
  /** File-level problems (empty file, too many rows, unrecognised shape). */
  fileIssues: string[];
}
