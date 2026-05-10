---
description: Run 3 audit-remediation queue items in parallel via Opus worktree agents (3-4× throughput).
---

# /audit-remediation-parallel

Spawn three parallel Opus agents on independent queue items, each in its own
git worktree. Validated pattern (memory `feedback_parallel_agent_pattern.md`):
~3 PRs in ~30 minutes vs the cloud loop's ~7-8 min per single PR.

**This command is for human-driven sessions.** The cloud loop's
`/audit-remediation-iteration` deliberately does NOT spawn sub-agents — its
single-thread state model breaks if it does. This command is the parallel
counterpart, run by a human who explicitly wants the throughput multiplier.

---

## When NOT to run this

- Main CI is failing. Run `/audit-remediation-iteration` first; its Phase 1.7
  will rescue main. Parallel agents on top of broken main = 3× the spurious
  auto-revert noise.
- Queue has fewer than 3 independent pending items.
- You don't have ~30 minutes to babysit the merge step.

---

## Step 1 — Sync + sanity

```bash
git fetch origin main
git checkout main && git pull --ff-only origin main

# Main CI must be green (or pending) before parallelising.
main_ci=$(gh run list --branch main --workflow CI --limit 1 --json conclusion --jq '.[0].conclusion // "pending"')
echo "main CI: $main_ci"
# If "failure", STOP and run /audit-remediation-iteration instead.
```

Read `docs/audits/REMEDIATION_QUEUE.md`. Pick **3 pending items from 3
different streams** (never two from the same stream — they'd touch the same
branch and conflict). Prefer items with these properties:

- Estimated diff ≤ 200 LOC.
- No migration (migrations need extra coordination on `lib/database.types.ts`).
- File paths don't overlap with the other two picks (grep each item's listed
  paths against the others).

---

## Step 2 — Spawn 3 agents in parallel

In a single message, send three Agent tool calls — they MUST be in one
response so they actually run concurrently. Each agent:

- `subagent_type: "general-purpose"` (or another that takes `model`)
- `model: "opus"`
- `isolation: "worktree"` (creates a fresh `.claude/worktrees/agent-*` checkout)
- `run_in_background: true`
- Prompt template (per agent — substitute `{ITEM_ID}`, `{STREAM}`, `{PATHS}`, `{BRANCH}`):

  > You are working on audit-remediation queue item **{ITEM_ID}** from stream **{STREAM}**.
  >
  > **Your task:** [paste the item description from the queue, verbatim].
  >
  > **Files you may touch:** {PATHS}. Do NOT touch any file outside this list.
  >
  > **Branch:** create `claude/audit-remediation/{BRANCH}` from `origin/main`.
  >
  > **Hard rules:**
  > - Run `npx tsc --noEmit` on the changed files. Must be clean before commit.
  > - Run `npm test -- <changed test files>` if any. Must pass.
  > - Conventional Commit subject: `<type>({STREAM}): <one-line>`.
  > - Commit body must include: **Why** (what was broken), **Verified callers**, **Idempotency/Safety**, **Rollback location**. See `.claude/commands/audit-remediation-iteration.md` Phase 6 for the contract.
  > - Stop at the commit. **Do NOT push** — the main session pushes (the worktree has no node_modules; pre-push hook would OOM).
  > - If you hit lint-staged warnings on files you didn't intend to change, drop those files from the PR rather than expanding scope.
  >
  > **Report back:** the branch name, the commit SHA, the file list, and any blockers.

---

## Step 3 — Push from the main worktree (this is the validated trick)

Agents commit but don't push. From the main worktree (where node_modules
exists and the husky pre-push hook has memory headroom), push each branch:

```bash
cd /home/finnduns/invest-com-au

for branch in claude/audit-remediation/<a> claude/audit-remediation/<b> claude/audit-remediation/<c>; do
  git fetch . "$branch:$branch" 2>/dev/null || git checkout "$branch"
  NODE_OPTIONS="--max-old-space-size=5120" git push -u origin "$branch"
done
```

The `NODE_OPTIONS` headroom matches `project_pre_push_node_options.md` —
default 4 GB OOMs on this sandbox; 5 GB is enough.

---

## Step 4 — Open PRs

**PRECONDITION — duplicate-PR guard (added 2026-05-10).** For each item ID
about to ship as a PR, first check no open PR already covers it:

```bash
for ITEM in <X-NN> <Y-NN> <Z-NN>; do
  DUP=$(gh pr list --state open --search "$ITEM in:title" --json number,title \
          --jq ".[] | select(.title | test(\"\\\\b$ITEM\\\\b\"))")
  if [ -n "$DUP" ]; then
    echo "DUPLICATE for $ITEM — skipping. Existing PR:"
    echo "$DUP" | jq .
    # Mark the queue row as in_flight referencing the existing PR; do NOT open a parallel one.
  fi
done
```

If a duplicate is found for any item, drop that item from this fire. Better
to ship 2 of 3 cleanly than to ship 3 with one going to waste. The 2026-05-10
cleanup closed #648 vs #702, #649 vs #706, #667 vs #703 — each pair was a
parallel-fire collision that this gate catches.

For non-duplicate items, open the PR. The PR body MUST include a `## Supersedes`
section so the `auto-close-superseded.yml` workflow can pick it up on merge:

```bash
gh pr create \
  --base main \
  --head <branch> \
  --title "<conventional commit subject>" \
  --body "$(cat <<'EOF'
## Summary
<1-2 sentences>

## Queue item
{ITEM_ID} — see docs/audits/REMEDIATION_QUEUE.md

## Supersedes
_None._
<!-- or: list of #NNN this PR replaces. The auto-close workflow reads this section on merge. -->

## Test plan
- [ ] CI green
- [ ] [item-specific verification]
EOF
)"
```

---

## Step 5 — Update the queue (single commit on main)

After all 3 PRs are open, update `docs/audits/REMEDIATION_QUEUE.md` once with
all 3 items moved to "In flight" with their PR numbers. One commit, one push.
Avoid 3 racing queue updates — the cloud loop will use the merged result.

---

## Step 6 — Watch + merge

Each PR runs through normal CI. Once green:

- **Tier A** (page UI / docs / tests): `gh pr merge <N> --squash --delete-branch`. No observation window needed.
- **Tier B / C**: per `docs/audits/MERGE_AUTHORIZATION.md`. Tier C announces intent in chat first.

If any PR hits a CI failure, treat it as a Phase-2 CI rescue in
`/audit-remediation-iteration` — the same diagnose-and-fix flow applies.

---

## Hard rules (in addition to the iteration command's rules)

- **Three at a time, max.** Four parallel agents stress the sandbox memory.
  Three is the validated ceiling.
- **Independent streams only.** Same-stream parallelism creates branch
  conflicts that take longer to resolve than the throughput buys back.
- **Push from main worktree, not agent worktrees.** Agent worktrees lack
  `node_modules` so the pre-push tsc hook OOMs. Agents commit; you push.
- **No agent merges its own PR.** Merge step runs in your context after CI
  is green, with the merge-authorization tier rules applied.
- **If the main worktree has uncommitted changes**, stash before checking
  out an agent branch. Forgetting this is the single biggest source of
  "lost work" panics in the parallel pattern.

---

## Throughput data (validated 2026-04-29)

- **3 PRs in ~30 min** with this pattern.
- vs ~7–8 min per PR for the cloud loop's serial single-thread mode.
- Real-world multiplier: **~3-4×** when the parallel work is genuinely
  independent. Less when items share files or one needs a migration regen.
