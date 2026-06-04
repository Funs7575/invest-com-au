# UX/UI Audit — Home, global shell & navigation

## Scope (files actually reviewed)

| File | Role |
|------|------|
| `app/layout.tsx` | Root layout (lang, metadata, feature-flag gates) |
| `app/page.tsx` | Homepage (ISR, data fetching, all sections) |
| `app/globals.css` | Global styles + design tokens |
| `app/error.tsx` | Route-level error boundary |
| `app/global-error.tsx` | App-level error boundary |
| `app/loading.tsx` | Root loading skeleton |
| `app/not-found.tsx` | 404 page |
| `app/offline/page.tsx` | PWA offline fallback |
| `app/search/page.tsx` | Full-results search page |
| `app/help/page.tsx` | Help centre index |
| `app/help/[category]/` | Help category/article routes |
| `app/whats-new/page.tsx` | Platform fee changelog |
| `app/start/page.tsx` + `StartClient.tsx` | Matchmaker entry (redirects to /quiz) |
| `app/feed/page.tsx` | Advisor insights feed |
| `components/layout/Navigation.tsx` | Primary nav (desktop mega-menus + mobile menu) |
| `components/layout/SiteFooter.tsx` | Site-wide footer |
| `components/LayoutShell.tsx` | Client shell (skip-link, nav, footer, MobileBottomNav) |
| `components/ChatWidget.tsx` | Floating AI concierge widget |
| `components/BackToTop.tsx` | Scroll-progress back-to-top button |
| `components/CTAStack.tsx` | Broker CTA block |
| `components/BottomSheet.tsx` | Mobile filter/drawer primitive |
| `components/SearchOverlay.tsx` | Global search modal |
| `components/ComplianceFooter.tsx` | Shared compliance block |
| `components/ClusterNav.tsx` | Topic cluster in-page nav |
| `components/CompanionLinksStrip.tsx` | Cross-vertical companion links |
| `components/Header.tsx` | Legacy header component (still imported by whats-new) |
| `components/Footer.tsx` | Legacy footer component (still imported by whats-new) |

---

## Findings

