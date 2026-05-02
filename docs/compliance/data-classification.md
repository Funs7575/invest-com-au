# Data Classification + Retention Policy

**Owner:** Founder (Finn Dunshea)
**Last reviewed:** 2026-05-03
**Next review:** 2027-05-03 (annual)
**Maps to SOC 2 TSC:** C1.1, C1.2, P3.1, P4.1

## Purpose

Defines how invest.com.au classifies the data it holds, where each class lives, how long we keep it, and how it's disposed of when no longer needed. Required for SOC 2 Type II Confidentiality + Privacy criteria, and for Privacy Act / GDPR-equivalent compliance.

## Classification scheme

Data is classified into one of four tiers. Each tier has different access, encryption, retention, and disposal requirements.

### Tier 1 — Public

**Examples:** broker information, advisor profiles (with consent), articles, glossary terms, page metadata

**Storage:** Anywhere. CDN-cacheable.

**Access:** Open. No authentication required.

**Encryption at rest:** Standard (Supabase + Vercel default).

**Encryption in transit:** TLS only.

**Retention:** Indefinite while the entity exists; soft-delete preserves audit trail.

### Tier 2 — Internal

**Examples:** application telemetry, anonymised analytics, aggregate metrics, system logs

**Storage:** Supabase (`api_request_log`, `cron_run_log`, `csp_violations`), Vercel Speed Insights, Sentry

**Access:** Admin tier (internal-staff equivalent — solo founder)

**Encryption at rest:** Standard.

**Encryption in transit:** TLS only.

**Retention:**
- `api_request_log`: 90 days rolling
- `cron_run_log`: 90 days rolling
- `csp_violations`: 30 days rolling
- Vercel Speed Insights: per Vercel default (90 days)
- Sentry: per Sentry retention plan (typically 90 days)

### Tier 3 — Confidential

**Examples:** business-internal product analytics, conversion metrics, financial KPIs, vendor SLAs

**Storage:** Supabase (`finance_transactions`, `marketplace_invoices`, `conversion_events`), spreadsheets in `docs/strategy/`

**Access:** Admin tier only.

**Encryption at rest:** Standard. Sensitive subsets may use column-level encryption.

**Encryption in transit:** TLS only.

**Retention:**
- Financial records: 7 years (regulatory — AFSL, ATO)
- Conversion / business metrics: 3 years
- Vendor agreements: lifetime of relationship + 3 years

### Tier 4 — Restricted (PII / Regulated)

**Examples:** user email, name, phone number, financial advisor matches with personal context, advisor application data, payment instruments (via Stripe — we hold tokens, not cards)

**Storage:** Supabase user-data tables under RLS (e.g., `users`, `quiz_leads`, `advisor_applications`, `lead_disputes`, `notification_preferences`); Stripe (PCI-scoped, not in our DB)

**Access:**
- User accesses their own row (via authenticated client + RLS)
- Admin accesses via service-role + audit log entry
- Advisor accesses leads matched to them via `requireAdvisorSession()` + RLS
- Service / cron only via documented routes

**Encryption at rest:** Standard. Email + sensitive fields hashed where lookup-only (e.g., suppression list).

**Encryption in transit:** TLS only.

**Retention:**

| Data type | Retention | Rationale |
|---|---|---|
| User account profile | While account is active + 30 days post-deletion | Privacy Act minimisation |
| Quiz leads (`quiz_leads`) | 2 years from last interaction | Re-engagement window |
| Advisor application data | 7 years (AFSL audit trail) | Regulatory |
| Lead disputes (`lead_disputes`) | 7 years | AFSL audit trail |
| Anonymous-saves before claim | 90 days, then purged if unclaimed | Minimisation |
| Stripe customer ID | While account is active | Required for billing |
| Email opt-in / suppression | Indefinite (suppression must persist past deletion) | Anti-spam compliance |
| `admin_action_log` (when admin reads PII) | 7 years | AFSL audit trail |
| Breach incident records | 7 years | OAIC + regulatory |

## Data subject rights — Privacy Act + GDPR-equivalent

### Right of access

- User submits request via `/api/account/export-data` (authenticated)
- Backend assembles JSON export of all rows where `user_id = auth.uid()`
- Delivered via email within 7 days (typical: minutes for active users)

### Right to rectification

- User edits own profile via `/account/profile`
- Admin can correct via `/admin/users/[id]` with `admin_action_log` entry

### Right to erasure ("right to be forgotten")

