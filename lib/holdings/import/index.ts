/**
 * Holdings CSV-import orchestrator.
 *
 * `analyseCsv(text)` is the single entry point the wizard calls after
 * reading a file in the browser:
 *
 *   1. tokenize (csv.ts)
 *   2. auto-detect the format (detect.ts)
 *   3. parse — known brokers run their battle-tested legacy parser from
 *      `lib/holdings/csv-import/`; Sharesight and unknown-but-mappable
 *      files run the generic header-mapped engine
 *   4. fall back to "needs manual mapping" with the most likely header
 *      row pre-selected
 *
 * `analyseWithMapping(text, …)` re-parses under a user-chosen mapping
 * when auto-detection failed (or was overridden).
 *
 * Pure functions only — no DB, no network. The route handler does auth,
 * validation and persistence.
 */

import { CSV_IMPORT_PARSERS } from "../csv-import";
import type { CsvParseResult } from "../csv-import/types";
import { MAX_IMPORT_ROWS, parseCsv, type CsvRecord } from "./csv";
import { detectFormat } from "./detect";
import { autoMapColumns, buildDrafts } from "./generic";
import { todayIsoDate } from "./normalise";
import { parseSharesightRecords } from "./sharesight";
import type {
  AnalysedCsv,
  ColumnMapping,
  ImportExchange,
  ImportFormatId,
  ImportRowDraft,
} from "./types";

export type {
  AnalysedCsv,
  ColumnMapping,
  ImportExchange,
  ImportFormatId,
  ImportRowDraft,
} from "./types";
export { IMPORT_EXCHANGES } from "./types";
export { MAX_IMPORT_FILE_BYTES, MAX_IMPORT_ROWS, parseCsv } from "./csv";
export type { CsvRecord } from "./csv";
export { autoMapColumns } from "./generic";
export { detectFormat } from "./detect";
export {
  holdingKey,
  planImport,
  type DedupeStatus,
  type ExistingHoldingForDedupe,
  type ImportPlan,
  type PlannedRow,
} from "./dedupe";
export {
  normaliseInstrument,
  parseDecimal,
  parseImportDate,
  todayIsoDate,
} from "./normalise";

export const FORMAT_LABELS: Readonly<Record<ImportFormatId, string>> = {
  commsec: "CommSec — Transactions CSV",
  selfwealth: "SelfWealth — Order History CSV",
  stake: "Stake — Transactions CSV",
  nabtrade: "NABTrade — Transaction History CSV",
  ibkr: "Interactive Brokers — Activity Statement CSV",
  sharesight: "Sharesight — Trades / Holdings CSV",
  generic: "Generic CSV (mapped columns)",
};

const EMPTY_FILE_ISSUE =
  "The file looks empty — export a CSV from your broker and try again.";

function tooManyRowsIssue(count: number): string {
  return `CSV has ${count} data rows; max ${MAX_IMPORT_ROWS} per import. Split the file and re-upload.`;
}

interface AnalyseOptions {
  /** YYYY-MM-DD stamped on rows whose file has no date column. */
  today?: string;
  /** Skip auto-detection and force a specific parser. */
  forceFormat?: ImportFormatId;
}

/** Analyse an uploaded CSV: detect, parse, and build preview drafts. */
export function analyseCsv(text: string, options: AnalyseOptions = {}): AnalysedCsv {
  const today = options.today ?? todayIsoDate();
  const base: AnalysedCsv = {
    format: null,
    header: null,
    headerRecordIndex: null,
    mapping: null,
    drafts: [],
    fileIssues: [],
  };

  if (!text || text.trim().length === 0) {
    return { ...base, fileIssues: [EMPTY_FILE_ISSUE] };
  }

  const records = parseCsv(text);
  if (records.length === 0) {
    return { ...base, fileIssues: [EMPTY_FILE_ISSUE] };
  }

  const forced = options.forceFormat;
  let detected: { format: ImportFormatId; headerRecordIndex: number | null } | null;
  if (forced !== undefined) {
    detected = forced === "generic" ? null : { format: forced, headerRecordIndex: null };
  } else {
    detected = detectFormat(records);
  }

  // Known broker → delegate to the legacy transaction parser (it does its
  // own header location and BUY/SELL semantics), then adapt the result.
  if (detected && detected.format !== "sharesight" && detected.format !== "generic") {
    const parser = CSV_IMPORT_PARSERS[detected.format];
    return {
      ...base,
      format: detected.format,
      ...adaptLegacyResult(parser(text)),
    };
  }

  // Sharesight preset (detected or forced).
  if (detected?.format === "sharesight") {
    const result = parseSharesightRecords(records, { defaultDate: today });
    if (result) {
      const capped = capDrafts(result.drafts);
      return {
        ...base,
        format: "sharesight",
        header: result.header,
        headerRecordIndex: result.headerRecordIndex,
        mapping: result.mapping,
        ...capped,
      };
    }
    // Forced sharesight on a non-sharesight file → manual mapping fallback.
  }

  // Unknown format — try the generic auto-mapper over the first records.
  const scanLimit = Math.min(records.length, 10);
  for (let i = 0; i < scanLimit; i++) {
    const record = records[i];
    if (!record) continue;
    const mapping = autoMapColumns(record.cells);
    if (!mapping) continue;
    const capped = capDrafts(
      buildDrafts(records.slice(i + 1), {
        mapping,
        defaultExchange: "ASX",
        brokerSlug: null,
        defaultDate: today,
      }),
    );
    return {
      ...base,
      format: "generic",
      header: record.cells,
      headerRecordIndex: i,
      mapping,
      ...capped,
    };
  }

  // Nothing matched — surface the most likely header so the user can map
  // columns by hand.
  const likely = pickLikelyHeader(records);
  return {
    ...base,
    header: likely?.cells ?? null,
    headerRecordIndex: likely ? records.indexOf(likely) : null,
    fileIssues: [
      "We couldn't recognise this file's columns automatically. Match them below, or choose a different export.",
    ],
  };
}