| # | Severity | Area | File:line | Issue | Recommendation |
|---|----------|------|-----------|-------|----------------|
| 1 | High | IA | `app/whats-new/page.tsx:3,4,173,304` | **Double-chrome: legacy `<Header />` and `<Footer />` rendered inside the root layout.** The root layout wraps every page with `Navigation` + `SiteFooter` (via `LayoutShell`). `whats-new/page.tsx` also imports and renders the legacy `Header` and `Footer` components, meaning the page has two nav bars and two footers stacked on top of each other. | Remove the `import Header`, `import Footer`, `<Header />`, and `<Footer />` calls from `app/whats-new/page.tsx`. The root layout already provides the shell. |
| 2 | High | a11y | `components/layout/Navigation.tsx:391,842` | **Duplicate "Account" section in mobile menu.** `currentMobileSections` is built by spreading `mobileSections` and appending the logged-in/out account section (line 391). Then a *second* hardcoded `Account` block is rendered unconditionally at line 842 inside the same `<nav>`. Mobile users see the account links listed twice. | Remove the redundant hardcoded block at lines 842–907. The `currentMobileSections.map(...)` already renders the account section correctly. |
| 3 | High | a11y | `components/ChatWidget.tsx:179,180` | **Chat panel is `role="dialog"` but `aria-modal="false"` and has no focus trap.** When the panel opens, focus stays wherever it was; keyboard users cannot reliably navigate into or out of the panel. The BottomSheet primitive (used elsewhere) correctly implements focus trapping — this widget does not. `aria-modal="false"` also tells screen-reader virtual cursors that the background is still accessible, which conflicts with the modal visual presentation. | Set `aria-modal="true"`, auto-focus the input on open (add a `useEffect` watching `open`), and add the same `Tab`/`Shift+Tab` trap used in `BottomSheet.tsx`. |
| 4 | High | a11y | `components/layout/Navigation.tsx:183–227` | **Mega-menu dropdowns have no keyboard-accessible close/navigation mechanism.** The `MegaMenuDropdown` button correctly sets `aria-expanded` and `aria-haspopup="menu"`, but pressing `Escape` does *not* close the open panel (no `keydown` handler), and focus does not move into the panel on `Enter`/`Space`. Keyboard-only users cannot reach any mega-menu item. Mouse-leave closes after 120 ms but that does not help keyboard users. | Add an `onKeyDown` handler on the trigger button: `Escape` → close and return focus to button; `ArrowDown`/`Enter` when open → move focus to the first link inside the panel. |
| 5 | High | visual | `app/global-error.tsx:35` | **Global error page uses a hard-coded green (`#15803d`) "Try Again" button** instead of the site's slate/amber design language. The file uses raw inline styles throughout, meaning it receives no dark-mode, font, or branding treatment. | Replace inline styles with Tailwind classes matching `app/error.tsx`. Use `bg-slate-900 text-white` for the primary button. The `app/error.tsx` design (which renders within the layout) is the template to copy. |
| 6 | High | a11y | `app/search/page.tsx:99–170` | **No visible `<h1>` when a search query is active.** The `<h1>` is only rendered in the empty-state block (query < 2 chars). When results are showing, the page has no page-level heading — only a `<p>` with the result count. Screen-reader users and SEO crawlers receive no heading landmark for the results view. | Add a visually present (or at minimum `sr-only`) `<h1>` such as `Search results for "{query}"` before the result sections, conditionally rendered when `query.length >= 2`. |
| 7 | Med | IA | `app/help/page.tsx:52–55` | **Help-page breadcrumb `<nav>` has no `aria-label`.** WCAG requires multiple navigation landmarks to be differentiated. The main nav is labelled; this breadcrumb `<nav>` at line 52 has no `aria-label="Breadcrumb"`, making them indistinguishable to screen readers. | Add `aria-label="Breadcrumb"` to the `<nav>` element (mirroring `app/whats-new/page.tsx:176` which is correct). |
| 8 | Med | visual | `app/help/page.tsx:64,71,95,111` | **Help Centre uses blue (`blue-700`, `blue-300`) hover colours inconsistent with the site's amber design system.** Every other page uses `hover:border-amber-400`, `hover:text-amber-700`, `text-amber-600` etc. The help page applies `hover:border-blue-300`, `group-hover:text-blue-700`, and `text-blue-700` for all interactive elements and the support email link. | Replace `blue-*` classes with the site-standard `amber-*` equivalents throughout `app/help/page.tsx`. |
| 9 | Med | a11y | `app/page.tsx:311–318` | **Homepage quick-access chip emojis are not `aria-hidden`.** The two pill links render `📊` and `📋` as raw text nodes inside the `<Link>`, so screen readers announce "chart bar emoji Financial Health Score" and "clipboard emoji Life Event Checklists". | Wrap each emoji in `<span aria-hidden="true">📊</span>` to suppress decoration from the accessible name. |
| 10 | Med | IA | `components/layout/Navigation.tsx:18` | **Legacy `Header.tsx` uses `/property/buyer-agents` while the main nav uses `/advisors/buyers-agents`.** These are two separate live routes for the same product (buyer's agents). The footer column "Find Experts & Property" (`SiteFooter.tsx:74`) also routes to `/property/buyer-agents`. Split URLs dilute SEO and confuse users who land on different pages for the same need. | Decide on one canonical path. The `/advisors/buyers-agents` path is consistent with all other advisor specialties. Redirect `/property/buyer-agents` → `/advisors/buyers-agents` and update all nav/footer hrefs. |
| 11 | Med | perf | `components/layout/SiteFooter.tsx:12–17` | **`SiteFooter` calls `new Date()` at render time.** This runs on every request for non-ISR pages and forces a new date computation on ISR revalidation rather than using the `CURRENT_YEAR` constant from `lib/seo.ts`. For the `updatedDate` string, it produces a stale value for the entire ISR window (misleading "Updated 4 June 2026" text that doesn't change). | Use `CURRENT_YEAR` from `lib/seo.ts` for the copyright year. For the "Updated" timestamp, either omit it from the footer entirely, or drive it from the most-recent broker change timestamp via a dedicated prop. |
| 12 | Med | copy | `components/ComplianceFooter.tsx:62` | **Calculator compliance variant text is hardcoded** ("Calculations are indicative estimates only...") directly in `ComplianceFooter.tsx` instead of being exported from `lib/compliance.ts`. This breaks the single-source-of-truth rule for compliance copy and risks the text drifting from the legal team's approved wording. | Extract the string to a named export `CALCULATOR_DISCLAIMER` in `lib/compliance.ts` and reference it here. |
| 13 | Med | state | `app/loading.tsx:1–119` | **Loading skeleton has no `aria-busy` or `role="status"` announcement.** The `animate-pulse` skeleton renders visible content but does not signal to screen readers that the page is loading. Users who tab through the page skeleton would find meaningless divs with no accessible name. | Wrap the skeleton in `<div role="status" aria-label="Loading page content" aria-busy="true">`. |
| 14 | Med | a11y | `components/SearchOverlay.tsx:292–295` | **Search overlay backdrop is a clickable `<div>` with `aria-hidden="true"` but without `role="none"` or `tabindex="-1"`.** Some assistive technologies may still surface the element in tab order. The overlay itself correctly uses `role="dialog" aria-modal="true"`, but an `aria-hidden` clickable element should also carry `tabindex="-1"` to ensure it cannot receive focus. | Add `tabIndex={-1}` to the backdrop `<div>`. |
| 15 | Med | visual | `components/CTAStack.tsx:62` | **CTAStack cross-links include `/find-advisor`** — this route is a deprecated alias. The canonical path for the advisor directory is `/advisors`. Running a quick check: both `/find-advisor` and `/advisors` exist as routes, but using a different path for a cross-link inside a broker review CTA is IA inconsistency. | Standardise on `/advisors` for all advisor directory links to remove ambiguity. |
| 16 | Med | visual | `app/not-found.tsx:19` | **404 page renders `aria-hidden="true"` on the "404" visual number but that same element IS the first heading-like thing a sighted user reads.** While the hidden number keeps the `<h1>` as the accessible page title, the visual flow presents a large "404" above the `<h1>`, creating a heading hierarchy mismatch between visual and accessible order. | Either keep `aria-hidden` and ensure the `<h1>` ("Page Not Found") is visually primary, or replace the `<p aria-hidden>` with an `<h1>` styled large and make the descriptive text an adjacent `<p>`. |
| 17 | Low | visual | `components/BackToTop.tsx:37` / `components/ChatWidget.tsx:167` | **BackToTop and ChatWidget bubble overlap on the `sm` breakpoint (640–1023 px).** BackToTop is at `sm:bottom-6 right-3 sm:right-6` (z-30); ChatWidget bubble is at `bottom-4 right-4` (z-9998). At 640 px+ the 56 px chat bubble (bottom: 16 px, top-edge: 72 px) and the 44 px BackToTop button (bottom: 24 px, top-edge: 68 px) visually overlap at the same corner. | Offset the BackToTop button further: `sm:bottom-20` when ChatWidget is enabled, or use `sm:right-20` to clear the chat bubble. |
| 18 | Low | a11y | `components/layout/SiteFooter.tsx:181,219` | **Footer links have both `block` and `flex` utility classes** (`py-1.5 block min-h-11 flex items-center`). In Tailwind v4 `flex` overrides `block`; the `block` class is a no-op but adds noise. Separately, the bottom-bar legal links using `block min-h-11` on anchor elements increases tap-target size — a good practice — but the two conflicting display values may confuse future contributors. | Remove the `block` token; leave `flex items-center` for tap-target sizing. |
| 19 | Low | copy | `app/help/page.tsx:8,9` | **Help Centre metadata uses lowercase "invest.com.au"** in the title and description: "Answers to common questions about using invest.com.au". Everywhere else the brand is styled "Invest.com.au" (capital I). | Capitalise: "…about using Invest.com.au…" in both `title` and `description`. |
| 20 | Low | IA | `components/layout/Navigation.tsx:446–502` | **Desktop mega-menu "Compare" has a hard-coded advisor count ("167 advisors") and platform count ("80 platforms").** These are stale static strings that will fall out of sync with real data as the platform grows. Users may notice and lose trust in the accuracy of the site's claims. | Either remove these counts or pull them from the same cached queries used on the homepage (`getActiveBrokersListing` count, `professionals` count). |
| 21 | Low | perf | `app/start/page.tsx:12` | **`/start` immediately redirects to `/quiz` but still exports `metadata` and `revalidate = 3600`.** The metadata is never served (the redirect fires before the page renders). The ISR revalidation is also wasted. | Use `export const dynamic = "force-dynamic"` (or just leave out `revalidate`) and strip the metadata export since it will never be consumed. |
| 22 | Low | state | `app/loading.tsx:5` | **Root loading skeleton assumes a broker comparison page layout** (comparison table, filter tabs, deal cards). The root `loading.tsx` is shown for every page under the root layout during navigation. If users navigate to `/help` or `/feed`, the skeleton looks like a broker comparison page rather than a generic or page-appropriate skeleton. | Make `loading.tsx` a generic spinner or header-width skeleton that doesn't presuppose a specific page structure. |
| 23 | Low | visual | `app/page.tsx:310` | **Homepage section with quick-access chips uses a negative margin `-mt-4`** (`-mt-4 mb-6`) to visually overlap the `HomePathfinder` section above it. This margin coupling makes the layout brittle and will break if the preceding component's bottom spacing changes. | Replace the negative margin with the equivalent positive spacing on the `HomePathfinder` component's `mb` or add a dedicated `gap` on the page-level flex/grid container. |

---

## Quick-wins (safe to auto-apply, ≤1hr each)

1. **Fix help-page breadcrumb `aria-label`** (`app/help/page.tsx:52`): One-line change — add `aria-label="Breadcrumb"` to the `<nav>` element.
2. **Fix help-page blue→amber colours** (`app/help/page.tsx:64,71,95,111`): Find/replace `blue-300`→`amber-400`, `blue-700`→`amber-700` in this file only.
3. **Fix emoji `aria-hidden`** (`app/page.tsx:311–316`): Wrap `📊` and `📋` in `<span aria-hidden="true">`.
4. **Extract calculator compliance copy** (`components/ComplianceFooter.tsx:62`): Move the hardcoded string to `lib/compliance.ts` as `CALCULATOR_DISCLAIMER`.
5. **Fix global-error branding** (`app/global-error.tsx:35`): Change `backgroundColor: "#15803d"` to `backgroundColor: "#0f172a"` (slate-900) to match `app/error.tsx`.
6. **Add `aria-busy` to loading skeleton** (`app/loading.tsx:3`): Wrap the `animate-pulse` div in `<div role="status" aria-label="Loading" aria-busy="true">`.
7. **Help metadata capitalisation** (`app/help/page.tsx:9`): Change "invest.com.au" → "Invest.com.au" in title/description strings.
8. **Add `tabIndex={-1}` to SearchOverlay backdrop** (`components/SearchOverlay.tsx:297`): One-attribute fix.
9. **Strip redundant `block` from footer links** (`components/layout/SiteFooter.tsx:181,219`): Remove `block` from the combined `block flex` display class.

---

## Healthy patterns

- **Skip-to-content link** is implemented correctly in `LayoutShell.tsx:55–60`: `sr-only focus:not-sr-only`, correct `#main-content` anchor, visually styled on focus.
- **Keyboard shortcut `Cmd/Ctrl+K` for search** (`SearchOverlay.tsx:192–206`) is wired at the document level and works correctly across both Navigation and SearchOverlay components via a custom event.
- **`BottomSheet` focus trap and Escape handler** (`BottomSheet.tsx:28–55`) is a well-implemented modal primitive: Escape closes, Tab/Shift-Tab cycle within, first element auto-focused on open.
- **Compliance copy single source of truth**: `SiteFooter.tsx`, `ComplianceFooter.tsx`, and `ChatWidget.tsx` all pull from `lib/compliance.ts` constants — no hardcoded legal text (except the one calculator string flagged above).
- **ISR on the homepage** (`app/page.tsx:59`): `export const revalidate = 3600` correctly set; heavy data fetches are parallelised with `Promise.all`.
- **Dark-mode support in Navigation**: The mega-menu, mobile menu, and nav header all carry consistent `dark:` variants.
- **Reduced-motion respected** in `globals.css:83–89`: `@media (prefers-reduced-motion: reduce)` disables animations and transitions globally.
- **`aria-current="page"` on active mobile nav items** (`Navigation.tsx:827`): Correctly applied to the active route in the mobile menu.
- **`print:hidden` on ChatWidget** (`ChatWidget.tsx:167,182`): Widget is suppressed from print output.
- **Proper WCAG-conformant external link handling** in `SiteFooter.tsx:179–181`: `target="_blank"` links carry `rel="noopener noreferrer"` and `aria-label` where icon-only.
