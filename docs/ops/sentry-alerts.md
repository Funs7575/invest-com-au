# Sentry alert rules — launch-ops

Per-endpoint alert rules to wire in the Sentry UI. Documented here as the source of truth — the rules themselves live in Sentry (no rules-as-code on this stack today).

Pairs with `docs/runbooks/launch-day.md` (T-24h checklist references the >1% / >5% rules), `docs/ops/severity-matrix.md` (P-level mapping), and `docs/ops/launch-ops-plan.md` PR 16.

---

## Where these rules live

- **Sentry org / project:** `invest-com-au` / `production`. Alerts page: `https://invest-com-au.sentry.io/alerts/rules/` (founder-only access).
- **Source of truth for the wiring:** this doc. If you change a rule in the Sentry UI, update the row here in the same session.
- **Notification destination:** Slack webhook (when configured) and email to `finn@invest.com.au`. Defer Slack to launch+7d per launch-ops-plan §1 decision #12.

---

## Rule catalogue

Each rule has the same shape:

- **Trigger** — Sentry condition that fires the alert.
- **Severity** — maps to `docs/ops/severity-matrix.md`.
- **Action** — what to do first (the runbook).

### 1. Site-wide error rate

| Field | Value |
|---|---|
| Trigger | issue:created OR error:* in any environment, count > 1% of transactions in 5 min |
| Severity | P0 |
| Action | Open `docs/runbooks/launch-day.md` smoke checklist; check `/api/health`; consider rollback per `launch-rollback.md` |

### 2. High-rate spike

| Field | Value |
|---|---|
| Trigger | error:* count > 5% of transactions in 5 min |
| Severity | P0 — page founder |
| Action | Auto-rollback is NOT armed (per launch-ops-plan §7). Human decides; Vercel deployment ID is in the alert payload. |

### 3. Advisor enquiry route — any 5xx

| Field | Value |
|---|---|
| Trigger | tag transaction starts with `/api/advisor-enquiry` AND status_code >= 500 |
| Severity | P0 — lead-flow regression during launch (rule 2 of severity-matrix calibration rules) |
| Action | Flip `advisor_enquiry_intake` flag off (admin → automation → flags). Open the related runbook (`docs/runbooks/advisor-kyc-stuck.md` only if KYC-shaped; otherwise the route's own logs). |

### 4. Listings enquiry route — any 5xx

| Field | Value |
|---|---|
| Trigger | tag transaction starts with `/api/listings/enquire` AND status_code >= 500 |
| Severity | P0 (same lead-flow rule as #3) |
| Action | Flip `listing_enquiry_intake` flag off. |

### 5. Stripe webhook errors

| Field | Value |
|---|---|
| Trigger | tag transaction starts with `/api/stripe/webhook` AND (status_code >= 500 OR exception:* count > 0) in 5 min |
| Severity | P0 |
| Action | Open `docs/runbooks/stripe-webhook-stuck.md`. Consider flipping `stripe_checkout` to halt new sessions while the webhook backlog drains. |

### 6. Stripe checkout creation failures

| Field | Value |
|---|---|
| Trigger | tag transaction starts with `/api/listings/checkout` OR `/api/advisor-auth/topup` OR `/api/advertise/*` AND status_code >= 500 in 5 min |
| Severity | P1 (revenue path, but not site-wide) |
| Action | Flip `stripe_checkout` if the failures look pricing- or session-related; Stripe dashboard for the underlying error code. |

### 7. Cron heartbeat stale

| Field | Value |
|---|---|
| Trigger | already covered by `app/api/cron/cron-health-alert/route.ts` (hourly digest of `health_pings` freshness) — this Sentry rule is the secondary gate: any cron handler that throws |
| Severity | P1 |
| Action | Open `docs/runbooks/cron-stuck.md` or `cron-silence-alert.md` depending on which heartbeat is stale. |

### 8. Bug-report intake errors

| Field | Value |
|---|---|
| Trigger | tag transaction = `/api/bug-report` AND status_code >= 500 in 1 hour |
| Severity | P2 (intake breaking is degraded triage, not user-facing) |
| Action | Check `bug_reports` table writes; verify the founder-alert email is still landing. |

### 9. Auth admin login failures

| Field | Value |
|---|---|
| Trigger | tag transaction = `/api/admin/login` AND multiple `auth_failed` events from same IP in 5 min |
| Severity | P1 (potential admin attack) |
| Action | Block IP via Vercel firewall; check `admin_login_attempts` table; rotate `ADMIN_EMAILS` if compromise suspected. |

### 10. Email send rate spike

| Field | Value |
|---|---|
| Trigger | Resend webhook event of type `email.bounced` OR `email.complained` count > 20 in 1 hour |
| Severity | P0 if drip-related (mass-send incident); P1 otherwise |
| Action | Flip `email_drip_send` if drip-related. Open `docs/runbooks/resend-rate-limited.md` and `docs/runbooks/email-deliverability.md`. |

---

## What this doc deliberately does NOT cover

- Performance / web-vitals alerts (handled by `WebVitals` component → `web_vitals_samples` table; out of scope for incident response).
- Per-route latency thresholds (Sentry has them, but they're noise during launch — re-tune at launch+30d).
- Issue regression rules (Sentry's default behaviour — no extra rule needed).
- PagerDuty escalation (deferred per launch-ops-plan §1 decision #12).

---

## Maintenance

- **When you add a new write endpoint** that touches lead-flow, payments, or compliance: add a row to this doc + the corresponding Sentry rule.
- **When you flip a kill switch** in response to an alert: note it in the morning standup per `launch-ops-plan.md` §6 so the post-launch retro can audit which rules earned their keep vs. which fired noise.
- **When a rule fires more than 3 times in a week** without a real incident: tune the threshold up. False positives erode trust faster than missing one true positive.

---

## Cross-references

- Severity matrix: `docs/ops/severity-matrix.md`
- Launch-ops plan (this doc is PR 16 of §5): `docs/ops/launch-ops-plan.md`
- Launch timeline (Sentry baseline rules): `docs/runbooks/launch-day.md`
- Runbooks for specific incidents: `docs/runbooks/{stripe-webhook-stuck,resend-rate-limited,email-deliverability,cron-stuck,cron-silence-alert}.md`
- Sentry config: `instrumentation.ts`, `sentry.{server,edge,client}.config.ts`
