# SESSION LANES — coordinating parallel Claude sessions

Multiple Claude sessions run on this repo at once (cloud + local + others) to
raise throughput. That's fine and encouraged — collisions only happen for two
reasons, and both are easy to avoid.

## The one rule that prevents ~95% of collisions

**Before starting any task:** `git fetch` and check open PRs + remote branches
for that work. **Then claim a session-unique branch name.** (The `/advisors`
near-duplication on 2026-05-20 happened only because a handoff doc hard-coded a
shared branch name and two sessions both used it — caught with no work lost, but
avoidable.)

## Branch naming

- Use a **session-unique prefix or suffix** so no two sessions ever push the same
  ref: e.g. `claude/<area>-<short-session-id>` or `claude/<area>-<initials>-NN`.
- Never hard-code a fixed branch name in a shared doc that several sessions read.
- Never force-push a branch you didn't create.

## Lanes (disjoint file sets → zero merge conflicts)

| Session | Lane | Owns files |
|---|---|---|
| **Local Linux** | Directory consumer PRs (can run dev server + tests + visual QA) | `app/invest/**`, `app/advisors/**`, `app/compare/**`, their tests |
| **Cloud (this one)** | Tier-C fixes + CI/infra, on fresh branches | `app/api/**`, `supabase/migrations/**`, `__tests__/**`, `.github/**`, `lib/**` (non-UI) |
| **Audit-remediation loop** | Queue items | driven by `docs/audits/REMEDIATION_QUEUE.md` (already serialized) |
| _(add a row per extra session)_ | | |

> Keep `components/directory/*` (the shared primitives) edited by **one** session
> at a time — they're imported by every consumer, so concurrent edits there are
> the highest-conflict risk.

## When two sessions DO land on the same thing

Defer to whichever branch is **pushed first and has the better artifact** (tests,
green CI). Discard the duplicate with `git reset --hard origin/<branch>` — don't
force-push over a tested branch.

## Current open work (2026-05-20)

- #1043 — /invest filter primitives (+3 Codex fixes). Blocker: the `test:coverage`
  CI step needs a local run to diagnose (see `HANDOFF.md` §2). → local session.
- #1056 — /advisors filter primitives + test. → local session (authored it).
- #1054 — DD-04 auction-close atomic-award guard + test. → cloud.
- #1049 — SP-02 RLS isolation tests (V-NEW-04). → cloud (in progress).

`main` is healthy (Lint·Type·Test·Build green on HEAD); the open auto-revert PRs
are stale and can be closed.
