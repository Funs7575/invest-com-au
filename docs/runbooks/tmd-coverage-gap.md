# Runbook: TMD coverage gap

**Symptom:** `/admin/data-health` (or the Wave 13 `tmd-audit` cron)
reports that an active broker is missing a current Target Market
Determination (TMD). Alternatively: a broker detail page renders
without the TmdBadge footer.

**Severity:** P2 — DDO (Corporations Act s994A–C) requires a TMD
link on every distributed financial product page. A missing
TMD is a regulatory gap.

## Diagnosis

1. **Confirm which broker(s) are missing coverage.**
   ```sql
   select b.slug, b.name, b.status
   from brokers b
   left join tmds t
     on t.product_type = 'broker'
     and t.product_ref = b.slug
     and (t.valid_until is null or t.valid_until > now())
     and t.valid_from <= now()
   where b.status = 'active' and t.id is null;
   ```

2. **Check if a TMD exists but is stale.**
   ```sql
   select * from tmds
   where product_type = 'broker' and product_ref = '{{SLUG}}'
   order by valid_from desc;
   ```
   If `valid_until` has passed, the admin needs to mark it
   extended or add a new version.

3. **Check the audit cron latest run.**
   ```sql
   select * from cron_run_log
   where name = 'tmd-audit' order by started_at desc limit 5;
   ```
   Expected cadence: daily at 06:00 AEST.

## Fix

1. Go to `/admin/tmds`.
2. Find the broker row (or "Add new TMD" if missing).
3. Set `product_type=broker`, `product_ref={slug}`, upload the
   new TMD PDF or paste the issuer's hosted URL.
4. Set `valid_from=now()`, leave `valid_until` null unless the
   issuer's TMD has a stated expiry.
5. Mark `reviewed_at=now()` and record your name.
6. Save. The `/admin/data-health` alert clears on next audit run
   — or run `/api/cron/tmd-audit` manually to clear immediately.

## Prevention

- When onboarding a new broker, the `advisors/brokers` admin flow
  should require a TMD row before setting `status=active`. If
  this gap is recurring, add an admin-side check.
- The `tmd-audit` cron writes to `data_integrity_issues` with
  `severity=critical` when coverage drops. Make sure the data-
  health alert routing is wired to PagerDuty/Slack.
