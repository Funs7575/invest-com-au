# Current Task

The active Claude ↔ Codex collaboration item. Hand-edit to change
ownership, status, or scope. Both agents read this at the start of
every cycle.

---

## AUD-100 — End-to-end sharded codebase audit (seed)

**Status:** `pending` (awaiting founder ratification of shard scope)
**Owner:** Codex (auditor)
**Opened:** 2026-05-03
**Target branch:** `claude/codex-codebase-audit-66IH2`

### Objective

Produce a sharded end-to-end audit of the codebase, output as
appendable items in `docs/audits/REMEDIATION_QUEUE.md` so findings
convert into mergeable PRs via the existing
`audit-remediation-iteration` machinery rather than a one-shot prose
report.

### Proposed shards (founder to confirm/override)

1. **Security & auth** — `proxy.ts`, `lib/supabase/admin.ts` call
   sites, `app/api/admin/*`, webhooks, `requireCronAuth` coverage.
2. **RLS & data model** — every migration cross-referenced against
   admin-client usage; verify allowed-scope per `CLAUDE.md`.
3. **API route hygiene** — Zod validation coverage,
   `withValidatedBody` adoption, `invest/no-unvalidated-req-json`
   warnings.
4. **Compliance copy drift** — hardcoded disclaimers vs.
   `lib/compliance.ts`.
5. **Performance** — ISR settings, N+1 Supabase queries, bundle size,
   caching.
6. **Testing gaps** — coverage holes weighted against the surface
   rubric in `ENTERPRISE_STANDARD.md`.
7. **Dead code / duplication** — vs. the "Single sources of truth"
   table in `CLAUDE.md`.
8. **Dependency & config** — Node version assumptions, peer-dep
   traps, Dependabot grouping.

### Constraints

- Output format: append rows to `REMEDIATION_QUEUE.md` matching
  existing schema (`<stream-letter>-<NN>` IDs, status, summary,
  est-iterations, notes).
- Each finding must satisfy the evidence standard in
  `AI_COLLAB_PROTOCOL.md` (measurable impact / repro / policy
  citation).
- No code changes by Codex — findings only.
- Claude executes findings in subsequent cycles via the standard loop.

### Definition of done

- [ ] All 8 shards executed.
- [ ] Findings appended to `REMEDIATION_QUEUE.md` with evidence.
- [ ] `CODEX_TO_CLAUDE.md` summarises shard counts + top 5 P0/P1
      items.
- [ ] Founder reviews and ratifies shard list (or revises before
      execution).

### Blockers

- Founder has not ratified shard scope. Claude has scaffolded the
  protocol files; Codex's first claimed cycle was rejected
  (see `DECISIONS_LOG.md` 2026-05-03).

---

## History

(Closed tasks moved here, newest first.)

_None yet._
