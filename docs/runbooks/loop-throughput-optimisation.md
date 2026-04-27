# Loop throughput optimisation

How to multiply audit-remediation-loop throughput. Tactical changes you (the founder) make from a Claude Code session, plus the in-repo defaults that already ratchet capacity.

Authored 2026-04-27 in response to "anything else we can do to speed up all process more — like set up more overnight Claude Code CI loops in cloud".

Reference: `docs/audits/REMEDIATION_DEFAULTS.md` (priority + iteration discipline), `docs/audits/REMEDIATION_QUEUE.md` (the work to do).

---

## Current baseline

- Two parallel cloud routines via `/schedule`: `0 * * * *` + `30 * * * *` → effective 30-min cadence → ~16 iterations per 8h overnight.
- Per-iteration cap: ≤800 LOC (excluding generated files / pure data).
- Auto-merge (`auto-merge.yml`): every 15 min the workflow sweeps open PRs; merges any with `auto-merge-safe` label + green CI + non-draft + 60min quiet window. Branch must match `claude/audit-remediation/**` or `claude/audit-queue-**`.
- Auto-merge-main-into-streams (`audit-remediation-auto-merge-main.yml`): on push to main, merges main into every `claude/audit-remediation/*` branch so streams stay current without manual rebase.

So a typical loop iteration cycle is: pick item → 1 commit → push → CI (~5–8 min) → 60 min quiet window → auto-merge → next iteration on next cron fire.

## Eight throughput multipliers

Ranked by leverage. (1)–(4) are quickest wins. (5)–(8) are bigger lifts.

### 1. Quadruple the cron cadence (instant 2× throughput)

Add two more cloud schedules so fires happen every 15 min instead of 30:

```
/schedule add "15 * * * *" /audit-remediation-iteration
/schedule add "45 * * * *" /audit-remediation-iteration
```

Now four fires per hour. Race-safety is bounded by `git push` non-fast-forward rejection (per the cloud-schedule mode notes in DEFAULTS) — worst case ~5–10 % of fires are wasted on the same item. Net: ~3–3.5× existing throughput.

To inspect / remove later:

```
/schedule list
/schedule delete <id>
```

### 2. Multi-loop separation (content vs code vs queue housekeeping)

Spawn separate cloud schedules with different prompts so they pull from disjoint surface areas. No queue contention, real parallelism:

```
# Loop A — existing, all-stream code work
/schedule add "0,30 * * * *" /audit-remediation-iteration

# Loop B — content generation (Editorial agent #03)
# Drives the QA stream's 50 long-tail Q&A pages and AA-* programmatic
# templates. Pure-content; doesn't conflict with Loop A's code work.
/schedule add "10,40 * * * *" /editorial-iteration

# Loop C — queue housekeeping
# Triages new audit findings, marks false positives, syncs in-flight
# table. Cheap iterations, runs parallel without conflict.
/schedule add "20,50 * * * *" /queue-housekeeping
```

(Loops B + C require `/editorial-iteration` and `/queue-housekeeping` skills authored — currently only `/audit-remediation-iteration` exists. Author them as separate slash commands when ready.)

### 3. Use Haiku for cheap iterations

`/audit-remediation-iteration` defaults to Sonnet/Opus. For mechanical iterations (queue housekeeping, doc edits, runbook authoring, simple test additions, CI rescue commits) Haiku 4.5 is faster and ~10× cheaper per iteration. Same quality on those item types.

How to set per-schedule:

```
/schedule add "0 * * * *" /audit-remediation-iteration --model haiku
```

When to NOT use Haiku:
- Stream W (component extraction) — architectural, use Opus
- Stream AA (programmatic templates) — Opus
- Stream CC (AI features) — Opus
- Stream DD (marketplace mechanics) — Opus
- Stream Z (Tier-1 hub builds) — Sonnet (config-heavy but architectural)

When Haiku is fine:
- Stream B/O (RLS migrations) — mechanical SQL
- Stream D/R (test additions) — predictable boilerplate
- Stream G (migration hygiene) — header/rollback comments
- Stream Q/S (doc-only) — runbooks, ADRs, OpenAPI specs
- Queue housekeeping iterations — markdown edits

### 4. Pre-stage the three human-blocked items

