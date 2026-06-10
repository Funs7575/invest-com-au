# UX/UI Fintech Alignment — comprehensive opportunity list

> Source of truth for the site-wide "smart fintech" UX/UI alignment effort.
> Generated 2026-06-10 from a six-agent code audit of every major surface,
> using the rebuilt `/briefs/new`, `/invest` and `/advisors` pages as the
> reference standard. Each item carries file:line evidence — fix from here
> without re-auditing.

## The standard (what "aligned" means)

1. **Compact light header** — `components/directory/DirectoryHero.tsx`
   `tone="light"`: breadcrumb, tight headline (+coral accent span), 1-line
   subtitle, ≤4 small stat pills. No dark gradient marketing heroes, no
   centered `py-14/16/20` bands.
2. **Content near the fold** — page body starts within the first screen.
3. **Content + sticky rail** on desktop (`lg:grid-cols-[minmax(0,1fr)_320px]`)
   instead of narrow centered columns with dead side space.
4. **Dense cards** — `p-3/p-4`, `gap-2.5/3`, `rounded-xl`,
   `border-slate-200`, `text-sm/xs`, `hover:-translate-y-0.5 hover:shadow-md`.
5. **House primitives only** — `components/ui/*` (Button, Input, Select,
   Badge, Card, ProgressBar), `components/directory/*` (SearchInput, TabBar,
   FacetGroup, ResultCount, EmptyState, FilterChips, CompareBar),
   `FormStepper`, `Icon` (never emoji).
6. **Honest numbers** — real live counts as stat pills (emerald pulse for
   "live"), `tnum`/`.iv2-bignum` for figures. No fabricated claims.

Reference implementations: `app/invest/page.tsx` (light hero + dense grid),
`app/briefs/new/` (form + sticky rail), `app/compare/page.tsx` (dark-tone
hero variant), `app/get-matched/GetMatchedClient.tsx` (3-pane form layout).

## Priority key

- **P0** — first-screen / major-funnel pages actively fighting the brand
- **P1** — high-traffic surfaces with real wasted space or legacy patterns
- **P2** — consistency & density passes (mechanical, low-risk)
- **P3** — code-health / polish

Effort: S (<30 min) · M (30 min–2 h) · L (>2 h).

---

## A. Core funnel (home, compare, quiz, get-matched, find-advisor)

| # | Route / file | Finding | Fix | Pri | Effort |
|---|---|---|---|---|---|
| A1 | `components/HomeHero.tsx:32` | Dark hero with `padding: "72px 36px 64px"` (~136px vertical) — first screen mostly chrome | Cut to compact scale (`py-5 md:py-6` equivalent); content nearer fold | **P0** | S |
| A2 | `components/HomeGetMatched.tsx:35` | Nested `44px + 32px` paddings in mid-page band | Single wrapper `py-6 md:py-8`, card `p-5` | P1 | S |
| A3 | `components/HomeListingsTeaser.tsx:83` | `padding: "48px 36px 52px"` band | `py-8 md:py-10`; dense `p-3/4` cards inside | P1 | S |
| A4 | `components/HomeRouteCards.tsx:129-150` | Route cards off the house density scale | `Card padding="md"`, gap-3, text-sm; fee pills text-xs | P2 | S |
| A5 | `components/HomeHero.tsx` (whole) | Hand-rolled hero parallel to DirectoryHero | Assess subsuming into DirectoryHero dark tone, or document why custom | P3 | M |
| A6 | `app/quiz/_components/QuizQuestionScreen.tsx` + results | Verify question/results wrappers ≤ `py-6/8`; results screen padding unaudited | Spot-fix paddings; email-capture form to text-sm/gap-2.5/p-3 | P1 | S |
| A7 | `app/find-advisor/page.tsx:1046-1088` (Step1–4) | Steps partially hand-rolled; verify house Input/Select/Button use | Migrate fields to `components/ui` primitives | P1 | M |
| A8 | `app/find-advisor/page.tsx:1672` | OTP input `py-3` with `text-2xl` cramped | `py-4` (or `text-xl`) | P3 | S |
| A9 | `app/find-advisor/page.tsx` MatchConfirmation | Advisor-preview card density unverified | Compact to `p-4`, badges text-xs, buttons py-2.5 | P2 | S |
| A10 | `app/compare/page.tsx` | Already aligned (DirectoryHero dark + stat pills) | None — reference | — | — |
| A11 | `app/get-matched/GetMatchedClient.tsx:533-604` | Already aligned (3-pane 240/1fr/320 sticky layout) | None — reference | — | — |

## B. Briefs ecosystem (the marketplace core)

