# Architecture

A short tour of how invest-com-au is put together. Read this before
making your first non-trivial change.

## High-level shape

```
                   ┌──────────────┐
                   │   Browser    │
                   └──────┬───────┘
                          │ HTTPS (CSP nonce, HSTS preload)
                          ▼
                ┌──────────────────────┐
                │  Vercel Edge / CDN   │
                │  (HTTP cache, ISR)   │
                └──────────┬───────────┘
                           │
                           ▼
        ┌────────────────────────────────────┐
        │  proxy.ts (Edge Middleware)        │
        │  - request-id stamping             │
        │  - cron Bearer auth                │
        │  - security headers + CSP nonce    │
        │  - admin/portal route protection   │
        └─────────┬───────────────┬──────────┘
                  │               │
                  ▼               ▼
        ┌──────────────┐  ┌──────────────────┐
        │ App Router   │  │ API routes       │
        │ (RSC by      │  │ (route.ts,       │
        │ default)     │  │ Edge or Node)    │
        └──────┬───────┘  └────────┬─────────┘
               │                   │
               └─────────┬─────────┘
                         ▼
              ┌────────────────────────┐
              │    Supabase (Postgres) │
              │    - 138 tables        │
              │    - RLS on user data  │
              │    - Auth + Storage    │
              └────────────────────────┘
```

External services: Stripe (payments), Resend (email), Sentry
(errors + traces), Anthropic (AI drafts), Cal.com (advisor booking).

## Tech stack

| Layer            | Choice                                       |
|------------------|----------------------------------------------|
| Runtime          | Node 20 (Vercel Functions)                   |
| Framework        | Next.js 16 (App Router, Turbopack)           |
| Language         | TypeScript 5.9 (strict + noUncheckedIndexedAccess) |
| UI               | React 19 + Tailwind CSS 4                    |
| Data             | Supabase (Postgres 17, RLS, Edge Functions)  |
| Tests            | Vitest (unit + integration), Playwright (E2E)|
| Validation       | Zod (server-side schemas)                    |
| Errors / traces  | Sentry                                       |
| Analytics        | Google Analytics + Vercel Speed Insights     |
| Email            | Resend                                       |
| Payments         | Stripe                                       |
| Hosting          | Vercel                                       |

## Directory layout

```
app/                       Routes (App Router)
├── (public pages)         Most user-facing pages live here flat
├── invest/                Investment marketplace verticals
├── compare/               Broker / advisor comparison
├── foreign-investment/    Country-specific guides
├── admin/                 Admin portal (auth-gated in proxy.ts)
├── advisor-portal/        Advisor self-serve portal (auth-gated)
├── api/                   API route handlers
│   ├── account/           User-facing endpoints
│   ├── admin/             Admin-only endpoints
│   ├── cron/              Vercel cron jobs (Bearer auth)
│   └── go/                Affiliate redirect tracker
├── sitemap.ts             Dynamic sitemap (revalidate: 86400)
├── robots.txt             Static
├── icon.tsx               Dynamic favicon (Edge Runtime)
└── opengraph-image.tsx    Default OG image generator

components/                Reusable UI (server + client)
lib/                       Business logic, helpers, types
├── supabase/              Server / admin / browser clients
├── compliance.ts          AFSL / GDPR / disclosure constants
├── logger.ts              Structured logger with Sentry integration
├── rate-limit.ts          DB-backed rate limiter
├── tracking.ts            Affiliate click + event tracking
└── ...

supabase/migrations/       Schema migrations (SQL)
__tests__/                 Vitest tests (api, integration, lib, components)
e2e/                       Playwright E2E tests
docs/runbooks/             Incident response procedures
.github/workflows/         CI pipelines
proxy.ts                   Edge middleware (auth, headers, CSP)
next.config.ts             Next.js config (images, redirects, Sentry, bundle analyzer)
vercel.json                Cron schedule (38 dispatch entries → 73 handlers via lib/cron-groups.ts)
```

## Request lifecycle

1. **Browser → CDN**: Vercel serves static assets and ISR-cached pages
   directly from edge cache.
2. **CDN → Edge Middleware (`proxy.ts`)**: stamps `x-request-id`,
   validates cron Bearer tokens, sets security headers, generates a
   per-request CSP nonce, and gates `/admin/*` and `/broker-portal/*`
   on Supabase auth.