The loop is currently sitting idle on three blockers. Knock these out in 30 min and ~5 stream items unblock immediately.

#### 4a. Apply `account_deletion_requests` table to live (3 min)

Per `REMEDIATION_QUEUE.md` "Blocked → A-MISSING-TABLE-1". Production `POST /api/account/delete` returns 500 on every call. Recommended fix is option 1: apply the `CREATE TABLE` block from `supabase/migrations/20260427_wave_security_observability.sql:175-209` against live via Supabase MCP.

```sql
-- Run via Supabase MCP `apply_migration` against project guggzyqceattncjwvgyc
-- Migration is idempotent (`IF NOT EXISTS`).

CREATE TABLE IF NOT EXISTS public.account_deletion_requests (
  -- … exact block from supabase/migrations/20260427_wave_security_observability.sql lines 175–209
);
ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;
-- … policies follow at lines 188–209.
```

Unblocks: K-07 confirmation-email path is live, K-07b day-25 reminder cron starts working.

#### 4b. Decide on B-06 `quarterly_reports` RLS (5 min)

Per "Blocked → B-06-QUARTERLY-REPORTS-1". Recommended option 1: refactor `app/admin/quarterly-reports/page.tsx` to call a new `/api/admin/quarterly-reports` route handler (admin client) instead of direct browser-DB access; add anon SELECT-published policy. Two iterations (route + migration), ~600 LOC.

