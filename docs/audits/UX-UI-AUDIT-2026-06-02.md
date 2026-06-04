# Site-wide UX/UI Audit & Overhaul — 2026-06-02

A massive end-to-end UX/UI audit of invest.com.au, driven by a fan-out of audit
subagents + live AI-journey personas + a systemic anti-pattern scan, with a
first overhaul wave shipped in the same pass.

## How it ran

- **10 audit subagents**, one per domain, reviewed the ~878 routes + component
  library at the code level across eight lenses (WCAG-AA a11y, IA/navigation,
  visual consistency, states, microcopy, forms, performance). Per-domain
  reports live in **`bots/findings/ux-1..10-*.md`**.
- **8 live AI-journey personas** drove the live Netlify deploy behind the
  side-effect firewall (expat, SMSF-retiree, property, tools-explorer, business,
  learner, crypto, switcher) — **96 pages walked, 0 real postbacks**. These add
  to the earlier 3 personas (first-home-buyer, advice-seeker, quiz-taker) in
  `bots/reports/ai-journey-2026-06-02.md`.
- **Systemic anti-pattern scan** across `app/` + `components/` (`*.tsx`).
- **Every candidate finding verified before reporting** (route existence +
  retried status probes). Several agent claims were rejected as false positives.

## Headline

- Domains audited: **10** · raw findings across the per-domain reports: **~210**
  (≈ 8 Critical · 45 High · 70 Medium · 85 Low).
- Live journeys: **96/96 pages** carried fee + risk/advice disclosures — site
  compliance copy is healthy and pervasive.
- The directory is healthy structurally: only **two real broken routes**
  surfaced site-wide (both fixed in Wave 1).

## Systemic anti-pattern counts (`app/` + `components/`, `*.tsx`)

| Pattern | Matches | Files |
|---|---|---|
| Low-contrast grey text (`text-*-300/400`) | 3995 | 1019 |
| `<button>` without explicit `type=` | 1184 | 385 |
| `target="_blank"` total | 293 | 199 |
| &nbsp;&nbsp;…of which **missing `rel="noopener"`** | **40** | **25** |
| `onClick` on `<div>`/`<span>` (non-semantic) | 45 | 35 |
| Raw `<img>` (vs `next/image`) | 17 | 15 |
| Icon `<button>` missing `aria-label` (approx) | 9 | 9 |
| _positive:_ `aria-label` present | 589 | 434 |
| _positive:_ uses `next/image` | 95 | 95 |

## Cross-cutting themes (where the leverage is)

1. **Misused ARIA tab pattern** — `role="tablist"`/`role="tab"` with no
   `tabpanel`/`aria-controls`/arrow-keys appears in **6+ components** (brokers
   compare sort + filter, article category filters, rates savings/TD switch,
   auth login/signup tabs). Either make them real tabs or switch to
   `aria-pressed` toggle buttons.
2. **Unlabelled form fields** — `<label>` without `htmlFor`/`id` across advisor
   review + contact, article comments, business-finance + startup-signup leads,
   and the **shared** calculator `InputField`/`SelectField` (high leverage).
3. **Missing `aria-live` on calculator results** — results update silently for
   screen-reader users across most calculators. The correct pattern already
   exists in `InvestmentIncomeTaxClient.tsx:239`.
4. **Contrast** — amber rating stars (~2.4:1), AdSlot disclosure labels (~9px,
   ~2.1:1), and the broad grey-text theme.
5. **Forms that aren't `<form>`** — e.g. the advisor review UI is a `<div>` with
   a button handler (breaks Enter-submit, autofill, AT form mode).
6. **Legacy/duplicate chrome** — `/whats-new` rendered a second `Header`+`Footer`
   inside the layout; the mobile menu renders "Account" twice.
7. **DATA ACCURACY (urgent)** — stale pre-Stage-3 tax brackets drive several
   calculators; FIRB fee figure mismatch between the hub and the estimator.

## Verification discipline — confirmed vs rejected

