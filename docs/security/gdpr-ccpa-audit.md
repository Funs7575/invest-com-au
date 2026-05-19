# GDPR / CCPA / Privacy Act 1988 audit

Reviewed: 2026-05-18. Next review: 2026-08-18 (quarterly).

This document audits the user-data surface of invest.com.au against
the three privacy regimes that touch us:

- **AU Privacy Act 1988** (mandatory for AU operations).
- **GDPR** (any EU traffic — must comply on first visit, no threshold).
- **CCPA / CPRA** (CA traffic > $25M revenue OR > 100k consumer records
  triggers it; we're under both today but the bar moves quickly).

Each row maps a user right to the code surface that fulfils it, plus
the audit verdict.

---

## 1. Right of access (Article 15 / CPRA §1798.110)

| Surface | Status | Notes |
|---|---|---|
| `/api/account/export-data` | ✓ Implemented | Returns every row tied to the requesting user across `users`, `professional_leads`, `bookmarks`, `quiz_history`, `holdings`, `watchlist`, etc. |
| `/account/privacy/data-rights` | ✓ Implemented | UI entry point, also linked from `/privacy`. |
| Data-export-monitor cron | ✓ Implemented | Daily check that pending exports are processed within the 30-day SLA. |

**Open items**:
- Quarterly re-audit of the export-script's table list — every new
  user-data table (e.g. `switch_intents`, `rate_alert_subscriptions`,
  `forum_user_profiles`) must be added.

## 2. Right to erasure (Article 17 / CPRA §1798.105)

| Surface | Status | Notes |
|---|---|---|
| `/api/account/delete` | ✓ Implemented | Cascades + anonymises per the schema. |
| Account-deletion-reminder cron | ✓ Implemented | 7-day window before hard delete. |
| Anonymisation pattern | ✓ Implemented | PII columns → null; behavioural data → kept with user_id severed. |

**Open items**:
- Re-audit cascade for newly-added user-data tables.
- Add tests verifying anonymisation actually NULLs the PII fields,
  not just "marks deleted".

## 3. Right to rectification (Article 16)

| Surface | Status | Notes |
|---|---|---|
| `/account/profile` | ✓ Implemented | User can edit name, email, location. |
| `/account/notifications` | ✓ Implemented | User can update digest + alert prefs. |

## 4. Right to portability (Article 20 / CPRA §1798.130(a)(4))

| Surface | Status | Notes |
|---|---|---|
| `/api/account/export-data` returns JSON | ✓ Implemented | Machine-readable, structured. |

**Open items**:
- Add CSV alternative for non-technical users.

## 5. Right to opt-out of sale / sharing (CPRA §1798.120)

| Surface | Status | Notes |
|---|---|---|
| "Do not share my personal information" link in footer | ⚠ Missing | Required for CA visitors. Component spec'd; not yet rendered globally. |
| Cookie banner | ✓ Implemented | `<CookieBanner />` mounts globally; analytics + affiliate cookies opt-in. |
| Affiliate-click consent | ✓ Implemented | `lib/tracking.ts` checks `cookie-preferences.affiliate` before logging. |

**Open items**:
- Add the "Do not share" link to `<SiteFooter />` once we have CA traffic
  > de minimis. Currently below the CPRA threshold but render the link
  pre-emptively — better than scrambling under regulator pressure.

## 6. Right to know (Article 13 / CPRA §1798.100(b))

| Surface | Status | Notes |
|---|---|---|
| `/privacy` policy | ✓ Implemented | Lists every data category collected + purpose. |
| `/privacy/data-collection` | ✓ Implemented | Granular per-source breakdown. |
| Cookie banner first-visit | ✓ Implemented | Shows summary + link to full policy. |

**Open items**:
- Verify the policy mentions every NEW data source as it lands. The
  policy currently doesn't mention: `switch_intents`, `rate_alert_subscriptions`,
  `pro_research_reports.subscribers` (none of which collect new PII
  categories beyond email — but the policy should be specific).

## 7. Right to consent (Article 7 / GDPR)

| Surface | Status | Notes |
|---|---|---|
| Cookie consent before tracking | ✓ Implemented | `getCookiePreferences()` returns `analytics: false, affiliate: false` by default; tracking helpers check this before logging. |
| Email marketing opt-in | ✓ Implemented | Newsletter signup is explicit-consent. Lifecycle drips fire only after lead capture (where consent is shown). |
| Granular preferences | ✓ Implemented | Banner has Accept / Decline / Preferences. |

**Open items**:
- Audit every analytics + ad pixel for "opt-in" semantics — GA4 is
  conditional; verify PostHog respects the same gate (currently it
  loads regardless; either gate it or list it under "essential" with
  an explicit anonymisation argument).

## 8. Right to data security (Article 32 / Privacy Act APP 11)

| Surface | Status | Notes |
|---|---|---|
| HTTPS-only transport | ✓ | Vercel-enforced. |
| Encryption at rest | ✓ | Supabase Postgres encrypts at rest by default. |
| Sensitive columns | ✓ | TOTP secrets AES-256-GCM (`ADMIN_MFA_KEY`); recovery codes bcrypt+pepper. OAuth tokens (`investor_oauth_connections.access_token_enc`) encrypted. |
| Logging hygiene | ✓ | `lib/logger.ts` is the single source — `console.*` calls are gated by the `console-calls` CI check. |
| Breach notification | ⚠ Documented | `docs/runbooks/breach-response.md` exists; never rehearsed. |

**Open items**:
- Quarterly breach-response tabletop drill.
- Audit `agent_logs` for accidental PII leakage (e.g. email + IP +
  timestamp in plaintext logs).

## 9. Data Processing Agreements (DPAs)

We process personal data through these third parties — each needs a
DPA on file:

| Vendor | Purpose | DPA on file? |
|---|---|---|
| Supabase | Auth + DB | ✓ Sub-processor under Supabase Master Subscription Agreement |
| Vercel | Hosting | ✓ Standard Vercel DPA |
| Resend | Transactional email | ⚠ Verify — recent vendor |
| Loops | Lifecycle email | ⚠ Verify — Agent #11 not live yet |
| Stripe | Payments | ✓ Stripe Australia Pty Ltd Services Agreement |
| Twilio (planned) | SMS | ⚠ Sign before first send |
| PostHog (planned) | Analytics | ⚠ Verify |
| Sentry | Error tracking | ✓ Functional Software Inc. DPA |

**Open items**:
- DPA on Resend, Loops (when Agent #11 ships), PostHog, Twilio.

## 10. Cross-border data transfers

invest.com.au is hosted in Australia (Vercel ap-southeast-2) +
Supabase eu-west-1. Customer data physically transits AU → EU for DB
storage.

| Mechanism | Status |
|---|---|
| Standard Contractual Clauses (SCCs) on Supabase EU storage | ✓ Under Supabase MSA. |
| GDPR adequacy decision (EU → AU) | N/A — AU has no full adequacy decision; rely on contract + UK adequacy bridge for UK traffic. |
| User notification of cross-border transfer | ✓ Privacy policy §4 mentions DB hosting in EU. |

---

## Verdict summary

- **Compliant today**: rights of access / erasure / rectification / portability / consent.
- **Pre-launch action**: 6 items in the "Open items" rows above. None block AFSL grant directly; all should land before paid traffic.
- **Quarterly review**: re-run this checklist + the breach-response tabletop drill.
