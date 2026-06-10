-- ============================================================================
-- Migration: Backfill public.quiz_leads (A-02 batch 1)
-- Date:      2026-04-30 (queued under 20260603 to sort after existing work)
-- Audit ref: docs/audits/drift-list.md (A-02 lead family)
-- Queue item: docs/audits/REMEDIATION_QUEUE.md A-02
--
-- Purpose
--   `quiz_leads` is declared in `lib/database.types.ts` (line 9695) but the
--   migration tree never CREATEs the table. It is the lead
--   capture table for the platform-recommendation quiz (`/quiz` funnel),
--   keyed on a serial id with a unique email per lead. Holds quiz answers
--   (jsonb), inferred vertical/match, drip state, UTM attribution, and an
--   unsubscribed flag. 17 call sites read/write it (admin pages, analytics
--   dashboards, drip crons).
--
--   This migration creates the table forward-only with the exact column set
--   the app expects, plus a service-role-only RLS policy.
--
-- Why it matters
--   Quiz lead rows hold PII (email, optional name) and are the input to the
--   abandoned-quiz drip cron. A fresh Supabase environment built from
--   supabase/migrations/* would not match what the TypeScript expects. Today
--   the table lives in prod out-of-tree; this migration brings the declaration
--   in-tree so prod and a clean rebuild are byte-equivalent.
--
-- Schema source of truth
--   lib/database.types.ts → Database['public']['Tables']['quiz_leads'].
--   Columns match Insert/Row exactly. The id is `bigint` because the type
--   declares `id: number` with no UUID hint — and existing prod usage (admin
--   pages reading `id` as a number) confirms a numeric primary key. No FK
--   relationships are declared in types; the table is referentially independent.
--
-- RLS policy chosen — service-role-only (deny anon + authenticated by default)
--   - service_role: explicit FOR ALL allow.
--   - anon + authenticated: NO policy — RLS denies all access by default.
--
--   Justification: every call site (admin pages, analytics-dashboard, cron
--   jobs, abandoned-quiz-drip, annual-review-reminder) uses the service-role
--   admin client. The submit endpoint that creates a quiz lead also runs
--   server-side with admin client. There is no end-user UI that reads or
--   writes quiz_leads via the user-cookie client. Pattern matches
--   20260601_rls_email_otps.sql / 20260601_rls_leads.sql (B-stream).
--
-- Idempotency
--   - The body uses `if not exists` on the table — no-op on a DB that already has it.
--   - ENABLE ROW LEVEL SECURITY is a no-op if already enabled.
--   - DROP POLICY IF EXISTS + CREATE POLICY for every policy.
--
-- Risk: low
--   - Forward-only schema add; no data shaping.
--   - All callers use service-role client which bypasses RLS, so deny-anon
--     does not break anything.
--
-- Flagged ambiguity
--   - The type for `unsubscribed` is `boolean | null` — no DEFAULT on the type
--     side. We default to `false` here because every code path treats null as
--     "not unsubscribed", and a NOT NULL DEFAULT false makes the schema more
--     correct without breaking inserts. (Pure additive: code paths that omit
--     unsubscribed from INSERT now get `false` instead of `null`; both behave
--     identically downstream.)
--
-- Rollback
--   BEGIN;
--     DROP POLICY IF EXISTS "service_role full access" ON public.quiz_leads;
--     ALTER TABLE public.quiz_leads DISABLE ROW LEVEL SECURITY;
--     -- DROP TABLE public.quiz_leads;  -- destructive; only on clean rebuild
--   COMMIT;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.quiz_leads (
  id                       bigserial   NOT NULL,
  email                    text        NOT NULL,
  name                     text,
  answers                  jsonb,
  experience_level         text,
  investment_range         text,
  trading_interest         text,
  inferred_vertical        text,
  inferred_confidence      numeric,
  top_match_slug           text,
  drip_step                integer     NOT NULL DEFAULT 0,
  drip_last_sent_at        timestamptz,
  last_annual_reminder     timestamptz,
  unsubscribed             boolean     DEFAULT false,
  utm_source               text,
  utm_medium               text,
  utm_campaign             text,
  captured_at              timestamptz DEFAULT now(),
  converted_at             timestamptz,
  CONSTRAINT quiz_leads_pkey PRIMARY KEY (id)
);

ALTER TABLE public.quiz_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_leads FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access" ON public.quiz_leads;
CREATE POLICY "service_role full access"
  ON public.quiz_leads
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- No anon / authenticated policies — deny-by-default. All known callers use
-- the service-role admin client; if a future user-facing UI needs read access
-- (e.g. /account showing the user's own quiz history), add a narrow policy
-- in a follow-up migration keyed on auth.jwt() ->> 'email' = email.

COMMIT;
