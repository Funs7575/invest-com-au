/**
 * Shared types for the broker CSV-import pipeline.
 *
 * Each broker ships a pure parser (`BrokerCsvParser`) that turns raw CSV
 * text into `ParsedHoldingRow[]` + `CsvParseError[]`. Parsers never touch
 * the DB or network — the route handler does the bulk-insert + auth.
 *
 * `ParsedHoldingRow` mirrors the `investor_holdings` insert columns, minus
 * the auth_user_id (filled in by the route from the authenticated user)
 * and the auto-managed id/timestamps. Field names match the DB columns so
 * the route can spread the parsed row directly into the insert payload.
 */
export interface ParsedHoldingRow {
  ticker: string;
  exchange:
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
  shares: number;
  cost_basis_per_share_cents: number;
  /** ISO date string, YYYY-MM-DD. */
  acquired_at: string;
  broker_slug: string;
  notes: string | null;
  /**
   * 1-based source-file row this holding came from. Optional — set by
   * parsers for the import-wizard preview (lib/holdings/import); the
   * route handlers and Sharesight sync ignore it.
   */
  sourceRow?: number;
}

/**
 * A single unparseable / unsupported row. `rowIndex` is 1-based to match
 * what users see in their spreadsheet app. `rawRow` is truncated to keep
 * the response payload bounded.
 */
export interface CsvParseError {
  rowIndex: number;
  rawRow: string;
  reason: string;
}

export interface CsvParseResult {
  rows: ParsedHoldingRow[];
  errors: CsvParseError[];
}

/** Pure parser contract — no DB, no network, no side effects. */
export type BrokerCsvParser = (csvText: string) => CsvParseResult;
