/**
 * Normalisation helpers for the holdings import wizard.
 *
 * Instrument codes arrive in many shapes — "BHP", "bhp.ax", "ASX:BHP",
 * "AAPL.US", "7203.T" — and need to collapse to one canonical
 * (ticker, exchange) pair so dedupe against existing holdings works.
 *
 * Pure functions only — no DB, no network, no ambient clock except
 * `todayIsoDate()` which callers invoke explicitly.
 */

import { parseAuDate, parseIsoDate } from "../csv-import/_utils";
import type { ImportExchange } from "./types";

export interface NormalisedInstrument {
  ticker: string;
  /** Exchange when determinable from the code itself, else null. */
  exchange: ImportExchange | null;
}

/** Known exchange *suffixes* — `BHP.AX`, `BARC.L`, `0700.HK`, … */
const EXCHANGE_SUFFIXES: Readonly<Record<string, ImportExchange>> = {
  AX: "ASX",
  ASX: "ASX",
  AU: "ASX",
  L: "LSE",
  LON: "LSE",
  HK: "HKEX",
  SI: "SGX",
  KS: "KRX",
  KQ: "KRX",
};

/** Known exchange *prefixes* — `ASX:BHP`, `NYSE:IBM`, `NASDAQ:AAPL`, … */
const EXCHANGE_PREFIXES: Readonly<Record<string, ImportExchange>> = {
  ASX: "ASX",
  NYSE: "NYSE",
  NASDAQ: "NASDAQ",
  NSQ: "NASDAQ",
  LSE: "LSE",
  LON: "LSE",
  HKEX: "HKEX",
  HKG: "HKEX",
  SGX: "SGX",
  TYO: "TYO",
  TSE: "TYO",
  JPX: "TYO",
  KRX: "KRX",
  CRYPTO: "CRYPTO",
};

/**
 * Normalise a raw instrument cell to a canonical (ticker, exchange) pair.
 *
 *   "BHP"      → { ticker: "BHP",  exchange: null }   (caller defaults)
 *   "bhp.ax"   → { ticker: "BHP",  exchange: "ASX" }
 *   "ASX:BHP"  → { ticker: "BHP",  exchange: "ASX" }
 *   "AAPL.US"  → { ticker: "AAPL", exchange: null }   (US — NASDAQ/NYSE ambiguous)
 *   "7203.T"   → { ticker: "7203", exchange: "TYO" }  (numeric body only —
 *                 `.T` on an alpha body is more likely a share class)
 *   "BRK.B"    → { ticker: "BRK.B", exchange: null }  (share class kept intact)
 *
 * Returns null for values that aren't plausibly a code at all (empty,
 * contains spaces, over 30 chars — the DB ticker limit).
 */
