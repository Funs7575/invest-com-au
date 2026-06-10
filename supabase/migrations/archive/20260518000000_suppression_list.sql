-- Migration: dedicated email suppression list for Agent #11 Email/Lifecycle.
--
-- Replaces the MVP `agent_memory:email:suppression` key which has the wrong
-- shape (per-agent scoped, no unique-on-email constraint, can't be efficiently
-- queried by recipient on the dispatch hot path). TODO.md flagged this as a
-- hard gate before #11 ships its first production Loops batch send.
--
-- Authoritative source of truth for "do not send to this address". Every
-- agent that emails (Editorial, Growth, Marketplace, Ops) checks this table
-- before dispatch; only #11 writes to it (enforced via spec forbidden-actions,
-- not RLS — service_role doesn't enforce per-agent identity at the DB layer).
--
-- Reasons (string enum, validated by CHECK constraint):
--   - hard_bounce             : Resend / SES reports permanent delivery failure
--   - soft_bounce_ladder_exhausted : repeated transient failures, retry policy gave up
--   - complaint               : recipient pressed "spam"
--   - manual_unsubscribe      : recipient used the unsubscribe link
--   - admin                   : Fin/Co-Founder manual block (e.g. legal request)
--
-- Lookup is by lowercased email. The unique index on lower(contact_email)
-- both enforces "one row per address" and gives O(log n) lookup; the
-- dispatch hot path is `WHERE lower(contact_email) = $1`.
--
-- RLS: enabled with service_role-only FOR ALL. No anon / authenticated
-- policies — this list is sensitive (touching it leaks who has complained,
-- who has unsubscribed) and only backend agents need read access.
--
-- Rollback:
--   DROP TABLE IF EXISTS public.suppression_list;

BEGIN;

CREATE TABLE IF NOT EXISTS public.suppression_list (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_email text NOT NULL,
  reason text NOT NULL,
  suppressed_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT suppression_list_reason_check CHECK (
    reason IN (
      'hard_bounce',
      'soft_bounce_ladder_exhausted',
      'complaint',
      'manual_unsubscribe',
      'admin'
    )
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_suppression_list_email
  ON public.suppression_list (lower(contact_email));

CREATE INDEX IF NOT EXISTS idx_suppression_list_suppressed_at
  ON public.suppression_list (suppressed_at DESC);

ALTER TABLE public.suppression_list ENABLE ROW LEVEL SECURITY;

-- Service-role is the only writer (Agent #11) and the only reader (dispatch
-- helpers in every agent that emails). No anon / authenticated access; the
-- list is sensitive and there is no end-user-facing surface for it.
DROP POLICY IF EXISTS "Service role manages suppression_list" ON public.suppression_list;
CREATE POLICY "Service role manages suppression_list"
  ON public.suppression_list
  AS PERMISSIVE
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.suppression_list IS
  'Authoritative do-not-email list. Writers: Agent #11 only. Readers: every '
  'agent that dispatches email via lib/email-suppression.ts. Lookup is '
  'case-insensitive on contact_email (lower-cased unique index).';

COMMIT;
