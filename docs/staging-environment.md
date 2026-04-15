# Staging Environment + Preview Deploys

How the `invest-com-au` app is deployed to staging and per-PR previews,
which environment variables each tier needs, and how to debug when a
preview isn't behaving the same as production.

## Environments at a glance

| Tier           | Hosting        | Supabase project        | Trigger                |
| -------------- | -------------- | ----------------------- | ---------------------- |
| Production     | Vercel (prod)  | `invest-prod`           | `main` branch push     |
| Staging        | Vercel (prod)  | `invest-staging`        | `staging` branch push  |
| PR preview     | Vercel preview | `invest-staging` shared | any PR opened on GitHub|
| Local dev      | `npm run dev`  | `supabase start` (54322)| local                  |

Preview deploys **share the staging Supabase project** — they do not
get their own database. This is a deliberate trade-off: spinning up a
branch database per PR is slower and costs more, and most UI changes
just need "a real DB that isn't prod". When you need true isolation
(e.g. testing a destructive migration), spin up a local Supabase
branch via `supabase db branch create`.

## Required environment variables

Vercel stores these under Project Settings → Environment Variables.
Each tier reads a different set; only a few are shared across all.

### Shared (all tiers, including previews)

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>   # server-only
NEXT_PUBLIC_BASE_URL=https://staging.invest.com.au
```

The `NEXT_PUBLIC_BASE_URL` on preview should be set to the Vercel-
supplied preview URL, which Vercel injects automatically as
`VERCEL_URL`; `lib/url.ts#getSiteUrl` reads it as a fallback.

### Staging + preview only

```
SUPABASE_PROJECT_REF=<staging project ref>
RESEND_API_KEY=<staging resend key>           # separate from prod
STRIPE_SECRET_KEY=<staging stripe key>        # test-mode key
STRIPE_WEBHOOK_SECRET=<staging webhook secret>
FEATURE_FLAG_OVERRIDES={"chatbot_widget":true}  # optional
ADMIN_EMAIL_ALLOWLIST=admin@example.com,qa@example.com
IP_HASH_SALT=staging-ip-hash-salt
ADMIN_MFA_KEY=<staging 32-byte base64>
CRON_SECRET=<staging cron bearer>
```

### Production only (never set on staging/preview)

```
RESEND_API_KEY=<live resend key>
STRIPE_SECRET_KEY=<live stripe key>
STRIPE_WEBHOOK_SECRET=<live webhook secret>
ADMIN_EMAIL_ALLOWLIST=<prod admin list>
SENTRY_AUTH_TOKEN=<prod sentry release token>
```

The deliberate split keeps staging from accidentally shipping real
emails, charging real cards, or paging real admins.

## Per-PR preview lifecycle

1. Open a PR on GitHub targeting `main`.
2. Vercel detects the push and creates a preview deploy. The URL is
   posted back as a PR comment, typically
   `https://invest-com-au-<hash>-<team>.vercel.app`.
3. The preview inherits all **staging** env vars plus Vercel's
   injected `VERCEL_URL` / `VERCEL_ENV=preview`.
4. The preview is gated by `x-robots-tag: noindex` so crawlers
   don't index it — handled in `middleware.ts` by checking
   `VERCEL_ENV !== "production"`.
5. On PR merge, Vercel promotes the matching build to `main` and
   the preview URL is retired after ~2 hours.

## Seeding the staging database

The staging Supabase project is reset on demand (not on every deploy)
because integration tests expect a coherent dataset.

```bash
# Reset staging to a clean seed
npm run seed:staging

# Under the hood that's just:
NEXT_PUBLIC_SUPABASE_URL=https://<staging-ref>.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<staging service-role> \
  npx tsx scripts/seed-local.ts
```

`scripts/seed-local.ts` is idempotent against stable slugs (upserts
on broker slug, article slug, advisor slug, TMD product ref,
financial period month bounds) so re-running is safe.

## Debugging a preview that doesn't match prod

Run through this checklist in order — each step is cheap.

1. **Is the preview reading staging Supabase?**
   Open the browser console on the preview URL and run
   `console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)`. If it's
   empty or points at prod, Vercel env vars aren't wired.
2. **Are feature flags the same?**
   Feature flag rollouts live in the `feature_flags` table per
   Supabase project. Staging has its own copy. If a feature is
   missing on preview, flip the flag in `staging` (not prod).
3. **Is the classifier config the same?**
   `admin_classifier_config` is also per-project. Clone rows from
   prod into staging if you need parity for a repro.
4. **Cron state?**
   `cron_run_log` rows are per-project. If a preview shows stale
   data, the cron may not have run yet on staging. Trigger it
   manually with an authenticated POST to the cron URL, using the
   staging `CRON_SECRET`.
5. **Logging?**
   Staging logs are streamed to a **separate** Sentry project
   (`invest-com-au-staging`). If you're looking at prod Sentry
   you won't see preview errors.

## Promoting staging to production

We do not auto-promote. The production deploy is a manual merge of
`staging` into `main` after:

- All integration tests pass on staging (`npm run test`)
- Playwright E2E is green (`npm run e2e`)
- The admin `/admin/data-health` page shows zero `critical` items
- `cron_run_log` shows the last 24h of daily crons completed `ok`
- The release notes on the staging PR have been sanity-checked

## Known gotchas

- **Supabase session cookies** are domain-scoped. A user signed in
  on staging is NOT signed in on a preview deploy, and vice versa.
  Expect to re-auth each time you open a new preview URL.
- **Rate limiters** read from `rate_limit_buckets`, which is shared
  across the staging project. Previews will throttle each other if
  two are testing the same endpoint. Bump the limits or clear the
  table when debugging.
- **Stripe webhooks** need to point at the *preview* URL, not
  staging. Use `stripe listen --forward-to https://preview-url/...`
  or create a dedicated test endpoint in the Stripe dashboard.
