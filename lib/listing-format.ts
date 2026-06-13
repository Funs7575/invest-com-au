/**
 * Human-readable formatting for investment-listing text.
 *
 * Listing rows carry raw, machine-shaped strings: snake_case verticals/
 * sub-categories (`venture_capital`, `sda_housing`), free-form `key_metrics`
 * keyed by column-style names (`net_yield_pct`, `sil_provider`, `build_year`)
 * and enum-ish values (`biodiversity_credit`). Rendering those directly — or
 * worse, through CSS `capitalize`, which clobbers acronyms ("Sda Housing",
 * "Esvclp") — makes the cards read cheap.
 *
 * This module humanises them with **acronym awareness**: known domain
 * abbreviations stay uppercased, the rest get sentence/title case. It's the
 * single source of truth for listing label/value formatting (card grid +
 * detail view) — don't hand-roll `.replace(/_/g, " ")` at call sites.
 */

import { deriveListingKind, formatAudCompact, type DerivableListing } from "@/lib/listing-kind";
import { metricNumber } from "@/lib/listings/vertical-metrics";

/**
 * Domain abbreviations that must stay uppercased when they appear as a
 * standalone token. Lowercased here; matched case-insensitively. Kept
 * deliberately to terms that are abbreviations in this marketplace's context
 * (states, disability-housing, tax/structure, finance, energy units) so we
 * don't accidentally shout ordinary words.
 */
const ACRONYMS = new Set([
  // Australian states / territories
  "nsw", "vic", "qld", "wa", "sa", "nt", "act", "tas",
  // Disability accommodation / NDIS
  "sda", "sil", "ndis", "ohc", "ndia", "sroa",
  // Schemes / tax / investor structures
  "bcs", "esvclp", "esic", "siv", "firb", "cgt", "smsf", "fhog", "reit", "spv", "lrba",
  // Finance / deal terms
  "asx", "im", "pds", "irr", "mer", "aum", "ppa", "jorc", "ebitda", "roi",
  "npv", "etf", "ipo", "nav", "ltv", "icr", "wale", "p2p",
  // Energy / capacity units
  "kw", "mw", "gw", "kwh", "mwh", "gwh", "mwp", "co2",
  // Misc
  "esg", "ip", "gst", "abn", "acn", "usd", "aud", "gbp", "eur",
]);

/** Field keys we never surface as a metric chip on a card: shown elsewhere
 *  (price line), used only for kind derivation, or pure noise. */
const METRIC_SKIP = new Set([
  // Yield / return — shown as the headline stat beside the price (see
  // listingHeadlineStat), so never repeated as a chip.
  "net_yield_pct", "gross_yield_pct", "yield_pct", "yield_percent", "distribution_yield", "yield",
  "target_irr_pct", "target_irr", "irr",
  // Per-unit price — shown as the headline stat for environmental units.
  "spot_price_aud", "unit_price_aud",
  // Price / ticket — shown as the hero price.
  "min_investment_aud", "min_commit_aud", "min_investment", "asking_price",
  "asking_price_aud", "price", "price_aud",
  // Identifiers / derivation inputs / eligibility flags (rendered elsewhere).
  "asx_ticker", "commodity", "structure", "stage", "royalty_type",
  "wholesale_only", "s708_required", "accredited_only", "open_to_retail",
  "retail_eligible",
]);

/** Field keys with a hand-picked label that reads better than the generic
 *  humanisation of the column name. */
const METRIC_LABEL_OVERRIDES: Record<string, string> = {
  sil_provider: "SIL provider",
  unit_type: "type",
  build_year: "build year",
  case_size_mm: "case size",
  aum_billions: "AUM (bn)",
  mer_bps: "MER (bps)",
};

/** Metric keys whose numeric value should render as a percentage. */
const PCT_KEY = /(?:_pct|_percent|margin|yield|irr|return|_roi)$/i;

function titleCaseToken(token: string): string {
  if (!token) return token;
  if (ACRONYMS.has(token.toLowerCase())) return token.toUpperCase();
  // Leave tokens that already carry internal capitals (e.g. "McLaren", "iPhone").
  if (/[A-Z]/.test(token.slice(1))) return token;
  return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
}

/**
 * Title Case with acronym preservation — for category / sub-category lines.
 * `venture_capital` → "Venture Capital", `sda_housing` → "SDA Housing",
 * `esvclp` → "ESVCLP", `nsw_bcs` → "NSW BCS".
 */
