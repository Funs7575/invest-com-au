# Manual ops during the AI pause

> **Context:** AI surface (n8n agents + AI-facing routes) is deferred to
> post-launch per the 2026-04-28 founder decision. This doc lists the
> work the dormant agents would otherwise do and how a human covers
> each one during the launch window. Companion docs:
> `docs/audits/ENTERPRISE_STANDARD.md` (AI-surface header) and
> `docs/audits/REMEDIATION_QUEUE.md` (V-NEW-02 deferred entry).
>
> **Reactivation plan:** when AI features come back, walk this checklist
> in reverse — for each item below, re-enable the n8n workflow that
> automated it, run it in shadow mode for 1 week, compare against the
> manual log, then retire the manual step.

## Scope

The following six n8n workflows are `active: false` and stay that way
through the launch window:

| Workflow | What it would do | Manual replacement (this doc) |
|---|---|---|
| `overseer_hourly` | Hourly health snapshot of the agent system | None — the human-facing `/admin/automation` dashboard covers this |
| `cto_daily` | Once-a-day digest of `agent_logs` errors/warnings, classified by Claude | §1 Daily ops digest |
| `editorial_publish_gate` | Tier-2 review pass on newly-drafted articles before they go live | §2 Editorial publish gate |
| `analytics_daily` | Daily roll-up of yesterday's traffic + funnels into `agent_logs` | §3 Analytics daily |
| `lead_nurture_hourly` | Hourly check on leads that have stalled; sends nurture emails | §4 Lead nurture |
| `advisor_onboarding` | Walks new advisors through document submission + KYC steps | §5 Advisor onboarding |

In addition, two AI-facing user routes stay behind a feature flag:

- `app/api/concierge/route.ts` (consumer chatbot)
- `app/api/admin/ai-chat/route.ts` (admin assistant)

See §6 for what to do with the UI entry points that pointed at them.

---

## §1 Daily ops digest

**What the agent did:** read `agent_logs` (errors/warnings) and
`agent_tasks` (failed/blocked) for the last 24h, asked Claude to classify
severity and suggest follow-ups, wrote a single `agent_logs` row tagged
`agent_name='cto'`.

**Manual replacement:** every weekday morning, ~10 minutes:

1. Open Sentry → filter to last 24h, environment `production`, level
   `error`. Skim the top issues by event count.
2. Open `/admin/automation` → look for any red tile (cron staleness,
   webhook failure rate, etc.).
3. Open Supabase → `cron_run_log` query:
   ```sql
   SELECT name, status, count(*)
   FROM cron_run_log
   WHERE started_at > now() - interval '24 hours'
   GROUP BY 1, 2
   ORDER BY 1, 2;
   ```
4. If anything looks off, open the relevant runbook in `docs/runbooks/`.
5. Note anything actioned in the founder's daily log (no specific
   format required — this is just so the next morning's check has
   continuity).

**Skip days:** weekends OK to skip if no PagerDuty page fired.

## §2 Editorial publish gate

**What the agent did:** scanned articles transitioning `status='draft'
→ 'published'` for tier-2 review issues (compliance copy, missing
disclosures, factual claims without `<DatedStatBadge>`, broken
internal links).

**Manual replacement:** before flipping any article to `published`:

1. Run `npm run audit:stale-dated-stats` locally — fails the build if
   any `<DatedStatBadge stalesAt>` is past today.
2. Eyeball the article for:
   - General-advice warning present where required (per
     `lib/compliance.ts` constants).
   - AFCA / AFSL disclosure block present at the bottom.
   - Author by-line uses an entity-pseudonymous editorial persona, not
     a real person (per CL-03).
   - No founder PII anywhere in the rendered output (run the CL-09
     anonymity stress test if the article touches the founder's name
     directly).
3. If the article cites stats or rates, every claim should be wrapped
   in `<DatedStatBadge dataAsOf= stalesAt=>`.
4. If it passes, flip status. If not, leave it draft and fix.

## §3 Analytics daily

**What the agent did:** wrote a daily-rollup row to `agent_logs` with
yesterday's PostHog event counts, funnel conversion rates, and any
notable deltas.

**Manual replacement:** weekly is enough during the launch window
(daily is overkill while traffic is pre-launch low).

1. Open `/admin/code-quality` — the dashboard shows the current
   week's metric snapshot vs. last week's.
2. Open PostHog dashboard → "Last 7 days" view. Note any funnel
   step where conversion dropped >20% week-over-week.
3. If a drop, open the funnel breakdown by source (organic /
   referral / direct) to localise it.
