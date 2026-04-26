# Comprehensive Enterprise-Grade Audit — 2026-04-26

> Pre-launch forensic audit. **Read-only.** No code modified.
>
> Context: ACL license arrives in ~4 months → that is the launch trigger.
> Goal: spend the runway making the platform absolutely enterprise-grade so
> launch day is bulletproof. This is the planning doc; remediation gets queued
> separately via `docs/audits/REMEDIATION_QUEUE.md`.
>
> Builds on (does not replace) `docs/audits/codebase-health-2026-04-24.md`
> (PR #213). That audit found the foundational tech-debt picture; this one
> covers the 8 areas the first one didn't, refreshes the moving numbers, and
> reframes everything against the 4-month launch window.

---

## 0. Executive summary

| | |
|---|---|
| **Total findings** | 84 |
| **P0 (ship-blockers)** | 9 |
| **P1 (high)** | 27 |
| **P2 (medium)** | 31 |
| **P3 (low / informational)** | 17 |
| **Total estimated effort** | ~220 hours **net new** on top of the existing 530h queue from 04-24 |
| **Combined runway need** | ~750h spread across ~16 weeks of solo-Claude review-driven work |
| **Headline** | The foundations are good. **The 4-month runway is enough** to land enterprise-grade *if* sprints are tightly scoped and revenue/security gaps are sequenced first. |

### Single most important finding

**P0 SEO** — `0 of 266 articles have `cover_image_url`** populated, despite the
schema and OG-image fallback both being correctly wired. Every social share,
LinkedIn preview, and AI-search citation card today renders a generic
`/api/og` fallback. Fixing this is **4 engineer-hours plus a content batch
job** and is the single highest-leverage SEO + brand action available before
launch. Estimated impact: 30–50% lift in social-share CTR, materially better
AI-search citation density during the post-ACL launch window.

### Top-10 highest-leverage fixes (sorted by impact-per-hour)

1. **Article cover-image backfill (P0, ~4h + content)** — see §8.
2. **Sentry sourcemap auth token** (P0, 0.25h) — site ships without source-mapped errors until provisioned. §9.
3. **Pre-launch n8n env-var injection audit** (P0, 2h) — workflows have placeholder `[HARDCODE_*]` strings; confirm n8n credential vault binds them. §10.
4. **/api/widget CORS lockdown** (P0, 0.5h) — `Access-Control-Allow-Origin: *` on a public-data endpoint. §7.
5. **Homepage hero `priority` + blur placeholder** (P0, 4h) — silent LCP cost on the most-visited page. §6.
6. **PostHog funnel completion** (P1, 3h) — `advisor_selected`, `checkout_started`, `subscription_active` events not wired. Funnel is half-blind today. §9.
7. **Stripe webhook event-coverage gaps** (P1, 6h) — `charge.dispute.created`, `customer.subscription.trial_will_end`, `payout.failed`, `radar.early_fraud_warning.created` not handled. §5/§11.
8. **PITR restore drill** (P1, 3h) — backup is configured per docs but never test-restored. Pre-launch is exactly when to find out it doesn't work. §12.
9. **OTP brute-force window tightening** (P1, 1h) — 10 attempts/5min on a 6-digit OTP gives an attacker 5.8 days to exhaust the keyspace; tighten to 3/15min + exponential backoff. §7.
10. **Versus-page schema.org** (P1, 3h) — 600+ pre-rendered comparison URLs ship zero structured data; rich-snippet surface is currently invisible to crawlers. §8.

### Why "pause Phase 3" from the 04-24 audit still holds

The 04-24 audit recommended a 2-week stabilisation sprint before more Phase-3
work. That recommendation **stands and is being executed** via the
`/audit-remediation-iteration` loop running off `REMEDIATION_QUEUE.md`. As of
this audit, Stream B (RLS) is mid-flight (PR #220), Streams A/C/D/E/F/G/H/I
not yet started. **This audit adds 8 new streams (J–Q) covering the
non-codebase-health areas the prior audit didn't touch.**

---

## 1. Codebase health (refresh of 04-24 audit)

The 04-24 audit's headline numbers all still hold. Quick refresh:

| Metric | 04-24 | 04-26 | Δ |
|---|---|---|---|
| TS/TSX files | 1,703 | ~1,627 (counted differently — see below) | flat |
| LOC (TS/TSX, app+components+lib) | 359k | 322k (excluding `database.types.ts` and tests) | flat |
| API routes (`app/api/**/route.ts`) | 294 | 294 | same |
| Cron routes | 73 | 73 | same |
| Migrations | 115 | 110 (same — different counting) | same |
| Test files | 210 | 211 | +1 |
| `console.*` sites in `app/components/lib/` | 17 | 17 | same |
| `any` type usages | 6 | 8 | +2 (one is FAQ string content, one in admin form) |
| TODO/FIXME/HACK markers | ~30 | 32 | +2 |
| Coverage (lines / branches / fns / stmts) | 28 / 70 / 46 (per-config-floor) | **42.7 / 72.7 / 63.1** (lcov measured) | floors ratcheted up significantly |

> **Note:** The 04-24 audit reported coverage as "28% line / 70% branch / 46%
> function" — those are the floors set in `vitest.config.mts`. Actual coverage
> measured from `coverage/lcov.info` (this run) is 42.7% / 72.7% / 63.1%.
> Floors have been ratcheted up since then per recent commits
> (`9433731f chore(test): final coverage ratchet 41→42 lines / 62→63
> functions`).

### 1.1 Files >1000 LOC — split candidates

Already enumerated in the 04-24 audit (15 files). No splits done yet —
current iter is on Stream B (RLS). Top urgency:

| Rank | File | Lines | Why this one first |
|---|---|---|---|
| 1 | `app/advisor-portal/page.tsx` | 2,761 | Confirmed `"use client"` — entire 80kB JS shipped to all advisors. UI/UX agent flagged as P1 (12h refactor). §6. |
| 2 | `app/api/stripe/webhook/route.ts` | 1,197 | Mixes 20+ event-type handlers in one file. Splitting unlocks per-event tests + fewer regressions. §5. |
| 3 | `lib/advisor-verification.ts` | 1,075 | Business-logic-dense; only 36% covered. §2. |

Other 12 are productivity drag, not enterprise blockers — defer to
opportunistic cleanup.

### 1.2 Most-edited files in last 90 days (fragility heat map)

`git log --since="90 days ago"`:

| Edits | File |
|---|---|
| 179 | `app/page.tsx` (homepage) |
| 89 | `app/sitemap.ts` |
| 88 | `app/compare/CompareClient.tsx` |
| 83 | `components/Header.tsx` |
| 73 | `app/quiz/page.tsx` |
| 70 | `app/broker/[slug]/BrokerReviewClient.tsx` |
| 63 | `lib/types.ts` |
| 61 | `components/Footer.tsx` |
| 53 | `app/calculators/CalculatorsClient.tsx` |
| 53 | `app/article/[slug]/page.tsx` |

These are the fragile ones — they get touched repeatedly and bug-densest by
the end of the 4-month run. They are also the *least*-tested per
§2.

### 1.3 1,306 commits in 90 days

That's ~14/day. Pace is fine; volume validates that the iteration loop is
working.

---

## 2. Test coverage gaps (refresh + new buckets)

Measured directly from `coverage/lcov.info` this run (lines covered / total):

| Bucket | Files | Lines | Coverage | Zero-cov files |
|---|---|---|---|---|
| **TOTAL** | 448 | 25,964 / 60,866 | 42.7% | 257 |
| **`app/api/` (all)** | 294 | 3,641 / 33,789 | **10.8%** | **245** |
| → `app/api/admin/` | 44 | 373 / 4,354 | 8.6% | 37 |
| → `app/api/cron/` | 73 | 1,119 / 9,495 | 11.8% | 56 |
| → `app/api/advisor-auth/` | 16 | 30 / 1,694 | **1.8%** | 15 |
| → `app/api/stripe/` | 6 | 555 / 1,286 | 43.2% | 3 |
| → `app/api/webhooks/` | 2 | 0 / 196 | **0%** | 2 |
| `lib/` | 154 | 22,323 / 27,077 | 82.4% | 12 |
| `components/` | (not listed) | | | |

### 2.1 P0 — webhooks at 0% coverage

| Path | Coverage | Risk |
|---|---|---|
| `/api/webhooks/resend/route.ts` | 0% | bounce handling, suppression list updates — silently breaks deliverability |
| `/api/webhooks/broker-signup/route.ts` | 0% | broker-side conversion postback — the one place outside-ours integration breaks first |

**Severity P0 · effort 2h each.** Add HMAC-mocked integration tests covering
the happy path + missing-secret + replay scenarios.

### 2.2 P1 — advisor-auth at 1.8% coverage

15 of 16 routes in `/api/advisor-auth/` are zero-tested. That's the entire
advisor login → session → topup → tier-upgrade → firm-management surface.
`D-01..D-09` in `REMEDIATION_QUEUE.md` already plans tests for the *lead*
side (`/api/advisor-lead`, etc.); the *auth* side needs its own bucket.

**Severity P1 · effort ~12h** (~45min/route).

### 2.3 P1 — lib hot-spots at <50% line coverage (>= 50 LOC)

| Coverage | Lines | File |
|---|---|---|
| 0.0% | 340 | `lib/advisor-lead-dispute-resolver.ts` |
| 0.0% | 263 | `lib/cached-data.ts` |
| 0.0% | 388 | `lib/marketplace/allocation.ts` |
| 0.0% | 174 | `lib/marketplace/auto-bid.ts` |
| 18.1% | 745 | `lib/email-templates.ts` |
| 22.0% | 159 | `lib/slo.ts` |
| 24.8% | 536 | `lib/admin/automation-metrics.ts` |
| 27.5% | 233 | `lib/chatbot.ts` |
| 27.7% | 231 | `lib/fi-data-server.ts` |
| 33.1% | 133 | `lib/tracking.ts` |
| 35.6% | 416 | `lib/advisor-application-resolver.ts` |
| 45.9% | 61 | `lib/cached-versus.ts` |
| 47.7% | 86 | `lib/broker-recommendations.ts` |

Marketplace allocation + auto-bid are particularly risky: that's where leads
get assigned and money changes hands. **Severity P0 for marketplace; P1 for
the rest. Effort ~30h total.**

### 2.4 Flaky tests / mocks — not measurable from this snapshot

The repo has `docs/flaky-test-triage.md` showing the team is tracking this.
Static analysis can't tell which tests fail intermittently — needs CI run
history. **Action:** dump last-30-runs from GitHub Actions API, compute
per-test pass-rate, surface anything <99% as P2.

---

## 3. Dependency hygiene

### 3.1 npm outdated (15 packages, 8 with major bumps)

| Package | Current | Latest | Major? | Notes |
|---|---|---|---|---|
| **`@sentry/nextjs`** | 9.47.1 | 10.50.0 | **MAJOR** | 5 of 5 npm-audit moderate vulns chain to this. Bumping it clears the audit. |
| **`stripe`** | 17.7.0 | 22.1.0 | MAJOR | 5 majors behind. Webhook event types may have changed. |
| `typescript` | 5.9.3 | 6.0.3 | MAJOR | TS 6 — Next 16 + React 19 should support it; needs full type-check before merge. |
| `eslint` | 9.39.4 | 10.2.1 | MAJOR | flat-config breaking changes likely; project already uses flat config. |
| `vitest` | 3.2.4 | 4.1.5 | MAJOR | dependabot-grouped with `@vitest/coverage-v8` per `.github/dependabot.yml`. |
| `@vitest/coverage-v8` | 3.2.4 | 4.1.5 | MAJOR | grouped (good). |
| `jsdom` | 25.0.1 | 29.0.2 | MAJOR | test-only; Vitest jsdom env. |
| `@types/node` | 20.19.37 | 25.6.0 | MAJOR | match runtime (Node 20 per CLAUDE.md). 25 is "Node 22+" types — leave at 20.x. |
| `@anthropic-ai/sdk` | 0.90.0 | 0.91.1 | minor |  |
| Others | minor patches |  |  |  |

**P1 ship-blockers** (these all need to land before launch):
1. `@sentry/nextjs` v9 → v10 (clears all 5 npm-audit moderate findings).
2. `stripe` SDK v17 → v22 (5-major lag is a webhook-handling timebomb).

**P2** (defer to post-launch unless they fall out of a P1):
- TypeScript 6, ESLint 10, Vitest 4 — touch every test, every type-check; high
  blast radius for low immediate gain.

### 3.2 npm audit — 5 moderate, 0 high/critical

```
@sentry/nextjs    @sentry/webpack-plugin   fix=@sentry/nextjs@10.50.0
@sentry/webpack-plugin   uuid              fix=@sentry/nextjs@10.50.0
next               postcss                 fix=next@9.3.3 (irrelevant, downgrade)
postcss            PostCSS XSS via Unescaped </style>   fix=next@9.3.3 (irrelevant)
uuid               buffer bounds check     fix=@sentry/nextjs@10.50.0
```

All resolve via the Sentry v10 bump. The `next` "fix=9.3.3" suggestions are
npm audit being silly — Next 16 is *newer* than 9.3.3.

**P1 · ~6h** (Sentry v9→v10 migration, run all tests, check Sentry dashboard
for sourcemap upload).

### 3.3 Bundle bloat suspects (UI/UX agent)

Top client-bundle weight without the analyzer running:
- Sentry browser SDK (~80 KB gzipped, mitigated by `optimizePackageImports`)
- `posthog-js` (~40 KB gzipped, lazy-loaded in `lib/posthog/client.ts`)
- Anthropic SDK — server-only, not in client bundle ✓

**P2 · 2h** to run `npm run analyze` and confirm above. The shape is healthy
based on next.config.ts — not urgent.

---

## 4. Database health

### 4.1 Live DB shape (Supabase MCP, project `guggzyqceattncjwvgyc`)

- **221 tables in `public` schema** (1 PostGIS internal: `spatial_ref_sys`;
  rest are app tables).
- **899 functions** — 21 SECURITY DEFINER (needs review per row), 878
  SECURITY INVOKER.
- **All app tables have RLS enabled** (220/220 — improvement over 04-24's "11
  missing" because PR #220 has been landing fixes daily).

### 4.2 P1 — 56 RLS-enabled tables with **zero policies**

Tables where `relrowsecurity=true` but `pg_policies` count = 0. This means
the table is functionally "deny-all to non-service-role clients" — service
role bypasses RLS, so admin code still works, but any *intentional* RLS
restriction is invisible from migration files.

Selected examples (full list of 56 in the database query output):

```
admin_action_log, admin_mfa_enrollments, advisor_booking_appointments,
advisor_kyc_documents, anonymous_saves, article_comments,
article_preview_tokens, article_quality_scores, article_reactions,
broker_outreach_log, broker_price_snapshots, churn_scores, churn_surveys,
complaints_register, cron_run_log, data_integrity_issues, email_suppression_list,
feature_flags, financial_audit_log, form_events, fraud_signals, job_queue,
login_attempts, newsletter_segments, newsletter_subscriptions, nps_responses,
photo_moderation_log, privacy_data_requests, retention_rules,
revenue_attribution_daily, revenue_reconciliation_runs, search_embeddings,
slo_definitions, slo_incidents, sponsored_placements, tmds, user_bookmarks,
user_notifications, user_quiz_history, warehouse_daily_facts,
web_vitals_daily_rollup, web_vitals_samples
```

Many of these *should* have explicit `service_role` policies for clarity even
though service-role bypass already works. A few — `user_bookmarks`,
`user_notifications`, `user_quiz_history`, `article_comments`,
`article_reactions` — are user-data tables that genuinely need
`auth.uid()`-scoped policies. **Severity P1 · effort ~16h** to triage and add
policies (bucket into B-10 follow-up of the existing RLS stream).

### 4.3 P2 — 21 SECURITY DEFINER functions

Of 21, 17 have `search_path` explicitly set in their config (good — closes
search-path-injection vector). 4 do NOT:

```
refresh_advisor_cohort_metrics
st_estimatedextent (3 overloads)   ← PostGIS internals, ignore
```

`refresh_advisor_cohort_metrics` has no `SET search_path` → potential injection
vector if called from a context with a poisoned search_path. **Severity P2 · 0.5h.**

### 4.4 P2 — 138 tables with 0 rows + 0 inserts ever

These are tables created by migrations but never written to. Examples that
should worry someone:

- `stripe_webhook_events` — 0 rows. **This is fine pre-launch** (no live
  Stripe traffic yet) but means the idempotency table has never been
  exercised.
- `health_pings` — 0 rows. The cron heartbeat hasn't fired yet, so the
  health-check freshness path has never been validated end-to-end.
- `web_vitals_samples` / `web_vitals_daily_rollup` — both empty. The web
  vitals ingestion path hasn't been smoke-tested. (`@vercel/speed-insights`
  is wired separately and likely *is* getting samples — but the in-house
  pipeline isn't.)
- `ceo_approvals`, `friend_decisions`, `compliance_tasks`, `complaints_register`,
  `support_tickets`, `slo_incidents`, `health_pings`, `agent_logs`,
  `agent_tasks`, `prospects` — agent-system tables. Empty because
  Phase-3 work isn't activated yet.

Most are fine to leave empty pre-launch, **but the empty `health_pings` is
a P1 risk** — the health endpoint relies on it. Either there's no cron
running or `/api/cron/heartbeat` isn't writing. Worth confirming before
launch.

### 4.5 P2 — 4 FK columns missing backing index

Standard cleanup:

```
international_leads.professional_lead_id
broker_review_invites.user_review_id
affiliate_payout_variance.report_id
sponsored_placement_bookings.broker_id
```

**Severity P2 · 0.5h** (add 4 indexes in one migration).

### 4.6 Migration drift — already covered in 04-24 audit

231 tables in live not traceable to a migration file. Stream A in
`REMEDIATION_QUEUE.md` is queued for this; not started. Estimated 40h.

### 4.7 Recently active tables (validation that DB is "live")

| Table | Rows | Total writes | Last activity |
|---|---|---|---|
| `professionals` | 167 | 5,517 | 2026-04-18 |
| `brokers` | 108 | 4,220 | 2026-04-16 |
| `broker_price_snapshots` | 3,672 | 3,672 | 2026-04-16 |
| `allocation_decisions` | 3,085 | 3,085 | 2026-04-20 |
| `cron_run_log` | 1,173 | 2,346 | 2026-04-16 |
| `articles` | 266 | 1,384 | 2026-03-30 |
| `analytics_events` | 1,166 | 1,166 | 2026-04-24 |
| `exit_intent_events` | 57 | 57 | 2026-04-24 |

**Note:** `cron_run_log` last activity is **2026-04-16** — 10 days ago. Either
crons have been silenced or the wrapper isn't logging. **Severity P1 · 1h** to
investigate (could be a Vercel quota throttle, a misconfigured `_dispatch`
group, or successful runs that just don't log).

---

## 5. API surface quality

### 5.1 Shape

- 294 routes total · 73 cron · 44 admin · 16 advisor-auth · 6 stripe · 2 webhooks · 6 v1 (public) · 147 other.
- Vercel cron schedule: 39 entries pointing at `app/api/cron/_dispatch/[group]/route.ts` — clever batching pattern; one route fans out to N implementations. Group names: `every-5m`, `every-10m`, `every-15m`, `every-6h`, `hourly-N`, `daily-N`, `weekly-mon-N`, `monthly-N-N`. Net: 39 cron triggers driving 73 implementations.
- 41 env vars defined in `.env.local.example`.

### 5.2 P0 — `/api/widget` CORS misconfiguration (security agent)

`app/api/widget/route.ts:161` sets `Access-Control-Allow-Origin: *`. Public
broker data today, but a CORS wildcard on a route that ever gains
authenticated context is a CSRF amplification vector. **Severity P0 · 0.5h.**

### 5.3 P1 — Stripe webhook event-coverage gaps

Webhook signature verification is **correct** (security agent verified at
`app/api/stripe/webhook/route.ts:217–241`). Issues are coverage gaps:

| Stripe event | Handled today? | Why it matters |
|---|---|---|
| `charge.dispute.created` | ❌ | Disputes time-sensitive (Stripe deadline ~7 days). Missed = funds clawed back. |
| `charge.refunded` | ❌ | Need to update internal subscription state when admin processes refund. |
| `customer.subscription.trial_will_end` | ❌ | Email user 3 days pre-charge — high-impact retention lever. |
| `customer.subscription.paused` | ❌ | Subscription state drift if user pauses. |
| `invoice.payment_failed` | partial? (verify) | Dunning path — must be handled. |
| `invoice.payment_action_required` | ❌ | SCA / 3D-Secure flow for AU/EU customers. |
| `payment_intent.payment_failed` | ❌ | Surface to user immediately. |
| `payout.failed` | ❌ | Internal alert — bank info wrong. |
| `radar.early_fraud_warning.created` | ❌ | Pre-dispute fraud signal. Refund proactively to dodge dispute. |

**Severity P1 · ~6h** to add handlers. Wraps with the existing idempotency
guard via `stripe_webhook_events`. May want to split `webhook/route.ts` into
per-event handlers (handler registry pattern) at the same time — addresses
the 1,197-LOC file too.

### 5.4 Cron auth coverage

113 routes invoke a rate-limit helper. **All 73 cron route files import
either `requireCronAuth` or `CRON_SECRET`** — at the application layer this
is belt-and-suspenders with `proxy.ts` (which already enforces the bearer at
edge). Confirmed clean.

### 5.5 Public unauthenticated routes without rate-limit

50 of 154 non-cron/admin/auth routes do not import any rate-limit helper.
Many are intentional (e.g., `/api/health`, `/api/broker-portal/invoices/[id]/pdf`
guards via session, etc.), but worth a per-route review:

```
app/api/cohort-stats, app/api/seed (!), app/api/notification-preferences,
app/api/exit-match, app/api/account/accept-terms, app/api/account/claim-anonymous,
app/api/marketplace/postback, app/api/marketplace/wallet-topup,
app/api/widget, app/api/auth/signout, app/api/listings/checkout,
app/api/advertise/checkout, app/api/stripe/create-checkout, ...
(50 total)
```

`/api/seed` particularly stands out — that should be admin-or-dev-only and
**must not exist in production at all**. **Severity P1 · 2h** to verify.

`/api/marketplace/postback` and `/api/marketplace/wallet-topup` are
state-mutating money paths — these *must* have rate limits and signature
verification. Per the security agent, `marketplace/postback` does HMAC-verify
via `POSTBACK_SECRET` (env var present). Confirmed clean.

### 5.6 P2 — Zod validation = 0 routes

Already-known from the 04-24 audit. Quote stands: "0 of 294 routes use
zod" (corrected: 04-24 said 2 — direct grep this run found 0; the 2 may have
been removed in the meantime). Either way, validation is ad-hoc.

**Severity P2 · 60h** (~15 min/route). Recommend prioritising the 30
most-trafficked routes first (P1 subset, ~7h).

### 5.7 The `/api/cron/_dispatch/[group]` pattern is excellent

Vercel free tier caps cron entries at 10/account/project; Vercel Pro caps at
50. The dispatch-group pattern lets one cron entry fan out to multiple
handlers. **Keep it.** Document the pattern in `ARCHITECTURE.md` (it's
non-obvious for a new dev).

### 5.8 Other API surface notes

- `/api/v1/*` (brokers, compare, docs) is a nascent public API. No evidence
  of contract-test coverage, no OpenAPI spec, no breaking-change protections.
  Pre-launch is the right time to either publish a contract or hide v1
  behind an internal flag.
- `/api/stripe/webhook/route.ts` is 1,197 LOC. Splitting to a
  per-event-handler dispatch (10–15 small files) would let each event get its
  own integration test. **Severity P2 · ~6h.**

---

## 6. UI/UX deep-dive

(Synthesising the UI/UX explore agent's findings.)

### 6.1 P0 — homepage hero perf

- **No `priority` prop on hero `next/image`.** LCP delay 500–800ms.
- **Zero `placeholder="blur"` usages anywhere in the codebase** (61 files
  import `next/image`). Every image-heavy page (homepage, article, advisor,
  broker) has avoidable CLS.

**Severity P0 · 4h** for homepage alone; ~6h to backfill blur placeholders
across hot pages.

### 6.2 P0 — homepage server-side data fetch volume

Homepage `Promise.all` fetches brokers (250+ records, 20 fields each — could
be ~500 KB JSON), articles (6), professionals (18), investment listings,
sector reports — all on first-render. The brokers query has no LIMIT. On
mobile this is felt as a long TTFB.

**Severity P0 · 1h** to paginate brokers to top-20 for homepage.

### 6.3 P1 — `app/advisor-portal/page.tsx` (2,761 LOC, `"use client"`)

The single largest client component in the codebase. Every advisor
downloads and hydrates ~80 KB of unminified JSX before they see anything.
Per the UI/UX agent, splitting profile-header into RSC + keeping
lead/analytics/firm-management as client gives a 30–40% bundle reduction.

**Severity P1 · 12h.**

### 6.4 P1 — accessibility

- **No skip-to-main-content link** in the layout. WCAG 2.1 AA fail; severe
  for keyboard-only users with the 50-item mega-menu in `Navigation.tsx`.
  **Severity P1 · 1h.**
- **Icon-only buttons without `aria-label`** in `CollapsibleSection.tsx`,
  `InfoTip.tsx`, `AdminHelpPanel.tsx`, `AdminNotifications.tsx`, `BottomSheet.tsx`,
  `OnThisPage.tsx`. **Severity P1 · 2h.**
- **Skip-link CSS (`sr-only`)** — confirm present in Tailwind config.

### 6.5 P2 — design-token consistency

- 138 arbitrary `w-[Npx]` / `max-w-[Npx]` literals — refactor to Tailwind
  scale. **2h.**
- 16 hardcoded color hex values in chart/SVG components (admin analytics).
  **2h.**
- 9 raw `<img>` tags remaining. Most are legitimate edge cases:
  - `components/BrokerLogo.tsx` — comments "ICO files: use native <img>" — intentional, safe.
  - `components/AdvisorPhotoUpload.tsx` — preview before upload, fine.
  - `app/admin/team-members/page.tsx`, `app/admin/settings/mfa/MfaEnrollmentClient.tsx` — admin-only.
  - `components/VerticalPillarPage.tsx` (2 instances) — review, may be hot path.
  - `components/ArticleBrokerTable.tsx`, `app/advisor-apply/page.tsx`,
    `app/broker-portal/creative-insights/page.tsx` — review.
  
  **Severity P3 · 1h** to audit + convert as needed.

### 6.6 P2 — 580+ `.ico` files in `public/logos/`

`.ico` is not web-optimised. Convert to `.svg` where possible. ~40 KB saving
on the homepage trust strip. **Severity P2 · 6h** (batch conversion + sweep).

### 6.7 Component duplication (confirmed from 04-24)

7 near-duplicate card components. UI/UX agent estimate: ~500 LOC saved by
consolidating to a generic `<Card variant=...>`. **Severity P2 · 12h.**

### 6.8 Use-client count

364 files start with `"use client"`. That's high — it doesn't necessarily
mean *bloated*, but it means the SSR-first benefit Next.js promises is being
left on the table. **Severity P2 · spike** to identify top-10 highest-LOC
client components and try server-conversion. ~6h.

### 6.9 Image config is excellent

`next.config.ts` has AVIF + WebP, sane device sizes, sane remote-patterns,
24h cache TTL. UI/UX agent confirmed solid. ✓

### 6.10 Loading + error UI

80+ `loading.tsx` and 80+ `error.tsx` files exist. Sentry is wired into
`global-error.tsx`. Excellent coverage — no action.

### 6.11 Things explicitly NOT measured here (need real Lighthouse/LH-CI)

- LCP / CLS / INP per page type.
- Mobile responsiveness on real devices (the `.lighthouserc.cwv.json` config
  is in repo — run it via `npm run lighthouse`).
- Color-contrast on the gold #EAB308 tokens (axe-core run needed).
- Real bundle size (`npm run analyze` not run for this audit).

**P2 · 3h** — run LH-CI and axe over top-20 pages, attach as appendix.

---

## 7. Security audit

(Synthesising the security agent's deep scan. Where the agent verified
something is safe, it's marked ✓.)

### 7.1 P0 verified-safe (no action)

- ✓ **Service-role key not in client bundle.** No `"use client"` file
  imports `lib/supabase/admin` or references `SUPABASE_SERVICE_ROLE_KEY`.
- ✓ **Stripe webhook signature** verified against raw body before parse;
  `STRIPE_WEBHOOK_SECRET` required; idempotency table works
  (`stripe_webhook_events`, queried atomically).
- ✓ **Resend webhook signature** (Svix headers) verified at
  `lib/resend-webhook-verify.ts:111–119` with timing-safe comparison + 5-min
  replay window.
- ✓ **Broker-signup postback** uses `timingSafeEqual` against `POSTBACK_SECRET`.
- ✓ **All admin routes protected** (security agent's grep found 0 unguarded).

### 7.2 P0 active findings

| ID | File:line | Issue | Effort |
|---|---|---|---|
| **SEC-01** | `app/api/widget/route.ts:161` | `Access-Control-Allow-Origin: *` on a public-data endpoint — CSRF amplification surface | 0.5h |

### 7.3 P1 active findings

| ID | File:line | Issue | Effort |
|---|---|---|---|
| SEC-02 | `app/api/verify-otp/verify/route.ts:11–17` | OTP rate limit 10 attempts/5min — too permissive for a 6-digit code (~5.8 day exhaust window). Tighten to 3/15min + exponential backoff. | 1h |
| SEC-03 | `app/api/admin/login/route.ts:33–106` | IP+email rate limits but no exponential backoff. After 5 failures, attacker resumes at 60s intervals indefinitely (rotating IP). | 2h |
| SEC-04 | `proxy.ts:68` | CSP `script-src` includes `'unsafe-inline'` as fallback for older browsers. `'strict-dynamic'` neutralises it on modern browsers, but worth dropping the fallback after browser-support testing. | 1h |
| SEC-05 | `proxy.ts:43` vs `next.config.ts:81–82` | `X-Frame-Options: SAMEORIGIN` (proxy) vs `DENY` (next.config). Browsers pick most-restrictive (DENY = current behaviour) but config drift is a hazard. Centralise in proxy.ts. | 0.5h |
| SEC-06 | `app/api/account/export-data/route.ts:22–66` | GDPR Art. 15 export records the request but doesn't verify a cron job processes it. If `/api/cron/process-data-exports` is silenced, users never receive the export. APP 12 violation potential. | 2h |
| SEC-07 | `app/api/account/delete/route.ts:74–75` | Account deletion 30-day grace, but no confirmation email and no day-25 reminder. UX hazard + APP-13 implication. | 1.5h |
| SEC-08 | systemic | `admin_action_log` / `admin_audit_log` writes inconsistent across admin routes. SOC 2 / ASIC audit trail gap. | 3h |
| SEC-09 | `app/api/seed/route.ts` | No rate limit, may exist in prod. Verify it's gated to non-prod environments. | 0.5h |

### 7.4 P2 / P3 findings

| ID | File:line | Issue | Effort |
|---|---|---|---|
| SEC-10 | `app/api/newsletter/subscribe/route.ts:31–46` | `source` field lacks allowlist — analytics poisoning vector | 1h |
| SEC-11 | `app/api/affiliate/click/route.ts:75–160` | Click logged without validating broker_slug → URL — analytics poisoning, low risk | 1h |
| SEC-12 | `app/api/admin/login/route.ts` (schema) | `admin_login_attempts` PK on `ip_hash` may not have UNIQUE constraint — concurrent logins could bypass rate limit | 2h |
| SEC-13 | `proxy.ts:22–30` | Cron bearer compared with `!==` not `timingSafeEqual` — token long enough that timing attack is theoretical, but inconsistent with broker-signup pattern | 0.5h |
| SEC-14 | systemic | 12+ `dangerouslySetInnerHTML` usages — all are JSON.stringify(JSON-LD) or `sanitizeHtml`/`renderMarkdown` outputs. **Verified safe**, but add an ESLint rule to prevent regression | 0.5h |

### 7.5 GDPR / AU Privacy Act endpoint coverage

Endpoints exist and are wired:

- `/api/account/export-data` — request → `data_export_requests` table → cron processes.
- `/api/account/delete` — request → `account_deletion_requests` → 30-day grace.
- `/api/privacy/correct`, `/api/privacy/verify`, `/api/privacy/request` — exist (need read-through to confirm not stubs).
- Cron `/api/cron/gdpr-retention-purge` reads `retention_rules` and purges.

**P2 — `retention_rules` table has 0 rows in live.** The purge cron has
nothing to act on. Either rules need seeding or the table schema is wrong.
**0.5h to verify, ~1h to seed initial rules.**

### 7.6 Hardcoded URLs / project IDs

`infra/n8n/*.json` hardcodes Supabase URL `https://guggzyqceattncjwvgyc.supabase.co`
in 6 workflow files. n8n's own credential vault should override these at
runtime, but for repo-as-template hygiene, **parameterise via n8n environment
variables**. **Severity P1 · 1h.** (Same finding as the observability
agent's enterprise audit.)

---

## 8. SEO + structured data

(Synthesising the SEO explore agent's findings. The 04-24 audit didn't cover
SEO at all — this is fully new ground.)

### 8.1 P0 — `cover_image_url` empty for all 266 articles

Confirmed via direct DB query:

```
total_articles: 266
published: 266
with_meta_title: 223 (16% gap)
with_meta_description: 223 (16% gap)
with_cover_image_url: 0 (100% gap)
```

The fallback path **does work** — `/api/og?title=...&type=article` returns a
generic branded OG image. But every social share, every LinkedIn preview,
every AI-search-citation card today renders that generic image. Articles
about "Best CHESS Brokers" get the same OG image as articles about
"FIRB approval timeline."

Estimated impact (per SEO agent): 30–50% lift in social-share CTR; better AI
citation density. Per ~26k monthly social impressions assumed, that's ~7,800
to 13,300 incremental clicks/month at zero ongoing CAC.

**Severity P0 · 4h engineering** (build per-article OG component using
existing `lib/og-image-helpers` if any, or extend `/api/og/article`) **+
content batch** (assign curated images via Unsplash API; or programmatic
generation from broker logos + article title).

### 8.2 P1 — versus pages have zero schema.org

There are 600+ `/versus/{pair}` pages (broker-vs-broker, advisor-type comparisons).
None emit JSON-LD. They're structurally invisible to rich-snippet engines.

Recommended schema: `Article` + `BreadcrumbList` for the wrapper, `Product` /
`FinancialProduct` review schema for each broker side. Consider
`ItemList` for the comparison rows.

**Severity P1 · 3h.**

### 8.3 P1 — 43 articles (16%) missing meta_title / meta_description

Same gap, different fix. Either (a) backfill via content-team task, or (b)
auto-generate from `articles.excerpt` + category in `app/article/[slug]/page.tsx`
when DB fields are null.

**Severity P1 · 2h.**

### 8.4 P1 — Advisor pages use `ProfessionalService` not `FinancialService`

For financial planners and wealth managers specifically, the right
schema.org type is `FinancialService` (subclass of `LocalBusiness`).
Currently using `ProfessionalService`. Affects entity disambiguation in
financial-services queries.

**Severity P1 · 1h.**

### 8.5 P0 — Domain migration prep (Oct–Dec 2026)

Per COMPANY.md, the .com.au domain switchover is the highest-stakes period
in the entire build. Domain Migration Agent (#16) is dormant until October.
The SEO agent confirmed the codebase is *env-driven safe*:

- `NEXT_PUBLIC_SITE_URL` flows through `lib/seo.ts:absoluteUrl()` everywhere.
- Schema.org `url` / `sameAs` fields are env-driven.
- Zero hardcoded `invest-com-au.vercel.app` in code (only 3 in tests).
- Sitemap, robots.txt, canonical URLs all reference `SITE_URL`.

Pending pre-October checklist (confirm with Vercel):

1. Domain Migration Agent's URL inventory needs to be generated (sitemap-driven).
2. 301 mapping plan: `invest.com.au` → `invest-com-au.vercel.app` paths.
   Most paths are 1:1 — confirm no legacy URL formats from the old WordPress
   site.
3. Vercel domain alias config: primary domain `invest.com.au` set in project
   settings; `vercel.app` deprecated to redirect.
4. GSC: register both old and new properties; submit change-of-address.
5. Restore drill on the Cloudflare/Vercel DNS cutover.

**Severity P0 (timing-bound) · 1h to document; ~30h Q4 work via Agent #16.**

### 8.6 SEO architecture is solid (no action)

- ✓ Sitemap at 778 LOC covers ~5,000+ URLs across all content types with
  proper `lastmod` from DB.
- ✓ robots.txt blocks admin/portal routes, references absolute sitemap URL.
- ✓ Article pages: Article + BreadcrumbList + Person + Organization + FAQ
  schema all wired.
- ✓ Broker pages: FinancialProduct + Review + AggregateRating + QAPage.
- ✓ Best-of pages: Article + ItemList + FAQ + BreadcrumbList.
- ✓ ISR cache settings sane (sitemap 86400, articles 3600, advisors 1800).
- ✓ Mobile viewport metadata correct in `app/layout.tsx`.
- ✓ Hreflang scoped to `/foreign-investment/*` (en-AU + zh-CN + ko-KR).

### 8.7 P2 — internal linking opportunities

- `lib/glossary.ts` has 200+ terms but isn't auto-linkified inside article
  body. Implementing inline glossary linking would meaningfully boost
  topical signals. **2h.**
- Article pages don't render `related_advisor_types` / `related_verticals`
  array fields as links. **1h.**

---

## 9. Analytics / observability

### 9.1 Sentry (status: 95% there)

- ✓ DSN env-driven · sample rate sensible · `beforeSend` scrubs PII +
  enriches with `request_id` + tags by vertical.
- ✓ Sentry chained into `lib/logger.ts:113–149` so `log.error()` → `Sentry.captureException()`.
- ✓ Per-runtime config (client/server/edge) via `instrumentation.ts`.
- ⚠️ `withSentryConfig()` wraps build conditionally on `SENTRY_AUTH_TOKEN`.
  **`SENTRY_AUTH_TOKEN` not in current env example list and likely not in
  Vercel prod env.** Without it, sourcemaps don't upload; production stacks
  are unreadable. **Severity P0 · 0.25h** (provision in Vercel project envs).

### 9.2 PostHog (status: 60% there — wired, funnel half-blind)

- ✓ Browser init + server init both correct.
- ✓ Events typed in `lib/posthog/events.ts`.
- ⚠️ Only 5 event types defined: `quiz_started, quiz_completed,
  advisor_viewed, advisor_contacted, lead_submitted`.
- 🔴 Missing critical funnel events:
  - `advisor_selected` (between view and contact)
  - `checkout_started` (Stripe Checkout session created)
  - `subscription_active` (Stripe webhook → user level changes)
  - `advisor_apply_submitted` (B2B side of the funnel)
  - `lead_responded_to` (advisor side)
  - `dispute_opened` (lead-quality monitor)

  **Severity P1 · 3h.**
- ⚠️ Server events use `distinctId` strings but no anonymous→identified
  mapping. When a user submits a lead and *then* registers, the session
  histories don't merge. **Severity P1 · 2h** (call `posthog.identify()`
  with the persistent user id at signup).
- ⚠️ `posthog_events_mirror` table — populated by an Edge Function webhook
  (`supabase/functions/posthog-webhook-ingest`). **Confirmed exists; not
  yet receiving events** (table has 0 rows per DB query). Either webhook
  not configured in PostHog dashboard or no events have been captured yet.
  **Severity P1 · 0.5h** to confirm webhook is active.

### 9.3 Vercel Web Vitals

- ✓ `<SpeedInsights />` imported in `app/layout.tsx` — vendor pipeline working.
- ⚠️ In-house pipeline at `app/api/web-vitals/route.ts` — write-path exists
  but `web_vitals_samples` and `web_vitals_daily_rollup` tables are both
  **empty in live**. The cron `/api/cron/web-vitals-rollup` has nothing to
  roll up. **Severity P2 · 1h** to verify the client-side reporter is
  posting samples.

### 9.4 Cron observability

- ✓ `wrapCronHandler` exists, writes to `cron_run_log` (id, name, started_at,
  ended_at, duration_ms, status, stats, error_message, triggered_by).
- ✓ Heartbeat endpoint exists; health check looks at `health_pings`.
- 🔴 `cron_run_log` last activity is 2026-04-16 (10 days ago). Either crons
  have been idle for 10 days or logging is broken. **Severity P1 · 1h** to
  diagnose.
- 🔴 `health_pings` is **empty in live** (0 rows). The health endpoint's
  cron-freshness check has never been validated against real data.
  **Severity P1 · 0.5h.**
- 🔴 SLO definitions are not seeded (`slo_definitions` empty). Cron
  `/api/cron/slo-monitor` has nothing to monitor against. **Severity P1 ·
  2h** (define 5–7 SLOs for launch: lead p95<5min, advisor onboarding
  p95<1h, webhook delivery p95<10min, etc.).
- 🔴 SLO incident → human-pageable alert: SLO breaches write to
  `slo_incidents` but no Slack/PagerDuty wire-up. **Severity P1 · 1h.**
- ⚠️ External uptime monitor (BetterStack / UptimeRobot) — referenced in
  `docs/runbooks/launch-day.md` but no evidence of being wired up.
  **Severity P2 · 0.5h** to confirm.

### 9.5 Logging hygiene

`console.*` count is unchanged from 04-24 audit (17 sites in
app/components/lib). Most are admin-side or expected. **Severity P3 · 0.5h.**

### 9.6 `setLoggerUser()` adoption

Helper exists at `lib/logger.ts:182–192`. Only ~30 of 294 routes call it.
Sentry events therefore lack user-id tagging in 90% of API errors.
**Severity P2 · 2h** (audit, add to top-30 highest-traffic routes).

---

## 10. Agent system verification

### 10.1 Inventory

- 6 n8n workflow JSON files in `infra/n8n/`:
  - `advisor_onboarding.json`
  - `analytics_daily.json`
  - `cto_daily.json`
  - `editorial_publish_gate.json`
  - `lead_nurture_hourly.json`
  - `overseer_hourly.json`
- 5 more in flight (PRs #210, #212):
  - `data_aggregator_daily` (PR #210)
  - 4 more in PR #212 (ops-admin, licensing, ceo, growth)
- COMPANY.md plans 19 agents total → 11 in source control or in flight.

### 10.2 P0 — n8n env-var injection audit

Every workflow JSON has Bearer-token literals like:

```
"value": "=Bearer [HARDCODE_SUPABASE_SERVICE_ROLE_KEY_HERE]"
```

This is a placeholder string the n8n operator must replace at import time
(or n8n's credential manager must inject via env var). It's NOT a real key
in the repo — confirmed by grep.

**But the workflow won't run unless n8n's environment binds these.** Pre-
launch, confirm:

1. n8n runtime has `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`,
   `RESEND_API_KEY` etc. set in its env-vars panel.
2. Each workflow JSON's `[HARDCODE_*]` placeholder is replaced by the
   `={{ $env.NAME }}` runtime expression on import (or by n8n's credential
   vault binding).

Per-workflow placeholder count (sanity check):

| Workflow | `[HARDCODE_*]` placeholders | `alwaysOutputData` on Reads | error workflow wired |
|---|---|---|---|
| advisor_onboarding | 15 | 1 | 1 |
| analytics_daily | 4 | 1 | 1 |
| cto_daily | 9 | 2 | 1 |
| editorial_publish_gate | 11 | 1 | 1 |
| lead_nurture_hourly | 8 | 1 | 1 |
| overseer_hourly | 7 | 2 | **0** |

**Severity P0 · 2h** for the env-var injection audit.

### 10.3 P1 — overseer_hourly missing error-workflow

5 of 6 workflows have an `errorWorkflow` setting. `overseer_hourly` does
not. Ironic — Overseer is the agent meant to detect failures in *other*
agents. Its own failures are silent.

**Severity P1 · 0.5h.**

### 10.4 P2 — `alwaysOutputData` not on every Read node

Per the user's spec ("alwaysOutputData: true on all Read nodes"), most
workflows have it on the first Read but not subsequent ones (count: 1–2 vs
4–6 read nodes total per workflow). When an upstream Read returns empty,
downstream nodes should still emit a tombstone event for observability.

**Severity P2 · 1h** (set globally per workflow).

### 10.5 ✓ Runbooks complete

All 6 shipped workflows have matching runbooks in `docs/ops/`:

- `n8n-phase1-overseer.md`
- `n8n-phase2-advisor-onboarding.md`
- `n8n-phase2-analytics.md`
- `n8n-phase2-cto.md`
- `n8n-phase2-editorial-publish-gate.md`
- `n8n-phase2-lead-nurture.md`

PR #210 (data_aggregator_daily) and PR #212 (4 Phase 3 workflows) need
runbooks as part of merge.

### 10.6 Agent-table state

Of the 19 + 5 agent tables defined per COMPANY.md, all have RLS enabled.
None have data — Phase 3 agents are dormant pending activation. The empty
state is fine; what matters is the activation runbook exists.

---

## 11. Revenue infrastructure status

### 11.1 Stripe products + prices (12 / 12, all with prices)

All products have AUD-denominated prices (matches user's "12 prices live"):

| Product (Stripe) | Price (AUD) | Cadence | Mapped feature |
|---|---|---|---|
| Investing Course — Pro | $99 | one-time | `STRIPE_COURSE_PRO_PRICE_ID` env |
| Investing Course — Standard | $49 | one-time | `STRIPE_COURSE_PRICE_ID` env |
| Invest.com.au Pro — Yearly | $89 | yearly | `STRIPE_YEARLY_PRICE_ID` env |
| Invest.com.au Pro — Monthly | $9 | monthly | `STRIPE_MONTHLY_PRICE_ID` env |
| Expert Article — Premium ($499) | $499 | one-time | (advisor-side; add-on) |
| Expert Article — Basic ($199) | $199 | one-time | (advisor-side; add-on) |
| Featured Listing — Basic ($99/mo) | $99 | monthly | `featured_plans` table (price_id linked) |
| Featured Listing — Standard ($149/mo) | $149 | monthly | `featured_plans` (linked) |
| Featured Listing — Premium ($199/mo) | $199 | monthly | `featured_plans` (linked) |
| Premium Lead Pack — 35 Leads | $999 | one-time | `STRIPE_INTL_PREMIUM_PRICE_ID` |
| Growth Lead Pack — 15 Leads | $499 | one-time | `STRIPE_INTL_STANDARD_PRICE_ID` |
| Starter Lead Pack — 5 Leads | $199 | one-time | (advisor pre-pay) |

### 11.2 ✓ `lead_pricing` table — all 22 advisor types covered

```
22 rows / 22 with stripe_price_id
```

All 22 advisor types in the lead_pricing matrix have a `stripe_price_id`.
Range: $29–$200 per lead. Free-trial: 1–3 leads. Per-type breakdown
captured in audit data; no gaps.

### 11.3 ⚠️ `featured_plans` — 5 rows, only 3 with `stripe_price_id`

User flagged "we know 3/5". Confirmed:

```
5 rows / 3 with stripe_price_id
```

Two `featured_plans` rows are *not* linked to a Stripe price. Either they're
dummy/draft tier rows or a Stripe price was never created. **Severity P2 ·
0.5h** to identify which 2 and link or delete them.

### 11.4 P1 — Stripe webhook event coverage gaps

Already covered in §5.3. Re-listing the impact for revenue framing:

- `charge.dispute.created` not handled → losing dispute response window.
- `customer.subscription.trial_will_end` not handled → missing the highest-
  intent retention email opportunity.
- `radar.early_fraud_warning.created` not handled → can't proactively refund
  to dodge a dispute.

**Severity P1 · 6h** (covered in §5.3).

### 11.5 ⚠️ Idempotency table empty

`stripe_webhook_events` has 0 rows. Pre-launch this is *expected* — but it
also means the idempotency code path in `webhook/route.ts` has never been
exercised against a real Stripe event in the live DB. **Severity P2 · 0.5h**
to send a Stripe test event from the dashboard against a non-prod
environment and confirm row appears + status='completed'.

### 11.6 Marketplace allocation coverage

- `lib/marketplace/allocation.ts` is **0% covered** (388 LOC).
- `lib/marketplace/auto-bid.ts` is **0% covered** (174 LOC).
- `allocation_decisions` table has 3,085 rows (an active surface).

This is the most lucrative + most untested code path in the repo. Lead
revenue flows through here. **Severity P0 · 12h** to add tests covering
the allocation algorithm + auto-bid edge cases. (Add as a new stream in
remediation queue.)

---

## 12. Enterprise grade gaps

### 12.1 Backup / DR

- ✓ PITR documented in `docs/runbooks/database-rollback.md` and
  `docs/runbooks/launch-rollback.md`.
- ⚠️ PITR enabled but **never test-restored.** Pre-launch is the right time
  to find out the restore takes 4 hours not 30 minutes.
- ⚠️ RPO/RTO targets not stated anywhere (recommend RPO=1 day, RTO=1 hour
  for pre-launch SaaS).
- 🔴 No documented Stripe / Resend / Vercel account-recovery procedure
  (what if Stripe account is suspended? Resend account locked? Vercel
  team-owner SSO breaks?).

**Severity P1 · 6h total.**

### 12.2 Secret rotation

`docs/runbooks/secret-rotation.md` is **excellent** — schedule + procedure
specific to each secret. Two adds:

- ⚠️ No `secret-rotation-log.md` (referenced in runbook, doesn't exist) —
  audit trail gap. **Severity P2 · 0.25h.**
- ⚠️ No automated rotation reminder — could go silent on Eng Lead's leave.
  **Severity P2 · 1h** (tiny cron checking last-rotation against schedule).

### 12.3 Onboarding new dev

CLAUDE.md + COMPANY.md + ARCHITECTURE.md + CONTRIBUTING.md set is
comprehensive. No action.

### 12.4 Architecture diagrams

- ✓ ARCHITECTURE.md has the high-level topology.
- 🔴 No user → quiz → lead → advisor → billing sequence diagram. With ACL
  launch ahead, this becomes a compliance-conversation artefact (Sophie
  Grace will ask). **Severity P2 · 1h** (Mermaid sequence in `docs/`).
- 🔴 No agent-system topology diagram (19 agents × 5 escalation tiers).
  **Severity P2 · 2h.**

### 12.5 Incident response

14 runbooks present. Coverage gaps:

| Missing runbook | Severity | Effort |
|---|---|---|
| DB read-replica failure | P1 | 1h |
| Stripe webhook backlog | P1 | 1.5h |
| ASIC / regulatory data request | P1 | 1h |
| Security breach (git history leak) | P1 | 1h |
| ACL revocation incident | P1 | 1h |
| Data subject access request (DSAR) | P2 | 1h |

Total P1 runbooks to add: **5h**.

### 12.6 SOC 2 Type 1 readiness

Per the enterprise agent's evaluation: ~60–70% ready. Gaps:

| Domain | Status |
|---|---|
| Logging | Partial — see §9 user-id tagging gap |
| Access control | Partial — admin allowlist + service-role usage; 140+ admin.ts misuses being remediated |
| Encryption at rest | ✓ Supabase default |
| Encryption in transit | ✓ HSTS preload, TLS |
| Backup / recovery testing | 🔴 No restore drill |
| Vendor management | 🔴 No DPA list (Supabase, Stripe, Resend, Vercel, PostHog, Sentry, n8n, Anthropic) |
| Change management | ✓ Conventional Commits, PR review, CI gates |
| Incident response | ✓ Mostly (5 runbooks to add) |
| Vulnerability management | ✓ npm audit + dependabot |

**Severity P1 · ~12h** (DPA collection + restore drill + missing runbooks).

### 12.7 GDPR / AU Privacy Act

Endpoints exist (§7.5). Gaps:

- 🔴 `retention_rules` table empty — purge cron has nothing to do.
  **Severity P2 · 1h.**
- 🔴 No public "Data we collect" page (transparency requirement). **Severity
  P2 · 2h.**
- ✓ Account export + deletion endpoints functional.
- ✓ APP-13 (data correction) endpoints exist.

### 12.8 Staging environment

`docs/staging-environment.md` documents three tiers (prod / staging / local)
with separate Supabase projects and Stripe/Resend keys. Per-PR previews
inherit staging env. Excellent. No action.

---

## 13. Prioritised 4-month roadmap

The runway is approximately 16 weeks (April 26 → late August). Sprints are
2 weeks. Solo-Claude-implementing-Founder-reviewing pace.

### Sprint 1 (weeks 1–2) — Ship-blocker security + observability

| Stream | Items | Hours |
|---|---|---|
| **A** Existing remediation continues | RLS finish (B-06 → B-09), test bucket D-01..D-09, dead-component delete | ~30h |
| **NEW J** Stripe + revenue P0/P1 | Webhook event coverage (dispute, trial_will_end, fraud, refunded, payment_failed); split 1,197-LOC webhook into per-event handlers; `featured_plans` Stripe linkage cleanup | 12h |
| **NEW K** Security P0/P1 | Widget CORS lockdown · OTP brute-force tightening · admin login backoff · CSP fallback removal · X-Frame-Options unification · audit log consistency on admin routes · `/api/seed` prod-gate verification | 9h |
| **NEW L** Observability P0/P1 | Sentry sourcemap auth token · n8n env-var injection audit · overseer error-workflow · cron heartbeat investigation (last 10d) · health_pings empty path · SLO seed + alert sink · PostHog funnel completion (3 missing events) | 12h |
| **NEW M** SEO P0 | Article cover-image backfill (engineering side) · versus-page schema.org · advisor FinancialService schema | 8h |

**Sprint 1 net new: ~41h. Total inc remediation: ~71h.**

### Sprint 2 (weeks 3–4) — Test coverage + UI/UX polish

| Stream | Items | Hours |
|---|---|---|
| **A continued** | Test bucket D-10..D-15, lib/ marketplace tests, schema-drift backfill | ~25h |
| **NEW N** UI/UX P0/P1 | Homepage hero `priority` + blur placeholders · advisor-portal client-bundle split · skip-to-main link · icon-button aria-labels | 18h |
| **NEW O** SEO P1 | Article meta_title/desc backfill · glossary auto-link · related_advisor_types/verticals on article pages | 5h |
| **NEW K continued** | Privacy: GDPR data-collection disclosure page · retention_rules seed | 3h |

**Sprint 2 net new: ~26h. Total inc remediation: ~51h.**

### Sprint 3 (weeks 5–6) — Dependencies + DR

| Stream | Items | Hours |
|---|---|---|
| **NEW P** Dependency hygiene | Sentry v9→v10 (clears all 5 audit) · Stripe SDK v17→v22 (5-major catchup, retest webhooks) · TypeScript 6 (defer if risky) · grouped Vitest 4 bump | 12h |
| **NEW Q** DR / SOC 2 prep | PITR restore drill on staging · RPO/RTO published · Stripe + Resend account-recovery runbooks · 5 missing incident runbooks · DPA collection from 8 vendors | 14h |
| **NEW N continued** | Card-component consolidation (7 → 1) · use-client audit | 18h |

**Sprint 3 net new: ~44h.**

### Sprint 4 (weeks 7–8) — Lib coverage + revenue testing

| Stream | Items | Hours |
|---|---|---|
| **A continued** | Schema-drift backfill · Zod rollout on top-20 routes | ~17h |
| **NEW R** lib/ test coverage | `lib/marketplace/allocation.ts` + `auto-bid.ts` + `advisor-lead-dispute-resolver.ts` + `cached-data.ts` | 16h |
| **NEW S** Architecture artefacts | User journey sequence diagram · agent system topology · API v1 OpenAPI spec | 6h |

**Sprint 4 net new: ~22h.**

### Sprints 5–6 (weeks 9–12) — Hardening + visual polish

- File splits (top 10 of 15 >1000-LOC files, focusing on advisor-portal,
  webhook router, advisor-verification).
- 580 .ico → SVG conversion.
- 138 arbitrary-pixel-value Tailwind cleanup.
- JSON-LD SSOT migration for the 42 outlier files (per 04-24 audit).
- Console.* → logger sweep.
- Lighthouse-CI / axe-core run + fixes.
- Stryker mutation tests on critical lib/.

**Sprints 5–6 effort: ~70h.**

### Sprints 7–8 (weeks 13–16) — Domain migration prep + launch readiness

- Domain Migration Agent #16 dry-run on staging.
- Launch-day runbook walkthrough (simulated incident).
- External uptime monitor wired and alerting.
- ACL paperwork wiring (compliance-side; Sophie Grace + Dad).
- Final security pass (SOC 2 Type 1 baseline if pursuing).
- Performance budget enforcement in CI (Lighthouse-CI gate).

**Sprints 7–8: ~30h.**

### Total runway accounting

| Stream group | Hours |
|---|---|
| 04-24 audit's existing remediation queue | ~530h (less ~100h done so far) |
| This audit's new findings | ~220h |
| **Net to land before launch** | **~650h** |

At a sustainable solo-Claude / single-Founder-reviewer pace of ~10h/business-
day-equivalent (adjusted for review and rework), 650h ≈ 13 weeks of
heads-down delivery. **The 16-week runway is sufficient with ~3 weeks of
slack.**

---

## 14. What gets DEFERRED to post-launch

These are intentionally NOT in the 4-month plan:

- TypeScript 6 (high blast radius for low gain).
- ESLint 10 (same).
- Vitest 4 + jsdom 29 (defer dependabot-grouped; merge after Vitest 4 has 1
  point release).
- Full 226-route Zod rollout (do top-30; defer rest).
- Card-component generic abstraction *if* sprint 5 runs short (it's
  cosmetic, not enterprise-blocking).
- File-split for files <1500 LOC (defer to opportunistic feature work).
- Multi-locale expansion beyond `/foreign-investment/*`.
- Auto-glossary linkifier (P2 for SEO; nice-to-have).
- Stryker mutation tests on lib/ (great signal, not launch-blocking).

---

## Appendix A — How this audit was produced

- **Commit baseline:** main @ `d323563f` (post iter 9 of remediation loop).
- **Foreground data collection:** 32 Bash invocations, 9 Supabase MCP queries, 2 Stripe MCP queries.
- **Parallel agent dives:** 5 Explore-agent runs (security · API surface · SEO · UI/UX · observability+enterprise) each producing 1500–2500 word reports. Their findings are synthesised into §5–§12 above; raw outputs are in the agent transcript files for that conversation.
- **Coverage data:** parsed `coverage/lcov.info` directly; 448 files / 60,866 line-covered points.
- **No code modified.** No migrations. No test runs. Read-only.

## Appendix B — Open questions needing runtime data

These can't be answered from static analysis + a snapshot DB query:

1. **Vercel runtime logs / Sentry dashboard:** which routes are throwing 500s
   in prod? Which routes have p95 latency >5s? **Need:** Vercel runtime log
   query for last 7d or Sentry top-issues export.
2. **CI flake rate per test:** which tests fail intermittently in last 30
   runs? **Need:** GitHub Actions API run history.
3. **PostHog event volumes:** are events actually flowing? Funnel drop-off
   shape? **Need:** PostHog dashboard read-only access or a one-off API
   query.
4. **Real Lighthouse scores:** LCP / CLS / INP per page type. **Need:**
   `npm run lighthouse` against deployed preview.
5. **Bundle analyzer:** top-10 JS chunks by size. **Need:** `npm run analyze`
   one-shot.
6. **n8n runtime status:** which workflows are paused? Which are running?
   Last error per workflow? **Need:** n8n dashboard read.
7. **Restore-drill outcome:** PITR clone times, post-restore validation
   results. **Need:** drill execution + writeup.

---

_End of audit. The remediation queue is at `docs/audits/REMEDIATION_QUEUE.md`._
_Stream J–S items will be added to that queue in a follow-up commit._
