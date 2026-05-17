/**
 * Stake (AU) Trade History CSV parser.
 *
 * Stake AU is US-equities-only; tickers map to NASDAQ/NYSE. Their
 * "Transactions" export columns are stable:
 *
 *   Date, Reference, Activity, Symbol, Description, Quantity, Price, Total, Currency
 *
 * Activity values we care about: `Buy` (kept as a holding). We surface
 * everything else (`Sell`, `Dividend`, `Cash Deposit`, `FX`, etc.) as a
 * skipped-row error so the user can see what didn't come through.
 *
 * Dates in the export are ISO (`YYYY-MM-DD`). Some legacy exports we've
 * seen use DD/MM/YYYY — `parseFlexibleDate` covers both.
 *
 * The parser is pure: no DB / network / fs access.
 */

import type {
  BrokerCsvParser,
  CsvParseError,
  CsvParseResult,
  ParsedHoldingRow,
} from "./types";
import {
  MAX_INPUT_ROWS,
  parseFlexibleDate,
  parseMoney,
  splitCsvLine,
  truncate,
} from "./_utils";

const STAKE_BROKER_SLUG = "stake";

// US-listed ticker regex: 1-5 uppercase letters, optional dot-suffix
// (`BRK.B`). We default to NASDAQ; a small list of well-known NYSE
// tickers is overridden below — beyond that we don't try to disambiguate,
// since the user can fix the exchange in the holdings UI if needed.
const TICKER_RE = /^[A-Z]{1,5}(?:\.[A-Z])?$/;

// Conservative NYSE allowlist for the most-traded names Australians hold
// via Stake. Anything not on this list defaults to NASDAQ. Wrong-guess
// cost is purely cosmetic — the cost basis is still correct.
const NYSE_TICKERS = new Set([
  "BAC",
  "BRK.A",
  "BRK.B",
  "C",
  "DIS",
  "F",
  "GE",
  "GM",
  "JNJ",
  "JPM",
  "KO",
  "MCD",
  "PFE",
  "T",
  "V",
  "WFC",
  "WMT",
  "XOM",
]);

function inferStakeExchange(ticker: string): ParsedHoldingRow["exchange"] {
  return NYSE_TICKERS.has(ticker) ? "NYSE" : "NASDAQ";
}

function looksLikeStakeHeader(cells: readonly string[]): boolean {
  const joined = cells.join(",").toLowerCase();
  return (
    joined.includes("date") &&
    (joined.includes("activity") || joined.includes("type")) &&
    joined.includes("symbol")
  );
}

/** Pull a column by case-insensitive header match. Returns -1 if not
 *  found, so the caller can fall back to a positional index. */
function indexOfHeader(headers: readonly string[], name: string): number {
  const target = name.toLowerCase();
  for (let i = 0; i < headers.length; i++) {
    if ((headers[i] ?? "").toLowerCase() === target) return i;
  }
  return -1;
}

export const parseStakeCsv: BrokerCsvParser = (csvText: string): CsvParseResult => {
  const rows: ParsedHoldingRow[] = [];
  const errors: CsvParseError[] = [];

  if (!csvText || typeof csvText !== "string") {
    return { rows, errors: [{ rowIndex: 0, rawRow: "", reason: "empty CSV" }] };
  }

  const rawLines = csvText.split(/\r?\n/);

  // Stake exports always include a header. Locate it, then read by name
  // so order changes between export revisions don't break us.
  let headerIdx = -1;
  let headers: string[] = [];
  for (let i = 0; i < rawLines.length; i++) {
    const line = (rawLines[i] ?? "").trim();
    if (line.length === 0) continue;
    const cells = splitCsvLine(line);
    if (looksLikeStakeHeader(cells)) {
      headerIdx = i;
      headers = cells;
      break;
    }
  }

  if (headerIdx === -1) {
    return {
      rows,
      errors: [
        {
          rowIndex: 0,
          rawRow: "",
          reason: "could not find Stake header row (expected columns: Date, Activity, Symbol, Quantity, Price)",
        },
      ],
    };
  }

  const colDate = indexOfHeader(headers, "Date");
  const colActivity =
    indexOfHeader(headers, "Activity") !== -1
      ? indexOfHeader(headers, "Activity")
      : indexOfHeader(headers, "Type");
  const colSymbol = indexOfHeader(headers, "Symbol");
  const colQty =
    indexOfHeader(headers, "Quantity") !== -1
      ? indexOfHeader(headers, "Quantity")
      : indexOfHeader(headers, "Units");
  const colPrice =
    indexOfHeader(headers, "Price") !== -1
      ? indexOfHeader(headers, "Price")
      : indexOfHeader(headers, "Unit Price");

  if (
    colDate === -1 ||
    colActivity === -1 ||
    colSymbol === -1 ||
    colQty === -1 ||
    colPrice === -1
  ) {
    return {
      rows,
      errors: [
        {
          rowIndex: headerIdx + 1,
          rawRow: truncate(rawLines[headerIdx] ?? ""),
          reason: "Stake header is missing one of Date / Activity / Symbol / Quantity / Price",
        },
      ],
    };
  }

  const dataLines: { line: string; rowIndex: number }[] = [];
  for (let i = headerIdx + 1; i < rawLines.length; i++) {
    const line = (rawLines[i] ?? "").trim();
    if (line.length === 0) continue;
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
    if (cells.length <= Math.max(colDate, colActivity, colSymbol, colQty, colPrice)) {
      errors.push({ rowIndex, rawRow: truncate(line), reason: "row has too few columns" });
      continue;
    }

    const activity = (cells[colActivity] ?? "").toLowerCase();
    if (activity !== "buy") {
      errors.push({
        rowIndex,
        rawRow: truncate(line),
        reason: `non-BUY activity skipped (${cells[colActivity]})`,
      });
      continue;
    }

    const ticker = (cells[colSymbol] ?? "").toUpperCase();
    if (!TICKER_RE.test(ticker)) {
      errors.push({ rowIndex, rawRow: truncate(line), reason: `invalid ticker: ${ticker}` });
      continue;
    }

    const shares = Number((cells[colQty] ?? "").replace(/,/g, ""));
    if (!Number.isFinite(shares) || shares <= 0) {
      errors.push({
        rowIndex,
        rawRow: truncate(line),
        reason: `invalid quantity: ${cells[colQty]}`,
      });
      continue;
    }

    const price = parseMoney(cells[colPrice] ?? "");
    if (!Number.isFinite(price) || price < 0) {
      errors.push({
        rowIndex,
        rawRow: truncate(line),
        reason: `invalid price: ${cells[colPrice]}`,
      });
      continue;
    }

    const acquiredAt = parseFlexibleDate(cells[colDate] ?? "");
    if (!acquiredAt) {
      errors.push({
        rowIndex,
        rawRow: truncate(line),
        reason: `unparseable date: ${cells[colDate]}`,
      });
      continue;
    }

    rows.push({
      ticker,
      exchange: inferStakeExchange(ticker),
      shares,
      cost_basis_per_share_cents: Math.round(price * 100),
      acquired_at: acquiredAt,
      broker_slug: STAKE_BROKER_SLUG,
      notes: null,
    });
  }

  return { rows, errors };
};
