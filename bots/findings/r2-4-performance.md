# R2 Audit — Performance

## Scope

Front-end performance and rendering hygiene audit of `/home/user/invest-com-au` (Next.js 16 App Router, Tailwind, TypeScript strict). Performed 2026-06-04. Read-only; no changes made.

Checked:
- `"use client"` spread (count, worst offenders)
- `next/dynamic` lazy-loading gaps
- Raw `<img>` tags bypassing `next/image`
- `export const revalidate` hygiene on content pages
- Font loading strategy
- Heavy library imports in client bundles
- Long lists without virtualization
- `useEffect` data-fetching that should be server-side

---

## Findings

| # | Severity | file:line | Issue | Recommendation |
|---|----------|-----------|-------|----------------|
| 1 | **High** | `app/advisor/[slug]/AdvisorProfileClient.tsx:1` | 1,443-line monolithic client component. The entire advisor profile page — static metadata blocks, compliance text, fee tables, FAQ accordions — is in a single `"use client"` boundary. Only a small fraction (booking widget, shortlist toggle, review form, UTM tracking) genuinely needs the client. | Extract static sections (bio, credentials, fee table, FAQ, compliance copy) into server sub-components. Wrap only interactive widgets — `BookingWidget`, `AdvisorReviewForm`, shortlist button — with `dynamic()` or their own thin client wrappers. |
| 2 | **High** | `app/broker/[slug]/BrokerReviewClient.tsx:1` | 1,219-line monolithic client component. Static review content, fee table, compliance disclosures, `OnThisPage` ToC, and `AppScreenshotGallery` all sit behind one client boundary. Interactive hooks (`useSearchParams`, `useEffect` for duration tracking) could be extracted to a tiny wrapper, letting the rest server-render. | Same pattern as #1: identify the 3–4 hooks that truly need the client (`useSearchParams`, `trackPageDuration` effect, `CountUp`), extract them into small client wrappers or use `dynamic()`, and make the page body a server component. |
| 3 | **High** | `app/savings-calculator/page.tsx:5`, `app/switching-calculator/page.tsx:5`, `app/portfolio-calculator/page.tsx:3` | Three heavy calculator clients (`SavingsCalculatorClient` 337 lines, `SwitchingCalculatorClient` 373 lines, `PortfolioCalculatorClient` 396 lines) are statically imported in their page.tsx files. They are also used as inline embeds inside the `/calculators` pillar page via `InlinePortfolioCalc`/`InlineSavingsCalc`/`InlineSwitchingCalc`, which correctly use `dynamic()` — but the standalone pages skip that step and eagerly pull the full client bundle on first load. | Wrap the direct imports in `dynamic()` with a skeleton loading state (identical approach to the inline variants already in place). This defers JS parse/eval until after the page's critical-path HTML and ISR cache are returned. |
| 4 | **High** | Multiple `app/admin/*` pages: e.g. `app/admin/competitors/page.tsx:43`, `app/admin/funnel/page.tsx:38`, `app/admin/seo-health/page.tsx:26`, `app/admin/advisors/page.tsx:76`, `app/admin/finance/page.tsx:76` | Admin pages are full `"use client"` pages fetching data via `useEffect(() => { fetchData(); }, [])` — the classic CSR data-loading antipattern. Each triggers a waterfall: page shell renders → JS hydrates → fetch fires → spinner → data renders. Admin users bear full LCP cost on every navigation. | Convert each admin page to an async server component that fetches directly from Supabase. Move interactive parts (tabs, modals, editable rows) into small client sub-components. The pattern is already used for public content pages; apply it to the admin route group. |
| 5 | **Medium** | `app/property/listings/ListingsClient.tsx:187` | The property listings directory fetches all listings client-side via `useEffect(() => { fetchListings(); }, [fetchListings])` in a 646-line client component, with client-side filtering/sorting in JS. Initial render shows a spinner instead of server-rendered HTML. | Move the initial listings fetch (default view, no filters) to the server. Pass pre-fetched data as props; use a client sub-component only for filter changes / pagination — applying the pattern used on `/compare`, `/advisors`, and `/broker/[slug]`. |
| 6 | **Medium** | `app/admin/_components/AdminActivityFeed.tsx:1`, `AdminDataQuality.tsx:1`, `AdminPendingActions.tsx:1`, `AdminTopPagesAdvisor.tsx:1`, `app/admin/analytics/_components/AnalyticsSkeletons.tsx:1`, `InsightsTab.tsx:1` | Six admin dashboard sub-components are marked `"use client"` but contain no hooks, no event handlers, and no browser APIs — they are pure render components receiving props. The directive is unnecessary and forces these into the client bundle. | Remove `"use client"` from each. They will become server components (or RSC-compatible shared components) without any behavioural change. Each is already receiving all data as props from the parent. |
| 7 | **Medium** | `components/VerifiedClientBadge.tsx:1` | Pure presentational badge component (`"use client"` declared, no hooks, no browser APIs). Renders a static styled `<span>` with a tooltip title. It is also imported by `UserReviewsList.tsx` (itself a server component), which will silently get promoted to a client boundary. | Remove `"use client"`. The component is purely static HTML/CSS. Its parent `UserReviewsList` can remain a server component. |
| 8 | **Medium** | `components/get-matched/CalcToPlanBridge.tsx:1` | Pure static `Link`-based CTA card — `"use client"` declared, but the only runtime code is constructing a `URLSearchParams` string that could equally run on the server. No hooks, no browser APIs. Used beneath every calculator (21 import sites). | Remove `"use client"`. Derive the href string with a server-side utility, or accept the computed `href` as a prop. This frees 21 render trees from a spurious client boundary. |
| 9 | **Medium** | `app/advisor-portal/billing/CreditBalanceCard.tsx:1`, `PinnedBillingWidget.tsx:1` | Two billing display widgets are `"use client"` but contain only prop-driven rendering — no hooks, no browser APIs. The billing data is passed in from the parent page. | Remove `"use client"`. Both components are pure display; the parent `page.tsx` (already a server component) can pass computed props. |
| 10 | **Medium** | `components/DealExpiryCountdown.tsx:18` | `"use client"` used because the component calls `Date.now()` to compute days remaining. However, this calculation is stable enough (day-level granularity) that it can be done at render time on the server for ISR pages. The countdown does not tick live. | Move the `Date.now()` math to the server: accept a pre-computed `daysLeft: number` prop (or compute it server-side in the parent). Drop `"use client"`. The component is used in `BrokerCard` (already client) and `HomeRateOfTheDay` (server context) — the server computation avoids pulling a client boundary into the latter. |
| 11 | **Low** | `app/community/page.tsx` (no `revalidate`) | The Community Forum page fetches category thread counts from Supabase but exports no `revalidate`. Without it, the page defaults to the route-level `dynamic = 'auto'` behaviour — Vercel treats it as fully dynamic (per-request SSR) with no ISR. Community data changes slowly (minutes, not seconds). | Add `export const revalidate = 300;` (5 min). Consistent with `/advisor-jobs/page.tsx` which uses the same cadence for similarly-paced content. |
| 12 | **Low** | `lib/csv-export.ts:1` | Utility file for CSV generation has `"use client"` at the top. It uses `URL.createObjectURL`, `document.createElement`, and `Blob` — valid client-only reasons — but the `"use client"` directive on a non-component `.ts` file is unusual; it only affects module graph when imported in an RSC tree. | No change needed to the directive, but add a JSDoc comment explaining _why_ it is client-only (the `document`/`Blob`/`URL` browser APIs) so future readers don't try to remove it. Low priority. |
| 13 | **Low** | `components/ui/Input.tsx:1`, `components/ui/Select.tsx:1` | Primitive form control wrappers are `"use client"` despite containing no hooks, no `onChange`, no `onClick` of their own — they spread `InputHTMLAttributes`/`SelectHTMLAttributes` onto native elements. Event handlers are passed as props by parents. | Remove `"use client"`. Native HTML input/select elements with spread `...props` are completely valid in RSC. The `"use client"` propagates unnecessarily into every form that uses these primitives. |
| 14 | **Low** | `components/directory/ResultCount.tsx:1` | Result-count display component (`"use client"`, 80 lines) has no hooks or browser APIs. Its only non-JSX logic is a conditional prop branch and `aria-live="polite"`. Imported in multiple directory pages. | Remove `"use client"`. Pure render. The `aria-live` attribute is standard HTML and does not require client-side React. |
| 15 | **Low** | JetBrains Mono loaded on every page (`app/layout.tsx:42`) | `JetBrains_Mono` from `next/font/google` is loaded with `subsets: ["latin"]` and both weight 400/700 in the root layout, impacting all pages. A grep across the codebase shows it is used almost exclusively in code blocks / the admin `pre` tag. | Scope JetBrains Mono to only the pages/layouts that actually render code blocks (article pages, admin, calculator results). Remove from the root layout and load it lazily via a sub-layout or `dynamic` where needed. Saves two font requests + ~25 kB on non-code pages. |

