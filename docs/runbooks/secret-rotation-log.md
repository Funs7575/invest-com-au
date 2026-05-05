# Secret rotation log

Append a row each time a production secret is rotated. This log
satisfies the SOC 2 CC6.1 evidence requirement (access credentials
are regularly rotated and the rotation is documented).

Cross-reference: `secret-rotation.md` has the rotation procedure
for each secret type.

---

## Log format

Each entry records:

| Field | Description |
|---|---|
| Date | ISO date the rotation was completed (YYYY-MM-DD) |
| Secret | Env var name (e.g., `STRIPE_SECRET_KEY`) |
| Reason | Routine / Suspected compromise / Incident |
| Rotated by | Operator name or "loop" for automated rotation |
| Vercel updated | ✓ / ✗ |
| Consumers updated | ✓ / ✗ (cron schedules, webhooks, etc.) |
| Notes | Any caveats (brief downtime, downstream impact) |

---

## Rotation history

| Date | Secret | Reason | Rotated by | Vercel updated | Consumers updated | Notes |
|---|---|---|---|---|---|---|
| 2026-05-04 | _(initial setup — all secrets set at project creation)_ | Initial | Founder | ✓ | ✓ | Baseline; rotation log starts here |

---

## Upcoming rotations

Calculated from the schedule in `secret-rotation.md`. Update after
each rotation to keep this table current.

| Secret | Last rotated | Next due | Owner |
|---|---|---|---|
| `CRON_SECRET` | 2026-05-04 | 2026-08-02 | Eng lead |
| `INTERNAL_API_KEY` | 2026-05-04 | 2026-08-02 | Eng lead |
| `REVALIDATE_SECRET` | 2026-05-04 | 2026-08-02 | Eng lead |
| `SUPABASE_SERVICE_ROLE_KEY` | 2026-05-04 | 2026-11-01 | Eng lead |
| `RESEND_API_KEY` | 2026-05-04 | 2026-11-01 | Eng lead |
| `STRIPE_SECRET_KEY` | 2026-05-04 | 2027-05-04 | Eng lead |
| `STRIPE_WEBHOOK_SECRET` | 2026-05-04 | 2027-05-04 | Eng lead |

---

## Revocation log (compromised credentials)

Record any credential that was revoked due to a suspected or confirmed
leak (separate from the routine rotation schedule).

| Date | Secret | Reason | Incident ref | Rotated by |
|---|---|---|---|---|
| — | — | — | — | — |