3. **Middleware → App Router**: server components run in Node runtime
   on Vercel Functions. Most pages are RSC; `"use client"` is opt-in
   per file.
4. **Server component → Supabase**: queries via the SSR client with
   user cookies. RLS enforces row-level access. Admin endpoints use
   the service-role client which bypasses RLS.
5. **Response → CDN → Browser**: Vercel caches per `revalidate` and
   `Cache-Control` headers.

## Auth model

- **Public pages**: unauthenticated, RLS enforces public-read only.
- **Account pages** (`/account/*`): require Supabase session cookie.
- **Admin** (`/admin/*`): Supabase session + email in `ADMIN_EMAILS`
  allowlist. Validated in middleware **and** in admin API routes
  (defense in depth).
- **Advisor portal** (`/advisor-portal/*`): Supabase session + a
  matching `professionals.email` row. Validated server-side per route.
- **Cron** (`/api/cron/*`): Bearer token check against `CRON_SECRET`
  in middleware. No user auth.

## Data model

Tables fall into roughly four classes:

1. **Public content** (read-only for everyone): `brokers`, `articles`,
   `versus_editorials`, `best_for_scenarios`, `investment_listings`,
   `forum_categories`, `newsletter_editions`, etc. Updated by admin.

2. **User-owned data** (RLS-protected): `user_bookmarks`,
   `user_notifications`, `forum_threads`, `forum_posts`,
   `data_export_requests`, `account_deletion_requests`,
   `tos_acceptances`. Each table has policies restricting access to
   `user_id = auth.uid()`.

3. **Marketplace state** (admin + service-role): `professional_leads`,
   `broker_signups`, `affiliate_clicks`, `broker_campaigns`,
   `revenue_attribution_daily`. Service-role writes from API routes;
   admin reads via dashboards.

4. **Operational** (service-role only): `rate_limits`, `health_pings`,
   `auth_attempts`, `admin_action_log`, `cron_run_log`. Internal
   plumbing — no user-facing access.

## Caching strategy

- **Static assets** (`/_next/static/*`, `/fonts/*`): immutable, 1 year.
- **Logos** (`/logos/*`): 30 days, stale-while-revalidate 7 days.
- **Images** (`/images/*`): 24 hours, stale-while-revalidate 7 days.
- **Pages**: `export const revalidate = N` per route. Sitemap is
  86400s (24h). Marketing pages are typically 1-3 hours.
- **DB queries**: `lib/cache.ts` wraps `unstable_cache` for hot
  read-only queries (broker list, advisor list, taxonomy).
- **Affiliate tracking**: `force-dynamic` — never cached.

## Cron dispatch

Vercel's hard cap is 40 cron jobs per project. The platform has 73
individual cron handler routes but only 38 `vercel.json` schedule
entries — the gap is covered by a **dispatch-group fan-out** pattern.

### How it works

`vercel.json` triggers `GET /api/cron/dispatch/[group]` once per unique
schedule. The `[group]` slug (e.g. `daily-2`, `hourly-0`, `every-15m`)
maps to an array of handler paths in `lib/cron-groups.ts`. The
dispatcher fetches all handlers for the group **in parallel** using
`Promise.allSettled`, forwarding the original `Authorization: Bearer
$CRON_SECRET` header so each handler's own `requireCronAuth()` check
still guards the real work.

```
vercel.json                     lib/cron-groups.ts
  "0 2 * * *"              "daily-2": [
    → /cron/dispatch/daily-2  →   "/api/cron/lead-quality-weights",
                                  "/api/cron/low-balance-alerts",
                                  "/api/cron/gdpr-retention-purge",
                                  ...7 more handlers
                               ]
```

Each dispatched handler:
- Keeps its own `runtime`, `maxDuration`, and `requireCronAuth` call.
- Logs independently to `cron_run_log` via `wrapCronHandler`.
- Is independently testable and deployable.

The dispatcher itself logs a `cron_run_log` row per handler and returns
HTTP 207 (multi-status) if any handler fails, so `/api/health` and the
heartbeat alert surface partial failures.

### Critical routing note

