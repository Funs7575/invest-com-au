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

Execute these phases in order. **Stop at the end of phase 7 — do not pick up a second item.**

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

- If the stream's queue section has a `pending` item, that's the candidate.
- If the candidate is the very first item of that stream and the stream has no branch yet:
  - Create branch from `main`: `git checkout -b claude/audit-remediation/<letter>-<slug>`.
  - Make an initial empty commit (`git commit --allow-empty -m "chore(<stream-letter>): scaffold remediation stream"`).
  - Push: `git push -u origin <branch>`.
  - Open a draft PR via `mcp__github__create_pull_request` with title `chore(<stream-letter>): <stream title> [audit remediation]` and body referencing the audit + tracking issue.
  - Update queue's In-flight table with branch + PR number.
- Otherwise checkout the existing stream branch and pull.

If no pending item exists in any stream, jump to Phase 7 with `STATUS: COMPLETE` (if all items are Done) or `STATUS: ALL-BLOCKED` (if some are Blocked).

### Phase 4 — Verify before acting

Apply the verification gate from `REMEDIATION_DEFAULTS.md` for the item's category:

- **Deletion:** grep for symbol AND `export.*from.*<filename>` re-exports. If any match, mark item as `false-positive` in the queue's "Resolved as false positives" table, log to iteration log, exit phase 7 with `STATUS: PROGRESS` (queue housekeeping is real progress).
- **Refactor (admin.ts → server.ts):** confirm route reads cookies / is in an authenticated layout. If not, surface to Blocked.
- **New migration:** plan must include `IF NOT EXISTS`, rollback header, and `ENABLE ROW LEVEL SECURITY` if creating a table.
- **New test:** plan must exercise the route handler's actual logic, not just import-and-truthy-assert.

If verification rules out the item, surface a Blocked entry with the question for the user; print `STATUS: BLOCKED` and exit.

### Phase 5 — Do the work

Execute the item. Hard limits:

- Diff cap: ≤ ~500 LOC excluding generated/data files. Larger work splits — break the queue item into sub-items in this iteration's update, do the first sub-item.
- One stream branch per iteration. Never touch another stream's files.

Local gates before commit (run all three):

```bash
npm run type-check
npm test -- <changed test files only>
npm run lint -- <changed files only>
```

If anything red:
1. Try to fix. ≤ 2 fix attempts.
2. If still red after 2 attempts, revert the iteration's working changes (`git checkout -- <files>`), surface to Blocked with the failure log, exit `STATUS: BLOCKED`.

Every 10th iteration (count = `git log --oneline --grep="audit remediation iteration" | wc -l`), additionally run `npm run build`. If red, treat as above.

### Phase 6 — Commit + push + PR update

- Conventional Commits subject. Scope = stream letter. Body explains the why, references the queue item ID, references the audit section.
- Trailer line: `Refs: #<tracking-issue>` (e.g., `Refs: #215` for stream B).
- Do NOT include any AI-attribution trailer or "Co-authored-by" lines unless the project's existing `git log` already does so. Check first.
- `git push origin <branch>` — retry up to 4× with exponential backoff on network errors only (per repo's git ops policy).
- Update PR body via `mcp__github__update_pull_request` with the new progress checklist (mark item as done in PR body too).

### Phase 7 — Update queue + exit

In `docs/audits/REMEDIATION_QUEUE.md`:

- Move completed item's row to the Done section, prepend a new line: `<ISO date> · <item-ID> · <one-line summary> · commit <sha> · pr #<NNN>`.
- If the iteration broke a queue item into sub-items, replace the original row with the sub-items (status: pending, except the one just done which goes to Done).
- Update the In flight table for the touched stream (PR number, last CI = "pending — pushed at <time>").
- Append a single line to the Iteration log section.

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
- **Never** force-push, reset --hard, or skip hooks.
- **Never** apply migrations to prod or run anything that touches the live DB.
- **Never** merge a PR. The user merges.
- **Never** start work without first running phase 2 (CI rescue check). A red CI on an earlier stream blocks new work on that stream.
- **Never** commit a red iteration. Revert and surface.
- **Never** trust the audit's claims without the verification gate. The audit had at least one false positive (F-01).
- **Always** keep iterations self-contained — one stream, one item (or one rescue, or one Blocked surface).

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
