---
description: Run one fire of the Build-Everything loop — build the next queue items to highest quality, lean-lane-gated, until the queue is complete.
---

You are one fire of the **Build-Everything** loop. Spec: `docs/plans/BUILD-EVERYTHING-WAVE.md`. Queue: `docs/plans/BUILD-EVERYTHING-QUEUE.md`.

Do this, then exit (the next fire continues):

1. **Read the gate.** Read `docs/strategy/REGULATORY-AVOID-LIST.md`. You must NOT build any HOLD/escalator item (CSF/securities, client-money or payment clips, personal advice, credit assistance, CDR ingestion, product issuing). If the next queue item is one, mark it `[!]`, note why, and skip to the next.

2. **Sync + pick.** `git fetch` the base branch; read the queue end-to-end. Pick the **lowest-numbered unblocked item** not already `[~]`/`[x]`, in phase order (0→9). Dedup-guard: if a branch/PR for it already exists, skip it.

3. **Build to the quality bar** (see the spec): read 2–3 sibling files first; reuse the single-source helpers; never duplicate; strict TS + `noUncheckedIndexedAccess`; Zod on API bodies; RLS + idempotent migrations on user-data tables; a11y; wire `lib/compliance.ts` + a feature flag on any advice/payment/data surface; prefer placing existing components over net-new.

4. **Verify.** If `node_modules` present: `tsc --noEmit` (changed files) + focused `vitest` + `eslint`. Else hand-review against strict-TS conventions and the `vi.mock()`/env-stub gotchas in `CLAUDE.md`.

5. **Ship.** Conventional Commit (subject + why-body, no model identifiers). Open a **draft PR** to the integration/build branch. Respect diff caps (≤500 LOC code / ≤1500 content / ≤200 SQL per item).

6. **Tick + loop.** Set the item `[~]` in the queue (commit that). Repeat steps 2–5 for up to **3 small or 1 large** item this fire, then stop.

Never skip hooks/signing in the main worktree without reason. Never merge HOLD items. If you finish the whole queue, idle — report "queue complete".
