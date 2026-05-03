# Claude → Codex

Builder → auditor handoff. Claude overwrites this file each cycle.

---

Status: needs-review
Risk:   low
Next:   Codex reviews scaffold; founder ratifies LAUNCH_GATE_9_5 + AUD-100 shard scope.

## Task: AUD-000 (bootstrap) — scaffold collaboration protocol

Not in `CURRENT_TASK.md` history because it predates the protocol
itself; logged in `DECISIONS_LOG.md` 2026-05-03.

## Summary of changes

Created the governance scaffold required by the founder's
collaboration prompt. These files did not exist on the branch when
this cycle started; an earlier Codex report claimed to have created
them but verification found no matching commit (see
`DECISIONS_LOG.md` 2026-05-03 for full evidence).

- `docs/audits/AI_COLLAB_PROTOCOL.md` — builder/auditor loop, the
  Evidence Standard you (Codex) reportedly drafted but did not
  actually commit, pushback rules, status-report verification rules.
- `docs/audits/LAUNCH_GATE_9_5.md` — DRAFT launch gate criteria
  derived from existing repo docs (ENTERPRISE_STANDARD,
  QUALITY_DASHBOARD, REMEDIATION_QUEUE). Awaits founder ratification.
- `docs/audits/handoffs/CURRENT_TASK.md` — seeds AUD-100 (sharded
  end-to-end audit) with 8 proposed shards.
- `docs/audits/handoffs/CODEX_TO_CLAUDE.md` — empty template for
  your next response.
- `docs/audits/handoffs/DECISIONS_LOG.md` — two entries logging
  today's decisions.

## Files changed

```
docs/audits/AI_COLLAB_PROTOCOL.md            (new)
docs/audits/LAUNCH_GATE_9_5.md               (new, DRAFT)
docs/audits/handoffs/CURRENT_TASK.md         (new)
docs/audits/handoffs/CLAUDE_TO_CODEX.md      (new — this file)
docs/audits/handoffs/CODEX_TO_CLAUDE.md      (new)
docs/audits/handoffs/DECISIONS_LOG.md        (new)
```

## Commands run + exact pass/fail

All five protocol commands were attempted on this branch. **Three
fail due to a missing `node_modules` in this environment** — not due
to the docs scaffold. None of the failures are caused by files in
this changeset.

| Command | Result | Cause |
|---|---|---|
| `npm run lint` | ❌ FAIL | `Cannot find package 'eslint-config-next'` — `node_modules` not installed in this env. |
| `npm run type-check` | ❌ FAIL | Missing `@types/node` + `vitest` types — same root cause. |
| `npm run test` | ❌ FAIL | `sh: vitest: not found` — same root cause. |
| `npm run audit:console-calls` | ❌ FAIL (pre-existing) | 1 violation in `app/api-docs/page.tsx:439` — predates this branch, unrelated to scaffold. |
| `npm run audit:duplicate-functions` | ❌ FAIL (pre-existing) | 4 duplicates: `sendAdminNotification`, `welcomeEmail`, `isRateLimited`, `addSlot` — all in `app/**`, unrelated to scaffold. |

**Verification that failures predate this changeset:** all error
sites are in `app/**` / `sentry.*.ts` / `vitest.setup.ts` —
`git diff --stat HEAD~1 HEAD` will show only `docs/audits/**` files.

**Action requested of Codex:** confirm whether the env-driven
failures (lint/type-check/test) should be re-run in CI before this
scaffold lands, or whether founder accepts the docs-only landing
given the failures are infrastructure not code. The two
pre-existing audit failures should be filed as new
`REMEDIATION_QUEUE.md` items by Codex during AUD-100 shard 7
(dead code / duplication).

## Risks / unknowns

- **LAUNCH_GATE_9_5.md is DRAFT.** Numeric thresholds (9.5 overall, 9.0
  per-surface, "zero P0/P1") are proposals, not founder-ratified.
  Treating the file as binding before ratification would be a
  protocol violation.
- **AUD-100 shard list is proposed, not ratified.** Codex should not
  begin shards until founder confirms scope.
- **No code changes this cycle.** All five validation commands are
  expected to no-op pass; if any fail it indicates pre-existing
  breakage on the branch unrelated to this scaffold.

## Requested Codex action

1. **Review the scaffold against the evidence standard you reportedly
   drafted.** Specifically:
   - Does `AI_COLLAB_PROTOCOL.md` accurately reflect the rule the
     founder ratified ("measurable impact / reproducible failure /
     policy citation")?
   - Are the four files-owned-by-this-protocol entries the right set,
     or do you want a separate `RISKS_REGISTER.md`?
2. **Acknowledge the rejected prior cycle.** Confirm in your response
   that the next cycle will not use `--no-verify` and will include
   a commit SHA in the status report.
3. **Hold on AUD-100 shards** until founder ratifies the shard list
   in `CURRENT_TASK.md`.

If you disagree with any item above, rebut per the evidence standard
— don't proceed silently.
