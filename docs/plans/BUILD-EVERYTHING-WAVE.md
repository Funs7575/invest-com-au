# Build-Everything wave — loop master prompt

**Status:** active · **Created:** 2026-05-21 · **Queue:** `BUILD-EVERYTHING-QUEUE.md` · **Command:** `/build-everything`

A self-continuing build loop that ships everything in the queue **surgically, to the highest quality, until complete.** Modelled on the audit-remediation + pre-launch-wave loops. Designed to run as a Claude.ai **cloud routine** (RemoteTrigger) firing on a schedule, each fire invoking `/build-everything`.

## Prime directive
Work the queue top-to-bottom by phase. **Do not stop after one item** — in a single fire, complete as many items as the quality bar and diff caps allow (default: up to 3 small or 1 large), then the next fire continues. The goal is met only when every non-HOLD item is `[x]`.

## HARD GATE — read first, every fire
Before touching any item, read `docs/strategy/REGULATORY-AVOID-LIST.md`.
- **Never build a HOLD item or anything matching an escalator** (CSF/securities, client money / payment clips, personal advice, credit assistance, CDR ingestion, product issuing). If the queue ever implies one, leave it `[!]` and surface it — do not build it.
- Every advice/payment/data surface must wire `lib/compliance.ts` (`GENERAL_ADVICE_WARNING`) + a feature flag.
- Monetisation = flat B2B fees / affiliate / ads only. No consumer→adviser money intermediation.

## Quality bar (surgical, highest-quality)
- Match existing patterns — read 2–3 sibling files first; reuse single-source helpers (`lib/seo.ts`, `lib/schema-markup.ts`, `lib/tracking.ts`, `lib/compliance.ts`, `lib/rate-limit-db.ts`, `lib/logger.ts`, `components/directory/*`). Never duplicate.
- Strict TS + `noUncheckedIndexedAccess`; `arr[0]` is `T | undefined`. Validate API bodies with Zod. RLS + idempotent migrations for any user-data table.
- Accessibility: labelled inputs, focus management on dialogs, `aria-live` on results, sr-only text for decorative SVG.
- Prefer **finishing/placing existing components** over net-new (Phase 1 especially).
- Add/extend tests; run `tsc`/`vitest`/`eslint` on changed files when `node_modules` is present.

## Iteration mechanics (each fire)
1. **Sync** — `git fetch`/pull the base branch; read this file + the queue end-to-end.
2. **Pick** — lowest-numbered unblocked queue item not already `[~]`/`[x]`. Honour phase order (0→9). Dedup-guard: skip if a branch/PR already exists.
3. **Gate** — confirm it is NOT a HOLD/escalator (above). If it is, mark `[!]`, surface, pick the next.
4. **Build** — read sibling patterns; implement to the quality bar; wire compliance + flags where relevant.
5. **Verify** — `tsc --noEmit` (changed files) + focused `vitest` + `eslint` if node_modules present; else hand-review against strict-TS patterns.
6. **Ship** — Conventional Commit (subject + why-body); open a **draft PR** (base = the build branch / integration branch). Diff caps: ≤500 LOC code, ≤1500 content, ≤200 SQL per item.
7. **Tick** — set the queue item `[~]` (PR open). On merge it becomes `[x]`.
8. **Loop** — repeat from step 2 for the next item (batch: ~3 small or 1 large per fire), then exit.

## Merge policy
Per `docs/audits/MERGE_AUTHORIZATION.md`. Phase 0 security/compliance + migrations + payments = Tier C (announce). Most Phase 1–3 UI/UX/tests = Tier A/B. New schema/RLS = Tier C with the isolation gate. HOLD items = never.

## Parallel execution (for an interactive session fanning out agents)
Agents share one working tree (a known cwd quirk) — **lane each agent to a disjoint file set** to minimise overlap, have each commit only its own files (`git add <paths>`), then the orchestrator cherry-picks each lane's commit onto a clean branch off the integration base and opens per-lane PRs. Commit with hooks/signing off in worktrees (`-c core.hooksPath=/dev/null -c commit.gpgsign=false`).

## Done condition
Every non-HOLD queue item is `[x]`. The loop then idles (no-op fires) until new items are appended or HOLD items are unblocked by founder + legal sign-off.

## Wiring the cloud routine (founder action — not doable from the shell)
At `claude.ai/code/routines`, create a routine that fires `/build-everything` on a schedule (e.g. every 30 min, offset from the audit-remediation routines), targeting the build/integration branch. RemoteTrigger is configured in the web UI, not the CLI.
