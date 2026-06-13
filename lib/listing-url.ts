import type { InvestListingVertical, ListingKind } from "@/lib/types";

/**
 * Maps each `vertical` value from the database to its corresponding
 * URL category slug used in the /invest/{category}/listings/{slug} routes.
 */
export const VERTICAL_TO_CATEGORY: Record<InvestListingVertical, string> = {
  aquaculture: "aquaculture",
  bullion: "bullion",
  business: "buy-business",
  "carbon-environmental-markets": "carbon-credits",
  commercial_property: "commercial-property",
  "digital-infrastructure": "digital-infrastructure",
  energy: "renewable-energy",
  farmland: "farmland",
  franchise: "franchise",
  fund: "funds",
  "hedge-fund": "private-equity",
  "insurance-linked-securities": "insurance-linked-securities",
  "litigation-funding": "litigation-funding",
  livestock: "livestock",
  mining: "mining",
  pre_ipo: "pre-ipo",
  "private-equity": "private-equity",
  "public-social-infrastructure": "public-social-infrastructure",
  royalties: "royalties",
  startup: "startups",
  "venture-capital": "venture-capital",
  "water-rights": "water-rights",
};

/**
 * Non-canonical `vertical` strings that have drifted into the database
 * via various seed waves, mapped back to their canonical
 * `InvestListingVertical`. Several seeds stored the hyphenated/plural
 * *category* slug (e.g. "renewable-energy", "startups") in the
 * `vertical` column instead of the canonical union value ("energy",
 * "startup"). Left unnormalised, `categoryForListing` falls these
 * through to the "funds" bucket, so commercial-property / startups /
 * renewable-energy filters and deep-links silently show nothing.
 *
 * Normalising in code (rather than mutating prod data) keeps the fix
 * reversible and avoids an autonomous data migration. The root-cause
 * data cleanup is tracked separately.
 */
export const VERTICAL_ALIASES: Record<string, string> = {
  "commercial-property": "commercial_property",
  funds: "fund",
  startups: "startup",
  "renewable-energy": "energy",
  "buy-business": "business",
};

/** Canonical vertical for a (possibly drifted) raw vertical string. */
export function normaliseVertical(raw: string): string {
  return VERTICAL_ALIASES[raw] ?? raw;
}

/**
 * The reverse of {@link VERTICAL_ALIASES}: every canonical vertical mapped
 * to the full set of raw strings (canonical + drift variants) that should
 * be matched when querying the DB for that vertical. Built once at module
 * load.
 */
const RAW_VERTICAL_VARIANTS: Record<string, string[]> = (() => {
  const map: Record<string, string[]> = {};
  for (const [raw, canonical] of Object.entries(VERTICAL_ALIASES)) {
    (map[canonical] ??= [canonical]).push(raw);
  }
  return map;
})();

/**
 * All raw `vertical` strings to match for a canonical vertical — the
 * canonical value plus any drifted variants. Use in `.in("vertical", …)`
 * queries so listings seeded with a drifted vertical aren't missed.
 */
export function rawVerticalVariants(canonical: string): string[] {
  return RAW_VERTICAL_VARIANTS[canonical] ?? [canonical];
}

/** The set of canonical vertical values (keys of VERTICAL_TO_CATEGORY). */
export const CANONICAL_VERTICALS: ReadonlySet<string> = new Set(
  Object.keys(VERTICAL_TO_CATEGORY),
);

/**
 * Whether a raw vertical normalises to a known canonical vertical. Guide
 * sector-hub verticals (e.g. "oil-gas", "uranium", "hydrogen") and any
 * other unrecognised string return false — callers building the
 * Opportunities IA use this to exclude such listings from category counts
 * and curated samples rather than letting them pollute the "funds" bucket.
 */
export function isCanonicalVertical(raw: string): boolean {
  return CANONICAL_VERTICALS.has(normaliseVertical(raw));
}

/**
 * Some `fund` listings actually belong to a different category based on
 * their `sub_category` value. For example, a fund with sub_category "art"
 * is an "alternatives" category listing.
 */
