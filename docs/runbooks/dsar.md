# Data Subject Access Request (DSAR)

## What just fired

An individual has exercised their right of access under the
**Privacy Act 1988 (Cth) Australian Privacy Principles (APP 12)**
and requested a copy of the personal information we hold about them.
Or they've submitted a correction request (APP 13) or deletion
request (not a formal statutory right in Australia but common in
practice, and mandatory under GDPR for EU residents).

## Legal obligations

| Right | Law | Deadline | Notes |
|---|---|---|---|
| Access to own data | Privacy Act APP 12 | "Reasonable time" (aim for 30 days) | Must be free; minor charges allowed if excessive |
| Correction of data | Privacy Act APP 13 | 30 days | Notify third parties if data was shared |
| Deletion ("right to be forgotten") | Privacy Act (no formal right) / GDPR Art 17 | 30 days (GDPR) | GDPR applies if the person is an EU resident |
| Complaint handling | Privacy Act | 30 days to respond; 60 to resolve | OAIC can investigate unresolved complaints |

Missing these deadlines may result in OAIC complaints or, for GDPR,
fines up to €20M / 4% of annual turnover.

## Step 1 — Receive and verify (within 2 business days)

1. Log the request in `docs/compliance/regulatory-requests.md`
   (create if absent): date received, requester name/email, type
   (access/correction/deletion), deadline.
2. Verify the requester's identity before releasing data:
   - Request a copy of government-issued ID (email is insufficient
     on its own — the account email could be compromised).
   - Match the email address against `auth.users.email` and
     `quiz_leads.email`.
3. Acknowledge receipt within 5 business days: reply from
   `privacy@invest.com.au` confirming we received the request and
   stating the expected response date.

## Step 2 — Extract the data (access requests)

Run the following queries in Supabase SQL editor. Adjust as needed
based on the subject's email.

```sql
-- All personal data for the subject
SELECT
  'auth.users'     AS source, id::text, email, created_at, last_sign_in_at::text AS updated_at FROM auth.users WHERE email = '<subject_email>'
UNION ALL
SELECT
  'quiz_leads'     AS source, id::text, email, created_at::text, updated_at::text FROM quiz_leads WHERE email = '<subject_email>'
UNION ALL
SELECT
  'email_captures' AS source, id::text, email, created_at::text, NULL FROM email_captures WHERE email = '<subject_email>'
UNION ALL
SELECT
  'newsletter_subscribers' AS source, id::text, email, subscribed_at::text, NULL FROM newsletter_subscribers WHERE email = '<subject_email>'
UNION ALL
SELECT
  'professional_leads' AS source, id::text, user_email AS email, created_at::text, NULL FROM professional_leads WHERE user_email = '<subject_email>'
UNION ALL
SELECT
  'user_reviews'   AS source, id::text, email, created_at::text, NULL FROM user_reviews WHERE email = '<subject_email>';
```

Also check:
- `admin_action_log` for any admin actions taken on the account
- `cron_run_log` for any automated processing that referenced the email
- IP hash fields — note these are hashed and cannot be reversed to
  produce a specific IP address

Export results as CSV via Supabase SQL editor → **Export**.

## Step 3 — Respond

**Access request**: Send the CSV extract(s) from `privacy@invest.com.au`
with a plain-English cover note explaining each table and what it
represents. Do not include internal fields that are operational
only (e.g., `quality_score`, internal flags).

**Correction request**: If the data is factually incorrect, update
it directly in Supabase. Log the correction in `admin_action_log`.
If third parties received the data (e.g., we sent the email to an
advisor via `professional_leads`), notify them of the correction.

**Deletion request (GDPR)**: 

1. Check if there's a legal basis to retain the data (e.g.,
   outstanding financial obligation, AUSTRAC record-keeping
   requirement). If yes, note the basis in the response.
2. If no retention basis, delete the records:

   ```sql
   -- Soft-delete approach (preferred for audit trail)
   UPDATE quiz_leads SET
     email = 'deleted-' || id || '@deleted.invalid',
     user_name = 'Deleted User',
     phone = NULL,
     deleted_at = now()
   WHERE email = '<subject_email>';

   -- Repeat for each table that holds PII
   -- professional_leads, email_captures, newsletter_subscribers,
   -- user_reviews, auth.users (use Supabase admin dashboard for auth)
   ```

3. Log the deletion in `admin_action_log` with:
   `{ action: 'gdpr_deletion', email_hash: sha256('<subject_email>') }`
   (store a hash, not the email, for the audit trail).

4. Note: `IP_HASH_SALT`-based hashed IPs are one-way — no deletion
   is possible or required (they are not personal data once hashed).

## Step 4 — Rejection (if applicable)

You may refuse a request if:
- Identity cannot be verified after reasonable attempts
- The request is manifestly unfounded or excessive (excessive = same
  person making the same request repeatedly for the same data)
- A legal exception applies (e.g., law enforcement hold)

If refusing, respond in writing within the normal deadline explaining
the reason. The subject retains the right to complain to the OAIC.

## Step 5 — Close the request

1. Record the closure date and outcome in
   `docs/compliance/regulatory-requests.md`.
2. If data was deleted, confirm the GDPR purge cron will not
   re-create the records (check for any derived or cached tables).
3. Retain a copy of the correspondence (excluding the data extract)
   for 7 years per ASIC record-keeping guidance.

## Contacts

| Role | Contact |
|---|---|
| Privacy inbox | privacy@invest.com.au |
| OAIC (complaints, guidance) | enquiries@oaic.gov.au / 1300 363 992 |
| External privacy legal | _TBD before go-live_ |

## DSAR request log

Maintain an ongoing log in `docs/compliance/regulatory-requests.md`:

| Date received | Name | Type | Deadline | Status |
|---|---|---|---|---|
| — | — | — | — | — |
