# Friday 30-minute ritual

> Without a paid reviewer, the Friday ritual is what replaces the implicit
> accountability of someone else's calendar invite. Same time every Friday,
> 30 minutes, no exceptions. Slipping one Friday is fine. Slipping three
> weeks in a row is how things die.

## When

Pick a fixed slot (e.g. Friday 10:00). Calendar-block it. Treat it as
non-negotiable like any other recurring meeting.

## What

| # | Step | Time | Where |
|---|---|---|---|
| 1 | Merge backlog sweep | 10 min | GitHub PR list |
| 2 | Cost check | 3 min | Email digest from `cost-digest` cron (set up via `app/api/cron/cost-digest`) or manual check of provider dashboards |
| 3 | Sentry sweep | 5 min | sentry.io |
| 4 | Synthetic check | 2 min | UptimeRobot dashboard |
| 5 | Cron sweep | 3 min | Supabase SQL editor |
| 6 | Plan next week | 7 min | `docs/audits/LOOP_PROGRESS.md` |

## Step 1 — Merge backlog sweep (10 min)

Open https://github.com/Funs7575/invest-com-au/pulls.

For each open PR:

- **Labelled `auto-merge-safe` and CI green and AI-review verdict is APPROVE**:
  merge it (squash). The auto-merge workflow should have done this
  automatically; if it didn't, do it manually and check why the workflow
  didn't trigger.
- **Labelled `needs-human-review` and CI green**: read the AI-review
  comment, click through the Vercel preview if there's a UI change,
  decide. If you're not confident, leave a comment explaining what's
  blocking and move on.
- **Stale (>2 weeks no activity)**: comment with a status question. If
  it's been 4+ weeks with no progress, close it.
- **CI failing**: check whether it's the audit-loop's CI rescue that
  hasn't run. If so, ignore (the next loop iteration will pick it up).
  If it's a real failure, leave a comment.

## Step 2 — Cost check (3 min)

If the `cost-digest` cron is set up, you'll have a Friday-morning email
summarising the week's spend per provider. If not, check each manually:

- Vercel — https://vercel.com/finns-projects-2deaa68c/usage
- Supabase — Project Settings → Usage
- Anthropic — https://console.anthropic.com/settings/billing
- Stripe — https://dashboard.stripe.com/balance (revenue side, irrelevant pre-launch)

Look for: weekly delta >50% vs last week, anything tracking toward a
quota cap. **The Vercel pause that broke crons in 04-16 was a billing
issue.** Don't let one happen again.

## Step 3 — Sentry sweep (5 min)

Open https://sentry.io. Filter:

- Environment: `production`
- Time: last 7 days
- Sort by: event count

Skim the top 10 issues. For each:

- **New / spiking issue**: investigate. Could be a real regression from
  this week's merges.
- **Known noise** (ResizeObserver, chunk-load errors): leave alone,
  they're filtered in `sentry.client.config.ts` `ignoreErrors` already.
- **CRON_GLOBAL_SILENCE**: this means `cron_run_log` is empty for >1h.
  See `docs/runbooks/cron-silence-alert.md` immediately.

If anything's actionable, file a queue item or open a PR. Don't fix
in-place during the ritual — that's a rabbit hole.

## Step 4 — Synthetic check (2 min)

If UptimeRobot is set up, open the dashboard. All checks should be green.
If anything's red, see step 3 (it'll likely be a Sentry issue too).

If UptimeRobot isn't set up, skip — but add it to the next-week plan in
step 6.

## Step 5 — Cron sweep (3 min)

Open Supabase SQL editor. Run:

```sql
SELECT
  name,
  status,
  max(started_at) AS last_run,
  count(*) FILTER (WHERE started_at > now() - interval '7 days') AS runs_last_7d
FROM cron_run_log
WHERE started_at > now() - interval '14 days'
GROUP BY 1, 2
ORDER BY last_run DESC;
```

Look for:

- **Any cron with `last_run` >2× cadence old** — investigate. Could be a
  silent failure.
- **Any `error` status entries** — open the row, read the
  `error_message`, decide if it's a real problem.
- **Empty result** — that's the cron silence pattern. See
  `docs/runbooks/cron-silence-alert.md`.

## Step 6 — Plan next week (7 min)

Open `docs/audits/LOOP_PROGRESS.md`. At the top, add a one-paragraph
weekly summary:

```markdown
## Week of YYYY-MM-DD

- Shipped: <stream>-<id>, <stream>-<id>, <stream>-<id> (≈N PRs)
- At risk next week: <thing>, <thing>
- Founder action needed: <item> by <date>
```

This becomes the durable record. In 6 months when someone (or you) asks
"what shipped in May?", this is where you look.

## What this ritual is NOT

- Not a code review session — that's the AI-review workflow's job. If
  you find yourself reading diffs line-by-line, stop and trust the AI
  review unless something looks genuinely concerning.
- Not a strategic planning session — separate calendar event for that,
  monthly.
- Not a deep-investigation session — if step 3 turns up something
  scary, file a queue item and address it Monday with fresh eyes.

## What to do if you skip a Friday

- One skip: catch up Saturday or Monday.
- Two skips: do a longer 60-min ritual the next Friday — go back 2
  weeks in the Sentry / cron sweeps.
- Three+ skips: assume something has rotted that you don't know about.
  Spend a full half-day re-establishing baseline.

## What to do if the ritual reveals a P0

- Stop the ritual.
- Run the relevant runbook in `docs/runbooks/`.
- If no runbook exists, write one *as you fix it* — that's how the
  runbook library grows.