export function normaliseInstrument(rawInput: string): NormalisedInstrument | null {
  const raw = (rawInput ?? "")
    .trim()
    .replace(/^["']+|["']+$/g, "")
    .toUpperCase();
  if (raw.length === 0) return null;

  const prefixMatch = /^([A-Z]{2,8}):\s*([A-Z0-9.&-]{1,30})$/.exec(raw);
  if (prefixMatch) {
    const market = prefixMatch[1] ?? "";
    const code = prefixMatch[2] ?? "";
    return { ticker: code, exchange: EXCHANGE_PREFIXES[market] ?? "OTHER" };
  }

  if (!/^[A-Z0-9.&-]{1,30}$/.test(raw)) return null;

  const dotIndex = raw.lastIndexOf(".");
  if (dotIndex > 0 && dotIndex < raw.length - 1) {
    const body = raw.slice(0, dotIndex);
    const suffix = raw.slice(dotIndex + 1);
    const mapped = EXCHANGE_SUFFIXES[suffix];
    if (mapped) return { ticker: body, exchange: mapped };
    if (suffix === "T" && /^\d+$/.test(body)) return { ticker: body, exchange: "TYO" };
    if (suffix === "US") return { ticker: body, exchange: null };
    // Unknown suffix (e.g. BRK.B share class) — keep the full code.
  }

  return { ticker: raw, exchange: null };
}

/**
 * Map a free-text market/exchange cell ("ASX", "NasdaqGS", "Hong Kong")
 * to our exchange union. Returns null when unrecognised — callers decide
 * whether that means OTHER or fall back to a default.
 */
export function exchangeFromMarket(rawInput: string): ImportExchange | null {
  const key = (rawInput ?? "").trim().toUpperCase().replace(/[^A-Z]/g, "");
  if (key.length === 0) return null;
  if (key === "ASX" || key === "AU" || key === "AUS" || key === "AUSTRALIA" || key === "ASXLIMITED") return "ASX";
  if (key.startsWith("NASDAQ") || key === "NMS" || key === "NSQ") return "NASDAQ";
  if (key.startsWith("NYSE") || key === "NYS" || key === "NEWYORKSTOCKEXCHANGE") return "NYSE";
  if (key === "LSE" || key === "LON" || key === "LONDON" || key === "LONDONSTOCKEXCHANGE") return "LSE";
  if (key === "HKEX" || key === "HKG" || key === "HK" || key === "HONGKONG") return "HKEX";
  if (key === "SGX" || key === "SINGAPORE") return "SGX";
  if (key === "TYO" || key === "TSE" || key === "JPX" || key === "TOKYO") return "TYO";
  if (key === "KRX" || key === "KOSPI" || key === "KOSDAQ" || key === "KOREA") return "KRX";
  if (key === "CRYPTO" || key === "CRYPTOCURRENCY") return "CRYPTO";
  if (key === "OTHER") return "OTHER";
  return null;
}

/**
 * Parse a numeric cell tolerantly. Handles thousands separators,
 * currency symbols/codes, surrounding whitespace, and accounting-style
 * parenthesised negatives:
 *
 *   "1,234.56" → 1234.56     "$12.30"  → 12.3
 *   "A$1,000"  → 1000        "(45.00)" → -45
 *   "12.30 AUD" → 12.3       "n/a" / "" / "1.2.3" → null
 */
export function parseDecimal(rawInput: string): number | null {
  let raw = (rawInput ?? "").trim();
  if (raw.length === 0) return null;

  let negative = false;
  const paren = /^\((.*)\)$/.exec(raw);
  if (paren) {
    negative = true;
    raw = (paren[1] ?? "").trim();
  }

  const cleaned = raw.replace(/[A-Za-z$£€¥₩,\s]/g, "");
  if (!/^[-+]?(\d+(\.\d*)?|\.\d+)$/.test(cleaned)) return null;

  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return negative ? -n : n;
}

const MONTHS: Readonly<Record<string, number>> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

/**
 * Liberal date parser for import cells. Accepts ISO (`2026-03-01`,
 * with optional time tail), AU (`1/3/2026`, `01/03/26`), dashed/dotted
 * AU (`01-03-2026`, `01.03.2026`) and month-name (`1 Mar 2026`,
 * `01 March 2026`). Returns YYYY-MM-DD or null.
 */
export function parseImportDate(rawInput: string): string | null {
  const raw = (rawInput ?? "").trim();
  if (raw.length === 0) return null;

  const iso = parseIsoDate(raw);
  if (iso) return iso;

  const au = parseAuDate(raw);
  if (au) return au;

  const dashed = /^(\d{1,2})[-.](\d{1,2})[-.](\d{2}|\d{4})$/.exec(raw);
  if (dashed) return parseAuDate(`${dashed[1]}/${dashed[2]}/${dashed[3]}`);

  const monthName = /^(\d{1,2})\s+([A-Za-z]{3,9})\.?,?\s+(\d{4})$/.exec(raw);
  if (monthName) {
    const month = MONTHS[(monthName[2] ?? "").slice(0, 3).toLowerCase()];
    if (month === undefined) return null;
    return parseIsoDate(`${monthName[3]}-${month}-${monthName[1]}`);
  }

  return null;
}

/** Today's date in the *local* timezone as YYYY-MM-DD (not UTC — an AU
 *  user importing at 8 am shouldn't get yesterday's date). */
export function todayIsoDate(now: Date = new Date()): string {
  const y = String(now.getFullYear()).padStart(4, "0");
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
