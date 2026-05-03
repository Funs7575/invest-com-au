# Annual Review Schedule

**Owner:** Founder (Finn Dunshea)
**Last reviewed:** 2026-05-03
**Next review:** 2027-05-03 (annual)

## Purpose

Drives the recurring SOC 2 evidence collection by scheduling the review cycles for each compliance policy + each operational practice. Required for SOC 2 Type II — auditors check that policies are *kept current*, not just initially drafted.

## How this document works

Each row tracks: **policy or practice → owner → cadence → last review date → next review date → location of review notes**.

Reviews are tracked in `docs/compliance/reviews/<YYYY-MM>.md`. The template:

```markdown
# Compliance review — <YYYY-MM>

## Reviewed
- Policy / practice name
- Outcome: confirmed / updated / superseded
- Changes (if any)
- Sign-off: Finn Dunshea (date)

## Outstanding
- Items deferred to next cycle + reason
```

## Master schedule

### Annual reviews (12-month cycle)

| Item | Owner | Location | Last review | Next review |
|---|---|---|---|---|
| **Access Control Policy** | Founder | `docs/compliance/access-control-policy.md` | 2026-05-02 (created) | 2027-05-02 |
| **Change Management Policy** | Founder | `docs/compliance/change-management-policy.md` | 2026-05-02 (created) | 2027-05-02 |
| **Incident Response Policy** | Founder | `docs/compliance/incident-response-policy.md` | 2026-05-02 (created) | 2027-05-02 |
| **SOC 2 TSC Coverage Matrix** | Founder | `docs/compliance/soc2-tsc-coverage.md` | 2026-05-02 (created) | 2026-11-02 (6mo until Type II — then annual) |
| **Risk Assessment** | Founder | `docs/compliance/risk-assessment-2026.md` | 2026-05-03 (created) | 2027-05-03 |
| **Vendor Management** | Founder | `docs/compliance/vendor-management.md` | 2026-05-03 (created) | 2027-05-03 |
| **Vulnerability Management** | Founder | `docs/compliance/vulnerability-management.md` | 2026-05-03 (created) | 2027-05-03 |
| **Data Classification + Retention** | Founder | `docs/compliance/data-classification.md` | 2026-05-03 (created) | 2027-05-03 |
| **Logging + Audit Trail** | Founder | `docs/compliance/logging-policy.md` | 2026-05-03 (created) | 2027-05-03 |
| **This document (review schedule)** | Founder | `docs/compliance/review-schedule.md` | 2026-05-03 (created) | 2027-05-03 |
| **Vendor attestation refresh** | Founder | per `vendor-management.md` | — | 2027-05-03 |
| **DPA refresh** | Founder | per `vendor-management.md` | — | 2027-05-03 |
| **Penetration test** | External | report under `docs/compliance/pen-test/<YYYY>.md` | (none yet) | 4–6 weeks after Q-SOC2-01 vendor pick |
| **PITR restore drill** | Founder | `docs/compliance/incident-drills/<YYYY-Q>.md` | (none yet) | Q-01 in queue — first drill before launch |
| **`ADMIN_EMAILS` re-attestation** | Founder | `admin_action_log` entry | 2026-05-03 (de facto, no formal re-attest) | 2027-05-03 |
| **AFSL compliance copy review** | Founder + legal | `lib/compliance.ts` + Privacy Policy | (legal review TBD) | 2027-05-03 |

### Quarterly reviews (3-month cycle)

| Item | Owner | Location | Last review | Next review |
|---|---|---|---|---|
| **Admin action audit** — review `admin_action_log` for unexpected patterns | Founder | inline `admin_action_log` query | (de facto running) | 2026-08-03 |
| **Admin login attempts** — review `admin_login_attempts` for failed-attempt bursts | Founder | inline query | — | 2026-08-03 |
| **CSP violations** — review unique violation reports for attack patterns | Founder | inline query | — | 2026-08-03 |
| **Incident drill** — run one runbook end-to-end on staging | Founder | `docs/compliance/incident-drills/<YYYY-Q>.md` | — | 2026-08-03 |
| **Retention compliance** — confirm rolling-window log tables are pruning | Founder | verify cron output | — | 2026-08-03 |
| **AI factual-output audit** — spot-check 20 random AI outputs for compliance | Founder | (manual review notes) | — | 2026-08-03 |

