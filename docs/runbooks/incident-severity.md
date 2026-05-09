# Incident severity classification

## What just fired

An event or alert has been detected and the on-call engineer needs to
decide how urgently to respond and who to involve.

This runbook is a **decision guide**, not a reaction guide. Use it to
classify the incident, then open the service-specific runbook for the
actual steps.

---

## Severity levels

| Level | Name | Response SLA | Pager | Criteria |
|-------|------|-------------|-------|----------|
| **P0** | Critical | Respond in 15 min, resolve or mitigate within 1 h | On-call + backup + Finn | Site is down, payments are broken, data breach confirmed, regulatory deadline at risk |
| **P1** | High | Respond within 30 min, resolve within 4 h | On-call | Significant feature broken for ≥10% of users, revenue leak, suspected breach under investigation |
| **P2** | Medium | Respond within 2 h, resolve within 24 h | On-call (next business hour if overnight) | Degraded experience for a minority of users, workaround exists, no revenue impact |
| **P3** | Low | Respond within 24 h | Ticket only | Cosmetic issues, single-user reports, non-critical monitoring noise |
| **P4** | Informational | No SLA | No page | Scheduled maintenance, expected spikes, pre-emptive investigations |

---

## How to classify

Ask these questions in order. Stop at the first "yes."

### Is this a P0?

- Site returns 5xx for ≥50% of requests for more than 2 minutes?
- Stripe payments are failing for all users?
- Personal data has been confirmed as accessed without authorisation?
- The OAIC or ASIC has been or must be notified within 24 hours?
- Admin panel is completely inaccessible?

→ **P0.** Page the backup and Finn immediately. See [breach-notification.md](./breach-notification.md) for data events.

### Is this a P1?

- Any critical user journey is broken for ≥10% of sessions?
  (broker listings, quiz flow, advisor profile, checkout)
- Revenue-generating Stripe webhook processing has stopped?
- Resend is down and transactional emails are queued but not sending?
- Supabase latency p95 > 2 s and admin pages are timing out?
- Suspected (not confirmed) breach or credential stuffing in progress?
- SLO burn rate > 10× for more than 5 minutes?

→ **P1.** Page on-call now. Open [slo-breach.md](./slo-breach.md) as a starting point.

### Is this a P2?

- A secondary feature is degraded (watchlist, newsletter, glossary)?
- Error rate is elevated but < 5% of sessions?
- A single cron job has missed its window but is not systemic?
- Lighthouse score dropped but the site is usable?

→ **P2.** Create a ticket. If it's during business hours, triage immediately. If overnight, handle at next standup.

### Otherwise

→ **P3** (note in `slo_incidents` with `severity = 'p3'`) or **P4** (no ticket needed).

---

## Impact reference

| Area | P0 trigger | P1 trigger |
|------|-----------|-----------|
| Broker listings | All blank / error | Filtering/sorting broken |
| Quiz | Completely broken | Results not persisting |
| Checkout / Stripe | Any payment failure | Slow >10 s |
| Advisor profiles | 500 on all profiles | Images missing |
| Email delivery | All emails failing | Single campaign delayed |
| Admin panel | Completely inaccessible | Slow >5 s |
| Database | Connection refused | Latency p95 > 2 s |
| Cron jobs | All jobs stopped | One job > 2× overdue |

---

## Escalation path

```
P0 / P1
  └─ On-call engineer (first 15 min)
       └─ Backup on-call (if no progress after 15 min)
            └─ Finn (if infrastructure, compliance, or financial impact)
                 └─ Supabase / Stripe / Vercel / Resend vendor support

P2
  └─ On-call engineer (business hours only)
       └─ Finn (if customer-visible for > 2 h or revenue at risk)
```

Contacts: see [breach-notification.md → Contacts](./breach-notification.md#contacts)
for Data Privacy Officer, OAIC, and vendor escalation lines.

---

## Communication

### Internal (all P0/P1)

Post in `#incidents` within 5 minutes of declaring:

```
:rotating_light: P<N> INCIDENT — <one-line summary>
Start time: <HH:MM UTC>
Impact: <who / what is broken>
On-call: @<name>
Bridge: #incident-YYYYMMDD-<short>
```

Update every 30 minutes until resolved.

### External (P0 user-visible)

If users will notice, update the status page within 15 minutes.
Template:

> We are investigating an issue affecting [feature]. Our team is
> actively working on a fix. We will provide updates every 30 minutes.

Do **not** speculate on root cause in external communications until it
is confirmed.

---

## Incident log entry

Record every P0/P1/P2 in `slo_incidents`:

```sql
INSERT INTO slo_incidents (
  opened_at, severity, summary, on_call_engineer, notes
) VALUES (
  now(), 'p1', '<one-line summary>', '<your name>', '<initial context>'
);
```

---

## De-escalation

Downgrade severity when:

- P0 → P1: site is partially restored, revenue-critical path is working
- P1 → P2: primary impact is resolved, residual degradation remains
- P2 → resolved: workaround no longer needed, root cause fixed

Update `slo_incidents.severity` and post in `#incidents`:

```
:white_check_mark: Downgraded to P<N> — <why> — still monitoring
```

---

## Post-incident (P0/P1)

Open within 5 business days. See [slo-breach.md → Post-incident](./slo-breach.md#post-incident) for the
blameless post-mortem template and filing checklist.
