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
  "sda", "sil", "ndis", "ohc",
  // Schemes / tax / investor structures
  "bcs", "esvclp", "esic", "siv", "firb", "cgt", "smsf", "fhog", "reit", "spv",
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
  // Yield / return — already shown on the price line for yield-bearing kinds.
  "net_yield_pct", "gross_yield_pct", "yield_pct", "distribution_yield", "yield",
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
  /** Presentable value, e.g. "2025", "Biodiversity credit", "12.5%". */
  value: string;
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
    out.push({ key, label: humanizeMetricLabel(key), value: formatMetricValue(key, value) });
    if (out.length >= limit) break;
  }
  return out;
}
