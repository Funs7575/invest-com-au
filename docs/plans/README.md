# docs/plans/

Living plan documents for the **pre-launch product wave** — the multi-month
build sprint Fin runs across the AFSL pre-launch window (~2026-05 →
~2026-11).

## Files

| File | What it is |
|---|---|
| `pre-launch-wave-master-prompt.md` | Source-of-truth prompt for the cloud / local loop. 28 PRs across 6 waves. Read once per session. |
| `pre-launch-wave-status.md` | Live queue + decisions log + observation log. Updated by every loop iteration. |
| `sleepy-growing-planet.md` | Original May-8 pre-launch product plan (PR-A1 + F1 + B1-3 + X1-5). Most of A1+F1+B-series shipped 2026-05-09 in PR #645. |
| `investor-account-end-to-end-plan.md` | Full investor-account plan — 15 PRs across 5 phases. Source spec for Wave 2 of master prompt. |

## How the cloud loop reads / writes these

The pre-launch-wave routine (RemoteTrigger; cron `0 * * * *`) reads the
master prompt + status doc on every fire, picks the next pending queue
item, ships it end-to-end, and commits the status update back to this
directory as part of the iteration. State persists across cron fires via
git, exactly like `docs/audits/REMEDIATION_QUEUE.md` for the audit-
remediation loop.

## How to disable / pause

`LOOP_PAUSE` at the repo root pauses the audit-remediation loop only.
The pre-launch-wave loop is independent. To pause: disable the routine
at https://claude.ai/code/routines or `RemoteTrigger update enabled:false`.
