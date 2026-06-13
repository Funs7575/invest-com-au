/**
 * Per-vertical metric registry — the marketplace's filter/spec SSOT.
 *
 * One definition per first-class metric per category: what it's called,
 * how it formats, whether (and how) it filters, whether it drives the
 * $/unit normalisation, and how the listing wizard should collect it.
 * Browse facets (#1), the compare spec table (#7), $/unit ranking (#8),
 * the wizard steps (#15) and the quality meter (#16) all read THIS table
 * — adding a metric here lights it up everywhere at once.
 *
 * Keys match the real `key_metrics` vocabulary in production rows (census
 * 2026-06-12: yield_percent, wale_years, tenancy, sqm, hectares,
 * rainfall_mm, water_entitlements_ml, royalty_percent, commodity, stage,
 * capacity_mw, annual_ebitda, brand, min_investment_cents…). Keys marked
 * `forward: true` aren't in legacy rows yet — the wizard starts collecting
 * them; facet UIs hide options with zero supply, so they are safe to ship
 * ahead of the data.
 */

import { categoryForListing } from "@/lib/listing-url";
import { formatAudCompact } from "@/lib/listing-kind";

export type MetricKind =
  | "number"
  | "percent"
  | "currency_cents"
  | "enum"
  | "boolean"
  | "text";

export type MetricFilter = "range" | "select" | "multi" | "toggle";

export interface VerticalMetricDef {
  /** key_metrics key (production vocabulary). */
  key: string;
  label: string;
  kind: MetricKind;
  /** Display unit suffix, e.g. "ha", "m²", "ML", "MW", "yrs". */
  unit?: string;
  /** Render as a browse filter — and which control. Omit = spec-only. */
  filter?: MetricFilter;
  /**
   * Options for enum metrics (select/multi filters). `value` is the
   * canonical stored vocabulary (what production rows actually contain);
   * `aliases` are other stored/param spellings that count as the same
   * option — matching always canonicalises through
   * {@link canonicalEnumValue}, so synonym rows are never silently
   * excluded from a facet.
   */
  enumValues?: ReadonlyArray<{ value: string; label: string; aliases?: readonly string[] }>;
  /** This metric is the denominator for the category's $/unit figure. */
  perUnitDenominator?: boolean;
  /** Wizard placement (#15); undefined = details step. */
  wizardStep?: "core" | "financials" | "details";
  /** Counts toward the quality meter (#16) when present. */
  qualitySignal?: boolean;
  /** One-line microcopy for wizard + filter tooltips. */
  help?: string;
  /** Not yet present in legacy rows — collected from now on. */
  forward?: boolean;
}

const COMMERCIAL_PROPERTY: readonly VerticalMetricDef[] = [
  { key: "yield_percent", label: "Net yield", kind: "percent", filter: "range", wizardStep: "financials", qualitySignal: true, help: "Annual net income as a percentage of the asking price." },
  { key: "wale_years", label: "WALE", kind: "number", unit: "yrs", filter: "range", wizardStep: "financials", qualitySignal: true, help: "Weighted average lease expiry across current tenancies." },
  { key: "sqm", label: "Floor area", kind: "number", unit: "m²", filter: "range", perUnitDenominator: true, wizardStep: "core", qualitySignal: true },
  // Values match the stored vocabulary exactly ("single tenant" /
  // "multi tenant" — space-separated in production rows).
  { key: "tenancy", label: "Tenancy", kind: "enum", filter: "multi", wizardStep: "core", enumValues: [
    { value: "single tenant", label: "Single tenant" },
    { value: "multi tenant", label: "Multi-tenant" },
    { value: "vacant", label: "Vacant possession" },
  ] },
  { key: "zoning", label: "Zoning", kind: "text", wizardStep: "details", forward: true, help: "Local planning zone, e.g. B3 Commercial Core." },
  { key: "building_class", label: "Building class", kind: "enum", filter: "select", wizardStep: "details", forward: true, enumValues: [
    { value: "a", label: "A grade" },
    { value: "b", label: "B grade" },
    { value: "c", label: "C grade" },
  ] },
];

const FARMLAND: readonly VerticalMetricDef[] = [
  { key: "hectares", label: "Land area", kind: "number", unit: "ha", filter: "range", perUnitDenominator: true, wizardStep: "core", qualitySignal: true },
  { key: "water_entitlements_ml", label: "Water entitlements", kind: "number", unit: "ML", filter: "range", wizardStep: "core", qualitySignal: true, help: "Megalitres of entitlement included in the sale." },
  { key: "rainfall_mm", label: "Annual rainfall", kind: "number", unit: "mm", filter: "range", wizardStep: "details" },
  { key: "land_use", label: "Land use", kind: "enum", filter: "multi", wizardStep: "core", forward: true, enumValues: [
    { value: "cropping", label: "Cropping" },
    { value: "grazing", label: "Grazing" },
    { value: "horticulture", label: "Horticulture" },
    { value: "mixed", label: "Mixed" },
  ] },
];

