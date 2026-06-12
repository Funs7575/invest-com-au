/**
 * SelfWealth Order History CSV parser.
 *
 * Real-world SelfWealth export columns (Order History → "Download CSV"):
 *
 *   Trade Date, Settlement Date, Account, Code, Order Type, Quantity,
 *   Price, Brokerage, Consideration, Net Value
 *
 * Order Type is `BUY` or `SELL`. SelfWealth is ASX-only on the local
 * platform; their international tab uses a separate export which we
 * don't try to disambiguate here — we mark non-ASX-shaped tickers as
 * `OTHER` so the user can correct the exchange post-import.
 *
 * Dates are typically `DD/MM/YYYY`. Quantities are integer share counts.
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

const SELFWEALTH_BROKER_SLUG = "selfwealth";

// ASX listing codes are typically 3 letters (e.g. CBA, BHP) but ETFs
// regularly embed digits (e.g. A200 — BetaShares S&P/ASX 200 ETF;
// IOZ; STW); see lib/ticker-sectors.ts for the canonical catalogue. The
// previous `^[A-Z]{3,4}$` form rejected every digit-containing code as
// OTHER, breaking ASX price-source lookup. Allow 3-5 chars total, first
// char alpha, remainder alphanumeric.
const ASX_TICKER_RE = /^[A-Z][A-Z0-9]{2,4}$/;

function looksLikeSelfWealthHeader(cells: readonly string[]): boolean {
  const joined = cells.join(",").toLowerCase();
  return (
    (joined.includes("trade date") || joined.includes("date")) &&
    joined.includes("code") &&
    joined.includes("order type") &&
    joined.includes("quantity") &&
    joined.includes("price")
  );
}

function indexOfHeader(headers: readonly string[], ...names: readonly string[]): number {
  const targets = names.map((n) => n.toLowerCase());
  for (let i = 0; i < headers.length; i++) {
    if (targets.includes((headers[i] ?? "").toLowerCase())) return i;
  }
  return -1;
}

export const parseSelfWealthCsv: BrokerCsvParser = (csvText: string): CsvParseResult => {
  const rows: ParsedHoldingRow[] = [];
  const errors: CsvParseError[] = [];

  if (!csvText || typeof csvText !== "string") {
    return { rows, errors: [{ rowIndex: 0, rawRow: "", reason: "empty CSV" }] };
  }

  const rawLines = csvText.split(/\r?\n/);
  let headerIdx = -1;
  let headers: string[] = [];
  for (let i = 0; i < rawLines.length; i++) {
    const line = (rawLines[i] ?? "").trim();
    if (line.length === 0) continue;
    const cells = splitCsvLine(line);
    if (looksLikeSelfWealthHeader(cells)) {
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
          reason: "could not find SelfWealth header row (expected: Trade Date, Code, Order Type, Quantity, Price)",
        },
      ],
    };
  }

  const colDate = indexOfHeader(headers, "Trade Date", "Date");
  const colCode = indexOfHeader(headers, "Code", "Symbol");
  const colOrderType = indexOfHeader(headers, "Order Type", "Type", "Side");
  const colQty = indexOfHeader(headers, "Quantity", "Units");
  const colPrice = indexOfHeader(headers, "Price", "Unit Price");

  if (
    colDate === -1 ||
    colCode === -1 ||
    colOrderType === -1 ||
    colQty === -1 ||
    colPrice === -1
  ) {
    return {
      rows,
      errors: [
        {
          rowIndex: headerIdx + 1,
          rawRow: truncate(rawLines[headerIdx] ?? ""),
          reason: "SelfWealth header is missing one of Trade Date / Code / Order Type / Quantity / Price",
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
    if (cells.length <= Math.max(colDate, colCode, colOrderType, colQty, colPrice)) {
      errors.push({ rowIndex, rawRow: truncate(line), reason: "row has too few columns" });
      continue;
    }

    const orderType = (cells[colOrderType] ?? "").toUpperCase();
    if (orderType !== "BUY") {
      errors.push({
        rowIndex,
        rawRow: truncate(line),
        reason: `non-BUY order skipped (${cells[colOrderType]})`,
      });
      continue;
    }

    const ticker = (cells[colCode] ?? "").toUpperCase();
    if (ticker.length === 0) {
      errors.push({ rowIndex, rawRow: truncate(line), reason: "missing ticker" });
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
      exchange: ASX_TICKER_RE.test(ticker) ? "ASX" : "OTHER",
      shares,
      cost_basis_per_share_cents: Math.round(price * 100),
      acquired_at: acquiredAt,
      broker_slug: SELFWEALTH_BROKER_SLUG,
      notes: null,
      sourceRow: rowIndex,
    });
  }

  return { rows, errors };
};
