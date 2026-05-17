-- ============================================================================
-- Migration: 20260516_mm39_disputes.sql
-- Purpose: Brief mediation / dispute flow (Ship #9 / MM39). When the outcome
--          of an accepted brief is contested — the consumer says it wasn't
--          completed, the pro says it was — both sides need a controlled
--          arbitration path with its own thread, separate from the in-brief
--          chat, so admins can review and award a verdict.
--
-- Why a separate thread (brief_dispute_messages) instead of overloading
-- brief_messages with a "dispute" sender_kind: arbitration is its own
-- privileged surface. Admin participates here; admin must NOT have a
-- general right to post in brief_messages. Splitting tables makes the
-- audit trail unambiguous and keeps the existing brief_messages RLS
-- predicate (mm32) untouched.
--
-- One dispute per brief — `brief_disputes.brief_id` is UNIQUE. Re-opening
-- after a 'withdrawn' resolution is a status flip, not a new row.
--
-- Idempotency: CREATE TABLE / INDEX / POLICY all use IF NOT EXISTS /
-- DROP+CREATE so the migration is safe to re-run.
--
-- Rollback (destructive):
--   DROP TABLE IF EXISTS public.brief_dispute_messages;
--   DROP TABLE IF EXISTS public.brief_disputes;
--
-- Risk: medium — user-data tables carry free-text reason + evidence
-- URLs. RLS mirrors the brief access predicate (same shape as mm32).
-- ============================================================================

BEGIN;

-- ── 1. brief_disputes ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.brief_disputes (
  id                  bigserial PRIMARY KEY,
  brief_id            integer NOT NULL UNIQUE
                        REFERENCES public.advisor_auctions(id) ON DELETE CASCADE,
  opened_by_kind      text NOT NULL
                        CHECK (opened_by_kind IN ('consumer','professional','team')),
  opened_by_user_id   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  opened_by_email     text NOT NULL,
  reason              text NOT NULL
                        CHECK (length(reason) >= 200 AND length(reason) <= 4000),
  evidence_urls       text[] NOT NULL DEFAULT '{}'::text[],
  status              text NOT NULL DEFAULT 'open'
                        CHECK (status IN (
                          'open',
                          'admin_reviewing',
                          'resolved_for_consumer',
                          'resolved_for_provider',
                          'withdrawn'
                        )),
  resolution_notes    text,
  resolved_at         timestamptz,
  resolved_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- Admin queue: newest open disputes first. Partial index keeps the queue
-- index narrow; resolved disputes are far more numerous over time.
CREATE INDEX IF NOT EXISTS idx_brief_disputes_status_created
  ON public.brief_disputes (status, created_at DESC);

ALTER TABLE public.brief_disputes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access brief_disputes"
  ON public.brief_disputes;
CREATE POLICY "service_role full access brief_disputes"
  ON public.brief_disputes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated SELECT — same predicate as brief_messages (mm32): the
-- brief's consumer, accepted pro, or accepted team member can read it.
DROP POLICY IF EXISTS "Brief parties read disputes"
  ON public.brief_disputes;
CREATE POLICY "Brief parties read disputes"
  ON public.brief_disputes
  FOR SELECT
  TO authenticated
  USING (
    brief_id IN (
      SELECT a.id
        FROM public.advisor_auctions a
        JOIN auth.users u ON u.id = auth.uid()
       WHERE lower(a.contact_email) = lower(u.email)
    )
    OR brief_id IN (
      SELECT a.id
        FROM public.advisor_auctions a
        JOIN public.professionals p
          ON p.id = a.accepted_by_professional_id
       WHERE p.auth_user_id = auth.uid()
    )
    OR brief_id IN (
      SELECT a.id
        FROM public.advisor_auctions a
        JOIN public.expert_team_members m
          ON m.team_id = a.accepted_by_team_id
        JOIN public.professionals p
          ON p.id = m.professional_id
       WHERE p.auth_user_id = auth.uid()
         AND m.status = 'active'
    )
  );

-- Authenticated INSERT — same predicate; either party (or a team member
-- on the accepted team) can open the dispute. The route handler resolves
-- opened_by_kind from the caller.
DROP POLICY IF EXISTS "Brief parties open disputes"
  ON public.brief_disputes;
CREATE POLICY "Brief parties open disputes"
  ON public.brief_disputes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    brief_id IN (
      SELECT a.id
        FROM public.advisor_auctions a
        JOIN auth.users u ON u.id = auth.uid()
       WHERE lower(a.contact_email) = lower(u.email)
    )
    OR brief_id IN (
      SELECT a.id
        FROM public.advisor_auctions a
        JOIN public.professionals p
          ON p.id = a.accepted_by_professional_id
       WHERE p.auth_user_id = auth.uid()
    )
    OR brief_id IN (
      SELECT a.id
        FROM public.advisor_auctions a
        JOIN public.expert_team_members m
          ON m.team_id = a.accepted_by_team_id
        JOIN public.professionals p
          ON p.id = m.professional_id
       WHERE p.auth_user_id = auth.uid()
         AND m.status = 'active'
    )
  );

-- UPDATE is service_role only — admins act via the API and the helper
-- writes through the admin client. Parties never re-write a dispute row
-- directly; new content is appended to brief_dispute_messages.

-- ── 2. brief_dispute_messages ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.brief_dispute_messages (
  id             bigserial PRIMARY KEY,
  dispute_id     bigint NOT NULL
                   REFERENCES public.brief_disputes(id) ON DELETE CASCADE,
  sender_kind    text NOT NULL
                   CHECK (sender_kind IN ('consumer','professional','team','admin')),
  sender_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  body           text NOT NULL
                   CHECK (length(body) > 0 AND length(body) <= 4000),
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brief_dispute_messages_dispute_created
  ON public.brief_dispute_messages (dispute_id, created_at);

ALTER TABLE public.brief_dispute_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access brief_dispute_messages"
  ON public.brief_dispute_messages;
CREATE POLICY "service_role full access brief_dispute_messages"
  ON public.brief_dispute_messages
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated SELECT — parties to the dispute (consumer / accepted pro /
-- active team member of the accepted team) can read the thread. Admins
-- read via the service-role policy above.
DROP POLICY IF EXISTS "Dispute parties read messages"
  ON public.brief_dispute_messages;
CREATE POLICY "Dispute parties read messages"
  ON public.brief_dispute_messages
  FOR SELECT
  TO authenticated
  USING (
    dispute_id IN (
      SELECT d.id
        FROM public.brief_disputes d
        JOIN public.advisor_auctions a ON a.id = d.brief_id
        JOIN auth.users u ON u.id = auth.uid()
       WHERE lower(a.contact_email) = lower(u.email)
    )
    OR dispute_id IN (
      SELECT d.id
        FROM public.brief_disputes d
        JOIN public.advisor_auctions a ON a.id = d.brief_id
        JOIN public.professionals p
          ON p.id = a.accepted_by_professional_id
       WHERE p.auth_user_id = auth.uid()
    )
    OR dispute_id IN (
      SELECT d.id
        FROM public.brief_disputes d
        JOIN public.advisor_auctions a ON a.id = d.brief_id
        JOIN public.expert_team_members m
          ON m.team_id = a.accepted_by_team_id
        JOIN public.professionals p
          ON p.id = m.professional_id
       WHERE p.auth_user_id = auth.uid()
         AND m.status = 'active'
    )
  );

-- Authenticated INSERT — same predicate as SELECT. The route handler
-- resolves the caller's sender_kind ('consumer' / 'professional' /
-- 'team'). Admin posts route through the admin endpoint and write via
-- service_role; the CHECK constraint above still allows 'admin' for
-- the service-role path.
DROP POLICY IF EXISTS "Dispute parties post messages"
  ON public.brief_dispute_messages;
CREATE POLICY "Dispute parties post messages"
  ON public.brief_dispute_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    dispute_id IN (
      SELECT d.id
        FROM public.brief_disputes d
        JOIN public.advisor_auctions a ON a.id = d.brief_id
        JOIN auth.users u ON u.id = auth.uid()
       WHERE lower(a.contact_email) = lower(u.email)
    )
    OR dispute_id IN (
      SELECT d.id
        FROM public.brief_disputes d
        JOIN public.advisor_auctions a ON a.id = d.brief_id
        JOIN public.professionals p
          ON p.id = a.accepted_by_professional_id
       WHERE p.auth_user_id = auth.uid()
    )
    OR dispute_id IN (
      SELECT d.id
        FROM public.brief_disputes d
        JOIN public.advisor_auctions a ON a.id = d.brief_id
        JOIN public.expert_team_members m
          ON m.team_id = a.accepted_by_team_id
        JOIN public.professionals p
          ON p.id = m.professional_id
       WHERE p.auth_user_id = auth.uid()
         AND m.status = 'active'
    )
  );

COMMIT;
