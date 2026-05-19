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
