# On-call rotation

## What just fired

An alert or incident requires a human engineer to respond. This runbook
defines who is on-call, how to page them, and what to do if they don't
respond.

Use **[incident-severity.md](./incident-severity.md)** to classify the
severity first, then return here to find out who to contact.

---

## Who is on-call right now

The team is small; rotation is informal. Default order:

| Priority | Role | Contact |
|----------|------|---------|
| 1st — Primary on-call | Fin Duns (CEO / Operator) | finn@invest.com.au · see phone in 1Password `on-call` vault |
| 2nd — Backup on-call | Best Friend (COO) | see phone in 1Password `on-call` vault |
| 3rd — Escalation (compliance / financial / infrastructure) | Fin Duns | As above — page even if off-hours for P0 |
| Data Privacy Officer | _TBD before go-live_ | privacy@invest.com.au |

> **Travelling note:** Fin is in Asia May 2026 → Dec 2028. All contact
> is by phone or Signal; response may be delayed by timezone. For P0/P1
> incidents, call and send a Signal message simultaneously. Don't rely on
> email alone.

---

## How to page

### For P0 / P1 (immediate response required)

1. Post in `#incidents` using the template in
   [incident-severity.md → Communication](./incident-severity.md#communication).
2. Call the primary on-call's phone directly (number in 1Password
   `on-call` vault).
3. Send a Signal message with a one-line summary and the severity.
4. If no response within **15 minutes**, call the backup on-call.
5. If no response from backup within **15 minutes**, call Fin directly
   regardless of timezone.

### For P2 (business-hours response)

1. Create a ticket and assign to the on-call engineer.
2. Post in `#incidents` with `P2` prefix.
3. No phone call required unless it escalates to P1.

### For P3 / P4

1. File a ticket only. No page needed.

---

## Rotation schedule

| Period | Primary | Backup |
|--------|---------|--------|
| Default (no special event) | Fin Duns | Best Friend |
| Fin OOO / travel blackout | Best Friend | Fin (phone only, urgent only) |

To record a temporary swap, update this table and commit directly to
`main` with message `docs(on-call): swap rotation <date>`.

---

## Escalation contacts (vendor support)

| Service | Support path | SLA |
|---------|-------------|-----|
| Supabase | [support.supabase.com](https://support.supabase.com) · Pro plan | 24h response |
| Stripe | [support.stripe.com](https://support.stripe.com) · Priority support | 4h response |
| Vercel | [vercel.com/support](https://vercel.com/support) · Pro plan | 24h response |
| Resend | [resend.com/support](https://resend.com/support) | Best-effort |
| OAIC (data breach only) | 1300 363 992 · enquiries@oaic.gov.au | See [breach-notification.md](./breach-notification.md) |
| Compliance firm (Sophie Grace / AFSL House) | See 1Password `compliance` vault | Business hours |

---

## Shift handoff checklist

At the end of any P0/P1 incident or at the end of a coverage period,
the outgoing on-call should:

- [ ] Update `slo_incidents.notes` with a short timeline of what happened
- [ ] Set `slo_incidents.resolved_at` if the incident is closed
- [ ] Post a closing message in `#incidents`:
  ```
  :white_check_mark: RESOLVED — <one-line summary>
  Duration: <HH:MM>
  Root cause: <one sentence>
  Follow-up: <ticket number or "none">
  ```
- [ ] Hand over any open P2 tickets to the incoming on-call engineer
- [ ] Update this runbook if the rotation table has changed

---

## Post-incident (P0/P1)

Open a blameless post-mortem within 5 business days. See
[slo-breach.md → Post-incident](./slo-breach.md#post-incident) for the
template and filing checklist.

Notify Fin if:
- Customer-visible impact lasted > 10 minutes
- Revenue impact > $1 k
- Any regulatory or compliance exposure was triggered
