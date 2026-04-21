# TODO

Running backlog. Pull from here rather than inventing work.

**Convention:** newest at top of each section. Tick with `- [x]` and leave in place for ~a week so we can see what shipped. Delete during weekly prune.

## Urgent — data exposure

- [ ] **`public.bd_pipeline` is readable by anon.** Policy `Public can read BD pipeline` is `FOR SELECT` with `qual = true` on `{public}`. This is our enterprise deal pipeline — contact, stage, deal size — exposed to every anon request via PostgREST. **Live production data leak.** Fix: drop that policy; the existing `Service role manages BD pipeline` covers agent writes via service_role. Add a targeted authenticated read only if/when the `/bd` dashboard needs it. Surfaced 2026-04-21 during agent-infrastructure migration RLS audit.
- [ ] **`public.competitor_watch` is readable by anon.** Policy `Public read competitor_watch` is `FOR SELECT` with `qual = true` on `{public}`. Competitor intel exposed publicly. **Live production data leak.** Fix: drop that policy; add an explicit `service_role` `FOR ALL` policy (service_role currently works only via `BYPASSRLS`). Surfaced 2026-04-21 during agent-infrastructure migration RLS audit.

## Now (pick from here first)

- [ ] A11y: identify the remaining `color-contrast` offender on /glossary, /tools, /foreign-investment, /about, /how-we-earn, /privacy, /terms. Run axe locally after `npm run build && npm run start`. One violation per page, so likely a single shared element (breadcrumb? prose link?). Re-raise the gate to block on `serious` in `e2e/a11y.spec.ts` once violations hit zero.
- [ ] Vitest 4 migration PR. Blockers documented in PR #180 (closed). Bump `vitest` + `@vitest/coverage-v8` together; replace `environmentMatchGlobs` in `vitest.config.mts` with `test.projects`; widen `vi.fn()` mock types where the return signature is narrowed (pattern already applied in `__tests__/components/StarRatingInput.test.tsx` and `__tests__/helpers.ts`).
- [ ] Lint-staged 16 PR #181 — should merge cleanly after rebase; watch for husky 9 compat.

## Soon (next week or two)

- [ ] RLS cosmetic cleanup on two reused platform tables (surfaced 2026-04-21 during agent-infrastructure migration RLS audit; not blocking — agent writes work via `BYPASSRLS`):
  - `public.dynamic_pricing_rules` has zero policies. Default-deny for `anon`/`authenticated` is correct, but Supabase advisor flags the missing explicit `service_role` policy. Add `Service role manages dynamic_pricing_rules FOR ALL TO service_role USING (true) WITH CHECK (true)`.
  - `public.forum_threads` has two duplicate public-read policies (`Public read forum_threads` and `public_read_visible_threads`) with identical `is_removed = false` predicate. Drop one.
- [ ] ACN/ABN hardcode cleanup. `lib/compliance.ts` exports `COMPANY_ACN` (`093 882 421`) and `COMPANY_ABN` (`90 093 882 421`) as the source of truth, but three pages hardcode the literal instead of importing:
  - `app/accessibility/page.tsx:26`
  - `app/admin/compliance/page.tsx:1035-1036`
  - `app/privacy/page.tsx:48`

  Correct pattern already used at `app/advertiser-terms/page.tsx:137` (imports `COMPANY_LEGAL_NAME` & friends). Import and interpolate. Surfaced 2026-04-21 during COMPANY.md sanity sweep (commit `2284c83`).
- [ ] Vercel project ID env-var extraction. `app/api/admin/ai-chat/route.ts:12` hardcodes `const VERCEL_PROJECT_ID = "prj_miPLXyjwXbqNnGLOFijBHbjXWESY";`. Move to `process.env.VERCEL_PROJECT_ID`. Confirm the env var is set in Vercel project settings before removing the literal fallback. Surfaced 2026-04-21 during COMPANY.md sanity sweep (commit `2284c83`).
- [ ] Tests for today's shipped cron routes. Pattern: `__tests__/api/cron-<name>.test.ts`, following `__tests__/api/cron-sponsored-renewal-reminder.test.ts`. Priorities:
  - [ ] `app/api/cron/affiliate-payout-recon/route.ts`
  - [ ] `app/api/cron/sponsored-placement-apply/route.ts` (financial side-effect; test the "matches" check that avoids stomping later bookings)
  - [ ] `app/api/cron/exit-intent-nurture/route.ts`
  - [ ] `app/api/cron/stale-fee-editorial/route.ts`
- [ ] Webkit timeout audit: `networkidle` is the killer. Look at swapping to `domcontentloaded` + explicit waits, or dropping webkit from E2E entirely if chromium covers what matters.
- [ ] Coverage ratchet: current thresholds in `vitest.config.mts` are `lines: 20, functions: 45, branches: 50, statements: 20`. After cron-route tests land, bump floors.

## Someday / parking lot

- [ ] "Tier N" naming discipline for the agent system. When implementing escalation (COMPANY.md §5-tier escalation system) and editorial tiers (§Editorial standards) in code, prefer qualified enums (`EscalationTier.AUTO`, `EscalationTier.APPROVAL_GATE`; `EditorialTier.PILLAR`, `EditorialTier.CLUSTER`, `EditorialTier.PROGRAMMATIC`) over bare `Tier 1`–`Tier 5`. The token is already used for at least 4 unrelated concepts in the codebase (`lib/advisor-verification.ts:312-313` RG146 advice tiers; `app/insurance/health/page.tsx:140-142` Medicare Levy Surcharge; `app/invest/hybrid-securities/page.tsx` and `app/invest/bonds/page.tsx` Basel/APRA bank capital tiers; `app/versus/[slugs]/page.tsx:26-49` SEO groupings). Surfaced 2026-04-21 during COMPANY.md sanity sweep (commit `2284c83`).
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
