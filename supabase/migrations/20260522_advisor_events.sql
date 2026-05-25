-- Migration: 20260522_advisor_events.sql
--
-- Advisor events and webinars: advisors post upcoming events (webinars,
-- seminars, workshops). Any authenticated user can RSVP. Events are
-- public-readable when status = 'published'.
--
-- Idempotency: CREATE TABLE IF NOT EXISTS; DROP/CREATE POLICY pairs.
--
-- Rollback:
--   DROP TABLE IF EXISTS public.advisor_event_rsvps CASCADE;
--   DROP TABLE IF EXISTS public.advisor_events CASCADE;

BEGIN;

-- ─── advisor_events ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.advisor_events (
  id              SERIAL PRIMARY KEY,
  professional_id INTEGER NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  title           TEXT NOT NULL CHECK (char_length(title) BETWEEN 3 AND 200),
  description     TEXT CHECK (char_length(description) <= 3000),
  event_type      TEXT NOT NULL DEFAULT 'webinar'
    CHECK (event_type IN ('webinar', 'seminar', 'workshop', 'conference', 'networking', 'other')),
  starts_at       TIMESTAMPTZ NOT NULL,
  ends_at         TIMESTAMPTZ,
  timezone        TEXT NOT NULL DEFAULT 'Australia/Sydney',
  location        TEXT,         -- physical address or "Online"
  meeting_url     TEXT,         -- Zoom/Teams link (shown after RSVP)
  max_attendees   INTEGER,
  price_cents     INTEGER NOT NULL DEFAULT 0,
  cover_image_url TEXT,
  status          TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'cancelled', 'completed')),
  rsvp_count      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_advisor_events_professional
  ON public.advisor_events (professional_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_advisor_events_upcoming
  ON public.advisor_events (status, starts_at)
  WHERE status = 'published';

ALTER TABLE public.advisor_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advisor_events FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "advisor_events_public_read" ON public.advisor_events;
CREATE POLICY "advisor_events_public_read"
  ON public.advisor_events FOR SELECT
  USING (status = 'published');

DROP POLICY IF EXISTS "advisor_events_owner_select" ON public.advisor_events;
CREATE POLICY "advisor_events_owner_select"
  ON public.advisor_events FOR SELECT
  TO authenticated
  USING (
    professional_id IN (
      SELECT id FROM public.professionals WHERE auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "advisor_events_owner_write" ON public.advisor_events;
CREATE POLICY "advisor_events_owner_write"
  ON public.advisor_events FOR ALL
  TO authenticated
  USING (
    professional_id IN (
      SELECT id FROM public.professionals WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    professional_id IN (
      SELECT id FROM public.professionals WHERE auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "advisor_events_service_role" ON public.advisor_events;
CREATE POLICY "advisor_events_service_role"
  ON public.advisor_events TO service_role
  USING (true) WITH CHECK (true);

-- ─── advisor_event_rsvps ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.advisor_event_rsvps (
  id              SERIAL PRIMARY KEY,
  event_id        INTEGER NOT NULL REFERENCES public.advisor_events(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email      TEXT NOT NULL,
  user_name       TEXT,
  status          TEXT NOT NULL DEFAULT 'registered'
    CHECK (status IN ('registered', 'attended', 'cancelled')),
  registered_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_advisor_event_rsvps_event
  ON public.advisor_event_rsvps (event_id);
CREATE INDEX IF NOT EXISTS idx_advisor_event_rsvps_user
  ON public.advisor_event_rsvps (user_id);

ALTER TABLE public.advisor_event_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advisor_event_rsvps FORCE ROW LEVEL SECURITY;

-- User sees their own RSVPs
DROP POLICY IF EXISTS "advisor_event_rsvps_user_select" ON public.advisor_event_rsvps;
CREATE POLICY "advisor_event_rsvps_user_select"
  ON public.advisor_event_rsvps FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "advisor_event_rsvps_user_write" ON public.advisor_event_rsvps;
CREATE POLICY "advisor_event_rsvps_user_write"
  ON public.advisor_event_rsvps FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Advisor sees RSVPs to their own events
DROP POLICY IF EXISTS "advisor_event_rsvps_advisor_read" ON public.advisor_event_rsvps;
CREATE POLICY "advisor_event_rsvps_advisor_read"
  ON public.advisor_event_rsvps FOR SELECT
  TO authenticated
  USING (
    event_id IN (
      SELECT ae.id FROM public.advisor_events ae
      JOIN public.professionals p ON p.id = ae.professional_id
      WHERE p.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "advisor_event_rsvps_service_role" ON public.advisor_event_rsvps;
CREATE POLICY "advisor_event_rsvps_service_role"
  ON public.advisor_event_rsvps TO service_role
  USING (true) WITH CHECK (true);

-- Add next_event columns to professionals for quick display
ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS next_event_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_event_title TEXT;

COMMIT;
