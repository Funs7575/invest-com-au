# TODO

Running backlog. Pull from here rather than inventing work.

**Convention:** newest at top of each section. Tick with `- [x]` and leave in place for ~a week so we can see what shipped. Delete during weekly prune.

## Now (pick from here first)

- [ ] A11y: identify the remaining `color-contrast` offender on /glossary, /tools, /foreign-investment, /about, /how-we-earn, /privacy, /terms. Run axe locally after `npm run build && npm run start`. One violation per page, so likely a single shared element (breadcrumb? prose link?). Re-raise the gate to block on `serious` in `e2e/a11y.spec.ts` once violations hit zero.
- [ ] Vitest 4 migration PR. Blockers documented in PR #180 (closed). Bump `vitest` + `@vitest/coverage-v8` together; replace `environmentMatchGlobs` in `vitest.config.mts` with `test.projects`; widen `vi.fn()` mock types where the return signature is narrowed (pattern already applied in `__tests__/components/StarRatingInput.test.tsx` and `__tests__/helpers.ts`).
- [ ] Lint-staged 16 PR #181 — should merge cleanly after rebase; watch for husky 9 compat.

## Soon (next week or two)

- [ ] Tests for today's shipped cron routes. Pattern: `__tests__/api/cron-<name>.test.ts`, following `__tests__/api/cron-sponsored-renewal-reminder.test.ts`. Priorities:
  - [ ] `app/api/cron/affiliate-payout-recon/route.ts`
  - [ ] `app/api/cron/sponsored-placement-apply/route.ts` (financial side-effect; test the "matches" check that avoids stomping later bookings)
  - [ ] `app/api/cron/exit-intent-nurture/route.ts`
  - [ ] `app/api/cron/stale-fee-editorial/route.ts`
- [ ] Webkit timeout audit: `networkidle` is the killer. Look at swapping to `domcontentloaded` + explicit waits, or dropping webkit from E2E entirely if chromium covers what matters.
- [ ] Coverage ratchet: current thresholds in `vitest.config.mts` are `lines: 20, functions: 45, branches: 50, statements: 20`. After cron-route tests land, bump floors.

## Someday / parking lot

- [ ] Next.js majors — dependabot is configured to ignore them; plan a dedicated migration window.
- [ ] Re-enable webkit a11y when networkidle timeouts are resolved (currently chromium-only in `.github/workflows/ci.yml`).
- [ ] Split `MEMORY.md` into per-topic memory files per the harness convention (index + individual files).
- [ ] Audit `/broker-portal/*` and `/advisor-portal/*` for consistent auth pattern — ARCHITECTURE.md specifies "session + matching row", but spot-checks suggest some routes only check session.

## Done recently (prune weekly)

- [x] 2026-04-20 — CLAUDE.md created, dependabot grouped vitest+coverage, a11y job narrowed to chromium-only (3min/PR savings).
- [x] 2026-04-20 — FAQ normaliser in `lib/cached-versus.ts` to handle both `{question,answer}` and `{q,a}` row shapes.
- [x] 2026-04-20 — 28 unit tests covering normaliseFaqs + i18n dictionaries.
- [x] 2026-04-20 — a11y contrast fixes on Footer/SiteFooter/about (homepage now violation-free).
- [x] 2026-04-20 — cleaned up 40 stale remote `claude/*` branches; deleted merged local branches.
- [x] 2026-04-20 — merged dependabot PRs #184 (checkout@6), #185 (github-script@9), #189 (prod-minor), #190 (next 16.2.4), #179 (dev-patch-minor).
- [x] 2026-04-20 — closed vitest 4 PR #180 with migration rationale.