The dispatcher **must** live at `app/api/cron/dispatch/[group]/` (not
`_dispatch/[group]/`). Next.js treats `_*` folders as private and does
not register them as routes. The original implementation used the
`_dispatch` name and was silently unreachable for 12 days before the
routing bug was caught (2026-04-16 → 2026-04-28).

### Adding a new cron handler

1. Create `app/api/cron/<name>/route.ts`. Call `requireCronAuth(req)`
   first; wrap body with `wrapCronHandler`.
2. Add the path to the appropriate group in `lib/cron-groups.ts`, or
   create a new group if no existing schedule fits.
3. If a new group is created, add the corresponding entry to
   `vercel.json` pointing to `/api/cron/dispatch/<new-group>`.
4. Do **not** add the handler path directly to `vercel.json` — that
   bypasses the dispatcher and consumes a scarce cron slot.

### Loopback origin

The dispatcher fetches handlers via `VERCEL_PROJECT_PRODUCTION_URL`
(the protection-free alias), **not** `req.url`'s origin. Vercel's
Deployment Protection blocks loopback requests to the unique deployment
URL before they reach any route handler. Falls back to `new URL(req.url).origin`
for `npm run dev`.

## Observability

- **Errors**: Sentry. 10% trace sampling in prod, 100% in dev.
  `request_id` from `proxy.ts` joins logs across boundaries.
- **Logs**: structured JSON in production (Vercel Functions stdout),
  colored text in dev. Levels: debug / info / warn / error. Default
  prod level is `warn` — flip via `LOG_LEVEL` env.
- **Metrics**: Vercel Speed Insights for Core Web Vitals; Google
  Analytics for behavioural funnels (with cookie consent).
- **Health**: `/api/health` checks DB, cron heartbeat, env vars.
  External monitor (BetterStack / UptimeRobot) polls every 60s.
- **Cron**: every cron run is logged to `cron_run_log` via
  `wrapCronHandler`. Stale crons surface via the heartbeat check.

## Failure modes

What can break, how it manifests, and what to do. Each entry pairs the
detection signal (so you notice fast) with the response (so you can act
fast). Runbooks live in `docs/runbooks/` — always link from here.

| Component fails | User-visible symptom | Detection signal | Response |
|---|---|---|---|
| **Supabase Postgres outage** | Pages return 500; quiz / submit forms hang | Sentry error rate > 5% on `from()` calls; BetterStack `/api/health` red | Vercel auto-retries; if sustained > 5 min, post status banner via `STATUS_BANNER` env. Runbook: `docs/runbooks/database-outage.md` |
| **RLS policy regression** (new policy denies what should be allowed) | One user role sees empty pages where they should see data | `pg_stat_statements` shows zero-row returns for previously productive queries; user-reported "where did my data go?" | Roll back the migration (forward-only — write a new "restore" migration; never `DROP POLICY` blindly). Runbook: `docs/runbooks/rls-emergency-rollback.md` |
| **Cron route fails silently** | Drip emails / metric snapshots stop firing | `cron_run_log` heartbeat > 2× expected interval; BetterStack heartbeat alert | Inspect last `cron_run_log.error_msg`; common cause is third-party (Resend / Stripe) auth rotation |
| **Stripe webhook duplicate** | User charged twice OR pricing updated twice | Stripe dashboard duplicate webhook delivery; `stripe_webhook_idempotency` table shows duplicate event_id | Idempotency table prevents double-processing — check it actually rejected. If not, see `docs/runbooks/stripe-incident.md` |
| **CSP nonce regression** | Inline scripts blocked; client-side hydration fails on key pages | Sentry `Refused to execute inline script` errors spike; pages render but feel "stuck" | Verify `proxy.ts` is generating per-request nonces; check that all `<script>` tags use the nonce or are hashed |
| **Rate limiter fails open** (DB-backed; if DB is slow, requests pass through) | Spam / abuse on public endpoints | `rate_limits` insert latency > 500ms in Sentry; abuse signals (lead spam) | Manually flip `RATE_LIMIT_HARD_FAIL=true` env to fail-closed during incident |
| **Service-role key leak** | Anything — RLS bypassed for the leaker | gitleaks scan in CI; leaked-keys monitor on supabase.com | **P0** — rotate immediately (Supabase dashboard → API → rotate `service_role`); update `SUPABASE_SERVICE_ROLE_KEY` in Vercel; force-redeploy |
| **Sentry rate-limit hit** | Errors not captured during spike (you only see the *start* of the incident) | Sentry dashboard "rate limit reached" banner; gap in error graph | Increase plan tier OR add sampling. Default 10% trace sampling; emergency: drop to 1% via `SENTRY_TRACES_SAMPLE_RATE` |

