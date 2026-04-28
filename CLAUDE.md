# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Start here

- `COMPANY.md` — organisational brief: legal entity, team, 19 agents, 24 agent tables, 5 escalation tiers, compliance constraints, Oct–Dec 2026 migration window. Read before any change that touches compliance, agents, escalation, or domain migration.
- `ARCHITECTURE.md` — request lifecycle, auth model, data model, caching strategy. Read before your first non-trivial change.
- `CONTRIBUTING.md` — commit convention (Conventional Commits), PR expectations, migration discipline, code style.
- `docs/runbooks/` — incident response procedures.

Everything below is the Claude-specific working notes that aren't in those files.

## Commands

```bash
npm run dev                        # dev server
npm run build                      # production build (TS errors fail the build)
npm run lint                       # eslint
npm run type-check                 # tsc --noEmit
npm test                           # vitest (unit + integration)
npm run test:coverage              # same, with coverage report
npm run e2e                        # Playwright (needs e2e:install first)

# Running a focused test
npm test -- __tests__/lib/seo.test.ts
npm test -- -t "normaliseFaqs"     # filter by test name
npm run test:watch                 # watch mode
```

## Non-obvious things to know

- **Node 20+ required.** Local Node 18 will silently install but builds break at runtime (used `globalThis.AbortSignal.timeout` etc).
- **`.npmrc` sets `legacy-peer-deps=true`.** Sentry v9 peer-deps target Next ≤15, but we run Next 16. The override is intentional — don't remove it.
- **TypeScript strict + `noUncheckedIndexedAccess`.** `arr[0]` is `T | undefined`. CI build fails on TS errors — there's no `ignoreBuildErrors` escape hatch.
- **Middleware is `proxy.ts`, not `middleware.ts`.** There used to be a duplicate — removed in `1fead77`. Stamping request-ids, cron Bearer auth, and admin route protection all happen in `proxy.ts`.
- **Two Supabase clients, three call sites.** `lib/supabase/server.ts` (RSC + route handlers, carries user cookies), `lib/supabase/client.ts` (browser), `lib/supabase/admin.ts` (service-role, bypasses RLS). Service-role is a security-sensitive escape hatch — use only in admin routes, webhooks, and cron.
- **Husky + lint-staged run `eslint --fix --max-warnings 0` on staged `.ts`/`.tsx`.** Commits can get reformatted (files restaged post-fix). The `prepare` script silently tolerates missing husky with `|| true` so CI installs cleanly.
- **Coverage thresholds in `vitest.config.mts` are floors.** Set just below current to catch regressions without blocking legitimately untested new code. Ratchet them up as coverage grows; don't lower.
- **Webkit + mobile-safari are configured in `playwright.config.ts` but only chromium runs in the a11y job.** The a11y job passes `--project=chromium` because webkit had flaky networkidle timeouts that added ~3 min to PRs. Full E2E still runs all three.
- **Build failing "in an unrelated PR"? Check for shared TS errors.** Dependabot PRs open with a stale commit SHA; if main landed a TS fix after the PR opened, the PR will fail until rebased via `@dependabot rebase`.

## Single sources of truth — don't duplicate

| Concern                                      | Module                                                    |
|----------------------------------------------|-----------------------------------------------------------|
| Compliance copy (AFSL, GDPR, disclosures)    | `lib/compliance.ts`                                       |
| SEO helpers (`CURRENT_YEAR`, `UPDATED_LABEL`, `absoluteUrl`, `breadcrumbJsonLd`, `SITE_*`) | `lib/seo.ts` |
| Affiliate links + benefit CTAs + star rendering | `lib/tracking.ts`                                      |
| Sponsorship ranking helpers                  | `lib/sponsorship.ts`                                      |
| Vertical config (pillar pages, categories)   | `lib/verticals.ts`                                        |
| Locale registry + path helpers               | `lib/i18n/locales.ts`, `lib/i18n/dictionaries.ts`         |
| Schema.org JSON-LD builders                  | `lib/schema-markup.ts`                                    |
| Structured logging                           | `lib/logger.ts` (never `console.*`)                       |
| DB-backed rate limiting                      | `lib/rate-limit.ts`                                       |

Reaching for a hardcoded disclaimer, a new affiliate URL builder, or a fresh JSON-LD object usually means you missed an existing helper — search `lib/` first.

## Conventions worth matching

- **ISR on content pages:** `export const revalidate = N`. Sitemap is 86400 (24h); vertical pillars are 3600 (1h); pages with real-time numbers are lower.
- **Vercel cron routes** live under `app/api/cron/*` and use `requireCronAuth(req)` at the top, then do their work. Wrap long loops with the cron-run logger so the heartbeat check surfaces stale jobs.
- **Supabase migrations** are forward-only in prod. Every migration: idempotent (`IF NOT EXISTS`), header comment with rollback strategy, RLS enabled + policies for any user-data table.
- **Test file naming:** mirror the source path — `__tests__/lib/<x>.test.ts`, `__tests__/api/<route-slug>.test.ts`, `__tests__/components/<Component>.test.tsx` (jsdom). Integration tests go in `__tests__/integration/*.int.test.ts`.
- **Commit subjects** use Conventional Commits (`feat:`, `fix:`, `chore(deps):`, `test:`, `docs:`). See `git log` for tone — single-line subject, blank line, paragraph body explaining *why*. No closing summaries in PR descriptions — the diff is the summary.

