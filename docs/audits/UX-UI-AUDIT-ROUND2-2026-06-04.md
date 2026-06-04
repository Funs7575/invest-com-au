# Round-2 UX/UI Audit & Overhaul — 2026-06-04

A second full-site pass on an **orthogonal axis** to Round 1. Round 1 audited
domain-by-domain (a11y/IA/forms/contrast); Round 2 audits **lens-by-lens** across
all ~880 routes, then ships another implementation wave. Builds on the Round-1
branch (`claude/ux-overhaul-wave-1`, PR #1341).

## How it ran
- **10 lens audit subagents**: mobile/responsive, dark-mode, loading/empty/error
  states, performance, microcopy, conversion funnels, i18n, form-validation UX,
  design-system consistency, SEO/metadata → `bots/findings/r2-1..10-*.md`.
- **Systemic scan** + **6 implementation subagents** (this PR).

## Systemic numbers (app + components, *.tsx)
| Signal | Count |
|---|---|
| `"use client"` files | 789 |
| inline `style={{}}` | 1339 (258 files) |
| hardcoded hex colours | 972 (140 files) |
| `bg-white` w/o `dark:` | 5471 (1127 files) |
| fixed `w-[NNpx]` | 67 (49 files) |
| `onClick` on div/span | 45 |
| `page.tsx` without `generateMetadata` | ~187 / 882 |

## Top findings by lens (detail in the per-lens files)
- **Mobile:** chat panel overflow (`InvestorCopilot:105`), <44px tap target (`StickyAdFooter:171`), up to 5 uncoordinated `fixed bottom-0` bars colliding on notch iPhones.
- **Dark mode:** *shipped but architecturally broken* — `html.dark … !important` overrides in `globals.css` make all `dark:` Tailwind variants dead code; inline-style pages (`my-briefs`, `my-learning`, `teams/[slug]/referrals`) render as bright blocks in dark.
- **States:** `/account/dashboard` had no `loading.tsx` (skeleton already existed); `/compare` `<Suspense>` had no fallback; `/community/*` zero loading/error coverage.
- **Performance:** 789 client components; two 1.2–1.4k-line monolithic client pages (`AdvisorProfileClient`, `BrokerReviewClient`); ~6 no-hook admin components needlessly `"use client"`. (Positives: custom SVG charts, `next/font`, lazy PostHog, no raw `<img>` in components.)
- **Microcopy:** silent quiz match confirmation (`AdvisorResultsScreen`), broker/platform terminology collision, 128× blanket "Something went wrong".
- **Conversion:** get-matched result CTAs lacked affiliate disclosure + `trackClick`; `goBack()` orphans plan rows (`GetMatchedClient:276`).
- **i18n:** language switcher emitted dead `/ar/foreign-investment*` links (ar lacks those routes); untranslated English CTAs in RTL Arabic pages.
- **Form validation:** missing `autoComplete`/`inputMode`, generic errors without `role="alert"`/`aria-describedby` (`ListingEnquiryForm`, `BusinessFinance`, `FundReviewForm`).
- **Design-system:** 6 competing primary-CTA colour families; `Button/Card/Badge` primitives at ~0.5% adoption; 43 inline-style hex blocks on `advisor/[slug]:431-583`.
- **SEO:** community threads missing OG/canonical/sitemap; `best-for/[slug]` no Twitter/OG image; `howToJsonLd` stale `datePublished`; 52 double-branded titles; 18 hardcoded `BreadcrumbList`.

## ✅ Shipped — Round-2 implementation wave (type-check clean)
- **Mobile:** panel viewport cap, ≥44px dismiss target, safe-area TOC.
- **Terminology + errors:** broker→platform copy; context-aware auth error messages.
- **Forms:** autoComplete + inputMode on money fields; `role="alert"`/`aria-describedby`/`aria-invalid` on two enquiry forms.
- **i18n:** switchers guarded to `FI_LOCALES` (kills the `/ar/...` 404s).
- **Conversion/compliance:** affiliate disclosure + `trackClick` on get-matched result CTAs.
- **States:** dashboard + community `loading.tsx`; `/compare` Suspense fallback.

## 🔴 Strategic items flagged (NOT auto-fixed — need a decision)
1. **Dark mode** — either invest in real coverage (migrate the `!important` globals approach to proper `dark:` variants + fix inline-style pages) or retire the toggle. Today it's a broken experience for anyone who switches.
2. **Tax brackets** (carried from Round 1) — still the top data-accuracy issue.
3. **Client-component diet** — split the two 1.2–1.4k-line monolith pages; drop `"use client"` from no-hook components.
4. **Design-system consolidation** — one primary-CTA colour; adopt `Button/Card/Badge`; kill inline-style/hex sprawl.
5. **SEO** — sitemap coverage for community/topic, OG/Twitter on programmatic pages, `breadcrumbJsonLd()` SSOT, de-dupe titles.
6. **get-matched `goBack()`** orphans plan rows — needs a rewind endpoint (backend).

Per-lens detail (every finding + file:line) in `bots/findings/r2-1..10-*.md`.
