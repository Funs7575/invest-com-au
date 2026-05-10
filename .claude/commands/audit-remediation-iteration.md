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

### Phase 0.5 — Pause sentinel check (added 2026-05-02)

Before any work, check for a `LOOP_PAUSE` file at the repo root. If it exists, the founder (or an automated alert) has explicitly paused the loop — exit immediately without doing any work. The file's contents document the reason and what to do to resume.

```bash
git fetch origin main 2>/dev/null || true
git checkout main 2>/dev/null && git pull --ff-only origin main 2>/dev/null || true

if [ -f "LOOP_PAUSE" ]; then
  echo "STATUS: PAUSED · LOOP_PAUSE sentinel present"
  echo "---"
  cat LOOP_PAUSE
  echo "---"
  echo "Resume by deleting LOOP_PAUSE and committing."
  exit 0
fi
```

**Why a file, not an env var:** the loop fires from cloud routines that have no shared state with the founder's terminal. A file in the repo is the only signal the loop reliably reads from main. It's also git-versioned, so the pause + reason + the resume commit are all in `git log` — full audit trail.

**When it gets created:** typically by the founder responding to a `[ACTION REQUIRED]` GitHub issue from `loop-spend-tracker.yml` or from a stuck-detection surface. The issue body's checklist tells them exactly what to write.

**When it gets removed:** by the founder deleting it after the underlying issue is resolved. The loop's next fire after the file is gone resumes normal operation.

### Phase 1 — Sync

```bash
git fetch origin main
git checkout main && git pull --ff-only origin main
```

Read `docs/audits/REMEDIATION_QUEUE.md` and `docs/audits/REMEDIATION_DEFAULTS.md` end-to-end. Do not skim — they encode all decisions.

### Phase 1.5 — Types-drift auto-regen (added 2026-04-26 after iter 22; conditional 2026-05-02)

A live-DB schema change between iterations leaves `lib/database.types.ts` stale and turns the "Supabase types drift" CI check red on every PR (caused iter 20 + 21 CI rescues). Cheaper to regenerate proactively here than to rescue per stream — but only when there's reason to believe drift exists.

**Precondition gate (added 2026-05-02 — token-cost optimisation).** Phase 1.5 was firing on every iteration regardless of whether any schema change had occurred, paying the MCP round-trip and a queue-update commit even when the result was an empty diff. Skip Phase 1.5 entirely unless ONE of these is true:

```bash
# 1. A migration was added to main in the last 24 hours
recent_migration_commit=$(git log --since="24 hours ago" --name-only --pretty=format: -- supabase/migrations/ | grep -c '\.sql$' || echo 0)

# 2. Any in-flight PR currently fails the "Supabase types drift" check
inflight_drift_failing=$(gh pr list --state open --json number,statusCheckRollup \
  --jq '[.[] | select(.statusCheckRollup[]? | select(.name == "Supabase types drift" and .conclusion == "FAILURE"))] | length')
```

If both gates are 0, skip Phase 1.5 and jump to Phase 1.7. The savings: the median fire no longer pays the MCP regen + main-push tax. When schema *does* change, Phase 1.5 fires as before.

```bash
# Regenerate via the Supabase MCP `generate_typescript_types`
# (cloud routines have it attached; local runs may not).
# Skip if the MCP isn't available — Phase 2 CI rescue still catches it later.
```

If `lib/database.types.ts` is stale relative to live, regenerate, commit `chore(db): regenerate database.types.ts (auto-rescue)` direct to main, push. This is a one-line idempotent fix that benefits ALL open PRs simultaneously. Skip and proceed if the regen produces an empty diff.

### Phase 1.7 — Main-CI preflight (added 2026-05-02 after the listings/types/admin-mock fire)

