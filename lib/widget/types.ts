/**
 * Embeddable widget content-filter catalogue.
 *
 * The /api/widget route accepts `?widget=` to pick from this list, in
 * addition to the existing `?type=table|compact`, `?theme=`, `?limit=`,
 * `?brokers=` controls. `?widget=` filters which brokers are eligible
 * to appear — the layout/theme params still control rendering.
 *
 * `?widget=` is OPTIONAL — when omitted, the route falls back to the
 * existing behaviour (top brokers by rating, optionally filtered by
 * `?brokers=`).
 *
 * Calculator widgets are served by the separate /api/widget/calculator
 * route (same Shadow DOM / CORS / ISR approach), configured via
 * CALCULATOR_WIDGET_CATALOGUE below.
 */

export type WidgetFilter = "all" | "asx" | "us" | "crypto" | "savings" | "term-deposits";

export interface WidgetCatalogueEntry {
  slug: string;
  label: string;
  description: string;
  filter: WidgetFilter;
  /** Heading text shown above the table in the rendered widget. */
  heading: string;
}

export const WIDGET_CATALOGUE: ReadonlyArray<WidgetCatalogueEntry> = [
  {
    slug: "cheapest-brokers",
    label: "Cheapest Brokers",
    description: "ASX brokers ranked by per-trade fee — refreshed daily.",
    filter: "asx",
    heading: "Cheapest Australian Brokers",
  },
  {
    slug: "us-shares",
    label: "Best Brokers for US Shares",
    description: "Brokers that offer US-share access with disclosed FX.",
    filter: "us",
    heading: "Best Brokers for US Shares",
  },
  {
    slug: "top-crypto",
    label: "Top Crypto Exchanges",
    description: "AUSTRAC-registered exchanges with AUD deposits.",
    filter: "crypto",
    heading: "Top AU Crypto Exchanges",
  },
  {
    slug: "savings-rates",
    label: "Best Savings Rates",
    description: "Latest high-interest savings accounts.",
    filter: "savings",
    heading: "Best Savings Rates",
  },
  {
    slug: "term-deposits",
    label: "Term Deposits",
    description: "Best fixed-rate term deposits this week.",
    filter: "term-deposits",
    heading: "Best Term Deposits",
  },
];

const BY_SLUG = new Map(WIDGET_CATALOGUE.map((w) => [w.slug, w]));

export function getWidgetCatalogueEntry(slug: string): WidgetCatalogueEntry | undefined {
  return BY_SLUG.get(slug);
}

export function listWidgetSlugs(): string[] {
  return WIDGET_CATALOGUE.map((w) => w.slug);
}

// ─── Calculator Widget types ──────────────────────────────────────────────────

/**
 * A calculator widget preset — a suggested configuration for the
 * /api/widget/calculator embed that publishers can copy as-is.
 */
export interface CalcWidgetPreset {
  slug: string;
  label: string;
  description: string;
  /** Default market shown in the rendered widget. */
  market: "asx" | "us";
  /** Default trade amount pre-filled in the widget input. */
  amount: number;
  /** Human-readable snippet hint shown in the embed builder. */
  snippetHint: string;
}

export const CALCULATOR_WIDGET_CATALOGUE: ReadonlyArray<CalcWidgetPreset> = [
  {
    slug: "asx-fees",
    label: "ASX Brokerage Comparison",
    description: "Live per-trade cost across every major AU broker — ASX shares.",
    market: "asx",
    amount: 5000,
    snippetHint: "Ideal for articles about ASX investing, stock brokers, or cost comparisons.",
  },
  {
    slug: "us-fees",
    label: "US Share Cost Comparison",
    description: "True per-trade cost including FX margin for US shares.",
    market: "us",
    amount: 5000,
    snippetHint: "Ideal for articles about US investing, international shares, or FX costs.",
  },
  {
    slug: "large-trade",
    label: "Large Trade Cost ($25k)",
    description: "Shows how percentage-based brokerage stings on larger trades.",
    market: "asx",
    amount: 25000,
    snippetHint: "Ideal for articles about high-value trades, ETFs, or wholesale investing.",
  },
];

const CALC_BY_SLUG = new Map(CALCULATOR_WIDGET_CATALOGUE.map((p) => [p.slug, p]));

export function getCalcWidgetPreset(slug: string): CalcWidgetPreset | undefined {
  return CALC_BY_SLUG.get(slug);
}