Reply in this session with `B-06: option 1, go` (or option 2/3/4 per the queue's matrix) and the loop picks it up next iteration.

#### 4c. Create the `data-exports` Storage bucket in Supabase (2 min)

Per K-06b queue note: "PREREQUISITE: create private Storage bucket `data-exports`". Currently the data-export processor cron (K-06b) runs forward-compatibly but writes to a missing bucket. Create via Supabase Dashboard → Storage → new bucket `data-exports` (private).

### 5. Mark internal stream items as parallel-eligible

The loop's current behaviour: pick one non-blocked item from the highest-priority stream. Multiple cron fires can pick from different streams (parallel-eligible markings exist for W ↔ X) but inside a single stream they serialise.

Several streams have parallel-eligible items internally that aren't marked:

- **W-02..W-12 are independent.** Each extracts a different component (`<HubHero>` vs `<HubServiceGrid>` vs `<HubArticleStrip>` etc) into its own file. After W-01 (HubConfig schema) lands, all of W-02..W-12 can run in parallel. With 4 cron fires/hour, all of W could land in ~3 hours instead of ~6.
- **D-* route tests** — each test file is independent. Multiple fires can each add a different test file.
- **R-* lib tests** — same shape as D.
- **AA-* programmatic templates** — each is a different `app/[template]/[slug]/*` directory.
- **BB-* calculators** — each calculator is a different component file.
- **QA-* Q&A pages** — each is a different `app/q-and-a/[slug]/page.tsx`.

Action: edit each stream section in `REMEDIATION_QUEUE.md` to add a "**Parallel-eligible:** items M..N can run in any order after item L lands" note. Loop reads this on its next iteration and respects it.

This PR adds the W-stream marking. Other streams to follow as the loop reaches them.

### 6. Stream pairs that can run concurrently across cron fires

Disjoint file-scope pairs the loop can interleave without merge conflict:

| Pair | Why disjoint |
|---|---|
| W ↔ X | W extracts to `components/Hub*`, X swaps imports in `app/**/page.tsx` (already marked) |
| W ↔ E | E adds Zod to `app/api/**/*.ts`, no overlap with `components/` |
| W ↔ D | D adds `__tests__/api/*.test.ts`, no overlap |
| W ↔ R | R adds `__tests__/lib/*.test.ts`, no overlap |
| W ↔ J | J touches `app/api/stripe/webhook/*`, no overlap |
| W ↔ L | L touches Sentry/n8n config + `lib/logger.ts`, no overlap |
| Y ↔ X | Y rewrites `components/Header.tsx` + `app/sitemap.ts`; X swaps imports in `app/**/page.tsx` (different files) |
| Y ↔ E | E adds Zod to API routes; Y is registry/nav |
| D ↔ R | D = api tests, R = lib tests, different `__tests__/` subdirs |
| D ↔ L | D = tests, L = config |
| BB ↔ AA | Both new, different directories (`components/*Calculator.tsx` vs `app/find/...`) |
| BB ↔ CC | Different file scopes (calculators vs `app/api/ai/*`) |
| QA ↔ AA | Different new directories (`app/q-and-a/` vs `app/find/`) |
| QA ↔ Z | Different new directories (`app/q-and-a/` vs `app/[hub]/`) |
| EM ↔ everything-code | EM is email infra (drip sequences in `lib/email/`, lead-magnet PDFs in `public/`), no code-side conflict |
| CL ↔ everything-else | Anonymity is `app/about/`, `app/team/`, social config; no overlap with code work |
| DV ↔ everything-else | Document vault is `app/dashboard/vault/` + `lib/storage/`, no overlap |

NOT parallel-eligible (same-file conflict risk):

- A ↔ B ↔ O — all DB migrations, sequence them.
- C ↔ X — both refactor `createAdminClient` callers in `app/**/page.tsx`.
- F ↔ everything — hygiene cleanup touches all over.
- I ↔ everything — ESLint guardrails change rules that other streams race against.

### 7. CI sharding (deferred — high effort, separate PR)

Test job at `.github/workflows/ci.yml:47` runs `npm run test:coverage` on a single runner. Vitest supports `--shard 1/4` style parallelism. Two-step rollout:

1. Add a matrix strategy to the test job (`shard: [1/4, 2/4, 3/4, 4/4]`).
2. Update `package.json` test:coverage script to accept `--shard` from CI env.
3. Merge coverage reports across shards (Vitest has `coverage.reportsDirectory` per shard + a combine step).

Estimated: ~2–4 hours of CI engineering. Worth doing once W stream lands enough new tests that wall-clock CI exceeds ~10 min.

### 8. Don't auto-merge non-conformant branches

The auto-merge gate requires head branch to match `claude/audit-remediation/**` or `claude/audit-queue-**`. Branches like `claude/review-*-features-*` or `claude/codebase-health-*` do NOT auto-merge — they need manual merge.

If you want a non-loop branch to auto-merge (e.g. PR #261, the priority reorder), either:
- Rename the branch to match the pattern (heavy — requires opening a new PR)
- Add the branch pattern to the gate in `.github/workflows/scripts/auto-merge.js`
- Just merge it manually (cheapest)

Recommended: leave the gate strict. Founder-review branches should stay manual-merge as a brake.

---

## Recommended action sequence (next 60 min)

1. **Run** the two `/schedule add` commands in §1 to quadruple cadence.
2. **Apply** the `account_deletion_requests` table (§4a, 3 min) — biggest single unblock.
3. **Decide** on B-06 option (§4b) — comment in this session.
4. **Create** the `data-exports` Storage bucket (§4c, 2 min).
5. (Optional) **Add** Haiku model flag to one of the four cron schedules per §3 — pick the schedule that historically picks lots of B/D/R/Q items.

After (1)–(4), the loop has 4 fires/hour against an unblocked queue. Overnight throughput should ≥3× from baseline.

## Monitoring

- `/schedule list` — see active routines.
- `git log --oneline origin/main | grep "iter " | head -30` — fired iterations on main in chronological order.
- `gh pr list --state open --label auto-merge-safe` — what's queued for auto-merge.
- `docs/audits/REMEDIATION_QUEUE.md` "Blocked → needs human input" section — what's stuck.
- `docs/audits/QUALITY_DASHBOARD.md` — automated rollup if maintained.

If iteration count slows or many fires return early with `STATUS: ALL-BLOCKED`, the queue is starved — re-check blockers, or add new audit findings via `/audit-remediation-iteration` queue-extension mode.

## Stop conditions

When the queue reaches `STATUS: COMPLETE`, every iteration writes `LOOP_DONE` sentinel file and exits cheaply. Cancel the cron via `/schedule list` + `/schedule delete <id>` to stop wasted fires. Re-arm later by deleting `LOOP_DONE` and re-enabling the schedule.

If a stream fails 3 iterations in a row (CI red after fix attempts), the loop moves it to Blocked and continues elsewhere — see DEFAULTS "Stop conditions".
