# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Start here

- `COMPANY.md` — organisational brief: legal entity, team, 19 agents, 24 agent tables, 5 escalation tiers, compliance constraints, Oct–Dec 2026 migration window. Read before any change that touches compliance, agents, escalation, or domain migration.
- `ARCHITECTURE.md` — request lifecycle, auth model, data model, caching strategy. Read before your first non-trivial change.
- `CONTRIBUTING.md` — commit convention (Conventional Commits), PR expectations, migration discipline, code style.
- `docs/runbooks/` — incident response procedures.
- `docs/strategy/FIN_NOTEBOOK.md` — Fin's persistent strategy notebook (revenue backlog, decisions log, "revisit in N months" items). Read at session start if the user asks anything strategic, revenue-related, or "what were we going to do about X". Append to it when new strategic decisions are made — don't delete, move resolved items to the bottom.

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
- **`.npmrc` sets `legacy-peer-deps=true`.** Kept as a safety net; the original trigger (Sentry v9 peer-deps targeting Next ≤15) was resolved by the Sentry v10 upgrade. Do not remove — future packages may still need it.
- **TypeScript strict + `noUncheckedIndexedAccess`.** `arr[0]` is `T | undefined`. CI build fails on TS errors — there's no `ignoreBuildErrors` escape hatch.
- **Middleware is `proxy.ts`, not `middleware.ts`.** There used to be a duplicate — removed in `1fead77`. Stamping request-ids, cron Bearer auth, and admin route protection all happen in `proxy.ts`.
- **Two Supabase clients, three call sites.** `lib/supabase/server.ts` (RSC + route handlers, carries user cookies), `lib/supabase/client.ts` (browser), `lib/supabase/admin.ts` (service-role, bypasses RLS). Service-role is a security-sensitive escape hatch — the full allowed scope (from the C-stream audit in PR #327):
  - Admin routes (`app/api/admin/*`, `app/admin/*`), webhooks, cron jobs — always legitimate.
  - `lib/*` helpers that serve **anonymous paths**: tables with deny-all-anon RLS (e.g., `anonymous_saves`, `user_quiz_history` — no anon INSERT policy) where no JWT is available.
  - `lib/*` helpers doing **cross-user queries** that can't be scoped to `auth.uid()` (e.g., `buildEmailToUserIdMap` in `notifications.ts`, `claimAnonymousSaves` in `bookmarks.ts`).
  - `lib/*` helpers that intentionally **bypass deny-all RLS** for security isolation (e.g., `require-advisor-session.ts` — `advisor_sessions` is deny-all by design).
  - Tables with **service_role-only policies** (e.g., `feature_flags`, `web_vitals_samples`) where no authenticated-role policy exists.
  - **Not** legitimate: public read tables covered by anon SELECT policies (e.g., `brokers` active-status reads). Use `createClient()` from server instead.
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
- **Validate API request bodies with Zod.** New `app/api/*` POST/PUT/PATCH/DELETE routes must wrap their handlers in `withValidatedBody(Schema, ...)` from `lib/validation/withValidatedBody.ts`, OR consume `await req.json()` immediately via `Schema.parse(...)` / `Schema.safeParse(...)`. ESLint rule `invest/no-unvalidated-req-json` (warn) flags drift; lint-staged's `--max-warnings 0` upgrades that warning to a commit blocker on staged files. For an unavoidable exception, opt out at the call site with `// eslint-disable-next-line invest/no-unvalidated-req-json -- <reason>`.

## Dependabot groups

`vitest` + `@vitest/coverage-v8` are grouped in `.github/dependabot.yml`. Bumping them separately causes "Running mixed versions is not supported" CI crashes — we hit this on 2026-04-20. If you add a new peer-coupled dev-dep pair, group it too.

## Merge authorization

Tiered policy at `docs/audits/MERGE_AUTHORIZATION.md`. Read before merging any agent-authored PR.

- **Tier A** (tests / docs / content / page UI / loop PRs labelled `auto-merge-safe`) → merge after CI green, no confirmation
- **Tier B** (refactors / additive API tests / RLS migrations passing isolation gate) → merge + 15-min observation window
- **Tier C** (webhooks, cron, middleware/proxy, auth, compliance, lib/stripe, lib/supabase/admin, .github/workflows, BB/CC/DD/EE streams, new schema migrations) → announce intent in chat, merge unless `STOP` comes back
- **Tier D** (PR body explicitly says "set X env var before merge", or has `do-not-merge` label) → hard hold, refuse until precondition confirmed
- **Tier E** (force-push / branch delete / repo settings / workflow disablement / anything `git revert` can't undo) → never autonomous, require explicit fresh consent every time

Founder-authored PRs are out of scope.

## Before shipping

1. `npm run type-check` — strict + `noUncheckedIndexedAccess` catches most bugs locally.
2. `npm test -- <changed files>` — tests run in ~seconds per file.
3. For UI: start `npm run dev` and actually click through the feature before declaring done. Type-checking and unit tests verify code correctness, not feature correctness.
4. If touching a cron route, verify `requireCronAuth` is called first.
5. If touching a user-data table, verify RLS is enabled with explicit policies.
