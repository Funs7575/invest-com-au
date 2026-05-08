# PITR restore drill (Q-01)

Quarterly point-in-time-recovery drill against the live Supabase project.
Closes Q-01 on `LAUNCH_GATE_9_5.md`. Required as evidence for SOC 2
recovery-test artefacts (Q-SOC2-01).

The drill restores into a **side branch** — the live `main` schema is
never touched. Treat this runbook as the authoritative execution path;
do not improvise.

## Pre-flight (do once per drill, T-30 min)

1. Pick a target restore point: a UTC timestamp at least 24 h in the past
   so retention has settled. Record it in the form below.
2. Confirm Supabase plan retention covers it: dashboard → project →
   Settings → Database → "Point in Time Recovery". The retention window
   must include your timestamp. If it doesn't, abort and pick a more
   recent timestamp.
3. Tell the founder Slack channel: `PITR drill starting at <local time>;
   no impact to prod`. The drill is read-only against live.
4. Capture a snapshot of "current truth" so the restore comparison is
   reproducible. From the live project's Studio SQL editor:

   ```sql
   -- Drift signal — record these to pin the comparison point
   SELECT 'live' AS source,
          (SELECT count(*) FROM public.brokers)        AS brokers,
          (SELECT count(*) FROM public.professionals)  AS professionals,
          (SELECT count(*) FROM public.leads)          AS leads,
          (SELECT count(*) FROM public.affiliate_clicks) AS affiliate_clicks,
          (SELECT max(created_at) FROM public.leads)   AS last_lead_at,
          NOW() AS observed_at;
   ```

## Restore (T-0)

1. Dashboard → project → Database → "Branches" → **Create branch**.
2. Name: `pitr-drill-YYYYMMDD-HHMM`. Source: **point in time**. Pick the
   timestamp from pre-flight step 1. Confirm.
3. Wait for status → ACTIVE. Typical: 5–15 min depending on DB size.
4. Capture branch ID + connection string (Settings → Database → URI).
   The branch has its own keys; do not reuse live keys.

## Verify (T+15 min)

1. From the branch's SQL editor, re-run the drift query. Compare counts
   to the live snapshot:

   - All counts on the branch should be **less-than-or-equal-to** the
     live counts (the branch is older — anything strictly less is rows
     written between the restore point and `observed_at`).
   - `last_lead_at` on the branch should be **earlier than** the live
     `observed_at` and consistent with the chosen restore timestamp.

2. Functional smoke (run each, screenshot/log results into the form):

   ```sql
   -- Schema integrity — every public table accessible
   SELECT count(*) AS user_data_tables_with_rls
   FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid
   WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity;

   -- Row visibility — service-role read works
   SELECT 'brokers' AS t, count(*) FROM public.brokers
   UNION ALL SELECT 'professionals', count(*) FROM public.professionals;

   -- Indexes intact
   SELECT count(*) AS index_count FROM pg_indexes WHERE schemaname = 'public';

   -- Migrations log present and matches expected count
   SELECT count(*) AS applied_migrations FROM supabase_migrations.schema_migrations;
   ```

3. Cross-check the migrations count matches `supabase/migrations/`
   directory in the repo at the chosen restore timestamp. Off-by-N is OK
   if N matches the migrations applied between the restore point and
   now; off-by-anything-else is a red flag.

## Tear-down (T+30 min)

1. Confirm form is filled in.
2. Dashboard → project → Database → Branches → drill branch → **Delete
   branch**. Confirm. Branches incur cost while ACTIVE — do not leave
   them running.
3. Post in Slack: `PITR drill complete. Restore point <timestamp> ↔
   branch <id> verified. RTO <minutes>. Branch deleted.`
4. Append the drill result to `docs/audits/Q_01_PITR_DRILL_LOG.md` (one
   line per drill — date, restore-point, RTO, anomalies, sign-off).

## Sign-off form (paste into the audit log)

```text
Date:                __________________________________________________
Operator (you):      __________________________________________________
Restore point (UTC): __________________________________________________
Branch ID:           __________________________________________________
RTO (start → ACTIVE):__________________________________________________
RPO check:           branch counts ≤ live counts? [ Y / N ]
Smoke checks:        all four queries returned expected results? [ Y / N ]
Anomalies:           __________________________________________________
                     __________________________________________________
Branch torn down:    [ Y / N ]    Time: __________________________________
```

## What success looks like

- Branch reaches ACTIVE within 15 min.
- All four smoke queries return non-null, sensible counts.
- Branch counts trend ≤ live counts (older snapshot).
- Total drill time ≤ 30 min wall-clock.
- Branch deleted within the same session — no lingering cost.

## What failure looks like (and what to do)

| Symptom | Likely cause | Action |
|---|---|---|
| Branch never reaches ACTIVE in 30 min | Region capacity / very large DB | Raise Supabase support ticket; capture timing |
| Restore-point timestamp rejected | Outside retention window | Pick a more recent timestamp or upgrade plan |
| Schema migration log absent on branch | Restore predated `supabase_migrations.schema_migrations` introduction | Treat as a pass — note in form |
| Smoke query errors with permission denied | Service role key not set on branch connection | Grab the branch-specific key from Settings → Database |
| Branch counts > live counts on any table | Misread of timestamp; drift in the live snapshot capture | Re-run live snapshot, compare again |

## Cadence

Quarterly. The first drill closes Q-01; subsequent drills are SOC 2
maintenance evidence (Q-SOC2-01 ongoing). Schedule the next drill on
completion of the current one — don't let the cadence slip.

## See also

- `database-rollback.md` — forward-fix-first discipline before reaching for PITR.
- `launch-rollback.md` — full launch-day rollback flow (where PITR is the last resort).
- `Q_01_PITR_DRILL_LOG.md` — append-only log of past drills.
