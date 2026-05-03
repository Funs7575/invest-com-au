# SOC 2 Trust Services Criteria — Coverage Matrix

**Owner:** Founder (Finn Dunshea)
**Last reviewed:** 2026-05-02
**Next review:** every 6 months until Type II report is in hand; annual after

Maps each SOC 2 Trust Services Criterion to the existing control in invest.com.au's codebase, runbook set, or policy library. Each row tracks **status** as one of:

- ✅ **Implemented** — control exists, evidence available
- 🟡 **Partial** — control exists but has gaps; remediation queued in `docs/audits/REMEDIATION_QUEUE.md`
- ❌ **Gap** — control needed but not yet built
- ➖ **N/A** — criterion not applicable to our system shape

This document is the single source of truth for SOC 2 readiness assessment. Update as controls land.

---

## CC1 — Control Environment

| TSC | Description | Status | Control / Evidence | Notes |
|---|---|---|---|---|
| CC1.1 | Demonstrates commitment to integrity and ethical values | 🟡 | `COMPANY.md`, `docs/runbooks/breach-notification.md`, founder code-of-conduct (verbal) | Need formal code of conduct doc |
| CC1.2 | Board oversight | ➖ | Solo founder; no board yet | N/A until external investors |
| CC1.3 | Establishes structure, authority, responsibilities | ✅ | `COMPANY.md` (org structure), `docs/audits/MERGE_AUTHORIZATION.md` (authority tiers), `docs/compliance/access-control-policy.md` (responsibilities) | |
| CC1.4 | Demonstrates commitment to competence | 🟡 | `CLAUDE.md`, `ARCHITECTURE.md`, `CONTRIBUTING.md` (engineering standards) | Founder + AI; no formal training records |
| CC1.5 | Enforces accountability | ✅ | `admin_action_log` table, `git log` audit trail, `docs/audits/MERGE_AUTHORIZATION.md` tier accountability | |

## CC2 — Communication and Information

| TSC | Description | Status | Control / Evidence | Notes |
|---|---|---|---|---|
| CC2.1 | Obtains/uses relevant information | ✅ | `docs/audits/codebase-health-2026-04-24.md`, `docs/audits/2026-04-26-comprehensive-audit.md`, `ENTERPRISE_STANDARD.md` | |
| CC2.2 | Communicates internally | ✅ | `CLAUDE.md`, runbooks, `docs/strategy/FIN_NOTEBOOK.md` (founder strategy log) | Solo org — internal comm = self-documentation |
| CC2.3 | Communicates externally | 🟡 | Status page (TBD), Privacy Policy (TBD verify), email templates (`lib/email-templates.ts`) | Status page not confirmed live |

## CC3 — Risk Assessment

| TSC | Description | Status | Control / Evidence | Notes |
|---|---|---|---|---|
| CC3.1 | Specifies suitable objectives | ✅ | `docs/audits/codebase-health-2026-04-24.md`, `ENTERPRISE_STANDARD.md` per-surface rubric | |
| CC3.2 | Identifies and analyzes risks | ✅ | `docs/audits/REMEDIATION_QUEUE.md` (200+ risks tracked across streams), Phase 6.5 discovery sweep | |
| CC3.3 | Considers fraud risks | 🟡 | Stripe webhook idempotency (`stripe_webhook_events`), affiliate-click integrity, V-NEW-02 AI factual filter | Need formal fraud-risk doc — Q-SOC2-05 (Risk Assessment v1) covers this |
| CC3.4 | Identifies/assesses significant changes | ✅ | `docs/compliance/change-management-policy.md`, `docs/audits/MERGE_AUTHORIZATION.md` | |

## CC4 — Monitoring Activities

| TSC | Description | Status | Control / Evidence | Notes |
|---|---|---|---|---|
| CC4.1 | Conducts ongoing/separate evaluations | ✅ | Sentry (errors), Vercel Speed Insights (perf), audit-remediation loop, weekly `code-quality.yml` snapshot | |
| CC4.2 | Communicates control deficiencies | ✅ | Audit-remediation queue's "Blocked — needs human input" section, stuck-detection auto-surfaces, `[ACTION REQUIRED]` GitHub issues from spend tracker | |

## CC5 — Control Activities

| TSC | Description | Status | Control / Evidence | Notes |
|---|---|---|---|---|
| CC5.1 | Selects/develops control activities | ✅ | CI gates (RLS migration gate, types-drift, route-test floor, Zod-validation lint, dated-stat enforcement), ESLint rules | |
| CC5.2 | Selects/develops technology controls | ✅ | `.github/workflows/` (auto-merge, auto-revert, drift detection, label classifier) | |
| CC5.3 | Deploys policies and procedures | 🟡 | This `docs/compliance/` directory + `docs/audits/REMEDIATION_DEFAULTS.md` | Q-SOC2-* items still in progress; ~60% complete |

