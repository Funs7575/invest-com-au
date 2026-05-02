# Logging + Audit Trail Policy

**Owner:** Founder (Finn Dunshea)
**Last reviewed:** 2026-05-03
**Next review:** 2027-05-03 (annual)
**Maps to SOC 2 TSC:** CC7.2, CC7.3, CC7.4, CC8.1

## Purpose

Defines what invest.com.au logs, where it lives, who can access it, how long it's retained, and how it's used for security monitoring + audit. Required for SOC 2 Type II Common Criteria 7 (System Operations).

## Scope

Application logs, audit trails, security events, performance traces, and platform telemetry produced by:

- Next.js application (`lib/logger.ts`)
- API routes (`api_request_log` table)
- Admin actions (`admin_action_log` table)
- Cron jobs (`cron_run_log` table)
- Authentication attempts (`admin_login_attempts` table)
- Stripe webhooks (`stripe_webhook_events` table)
- CSP violations (`csp_violations` table)
- Sentry (errors + traces)
- Vercel platform logs

Does not apply to:
- Local development logs
- Runtime stdout/stderr from non-deployed code

## What gets logged — by category

### Security events

| Event | Where | Retention |
|---|---|---|
| Admin login attempt (success/fail) | `admin_login_attempts` | 1 year |
| Admin action (CRUD on PII / billing / verification) | `admin_action_log` | 7 years (AFSL audit trail) |
| MFA challenge result | `admin_login_attempts` | 1 year |
| Service-role usage (when not in expected route) | App log → Sentry | 90 days |
| Permission denial / RLS rejection | App log → Sentry (`PostgrestError` 42501) | 90 days |
| CSP violation | `csp_violations` | 30 days rolling |
| Rate-limit trigger | App log → Sentry | 90 days |

### Operational events

| Event | Where | Retention |
|---|---|---|
| API request (every route) | `api_request_log` | 90 days rolling |
| Cron job run (start, end, outcome) | `cron_run_log` | 90 days rolling |
| Stripe webhook (received, processing, done, failed) | `stripe_webhook_events` | 7 years (financial regulatory) |
| Resend email send (queued, sent, bounced) | `email_send_log` (TBD verify) | 1 year |
| Deploy event | Vercel platform | per Vercel retention |
| Database migration applied | `supabase_migrations` (Supabase-internal) | indefinite |

### Application errors + perf

| Event | Where | Retention |
|---|---|---|
| Unhandled exception | Sentry | 90 days (per Sentry plan) |
| Logged warning / error | Sentry + `lib/logger.ts` | 90 days |
| Performance trace | Sentry + Vercel Speed Insights | per vendor |
| Slow query | Supabase logs | per Supabase plan |

## What does NOT get logged

Explicitly excluded to minimise exposure:

- **Full request bodies on API routes carrying PII** — only metadata (route, status, latency, user_id when applicable)
- **Plaintext passwords / tokens** — never logged anywhere
- **Stripe payment instrument numbers** — Stripe handles PCI scope; we only log Stripe customer IDs
- **Magic link / OTP / reset tokens** — only their existence + outcome, never the token value
- **Full email body content** — only delivery metadata (recipient hash, template name, status)
- **User search queries containing PII** — anonymised to first 50 chars, PII patterns redacted

## Logging standards

### Application logs (`lib/logger.ts`)

- All app logs go through `lib/logger.ts` — never `console.*` (enforced by ESLint rule)
- Structured: every log has `level`, `event`, `context` fields
- Levels: `debug` / `info` / `warn` / `error` / `fatal`
- `error` and `fatal` automatically forward to Sentry
- Correlation ID (request-id stamped by `proxy.ts`) included in every log within a request

### Database tables

- Each log table has at minimum: `id`, `created_at`, `actor_id` (or `user_id` / `admin_email`), `event` / `action`, `context` (JSON)
- IP address logged where applicable for security tables
- User-agent logged where applicable

### Sentry config

- `sentry.client.config.ts` — browser errors, scrub PII via `beforeSend`
- `sentry.server.config.ts` — server errors, full stack
- `sentry.edge.config.ts` — middleware errors

PII scrubbing rules in `beforeSend`:

- Email addresses → `[REDACTED]`
- Phone numbers → `[REDACTED]`
- Stripe customer IDs → kept (not PII alone)
- User IDs → kept (pseudo-anonymous)

## Access controls on logs

### Who can read

