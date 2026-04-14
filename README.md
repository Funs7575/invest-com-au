# Invest.com.au

Australia's independent broker comparison + advisor directory platform.

## Tech Stack

- Next.js 16 (App Router, Turbopack)
- Supabase (Postgres 17, RLS, Edge Functions)
- Tailwind CSS 4
- TypeScript
- Vitest (unit) + Playwright (E2E)
- Sentry, Vercel Analytics, structured logger

## Setup (fast path)

```bash
# 1. Clone + install
git clone <repo>
cd invest-com-au
npm install

# 2. Copy env template
cp .env.local.example .env.local
# edit .env.local — fill in Supabase + Stripe + Resend keys

# 3. Run
npm run dev
```

## Setup (fully local with docker-compose)

```bash
docker compose up -d          # Postgres 17 on :54322, MailHog on :8025
cp .env.local.example .env.local
# set NEXT_PUBLIC_SUPABASE_URL=http://localhost:54322
npm install
npx tsx scripts/seed-local.ts # seed ~10 rows of fixture data
npm run dev
```

Local email goes to MailHog — open http://localhost:8025 to inspect.

## Scripts

```bash
npm run dev          # dev server
npm run build        # production build
npm run start        # production server
npm run lint         # eslint
npm run type-check   # tsc --noEmit
npm test             # vitest unit + integration
npm run e2e          # Playwright end-to-end (see playwright.config.ts)
npm run e2e:install  # download Playwright browsers (first run only)
```

## Tests

- **Unit + integration**: 1300+ tests in `__tests__/`, run with Vitest
- **E2E**: smoke + critical flows in `e2e/`, run with Playwright
- **CI**: `.github/workflows/ci.yml` runs lint, type-check, unit tests,
  build, secret scan, Playwright, and Lighthouse on every PR

## Database migrations

Migrations live under `supabase/migrations/`. Apply to the hosted
project via the Supabase dashboard SQL editor or `supabase db push`.
The filenames follow `YYYYMMDD_description.sql`.

## Deployment

Deploys to Vercel. Required env vars are documented in
`.env.local.example`. Cron schedules are in `vercel.json`.
