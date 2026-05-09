# Audit Remediation — Queue

Source of truth for `/audit-remediation-iteration`. Each iteration reads this
file, picks the top non-blocked item per `REMEDIATION_DEFAULTS.md` priority
order, does it, then edits this file to advance the queue before committing.

See also: `REMEDIATION_DEFAULTS.md` (priority weights + work-sizing rules),
`MERGE_AUTHORIZATION.md` (tier policy), `REMEDIATION_QUEUE_LOG_ARCHIVE.md`
(iteration log entries older than ~30 iterations).

---

## In-flight (one row per active stream)

| Stream | Branch | PRs (history → latest) | Notes | Done-when |
|--------|--------|------------------------|-------|-----------|
| A | _complete_ | #207/#322/#351/#352/#353/#354/#355/#378/#380/#381/#382/#457/#540 | A-01..A-04 done. A-05 resolved as **false-positive** — `broker_reviews`/`broker_ratings` don't exist in schema; covered by `user_reviews` (A-02). **Stream complete.** | A-05 merged ✓ |
| B | `claude/audit-remediation/b-09-edge-fn-secrets` | #208/#301/#457 | B-01..B-08 done. B-09 blocked (see Blocked). | B-09 unblocked + merged |
| C | `claude/audit-remediation/c-05-index-coverage` | #209/#302/#338/#356/#357/#358/#359/#360/#361/#362/#457/#541 | C-01..C-02 done. C-03..C-05 blocked (see Blocked). | C-05 merged |
| D | `claude/audit-remediation/d-09-seo-drift` | #210/#303/#339/#363/#364/#365/#366/#457/#542 | D-01..D-09 done. | D-09 merged ✓ |
| E | `claude/audit-remediation/e-02-batch-5-zod-rollout` (#469) · `e-04-batch-2-zod-backfill` (#557) · `e-04-batch-3-zod-backfill` (#558) | #211/#304/#340/#368/#379/#383/#457/#458/#459/#460/#461/#462/#463/#464/#465/#466/#467/#468/#469/#555/#556/#557/#558 | E-02 batch 1-5 all MERGED (#469 merged 2026-05-03). E-04 batch 1 done (#555/#556), batch 2 blocked, **batch 3 MERGED** (#558 per iter 279). | All E-02+E-04 batches merged |
| F | `claude/audit-remediation/f-08-cache-drift` | #212/#305/#341/#370/#384/#457/#470/#543 | F-01..F-07 done. F-08 blocked (see Blocked). | F-08 unblocked + merged |
| G | `claude/audit-remediation/g-04-mfa-gaps` | #213/#306/#342/#371/#385/#457/#471/#544 | G-01..G-03 done. G-04 blocked (see Blocked). | G-04 unblocked + merged |
| H | `claude/audit-remediation/h-06-stripe-webhooks` | #214/#307/#343/#386/#457/#472/#545 | H-01..H-06 done. | H-06 merged ✓ |
| I | `claude/audit-remediation/i-05-advisor-gaps` | #215/#308/#344/#387/#457/#473/#546 | I-01..I-05 done. | I-05 merged ✓ |
| J | `claude/audit-remediation/j-04-content-freshness` | #216/#309/#345/#388/#457/#510/#547 | J-01..J-04 done. | J-04 merged ✓ |
| K | `claude/audit-remediation/k-05-notification-gaps` | #217/#310/#346/#389/#457/#511/#548 | K-01..K-05 done. | K-05 merged ✓ |
| L | `claude/audit-remediation/l-06-logging-drift` | #218/#311/#347/#390/#457/#512/#549 | L-01..L-06 done. | L-06 merged ✓ |
| M | `claude/audit-remediation/m-05-mobile-ux` | #219/#312/#348/#391/#457/#513/#550 | M-01..M-05 done. | M-05 merged ✓ |
| N | `claude/audit-remediation/n-04-a11y-gaps` | #220/#313/#349/#392/#457/#514/#551 | N-01..N-04 done. | N-04 merged ✓ |
| O | `claude/audit-remediation/o-04-rls-zero-policy` | #221/#314/#350/#393/#457/#515/#552/#593 | **#593 MERGED 2026-05-08** — all 57 zero-policy tables remediated. | O-04 merged ✓ |
| P | `claude/audit-remediation/p-05-perf-budgets` | #222/#315/#394/#457/#516/#553 | P-01..P-05 done. | P-05 merged ✓ |
| Q | `claude/audit-remediation/q-05-quiz-integrity` | #223/#316/#395/#457/#517/#554 | Q-01..Q-05 done. | Q-05 merged ✓ |
| R | `claude/audit-remediation/r-coverage-m2b-calculators` · **#640 OPEN** (CI queued) | #290/#396/#459/#466/#471/#472/#473/#510/#511/#513/#514/#516/#517/#519/#521/#526/#527/#528/#529/#530/#531/#532/#533/#534/#535/#536/#537/#538/#539/#540/#541/#542/#543/#544/#545/#546/#547/#548/#549/#550/#551/#552/#553/#554/#555/#556/#557/#558/#559/#560/#561/#562/#563/#564/#565/#566/#567/#568/#569/#570/#571/#572/#573/#574/#575/#576/#577/#578/#579/#580/#581/#582/#583/#584/#585/#586/#587/#588/#589/#590/#591/#592/#593/#594/#595/#596/#597/#598/#599/#600/#601/#602/#603/#604/#605/#606/#607/#608/#609/#610/#611/#612/#640 | **#595 MERGED** (RATCHET M1 — coverage floors raised). **#597 MERGED** (R-COVERAGE-15). **#601 MERGED** (M2-A done — 12 files). **#640 OPEN** (M2-B — CGT+mortgage+currency.formatAUD, 3 test files, 368 LOC). | #640 merged |
| S | _complete_ | **#594 MERGED 2026-05-08** (`ee498f8c`) | queue-sync iter 315 — #594 MERGED. | S-01..S-05 done. **Stream complete.** |
| T | `claude/audit-remediation/t-05-type-safety` | #225/#318/#398/#457/#519/#560 | T-01..T-05 done. | T-05 merged ✓ |
| U | `claude/audit-remediation/u-04-url-canonicals` | #226/#319/#399/#457/#520/#561 | U-01..U-04 done. | U-04 merged ✓ |
| V | `claude/audit-remediation/v-07-auth-hardening` | #227/#320/#400/#457/#521/#562 | V-01..V-07 done. | V-07 merged ✓ |
| W | `claude/audit-remediation/w-12-hub-page-hoc` (W-15 remaining) | #306/#312/#369/#529/#598/#599/#602/#604/#605/#606/#607/#608/#609/#612 | **#609 MERGED 2026-05-08** (W-12+W-13+W-15 dividends). **#612 MERGED 2026-05-08** (W-14 grants→/startup/grants). W-04..W-15 all MERGED. | All W tasks merged ✓ |
| X | `claude/audit-remediation/x-09-preview-advisor-final` (#646) · `x-09-eslint-ratchet` (#648) | #257/#367/#596/#600/#610 MERGED · **#641 OPEN** (X-06) · **#643 OPEN** (X-07) · **#644 OPEN** (X-08) · **#646 OPEN** (X-09a) · **#648 OPEN** (X-09b) | X-06 (#641 CI ✓), X-07 (#643 CI ✓), X-08 (#644 CI ✓), X-09a (#646 — preview/[token] swap + keep-admin annotations), X-09b (#648 — ESLint ratchet). **Stream X complete** once all 5 PRs merge. | All X PRs merged |
| EE | `claude/audit-remediation/ee-01-error-boundaries` · **#653 OPEN** | **#653 OPEN** (EE-01) | EE-01 done + EE-02/03/04 FP. Fixes quiz/calculators/savings-calc error.tsx. EE-05 pending. | EE-05 merged |
| OOO | `claude/audit-remediation/ooo-01-runbook-audit` · **#652 OPEN** | — · **#652 OPEN** | OOO-01 done. OOO-04 FP. OOO-02 done (incident-severity.md, iter 324). OOO-03 pending. | OOO-03 merged |
| WW | `claude/audit-remediation/ww-01-watchlist-data-model` · **#651 OPEN** | **#651 OPEN** (WW-01) | WW-01 migration applied to live DB, types regenerated. | All WW tasks merged |
| Y | `claude/audit-remediation/y-03-yield-calc` | #229/#322/#402/#457/#523/#564 | Y-01..Y-03 done. | Y-03 merged ✓ |
| Z | `claude/audit-remediation/z-04-zero-state-ux` | #230/#323/#403/#457/#524/#565 | Z-01..Z-04 done. | Z-04 merged ✓ |

---

## Blocked

### SMOKE-TEST SYSTEMIC FAILURE — RESOLVED

**Resolved by PR #615** (`0abcf03f`, merged 2026-05-08). Root cause was a
Vitest `vi.mock()` hoisting bug in the shared test harness. All 14 affected
test suites now pass. Smoke-test gate re-enabled.

---

### F-08 — Cache drift (edge-case TTL regression)

**Status:** Blocked — awaiting Vercel KV TTL propagation fix (external dep).
**Opened:** iter 187. **Last reviewed:** iter 312.
**Unblock condition:** Vercel KV SDK ≥ 2.0.4 ships the `expiryMs` fix
(tracked in vercel/storage#489). Poll monthly.
**Next action:** iter 313+ — re-check vercel/storage#489 status.

---

### E-04 batch 2 — Zod backfill (10 remaining route handlers)

**Status:** Blocked — 3 of 10 routes have `req.json()` called inside a
catch-block path that Zod's `.parse()` can't safely wrap (async generator
pattern). Needs `withValidatedBody` to support streaming bodies first.
**Opened:** iter 201. **Last reviewed:** iter 312.
**Unblock condition:** `withValidatedBody` streaming support (tracked as
E-05, not yet scheduled).
**Next action:** Schedule E-05 stream or accept permanent carve-out.

---

### C-03 — Composite index coverage (advisor_sessions)

**Status:** Blocked — migration requires table lock on `advisor_sessions`;
production table has 2M+ rows, lock would exceed 30 s statement timeout.
**Opened:** iter 156. **Last reviewed:** iter 310.
**Unblock condition:** Maintenance window scheduled + `lock_timeout = '5s'`
+ `statement_timeout = '60s'` set for that session, OR table partitioned
first (C-06, not yet scheduled).
**Next action:** Raise with Finn for Q3 2026 maintenance window.

---

### C-04 — Composite index coverage (broker_reviews)

**Status:** Blocked — same table-lock concern as C-03, 800K rows.
**Opened:** iter 156. **Last reviewed:** iter 310.
**Unblock condition:** Same as C-03 — maintenance window or partitioning.
**Next action:** Bundle with C-03 maintenance window.

---

### C-05 — Composite index coverage (user_quiz_history)

**Status:** Blocked — concurrent index build failing intermittently in CI
due to shared Supabase test branch contention.
**Opened:** iter 202. **Last reviewed:** iter 311.
**Unblock condition:** Dedicated Supabase branch for index migrations, OR
retry logic in migration runner.
**Next action:** iter 313+ — try `CREATE INDEX CONCURRENTLY IF NOT EXISTS`
with explicit wait.

---

### B-09 — Edge function secrets rotation

**Status:** Blocked — 2 of 4 edge functions use a vendor API key that
requires a manual vendor-portal rotation (no API). Finn must rotate.
**Opened:** iter 178. **Last reviewed:** iter 312.
**Unblock condition:** Finn rotates `VENDOR_PAYMENTS_KEY` +
`VENDOR_IDENTITY_KEY` in Supabase Edge Function secrets dashboard.
**Next action:** Ping Finn; once rotated, B-09 can land within 1 iteration.

---

### G-04 — MFA gaps (recovery-code flow)

**Status:** Blocked — Supabase Auth MFA recovery API endpoint not yet GA;
currently in private beta (`/auth/v1/mfa/recover` returns 501 in prod).
**Opened:** iter 192. **Last reviewed:** iter 312.
**Unblock condition:** Supabase Auth MFA recovery endpoint goes GA.
**Track:** https://github.com/supabase/gotrue/issues/1456
**Next action:** Poll monthly; expected GA Q3 2026 per Supabase roadmap.

---

### O-04 — RLS zero-policy tables (post-#593 residuals)

**Status:** Blocked — 3 tables identified post-merge as needing custom
policies beyond the generic deny-all template: `advisor_audit_log`,
`compliance_snapshots`, `migration_lock`. These require domain-specific
policy design (not just deny-all).
**Opened:** iter 315. **Last reviewed:** iter 315.
**Unblock condition:** Policy design reviewed and approved by Finn (touches
compliance boundary — AFSL audit log must be readable by compliance role).
**Next action:** Draft policies in iter 316+; flag for Finn review.

---

## Pending (not yet started)

### Stream AA — Advisor onboarding funnel gaps

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|--------------|-------|
| AA-01 | pending | Advisor profile completeness score (surface in dashboard) | ~3 | Deps: I-05. |
| AA-02 | pending | Onboarding checklist UI (step indicators, completion gating) | ~4 | Deps: AA-01. |
| AA-03 | pending | Email drip for incomplete onboarding (3-day, 7-day, 14-day) | ~3 | Deps: AA-02. |
| AA-04 | pending | Advisor public profile SEO (canonical URL, JSON-LD Person schema) | ~2 | Deps: AA-01. |
| AA-05 | pending | Advisor review-request flow (post-session prompt) | ~3 | Deps: AA-02. |

**Stream AA entry condition:** I-05 merged (done). Ready to start.

---

### Stream BB — Broker comparison deep-links

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|--------------|-------|
| BB-01 | pending | Broker vs-broker comparison page (`/compare/[broker-a]-vs-[broker-b]`) | ~5 | Deps: D-09. |
| BB-02 | pending | Comparison table component (fee diff, feature matrix) | ~4 | Deps: BB-01. |
| BB-03 | pending | SEO metadata + JSON-LD for comparison pages | ~2 | Deps: BB-01. |
| BB-04 | pending | Internal linking (broker detail pages → comparison pages) | ~2 | Deps: BB-03. |
| BB-05 | pending | Affiliate CTA placement on comparison pages | ~1 | Deps: BB-04. |

**Stream BB entry condition:** D-09 merged (done). Ready to start.

---

### Stream CC — Country-mode completeness

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|--------------|-------|
| CC-01 | pending | Country-mode coverage audit (identify gaps vs. `lib/country-mode/`) | ~2 | Baseline needed before CC-02+. |
| CC-02 | pending | NZ supply-threshold tuning (current thresholds too aggressive) | ~3 | Deps: CC-01. |
| CC-03 | pending | IN/SG/HK intent-context wiring (priority-chain gaps) | ~4 | Deps: CC-01. |
| CC-04 | pending | Country-mode E2E tests (Playwright, 3 locales) | ~3 | Deps: CC-02+CC-03. |
| CC-05 | pending | Locale-aware sitemap entries for non-AU locales | ~2 | Deps: CC-03. |

**Stream CC entry condition:** No hard deps. Can start any time.

---

### Stream DD — Data freshness SLAs

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|--------------|-------|
| DD-01 | pending | Freshness SLA definition (per-table, per-vertical TTL targets) | ~2 | Strategic: Finn input needed. |
| DD-02 | pending | Stale-data alerting (cron health check + Slack webhook) | ~3 | Deps: DD-01. |
| DD-03 | pending | ISR revalidation audit (verify `revalidate` values match SLAs) | ~2 | Deps: DD-01. |
| DD-04 | pending | Broker rate data pipeline (currently manual CSV import) | ~6 | Deps: DD-01. |
| DD-05 | pending | ETF/fund data pipeline freshness (daily NAV updates) | ~4 | Deps: DD-01. |

**Stream DD entry condition:** DD-01 needs Finn input on SLA targets.

---

### Stream EE — Error boundary + fallback UX

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|--------------|-------|
| EE-01 | **done** | Global error boundary audit (identify routes missing `error.tsx`) | — | Root `app/error.tsx` covers all 523 routes. 3 bespoke files fixed (quiz/calculators/savings-calc). PR #653. |
| EE-02 | ~~false-positive~~ | ~~Standardised error boundary component (design + implement)~~ | — | `components/RouteErrorBoundary` already exists. |
| EE-03 | ~~false-positive~~ | ~~Skeleton/loading fallback audit (identify routes missing `loading.tsx`)~~ | — | `app/loading.tsx` (root) + `components/RouteLoadingSkeleton` already exist. |
| EE-04 | ~~false-positive~~ | ~~Standardised loading skeleton component~~ | — | `RouteLoadingSkeleton` pre-existed. |
| EE-05 | pending | E2E tests for error + loading states | ~3 | Deps: EE-02+EE-04 (FP — can start now). |

**Stream EE entry condition:** No hard deps. Can start any time.

---

### Stream FF — Feature flag lifecycle

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|--------------|-------|
| FF-01 | pending | Feature flag audit (identify stale flags in `feature_flags` table) | ~1 | |
| FF-02 | pending | Flag expiry policy (auto-archive after N days dormant) | ~2 | Deps: FF-01. |
| FF-03 | pending | Flag management UI in admin panel | ~3 | Deps: FF-01. |
| FF-04 | pending | Flag usage tracking (log flag evaluations to `web_vitals_samples`) | ~2 | Deps: FF-03. |

**Stream FF entry condition:** FF-01 can start immediately.

---

### Stream GG — Growth / acquisition experiments

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|--------------|-------|
| GG-01 | pending | A/B test infrastructure (server-side, cookie-based, Supabase-backed) | ~5 | Deps: FF-03. |
| GG-02 | pending | Homepage hero A/B test (CTA copy variants) | ~2 | Deps: GG-01. |
| GG-03 | pending | Broker card CTA A/B test (button text + colour) | ~2 | Deps: GG-01. |
| GG-04 | pending | Experiment results dashboard (admin panel) | ~4 | Deps: GG-01+GG-02+GG-03. |

**Stream GG entry condition:** FF-03 done. Deps on FF stream.

---

### Stream HH — Help centre / FAQ content

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|--------------|-------|
| HH-01 | pending | Help centre page structure (`/help`, `/help/[category]`, `/help/[category]/[article]`) | ~4 | |
| HH-02 | pending | FAQ JSON-LD integration (reuse `lib/schema-markup.ts` `normaliseFaqs`) | ~2 | Deps: HH-01. |
| HH-03 | pending | Help centre search (client-side, Fuse.js) | ~3 | Deps: HH-01+HH-02. |
| HH-04 | pending | Article feedback widget (was-this-helpful, Supabase-backed) | ~2 | Deps: HH-01. |

**Stream HH entry condition:** No hard deps. Can start any time.

---

### Stream II — Investment calculator suite

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|--------------|-------|
| II-01 | pending | Compound interest calculator (`/calculators/compound-interest`) | ~3 | |
| II-02 | pending | Brokerage fee calculator (`/calculators/brokerage-fees`) | ~3 | Deps: BB-01. |
| II-03 | pending | ETF cost comparison calculator (`/calculators/etf-cost`) | ~3 | Deps: II-02. |
| II-04 | pending | Tax on investment returns calculator (CGT, dividend withholding) | ~4 | |
| II-05 | pending | Calculator SEO (canonical, JSON-LD HowTo schema) | ~2 | Deps: II-01..II-04. |

**Stream II entry condition:** II-01 and II-04 have no hard deps. II-02 deps on BB-01.

---

### Stream JJ — Job board / careers page

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|--------------|-------|
| JJ-01 | pending | Careers page (`/about/careers`) with open roles | ~2 | |
| JJ-02 | pending | Role detail page (`/about/careers/[role]`) | ~2 | Deps: JJ-01. |
| JJ-03 | pending | Application form (name, email, CV upload to Supabase Storage) | ~4 | Deps: JJ-02. |
| JJ-04 | pending | Application review in admin panel | ~3 | Deps: JJ-03. |

**Stream JJ entry condition:** No hard deps. Low priority — park until post-launch.

---

### Stream KK — Knowledge graph / internal linking

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|--------------|-------|
| KK-01 | pending | Internal link audit (identify orphaned pages + over-linked hubs) | ~2 | |
| KK-02 | pending | Related-content widget (bottom of article pages) | ~3 | Deps: KK-01. |
| KK-03 | pending | Topic cluster map (pillar ↔ cluster ↔ supporting visualised) | ~3 | Deps: KK-01. |
| KK-04 | pending | Automated internal link injection (LSI-based, configurable density) | ~5 | Deps: KK-02+KK-03. Risky — needs kill-switch. |

**Stream KK entry condition:** KK-01 can start immediately.

---

### Stream LL — Lead-gen / email capture

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|--------------|-------|
| LL-01 | pending | Newsletter signup (modal + inline, Resend list integration) | ~3 | |
| LL-02 | pending | Lead magnet PDF delivery (investment guide, gated by email) | ~3 | Deps: LL-01. |
| LL-03 | pending | Email preference centre (`/account/notifications`) | ~3 | Deps: LL-01. |
| LL-04 | pending | Transactional email audit (review all Resend templates) | ~2 | Deps: LL-01. |

**Stream LL entry condition:** LL-01 can start immediately.

---

### Stream MM — Monitoring + observability

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|--------------|-------|
| MM-01 | pending | Sentry alert routing (currently all alerts → single channel) | ~2 | |
| MM-02 | pending | Custom Sentry performance dashboards (per-vertical p95 LCP) | ~3 | Deps: MM-01. |
| MM-03 | pending | Cron health dashboard (admin panel, surfaces stale jobs) | ~3 | |
| MM-04 | pending | RLS query performance monitoring (identify slow policy evaluations) | ~3 | Deps: MM-03. |

**Stream MM entry condition:** MM-01 can start immediately.

---

### Stream NN — Newsletter / content marketing

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|--------------|-------|
| NN-01 | pending | Weekly market-update email template (Resend, MDX-driven) | ~4 | Deps: LL-01. |
| NN-02 | pending | Automated newsletter content pipeline (cron → Resend) | ~5 | Deps: NN-01+DD-02. |
| NN-03 | pending | Subscriber segmentation (by vertical interest, activity) | ~3 | Deps: NN-02+LL-03. |

**Stream NN entry condition:** LL-01 done. Deps on LL stream.

---

### Stream OO — Onboarding quiz v2

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|--------------|-------|
| OO-01 | pending | Quiz v2 spec (risk tolerance + knowledge + goals, 12 questions) | ~2 | Strategic: Finn input needed on question set. |
| OO-02 | pending | Quiz v2 UI (multi-step, progress bar, animated transitions) | ~4 | Deps: OO-01. |
| OO-03 | pending | Quiz v2 recommendation engine (map answers → product set) | ~4 | Deps: OO-01. |
| OO-04 | pending | Quiz v2 A/B test vs. v1 | ~2 | Deps: OO-02+GG-01. |
| OO-05 | pending | Quiz result persistence (save to `user_quiz_history`) | ~2 | Deps: OO-03. |

**Stream OO entry condition:** OO-01 needs Finn input.

---

### Stream PP — Performance budget enforcement

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|--------------|-------|
| PP-01 | pending | Bundle size budget CI check (fail build if main bundle > 250 kB) | ~2 | Deps: P-05. |
| PP-02 | pending | Image optimisation audit (identify unoptimised `<img>` tags) | ~2 | |
| PP-03 | pending | Font loading optimisation (subset + preload) | ~2 | Deps: PP-02. |
| PP-04 | pending | Third-party script audit (GTM, Intercom, etc. — defer or remove) | ~2 | |

**Stream PP entry condition:** P-05 merged (done). Ready to start.

---

### Stream QQ — Quiz integrity v2

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|--------------|-------|
| QQ-01 | pending | Quiz answer tamper-detection (HMAC signature on client state) | ~3 | Deps: Q-05. |
| QQ-02 | pending | Rate-limit quiz submissions per user (DB-backed, lib/rate-limit.ts) | ~2 | Deps: QQ-01. |
| QQ-03 | pending | Quiz analytics dashboard (completion rate, drop-off by question) | ~4 | Deps: QQ-01+MM-01. |

**Stream QQ entry condition:** Q-05 merged (done). Ready to start.

---

### Stream RR — Referral program

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|--------------|-------|
| RR-01 | pending | Referral program spec (incentive structure, T&Cs, AFSL compliance check) | ~2 | Strategic: Finn + compliance review needed. |
| RR-02 | pending | Referral link generation + tracking (Supabase-backed) | ~4 | Deps: RR-01. |
| RR-03 | pending | Referral dashboard (`/account/referrals`) | ~3 | Deps: RR-02. |
| RR-04 | pending | Referral reward fulfilment (credit / gift card via Stripe) | ~4 | Deps: RR-02. AFSL caution. |

**Stream RR entry condition:** RR-01 needs Finn + compliance review.

---

### Stream SS — Search (internal site search)

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|--------------|-------|
| SS-01 | pending | Search index build (pg_trgm full-text on brokers, articles, FAQs) | ~4 | |
| SS-02 | pending | Search API route (`/api/search?q=`) | ~3 | Deps: SS-01. |
| SS-03 | pending | Search UI (global search bar, keyboard shortcut Cmd+K) | ~4 | Deps: SS-02. |
| SS-04 | pending | Search analytics (log queries + zero-result rate) | ~2 | Deps: SS-02. |

**Stream SS entry condition:** SS-01 can start immediately.

---

### Stream TT — Trust signals

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|--------------|-------|
| TT-01 | pending | Trust badge component (AFSL number, regulatory status) | ~2 | Deps: lib/compliance.ts. |
| TT-02 | pending | Expert review byline (author schema, credentials) | ~3 | Deps: TT-01. |
| TT-03 | pending | Methodology page (`/methodology`) | ~3 | |
| TT-04 | pending | Editorial policy page (`/editorial-policy`) | ~2 | |
| TT-05 | pending | Review process transparency (how we rate brokers) | ~2 | Deps: TT-03. |

**Stream TT entry condition:** No hard deps. Can start any time.

---

### Stream UU — User-generated content moderation

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|--------------|-------|
| UU-01 | pending | Review moderation queue (admin panel, approve/reject/flag) | ~4 | Deps: A-05. |
| UU-02 | pending | Automated spam detection (keyword filter + rate limit) | ~3 | Deps: UU-01. |
| UU-03 | pending | Review appeal flow (user can contest rejection) | ~3 | Deps: UU-01. |
| UU-04 | pending | Review export (CSV download for compliance audit) | ~2 | Deps: UU-01. |

**Stream UU entry condition:** A-05 merged. Deps on A stream.

---

### Stream VV — Video content

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|--------------|-------|
| VV-01 | pending | Video embed component (YouTube/Vimeo, lazy-load, CLS-safe) | ~2 | |
| VV-02 | pending | Video SEO (VideoObject JSON-LD, thumbnail meta) | ~2 | Deps: VV-01. |
| VV-03 | pending | Video content index page (`/videos`) | ~3 | Deps: VV-01+VV-02. |

**Stream VV entry condition:** No hard deps. Low priority.

---

### Stream WW — Watchlist / portfolio tracker

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|------------|-------|
| WW-01 | **in-flight** | Watchlist data model (Supabase table, RLS, user-scoped) | ~3 | PR #651 open, CI running. Migration applied to live DB. Types regenerated. |
| WW-02 | pending | Watchlist UI (`/account/watchlist`) | ~4 | Deps: WW-01. |
| WW-03 | pending | Watchlist price alerts (email + in-app, cron-driven) | ~4 | Deps: WW-02+DD-02. |
| WW-04 | pending | Portfolio tracker (manual entry, cost-basis tracking) | ~6 | Deps: WW-02. Long-term. |

**Stream WW entry condition:** No hard deps. Can start after WW-01.

---

### Stream XX — XML sitemap v2

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|--------------|-------|
| XX-01 | pending | Sitemap index file (`/sitemap.xml` → sub-sitemaps) | ~2 | Deps: U-04. |
| XX-02 | pending | Image sitemap (broker logos, article thumbnails) | ~2 | Deps: XX-01. |
| XX-03 | pending | Video sitemap | ~2 | Deps: XX-01+VV-03. |
| XX-04 | pending | News sitemap (for article freshness signal) | ~2 | Deps: XX-01. |

**Stream XX entry condition:** U-04 merged (done). Ready to start.

---

### Stream YY — Yield / dividend data

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|--------------|-------|
| YY-01 | pending | Dividend calendar data model + seed | ~3 | |
| YY-02 | pending | Dividend calendar page (`/dividends/calendar`) | ~3 | Deps: YY-01. |
| YY-03 | pending | Dividend history page (per-stock, `/dividends/[ticker]`) | ~3 | Deps: YY-01. |
| YY-04 | pending | Dividend screener (filter by yield, frequency, sector) | ~4 | Deps: YY-02+YY-03. |
| YY-05 | pending | Dividend reinvestment calculator | ~3 | Deps: YY-04+II-01. |

**Stream YY entry condition:** YY-01 can start immediately.

---

### Stream ZZ — Zero-downtime deploy hardening

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|--------------|-------|
| ZZ-01 | pending | Blue-green deploy validation (smoke test post-deploy hook) | ~3 | |
| ZZ-02 | pending | Rollback runbook formalisation (`docs/runbooks/rollback.md`) | ~2 | |
| ZZ-03 | pending | DB migration rollback test (prove each migration is reversible) | ~4 | Deps: ZZ-02. |
| ZZ-04 | pending | Deploy notification (Slack webhook on Vercel deploy complete) | ~2 | |

**Stream ZZ entry condition:** No hard deps. Can start any time.

---

### Stream AAA — Accessibility v2 (WCAG 2.2 AA)

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|--------------|-------|
| AAA-01 | pending | WCAG 2.2 AA gap audit (axe-core scan, 50 highest-traffic pages) | ~3 | Deps: N-04. |
| AAA-02 | pending | Focus management audit (modal, drawer, toast flows) | ~3 | Deps: AAA-01. |
| AAA-03 | pending | Colour contrast v2 (new brand palette check) | ~2 | Deps: AAA-01. |
| AAA-04 | pending | Screen-reader test pass (NVDA + VoiceOver, 10 key flows) | ~4 | Deps: AAA-02+AAA-03. |

**Stream AAA entry condition:** N-04 merged (done). Ready to start.

---

### Stream BBB — Broker data enrichment

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|--------------|-------|
| BBB-01 | pending | Broker fee data completeness audit (identify gaps in `broker_fees`) | ~2 | |
| BBB-02 | pending | Broker feature matrix v2 (expand to 80 features from 40) | ~5 | Deps: BBB-01. |
| BBB-03 | pending | Broker news feed (RSS ingestion, per-broker news widget) | ~4 | |
| BBB-04 | pending | Broker social proof (AUM, user count, awards) | ~3 | Deps: BBB-02. |

**Stream BBB entry condition:** BBB-01 can start immediately.

---

### Stream CCC — Content quality scoring

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|--------------|-------|
| CCC-01 | pending | Content quality rubric (readability, accuracy, freshness, depth) | ~2 | Strategic: Finn input. |
| CCC-02 | pending | Automated quality score (Flesch-Kincaid + freshness + completeness) | ~3 | Deps: CCC-01. |
| CCC-03 | pending | Quality score dashboard (admin, surface lowest-scoring content) | ~3 | Deps: CCC-02. |
| CCC-04 | pending | Quality-gated publishing (score threshold before indexable) | ~2 | Deps: CCC-03. Risky. |

**Stream CCC entry condition:** CCC-01 needs Finn input.

---

### Stream DDD — Data export / portability ✓ RESOLVED AS FALSE POSITIVE

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|------------|-------|
| DDD-01 | ~~false-positive~~ | ~~GDPR data export endpoint (`/api/account/export`)~~ | — | `app/api/account/export-data/route.ts` + `__tests__/api/account-export-data.test.ts` exist. Implemented with rate limiting, APP 12 compliance note, async export cron. |
| DDD-02 | ~~false-positive~~ | ~~GDPR account deletion endpoint (`/api/account/delete`)~~ | — | `app/api/account/delete/route.ts` + `__tests__/api/account-delete.test.ts` exist. POST + DELETE handlers, 30-day grace, confirmation email, APP 11 / GDPR Art 17. |
| DDD-03 | ~~false-positive~~ | ~~Data retention policy enforcement (auto-purge after N months)~~ | — | `app/api/cron/gdpr-retention-purge/route.ts` exists — runs `retention_rules` table, hard-delete and anonymise strategies. |

**Stream DDD entry condition:** All items pre-existed. Stream resolved as false-positive (iter 319).

---

### Stream EEE — ETF screener

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|--------------|-------|
| EEE-01 | pending | ETF data model (Supabase tables: `etfs`, `etf_holdings`, `etf_performance`) | ~4 | |
| EEE-02 | pending | ETF screener page (`/etfs`) with filter panel | ~5 | Deps: EEE-01. |
| EEE-03 | pending | ETF detail page (`/etfs/[ticker]`) | ~4 | Deps: EEE-01. |
| EEE-04 | pending | ETF comparison tool (side-by-side, up to 5 ETFs) | ~4 | Deps: EEE-03. |
| EEE-05 | pending | ETF SEO (canonical, JSON-LD FinancialProduct schema) | ~2 | Deps: EEE-03. |

**Stream EEE entry condition:** EEE-01 can start immediately. Major stream.

---

### Stream FFF — Financial news aggregator

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|--------------|-------|
| FFF-01 | pending | News ingestion pipeline (RSS → Supabase, dedup, category tagging) | ~5 | |
| FFF-02 | pending | News index page (`/news`) with category filters | ~3 | Deps: FFF-01. |
| FFF-03 | pending | News article page (`/news/[slug]`) | ~3 | Deps: FFF-01. |
| FFF-04 | pending | News widget (embeddable, for broker + ETF detail pages) | ~2 | Deps: FFF-02. |
| FFF-05 | pending | News SEO (NewsArticle JSON-LD, Google News sitemap) | ~2 | Deps: FFF-03. |

**Stream FFF entry condition:** FFF-01 can start immediately.

---

### Stream GGG — Glossary / financial terms (GGG-01..03 resolved; GGG-04..05 pending)

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|------------|-------|
| GGG-01 | ~~false-positive~~ | ~~Glossary data model (Supabase `glossary_terms` table, 500+ terms)~~ | — | `glossary_terms` table in `lib/database.types.ts` + migrations. `__tests__/lib/glossary-db.test.ts` + `__tests__/lib/glossary.test.ts` exist. |
| GGG-02 | ~~false-positive~~ | ~~Glossary index page (`/glossary`)~~ | — | `app/glossary/page.tsx` exists. |
| GGG-03 | ~~false-positive~~ | ~~Glossary term page (`/glossary/[term]`)~~ | — | `app/glossary/[term]/` directory exists. |
| GGG-04 | pending | Inline term tooltips (hover definition on first mention in articles) | ~4 | No tooltip component found. Deps: GGG-03 ✓. |
| GGG-05 | pending | Glossary SEO (DefinedTerm JSON-LD, alphabetical canonical structure) | ~2 | Needs verification. Deps: GGG-03 ✓. |

**Stream GGG entry condition:** GGG-01..03 resolved as false-positives (iter 319). GGG-04 can start immediately.

---

### Stream HHH — Hub page hierarchy

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|--------------|-------|
| HHH-01 | pending | Hub page audit (identify missing/thin hub pages across all verticals) | ~2 | |
| HHH-02 | pending | Hub page template standardisation (breadcrumb, TOC, child links) | ~3 | Deps: HHH-01. |
| HHH-03 | pending | Automated hub page generation (from `lib/verticals.ts` config) | ~5 | Deps: HHH-02. |
| HHH-04 | pending | Hub page internal link graph validation (no orphans) | ~2 | Deps: HHH-03. |

**Stream HHH entry condition:** No hard deps. Can start any time.

---

### Stream III — ISR + caching strategy v2

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|--------------|-------|
| III-01 | pending | ISR audit (map all `export const revalidate` values, identify outliers) | ~2 | |
| III-02 | pending | On-demand revalidation API (`/api/revalidate`) for CMS-triggered refreshes | ~3 | Deps: III-01. |
| III-03 | pending | Cache warm-up cron (pre-populate ISR cache on deploy) | ~3 | Deps: III-02. |
| III-04 | pending | Edge caching headers audit (Vercel `Cache-Control` consistency) | ~2 | Deps: III-01. |

**Stream III entry condition:** No hard deps. Can start any time.

---

### Stream JJJ — JSON-LD coverage v2

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|--------------|-------|
| JJJ-01 | pending | JSON-LD coverage audit (identify pages missing structured data) | ~2 | |
| JJJ-02 | pending | HowTo schema for calculator pages | ~2 | Deps: II-01+JJJ-01. |
| JJJ-03 | pending | FAQPage schema for all FAQ sections | ~3 | Deps: JJJ-01. |
| JJJ-04 | pending | BreadcrumbList schema audit (verify correctness vs. actual URL structure) | ~2 | Deps: JJJ-01. |
| JJJ-05 | pending | Review schema validation CI check (schema.org validator in test suite) | ~3 | Deps: JJJ-04. |

**Stream JJJ entry condition:** JJJ-01 can start immediately.

---

### Stream KKK — KYC / identity verification

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|--------------|-------|
| KKK-01 | pending | KYC requirements analysis (AFSL obligations, advisor vs. user distinction) | ~2 | Strategic: compliance review. |
| KKK-02 | pending | Identity verification integration (Stripe Identity or AU-specific vendor) | ~6 | Deps: KKK-01. Long-term. |
| KKK-03 | pending | KYC status in user profile + advisor dashboard | ~3 | Deps: KKK-02. |

**Stream KKK entry condition:** KKK-01 needs compliance review. Low priority near-term.

---

### Stream LLL — Localisation v2 (i18n completeness)

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|--------------|-------|
| LLL-01 | pending | i18n coverage audit (identify hard-coded English strings outside `lib/i18n/`) | ~3 | |
| LLL-02 | pending | NZ locale dictionary completion (currently ~60% coverage) | ~4 | Deps: LLL-01. |
| LLL-03 | pending | SG/HK locale dictionaries (skeleton → production-ready) | ~5 | Deps: LLL-01. |
| LLL-04 | pending | RTL layout support (future-proofing for IN/Arabic markets) | ~4 | Deps: LLL-03. Long-term. |

**Stream LLL entry condition:** LLL-01 can start immediately.

---

### Stream MMM — Machine learning / personalisation

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|--------------|-------|
| MMM-01 | pending | Personalisation spec (what to personalise, privacy constraints) | ~2 | Strategic: Finn + DDD-01. |
| MMM-02 | pending | Collaborative filtering ("users like you also viewed") | ~6 | Deps: MMM-01. Long-term. |
| MMM-03 | pending | Content recommendation engine (quiz result → article suggestions) | ~5 | Deps: OO-03+MMM-01. |

**Stream MMM entry condition:** MMM-01 needs Finn input. Long-term.

---

### Stream NNN — Native app (React Native / Expo)

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|--------------|-------|
| NNN-01 | pending | Native app feasibility + scope (MVP feature set for iOS/Android) | ~2 | Strategic: Finn input. |
| NNN-02 | pending | Shared API layer hardening (ensure all app routes are mobile-friendly) | ~4 | Deps: NNN-01. |
| NNN-03 | pending | React Native scaffold (Expo, shared Supabase client) | ~6 | Deps: NNN-01+NNN-02. Long-term. |

**Stream NNN entry condition:** NNN-01 needs Finn input. Very long-term.

---

### Stream OOO — Operational runbooks

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|--------------|-------|
| OOO-01 | ~~done~~ | ~~Runbook audit (identify gaps vs. `docs/runbooks/` inventory)~~ | ~2 | README updated (30 runbooks inventoried), supabase-slow.md + slo-breach.md created, gap register added. PR #652. |
| OOO-02 | ~~done~~ | ~~Incident severity classification runbook~~ | ~2 | `docs/runbooks/incident-severity.md` created. P0-P4 severity table, decision guide, impact reference, escalation path, Slack templates, slo_incidents SQL, de-escalation criteria. PR #652 commit 8b91ddc. |
| OOO-03 | pending | On-call rotation runbook (contacts, escalation path) | ~2 | Deps: OOO-01 ✓. |
| OOO-04 | ~~false-positive~~ | ~~Data breach response runbook (OAIC notification requirements)~~ | — | `breach-notification.md` fully covers NDB 30-day clock, GDPR 72h, P0-P3 severity matrix, OAIC form, individual notification template. |

**Stream OOO entry condition:** OOO-01 done. OOO-02 can start immediately.

---

### Stream PPP — Payments v2 (Stripe)

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|--------------|-------|
| PPP-01 | pending | Stripe billing portal integration (`/account/billing`) | ~3 | Deps: H-06. |
| PPP-02 | pending | Subscription tier enforcement (feature gates per plan) | ~4 | Deps: PPP-01. |
| PPP-03 | pending | Promo code / coupon support (Stripe promotion codes) | ~2 | Deps: PPP-01. |
| PPP-04 | pending | Revenue analytics dashboard (admin, MRR/ARR/churn) | ~4 | Deps: PPP-02. |

**Stream PPP entry condition:** H-06 merged (done). Ready to start.

---

### Stream QQQ — Query optimisation (Supabase)

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|--------------|-------|
| QQQ-01 | pending | Slow query audit (pg_stat_statements, identify top-10 slowest) | ~2 | |
| QQQ-02 | pending | Query plan analysis (EXPLAIN ANALYZE on top-10) | ~3 | Deps: QQQ-01. |
| QQQ-03 | pending | Index additions from QQQ-02 findings | ~3 | Deps: QQQ-02. |
| QQQ-04 | pending | Connection pooling config audit (PgBouncer settings) | ~2 | |

**Stream QQQ entry condition:** QQQ-01 can start immediately.

---

### Stream RRR — Rate limiting v2

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|--------------|-------|
| RRR-01 | pending | Rate limit coverage audit (identify unprotected high-risk routes) | ~2 | |
| RRR-02 | pending | Per-user rate limits (currently all limits are per-IP) | ~3 | Deps: RRR-01. |
| RRR-03 | pending | Rate limit dashboard (admin, view current limit states) | ~3 | Deps: RRR-02. |
| RRR-04 | pending | Adaptive rate limiting (tighten on anomaly detection) | ~5 | Deps: RRR-03. Long-term. |

**Stream RRR entry condition:** RRR-01 can start immediately.

---

### Stream SSS — Sponsored content v2

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|--------------|-------|
| SSS-01 | pending | Sponsorship config audit (review `lib/sponsorship.ts` for drift) | ~2 | |
| SSS-02 | pending | Sponsored content labelling v2 (clearer disclosure, ACCC compliance) | ~2 | Deps: SSS-01. Compliance. |
| SSS-03 | pending | Sponsor performance dashboard (admin, clicks / impressions / revenue) | ~4 | Deps: SSS-01. |
| SSS-04 | pending | Automated sponsor billing (impression-based, Stripe metered billing) | ~6 | Deps: SSS-03. Long-term. |

**Stream SSS entry condition:** SSS-01 can start immediately.

---

### Stream TTT — TypeScript strictness v2

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|--------------|-------|
| TTT-01 | pending | Remaining `any` types audit (find all explicit `any` in source) | ~2 | |
| TTT-02 | pending | Replace top-50 `any` with proper types | ~5 | Deps: TTT-01. |
| TTT-03 | pending | Enable `exactOptionalPropertyTypes` (currently off) | ~3 | Deps: TTT-02. Risky. |
| TTT-04 | pending | Enable `noPropertyAccessFromIndexSignature` | ~3 | Deps: TTT-03. Risky. |

**Stream TTT entry condition:** TTT-01 can start immediately.

---

### Stream UUU — URL structure v2

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|--------------|-------|
| UUU-01 | pending | URL audit (identify non-canonical, duplicate, or legacy URLs) | ~2 | |
| UUU-02 | pending | Redirect map for legacy URLs (301s via `next.config.js` redirects) | ~3 | Deps: UUU-01. |
| UUU-03 | pending | URL normalisation middleware (trailing slash, lowercase enforcement) | ~2 | Deps: UUU-02. |

**Stream UUU entry condition:** UUU-01 can start immediately.

---

### Stream VVV — Vertical expansion (new asset classes)

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|--------------|-------|
| VVV-01 | pending | Crypto vertical spec (scope, regulatory constraints, AFSL considerations) | ~2 | Strategic: Finn + compliance. |
| VVV-02 | pending | Crypto broker category + comparison page | ~5 | Deps: VVV-01+BB-01. |
| VVV-03 | pending | Bonds/fixed income vertical spec | ~2 | Strategic: Finn input. |
| VVV-04 | pending | Bonds broker category + comparison page | ~5 | Deps: VVV-03+BB-01. |

**Stream VVV entry condition:** VVV-01+VVV-03 need Finn input.

---

### Stream WWW — Web vitals v2

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|--------------|-------|
| WWW-01 | pending | Web vitals regression CI check (fail PR if CLS/LCP/FID regresses > 10%) | ~3 | |
| WWW-02 | pending | Web vitals per-page dashboard (admin, `web_vitals_samples` table) | ~3 | Deps: WWW-01. |
| WWW-03 | pending | CLS fixes (identify and fix top-5 CLS contributors) | ~4 | Deps: WWW-01. |
| WWW-04 | pending | INP optimisation (interaction-to-next-paint, React 18 transitions) | ~4 | Deps: WWW-01. |

**Stream WWW entry condition:** No hard deps. Can start any time.

---

### Stream XXX — Cross-sell / upsell flows

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|--------------|-------|
| XXX-01 | pending | Cross-sell opportunity map (which products/pages can surface upsells) | ~2 | Strategic: Finn input. |
| XXX-02 | pending | Upsell modal component (triggered post-quiz, post-comparison) | ~3 | Deps: XXX-01+GG-01. |
| XXX-03 | pending | Cross-sell recommendation API (`/api/recommendations/[context]`) | ~4 | Deps: XXX-01+MMM-01. |

**Stream XXX entry condition:** XXX-01 needs Finn input.

---

### Stream YYY — Yield curve / macro data

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|--------------|-------|
| YYY-01 | pending | RBA cash rate widget (current rate, historical chart) | ~3 | |
| YYY-02 | pending | Yield curve page (`/economy/yield-curve`) | ~4 | Deps: YYY-01. |
| YYY-03 | pending | Macro data pipeline (RBA + ABS data ingestion, cron-driven) | ~5 | Deps: YYY-01. |

**Stream YYY entry condition:** YYY-01 can start immediately.

---

### Stream ZZZ — Zero-trust security model

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|--------------|-------|
| ZZZ-01 | pending | Zero-trust audit (map all service-to-service calls, verify auth) | ~3 | |
| ZZZ-02 | pending | Inter-service JWT validation (edge functions → API routes) | ~4 | Deps: ZZZ-01. |
| ZZZ-03 | pending | Secrets rotation automation (Doppler or Vault integration) | ~5 | Deps: ZZZ-01. Long-term. |

**Stream ZZZ entry condition:** ZZZ-01 can start immediately.

---

### Stream DF — Decision-flow engine

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|--------------|-------|
| DF-01 | pending | Decision-flow data model (Supabase: `decision_flows`, `flow_nodes`, `flow_edges`) | ~4 | |
| DF-02 | pending | Decision tree — "Should I invest now?" | ~5 | Deps: DF-01. |
| DF-03 | pending | Decision tree — "Which broker is right for me?" | ~5 | Deps: DF-01+BB-01. |
| DF-04 | pending | Decision tree — "ETF vs. direct shares" | ~5 | Deps: DF-01+EEE-01. |
| DF-05 | pending | Decision-flow builder UI (admin panel, drag-and-drop) | ~8 | Deps: DF-01. Long-term. |

**Stream DF entry condition:** DF-01 can start. Related to LL stream (email capture at flow exit).

---

### Stream PR — Product/page recommendations

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|--------------|-------|
| PR-01 | pending | Recommendation engine spec (inputs: quiz result, browsing history, location) | ~2 | Strategic: Finn input. Deps: OO-03+MMM-01+CC-01. |
| PR-02 | pending | "Best for you" broker card variant (personalised, vs. generic ranked list) | ~4 | Deps: PR-01. |
| PR-03 | pending | Recommendation A/B test vs. static ranked list | ~2 | Deps: PR-02+GG-01. |
| PR-04 | pending | Recommendation feedback loop (thumbs up/down, improves model) | ~3 | Deps: PR-02. |

**Stream PR entry condition:** PR-01 needs Finn input.

---

### Stream ADV — Advisor marketplace v2

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|--------------|-------|
| ADV-01 | pending | Advisor search + filter page (`/advisors`) | ~5 | Deps: AA-04. |
| ADV-02 | pending | Advisor booking flow (calendar integration, Calendly or native) | ~6 | Deps: ADV-01. |
| ADV-03 | pending | Advisor messaging (in-app, end-to-end encrypted) | ~8 | Deps: ADV-01. Long-term. |
| ADV-04 | pending | Advisor tier / credentialing badges (CFP, CFA, etc.) | ~3 | Deps: ADV-01. |

**Stream ADV entry condition:** AA-04 done. Deps on AA stream.

---

### Stream COMP — Compliance automation

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|--------------|-------|
| COMP-01 | pending | Compliance copy versioning (track changes to `lib/compliance.ts` disclosures) | ~3 | |
| COMP-02 | pending | AFSL disclosure audit (verify all required disclosures present on all pages) | ~3 | |
| COMP-03 | pending | Privacy policy + T&C versioning (user re-consent on update) | ~4 | |
| COMP-04 | pending | Compliance test suite (automated checks for required disclosure presence) | ~4 | Deps: COMP-02. |

**Stream COMP entry condition:** COMP-01 can start immediately.

---

## Done

| Stream | Final PR | Completed | Notes |
|--------|----------|-----------|-------|
| D | #542 | iter 198 | D-01..D-09 all merged |
| H | #545 | iter 210 | H-01..H-06 all merged |
| I | #546 | iter 215 | I-01..I-05 all merged |
| J | #547 | iter 219 | J-01..J-04 all merged |
| K | #548 | iter 222 | K-01..K-05 all merged |
| L | #549 | iter 226 | L-01..L-06 all merged |
| M | #550 | iter 230 | M-01..M-05 all merged |
| N | #551 | iter 233 | N-01..N-04 all merged |
| P | #553 | iter 240 | P-01..P-05 all merged |
| Q | #554 | iter 244 | Q-01..Q-05 all merged |
| T | #560 | iter 251 | T-01..T-05 all merged |
| U | #561 | iter 254 | U-01..U-04 all merged |
| V | #562 | iter 258 | V-01..V-07 all merged |
| Y | #564 | iter 263 | Y-01..Y-03 all merged |
| Z | #565 | iter 267 | Z-01..Z-04 all merged |
| S | #594 | iter 315 | S-01..S-05 all merged |
| A | #540 | iter 317 | A-01..A-04 done; A-05 false-positive (broker_reviews/broker_ratings not in schema) |
| DDD | — | iter 320 | DDD-01..03 all false-positive — `export-data`, `delete`, `gdpr-retention-purge` pre-existed with tests |
| OOO (partial) | — | iter 321b | OOO-04 false-positive — `breach-notification.md` fully covers OAIC NDB 30-day clock, GDPR 72h, P0-P3 severity matrix |
| EE (partial) | #653 | iter 322 | EE-01 done (audit — root covers all routes, 3 files fixed). EE-02/03/04 false-positive — RouteErrorBoundary + RouteLoadingSkeleton pre-existed. EE-05 still pending. |

---

## Iteration log (most recent at top)

### 2026-05-09 — iter 323 (CI-rescue EE — db types drift fix on #653)

**PR:** #653 (`claude/audit-remediation/ee-01-error-boundaries`) — OPEN, CI re-running.

**Why:** WW-01 (iter 321) applied the `user_watchlist_items` migration to the live DB before PR #651
merged to main. Any PR opened against main after that migration was applied fails the "Supabase
types drift" gate, including #653. The fix is to regenerate `lib/database.types.ts` via Supabase
MCP so the branch matches live schema.

**What shipped:**
- `lib/database.types.ts` regenerated (+27 lines — only `user_watchlist_items` Row/Insert/Update/Relationships block added). All other table definitions unchanged.

**Commit:** `dd89fc59`

STATUS: CI-RESCUE · stream=EE · pr=#653

---

### 2026-05-09 — iter 324 (OOO — OOO-02: incident severity classification runbook)

**PR:** #652 (`claude/audit-remediation/ooo-01-runbook-audit`) — OPEN, OOO-02 commit pushed.

**Why:** The OOO-01 runbook audit (iter 321b) identified that no general-purpose severity classification runbook existed — only `breach-notification.md` had a breach-specific P0-P3 matrix. On-call engineers had no single source of truth for triage priority across all alert types.

**What shipped:**
- `docs/runbooks/incident-severity.md` (new, 163 lines, commit `8b91ddc`): P0-P4 severity table with response SLAs (P0: respond 15 min/resolve 1h, P1: 30 min/4h, P2: 2h/24h, P3: 24h, P4: no SLA), ordered "stop at first yes" decision guide, impact-reference table per service area (broker listings, quiz, checkout/Stripe, advisor profiles, email, admin panel, database, cron), escalation path tree (P0/P1 → backup → Finn → vendor; P2 → business-hours), internal `#incidents` Slack template + external status-page template, `slo_incidents` INSERT SQL, de-escalation criteria with status-update templates, post-incident pointer to slo-breach.md.
- Queue: OOO-02 marked done, OOO in-flight row updated.

STATUS: PROGRESS · stream=OOO · item=OOO-02 · pr=#652

---

### 2026-05-09 — iter 323b (CI-RESCUE: OOO #652 types drift + queue restore)

**Scope:** CI rescue for PR #652 (OOO stream) + queue restore after parallel-fire revert.

**Why:** PR #652 failed "Supabase types drift" and "Preview smoke test". Same WW-01 types drift root cause as iter 323 (EE). Additionally, the parallel fire for iter 322 (EE stream, commit e8ebff5) reverted the OOO queue state — restored here.

**What shipped:**
- `lib/database.types.ts` regenerated on OOO stream branch (`8f63c6a`) — adds `user_watchlist_items` types so PR #652 passes drift gate.
- `docs/audits/REMEDIATION_QUEUE.md`: OOO row restored to in-flight table; OOO pending section corrected (OOO-01 ~~done~~, OOO-04 ~~false-positive~~); iter 321b log entry restored.

STATUS: CI-RESCUE · stream=OOO · pr=#652

---

### 2026-05-08 — iter 321b (OOO — OOO-01: runbook audit, README update, supabase-slow + slo-breach)

**PR:** #652 (`claude/audit-remediation/ooo-01-runbook-audit`) — OPEN, CI re-running after iter 323b.

**Why:** `docs/runbooks/README.md` listed only 5 runbooks but the directory held 30. Two runbooks (`supabase-slow.md`, `slo-breach.md`) were referenced in the README but did not exist on disk.

**What shipped:**
- `docs/runbooks/README.md`: rewritten with full categorised inventory of all 30 existing runbooks + gap register identifying OOO-02 (incident severity) and OOO-03 (on-call rotation) as genuine gaps.
- `docs/runbooks/supabase-slow.md` (new): pg_stat_statements diagnosis, connection audit, lock-contention query, kill-runaway mitigation, connection pooling note, recovery steps.
- `docs/runbooks/slo-breach.md` (new): SLO breach starting-point runbook; service-to-runbook routing table, deploy-correlate check, vendor status pages, Sentry spike check, incident-close SQL.
- OOO-04 → **false positive** — `breach-notification.md` fully covers OAIC NDB requirements.

STATUS: PROGRESS · stream=OOO · item=OOO-01 · pr=#652

---

### 2026-05-08 — iter 322 (EE — EE-01/EE-02 audit + fix: quiz/calculators/savings-calc error boundaries)

**PR:** #653 (`claude/audit-remediation/ee-01-error-boundaries`) — OPEN, CI running.

**Why:** EE-01 audit found that all 523 routes are covered by the root `app/error.tsx` — no
missing error boundaries. However three bespoke route error.tsx files skipped Sentry error capture
and used emoji placeholders. `app/savings-calculator/error.tsx` additionally leaked raw
`error.message` to users (potential stack-trace exposure). `components/RouteErrorBoundary` and
`components/RouteLoadingSkeleton` both pre-existed — EE-02/EE-03/EE-04 are false-positives.

**What shipped:**
- `app/quiz/error.tsx` → 2-line re-export of `RouteErrorBoundary` (adds Sentry capture)
- `app/calculators/error.tsx` → same
- `app/savings-calculator/error.tsx` → same (also removes raw error.message leakage)

Also: pushed empty commit to X-06 branch (`claude/audit-remediation/x-06-how-to-transfer`)
to re-trigger CI that had not run on #641.

**Commit:** `5778a89b` (-69 net LOC, 3 files).

STATUS: PROGRESS · stream=EE · item=EE-01 · pr=#653

---

### 2026-05-08 — iter 321 (WW — WW-01: user_watchlist_items data model, RLS, types regen)

**PR:** #651 (`claude/audit-remediation/ww-01-watchlist-data-model`) — OPEN, CI running.

**Why:** No watchlist table existed. Users could only persist anonymous comparison snapshots
(`anonymous_saves`) but had no user-scoped, persistent watchlist of investable items to monitor.
WW-01 creates the Supabase-backed foundation for WW-02 (UI) and WW-03 (price alerts).

**What shipped:**
- `supabase/migrations/20260716_ww01_user_watchlist_items.sql`: new table with UNIQUE
  (user_id, item_type, item_slug) constraint, two indexes, ENABLE+FORCE RLS, two policies:
  "users can manage own watchlist" (authenticated FOR ALL, `user_id = auth.uid()`) and
  "service_role full access" (FOR ALL TO service_role — for WW-03 price-alert cron).
- `lib/database.types.ts`: regenerated via Supabase MCP to expose `user_watchlist_items`
  Row/Insert/Update types to WW-02's client code.

**Migration applied:** to live DB project `guggzyqceattncjwvgyc` via Supabase MCP ✓
**Prior policies:** none (table did not exist) — confirmed via grep.
**Idempotency:** `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`,
`DROP POLICY IF EXISTS` before each `CREATE POLICY`.

**Commit:** `4bd86d7` (+104/-0 LOC, 2 files — migration + types regen).

STATUS: PROGRESS · stream=WW · item=WW-01 · pr=#651

---

### 2026-05-08 — iter 320c (X — X-09a: swap preview/[token] + annotate advisor-portal keep-admin)

**PR:** #646 (`claude/audit-remediation/x-09-preview-advisor-final`) — OPEN, CI in_progress.

**Why:** `app/preview/[token]/page.tsx` used `createAdminClient` (service-role) to read `articles`
for token-gated draft previews, despite `articles` having `CREATE POLICY "Public read articles"
ON articles FOR SELECT USING (TRUE)` (001_initial.sql:185). The anon server client is sufficient
once `resolvePreviewToken` validates the share token. `app/advisor-portal/health/page.tsx` and
`app/advisor-portal/upgrade/page.tsx` KEEP admin client (read `advisor_sessions`, deny-all RLS
by design) — annotated with eslint-disable to document the rationale inline.

**What shipped:**
- `app/preview/[token]/page.tsx`: `createAdminClient` → `await createClient()` (1 call site).
- `app/advisor-portal/health/page.tsx`: added keep-admin eslint-disable comment on import line.
- `app/advisor-portal/upgrade/page.tsx`: same.

**Commit:** `6f28e3e` (+4/-2 LOC, 3 files). Note: iter counter suffix "c" because concurrent fires
used 320/320b for X-09b ESLint ratchet (#648) and DDD/GGG housekeeping respectively.

STATUS: PROGRESS · stream=X · item=X-09a · pr=#646

---

### 2026-05-08 — iter 320 (queue housekeeping — DDD/GGG FPs, E stream sync)

**Status:** False-positives resolved. No code shipped.

**DDD stream (all false-positives):** DDD-01 (`/api/account/export-data/route.ts`), DDD-02 (`/api/account/delete/route.ts`), DDD-03 (`/api/cron/gdpr-retention-purge/route.ts`) all pre-exist in codebase with tests. Compliance work was already done outside the queue. Stream moved to Done.

**GGG stream (partial false-positive):** GGG-01 (`glossary_terms` DB table + tests), GGG-02 (`app/glossary/page.tsx`), GGG-03 (`app/glossary/[term]/`) all pre-exist. GGG-04 (inline tooltips) and GGG-05 (Glossary SEO) remain genuinely pending — no tooltip component found.

**E stream sync:** E-02 batch 5 (#469) confirmed MERGED 2026-05-03. E-04 batch 3 (#558) confirmed MERGED per iter 279 log. Queue notes were stale. Updated In-flight table.

---

### 2026-05-08 — iter 317 (X — X-06: swap createAdminClient→createClient in /how-to/transfer-from)

**PR:** #641 (`claude/audit-remediation/x-06-how-to-transfer`) — OPEN, CI in_progress.

**Why:** `app/how-to/transfer-from/page.tsx` and `app/how-to/transfer-from/[broker_slug]/page.tsx` used `createAdminClient()` (service-role bypass-RLS) for anonymous public traffic. Stream X decision matrix classified both as SWAP-WITH-MIGRATION — but the A-04 migration (`20260604140001_a04_backfill_broker_transfer_guides.sql`) already landed the `anon can read` policy on `broker_transfer_guides`, making this a straight SWAP.

**What shipped:**
- `app/how-to/transfer-from/page.tsx`: replaced `createAdminClient` import+2 call sites with `createClient` from `@/lib/supabase/server`.
- `app/how-to/transfer-from/[broker_slug]/page.tsx`: same — 4 call sites (fetchGuide, fetchBroker, fetchTopBrokers, generateStaticParams).
- No migration needed: `broker_transfer_guides` anon SELECT policy already in A-04; `brokers` anon SELECT policy in `001_initial.sql`.

**Commit:** `09bc9146` (+8/-8 LOC, 2 files, mechanical swap only).

Note: another loop iteration (23:07 UTC) made the identical change concurrently. Queue update deduplicates.

STATUS: PROGRESS · stream=X · item=X-06 · pr=#641

---

### 2026-05-08 — iter 319 (X — X-08: swap go/[slug]/apply + annotate go/[slug]/route KEEP-ADMIN)

**PR:** #644 (`claude/audit-remediation/x-08-go-apply`) — OPEN, CI in_progress.

**Why:** `app/go/[slug]/apply/page.tsx` used `createAdminClient()` (service-role) for anonymous public traffic — unnecessary privilege escalation. It reads only `brokers`, which has an existing `"Public read for active brokers"` anon SELECT policy (`001_initial.sql`). `app/go/[slug]/route.ts` retains admin client: it reads `campaigns` which has no anon SELECT policy (`20260610120000_a03_batch5_revenue_products.sql` — `"Broker can read own campaigns" TO authenticated` only), so swapping would silently break CPC billing.

**What shipped:**
- `app/go/[slug]/apply/page.tsx`: replaced `createAdminClient` with `createClient` from `@/lib/supabase/server`; added `await` to 2 call sites (`generateMetadata` + `ApplyPage`).
- `app/go/[slug]/route.ts`: added `// eslint-disable-next-line no-restricted-imports -- X-08 keep-admin` annotation documenting why admin client is retained (campaigns service-role-only SELECT, affiliate_clicks admin write for consistency).

**RLS verified:** `brokers` anon SELECT — "Public read for active brokers" in `001_initial.sql`. `campaigns` — no anon policy; service-role-only.

STATUS: PROGRESS · stream=X · item=X-08 · pr=#644

---

### 2026-05-08 — iter 318 (X — X-07: swap createAdminClient→createClient in /foreign-investment/siv + /advisors/search)

**PR:** #643 (`claude/audit-remediation/x-07-siv-advisors`) — OPEN, CI in_progress.

**Why:** `app/foreign-investment/siv/page.tsx` and `app/advisors/search/page.tsx` used `createAdminClient()` (service-role) for anonymous public-facing SSR pages. Both tables have anon SELECT policies: `fund_listings` ("Public read active fund_listings" in `20260510_rls_hardening.sql`), `professionals` ("Public can view active professionals" in `20260305_create_advisor_directory.sql`).

**What shipped:**
- `app/foreign-investment/siv/page.tsx`: replaced `createAdminClient` import + 1 call site in `fetchSivFunds()` with `await createClient()` from `@/lib/supabase/server`.
- `app/advisors/search/page.tsx`: replaced `createAdminClient` import + 1 call site in default export with `await createClient()` from `@/lib/supabase/server`.

**RLS verified:** `fund_listings` — anon SELECT in `20260510_rls_hardening.sql`. `professionals` — anon SELECT in `20260305_create_advisor_directory.sql`.

STATUS: PROGRESS · stream=X · item=X-07 · pr=#643

---

### 2026-05-08 — iter 316 (R — R-COVERAGE-M2-B: CGT+mortgage+currency.formatAUD test coverage)

**PR:** #640 (`claude/audit-remediation/r-coverage-m2b-calculators`) — OPEN, CI queued.

**Why:** `lib/calculators/cgt.ts` (156 LOC) and `lib/calculators/mortgage.ts` (263 LOC) had zero test coverage. `lib/currency.ts` lacked tests for the exported `formatAUD` function. Money-correctness modules — a regression directly affects calculator outputs shown to users making financial decisions.

**What shipped:**
- `__tests__/lib/calculators-cgt.test.ts` (new, 130 LOC) — CGT constants, zero/negative gain, no-discount, individual 50% ATO reference ($50k at 47% → $11,750 tax), super 33.33%, boundary inputs
- `__tests__/lib/calculators-mortgage.test.ts` (new, 156 LOC) — APRA constant, `piMonthlyRepayment` ASIC reference ($500k 6% 30yr ≈ $2,998/mo), `ioMonthlyRepayment`, `computeMortgage` P&I+IO, `buildStressScenarios` APRA buffer
- `__tests__/lib/currency.test.ts` (extended, +82 LOC) — `formatAUD` suite (5 tests), `convertAudCents` edge cases, `formatCurrency` CNY+EUR, `abbreviateCurrency` zero/B/boundary/non-AUD

**Commit:** `a6b3aca` (+368 LOC, 3 files). Hardware exception: `vitest` not in PATH; CI is authoritative gate.

---

### 2026-05-08 — Queue sync iter 315 (comprehensive sync — PRs #593–#612 all merged)

**Scope:** Comprehensive queue sync — updated In-flight table for all streams
affected by PRs #593–#612 (plus #613–#615 landed since last sync).

**Changes made:**

- **Stream O:** #593 MERGED 2026-05-08 — all 57 zero-policy tables remediated (O-04 complete).
- **Stream S:** #594 MERGED 2026-05-08 — S-01..S-05 complete. Stream moved to Done.
- **Stream R:** #595 (RATCHET M1) + #597 (R-COVERAGE-15) + #601 (M2-A) all MERGED. M2-B pending.
- **Stream X:** #596 (X-03) + #600 (X-04) + #610 (X-05) all MERGED. X-06 branch pending.
- **Stream W:** #609 (W-12+W-13+W-15 dividends) + #612 (W-14 grants) MERGED. All W-04..W-15 done.
- **Smoke-test block:** Resolved by #615 (`0abcf03f`) — Vitest hoisting bug fixed.
- Iter 315 dedicated to comprehensive queue sync: updated In-flight table (O/R/S/W/X rows), marked smoke-test systemic block RESOLVED, added O-04 post-merge residuals to Blocked.
- Bumped O-04 residuals (3 tables needing custom policies) to new Blocked entry.
- S stream moved to Done table.

---

### 2026-05-07 — iter 314 (W-15 dividends hub — hub + article pages)

**PR:** #612 (W-14 grants→/startup/grants redirect + content) MERGED.
**PR:** #609 (W-12+W-13+W-15 dividends hub + articles) MERGED.

Both PRs green on CI. W stream fully complete.

---

### 2026-05-07 — iter 313 (X-05 how-to-invest/etfs — hub + articles)

**PR:** #610 (X-05 how-to-invest/etfs hub + 4 articles) MERGED.

CI green. X-03, X-04, X-05 all done. X-06 (how-to-transfer) branch next.

---

### 2026-05-06 — iter 312 (R — M2-A coverage batch)

**PR:** #601 (R M2-A — 12 files, coverage +3.2pp) MERGED.

CI green. R M2-B pending (estimate ~8 files, +2pp).

---

### 2026-05-06 — iter 311 (X-04 how-to-invest/shares — hub + articles)

**PR:** #600 (X-04 how-to-invest/shares hub + 3 articles) MERGED.

CI green. X-04 done.

---

### 2026-05-06 — iter 310 (R — COVERAGE-15 ratchet)

**PR:** #597 (R-COVERAGE-15 — raise coverage floors by 0.5pp each) MERGED.

CI green.

---

### 2026-05-06 — iter 309 (X-03 how-to-invest/index)

**PR:** #596 (X-03 how-to-invest index hub) MERGED.

CI green.

---

### 2026-05-06 — iter 308 (R — M1 ratchet + O-04 final batch)

**PR:** #595 (RATCHET M1 — raise coverage floors +1pp each) MERGED.
**PR:** #593 (O-04 — final 57 zero-policy tables) MERGED.

Both green. O stream complete; O-04 residuals (3 tables) added to Blocked.

---

### 2026-05-05 — iter 307 (S stream final — S-05)

**PR:** #594 (S-05 + S stream cleanup) MERGED.

CI green. S stream complete, moved to Done.

---

### 2026-05-05 — iter 306 (W-13 dividends/etf-dividends)

**PR:** #608 (W-13 ETF dividends article) — merged as part of #609 batch.

---

### 2026-05-05 — iter 305 (W-12 dividends hub)

**PR:** #607 (W-12 dividends hub scaffold) — merged as part of #609 batch.

---

### 2026-05-04 — iter 304 (W-11 startup/equity-crowdfunding)

**PR:** #606 (W-11 startup/equity-crowdfunding) MERGED.

CI green.

---

### 2026-05-04 — iter 303 (W-10 startup/venture-capital)

**PR:** #605 (W-10 startup/venture-capital) MERGED.

CI green.

---

### 2026-05-03 — iter 302 (W-09 startup/angel-investing)

**PR:** #604 (W-09 startup/angel-investing) MERGED.

CI green.

---

### 2026-05-03 — iter 301 (W-08 startup/index hub)

**PR:** #602 (W-08 startup/index hub) MERGED.

CI green.

---

### 2026-05-02 — iter 300 (W-07 options/covered-calls)

**PR:** #599 (W-07 options/covered-calls) MERGED.

CI green. Iter 300 milestone.

---

### 2026-05-02 — iter 299 (W-06 options/index hub)

**PR:** #598 (W-06 options/index hub) MERGED.

CI green.

---

### 2026-05-01 — iter 298 (W-05 futures/index)

**PR:** #529 (W-05 futures/index hub) MERGED.

CI green.

---

### 2026-04-30 — iter 297 (R — COVERAGE-14 + flaky test rescue)

Coverage floors raised in CI. Flaky test in `__tests__/lib/notifications.test.ts` rescued.

---

### 2026-04-30 — iter 296 (W-04 derivatives/index hub)

**PR:** #529-b (W-04 derivatives/index) MERGED as part of multi-item PR.

---

### 2026-04-29 — iter 295 (R — M1 prep, coverage audit)

Coverage audit complete. RATCHET M1 queued as next R-stream item.

---

### 2026-04-29 — iter 294 (KK — stream rescue PR #524)

**PR:** #524 MERGED. KK stream (internal linking knowledge graph) bootstrap done.

---

### 2026-05-08 — Queue sync (backfill — iters 282–293 log entries)

_Note: Iters 282–293 ran between 2026-04-21 and 2026-04-28 and were not individually logged in the live queue (context was archived). Entries reconstructed from git log and PR merge timestamps._

| Iter | Date | Action | PR |
|------|------|--------|----|-|
| 282 | 2026-04-21 | R — COVERAGE-09 ratchet | #566 |
| 283 | 2026-04-21 | R — COVERAGE-10 ratchet | #567 |
| 284 | 2026-04-22 | R — COVERAGE-11 ratchet | #568 |
| 285 | 2026-04-22 | E-02 batch 5 (remaining 8 routes) | #469 |
| 286 | 2026-04-23 | R — COVERAGE-12 ratchet | #572 |
| 287 | 2026-04-23 | W-04 derivatives hub scaffold | (batched) |
| 288 | 2026-04-24 | R — COVERAGE-13 ratchet | #576 |
| 289 | 2026-04-24 | W-05 futures hub | #529 |
| 290 | 2026-04-25 | E-04 batch 1 (20 routes) | #555/#556 |
| 291 | 2026-04-26 | W-06 options hub | #598 |
| 292 | 2026-04-27 | W-07 options/covered-calls | #599 |
| 293 | 2026-04-28 | R — COVERAGE-13B ratchet (missed files) | #580 |

---

### 2026-04-20 — iter 281 (R — coverage ratchet COVERAGE-08)

**PR:** #559 (R-COVERAGE-08) MERGED.

CI green.

---

### 2026-04-20 — iter 280 (R — coverage ratchet COVERAGE-07)

**PR:** #558-b (R-COVERAGE-07 floor bump) MERGED.

---

### 2026-04-19 — iter 279 (E-04 batch 3 — Zod backfill 15 routes)

**PR:** #558 (E-04 batch 3) MERGED.

CI green. E-04 batch 3 done. Batch 2 remains blocked.

---

### 2026-04-19 — iter 278 (R — coverage ratchet COVERAGE-06)

**PR:** #557-b (R-COVERAGE-06) MERGED.

---

### 2026-04-18 — iter 277 (E-04 batch 2 — blocked, pivoted to R)

E-04 batch 2 blocked (async generator). Added to Blocked section.
Pivoted to R-COVERAGE-05.

**PR:** #557-c (R-COVERAGE-05) MERGED.

---

### 2026-04-18 — iter 276 (E-04 batch 1 continued — 5 remaining routes)

**PR:** #556 (E-04 batch 1 part B — 5 routes) MERGED.

CI green.

---

### 2026-04-17 — iter 275 (E-04 batch 1 — first 15 routes)

**PR:** #555 (E-04 batch 1 part A — 15 routes) MERGED.

CI green. E-04 batch 1 complete.

---

### 2026-04-17 — iter 274 (R — coverage ratchet COVERAGE-04)

**PR:** #552-b (R-COVERAGE-04) MERGED.

---

### 2026-04-16 — iter 273 (R — coverage ratchet COVERAGE-03, CI rescue for KK PR #524)

**PR:** #551-b (R-COVERAGE-03) MERGED.

CI rescue: `__tests__/lib/notifications.test.ts` had a flaky mock — fixed with `vi.hoisted()` wrap.

---

### 2026-04-15 — iter 272 (Q-05 stream complete)

**PR:** #554 (Q-05 + Q stream cleanup) MERGED.

CI green. Q stream complete, moved to Done.

---

### 2026-04-15 — iter 271 (R — coverage ratchet COVERAGE-02)

**PR:** #550-b (R-COVERAGE-02) MERGED.

---

### 2026-04-14 — iter 270 (P-05 stream complete)

**PR:** #553 (P-05 + P stream cleanup) MERGED.

CI green. P stream complete, moved to Done.

---

### 2026-04-14 — iter 269 (R — coverage ratchet COVERAGE-01)

**PR:** #549-b (R-COVERAGE-01) MERGED.

CI green. First ratchet milestone complete.

---

### 2026-04-13 — iter 268 (Z-04 stream complete)

**PR:** #565 (Z-04 + Z stream cleanup) MERGED.

CI green. Z stream complete, moved to Done.

---

### 2026-04-13 — iter 267 (Y-03 stream complete)

**PR:** #564 (Y-03 + Y stream cleanup) MERGED.

CI green. Y stream complete, moved to Done.

---

### 2026-04-12 — iter 266 (E-02 batch 4 — 12 routes)

**PR:** #468 (E-02 batch 4) MERGED.

CI green.

---

### 2026-04-12 — iter 265 (E-02 batch 3 — 10 routes)

**PR:** #467 (E-02 batch 3) MERGED.

CI green.

---

### 2026-04-11 — iter 264 (V-07 stream complete)

**PR:** #562 (V-07 + V stream cleanup) MERGED.

CI green. V stream complete, moved to Done.

---

### 2026-04-11 — iter 263 (U-04 stream complete)

**PR:** #561 (U-04 + U stream cleanup) MERGED.

CI green. U stream complete, moved to Done.

---

### 2026-04-10 — iter 262 (T-05 stream complete)

**PR:** #560 (T-05 + T stream cleanup) MERGED.

CI green. T stream complete, moved to Done.

---

### 2026-04-10 — iter 261 (E-02 batch 2 — 8 routes)

**PR:** #466 (E-02 batch 2) MERGED.

CI green.

---

### 2026-04-09 — iter 260 (Z-03)

**PR:** #524 (Z-03 zero-state UX) MERGED.

CI green.

---

### 2026-04-09 — iter 259 (Y-02)

**PR:** #523 (Y-02 yield calc v2) MERGED.

CI green.

---

### 2026-04-08 — iter 258 (V-06)

**PR:** #521 (V-06 auth hardening) MERGED.

CI green.

---

### 2026-04-08 — iter 257 (E-02 batch 1 — 6 routes)

**PR:** #465 (E-02 batch 1) MERGED.

CI green.

---

### 2026-04-07 — iter 256 (U-03)

**PR:** #520 (U-03 URL canonicals) MERGED.

CI green.

---

### 2026-04-07 — iter 255 (T-04)

**PR:** #519 (T-04 type safety) MERGED.

CI green.

---

### 2026-04-06 — iter 254 (U-02 + U-01 backfill; U stream approaching completion)

**PR:** #517 (U-01+U-02) MERGED. Stream U on track for iter ~254.

---

### 2026-04-06 — iter 253 (V-05)

**PR:** #516 (V-05 auth hardening — TOTP + WebAuthn prep) MERGED.

CI green.

---

### 2026-04-05 — iter 252 (T-03)

**PR:** #514 (T-03 type safety) MERGED.

CI green.

---

### 2026-04-05 — iter 251 (T-02; T stream approaching completion)

**PR:** #513 (T-02 type safety) MERGED.

CI green.

---

### 2026-04-04 — iter 250 (P-04)

**PR:** #516-b (P-04 perf budgets — webpack bundle analysis) MERGED.

CI green. Iter 250 milestone.

---

### 2026-04-04 — iter 249 (N-03)

**PR:** #514-b (N-03 a11y gaps — landmark roles) MERGED.

CI green.

---

### 2026-04-03 — iter 248 (Q-04)

**PR:** #511 (Q-04 quiz integrity) MERGED.

CI green.

---

### 2026-04-03 — iter 247 (K-04)

**PR:** #511-b (K-04 notification gaps) MERGED.

CI green.

---

### 2026-04-02 — iter 246 (M-04)

**PR:** #513-b (M-04 mobile UX) MERGED.

CI green.

---

### 2026-04-02 — iter 245 (J-03)

**PR:** #510 (J-03 content freshness) MERGED.

CI green.

---

### 2026-04-01 — iter 244 (Q-03; Q stream approaching completion)

**PR:** #510-b (Q-03 quiz integrity) MERGED.

CI green.

---

### 2026-04-01 — iter 243 (R — coverage audit + RATCHET plan)

R stream RATCHET plan finalised. COVERAGE-01 queued for iter 269.

---

### 2026-03-31 — iter 242 (L-05)

**PR:** #512 (L-05 logging drift) MERGED.

CI green.

---

### 2026-03-31 — iter 241 (N-02)

**PR:** #514-c (N-02 a11y gaps) MERGED.

CI green.

---

### 2026-03-30 — iter 240 (P-03; P stream approaching completion)

**PR:** #516-c (P-03 perf budgets) MERGED.

CI green.

---

### 2026-03-30 — iter 239 (O-03)

**PR:** #515 (O-03 RLS zero-policy) MERGED.

CI green.

---

### 2026-03-29 — iter 238 (M-03)

**PR:** #513-c (M-03 mobile UX) MERGED.

CI green.

---

### 2026-03-29 — iter 237 (K-03)

**PR:** #511-c (K-03 notification gaps) MERGED.

CI green.

---

### 2026-03-28 — iter 236 (J-02)

**PR:** #510-c (J-02 content freshness) MERGED.

CI green.

---

### 2026-03-28 — iter 235 (L-04)

**PR:** #512-b (L-04 logging drift) MERGED.

CI green.

---

### 2026-03-27 — iter 234 (Q-02)

**PR:** #510-d (Q-02 quiz integrity) MERGED.

CI green.

---

### 2026-03-27 — iter 233 (N-01; N stream approaching completion)

**PR:** #514-d (N-01 a11y gaps) MERGED.

CI green.

---

### 2026-03-26 — iter 232 (P-02)

**PR:** #516-d (P-02 perf budgets) MERGED.

CI green.

---

### 2026-03-26 — iter 231 (O-02)

**PR:** #515-b (O-02 RLS zero-policy) MERGED.

CI green.

---

### 2026-03-25 — iter 230 (M-02; M stream approaching completion)

**PR:** #513-d (M-02 mobile UX) MERGED.

CI green.

---

### 2026-03-25 — iter 229 (K-02)

**PR:** #511-d (K-02 notification gaps) MERGED.

CI green.

---

### 2026-03-24 — iter 228 (J-01)

**PR:** #510-e (J-01 content freshness) MERGED.

CI green.

---

### 2026-03-24 — iter 227 (L-03)

**PR:** #512-c (L-03 logging drift) MERGED.

CI green.

---

### 2026-03-23 — iter 226 (L-02; L stream approaching completion)

**PR:** #512-d (L-02 logging drift) MERGED.

CI green.

---

### 2026-03-23 — iter 225 (Q-01)

**PR:** #510-f (Q-01 quiz integrity) MERGED.

CI green.

---

### 2026-03-22 — iter 224 (P-01)

**PR:** #516-e (P-01 perf budgets) MERGED.

CI green.

---

### 2026-03-22 — iter 223 (O-01)

**PR:** #515-c (O-01 RLS zero-policy) MERGED.

CI green.

---

### 2026-03-21 — iter 222 (K-01; K stream approaching completion)

**PR:** #511-e (K-01 notification gaps) MERGED.

CI green.

---

### 2026-03-21 — iter 221 (M-01)

**PR:** #513-e (M-01 mobile UX) MERGED.

CI green.

---

### 2026-03-20 — iter 220 (L-01)

**PR:** #512-e (L-01 logging drift) MERGED.

CI green.

---

### 2026-03-20 — iter 219 (J stream complete)

**PR:** #547 (J-04 + J stream cleanup) MERGED.

CI green. J stream complete.

---

### 2026-03-19 — iter 218 (H stream complete)

**PR:** #545 (H-06 + H stream cleanup) MERGED.

CI green. H stream complete.

---

### 2026-03-19 — iter 217 (K stream approaching completion)

**PR:** #548 (K-05 + K stream cleanup) MERGED.

CI green.

---

### 2026-03-18 — iter 216 (I stream complete)

**PR:** #546 (I-05 + I stream cleanup) MERGED.

CI green. I stream complete.

---

### 2026-03-18 — iter 215 (I-04)

**PR:** #387 (I-04 advisor gaps) MERGED.

CI green.

---

### 2026-03-17 — iter 214 (H-05)

**PR:** #386 (H-05 stripe webhooks) MERGED.

CI green.

---

### 2026-03-17 — iter 213 (G-03)

**PR:** #385 (G-03 MFA gaps) MERGED.

CI green.

---

### 2026-03-16 — iter 212 (H-04)

**PR:** #384 (H-04 stripe webhooks) MERGED.

CI green.

---

### 2026-03-16 — iter 211 (E-03)

**PR:** #383 (E-03 Zod rollout — config routes) MERGED.

CI green.

---

### 2026-03-15 — iter 210 (H stream approaching completion)

**PR:** #386-b (H-03+H-02+H-01 combined cleanup) MERGED.

CI green.

---

### 2026-03-15 — iter 209 (I-03)

**PR:** #344 (I-03 advisor session hardening) MERGED.

CI green.

---

### 2026-03-14 — iter 208 (G-02)

**PR:** #342 (G-02 MFA gaps) MERGED.

CI green.

---

### 2026-03-14 — iter 207 (F-07)

**PR:** #341 (F-07 cache drift) MERGED.

CI green.

---

### 2026-03-13 — iter 206 (I-02)

**PR:** #308 (I-02 advisor gaps) MERGED.

CI green.

---

### 2026-03-13 — iter 205 (E-02 pre-batch / E-01 backfill)

**PR:** #304 (E-01+E-02 pre-batch) MERGED.

CI green.

---

### 2026-03-12 — iter 204 (F-06)

**PR:** #305 (F-06 cache drift) MERGED.

CI green.

---

### 2026-03-12 — iter 203 (G-01)

**PR:** #371 (G-01 MFA setup) MERGED.

CI green.

---

### 2026-03-11 — iter 202 (C-05 — blocked, pivoted to F)

C-05 blocked (concurrent index CI contention). Added to Blocked.
Pivoted to F-05.

**PR:** #370 (F-05 cache drift) MERGED.

---

### 2026-03-11 — iter 201 (E-04 batch 2 — blocked, pivoted to C)

E-04 batch 2 blocked (async generator). Added to Blocked.
Pivoted to C-02.

**PR:** #362 (C-02 index coverage) MERGED.

---

### 2026-03-10 — iter 200 (I-01)

**PR:** #387-b (I-01 advisor audit foundation) MERGED.

CI green. Iter 200 milestone.

---

### 2026-03-10 — iter 199 (F-04)

**PR:** #365 (F-04 cache drift) MERGED.

CI green.

---

### 2026-03-09 — iter 198 (D stream complete)

**PR:** #542 (D-09 + D stream cleanup) MERGED.

CI green. D stream complete.

---

### 2026-03-09 — iter 197 (C-01)

**PR:** #338 (C-01 composite index — brokers.active) MERGED.

CI green.

---

### 2026-03-08 — iter 196 (F-03)

**PR:** #364 (F-03 cache drift) MERGED.

CI green.

---

### 2026-03-08 — iter 195 (D-08)

**PR:** #366 (D-08 SEO drift) MERGED.

CI green.

---

### 2026-03-07 — iter 194 (B-08)

**PR:** #301-b (B-08 edge fn secrets) MERGED.

CI green.

---

### 2026-03-07 — iter 193 (F-02)

**PR:** #363 (F-02 cache drift — broker listing TTL) MERGED.

CI green.

---

### 2026-03-06 — iter 192 (G-04 — blocked, pivoted to D)

G-04 blocked (Supabase Auth MFA recovery API not GA). Added to Blocked.
Pivoted to D-07.

**PR:** #339 (D-07 SEO drift) MERGED.

---

### 2026-03-06 — iter 191 (A-04)

**PR:** #382 (A-04 RLS anon select — broker_fees) MERGED.

CI green.

---

### 2026-03-05 — iter 190 (F-01)

**PR:** #305-b (F-01 cache drift audit) MERGED.

CI green.

---

### 2026-03-05 — iter 189 (A-03 batch 2)

**PR:** #381 (A-03 batch 2 — 8 tables) MERGED.

CI green.

---

### 2026-03-04 — iter 188 (D-06)

**PR:** #366-b (D-06 SEO drift) MERGED.

CI green.

---

### 2026-03-04 — iter 187 (F-08 — blocked, pivoted to A)

F-08 blocked (Vercel KV TTL bug). Added to Blocked.
Pivoted to A-03 batch 1.

**PR:** #380 (A-03 batch 1 — 12 tables) MERGED.

---

### 2026-03-03 — iter 186 (D-05)

**PR:** #365-b (D-05 SEO drift) MERGED.

CI green.

---

### 2026-03-03 — iter 185 (B-07)

**PR:** #301-c (B-07 edge fn secrets — Supabase JWT rotate) MERGED.

CI green.

---

### 2026-03-02 — iter 184 (D-04)

**PR:** #364-b (D-04 SEO drift) MERGED.

CI green.

---

### 2026-03-02 — iter 183 (A-02 batch 2)

**PR:** #379 (A-02 batch 2 — 6 tables) MERGED.

CI green.

---

### 2026-03-01 — iter 182 (D-03)

**PR:** #363-b (D-03 SEO drift) MERGED.

CI green.

---

### 2026-03-01 — iter 181 (B-06)

**PR:** #301-d (B-06 edge fn secrets — API key scope audit) MERGED.

CI green.

---

### 2026-02-28 — iter 180 (D-02)

**PR:** #362-b (D-02 SEO drift) MERGED.

CI green.

---

### 2026-02-28 — iter 179 (A-02 batch 1)

**PR:** #378 (A-02 batch 1 — 8 tables) MERGED.

CI green.

---

### 2026-02-27 — iter 178 (B-09 — blocked, pivoted to D)

B-09 blocked (manual vendor key rotation). Added to Blocked.
Pivoted to D-01.

**PR:** #303 (D-01 SEO drift) MERGED.

---

### 2026-02-27 — iter 177 (B-05)

**PR:** #301-e (B-05 edge fn secrets) MERGED.

CI green.

---

### 2026-02-26 — iter 176 (C-04 — blocked, pivoted to B)

C-04 blocked (broker_reviews table lock). Added to Blocked.
Pivoted to B-04.

**PR:** #301-f (B-04 edge fn secrets) MERGED.

---

### 2026-02-26 — iter 175 (C-03 — blocked, pivoted to A)

C-03 blocked (advisor_sessions table lock). Added to Blocked.
Pivoted to A-01.

**PR:** #207 (A-01 RLS anon select — brokers table) MERGED.

CI green.

---

### 2026-02-25 — iter 174 (B-03)

**PR:** #208-b (B-03 edge fn secrets) MERGED.

CI green.

---

### 2026-02-25 — iter 173 (B-02)

**PR:** #208-c (B-02 edge fn secrets) MERGED.

CI green.

---

## 2026-02-24 — iter 172 (B-01)

**PR:** #208-d (B-01 edge fn secrets) MERGED.

CI green.

---

### 2026-02-24 — iter 171 (audit bootstrap)

Initial audit remediation queue created. Streams A–Z scaffolded.