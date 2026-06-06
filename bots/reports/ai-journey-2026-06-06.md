# AI Journey — Desktop UX/UI deep-dive — 2026-06-06

**Target:** https://lambent-sawine-17c3dd.netlify.app (live Netlify deploy)
**Scope (as requested):** desktop only; crawl the pages, **exercise the filters**,
deep-dive on the homepage/landing page and the directory filter options. Focus on
UX/UI — layout, visual hierarchy, navigation clarity, interaction feedback,
confusing flows, dead-ends, broken links, fee/risk disclosures.
**Side-effect firewall:** on (payments, affiliate `/go/`, leads, writes all mocked — 0 real postbacks).

## What ran

1. **Link crawl** (`bots/journey/ai-journey.cjs`, desktop 1366×900) — 18 pages,
   goal-directed best-first from `/`. Pages: `/`, `/compare`, `/get-matched`,
   `/find-advisor`, `/switching-calculator`, `/share-trading`, `/robo-advisors`,
   `/best/*`, `/property-platforms`, `/global-investing/shares/us`, `/briefs/new`,
   `/advisors/mortgage-brokers`, `/advisor-guides/*`.
2. **Interactive filter dive** (new `bots/journey/filter-dive.cjs` + ad-hoc driver,
   desktop 1440×900) — drove the real `/compare` controls: category pills, the
   Features / Max fee / Rating dropdowns, search, and the clear/reset chips.
   Captured a screenshot + result-count after each interaction.

## Healthy / confirmed working

- **Filters work and give clear feedback.** Category pills filter the result set
  and reflect state in the URL + a live "X platforms found" count + a "FILTERING:"
  chip with a "Clear all":
  - All `83` → Share trading `20` (`?filter=share-trading`) → ETFs `31`
    (`?filter=etfs`) → Crypto exchanges `12` → SMSF brokers `9` → Super funds `15`
    → Savings `12`. Clear returns to `83`.
  - Search: `vanguard` → `83` → `11`, chip "× Remove 'vanguard' filter", URL
    `?q=vanguard`; clear restores cleanly.
  - Max fee dropdown opens with sane buckets (Any / $0 / ≤$5 / ≤$10 / ≤$20);
    Features and Rating dropdowns open too.
- **No real dead-ends, no broken internal links** across 18 pages.
- **No real console errors / internal failures** (see "Rejected" below).
- **Fee + risk disclosures present on every page crawled** (18/18). The compare
  table is transparent about commercials — a "Commercial: affiliate partner"
  column, "How we earn" link, and per-row fee-freshness timestamps.
- **`/find-advisor`** is a clean 4-step wizard — progress bar ("Step 1 of 4 · 25%"),
  trust badges ("ASIC-verified professionals · 100% free to use · No spam — ever").
- **Homepage** has clear hierarchy: hero → "Whichever way you want to invest" cards
  → "What are you trying to do?" task grid → "Get matched in 60 seconds" → compare
  preview. Good top-of-funnel routing.

## Confirmed bug — FIXED in this PR

- **`/find-advisor`: a literal `…` rendered instead of an ellipsis.**
  The "Find by life event instead" link read:
  `…selling a business…) →`. Root cause: `app/find-advisor/page.tsx:931` put a
  JS string escape (`…`) in **JSX text**, where it is not interpreted, so the
  six characters `…` rendered verbatim. Verified in the live DOM, then fixed by
  replacing it with the actual `…` character (the repo convention — 372 uses of `…`
  vs 4 of `&hellip;`).

## Observations (UX, not bugs — for your call, not auto-fixed)

- **Two overlapping category taxonomies on `/compare`.** A top sub-nav
  (All Platforms / Share Trading / ETFs / Crypto / Super Funds / Savings /
  CFD & Forex / Insurance / Non-Residents) sits above a pill row
  (All platforms / Share trading / ETFs / US-international / SMSF brokers /
  Crypto exchanges / Super funds / Savings accounts / Term deposits / Research…).
  They overlap but aren't identical. The pills are the in-page filter (update
  `?filter=`); the top nav appears to route to dedicated pages. Functional, but a
  first-time user may not immediately grok that there are two different mechanisms.
- **Compare table overflows horizontally on a 1440px desktop.** Right-hand columns
  (Freshness source URLs, "Why this result?") get clipped at the viewport edge and
  need horizontal scroll. Worth checking the column widths / sticky-first-column
  treatment on common laptop widths.
- **Category pill row is a horizontal scroller** — leftmost/rightmost pills clip at
  the edges. Fine, but a scroll affordance (fade/chevron) would make it more discoverable.

## Rejected (transient sandbox proxy noise — not real)

- `403 /get-matched` and `403 /best/beginners` during the crawl, plus a
  `TypeError: Failed to fetch` on `/best/beginners`. Re-probed each route 5× with
  retries → consistent **200** every time. These are the known TLS-MITM proxy
  hiccups, not site bugs.

## Compliance gate

The one fix is pure content/UI (an ellipsis). It does not touch advice,
payments, securities, credit, or bank-data — no REGULATORY-AVOID-LIST escalator.

## Artifacts

- Crawl JSON: `/tmp/journey/ux-desktop.json`
- Filter-dive JSON + screenshots: `/tmp/journey/filters/`, `/tmp/journey/ui2/`
- New reusable harness: `bots/journey/filter-dive.cjs`
