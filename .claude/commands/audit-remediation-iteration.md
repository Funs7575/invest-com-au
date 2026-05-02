---
description: Run one iteration of the audit-remediation loop (queue-driven; one mergeable chunk per run).
---

# /audit-remediation-iteration

Execute exactly one iteration of the audit-remediation loop. The loop is
queue-driven: this command reads `docs/audits/REMEDIATION_QUEUE.md`, picks the
top non-blocked item per `docs/audits/REMEDIATION_DEFAULTS.md` priority order,
does it, commits, pushes, updates the queue, and exits.

**This command is idempotent at the iteration level.** A fresh-context session
should be able to run it and produce coherent forward progress without prior
conversation state.

---

## Inputs

- `docs/audits/REMEDIATION_QUEUE.md` — work queue, status of each stream's PR.
- `docs/audits/REMEDIATION_DEFAULTS.md` — branching, priority order, verification gates, stop conditions.
- `docs/audits/codebase-health-2026-04-24.md` — original audit (PR #213).
- Open issues #214 #215 #216 #217 #218 — P0 trackers.
- `CLAUDE.md` — project conventions (Conventional Commits, RLS, admin.ts scope, `lib/logger`, etc.).
- `CONTRIBUTING.md` — PR conventions.

## Output of one iteration

Exactly one of:

1. **Forward progress:** one commit (or a small ordered series) on a stream branch, pushed, with the queue updated. Iteration prints `STATUS: PROGRESS · stream=<X> · item=<X-NN> · pr=#<NNN>`.
2. **CI rescue:** if any in-flight stream's last CI was red, this iteration is dedicated to fixing that stream's PR. Prints `STATUS: CI-RESCUE · stream=<X> · pr=#<NNN>`.
3. **Surfaced blocker:** an item turned out to need human input; queue's Blocked section gets a new entry; iteration commits no code. Prints `STATUS: BLOCKED · stream=<X> · item=<X-NN>`.
4. **Nothing to do:** queue's In flight + Pending sections are empty (or fully blocked). Prints `STATUS: COMPLETE` if everything is Done, else `STATUS: ALL-BLOCKED`.

---

## Per-iteration contract

Execute these phases in order. **By default, stop at the end of phase 7 — do not pick up a second item.**

**Batch mode (added 2026-04-28 after iter 82 — throughput optimisation).** When the invoker explicitly requests batched iterations (e.g. cloud routine prompt: "run up to 5 iterations in this fire"), instead of exiting after Phase 7, loop back to Phase 2 (CI rescue check) for up to N total items. Stop when total cumulative diff exceeds ~5000 LOC, or when any iteration returns `STATUS: LOCKED`, `STATUS: BLOCKED` (surface), `STATUS: ALL-BLOCKED`, or `STATUS: COMPLETE`. The lock is acquired once at the start and released once at the end of the batch (single trap covers the whole run). Per-fire setup cost (clone, install, sync) amortises across multiple items, giving ~2-3× throughput per cloud fire. Between iterations: `git fetch origin main && git pull --ff-only origin main` so the next item picks up the queue update from the previous one. Items in the same batch should still be from independent streams — batching does NOT relax the "never cross-commit between streams in one iteration" rule (each iteration in the batch is self-contained, just chained).

### Phase 0 — Lock

```bash
LOCK=.git/audit-remediation.lock
if [ -f "$LOCK" ]; then
  AGE_SECONDS=$(( $(date +%s) - $(stat -c %Y "$LOCK") ))
  if [ "$AGE_SECONDS" -lt 5400 ]; then
    echo "STATUS: LOCKED · another iteration is active (lock age ${AGE_SECONDS}s)"
    exit 0
  fi
fi
date -u +%FT%TZ > "$LOCK"
trap 'rm -f "$LOCK"' EXIT
```

### Phase 1 — Sync

```bash
git fetch origin main
git checkout main && git pull --ff-only origin main
```

Read `docs/audits/REMEDIATION_QUEUE.md` and `docs/audits/REMEDIATION_DEFAULTS.md` end-to-end. Do not skim — they encode all decisions.

### Phase 1.5 — Types-drift auto-regen (added 2026-04-26 after iter 22)

A live-DB schema change between iterations leaves `lib/database.types.ts` stale and turns the "Supabase types drift" CI check red on every PR (caused iter 20 + 21 CI rescues). Cheaper to regenerate proactively here than to rescue per stream.

```bash
# Regenerate via the Supabase MCP `generate_typescript_types`
# (cloud routines have it attached; local runs may not).
# Skip if the MCP isn't available — Phase 2 CI rescue still catches it later.
```

If `lib/database.types.ts` is stale relative to live, regenerate, commit `chore(db): regenerate database.types.ts (auto-rescue)` direct to main, push. This is a one-line idempotent fix that benefits ALL open PRs simultaneously. Skip and proceed if the regen produces an empty diff.

### Phase 2 — CI rescue check

For each stream in the queue's "In flight" table that has a PR number:

- `mcp__github__pull_request_read` with `method: get_status` (or equivalent) to fetch CI checks.
- If any check is `failure` or `cancelled`: this iteration is a CI rescue for that stream.
  - Switch to the stream branch (`git checkout <branch>`), pull latest.
  - Diagnose the failure. Fix it. Run `npm run type-check`, `npm test -- <changed>`, `npm run lint -- <changed>` until green locally.
  - Commit (Conventional Commit, scope = stream letter), push, update queue's "Last CI" cell to "fixing — see commit <sha>".
  - Print `STATUS: CI-RESCUE · stream=<X> · pr=#<NNN>` and exit.

If multiple streams have red CI, rescue the highest-priority one (per `REMEDIATION_DEFAULTS.md`).

### Phase 3 — Pick the next item

Walk `REMEDIATION_DEFAULTS.md`'s priority order. For each stream in order:

- **Skip items with status `blocked` or `false-positive`** — these are not picked up by the loop. Blocked items are the user's call; false-positives are already resolved.
- If the stream's queue section has a `pending` item, that's the candidate.
- If the candidate is the very first item of that stream and the stream has no branch yet:
  - Create branch from `main`: `git checkout -b claude/audit-remediation/<letter>-<slug>`.
  - Make an initial empty commit (`git commit --allow-empty -m "chore(<stream-letter>): scaffold remediation stream"`).
  - Push: `git push -u origin <branch>`.
  - Open a PR via `mcp__github__create_pull_request` with title `chore(<stream-letter>): <stream title> [audit remediation]` and body referencing the audit + tracking issue. Open it READY (not draft) — the `auto-merge-label.js` workflow applies `needs-human-review` automatically on touched paths, which is the actual safety gate; draft state on top of that is pure friction.
  - Update queue's In-flight table with branch + PR number.
- Otherwise checkout the existing stream branch and pull.

If no pending item exists in any stream, jump to Phase 7 with `STATUS: COMPLETE` (if all items are Done) or `STATUS: ALL-BLOCKED` (if some are Blocked).

### Phase 4 — Verify before acting

Apply the verification gate from `REMEDIATION_DEFAULTS.md` for the item's category:

- **Deletion:** grep for symbol AND `export.*from.*<filename>` re-exports. If any match, mark item as `false-positive` in the queue's "Resolved as false positives" table, log to iteration log, exit phase 7 with `STATUS: PROGRESS` (queue housekeeping is real progress).
- **Refactor (admin.ts → server.ts):** confirm route reads cookies / is in an authenticated layout. If not, surface to Blocked.
- **New migration:** plan must include:
  - Header comment block with: Date, Audit ref, Queue item, Why (in user terms), idempotency claim, Rollback (concrete SQL).
  - `BEGIN; ... COMMIT;` transaction wrapper.
  - `IF NOT EXISTS` on table creates / index creates.
  - For RLS-on-existing-table: `ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY` + `DROP POLICY IF EXISTS ... CREATE POLICY ...` for any policies (idempotent reruns).
  - **Prior policy discovery (mandatory before writing the policy):** run `grep -nE "(POLICY.*<table>|<table>.*POLICY|TABLE.*<table>.*ENABLE)" supabase/migrations/*.sql` and inspect every match. RLS policies stack additively, so any pre-existing `CREATE POLICY` on the table that isn't dropped by exact name in the new migration will survive and undermine the new policy's stated intent. For each prior `CREATE POLICY "<exact name>" ON <table>`, add a `DROP POLICY IF EXISTS "<exact name>" ON <table>;` line annotated with its source migration. If RLS was already enabled by an earlier migration, omit `DISABLE ROW LEVEL SECURITY` from the rollback header and document the prior-RLS state in an `IMPORTANT — prior policy state:` header block. (Lesson from iter 7: B-05 missed `"Anon can submit claims"` from `20260510_rls_hardening.sql`, so the migration's claimed deny-all-anon was not actually enforced; iter 8 corrected it.)
  - Service-role explicit allow policy when policy is otherwise deny-all (auditability — `pg_policies` shows intent).
  - `-- TODO: human review of policy semantics` comment when defaults §4 doesn't cleanly apply (e.g., no `auth.uid()` linkage, public-write paths, etc.).
- **New test:** plan must exercise the route handler's actual logic, not just import-and-truthy-assert.

If verification rules out the item, surface a Blocked entry with the question for the user; print `STATUS: BLOCKED` and exit.

### Phase 5 — Do the work

Execute the item. Hard limits:

- Diff cap: ≤ ~500 LOC excluding generated/data files. Larger work splits — break the queue item into sub-items in this iteration's update, do the first sub-item.
- One stream branch per iteration. Never touch another stream's files.

Local gates before commit. **Per the Hardware exception in `REMEDIATION_DEFAULTS.md`, whole-codebase `tsc` is skipped on this sandbox** — file-targeted only:

```bash
# Identify .ts/.tsx files changed in this iteration:
CHANGED_TS=$(git diff --name-only --diff-filter=ACMR | grep -E '\.(ts|tsx)$' || true)

# Type-check only the changed TS files (skip if none changed):
if [ -n "$CHANGED_TS" ]; then
  npx tsc --noEmit --noErrorTruncation $CHANGED_TS
fi

# Tests on changed test files only (vacuously passes if none):
CHANGED_TESTS=$(git diff --name-only --diff-filter=ACMR | grep -E '\.test\.(ts|tsx)$' || true)
if [ -n "$CHANGED_TESTS" ]; then
  npm test -- $CHANGED_TESTS
fi

# Lint on changed lintable files only:
CHANGED_LINT=$(git diff --name-only --diff-filter=ACMR | grep -E '\.(ts|tsx|js|jsx)$' || true)
if [ -n "$CHANGED_LINT" ]; then
  npm run lint -- $CHANGED_LINT
fi
```

CI on the stream PR is the authoritative gate (it runs the full `tsc`, full test suite, and full audits on adequate hardware). If CI is red on a previously pushed iteration, Phase 2's CI rescue handles it on the next iteration.

If anything in the local gates above is red:
1. Try to fix. ≤ 2 fix attempts.
2. If still red after 2 attempts, revert the iteration's working changes (`git checkout -- <files>`), surface to Blocked with the failure log, exit `STATUS: BLOCKED`.

Every 10th iteration (count = `git log --oneline --grep="audit remediation iteration" | wc -l`), additionally run `npm run build` **only if hardware permits** (skip on the constrained sandbox per Hardware exception; CI's build job is authoritative).

### Phase 6 — Commit + push + PR update

- Conventional Commits subject. Scope = stream letter. Body explains the why, references the queue item ID, references the audit section.
- **Commit body quality bar** — must include, in order:
  1. **Why** — one paragraph on the motivating problem (what was broken / risky, in user terms not just technical).
  2. **Verified callers / context** — for code changes touching shared types, the grep'd list of caller paths and which client/tier they use. For migrations, the call sites that exercise the affected table and whether they go through admin (service-role) or anon-key clients.
  3. **Idempotency / safety claim** — for migrations: "is no-op when re-applied because X." For code: "does not regress callers because Y."
  4. **Rollback location** — for migrations: "rollback header in the migration." For code: "revert this commit + restore via [path]."
- Trailer line: `Refs: #<tracking-issue>` (e.g., `Refs: #215` for stream B). Plus `Audit:` and `Queue:` lines pointing to the source.
- Do NOT include any AI-attribution trailer or "Co-authored-by" lines unless the project's existing `git log` already does so. Check first (this repo does not).
- `HUSKY=0 git push origin <branch>` — retry up to 4× with exponential backoff on network errors only (per repo's git ops policy). `HUSKY=0` is the bypass authorised by the Hardware exception in `REMEDIATION_DEFAULTS.md`; the loop should also be invoked with `HUSKY=0` in env so all child shells inherit it.
- Update PR body with the new progress checklist (mark item as done in PR body too) via `gh api -X PATCH repos/<owner>/<repo>/pulls/<N> --field body=@/path/to/body.md`. **Do not use `gh pr edit --body-file`** — it silently no-ops with a `projects-classic` GraphQL deprecation warning on this repo.

### Phase 6.5 — Discovery sweep (added 2026-04-28 after iter 87 founder feedback)

Before exiting, do a quick scan of the files touched in this iteration for adjacent issues that aren't already in the queue. The loop becomes a tiny audit on every iteration — discovery scales with queue-drain pace instead of waiting for a separate scout fire.

What to scan (only files touched in THIS iteration's diff or their immediate siblings — don't dive across the codebase):

- **For touched API route handlers (`app/api/**/route.ts`):** are there obvious missing tests for sibling routes in the same directory? If yes, append `D-DISC-NN` items.
- **For touched migrations (`supabase/migrations/*.sql`):** do any nearby tables in the same file lack `ENABLE ROW LEVEL SECURITY`, or have `CREATE TABLE` without policies? Append `B-DISC-NN` or `O-DISC-NN`.
- **For touched components (`components/**/*.tsx`, `app/**/page.tsx`):** are there dated strings without `<DatedStatBadge>` wrappers in adjacent components? Append `V-DISC-NN`.
- **For touched lib helpers (`lib/**/*.ts`):** does the changed module or an adjacent one have <60% test coverage? Append `R-DISC-NN`.
- **For touched workflow files (`.github/workflows/**`):** any other workflow files in the directory referencing deprecated actions or missing required gates? Append `I-DISC-NN`.

Hard rules for the discovery sweep:

- **Cap: 3 new items per iteration.** More than that, surface a single `SCOUT-BACKLOG` queue note instead and let the dedicated `/audit-remediation-scout` fire handle the bulk.
- **Don't open extra PRs.** The append goes only to `REMEDIATION_QUEUE.md` on main, alongside this iteration's existing Phase 7 queue update — same commit.
- **Skip duplicates.** Grep the queue for the file path or symbol before appending. A duplicate is worse than a miss.
- **Skip if confidence is low.** A finding only goes in the queue if you'd bet the founder would also flag it. Aspirational items are noise.
- **Use `<STREAM>-DISC-<YYYYMMDD>-NN` IDs.** Status `pending`. Notes column should reference the source iteration that surfaced it (`Surfaced by iter <N>`).
- **Skip the sweep entirely** if the iteration's STATUS is `BLOCKED`, `LOCKED`, `CI-RESCUE`, or `false-positive` — those iterations didn't ship work, so there's no diff to discover from.

The sweep is bounded — 1-3 minutes of scanning, no editing of source code, only queue appends.

### Phase 7 — Update queue + exit

**Queue updates land directly on `main`, not on the stream branch.** Queue is the source of truth that Phase 1 reads at the start of each iteration; future iterations see the wrong picture if updates sit on an unmerged stream branch. Switch to `main` before editing the queue.

If at the end of Phase 7 the iteration's status would be `STATUS: COMPLETE` (i.e., queue's In flight + Pending + Blocked sections are all empty AND all original items are in Done), additionally write a `LOOP_DONE` sentinel file at the repo root with a one-line summary, commit, and push. The cron schedule can then be disabled (manually or via a follow-up GitHub Action) to stop wasted fires.

```bash
if [ "$STATUS" = "COMPLETE" ]; then
  echo "Audit-remediation queue exhausted at $(date -u +%FT%TZ). Disable the cloud cron." > LOOP_DONE
  git add LOOP_DONE
  HUSKY=0 git commit -m "chore(audit): queue exhausted — LOOP_DONE sentinel"
  HUSKY=0 git push origin main
fi
```

If the iteration's status is `STATUS: ALL-BLOCKED` (everything is blocked but not done), DO NOT write `LOOP_DONE` — the loop should keep running cheap no-ops in case the founder unblocks an item.

```bash
git checkout main
git pull --ff-only origin main
# ...edit docs/audits/REMEDIATION_QUEUE.md...
git add docs/audits/REMEDIATION_QUEUE.md
HUSKY=0 git commit -m "chore(audit): queue update — iter <N>, <item-ID> <status>

Refs: #<tracking-issue>"
HUSKY=0 git push origin main
```

In `docs/audits/REMEDIATION_QUEUE.md`:

- Move completed item's row to the Done section, prepend a new line: `<ISO date> · <item-ID> · <one-line summary> · commit <sha> · pr #<NNN>`.
- If the iteration broke a queue item into sub-items, replace the original row with the sub-items (status: pending, except the one just done which goes to Done).
- For false-positives: change the row's status to `false-positive`, strike-through the summary, and add an entry to the "Resolved as false positives" table with the verification reasoning.
- For blocked items: change the row's status to `blocked`, and add a full entry to the "Blocked — needs human input" section with: what the iteration found, the decision matrix (2–4 concrete options with trade-offs), and a recommendation. **Never modify or remove existing Blocked entries** — only the user clears those.
- Update the In flight table for the touched stream (PR number, last CI = "pending — pushed at <time>").
- Append a single block to the Iteration log section (most recent at top): iteration number, stream, item, what was done / why blocked / why FP, status line.

Print:

```
STATUS: PROGRESS
Stream: <letter>
Item: <item-ID>
Branch: <branch>
PR: #<NNN>
Commit: <sha>
Diff: +<additions> -<deletions> across <N> files
Next item: <next-item-ID> (stream <letter>)
Remaining: <count> pending · <count> blocked · <count> done
```

Exit. The lock file is removed via the trap.

---

## Hard rules

- **Never** modify `docs/audits/codebase-health-2026-04-24.md` (audit is the immutable source).
- **Never** force-push or `reset --hard`.
- **Hooks:** generally don't skip. Exception: `HUSKY=0` is authorised on the constrained sandbox (see Hardware exception in `REMEDIATION_DEFAULTS.md`). CI on the stream PR remains the authoritative gate for everything the hook would have run.
- **Never** apply migrations to prod or run anything that touches the live DB.
- **Never** merge a PR directly. Merging is delegated to `.github/workflows/auto-merge.yml` (60-min quiet window + STOP escape hatch + label gates). Loop opens PRs READY; `auto-merge-label.js` decides `auto-merge-safe` vs `needs-human-review` by changed paths; user-driven label swap is what releases a PR for auto-merge.
- **Never** start work without first running phase 2 (CI rescue check). A red CI on an earlier stream blocks new work on that stream.
- **Never** commit a red iteration. Revert and surface.
- **Never** trust the audit's claims without the verification gate. The audit had at least one false positive (F-01).
- **Always** keep iterations self-contained — one stream, one item (or one rescue, or one Blocked surface, or one FP resolution).
- **Never** modify or remove an existing Blocked entry. Iterations may add to the Blocked section; only the user clears entries.
- **Never** spawn sub-agents to do the iteration's work — the previous failure mode was an agent that did the work but didn't push/PR/update queue, leaving a half-done stream branch and a stale lock. Run all phases in the iteration's own context so the lock + state are coherent.

## Useful one-liners (for diagnostic phases)

```bash
# Find tables in types.ts not in any migration:
node -e "const t=require('./lib/database.types').Database.public.Tables; console.log(Object.keys(t).join('\n'))" | sort > /tmp/types-tables.txt
grep -hE '^CREATE TABLE [a-zA-Z_.]+\b' supabase/migrations/*.sql | sed -E 's/.*CREATE TABLE (IF NOT EXISTS )?([a-zA-Z_.]+).*/\2/' | sort -u > /tmp/migration-tables.txt
comm -23 /tmp/types-tables.txt /tmp/migration-tables.txt

# Find migrations missing RLS enable:
grep -L "ENABLE ROW LEVEL SECURITY" supabase/migrations/*.sql

# Find admin.ts importers:
grep -rn "from ['\"]@/lib/supabase/admin['\"]" --include="*.ts" --include="*.tsx" .

# Find untested routes:
comm -23 \
  <(find app/api -name route.ts -o -name route.tsx | sort) \
  <(find __tests__ -name "*.test.ts" | xargs grep -lE "app/api" 2>/dev/null | sort)

# Find routes without Zod:
grep -L "from ['\"]zod['\"]" $(find app/api -name route.ts)
```

---

## When to STOP the loop entirely (`/loop` exits)

The loop runner should stop when this command prints `STATUS: COMPLETE`. If
the user wants the loop to also stop on `STATUS: ALL-BLOCKED`, configure the
loop wrapper accordingly — but typically `ALL-BLOCKED` should pause for human
input and resume after the queue is unblocked.
