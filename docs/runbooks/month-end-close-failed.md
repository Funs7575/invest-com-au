# Runbook: month-end close failed

**Symptom:** The `month-end-close` cron (runs on the 2nd of each
month at 03:00 AEST) reported an error, or the admin manually
tried to close a period and saw a non-200 response from
`/api/admin/financial-periods`.

**Severity:** P1 — AFSL s912D requires immutable books once a
period is closed. A failed close means the audit trail is
ambiguous for that month until resolved.

## Diagnosis

1. **Check the cron run log.**
   ```sql
   select * from cron_run_log
   where name = 'month-end-close'
   order by started_at desc limit 5;
   ```

2. **Check the target period state.**
   ```sql
   select * from financial_periods
   where period_start = '{{YYYY-MM-01}}'
   order by id desc;
   ```
   Status values:
   - `open` — period hasn't been closed. Retry is safe.
   - `closing` — the cron started but didn't finish. Retry
     will pick up where it left off (idempotent).
   - `closed` — already done. No action needed.

3. **Check the audit_log row count sanity.**
   ```sql
   select count(*) from financial_audit_log
   where created_at >= '{{YYYY-MM-01}}'
   and created_at < '{{YYYY-MM-01 +1 month}}';
   ```
   If this is zero and you expected revenue: check the upstream
   crons (`check-fees`, `referral-payouts`, etc.) weren't failing
   silently during the month.

## Fix

### Option A — retry the cron
If the error was transient (network blip, DB timeout):
```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
     https://invest.com.au/api/cron/month-end-close
```
The cron upserts on (period_start, period_end) so retries are
safe.

### Option B — trigger manually from admin
1. Open `/admin/financial-periods`
2. Fill in the period (YYYY-MM-01 → end of month)
3. Click "Close period"

### Option C — partial close + investigate
If the cron keeps failing and you suspect bad audit data:
1. Mark the period as `status=closing` manually
2. Review the suspicious `financial_audit_log` rows
3. Export the audit trail as CSV (via `/admin/audit-log`)
4. Once cleaned, re-run the cron

## Prevention

- The `recordFinancialAudit` helper (lib/financial-audit.ts)
  refuses writes inside a `closed` period. This means a
  successful close locks the books.
- The cron has the `x-admin-manual` header path so admins can
  trigger early closes from the UI without waiting for the 2nd.
- Runbook review date: update this once per year or after any
  AFSL audit.
