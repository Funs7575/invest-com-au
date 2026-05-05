# ACL / AFSL revocation incident

## What just fired

The Australian Financial Services Licence (AFSL) or Australian Credit
Licence (ACL) that covers invest.com.au — or a key advisor's
individual licence — has been suspended, cancelled, or revoked by
ASIC. Or we've received a formal notice that revocation proceedings
have commenced.

> **Note:** As of 2026-05, invest.com.au operates as a financial
> information platform under a referral model, not as a licensed
> financial advice provider. The platform refers users to licensed
> advisors; the primary licence risk is at the advisor level (an
> advisor's individual AFSL or ACL is revoked), not the platform
> level. This runbook covers both scenarios.

## Legal clock

ASIC may act immediately on suspension (effective the day of the
notice). Unlike a court injunction, there is no automatic stay.
You have **no grace period** — the licence ceases on the stated
date.

## Step 1 — Contain (within 2 hours of notice)

### If a platform-level licence is affected

> This scenario is unlikely in the current structure but documented
> for completeness.

1. Take the platform offline immediately (Vercel → pause deployments).
2. Contact external legal counsel — do not issue any public statement
   without legal review.
3. Notify Stripe — financial services suspensions may trigger Stripe's
   Know Your Customer (KYC) re-review. Contact Stripe risk team
   proactively via `support@stripe.com`.
4. Log the incident: date/time, ASIC notice reference number, the
   specific condition(s) stated.

### If an individual advisor's licence is revoked

1. Set `professionals.status = 'suspended'` for the affected advisor:

   ```sql
   UPDATE professionals
   SET status = 'suspended',
       suspension_reason = 'ASIC licence revocation — [ASIC ref]',
       suspended_at = now()
   WHERE email = '<advisor_email>';
   ```

2. Remove the advisor's listing from all public-facing pages.
   The `status = 'suspended'` filter is applied in listing queries —
   verify via `WHERE status = 'active'` clauses in
   `lib/advisor-search.ts` and related modules.

3. Halt any pending lead sends to that advisor:

   ```sql
   -- Find pending leads for the advisor
   SELECT * FROM professional_leads
   WHERE professional_id = <advisor_id>
     AND responded_at IS NULL;

   -- Reroute or cancel them (business decision)
   ```

4. Notify any users who received a referral to that advisor in the
   last 30 days:
   - Use the breach-notification template in `docs/templates/` as a
     starting point.
   - Legal must approve the message before send.

5. File an `admin_action_log` entry:

   ```sql
   INSERT INTO admin_action_log (action, details, created_at)
   VALUES (
     'advisor_suspended',
     '{"reason": "ASIC licence revocation", "advisor_id": <id>, "asic_ref": "<ref>"}',
     now()
   );
   ```

## Step 2 — Assess and escalate

1. Read the ASIC revocation notice carefully:
   - Is it a suspension (temporary) or revocation (permanent)?
   - Are there conditions under which the licence can be reinstated?
   - Is the advisor required to notify their own clients directly?

2. Determine the scope of exposure:
   - How many users were referred to this advisor in the last 12 months?
   - Are there any pending applications, reviews, or financial arrangements
     the advisor was facilitating?

3. Consult the TMD audit runbook (`tmd-coverage-gap.md`) — if this
   advisor's services had a Target Market Determination on the platform,
   the TMD must be removed or updated.

## Step 3 — Publish disclosure (if required)

ASIC RG 271 (Internal Dispute Resolution) and the Corporations Act
may require the platform to notify users who received referrals to a
now-unlicensed advisor. Legal determines this.

If notification is required:
- Use the job queue in batches of 100/min (Resend rate limit).
- Send from `compliance@invest.com.au`.
- Archive sent notifications in the `notification_log` table.

## Step 4 — ASIC check integration (preventive)

The `/api/cron/afsl-expiry-monitor` cron runs weekly (Monday 03:00)
and checks advisor licence status via ASIC's public register. If it
detects an expiry approaching (30-day window), it logs and alerts.
Confirm this cron is healthy after the incident and that the affected
advisor's record is flagged.

## Recovery (if licence is reinstated)

1. Update `professionals.status = 'active'` and clear
   `suspension_reason`.
2. Re-publish the advisor listing.
3. Log the reinstatement in `admin_action_log`.
4. Notify the advisor directly; do not automatically re-send pending
   leads — the advisor should restart fresh.

## Post-incident

- Review `afsl-expiry-monitor` cron logs — did the weekly check flag
  this before the revocation notice arrived?
- If the monitor missed it, investigate whether ASIC's public register
  API response was stale and file an OBS stream follow-up.
- Update this runbook if any step was wrong or missing.
- File an `slo_incidents` record with the advisor_id, revocation date,
  and count of affected users.
