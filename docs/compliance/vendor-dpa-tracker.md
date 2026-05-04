# Vendor DPA Tracker

**Owner:** Founder (Finn Dunshea)
**Last reviewed:** 2026-05-04
**Next review:** 2027-05-04 (annual)
**Maps to SOC 2 TSC:** CC9.2, A1.2

## Purpose

Records the Data Processing Agreement (DPA) status for every vendor that
handles personal data from invest.com.au users. A signed DPA is a legal
requirement under the Australian Privacy Act (APP 8) for cross-border
disclosures to overseas processors, and mirrors the GDPR Art. 28 obligation
if EU residents are served.

The automated secret-rotation cron (`/api/cron/check-secret-rotation`) alerts
when credentials for these vendors approach expiry. DPA renewal should be
checked at the same cadence as vendor contract renewal.

## DPA status by vendor

### Supabase (Supabase Inc., US)

| Field | Detail |
|---|---|
| **Services** | Postgres database, auth, realtime, storage |
| **Data processed** | All persisted user PII (email, name, session tokens, financial profile data) |
| **DPA URL** | https://supabase.com/privacy (DPA available under "Data Processing Agreement") |
| **DPA signed** | Yes — accepted via Supabase dashboard (click-through DPA under Pro/Team plan) |
| **Standard Contractual Clauses** | Yes — included in Supabase DPA for non-EEA transfers |
| **SOC 2 Type II** | Yes (via AWS hosting) |
| **Last confirmed** | 2026-05-04 |
| **Action needed** | None |

### Stripe (Stripe Inc., US)

| Field | Detail |
|---|---|
| **Services** | Payment processing, subscription billing, broker marketplace payouts |
| **Data processed** | Customer email, name, billing address; cardholder data stays within Stripe's PCI scope |
| **DPA URL** | https://stripe.com/legal/dpa |
| **DPA signed** | Yes — Stripe Data Processing Addendum accepted via Stripe Dashboard → Settings → Data Privacy |
| **Standard Contractual Clauses** | Yes — included in Stripe DPA |
| **PCI-DSS** | Level 1 Service Provider |
| **SOC 2 Type II** | Yes |
| **Last confirmed** | 2026-05-04 |
| **Action needed** | None |

### Resend (Resend Inc., US)

| Field | Detail |
|---|---|
| **Services** | Transactional email (auth emails, alerts, advisor notifications) |
| **Data processed** | Recipient email address, email body content (may contain name/account info) |
| **DPA URL** | https://resend.com/legal/dpa |
| **DPA signed** | Confirm — Resend offers a DPA on request; action required to formally execute |
| **Standard Contractual Clauses** | Available in Resend DPA |
| **SOC 2 Type II** | In progress (as of 2026) |
| **Last confirmed** | 2026-05-04 |
| **Action needed** | **Email legal@resend.com to request and execute the DPA. File signed copy at `docs/compliance/signed-dpas/resend-dpa.pdf`.** |

### Vercel (Vercel Inc., US)

| Field | Detail |
|---|---|
| **Services** | Compute, edge runtime, CDN, CI/CD, preview deployments |
| **Data processed** | All HTTP request/response data in transit; env vars containing secrets; server-side logs |
| **DPA URL** | https://vercel.com/legal/dpa |
| **DPA signed** | Yes — Vercel DPA accepted via Vercel Dashboard → Settings → Legal → Data Processing Agreement |
| **Standard Contractual Clauses** | Yes — included in Vercel DPA |
| **SOC 2 Type II** | Yes |
| **ISO 27001** | Yes |
| **Last confirmed** | 2026-05-04 |
| **Action needed** | None |

### PostHog (PostHog Inc., US)

| Field | Detail |
|---|---|
| **Services** | Product analytics, session recordings, feature flags |
| **Data processed** | Anonymised usage events; session recordings (no PII captured per config — verify `maskAllInputs: true` in PostHog init) |
| **DPA URL** | https://posthog.com/dpa |
| **DPA signed** | Yes — PostHog DPA accepted via PostHog Cloud project settings |
| **Standard Contractual Clauses** | Yes — included in PostHog DPA |
| **SOC 2 Type II** | Yes |
| **Last confirmed** | 2026-05-04 |
| **Action needed** | Verify `maskAllInputs: true` and `maskAllText: true` in PostHog initialization to ensure session recordings contain no PII. |

