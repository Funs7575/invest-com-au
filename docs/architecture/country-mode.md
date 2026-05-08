# Country Mode — Architecture

How invest.com.au tailors examples and CTAs around an inbound investor's
country without changing the global navigation. Phase 1 ships the
infrastructure + Hong Kong as the model country; Phase 2+ widens the
populated set.

## Five-level priority chain

When deciding which country (if any) the user is in, we resolve in this
order:

1. **URL param** — `?country=<slug>` on /quiz, country page CTAs
2. **User-selected country** — `iv_intent_country` cookie, written by
   the flag selector / soft prompt accept
3. **Stored cookie / preference** — same cookie (collapses with #2)
4. **GeoIP detection** — `/api/geo` returns `x-vercel-ip-country`
5. **AU / Global fallback** — no signal, render the global homepage

Implementation: `lib/country-mode/resolve-country.ts:resolveCountryFromContext()`.
Pure function — callers pass raw values from `cookies()` / `headers()` /
`searchParams`, get back `{ code, source }`.

GeoIP suggests, never forces. The soft-prompt UX (`GeoSoftPrompt`)
fires only when (cookie empty) ∧ (localStorage override empty) ∧
(`iv-country-prompt-dismissed` flag unset) ∧ (geo returns supported
ISO). Dismissal is sticky — never re-shows in the same browser.

## "Augment, never replace"

The homepage stays broad and global by default. When a country is
resolved, slim "Tailored for <X> investors" strips render **above** the
existing teasers — they don't replace them.

| Section | Country Mode behaviour |
|---|---|
| Hero, route cards | unchanged |
| Tools strip | re-ranks tools (matching `homepageFeaturedTools` hoisted to front) — never shrinks |
| Pathfinder | "Get matched" CTA gains `?country=<slug>` |
| Compare deep dive | preview strip prepended (`CountryComparePreview`) |
| Listings teaser | preview strip prepended (`CountryListingsPreview`) |
| Advisors teaser | preview strip prepended (`CountryExpertsPreview`) |
| Cross-border | matching arrival card hoisted to position 1 (only for UK/IN/CN/US — the four arrival audiences) |

Each preview wrapper is a Server Component reading the cookie in its
own subtree. Next.js opts only that subtree into dynamic rendering;
the parent `app/page.tsx` keeps `revalidate = 3600` for visitors with
no country preference.

## Don't fake supply

A country-tailored strip only renders when it has at least N real rows.
Below the threshold, the strip silently hides and the global teaser
below carries the experience.

| Surface | Threshold | Rationale |
|---|---|---|
| Listings | 2 | Fewer reads as "we have one thing for you" — over-promises |
| Experts | 2 | Same — one expert looks like a token mention |
| Platforms | 3 | A "compare" surface needs ≥3 to actually compare |

Implementation: `lib/country-mode/supply-thresholds.ts:applySupplyThresholds()`.
Show all or none — never a partial slice (a near-miss country must not
look ambiguously curated).

## Adding a new country

1. **Verify the country has an `IntentCountryCode` entry** in
   `lib/intent-context.ts`. Slug, name, label, flag, currency, hasDta,
   quizKey, iso are all required. The 12 supported corridors are
   already in.
2. **Confirm the standalone country page exists** at
   `app/foreign-investment/<slug>/page.tsx`. All 12 already do.
3. **Populate the country's `CountryConfig`** in
   `lib/foreign-investment-country-data.ts`. The full hub config (DTA
   table, FIRB tiles, FAQ, etc.) is what powers the
   `/foreign-investment/<slug>` page.
4. **Add Country Mode homepage hooks** (optional fields on
   `CountryConfig`):
   - `homepageListingFilters: { verticals: string[]; firb?: boolean }`
   - `homepageExpertFilters: { specialties: string[]; languages?: string[] }`
   - `homepagePlatformFilters: { types: PlatformType[]; nonResidentsOnly?: boolean }`
   - `homepageFeaturedTools: { slug: string; label: string }[]` — slug
     here is the tool's `href` (e.g. `/cgt-calculator`)
   - `defaultActions[]` (already used by the flag-button popover —
     reused as the homepage popular-links strip)
   - `preferredLanguages: string[]` (ISO 639-1 hints; informs Phase 5
     language routing)
5. **The supply-threshold gate handles the rest**: if the filtered
   query returns enough rows, the strip renders; if not, it hides.

Phase 1 model country: **Hong Kong**. The other 11 fall back to global
until Phase 2 fills them in.

## Dual renderer for `/foreign-investment/<country>`

Two paths exist today:

- **`app/foreign-investment/<slug>/page.tsx`** (standalone, config-driven).
  Each of the 12 countries has its own thin route file rendering
  `<CountryHubTemplate config={…_CONFIG} />`. This is the canonical
  surface.
- **`app/foreign-investment/[country]/page.tsx`** (dynamic, DB-backed).
  Older path that queries `country_investment_profiles` etc. Now
  shadowed by the standalones for the 12 country-mode codes; reachable
  only for slugs not in that set.

Phase 4 will unify these — RFC required because backfill from config →
DB or vice versa is non-trivial. Phase 1 leaves both in place.

## Tracking

Country Mode fires four events via `lib/tracking.ts:trackEvent` (free-
form) and extends one typed event:

- `country_mode_detected` — geo prompt rendered (GeoSoftPrompt mount)
- `country_mode_selected` — user accepted, from any of: flag-popover
  grid click, in-popover suggested-state accept, soft-prompt accept.
  `source` property distinguishes (`popover_grid` / `popover_suggestion` /
  `geo_prompt`)
- `country_mode_dismissed` — user declined, from soft prompt or
  in-popover suggested state
- `quiz_completed` (existing event) — extended with `country` dimension
  carrying the quiz key (e.g. `"hong_kong"`)

Two of the originally-deferred click-event hooks now fire from the
homepage preview strips via `components/country-mode/TrackedCountryLink`:

- `country_listing_click` — fired by `CountryListingsPreview` items.
  `event_data: { country, listing_slug, vertical, placement }`.
- `country_expert_click` — fired by `CountryExpertsPreview` items.
  `event_data: { country, expert_slug, expert_type, placement }`.

`country_tool_click` is still deferred — wiring it requires touching
`HomeToolsStrip` so that featured tools (those hoisted by
`CountryToolsStripWrapper`) fire a country-attributed event distinct
from a default-order tool click. Easy to reconstruct in the meantime
from `pathname` + cookie dimension on `$pageview`.

## Phase 5 language hooks (scaffolding only)

`CountryConfig` has five optional fields nothing reads in Phase 1:

- `hasRtlLanguage: boolean` — true for SA/AE
- `defaultLanguage: string` — ISO 639-1
- `supportedLanguages: string[]`
- `languageRoutes: Record<string, string>` — language code → localised
  hub URL (e.g. `{ "zh-Hans": "/zh/foreign-investment/china" }`)
- `rtlReady: boolean`

Defining the shape now means Phase 5 plugs into a stable interface
without restructuring 12 country configs. Country Mode comes first;
Language Mode comes second.

## Where the cookie lives

| Layer | Key | Read | Write |
|---|---|---|---|
| HTTP cookie | `iv_intent_country` | `getIntentCountry()` (server, `cookies()`) | `setIntentCountryAction()` server action |
| localStorage | `iv-location-flag-override` | `LocationFlagButton` mount effect | grid click + soft-prompt accept |
| localStorage | `iv-country-prompt-dismissed` | GeoSoftPrompt + LocationFlagButton mount effects | "Stay on global" buttons |

The cookie is **non-httpOnly** (`lib/intent-context-actions.ts:25`) so
client analytics can include the country dimension without an
additional request. `LocationFlagButton`'s mount-time migration syncs
existing localStorage-only users to the cookie on first visit after
this lands.

## Type-system invariants

- `noUncheckedIndexedAccess` is on. `KNOWN[code]` works only because
  `code: IntentCountryCode` is a union of literal keys. Free-form
  string lookups (`CODE_BY_SLUG[slug]`) return `T | undefined` and must
  be guarded with `?? null`.
- `isKnownIntentCountry` uses `Object.prototype.hasOwnProperty.call`
  (not `in`) so prototype-chain keys (`__proto__`, `toString`,
  `constructor`) can't slip past the type guard.