Before opening any new stream PRs, check whether **main itself** is currently green. If main's last CI is failing, every PR opened against it inherits the failure — wasting iterations on bogus "CI-rescue" cycles and triggering spurious auto-revert PRs against unrelated commits. Lesson from 2026-05-01: the loop did 8+ "CI-rescue iter N" docs commits chasing a failure on main that none of the in-flight PRs caused.

```bash
# Latest main CI run
main_ci_conclusion=$(gh run list --branch main --workflow CI --limit 1 \
  --json conclusion,status \
  --jq '.[0] | .conclusion // .status // "missing"')
```

Decision tree:

- **`success`, `pending`, or `in_progress`** → main is healthy or being verified. Proceed to Phase 2.
- **`failure`** → main is broken. **Do not open or update stream PRs this iteration.** Instead:
  1. Fetch the failing job log: `gh run view --job <id> --log-failed`. Extract the failing test files / build step.
  2. Switch to a fresh branch: `git checkout -b fix/main-rescue-<short-summary>`.
  3. Reproduce the failure locally: `npx vitest run <failing-test-files>` or `npx tsc --noEmit` for type errors. **Don't proceed without a local repro.** A test that fails on CI but passes locally is environment-specific and needs a different fix path — surface to Blocked.
  4. Patch the root cause (typical patterns observed: missing `vi.mock("@/lib/supabase/admin", …)` after a route was refactored to use the admin client; `lib/database.types.ts` drifted from migrations; stale advisor-auth mocks).
  5. Verify locally green, commit (`fix(test+types): unblock main CI — <one-line summary>`), push, open PR with title `fix: unblock main CI — <summary>`.
  6. Update the queue's "In flight" section with a `MAIN-RESCUE` row pointing to the new PR.
  7. Print `STATUS: MAIN-RESCUE · pr=#<NNN>` and exit.
