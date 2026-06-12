/**
 * CommSec Trading Account Transactions CSV parser.
 *
 * Real-world CommSec export columns (transactions screen → "Download CSV"):
 *
 *   Date, Reference, Details, Debit($), Credit($), Balance($)
 *
 * The interesting bit lives in `Details`, which encodes the trade as a
 * free-text line like:
 *
 *   "B 100 BHP @ 45.123"     — BUY 100 BHP @ $45.123
 *   "S 50  CBA @ 110.50"     — SELL (unsupported at this stage)
 *   "DIV BHP $1.45 per share" — dividend (unsupported)
 *
 * The parser:
 *
 *   1. Splits the file into lines, tolerates blank lines + a header row.
 *   2. Tries to CSV-split each remaining line (commas + minimal quote
 *      handling — CommSec doesn't quote `Details` but a few exports we
 *      saw did wrap the whole field in double quotes).
 *   3. Pattern-matches the `Details` cell. Only BUY rows ("B " / "BUY ")
 *      are accepted as holdings; SELL/DIV/etc. surface as errors so the
 *      user can see they were skipped.
 *   4. Maps to `ParsedHoldingRow` with `exchange='ASX'` (CommSec is
 *      ASX-default; tickers carrying a `.` suffix are unusual and treated
 *      as 'OTHER').
 *
 * Caps at 500 rows of CSV input. Beyond that we return a single error and
 * an empty rows list — bulk imports are not the intended UX, and the
 * 500K-char body limit on the route already keeps payloads bounded.
 *
 * The parser is pure: no DB / network / fs access. Tests can call it
 * directly with fixture strings.
 */

import type {
  BrokerCsvParser,
  CsvParseError,
  CsvParseResult,
  ParsedHoldingRow,
} from "./types";

const COMMSEC_BROKER_SLUG = "commsec";
const MAX_INPUT_ROWS = 500;

// Buy-detail regex. Tolerates: B / BUY prefix, multi-space, optional `$`
// before the price, optional trailing notes / brokerage column. The
// captured groups are: 1=shares, 2=ticker, 3=price.
//
// Examples it matches:
//   "B 100 BHP @ 45.123"
//   "BUY  50 CBA @ $110.50"
//   "B 25 NDQ @ 35.10 - Brokerage $5.00"
const BUY_DETAIL_RE =
  /^\s*(?:B(?:UY)?)\s+(\d+(?:\.\d+)?)\s+([A-Z]{1,6}(?:\.[A-Z]{1,4})?)\s*@\s*\$?\s*(\d+(?:\.\d+)?)/i;

// Detect explicit SELL / dividend / corporate-action rows so we can give
// the user a helpful "this row was skipped because it's not a BUY" error
// rather than a generic "could not parse" message.
const SELL_DETAIL_RE = /^\s*S(?:ELL)?\s+\d/i;
const DIV_DETAIL_RE = /^\s*(?:DIV|DIVIDEND|DRP)\b/i;

/** Date parser: tolerates `DD/MM/YYYY` and `DD/MM/YY`. CommSec uses the
 *  former in the UI export; some older exports we saw used the latter. */
function parseAuDate(raw: string): string | null {
  const m = /^\s*(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})\s*$/.exec(raw);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  let year = Number(m[3]);
  if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) {
    return null;
  }
  if (year < 100) {
    // Two-digit year — 50+ → 1900s, otherwise 2000s. This is the AU
    // convention used by CommSec's legacy exports; the cutoff matches.
    year = year >= 50 ? 1900 + year : 2000 + year;
  }
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  // Reject obviously bogus calendar dates (e.g. 31/02). We can't catch
  // every leap-year edge here without a full date lib, but we cover the
  // common cases.
  const d = new Date(Date.UTC(year, month - 1, day));
  if (
    d.getUTCFullYear() !== year ||
    d.getUTCMonth() !== month - 1 ||
    d.getUTCDate() !== day
  ) {
    return null;
  }
  const yyyy = String(year).padStart(4, "0");
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Minimal CSV line splitter: handles double-quoted fields containing
 * commas. Good enough for CommSec exports — we don't try to be a fully
 * general RFC-4180 parser (no escaped quotes inside fields, etc.).
 */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuote = !inQuote;
      continue;
    }
    if (ch === "," && !inQuote) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

function looksLikeHeader(cells: readonly string[]): boolean {
  const joined = cells.join(",").toLowerCase();
  return (
    joined.includes("date") &&
    (joined.includes("details") || joined.includes("description"))
  );
}