| # | Route / file | Finding | Fix | Pri | Effort |
|---|---|---|---|---|---|
| B1 | `app/briefs/[slug]/page.tsx:305-325` | Post-submit tracker: hand-rolled header, no DirectoryHero, no stat pills | DirectoryHero light + status pill + response count | **P0** | M |
| B2 | `app/briefs/[slug]/page.tsx:306` | `max-w-3xl` single column — dead side space on the page users return to most | `container-custom max-w-6xl` + sticky rail (status, next-step CTA, booking) — mirror `/briefs/new` | **P0** | M |
| B3 | `app/briefs/[slug]/page.tsx:328,451,557` | Cards `p-6` everywhere | `p-4`, nested gaps `gap-1.5/2` | P2 | S |
| B4 | `app/briefs/[slug]/page.tsx:345-369` | Heavy 5-circle status stepper | Compact inline badge row (status-coloured) | P2 | M |
| B5 | `app/briefs/[slug]/page.tsx:397-446,545-553` | Emoji banners (✍️⭐), inconsistent p-5/p-6/px-4 | Icon component + standard `p-4` banner pattern | P2 | S |
| B6 | `app/briefs/[slug]/page.tsx:383` | No next-step CTA when accepted-but-no-booking | Rail CTA: "Next: book a call" + intake prompt surfacing | P1 | M |
| B7 | `app/my-briefs/page.tsx:126-365` | **~240 lines of inline `style={{}}` objects** — fully off-system | Rewrite in Tailwind + house primitives; extract `BriefCard`; DirectoryHero light w/ brief counts | **P0** | M |
| B8 | `app/my-briefs/page.tsx:185,226,283-296` | CSS-var colours + hardcoded badge hex | Tailwind classes + `Badge` variants | P2 | S |
| B9 | `app/quotes/post/page.tsx:37-92` | Legacy auction flow: dark `py-16 sm:py-20` hero, centered how-it-works band — pre-Brief-Studio styling | Either restyle to DirectoryHero + rail, or (better) evaluate redirect → `/briefs/new` since Brief Studio supersedes it | **P0** | M |
| B10 | `app/quotes/page.tsx:115-161` | Dark gradient hero + redundant "live now" card (count duplicated in subtitle) | DirectoryHero (live pill + count stat); drop duplicate card | P1 | M |
| B11 | `app/quotes/page.tsx:188-229` | Bare `<select>` filters | House `Select` | P2 | S |
| B12 | `app/advisor-portal/briefs/page.tsx:14-22` | Pro-side inbox: bare h1, no breadcrumb, no counts | DirectoryHero light + "N available / M accepted" stat pills | P1 | S |
| B13 | `app/briefs/[slug]/intake/page.tsx:49-97` | Hand-rolled header; three divergent state banners | DirectoryHero light + question-count pill; unify banner pattern | P2 | S |
| B14 | `app/quotes/[slug]/*` | Sibling legacy detail/review pages — same era as B9/B10 | Sweep with the same pattern once B9 decided | P2 | M |

## C. Advisors ecosystem

| # | Route / file | Finding | Fix | Pri | Effort |
|---|---|---|---|---|---|
| C1 | `components/AdvisorProfileClient.tsx:94-112` | `SectionCard` `p-6` body + `px-6 py-4` header × ~10 instances/page | `p-4` body, `px-4 py-3` header — single-component fix, page-wide win | **P0** | S |
| C2 | `AdvisorProfileClient.tsx:303-310` | Profile hero `pt-8 pb-7`, `gap-6 md:gap-8` | `pt-4 pb-3 gap-4` | P1 | S |
| C3 | `AdvisorProfileClient.tsx:589` | Rail only at `lg:` — tablet dead space | `md:grid-cols-[1fr_320px] lg:[1fr_380px]` | P1 | S |
| C4 | `AdvisorProfileClient.tsx:866` | Fee grid `grid-cols-2` cramped at 375px | `grid-cols-1 sm:2 md:3 gap-2.5` | P1 | S |
| C5 | `AdvisorProfileClient.tsx:289-295` | Breadcrumb text-sm mb-5 | text-xs mb-2 (DirectoryHero scale) | P3 | S |
| C6 | `app/advisors/[type]/page.tsx:629-637` + `[state]` | Typed/state directories lack DirectoryHero (no context, no counts) | DirectoryHero light w/ type label + verified-count stat | P1 | M |
| C7 | `app/advisors/[type]/[state]/page.tsx:241-254` | FAQs in `max-w-3xl` + `py-10` | Full container, `py-3/4`, `space-y-2` | P2 | S |
| C8 | `app/advisors/page.tsx:147-164` | Index FAQs `py-10` | `py-4 md:py-6` | P2 | S |
| C9 | `app/advisors/compare/page.tsx:13` | `pt-10 pb-14` around the compare table | `pt-3/4 pb-4/6` | P2 | S |
| C10 | `components/AdvisorCompareClient.tsx:207,214` | `min-w-[200px]` columns force tablet scroll; `px-4 py-4` cells | Responsive `min-w-[140/160/200px]`, `px-3 py-3` | P1 | S |
| C11 | `app/shortlist/advisors/page.tsx:13-19` | `pt-10` + `text-3xl` header | `pt-3`, `text-lg/xl` | P2 | S |
| C12 | `app/advisor-portal/page.tsx` | Dashboard layout in lazy-loaded tabs — unaudited | Dedicated follow-up audit | P2 | M |
| C13 | `app/advisor-apply/page.tsx` | Application form hand-rolled | Migrate to house form primitives + FormStepper | P2 | M |

