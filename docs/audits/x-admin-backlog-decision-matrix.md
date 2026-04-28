# Stream X — `createAdminClient` backlog: per-file decision matrix

**Iteration:** X-01
**Date:** 2026-04-27
**Source:** the 17 public RSC pages + 1 route handler that still import `createAdminClient` from `@/lib/supabase/admin` despite serving anonymous traffic. Closing the backlog lets `eslint.config.mjs`'s `no-restricted-imports` rule on `app/**/page.tsx` ratchet from `warn` to `error` (X-09).

This document classifies each file into one of four buckets:

- **SWAP** — file reads tables that have anon-readable RLS policies in production. Straightforward replacement of `createAdminClient()` with `createClient()` from `@/lib/supabase/server`.
- **SWAP-WITH-MIGRATION** — file would be a SWAP except a queried table is missing a public-read RLS policy. Add the policy first, then swap.
- **KEEP-ADMIN** — file legitimately needs service-role: token-gated draft preview, advisor-session cookie reads against tables RLS doesn't cover, etc. Document the exception per file.
- **NEEDS-API-ROUTE** — page mixes read (anon-safe) with write (admin-only). Hoist the write to an API route + use anon for the page.

Verification used: `grep` on `supabase/migrations/*.sql` for `CREATE POLICY` mentions of each queried table, then read each file's top-of-route logic to map tables → call patterns.

---

## Quick-glance summary

| Bucket | Count | Files |
|---|---|---|
| SWAP (anon-safe today) | 11 | best-for ×2, research ×2, invest/funds ×2, invest/[slug]/etfs, invest/[slug]/stocks, invest/[slug]/stocks/[ticker], foreign-investment/siv, advisors/search |
| SWAP-WITH-MIGRATION (RLS gap to fix first) | 2 | how-to/transfer-from ×2 (`broker_transfer_guides` lacks a policy) |
| KEEP-ADMIN (justified service-role) | 3 | preview/[token], advisor-portal/health, advisor-portal/upgrade |
| NEEDS-API-ROUTE (read + admin write) | 2 | go/[slug]/apply, go/[slug]/route.ts |
| **TOTAL** | **18** | |

After X-02..X-08 land, **only 5 files keep `createAdminClient`** under `app/**/page.tsx` + `app/**/route.ts` paths, and all five are documented exceptions. X-09 then ratchets the ESLint rule to `error` with a per-file `// eslint-disable-next-line no-restricted-imports -- justified via X-01 matrix` annotation on the kept exceptions.

---

## Per-file decisions

### Bucket: SWAP — straight client swap

These files read tables that have `CREATE POLICY ... TO anon, authenticated FOR SELECT` (or equivalent `USING (TRUE)` / `USING (status = 'active')`) policies committed in `supabase/migrations/`. The anon Supabase client (`createClient` from `@/lib/supabase/server`) reads through RLS and gets exactly the rows the page needs.

| File | Tables queried | Policy source | Iteration |
|---|---|---|---|
| `app/best-for/page.tsx` | `best_for_scenarios` | `20260510_rls_hardening.sql` — `Public read active best_for_scenarios` (anon, `status = 'active'`) | X-02 |
| `app/best-for/[slug]/page.tsx` | `best_for_scenarios`, `brokers` | Above + `001_initial.sql` — `Public read for active brokers` (`status = 'active'`) | X-02 |
| `app/research/page.tsx` | `sector_reports` | `20260510_rls_hardening.sql` — `Public read published sector_reports` (anon) | X-03 |
| `app/research/[slug]/page.tsx` | `sector_reports` | Same | X-03 |
| `app/invest/funds/page.tsx` | `fund_listings` | `20260510_rls_hardening.sql` — `Public read active fund_listings` (anon) | X-04 |
| `app/invest/funds/[slug]/page.tsx` | `fund_listings` | Same | X-04 |
| `app/invest/[slug]/etfs/page.tsx` | `commodity_etfs`, `commodity_sectors` | `20260510_rls_hardening.sql` — `Public read active commodity_etfs` + `Public read active commodity_sectors` (anon) | X-05 |
| `app/invest/[slug]/stocks/page.tsx` | `commodity_sectors`, `commodity_stocks` | Same + `Public read active commodity_stocks` (anon) | X-05 |
| `app/invest/[slug]/stocks/[ticker]/page.tsx` | `brokers`, `commodity_sectors`, `commodity_stocks` | Brokers + commodity_* policies above | X-05 |
| `app/foreign-investment/siv/page.tsx` | `fund_listings` | `Public read active fund_listings` | X-07 (paired with `/advisors/search` in batch 6) |
| `app/advisors/search/page.tsx` | `professionals` | `001_initial.sql` family + later policies — `Public can view active professionals` (anon, `is_active = true`) | X-07 |