export const parseCommSecCsv: BrokerCsvParser = (csvText: string): CsvParseResult => {
  const rows: ParsedHoldingRow[] = [];
  const errors: CsvParseError[] = [];

  if (!csvText || typeof csvText !== "string") {
    return { rows, errors: [{ rowIndex: 0, rawRow: "", reason: "empty CSV" }] };
  }

  const rawLines = csvText.split(/\r?\n/);
  // Filter blanks + leading header so the row-count cap reflects real
  // transaction lines, not whitespace.
  const dataLines: { line: string; rowIndex: number }[] = [];
  for (let i = 0; i < rawLines.length; i++) {
    const line = (rawLines[i] ?? "").trim();
    if (line.length === 0) continue;
    const cells = splitCsvLine(line);
    if (dataLines.length === 0 && looksLikeHeader(cells)) {
      continue; // first non-blank line is a header — skip it once
    }
    dataLines.push({ line, rowIndex: i + 1 });
  }

  if (dataLines.length > MAX_INPUT_ROWS) {
    return {
      rows: [],
      errors: [
        {
          rowIndex: 0,
          rawRow: "",
          reason: `CSV has ${dataLines.length} data rows; max ${MAX_INPUT_ROWS} per import. Split the file and re-upload.`,
        },
      ],
    };
  }

  for (const { line, rowIndex } of dataLines) {
    const cells = splitCsvLine(line);
    // Need at least Date + Details. We accept either the standard 6-col
    // shape or longer/shorter — CommSec has tweaked column ordering over
    // the years and we're forgiving on counts.
    if (cells.length < 3) {
      errors.push({
        rowIndex,
        rawRow: truncate(line),
        reason: "row has fewer than 3 columns",
      });
      continue;
    }

    const dateCell = cells[0] ?? "";
    const detailsCell = cells[2] ?? "";

    if (SELL_DETAIL_RE.test(detailsCell)) {
      errors.push({
        rowIndex,
        rawRow: truncate(line),
        reason: "SELL rows are not imported as holdings",
      });
      continue;
    }
    if (DIV_DETAIL_RE.test(detailsCell)) {
      errors.push({
        rowIndex,
        rawRow: truncate(line),
        reason: "dividend / DRP rows are not imported as holdings",
      });
      continue;
    }

    const buyMatch = BUY_DETAIL_RE.exec(detailsCell);
    if (!buyMatch) {
      errors.push({
        rowIndex,
        rawRow: truncate(line),
        reason: "no BUY pattern found in Details column",
      });
      continue;
    }

    const sharesRaw = buyMatch[1] ?? "";
    const tickerRaw = (buyMatch[2] ?? "").toUpperCase();
    const priceRaw = buyMatch[3] ?? "";
    const shares = Number(sharesRaw);
    const price = Number(priceRaw);

    if (!Number.isFinite(shares) || shares <= 0) {
      errors.push({
        rowIndex,
        rawRow: truncate(line),
        reason: `invalid shares value: ${sharesRaw}`,
      });
      continue;
    }
    if (!Number.isFinite(price) || price < 0) {
      errors.push({
        rowIndex,
        rawRow: truncate(line),
        reason: `invalid price value: ${priceRaw}`,
      });
      continue;
    }
    if (tickerRaw.length === 0) {
      errors.push({
        rowIndex,
        rawRow: truncate(line),
        reason: "missing ticker",
      });
      continue;
    }

    const acquiredAt = parseAuDate(dateCell);
    if (!acquiredAt) {
      errors.push({
        rowIndex,
        rawRow: truncate(line),
        reason: `unparseable date: ${dateCell}`,
      });
      continue;
    }

    // CommSec is ASX-default. A `.AX` / `.NZ` / etc. suffix is unusual on
    // a CommSec export (the platform doesn't display them) — when we do
    // see one we mark the exchange as OTHER so we don't mislabel.
    const exchange: ParsedHoldingRow["exchange"] = tickerRaw.includes(".") ? "OTHER" : "ASX";

    rows.push({
      ticker: tickerRaw,
      exchange,
      shares,
      cost_basis_per_share_cents: Math.round(price * 100),
      acquired_at: acquiredAt,
      broker_slug: COMMSEC_BROKER_SLUG,
      notes: null,
      sourceRow: rowIndex,
    });
  }

  return { rows, errors };
};

function truncate(s: string, max = 200): string {
  return s.length <= max ? s : `${s.slice(0, max)}…`;
}
