# Breach notification

## What just fired

We believe personal information held by invest.com.au has been
accessed, disclosed, or lost without authorisation. Or we're
uncertain whether an incident qualifies and need to decide fast.

## Legal clock

Australia's **Notifiable Data Breach (NDB) scheme** (Privacy Act
1988 Part IIIC) requires:

- **30 calendar days** from awareness of a suspected eligible data
  breach to make a reasonable assessment
- **"As soon as practicable"** after confirmation to notify:
  1. The Office of the Australian Information Commissioner (OAIC)
  2. Every affected individual (or publish a statement if that is
     impracticable)

Missing the window is a regulatory breach in its own right, with
civil penalty provisions up to AU$50M per contravention for
serious or repeated non-compliance.

**GDPR parallel**: 72 hours to notify the lead supervisory
authority. If we have EU-resident users, both clocks run.

## Impact severity matrix

| Severity | Criteria | Clock trigger |
|---|---|---|
| **P0 — Confirmed breach** | PII of ≥100 people disclosed externally; financial data (AFSL, bank) disclosed; admin credentials exfiltrated | Start the OAIC 30-day clock immediately, begin drafting notification |
| **P1 — Suspected breach** | Unusual access patterns, credential stuffing succeeded, SQL injection detected | Start the assessment clock; investigate within 72h |
| **P2 — Exposure without disclosure** | Misconfiguration found but no evidence of exfil | Fix + document; assess whether NDB applies |
| **P3 — Incident** | Denial of service, data loss without disclosure, ransomware contained | Document; usually no NDB obligation |

## Step 0 — Incident declared

1. Post in `#incidents` Slack channel: `:rotating_light: BREACH
   SUSPECTED: <short description>`
2. Page the on-call engineer AND the Data Privacy Officer
3. Open a private incident Slack channel `#incident-YYYYMMDD-<short>`
4. Start an incident log (shared doc) — who, what, when, how
5. **Do NOT publicly acknowledge** until Step 3 below

## Step 1 — Contain (first 60 minutes)

Priority is stopping ongoing damage before investigation.

- [ ] Rotate suspected credentials (`SUPABASE_SERVICE_ROLE_KEY`,
      `STRIPE_SECRET_KEY`, `RESEND_API_KEY`, `CRON_SECRET`, any
      admin email password)
- [ ] Revoke active admin sessions if admin creds are suspect
      (flip `admin_mfa_required` flag to 100%, force re-auth)
- [ ] Flip the global kill switch at `/admin/automation/kill-switch`
      → `global` if the attack is active
- [ ] Block the source IP at the Vercel edge if known
- [ ] If data is still flowing out: pull the plug. Vercel > Project
      > Settings > pause deployments. Better 15 min downtime than
      15 more rows exfiltrated.
- [ ] Take a point-in-time snapshot of Supabase so we have
      evidence: Supabase dashboard → Backups → Create manual backup

## Step 2 — Assess (within 72 hours)

- [ ] What data was involved? Query `financial_audit_log`,
      `admin_action_log`, `stripe_webhook_events`, `cron_run_log`
      for anomalies in the incident window
- [ ] How many individuals? Count distinct `email` values across:
      `quiz_leads`, `email_captures`, `professional_leads`,
      `advisor_applications`, `user_reviews`, `professional_reviews`,
      `newsletter_subscribers`
- [ ] Is it "personal information"? Emails + names = yes. Hashed
      IPs alone = probably not
- [ ] Is there a **real risk of serious harm**? Reputation damage,
      financial loss, identity theft — NDB assessment criterion
- [ ] Document the answers in the incident channel. Be honest;
      ambiguity goes up the chain, not into the runbook

## Step 3 — Notify (as soon as practicable after confirmation)

### OAIC notification

- Form: https://www.oaic.gov.au/privacy/notifiable-data-breaches/report-a-data-breach
- Required fields: description of the breach, kinds of information
  involved, how the breach happened, what we've done to contain,
  recommendations for affected individuals, our contact
- Send by the Data Privacy Officer only; keep a copy

### Individual notification

Template lives in `docs/templates/breach-notification-email.md`.
For every affected individual:

1. Email from `privacy@invest.com.au`
2. Subject: "Important security notice about your Invest.com.au account"
3. Body must cover:
   - What happened (plain English, one paragraph)
   - What data was affected
   - What we've done to contain
   - What they should do (change password, watch for phishing)
   - Contact: `privacy@invest.com.au`
4. Send via `job_queue` in batches of 100/min to avoid Resend rate
   limits

If direct notification is impracticable, publish on
`/privacy/breach-notices/{incident-id}` and link from the
homepage footer.

## Step 4 — Recover

- [ ] Patch the root cause (code fix, infra change, policy change)
- [ ] Re-enable feature flags / kill switches reversed in Step 1
- [ ] Monitor for repeat attempts for 72 hours after the patch
- [ ] Verify backups + re-run integrity checks (`/api/cron/data-integrity-audit`)

## Step 5 — Post-mortem (within 5 business days)

- [ ] Write a blameless post-mortem in `docs/post-mortems/YYYY-MM-DD.md`
- [ ] Sections: summary, timeline, root cause, mitigation,
      impact, action items, what went well, what we'd change
- [ ] Share with engineering all-hands within 10 business days
- [ ] File follow-up tickets for every action item with an owner
      and due date
- [ ] Feed any new detection rules back into `data_integrity_audit`
      or SLO definitions
- [ ] Update this runbook if any step turned out to be wrong or
      missing

## Contacts

| Role | Name | Contact |
|---|---|---|
| Data Privacy Officer | _TBD — must be filled before go-live_ | privacy@invest.com.au |
| OAIC | Office of the Australian Information Commissioner | 1300 363 992 / enquiries@oaic.gov.au |
| Stripe Incident | Stripe Support — priority | support@stripe.com |
| Supabase Incident | Supabase Pro Support | support@supabase.com |
| Vercel Incident | Vercel Enterprise Support | support@vercel.com |
| Resend Incident | Resend Support | support@resend.com |

## Legal references

- Privacy Act 1988 (Cth) Part IIIC — NDB scheme
- OAIC NDB Guide: https://www.oaic.gov.au/privacy/notifiable-data-breaches
- ASIC RG 271 — Internal Dispute Resolution (companion runbook:
  `complaints-register.md` when we write it)
- GDPR Article 33 (controller) / Article 34 (data subject)

## Do NOT

- Do **not** publicly comment until legal / privacy officer has
  signed off
- Do **not** delete logs during investigation — preserve evidence
- Do **not** assume the first contained breach is the only one;
  attackers often plant multiple footholds
- Do **not** offer blanket compensation without legal review
- Do **not** pay a ransom without explicit board approval
