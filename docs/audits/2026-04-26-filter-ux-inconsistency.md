# Filter UX inconsistency audit — 2026-04-26

Status: **P1 fix landed for `/invest/listings`.** Other affected pages are documented as follow-ups below.

## What broke

`/invest/listings?category=farmland` rendered two filter UIs reading from two different sources:

- **"Active Listings by Vertical" badge bar** — live aggregation of `investment_listings.vertical` (DB column). Showed 11 verticals with counts including Uranium (12), Oil Gas (12), Hydrogen (10).
- **Pill row** — hard-coded `getAllInvestCategories()` from `lib/invest-categories.ts`. Showed 12 categories including "Alternatives / Private Credit / Infrastructure" (which had zero listings in the badge bar).

Result:
- ~34 listings (uranium + oil_gas + hydrogen) appeared in the badge bar but could not be reached via the pill row.
- Three pill-row categories (alternatives / private-credit / infrastructure) had no live counts in the badge bar.
- Users clicking the badge bar were sent to `/invest/{slug}/listings` deep-links that 404 for the three commodity verticals.

## Root cause

A taxonomy fork: `lib/listing-url.ts::VERTICAL_TO_CATEGORY` had no mapping for `uranium / oil_gas / hydrogen`, so listings carrying those `vertical` values fell through to the default and never matched any pill-row category. `invest-categories.ts` likewise had no top-level entries for them — uranium existed only as a sub-category of mining.

## What was fixed in this PR

- **Single source of truth**: `lib/invest-categories.ts` is now the canonical category list for filter UIs. Three new top-level entries added: `uranium`, `oil-gas`, `hydrogen`, each with full SEO metadata, sub-categories, sections, and FAQs.
- **Type alignment**: `InvestListingVertical` (in `lib/types.ts`) gained `'uranium' | 'oil_gas' | 'hydrogen'` so DB values match the type.
- **Mapping completed**: `VERTICAL_TO_CATEGORY` in `lib/listing-url.ts` maps the three new verticals to their canonical slugs.
- **Unified filter UI**: the `/invest/listings` page now renders one filter — the tab bar inside `InvestListingsClient`. The redundant "Active Listings by Vertical" badge bar was removed. The tab bar now shows live counts inline, applies each category's colour theme, and dims categories with zero listings (so the taxonomy stays stable across loads).
- **Header context**: the sub-category strip now reads "Narrow Farmland by type" (etc.) instead of the bare "Narrow by type".
- **Card visual hierarchy**: FIRB and SIV badges moved from competing top-right overlays on the image to neutral inline text-pills in the card body. Featured (gold) is now the only attention-grabbing badge on the image hero.
- **Taxonomy regression guard**: new `__tests__/lib/taxonomy-consistency.test.ts` fails loudly if a future refactor adds a `VERTICAL_TO_CATEGORY` mapping without a matching `invest-categories.ts` entry, or drops uranium/oil-gas/hydrogen.

## Follow-ups (not in this PR)

The same anti-pattern (filter UI rendering from a hard-coded list separate from data) exists on these pages, but the user impact is lower because each page's filter is internally consistent — there's no taxonomy fork between two competing UIs on the same page. Recommend separate atomic PRs:

| Page | Source | Notes |
|---|---|---|
| `/advisors`, `/advisors/[type]` | `PROFESSIONAL_TYPE_LABELS` in `lib/types.ts` (24 hard-coded types) | `app/advisors/AdvisorsClient.tsx:24-33` |
| `/articles`, `/articles/[category]` | `CATEGORY_COLORS` + `CATEGORY_LABELS` hard-coded in `app/articles/page.tsx:31-61` | 13 hard-coded entries |
| `/glossary` | DB query for categories, but `CATEGORY_ICONS` map hard-coded | `app/glossary/page.tsx:56-68` |
| `/property/listings` | Hard-coded `PROPERTY_TYPES` (3 entries) | `app/property/listings/page.tsx:46-50` |
| Header / Footer / SearchOverlay / Navigation | Each maintains its own Uranium / Oil Gas / Hydrogen link list | Not a filter bug — but represents the same taxonomy duplication. Consider migrating to `LISTING_VERTICALS` from `lib/listing-verticals.ts`. |

`/invest/page.tsx`, `/invest/[slug]/listings`, `/invest/buy-business/listings` (etc.) all read from the same `getAllInvestCategories()` source as `/invest/listings`, so they benefit from the same fix without separate edits.

## CLAUDE.md note

`CLAUDE.md` line 51 claims `lib/verticals.ts` is the single source of truth for "vertical config (pillar pages, categories)." That's only true for **pillar pages** (broker / financial-product hubs: share-trading, crypto, super, etc.), not for **investment marketplace categories**. Three modules co-exist and shouldn't be conflated:

- `lib/verticals.ts` — 9 broker/pillar verticals
- `lib/listing-verticals.ts` — 14 listing/marketplace verticals (slugs + nav metadata)
- `lib/invest-categories.ts` — 14 listing categories (filter UI source + landing-page SEO content)

Worth a follow-up CLAUDE.md edit to make the distinction explicit.

## SEO impact

- No URL changes. All existing `/invest/{category}/listings` and `/invest/{category}` paths continue to work.
- New canonical pages: `/invest/uranium`, `/invest/oil-gas`, `/invest/hydrogen` already existed as hub pages and remain unchanged.
- New JSON-LD: each new category in `invest-categories.ts` ships with title, h1, metaDescription, intro, sections, faqs — picked up by existing landing-page templates.
- `revalidate = 3600` preserved on `/invest/listings`.