## CC6 — Logical and Physical Access Controls

| TSC | Description | Status | Control / Evidence | Notes |
|---|---|---|---|---|
| CC6.1 | Implements logical access controls | ✅ | `proxy.ts` middleware, `ADMIN_EMAILS` allowlist, `ADMIN_MFA_COOKIE_SECRET`, RLS on user-data tables, `docs/compliance/access-control-policy.md` | |
| CC6.2 | Registers/authorizes new users | ✅ | Supabase Auth signup flow, `auth.users` table, advisor application via `/api/advisor-apply` | |
| CC6.3 | Manages access changes | 🟡 | `ADMIN_EMAILS` env var changes, advisor tier upgrade/downgrade routes | Manual founder process — formalised in policy |
| CC6.4 | Restricts physical access | ✅ | Vercel + Supabase + AWS data centres (vendor SOC 2 attested) — no founder physical access | |
| CC6.5 | Discontinues access | ✅ | Per `access-control-policy.md` — env var update, session revocation | |
| CC6.6 | Implements logical controls for external systems | ✅ | API key auth (`PARTNER_API_KEY`, `ADMIN_API_KEY`, `CRON_SECRET`), Stripe webhook signature verification, OAuth flows | |
| CC6.7 | Restricts movement of information | ✅ | RLS isolation (V-NEW-04 gate), service-role client restricted by ESLint rule + CLAUDE.md scope | |
| CC6.8 | Implements anti-malware controls | 🟡 | npm audit (CI), Dependabot, no executable user uploads | No EDR on dev laptops; relies on macOS hardening |

## CC7 — System Operations

| TSC | Description | Status | Control / Evidence | Notes |
|---|---|---|---|---|
| CC7.1 | Uses detection/monitoring procedures | ✅ | Sentry, health endpoint (`/api/health`), `cron_run_log`, `csp_violations`, `api_request_log` | |
| CC7.2 | Monitors for anomalies | ✅ | Sentry alerts, `admin_login_attempts` review, loop spend tracker, Lighthouse advisory | RUM/CrUX still pending (real-user perf signal) |
| CC7.3 | Evaluates security events | ✅ | `docs/runbooks/breach-notification.md`, `docs/compliance/incident-response-policy.md`, severity matrix | |
| CC7.4 | Responds to identified events | ✅ | Per-incident runbooks under `docs/runbooks/`, kill switches at `/admin/automation/kill-switch` | |
| CC7.5 | Recovers from events | 🟡 | `docs/runbooks/database-rollback.md`, Vercel deploy rollback, Supabase PITR | PITR restore drill (Q-01) not yet performed |

## CC8 — Change Management

| TSC | Description | Status | Control / Evidence | Notes |
|---|---|---|---|---|
| CC8.1 | Authorizes/designs/implements changes | ✅ | `docs/compliance/change-management-policy.md`, `docs/audits/MERGE_AUTHORIZATION.md`, `auto-merge.yml` 60-min quiet window, `LOOP_PAUSE` sentinel | |

## CC9 — Risk Mitigation

| TSC | Description | Status | Control / Evidence | Notes |
|---|---|---|---|---|
| CC9.1 | Identifies/develops risk mitigation | ✅ | `docs/audits/REMEDIATION_QUEUE.md` 25+ streams of risk-driven work | |
| CC9.2 | Vendor risk management | 🟡 | `docs/compliance/vendor-management.md` (Q-SOC2-06, queued), Q-14 vendor DPA tracker (queued) | Document pending |

---

## A — Availability

| TSC | Description | Status | Control / Evidence | Notes |
|---|---|---|---|---|
| A1.1 | Capacity and demand | ❌ | — | Soak test never run; capacity unmodelled |
| A1.2 | Environmental protection | ✅ | Vercel + Supabase + AWS — all attested SOC 2 Type II | |
| A1.3 | Recovery and BC | 🟡 | `docs/runbooks/database-rollback.md`, Q-stream runbooks (in progress), Supabase PITR | RTO/RPO targets undeclared; Q-02 covers this |

## PI — Processing Integrity

| TSC | Description | Status | Control / Evidence | Notes |
|---|---|---|---|---|
| PI1.1 | Authorization and accuracy of inputs | ✅ | Zod validation (`withValidatedBody`), `invest/no-unvalidated-req-json` ESLint rule | |
| PI1.2 | Inputs are authorized and complete | ✅ | RLS `WITH CHECK` policies, rate limiting (`lib/rate-limit.ts`) | |
| PI1.3 | System processing is complete and accurate | ✅ | Idempotent webhook handlers (`stripe_webhook_events` state machine), idempotent migrations | |
| PI1.4 | Errors and exceptions identified | ✅ | Sentry, `lib/logger.ts` structured logging, `api_request_log` | |
| PI1.5 | Data corrections are reviewed | 🟡 | Admin actions logged in `admin_action_log`; manual review cadence | Quarterly admin-action review documented in access-control-policy.md |

