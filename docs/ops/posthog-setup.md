# PostHog — product analytics + Supabase mirror

## Why we use PostHog

PostHog is the funnel tool for invest.com.au. It owns:

1. **Page-level funnel analysis** — drop-off between homepage → quiz start → quiz complete → advisor view → advisor contacted → lead submitted. The 5 manually-captured events below are the backbone.
2. **Conversion optimisation experiments** — A/B test CTAs + quiz variants against PostHog's feature-flag + experiments module. (Not yet wired; future work.)
3. **Data source for Phase 3 agents** — the future Agent #09 Growth workflow will read the same events (via Supabase mirror) for regression detection and CTA experimentation. PostHog's own ingestion is the source of truth; Supabase `posthog_events_mirror` is a queryable copy so n8n / internal tools can JOIN against platform data.

Project is on PostHog **EU cluster** (not US) — required for AU privacy posture. Host `https://eu.i.posthog.com`, project `165571`.

## User action checklist (before this PR unlocks value)

These are the one-off setup steps a human must do. Claude can't reach Vercel env vars or PostHog destination config.

### 1. Vercel env vars (3 vars)

Go to [project settings → env vars](https://vercel.com/finns-projects-2deaa68c/invest-com-au/settings/environment-variables) and add:

| Name | Value | Environments |
|---|---|---|
| `NEXT_PUBLIC_POSTHOG_KEY` | `phc_...` from [PostHog project vars](https://eu.posthog.com/project/165571/settings/project#variables) | all |
| `NEXT_PUBLIC_POSTHOG_HOST` | `https://eu.i.posthog.com` | all |
| `POSTHOG_API_KEY` | same `phc_...` as above (server-side reuse) | all |
| `POSTHOG_WEBHOOK_SECRET` | generate a random string: `openssl rand -hex 32` | all |

Redeploy — the next Vercel build will ship PostHog to browsers.

### 2. PostHog webhook → Supabase Edge Function

Create a destination in PostHog that POSTs events to our Supabase Edge Function so they land in `posthog_events_mirror`.

In the PostHog UI:

1. Data pipeline → Destinations → **New destination** → **Webhook**.
2. URL: `https://guggzyqceattncjwvgyc.supabase.co/functions/v1/posthog-webhook-ingest`
3. Headers: add `X-PostHog-Webhook-Secret` = the same `POSTHOG_WEBHOOK_SECRET` value you set in Vercel.
4. Event filter: restrict to the 5 captured events to avoid quota burn:
   - `quiz_started`
   - `quiz_completed`
   - `advisor_viewed`
   - `advisor_contacted`
   - `lead_submitted`
   - (and `$pageview` if you want pageview funnel analysis in Supabase)
5. Payload format: default JSON (the Edge Function accepts `{ event: {...} }` or `{ events: [...] }`).

### 3. Supabase Edge Function secrets

The Edge Function needs `POSTHOG_WEBHOOK_SECRET` to validate the header. Set it on the Supabase project:

```bash
supabase secrets set POSTHOG_WEBHOOK_SECRET="<the same value you used in Vercel + PostHog>" \
  --project-ref guggzyqceattncjwvgyc
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are already set by default on all Supabase Edge Functions.

## Event catalog

All 5 events are typed in `lib/posthog/events.ts`. The `trackEvent` helper is type-safe — `trackEvent('advisor_viewed', {...})` is checked against `EventProps['advisor_viewed']` at compile time.

| Event | Where it fires | Properties |
|---|---|---|
| `quiz_started` | First answer click in `app/quiz/page.tsx` → `handleAnswer` | `quiz_type` · `source_page` |
| `quiz_completed` | Completion `useEffect` in `app/quiz/page.tsx` | `quiz_type` · `time_taken_seconds` · `selected_advisor_type` · `budget_range` · `risk_profile` · `top_match_slug` · `match_count` |
| `advisor_viewed` | Mount `useEffect` in `app/advisor/[slug]/AdvisorProfileClient.tsx` | `advisor_id` · `advisor_name` · `advisor_type` · `firm` · `city` |
| `advisor_contacted` | Post-success branch of `handleSubmit` in `AdvisorProfileClient.tsx` | `advisor_id` · `contact_method` · `source_section` |
| `lead_submitted` | **Server-side** `app/api/advisor-lead/route.ts` after DB insert, via `posthog-node` | `lead_source` · `advisor_match_count` · `quiz_completed` · `utm_source` · `utm_campaign` |

**PII policy**: no names, no emails, no phone numbers in event properties. `advisor_name` is public advisor-directory data (the same name that appears on the page), not a user's name. `distinct_id` is either PostHog's anonymous cookie id (browser events) or a random UUID (server-side events without a cookie).

## Where to see data

- **PostHog**: https://eu.posthog.com/project/165571 — Events, Insights, Funnels, Dashboards.
- **Supabase mirror**:
  ```sql
  select event_name, count(*) as events_d1
  from public.posthog_events_mirror
  where event_timestamp >= now() - interval '24 hours'
  group by event_name
  order by events_d1 desc;
  ```
- **Daily funnel view**: `select * from public.posthog_daily_funnel order by day desc limit 30;`

## Troubleshooting

### "Events not showing up in PostHog"

1. Check browser devtools → Network tab → search for `i.posthog.com`. Requests should be 200/204.
2. If no requests: `NEXT_PUBLIC_POSTHOG_KEY` is probably missing. `lib/posthog/client.ts` no-ops when the env is absent (graceful degradation) — so the app doesn't crash, but no events fire. Fix: set the env in Vercel + redeploy.
3. If requests are 401/403: wrong project key. Check https://eu.posthog.com/project/165571/settings/project#variables against the Vercel env.

### "Events in PostHog but not in Supabase mirror"

1. Check Supabase Edge Function logs: `supabase functions logs posthog-webhook-ingest --project-ref guggzyqceattncjwvgyc`.
2. 401 responses = `POSTHOG_WEBHOOK_SECRET` mismatch between PostHog webhook config and Supabase secrets.
3. 500 responses = check the error body; most likely the `posthog_events_mirror` unique index on `posthog_event_id` is missing (re-apply the mirror migration).
4. 200 with `inserted: 0` = event payload had an empty `events` array.

### "Session recording quota burn"

We explicitly set `disable_session_recording: true` in `lib/posthog/client.ts`. If anyone flips it on:
- PostHog quota ≈ 5k recordings/mo free tier — will blow through in hours with normal traffic.
- Leave disabled unless there's a specific user-behaviour debug need.

### "Server-side event missing distinct_id"

Client must pass `distinct_id: posthog.get_distinct_id()` in the POST body. If omitted, the server falls back to a random UUID per request — the event won't be associated to the person's other events. To fix, include the helper `getDistinctId()` from `lib/posthog/events.ts` in the request payload.

## Related / future work

- **Agent #09 Growth** (Phase 3 workflow, not yet shipped) will read from `posthog_events_mirror` + `posthog_daily_funnel` to detect CTA regressions, surface A/B test winners, and feed recommendations to `revenue_opportunities`.
- **Agent #41** (future) will stitch PostHog events with Supabase platform-state rows for longitudinal cohort analysis.
- The `autocapture: true` default in `lib/posthog/client.ts` auto-captures clicks + pageviews. Custom events above are additive, not replacing — some overlap is intentional for redundancy.
- The existing `lib/tracking.ts` → `/api/track-event` layer remains as a redundant internal log trail (independent of PostHog). Don't remove.
