# Account types — architecture

How invest.com.au represents the different *kinds* of accounts that share
a single Supabase `auth.users` table. This doc is the source of truth for
how to add a new account kind without making a structural mistake.

Read this if you're about to:
- introduce a sixth kind (wholesale operator, firm partner, etc.),
- relax or replace the single-account-per-user invariant,
- add an admin/billing/auth path that needs to branch on what kind of
  account is logged in.

## Today

Five kinds of authenticated accounts exist in production. Each lives in
its own entity table, each links to `auth.users` via a unique-indexed
`auth_user_id` column, and each owns its own RLS policies. There is no
central `accounts` registry — at current volume it would be premature
normalisation. Multi-kind users are unioned via the
`account_kind_membership` view (current definition in
`supabase/migrations/20260510240000_listing_owner_accounts.sql`).

| Kind             | Entity table              | Portal               | Compliance scope                |
|------------------|---------------------------|----------------------|---------------------------------|
| `advisor`        | `professionals`           | `/advisor-portal`    | AFSL Class 1/2 (per advisor)    |
| `broker_partner` | `broker_accounts`         | `/broker-portal`     | None (marketplace, no AFSL)     |
| `investor`       | `investor_profiles`       | `/account`           | GDPR / Privacy Act (end-user data)|
| `business_owner` | `business_accounts`       | `/business-portal`   | None — factual computation only (grants, R&D, sell-prep)|
| `listing_owner`  | `listing_owner_accounts`  | `/invest/my-listings`| NSW/VIC/QLD real-estate licence (per listing)|
| (admin)          | `ADMIN_EMAILS` allow-list (env var) | `/admin/login` | Internal staff, MFA-protected per V-NEW-07 |

Admins are deliberately not an entity table — the allow-list
(`lib/admin.ts:getAdminEmails`) is the simplest possible representation
and covers the use case (a fixed group of internal staff with an MFA
requirement). If we ever onboard external admin-style users (e.g.
agency partners with admin views), promote that case to its own kind.

A single `auth.users` row can hold at most one row per kind, enforced by
unique indexes on each entity table's `auth_user_id`. Real-world users
hold multiple kinds simultaneously — e.g. a sole-trader financial
planner is `advisor` + `business_owner` + `investor` at once. The
`account_kind_membership` view UNIONs across all entity tables so callers
can answer "what hats does this user wear?" in one query; portal layouts
read the `iv_active_kind` cookie (set via `/api/account/active-kind`)
to decide which workspace context to render.

### Code references

- `lib/account-types.ts` — `AccountKind` enum, single import surface.
- `lib/require-advisor-session.ts` — auth guard for `professionals` rows
  (resolves either Supabase JWT → `auth_user_id`, or the legacy
  `advisor_session` cookie → `advisor_sessions.professional_id`).
- `lib/marketplace/broker-auth.ts` — auth guard for `broker_accounts`
  (Supabase JWT → `auth_user_id` only; no legacy cookie).
- `supabase/migrations/20260429_professionals_auth_user_id.sql` — added
  the unique index that makes the `auth_user_id` linkage authoritative.
- `supabase/migrations/20260603_c02_advisor_auth_rls_hardening.sql` —
  reference RLS policy for an entity table:
  `USING (auth_user_id = auth.uid())`.

## The pattern: how to add a new kind

When (not if) we need to add a new account type, follow this pattern.
**Do not** introduce a master `accounts` table or an account-type column
on `auth.users` — that's premature normalisation we'll regret.

1. **New entity table** — `<kind>s` (plural). Always include:
   - Primary key (`id` bigint generated always as identity).
   - `auth_user_id uuid REFERENCES auth.users(id)` with a unique index.
   - `status text` with a CHECK constraint of legal states.
   - `created_at timestamptz NOT NULL DEFAULT now()`,
     `updated_at timestamptz NOT NULL DEFAULT now()`.
2. **RLS** — enable + force RLS, add a `<kind> reads/updates own row`
   policy (`USING (auth_user_id = auth.uid())`) and a service-role-full
   policy. No anon access unless the entity table is intentionally public.
3. **Auth guard** — add `lib/require-<kind>-session.ts` mirroring
   `lib/require-advisor-session.ts`. Returns the entity row's primary
   key or `null`. Routes that need the kind to be present call this at
   the top.
4. **Onboarding flow** — magic-link signup with the entity row created
   in `pending` status; admin-side approval flips it to `active`. Avoid
   passwords for new kinds; magic-link is enforced today and matches
   our compliance posture.
5. **Add the literal** to `AccountKind` in `lib/account-types.ts` and
   to `ACTIVE_ACCOUNT_KINDS`. Update this doc.
6. **Compliance review** — the kind's compliance scope (below) determines
   what disclosures, audit logging, and KYC are required.
