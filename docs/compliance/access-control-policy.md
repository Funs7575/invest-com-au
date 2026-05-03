# Access Control Policy

**Owner:** Founder (Finn Dunshea)
**Last reviewed:** 2026-05-02
**Next review:** 2027-05-02 (annual)
**Maps to SOC 2 TSC:** CC6.1, CC6.2, CC6.3, CC6.5, CC6.6, CC6.7

## Purpose

Defines who can access what in the invest.com.au platform, how access is granted, modified, and revoked, and how access is audited. Required for SOC 2 Type II Common Criteria 6 (Logical and Physical Access Controls).

## Scope

Applies to:
- Production application code on `main` and any branch deployed to a production environment
- Production data in Supabase (eu-west-1, project `invest-com-au`)
- Stripe live keys, Resend API keys, Sentry projects, Vercel team
- Admin surfaces under `app/admin/*` and `app/api/admin/*`
- Cron endpoints under `app/api/cron/*`

Does not apply to:
- Public consumer-facing routes
- Local development environments

## Roles and access tiers

### Tier 0 — Public

**Who:** Anonymous web visitors
**Access via:** Anonymous Supabase client (`lib/supabase/client.ts` from browser, `lib/supabase/server.ts` from RSC without session cookie)
**Allowed:** Reads to tables with `anon SELECT` RLS policies (e.g., `brokers WHERE status='active'`); writes only to tables with explicit `anon INSERT WITH CHECK` policies (e.g., quiz lead submission)
**Default deny:** RLS forces all access through explicit policies; no implicit access

### Tier 1 — Authenticated user

**Who:** End users with verified email + Supabase Auth session
**Access via:** Authenticated Supabase client (carries user JWT cookie)
**Allowed:** Own rows on user-data tables (`auth.uid() = user_id` RLS pattern)
**Cannot:** Read or modify other users' data; access admin routes

### Tier 2 — Advisor

**Who:** Verified financial advisors with active `advisor_sessions` row
**Access via:** `requireAdvisorSession()` helper + admin Supabase client (service-role) for advisor-scoped operations
**Allowed:** Their own advisor profile, leads assigned to them, their own bookings/billing
**Cannot:** Other advisors' data; admin routes

### Tier 3 — Admin

**Who:** Email present in `ADMIN_EMAILS` env var (currently: `finn@invest.com.au`)
**Access via:** `proxy.ts` middleware authentication + MFA cookie (`ADMIN_MFA_COOKIE_SECRET`) + admin Supabase client
**Allowed:** All admin routes (`app/admin/*`, `app/api/admin/*`); read/write to all tables via service-role client; can grant/revoke advisor verifications
**Audit:** Every admin action logged to `admin_action_log` table with `admin_email`, `action`, `target_id`, `timestamp`, `ip`

### Tier 4 — System / cron

**Who:** Vercel cron scheduler authenticated via `CRON_SECRET` Bearer token
**Access via:** `requireCronAuth(req)` helper at top of every cron route
**Allowed:** Cron-specific operations on backend tables; never user-facing endpoints

## Access provisioning

### Adding an admin

1. Founder updates `ADMIN_EMAILS` env var in Vercel project settings
2. New admin completes MFA enrollment on first login (cookie `ADMIN_MFA_COOKIE_SECRET` set)
3. First admin action logged to `admin_action_log` with `provisioned: true` flag
4. Founder records the addition in the `admin_action_log` audit trail

### Adding an advisor

1. Advisor submits application via `/api/advisor-apply`
2. Existing admin reviews via `/admin/advisor-applications`
3. On approval, advisor receives login link; `advisor_sessions` row created on first login
4. All session lifecycle events logged in `advisor_action_log`

### Adding a cron endpoint

1. New route under `app/api/cron/*` MUST start with `requireCronAuth(req)` (enforced by code review)
2. Vercel cron config in `vercel.json` references new endpoint
3. Heartbeat logged to `cron_run_log` on each run

## Access modification

- **Email change:** Admin updates `ADMIN_EMAILS`; old session expires within token lifetime; logged
- **Permission change:** No granular permissions per admin (tier 3 is binary); changes happen by add/remove
- **Advisor tier upgrade/downgrade:** via `/api/advisor-auth/tier-upgrade` route, logged

## Access revocation

