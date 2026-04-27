# Supabase advisor findings — residual after F-4.4.2 (pg_graphql revoke)

The 04-26 audit (§4.4) catalogued **261 security advisor findings** (2 ERROR
+ 259 WARN). The K-stream pg_graphql REVOKE landed on 2026-04-26 (commit
`b5d7ad72` and predecessors) and closed the 241 `pg_graphql_anon_table_exposed`
findings in one shot. **20 findings remain.** This doc breaks them down by
fix size so we can ship the easy wins as a batch and triage the rest.

> **Status:** read-only diagnosis. Author of any follow-up PRs should
> confirm against `mcp__claude_ai_Supabase__get_advisors` for the
> latest live count — these numbers are from the audit snapshot.

## The 20 by lint type

| Lint | Count | Severity | Tier |
|---|---:|---|---|
| `rls_policy_always_true` | 9 | WARN | Audit each |
| `function_search_path_mutable` | 4 | WARN | **Quick batch** |
| `extension_in_public` | 2 | WARN | Deeper |
| `rls_disabled_in_public` | 1 | ERROR | Document-only (intentional) |
| `security_definer_view` | 1 | WARN | Investigate |
| `materialized_view_in_api` | 1 | WARN | Investigate |
| `public_bucket_allows_listing` | 1 | WARN | Dashboard fix |
| `auth_leaked_password_protection` | 1 | WARN | **Dashboard toggle** |
| **Total** | **20** | — | — |

## Quick batch (≤30 min each, ship together)

### 1. `auth_leaked_password_protection` (1 finding)

Toggle in Supabase dashboard — **no migration needed**.

- Where: Supabase project → Authentication → Policies → "Password leak
  protection" (powered by HaveIBeenPwned).
- Effort: 2 min.
- Impact: closes 1 finding; future logins are checked against the HIBP
  breach corpus and rejected if pwned.
