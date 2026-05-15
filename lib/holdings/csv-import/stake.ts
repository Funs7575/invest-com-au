/**
 * Stake CSV parser.
 *
 * Stake has two products that share a similar CSV export shape:
 *
 *   - Stake AUS  → ASX shares; AUD currency
 *   - Stake Wall St → US shares; USD currency
 *
 * Both expose a "Transactions" / "Trades" export with a header row. Real
 * exports we've inspected use these column names (case-insensitive, the
 * platform has shipped two minor variants):
 *
 *   Trade Date, Settle Date, Order ID, Side, Currency, Symbol,
 *   Quantity, Price, Value, Brokerage, Total
 *
 * Older exports use `Type` instead of `Side`, `Effective Date` instead
 * of `Trade Date`, and `Ticker` / `Instrument` instead of `Symbol`. We
 * map all of those to the canonical fields below.
 *
 * The parser:
 *
 *   1. Locates the header line (first non-blank line whose cells
 *      include something date-shaped + something side-shaped). Bails
 *      with an error if no header is found — Stake always ships one.
 *   2. Builds a name → column-index map from that header.
 *   3. Iterates remaining lines, picks BUY rows, converts to
 *      `ParsedHoldingRow`. SELL / dividend / fee rows surface as
 *      errors (consistent with the CommSec parser).
 *   4. Exchange is inferred from currency: AUD → ASX, USD → NASDAQ
 *      (the most common venue for Stake US tickers; NYSE listings
 *      still resolve to the right entity on the holdings page by
 *      ticker symbol). Unknown currencies → OTHER.
 *
 * Caps at 500 rows of CSV input — same envelope as CommSec.
 * Pure function: no DB / network / fs access.
 */

import type {
  BrokerCsvParser,
  CsvParseError,
  CsvParseResult,
  ParsedHoldingRow,
} from "./types";

const STAKE_BROKER_SLUG = "stake";
const MAX_INPUT_ROWS = 500;

const DATE_HEADER_ALIASES = [
  "trade date",
  "trade dt",
  "effective date",
  "transaction date",
  "date",
];
const SIDE_HEADER_ALIASES = ["side", "type", "action"];
const SYMBOL_HEADER_ALIASES = ["symbol", "ticker", "instrument", "asset"];
const QUANTITY_HEADER_ALIASES = ["quantity", "qty", "units", "shares"];
const PRICE_HEADER_ALIASES = ["price", "unit price", "avg price", "average price"];
const CURRENCY_HEADER_ALIASES = ["currency", "ccy"];

const BUY_VALUE_RE = /^\s*(?:b|buy|bought)\s*$/i;
const SELL_VALUE_RE = /^\s*(?:s|sell|sold)\s*$/i;
const DIV_VALUE_RE = /^\s*(?:div|dividend|drp|distribution)\s*$/i;
const FEE_VALUE_RE = /^\s*(?:fee|brokerage|adjustment|transfer)\s*$/i;

interface ColumnMap {
  date: number;
  side: number;
  symbol: number;
  quantity: number;
  price: number;
  /** -1 if absent — currency is optional (Stake AUS sometimes omits it). */
  currency: number;
}

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

function findColumn(
  header: readonly string[],
  aliases: readonly string[],
): number {
  const lower = header.map((c) => c.toLowerCase());
  for (const alias of aliases) {
    const idx = lower.indexOf(alias);
    if (idx !== -1) return idx;
  }
  return -1;
}

function buildColumnMap(header: readonly string[]): ColumnMap | null {
  const date = findColumn(header, DATE_HEADER_ALIASES);
  const side = findColumn(header, SIDE_HEADER_ALIASES);
  const symbol = findColumn(header, SYMBOL_HEADER_ALIASES);
  const quantity = findColumn(header, QUANTITY_HEADER_ALIASES);
  const price = findColumn(header, PRICE_HEADER_ALIASES);
  const currency = findColumn(header, CURRENCY_HEADER_ALIASES);
  if (date < 0 || side < 0 || symbol < 0 || quantity < 0 || price < 0) {
    return null;
  }
  return { date, side, symbol, quantity, price, currency };
}

/**
 * Stake's `Trade Date` is `DD/MM/YYYY` for AU exports and `MM/DD/YYYY`
 * for Wall St exports. We disambiguate by trying DD/MM first and
 * falling back to MM/DD only if the first interpretation would yield
 * an invalid date — covers both regions without forcing the user to
 * declare which product the CSV came from.
 *
 * Also accepts `YYYY-MM-DD` (some Stake transfer-history exports use
 * ISO) and `YYYY/MM/DD`.
 */
function parseStakeDate(raw: string): string | null {
  const trimmed = raw.trim();
  // ISO YYYY-MM-DD or YYYY/MM/DD
  const iso = /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/.exec(trimmed);
  if (iso) {
    const y = Number(iso[1]);
    const m = Number(iso[2]);
    const d = Number(iso[3]);
    return makeIsoDate(y, m, d);
  }
  // DD/MM/YYYY or MM/DD/YYYY
  const slash = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(trimmed);
  if (!slash) return null;
  const a = Number(slash[1]);
  const b = Number(slash[2]);
  let year = Number(slash[3]);
  if (year < 100) year = year >= 50 ? 1900 + year : 2000 + year;

  // Prefer DD/MM (AU convention). If that fails month-range, try MM/DD.
  const ddmm = makeIsoDate(year, b, a);
  if (ddmm) return ddmm;
  return makeIsoDate(year, a, b);
}

