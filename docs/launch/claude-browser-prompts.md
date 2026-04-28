# Master Claude Browser prompts

> Browser-automation prompts for the trajectory items I (Claude Code) can't
> do because they live behind logins or in dashboards. Open
> [claude.ai](https://claude.ai) with the Computer Use / browser agent
> enabled, paste the relevant prompt, and supervise as it goes. Each
> prompt below is self-contained — copy, paste, run.
>
> **Before any of these:** make sure you're logged into the relevant
> service in your browser session. The agent uses your active session;
> it can't authenticate for you.
>
> **Cost note:** browser-agent runs cost compute. Each prompt below is
> sized to take 5–30 minutes of supervised browser time.

---

## Prompt 1 — Sign up for UptimeRobot + configure synthetic monitors

**Prerequisites:** none. The agent will create a fresh account.

**Paste this into Claude Browser:**

```
You are setting up free-tier synthetic monitoring for invest-com-au.

GOAL: by the end, I should have an UptimeRobot account with 6 monitors
running every 5 minutes, alerting to my email on failure.

STEPS:

1. Go to uptimerobot.com and create a free account using the email
   I provide when you ask. Use a strong password and write it down at
   the end.

2. Verify the email if needed.

3. In the UptimeRobot dashboard, create the following 6 HTTPS monitors.
   For each: type = "Keyword", interval = 5 minutes, alert contact = the
   default email contact. Use the keyword check to assert specific text
   in the response.

   Monitor 1: "Homepage"
     URL: https://invest.com.au/
     Keyword: <html
     Keyword type: exists

   Monitor 2: "Sitemap"
     URL: https://invest.com.au/sitemap.xml
     Keyword: <urlset
     Keyword type: exists

   Monitor 3: "Robots"
     URL: https://invest.com.au/robots.txt
     Keyword: User-agent
     Keyword type: exists

   Monitor 4: "Advisor search"
     URL: https://invest.com.au/advisors/search
     Keyword: <html
     Keyword type: exists

   Monitor 5: "Health endpoint"
     URL: https://invest.com.au/api/health
     Keyword: ok
     Keyword type: exists

   Monitor 6: "OG image fallback"
     URL: https://invest.com.au/opengraph-image
     Type: HTTP(s) (no keyword check; rely on 200 status)

4. Confirm all 6 monitors show "Up" status before finishing.

5. Test the alert path: pause one monitor, wait for the email alert
   to confirm delivery, then unpause. (If the free tier doesn't allow
   pausing, skip this step.)

6. Report back to me: the account email, the 6 monitor IDs, and any
   issues you hit.

If you hit a paywall or limit, stop and tell me — don't pay for an
upgrade without my approval.
```

---

## Prompt 2 — Enable Vercel rolling deployment (production canary)

**Prerequisites:** logged into Vercel as the project owner of `invest-com-au`.

**Paste this into Claude Browser:**

```
You are configuring a rolling deployment for invest-com-au on Vercel
to add a production canary safety net.

GOAL: every production deploy should send 10% of traffic to the new
deployment for 1 hour, then promote to 100% if no rollback is
triggered.

STEPS:

1. Go to vercel.com and confirm you are logged in as the project owner.

2. Open the invest-com-au project at
   vercel.com/finns-projects-2deaa68c/invest-com-au.

3. Navigate to Settings → Deployments → Rolling Releases (or
   "Deployment Protection" / "Production Rollout" depending on the
   current Vercel UI).

4. Enable rolling deployments with these settings:
   - Initial traffic: 10%
   - Stage duration: 1 hour
   - Auto-promote on success: yes
   - Rollback condition: error rate > 5% over 10 minutes (if Vercel
     exposes this; otherwise default)

5. Save the configuration.

6. Confirm the next production deploy will use these settings by
   triggering a redeploy of the latest production deploy and watching
   the Deployments tab show the rolling progression.

7. Report back: the exact configuration you applied, and whether the
   redeploy succeeded.

If Vercel charges for this feature on the current plan, stop and
tell me — don't upgrade the plan without my approval.
```

---

## Prompt 3 — Install CodeRabbit on the repo (free tier)

**Prerequisites:** logged into GitHub as the owner of `Funs7575/invest-com-au`.

**Paste this into Claude Browser:**

```
You are installing the CodeRabbit GitHub App on the invest-com-au repo
as a third opinion on PR reviews (alongside the existing Claude AI
review).

GOAL: every new PR gets a CodeRabbit comment with line-level
suggestions, on top of what we already have.

STEPS:

1. Go to github.com/marketplace/coderabbitai

2. Click "Set up a plan" and choose the FREE plan. Stop and tell me if
   the free plan doesn't exist — don't sign up for paid.

3. Install on Funs7575/invest-com-au only (NOT all repositories — be
   explicit about this when GitHub asks for repo selection).

4. Once installed, go to https://app.coderabbit.ai or wherever
   CodeRabbit's settings dashboard is, and:
   - Set review mode to "auto"
   - Disable verbose review summaries (we have our own AI review;
     don't duplicate)
   - Enable line-level inline suggestions only

5. Confirm by checking github.com/Funs7575/invest-com-au/settings/installations
   that CodeRabbit shows up under installed apps.

6. Report back: confirmation of install + any settings you changed.

If you hit a payment screen or a "request a demo" gate at any step,
stop and tell me.
```

---

## Prompt 4 — Capture press-kit screenshots from the preview deploy

**Prerequisites:** the Vercel preview URL works. (Get the latest preview URL from a recent PR — they look like `invest-com-au-git-main-finns-projects-2deaa68c.vercel.app`.)

**Paste this into Claude Browser:**

```
You are capturing screenshots for the invest-com-au pre-launch press
kit.

GOAL: 8 high-quality screenshots saved to local files, ready to email
to journalists or partners. Each at 1920x1080 viewport, full-page where
the page is taller than that.

STEPS:

1. Open the preview URL I provide. Set browser viewport to 1920x1080.

2. Take screenshots of these 8 pages:
   Screenshot 1: homepage (full-page)
   Screenshot 2: /advisors/search (just the above-the-fold)
   Screenshot 3: an article page — pick the most visually polished one
                 from the homepage's "latest articles" section
                 (full-page)
   Screenshot 4: a calculator — use whatever calculator is most prominent
                 on the homepage (just the calculator UI, not the lead form)
   Screenshot 5: the "best for" hub page if visible from nav
                 (above-the-fold)
   Screenshot 6: the broker comparison page (above-the-fold)
   Screenshot 7: a quiz / lead-capture form mid-flow (no real PII —
                 use placeholder values)
   Screenshot 8: any chart or data-visualization page

3. Save each as PNG with descriptive filenames:
   01-homepage.png, 02-advisor-search.png, etc.

4. Report back: the 8 filenames + a one-line description of each.

If a page is broken (404, 5xx, or visually messed up), skip it and
tell me which one.
```

---

## Prompt 5 — Fetch current monthly costs from each provider

**Prerequisites:** logged into Vercel, Supabase, and Anthropic in the same browser session.

**Paste this into Claude Browser:**

```
You are pulling current monthly billing data from invest-com-au's
infrastructure providers so I can do a year-1 cost forecast.

GOAL: a markdown table I can copy-paste into a doc, showing this
month's spend per provider plus 3-month trend if visible.

STEPS:

1. Vercel — go to vercel.com/finns-projects-2deaa68c/usage. Note:
   - Current month spend (USD)
   - Last month spend (USD)
   - Bandwidth used + remaining
   - Function invocations used + remaining
   - Any line item showing as a percentage of plan cap

2. Supabase — go to supabase.com → invest-com-au project → Settings →
   Usage. Note:
   - Current month database size (GB) and quota
   - Current month transfer (GB) and quota
   - Auth MAU (monthly active users)
   - Storage GB

3. Anthropic — go to console.anthropic.com/settings/usage. Note:
   - Current month spend (USD)
   - Last month spend (USD)
   - Daily spend trend over last 30 days (high-level: stable / growing
     / spiky)

4. Compile into this markdown table:

   | Provider | This month | Last month | % of plan cap | Notes |
   |---|---:|---:|---:|---|
   | Vercel | $X | $Y | Z% | … |
   | Supabase | $X | $Y | Z% | … |
   | Anthropic | $X | $Y | n/a | … |
   | Stripe | (skip — pre-launch, no fees) | | | |

5. Also note: any provider where current month is >50% above last
   month (sign of unexpected growth or a leak).

6. Report back the full table.

Do NOT take any action on the dashboards — read-only. Don't change
plans, don't add team members, don't generate invoices.
```

---

## Prompt 6 — Quick-run the Friday ritual

Run this every Friday morning if you don't want to do the ritual
manually. Lower-leverage than doing it yourself (you lose the "feel" of
the codebase) but acceptable as a backup.

```
You are running the Friday 30-minute ritual for invest-com-au, defined
in docs/runbooks/friday-ritual.md. Open that file and follow it step
by step. Report back at the end with:

- How many PRs you merged via auto-merge-safe label
- Any cost anomalies (>50% week-over-week)
- Top 3 Sentry issues by event count + your judgement of whether each
  is real or noise
- Whether the synthetic monitors are all green
- Result of the cron sweep SQL query
- Three sentences of "what's at risk next week"

Add the weekly summary entry to docs/audits/LOOP_PROGRESS.md per the
ritual's step 6, then open a small PR with that one-line addition.

Stop and ask if you hit anything ambiguous — don't merge anything you
think might break production, don't close any PRs without my OK.
```

---

## Tips for using these prompts

1. **Always supervise.** Browser agents make mistakes; eyeball what
   they're doing in another tab.
2. **Pre-clear the way.** Before pasting, log into the service in a
   browser tab so the agent can use your session cookie.
3. **Stop on payment screens.** All prompts above tell the agent to
   stop on paywalls. Trust but verify.
4. **Read the report-back.** Each prompt ends with "report back to me"
   — paste the report back into Claude Code so I can act on the
   results.

## What's NOT in this doc

These items genuinely need a human, not an agent:

- **AFSL compliance consult** — find a real consultant, real
  conversation. No agent can do this.
- **Logo / demo video commission** — design judgement + Adobe / Figma
  / video editor. Out of scope.
- **ACL paperwork progress meeting** — your dad and you, weekly. The
  tracker template (`docs/launch/acl-paperwork-tracker.md`) is what
  I built; the meeting itself is yours.

## Related

- `docs/runbooks/friday-ritual.md` — the weekly discipline
- `docs/architecture/overview.md` — the bus-factor backstop
- `docs/launch/manual-ops-during-ai-pause.md` — what the dormant n8n
  agents would otherwise do
- `docs/launch/acl-paperwork-tracker.md` — the paperwork tracker