## D. Account & auth

| # | Route / file | Finding | Fix | Pri | Effort |
|---|---|---|---|---|---|
| D1 | `app/account/AccountClient.tsx:286-358,500-524` | Raw `<input>`s + ~20 hand-rolled buttons | Migrate to `Input`/`Select`/`Button` | P1 | M |
| D2 | `app/account/profile/ProfileClient.tsx:248` | `py-5 md:py-12` wrapper | `py-4 md:py-6` | P1 | S |
| D3 | `ProfileClient.tsx:287-313,407` | Raw inputs/select/save-button | House primitives | P2 | M |
| D4 | `app/account/saved/SavedComparisonsClient.tsx:130,145` | `py-16` skeleton, `py-5 md:py-12` wrapper | `py-6`, `py-4 md:py-6` | P2 | S |
| D5 | `app/account/select-workspace/page.tsx:53-55` | `min-h-[60vh]` + `py-12` for a utility chooser | Drop min-h; `py-6`; `mb-6` | P1 | S |
| D6 | `app/auth/login/LoginClient.tsx:228,275-372` | `py-16` wrapper; all fields/buttons hand-rolled | `py-10`; house `Input`/`Button` | P1 | M |
| D7 | `app/auth/signup/SignupClient.tsx:183,228-354` | Same as login + custom strength bar | `py-10`; house primitives; `ProgressBar` for strength | P1 | M |
| D8 | `ProfileClient.tsx:49-109` + `OnboardingClient` | `RadioCard`/`InterestPill` duplicated across flows | Extract to `components/ui/` | P2 | M |
| D9 | `app/account/alerts/page.tsx:70-73` | CTA hand-rolled | `Button size="sm"` | P3 | S |
| D10 | `app/account/page.tsx:103-111` | KPI pills `p-4 gap-3` | `p-3 gap-2.5` | P2 | S |

## E. Invest verticals & listings

| # | Route / file | Finding | Fix | Pri | Effort |
|---|---|---|---|---|---|
| E1 | `app/invest/mining/listings/[slug]/page.tsx:132-169` (+ sector siblings) | Listing detail (money page): `py-12` hero before the image/metrics | DirectoryHero light (breadcrumb + title + location); badges inline | **P0** | M |
| E2 | same `:173-197` | Sidebar price card `p-6`, `gap-8` grid | `p-4`, `gap-3`; align metric/price hierarchy | P2 | S |
| E3 | `app/invest/mining/page.tsx:63-95` (+ sector pillars) | Pillar hero `py-8 md:py-12` + 5xl headline — content far below fold | DirectoryHero light, `py-3/4` | P1 | M |
| E4 | same `:98-114` | Standalone "Browse listings" CTA band duplicating nav | Delete; inline link in hero subtitle | P1 | S |
| E5 | same `:116-137` | Dark gradient "Critical Minerals" marketing band | Light card (`bg-emerald-50 border-emerald-200`) | P1 | S |
| E6 | same `:140-156, 159-257` | `py-10` stat band, `py-14` content sections | `py-6/8` and `py-8/10` | P2 | S |
| E7 | `app/invest/mining/listings/page.tsx:48-64` (+ siblings) | Sector listings pages have **no header at all** — land on filter bar | DirectoryHero light w/ listing-count stats before `InvestListingsClient` | P1 | M |
| E8 | `components/VerticalPillarPage.tsx:182-200` | Third competing hero pattern (custom gradient box) across share-trading/crypto/etc. | Refactor to DirectoryHero (dark tone) — one change, 5+ pages unify | **P0** | M |
| E9 | `app/super/page.tsx:84-122` (HubPage) | Fourth hero pattern via HubPage | HubPage renders DirectoryHero | P1 | M |
| E10 | `app/invest/list/page.tsx:61-112` | Listing submission: hand-rolled 2-col hero | DirectoryHero light (same as `/briefs/new`) | P1 | S |
| E11 | same `:134-207` | `py-14`, `gap-10`, `p-8/p-6` cards | `py-8/10`, `gap-6`, `p-4/6` | P2 | S |
| E12 | `app/invest/list/ListingSubmitForm.tsx` | Custom step machine, no FormStepper | Adopt `FormStepper` + Brief-Studio form patterns | P1 | M–L |
| E13 | `app/invest/[slug]/page.tsx:100-330` | Raw `prose` sections + inconsistent stat grids per vertical | SectionHeading + shared `StatGrid`; house card density | P2 | M |
| E14 | `app/invest/alternatives/page.tsx:121-154` | Custom rose-gradient hero; `p-3` stats | DirectoryHero light; `p-4` stats | P2 | S |
| E15 | `app/invest/page.tsx:470-489` | Trailing compliance band as own section | Fold into FAQ accordion / footer link | P3 | S |

