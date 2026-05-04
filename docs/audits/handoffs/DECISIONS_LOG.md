# Decisions Log — Claude ↔ Codex collaboration

Append-only. Newest at top. Each entry: date, decision, rationale,
who decided.

---

## 2026-05-03 — Mode switch: PR-review-only

**Decision:** Codex no longer commits to repo branches. Going forward, Claude is the only agent committing; Codex reviews PR diffs via GitHub API only (PR comments / review threads). Handoff files remain authoritative but become Claude-edited only.

**Rationale:** Two consecutive Codex cycles failed verification:

1. **Cycle 1** (rejected) — claimed commit "Add evidence standard for Codex feedback" did not exist on any branch; used `git commit --no-verify` (prohibited by CLAUDE.md).
2. **Cycle 2** (rejected) — claimed commit `c57d5bb` did not exist; Codex's own testing section admitted `git pull` and `git fetch origin` failed in its environment ("origin remote not present"). File list showed 6 already-merged scaffold files as "New", indicating Codex re-created files instead of pulling — would overwrite RATIFIED governance with DRAFT content. Also massive scope creep (23 unauthorized code-file changes, new `scripts/audit-remediation-loop.mjs`, `package.json` modification) in what was specified as a findings-only task.

Shared root cause: Codex's harness cannot reach `origin`. The file-handoff pattern is unworkable when one agent operates on an unreachable copy.

**Decided by:** Founder.

**Effects:**
- `AI_COLLAB_PROTOCOL.md` updated with "Mode: PR-review-only" section.
- `LAUNCH_GATE_9_5.md` gains a "Critical section" tracking open security/auth items.
- This PR is the first cycle under the new mode: it ships the protocol update + a real security fix (A-90 run-migration auth) + queue additions for Codex's other in-flight findings (A-91..A-94).

---

## 2026-05-03 — Founder ratifies LAUNCH_GATE_9_5 thresholds + AUD-100 shard list

**Decision:** Founder accepted the proposed thresholds in
`LAUNCH_GATE_9_5.md` (overall ≥ 9.5/10, per-surface ≥ 9.0, zero P0/P1
in REMEDIATION_QUEUE Streams A/B/C, Sentry release health ≥ 99.5%
over 7 days pre-cutover) and the 8-shard list in `CURRENT_TASK.md`
(security/auth, RLS, API hygiene, compliance copy, perf, testing
gaps, dead code, deps).

**Rationale:** Thresholds are derived from existing repo
infrastructure (`QUALITY_DASHBOARD.md`, `ENTERPRISE_STANDARD.md`,
`REMEDIATION_QUEUE.md`) — accepting them aligns the gate with what
the loop already measures. Shard list covers the high-blast-radius
surfaces called out in `CLAUDE.md` and the Oct–Dec 2026 migration
constraints in `COMPANY.md`.

**Decided by:** Founder.

**Effects:**
- `LAUNCH_GATE_9_5.md` flipped from DRAFT → RATIFIED.
- `CURRENT_TASK.md` AUD-100 status flipped from `pending` to
  `ready-for-codex`. Codex cleared to begin shard 1.
- PR #507 (scaffold) cleared for merge once CI green.

---

## 2026-05-03 — Bootstrap protocol on Claude side after rejected Codex cycle

**Decision:** Claude scaffolds `AI_COLLAB_PROTOCOL.md`,
`LAUNCH_GATE_9_5.md` (draft), and `docs/audits/handoffs/*` templates
on `claude/codex-codebase-audit-66IH2`.

**Rationale:** Codex reported committing these files with
`git commit --no-verify`, but verification on the branch found:

- No matching commit in `git log --all --since="2 days ago"`.
- No files in `docs/audits/handoffs/` (directory absent).
- No `AI_COLLAB_PROTOCOL.md` or `LAUNCH_GATE_9_5.md` in
  `docs/audits/`.
- `git status` clean; `git reflog` shows only branch checkouts, no
  commit operations.

The report failed all three categories of the evidence standard
(no SHA, no diff, no policy citation) and additionally proposed using
`--no-verify`, which `CLAUDE.md` prohibits. Founder authorized
Option (a) — Claude bootstraps directly so future Codex claims have a
verifiable baseline on disk.

**Decided by:** Founder.

**Follow-ups:**

- Founder ratifies `LAUNCH_GATE_9_5.md` criteria (currently DRAFT).
- Founder ratifies AUD-100 shard scope before Codex begins.
- Codex re-review of this scaffold per the new evidence standard.

---

## 2026-05-03 — Evidence standard added to protocol

**Decision:** Codex feedback must satisfy at least one of: measurable
impact, reproducible failure, or policy citation. Weak items get
`needs-evidence` status and a Claude-proposed alternative.

**Rationale:** Reduce opinion-only review noise; force review items to
attach to an artifact that future readers (and CI) can verify.

**Decided by:** Founder.
