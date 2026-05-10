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
|--------|--------|------------------------|-------|----------|
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
| R | `claude/audit-remediation/r-coverage-m2b-calculators` · **#640 OPEN** (CI running) | #290/#396/#459/#466/#471/#472/#473/#510/#511/#513/#514/#516/#517/#519/#521/#526/#527/#528/#529/#530/#531/#532/#533/#534/#535/#536/#537/#538/#539/#540/#541/#542/#543/#544/#545/#546/#547/#548/#549/#550/#551/#552/#553/#554/#555/#556/#557/#558/#559/#560/#561/#562/#563/#564/#565/#566/#567/#568/#569/#570/#571/#572/#573/#574/#575/#576/#577/#578/#579/#580/#581/#582/#583/#584/#585/#586/#587/#588/#589/#590/#591/#592/#593/#594/#595/#596/#597/#598/#599/#600/#601/#602/#603/#604/#605/#606/#607/#608/#609/#610/#611/#612/#640 | **#595 MERGED** (RATCHET M1 — coverage floors raised). **#597 MERGED** (R-COVERAGE-15). **#601 MERGED** (M2-A done — 12 files). **#640 OPEN** (M2-B — CGT+mortgage+currency.formatAUD, 3 test files, 368 LOC). Converted draft→ready iter 337 to trigger CI. | #640 merged |
| S | _complete_ | **#594 MERGED 2026-05-08** (`ee498f8c`) | queue-sync iter 315 — #594 MERGED. | S-01..S-05 done. **Stream complete.** |
| T | `claude/audit-remediation/t-05-type-safety` | #225/#318/#398/#457/#519/#560 | T-01..T-05 done. | T-05 merged ✓ |
| U | `claude/audit-remediation/u-04-url-canonicals` | #226/#319/#399/#457/#520/#561 | U-01..U-04 done. | U-04 merged ✓ |
| V | `claude/audit-remediation/v-07-auth-hardening` | #227/#320/#400/#457/#521/#562 | V-01..V-07 done. | V-07 merged ✓ |
| W | `claude/audit-remediation/w-12-hub-page-hoc` (W-15 remaining) | #306/#312/#369/#529/#598/#599/#602/#604/#605/#606/#607/#608/#609/#612 | **#609 MERGED 2026-05-08** (W-12+W-13+W-15 dividends). **#612 MERGED 2026-05-08** (W-14 grants→/startup/grants). W-04..W-15 all MERGED. | All W tasks merged ✓ |
| X | `claude/audit-remediation/x-09b-ratchet-final` | #257/#367/#596/#600/#610/#641/#643/#644/#646 MERGED · **#702 OPEN** (X-09b — CI running) | X-06 (#641 MERGED 2026-05-09). X-07 (#643 MERGED). X-08 (#644 MERGED). X-09a (#646 MERGED). X-09b: **#702 OPEN** (fresh branch — unrelated-history issue with #648 resolved; fix find/[advisor-type]/[city] + eslint ratchet). Last CI: CI-rescue in flight — df53205 pushed iter 340. | All X PRs merged |
| CC | `claude/audit-remediation/cc-01-country-mode-audit` | **#675 MERGED** (CC-01) · **#678 MERGED 2026-05-09** (CC-04 E2E) | CC-01 done. CC-03 false-positive. CC-04 MERGED (#678). CC-02/CC-05 pending. | CC-05 merged |
| EE | `claude/audit-remediation/ee-01-error-boundaries` | **#653 MERGED** (EE-01+EE-05) | EE-01 done + EE-02/03/04 FP + EE-05 done. **Stream complete.** | #653 merged ✓ |
| FF | `claude/audit-remediation/ff-01-feature-flag-audit` | **#656 MERGED 2026-05-09** (`4da4004f`) | FF-01..FF-04 done. FF-03 false-positive. **Stream complete.** | FF-04 merged ✓ |
| OOO | `claude/audit-remediation/ooo-01-runbook-audit` | **#652 MERGED** | OOO-01 done. OOO-04 FP. OOO-02 done. OOO-03 done. **Stream complete.** | OOO-03 merged ✓ |
| KK | `claude/audit-remediation/kk-03-topic-cluster-map` | **#703 OPEN** (KK-03 — CI running) | KK-01 done (#667). KK-02 done (#670). KK-03: **#703 OPEN** (admin topic-cluster-map page — RSC, 242 LOC + sidebar nav link). Last CI: pending — pushed iter 337. | KK-04 merged |
| WW | `claude/audit-remediation/ww-01-watchlist-data-model` | **#651 MERGED** | WW-01 migration + WW-02 watchlist UI done. WW-03/04 blocked (DD-02 dep). **Streams WW-01+WW-02 merged.** | All WW tasks merged ✓ |
| Y | `claude/audit-remediation/y-03-yield-calc` | #229/#322/#402/#457/#523/#564 | Y-01..Y-03 done. | Y-03 merged ✓ |
| Z | `claude/audit-remediation/z-04-zero-state-ux` | #230/#323/#403/#457/#524/#565 | Z-01..Z-04 done. | Z-04 merged ✓ |
| QQ | `claude/audit-remediation/qq-01-public-qa-surface` | (none yet) | QQ-01..QQ-10 pending. Public AI Q&A capture surface — promote production RAG chatbot from admin-only to public SEO/lead-capture surface. Brief: `docs/audits/qq-ai-qa-capture-brief.md` (drafted 2026-05-09 from FIN_NOTEBOOK.md ship-now item #7). QQ-08 is a compliance gate — surfaces to Blocked until `docs/audits/qq-compliance-signoff.md` is committed by a human reviewer. | All QQ tasks merged |
| MM | `claude/audit-remediation/mm-01-marketplace-coverage-audit` | **MM-V01 delivered locally 2026-05-09** (Digital Infrastructure / data centres — `lib/listing-verticals.ts`, `app/invest/list/ListingSubmitForm.tsx`, `app/api/listings/submit/route.ts`, `lib/listing-vertical-images.ts`, `components/ContextualLeadMagnet.tsx`, new `supabase/migrations/20260509_digital_infrastructure_vertical.sql`, new `app/invest/digital-infrastructure/page.tsx`). Pending commit + PR. | **MM-V01 Digital Infrastructure DELIVERED locally 2026-05-09** (pending commit). MM-AUDIT next on cloud loop, then remaining MM-V02..V09 + MM-S01..S06 + MM-CONTENT + MM-UX + MM-INTEG. Plan: `docs/audits/MM-marketplace-expansion-plan.md`. New: **MM-V09 Startup vertical expansion** (deepen existing `/invest/startups` from 226 LOC to ~500 LOC + sector pages + round-instrument explainers + ESIC tax explainer + 12+ seed listings + pitch event aggregation). All wholesale-only / MIS-adjacent verticals reuse the existing s708 gating pattern from pre-IPO listings. No AFSL upgrade required pre-launch. | All MM phases merged |
| SP | `claude/audit-remediation/sp-01-capability-audit` | (none yet) | **BLOCKED — waiting on MM-V09 completion.** Startup Portal — founder-side auth + round management + data room + wholesale-investor (s708) certification + ESIC verification + investor sector-thesis matching. New auth context mirroring advisor-portal pattern. Brief: `docs/audits/sp-startup-portal-brief.md` (drafted 2026-05-09). 13 sub-tasks SP-01..SP-13 (~25–35 iters, ~3–4 calendar weeks). SP-12 is the compliance gate. SP starts only after MM-V09 ships to avoid building against a moving listings model. | All SP tasks merged + compliance signoff |

---

## Blocked

### ~~X-09b — ESLint ratchet (#648) blocked on X-06/07/08 merge~~ RESOLVED iter 336

**Status:** Resolved — all three deps (#641 X-06, #643 X-07, #644 X-08) merged to main.
Branch #648 had unrelated-history issue (main force-push); fresh branch `x-09b-ratchet-final`
opened as PR #702 with find/[advisor-type]/[city] fix + eslint ratchet. Awaiting CI.

---

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
|------|--------|-------------|------------|-------|
| AA-01 | ~~false-positive~~ | ~~Advisor profile completeness score (surface in dashboard)~~ | — | `app/api/advisor-dashboard/route.ts` computes weighted score (8 fields → 0–100%). `DashboardTab.tsx` renders full progress bar. `app/api/cron/advisor-quality/route.ts` caches in `professionals.profile_score`. |
| AA-02 | ~~false-positive~~ | ~~Onboarding checklist UI (step indicators, completion gating)~~ | — | `DashboardTab.tsx` lines 142–176: full checklist with step indicators, completion gating (score < 80), and progress bar. |
| AA-03 | ~~false-positive~~ | ~~Email drip for incomplete onboarding (3-day, 7-day, 14-day)~~ | — | `app/api/cron/advisor-onboarding/route.ts`: 3-email sequence (Day 2 + Day 5) + `advisor-profile-gate-drip` cron. |
| AA-04 | ~~false-positive~~ | ~~Advisor public profile SEO (canonical URL, JSON-LD Person schema)~~ | — | `app/advisor/[slug]/page.tsx`: `generateMetadata` + `alternates.canonical` + `@type: Person` + `@type: LocalBusiness` JSON-LD. ADV stream entry condition now satisfied. |
| AA-05 | ~~false-positive~~ | ~~Advisor review-request flow (post-session prompt)~~ | — | `app/api/advisor-auth/request-review/route.ts`: POST endpoint, validates converted-lead status, sends via `lib/advisor-emails.ts`. |

**Stream AA entry condition:** All items pre-existed. Stream resolved as false-positive (iter 332).

---

### Stream BB — Broker comparison deep-links

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|------------|-------|
| BB-01 | ~~false-positive~~ | ~~Broker vs-broker comparison page (`/compare/[broker-a]-vs-[broker-b]`)~~ | — | `app/versus/[slugs]/page.tsx` — full SEO page, 50+ pre-rendered pairs (`POPULAR_PAIRS`). URL is `/versus/` rather than `/compare/` but feature is complete: popular-pairs ISR, `generateStaticParams`, `generateMetadata`, OG image. |
| BB-02 | ~~false-positive~~ | ~~Comparison table component (fee diff, feature matrix)~~ | — | `app/versus/VersusClient.tsx` (734 LOC): fee diff, feature matrix, winner-by-scenario, community vote. `components/ComparisonTableSkeleton.tsx` also exists. |
| BB-03 | ~~false-positive~~ | ~~SEO metadata + JSON-LD for comparison pages~~ | — | `versusComparisonJsonLd()` in `lib/schema-markup.ts` (line 319). Metadata + breadcrumb JSON-LD in `versus/[slugs]/page.tsx`. |
| BB-04 | ~~false-positive~~ | ~~Internal linking (broker detail pages → comparison pages)~~ | — | `app/broker/[slug]/page.tsx` queries `versus_editorials` and renders links to `/versus/[slug]` (lines 146–330). |
| BB-05 | ~~false-positive~~ | ~~Affiliate CTA placement on comparison pages~~ | — | `VersusClient.tsx`: `getAffiliateLink`, `trackClick`, `AFFILIATE_REL`, `StickyCTABar` all wired up. |

**Stream BB entry condition:** All items pre-existed under `/versus/` route. Stream resolved as false-positive (iter 333).

---

### Stream CC — Country-mode completeness

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|------------|-------|
| CC-01 | **done** | Country-mode coverage audit (identify gaps vs. `lib/country-mode/`) | — | Audit complete (iter 334). Full gap report at `docs/audits/country-mode-gaps.md`. Infrastructure solid; all 12 country configs have homepage filters. 4 gaps documented for CC-02..CC-05. PR #675. |
| CC-02 | ~~false-positive~~ | ~~NZ supply-threshold tuning (current thresholds too aggressive)~~ | — | `lib/country-mode/supply-thresholds.ts` lines 34–38: `PER_COUNTRY_THRESHOLDS = { NZ: { experts: 1 } }` already implemented. `__tests__/lib/country-mode/supply-thresholds.test.ts` lines 83–135 fully cover NZ-specific threshold. No code change needed. |
| CC-03 | ~~false-positive~~ | ~~IN/SG/HK intent-context wiring (priority-chain gaps)~~ | — | `CountryExpertsPreview.tsx` intentionally filters by advisor `type` only (comment line 7: "specialties is jsonb and less reliable"). Language filter from config is NOT applied to DB query — 0-row risk from language filtering doesn't exist. All three countries include `"en"` in language config for future use. Strip returns results by type regardless of language. |
| CC-04 | **done** | Country-mode E2E tests (Playwright, 3 locales) | — | 7 Playwright tests. PR #678 MERGED 2026-05-09. |
| CC-05 | pending | Locale-aware sitemap entries for non-AU locales | ~2 | Deps: CC-03 ✓ (FP resolved). Gap: `app/sitemap.ts` has no hreflang entries for locale-prefixed paths. Can start now. |

**Stream CC entry condition:** CC-01 done (iter 334). CC-02 and CC-03 resolved as false-positives (iter 339). CC-05 can start immediately.

---

### Stream DD — Data freshness SLAs

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|------------|-------|
| DD-01 | pending | Freshness SLA definition (per-table, per-vertical TTL targets) | ~2 | Strategic: Finn input needed. |
| DD-02 | pending | Stale-data alerting (cron health check + Slack webhook) | ~3 | Deps: DD-01. |
| DD-03 | pending | ISR revalidation audit (verify `revalidate` values match SLAs) | ~2 | Deps: DD-01. |
| DD-04 | pending | Broker rate data pipeline (currently manual CSV import) | ~6 | Deps: DD-01. |
| DD-05 | pending | ETF/fund data pipeline freshness (daily NAV updates) | ~4 | Deps: DD-01. |

**Stream DD entry condition:** DD-01 needs Finn input on SLA targets.

---

### Stream EE — Error boundary + fallback UX

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|------------|-------|
| EE-01 | **done** | Global error boundary audit (identify routes missing `error.tsx`) | — | Root `app/error.tsx` covers all 523 routes. 3 bespoke files fixed (quiz/calculators/savings-calc). PR #653. |
| EE-02 | ~~false-positive~~ | ~~Standardised error boundary component (design + implement)~~ | — | `components/RouteErrorBoundary` already exists. |
| EE-03 | ~~false-positive~~ | ~~Skeleton/loading fallback audit (identify routes missing `loading.tsx`)~~ | — | `app/loading.tsx` (root) + `components/RouteLoadingSkeleton` already exist. |
| EE-04 | ~~false-positive~~ | ~~Standardised loading skeleton component~~ | — | `RouteLoadingSkeleton` pre-existed. |
| EE-05 | **done** | E2E tests for error + loading states | — | `e2e/error-boundaries.spec.ts` (107 LOC, 7 tests). PR #653, commit `1da6416`. |

**Stream EE entry condition:** No hard deps. Can start any time.

---

### Stream FF — Feature flag lifecycle

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|------------|-------|
| FF-01 | **done** | Feature flag audit — seeded 8 missing flags. PR #656. | — | 8 missing flags blocked live features; all seeded enabled=true/rollout_pct=100. |
| FF-02 | **done** | Flag expiry policy (auto-archive after N days dormant) | — | Cron `app/api/cron/feature-flag-expiry/route.ts` + `archived_at` migration. PR #656, commit `b276f56a`. |
| FF-03 | ~~false-positive~~ | ~~Flag management UI in admin panel~~ | — | Flag management UI already existed (W-07 admin panel, commit `6723b24`). |
| FF-04 | **done** | Flag usage tracking (log flag evaluations to `web_vitals_samples`) | — | `last_evaluated_at` column + fire-and-forget in `loadFlag()`. PR #656, commit `aa34e77`. |

**Stream FF entry condition:** FF-01 can start immediately.

---

### Stream GG — Growth / acquisition experiments

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|------------|-------|
| GG-01 | pending | A/B test infrastructure (server-side, cookie-based, Supabase-backed) | ~5 | Deps: FF-03. |
| GG-02 | pending | Homepage hero A/B test (CTA copy variants) | ~2 | Deps: GG-01. |
| GG-03 | pending | Broker card CTA A/B test (button text + colour) | ~2 | Deps: GG-01. |
| GG-04 | pending | Experiment results dashboard (admin panel) | ~4 | Deps: GG-01+GG-02+GG-03. |

**Stream GG entry condition:** FF-03 done. Deps on FF stream.

---

### Stream HH — Help centre / FAQ content

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|------------|-------|
| HH-01 | pending | Help centre page structure (`/help`, `/help/[category]`, `/help/[category]/[article]`) | ~4 | |
| HH-02 | pending | FAQ JSON-LD integration (reuse `lib/schema-markup.ts` `normaliseFaqs`) | ~2 | Deps: HH-01. |
| HH-03 | pending | Help centre search (client-side, Fuse.js) | ~3 | Deps: HH-01+HH-02. |
| HH-04 | pending | Article feedback widget (was-this-helpful, Supabase-backed) | ~2 | Deps: HH-01. |

**Stream HH entry condition:** No hard deps. Can start any time.

---

### Stream II — Investment calculator suite

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|------------|-------|
| II-01 | pending | Compound interest calculator (`/calculators/compound-interest`) | ~3 | |
| II-02 | pending | Brokerage fee calculator (`/calculators/brokerage-fees`) | ~3 | Deps: BB-01. |
| II-03 | pending | ETF cost comparison calculator (`/calculators/etf-cost`) | ~3 | Deps: II-02. |
| II-04 | pending | Tax on investment returns calculator (CGT, dividend withholding) | ~4 | |
| II-05 | pending | Calculator SEO (canonical, JSON-LD HowTo schema) | ~2 | Deps: II-01..II-04. |

**Stream II entry condition:** II-01 and II-04 have no hard deps. II-02 deps on BB-01.

---

### Stream JJ — Job board / careers page

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|------------|-------|
| JJ-01 | pending | Careers page (`/about/careers`) with open roles | ~2 | |
| JJ-02 | pending | Role detail page (`/about/careers/[role]`) | ~2 | Deps: JJ-01. |
| JJ-03 | pending | Application form (name, email, CV upload to Supabase Storage) | ~4 | Deps: JJ-02. |
| JJ-04 | pending | Application review in admin panel | ~3 | Deps: JJ-03. |

**Stream JJ entry condition:** No hard deps. Low priority — park until post-launch.

---

### Stream KK — Knowledge graph / internal linking

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|------------|-------|
| KK-01 | **done** | Internal link audit (identify orphaned pages + over-linked hubs) | — | PR #667. `scripts/internal-link-audit.mjs` + `docs/audits/kk-01-internal-link-audit.md`. |
| KK-02 | **done** | Related-content widget (bottom of article pages) | — | `components/RelatedContentGrid.tsx`. Applied to `article/[slug]` + `research/[slug]`. PR #670. |
| KK-03 | **in-flight** | Topic cluster map (pillar ↔ cluster ↔ supporting visualised) | ~3 | Deps: KK-01. **#703 OPEN** — `/admin/topic-clusters` RSC page: 10 cluster cards, 5 stats, ×2+ cross-cluster badges, sidebar nav link. |
| KK-04 | pending | Automated internal link injection (LSI-based, configurable density) | ~5 | Deps: KK-02+KK-03. Risky — needs kill-switch. |

**Stream KK entry condition:** KK-01 can start immediately.

---

### Stream LL — Lead-gen / email capture

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|------------|-------|
| LL-01 | ~~false-positive~~ | ~~Newsletter signup (modal + inline, Resend list integration)~~ | — | `components/NewsletterSignup.tsx` (188 LOC, full/compact variants), `components/NewsletterExitIntentModal.tsx` (255 LOC), `app/api/newsletter/subscribe/route.ts` (131 LOC, Zod+rate-limit+Resend), `lib/newsletter.ts` (251 LOC), `app/newsletter/page.tsx`. Complete. |
| LL-02 | ~~false-positive~~ | ~~Lead magnet PDF delivery (investment guide, gated by email)~~ | — | `components/LeadMagnet.tsx`, `components/ContextualLeadMagnet.tsx`, SMSF checklist email gate in `app/smsf/checklist/SmsfChecklistClient.tsx` → `source:"smsf_checklist"` → subscribe API. |
| LL-03 | ~~false-positive~~ | ~~Email preference centre (`/account/notifications`)~~ | — | `app/account/notifications/page.tsx` + `app/account/notifications/NotificationsList.tsx` + `app/api/account/notifications/route.ts` all exist. |
| LL-04 | ~~false-positive~~ | ~~Transactional email audit (review all Resend templates)~~ | — | `lib/newsletter.ts`, `lib/quote-emails.ts`, `lib/advisor-booking.ts` cover all transactional email templates. Complete. |

**Stream LL entry condition:** All items pre-existed. Stream resolved as false-positive (iter 338).

---

### Stream MM — Monitoring + observability

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|------------|-------|
| MM-01 | pending | Sentry alert routing (currently all alerts → single channel) | ~2 | |
| MM-02 | pending | Custom Sentry performance dashboards (per-vertical p95 LCP) | ~3 | Deps: MM-01. |
| MM-03 | pending | Cron health dashboard (admin panel, surfaces stale jobs) | ~3 | |
| MM-04 | pending | RLS query performance monitoring (identify slow policy evaluations) | ~3 | Deps: MM-03. |

**Stream MM entry condition:** MM-01 can start immediately.

---

### Stream NN — Newsletter / content marketing

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|------------|-------|
| NN-01 | pending | Weekly market-update email template (Resend, MDX-driven) | ~4 | Deps: LL-01. |
| NN-02 | pending | Automated newsletter content pipeline (cron → Resend) | ~5 | Deps: NN-01+DD-02. |
| NN-03 | pending | Subscriber segmentation (by vertical interest, activity) | ~3 | Deps: NN-02+LL-03. |

**Stream NN entry condition:** LL-01 done. Deps on LL stream.

---

### Stream OO — Onboarding quiz v2

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|------------|-------|
| OO-01 | pending | Quiz v2 spec (risk tolerance + knowledge + goals, 12 questions) | ~2 | Strategic: Finn input needed on question set. |
| OO-02 | pending | Quiz v2 UI (multi-step, progress bar, animated transitions) | ~4 | Deps: OO-01. |
| OO-03 | pending | Quiz v2 recommendation engine (map answers → product set) | ~4 | Deps: OO-01. |
| OO-04 | pending | Quiz v2 A/B test vs. v1 | ~2 | Deps: OO-02+GG-01. |
| OO-05 | pending | Quiz result persistence (save to `user_quiz_history`) | ~2 | Deps: OO-03. |

**Stream OO entry condition:** OO-01 needs Finn input.

---

### Stream PP — Performance budget enforcement

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|------------|-------|
| PP-01 | pending | Bundle size budget CI check (fail build if main bundle > 250 kB) | ~2 | Deps: P-05. |
| PP-02 | pending | Image optimisation audit (identify unoptimised `<img>` tags) | ~2 | |
| PP-03 | pending | Font loading optimisation (subset + preload) | ~2 | Deps: PP-02. |
| PP-04 | pending | Third-party script audit (GTM, Intercom, etc. — defer or remove) | ~2 | |

**Stream PP entry condition:** P-05 merged (done). Ready to start.

---

### Stream QQ — Quiz integrity v2

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|------------|-------|
| QQ-01 | pending | Quiz answer tamper-detection (HMAC signature on client state) | ~3 | Deps: Q-05. |
| QQ-02 | pending | Rate-limit quiz submissions per user (DB-backed, lib/rate-limit.ts) | ~2 | Deps: QQ-01. |
| QQ-03 | pending | Quiz analytics dashboard (completion rate, drop-off by question) | ~4 | Deps: QQ-01+MM-01. |

**Stream QQ entry condition:** Q-05 merged (done). Ready to start.

---

### Stream RR — Referral program

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|------------|-------|
| RR-01 | pending | Referral program spec (incentive structure, T&Cs, AFSL compliance check) | ~2 | Strategic: Finn + compliance review needed. |
| RR-02 | pending | Referral link generation + tracking (Supabase-backed) | ~4 | Deps: RR-01. |
| RR-03 | pending | Referral dashboard (`/account/referrals`) | ~3 | Deps: RR-02. |
| RR-04 | pending | Referral reward fulfilment (credit / gift card via Stripe) | ~4 | Deps: RR-02. AFSL caution. |

**Stream RR entry condition:** RR-01 needs Finn + compliance review.

---

### Stream SS — Search (internal site search)

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|------------|-------|
| SS-01 | pending | Search index build (pg_trgm full-text on brokers, articles, FAQs) | ~4 | |
| SS-02 | pending | Search API route (`/api/search?q=`) | ~3 | Deps: SS-01. |
| SS-03 | pending | Search UI (global search bar, keyboard shortcut Cmd+K) | ~4 | Deps: SS-02. |
| SS-04 | pending | Search analytics (log queries + zero-result rate) | ~2 | Deps: SS-02. |

**Stream SS entry condition:** SS-01 can start immediately.

---

### Stream TT — Trust signals

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|------------|-------|
| TT-01 | pending | Trust badge component (AFSL number, regulatory status) | ~2 | Deps: lib/compliance.ts. |
| TT-02 | pending | Expert review byline (author schema, credentials) | ~3 | Deps: TT-01. |
| TT-03 | pending | Methodology page (`/methodology`) | ~3 | |
| TT-04 | pending | Editorial policy page (`/editorial-policy`) | ~2 | |
| TT-05 | pending | Review process transparency (how we rate brokers) | ~2 | Deps: TT-03. |

**Stream TT entry condition:** No hard deps. Can start any time.

---

### Stream UU — User-generated content moderation

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|------------|-------|
| UU-01 | pending | Review moderation queue (admin panel, approve/reject/flag) | ~4 | Deps: A-05. |
| UU-02 | pending | Automated spam detection (keyword filter + rate limit) | ~3 | Deps: UU-01. |
| UU-03 | pending | Review appeal flow (user can contest rejection) | ~3 | Deps: UU-01. |
| UU-04 | pending | Review export (CSV download for compliance audit) | ~2 | Deps: UU-01. |

**Stream UU entry condition:** A-05 merged. Deps on AA stream.

---

### Stream VV — Video content

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|------------|-------|
| VV-01 | pending | Video embed component (YouTube/Vimeo, lazy-load, CLS-safe) | ~2 | |
| VV-02 | pending | Video SEO (VideoObject JSON-LD, thumbnail meta) | ~2 | Deps: VV-01. |
| VV-03 | pending | Video content index page (`/videos`) | ~3 | Deps: VV-01+VV-02. |

**Stream VV entry condition:** No hard deps. Low priority.

---

### Stream WW — Watchlist / portfolio tracker

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|------------|-------|
| WW-01 | **done** | Watchlist data model (Supabase table, RLS, user-scoped) | — | PR #651, migration applied to live DB. Types regenerated. |
| WW-02 | **done** | Watchlist UI (`/account/watchlist`) | — | Done iter 322b. PR #651. |
| WW-03 | pending | Watchlist price alerts (email + in-app, cron-driven) | ~4 | Deps: WW-02+DD-02. |
| WW-04 | pending | Portfolio tracker (manual entry, cost-basis tracking) | ~6 | Deps: WW-02. Long-term. |

**Stream WW entry condition:** No hard deps. Can start after WW-01.

---

### Stream XX — XML sitemap v2

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|------------|-------|
| XX-01 | pending | Sitemap index file (`/sitemap.xml` → sub-sitemaps) | ~2 | Deps: U-04. |
| XX-02 | pending | Image sitemap (broker logos, article thumbnails) | ~2 | Deps: XX-01. |
| XX-03 | pending | Video sitemap | ~2 | Deps: XX-01+VV-03. |
| XX-04 | pending | News sitemap (for article freshness signal) | ~2 | Deps: XX-01. |

**Stream XX entry condition:** U-04 merged (done). Ready to start.

---

### Stream YY — Yield / dividend data

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|------------|-------|
| YY-01 | pending | Dividend calendar data model + seed | ~3 | |
| YY-02 | pending | Dividend calendar page (`/dividends/calendar`) | ~3 | Deps: YY-01. |
| YY-03 | pending | Dividend history page (per-stock, `/dividends/[ticker]`) | ~3 | Deps: YY-01. |
| YY-04 | pending | Dividend screener (filter by yield, frequency, sector) | ~4 | Deps: YY-02+YY-03. |
| YY-05 | pending | Dividend reinvestment calculator | ~3 | Deps: YY-04+II-01. |

**Stream YY entry condition:** YY-01 can start immediately.

---

### Stream ZZ — Zero-downtime deploy hardening

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|------------|-------|
| ZZ-01 | pending | Blue-green deploy validation (smoke test post-deploy hook) | ~3 | |
| ZZ-02 | pending | Rollback runbook formalisation (`docs/runbooks/rollback.md`) | ~2 | |
| ZZ-03 | pending | DB migration rollback test (prove each migration is reversible) | ~4 | Deps: ZZ-02. |
| ZZ-04 | pending | Deploy notification (Slack webhook on Vercel deploy complete) | ~2 | |

**Stream ZZ entry condition:** No hard deps. Can start any time.

---

### Stream AAA — Accessibility v2 (WCAG 2.2 AA)

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|------------|-------|
| AAA-01 | pending | WCAG 2.2 AA gap audit (axe-core scan, 50 highest-traffic pages) | ~3 | Deps: N-04. |
| AAA-02 | pending | Focus management audit (modal, drawer, toast flows) | ~3 | Deps: AAA-01. |
| AAA-03 | pending | Colour contrast v2 (new brand palette check) | ~2 | Deps: AAA-01. |
| AAA-04 | pending | Screen-reader test pass (NVDA + VoiceOver, 10 key flows) | ~4 | Deps: AAA-02+AAA-03. |

**Stream AAA entry condition:** N-04 merged (done). Ready to start.

---

### Stream BBB — Broker data enrichment

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|------------|-------|
| BBB-01 | pending | Broker fee data completeness audit (identify gaps in `broker_fees`) | ~2 | |
| BBB-02 | pending | Broker feature matrix v2 (expand to 80 features from 40) | ~5 | Deps: BBB-01. |
| BBB-03 | pending | Broker news feed (RSS ingestion, per-broker news widget) | ~4 | |
| BBB-04 | pending | Broker social proof (AUM, user count, awards) | ~3 | Deps: BBB-02. |

**Stream BBB entry condition:** BBB-01 can start immediately.

---

### Stream CCC — Content quality scoring

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|------------|-------|
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
|------|--------|-------------|------------|-------|
| EEE-01 | pending | ETF data model (Supabase tables: `etfs`, `etf_holdings`, `etf_performance`) | ~4 | |
| EEE-02 | pending | ETF screener page (`/etfs`) with filter panel | ~5 | Deps: EEE-01. |
| EEE-03 | pending | ETF detail page (`/etfs/[ticker]`) | ~4 | Deps: EEE-01. |
| EEE-04 | pending | ETF comparison tool (side-by-side, up to 5 ETFs) | ~4 | Deps: EEE-03. |
| EEE-05 | pending | ETF SEO (canonical, JSON-LD FinancialProduct schema) | ~2 | Deps: EEE-03. |

**Stream EEE entry condition:** EEE-01 can start immediately. Major stream.

---

### Stream FFF — Financial news aggregator

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|------------|-------|
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
|------|--------|-------------|------------|-------|
| HHH-01 | pending | Hub page audit (identify missing/thin hub pages across all verticals) | ~2 | |
| HHH-02 | pending | Hub page template standardisation (breadcrumb, TOC, child links) | ~3 | Deps: HHH-01. |
| HHH-03 | pending | Automated hub page generation (from `lib/verticals.ts` config) | ~5 | Deps: HHH-02. |
| HHH-04 | pending | Hub page internal link graph validation (no orphans) | ~2 | Deps: HHH-03. |

**Stream HHH entry condition:** No hard deps. Can start any time.

---

### Stream III — ISR + caching strategy v2

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|------------|-------|
| III-01 | pending | ISR audit (map all `export const revalidate` values, identify outliers) | ~2 | |
| III-02 | pending | On-demand revalidation API (`/api/revalidate`) for CMS-triggered refreshes | ~3 | Deps: III-01. |
| III-03 | pending | Cache warm-up cron (pre-populate ISR cache on deploy) | ~3 | Deps: III-02. |
| III-04 | pending | Edge caching headers audit (Vercel `Cache-Control` consistency) | ~2 | Deps: III-01. |

**Stream III entry condition:** No hard deps. Can start any time.

---

### Stream JJJ — JSON-LD coverage v2

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|------------|-------|
| JJJ-01 | pending | JSON-LD coverage audit (identify pages missing structured data) | ~2 | |
| JJJ-02 | pending | HowTo schema for calculator pages | ~2 | Deps: II-01+JJJ-01. |
| JJJ-03 | pending | FAQPage schema for all FAQ sections | ~3 | Deps: JJJ-01. |
| JJJ-04 | pending | BreadcrumbList schema audit (verify correctness vs. actual URL structure) | ~2 | Deps: JJJ-01. |
| JJJ-05 | pending | Review schema validation CI check (schema.org validator in test suite) | ~3 | Deps: JJJ-04. |

**Stream JJJ entry condition:** JJJ-01 can start immediately.

---

### Stream KKK — KYC / identity verification

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|------------|-------|
| KKK-01 | pending | KYC requirements analysis (AFSL obligations, advisor vs. user distinction) | ~2 | Strategic: compliance review. |
| KKK-02 | pending | Identity verification integration (Stripe Identity or AU-specific vendor) | ~6 | Deps: KKK-01. Long-term. |
| KKK-03 | pending | KYC status in user profile + advisor dashboard | ~3 | Deps: KKK-02. |

**Stream KKK entry condition:** KKK-01 needs compliance review. Low priority near-term.

---

### Stream LLL — Localisation v2 (i18n completeness)

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|------------|-------|
| LLL-01 | pending | i18n coverage audit (identify hard-coded English strings outside `lib/i18n/`) | ~3 | |
| LLL-02 | pending | NZ locale dictionary completion (currently ~60% coverage) | ~4 | Deps: LLL-01. |
| LLL-03 | pending | SG/HK locale dictionaries (skeleton → production-ready) | ~5 | Deps: LLL-01. |
| LLL-04 | pending | RTL layout support (future-proofing for IN/Arabic markets) | ~4 | Deps: LLL-03. Long-term. |

**Stream LLL entry condition:** LLL-01 can start immediately.

---

### Stream MMM — Machine learning / personalisation

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|------------|-------|
| MMM-01 | pending | Personalisation spec (what to personalise, privacy constraints) | ~2 | Strategic: Finn + DDD-01. |
| MMM-02 | pending | Collaborative filtering ("users like you also viewed") | ~6 | Deps: MMM-01. Long-term. |
| MMM-03 | pending | Content recommendation engine (quiz result → article suggestions) | ~5 | Deps: OO-03+MMM-01. |

**Stream MMM entry condition:** MMM-01 needs Finn input. Long-term.

---

### Stream NNN — Native app (React Native / Expo)

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|------------|-------|
| NNN-01 | pending | Native app feasibility + scope (MVP feature set for iOS/Android) | ~2 | Strategic: Finn input. |
| NNN-02 | pending | Shared API layer hardening (ensure all app routes are mobile-friendly) | ~4 | Deps: NNN-01. |
| NNN-03 | pending | React Native scaffold (Expo, shared Supabase client) | ~6 | Deps: NNN-01+NNN-02. Long-term. |

**Stream NNN entry condition:** NNN-01 needs Finn input. Very long-term.

---

### Stream OOO — Operational runbooks

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|------------|-------|
| OOO-01 | ~~done~~ | ~~Runbook audit (identify gaps vs. `docs/runbooks/` inventory)~~ | ~2 | README updated (30 runbooks inventoried), supabase-slow.md + slo-breach.md created, gap register added. PR #652. |
| OOO-02 | **done** | Incident severity classification runbook | — | `docs/runbooks/incident-severity.md`. Iter 324b, commit `93372f0`. |
| OOO-03 | **done** | On-call rotation runbook (contacts, escalation path) | — | `docs/runbooks/on-call-rotation.md`. Iter 325b, commit `a610b2d`. |
| OOO-04 | ~~false-positive~~ | ~~Data breach response runbook (OAIC notification requirements)~~ | — | `breach-notification.md` fully covers NDB 30-day clock, GDPR 72h, P0-P3 severity matrix, OAIC form, individual notification template. |

**Stream OOO entry condition:** OOO-01 done. OOO-02 can start immediately.

---

### Stream PPP — Payments v2 (Stripe)

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|------------|-------|
| PPP-01 | pending | Stripe billing portal integration (`/account/billing`) | ~3 | Deps: H-06. |
| PPP-02 | pending | Subscription tier enforcement (feature gates per plan) | ~4 | Deps: PPP-01. |
| PPP-03 | pending | Promo code / coupon support (Stripe promotion codes) | ~2 | Deps: PPP-01. |
| PPP-04 | pending | Revenue analytics dashboard (admin, MRR/ARR/churn) | ~4 | Deps: PPP-02. |

**Stream PPP entry condition:** H-06 merged (done). Ready to start.

---

### Stream QQQ — Query optimisation (Supabase)

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|------------|-------|
| QQQ-01 | pending | Slow query audit (pg_stat_statements, identify top-10 slowest) | ~2 | |
| QQQ-02 | pending | Query plan analysis (EXPLAIN ANALYZE on top-10) | ~3 | Deps: QQQ-01. |
| QQQ-03 | pending | Index additions from QQQ-02 findings | ~3 | Deps: QQQ-02. |
| QQQ-04 | pending | Connection pooling config audit (PgBouncer settings) | ~2 | |

**Stream QQQ entry condition:** QQQ-01 can start immediately.

---

### Stream RRR — Rate limiting v2

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|------------|-------|
| RRR-01 | pending | Rate limit coverage audit (identify unprotected high-risk routes) | ~2 | |
| RRR-02 | pending | Per-user rate limits (currently all limits are per-IP) | ~3 | Deps: RRR-01. |
| RRR-03 | pending | Rate limit dashboard (admin, view current limit states) | ~3 | Deps: RRR-02. |
| RRR-04 | pending | Adaptive rate limiting (tighten on anomaly detection) | ~5 | Deps: RRR-03. Long-term. |

**Stream RRR entry condition:** RRR-01 can start immediately.

---

### Stream SSS — Sponsored content v2

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|------------|-------|
| SSS-01 | pending | Sponsorship config audit (review `lib/sponsorship.ts` for drift) | ~2 | |
| SSS-02 | pending | Sponsored content labelling v2 (clearer disclosure, ACCC compliance) | ~2 | Deps: SSS-01. Compliance. |
| SSS-03 | pending | Sponsor performance dashboard (admin, clicks / impressions / revenue) | ~4 | Deps: SSS-01. |
| SSS-04 | pending | Automated sponsor billing (impression-based, Stripe metered billing) | ~6 | Deps: SSS-03. Long-term. |

**Stream SSS entry condition:** SSS-01 can start immediately.

---

### Stream TTT — TypeScript strictness v2

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|------------|-------|
| TTT-01 | pending | Remaining `any` types audit (find all explicit `any` in source) | ~2 | |
| TTT-02 | pending | Replace top-50 `any` with proper types | ~5 | Deps: TTT-01. |
| TTT-03 | pending | Enable `exactOptionalPropertyTypes` (currently off) | ~3 | Deps: TTT-02. Risky. |
| TTT-04 | pending | Enable `noPropertyAccessFromIndexSignature` | ~3 | Deps: TTT-03. Risky. |

**Stream TTT entry condition:** TTT-01 can start immediately.

---

### Stream UUU — URL structure v2

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|------------|-------|
| UUU-01 | pending | URL audit (identify non-canonical, duplicate, or legacy URLs) | ~2 | |
| UUU-02 | pending | Redirect map for legacy URLs (301s via `next.config.js` redirects) | ~3 | Deps: UUU-01. |
| UUU-03 | pending | URL normalisation middleware (trailing slash, lowercase enforcement) | ~2 | Deps: UUU-02. |

**Stream UUU entry condition:** UUU-01 can start immediately.

---

### Stream VVV — Vertical expansion (new asset classes)

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|------------|-------|
| VVV-01 | pending | Crypto vertical spec (scope, regulatory constraints, AFSL considerations) | ~2 | Strategic: Finn + compliance. |
| VVV-02 | pending | Crypto broker category + comparison page | ~5 | Deps: VVV-01+BB-01. |
| VVV-03 | pending | Bonds/fixed income vertical spec | ~2 | Strategic: Finn input. |
| VVV-04 | pending | Bonds broker category + comparison page | ~5 | Deps: VVV-03+BB-01. |

**Stream VVV entry condition:** VVV-01+VVV-03 need Finn input.

---

### Stream WWW — Web vitals v2

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|------------|-------|
| WWW-01 | pending | Web vitals regression CI check (fail PR if CLS/LCP/FID regresses > 10%) | ~3 | |
| WWW-02 | pending | Web vitals per-page dashboard (admin, `web_vitals_samples` table) | ~3 | Deps: WWW-01. |
| WWW-03 | pending | CLS fixes (identify and fix top-5 CLS contributors) | ~4 | Deps: WWW-01. |
| WWW-04 | pending | INP optimisation (interaction-to-next-paint, React 18 transitions) | ~4 | Deps: WWW-01. |

**Stream WWW entry condition:** No hard deps. Can start any time.

---

### Stream XXX — Cross-sell / upsell flows

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|------------|-------|
| XXX-01 | pending | Cross-sell opportunity map (which products/pages can surface upsells) | ~2 | Strategic: Finn input. |
| XXX-02 | pending | Upsell modal component (triggered post-quiz, post-comparison) | ~3 | Deps: XXX-01+GG-01. |
| XXX-03 | pending | Cross-sell recommendation API (`/api/recommendations/[context]`) | ~4 | Deps: XXX-01+MMM-01. |

**Stream XXX entry condition:** XXX-01 needs Finn input.

---

### Stream YYY — Yield curve / macro data

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|------------|-------|
| YYY-01 | pending | RBA cash rate widget (current rate, historical chart) | ~3 | |
| YYY-02 | pending | Yield curve page (`/economy/yield-curve`) | ~4 | Deps: YYY-01. |
| YYY-03 | pending | Macro data pipeline (RBA + ABS data ingestion, cron-driven) | ~5 | Deps: YYY-01. |

**Stream YYY entry condition:** YYY-01 can start immediately.

---

### Stream ZZZ — Zero-trust security model

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|------------|-------|
| ZZZ-01 | pending | Zero-trust audit (map all service-to-service calls, verify auth) | ~3 | |
| ZZZ-02 | pending | Inter-service JWT validation (edge functions → API routes) | ~4 | Deps: ZZZ-01. |
| ZZZ-03 | pending | Secrets rotation automation (Doppler or Vault integration) | ~5 | Deps: ZZZ-01. Long-term. |

**Stream ZZZ entry condition:** ZZZ-01 can start immediately.

---

### Stream DF — Decision-flow engine

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|------------|-------|
| DF-01 | pending | Decision-flow data model (Supabase: `decision_flows`, `flow_nodes`, `flow_edges`) | ~4 | |
| DF-02 | pending | Decision tree — "Should I invest now?" | ~5 | Deps: DF-01. |
| DF-03 | pending | Decision tree — "Which broker is right for me?" | ~5 | Deps: DF-01+BB-01. |
| DF-04 | pending | Decision tree — "ETF vs. direct shares" | ~5 | Deps: DF-01+EEE-01. |
| DF-05 | pending | Decision-flow builder UI (admin panel, drag-and-drop) | ~8 | Deps: DF-01. Long-term. |

**Stream DF entry condition:** DF-01 can start. Related to LL stream (email capture at flow exit).

---

### Stream PR — Product/page recommendations

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|------------|-------|
| PR-01 | pending | Recommendation engine spec (inputs: quiz result, browsing history, location) | ~2 | Strategic: Finn input. Deps: OO-03+MMM-01+CC-01. |
| PR-02 | pending | "Best for you" broker card variant (personalised, vs. generic ranked list) | ~4 | Deps: PR-01. |
| PR-03 | pending | Recommendation A/B test vs. static ranked list | ~2 | Deps: PR-02+GG-01. |
| PR-04 | pending | Recommendation feedback loop (thumbs up/down, improves model) | ~3 | Deps: PR-02. |

**Stream PR entry condition:** PR-01 needs Finn input.

---

### Stream ADV — Advisor marketplace v2

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|------------|-------|
| ADV-01 | pending | Advisor search + filter page (`/advisors`) | ~5 | Deps: AA-04. |
| ADV-02 | pending | Advisor booking flow (calendar integration, Calendly or native) | ~6 | Deps: ADV-01. |
| ADV-03 | pending | Advisor messaging (in-app, end-to-end encrypted) | ~8 | Deps: ADV-01. Long-term. |
| ADV-04 | pending | Advisor tier / credentialing badges (CFP, CFA, etc.) | ~3 | Deps: ADV-01. |

**Stream ADV entry condition:** AA-04 done. Deps on AA stream.

---

### Stream COMP — Compliance automation

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|------------|-------|
| COMP-01 | pending | Compliance copy versioning (track changes to `lib/compliance.ts` disclosures) | ~3 | |
| COMP-02 | pending | AFSL disclosure audit (verify all required disclosures present on all pages) | ~3 | |
| COMP-03 | pending | Privacy policy + T&C versioning (user re-consent on update) | ~4 | |
| COMP-04 | pending | Compliance test suite (automated checks for required disclosure presence) | ~4 | Deps: COMP-02. |

**Stream COMP entry condition:** COMP-01 can start immediately.

---

### Stream CMP — Comparison / UX overhaul (added 2026-05-09)

Plan: `/home/finnduns/.claude/plans/ok-audit-agaisnt-what-enumerated-honey.md` (single source of truth — every item below cross-references a section in that file).

**Foundation already shipped on `claude/comparison-overhaul/foundation`:**
- `lib/calculator-state.ts` + `__tests__/lib/calculator-state.test.ts`
- `lib/heatmap.ts` + `__tests__/lib/heatmap.test.ts`
- `lib/tco.ts` + `__tests__/lib/tco.test.ts`
- `lib/switch-scripts.ts` + `app/switch-scripts/page.tsx` + `app/switch-scripts/[broker-slug]/page.tsx` (3 seeds: commsec, stake, selfwealth)
- `components/charts/SVGRadarChart.tsx` + `__tests__/components/SVGRadarChart.test.tsx`
- `lib/hooks/useComparisonCart.ts` (composes `useShortlist` + localStorage non-broker layer; cap=6)
- `app/api/calculator-state/route.ts` (GET + POST)
- Migration `20260720_cmp_w1a_user_calculator_state.sql` (table + RLS + `anonymous_saves.calculator_state` column)
- `lib/bookmarks.ts:158` extended to claim calculator state in same flow

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|------------|-------|
| CMP-W1A-INT | pending | Integrate `lib/calculator-state.ts` into 3 highest-traffic calculators (`/tco-calculator`, `/savings-calculator`, `/mortgage-calculator`): debounced autosave + prefill banner + URL-param entry. | ~3 | Plan §W1-A. Reuse `getPrefillFor("tco", state)` per `PREFILL_RULES`. |
| CMP-W1B-DRAWER | pending | `components/ComparisonCart.tsx` — floating button (counter badge) + `BottomSheet` mobile drawer + sticky desktop drawer; mounted in `app/layout.tsx`. Uses `useComparisonCart`. Toast on add. | ~4 | Plan §W1-B. |
| CMP-W1B-MATRIX | pending | Extend `app/shortlist/compare/page.tsx` to render mixed broker/advisor/ETF rows + `<TrueCostCell>` column. `app/api/comparison-matrix/route.ts` returns side-by-side comparable fields per kind. | ~3 | Plan §W1-B. Composes with W1-D. |
| CMP-W1B-SCHEMA | pending | Migration: `user_saved_comparisons.advisor_slugs TEXT[]` + `etf_tickers TEXT[]`; extend `BookmarkType` union to include `'etf'` + DB CHECK constraint relax + extend `claimAnonymousSaves` for ETF type. | ~2 | Plan §W1-B. Idempotent. |
| CMP-W1C-TABLE | pending | `components/HeatmapTable.tsx` — wraps existing `BrokerComparisonTable.tsx`/`AdvisorCompareMatrix.tsx`/`ShortlistClient` matrix with `decorate()` + corner glyph + ARIA rank label. | ~2 | Plan §W1-C. Use `lib/heatmap.ts` (already shipped). |
| CMP-W1C-SWIPE | pending | Add `embla-carousel-react` dep; `components/SwipeRow.tsx` mobile-only carousel for matrix rows. `md:hidden` swap. Playwright a11y test on chromium. | ~2 | Plan §W1-C. |
| CMP-W1D-CELL | pending | `components/TrueCostCell.tsx` — renders `$0 → $X/yr` with popover listing components + `<DatedStatBadge>` source per row. Wire into `/tco-calculator`, `/versus/[slugs]`, `/best/*`, comparison matrix. | ~3 | Plan §W1-D. Use `lib/tco.ts` (already shipped). |
| CMP-W1D-SCHEMA | pending | Add `brokers.account_transfer_out_fee NUMERIC` if missing (check schema first). Idempotent. | ~1 | Plan §W1-D. |
| CMP-W2A-CRON | pending | `app/api/cron/fee-change-diff/route.ts` (hourly): diff structured fee fields (`asx_fee_value`, `us_fee_value`, `fx_rate`, `inactivity_fee_value`, `account_transfer_out_fee`) via `broker_data_changes` rows; send via existing `feeChangeAlertEmail`. + 2 indexes. | ~3 | Plan §W2-A. Frequency=`instant` only; weekly bundled by existing `fee-digest`. NEVER diff page-hash flips. |
| CMP-W2B-PERSONA | **blocked** | `lib/persona-match.ts` + `components/PersonaMatchBadge.tsx` + `PersonaMatchPopover.tsx`. Reads `user_quiz_history.answers`. Label MUST be "Matches your stated criteria" — never "best for you". Founder/legal review of weights table required before merge. | ~4 | Plan §W2-B. **Tier C + needs-user blocker — do NOT pick until founder approves weights.** |
| CMP-W2C-SURVEY | pending | 30-day outcome survey: 3 columns on `professional_leads` + `notification_preferences.outcome_survey` + `app/api/cron/lead-outcome-survey/route.ts` + `app/api/lead-outcome/route.ts` + `app/lead-outcome/[token]/page.tsx`. Idempotency via `lead_outcome_survey_sends` table + unique partial index. | ~4 | Plan §W2-C. Tier C — review email copy. |
| CMP-S1-FRESH | pending | `/fees-freshness` public leaderboard + `<FeesFreshnessIndicator>` auto-render on broker cards site-wide. Composes `stale-fee-editorial` cron + `dated-stats-check` cron + `<DatedStatBadge>`. | ~2 | Plan §S1 (synergy). |
| CMP-S2-DRIP | pending | Abandoned-comparison drip cron: if user pinned ≥2 brokers + no lead within 48h, send "Still comparing? Here's the cost difference" using W1-D true-cost numbers. Extends `abandoned-shortlist-drip`. | ~2 | Plan §S2 (synergy). |
| CMP-S3-EMBED | pending | Add referer-counter to `/api/widget` + `<EmbedAnalyticsBadge>` on `BrokerCard.tsx`: "Embedded on N sites this month". Aggregation view only (no PII). | ~2 | Plan §S3 (synergy). |
| CMP-S4-AI | pending | Extend `/api/concierge` with cart-builder mode: "show me crypto exchanges with no FX fees" → returns matching items + "Add all to comparison cart" button → `useComparisonCart`. Compliance: existing `filterFactualOutput()` gate. | ~3 | Plan §S4 (synergy). |
| CMP-S5-COUNTRY | pending | Read `iv_intent_country` cookie inside `computePersonaMatch`; tweak weights for UK/US/etc. corridors (e.g. GBP-AUD FX cost weighted higher for UK investor). | ~1 | Plan §S5 (synergy). Depends on W2B (persona). |
| CMP-S6-CTX | pending | When user submits lead from cart matrix, enrich `qualification_data` with `comparison_context: {compared: string[], weighted_on: string, viewed_for_seconds: number}`. | ~2 | Plan §S6 (synergy). |
| CMP-S7-RESURRECT | pending | Saved-comparison resurrection cron: weekly check for `user_saved_comparisons` rows with stale fee data → email "your saved comparison from N weeks ago has new pricing". | ~1 | Plan §S7 (synergy). |
| CMP-W3A-AISUM | pending | "Summarize this comparison for me" button on cart matrix. Anthropic SDK + `filterFactualOutput()` gate. 3-bullet output citing underlying data. | ~3 | Plan §W3-A. **Tier C** — compliance review on prompt + output template. Best after W2-B + W2-C land for quality signal. |
| CMP-W3C-SANKEY | pending | `components/charts/SVGSankeyChart.tsx` — Sankey diagram for cost breakdown ("$1000 yearly cost split across brokerage / FX / inactivity / transfer"). Composes with `lib/tco.ts` components. | ~3 | Plan §W3-C. SVG only (codebase convention). Radar chart already shipped. |

**Round 2 brainstorm (added 2026-05-09):** 19 additional UX features grouped into 6 themes. Founder picks marked ★. All extend existing infrastructure — no new data primitives required.

| Item | Status | Description | Est. iters | Notes |
|------|--------|-------------|------------|-------|
| CMP-DQ-01 | pending | **Tradeoff sliders.** 4-5 weighted sliders (fees / app / asset coverage / support / security) on `/best/*` + `/compare`. Live re-rank as user slides. Composes with `lib/persona-match.ts` (W2-B). Sliders override quiz weights for power users. | ~3 | Decision quality. Pairs naturally with W2-B. |
| CMP-DQ-02 | pending | **Mistake prevention prompts.** Active interception when a user is about to pick a broker that conflicts with their stated quiz answer (e.g. picks Stake but quiz says SMSF investor — Stake doesn't offer SMSF). Rule table per broker × per quiz answer. | ~3 | Decision quality. Cheap to ship; huge UX win on path-to-decision. |
| CMP-DQ-03 | pending | **"Why this over that" reverse-justification.** User picks a broker → page surfaces 3-4 specific reasons it beats the runners-up *for their persona*. Validates the decision + creates shareable rationale. Depends on W2-B persona match. | ~3 | Decision quality. |
| CMP-DQ-04 | pending | **Anti-recency-bias signal.** Comparison surfaces show "Top this month: X / Top over 12 months: Y. Differs because…". Counters over-weighting of promotional changes. Requires monthly snapshot table or a derived view over `broker_data_changes` + sponsorship history. | ~3 | Decision quality. |
| CMP-DQ-05 | pending | **Disclosed weights toggle.** Toggle on every comparison: "Show raw rankings without sponsorship boost". Already-existing `lib/sponsorship.ts` `boostFeaturedPartner` becomes opt-out at the URL level (`?raw=1`). | ~2 | Decision quality + transparency. Trivial engineering, big trust signal. |
| CMP-SP-01 | pending | **★ "What people like you picked" — anonymous cohort stat.** "76% of users who compared these 3 brokers chose Stake (n=312, last 90 days)". Factual observed behaviour — safe under s766B(6)(7). Reads `user_quiz_history` + `user_saved_comparisons` + `leads`. Privacy floor: minimum n=20. | ~3 | **Top pick — best ROI.** Composes existing data into a moat-building feature. |
| CMP-SP-02 | pending | **Switch counter.** "23 users switched from CommSec to SelfWealth in last 30 days." Privacy-preserving rolled-up stat from leads + outcome data. Embed at top of each `/switch-scripts/[broker-slug]` page. | ~2 | Social proof. Pairs with W3-B switch scripts. |
| CMP-SP-03 | pending | **Reviews tied to use case.** Same broker rated differently by SMSF vs daily-trader vs FHB cohorts. Wire `user_quiz_history.inferred_vertical` into review submission + render the per-cohort average alongside the overall star. | ~3 | Social proof. Reuses existing review surface. |
| CMP-SP-04 | pending | **Verified-investor badge on reviews.** Reviewer holds an account at the broker → confirmed via Stripe Identity / broker SSO. Eliminates fake reviews. Adjacent to DD-02 (verified-by-invest.com.au advisor badge). | ~4 | Social proof. Tier C (touches identity verification). |
| CMP-TR-01 | pending | **★ Open methodology page.** Public `/methodology` listing every weight, every affiliate relationship, every editorial change to rankings (date + reason). Most comparison sites hide this — radical transparency moat. Content + git-log surface; minimal engineering. | ~3 | **Top-pick triad part 1.** |
| CMP-TR-02 | pending | **Per-broker public changelog.** `/broker/[slug]/changelog` showing fees over time, outages, ASIC notices, regulator actions. Reads existing `fee_changelog` JSONB + `broker_data_changes`. Makes invest.com.au the historical reference for AU brokers. | ~3 | **Top-pick triad part 2.** |
| CMP-TR-03 | pending | **Editorial dissent line.** "Our editorial team's pick differs from the algorithmic ranking. Here's why." Single-line override per `/best/*` category when applicable. Distinguishes from purely-data-driven aggregators. | ~2 | Trust. Editorial workflow piece — needs a CMS field. |
| CMP-TR-04 | pending | **Independence dashboard.** Public page showing rough revenue split by broker partner (buckets, not exact dollars). "12% from CommSec, 18% from Stake, 0% from Westpac (no relationship)." | ~2 | **Top-pick triad part 3.** Founder/finance-team aggregation work; easy engineering. |
| CMP-RT-01 | pending | **★ Annual "your year in investing" wrap-up.** Spotify-Wrapped style. Year in numbers (brokers compared, switches, fees saved, quiz priority shifts). Highly shareable. Pulls users back every January. Composes `user_quiz_history` + `user_saved_comparisons` + `professional_leads.outcome`. | ~3 | **Best engagement-per-engineer-hour in the round.** Annual cron + share card. |
| CMP-RT-02 | pending | **Quarterly check-in email.** "It's been 3 months since you picked Stake — want to re-check whether it still suits you?" Cron over `professional_leads` joined to `notification_preferences`. Composes with W2-C 30-day outcome survey. | ~2 | Retention. Cron-only build. |
| CMP-RT-03 | pending | **Email-this-comparison-weekly.** Saved comparisons can opt into a weekly "here's the latest on your shortlist" digest with TCO + heatmap deltas. Reuses `personalized-digest` cron + `user_saved_comparisons` table. | ~2 | Retention. Pairs with W2-A "what changed" alerts. |
| CMP-OB-01 | pending | **Progressive-disclosure quiz.** 1 contextual question at a time inline on `/best/*` pages ("Quick — what matters most here?"). Each answer banks into `user_quiz_history`. Far lower friction than the standalone quiz route. | ~3 | Onboarding. Reduces activation barrier. |
| CMP-OB-02 | pending | **Goal-first landing entry.** Hero block on `/` asks "What are you trying to do?" with 8-12 outcome buttons (FHB, retire-by-60, save for kids, FIRE, expat returning). Each routes to a tailored hub. Outcome-led nav for users who don't yet know which product they need. | ~3 | Onboarding. Composes with existing hub system (W stream). |
| CMP-MO-01 | pending | **Comparison-shareable PDF export.** One-click "Download PDF" from any cart matrix. Server-side react-pdf or puppeteer. Useful for advisor handoff, family discussion, accountant referrals. Earned distribution every share. | ~3 | Mobile / accessibility. Branded export. |

**Round 2 entry condition:** all 19 items can start once PR #689 (foundation) merges. CMP-SP-04 is Tier C (identity verification surface) — surface to "Blocked — needs human input" when picked. CMP-DQ-03/04 depend on W2-B (persona match) landing — defer pickup until that's green.

**Stream CMP entry condition:** Foundation libs already on `claude/comparison-overhaul/foundation` (open PR). After that PR merges to main, CMP-W1A-INT can start immediately. CMP-W2B-PERSONA stays blocked until founder approves weights table — surface to "Blocked — needs human input" when picked.

**Compliance note:** every CMP item that surfaces ranking/scoring per user MUST run any dynamic copy through `filterFactualOutput()` (`lib/compliance.ts`) and use `RISK_WARNING_CTA` constant. Never "best for you", "you should", "recommended". The cart matrix and TCO/heatmap views are factual visualisations of disclosed numerics — low risk. Persona ranking (W2-B) is the high-risk item — see plan §W2-B AFSL gate.

---


## Done + Iteration log

_Compacted 2026-05-09: 1,223 lines of completed-stream summary + iteration log entries (iter 223–250 plus stream Done table) moved to `REMEDIATION_QUEUE_LOG_ARCHIVE.md` to keep this file readable on every loop fire. The In-flight table above shows current state for each stream; per-iteration history lives in the archive._

_The most recent ~24h of iteration log entries (iter ~325 onwards) are temporarily missing from both files — they were lost in the 2026-05-09 truncation incident (recovered as PR #661) before the rotate-iteration-log workflow could archive them. Loop's stuck-detection guard should not regress because the iteration command's Phase 2 falls back to PR-CI history when iter log entries are absent._

See [`REMEDIATION_QUEUE_LOG_ARCHIVE.md`](./REMEDIATION_QUEUE_LOG_ARCHIVE.md) for historical iteration log + completed-stream summary.

---

### Iter 340 · 2026-05-10 · Stream X · X-09b · CI-RESCUE · STATUS: CI-RESCUE

**What was done:** CI rescue for PR #702 (X-09b). Root cause: after `lib/database.types.ts` was regenerated to add `user_calculator_state` (with `state: Json` column), `tsc --noEmit` failed because `CalculatorStateMap = Record<string, QualificationData>` is not assignable to `Json`. The incompatibility: `QualificationData.data` is `Record<string, unknown>` and `unknown` is not assignable to `Json | undefined`. Fix: added `import type { Json } from "@/lib/database.types"` and cast `state: merged as unknown as Json` in both upsert call sites in `lib/calculator-state.ts` (`writeDbState` + `claimAnonymousCalculatorState`) and in `app/api/calculator-state/route.ts` POST handler. A concurrent cloud fire (commit `67eaaf4`) had also fixed the test mock (`vi.mock("@/lib/supabase/admin")` → `vi.mock("@/lib/supabase/static")`) so the unit tests now target the correct module. Pushed `df53205`.

**Status:** `STATUS: CI-RESCUE · stream=X · pr=#702`

---

### Iter 339 · 2026-05-10 · Stream CC · CC-02+CC-03 · STATUS: PROGRESS (false-positive)

**What was done:** Phase 4 verification gate caught CC-02 and CC-03 as false-positives. CC-02: `lib/country-mode/supply-thresholds.ts` already has `PER_COUNTRY_THRESHOLDS = { NZ: { experts: 1 } }` (lines 34–38) — exactly the NZ threshold tuning the audit requested. Comprehensive tests at `__tests__/lib/country-mode/supply-thresholds.test.ts` (lines 83–135) cover all NZ cases. CC-03: `CountryExpertsPreview.tsx` explicitly documents (line 7 comment) that it filters by advisor `type` only, not by language — the "language specialty filters produce 0-row results" risk described in the queue doesn't materialize because language is not applied in the DB query at all. All three countries (IN/SG/HK) already include `"en"` in their language config arrays for future use. CC-05 dependency on CC-03 was a false dependency — CC-05 can start immediately. Updated CC-05 notes accordingly.

**Status:** `STATUS: PROGRESS · stream=CC · item=CC-02+CC-03 · false-positive`

---

### Iter 338 · 2026-05-10 · Stream LL · LL-01..LL-04 · STATUS: PROGRESS (false-positive)

**What was done:** Phase 4 verification gate caught a false-positive: the entire LL (Lead-gen / email capture) stream pre-exists. Evidence: `components/NewsletterSignup.tsx` (188 LOC, full + compact variants + Resend integration), `components/NewsletterExitIntentModal.tsx` (255 LOC), `app/api/newsletter/subscribe/route.ts` (131 LOC, Zod validation + DB rate-limit + Resend), `lib/newsletter.ts` (251 LOC), `app/newsletter/page.tsx`, `__tests__/api/newsletter-subscribe.test.ts`. LL-02: `components/LeadMagnet.tsx` + `components/ContextualLeadMagnet.tsx` + SMSF checklist email gate. LL-03: `app/account/notifications/` (page + list + API route). LL-04: `lib/quote-emails.ts` + `lib/advisor-booking.ts` cover all transactional templates. All 4 items marked false-positive. No code committed.

**Status:** `STATUS: PROGRESS · stream=LL · item=LL-01..LL-04 · false-positive`

---

### Iter 336 · 2026-05-10 · Stream X · X-09b · STATUS: PROGRESS

**What was done:** Detected that PR #641 (X-06), #643 (X-07), #644 (X-08), and #678 (CC-04) had all merged to main since the last queue update. X-09b was blocked (#648) due to unrelated-history issue (main force-push). Found `claude/audit-remediation/x-09b-ratchet-final` branch already prepped with the correct fix: switched `app/find/[advisor-type]/[city]/page.tsx` from `createAdminClient` to `createClient`/`createStaticClient` (professionals table has anon SELECT policy) + ratcheted `eslint.config.mjs` warn→error. Created PR #702. Updated queue: X row updated, CC-04 marked merged, X-09b blocked entry resolved.

**Status:** `STATUS: PROGRESS · stream=X · item=X-09b · pr=#702`

---

### Iter 337 · 2026-05-10 · Stream KK · KK-03 · STATUS: PROGRESS

**What was done:** Batch iter 2. Phase 2: PR #702 (X-09b) CI mostly green (2 checks still running, no failures). PR #640 (R-M2B) was a draft — converted to ready-for-review to trigger full CI. Phase 3 selection: KK-03 (priority slot 14 — first unblocked item after B-09/C-03..05/O post-merge residuals all blocked). Created branch `claude/audit-remediation/kk-03-topic-cluster-map` from main. Built `/admin/topic-clusters` RSC page: 10 cluster cards, 5 summary stats (clusters/pages/unique slugs/article slugs/cross-cluster), spoke grids with ×2+ badge on shared pages, cross-cluster chips on each pillar, "How it works" panel. Added sidebar nav link in Content group. 242 LOC. Opened PR #703. Queue: added KK row to In-flight table, KK-03 marked in-flight, R row updated.

**Status:** `STATUS: PROGRESS · stream=KK · item=KK-03 · pr=#703`