-- ============================================================================
-- Migration: RLS hardening for public.newsletter_subscriptions (A-03 batch 3)
-- Date:      2026-05-01
-- Audit ref: docs/audits/codebase-health-2026-04-24.md §4.2 — RLS enabled
--            but zero policies (20260420_wave_16_growth_engine.sql:97).
-- Queue item: docs/audits/REMEDIATION_QUEUE.md A-03 batch 3
--
-- Purpose
--   newsletter_subscriptions stores email + confirmation status for all
--   newsletter sign-ups. Contains PII (email). RLS was enabled in
--   20260420_wave_16_growth_engine.sql but no policies were added, leaving
--   an implicit deny-all that works accidentally (no anon writes succeed)
--   but lacks auditability.
--
-- Callers (verified 2026-05-01):
--   ADMIN (service-role) only: lib/newsletter.ts — all 6 functions
--   (subscribeToNewsletter, confirmSubscription, unsubscribe,
--   getSubscriberCount, findSubscriber, listSegmentSubscribers)
--   use createAdminClient(). No browser-client callers.
--
-- Prior state
--   IMPORTANT: 20260420_wave_16_growth_engine.sql:97 already ran
--   `ALTER TABLE public.newsletter_subscriptions ENABLE ROW LEVEL SECURITY`.
--   This migration adds FORCE RLS and explicit service_role policy only.
--   No CREATE TABLE — table exists and schema is unchanged.
--
-- Idempotency
--   DROP POLICY IF EXISTS before CREATE POLICY. FORCE RLS is idempotent.
--
-- Rollback
--   ALTER TABLE public.newsletter_subscriptions NO FORCE ROW LEVEL SECURITY;
--   DROP POLICY IF EXISTS "service_role full access" ON public.newsletter_subscriptions;
--   -- (ENABLE ROW LEVEL SECURITY from 20260420 remains; restore by reverting this migration only)
-- ============================================================================

BEGIN;

-- ENABLE already ran in 20260420_wave_16_growth_engine.sql.
-- Re-running is idempotent (no-op if already enabled).
ALTER TABLE public.newsletter_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_subscriptions FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access" ON public.newsletter_subscriptions;
CREATE POLICY "service_role full access"
  ON public.newsletter_subscriptions
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMIT;
