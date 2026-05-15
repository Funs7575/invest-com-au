/**
 * Shared helpers for broker CSV parsers.
 *
 * Each parser is otherwise self-contained — these helpers exist to keep
 * the boilerplate (CSV line splitting, header detection, date parsing,
 * row truncation) in one place so new brokers don't drift into subtly
 * different behaviours over time.
 */

/**
 * Minimal CSV line splitter: handles double-quoted fields containing
 * commas. Good enough for broker exports we've seen — we don't try to be
 * a fully general RFC-4180 parser. Adjacent quotes inside a quoted field
 * are not interpreted as an escape; no broker we support uses that.
 */
export function splitCsvLine(line: string): string[] {
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

/** Bound `rawRow` length in error payloads so a runaway file can't blow
 *  up the response. */
export function truncate(s: string, max = 200): string {
  return s.length <= max ? s : `${s.slice(0, max)}…`;
}

/** Parse `DD/MM/YYYY` or `DD/MM/YY` (the AU broker default). Two-digit
 *  years ≥50 map to 19xx, otherwise 20xx — matching the convention used
 *  by CommSec's legacy exports. */
export function parseAuDate(raw: string): string | null {
  const m = /^\s*(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})\s*$/.exec(raw);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  let year = Number(m[3]);
  if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) {
    return null;
  }
  if (year < 100) year = year >= 50 ? 1900 + year : 2000 + year;
  return assembleDate(year, month, day);
}

/** Parse `YYYY-MM-DD` (ISO) — IBKR, Stake newer exports. Also tolerates
 *  a trailing time portion separated by space, comma, or `T`. */
export function parseIsoDate(raw: string): string | null {
  const m = /^\s*(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T,].*)?$/.exec(raw);
  if (!m) return null;
  return assembleDate(Number(m[1]), Number(m[2]), Number(m[3]));
}

/** Try ISO first, fall back to AU. Brokers occasionally tweak their
 *  exports — being permissive on date format costs us nothing. */
export function parseFlexibleDate(raw: string): string | null {
  return parseIsoDate(raw) ?? parseAuDate(raw);
}

function assembleDate(year: number, month: number, day: number): string | null {
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  // Reject obviously bogus calendar dates (e.g. 31/02). Cheap round-trip.
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

/** Strip currency symbols, thousands-separators, and stray whitespace
 *  before `Number()`-ing a price/amount cell. */
export function parseMoney(raw: string): number {
  if (!raw) return NaN;
  const cleaned = raw.replace(/[A-Za-z$£€¥,\s]/g, "");
  return Number(cleaned);
}

/** Hard limit on data rows per import. Bulk migrations aren't the
 *  intended UX; the 500K-char body cap on the route already gates this
 *  but we want a friendly error rather than a silent truncation. */
export const MAX_INPUT_ROWS = 500;