export interface ManualMappingOptions {
  mapping: ColumnMapping;
  defaultExchange: ImportExchange;
  /** Record index of the header row; null when the file has no header. */
  headerRecordIndex: number | null;
  today?: string;
}

/** Re-parse a file under a user-chosen column mapping. */
export function analyseWithMapping(
  text: string,
  options: ManualMappingOptions,
): AnalysedCsv {
  const today = options.today ?? todayIsoDate();
  const records = parseCsv(text);
  const headerIndex = options.headerRecordIndex;
  const header = headerIndex === null ? null : (records[headerIndex]?.cells ?? null);
  const dataRecords =
    headerIndex === null ? records : records.slice(headerIndex + 1);

  const capped = capDrafts(
    buildDrafts(dataRecords, {
      mapping: options.mapping,
      defaultExchange: options.defaultExchange,
      brokerSlug: null,
      defaultDate: today,
    }),
  );

  return {
    format: "generic",
    header,
    headerRecordIndex: headerIndex,
    mapping: options.mapping,
    ...capped,
  };
}

/** Enforce the per-import row cap, mirroring the legacy parsers' message. */
function capDrafts(drafts: ImportRowDraft[]): {
  drafts: ImportRowDraft[];
  fileIssues: string[];
} {
  if (drafts.length > MAX_IMPORT_ROWS) {
    return { drafts: [], fileIssues: [tooManyRowsIssue(drafts.length)] };
  }
  return { drafts, fileIssues: [] };
}

/**
 * Adapt a legacy `CsvParseResult` to wizard drafts. Parser errors with
 * rowIndex 0 are file-level (missing header, row cap); everything else
 * becomes an invalid draft pinned to its source row.
 */
function adaptLegacyResult(result: CsvParseResult): {
  drafts: ImportRowDraft[];
  fileIssues: string[];
} {
  const fileIssues: string[] = [];
  const drafts: ImportRowDraft[] = [];

  for (const row of result.rows) {
    drafts.push({
      sourceRow: row.sourceRow ?? 0,
      raw: "",
      ticker: row.ticker,
      exchange: row.exchange,
      shares: row.shares,
      costBasisPerShareCents: row.cost_basis_per_share_cents,
      acquiredAt: row.acquired_at,
      brokerSlug: row.broker_slug,
      notes: row.notes,
      issues: [],
    });
  }

  for (const error of result.errors) {
    if (error.rowIndex === 0) {
      fileIssues.push(error.reason);
      continue;
    }
    drafts.push({
      sourceRow: error.rowIndex,
      raw: error.rawRow,
      ticker: null,
      exchange: null,
      shares: null,
      costBasisPerShareCents: null,
      acquiredAt: null,
      brokerSlug: null,
      notes: null,
      issues: [error.reason],
    });
  }

  drafts.sort((a, b) => a.sourceRow - b.sourceRow);
  return { drafts, fileIssues };
}

/**
 * Best guess at the header row for the manual-mapping UI: the earliest
 * record (within the scan window) carrying the most columns.
 */
function pickLikelyHeader(records: readonly CsvRecord[]): CsvRecord | null {
  const scanLimit = Math.min(records.length, 10);
  let best: CsvRecord | null = null;
  for (let i = 0; i < scanLimit; i++) {
    const record = records[i];
    if (!record || record.cells.length < 2) continue;
    if (!best || record.cells.length > best.cells.length) best = record;
  }
  return best;
}