export function humanizeTitle(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw
    .replace(/[_-]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((w) => titleCaseToken(w))
    .join(" ");
}

/** Lowercase words + acronyms — for the small grey metric labels
 *  ("bedrooms", "build year", "SIL provider"). */
function humanizeMetricLabel(key: string): string {
  if (METRIC_LABEL_OVERRIDES[key]) return METRIC_LABEL_OVERRIDES[key];
  return key
    .replace(/[_-]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((w) => (ACRONYMS.has(w.toLowerCase()) ? w.toUpperCase() : w.toLowerCase()))
    .join(" ");
}

/** Format a metric value: booleans → Yes/No, pct keys → "12.5%", snake_case
 *  values → sentence case with acronyms, others left as-is. */
export function formatMetricValue(key: string, value: unknown): string {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") {
    return PCT_KEY.test(key) ? `${value}%` : String(value);
  }
  const s = String(value).trim();
  if (!s) return s;
  // Machine-shaped value (snake/kebab, or all-lowercase) → humanise it.
  // Mixed-case values ("Confidential", "NSW BCS") are already presentable.
  if (/[_-]/.test(s) || s === s.toLowerCase()) {
    return s
      .replace(/[_-]+/g, " ")
      .trim()
      .split(/\s+/)
      .map((w) => titleCaseToken(w))
      .join(" ");
  }
  return s;
}

export interface DisplayMetric {
  key: string;
  /** Lowercase-with-acronyms label, e.g. "build year", "SIL provider". */
  label: string;
  /** Presentable value, e.g. "2025", "Biodiversity credit", "12.5%". Empty
   *  string for a presence chip (see `bool`). */
  value: string;
  /** True when this is a present-and-true boolean, rendered as a label-only
   *  presence chip ("SMSF eligible") rather than a "Yes <label>" value pair. */
  bool?: boolean;
}

/**
 * Pick and format up to `limit` `key_metrics` entries for a card's inline
 * metric line — skipping price/yield duplicates, derivation inputs and noise,
 * and humanising both key and value.
 */
export function listingDisplayMetrics(
  km: Record<string, unknown> | null | undefined,
  limit = 3,
): DisplayMetric[] {
  if (!km) return [];
  const out: DisplayMetric[] = [];
  for (const [key, value] of Object.entries(km)) {
    if (value == null || value === "") continue;
    if (METRIC_SKIP.has(key)) continue;
    // Booleans read badly as "Yes <label>" / "No <label>". Surface a true
    // boolean as a label-only presence chip; drop false ones entirely rather
    // than render "No SMSF eligible".
    const isBool = typeof value === "boolean" || value === "true" || value === "false";
    if (isBool) {
      if (value !== true && value !== "true") continue;
      out.push({ key, label: humanizeMetricLabel(key), value: "", bool: true });
    } else {
      out.push({ key, label: humanizeMetricLabel(key), value: formatMetricValue(key, value), bool: false });
    }
    if (out.length >= limit) break;
  }
  return out;
}

// ─── Headline return stat (the card's second number) ──────────────────────

export interface HeadlineStat {
  /** Small label above the figure, e.g. "Net yield", "Target IRR", "Per credit". */
  label: string;
  /** The figure itself, e.g. "11.2%", "22%", "$1k". */
  value: string;
  /** `positive` → green (a yield / return); `neutral` → ink (a unit price). */
  tone: "positive" | "neutral";
}

function pickMetricNumber(km: Record<string, unknown>, keys: string[]): number | null {
  for (const k of keys) {
    if (km[k] != null && km[k] !== "") {
      const n = metricNumber(km[k]);
      if (n != null) return n;
    }
  }
  return null;
}

/** "11.2%", but "22%" — keep one decimal only when it carries information. */
function formatPct(n: number): string {
  return `${Number.isInteger(n) ? n.toFixed(0) : n.toFixed(1)}%`;
}

function perUnitLabel(km: Record<string, unknown>): string {
  return String(km["unit_type"] ?? "").toLowerCase().includes("credit") ? "Per credit" : "Per unit";
}

/**
 * The card's secondary "return" stat — the number a retail investor actually
 * compares listings on (yield / IRR / unit price), rendered in its OWN slot
 * beside the ticket price rather than concatenated into it. Read structurally
 * from `key_metrics`; never parsed out of free-text `price_display`. Null when
 * the listing has no meaningful headline metric (the card shows price alone).
 *
 *   - Funds            → "Target IRR 22%" (kept labelled forward-looking)
 *   - Per-unit assets  → "Per credit $1k" (explicit unit price, or price ÷ units)
 *   - Yield-bearing    → "Net yield 11.2%" (property / project / royalty / listed)
 */
export function listingHeadlineStat(
  l: DerivableListing & { sub_category?: string | null },
): HeadlineStat | null {
  const kind = deriveListingKind(l);
  const km = (l.key_metrics ?? {}) as Record<string, unknown>;

  // Funds: forward-looking target IRR, with distribution yield as a fallback.
  if (kind === "fund") {
    const irr = pickMetricNumber(km, ["target_irr_pct"]);
    if (irr != null) return { label: "Target IRR", value: formatPct(irr), tone: "positive" };
    const dist = pickMetricNumber(km, ["distribution_yield", "yield_percent", "net_yield_pct"]);
    if (dist != null) return { label: "Distribution", value: formatPct(dist), tone: "positive" };
    return null;
  }

  // Per-unit environmental assets (ACCUs, biodiversity credits): the buyer's
  // unit economics — prefer an explicit spot/unit price, else derive it from
  // the ticket price over the unit count.
  const explicitUnit = pickMetricNumber(km, ["spot_price_aud", "unit_price_aud"]);
  if (explicitUnit != null && explicitUnit > 0) {
    return { label: perUnitLabel(km), value: formatAudCompact(Math.round(explicitUnit * 100)), tone: "neutral" };
  }
  const units = pickMetricNumber(km, ["credits", "units"]);
  if (units != null && units > 0 && l.asking_price_cents != null && l.asking_price_cents > 0) {
    return { label: perUnitLabel(km), value: formatAudCompact(Math.round(l.asking_price_cents / units)), tone: "neutral" };
  }

  // Yield-bearing tangibles / projects / royalties / listed securities.
  const yld = pickMetricNumber(km, ["net_yield_pct", "gross_yield_pct", "yield_percent", "yield_pct", "distribution_yield", "yield"]);
  if (yld != null) {
    return { label: km["net_yield_pct"] != null ? "Net yield" : "Yield", value: formatPct(yld), tone: "positive" };
  }

  return null;
}