### Monthly reviews

| Item | Owner | Location | Cadence |
|---|---|---|---|
| **Stripe webhook idempotency replay drill** | Founder | runbook execution | first Monday of month |
| **Backup health check** — confirm Supabase PITR is current | Founder | Supabase dashboard | first Monday of month |
| **Loop spend trend review** — `docs/ops/loop-spend.md` | Founder | inline read | first of month |

### Continuous (workflow-driven)

| Item | Mechanism |
|---|---|
| **CI gates** | Per-PR — `.github/workflows/ci.yml` |
| **Auto-merge classifier** | Per-PR — `.github/workflows/scripts/auto-merge-label.js` |
| **Loop iteration discovery sweep** | Per-iteration — `/audit-remediation-iteration` Phase 6.5 |
| **Daily scout** | Daily 02:00 UTC — `audit-remediation-scout-daily` cron |
| **Spend tracker** | Daily 06:00 UTC — `loop-spend-tracker.yml` |
| **Worktree auto-prune** | Every 6h — `cleanup-stale-worktrees.yml` |
| **Iteration log rotation** | Weekly Sunday 03:00 UTC — `rotate-iteration-log.yml` |

## Adjustments to cadence

Cadence may be tightened (more frequent) if:
- A trial-period auditor recommends
- A near-miss or material incident triggers extra scrutiny
- A vendor changes (new vendor = additional cycle until stable)
- Rate of change in the underlying system is high (early product = monthly review of policies; mature product = annual)

Cadence may be relaxed (less frequent) if:
- Three consecutive cycles show no findings
- Founder discretion + auditor concurrence

Any cadence change is documented in this file's history (commit message + change-log line).

## What "review" actually means

For each item, a review consists of:

1. **Read** the current document or query the relevant log
2. **Verify** that the document still matches the system's current state — controls referenced still exist; thresholds still appropriate; vendor list still accurate
3. **Update** the document if reality has drifted (commit + diff in `git log` is the audit trail)
4. **Sign off** — append a line to the document's "Annual reviews" section: `- YYYY-MM-DD — reviewed; <outcome>. Signed: Finn Dunshea.`
5. **File** the review in `docs/compliance/reviews/<YYYY-MM>.md` summarising what was reviewed + outcomes

If a review uncovers a gap that needs engineering work: add to `docs/audits/REMEDIATION_QUEUE.md` and link the queue item from the review.

## Triggers for off-cycle review

These events force an immediate review of the relevant policy, regardless of normal cadence:

| Event | Triggers review of |
|---|---|
| Material breach incident | Incident Response, Logging, Access Control, Risk Assessment |
| New vendor onboarded | Vendor Management, Data Classification |
| Vendor decommissioned | Vendor Management |
| Privacy Policy update | Data Classification, Vendor Management |
| New regulatory requirement (e.g., AUSTRAC update) | Risk Assessment, Data Classification, Incident Response |
| Stream A or B remediation completes new table | Data Classification, Logging |
| Auth model change (e.g., MFA mechanism updated) | Access Control |
| CI gate added or removed | Change Management, Vulnerability Management |
| Pen test finding | Vulnerability Management, Risk Assessment |
| Significant role change (founder hires) | Access Control, Incident Response |

## Compliance evidence

For SOC 2 audit, this document demonstrates:

- **CC1.4** (Commitment to competence) — defined cadence for keeping policies current
- **CC4.2** (Communicates control deficiencies) — review cycle surfaces gaps
- **CC9.1** (Identifies risk mitigation) — annual risk re-assessment scheduled
- **Periodic policy review** — auditor's "are policies kept current?" question has a yes-with-evidence answer

## Annual reviews

(append future review entries below — newest at top)

- 2026-05-03 — Initial creation. All policies created within last 48 hours; first formal annual review will be 2027-05-03. Quarterly cadences begin 2026-08-03. Sign-off: Finn Dunshea.