---

## Quick wins

1. **Remove `"use client"` from 5 pure-display admin components** (`AdminActivityFeed`, `AdminDataQuality`, `AdminPendingActions`, `AdminTopPagesAdvisor`, `AnalyticsSkeletons`, `InsightsTab`) — zero logic change, immediate bundle reduction.

2. **Remove `"use client"` from `Input.tsx`, `Select.tsx`, `ResultCount.tsx`, `VerifiedClientBadge.tsx`, `CalcToPlanBridge.tsx`** — all are pure render components. Each currently forces a client boundary on every import tree.

3. **Add `export const revalidate = 300;` to `app/community/page.tsx`** — one-line fix prevents per-request SSR on a slow-changing page.

4. **Wrap standalone calculator pages in `dynamic()`** — the inline variants already do this correctly; the standalone `page.tsx` files should match.

5. **Scope JetBrains Mono out of the root layout** — removes two font file requests from every non-code page.

---

## Notable (with counts)

- **`"use client"` total**: **789 files** (806 raw minus test files). Of those, at least **~60–70 admin/analytics components** and **~30+ pure display components** have no interactive hooks and could be server components.
- **`next/dynamic` call sites**: **10 files**, all appropriate — LayoutShell, LayoutSideEffects, Navigation, org-portal tabs, inline calculator wrappers, academy/courses pages. The pattern is well-established but inconsistently applied (standalone calculator pages missed it).
- **Raw `<img>` tags**: **0 found** in TSX source (widget API routes in `app/api/widget/` serve HTML strings not JSX — those are separate). `next/image` adoption is complete for component code.
- **Heavy chart libraries (recharts, d3, Chart.js, etc.)**: **None imported** — the codebase exclusively uses hand-rolled SVG chart components (`SVGBarChart`, `SVGLineChart`, `SVGDonutChart`, `SVGFunnel`, `SVGRadarChart`) with no external chart dependencies. This is a significant positive.
- **`useEffect` data-fetching (CSR antipattern)**: **17 instances** across admin pages, plus `app/property/listings/ListingsClient.tsx`. All admin. The public-facing listing page is the only non-admin offender.
- **Fonts**: Correct — `next/font/local` for Inter (self-hosted WOFF2 with `font-display: swap`), `next/font/google` for JetBrains Mono. No external `@font-face` or Google Fonts `<link>` tags in source. Source Serif 4 was previously removed (noted in layout comments). Only concern is JetBrains Mono in root layout scope.
- **List virtualization**: No `react-window` or `react-virtual` usage. Acceptable for current scale — no directory page renders more than ~100 broker/advisor rows at once (server-filtered before render). Not yet a production concern, but flag if item counts grow significantly.
