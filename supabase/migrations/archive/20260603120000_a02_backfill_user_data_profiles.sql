-- ============================================================================
-- Migration: Backfill public.profiles (A-02 batch 1)
-- Date:      2026-04-30 (queued under 20260603 to sort after existing work)
-- Audit ref: docs/audits/drift-list.md (A-02 user-data + lead family)
-- Queue item: docs/audits/REMEDIATION_QUEUE.md A-02
--
-- Purpose
--   `profiles` is declared in `lib/database.types.ts` (line 9261) but the
--   migration tree never CREATEs the table. It is the canonical
--   per-user mirror of auth.users — keyed on the auth user UUID, holds email,
--   display name, Stripe customer id, and four notification-opt-in booleans.
--   13 call sites in app/ + lib/ depend on it (consultation/book, course
--   /purchase, stripe checkout/portal, unsubscribe, subscription-dunning cron,
--   stripe-webhook handlers).
--
--   This migration creates the table forward-only with the exact column set
--   the app expects, plus RLS isolating each user to their own row.
--
-- Why it matters
--   Without this schema declaration in the migration tree, a fresh Supabase
--   environment built from supabase/migrations/* would not match what the
--   app's TypeScript expects, and any code path hitting profiles via the
--   user-cookie client (e.g. /api/stripe/create-portal) would 500. Today's
--   prod database carries the table out-of-tree; this migration brings the
--   declaration in-tree so prod and a clean rebuild are byte-equivalent.
--
-- Schema source of truth
--   lib/database.types.ts → Database['public']['Tables']['profiles'].
--   Columns match Insert/Row exactly. `id uuid` is both the primary key and
--   the foreign key to auth.users(id) — Supabase's standard "profile mirrors
--   auth user" pattern. We add an ON DELETE CASCADE so deleting an auth user
--   also drops their profile (GDPR-friendly).
--
-- RLS policy chosen — owner-isolation (per-user row)
--   - service_role: explicit FOR ALL allow (audit visibility; service-role
--     bypasses RLS regardless).
--   - authenticated: SELECT/UPDATE/INSERT/DELETE all scoped via
--       USING (id = (SELECT auth.uid()))
--     so user A can never see user B's row. Pattern matches
--     20260426_user_data_rls_policies.sql (user_notifications/_quiz_history/
--     _bookmarks).
--   - anon: no policy — denied by default. Profiles are private; anonymous
--     visitors never read them.
--
-- Idempotency
--   - The body uses `if not exists` on the table — re-running on a DB that
--     already has it (today's prod) is a no-op.
--   - ENABLE ROW LEVEL SECURITY is a no-op if already enabled.
--   - DROP POLICY IF EXISTS + CREATE POLICY for every policy — re-running
--     after a prior partial success will not error.
--
-- Risk: low
--   - Forward-only schema add; no data shaping; no destructive DDL.
--   - Service-role callers (Stripe webhook handlers, dunning cron) bypass
--     RLS, so no behavioural change for them.
--   - User-cookie callers (create-checkout, create-portal, unsubscribe,
--     consultation/book, course/purchase) all already filter by `id =
--     auth.uid()` in their queries, so the new RLS USING clause is a tighter
--     mirror of intent — no breakage expected.
--
-- Rollback
--   BEGIN;
--     DROP POLICY IF EXISTS "service_role full access" ON public.profiles;
--     DROP POLICY IF EXISTS "owner can read"           ON public.profiles;
--     DROP POLICY IF EXISTS "owner can insert"         ON public.profiles;
--     DROP POLICY IF EXISTS "owner can update"         ON public.profiles;
--     DROP POLICY IF EXISTS "owner can delete"         ON public.profiles;
--     ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
--     -- DROP TABLE public.profiles;  -- destructive; only run on a clean rebuild
--   COMMIT;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.profiles (
  id                    uuid        NOT NULL,
  email                 text        NOT NULL,
  display_name          text,
  stripe_customer_id    text,
  email_deal_alerts     boolean     DEFAULT true,
  email_fee_alerts      boolean     DEFAULT true,
  email_newsletter      boolean     DEFAULT true,
  email_weekly_digest   boolean     DEFAULT true,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access" ON public.profiles;
CREATE POLICY "service_role full access"
  ON public.profiles
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "owner can read" ON public.profiles;
CREATE POLICY "owner can read"
  ON public.profiles
  FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "owner can insert" ON public.profiles;
CREATE POLICY "owner can insert"
  ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "owner can update" ON public.profiles;
CREATE POLICY "owner can update"
  ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "owner can delete" ON public.profiles;
CREATE POLICY "owner can delete"
  ON public.profiles
  FOR DELETE TO authenticated
  USING (id = (SELECT auth.uid()));

COMMIT;
