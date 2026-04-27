# Audit Remediation — Defaults

Decisions baked into the loop. Override by editing this file or a queue item.
The slash command `/audit-remediation-iteration` reads from here.

Authored 2026-04-26 from the user's "use your defaults" go-ahead. Changes here
take effect on the next iteration.

## Branching

- One draft PR per stream. Branch naming: `claude/audit-remediation/<letter>-<slug>`.
- All branches forked from `main`, kept up to date by `git fetch origin main && git merge --no-edit origin/main` at the start of each iteration that touches the branch.
- Setup PR (queue + slash command + defaults) lives on `claude/audit-codebase-health-8OCxZ` — that's the branch the harness assigned for this work.

## Default decisions on the 5 open questions

1. **PR strategy:** one draft PR per stream (9 PRs). Each iteration appends commits.
2. **Branch naming:** `claude/audit-remediation/<letter>-<slug>` (see Streams below).
3. **`admin.ts` in user paths (#216):** default is **refactor to `lib/supabase/server.ts` + add the missing RLS policy**. Surface to Blocked if (a) the route requires writing data the user shouldn't be able to mutate directly, or (b) RLS policy is non-obvious (e.g., affiliate revenue tables). Never silently leave service-role in a user path.
4. **RLS for the 9 medium-risk tables (#215):** default policy is `owner_id = auth.uid()` for read/write, `service_role` for inserts, deny anon. If the table has no `owner_id`-shaped column, surface to Blocked. Always emit a `-- TODO: human review of policy semantics` comment in the migration.
5. **CI gate:** before appending commits to an in-flight PR, the iteration runs `gh pr checks <number>` (or `mcp__github__pull_request_read` with checks). If CI is red, the iteration's job is to diagnose and fix that PR — not to start new work.

## Verification gates (lessons from the audit)

The audit had at least one false positive (the "dead components" — they're re-exported by `app/*/loading.tsx` and `app/*/error.tsx`, which the grep missed). **Trust the audit's directional claims, verify before destructive action.**

Per-stream verification floor before any commit:

- **Deletion:** `grep -rn "<symbol>" --include="*.ts" --include="*.tsx" .` plus the same with `export.*from.*<filename>` to catch re-exports. If anything matches, the item is a false positive — mark it RESOLVED-FALSE-POSITIVE in the queue.
- **Refactor (admin.ts → server.ts):** confirm the calling route reads `req.cookies` or is in an authenticated layout; if not, surface to Blocked.
- **New migration:** must be idempotent (`IF NOT EXISTS`), have a rollback header, and enable RLS if it creates a table.
- **New RLS migration on an existing table** (added 2026-04-26 after iter 7's B-05 false-positive policy stack-up):
  - Run `grep -nE "(POLICY.*<table>|<table>.*POLICY|TABLE.*<table>.*ENABLE)" supabase/migrations/*.sql` BEFORE writing the migration. Inspect every prior `CREATE POLICY`, `DROP POLICY`, and `ENABLE ROW LEVEL SECURITY` mention.
  - For every prior `CREATE POLICY "<exact name>" ON <table>`, add a `DROP POLICY IF EXISTS "<exact name>" ON <table>;` line in the new migration with a comment naming the source migration. RLS policies stack additively — missing one means the new migration cannot enforce its stated intent.
  - If the table was already RLS-enabled by an earlier migration, do NOT include `DISABLE ROW LEVEL SECURITY` in the rollback header. Document the prior-RLS state in the header so future readers know the migration's true delta is just policy tightening + (often) FORCE RLS.
  - Document any prior policies discovered in an `IMPORTANT — prior policy state:` block in the migration header so the audit trail shows what was replaced and why.
- **New test:** must actually exercise the route handler — not just import-and-assert-truthy. Reject on coverage of < 60% of the route's branches.

## Per-iteration discipline

- **Diff cap:** ≤ ~800 LOC per iteration (excluding generated files / pure data). Bumped from 500 → 800 on 2026-04-26 after iter 22 review — most cleanly-bounded refactors (handler-registry splits, test-file additions, runbook authoring) fit in 600–800 lines and forcing a split adds ceremony without quality gain. Larger work still splits across iterations.
- **Always run before commit:**
  ```bash
  # If any .ts/.tsx changed, type-check just those files:
  npx tsc --noEmit --noErrorTruncation <changed .ts files>
  # If no .ts changed (e.g. SQL-only migration), skip whole-codebase tsc.
  npm test -- <changed test files only>
  npm run lint -- <changed files only>
  ```
  If any red → fix or revert. Never commit a red iteration.
- **Every 10th iteration:** also run `npm run build` to catch issues unit tests miss (route-manifest, ISR, server-component boundaries). Skip on the constrained sandbox (see Hardware exception); CI on the stream PR is the authoritative `build` gate.
- **No destructive git ops:** no `--force`, no `reset --hard`, no `clean -fd`. Migrations are forward-only per `CLAUDE.md`.
- **Hooks:** generally don't skip; but see Hardware exception below for `HUSKY=0` on the constrained sandbox.
- **Conventional Commits** subject lines per `CONTRIBUTING.md` style (`fix(stream-d): add /api/submit-lead integration test`).

## Hardware exception (added 2026-04-26 after iter 1)

The loop runs on a 2-CPU / 6.5GB / no-swap sandbox. `npx tsc --noEmit` over the full ~1,700-file TS tree OOMs or hangs (>20 min, multiple kills observed in iter 1). Two consequences:

1. **Whole-codebase `tsc` is skipped** in Phase 5 / pre-push. Use file-targeted `tsc --noEmit <changed files>` only when `.ts`/`.tsx` actually changed in the iteration; SQL-only / docs-only / .yml-only commits skip type-check entirely.
2. **`HUSKY=0` is set in the loop's env** so the husky pre-push hook (which reruns the same whole-codebase `tsc` plus `audit:rate-limits` plus `test:changed`) is bypassed. The hook itself documents `--no-verify` as a supported escape and is duplicated by CI.

**CI on each stream PR is the authoritative gate** — same `tsc`, same audits, same tests, run on GitHub-hosted runners with adequate RAM. If CI on a pushed iteration is red, the next iteration's Phase 2 (CI rescue) handles it. This is the same recovery path as if the local hook had caught the issue, just shifted from local-blocking to remote-blocking.

The exception is hardware-scoped, not policy-scoped: if the loop is moved to a host that can run `tsc` cleanly (≥4 CPU, ≥8GB or with swap), revert this section and re-enable the local gates.

**Cloud-mode probe:** in cloud schedule mode, the sandbox is generally bigger than the constrained 6.5GB local one. The first iteration in cloud should attempt `npx tsc --noEmit` with a 90s timeout — if it completes, drop the Hardware exception for cloud iterations and run full local validation. If it OOMs / times out, keep the exception and lean on CI as before. This is checked once per cloud session at the start of Phase 5, not every iteration.

## Cloud schedule mode (added 2026-04-26 after iter 21)

The loop runs in two modes, with different infrastructure but the same iteration contract.

| | Local `/loop` (sessions) | Cloud `/schedule` (recurring cron) |
|---|---|---|
| Trigger | `ScheduleWakeup` between iterations | Cron expression (e.g. `0,30 * * * *`) |
| Working tree | Persistent — same checkout, can be contaminated by parallel sessions | Fresh `git clone` each fire — always clean |
| Lock file | `.git/audit-remediation.lock` (process-level) | Not needed — cron infrastructure serialises fires |
| Cadence | Self-paced (1200–1800 s typical) | Fixed (cron pattern) |
| Survives terminal close | ❌ no | ✅ yes |
| Auto-expiry | None | 7 days (default) |

**Things to verify when running in cloud mode:**

1. **`HUSKY=0` must be in the cloud schedule's env** — the pre-push hook re-runs whole-codebase `tsc` and OOMs identically to the local sandbox. (Set in the `/schedule` invocation or globally.)
2. **MCP servers** — at least Supabase MCP is needed (iter 19/20 used `generate_typescript_types` to fix a drift CI failure; iter 21 used the same to verify table existence). If MCPs are missing in the cloud env, those iterations would surface as Blocked instead of forward progress.
3. **`gh` CLI auth** — must be configured for the GitHub user who can write to PRs. Used for `gh pr create`, `gh pr checks`, `gh api -X PATCH`.
4. **Lock-file race** — concurrent local + cloud fires CAN conflict (each thinks it has the lock since the file lives in different `.git/` trees). When swapping in cloud mode, **stop the local `/loop`** (omit the next `ScheduleWakeup` call) to avoid overlap. The schedule's cron pattern alone serialises subsequent runs.
5. **`STATUS: ALL-BLOCKED`** — if the queue runs out of unblocked work, each cron fire performs Phase 1+2+3 then exits cheaply (~10 s). Cancel the cron via `/schedule list` + `/schedule delete <id>` to stop the wasted fires.
6. **Stop signal** — when an iteration prints `STATUS: COMPLETE`, it writes a `LOOP_DONE` sentinel file at the repo root before exiting. The founder can monitor for this file's presence (or set up a GitHub Action that disables the cron when it lands) to auto-stop the schedule. Re-arm by deleting `LOOP_DONE` and re-enabling.

### Parallel cloud routines (added 2026-04-26 after iter 22)

Two cloud routines run concurrently with offset cron:

- `audit-remediation-loop` — fires at `0 * * * *` (top of hour)
- `audit-remediation-loop-half` — fires at `30 * * * *` (half past)

Effective cadence: 30 min, doubling overnight throughput (~16 iterations/8h vs ~8). Both routines share the same queue (`docs/audits/REMEDIATION_QUEUE.md` on main) but each fire is a fresh `git clone` so there's no in-process lock contention.

**Race safety:** the only contention point is when both fires happen to pick the SAME pending item between Phase 1 (sync queue) and Phase 7 (push queue update). This is bounded by:
- Phase 7's `git push origin main` is rejected as non-fast-forward if the other fire pushed first → the second iteration's queue update simply re-tries on its next fire.
- Phase 6's `git push origin <stream-branch>` similarly retries.
- Worst case: ~5% of fires are wasted because both raced on the same item. No data corruption.

If an auto-merge GitHub Action is set up (see `.github/workflows/audit-remediation-auto-merge-main.yml`), main-side merges automatically rebase into stream branches, removing the iter-21 class of CI rescue.

## Streams

| Letter | Branch | Title | Source |
| --- | --- | --- | --- |
| A | `claude/audit-remediation/a-drift-backfill` | DB schema drift backfill (231 tables) | 04-24 audit · issue #214 |
| B | `claude/audit-remediation/b-rls-remediation` | RLS on 11 migrations | 04-24 audit · issue #215 |
| C | `claude/audit-remediation/c-admin-scope-reset` | `admin.ts` scope reset | 04-24 audit · issue #216 |
| D | `claude/audit-remediation/d-route-tests` | API route tests (critical 9 + backfill) | 04-24 audit · issue #217 |
| E | `claude/audit-remediation/e-zod-rollout` | Zod validation rollout | 04-24 audit · issue #218 |
| F | `claude/audit-remediation/f-hygiene` | Dead code, duplicate consolidation, SSOT | 04-24 audit §1+§2 |
| G | `claude/audit-remediation/g-migration-hygiene` | Idempotency + rollback headers | 04-24 audit §5.2+§5.4 |
| H | `claude/audit-remediation/h-file-splits` | Files >1000 LOC | 04-24 audit §3.2 |
| I | `claude/audit-remediation/i-guardrails` | ESLint + CI guards | 04-24 audit cross-cutting |
| J | `claude/audit-remediation/j-stripe-webhook` | Stripe webhook completeness + handler split | 04-26 audit §5+§11 · issue #221 |
| K | `claude/audit-remediation/k-security-hardening` | Security P0/P1/P2 (CORS, OTP, CSP, audit log) | 04-26 audit §7 · issue #221 |
| L | `claude/audit-remediation/l-observability` | Sentry/PostHog/SLO/n8n env-vars | 04-26 audit §9+§10 · issue #221 |
| M | `claude/audit-remediation/m-seo` | Cover images, versus schema, FinancialService | 04-26 audit §8 · issue #221 |
| N | `claude/audit-remediation/n-ux-perf` | Hero LCP, blur placeholders, a11y, advisor-portal split | 04-26 audit §6 · issue #221 |
| O | `claude/audit-remediation/o-db-hardening` | RLS-no-policy triage, FK indexes, search_path | 04-26 audit §4 · issue #221 |
| P | `claude/audit-remediation/p-deps` | Sentry v10, Stripe SDK v22, audit clean | 04-26 audit §3 · issue #221 |
| Q | `claude/audit-remediation/q-dr-soc2` | PITR drill, account-recovery runbooks, DPAs | 04-26 audit §12 · issue #221 |
| R | `claude/audit-remediation/r-lib-coverage` | Marketplace, dispute-resolver, cached-data tests | 04-26 audit §2.3 · issue #221 |
| S | `claude/audit-remediation/s-architecture` | Diagrams, OpenAPI, missing runbooks | 04-26 audit §12 · issue #221 |
| T | `claude/audit-remediation/t-deferred-deps` | TypeScript 6 + ESLint 10 + Vitest 4 (deferred upgrades, promoted to active) | iter 22+ "max 100%" · issue #221 |
| U | `claude/audit-remediation/u-pre-launch-ops` | Status page, support inbox, email deliverability, LH-CI gate, axe-core gate, load-test, monitoring runbook, closed-beta plan, uptime monitor | iter 22+ "max 100%" · issue #221 |
| V | `claude/audit-remediation/v-polish-extras` | Sentry release tracking, sourcemap verification, PostHog privacy, GDPR consent, ACL checklist, cookie domain, 301 redirect map, perf budgets, external a11y, pen-test prep | iter 22+ "max 100%" · issue #221 |
| W | `claude/audit-remediation/w-hub-foundation` | Hub component extraction (HubHero, HubServiceGrid, HubArticleStrip, DirectoryGrid, CalculatorShell, EligibilityQuiz, HubPage HOC) + migrations of existing hubs onto the new template | 2026-04-27 hub revenue expansion · `docs/audits/HUB_BLUEPRINT.md` |
| X | `claude/audit-remediation/x-admin-backlog` | Clear `createAdminClient` from 17 public RSC pages; ratchet ESLint rule from `warn` to `error` | 2026-04-27 hub foundation · extension of stream C |
| Y | `claude/audit-remediation/y-registry-nav` | Registry-driven `<MegaMenu>`, auto-sitemap, `<DatedStatBadge>` + cron stale-check + CI lint | 2026-04-27 hub foundation · `docs/audits/HUB_BLUEPRINT.md` §2 + §7 |
| Z | `claude/audit-remediation/z-tier1-hubs` | Tier-1 hub builds: `/private-markets`, `/startup` (relocate `/grants`), `/wholesale` — each hub: HubConfig + sub-pages + directory + calculator + quiz + lead magnet + article seeds + smoke E2E. Extended 2026-04-27 with Z-22..Z-27 (`/redundancy`, `/first-home-buyer`, `/inheritance`, `/insurance`, `/super`, `/tax-return`) | 2026-04-27 hub revenue expansion · `docs/audits/HUB_BLUEPRINT.md` §5 |
| AA | `claude/audit-remediation/aa-programmatic-seo` | Programmatic SEO templates that consume Supabase data and ISR-render thousands of pages: `/find/[type]/[city]`, `/grants/[industry]`, `/grants/[state]/[program]`, `/[etf-ticker]`, `/[suburb]/property-investing`, `/investing-for-[occupation]`, `/just-[event]` moment-of-money pages | 2026-04-27 hub revenue expansion · `docs/audits/HUB_BLUEPRINT.md` §8 |
| BB | `claude/audit-remediation/bb-calculators` | Lead-capture tool farm: borrowing-power multi-lender, salary-sacrifice optimiser, CGT calculator, net-worth tracker (Basiq/Frollo bank linking, security-reviewed), subscription audit, mortgage stress test, ETP calculator, FHSS calculator, ETF screener, LIC screener | 2026-04-27 hub revenue expansion · `docs/audits/HUB_BLUEPRINT.md` §1 |
| CC | `claude/audit-remediation/cc-ai-features` | AI features (Anthropic API): document upload + extract pipeline (security-reviewed), super-statement analyzer, tax-return optimizer, grants eligibility extractor, portfolio review AI, advisor pre-chat bot, SoA/RoA generator (legal-reviewed, post-AFSL) | 2026-04-27 hub revenue expansion · `docs/audits/HUB_BLUEPRINT.md` §9 |
| DD | `claude/audit-remediation/dd-marketplace` | Marketplace mechanics: tiered advisor listings (Free/Pro/Featured), verified-by-invest.com.au badge, booking + payment rail (Stripe Connect 15% take), real-time advisor bidding auction model | 2026-04-27 hub revenue expansion · `docs/audits/HUB_BLUEPRINT.md` §1 (lever #2 + #6) |
| EE | `claude/audit-remediation/ee-distribution` | Distribution / embeds: embeddable rate tables widget, Chrome extension (security-reviewed, separate repo), WhatsApp/Telegram alerts bot, API marketplace (B2B) | 2026-04-27 hub revenue expansion · `docs/audits/HUB_BLUEPRINT.md` §7 |
| KK | `claude/audit-remediation/kk-lead-routing-maturity` | Lead-form surface CI gates: SLA monitoring per source, queue health alerts, advisor response-time tracking, conversion analytics per source, lead-source routing audit, advisor performance dashboard | 2026-04-27 enterprise-standard reorder · `docs/audits/ENTERPRISE_STANDARD.md` "Lead form surface" |

## Priority order

When choosing the next item, walk in this order and pick the first non-blocked one. The loop interleaves 04-24 streams (A–I) with 04-26 streams (J–S) so that compliance/security/revenue gates land first, with cosmetic and architecture work later.

**2026-04-26 reorder note:** N (P0 UI/UX) moved up to step 3 (was step 7). Reasons: (a) founder explicitly asked for visible work after observing the first 22 iterations were all backend; (b) stream K is mid-flight on PR #222 with 7 commits, so finishing K then jumping to N gives one clean review-able PR followed by visible morning wins; (c) D/J/L items are largely test/integration work that can run while founder is awake to consult on edge cases.

**2026-04-27 enterprise-standard reorder note:** the four V-NEW gates (V-NEW-01..04) move to slot 1 — they're the CI side of the per-surface rubric in `docs/audits/ENTERPRISE_STANDARD.md`, and every later stream (CC, DD, AA touching dated data, BB calculators, every directory listing) depends on at least one of them. Shipping them first means the rest of the queue lands on top of working gates rather than racing a backstop. The DatedStatBadge enforcement (CI lint side of Y-05) moves to slot 2 — it's the page-surface gate the AA-* programmatic templates need to land safely on dated data, and pulling it out of Y-05 lets streams W and Y stay parallelisable. New stream KK (lead-routing maturity) inserts at slot 14, before any external coordination starts in Week 4-5. Streams W and X are explicitly **parallel-eligible** — they touch disjoint file scopes (W extracts to `components/Hub*`, X swaps imports in `app/**/page.tsx`) and the loop can interleave them without merge conflicts. Stream X is shown at the slot where it would block other streams if not yet complete, but it can run any time.

1. **V-NEW-01..04 (parallel)** — stale-data gate (`<DatedStatBadge>` past `stalesAt` fails build), AI-output factual filter (gates entire CC stream), Stripe webhook idempotency replay harness (gates entire DD stream), RLS isolation gate for new user-data tables (security baseline). All P0; ship before any item that depends on them. Per-surface rubric: see `ENTERPRISE_STANDARD.md`.
2. **`<DatedStatBadge>` enforcement** (extracted from Y-05) — the component + the cron stale-check + the CI lint that fails build on unwrapped dated claims. Gates every AA-* item touching dated data. Ship the component on its own iteration so streams W/X/Y/Z and AA-* can build against it without waiting for the rest of Y to land.
3. **B (critical 2)** — `email_otps` and `leads` RLS — compliance gate. _(Done; B-06 in flight.)_
4. **K (P0 security)** — widget CORS, audit-log sweep, OTP rate-limit, CSP fallback removal — security gate.
5. **N (P0 UI/UX)** — homepage hero priority + blur, advisor-portal client-bundle split, a11y skip-link, hero LCP, mobile responsiveness.
6. **D (critical 9)** — lead-capture + Stripe + signout integration tests — revenue gate.
7. **J (P0/P1 Stripe webhook)** — handler-registry split + 9 missing event handlers + featured_plans cleanup — revenue gate.
8. **L (observability)** — n8n env-vars, SLO seed + alert sink, PostHog funnel completion, cron silence diagnosis.
9. **M (P0 SEO)** — article cover-image backfill, versus schema, advisor FinancialService, domain-migration prep.
10. **B (other)** — remaining RLS migrations (`listing_plans`, `quarterly_reports`).
11. **C** — `admin.ts` scope reset (mechanical refactors; surface ambiguous to Blocked).
12. **A** — drift backfill (4–5 tables per iteration).
13. **O (DB hardening)** — 56 RLS-no-policy triage, FK indexes, search_path safety.
14. **KK (lead-routing maturity)** — SLA monitoring per source, queue health alerts, advisor response-time tracking, conversion analytics per source, lead-source routing audit, advisor performance dashboard. Operationalises the lead-form surface in `ENTERPRISE_STANDARD.md`. Inserted before Cowork external coordination starts in Week 4-5 so the lead pipeline is observable when external partners begin sending volume.
15. **P (deps)** — Sentry v10, Stripe SDK v22.
16. **R (lib coverage)** — marketplace allocation + auto-bid + dispute-resolver tests (P0 lib coverage).
17. **E** — Zod rollout (top-20 first).
18. **Q (DR + SOC 2)** — runbooks, vendor DPAs, secret-rotation log, GDPR disclosure page.
19. **G** — migration hygiene.
20. **I** — guardrails (after A/B/C land so the rules don't break in-flight work).
21. **F** — hygiene cleanup.
22. **S (architecture artefacts)** — diagrams, OpenAPI, ADRs.
23. **H** — file splits (last 04-26-audit stream; needs tests in place to be safe). Note: H-01 (stripe webhook split) is subsumed by J-01; H-03 (advisor-portal split) is subsumed by N-03.
24. **U (pre-launch ops)** — status page, support inbox, email deliverability, LH-CI gate, axe-core gate, load-test, monitoring runbook, closed-beta plan, uptime monitor. Several items are `needs-user` — surface them early so the founder has time to act.
25. **V (polish + extras, minus V-NEW-01..04 which moved to slot 1)** — Sentry release tracking, sourcemap verification, PostHog privacy, GDPR consent, ACL checklist, cookie domain pre-flight, 301 redirect map for legacy WordPress URLs, perf budgets, external a11y, pen-test prep.
26. **T (deferred deps)** — TypeScript 6 + ESLint 10 + Vitest 4. Run LAST because high blast radius — depends on stream D's restored test coverage being green to detect regression. If the upgrade fails, the loop reverts and surfaces to Blocked rather than landing a half-broken main.

**2026-04-27 hub-revenue extension (founder brief: "make every hub leverage every monetisation opportunity, deep-dive then execute").** Four streams added (W/X/Y/Z) for hub foundation + registry-driven nav + Tier-1 hub builds. Strategic doc: `docs/audits/HUB_BLUEPRINT.md`. Streams added to priority order below; founder may hand-edit to slot above quality streams if velocity outweighs polish.

27. **W (hub foundation)** — extract `<HubHero>`, `<HubServiceGrid>`, `<HubArticleStrip>`, `<HubDeepDiveGrid>`, `<HubAdvisorCTA>`, `<HubFAQ>`, `<DirectoryGrid>` family, `<CalculatorShell>`, `<EligibilityQuiz>`, `<CrossHubLinks>`, `<HubPage>` HOC. Migrate `/smsf` and `/grants` first (proof). Without this layer every new hub re-implements layout — biggest velocity multiplier in the roadmap. Items W-01..W-15. **Parallel-eligible with stream X** — disjoint file scopes (W extracts to `components/Hub*`, X swaps imports in `app/**/page.tsx`).
28. **X (admin backlog)** — clear `createAdminClient` from the 17 public RSC pages identified during the foundation audit; ratchet `eslint.config.mjs` rule from `warn` to `error`. Extension of stream C. Items X-01..X-09. **Parallel-eligible with stream W** — see W note. The loop interleaves W and X iterations whenever both have unblocked items.
29. **Y (registry + nav, minus DatedStatBadge enforcement which moved to slot 2)** — registry-driven `<MegaMenu>` replacing the 666-line hardcoded `Header.tsx`, auto-sitemap, breadcrumbs from registry. Items Y-01..Y-04 + Y-06..Y-08. Depends on W landing.
30. **Z (Tier-1 hub builds)** — `/private-markets`, `/startup` (absorbs `/grants`), `/wholesale`. Each hub: HubConfig row + sub-pages + directory + calculator + quiz + lead magnet + article seeds + smoke E2E. Items Z-01..Z-21 (Tier-1) plus Z-22..Z-27 (added 2026-04-27 — `/redundancy`, `/first-home-buyer`, `/inheritance`, `/insurance`, `/super`, `/tax-return`). Depends on Y landing. **Page-surface rubric enforced** — every Z-* item meets the page rubric in `ENTERPRISE_STANDARD.md` (revalidate, breadcrumb JSON-LD, axe, Lighthouse, `<DatedStatBadge>`, typed `submitLead({ source })`).

**2026-04-27 AA–EE expansion (founder spec, post-Option-B authorisation).** Five new streams adding programmatic SEO, lead-capture calculator farm, AI features, marketplace mechanics, and distribution/embeds. Plus four CI gates (V-NEW-01..04) that gate later streams from landing — moved to slot 1 in the 2026-04-27 enterprise-standard reorder. Z extended inline with six new lifecycle hubs (Z-22..Z-27). 38 new items + 4 CI gates + 6 hub items = 48 added items, raising total queue from 53 (W/X/Y/Z) to 101 (W/X/Y/Z + AA/BB/CC/DD/EE/V-NEW + Z-22..Z-27). The KK stream (lead-routing maturity) inserted at slot 14 adds another 6 items, raising the total to 107.

31. **AA-01** (`/find/[advisor-type]/[city]` template) — unlocks ~5,000 SEO pages on existing professionals data; highest single-item leverage in the roadmap.
32. **Z-23 + BB-08 co-shipped** (`/first-home-buyer` hub + FHSS calc) — biggest organic search volume in AU PF, mortgage broker affiliate is highest CPA on platform; together they ship as the first proof point that the new component system actually compresses build time.
33. **Z-22 + BB-07 co-shipped** (`/redundancy` hub + ETP calc) — fastest revenue moment, lowest competition, ETP $80-300K landing.
34. **BB-01** (borrowing power multi-lender) — feeds Z-23, standalone calculator value.
35. **BB-06** (mortgage stress test) — pairs with BB-01 in mortgage broker funnel.
36. **DD-01** (tiered advisor listings Free/Pro/Featured) — recurring revenue unlock, prerequisite for DD-02/03/04. Gated by V-NEW-03.
37. **AA-02 + AA-03** (programmatic `/grants/[industry]` + `/grants/[state]/[program]`) — kills the Phase 0 dead-loop fix properly.
38. **Z-26** (`/super` proper hub, not just `/super/smsf`) — massive search volume "best super fund".
39. **Z-25** (`/insurance` hub) — affiliate $100-400/policy, ASIC RG 244 compliance.
40. **AA-04 + BB-09 co-shipped** (ETF data feed → ticker pages + screener) — shared data feed is the heavy part.
41. **CC-01** (AI document upload + extract pipeline foundation) — gated by V-NEW-02 (factual-filter enforcement). Security-reviewed before merge.
42. **CC-02 + CC-03 + CC-04 co-shipped** (super/tax/grants analyzers built on CC-01).
43. **AA-07** (`/just-[event]` moment-of-money pages) — depends on Z-22/Z-23/Z-24 hubs partially built.
44. **Z-24** (`/inheritance` hub) — adds estate-planning lawyer advisor type.
45. **BB-02 + BB-03 co-shipped** (salary-sacrifice optimiser + CGT calc).
46. **AA-06** (`/investing-for-[occupation]` pages — 30+ slugs).
47. **DD-02** (verified-by-invest.com.au badge — AFSL/ACL/ASIC + ID verification).
48. **DD-03** (booking + payment rail — Stripe Connect 15% take).
49. **Z-27** (`/tax-return` hub — June-October seasonal, accountant lead generator).
50. **CC-05 + CC-06** (portfolio review AI + advisor pre-chat bot).
51. **EE-01** (embeddable rate tables widget — every embed = backlink).
52. **DD-04** (real-time advisor bidding auction model) — ship after DD-01/02/03 stable.
53. **AA-05** (`/[suburb]/property-investing` pages) — pause if data licensing can't be resolved.
54. **BB-04** (net-worth tracker with bank linking) — biggest build, security-reviewed before merge.
55. **BB-05** (subscription audit tool) — v1 manual; v2 needs BB-04.
56. **BB-10** (LIC screener) — same data feed as AA-04/BB-09.
57. **EE-03** (WhatsApp/Telegram alerts bot).
58. **EE-02** (Chrome extension — separate repo, security-reviewed).
59. **CC-07** (SoA/RoA generator B2B SaaS for advisors) — legal-reviewed, post-Step 9 AFSL spend in roadmap.
60. **EE-04** (API marketplace B2B) — speculative; depends on all other streams stable.

### Review flags (2026-04-27 expansion)

Items requiring **security review** before merge: **BB-04** (bank-data via Basiq/Frollo + CDR + AU privacy CPS230), **CC-01** (document upload + Anthropic API + RLS storage bucket + prompt injection resistance + cost cap), **EE-02** (Chrome extension — broad browser scope, content-script injection on third-party sites).

Items requiring **legal review** before launch: **CC-07** (SoA/RoA generator — AFSL/ACL territory, ASIC RG 90 + RG 175 conformance, advisor disclaimer + audit trail). Explicitly waits until post-Step 9 AFSL spend in roadmap.

### Co-shipped pairings (2026-04-27 expansion)

Pairs/triplets that must ship together to compound their leverage:

- **Z-23 + BB-08** — `/first-home-buyer` hub + FHSS calc (priority slot 32)
- **Z-22 + BB-07** — `/redundancy` hub + ETP calc (priority slot 33)
- **AA-04 + BB-09** — ETF ticker pages + screener (shared ASX data feed; slot 40)
- **CC-02 + CC-03 + CC-04** — super/tax/grants analyzers (all built on CC-01; slot 42)
- **BB-02 + BB-03** — salary-sacrifice optimiser + CGT calc (both `<CalculatorShell>`-based, similar test scaffolding; slot 45)

**2026-04-27 hub-revenue extension (founder brief: "make every hub leverage every monetisation opportunity, deep-dive then execute").** Four streams added (W/X/Y/Z) for hub foundation + registry-driven nav + Tier-1 hub builds. Strategic doc: `docs/audits/HUB_BLUEPRINT.md`. Streams added to priority order below; founder may hand-edit to slot above quality streams if velocity outweighs polish.

24. **W (hub foundation)** — extract `<HubHero>`, `<HubServiceGrid>`, `<HubArticleStrip>`, `<HubDeepDiveGrid>`, `<HubAdvisorCTA>`, `<HubFAQ>`, `<DirectoryGrid>` family, `<CalculatorShell>`, `<EligibilityQuiz>`, `<CrossHubLinks>`, `<HubPage>` HOC. Migrate `/smsf` and `/grants` first (proof). Without this layer every new hub re-implements layout — biggest velocity multiplier in the roadmap. Items W-01..W-15.
25. **X (admin backlog)** — clear `createAdminClient` from the 17 public RSC pages identified during the foundation audit; ratchet `eslint.config.mjs` rule from `warn` to `error`. Extension of stream C. Items X-01..X-09.
26. **Y (registry + nav + dated-stats)** — registry-driven `<MegaMenu>` replacing the 666-line hardcoded `Header.tsx`, auto-sitemap, breadcrumbs from registry, `<DatedStatBadge>` + cron stale-check + CI lint that fails build on unwrapped dated claims. Items Y-01..Y-08. Depends on W landing.
27. **Z (Tier-1 hub builds)** — `/private-markets`, `/startup` (absorbs `/grants`), `/wholesale`. Each hub: HubConfig row + sub-pages + directory + calculator + quiz + lead magnet + article seeds + smoke E2E. Items Z-01..Z-21. Depends on Y landing. Tier-2/3 hubs (`/retirement`, `/aged-care`, `/angel`, `/business-for-sale`, `/crypto-exchange`, `/crypto-tax`, `/family-office`, `/find-accountant`, `/find-mortgage-broker`) queued as new streams after Z lands.

`needs-user` items in any stream surface to Blocked when picked. The loop notes the question and continues to the next non-blocked item.

## Enterprise standard enforcement

The loop reads `docs/audits/ENTERPRISE_STANDARD.md` on every iteration alongside this file and `HUB_BLUEPRINT.md`. ENTERPRISE_STANDARD.md defines per-surface rubrics (database, webhook, AI, lead form, page, calculator). The loop enforces them at two checkpoints:

1. **Pre-flight (per-surface, on the surface as a whole).** Before picking an item that touches a surface, the loop checks whether the surface's rubric is currently met across the surface. If not — e.g. the AI rubric requires a factual filter and the filter doesn't exist yet — the loop queues a **surface-hardening sub-item** before the feature item. The feature item depends on the hardening item; the hardening item ships first (or in the same PR). The loop never ships a feature on a surface whose rubric is unmet on the surface as a whole.

2. **Per-item (on this PR).** Within the chosen item's PR, every rubric line for every surface the PR touches must hold. Items that touch a surface but don't meet the surface's rubric must be split:

   - **Hardening item** — the missing rubric pieces (RLS isolation test, prompt-injection fixtures, idempotency replay, calculator reference test, `<DatedStatBadge>` wrapping, etc.).
   - **Feature item** — the original feature, with `depends-on` referencing the hardening item.

   Hardening item ships first or in the same PR. The feature item never lands without its hardening sibling.

**Defer-into-same-PR exception.** Mechanical rubric items (adding `revalidate`, adding `breadcrumbJsonLd`, wrapping a stat in `<DatedStatBadge>`) can land as a follow-up commit in the same PR rather than a separate item. Blocking rubric items — RLS isolation test, prompt-injection fixtures, idempotency replay harness, calculator regulator-reference tests — must ship in the same PR (and ideally as the first commit, with the feature commits depending on the test scaffolding).

**Why this exists.** Items that touch a surface but skip its rubric ship at ~70-75% of standard. Quality plateaus there because the loop's energy goes to visible work; rubric items become "we'll add tests later" and later is rare. With pre-flight + per-item enforcement, items ship at ~88-92% of standard. The loop is slightly slower per iteration but the total work to reach 88% is less than the work to reach 75%-then-retroactively-fix-everything. Net Week 12 trajectory: 88% with this enforcement, 82% without.

## Concurrency + locking

- Only one iteration may touch one branch at a time. Lock file: `.git/audit-remediation.lock` containing the iteration's start ISO timestamp. Stale locks (> 90 minutes old) are removed by the next iteration.
- Iterations must complete on a single branch — never cross-commit between streams in one iteration.

## Stop conditions

- **Hard stop:** queue's `In flight` and `Blocked` sections are empty AND `Done` covers all original items. Iteration prints `STATUS: COMPLETE` and exits.
- **Stream stuck:** if the same stream fails 3 iterations in a row (CI red after fix attempt), the stream is moved to Blocked with the failure log and the loop continues on other streams.
- **Manual halt:** if the user pauses the loop, no cleanup is required — every iteration is a complete unit.

## Auto-merge policy

The repo has a selective auto-merge system (`.github/workflows/auto-merge*.yml`) that lets routine PRs from this loop merge themselves on green CI after a 60-minute quiet window. The labeling workflow inspects every PR's changed paths and applies one of:

- `auto-merge-safe` — eligible for auto-merge after the quiet window
- `needs-human-review` — auto-merge blocked, founder must review and merge
- (no label) — sits waiting for a human to decide

**Items the loop should expect to auto-merge** (most stream Z hub content additions, AA programmatic SEO templates after the first one is human-reviewed, doc updates, article seeds): anything whose changed files all match `app/**/page.tsx`, `scripts/seed-*.ts`, `content/**/*.md`, `docs/**/*.md`, `lib/verticals.ts`, `public/**`, `components/Hub*.tsx`, or `__tests__/**/*.test.ts` (additions only — deletions force review).

**Items that always need a human:**

- Anything in stream **BB** — calculators with regulatory math (CGT, super, FHSS, ETP). Math errors are user-facing and load-bearing for compliance copy.
- Anything in stream **CC** — AI features (Anthropic API). Prompt-injection, hallucination cost, factual filter (V-NEW-02) — the founder vets the first of every AI feature and the system force-flags subsequent CC-* PRs anyway via the `ai-feature` pattern.
- Anything in stream **DD** — Stripe / marketplace mechanics. Payment flows are not auto-mergeable; idempotency replay (V-NEW-03) gates these.
- Anything touching the **V-NEW gates** (V-NEW-01..04). The gates themselves are the safety system, so the safety system reviews them.
- The **four queue review-flagged items**: BB-04 (bank-data integration), CC-01 (AI document upload), EE-02 (Chrome extension), CC-07 (SoA/RoA generator — legal review). Forced via item-ID in PR title.
- Anything touching `supabase/migrations/**`, `app/api/**`, `middleware.ts`, the Supabase client modules, `lib/compliance.ts`, `lib/auth/**`, `lib/stripe/**`, `.github/workflows/**`, build/lint/TS config, or any file matching `*rls*` / `*policy*` / `*.env*`.

**STOP comment escape hatch.** A countdown comment ("Auto-merging in 60min unless STOP") is posted on every eligible PR. Anyone with write access to the repo can post `STOP` (uppercase, word-bounded) at any point before the actual squash-merge fires — the schedule re-checks STOP on every poll, even after the countdown is already running. To re-arm a stopped PR, push a new commit (resets the quiet window).

**First-of-pattern rule.** The FIRST PR introducing each new component or template pattern is force-flagged `needs-human-review` even if its paths would otherwise be SAFE, so the founder sees the new pattern before the loop replicates it. Tracked patterns (state at `.github/auto-merge-state.json` on the bot branch `automerge-bot/state`):

- `hub-on-extracted-components` — first time a hub uses the `<HubPage>` HOC
- `programmatic-seo-template` — first AA-* template
- `calculator-on-shell` — first BB-* using `<CalculatorShell>`
- `ai-feature` — any CC-*
- `marketplace-mechanic` — any DD-*
- `distribution-embed` — any EE-*

Once a pattern is in the state file, subsequent PRs of that pattern flow through normal labeling. Detection is by item-ID prefix in the PR title (the loop already prefixes PRs with the item ID) and, for HOC-based patterns, by inspecting the PR diff for the relevant import.

**Disable instantly.** Delete `.github/workflows/auto-merge*.yml` to turn the system off — no data loss, every action so far is a normal squash merge in `git log`.

## Stuff the loop will never do (ask the user instead)

- Apply migrations to production (forward-only; user runs).
- Run E2E against Stripe sandbox (no keys in repo).
- Query the live DB for runtime data (row counts, last-read timestamps, partial-failure verification of §5.5).
- Hit PostHog API for "is this route actually called in prod?" data — needed to safely act on the 135 suspected-dead routes.
- Decide compliance copy beyond `lib/compliance.ts` SSOT.
- Merge any PR. (Exception: the auto-merge system squash-merges `auto-merge-safe`-labelled PRs after the 60-min quiet window — see "Auto-merge policy" above.)