## Capacity planning

Where we are now and the signals that say "time to invest in scaling".

### Current scale (snapshot)

| Dimension | Today | Next plateau (when to invest) |
|---|---|---|
| Postgres rows | ~1M across 138 tables | 50M total (consider read replica) |
| Daily uniques | TBD — Vercel Analytics | 100k/day (consider edge caching aggressively) |
| API requests | bounded by Vercel function invocations | 1M/day (consider Edge Functions for hot paths) |
| Cron jobs | 18 scheduled | 30+ (consider Inngest or Trigger.dev for orchestration) |
| Test suite | 6,109 unit/integration tests, ~7 min | 15k tests (must shard across runners or runtime > 15 min) |
| `lib/database.types.ts` | ~13,300 lines, 138 tables | 200 tables (consider splitting per-domain types files) |

### Signals to watch

- **Vercel function invocations** — `> $20/day` on the Vercel dashboard means we're at the free-tier bend; budget shifts from $0 to $200/mo at $20/day average.
- **Supabase egress** — `> 100 GB/mo` triggers overage charges. Watch under Settings → Usage.
- **CI minutes** — GitHub Actions free tier = 2,000 min/mo for private repos. We currently burn ~50 min/PR × 30 PRs/day = far over. We're either on a paid plan or this is a constraint.
- **Sentry events** — free tier = 5k errors/mo. With 10% sampling we should be safe; **review monthly**.

### Migration triggers

Explicit "we'll fix this when X" items. Each entry is a load-bearing
temporary decision with the trigger that makes it not-temporary:

- **`lib/database.types.ts` is one giant file** → split into per-domain
  files (`types/auth.ts`, `types/marketplace.ts`, etc.) when it crosses
  20,000 lines or when CI type-check exceeds 90 s.
- **All API routes are in a single Vercel project** → split into a
  marketplace project + an admin project when admin work starts being
  blocked by marketplace deploys, or when total functions > 100.
- **Cron jobs hard-coded in `vercel.json`** → migrate to Inngest /
  Trigger.dev when we cross 40 unique schedules (Vercel cron cap; current
  dispatch pattern buys headroom to ~120+ handlers at the cost of
  parallel fan-out within a schedule) OR when one job's runtime exceeds
  5 min (Vercel cron limit).
- **Test suite runs on a single runner** → shard across 4 runners when
  total runtime exceeds 12 min on PRs.
- **Single Supabase project for prod + staging** → split when staging
  testing requires schema divergence (e.g. testing a destructive
  migration in isolation).
- **Browser-side admin pages** (any remaining after C-stream completes)
  → server-side render with admin auth gate; no admin UI should rely on
  `service_role` key being available client-side.
- **Founder is on-call** → add a second rotation member when MTTR for
  P1 incidents exceeds 4 hours OR when more than 2 incidents/week
  require human response.
- **Audit remediation is the loop's only workload** → add a feature
  loop / retention loop / SEO loop once the audit queue depth drops
  under 10 pending items.

When you hit a trigger, file an issue tagged `tech-debt` and link back
to this section. Don't silently breach a trigger — it's there because
the future will hurt without it.

## Things to know before changing

- **Migrations are forward-only on production.** There is no
  automated rollback. See `docs/runbooks/database-rollback.md`.
- **The `CRON_SECRET` is the keys to the kingdom for cron routes.**
  If it leaks, rotate immediately (see security runbook).
- **Edge runtime ≠ Node runtime.** Some libraries (`crypto.timingSafeEqual`,
  most of `fs`, anything pulling in native modules) only work in
  Node. Default to Node unless you specifically need Edge for global
  low latency.
- **RLS is enforced by Postgres, not application code.** A missing
  RLS policy is a security bug. Always enable RLS + add explicit
  policies for any new user-data table.
- **The service-role client (`createAdminClient`) bypasses RLS.**
  Use it sparingly and only in admin routes / cron jobs / webhooks
  that have already authenticated the caller.
