# Runbook: notification inbox stays empty

**Symptom:** Users report the `/account/notifications` inbox is
empty even though crons that should fire notifications have run
(e.g. `check-fees`, `price-drop-alerts`, `referral-payouts`).

**Severity:** P3 — degrades a user-facing feature but doesn't
block conversions.

## Diagnosis

1. **Check that notifications ARE being inserted.**
   ```sql
   select count(*), max(created_at)
   from user_notifications
   where created_at > now() - interval '24 hours';
   ```
   If count is 0: the crons aren't calling `notifyUser` at all.
   Skip to step 3.

2. **Check the user_id is correct.**
   The Wave 11/12 crons call `buildEmailToUserIdMap()` and look up
   `user_id` from auth.users by email. If the user subscribed
   pre-signup, there is no auth.users row yet, so no inbox entry.
   This is expected — the email still sends.
   ```sql
   select u.email, count(n.id) as notifications
   from auth.users u
   left join user_notifications n on n.user_id = u.id
   where u.email = '{{USER_EMAIL}}'
   group by u.email;
   ```

3. **Check cron run logs.**
   ```sql
   select name, status, started_at, ended_at, error
   from cron_run_log
   where name in ('check-fees','price-drop-alerts','referral-payouts')
   and started_at > now() - interval '24 hours'
   order by started_at desc;
   ```
   A status of `error` or a null `ended_at` means the cron failed
   before reaching the notification step.

4. **Verify `email_delivery_key` dedup isn't eating new rows.**
   The Wave 12 wiring uses a per-day `email_delivery_key` so a
   cron that already ran today won't re-insert. If you're testing
   after a recent run, insertion is correctly suppressed.
   ```sql
   select email_delivery_key, count(*) from user_notifications
   where created_at > now() - interval '7 days'
   group by email_delivery_key order by count desc limit 20;
   ```

## Fix

- **No auth user yet → expected.** No action; the email sends.
- **Cron failing → check the cron run log error column and the
  specific cron's runbook (see `cron-stuck.md`).**
- **Dedup is too aggressive → the `email_delivery_key` generation
  probably shouldn't include the sector slug if multiple sectors
  trigger the same user on the same day.** Review the cron code
  and loosen the key.

## Prevention

- The `admin-route-guard-coverage.test.ts` Wave 18 cron section
  catches missing `requireCronAuth`. Extend it if a cron route
  is missing.
- The `/admin/automation` page shows per-cron last-run status —
  add a cron freshness alert if the inbox is a business-critical
  channel.
