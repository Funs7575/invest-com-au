/**
 * Tax-year summary helpers — pure functions for converting investor
 * holdings into a CSV the user can hand to their accountant. No I/O.
 *
 * Australian financial year runs 1 July → 30 June. `tax year N` here means
 * the fiscal year *ending* 30 June N (e.g. tax year 2025 = 1 Jul 2024 →
 * 30 Jun 2025), matching ATO convention.
 *
 * The CSV intentionally only includes cost-basis information — current
 * market values are excluded because the snapshot must be tax-stable
 * (price feeds drift; cost basis does not). Dividends + realised gains
 * are out of scope for X5f (the holdings table doesn't store
 * transactions yet); accountants get the same data they'd see in the
 * holdings list, formatted for paste-into-spreadsheet.
 *
 * Notes column is RFC 4180 quoted so commas, quotes, or newlines in user
 * notes don't corrupt downstream parsers (Excel, Google Sheets, Numbers,
 * pandas all follow 4180).
 */

/** Shape pulled from `investor_holdings` (snake_case from supabase). */
export interface TaxSummaryHolding {
  ticker: string;
  exchange: string;
  shares: number;
  cost_basis_per_share_cents: number;
  acquired_at: string; // YYYY-MM-DD
  broker_slug: string | null;
  notes: string | null;
}

/**
 * Returns ISO-date bounds (`YYYY-MM-DD`) for an Australian fiscal year.
 *
 * @param year - The *ending* calendar year of the AU tax year (e.g. 2025
 *   for FY 2024-25).
 * @returns `{ start: "YYYY-07-01" of year-1, end: "YYYY-06-30" of year }`.
 */
export function getAustralianTaxYearBoundsForYear(year: number): {
  start: string;
  end: string;
} {
  const startYear = year - 1;
  return {
    start: `${startYear}-07-01`,
    end: `${year}-06-30`,
  };
}

/**
 * Returns the AU tax year a given date sits inside. The FY *ends* 30 June,
 * so anything from 1 July onwards belongs to the *next* tax year.
 *
 * Examples:
 *   2026-05-14 → 2026  (FY 2025-26, ends 30 Jun 2026)
 *   2026-06-30 → 2026  (last day of FY 2025-26)
 *   2026-07-01 → 2027  (first day of FY 2026-27)
 *
 * Uses UTC components — the AU tax boundary is calendrical, not
 * timezone-sensitive, and standardising on UTC avoids drift when the
 * server clock or the user's browser is in different zones.
 */
export function getCurrentAustralianTaxYear(now: Date = new Date()): number {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth(); // 0-indexed; July = 6
  return month >= 6 ? year + 1 : year;
}

/**
 * Quote a CSV field per RFC 4180:
 *   - wrap in double-quotes if it contains a comma, quote, CR, or LF
 *   - double-up any inner quotes
 *
 * Empty / null inputs render as an empty field (not a quoted empty string)
 * to match what users expect when they open the file in Excel.
 */
function csvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (s === "") return "";
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Convert integer cents to a 2-decimal AUD string (no thousands separator
 *  — keeps the CSV machine-parseable; humans get the format they want via
 *  their spreadsheet's locale settings). */
function centsToDollars(cents: number): string {
  return (cents / 100).toFixed(2);
}

/**
 * Render holdings as a CSV string with a header row. Returns header-only
 * output when given an empty list so the user can still see the column
 * shape if they have no holdings yet.
 *
 * Columns:
 *   Ticker, Exchange, Broker, Shares,
 *   Cost Basis Per Share (AUD), Total Cost Basis (AUD),
 *   Acquired Date, Notes
 *
 * @param holdings - rows to include (caller is responsible for filtering
 *   to the target tax year)
 * @param _taxYear - reserved for future use (e.g. embedding the tax-year
 *   label inside the file); accepted now so the route can pass it
 *   without a follow-up signature change.
 */
export function formatHoldingsAsTaxSummaryCsv(
  holdings: TaxSummaryHolding[],
  _taxYear: number,
): string {
  const header = [
    "Ticker",
    "Exchange",
    "Broker",
    "Shares",
    "Cost Basis Per Share (AUD)",
    "Total Cost Basis (AUD)",
    "Acquired Date",
    "Notes",
  ].join(",");

  if (holdings.length === 0) {
    // RFC 4180: each line terminated by CRLF. Trailing CRLF is permitted
    // and helps spreadsheet apps treat the file as "one record + EOF".
    return `${header}\r\n`;
  }

  const rows = holdings.map((h) => {
    const totalCostCents = h.shares * h.cost_basis_per_share_cents;
    return [
      csvField(h.ticker),
      csvField(h.exchange),
      csvField(h.broker_slug && h.broker_slug.trim() !== "" ? h.broker_slug : "(not set)"),
      csvField(h.shares),
      csvField(centsToDollars(h.cost_basis_per_share_cents)),
      csvField(centsToDollars(totalCostCents)),
      csvField(h.acquired_at),
      csvField(h.notes),
    ].join(",");
  });

  return [header, ...rows].join("\r\n") + "\r\n";
}
