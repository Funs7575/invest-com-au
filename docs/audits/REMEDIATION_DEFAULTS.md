# Audit Remediation — Defaults

Decisions baked into the loop. Override by editing this file or a queue item.
The slash command `/audit-remediation-iteration` reads from here.

Authored 2026-04-26 from the user's "use your defaults" go-ahead. Changes here
take effect on the next iteration.

## Branching

- One draft PR per stream. Branch naming: `claude/audit-remediation/<letter>-<slug>`.
- All branches forked from `main`, kept up to date by `git fetch origin main && git merge --no-edit origin/main` at the start of each iteration that touches the branch.
- Setup PR (queue + slash command + defaults) lives on `claude/audit-codebase-health-8OCxZ` — that's the branch the harness assigned for this work.

## Default decisions on the 5 open questions

1. **PR strategy:** one draft PR per stream (9 PRs). Each iteration appends commits.
2. **Branch naming:** `claude/audit-remediation/<letter>-<slug>` (see Streams below).
3. **`admin.ts` in user paths (#216):** default is **refactor to `lib/supabase/server.ts` + add the missing RLS policy**. Surface to Blocked if (a) the route requires writing data the user shouldn't be able to mutate directly, or (b) RLS policy is non-obvious (e.g., affiliate revenue tables). Never silently leave service-role in a user path.
4. **RLS for the 9 medium-risk tables (#215):** default policy is `owner_id = auth.uid()` for read/write, `service_role` for inserts, deny anon. If the table has no `owner_id`-shaped column, surface to Blocked. Always emit a `-- TODO: human review of policy semantics` comment in the migration.
5. **CI gate:** before appending commits to an in-flight PR, the iteration runs `gh pr checks <number>` (or `mcp__github__pull_request_read` with checks). If CI is red, the iteration's job is to diagnose and fix that PR — not to start new work.

## Verification gates (lessons from the audit)

The audit had at least one false positive (the "dead components" — they're re-exported by `app/*/loading.tsx` and `app/*/error.tsx`, which the grep missed). **Trust the audit's directional claims, verify before destructive action.**

Per-stream verification floor before any commit:

- **Deletion:** `grep -rn "<symbol>" --include="*.ts" --include="*.tsx" .` plus the same with `export.*from.*<filename>` to catch re-exports. If anything matches, the item is a false positive — mark it RESOLVED-FALSE-POSITIVE in the queue.
- **Refactor (admin.ts → server.ts):** confirm the calling route reads `req.cookies` or is in an authenticated layout; if not, surface to Blocked.
- **New migration:** must be idempotent (`IF NOT EXISTS`), have a rollback header, and enable RLS if it creates a table.
- **New test:** must actually exercise the route handler — not just import-and-assert-truthy. Reject on coverage of < 60% of the route's branches.

## Per-iteration discipline

- **Diff cap:** ≤ ~500 LOC per iteration (excluding generated files / pure data). Larger work splits across iterations.
- **Always run before commit:**
  ```bash
  npm run type-check
  npm test -- <changed test files only>
  npm run lint -- <changed files only>
  ```
  If any red → fix or revert. Never commit a red iteration.
- **Every 10th iteration:** also run `npm run build` to catch issues unit tests miss (route-manifest, ISR, server-component boundaries).
- **No destructive git ops:** no `--force`, no `reset --hard`, no `clean -fd`. Migrations are forward-only per `CLAUDE.md`.
- **No skipping hooks:** never `--no-verify`. If `lint-staged` rewrites files, restage and recommit.
- **Conventional Commits** subject lines per `CONTRIBUTING.md` style (`fix(stream-d): add /api/submit-lead integration test`).

## Streams

| Letter | Branch | Title | Tracks issue |
| --- | --- | --- | --- |
| A | `claude/audit-remediation/a-drift-backfill` | DB schema drift backfill (231 tables) | #214 |
| B | `claude/audit-remediation/b-rls-remediation` | RLS on 11 migrations | #215 |
| C | `claude/audit-remediation/c-admin-scope-reset` | `admin.ts` scope reset | #216 |
| D | `claude/audit-remediation/d-route-tests` | API route tests (critical 9 + backfill) | #217 |
| E | `claude/audit-remediation/e-zod-rollout` | Zod validation rollout | #218 |
| F | `claude/audit-remediation/f-hygiene` | Dead code, duplicate consolidation, SSOT | (no P0 issue; report §1 + §2) |
| G | `claude/audit-remediation/g-migration-hygiene` | Idempotency + rollback headers | (report §5.2 + §5.4) |
| H | `claude/audit-remediation/h-file-splits` | Files >1000 LOC | (report §3.2) |
| I | `claude/audit-remediation/i-guardrails` | ESLint + CI guards (re-drift, RLS, admin.ts imports) | cross-cutting |

## Priority order

When choosing the next item, walk in this order and pick the first non-blocked one:

1. **B (critical 2)** — `email_otps` and `leads` RLS — compliance gate.
2. **D (critical 9)** — lead-capture + Stripe + signout integration tests — revenue gate.
3. **B (other 9)** — remaining RLS migrations.
4. **C** — `admin.ts` scope reset (mechanical refactors first; surface ambiguous to Blocked).
5. **A** — drift backfill (4–5 tables per iteration).
6. **E** — Zod rollout (top-20 first, then backfill).
7. **G** — migration hygiene.
8. **I** — guardrails (best after A/B/C land so the rules don't break in-flight work).
9. **F** — hygiene cleanup.
10. **H** — file splits (last; needs tests in place to be safe).

## Concurrency + locking

- Only one iteration may touch one branch at a time. Lock file: `.git/audit-remediation.lock` containing the iteration's start ISO timestamp. Stale locks (> 90 minutes old) are removed by the next iteration.
- Iterations must complete on a single branch — never cross-commit between streams in one iteration.

## Stop conditions

- **Hard stop:** queue's `In flight` and `Blocked` sections are empty AND `Done` covers all original items. Iteration prints `STATUS: COMPLETE` and exits.
- **Stream stuck:** if the same stream fails 3 iterations in a row (CI red after fix attempt), the stream is moved to Blocked with the failure log and the loop continues on other streams.
- **Manual halt:** if the user pauses the loop, no cleanup is required — every iteration is a complete unit.

## Stuff the loop will never do (ask the user instead)

- Apply migrations to production (forward-only; user runs).
- Run E2E against Stripe sandbox (no keys in repo).
- Query the live DB for runtime data (row counts, last-read timestamps, partial-failure verification of §5.5).
- Hit PostHog API for "is this route actually called in prod?" data — needed to safely act on the 135 suspected-dead routes.
- Decide compliance copy beyond `lib/compliance.ts` SSOT.
- Merge any PR.