function makeIsoDate(year: number, month: number, day: number): string | null {
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  const d = new Date(Date.UTC(year, month - 1, day));
  if (
    d.getUTCFullYear() !== year ||
    d.getUTCMonth() !== month - 1 ||
    d.getUTCDate() !== day
  ) {
    return null;
  }
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function exchangeForCurrency(currency: string): ParsedHoldingRow["exchange"] {
  const c = currency.trim().toUpperCase();
  if (c === "AUD") return "ASX";
  if (c === "USD") return "NASDAQ";
  if (c === "GBP") return "LSE";
  if (c === "HKD") return "HKEX";
  if (c === "SGD") return "SGX";
  if (c === "JPY") return "TYO";
  if (c === "KRW") return "KRX";
  // No currency column — Stake AUS exports more often omit currency than
  // Wall St exports do, so default to ASX. Users can correct an
  // individual holding's exchange from the holdings list.
  if (!c) return "ASX";
  return "OTHER";
}

function truncate(s: string, max = 200): string {
  return s.length <= max ? s : `${s.slice(0, max)}…`;
}

export const parseStakeCsv: BrokerCsvParser = (csvText: string): CsvParseResult => {
  const rows: ParsedHoldingRow[] = [];
  const errors: CsvParseError[] = [];

  if (!csvText || typeof csvText !== "string") {
    return { rows, errors: [{ rowIndex: 0, rawRow: "", reason: "empty CSV" }] };
  }

  const rawLines = csvText.split(/\r?\n/);
  let headerLineIndex = -1;
  let columnMap: ColumnMap | null = null;

  for (let i = 0; i < rawLines.length; i++) {
    const line = (rawLines[i] ?? "").trim();
    if (line.length === 0) continue;
    const cells = splitCsvLine(line);
    const candidate = buildColumnMap(cells);
    if (candidate) {
      headerLineIndex = i;
      columnMap = candidate;
      break;
    }
  }

  if (!columnMap) {
    return {
      rows: [],
      errors: [
        {
          rowIndex: 0,
          rawRow: "",
          reason:
            "Stake CSV header not recognised — expected columns including Trade Date, Side, Symbol, Quantity, Price.",
        },
      ],
    };
  }

  const dataLines: { line: string; rowIndex: number }[] = [];
  for (let i = headerLineIndex + 1; i < rawLines.length; i++) {
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
    const sideCell = cells[columnMap.side] ?? "";

    if (SELL_VALUE_RE.test(sideCell)) {
      errors.push({
        rowIndex,
        rawRow: truncate(line),
        reason: "SELL rows are not imported as holdings",
      });
      continue;
    }
    if (DIV_VALUE_RE.test(sideCell)) {
      errors.push({
        rowIndex,
        rawRow: truncate(line),
        reason: "dividend / DRP rows are not imported as holdings",
      });
      continue;
    }
    if (FEE_VALUE_RE.test(sideCell)) {
      errors.push({
        rowIndex,
        rawRow: truncate(line),
        reason: "fee / brokerage rows are not imported as holdings",
      });
      continue;
    }
    if (!BUY_VALUE_RE.test(sideCell)) {
      errors.push({
        rowIndex,
        rawRow: truncate(line),
        reason: `unrecognised side: ${sideCell || "(empty)"}`,
      });
      continue;
    }

    const tickerRaw = (cells[columnMap.symbol] ?? "").toUpperCase().trim();
    const sharesRaw = (cells[columnMap.quantity] ?? "").replace(/,/g, "");
    const priceRaw = (cells[columnMap.price] ?? "").replace(/[,$]/g, "");
    const dateRaw = cells[columnMap.date] ?? "";
    const currencyRaw =
      columnMap.currency >= 0 ? (cells[columnMap.currency] ?? "") : "";

    if (tickerRaw.length === 0) {
      errors.push({
        rowIndex,
        rawRow: truncate(line),
        reason: "missing ticker",
      });
      continue;
    }

    const shares = Number(sharesRaw);
    if (!Number.isFinite(shares) || shares <= 0) {
      errors.push({
        rowIndex,
        rawRow: truncate(line),
        reason: `invalid quantity: ${sharesRaw}`,
      });
      continue;
    }

    const price = Number(priceRaw);
    if (!Number.isFinite(price) || price < 0) {
      errors.push({
        rowIndex,
        rawRow: truncate(line),
        reason: `invalid price: ${priceRaw}`,
      });
      continue;
    }

    const acquiredAt = parseStakeDate(dateRaw);
    if (!acquiredAt) {
      errors.push({
        rowIndex,
        rawRow: truncate(line),
        reason: `unparseable date: ${dateRaw}`,
      });
      continue;
    }

    rows.push({
      ticker: tickerRaw,
      exchange: exchangeForCurrency(currencyRaw),
      shares,
      cost_basis_per_share_cents: Math.round(price * 100),
      acquired_at: acquiredAt,
      broker_slug: STAKE_BROKER_SLUG,
      notes: null,
    });
  }

  return { rows, errors };
};