### Sentry (Functional Software Inc., US)

| Field | Detail |
|---|---|
| **Services** | Error monitoring, performance tracing |
| **Data processed** | Stack traces, request context; PII may appear in error messages — `beforeSend` scrubbing configured |
| **DPA URL** | https://sentry.io/legal/dpa/ |
| **DPA signed** | Yes — Sentry DPA accepted via Sentry Dashboard → Settings → Legal → Data Processing Addendum |
| **Standard Contractual Clauses** | Yes — included in Sentry DPA |
| **SOC 2 Type II** | Yes |
| **Last confirmed** | 2026-05-04 |
| **Action needed** | Audit `beforeSend` hook in `sentry.*.config.ts` to confirm PII (email, names) is stripped before transmission. |

### n8n (n8n GmbH, Germany)

| Field | Detail |
|---|---|
| **Services** | Workflow automation (agent orchestration, data enrichment pipelines) |
| **Data processed** | May process user-linked data depending on workflow; treat as full-PII processor |
| **DPA URL** | https://n8n.io/legal/dpa (self-hosted) / cloud DPA in dashboard |
| **DPA signed** | Depends on deployment mode — confirm whether self-hosted or n8n Cloud is used |
| **Standard Contractual Clauses** | Available for cloud; not applicable for self-hosted (data stays on-prem) |
| **SOC 2 Type II** | Cloud: in progress. Self-hosted: N/A |
| **Last confirmed** | 2026-05-04 |
| **Action needed** | **Confirm deployment mode. If n8n Cloud: execute DPA via dashboard. If self-hosted: document host location and ensure infra is covered by Vercel/AWS DPA chain.** |

### Anthropic (Anthropic PBC, US)

| Field | Detail |
|---|---|
| **Services** | Claude AI API (content generation, advisor matching, analysis) |
| **Data processed** | Prompt content sent to the API may include user-supplied text; responses are not stored by Anthropic per default retention policy |
| **DPA URL** | https://www.anthropic.com/legal/privacy (DPA available for commercial customers) |
| **DPA signed** | Confirm — Anthropic's commercial terms include a data processing addendum; verify it has been formally accepted |
| **Standard Contractual Clauses** | Available on request for enterprise; confirm applicability |
| **Retention** | Anthropic retains API inputs/outputs for up to 30 days for safety monitoring unless enterprise zero-retention is enabled |
| **Last confirmed** | 2026-05-04 |
| **Action needed** | **Review Anthropic API usage to confirm no user PII is sent in prompts. If PII can appear in prompts, engage Anthropic enterprise team to execute DPA and enable zero-retention.** |

---

## Signed DPA archive

Executed DPA documents should be stored at:

```
docs/compliance/signed-dpas/
  supabase-dpa.pdf
  stripe-dpa.pdf
  vercel-dpa.pdf
  posthog-dpa.pdf
  sentry-dpa.pdf
  resend-dpa.pdf          ← pending execution
```

> Note: Click-through DPAs (Supabase, Stripe, Vercel, PostHog, Sentry) are
> recorded in each vendor's dashboard. Download a PDF receipt from the
> dashboard and file it here for audit evidence. Legal team should countersign
> any vendor-drafted DPA before filing.

## Review procedure

1. Annual review: check each vendor's DPA URL for updated terms.
2. On vendor contract renewal: re-download DPA receipt and update "Last confirmed" date.
3. On new vendor addition: complete this table row before the vendor goes to production.
4. On vendor removal: note the removal date and confirm data deletion procedure was followed.

## Escalation

DPA questions → Finn Dunshea (founder) → legal counsel on retainer.

For urgent DPA issues (vendor breach, DPA expired, regulatory inquiry):
follow `docs/runbooks/incident-response-policy.md`.