const FRANCHISE: readonly VerticalMetricDef[] = [
  { key: "min_investment_cents", label: "Total investment from", kind: "currency_cents", filter: "range", wizardStep: "financials", qualitySignal: true },
  { key: "royalty_percent", label: "Ongoing royalty", kind: "percent", filter: "range", wizardStep: "financials", qualitySignal: true, help: "Ongoing royalty as a percentage of gross revenue." },
  { key: "brand", label: "Brand", kind: "text", wizardStep: "core" },
  { key: "territory_exclusive", label: "Exclusive territory", kind: "boolean", filter: "toggle", wizardStep: "details", forward: true },
];

const MINING: readonly VerticalMetricDef[] = [
  { key: "commodity", label: "Commodity", kind: "enum", filter: "multi", wizardStep: "core", qualitySignal: true, enumValues: [
    { value: "gold", label: "Gold" },
    { value: "lithium", label: "Lithium" },
    { value: "uranium", label: "Uranium" },
    { value: "copper", label: "Copper" },
    { value: "iron_ore", label: "Iron ore" },
    { value: "rare_earths", label: "Rare earths" },
  ] },
  // Values match the stored vocabulary ("explorer"/"developer"/"producer"
  // — census 2026-06-12); aliases keep the human-noun spellings matching.
  { key: "stage", label: "Stage", kind: "enum", filter: "multi", wizardStep: "core", qualitySignal: true, enumValues: [
    { value: "explorer", label: "Exploration", aliases: ["exploration"] },
    { value: "developer", label: "Development", aliases: ["development"] },
    { value: "producer", label: "Production", aliases: ["production"] },
  ] },
  { key: "jorc_stage", label: "JORC classification", kind: "enum", filter: "select", wizardStep: "details", forward: true, enumValues: [
    { value: "inferred", label: "Inferred" },
    { value: "indicated", label: "Indicated" },
    { value: "measured", label: "Measured" },
  ], help: "Resource confidence under the JORC Code." },
];

const RENEWABLE_ENERGY: readonly VerticalMetricDef[] = [
  { key: "capacity_mw", label: "Capacity", kind: "number", unit: "MW", filter: "range", perUnitDenominator: true, wizardStep: "core", qualitySignal: true },
  // Stored vocabulary is "operational"/"planning" (census 2026-06-12);
  // "operating" drifts in from the digital-infrastructure seeds and
  // "construction" is collected forward by the wizard.
  { key: "stage", label: "Stage", kind: "enum", filter: "multi", wizardStep: "core", enumValues: [
    { value: "planning", label: "In planning", aliases: ["development"] },
    { value: "construction", label: "Under construction" },
    { value: "operational", label: "Operating", aliases: ["operating"] },
  ] },
];

const BUY_BUSINESS: readonly VerticalMetricDef[] = [
  { key: "annual_ebitda", label: "Annual EBITDA", kind: "currency_cents", filter: "range", wizardStep: "financials", qualitySignal: true },
];

const WATER_RIGHTS: readonly VerticalMetricDef[] = [
  { key: "water_entitlements_ml", label: "Entitlement volume", kind: "number", unit: "ML", filter: "range", perUnitDenominator: true, wizardStep: "core", qualitySignal: true },
  { key: "water_system", label: "System / catchment", kind: "text", wizardStep: "core", forward: true, help: "E.g. Goulburn 1A, Murrumbidgee general security." },
  { key: "entitlement_class", label: "Entitlement class", kind: "enum", filter: "select", wizardStep: "core", forward: true, enumValues: [
    { value: "high_security", label: "High security" },
    { value: "general_security", label: "General security" },
  ] },
];

/** Category slug (lib/listing-url vocabulary) → first-class metrics. */
export const VERTICAL_METRICS: Record<string, readonly VerticalMetricDef[]> = {
  "commercial-property": COMMERCIAL_PROPERTY,
  farmland: FARMLAND,
  franchise: FRANCHISE,
  mining: MINING,
  "renewable-energy": RENEWABLE_ENERGY,
  "buy-business": BUY_BUSINESS,
  "water-rights": WATER_RIGHTS,
};

export function metricsForCategory(categorySlug: string): readonly VerticalMetricDef[] {
  return VERTICAL_METRICS[categorySlug] ?? [];
}

export function filterableMetrics(categorySlug: string): readonly VerticalMetricDef[] {
  return metricsForCategory(categorySlug).filter((m) => m.filter);
}

// ─── Tolerant value parsing ───────────────────────────────────────────────
//
// key_metrics is seller-entered jsonb: numeric metrics arrive as numbers
// in new rows but as display strings in legacy rows ("$680,000", "9.2%",
// "1,234"). Everything that ranks, bounds, filters or formats a metric
// must go through these parsers — a raw `Number(...)` turns those rows
// into NaN and silently drops them from facets and compare tables.

