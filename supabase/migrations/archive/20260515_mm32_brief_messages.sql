-- ============================================================================
-- Migration: 20260515_mm32_brief_messages.sql
-- Purpose: Real-time chat between consumer and accepted provider/team on
--          the brief tracker page (Ship #10 / MM32). Once a brief is in the
--          'accept' flow and has been accepted, both sides get a single
--          shared thread for follow-up Qs, scheduling, etc.
--
-- Why: Consumers were emailing the support inbox to reach the accepted
-- provider because the tracker page only showed the static status. A
-- lightweight in-page chat closes the loop without dragging more work into
-- email + reduces accidental disclosure of contact details before
-- engagement is formal.
--
-- Idempotency: CREATE TABLE / INDEX IF NOT EXISTS + DROP POLICY IF EXISTS /
-- CREATE POLICY. Safe to re-apply. The Realtime publication add is wrapped
-- in DO ... EXCEPTION so re-running doesn't fail on a duplicate add.
--
-- Rollback (destructive):
--   ALTER PUBLICATION supabase_realtime DROP TABLE public.brief_messages;
--   DROP TABLE IF EXISTS public.brief_messages;
--
-- Risk: low — additive table, additive publication entry. The publication
-- broadcast doesn't expose data outside the RLS check on SELECT.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.brief_messages (
  id                       bigserial PRIMARY KEY,
  brief_id                 integer NOT NULL REFERENCES public.advisor_auctions(id) ON DELETE CASCADE,
  sender_kind              text NOT NULL
    CHECK (sender_kind IN ('consumer', 'professional', 'team')),
  -- Nullable for backward compat with anonymous consumer briefs (no auth.users row).
  sender_user_id           uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_professional_id   integer REFERENCES public.professionals(id) ON DELETE SET NULL,
  sender_team_id           integer REFERENCES public.expert_teams(id) ON DELETE SET NULL,
  body                     text NOT NULL
    CHECK (length(body) > 0 AND length(body) <= 4000),
  read_by_consumer_at      timestamptz,
  read_by_pro_at           timestamptz,
  created_at               timestamptz NOT NULL DEFAULT now()
);

-- Newest-first scan for the tracker chat panel.
CREATE INDEX IF NOT EXISTS idx_brief_messages_brief_created
  ON public.brief_messages (brief_id, created_at DESC);

-- ── Realtime publication ──────────────────────────────────────────────────
-- Subscribe via supabase.channel('brief-messages-${briefId}') in the browser.
-- Postgres errors if the table is already in the publication, so swallow the
-- duplicate_object exception to keep the migration idempotent.
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.brief_messages;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ── RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE public.brief_messages ENABLE ROW LEVEL SECURITY;

-- service_role full access — used by the API route handlers which write
-- through the admin client (anonymous consumer briefs have no auth.uid()).
DROP POLICY IF EXISTS "service_role full access brief_messages"
  ON public.brief_messages;
CREATE POLICY "service_role full access brief_messages"
  ON public.brief_messages
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated SELECT — the brief owner (matches advisor_auctions.contact_email
-- against the signed-in auth.users email) or the accepting professional / team
-- member can read messages. Same predicate shape as
-- 20260514_mm10_pro_intake_questions.sql so future audits can grep for it.
DROP POLICY IF EXISTS "Brief owner or acceptor read brief messages"
  ON public.brief_messages;
CREATE POLICY "Brief owner or acceptor read brief messages"
  ON public.brief_messages
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

-- Authenticated INSERT — same predicate as SELECT. The handler additionally
-- resolves sender_kind from the caller's role so the row faithfully records
-- who sent the message, but the RLS gate is "can you see this thread?".
DROP POLICY IF EXISTS "Brief owner or acceptor insert brief messages"
  ON public.brief_messages;
CREATE POLICY "Brief owner or acceptor insert brief messages"
  ON public.brief_messages
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

-- Authenticated UPDATE — used by mark-read to flip the read_by_*_at columns.
-- The handler bounds which column the caller can flip; RLS just gates access
-- to the row at all.
DROP POLICY IF EXISTS "Brief owner or acceptor update brief messages"
  ON public.brief_messages;
CREATE POLICY "Brief owner or acceptor update brief messages"
  ON public.brief_messages
  FOR UPDATE
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
  )
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

COMMIT;
