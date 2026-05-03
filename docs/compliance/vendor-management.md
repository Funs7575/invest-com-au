# Vendor Management Policy

**Owner:** Founder (Finn Dunshea)
**Last reviewed:** 2026-05-03
**Next review:** 2027-05-03 (annual; or on vendor change)
**Maps to SOC 2 TSC:** CC9.2

## Purpose

Documents the third-party services that invest.com.au depends on, what data each receives, the trust chain (their certifications), and the procedure for adding/removing vendors. Required for SOC 2 Type II Common Criteria 9.2 (vendor and business partner risks).

## Scope

Applies to:
- Any third-party service that processes user data
- Any third-party service whose outage degrades core platform function
- Any third-party service in the production deploy chain (CI, hosting, monitoring)

Does not apply to:
- Read-only public APIs (e.g., reading exchange rates from a public endpoint without sending PII)
- Vendors used only for marketing/sales without product integration

## Vendor inventory

### Critical-path infrastructure

| Vendor | Purpose | Data shared | Their attestations | DPA on file | Criticality |
|---|---|---|---|---|---|
| **Vercel** | Compute, edge, CDN, deploy | All HTTP request/response (transient), env vars | SOC 2 Type II, ISO 27001 | Required — verify | Critical |
| **Supabase** | Postgres database, auth, storage | All persisted user data | SOC 2 Type II (via AWS), HIPAA | Required — verify | Critical |
| **Cloudflare** (DNS, if used) | DNS, possibly WAF | DNS queries, no user data | SOC 2 Type II, ISO 27001 | If applicable | High |

### Payment + financial

| Vendor | Purpose | Data shared | Their attestations | DPA on file | Criticality |
|---|---|---|---|---|---|
| **Stripe** | Payment processing, subscription billing, invoicing | Customer email, billing address, payment method (PCI-scoped) | PCI-DSS Level 1, SOC 1 + SOC 2 Type II | Yes (Stripe SCC) | Critical |

### Communications

| Vendor | Purpose | Data shared | Their attestations | DPA on file | Criticality |
|---|---|---|---|---|---|
| **Resend** | Transactional email | Email addresses, message content | SOC 2 Type II | Required — verify | High (email delivery break = onboarding break) |

### Observability + monitoring

| Vendor | Purpose | Data shared | Their attestations | DPA on file | Criticality |
|---|---|---|---|---|---|
| **Sentry** | Error tracking, performance traces | Error messages (may contain PII unless scrubbed), user IDs | SOC 2 Type II, ISO 27001 | Required — verify | Medium |
| **Vercel Speed Insights** | RUM perf metrics | Pseudonymous user agent, route, timing | SOC 2 Type II (via Vercel) | Per Vercel DPA | Medium |
| **PostHog** (if active) | Product analytics | User IDs, event metadata | SOC 2 Type II | Required — verify | Medium |

### AI / LLM

| Vendor | Purpose | Data shared | Their attestations | DPA on file | Criticality |
|---|---|---|---|---|---|
| **Anthropic** | LLM inference (chatbot, factual filter, content drafting) | User-typed queries, content samples | SOC 2 Type II | Required — verify | High (chatbot + factual filter) |
| **OpenAI** (if used) | Same | Same | SOC 2 Type II | If used | Same |

### Development tooling (no user-data access)

| Vendor | Purpose | Data shared | Their attestations | Notes |
|---|---|---|---|---|
| **GitHub** | Source control, issues, Actions | Source code (no production secrets in repo) | SOC 2 Type II, ISO 27001, FedRAMP | Critical for engineering, no user-data |
| **npm registry** | Dep distribution | None | n/a | Supply-chain risk addressed by lockfile + Dependabot |

## Trust chain narrative

Every vendor in the user-data flow holds **at minimum SOC 2 Type II**. Where the data is regulated (Stripe holds payment instruments), that vendor holds the deeper attestation (PCI-DSS L1).

This means our SOC 2 audit can rely on each vendor's report rather than re-attesting their controls. The auditor verifies:

1. Each vendor in this list has a current attestation (we provide their reports)
2. We have a DPA / processing agreement with each vendor where required
3. Our internal controls properly delegate (e.g., we're not duplicating PCI-DSS scope by storing card data ourselves)

## Onboarding new vendors — procedure

Before adding any new vendor that processes user data:

1. **Verify their attestations.** Minimum: SOC 2 Type II (or ISO 27001 + supplemental controls). Request their report.
2. **Sign a DPA / processing agreement.** Standard contractual clauses if cross-border data transfer.
3. **Add to this document** with the row format above.
4. **Update Privacy Policy** to disclose the vendor (third-party-disclosures section).
5. **Document the data minimisation rationale** — what's the smallest data set we need to send, and why?
6. **Document the kill-switch / failure-mode** — what runbook covers this vendor going down?

## Offboarding vendors — procedure

When removing a vendor:

1. **Confirm data deletion.** Send a deletion request per their DPA. Record completion.
2. **Update Privacy Policy.** Remove the disclosure within the same review cycle.
3. **Remove from this document** with a strikethrough + closed-on date (preserves audit trail).
4. **Rotate any credentials** that were issued to integrate with the vendor.

## Annual vendor review

Each year:

1. Re-confirm each vendor's current attestation date (some have rolling renewals; if the report has lapsed, raise it).
2. Re-confirm DPAs are still in force.
3. Re-evaluate criticality — has any vendor moved from Medium → Critical due to expanded usage?
4. Consider alternatives — is there a SOC 2-equivalent vendor with better fit / lower cost?

Records the year's review at the bottom of this document with date + outcome.

## Cross-border data transfers

Per Privacy Act + GDPR-equivalent (when serving EU users):

| Vendor | Data location | Transfer mechanism |
|---|---|---|
| Vercel | Globally distributed; primarily US edge | SCCs |
| Supabase | EU-West-1 (Ireland) — chosen specifically to keep AU + EU users' data in EU | Native EU residency; no transfer for EU users |
| Stripe | US (with EU residency option) | SCCs + Stripe DPA |
| Resend | US | SCCs |
| Sentry | US (with EU residency option) | SCCs |
| Anthropic | US | SCCs |

## Subprocessor disclosure

Material subprocessors (those that themselves process our user data) should be disclosed to users via the Privacy Policy, with a stable URL pointing to this document. Add: `https://invest.com.au/privacy/subprocessors` (TBD route).

## References

- `docs/compliance/access-control-policy.md` — access to vendor accounts
- `docs/compliance/incident-response-policy.md` — vendor outage runbooks
- `docs/audits/REMEDIATION_QUEUE.md` Q-14 — DPA tracker (overlaps with this document; consolidate next review)
- `docs/runbooks/stripe-account-recovery.md`, `resend-account-recovery.md`, `vercel-team-recovery.md` (Q-stream items)

## Annual reviews

- 2026-05-03 — initial creation. All vendors verified to have SOC 2 Type II at minimum. **Action:** confirm DPAs on file for Vercel, Supabase, Resend, Sentry, PostHog, Anthropic — not yet verified at the time of writing.