### Admin
- Founder removes email from `ADMIN_EMAILS` env var
- All active sessions invalidated within Supabase JWT expiry (default 1 hour)
- For immediate revocation: rotate `ADMIN_MFA_COOKIE_SECRET` (forces re-auth)
- Logged in `admin_action_log` with `revoked: true`

### Advisor
- Mark `advisor_sessions.revoked = true` via `/admin/advisors/[id]/revoke`
- Active sessions terminated within next request

### User
- User-initiated via `/api/account/deletion-request`; processed by GDPR-equivalent runbook
- Admin-initiated via `/admin/users/[id]/disable`

## Audit

### What's logged

- Every admin authentication: `admin_login_attempts` (success + failure)
- Every admin action: `admin_action_log` (CRUD ops on user data, billing, content)
- Every cron run: `cron_run_log` (heartbeat + outcome)
- Every API request: `api_request_log` (route, status, user_id if any, IP, latency)
- Every Stripe webhook: `stripe_webhook_events` with `processing → done` state
- Every CSP violation: `csp_violations`

### Retention

- `admin_action_log`: 7 years (regulatory requirement for AFSL records)
- `admin_login_attempts`: 1 year
- `api_request_log`: 90 days (rolling)
- `cron_run_log`: 90 days (rolling)
- `stripe_webhook_events`: 7 years (regulatory)
- `csp_violations`: 30 days (rolling)

### Review cadence

- Weekly: founder reviews `admin_action_log` for unexpected actions (manual)
- Monthly: founder reviews `admin_login_attempts` for failed-attempt patterns
- Quarterly: founder reviews and re-attests `ADMIN_EMAILS` allowlist

## Multi-Factor Authentication (MFA)

- **Required for:** All admin sessions
- **Mechanism:** `ADMIN_MFA_COOKIE_SECRET`-signed cookie, set after MFA challenge on first login or session expiry
- **TOTP secret storage:** Supabase Auth (`auth.users.factors`)
- **Challenge frequency:** On first login + every 30 days
- **Rotation:** `ADMIN_MFA_COOKIE_SECRET` rotated if compromise suspected; rotation invalidates all admin sessions

## Service-role usage restrictions

The service-role Supabase client (`lib/supabase/admin.ts`) bypasses RLS. Use is restricted to allowed scope per `CLAUDE.md`:

- Admin routes (`app/api/admin/*`, `app/admin/*`)
- Webhooks (`app/api/webhooks/*`)
- Cron jobs (`app/api/cron/*`)
- `lib/*` helpers serving anonymous paths where no JWT is available
- `lib/*` helpers doing cross-user queries that can't be `auth.uid()`-scoped
- `lib/*` helpers with intentional deny-all-RLS bypass (e.g., `require-advisor-session.ts`)
- Tables with service-role-only policies (e.g., `feature_flags`, `web_vitals_samples`)

**Not permitted:**
- Public read tables covered by anon SELECT policies (must use anon client)
- Any new use without justification commented at the call site

**Enforcement:** ESLint rule `no-restricted-imports` blocks `lib/supabase/admin` imports from `lib/**/*.ts` (except `lib/supabase/admin.ts` itself). lint-staged `--max-warnings 0` upgrades violations to commit blockers.

## Physical access

Production infrastructure is hosted on:
- **Vercel** (compute + edge) — physical access controlled by Vercel; SOC 2 Type II + ISO 27001 attested
- **Supabase** (database + auth + storage) — physical access controlled by Supabase + AWS; SOC 2 Type II attested

Founder has no direct physical access to production hardware.

## Compliance evidence

For SOC 2 audit:
- Quarterly access review minutes filed under `docs/compliance/access-reviews/<YYYY-Q>.md`
- Provisioning/revocation events visible in `admin_action_log` with audit trail
- MFA enforcement enforceable via `proxy.ts` source review + `ADMIN_MFA_COOKIE_SECRET` env var review
- Service-role usage audit via grep + ESLint rule output

## Exceptions and waivers

Any deviation from this policy requires:
1. Written justification at the call site (code comment) + in `docs/compliance/access-control-exceptions.md`
2. Founder approval
3. Compensating control documented
4. Annual re-review

Currently logged exceptions: none.

## References

- `proxy.ts` — middleware enforcement
- `CLAUDE.md` — service-role allowed-scope list
- `docs/audits/REMEDIATION_QUEUE.md` — Stream C (admin scope refactor)
- `docs/runbooks/breach-notification.md` — incident response if access compromised
- `docs/runbooks/secret-rotation.md` — rotation procedure