## C — Confidentiality

| TSC | Description | Status | Control / Evidence | Notes |
|---|---|---|---|---|
| C1.1 | Identification/management of confidential info | 🟡 | RLS on PII tables, `lib/compliance.ts` SSOT for sensitive copy | Data classification doc pending (Q-SOC2-08) |
| C1.2 | Disposal of confidential info | 🟡 | `app/api/account/deletion-request`, GDPR-equivalent procedures | Retention policy doc pending (Q-SOC2-08) |

## P — Privacy

8 sections (P1.1 through P8.1). Pre-launch state for most:

| TSC | Description | Status | Notes |
|---|---|---|---|
| P1.1 | Notice (Privacy Policy) | 🟡 | Privacy Policy presence unverified |
| P2.1 | Choice and consent | ❌ | Cookie consent banner not in repo |
| P3.1 | Collection — limited to what's needed | 🟡 | Database schema audit done (Stream A); collection-purpose doc pending |
| P4.1 | Use, retention, disposal | ❌ | Retention policy pending (Q-SOC2-08) |
| P5.1 | Access — subjects can review their data | 🟡 | `/api/account/export-data` exists; UX flow not verified end-to-end |
| P6.1 | Disclosure to third parties | 🟡 | Stripe, Resend, Supabase, Sentry, Anthropic — vendor disclosure list pending |
| P7.1 | Quality — accurate data | 🟡 | User profile edit flows exist; no formal data-quality reviews |
| P8.1 | Monitoring and enforcement | 🟡 | OAIC notification per breach runbook; no privacy-incident dashboard |

---

## Summary

| Category | Implemented | Partial | Gap | N/A | Total |
|---|---|---|---|---|---|
| CC1 (Control Environment) | 2 | 2 | 0 | 1 | 5 |
| CC2 (Communication) | 2 | 1 | 0 | 0 | 3 |
| CC3 (Risk Assessment) | 3 | 1 | 0 | 0 | 4 |
| CC4 (Monitoring) | 2 | 0 | 0 | 0 | 2 |
| CC5 (Control Activities) | 2 | 1 | 0 | 0 | 3 |
| CC6 (Access Controls) | 6 | 2 | 0 | 0 | 8 |
| CC7 (System Operations) | 4 | 1 | 0 | 0 | 5 |
| CC8 (Change Management) | 1 | 0 | 0 | 0 | 1 |
| CC9 (Risk Mitigation) | 1 | 1 | 0 | 0 | 2 |
| A (Availability) | 1 | 1 | 1 | 0 | 3 |
| PI (Processing Integrity) | 4 | 1 | 0 | 0 | 5 |
| C (Confidentiality) | 0 | 2 | 0 | 0 | 2 |
| P (Privacy) | 0 | 5 | 2 | 1 | 8 |
| **Total** | **28** | **18** | **3** | **2** | **51** |

**Coverage by status:**
- ✅ Implemented: 28/49 = **57%** (excluding N/A)
- 🟡 Partial: 18/49 = **37%**
- ❌ Gap: 3/49 = **6%**

**Audit-readiness narrative:** the foundation is mostly in place; the gaps are concentrated in Privacy (P) controls — Privacy Policy presence, cookie consent, retention policy, vendor disclosure list. Closing the Privacy gaps + completing in-flight Q-SOC2-* items moves coverage from 57% Implemented to ~85% Implemented before a Type I audit.

## Path to Type I

1. Close all P-section gaps (cookie consent, Privacy Policy verification, retention policy doc)
2. Complete Q-SOC2-05 (Risk Assessment v1) and Q-SOC2-08 (Data Classification + Retention)
3. Run Q-01 (PITR restore drill) — covers A1.3
4. Capacity model + soak test — covers A1.1
5. Vendor management doc (Q-SOC2-06) + DPA tracker (Q-14) — covers CC9.2
6. Engage SOC 2 vendor (Q-SOC2-01) — Vanta / Drata / Secureframe
7. Vendor maps existing controls to evidence collection automation
8. Type I audit (point-in-time)

Estimated time: **4–6 months** with current loop velocity + founder action items.

## References

- `docs/compliance/access-control-policy.md`
- `docs/compliance/change-management-policy.md`
- `docs/compliance/incident-response-policy.md`
- `docs/audits/REMEDIATION_QUEUE.md` — Stream Q + Q-SOC2-* items
- `docs/audits/MERGE_AUTHORIZATION.md`
- `docs/audits/ENTERPRISE_STANDARD.md`
- `CLAUDE.md` — engineering conventions
