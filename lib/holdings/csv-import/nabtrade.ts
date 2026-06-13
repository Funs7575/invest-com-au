/**
 * NABTrade Transaction History CSV parser.
 *
 * Real-world NABTrade export columns (Transactions → Export CSV):
 *
 *   Trade Date, Settlement Date, Account, Order #, Action, Quantity,
 *   Symbol, Description, Price, Brokerage, GST, Amount, Currency
 *
 * Action values: `Bought` / `Sold` / `Dividend` / `Interest` / `Fee`.
 * Only `Bought` rows become holdings.
 *
 * NABTrade supports ASX (default) plus a separate US/International tab —
 * when the export includes a `Currency` column we use it to disambiguate
 * the exchange. ASX-shaped tickers default to ASX; everything else falls
 * back to OTHER and the user can correct in the holdings UI.
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

const NABTRADE_BROKER_SLUG = "nabtrade";

function looksLikeNabTradeHeader(cells: readonly string[]): boolean {
  const joined = cells.join(",").toLowerCase();
  return (
    (joined.includes("trade date") || joined.includes("date")) &&
    joined.includes("action") &&
    joined.includes("symbol") &&
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

function inferExchange(ticker: string, currency: string | null): ParsedHoldingRow["exchange"] {
  const upperCurrency = (currency ?? "").toUpperCase();
  if (upperCurrency === "AUD") {
    return /^[A-Z][A-Z0-9]{2,4}$/.test(ticker) ? "ASX" : "OTHER";
  }
  if (upperCurrency === "USD") {
    // NABTrade routes US orders to NASDAQ + NYSE; without an exchange
    // column we pick NASDAQ as the default. The user can correct.
    return "NASDAQ";
  }
  if (upperCurrency === "GBP") return "LSE";
  if (upperCurrency === "HKD") return "HKEX";
  if (upperCurrency === "SGD") return "SGX";
  if (upperCurrency === "JPY") return "TYO";
  return /^[A-Z][A-Z0-9]{2,4}$/.test(ticker) ? "ASX" : "OTHER";
}

export const parseNabTradeCsv: BrokerCsvParser = (csvText: string): CsvParseResult => {
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
    if (looksLikeNabTradeHeader(cells)) {
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
          reason: "could not find NABTrade header row (expected: Trade Date, Action, Symbol, Quantity, Price)",
        },
      ],
    };
  }

  const colDate = indexOfHeader(headers, "Trade Date", "Date");
  const colAction = indexOfHeader(headers, "Action", "Type", "Side");
  const colSymbol = indexOfHeader(headers, "Symbol", "Code");
  const colQty = indexOfHeader(headers, "Quantity", "Units");
  const colPrice = indexOfHeader(headers, "Price", "Unit Price");
  const colCurrency = indexOfHeader(headers, "Currency");

  if (
    colDate === -1 ||
    colAction === -1 ||
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
          reason: "NABTrade header is missing one of Trade Date / Action / Symbol / Quantity / Price",
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
    if (cells.length <= Math.max(colDate, colAction, colSymbol, colQty, colPrice)) {
      errors.push({ rowIndex, rawRow: truncate(line), reason: "row has too few columns" });
      continue;
    }

    const action = (cells[colAction] ?? "").toLowerCase();
    // NABTrade uses "Bought" / "Sold"; older exports use "Buy" / "Sell".
    const isBuy = action === "bought" || action === "buy";
    if (!isBuy) {
      errors.push({
        rowIndex,
        rawRow: truncate(line),
        reason: `non-BUY action skipped (${cells[colAction]})`,
      });
      continue;
    }

    const ticker = (cells[colSymbol] ?? "").toUpperCase();
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

    const currency = colCurrency === -1 ? null : (cells[colCurrency] ?? null);

    // Non-AUD trades: cost_basis_per_share_cents is consumed downstream
    // (HoldingsClient, tax-summary.ts) as AUD cents — importing the raw
    // foreign-currency price would yield wrong cost basis on the tax
    // CSV. Block until per-currency FX conversion ships. Rows without a
    // currency column default to AUD (ASX tab uses no Currency column).
    if (currency && currency.toUpperCase() !== "AUD") {
      errors.push({
        rowIndex,
        rawRow: truncate(line),
        reason: `non-AUD trades (${currency.toUpperCase()}) require FX conversion — temporarily unsupported. Coming soon.`,
      });
      continue;
    }

    rows.push({
      ticker,
      exchange: inferExchange(ticker, currency),
      shares,
      cost_basis_per_share_cents: Math.round(price * 100),
      acquired_at: acquiredAt,
      broker_slug: NABTRADE_BROKER_SLUG,
      notes: null,
      sourceRow: rowIndex,
    });
  }

  return { rows, errors };
};
