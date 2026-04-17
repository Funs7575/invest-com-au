# Launch day runbook

The hour-by-hour plan for going live. Print this. Have it open in a
second monitor. Do not improvise.

## T - 7 days

- [ ] All P1 launch issues closed in GitHub.
- [ ] Real Supabase staging credentials wired into CI; remove
      `continue-on-error` from Playwright job.
- [ ] External uptime monitor (BetterStack or UptimeRobot) configured
      against `/api/health`. Test the page-on-failure path with a
      forced 503.
- [ ] Sentry alert rules configured: error rate > 1% → Slack;
      error rate > 5% → page oncall.
- [ ] DMARC / SPF / DKIM verified for the sender domain. Run through
      mail-tester.com — score must be ≥ 9/10.
- [ ] Backup tested: restore the latest Supabase PITR snapshot to a
      throwaway project and verify queries return data.
- [ ] Real seed data review: every visible page has either real
      content or `noindex` in metadata.
- [ ] Customer support inbox (`hello@`, `support@`) goes to a real
      human and they're aware of launch.
- [ ] Status page published. Linked from the footer. URL communicated
      in launch comms.

## T - 24 hours

- [ ] DB connection limit checked on Supabase (Free tier = 60,
      Pro = 200). PgBouncer transaction pooler enabled if expecting
      bursts.
- [ ] Vercel Pro or higher confirmed (free tier hits function timeouts
      and has lower bandwidth limits).
- [ ] CDN cache warming script staged: hits the top 50 pages by
      expected traffic.
- [ ] Rollback plan reviewed (see `launch-rollback.md`). Everyone on
      the launch call has read it.
- [ ] Last `main` commit deployed to staging and smoke-tested.
- [ ] All env vars present in Vercel production project (compare
      against `.env.local.example`).
- [ ] PR queue frozen. No merges from now until T+24h.

## T - 1 hour

- [ ] Open in tabs: Vercel deployments, Sentry issues, Supabase
      dashboard, status page admin, Google Analytics realtime,
      BetterStack alerts.
- [ ] Slack #launch channel open. All hands present.
- [ ] DNS TTLs reduced to 60s (so we can reroute traffic fast if
      needed).
- [ ] Final Lighthouse run on top 5 pages. Document scores.

## T = 0 (launch)

- [ ] DNS cutover: `invest.com.au` A record → Vercel.
- [ ] First smoke test: hit homepage, /compare, /quiz from incognito
      and a phone. Pages load < 2s. No console errors.
- [ ] CDN warming: run the cache warmer script against production.
- [ ] Status page set to "Operational".
- [ ] Launch tweet / LinkedIn / Product Hunt sent.

## T + 5 minutes

- [ ] `/api/health` returning 200 for at least 3 consecutive polls.
- [ ] No P1 errors in Sentry.
- [ ] Realtime GA shows traffic.
- [ ] Form submission tested end-to-end (advisor lead, newsletter,
      quiz).

## T + 1 hour

- [ ] Sentry error rate < 1%.
- [ ] No 5xx spikes in Vercel logs.
- [ ] Support inbox checked — known issues triaged.
- [ ] First broker affiliate click recorded (smoke test the funnel).

## T + 4 hours

- [ ] Cron jobs verified: `/api/cron/heartbeat` running, attribution
      rollup ran, lead notifications fired.
- [ ] Email deliverability spot-checked (Gmail + Outlook inbox).
- [ ] Mobile experience reviewed by two team members on real devices.

## T + 24 hours

- [ ] DNS TTLs raised back to 3600s.
- [ ] Retro scheduled.
- [ ] PR queue thawed.
- [ ] Public stats: traffic, signups, errors, p95 latency. Posted to
      #launch.

## If something breaks

- **Page errors but most traffic OK** → triage in Sentry, hotfix PR.
- **Major outage** → execute `launch-rollback.md`. Don't debug in
  production. Roll back first, debug after.
- **Database issues** → escalate to Supabase support immediately.
  PITR is your friend.
- **Email bouncing** → check Resend dashboard for suppression list.
  Pause campaigns if bounce rate > 5%.