**Confirmed real (consistent across retries):**
- `/alternatives` → 404 (content link; no code source) → redirect to `/alt-assets`.
- `/advisor-portal/login` → 404 (2 server redirects target it).
- `/articles/<slug>` article cards resolve to the `[category]` listing, not the
  article (route is `/article/<slug>`).

**Rejected as false positives (verification matters):**
- `/login?redirect=` "404" — actually **307** (redirects fine).
- `/tools/dasp-calculator` "404" — route **exists**.
- 403s on `/switch`, `/mortgage-calculator`, `/foreign-investment/shares`,
  `/best/bitcoin-exchange`, `/article/beginners-guide-asx` — **transient**
  sandbox-proxy blips; all consistent **200** on retry.

---

## ✅ Wave 1 — shipped in this PR

| Area | Change | Files |
|---|---|---|
| Broken route | `/alternatives` → `/alt-assets` redirect | `next.config.ts` |
| Broken route | `/advisor-portal/login` (404) → `/account/login` | `advisor-portal/{upgrade,health}/page.tsx` |
| Broken links | `/articles/<slug>` → `/article/<slug>` on hub article cards | `retirement`, `aged-care`, `home-loans` |
| Nav chrome | remove duplicate legacy `Header`+`Footer` | `whats-new/page.tsx` |
| a11y (leverage) | associate `<label>`↔input/select in shared calc primitives | `calculators/_components/CalcShared.tsx` |
| Contrast | AA-fix amber rating stars (`text-amber`→`text-amber-600`) | `BrokerComparisonTable.tsx` |
| Contrast | AA-fix AdSlot disclosure labels (size + colour) | `AdSlot.tsx` |

## 🔜 Roadmap — prioritised next waves (turnkey, with file:line)

### URGENT — data accuracy / founder review
- **Stale tax brackets** → align to Stage-3 (rates 16/30/37/45; thresholds
  18.2k/45k/135k/190k) per `lib/calculators/investment-income-tax.ts`:
  `CalcShared.tsx:203` (`TAX_BRACKETS`), `SuperContributionsClient.tsx:27-33`,
  `NegativeGearingCalculatorClient.tsx:10`. Produces materially wrong figures.
- **FIRB fee mismatch** — `foreign-investment/page.tsx:209` ($14,100) vs
  `FirbFeeEstimatorClient.tsx:49` ($14,700).

### Wave 2 — a11y (High)
- Fix misused ARIA tabs (`BrokerComparisonTable:66`, `CompareClient:592`,
  `ArticleCategoryFilter:42`, `ArticlesClient:67`, `RateBoardClient:196`, auth
  login/signup tabs).
- `aria-live` on calculator results (compound-interest, fire,
  dividend-reinvestment, retirement, smsf, super-contributions, mortgage).
- Auth error a11y `role="alert"`/`aria-describedby` (`LoginClient:280,350`,
  `SignupClient:301,334`).
- Advisor review UI → real `<form>` + label assoc (`AdvisorReviewForm:159-256`).
- Unlabelled lead forms (`ArticleComments:166`, business-finance enquiry,
  `startup-signup:183-343`, advisor contact).
- Sticky-rail focus trap (`BrokerStickyRightRail:46`); mega-menu keyboard nav
  (`Navigation:183-227`); rate-table `scope`/`aria-sort`/`caption`
  (`RateBoardClient:234`).

### Wave 3 — visual / consistency / perf
- `rel="noopener noreferrer"` on the 40 `target="_blank"` links (25 files).
- Raw `<img>` → `next/image` (17); `onClick` on `<div>`/`<span>` → `<button>` (45).
- Inline-style sprawl `advisor/[slug]/page.tsx:432-583` → design-system.
- Remove duplicate mobile "Account" block (`Navigation.tsx:842+`).
- `/rates` "last updated" uses client render time, not fetch time
  (`RateBoardClient:160`); dead-end advertiser CTA (`advertise:102,254`).

### Wave 4 — the broad themes
- Grey-text contrast sweep (component-level, not mass-sed).
- Explicit `type="button"` on non-submit buttons inside forms.

Per-domain detail (every finding, severity, file:line, recommendation) lives in
`bots/findings/ux-1..10-*.md`.