export const FUND_SUB_TO_CATEGORY: Record<string, string> = {
  art: "alternatives",
  wine: "alternatives",
  watches: "alternatives",
  cars: "alternatives",
  coins: "alternatives",
  whisky: "alternatives",
  sports_memorabilia: "alternatives",
  private_credit: "private-credit",
  infrastructure: "infrastructure",
};

/**
 * Structural input for {@link categoryForListing} / {@link listingUrl}.
 * Deliberately wider than `InvestmentListing`: `vertical` is a plain
 * string because prod rows carry drifted values outside the
 * `InvestListingVertical` union (see VERTICAL_ALIASES) — both functions
 * normalise and fall back gracefully, so callers holding raw DB rows
 * don't need to cast.
 */
export interface ListingUrlInput {
  vertical: string;
  sub_category?: string | null;
  listing_kind?: ListingKind | string | null;
}

/**
 * Returns the canonical category slug for an investment listing.
 * Used to construct correct URLs for listing detail pages.
 */
export function categoryForListing(listing: ListingUrlInput): string {
  // ASX-listed securities are an instrument class that spans many sectors
  // (uranium, hydrogen, oil & gas, …). Group them into one factual
  // "listed-securities" category instead of scattering them by vertical —
  // where the unmapped energy verticals previously fell to the "funds"
  // fallback. (listing_kind is optional: callers passing only vertical/
  // sub_category — e.g. state rollups — keep the vertical-based behaviour.)
  if (listing.listing_kind === "listed_security") return "listed-securities";
  const vertical = normaliseVertical(listing.vertical);
  if (vertical === "fund" && listing.sub_category) {
    const override = FUND_SUB_TO_CATEGORY[listing.sub_category];
    if (override) return override;
  }
  return VERTICAL_TO_CATEGORY[vertical as InvestListingVertical] ?? "funds";
}

/**
 * Returns the canonical URL path for an investment listing detail page.
 * Format: /invest/{category}/listings/{slug}
 *
 * Use this everywhere instead of hardcoded URL templates to ensure links
 * always go to the correct category-specific route.
 */
export function listingUrl(listing: ListingUrlInput & { slug: string }): string {
  return `/invest/${categoryForListing(listing)}/listings/${listing.slug}`;
}

/**
 * Server-side query narrowing for a category slug — the DB-column
 * predicates that bound a category's candidate rows so capped queries
 * (`.limit(N)`) can't starve the category out of its own results.
 *
 * The scope is a deliberate slight over-fetch, never an under-fetch:
 * rows inside the scope may still belong to a sibling category (e.g. a
 * `listed_security` row inside a sector vertical), so callers that need
 * exactness post-filter with {@link categoryForListing}. Three shapes:
 *
 *  - direct categories (inverse of VERTICAL_TO_CATEGORY) → vertical
 *    variants;
 *  - fund-derived categories (alternatives, private-credit,
 *    infrastructure) → the fund vertical's variants + the sub_category
 *    values that map to the category;
 *  - listed-securities → `listing_kind` alone (it spans verticals).
 *
 * Returns null for unknown categories — callers keep their unscoped
 * behaviour.
 */
export interface CategoryScope {
  /** Non-empty → `.in("vertical", verticals)`. */
  verticals: string[];
  /** Present → `.in("sub_category", subCategories)`. */
  subCategories?: string[];
  /** Present → `.eq("listing_kind", listingKind)`. */
  listingKind?: string;
}

export function categoryScope(category: string): CategoryScope | null {
  if (category === "listed-securities") {
    return { verticals: [], listingKind: "listed_security" };
  }
  const direct = Object.entries(VERTICAL_TO_CATEGORY)
    .filter(([, cat]) => cat === category)
    .map(([vertical]) => vertical);
  if (direct.length > 0) {
    return { verticals: direct.flatMap((v) => rawVerticalVariants(v)) };
  }
  const subs = Object.entries(FUND_SUB_TO_CATEGORY)
    .filter(([, cat]) => cat === category)
    .map(([sub]) => sub);
  if (subs.length > 0) {
    return { verticals: rawVerticalVariants("fund"), subCategories: subs };
  }
  return null;
}