/** Lenient numeric parse: numbers pass through; strings shed currency
 *  symbols, thousands separators and a trailing %. Null when unparseable
 *  — callers must treat null as "absent", never as 0. */
export function metricNumber(raw: unknown): number | null {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  if (typeof raw !== "string") return null;
  const cleaned = raw.trim().replace(/^(au[d$]?|a\$)\s*/i, "").replace(/[$,\s]/g, "").replace(/%$/, "");
  if (cleaned === "" || !/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** Cents for a currency metric. Numbers are already cents (the stored
 *  vocabulary: annual_ebitda / min_investment_cents numeric rows are
 *  cents — see ListingCard's formatCents precedent). Display strings are
 *  dollars ("$680,000" → 68_000_000¢): the $ sign, separators or a
 *  decimal point mark the dollars spelling; a bare integer string
 *  mirrors numeric storage and stays cents. */
export function metricCents(raw: unknown): number | null {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  if (typeof raw !== "string") return null;
  const isDollars = /[$,.]|^au/i.test(raw.trim());
  const n = metricNumber(raw);
  if (n == null) return null;
  return isDollars ? Math.round(n * 100) : n;
}

/** Dispatch on the def's kind: currency metrics parse to cents, the rest
 *  to plain numbers. */
export function metricNumberByDef(def: VerticalMetricDef, raw: unknown): number | null {
  return def.kind === "currency_cents" ? metricCents(raw) : metricNumber(raw);
}

/** Shared token normalisation for enum matching — case/separator
 *  insensitive ("multi_tenant" ≡ "Multi Tenant" ≡ "multi-tenant"). */
export function normaliseEnumToken(x: string): string {
  return x.trim().toLowerCase().replace(/[\s_-]+/g, " ");
}

/**
 * Canonical option value for a raw stored value or filter token, matching
 * against each option's value AND aliases (normalised). Null when the def
 * has no enum vocabulary or nothing matches — callers fall back to plain
 * normalised comparison so unknown values still match themselves.
 */
export function canonicalEnumValue(def: VerticalMetricDef, raw: unknown): string | null {
  if (!def.enumValues || raw == null) return null;
  const token = normaliseEnumToken(String(raw));
  if (token === "") return null;
  for (const option of def.enumValues) {
    if (normaliseEnumToken(option.value) === token) return option.value;
    if (option.aliases?.some((a) => normaliseEnumToken(a) === token)) return option.value;
  }
  return null;
}

/** Format a raw key_metrics value per its definition (spec tables, cards). */
export function formatMetricByDef(def: VerticalMetricDef, raw: unknown): string | null {
  if (raw == null || raw === "") return null;
  switch (def.kind) {
    case "percent": {
      const n = metricNumber(raw);
      return n != null ? `${n.toFixed(n < 10 ? 1 : 0)}%` : null;
    }
    case "currency_cents": {
      const n = metricCents(raw);
      return n != null && n > 0 ? formatAudCompact(n) : null;
    }
    case "number": {
      const n = metricNumber(raw);
      if (n == null) return null;
      return `${n.toLocaleString("en-AU")}${def.unit ? ` ${def.unit}` : ""}`;
    }
    case "boolean":
      return raw === true || raw === "true" ? "Yes" : "No";
    case "enum": {
      const canonical = canonicalEnumValue(def, raw);
      const match = def.enumValues?.find((e) => e.value === canonical);
      return match?.label ?? String(raw);
    }
    default:
      return String(raw);
  }
}

// ─── $/unit normalisation (#8) ────────────────────────────────────────────

export interface PricePerUnit {
  /** e.g. "$10.2k/ha", "$4,860/m²", "$2.1k/ML" */
  value: string;
  /** e.g. "$/ha" — for sort labels + compare rows. */
  label: string;
  /** Raw cents-per-unit for sorting. */
  centsPerUnit: number;
}

interface PerUnitInput {
  vertical: string;
  sub_category?: string | null;
  listing_kind?: string | null;
  asking_price_cents?: number | null;
  key_metrics?: Record<string, unknown> | null;
}

/**
 * The serious buyer's number: asking price over the category's natural
 * denominator ($/ha land, $/m² commercial, $/ML water, $/MW energy).
 * Null when the listing is POA, the denominator is absent/zero, or the
 * category has no defined denominator — never guess.
 */
export function pricePerUnit(listing: PerUnitInput): PricePerUnit | null {
  const price = listing.asking_price_cents;
  if (price == null || price <= 0) return null;

  const category = categoryForListing(listing);
  const def = metricsForCategory(category).find((m) => m.perUnitDenominator);
  if (!def) return null;

  const denom = metricNumber((listing.key_metrics ?? {})[def.key]);
  if (denom == null || denom <= 0) return null;

  const centsPerUnit = price / denom;
  const unit = def.unit ?? "unit";
  return {
    value: `${formatAudCompact(Math.round(centsPerUnit))}/${unit}`,
    label: `$/${unit}`,
    centsPerUnit,
  };
}
