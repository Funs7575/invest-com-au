/**
 * Interactive Brokers Activity Statement CSV parser.
 *
 * IBKR's Activity Statement is a multi-section file — each section
 * starts with a row beginning `<Section>,Header,...` followed by zero
 * or more `<Section>,Data,...` rows. We care only about the `Trades`
 * section, which has columns (the relevant ones):
 *
 *   Trades, Header, DataDiscriminator, Asset Category, Currency,
 *   Symbol, Date/Time, Quantity, T. Price, ...
 *
 * Data rows for individual trade executions have
 * `DataDiscriminator='Order'`; aggregation rows use `Total` /
 * `SubTotal` / `Header` and are skipped.
 *
 * We only accept Stocks asset category (skip options, futures, forex,
 * bonds, CFDs). BUY rows have positive `Quantity`; SELLs are negative
 * and are surfaced as a skipped-row error.
 *
 * Multi-currency: IBKR is global. We use the `Currency` column to
 * route the holding to the most-likely exchange:
 *   USD → NASDAQ (default for US stocks; user can correct to NYSE)
 *   AUD → ASX
 *   GBP → LSE, HKD → HKEX, SGD → SGX, JPY → TYO, KRW → KRX
 *   anything else → OTHER
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

// Must match the slug in data/site-data.json (line 292) — anything else
// breaks the soft-link from `investor_holdings.broker_slug` back to the
// broker catalogue.
const IBKR_BROKER_SLUG = "interactive-brokers";

function indexOf(headers: readonly string[], ...names: readonly string[]): number {
  const targets = names.map((n) => n.toLowerCase());
  for (let i = 0; i < headers.length; i++) {
    if (targets.includes((headers[i] ?? "").toLowerCase())) return i;
  }
  return -1;
}

function inferExchange(currency: string): ParsedHoldingRow["exchange"] {
  switch (currency.toUpperCase()) {
    case "USD":
      return "NASDAQ";
    case "AUD":
      return "ASX";
    case "GBP":
      return "LSE";
    case "HKD":
      return "HKEX";
    case "SGD":
      return "SGX";
    case "JPY":
      return "TYO";
    case "KRW":
      return "KRX";
    default:
      return "OTHER";
  }
}

export const parseIbkrCsv: BrokerCsvParser = (csvText: string): CsvParseResult => {
  const rows: ParsedHoldingRow[] = [];
  const errors: CsvParseError[] = [];

  if (!csvText || typeof csvText !== "string") {
    return { rows, errors: [{ rowIndex: 0, rawRow: "", reason: "empty CSV" }] };
  }

  const rawLines = csvText.split(/\r?\n/);

  // Find the most recent Trades-section header. IBKR can repeat headers
  // mid-file (for subtotals); the last one before the data rows is the
  // canonical one. We index headers by section.
  let tradesHeader: string[] | null = null;
  let tradesHeaderRowIdx = -1;

  for (let i = 0; i < rawLines.length; i++) {
    const line = (rawLines[i] ?? "").trim();
    if (line.length === 0) continue;
    const cells = splitCsvLine(line);
    if (cells[0] === "Trades" && cells[1] === "Header") {
      tradesHeader = cells;
      tradesHeaderRowIdx = i;
      break;
    }
  }

  if (!tradesHeader || tradesHeaderRowIdx === -1) {
    return {
      rows,
      errors: [
        {
          rowIndex: 0,
          rawRow: "",
          reason: "could not find Trades,Header row — is this an IBKR Activity Statement CSV?",
        },
      ],
    };
  }

  const colDiscriminator = indexOf(tradesHeader, "DataDiscriminator");
  const colAssetCategory = indexOf(tradesHeader, "Asset Category");
  const colCurrency = indexOf(tradesHeader, "Currency");
  const colSymbol = indexOf(tradesHeader, "Symbol");
  const colDateTime = indexOf(tradesHeader, "Date/Time", "DateTime");
  const colQty = indexOf(tradesHeader, "Quantity");
  const colPrice = indexOf(tradesHeader, "T. Price", "Price", "TradePrice");

  if (
    colDiscriminator === -1 ||
    colAssetCategory === -1 ||
    colCurrency === -1 ||
    colSymbol === -1 ||
    colDateTime === -1 ||
    colQty === -1 ||
    colPrice === -1
  ) {
    return {
      rows,
      errors: [
        {
          rowIndex: tradesHeaderRowIdx + 1,
          rawRow: truncate(rawLines[tradesHeaderRowIdx] ?? ""),
          reason: "IBKR Trades header is missing one of DataDiscriminator / Asset Category / Currency / Symbol / Date/Time / Quantity / T. Price",
        },
      ],
    };
  }

  // Collect data rows from the Trades section. IBKR section ends when
  // we hit a row whose first cell != "Trades". We do not require strict
  // contiguity (some exports have blank lines between sections).
  const dataLines: { line: string; rowIndex: number; cells: string[] }[] = [];
  for (let i = tradesHeaderRowIdx + 1; i < rawLines.length; i++) {
    const line = (rawLines[i] ?? "").trim();
    if (line.length === 0) continue;
    const cells = splitCsvLine(line);
    if (cells[0] !== "Trades") {
      // Section change — done with Trades.
      break;
    }
    if (cells[1] === "Header") {
      // A second Trades,Header signals subtotal blocks; the canonical
      // one is the first. Subsequent ones can be safely skipped here.
      continue;
    }
    dataLines.push({ line, rowIndex: i + 1, cells });
  }

  if (dataLines.length > MAX_INPUT_ROWS) {
    return {
      rows: [],
      errors: [
        {
          rowIndex: 0,
          rawRow: "",
          reason: `CSV has ${dataLines.length} trade rows; max ${MAX_INPUT_ROWS} per import. Split the file and re-upload.`,
        },
      ],
    };
  }

  for (const { line, rowIndex, cells } of dataLines) {
    if (
      cells.length <= Math.max(
        colDiscriminator,
        colAssetCategory,
        colCurrency,
        colSymbol,
        colDateTime,
        colQty,
        colPrice,
      )
    ) {
      errors.push({ rowIndex, rawRow: truncate(line), reason: "row has too few columns" });
      continue;
    }

    const discriminator = (cells[colDiscriminator] ?? "").toLowerCase();
    if (discriminator !== "order") {
      // SubTotal / Total / Notes — not individual executions. Skip
      // silently; surfacing every aggregation row as an error would
      // drown the user in noise.
      continue;
    }

    const assetCategory = (cells[colAssetCategory] ?? "").toLowerCase();
    if (assetCategory !== "stocks") {
      errors.push({
        rowIndex,
        rawRow: truncate(line),
        reason: `non-stock asset category skipped (${cells[colAssetCategory]})`,
      });
      continue;
    }

    const ticker = (cells[colSymbol] ?? "").toUpperCase();
    if (ticker.length === 0) {
      errors.push({ rowIndex, rawRow: truncate(line), reason: "missing ticker" });
      continue;
    }

    const sharesRaw = (cells[colQty] ?? "").replace(/,/g, "");
    const shares = Number(sharesRaw);
    if (!Number.isFinite(shares) || shares === 0) {
      errors.push({
        rowIndex,
        rawRow: truncate(line),
        reason: `invalid quantity: ${cells[colQty]}`,
      });
      continue;
    }
    if (shares < 0) {
      errors.push({
        rowIndex,
        rawRow: truncate(line),
        reason: "SELL rows (negative quantity) are not imported as holdings",
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

    // IBKR Date/Time looks like `2026-01-15, 10:30:00`; strip the time
    // half before parsing.
    const dateOnly = (cells[colDateTime] ?? "").split(/[, ]/)[0] ?? "";
    const acquiredAt = parseFlexibleDate(dateOnly);
    if (!acquiredAt) {
      errors.push({
        rowIndex,
        rawRow: truncate(line),
        reason: `unparseable date: ${cells[colDateTime]}`,
      });
      continue;
    }

    const currency = (cells[colCurrency] ?? "").trim();

    // Non-AUD trades: cost_basis_per_share_cents is stored as AUD cents
    // by HoldingsClient + tax-summary.ts, but the CSV price is in the
    // trade currency. Importing without FX conversion would yield
    // materially wrong cost basis on the tax CSV. Block until a per-
    // currency FX rate source ships; users with USD/GBP/HKD trades can
    // re-import after the FX layer lands.
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
      exchange: inferExchange(currency),
      shares,
      cost_basis_per_share_cents: Math.round(price * 100),
      acquired_at: acquiredAt,
      broker_slug: IBKR_BROKER_SLUG,
      notes: null,
      sourceRow: rowIndex,
    });
  }

  return { rows, errors };
};
