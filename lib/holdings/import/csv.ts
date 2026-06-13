/**
 * Tolerant CSV tokenizer for the holdings import wizard.
 *
 * Deliberately more capable than `lib/holdings/csv-import/_utils.ts`'s
 * line splitter (which is per-line and can't represent multi-line
 * quoted fields). This one handles:
 *
 *   - UTF-8 BOM (Excel-on-Windows exports)
 *   - CRLF / LF / bare CR line endings
 *   - double-quoted fields containing the delimiter
 *   - RFC 4180 escaped quotes ("" inside a quoted field)
 *   - newlines inside quoted fields
 *   - delimiter sniffing (comma / semicolon / tab)
 *
 * Pure functions only — safe to run in the browser.
 */

import { truncate } from "../csv-import/_utils";

/** Hard cap on data rows per import — mirrors the legacy parsers' cap. */
export { MAX_INPUT_ROWS as MAX_IMPORT_ROWS } from "../csv-import/_utils";

/** Client-side file-size ceiling. Friendlier than timing out on a 50 MB dump. */
export const MAX_IMPORT_FILE_BYTES = 1_000_000; // 1 MB

export type CsvDelimiter = "," | ";" | "\t";

export interface CsvRecord {
  /** Trimmed cell values. */
  cells: string[];
  /** 1-based physical line the record starts on (what spreadsheets show). */
  sourceRow: number;
  /** Raw record text (truncated) for error display. */
  raw: string;
}

/** Strip a leading UTF-8 byte-order mark if present. */
export function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/**
 * Guess the delimiter by counting candidates outside quotes across the
 * first few lines. Comma wins ties — every broker we support uses it.
 */
export function sniffDelimiter(text: string): CsvDelimiter {
  const counts: Record<CsvDelimiter, number> = { ",": 0, ";": 0, "\t": 0 };
  let inQuotes = false;
  let linesSeen = 0;
  for (let i = 0; i < text.length && linesSeen < 5; i++) {
    const ch = text[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (!inQuotes) {
      if (ch === ",") counts[","] += 1;
      else if (ch === ";") counts[";"] += 1;
      else if (ch === "\t") counts["\t"] += 1;
      else if (ch === "\n") linesSeen += 1;
    }
  }
  if (counts[";"] > counts[","] && counts[";"] >= counts["\t"]) return ";";
  if (counts["\t"] > counts[","] && counts["\t"] > counts[";"]) return "\t";
  return ",";
}

/**
 * Tokenize CSV text into records. Records whose cells are all empty
 * (blank lines, trailing newline) are dropped. Cell values are trimmed.
 */
export function parseCsv(text: string): CsvRecord[] {
  const src = stripBom(text ?? "");
  if (src.trim().length === 0) return [];
  const delimiter = sniffDelimiter(src);

  const records: CsvRecord[] = [];
  let cells: string[] = [];
  let cell = "";
  let inQuotes = false;
  let line = 1;
  let recordStartLine = 1;
  let rawStart = 0;

  const pushCell = () => {
    cells.push(cell.trim());
    cell = "";
  };
  const pushRecord = (endIndex: number) => {
    pushCell();
    if (cells.some((c) => c.length > 0)) {
      records.push({
        cells,
        sourceRow: recordStartLine,
        raw: truncate(src.slice(rawStart, endIndex)),
      });
    }
    cells = [];
  };

  for (let i = 0; i < src.length; i++) {
    const ch = src[i] ?? "";
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"'; // RFC 4180 escaped quote
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        if (ch === "\n") line += 1; // newline inside a quoted field
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === delimiter) {
      pushCell();
      continue;
    }
    if (ch === "\r") {
      pushRecord(i);
      if (src[i + 1] === "\n") i += 1; // CRLF
      line += 1;
      recordStartLine = line;
      rawStart = i + 1;
      continue;
    }
    if (ch === "\n") {
      pushRecord(i);
      line += 1;
      recordStartLine = line;
      rawStart = i + 1;
      continue;
    }
    cell += ch;
  }
  pushRecord(src.length); // final record (no trailing newline)

  return records;
}
