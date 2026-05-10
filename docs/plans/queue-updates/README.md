# Queue-updates inbox

Drop one file per update. The pre-launch wave loop consumes this directory
on its next iter, merges entries into `docs/plans/pre-launch-wave-status.md`,
and deletes the consumed files.

## Why this exists

`pre-launch-wave-status.md` is single-owner: only the pre-launch wave loop
writes to it directly. Two reasons that doc cannot tolerate concurrent
writers:

1. **Race conditions across loops.** The audit-remediation cloud loop, the
   pre-launch wave loop, and manual edits all share `main` as their
   merge target. They have no shared lock. On 2026-05-10 three competing
   reconciliation drafts (#701, #708, #714) all tried to update this
   doc at the same time — by the time the third was opened, the first
   was already stale.

2. **Authoritative narrative.** Status doc claims like "W4.21 ✅ done" need
   to come from a single source. When two loops independently flip a
   status line based on different signals (one sees the PR opened,
   the other sees the migration applied), the diff fights itself.

The fix: every other actor leaves a note here, and the wave loop is the
single writer that integrates them in order.

## File format

Filename: `YYYY-MM-DD-HHMM-<source>-<short-slug>.md`. Examples:

- `2026-05-10-1230-audit-loop-stream-cc-complete.md`
- `2026-05-10-1335-manual-w420-pr1-opened.md`
- `2026-05-10-1900-scout-newdrift-found.md`

Body: free-form Markdown. The wave loop reads it as input — be specific
about what changed and where it should land in the status doc.

A typical update file:

```markdown
# Source: audit-remediation cloud loop, iter 347
# Reaching: status doc decision log + W4.20 row

The KK-04 link-injection kill-switch landed via #711. The status doc's
W4 table currently says nothing about KK — that's the audit loop's
domain, but if the wave loop wants a cross-reference, append to the
decision log:

> 2026-05-10 14:00 | meta | KK-04 (audit loop) shipped #711 — adds
> link_injection feature flag + density cap. Independent of wave queue
> but worth surfacing since the same mechanism could power the
> recommendations strip later.
```

The wave loop is free to edit, summarise, or skip the suggestion — its
judgment is the final filter. Sources should not assume their wording
will land verbatim.

## When to use

- **Use the inbox** for: cross-loop status updates, founder one-off notes
  during a session, scout-cron drift discoveries that aren't yet in the
  master plan, audit-loop stream completion that wants a wave-side
  cross-reference, anything where you want to *suggest* a status change.

- **Don't use the inbox** for: scope items the wave loop already owns
  (the wave loop's own iter just edits the doc directly), founder
  high-priority blockers (those go in `LOOP_PAUSE` or a `BLOCKED:`
  prefix on the status doc itself — the wave loop handles those
  inline), or anything time-critical (the wave loop's iter cadence is
  ~hourly; if you need an immediate update, edit and push directly
  with a clear conventional commit explaining why you bypassed).

## Cleanup

The wave loop deletes consumed files in the same commit that updates
the status doc. If you see files lingering >24h, the wave loop is
either paused or hasn't seen them yet — fine to leave them; they'll be
picked up next iter. If they linger >7d, surface to the founder.

## Anti-patterns

- ❌ Direct edits to `pre-launch-wave-status.md` from any actor other
  than the wave loop. The wave loop's iter expects to be the source of
  truth and will overwrite competing edits.
- ❌ Deleting another actor's update file before the wave loop has
  consumed it. The loop's commit is the trigger for cleanup.
- ❌ Multi-update files with mixed sources. One file per source per
  topic — easier to attribute, easier to redact if needed.
