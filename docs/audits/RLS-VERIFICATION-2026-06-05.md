# RLS anon-read verification — 2026-06-05

Session #9. A writable test DB isn't available in this container, so the RLS
isolation fixes from the security sessions (#1410 round 1, #1431 round 2,
booking/auth-token locks, #1432 weights) were verified the authoritative way:
executing a live `set role anon` row-count probe against production (the same
method that originally found the leaks). A locked table returning 0 rows to the
`anon` role proves anon can no longer read it.

## Result — every locked table returns 0 rows to anon

| Table | anon rows | Fix |
|---|---:|---|
| advisor_applications | 0 | is_admin() (#1431) |
| advisor_bookings | 0 | route→service-role + lock (#1431) |
| advisor_auth_tokens | 0 | verify→service-role + lock (#1431) |
| api_keys | 0 | service_role (#1431) |
| user_portfolios | 0 | service_role (#1431) |
| data_license_subscribers | 0 | service_role (#1431) |
| lead_disputes | 0 | is_admin() (#1431) |
| advisor_billing | 0 | is_admin() (#1410) |
| fee_alert_subscriptions | 0 | is_admin() (#1410) |
| weights | 0 | service_role (#1432) |

Probe: `SET ROLE anon; SELECT count(*) FROM public.<table>;` per table, run via
the Supabase MCP against project guggzyqceattncjwvgyc. All returned 0.

## CI regression guard
A pure-unit guard for the related broker-commercial-field exposure class ships in
`__tests__/lib/broker-field-exposure.test.ts` (asserts `stripInternalBrokerFields`
strips all 7 internal fields). A DB-backed RLS isolation test belongs in the
`*.int.test.ts` suite once a sandbox Supabase is provisioned — tracked.