| Log source | Tier 1 (Public) | Tier 2 (Authenticated) | Tier 3 (Advisor) | Tier 4 (Admin) | Tier 5 (System) |
|---|---|---|---|---|---|
| `admin_action_log` | ❌ | ❌ | ❌ | ✅ (own actions + read-only) | ✅ |
| `admin_login_attempts` | ❌ | ❌ | ❌ | ✅ | ✅ |
| `api_request_log` | ❌ | ❌ | ❌ | ✅ | ✅ |
| `cron_run_log` | ❌ | ❌ | ❌ | ✅ | ✅ |
| `stripe_webhook_events` | ❌ | ❌ | ❌ | ✅ | ✅ |
| `csp_violations` | ❌ | ❌ | ❌ | ✅ | ✅ |
| Sentry dashboard | ❌ | ❌ | ❌ | ✅ | n/a |
| Vercel platform logs | ❌ | ❌ | ❌ | ✅ (founder Vercel auth) | n/a |

All Tier 4 access is itself logged in `admin_action_log` (when the admin reads PII-bearing logs).

### Who can write

- Application code via `lib/logger.ts` and direct `INSERT` to log tables (with appropriate RLS)
- No human-direct writes to log tables — log entries are immutable from the human surface

### Who can delete

- **Nobody manually.** Deletion is via the retention cron, which is itself logged.
- Tampering risk: log table `DELETE` policy is `service_role` only; no admin user can delete arbitrary rows
- Supabase Postgres audit can detect direct DB writes outside the migration trail (covered by Q-12 secret rotation log)

## Tamper-resistance

For SOC 2 CC7.2:

- All log tables have `created_at` indexed and `NOT NULL` defaults to `now()`
- No `UPDATE` policy on log tables — entries are append-only from RLS perspective
- Schema migrations changing log structure require Tier C review per change-management-policy
- Backup includes log tables; restore from backup would re-create historical log
- Service-role writes are auditable via Supabase's own audit log

What this does NOT prevent:

- Service-role-level deletion (an attacker with the key can erase logs)
- This is mitigated by: secret rotation cadence, MFA on Supabase dashboard, audit of `SUPABASE_SERVICE_ROLE_KEY` access

## Monitoring + alerting

| Pattern | Threshold | Where alerted |
|---|---|---|
| Sentry error rate | > 1% / 5min window | Slack |
| Sentry error rate | > 5% / 5min window | Page (PagerDuty / phone) |
| Failed admin login bursts | > 5 failures from same IP / hour | App log → manual review (cadence above) |
| CSP violation spike | > 10 unique violation reports / hour | App log → manual review |
| Stripe webhook stale | `processing` status > 5 min | Health endpoint surfaces; runbook `stripe-webhook-stuck.md` |
| Cron job missed | No `cron_run_log` entry within expected interval | Health endpoint surfaces; runbook `cron-stuck.md` |
| RLS rejection spike (`42501`) | > 50 / 5min window | Sentry — possible attack pattern |
| Loop spend daily | > 40 commits → warn, > 80 → critical | `[ACTION REQUIRED]` GitHub issue |

## Review cadence

- **Daily:** Sentry triage (founder reviews new issues)
- **Weekly:** Founder reviews `admin_action_log` for unexpected actions
- **Monthly:** Founder reviews `admin_login_attempts` for failed-attempt patterns; reviews CSP violations
- **Quarterly:** Founder reviews retention compliance — confirm rolling-window tables are pruning
- **Annual:** This policy reviewed; thresholds adjusted based on observed traffic

## Compliance evidence

For SOC 2 audit:

- Sample log entries demonstrating each event type captured
- Retention cron logs proving rolling-window enforcement
- Sentry dashboard access showing alert rules active
- Sample Sentry issue with PII scrubbed (proves `beforeSend` filter works)
- `admin_action_log` query showing 7-year retention floor
- Sample of stale-cron alert firing (proves health endpoint catches missed jobs)

## Gaps and remediation

| Gap | Status | Tracking |
|---|---|---|
| `email_send_log` table existence + retention | Unverified | Add to next quarterly review |
| Supabase Postgres audit log review cadence | No formal cadence | Add to access-review template |
| Log retention cron for rolling-window tables | Unverified at present | Verify exists + alert if missed |
| Sentry beforeSend PII scrubbing test coverage | Unverified | Add unit test |

## References

- `lib/logger.ts` — structured logging primitives
- `proxy.ts` — request-id stamping
- `sentry.{client,server,edge}.config.ts` — error tracking config
- `docs/compliance/access-control-policy.md` — who can read logs
- `docs/compliance/data-classification.md` — log retention by tier
- `docs/runbooks/breach-notification.md` — log forensics on incident
