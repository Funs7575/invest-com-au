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

## Priority order

When choosing the next item, walk in this order and pick the first non-blocked one. The loop interleaves 04-24 streams (A–I) with 04-26 streams (J–S) so that compliance/security/revenue gates land first, with cosmetic and architecture work later.

**2026-04-26 reorder note:** N (P0 UI/UX) moved up to step 3 (was step 7). Reasons: (a) founder explicitly asked for visible work after observing the first 22 iterations were all backend; (b) stream K is mid-flight on PR #222 with 7 commits, so finishing K then jumping to N gives one clean review-able PR followed by visible morning wins; (c) D/J/L items are largely test/integration work that can run while founder is awake to consult on edge cases.

1. **B (critical 2)** — `email_otps` and `leads` RLS — compliance gate. _(Done; B-06 in flight.)_
2. **K (P0 security)** — widget CORS, audit-log sweep, OTP rate-limit, CSP fallback removal — security gate.
3. **N (P0 UI/UX)** — homepage hero priority + blur, advisor-portal client-bundle split, a11y skip-link, hero LCP, mobile responsiveness.
4. **D (critical 9)** — lead-capture + Stripe + signout integration tests — revenue gate.
5. **J (P0/P1 Stripe webhook)** — handler-registry split + 9 missing event handlers + featured_plans cleanup — revenue gate.
6. **L (observability)** — n8n env-vars, SLO seed + alert sink, PostHog funnel completion, cron silence diagnosis.
7. **M (P0 SEO)** — article cover-image backfill, versus schema, advisor FinancialService, domain-migration prep.
8. **B (other)** — remaining RLS migrations (`listing_plans`, `quarterly_reports`).
9. **C** — `admin.ts` scope reset (mechanical refactors; surface ambiguous to Blocked).
10. **A** — drift backfill (4–5 tables per iteration).
11. **O (DB hardening)** — 56 RLS-no-policy triage, FK indexes, search_path safety.
12. **P (deps)** — Sentry v10, Stripe SDK v22.
13. **R (lib coverage)** — marketplace allocation + auto-bid + dispute-resolver tests (P0 lib coverage).
14. **E** — Zod rollout (top-20 first).
15. **Q (DR + SOC 2)** — runbooks, vendor DPAs, secret-rotation log, GDPR disclosure page.
16. **G** — migration hygiene.
17. **I** — guardrails (after A/B/C land so the rules don't break in-flight work).
18. **F** — hygiene cleanup.
19. **S (architecture artefacts)** — diagrams, OpenAPI, ADRs.
20. **H** — file splits (last 04-26-audit stream; needs tests in place to be safe). Note: H-01 (stripe webhook split) is subsumed by J-01; H-03 (advisor-portal split) is subsumed by N-03.
21. **U (pre-launch ops)** — status page, support inbox, email deliverability, LH-CI gate, axe-core gate, load-test, monitoring runbook, closed-beta plan, uptime monitor. Several items are `needs-user` — surface them early so the founder has time to act.
22. **V (polish + extras)** — Sentry release tracking, sourcemap verification, PostHog privacy, GDPR consent, ACL checklist, cookie domain pre-flight, 301 redirect map for legacy WordPress URLs, perf budgets, external a11y, pen-test prep.
23. **T (deferred deps)** — TypeScript 6 + ESLint 10 + Vitest 4. Run LAST because high blast radius — depends on stream D's restored test coverage being green to detect regression. If the upgrade fails, the loop reverts and surfaces to Blocked rather than landing a half-broken main.

`needs-user` items in any stream surface to Blocked when picked. The loop notes the question and continues to the next non-blocked item.

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