7. **Tests** — RLS isolation test (kind A cannot read kind B's rows),
   auth-guard test (401/200), happy-path test for the onboarding flow.

## Future kinds (planned, not yet shipped)

These are kinds we have a clear product reason for but have not yet
shipped. Each would follow the pattern above.

| Kind                   | Entity table         | Compliance scope                                        |
|------------------------|----------------------|---------------------------------------------------------|
| `wholesale_operator`   | `wholesale_operators`| Corporations Act s708 sophisticated-investor declaration|
| `firm_partner`         | `firm_partners`      | AFSL licensee delegation; admin-of-firm role            |

`firm_partner` separates the firm-admin role from the individual-advisor
role on `professionals` (today firm admins are flagged via
`professionals.is_firm_admin`, which is fine for single-table firm
management but breaks down once firms want non-advising admins).
`wholesale_operator` unblocks rendering wholesale offers to declared
s708 investors without a retail-investor compliance liability.

## Compliance considerations per kind

- **`advisor`** — AFSL holder; subject to RG 234 / 256 conduct rules,
  AFCA dispute resolution, ASIC Professional Registers verification on
  signup, Class 1/2 distinguishes whether they can deal in financial
  products. `lib/compliance.ts:AFSL_VERIFIED_NOTE` is the canonical
  surface copy. Audit-log every fee-impacting action.
- **`broker_partner`** — not an AFSL holder in our model; they're the
  *referred* product, not the advisor. ASIC marketing rules still apply
  (target market determination, ranked-by-paid disclosure). The
  `SPONSORED_DISCLOSURE` constant in `lib/compliance.ts` covers the
  surface copy.
- **`investor`** — GDPR / Privacy Act data subject. Delete-on-request must
  cascade through `investor_profiles`, `investor_watchlists`,
  `investor_holdings`, `investor_goals`, `property_holdings`,
  saved searches, comparisons, and newsletter preferences. Personalised
  outputs must remain comparison or factual-computation — no personal
  advice surfaces pre-AFSL.
- **`business_owner`** — no AFSL exposure today; grants/R&D/sell-prep
  surfaces are factual computation over the user's stated business
  attributes (industry, revenue band, employees band, state). ABN/ACN
  collected but not yet verified against ABR; verification deferred until
  there's a downstream surface (lead routing, paid tier) that requires it.
- **`listing_owner`** — claimed listings expose the owner's contact
  information; verification today is via OTP-cookie or magic-link. If a
  listing carries NSW/VIC/QLD real-estate licence claims, the licence
  number must be recorded on the listing row and the wash-sale /
  underquoting rules of that state apply.
- **`wholesale_operator`** (future) — store the s708 declaration with
  versioned consent. Block retail-investor surfaces from rendering
  wholesale offers without the declaration on file.
- **`firm_partner`** (future) — inherits the firm's AFSL; firm-admin
  actions (adding/removing advisors, pooling credit) need audit-log
  entries that name both the firm and the actor.

## When the single-account-per-user invariant breaks

Two scenarios where the unique-index pattern stops working and we need
to relax it:

1. **A single auth.users wears multiple hats of the same kind** — e.g.
   one person operates two distinct advisor businesses. Today we'd
   create two auth users; if we ever support multi-business advisors
   on a single login, the `professionals.auth_user_id` unique index
   has to drop and code that does `.eq("auth_user_id", uid).single()`
   becomes incorrect.
2. **Admin impersonation / "act-as" flows** — staff acting as an
   advisor for support. Today this is done via service-role admin
   tooling (no impersonation in the UX). If we add an "act as advisor
   X" feature, we need an explicit impersonation token rather than
   relying on `auth.uid()`.

If either of these ships, the right shape is a join table:

```sql
CREATE TABLE user_account_kinds (
  auth_user_id uuid NOT NULL REFERENCES auth.users(id),
  kind text NOT NULL,                   -- references AccountKind
  entity_id bigint NOT NULL,            -- FK to the entity table
  is_default boolean NOT NULL DEFAULT false,
  PRIMARY KEY (auth_user_id, kind, entity_id)
);
```

…with a session-state column (`current_account_kind`) chosen in the UI
and read by the auth guards. We don't need this today — listing it so
the pattern is in the codebase memory if/when the volume justifies it.

## Generalisation hook (deferred)

A future `requireAccountSession(kind: AccountKind, request)` could
collapse the per-kind auth guards into one helper. Today we have:

- `requireAdvisorSession(request) → number | null` (advisor PK)
- `requireBrokerAccount() → BrokerSession | null`

The two have different return shapes (PK vs full session bundle) and
different data sources (cookie vs RSC client). Unifying them is a
refactor for when we have ≥3 kinds, not before.