- User submits request via `/api/account/deletion-request`
- Soft-delete on `users` row + cascade per migration definitions
- Hard-delete after 30 days unless legal hold applies (active dispute, regulatory)
- Suppression list entry retained (unsubscribe persistence)

### Right to portability

- Same as access — export is in standard JSON
- User can re-import to another platform

### Right to object

- User can opt out of marketing via `notification_preferences` (one click)
- User cannot opt out of operational email (booking confirmations, payment receipts) while active

## Storage locations — sovereignty

| Tier | Primary location | Backup |
|---|---|---|
| Tier 1 (Public) | Vercel edge (global), Supabase EU-West-1 | Vercel internal redundancy |
| Tier 2 (Internal) | Supabase EU-West-1, Sentry US (with EU residency option), Vercel | Vendor-managed |
| Tier 3 (Confidential) | Supabase EU-West-1 | Supabase PITR (point-in-time recovery) |
| Tier 4 (Restricted) | Supabase EU-West-1, Stripe US (PCI-scoped) | Supabase PITR |

EU residency for Supabase (eu-west-1) is intentional — keeps AU + EU users' data in EU (not transferred to US for storage). Stripe is US — Standard Contractual Clauses cover this transfer.

## Disposal procedure

When a retention period expires:

1. **Automated:** rolling-window data (90-day logs) is auto-purged via cron
2. **Manual:** for retention windows requiring case-by-case review (e.g., user account deletion + dispute hold check), founder runs the deletion job
3. **Verification:** post-disposal verification — record count before/after; discrepancy investigation if non-zero
4. **Audit log:** disposal event recorded in `admin_action_log` with before/after counts + retention rule cited

## Backups + their retention

- **Supabase PITR:** point-in-time-recovery within last 7 days (default) or last 30 days (paid tier — confirm current plan)
- **Backup snapshots:** Supabase managed; per Supabase plan retention
- **Backup access:** founder via Supabase dashboard
- **Restore drill:** annual, per `incident-response-policy.md` (Q-01 in queue)

Backups inherit the data classification of their source. PITR is **Tier 4** for tables holding PII.

## Cross-border transfer rules

For users in EU / UK / Privacy-Act jurisdictions:

- Primary storage: EU-West-1 (Ireland) — no cross-border transfer for storage
- Email delivery (Resend US): SCCs in DPA
- Error tracking (Sentry US, with EU option): SCCs in DPA — consider switching to EU residency for PII-bearing errors
- Payment processing (Stripe US): SCCs in DPA + Stripe's own transfer agreements
- LLM inference (Anthropic US): SCCs in DPA — note: user-typed queries CAN contain PII; review prompts that include user content for redaction

## Special categories

### AI-processed data

User queries to chatbot, factual-filter, or content drafts may contain personal context. Per Privacy Policy:

- Queries are sent to LLM provider (Anthropic / OpenAI)
- Queries are not retained by us beyond the immediate session UNLESS user explicitly opts-in to chat history
- Provider retention is per their DPA (Anthropic does not train on API data per current policy — verify at next vendor review)

### Children's data

invest.com.au is **not directed at children under 18**. We do not knowingly collect data from minors. If discovered:

- Account deletion immediate
- Data purge within 7 days (vs standard 30-day grace period)
- Notification to parent/guardian if contact provided

### Special category data (Privacy Act)

We **do not collect**:

- Health information
- Racial or ethnic origin
- Political opinions
- Religious beliefs
- Sexual orientation
- Genetic / biometric data

If a user volunteers any of these in free-text fields (e.g., chatbot query, support ticket), it inherits Tier 4 (Restricted) treatment + an additional review at next deletion cycle.

## Compliance evidence

For SOC 2 audit:

- Schema audit (Stream A): every user-data table identified and classified
- RLS policy migrations: cryptographic enforcement of access tiers
- Retention cron jobs: scheduled purges visible in `cron_run_log`
- Deletion request flow: end-to-end test in `__tests__/api/account-deletion.test.ts` (TBD)
- Disposal audit log: queries against `admin_action_log` with retention-related actions

For Privacy Act audit:

- This document + linked DPA schedule + Privacy Policy statement
- User-facing rights disclosure on `/privacy`
- Quarterly access-review records

## References

- `docs/compliance/access-control-policy.md` — who can access each tier
- `docs/compliance/vendor-management.md` — third-party processors
- `docs/runbooks/breach-notification.md` — incident response if Tier 4 data exposed
- `docs/audits/REMEDIATION_QUEUE.md` Q-15 — public `/privacy/data-collection` page (in flight)
- `docs/audits/REMEDIATION_QUEUE.md` Q-11 — DSAR runbook (in flight)
