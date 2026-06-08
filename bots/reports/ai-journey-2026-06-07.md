# AI Journey — IA / navigation findings (2026-06-07)

Follow-up to the sector-listings unification (PR #1457). Goal: deploy the bots to
find **more issues like the listings duplication** — IA/navigation confusion,
duplicate/competing URLs, broken links, dead-ends. Target: the live Netlify
mirror `https://lambent-sawine-17c3dd.netlify.app`. Driven in-session (Claude as
judgment brain) via `bots/journey/ai-journey.cjs` + curl verification with retries.

## CONFIRMED — high priority

### 1. Listing **detail** pages 500 in production for several whole categories
The goal-directed crawler clicked listing cards on `/invest` and hit a cluster of
**HTTP 500s** on listing detail URLs. Verified consistent (5/5 retries), not transient:

```
/invest/funds/listings/bronte-capital-amalthea   → 500 500 500 500 500
/invest/funds/listings/antipodes-global-fund     → 500 500 500 500 500
/invest/funds/listings/boss-energy-boe           → 500 (listed security)
```

Controls (`/invest`, `/compare`, `/invest/mining/listings`, all key routes) → solid 200.

**Root cause.** `listingUrl(l)` → `/invest/<categoryForListing(l)>/listings/<slug>`.
Single-listing **detail** routes are bespoke per-category pages
(`app/invest/<cat>/listings/[slug]/page.tsx`) that gracefully handle
subcategory → single-listing → friendly empty-state. They exist for **11**
categories:

> mining, alternatives, buy-business, commercial-property, farmland, franchise,
> infrastructure, pre-ipo, private-credit, renewable-energy, startups

…but are **missing** for the rest — notably **funds, private-equity, royalties,
venture-capital** (plus bullion, water-rights, carbon-credits, sda-housing,
income-assets, public-social-infrastructure, aquaculture, livestock,
digital-infrastructure, insurance-linked-securities, litigation-funding).

For those, the URL falls through to the generic **subcategory-only** route
`app/invest/[slug]/listings/[subcategory]/page.tsx`, whose `if (!sub) notFound()`
**throws a 500 in production** (it returns 200/soft-404 under `next dev` — a
production-only failure, consistent with a `generateStaticParams` / prerender issue
in that route).

**Impact.** `funds` is the largest marketplace bucket (~55 listings on the grid)
and every ASX **listed-security** also buckets to `funds` → a large share of
marketplace listings are **unviewable** (click card → 500). Private-equity,
royalties, venture-capital likewise.

**Contributing latent bug.** That generic route's `generateStaticParams()` returns
`{ category, subcategory }` but the route segments are `[slug]/[subcategory]` — the
`slug` key is never provided (wrong key). A prime suspect for the prod-only 500.

**Possible severity regression from PR #1457.** The new `app/invest/[slug]/listings/page.tsx`
sets `dynamicParams = false`; on the shared `[slug]` segment this *may* have turned a
pre-existing soft-404 into a 500 in prod. Either way the detail links are broken;
the fix should also drop that `dynamicParams=false` (it's a no-op for enforcement —
verified: unknown slugs still soft-404).

**Fix options** (see chat question):
- **A (recommended).** Make the generic `[subcategory]` route *unified* like the 11
  bespoke pages: subcategory → else single-listing → else friendly empty-state (no
  `notFound()` crash). One shared route, fixes every category at once. Needs a shared
  `ListingDetail` extraction (the detail JSX is currently inlined per page).
- **B.** Add bespoke `[slug]` detail pages for the ~8 missing categories (mirrors the
  existing pattern; more files, more duplication).
- **C (minimal).** Stop the crash only: `notFound()` → graceful empty-state. Removes
  the 500 but listings still aren't viewable for those categories.
- Plus: drop `dynamicParams=false` from the PR #1457 route and fix the wrong
  `generateStaticParams` key, regardless of A/B/C.

## HEALTHY / rejected

- All key routes 200: `/`, `/compare`, `/advisors`, `/find-advisor`, `/calculators`,
  `/glossary`, `/foreign-investment`, `/share-trading`, `/get-matched`, `/how-we-earn`,
  `/about`, `/tools`, `/invest/list`, `/advertise`.
- The **PR #1457 unification is working live**: every `?category=<slug>` 307-redirects
  to the canonical `/invest/<slug>/listings`; the "Browse by sector" grid links to all
  19 `/listings` pages; 0 `?category=` links remain; the previously-404 sectors
  (bullion etc.) render.
- Categories **with** a detail route (mining, etc.) → listing details render fine.
- Transient sandbox `403`/`ERR_ABORTED` blips during the browser crawl were re-probed
  with retries and discarded (not real).

## Method note
The browser crawl in this sandbox is flaky (TLS-MITM proxy throws transient
403/503/ERR_ABORTED); every candidate was re-verified with a 3–5× curl retry loop and
only kept if the status was consistent. `next start`/`next dev` local repro is also
flaky here (zombie servers hold the port) — prod behavior was confirmed against the
live mirror.
