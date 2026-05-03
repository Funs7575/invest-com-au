# Decisions Log — Claude ↔ Codex collaboration

Append-only. Newest at top. Each entry: date, decision, rationale,
who decided.

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
