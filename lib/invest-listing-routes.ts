/**
 * Single source of truth for "which /invest category has a canonical
 * `/invest/<slug>/listings` page, and how do I link to it".
 *
 * Background (the UX-unification, 2026-06): the marketplace historically
 * exposed each sector two ways — the path page `/invest/<slug>/listings`
 * (indexable, self-canonical, server-rendered with only that sector) AND
 * the query-param filter state `/invest?category=<slug>` (canonicalised
 * away to `/invest`). Two live URLs for the same listings read as
 * duplication and confused users. We now treat the path page as the ONE
 * canonical sector destination and route every "browse a sector" intent
 * there; `/invest?category=<slug>` 307-redirects to it (see `proxy.ts`).
 *
 * This module is intentionally tiny and dependency-free so it is safe to
 * import into the Edge middleware (`proxy.ts`) without dragging the
 * ~2k-line `lib/invest-categories.ts` into the edge bundle. The slug sets
 * below are kept in lock-step with the opportunity categories by
 * `__tests__/lib/invest-listing-routes.test.ts`, which fails if a new
 * opportunity category is added without being classified here.
 */

/**
 * Opportunity slugs with a hand-built static page at
 * `app/invest/<slug>/listings/page.tsx`. These take routing precedence
 * over the generic `[slug]/listings` route.
 */
export const STATIC_LISTING_SLUGS = [
  "buy-business",
  "franchise",
  "mining",
  "farmland",
  "commercial-property",
  "renewable-energy",
  "startups",
  "alternatives",
  "private-credit",
  "infrastructure",
  "funds",
  "pre-ipo",
  "private-equity",
  "royalties",
  "listed-securities",
  // MM-V01b discovery vertical (PR #803) — its hand-built page was never
  // registered here, so categoryListingsHref fell back to the
  // /invest?category= filter, which couldn't select it either (no
  // invest-categories entry until 2026-06-10). The other six MM-V01b
  // verticals stay guide-intent and unregistered until they have listings
  // supply — LISTING_PAGE_SLUGS must stay exactly the opportunity set
  // (enforced by __tests__/lib/invest-listing-routes.test.ts), so flip
  // intent and register here in the same change.
  "digital-infrastructure",
] as const;

/**
 * Opportunity slugs served by the generic `app/invest/[slug]/listings`
 * route (no bespoke static page). Keep in sync with that route's
 * `generateStaticParams`.
 */
export const GENERIC_LISTING_SLUGS = [
  "income-assets",
  "bullion",
  "water-rights",
  "carbon-credits",
  "sda-housing",
] as const;

/** Every opportunity slug that resolves to a real `/listings` page. */
export const LISTING_PAGE_SLUGS: ReadonlySet<string> = new Set<string>([
  ...STATIC_LISTING_SLUGS,
  ...GENERIC_LISTING_SLUGS,
]);

/** Whether `slug` has a canonical `/invest/<slug>/listings` page. */
export function hasListingsPage(slug: string): boolean {
  return LISTING_PAGE_SLUGS.has(slug);
}

/**
 * Canonical href for browsing a sector's listings.
 *
 * - Slugs with a real page → `/invest/<slug>/listings` (the canonical
 *   destination), with any extra filter params appended.
 * - Unknown slugs → graceful fallback to the marketplace filter state
 *   `/invest?category=<slug>` so a caller can never produce a 404.
 *
 * `params` carries through active filters (state, price, q, kind, …) so a
 * user who picks a sector after setting other filters keeps them.
 */
export function categoryListingsHref(
  slug: string,
  params?: Record<string, string> | URLSearchParams,
): string {
  const search = new URLSearchParams();
  if (params) {
    const entries =
      params instanceof URLSearchParams ? params.entries() : Object.entries(params);
    for (const [k, v] of entries) {
      // Never carry the category dimension itself into a path page (it's
      // already encoded in the path) or into the fallback (added below).
      if (k === "category" || k === "sub" || !v) continue;
      search.set(k, v);
    }
  }
  const qs = search.toString();

  if (hasListingsPage(slug)) {
    return `/invest/${slug}/listings${qs ? `?${qs}` : ""}`;
  }
  // Fallback: marketplace filter state.
  search.set("category", slug);
  return `/invest?${search.toString()}`;
}
