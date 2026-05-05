# Regulatory data request

## What just fired

A formal data request has arrived from a regulator — most commonly
the **Office of the Australian Information Commissioner (OAIC)** or
the **Australian Securities and Investments Commission (ASIC)** —
requiring us to produce, preserve, or delete specific data within a
legally mandated timeframe.

## Relevant laws

| Regulator | Instrument | Typical trigger | Timeframe |
|---|---|---|---|
| OAIC | Privacy Act 1988 (Cth) — Part V | Complaint or NDB investigation | 30 days (extendable) |
| ASIC | Corporations Act 2001 s 30A–s 32 | Licensee audit or misconduct probe | 5 business days (urgent orders possible) |
| ATO | Taxation Administration Act 1953 | Tax audit | 28 days |
| AUSTRAC | AML/CTF Act 2006 | Financial crime inquiry | 3 business days |
| Court / Police | Criminal Code / court order | Civil / criminal matter | As stated in the order |

**Do not respond directly to the regulator without legal review.**
All regulatory communications must go through the founder or external
legal counsel first.

## Step 1 — Receive and escalate (within 2 hours)

1. Forward the request to the founder (or legal counsel) immediately.
   Do **not** acknowledge receipt or provide any data yet.
2. Confirm the request is legitimate:
   - OAIC: requests come from `@oaic.gov.au` email addresses or
     by post on official letterhead.
   - ASIC: requests arrive via `compulsory examination notices`,
     `section 30A notices`, or by post. Verify the officer's badge
     number at `asic.gov.au/verify`.
   - If in doubt, call the regulator's main line to verify.
3. Log the receipt in `docs/compliance/regulatory-requests.md`
   (create if absent) with: date received, regulator, reference
   number, data scope, deadline.

## Step 2 — Preserve data (within 24 hours of confirmed request)

Issue a **legal hold** — do not delete or modify the in-scope data
for the duration of the matter.

1. Disable the GDPR retention purge cron for affected user records:
   add the in-scope user IDs to a `legal_hold_users` table (or
   document them; the table may not exist yet) so the purge skips
   them.
2. Create a Supabase manual backup immediately:
   Supabase dashboard → **Backups** → **Create manual backup**.
   Label it with the regulator name and date.
3. Disable any automated deletion jobs that could destroy evidence:
   check `cron-groups.ts` for `gdpr-retention-purge`,
   `data-export-monitor`, `cleanup`, and similar — pause them if
   needed via the LOOP_PAUSE sentinel or a feature flag.

## Step 3 — Identify and extract the data (with legal sign-off)

Only proceed after legal has confirmed the scope of disclosure.

Typical data requested:

```sql
-- Personal information for a specific user
SELECT u.id, u.email, u.created_at,
       ql.*, el.*, pl.*
FROM auth.users u
LEFT JOIN quiz_leads ql ON ql.email = u.email
LEFT JOIN email_captures el ON el.email = u.email
LEFT JOIN professional_leads pl ON pl.user_email = u.email
WHERE u.email = '<subject_email>';

-- Advisor/professional records (ASIC audit)
SELECT p.*, ar.*, ql.quality_score, ql.created_at
FROM professionals p
LEFT JOIN advisor_applications ar ON ar.professional_id = p.id
LEFT JOIN professional_leads ql ON ql.professional_id = p.id
WHERE p.email = '<advisor_email>';

-- Audit trail for an action window
SELECT * FROM admin_action_log
WHERE created_at BETWEEN '<start>' AND '<end>'
ORDER BY created_at;
```

Export results as CSV or JSON via Supabase SQL editor → **Export**.

## Step 4 — Respond via legal (within deadline)

Legal drafts the response. Engineering provides:

1. Data extract as agreed with legal (CSV / JSON / printed).
2. A plain-English description of what each field means and where
   it comes from.
3. Any caveats: data retention windows, fields that were purged
   before the request arrived.

Send via the channel legal specifies (email, secure upload, post).
Keep a copy of the final disclosure package.

## Step 5 — Lift the hold and restore normal operations

Once legal confirms the matter is closed:

1. Re-enable any paused cron jobs.
2. Remove affected users from the `legal_hold_users` exemption (or
   equivalent).
3. Confirm GDPR retention purge resumes normally.
4. Document the closure date in `docs/compliance/regulatory-requests.md`.

## Post-incident

- Update this runbook if any step was unclear or missing.
- Review whether the requested data could be served faster with a
  self-service export tool (DSAR fulfilment — Q-11 tracker).
- If the request revealed a gap in audit logging, file a follow-up
  in the OBS stream.

## Do NOT

- Do **not** voluntarily disclose more than the notice requires.
- Do **not** delete any in-scope data once a request is received —
  that is evidence destruction and a separate offence.
- Do **not** discuss the existence of a regulatory investigation
  publicly without legal approval.
- Do **not** provide access to raw Supabase credentials to any
  regulator — produce data extracts only.
