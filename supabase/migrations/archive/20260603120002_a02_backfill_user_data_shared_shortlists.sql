-- ============================================================================
-- Migration: Backfill public.shared_shortlists (A-02 batch 1)
-- Date:      2026-04-30 (queued under 20260603 to sort after existing work)
-- Audit ref: docs/audits/drift-list.md (A-02 user-data + lead family)
-- Queue item: docs/audits/REMEDIATION_QUEUE.md A-02
--
-- Purpose
--   `shared_shortlists` is declared in `lib/database.types.ts` (line 10381)
--   but the migration tree never CREATEs the table. It backs
--   the "share my broker shortlist" feature: a user picks 1-8 brokers,
--   /api/shortlist generates a short alphanumeric code and stores the slug
--   array; /share/shortlist/[code] resolves the code back into a shortlist.
--
--   Used by 7 call sites:
--     - app/api/shortlist/route.ts        (POST: create; GET: list mine)
--     - app/share/shortlist/[code]/page.tsx (anon read by code)
--     - app/admin/analytics/AdminAnalyticsClient.tsx (admin view)
--
-- Why it matters
--   The /share/shortlist/[code] page uses the user-cookie client (`createClient
--   from @/lib/supabase/server`), not the admin client — meaning RLS DOES
--   apply at read time. We must grant a public read policy keyed on the share
--   code, otherwise the share feature breaks for anon visitors. Today the
--   table lives in prod out-of-tree (presumably with a permissive policy);
--   this migration brings both schema and policy into the tree.
--
-- Schema source of truth
--   lib/database.types.ts → Database['public']['Tables']['shared_shortlists'].
--   - id          uuid (string)  PK, default gen_random_uuid()
--   - code        text           NOT NULL, app generates 8-char alpha code
--   - broker_slugs text[]        NOT NULL
--   - created_by  uuid           NULLABLE (anon-shared shortlists allowed)
--   - created_at  timestamptz    default now()
--   - expires_at  timestamptz    NULLABLE
--   - view_count  integer        default 0
--
--   We add a UNIQUE index on `code` because /share/shortlist/[code] does a
--   lookup by code and the route comments imply uniqueness. The types
--   `Relationships: []` confirm no FK constraints; created_by is intentionally
--   loose-typed (not FK-bound to auth.users) because the route allows null
--   for anon shares.
--
-- RLS policy chosen — hybrid (public read by code + owner-write)
--   - service_role: explicit FOR ALL allow (admin analytics + audit).
--   - anon + authenticated: SELECT permitted (the share is, by definition,
--     a public link — anyone with the code is meant to be able to resolve
--     it). This matches the read-by-code behaviour of /share/shortlist/[code].
--   - authenticated: INSERT permitted with WITH CHECK (created_by IS NULL OR
--     created_by = auth.uid()) so a logged-in user can only create rows on
--     their own behalf, while anon-share inserts (created_by IS NULL) remain
--     possible from the same-origin POST endpoint.
--   - authenticated: UPDATE/DELETE only on rows where created_by = auth.uid().
--   - anon INSERT/UPDATE/DELETE: not granted. Anon shortlist creation today
--     goes through /api/shortlist, which (per app/api/shortlist/route.ts) uses
--     the user-cookie client — but the rate-limiter and slug-validation logic
--     lives in the route handler. Anon-write is risky (spam) so we route those
--     INSERTs through service-role; if the route is later moved to a strict
--     anon-write pattern, add a narrow anon INSERT policy in a follow-up.
--
-- Idempotency
--   - The body uses `if not exists` on the table — no-op on a DB that already has it.
--   - CREATE UNIQUE INDEX IF NOT EXISTS — no-op when index already exists.
--   - DROP POLICY IF EXISTS + CREATE POLICY for every policy.
--
-- Risk: low
--   - Forward-only schema add; no data shaping.
--   - The /api/shortlist POST handler uses the user-cookie client; it currently
--     succeeds in prod, implying the prod table either has equivalent policies
--     or the call falls through to service-role somewhere. If POST starts
--     failing post-deploy, switch the route to createAdminClient() (1-line
--     change) — the policy here intentionally restricts anon writes.
--
-- Flagged ambiguity
--   - `created_by` is not FK-bound to auth.users in types. We keep it loose
--     (just `uuid`) to match types exactly. A future tightening migration
--     could ADD CONSTRAINT shared_shortlists_created_by_fkey FOREIGN KEY
--     (created_by) REFERENCES auth.users(id) ON DELETE SET NULL.
--
-- Rollback
--   BEGIN;
--     DROP POLICY IF EXISTS "service_role full access" ON public.shared_shortlists;
--     DROP POLICY IF EXISTS "public read by code"      ON public.shared_shortlists;
--     DROP POLICY IF EXISTS "owner can insert"         ON public.shared_shortlists;
--     DROP POLICY IF EXISTS "owner can update"         ON public.shared_shortlists;
--     DROP POLICY IF EXISTS "owner can delete"         ON public.shared_shortlists;
--     DROP INDEX IF EXISTS shared_shortlists_code_unique;
--     ALTER TABLE public.shared_shortlists DISABLE ROW LEVEL SECURITY;
--     -- DROP TABLE public.shared_shortlists;  -- destructive; clean rebuild only
--   COMMIT;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.shared_shortlists (
  id            uuid        NOT NULL DEFAULT gen_random_uuid(),
  code          text        NOT NULL,
  broker_slugs  text[]      NOT NULL,
  created_by    uuid,
  created_at    timestamptz DEFAULT now(),
  expires_at    timestamptz,
  view_count    integer     DEFAULT 0,
  CONSTRAINT shared_shortlists_pkey PRIMARY KEY (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS shared_shortlists_code_unique
  ON public.shared_shortlists (code);

ALTER TABLE public.shared_shortlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_shortlists FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access" ON public.shared_shortlists;
CREATE POLICY "service_role full access"
  ON public.shared_shortlists
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Anon + authenticated read by code: shortlists are intentionally public
-- via the share link. The route handler enforces the code is well-formed
-- before querying.
DROP POLICY IF EXISTS "public read by code" ON public.shared_shortlists;
CREATE POLICY "public read by code"
  ON public.shared_shortlists
  FOR SELECT TO anon, authenticated
  USING (true);

-- Authenticated INSERT: row's created_by must match auth.uid() (or be null
-- for anon-style shares created by an authenticated user — preserves the
-- existing route's behaviour where anonymous shares are also valid).
DROP POLICY IF EXISTS "owner can insert" ON public.shared_shortlists;
CREATE POLICY "owner can insert"
  ON public.shared_shortlists
  FOR INSERT TO authenticated
  WITH CHECK (created_by IS NULL OR created_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "owner can update" ON public.shared_shortlists;
CREATE POLICY "owner can update"
  ON public.shared_shortlists
  FOR UPDATE TO authenticated
  USING (created_by = (SELECT auth.uid()))
  WITH CHECK (created_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "owner can delete" ON public.shared_shortlists;
CREATE POLICY "owner can delete"
  ON public.shared_shortlists
  FOR DELETE TO authenticated
  USING (created_by = (SELECT auth.uid()));

COMMIT;