## F. Tools, content pages & global chrome

| # | Route / file | Finding | Fix | Pri | Effort |
|---|---|---|---|---|---|
| F1 | `app/calculators/_components/CalcShared.tsx:171-182` | Calculator results lack `tnum`/`.iv2-bignum` — figures don't align (core fintech polish) | Add `iv2-bignum`/`tnum` to `ResultBox` value — one shared component, 15+ calc pages | **P0** | S–M |
| F2 | `CalcShared.tsx:128-149` | Input `py-2.5`, label `mb-1 md:mb-1.5` looser than house | `py-2`, uniform `mb-1`, parent `gap-2.5` | P2 | S |
| F3 | `app/calculators/page.tsx:145-159` | FAQ disclosures `px-5 py-4` + `space-y-3` | `px-4 py-3`, `space-y-2.5` (standardise FAQ pattern site-wide) | P2 | S |
| F4 | `app/learn/page.tsx:141-155` | Full-bleed dark hero `py-10 md:py-14` + 5xl headline | DirectoryHero light | P1 | M |
| F5 | `app/learn/page.tsx:166-196` | Path cards `rounded-2xl p-5` | `rounded-xl p-3 md:p-4` | P2 | S |
| F6 | `app/articles/page.tsx:358-365` | Hub header gradient box `p-4 md:p-8` + 4xl headline | Light compact header `p-3 md:p-4`, `text-xl/2xl` | P1 | S |
| F7 | `app/articles/page.tsx:633-695` | Article cards `p-2.5 md:p-6`, uneven gaps | `p-3 md:p-4`, uniform `gap-2.5` (100+ cards) | P2 | S |
| F8 | `components/Footer.tsx:89-241` | 6-col / 90-120-link flat footer — unscannable bloat (visible in founder screenshot) | IA reorg to 4 buckets, collapsible legal accordion, mobile per-section collapse | P1 | L |
| F9 | `components/Footer.tsx:18-87` | Legal banner + collapsibles stacked above footer | Single "Legal & Compliance" accordion inside footer | P2 | M |
| F10 | `app/community/page.tsx:99+` | Dark gradient hero (same era as Learn) | DirectoryHero light | P2 | M |
| F11 | `components/Header.tsx:479-613` | `h-16 lg:h-20` — desktop 80px slightly heavy | Optional: unify `h-16`; low priority, well-executed otherwise | P3 | M |
| F12 | `app/not-found.tsx` | Already well-executed | None — reference | — | — |
| F13 | `app/wealth-stack/page.tsx` | Already compact | FAQ density pass only (F3 pattern) | P3 | S |

---

## Execution plan

**Wave 1 (P0 — ship first):**
1. B7 `/my-briefs` full rewrite (inline-styles → Tailwind + house primitives)
2. B1+B2 `/briefs/[slug]` tracker → DirectoryHero + rail layout (completes the
   brief journey: create → track in the same visual system)
3. C1 `SectionCard` density (one component, whole advisor profile improves)
4. F1 `ResultBox` tnum/iv2-bignum (one component, 15+ calculator pages)
5. A1 Homepage hero padding
6. E8 `VerticalPillarPage` hero → DirectoryHero (one component, 5+ pillar pages)
7. E1 Listing detail hero (money page)
8. B9 decision: restyle vs redirect `/quotes/post` (founder call on redirect;
   restyle is autonomous-safe)

**Wave 2 (P1):** B6, B10, B12, C2-C4, C6, C10, D1, D2, D5, D6, D7, A2, A3, A6,
A7, E3-E5, E7, E9, E10, E12, F4, F6, F8.

**Wave 3 (P2/P3 mechanical sweeps):** density/padding bulk passes (B3-B5, B8,
B11, B13-B14, C5, C7-C9, C11-C13, D3, D4, D8-D10, A4, A5, A8, A9, E2, E6, E11,
E13-E15, F2, F3, F5, F7, F9, F10, F13), then code-health items (F11).

**Rules for every fix:** reuse `DirectoryHero`/house primitives (never fork
them); no API or data-flow changes; Tier A page-UI only; verify with
type-check + targeted tests + a11y-safe markup; one PR per wave (or per page
for the big rewrites).