**Risk:** very low. Each swap is a 1-line import change + 1-line client-call change. The RLS policy already filters to active/published rows, which is what the page is doing today via the admin client. Sanity check before merging X-02..X-07: confirm page output is unchanged on local dev with both anon-key and service-role builds.

### Bucket: SWAP-WITH-MIGRATION — table needs a policy first

| File | Tables queried | Missing policy | Resolution path |
|---|---|---|---|
| `app/how-to/transfer-from/page.tsx` | `brokers` (✓ anon-readable), `broker_transfer_guides` (✗ no policy in any migration) | `broker_transfer_guides` is in `lib/database.types.ts` (table 3336) but no `CREATE POLICY` mentions it. Either RLS is disabled on the table (drift), or it was applied directly to live without a migration. Confirm via Supabase MCP, then either backfill an anon-readable policy OR mark the table service-role-only and keep this page on the admin client. | X-06 |
| `app/how-to/transfer-from/[broker_slug]/page.tsx` | Same as above + `brokers` | Same | X-06 |

**Recommendation for X-06:** before swapping, add a migration in stream G or this same iteration:

```sql
ALTER TABLE public.broker_transfer_guides ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read active broker_transfer_guides" ON public.broker_transfer_guides;
CREATE POLICY "Public read active broker_transfer_guides"
  ON public.broker_transfer_guides
  FOR SELECT
  TO anon, authenticated
  USING (status = 'active' OR status IS NULL);
DROP POLICY IF EXISTS "Service role write broker_transfer_guides" ON public.broker_transfer_guides;
CREATE POLICY "Service role write broker_transfer_guides"
  ON public.broker_transfer_guides
  FOR ALL TO service_role USING (true) WITH CHECK (true);
```

Idempotent + matches the `20260510_rls_hardening.sql` pattern. Once the migration lands, the swap is straight.

### Bucket: KEEP-ADMIN — legitimate service-role exception

These three files cannot be swapped to the anon client without changing the application semantics or losing functionality.

| File | Why admin is justified | Exception annotation |
|---|---|---|
| `app/preview/[token]/page.tsx` | Reads DRAFT articles (`status` not `published`). The `articles` policy `CREATE POLICY "Public read articles" ON articles FOR SELECT USING (TRUE)` would technically allow anon access — but the route is gated by a signed `resolvePreviewToken(token)` that confirms the caller has draft-preview privileges. We DO want service-role here so an unrelated ESLint move doesn't accidentally expose drafts via the public read policy if the policy is later tightened. | `// eslint-disable-next-line no-restricted-imports -- token-gated draft preview; service-role enforces draft access regardless of row-level policy state on articles` |
| `app/advisor-portal/health/page.tsx` | Reads `advisor_sessions` table to validate the advisor session cookie. `advisor_sessions` has no anon-readable RLS policy in any migration (table is in types.ts at line 1274 but not policied) — a session-cookie lookup necessarily reads service-role. Page joins to `professionals` next, which IS anon-readable, but the gate is the session lookup. | `// eslint-disable-next-line no-restricted-imports -- advisor session cookie validation requires service-role read of advisor_sessions; that table has no anon policy by design` |
| `app/advisor-portal/upgrade/page.tsx` | Same — same advisor-session-cookie pattern as health. | Same annotation. |

**Optional follow-up (not part of X stream):** the advisor-portal pattern is duplicated in two pages. Hoisting the session-cookie validation into a shared `requireAdvisorSession()` helper at `lib/advisor-auth/session.ts` would centralise the service-role exception (one annotation instead of two). Filed as an X-stream sub-item candidate; not blocking.

### Bucket: NEEDS-API-ROUTE — read OK, write needs admin