4. Log notable findings in a weekly note (founder's Notion or
   equivalent — no specific tool prescribed).

## §4 Lead nurture

**What the agent did:** hourly check for leads in `leads` table where
`created_at > 24h ago` and `status IN ('new','contacted')` and no
follow-up in 24h. Sent a nurture email via Resend.

**Manual replacement:** twice daily (morning + late afternoon),
~5 minutes each:

1. Supabase query:
   ```sql
   SELECT id, lead_type, advisor_id, created_at, status
   FROM leads
   WHERE status IN ('new', 'contacted')
     AND created_at < now() - interval '24 hours'
     AND created_at > now() - interval '7 days'
   ORDER BY created_at ASC
   LIMIT 50;
   ```
2. For each row that looks stale, either:
   - Bump status to `nurture_sent` and trigger a manual nurture email
     via the admin UI, OR
   - Mark `status='dropped'` if the lead is genuinely cold.
3. If the queue is consistently >20 rows, that's a signal that lead
   volume is outpacing manual capacity — escalate the AI reactivation
   timeline.

## §5 Advisor onboarding

**What the agent did:** walked new advisors through KYC + document
submission + agreement-signing steps via templated emails triggered by
status transitions in the `advisor_applications` table.

**Manual replacement:** daily check, ~15 minutes:

1. Supabase query:
   ```sql
   SELECT id, email, status, created_at, updated_at
   FROM advisor_applications
   WHERE status NOT IN ('approved', 'rejected', 'withdrawn')
     AND updated_at < now() - interval '24 hours'
   ORDER BY updated_at ASC;
   ```
2. For each row, check what step they're stuck on:
   - `pending_kyc` → manually email asking for KYC docs.
   - `pending_agreement` → manually email the agreement link.
   - `pending_review` → triggers a founder review action (no email
     needed, just don't let it sit >48h).
3. Document the action in `admin_action_log` so the audit trail is
   preserved.

## §6 AI-facing UI entry points

The following routes stay live but should return a 503 or a friendly
"coming soon" response while the AI surface is paused:

- `app/api/concierge/route.ts` — consumer chatbot. Recommend: gate
  with a `FEATURE_AI_CONCIERGE_ENABLED` env var that defaults to
  false; when false, return a 503 with `{ error: "AI concierge is
  temporarily unavailable. Please use the contact form below." }`
  and don't attempt the Anthropic call (saves spend).
- `app/api/admin/ai-chat/route.ts` — admin assistant. Same pattern,
  different env var (`FEATURE_AI_ADMIN_CHAT_ENABLED`).

UI components that link to these:

- Any "Ask the concierge" CTA on hub pages → hide or replace with the
  contact form CTA.
- Any chatbot widget → don't render when the env var is off.
- Admin sidebar "AI assistant" link → hide.

**The actual feature-flag wire-up is a small follow-up PR — track as
queue item TBD.** This doc is descriptive; the code change is the
implementation step.

## §7 Reactivation checklist (post-launch)

When the AI surface comes back online:

1. Set the two feature flags to `true` in Vercel env.
2. Re-deploy production (this also re-pins Vercel cron — see
   `docs/runbooks/cron-silence-alert.md` §3).
3. Activate one n8n workflow at a time, in this order: `analytics_daily`
   first (lowest risk, no user-facing output) → `cto_daily` →
   `editorial_publish_gate` → `lead_nurture_hourly` → `advisor_onboarding`
   → `overseer_hourly` (highest risk, runs hourly).
4. For each: run in shadow mode for 1 week (compare its output to the
   manual log from this doc), then retire the corresponding manual step.
5. Once all six are live and verified, walk back through
   `ENTERPRISE_STANDARD.md` and remove the AI-surface "deferred" header,
   re-enable the V-NEW-02 CI gate, and unblock the CC-* stream in
   `REMEDIATION_QUEUE.md`.

## Related

- `docs/audits/ENTERPRISE_STANDARD.md` — AI-surface rubric (deferred during launch).
- `docs/audits/REMEDIATION_QUEUE.md` — V-NEW-02 (deferred-post-launch).
- `docs/audits/2026-04-26-comprehensive-audit.md` — Sprint 4 (revised 2026-04-28).
- `docs/runbooks/cron-silence-alert.md` — what to do if the manual checks surface a cron stoppage.
- `docs/ops/n8n-phase1-overseer.md`, `docs/ops/n8n-phase2-*.md` — per-workflow runbooks (read these before reactivation).
