# Runbook: advisor KYC upload stuck

**Symptom:** An advisor reports they uploaded a compliance
document via `/advisor-portal/kyc` but it never shows in the
admin moderation queue, OR it's been in `submitted` state for
more than 24 hours with no review.

**Severity:** P2 — blocks advisor onboarding / verification. A
stuck KYC means the advisor can't activate their listing.

## Diagnosis

1. **Check the document row.**
   ```sql
   select id, professional_id, document_type, status,
          uploaded_at, verified_at, rejection_reason,
          file_size_bytes, mime_type, storage_path
   from advisor_kyc_documents
   where professional_id = {{ID}}
   order by uploaded_at desc;
   ```

2. **Check storage upload actually landed.**
   Via Supabase dashboard, navigate to Storage → `advisor-kyc` bucket.
   The `storage_path` column is the object key. If the object is
   missing, the upload request succeeded against the metadata
   table but failed in storage — possible with a rolled-back
   transaction or a dropped connection.

3. **Check the review queue length.**
   ```sql
   select count(*) from advisor_kyc_documents
   where status = 'submitted';
   ```
   A value in the hundreds means the reviewer backlog is the
   problem, not the upload flow.

## Fix

### Case A — document row missing
Advisor says they clicked upload but no row exists.
- Check browser network tab for a 4xx from `/api/advisor-kyc`
  POST. Most common: file type not in the allowlist (PDF, JPG,
  PNG, WebP only) or size > 10MB.
- Ask the advisor to try again with a supported format.

### Case B — row exists, storage blob missing
- Mark the row as rejected via `/admin/moderation` with
  reason "Upload incomplete — please re-upload".
- Advisor uploads again.

### Case C — row + storage both fine, no review
- Open `/admin/moderation` and approve/reject via the KYC tab.
- If the reviewer backlog is > 48h, routing alert should fire
  via `complaints-sla` — check that cron is healthy.

## Prevention

- The POST handler rolls back the storage upload if the DB
  insert fails (see `app/api/advisor-kyc/route.ts`). But the
  opposite direction — DB insert succeeds, storage fails — is
  not currently guarded. A future improvement is a cleanup
  cron that deletes metadata rows pointing at non-existent
  storage paths.
- The KYC queue has no SLA cron. If this becomes a recurring
  P2, add one (24h warning, 72h escalation).