## Dependabot groups

`vitest` + `@vitest/coverage-v8` are grouped in `.github/dependabot.yml`. Bumping them separately causes "Running mixed versions is not supported" CI crashes — we hit this on 2026-04-20. If you add a new peer-coupled dev-dep pair, group it too.

## Before shipping

1. `npm run type-check` — strict + `noUncheckedIndexedAccess` catches most bugs locally.
2. `npm test -- <changed files>` — tests run in ~seconds per file.
3. For UI: start `npm run dev` and actually click through the feature before declaring done. Type-checking and unit tests verify code correctness, not feature correctness.
4. If touching a cron route, verify `requireCronAuth` is called first.
5. If touching a user-data table, verify RLS is enabled with explicit policies.

## Common gotchas (lessons paid for in production)

Each entry below cost real time to debug. Read this section once on
onboarding, re-read every time the CI fails in a way you don't expect.

- **Folders prefixed with `_` don't become routes.** Next.js app router
  treats `_folder/` as a *private folder* and excludes it from routing.
  We discovered this 12 days into a cron-silence incident in 2026-04
  — the dispatcher lived at `app/api/cron/_dispatch/[group]/route.ts`,
  Vercel happily fired schedules at the path, `proxy.ts` matched the
  prefix, returned `NextResponse.next()`, and the response was a silent
  empty 200. Use `(group)/` for route-grouping, never `_group/`. The
  current dispatcher is at `app/api/cron/dispatch/[group]/route.ts`.
- **`cron_run_log.status` CHECK constraint requires `'ok'`, not `'success'`.**
  Allowed values are `'running' | 'ok' | 'error' | 'partial'`. Writing
  `'success'` silently fails the UPDATE — every UPDATE was rejected
  during the 04-16 → 04-26 silence, on top of the routing issue. Match
  what `wrapCronHandler` writes, which is `'ok'`.
- **Vercel cron pin lag.** When two production deploys land in rapid
  succession, Vercel's cron schedule can pin to whichever deployed first
  while the public alias points at the latest. Cron re-pins only on the
  next production deploy. If you fix a cron bug and the dispatcher still
  doesn't run, push another commit to main.
- **Migrations must be idempotent.** `IF NOT EXISTS` for `CREATE TABLE`,
  `DROP POLICY IF EXISTS` before `CREATE POLICY`. Migrations are
  forward-only in prod and may be re-run during recovery.
- **`arr[0]` is `T | undefined`.** `noUncheckedIndexedAccess` is on. Use
  `arr[0]?.foo`, an explicit guard, or destructure with a default. Don't
  reach for `as` to silence it — that's a bug waiting to manifest.
- **Don't import `lib/supabase/admin.ts` in an RSC page.** ESLint blocks
  it for files under `app/**/page.tsx`. Use `lib/supabase/server.ts`
  (carries user cookies, scoped by RLS) instead. Service-role is for
  admin routes, webhooks, and cron only. See `docs/audits/x-admin-backlog-decision-matrix.md`
  for the per-file decisions.
- **Stripe tool-call JSON escaping varies on 4.6+.** When parsing
  webhook payloads or tool-call inputs, always `JSON.parse()` — never
  raw-string-match. 4.6 may produce Unicode or forward-slash escaping
  that exact-string-match misses.
- **CSP no longer allows `unsafe-inline` for scripts.** Removed in
  K-04 (PR #222). If you add an inline `<script>`, it'll silently fail
  in CSP3 browsers. Use `next/script` with `strategy="afterInteractive"`,
  or move the logic into a module. CSP violations report to
  `/api/csp-report`.
- **`dangerouslySetInnerHTML` is ESLint-banned outside safe contexts.**
  K-13 added an `invest/no-unsafe-inner-html` rule. Use
  `sanitizeHtml(...)` from `lib/sanitize-html.ts` if you genuinely need
  HTML, or refactor to safe primitives. The newsletter is the canonical
  pattern — see `app/newsletter/[edition]/page.tsx`.
- **Rate-limit coverage is enforced by CI.** Every route under
  `app/api/**` is either covered by `isAllowed(...)` or explicitly
  exempted in `EXEMPT_PATTERNS` of `scripts/rate-limit-coverage.mjs`. A
  new public route without one will fail the build.
- **Don't write `console.log` in production code.** Use
  `logger("ctx-name")` from `lib/logger.ts`. The structured logger
  integrates with Sentry; `console.*` doesn't.
- **`git add -A` is a foot-gun.** Stages `.env.local`, build artefacts,
  IDE files. Always stage explicit files. Husky's `lint-staged` will
  catch obvious leaks but won't catch your local `.env.local` if it has
  a different name.
- **AI surface is deferred to post-launch.** See
  `docs/launch/manual-ops-during-ai-pause.md`. New AI features go
  behind an off-by-default feature flag or get queued; they don't ship
  to main without explicit approval.