- **`cancelled`** → likely concurrency cancellation from rapid-fire main commits, not a real failure. Look at the second-most-recent run (`--limit 2` and pick the older one). Treat that as the verdict.
- **`missing`** → no CI run found yet (e.g., main was just pushed and CI hasn't started). Wait the loop's normal cadence and re-check on the next iteration; proceed cautiously to Phase 2.

**Why this is Phase 1.7, not part of Phase 2:** Phase 2 rescues *stream PR* failures by editing the stream branch. Phase 1.7 rescues *main itself*, which is a different code path (different branch, different PR). Mixing them breaks the "one stream per iteration" invariant.

**Time budget:** if the rescue isn't tractable in ~30 minutes of investigation, surface to Blocked with the failure log and exit `STATUS: BLOCKED`. The cloud loop's per-fire budget is bounded; main-rescue work that needs deep human investigation belongs to a human session.

### Phase 2 — CI rescue check

For each stream in the queue's "In flight" table that has a PR number:

- `mcp__github__pull_request_read` with `method: get_status` (or equivalent) to fetch CI checks.
- If any check is `failure` or `cancelled`: this iteration is a CI rescue for that stream.
  - **Stuck-detection guard (added 2026-05-02 after the LH-CWV gate fiasco — iters 176–192).** Before initiating rescue, grep the queue's iteration log for prior `STATUS: CI-RESCUE` entries on the same `<PR-N>` + same failing check name. If 3+ such entries exist within the last 24 hours, the rescue cycle is non-productive runner noise that the loop cannot fix by retrying. Surface to Blocked instead:
    - Add an entry to the queue's "Blocked — needs human input" section titled `<check-name> persistent failure on PR #<N>` with: failing check name, attempt count, last 3 commit SHAs from the rescue series, and a recommendation matrix — (a) fix the gate config structurally (e.g., raise thresholds, change runner class, switch to `continue-on-error`), (b) admin-merge if the human verifies the failure is known runner noise, or (c) rebase + retry if main has moved substantially.
    - Print `STATUS: BLOCKED · stream=<X> · item=<persistent-CI-failure>` and exit. Do NOT add a new rescue commit. Do NOT update "Last CI" — leave the existing red signal visible.
  - **Same-gate cluster guard.** If the same check name (e.g., `Lighthouse — Core Web Vitals gate`) is currently failing on ≥3 in-flight PRs simultaneously, the failure is systemic, not per-PR. Surface ONE consolidated Blocked entry titled `<check-name> systemic failure (N in-flight PRs affected)` with the list of affected PRs and the recommendation matrix above. Print `STATUS: BLOCKED · systemic=<check-name>` and exit. The next iteration will see the Blocked entry and skip those streams until the human resolves it.
  - Otherwise (rescue is fresh, < 3 attempts, < 3 in-flight on same gate): proceed with rescue.
    - Switch to the stream branch (`git checkout <branch>`), pull latest.
    - Diagnose the failure. Fix it. Run `npm run type-check`, `npm test -- <changed>`, `npm run lint -- <changed>` until green locally.
    - Commit (Conventional Commit, scope = stream letter), push, update queue's "Last CI" cell to "fixing — see commit <sha>".
    - Print `STATUS: CI-RESCUE · stream=<X> · pr=#<NNN>` and exit.

If multiple streams have red CI (and the stuck-detection guards above don't fire), rescue the highest-priority one (per `REMEDIATION_DEFAULTS.md`).

### Phase 3 — Pick the next item

**Selection overrides first** (added 2026-05-09 — see "Selection overrides" section in `REMEDIATION_DEFAULTS.md`). Run these checks in order BEFORE walking the linear priority list. Each override skips the linear walk if it picks a candidate.

1. **Tier-0 anonymity preempt.** If any `CL-01..CL-09` item is `pending` and not `blocked`, pick it. Print `STATUS: PROGRESS · override=tier-0` in the iteration log.
2. **Tier-1 critical-path preempt.** If `LL-01` (logged-in user profile + dashboard) is `pending` and not `blocked`, pick it. Print `STATUS: PROGRESS · override=tier-1-critical-path`. Reason: it unblocks 15+ downstream items (LL-02, LX-02/04, GT-01/02, DF-01..04, AT-01..04, CD-01, DV-01) per DEFAULTS.md Tier-1 section.
3. **Unblock-driven tiebreaker.** When the linear walk produces multiple candidates at the same effective priority (e.g. two streams have unblocked items at slot N), prefer the candidate whose stream-letter has the most `depends-on:<stream>` references in `REMEDIATION_QUEUE.md`. Estimate via `grep -c "depends-on:<X>" docs/audits/REMEDIATION_QUEUE.md` for each candidate stream. Print `STATUS: PROGRESS · override=unblock-driven-tiebreaker` when this fires.
4. **Otherwise:** walk the linear priority list as before.

The override-vs-linear ratio is visible by grepping the iteration log for `override=`. If overrides never fire over a 50-iteration window, either the Tier-0/1 work is genuinely complete (good) or the loop is not reading DEFAULTS.md properly (regression — surface to founder).

Then, walk `REMEDIATION_DEFAULTS.md`'s priority order. For each stream in order:

- **Skip items with status `blocked` or `false-positive`** — these are not picked up by the loop. Blocked items are the user's call; false-positives are already resolved.
- If the stream's queue section has a `pending` item, that's the candidate.
- If the candidate is the very first item of that stream and the stream has no branch yet:
  - **PRECONDITION — duplicate-PR guard (added 2026-05-10 after the X-09 / PP-01 / KK-01 duplicate-PR cleanup).** Before creating the branch, search for an open PR already covering this stream item:

    ```bash
    DUP=$(gh pr list --state open --search "<X-NN> in:title" --json number,title,headRefName \
            --jq '.[] | select(.title | test("\\b<X-NN>\\b"))' )
    if [ -n "$DUP" ]; then
      echo "STATUS: DUPLICATE · open PR already covers <X-NN>:"
      echo "$DUP" | jq .
      # Mark the queue item as `in_flight` referencing the existing PR (don't open a parallel one).
      # If the existing PR is stale (>7 days old, no recent push), prefer to rebase its branch
      # rather than open a duplicate. Surface to founder if the existing PR's approach diverges.
      exit 0
    fi
    ```

    Why: 2026-05-10 cleanup closed three duplicate-PR pairs (#648 vs #702 ratcheting X-09, #649 vs #706 shipping PP-01, #667 superseded by #703's KK-01 bundle). Each pair burned ~160k tokens on the loser. The dedup guard catches the second-comer before any code is written.
  - Create branch from `main`: `git checkout -b claude/audit-remediation/<letter>-<slug>`.
  - Make an initial empty commit (`git commit --allow-empty -m "chore(<stream-letter>): scaffold remediation stream"`).
  - Push: `git push -u origin <branch>`.
  - Open a PR via `mcp__github__create_pull_request` with title `chore(<stream-letter>): <stream title> [audit remediation]` and body referencing the audit + tracking issue. The body MUST include a `## Supersedes` section (e.g. `## Supersedes\n\n_None._` or a list of `#NNN` it replaces) — the `auto-close-superseded.yml` workflow reads this on merge and closes named PRs automatically. Open it READY (not draft) — the `auto-merge-label.js` workflow applies `needs-human-review` automatically on touched paths, which is the actual safety gate; draft state on top of that is pure friction.
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

# Snapshot the queue file size BEFORE editing — used by the truncation
# guard below. Added 2026-05-09 after the queue file was truncated twice
# in 24h via partial MCP push (recovered as PRs #660→#661 and earlier).
QUEUE_FILE=docs/audits/REMEDIATION_QUEUE.md
PRE_EDIT_LINES=$(wc -l < "$QUEUE_FILE")

# ...edit docs/audits/REMEDIATION_QUEUE.md...

# TRUNCATION GUARD — refuse to push if the queue shrank by more than 10%.
# Iteration edits append a Done-row + iteration-log entry; a healthy edit
# grows the file, never shrinks it noticeably. A >10% drop almost always
# means a partial write (MCP push lost lines, Read returned a truncated
# view, etc.) — pushing that overwrites real queue state with garbage.
POST_EDIT_LINES=$(wc -l < "$QUEUE_FILE")
SHRINK_PCT=$(awk -v p="$PRE_EDIT_LINES" -v q="$POST_EDIT_LINES" \
  'BEGIN { if (p == 0) print 0; else printf "%d", ((p - q) * 100) / p }')
if [ "$SHRINK_PCT" -gt 10 ]; then
  echo "STATUS: BLOCKED · queue-truncation-guard"
  echo "Pre-edit lines:  $PRE_EDIT_LINES"
  echo "Post-edit lines: $POST_EDIT_LINES (dropped ${SHRINK_PCT}%)"
  echo "Refusing to push. Run \`git checkout -- $QUEUE_FILE\` to discard,"
  echo "investigate the truncation, then retry the queue edit."
  git checkout -- "$QUEUE_FILE"
  exit 1
fi

git add "$QUEUE_FILE"
HUSKY=0 git commit -m "chore(audit): queue update — iter <N>, <item-ID> <status>

Refs: #<tracking-issue>"
HUSKY=0 git push origin main
```

**Why the guard exists.** The queue file grew to 4,282 lines before the
2026-05-09 compaction. At that size, partial reads (MCP read-tool default
limit, network truncation) and partial writes (concurrent push race
losing the tail) were repeatedly producing post-edit files smaller than
the pre-edit file. The guard catches that class of failure before it
hits main. Real iteration edits add ~5–15 lines (Done-row + iter-log
entry); the 10% threshold is comfortably above noise.

**False positives.** The guard fires legitimately if the iteration's
work is "compact a Done section into the archive" — that's the only
real shrink case. In that scenario, the iteration should bypass the
guard explicitly by setting `BYPASS_TRUNCATION_GUARD=1` in env and
documenting the pre- and post-line counts in the commit body.

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
