# Identity Platform — Staging Validation Runbook + Split Plan

**Branch:** `claude/audit-account-architecture-7186H` (PR #964)
**Date:** 2026-05-20
**Status:** built + 4-agent-reviewed; NOT yet machine-validated (see prerequisite)

This is the turnkey guide to (a) validate the branch, (b) apply its migrations to
staging, and (c) split it into reviewable PRs. Everything here is mechanical once
the prerequisite is met.

---

## 0. Hard prerequisite — get CI actually green first

CI's `Lint·Type-check·Test·Build` job currently dies at the chronic JSON-LD gate
on `main` (`app/just/page.tsx`, from #1020) **before** it ever runs `tsc` / tests /
build. So this branch's TypeScript and tests have **never been machine-validated**.
Do NOT merge or apply migrations until one of these proves it's sound:

- **Land PR #1053** (the jsonld fix) → rebase this branch → CI runs the real build job here.
- **Or validate locally:** `npm ci && NODE_OPTIONS="--max-old-space-size=5120" npm run type-check && npm test && npm run build`.

A 4-agent deep review (lib / migrations / API / tests+components) already fixed
4 blockers + ~10 security/correctness issues (commit `08e32ea`), but a real
`tsc`/`build`/`vitest` run is still owed.

---

## 1. Migration apply order (27 migrations, forward-only)

Apply strictly in filename-timestamp order — the dependency chain is already
encoded in the timestamps. Key checkpoints called out.

```
20260801000000_principals_table
20260801000100_principal_id_on_entity_tables
20260801000200_backfill_principals            ← CHECKPOINT A (verify below)
20260801000300_account_kind_membership_via_principals   (DROP+CREATE view, security_invoker)
20260801000400_principal_id_on_partner_tables
20260801000500_backfill_partner_org_principals
20260801000600_squad_workspace_kind            (DROP+CREATE view)
20260801000700_investor_household_type          ← CHECKPOINT B (backfill from JSON)
20260801000800_gdpr_soft_delete
20260801000900_account_kind_preferences
20260801001000_broker_team
20260801001100_forum_moderation
20260801001400_soft_delete_rls_marketplace_tables   ← CHECKPOINT C (marketplace read)
20260801001500_audit_events
20260801001600_admin_rbac                       (seeds roles + capability matrix)
20260801001700_lead_demand_signals
20260801001800_identity_analytics_views         (service_role-only grants)
20260801001900_lead_conversion_stats            (service_role-only grant)
20260801002000_firm_subscriptions
20260801002100_squad_tiers
20260801002200_wholesale_listings
20260801002300_embed_usage
20260801002400_agent_internal_identity          (widens principals.kind CHECK)
20260801001200_pricing_matrix
20260801001300_wholesale_operator_and_embed_customer   (DROP+CREATE view, final)
```
> Note: `001200`/`001300` sort after `001100` but their content (pricing tiers,
> the two new kinds + final view rebuild) is independent of `0014..0024`; Supabase
> applies by filename so the order above is what runs. The final
> `account_kind_membership` definition is the one in `001300` (8 UNION branches).

Trigger idempotency caveat: `CREATE TRIGGER` is not `IF NOT EXISTS`-guarded, so
re-running a single already-applied migration errors on the trigger. Forward-only
prod never re-runs, so this only matters if you replay one by hand — prepend
`DROP TRIGGER IF EXISTS <name> ON <table>;` if you must.

---

## 2. Verification queries (run after applying)

**CHECKPOINT A — principals backfill is 1:1 (no orphans, no dupes):**
```sql
-- every auth-user-backed entity row maps to exactly one human principal
SELECT
  (SELECT count(*) FROM principals WHERE kind='human' AND auth_user_id IS NOT NULL) AS human_principals,
  (SELECT count(DISTINCT auth_user_id) FROM (
     SELECT auth_user_id FROM professionals WHERE auth_user_id IS NOT NULL
     UNION SELECT auth_user_id FROM broker_accounts WHERE auth_user_id IS NOT NULL
     UNION SELECT auth_user_id FROM investor_profiles WHERE auth_user_id IS NOT NULL
     UNION SELECT auth_user_id FROM business_accounts WHERE auth_user_id IS NOT NULL
     UNION SELECT auth_user_id FROM listing_owner_accounts WHERE auth_user_id IS NOT NULL
   ) u) AS distinct_entity_users;   -- the two counts must match
-- no entity row left unlinked
SELECT count(*) FROM professionals WHERE auth_user_id IS NOT NULL AND principal_id IS NULL;  -- expect 0 (repeat per kind table)
```

**View sanity (must return rows, 8 columns incl. principal_id + scope_slug):**
```sql
SELECT kind, count(*) FROM account_kind_membership GROUP BY kind;
SELECT * FROM account_kind_membership LIMIT 1;   -- confirm scope_slug column exists
```

**CHECKPOINT B — household_type backfilled:**
```sql
SELECT household_type, count(*) FROM investor_profiles GROUP BY household_type;
SELECT count(*) FROM investor_profiles WHERE household_type IS NULL;  -- expect 0
```

**CHECKPOINT C — marketplace read unbroken (no active advisor hidden):**
```sql
SELECT count(*) FROM professionals WHERE status='active' AND deleted_at IS NULL;  -- = your live active count
```

**RLS spot-check (security_invoker views + admin RBAC):**
```sql
-- analytics views must NOT be readable by authenticated (service_role only)
SELECT has_table_privilege('authenticated','multi_kind_cohort_stats','SELECT');  -- expect false
-- admin capability lookup resolves (embedded through admin_roles)
SELECT au.email, arc.capability
FROM admin_users au
JOIN admin_role_capabilities arc ON arc.role_id = au.role_id
LIMIT 5;   -- after you've seeded admin_users
```

---

## 3. Post-apply wiring (feature-flag OFF first)

- Vercel cron entries + `feature_flags` rows (`is_disabled = true` initially) for
  `redact_deleted_users` + `hard_delete_expired_users`.
- `feature_flags` rows for `redact_deleted_users` etc. start disabled; flip when ready.

---

## 4. Deferred follow-ups (built additive; one integration step each)

| Item | What's owed | Risk if skipped |
|---|---|---|
| embed usage counter (#6) | swap read-modify-write for an atomic `increment_embed_usage` RPC | undercounts billing under concurrency |
| ranker wiring (#9 forum boost, #4 squad boost) | add the boost to the brief-routing / advisor-ranker sort (flag-gated) | signals built but inert |
| widget middleware (#6) | call `verifyAndMeter` on `/api/widget` | quota not enforced |
| Stripe webhooks (#13 firm, #4 squad) | subscription lifecycle handlers | subs can't activate |
| demand cron (#3) | cron to compute `lead_demand_signals` | multiplier stays 1.0 |
| agent identity cutover (#15) | backfill 19 agents + `agent_logs` `agent_name→agent_id` (R1-HIGH, dual-write trigger + 7-day soak) | **founder-owned** |
| admin RBAC cutover (#14) | remove env-superuser branch once admins are in `admin_users` | **founder-owned** |
| trigger idempotency | `DROP TRIGGER IF EXISTS` guards if you ever replay a migration | partial-replay only |

---

## 5. Split plan — one branch → reviewable PRs (do AFTER CI-green)

Splitting now produces PRs that still can't be CI-validated until #1053, and the
migrations carry timestamp-ordering constraints, so **execute this only once the
build is green**. Carve in dependency order; each PR branches off the previous
(stacked) OR off main once the prior merges.

| PR | Theme | Commits | Depends on |
|----|-------|---------|------------|
| 1 | Principals foundation + codegen | `01a00d5 253a8c1 3fc7b77` | — |
| 2 | Squads as workspace | `4ddc89f 7ee9a39 947e0c3 16d18ca` | PR1 |
| 3 | GDPR + investor enum + claim helper | `5b39d2d c4cc01f 5da569a 60a95a9 78b2a8a aeb60f1` | PR1 |
| 4 | Broker partner teams | `932ff8b 9853c81` | PR1 |
| 5 | Forum moderation | `5baa3df 121f425` | PR1 |
| 6 | Workspace prefs + cookie hardening | `c303756 276d416` | PR2 |
| 7 | Pricing matrix + new kinds (wholesale/embed) | `ed6f65e b3b6b33 5ae2fbb 9424da7` | PR1 |
| 8 | Expansion ideas (audit, teams-depth, RBAC, sponsor, demand, analytics, credibility, conversion) | `47caecb 0c92e8a 8abd7a1 63bcbe8 603fe27 7160d2b eacea3b d035eec 0dab688` | PR1, PR7 |

The cross-cutting review-fix commit (`08e32ea`) touches files across PRs 1/3/4/5/7/8;
when carving, apply each hunk to the PR that owns the file (or land it as a small
follow-up after the set merges). The two view-rebuild migrations + `principals`
must be in PR1 so every later PR's `account_kind_membership` references resolve.

Carve command per PR (example, PR1):
```bash
git checkout -b split/principals-foundation origin/main
git cherry-pick 01a00d5 253a8c1 3fc7b77
git push -u origin split/principals-foundation
# open draft PR; repeat per row, rebasing each on the prior once merged
```

Merge order = the dependency column. PR1 first, then 2–5 + 7 (parallel-ish off
PR1), then 6 (needs PR2) and 8 (needs PR7).
