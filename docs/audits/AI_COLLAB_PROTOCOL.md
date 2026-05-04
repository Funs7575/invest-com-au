# AI Collaboration Protocol — Claude (builder) ↔ Codex (auditor)

Authoritative for any session where Claude Code and Codex collaborate on
launch-readiness work. Operates inside the existing audit-remediation
machinery (`REMEDIATION_QUEUE.md`, `MERGE_AUTHORIZATION.md`,
`ENTERPRISE_STANDARD.md`) — this protocol governs the handoff layer
between the two agents, not the underlying queue or merge policy.

**Scope:** sessions kicked off against `claude/codex-codebase-audit-*`
branches or any branch where `docs/audits/handoffs/CURRENT_TASK.md`
names Claude or Codex as the current owner.

**Out of scope:** founder-authored PRs, the autonomous remediation
loop, anything Tier E in `MERGE_AUTHORIZATION.md`.

---

## Mode: PR-review-only (active 2026-05-03)

**Codex does not commit to repo branches.** The file-handoff pattern
was retired after two consecutive Codex cycles failed verification
(SHAs that did not exist; stale-branch artifacts; unauthorized scope
creep). Root cause: Codex's environment cannot reach `origin`, so
its local commits were unreachable from the actual repo.

Replacement model:

- **Claude** is the only agent committing to branches/PRs.
- **Codex** reviews PR diffs via the GitHub API (PR comments + review
  threads). Codex does not commit, does not modify files, does not
  open branches.
- Every Claude PR includes the structure required by founder rule:
  task ID, exact files changed, commands run with output, risk notes,
  launch-gate criteria moved.
- Codex feedback still binds to the Evidence Standard below.
- Handoff files in `docs/audits/handoffs/` remain authoritative for
  the *current task* and decisions log; they are now Claude-edited
  only, since Codex no longer commits.

## Roles

- **Claude** — builder + scribe. Implements changes, runs validation,
  edits handoff files, opens PRs, addresses Codex review comments,
  pushes back on weak feedback.
- **Codex** — auditor. Posts PR review comments backed by the
  Evidence Standard. Approves or requests changes. Never merges,
  never commits.

Neither agent merges Tier C / D / E PRs without founder confirmation
per `MERGE_AUTHORIZATION.md`.

---

## Execution loop

Every cycle has four phases. Skipping a phase requires explicit founder
authorization in `DECISIONS_LOG.md`.

### A) PLAN

Owner: Claude.

- Restate task ID, objective, constraints, definition of done.
- List exact files to be touched.
- Identify the surface(s) from `ENTERPRISE_STANDARD.md` and confirm the
  rubric is met or queue a hardening sub-item first.

### B) IMPLEMENT

Owner: Claude.

- Smallest safe change set.
- Prefer shared utilities (see CLAUDE.md "Single sources of truth").
- Preserve behavior unless the objective explicitly changes it.
- Validate input at system boundaries (Zod for `app/api/*` POST/PUT/
  PATCH/DELETE per CLAUDE.md).

### C) VALIDATE

Owner: Claude. Run **all** of:

```bash
npm run lint
npm run type-check
npm run test
npm run audit:console-calls
npm run audit:duplicate-functions
```

Plus task-specific checks (e.g. `npm run e2e` for UI work, RLS
isolation gate for migrations). Report exact pass/fail in the handoff.
"Tests passed" without command output is not acceptable.

### D) HANDOFF

Owner: Claude.

- Write `docs/audits/handoffs/CLAUDE_TO_CODEX.md` (overwrite each cycle).
- Update `docs/audits/handoffs/CURRENT_TASK.md` (status + owner).
- Append major decisions to `docs/audits/handoffs/DECISIONS_LOG.md`.
- Commit normally — `--no-verify` is prohibited (see CLAUDE.md).

Codex then writes `docs/audits/handoffs/CODEX_TO_CLAUDE.md` with review
findings. Next cycle starts with Claude reading that file.

---

## Evidence standard for Codex feedback

Codex review items must be backed by at least one of:

1. **Measurable impact evidence** — benchmark delta, bundle-size diff,
   query-plan change, coverage number, error-rate metric, profile
   trace, etc. Numbers with units.
2. **Reproducible failing case** — a failing test, exact repro steps,
   stack trace tied to a specific commit SHA, or a `curl` that returns
   the wrong response.
3. **Policy citation** — direct reference to `CLAUDE.md`,
   `ARCHITECTURE.md`, `COMPANY.md`, `ENTERPRISE_STANDARD.md`,
   `MERGE_AUTHORIZATION.md`, `REMEDIATION_DEFAULTS.md`, or another
   repo doc, with `file:line`.

If a Codex item fails this bar, Claude's response in
`CLAUDE_TO_CODEX.md` must:

- Quote the weakly-justified item verbatim.
- State which of the three categories is missing.
- Either propose an alternative path **or** state "no change" with
  rationale.
- Set the item's status to `needs-evidence` in `CURRENT_TASK.md` and
  request Codex re-review.

Codex items that pass the evidence bar but conflict with **security**,
**data integrity**, **auth/permission correctness**, or **audit-trail
requirements** still get rebutted under the Pushback Rules below —
evidence does not override those concerns.

---

## Verifying Codex (and Claude) status reports

Either agent's claim that work was committed must be verifiable:

- Commit SHA must exist on the named branch (`git log --all`).
- Files claimed as added must be present in the working tree.
- "Tests passed" requires the actual command output (or an attached
  CI link), not the commit operation itself.
- `git commit --no-verify` is treated as a protocol violation
  regardless of intent.

If verification fails, the receiving agent rejects the report and
requests re-do with evidence. The failed cycle is logged in
`DECISIONS_LOG.md`.

---

## Pushback rules

Reject (politely, with evidence) any recommendation — from Codex or a
human reviewer — that:

- Weakens security hardening.
- Risks data integrity.
- Breaks auth/permission correctness.
- Compromises audit-trail completeness.
- Bypasses commit hooks (`--no-verify`, `--no-gpg-sign`,
  `commit.gpgsign=false`) without founder authorization.
- Lowers a coverage / quality threshold to make a regression pass.

When uncertain, mark uncertainty explicitly and request bounded
follow-up rather than guessing.

---

## Output style

Every handoff begins with a layman-readable status line:

```
Status: done | in-progress | blocked | needs-review | needs-evidence
Risk:   low | medium | high
Next:   <one sentence>
```

Then: task ID, summary of changes, files changed, validation results,
risks/unknowns, requested counterparty action.

Concise and factual. No closing summaries; the diff is the summary.

---

## Files owned by this protocol

| File | Owner | Purpose |
|---|---|---|
| `docs/audits/AI_COLLAB_PROTOCOL.md` | Founder | This document. |
| `docs/audits/LAUNCH_GATE_9_5.md` | Founder | Launch readiness criteria. |
| `docs/audits/handoffs/CURRENT_TASK.md` | Both (rotating) | Active task + status. |
| `docs/audits/handoffs/CLAUDE_TO_CODEX.md` | Claude | Builder → auditor handoff. |
| `docs/audits/handoffs/CODEX_TO_CLAUDE.md` | Codex | Auditor → builder handoff. |
| `docs/audits/handoffs/DECISIONS_LOG.md` | Both | Append-only major decisions. |
