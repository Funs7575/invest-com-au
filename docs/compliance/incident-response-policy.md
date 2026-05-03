# Incident Response Policy

**Owner:** Founder (Finn Dunshea)
**Last reviewed:** 2026-05-02
**Next review:** 2027-05-02 (annual)
**Maps to SOC 2 TSC:** CC7.3, CC7.4, CC7.5, A1.3

## Purpose

Defines how invest.com.au identifies, triages, communicates, and resolves operational and security incidents. Wraps the per-incident runbooks in `docs/runbooks/` into a top-level policy that an auditor can review.

## Scope

Applies to:
- Production outages (full or partial site unavailability)
- Security incidents (suspected breach, leaked credentials, abuse patterns)
- Data integrity incidents (corruption, accidental deletion, backup loss)
- Compliance incidents (PII exposure, regulatory deadline missed, AFSL violation)
- Cron job failures with downstream impact
- Vendor outages affecting our service (Stripe, Resend, Supabase, Vercel)

## Severity classification

Per `docs/ops/severity-matrix.md`. Each incident is classified at detection and re-evaluated as new information arrives.

| Level | Definition | Acknowledge | Resolve |
|---|---|---|---|
| **P0** | Site unusable for most visitors, OR data being lost, OR money moving incorrectly, OR confirmed security/PII incident | ≤ 15 min | ≤ 4 hrs |
| **P1** | Critical flow broken for a subset, no public outage; or P0 mitigated but root cause unknown | ≤ 1 hr | ≤ 24 hrs |
| **P2** | User-visible bug; workaround exists; not blocking onboarding or money | ≤ 1 day | ≤ 1 week |
| **P3** | Polish; low-priority improvement; no user impact | best effort | best effort |

When in doubt, classify one level higher. Downgrade once blast radius is known.

## Detection sources

Incidents are detected via:

| Source | What it catches | Where signal lands |
|---|---|---|
| Sentry | App errors, unhandled exceptions, performance regressions | Sentry dashboard → Slack alert (>1% error rate), page (>5%) |
| External uptime monitor | HTTP 5xx, DNS failures, SSL expiry | PagerDuty / phone call |
| Cron heartbeat (`cron_run_log`) | Stale or failing cron jobs | Health endpoint surfaces as P1 |
| User-facing error tracking | Forum/email reports, support tickets | `bug_reports` table |
| Health endpoint (`/api/health`) | DB ping, cron heartbeat, env check | Uptime monitor checks every minute |
| CI on main | Build/test failures post-merge | Auto-revert workflow (`main-ci-auto-revert.yml`) |
| CSP violation reports | Browser-side security policy violations | `csp_violations` table |
| Stripe webhook backlog | Failed payment processing | `stripe_webhook_events` with `processing` status > X min |
| Vercel deploy state | Build failures, ERROR state on production deploy | Vercel notifications |
| Auto-loop spend tracker | Anomalous loop activity | `[ACTION REQUIRED]` GitHub issue |

## Response procedure

### 1. Acknowledge (within target time per severity)

Founder (or designated on-call):

1. Confirm receipt — reply to alert in Slack / acknowledge PagerDuty / comment on GitHub issue
2. Open or join an incident tracking thread
3. Set initial severity classification

### 2. Triage

1. Identify scope: which users / which feature / which time window
2. Stop the bleed: kill switch via `/admin/automation/kill-switch` if cron-related; feature flag rollback via `feature_flags` table; deploy rollback via Vercel UI if recent deploy is suspect
3. Classify final severity based on confirmed scope

### 3. Communicate (P0/P1)

| Audience | When | Channel | Owner |
|---|---|---|---|
| Affected users (P0) | ≤ 1 hr after acknowledge | Status page banner + email if subscribed | Founder |
| All users (P0) | ≤ 4 hrs | Status page + homepage banner | Founder |
| Regulators (PII breach) | ≤ 72 hrs | OAIC notification per `docs/runbooks/breach-notification.md` | Founder + legal |
| Stripe (financial incident) | Immediately | Stripe dashboard support ticket | Founder |

### 4. Resolve

Per the relevant runbook:

| Incident type | Runbook |
|---|---|
| Stripe webhook stuck | `docs/runbooks/stripe-webhook-stuck.md` |
| Resend rate-limited | `docs/runbooks/resend-rate-limited.md` |
| Email deliverability degraded | `docs/runbooks/email-deliverability.md` |
| Cron stuck or silent | `docs/runbooks/cron-stuck.md`, `cron-silence-alert.md` |
| Database needs rollback | `docs/runbooks/database-rollback.md` |
| Confirmed breach / PII exposure | `docs/runbooks/breach-notification.md` |
| Read-replica failure | `docs/runbooks/read-replica-failure.md` (Q-06, pending) |
| Stripe account locked / MFA reset | `docs/runbooks/stripe-account-recovery.md` (Q-03, pending) |
| Resend domain verification lost | `docs/runbooks/resend-account-recovery.md` (Q-04, pending) |
| Vercel team SSO break / billing locked | `docs/runbooks/vercel-team-recovery.md` (Q-05, pending) |
| Leaked credential in git history | `docs/runbooks/security-breach-git.md` (Q-09, pending) |
| AFSL revocation incident | `docs/runbooks/acl-revocation.md` (Q-10, pending) |
| ASIC / OAIC subject-access request | `docs/runbooks/regulatory-data-request.md` (Q-08, pending) |
| Stripe webhook backlog requiring manual replay | `docs/runbooks/stripe-webhook-backlog.md` (Q-07, pending) |

If no runbook exists for the incident type: founder improvises, then writes a new runbook within 7 days as the post-mortem deliverable.

### 5. Post-mortem

For every P0 and significant P1:

1. Within 7 days, open `docs/incidents/<YYYY-MM-DD>-<slug>.md`
2. Sections: Timeline (UTC), Impact (users affected, dollars at risk), Root cause, Resolution, Prevention (specific items added to `docs/audits/REMEDIATION_QUEUE.md`)
3. Blameless tone: focus on system gaps, not human error
4. Quarterly review: founder reads all post-mortems from past 90 days, updates this policy if patterns emerge

## Roles

| Role | Responsibility |
|---|---|
| Founder | First responder, decision authority, comms owner — solo until further notice |
| External advisors | Available on-call for legal (Privacy Act, AFSL), security (pen-tester contacts), or regulatory escalation |
| Vendors | Stripe support (tier-2 for financial), Supabase support (tier-1 for infra), Resend support (deliverability) |

In a multi-person org this would split into IC, Comms Lead, Scribe, Subject-Matter Expert. Solo for now; recorded here so the gap is visible to auditors.

## Communication templates

Status page initial post (P0):
> We're investigating an issue affecting [feature]. Acknowledged at [UTC time]. Updates every 30 min until resolved.

Status page resolution post:
> Resolved at [UTC time]. [One-line cause]. [One-line fix]. Full post-mortem will be published in 7 days.

Email to affected users (PII incident):
> [Per `docs/runbooks/breach-notification.md` template — OAIC compliant]

## Escalation paths

| Incident type | Escalate to |
|---|---|
| Confirmed PII breach | OAIC (Office of the Australian Information Commissioner) within 72 hrs per Privacy Act |
| Suspected fraud | Stripe Risk + ACSC (cyber.gov.au/report) |
| AFSL-related compliance failure | Legal advisor + ASIC if material |
| Lost vendor access (account locked) | Vendor support tier-2 + use respective recovery runbook |

## Compliance evidence

For SOC 2 audit:
- Per-incident records under `docs/incidents/`
- Runbook execution evidence in incident records (which steps were followed, timestamps)
- Communication records (status page archive, email archive, OAIC notification copies)
- Post-mortem cadence demonstrable from incident folder timestamps
- Severity matrix consistency demonstrable from `docs/ops/severity-matrix.md` + incident classifications

## Drill cadence

Quarterly:
- Founder runs through one runbook end-to-end on a test environment (e.g., simulate a cron failure)
- Records in `docs/compliance/incident-drills/<YYYY-Q>.md` what was tested, what worked, what gaps were found

Annually:
- Restore drill from Supabase point-in-time-recovery to a clone (Q-01 in queue)
- Records timing vs RTO target

## References

- `docs/ops/severity-matrix.md` — severity definitions
- `docs/ops/launch-ops-plan.md` — launch-window operational plan
- `docs/runbooks/` — per-incident playbooks
- `docs/audits/REMEDIATION_QUEUE.md` Stream Q — runbook backlog