- Risk: zero (only adds checks; doesn't break existing sessions).

### 2. `rls_disabled_in_public` (1 finding) — `spatial_ref_sys`

Intentional — PostGIS internal table. The fix is documenting + suppressing,
not enabling RLS.

- Action: add a one-line `COMMENT ON TABLE public.spatial_ref_sys IS
  'PostGIS reference data; RLS intentionally disabled — see Supabase
  advisor suppression note 2026-04-26';` migration.
- Effort: 5 min.
- Impact: closes the only ERROR-level finding (visually) and keeps the
  intent on-record. Supabase advisor still surfaces it as ERROR but in
  PR/queue conversation we can point at the comment.
- Alternative: file a Supabase support ticket asking them to mark
  `spatial_ref_sys` as a known-allow on this project. Lower-friction
  long-term.

### 3. `function_search_path_mutable` (4 findings)

Cause: PL/pgSQL functions defined without `SET search_path = ''` (or a
fixed search_path) can be hijacked if an attacker manages to insert a
shadowing function in a writable schema. Fix: `ALTER FUNCTION ... SET
search_path = ''` on each. Defensive, low-risk.

**Important constraint** — the audit (§4.2) notes `lib/database.types.ts`
sees ~150 `public.*` functions but the repo only has **6 `CREATE FUNCTION`
statements** in migrations:

```
20260305_create_advisor_directory.sql:121  update_updated_at()
20260309_advisor_reviews_and_views.sql:75  increment_advisor_view(int, date)
20260315_revenue_optimization.sql:23       calculate_broker_revenue_score(...)
20260402_investment_listings.sql:1239      increment_listing_enquiries(int)
20260402_investment_listings.sql:1253      increment_listing_views(int)
20260512_agent_infrastructure.sql:29       set_updated_at_agent_infra()
```

The other ~144 functions are drift (live-only, applied via Supabase MCP or
dashboard SQL editor). The 4 flagged functions could be in either set.

**Recommended action: query Supabase advisor for the actual flagged names
before writing the migration.** Once known, use one of two patterns:

```sql
-- For in-repo functions: edit the original migration to add SET clause
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger LANGUAGE plpgsql
SET search_path = '' AS $$ ... $$;

-- For drift functions: fresh migration that ALTERs them
ALTER FUNCTION public.<function_name>(<args>) SET search_path = '';
```

- Effort if all 4 are in-repo: ~30 min (edit + verify + test).
- Effort if some are drift-only: same + a backfill migration per O-03 pattern.
- O-03 (`refresh_advisor_cohort_metrics()`) is queued separately and is
  almost certainly one of these 4.

**Quick-batch PR shape**: HIBP toggle (manual) + spatial_ref_sys comment
migration + (4) function search_path migration → closes **6 of 20**.

## Deeper work (>30 min each, separate PRs)

### 4. `rls_policy_always_true` (9 findings)

Tables with `USING (true)` SELECT policies. Some are intentional public-read
(`articles`, `brokers`, `versus_editorials` — confirmed in audit). The other
6 need per-table audit. Workflow:

- For each table: identify if it holds PII or business-sensitive data.
- If yes: tighten the policy (e.g., scope to `published = true`).
- If no: add a comment justifying public-read + leave the lint to be
  suppressed.
- Effort: ~2–4 h depending on how many actually need policy tightening.

### 5. `extension_in_public` (2 findings)

Two extensions are installed in the `public` schema instead of a dedicated
`extensions` schema. Standard fix:

```sql
CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION <name> SET SCHEMA extensions;
```

- Risk: any caller that references the extension by `public.<extension_thing>`
  breaks. Pre-flight: `grep -rn "public\.<extension>" lib app supabase`.
- Effort: ~2 h (1 h to identify the extensions + grep callers + decide,
  1 h to write/test the migration).

### 6. `security_definer_view` (1 finding)

A view defined with `SECURITY DEFINER`, which runs the underlying query as
the view's owner instead of the caller — bypasses RLS for the underlying
tables. Sometimes intentional (e.g., aggregating across user-scoped tables
for an admin dashboard) but always worth a sanity check.

- Action: find the view name (advisor query), audit whether definer is
  needed, switch to `SECURITY INVOKER` if not.
- Effort: ~1 h.

### 7. `materialized_view_in_api` (1 finding)

A materialized view that's exposed via PostgREST and therefore accessible by
the anon key. If it contains sensitive aggregates, revoke the `anon`/`authenticated`
GRANT.

- Effort: ~1 h.

### 8. `public_bucket_allows_listing` (1 finding)

A storage bucket whose policy allows `LIST` operations on the public anon
key. Risk: anyone can enumerate object names. Fix in the Supabase dashboard
→ Storage → bucket → Policies, or via the Storage API.

- Effort: ~15 min once the bucket is identified.

## Rollup — what to ship today vs later

| Bundle | Findings closed | Effort | Recommended PR |
|---|---:|---|---|
| **Quick batch** (HIBP + spatial_ref_sys + function search_path) | 6 / 20 | ~45 min | One PR (or 2 if HIBP is dashboard-only) |
| `rls_policy_always_true` audit | 0–9 / 20 | 2–4 h | Per-table-cluster PR (queue O-06 placeholder) |
| `extension_in_public` migration | 2 / 20 | 2 h | Stand-alone PR after extension audit |
| `security_definer_view` review | 0–1 / 20 | 1 h | Stand-alone PR |
| `materialized_view_in_api` review | 0–1 / 20 | 1 h | Stand-alone PR |
| `public_bucket_allows_listing` | 1 / 20 | 15 min | Dashboard fix; doc-only PR |

After the quick batch + dashboard toggles: **8 / 20 closed** with ~1 h of
human + Claude time. The remaining 12 are real engineering work and should
flow through the queue.

## Tracking

- Quick batch → file as queue item **O-06** if not already present.
- `rls_policy_always_true` deep-dive → queue item **O-07**.
- `extension_in_public` migration → queue item **O-08**.
- The single-finding investigations (security_definer_view,
  materialized_view, public_bucket_allows_listing) → fold into existing
  O-stream queue items rather than spawning new IDs each.

Refresh advisor counts via `mcp__claude_ai_Supabase__get_advisors` after
each batch lands so the queue notes don't drift.
