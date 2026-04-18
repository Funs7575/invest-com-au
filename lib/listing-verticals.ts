/**
 * Canonical listing verticals — single source of truth.
 *
 * Every slug here matches:
 *   - The route segment under /invest/<slug>/
 *   - The investment_listings.vertical column value
 *   - The lookup keys used by investment-listings-query, sitemap,
 *     SubCategoryNav, navigation components and InvestListingsClient
 *
 * When adding a new vertical:
 *   1. Insert a row into investment_verticals (or commodity_sectors
 *      for commodity hubs) matching `slug` below.
 *   2. Add the entry here with the same slug.
 *   3. Create app/invest/<slug>/page.tsx following an existing hub
 *      (oil-gas for commodity, buy-business for marketplace).
 *   4. Run a slug-normalisation migration against investment_listings
 *      if existing rows use a different casing/convention.
 */

export type ListingVerticalKind = "marketplace" | "commodity" | "fund" | "capital-markets";

export interface ListingVertical {
  /** Canonical slug — matches investment_listings.vertical and the route */
  slug: string;
  /** Display label used in nav, cards, breadcrumbs */
  label: string;
  /** Short one-liner for /invest grid card subtitle */
  description: string;
  /** Icon name passed to components/Icon */
  icon: string;
  /** Category for ordering / grouping on the hub page */
  kind: ListingVerticalKind;
  /** Sort order for the /invest grid and sitemap */
  order: number;
}

export const LISTING_VERTICALS: readonly ListingVertical[] = [
  {
    slug: "buy-business",
    label: "Buy a Business",
    description: "Cafes, agencies, e-commerce, professional practices and more",
    icon: "briefcase",
    kind: "marketplace",
    order: 10,
  },
  {
    slug: "mining",
    label: "Mining & Resources",
    description: "Gold, lithium, copper, rare earths and critical minerals",
    icon: "layers",
    kind: "commodity",
    order: 20,
  },
  {
    slug: "oil-gas",
    label: "Oil & Gas",
    description:
      "LNG, exploration, refineries and energy infrastructure",
    icon: "fuel",
    kind: "commodity",
    order: 22,
  },
  {
    slug: "uranium",
    label: "Uranium",
    description: "ASX uranium producers, explorers and sector ETFs",
    icon: "atom",
    kind: "commodity",
    order: 24,
  },
  {
    slug: "lithium",
    label: "Lithium",
    description: "Pilbara producers, downstream processing and battery metals",
    icon: "zap",
    kind: "commodity",
    order: 26,
  },
  {
    slug: "hydrogen",
    label: "Hydrogen",
    description:
      "Green hydrogen, fuel cells and H2 infrastructure",
    icon: "droplets",
    kind: "commodity",
    order: 28,
  },
  {
    slug: "gold",
    label: "Gold & Precious Metals",
    description: "Perth Mint, gold ETFs and ASX gold miners",
    icon: "coins",
    kind: "commodity",
    order: 30,
  },
  {
    slug: "farmland",
    label: "Farmland & Agriculture",
    description: "Cropping, dairy, viticulture and horticulture across Australia",
    icon: "leaf",
    kind: "marketplace",
    order: 40,
  },
  {
    slug: "commercial-property",
    label: "Commercial Property",
    description: "Office, industrial, retail, medical and childcare",
    icon: "building",
    kind: "marketplace",
    order: 50,
  },
  {
    slug: "renewable-energy",
    label: "Renewable Energy",
    description: "Solar, wind, battery storage and grid-scale projects",
    icon: "sun",
    kind: "marketplace",
    order: 55,
  },
  {
    slug: "franchise",
    label: "Franchise",
    description: "Food, fitness, automotive and service franchise opportunities",
    icon: "star",
    kind: "marketplace",
    order: 60,
  },
  {
    slug: "startups",
    label: "Startups & Tech",
    description: "VC, angel investing, SAFE rounds and crowdfunding",
    icon: "rocket",
    kind: "capital-markets",
    order: 70,
  },
  {
    slug: "funds",
    label: "Investment Funds",
    description: "Managed, syndicated property, infrastructure and wholesale funds",
    icon: "briefcase",
    kind: "fund",
    order: 80,
  },
  {
    slug: "infrastructure",
    label: "Infrastructure",
    description: "Toll roads, airports, utilities and public-private partnerships",
    icon: "layers",
    kind: "capital-markets",
    order: 90,
  },
];

/** Canonical slugs only — useful for route static params + validation. */
export const LISTING_VERTICAL_SLUGS: readonly string[] = LISTING_VERTICALS.map(
  (v) => v.slug,
);

/** Fast lookup by slug. Returns undefined for unknown slugs. */
export function getListingVertical(
  slug: string,
): ListingVertical | undefined {
  return LISTING_VERTICALS.find((v) => v.slug === slug);
}

/** Label lookup — falls back to the raw slug if unknown. */
export function getListingVerticalLabel(slug: string): string {
  return getListingVertical(slug)?.label ?? slug;
}