| File | Reads (anon-safe) | Writes (admin-only) | Resolution path |
|---|---|---|---|
| `app/go/[slug]/apply/page.tsx` | `brokers` (anon ✓) | Page also persists / mutates application state — see callsite. | X-08: split read into anon-client; hoist any write to a small `/api/go/[slug]/apply/route.ts` POST route that uses `createAdminClient`. |
| `app/go/[slug]/route.ts` | `brokers` (anon ✓ for SELECT) | INSERT into `affiliate_clicks` (`Insert clicks` policy: `TO anon, authenticated WITH CHECK (TRUE)` — anon-writable, see `20260309_security_and_performance_fixes.sql`); UPDATE `campaigns` (table not in any migration; types.ts line 3924; policy state unknown). | X-08: re-verify `affiliate_clicks` write path is genuinely anon-writable in the policy chain (it is, per migration `20260309`). For `campaigns`: either verify it has an anon-writable policy via Supabase MCP, OR keep this route on the admin client because campaigns telemetry is service-role-tracked. The route is server-only (not user-facing UI), so the no-restricted-imports rule doesn't strictly apply — but consistency favours documenting the exception. |

**Recommendation for X-08:** keep `go/[slug]/route.ts` on the admin client. It's a redirect+telemetry endpoint, server-only, and `campaigns` likely needs service-role. Annotate:

```ts
// eslint-disable-next-line no-restricted-imports
//   -- affiliate redirect + telemetry: writes affiliate_clicks (anon-writable
//      per 20260309 RLS hardening) and campaigns (service-role tracked). Server-
//      only entry point; not subject to the public-RSC restriction.
import { createAdminClient } from "@/lib/supabase/admin";
```

For `go/[slug]/apply/page.tsx`, swap the page's read path to anon-client; if there's any persistent state write, defer it to a `POST /api/go/[slug]/apply` route handler.

---

## Open questions for the founder

1. **`broker_transfer_guides` policy state.** The table is in `lib/database.types.ts` but no `CREATE POLICY` references it in any migration. Either (a) RLS was applied directly to live without a migration (drift — surface to stream A), or (b) the table is meant to be service-role-only and types.ts is the only artefact that knows about it. Need a Supabase MCP `list_tables` check + `pg_policies` query to confirm.

2. **`campaigns` table.** Same situation — present in types.ts (line 3924) but no migration `CREATE TABLE` or `CREATE POLICY` references it. The `go/[slug]/route.ts` writes to it. Fix: either backfill the migration in stream A, or document the intentional policy gap.

3. **Advisor-portal session helper extraction.** Shared `requireAdvisorSession()` would let X-stream's two `KEEP-ADMIN` advisor-portal exceptions become one, and DRYs the session-cookie validation pattern. Worth queuing as an X-stream addendum or a separate F-stream hygiene item?

---

## What X-09 (final ratchet) needs

After X-02..X-08 ship and the backlog is clear:

1. Five files remain with `createAdminClient` under `app/**/page.tsx` + `app/**/route.ts`:
   - `app/preview/[token]/page.tsx`
   - `app/advisor-portal/health/page.tsx`
   - `app/advisor-portal/upgrade/page.tsx`
   - `app/advisor-portal/api-token/page.tsx` (audit didn't list, but should be checked)
   - `app/go/[slug]/route.ts`
2. Each has a per-file `eslint-disable-next-line no-restricted-imports -- <justification>` comment.
3. Update `eslint.config.mjs`'s rule for `files: ["app/**/page.tsx", "app/**/layout.tsx"]` from `"warn"` to `"error"`. Add `app/**/route.ts` to the rule's file matcher (currently only `page.tsx`/`layout.tsx`) so server route handlers are also gated.
4. CI on the resulting PR will hard-fail on any future drift.

This closes the audit's "Admin surface" rubric line on the `createAdminClient` antipattern and ratchets the protection from a warning to a hard gate.

---

## Sequencing

The 8 swap iterations (X-02..X-08) are independent — each touches 1–3 files in disjoint route trees. They can ship in any order or parallel. The X-09 ratchet must come last (after the backlog is genuinely clear).

Recommended interleave: pair X-stream iterations with W-stream foundation iterations (W and X are explicitly parallel-eligible per `REMEDIATION_DEFAULTS.md`). One X iteration per W iteration spreads the X load over ~9 hub-foundation iterations without slowing W's velocity.
