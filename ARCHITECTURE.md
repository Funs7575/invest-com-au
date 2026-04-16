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
vercel.json                Cron job schedule
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
