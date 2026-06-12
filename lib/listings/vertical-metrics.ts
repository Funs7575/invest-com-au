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
  /** Options for enum metrics (select/multi filters). */
  enumValues?: ReadonlyArray<{ value: string; label: string }>;
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
  { key: "stage", label: "Stage", kind: "enum", filter: "multi", wizardStep: "core", qualitySignal: true, enumValues: [
    { value: "exploration", label: "Exploration" },
    { value: "development", label: "Development" },
    { value: "production", label: "Production" },
  ] },
  { key: "jorc_stage", label: "JORC classification", kind: "enum", filter: "select", wizardStep: "details", forward: true, enumValues: [
    { value: "inferred", label: "Inferred" },
    { value: "indicated", label: "Indicated" },
    { value: "measured", label: "Measured" },
  ], help: "Resource confidence under the JORC Code." },
];

const RENEWABLE_ENERGY: readonly VerticalMetricDef[] = [
  { key: "capacity_mw", label: "Capacity", kind: "number", unit: "MW", filter: "range", perUnitDenominator: true, wizardStep: "core", qualitySignal: true },
  { key: "stage", label: "Stage", kind: "enum", filter: "multi", wizardStep: "core", enumValues: [
    { value: "development", label: "Development" },
    { value: "construction", label: "Construction" },
    { value: "operating", label: "Operating" },
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

/** Format a raw key_metrics value per its definition (spec tables, cards). */
export function formatMetricByDef(def: VerticalMetricDef, raw: unknown): string | null {
  if (raw == null || raw === "") return null;
  switch (def.kind) {
    case "percent": {
      const n = typeof raw === "number" ? raw : Number(raw);
      return Number.isFinite(n) ? `${n.toFixed(n < 10 ? 1 : 0)}%` : null;
    }
    case "currency_cents": {
      const n = typeof raw === "number" ? raw : Number(raw);
      return Number.isFinite(n) && n > 0 ? formatAudCompact(n) : null;
    }
    case "number": {
      const n = typeof raw === "number" ? raw : Number(raw);
      if (!Number.isFinite(n)) return null;
      return `${n.toLocaleString("en-AU")}${def.unit ? ` ${def.unit}` : ""}`;
    }
    case "boolean":
      return raw === true || raw === "true" ? "Yes" : "No";
    case "enum": {
      const match = def.enumValues?.find((e) => e.value === String(raw));
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

  const raw = (listing.key_metrics ?? {})[def.key];
  const denom = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(denom) || denom <= 0) return null;

  const centsPerUnit = price / denom;
  const unit = def.unit ?? "unit";
  return {
    value: `${formatAudCompact(Math.round(centsPerUnit))}/${unit}`,
    label: `$/${unit}`,
    centsPerUnit,
  };
}
