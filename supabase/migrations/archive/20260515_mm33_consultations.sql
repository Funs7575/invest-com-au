-- ============================================================================
-- Migration: 20260515_mm33_consultations.sql
-- Purpose: In-app consultation booking (Ship #5 / MM33).
--
-- After a verified pro accepts a Match Request, the consumer and pro need
-- to book an intro call. Today they coordinate over email. This migration
-- introduces two tables that let the pro publish availability slots and
-- the consumer book one of them from the brief tracker page.
--
-- v1 is intentionally minimal:
--   - no external calendar OAuth (Google / Calendly come later);
--   - the pro pastes a Google Meet / Zoom URL on confirmation.
--
-- Tables:
--   pro_availability_slots — pro-side calendar (open windows for booking).
--   consultation_bookings  — one booking per slot, tied to a brief.
--
-- Idempotency: CREATE EXTENSION IF NOT EXISTS, CREATE TABLE IF NOT EXISTS,
-- CREATE INDEX IF NOT EXISTS, DO blocks for the EXCLUDE constraint, and
-- DROP POLICY IF EXISTS / CREATE POLICY everywhere. Safe to re-apply.
--
-- Rollback (destructive):
--   DROP TABLE IF EXISTS public.consultation_bookings;
--   DROP TABLE IF EXISTS public.pro_availability_slots;
--   -- btree_gist stays installed; it's harmless to leave behind.
--
-- Risk: low — additive tables, no changes to existing data. Consumer-side
-- contact_email match policy mirrors the brief tracker access pattern
-- already used by /api/briefs/[slug]/intake-answers.
-- ============================================================================

BEGIN;

-- ── Extension ────────────────────────────────────────────────────────────
-- btree_gist lets us mix the equality op-class for `professional_id` with
-- the range op-class on `tstzrange(start_at, end_at)` inside a single
-- EXCLUDE constraint. Without this extension, EXCLUDE USING gist refuses
-- to accept integer columns alongside a range column.
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ── Table 1: pro_availability_slots ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pro_availability_slots (
  id               bigserial PRIMARY KEY,
  professional_id  integer NOT NULL
                   REFERENCES public.professionals(id) ON DELETE CASCADE,
  team_id          integer
                   REFERENCES public.expert_teams(id) ON DELETE SET NULL,
  start_at         timestamptz NOT NULL,
  end_at           timestamptz NOT NULL,
  status           text NOT NULL DEFAULT 'open'
                   CHECK (status IN ('open', 'booked', 'cancelled')),
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pro_availability_slots_end_after_start
    CHECK (end_at > start_at)
);

-- Prevent overlapping non-cancelled slots per professional. The pro can
-- have many cancelled slots but at most one open/booked slot covering
-- any given moment.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'pro_availability_slots_no_overlap'
      AND conrelid = 'public.pro_availability_slots'::regclass
  ) THEN
    ALTER TABLE public.pro_availability_slots
      ADD CONSTRAINT pro_availability_slots_no_overlap
      EXCLUDE USING gist (
        professional_id WITH =,
        tstzrange(start_at, end_at, '[)') WITH &&
      )
      WHERE (status IN ('open', 'booked'));
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_pro_availability_slots_pro_start
  ON public.pro_availability_slots (professional_id, start_at);

CREATE INDEX IF NOT EXISTS idx_pro_availability_slots_team
  ON public.pro_availability_slots (team_id)
  WHERE team_id IS NOT NULL;

ALTER TABLE public.pro_availability_slots ENABLE ROW LEVEL SECURITY;

-- Anyone can SELECT open slots so the consumer can see them from the
-- brief tracker without needing a JWT for the pro. The booked status
-- column isn't sensitive — exposing it lets the consumer's tracker
-- show "this slot was taken" if the page is reloaded mid-booking.
DROP POLICY IF EXISTS "Anyone can read availability slots"
  ON public.pro_availability_slots;
CREATE POLICY "Anyone can read availability slots"
  ON public.pro_availability_slots FOR SELECT
  TO anon, authenticated
  USING (true);

-- Pro or active team member can INSERT a slot under their own professional_id.
DROP POLICY IF EXISTS "Pro can insert own availability slots"
  ON public.pro_availability_slots;
CREATE POLICY "Pro can insert own availability slots"
  ON public.pro_availability_slots FOR INSERT
  TO authenticated
  WITH CHECK (
    professional_id IN (
      SELECT p.id FROM public.professionals p
      WHERE p.auth_user_id = auth.uid()
    )
  );

-- Pro can UPDATE / DELETE their own slots.
DROP POLICY IF EXISTS "Pro can update own availability slots"
  ON public.pro_availability_slots;
CREATE POLICY "Pro can update own availability slots"
  ON public.pro_availability_slots FOR UPDATE
  TO authenticated
  USING (
    professional_id IN (
      SELECT p.id FROM public.professionals p
      WHERE p.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    professional_id IN (
      SELECT p.id FROM public.professionals p
      WHERE p.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Pro can delete own availability slots"
  ON public.pro_availability_slots;
CREATE POLICY "Pro can delete own availability slots"
  ON public.pro_availability_slots FOR DELETE
  TO authenticated
  USING (
    professional_id IN (
      SELECT p.id FROM public.professionals p
      WHERE p.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role full access pro_availability_slots"
  ON public.pro_availability_slots;
CREATE POLICY "Service role full access pro_availability_slots"
  ON public.pro_availability_slots FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── Table 2: consultation_bookings ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.consultation_bookings (
  id                bigserial PRIMARY KEY,
  slot_id           bigint NOT NULL
                    REFERENCES public.pro_availability_slots(id) ON DELETE CASCADE,
  brief_id          integer NOT NULL
                    REFERENCES public.advisor_auctions(id) ON DELETE CASCADE,
  consumer_user_id  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  consumer_email    text NOT NULL,
  consumer_notes    text,
  meet_url          text,
  status            text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT consultation_bookings_one_per_slot UNIQUE (slot_id)
);

CREATE INDEX IF NOT EXISTS idx_consultation_bookings_brief_status
  ON public.consultation_bookings (brief_id, status);

ALTER TABLE public.consultation_bookings ENABLE ROW LEVEL SECURITY;

-- Consumer can SELECT bookings they own (by email or auth.uid()).
DROP POLICY IF EXISTS "Consumer can read own bookings"
  ON public.consultation_bookings;
CREATE POLICY "Consumer can read own bookings"
  ON public.consultation_bookings FOR SELECT
  TO authenticated
  USING (
    (consumer_user_id IS NOT NULL AND consumer_user_id = auth.uid())
    OR lower(consumer_email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
  );

-- Pro (and active team members) can SELECT bookings against their own
-- availability slots.
DROP POLICY IF EXISTS "Pro can read own slot bookings"
  ON public.consultation_bookings;
CREATE POLICY "Pro can read own slot bookings"
  ON public.consultation_bookings FOR SELECT
  TO authenticated
  USING (
    slot_id IN (
      SELECT s.id
      FROM public.pro_availability_slots s
      JOIN public.professionals p ON p.id = s.professional_id
      WHERE p.auth_user_id = auth.uid()
    )
  );

-- INSERT: authenticated user whose JWT email matches the brief's
-- contact_email (or whose auth.uid() matches a consumer_user_id we're
-- about to write). Mirrors the brief tracker access pattern.
DROP POLICY IF EXISTS "Brief owner can insert booking"
  ON public.consultation_bookings;
CREATE POLICY "Brief owner can insert booking"
  ON public.consultation_bookings FOR INSERT
  TO authenticated
  WITH CHECK (
    brief_id IN (
      SELECT id
      FROM public.advisor_auctions
      WHERE lower(coalesce(contact_email, '')) = lower(coalesce((auth.jwt() ->> 'email'), ''))
    )
  );

-- UPDATE: pro updates bookings on their own slots; consumer updates
-- bookings owned by them.
DROP POLICY IF EXISTS "Pro can update own slot bookings"
  ON public.consultation_bookings;
CREATE POLICY "Pro can update own slot bookings"
  ON public.consultation_bookings FOR UPDATE
  TO authenticated
  USING (
    slot_id IN (
      SELECT s.id
      FROM public.pro_availability_slots s
      JOIN public.professionals p ON p.id = s.professional_id
      WHERE p.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    slot_id IN (
      SELECT s.id
      FROM public.pro_availability_slots s
      JOIN public.professionals p ON p.id = s.professional_id
      WHERE p.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Consumer can update own booking"
  ON public.consultation_bookings;
CREATE POLICY "Consumer can update own booking"
  ON public.consultation_bookings FOR UPDATE
  TO authenticated
  USING (
    (consumer_user_id IS NOT NULL AND consumer_user_id = auth.uid())
    OR lower(consumer_email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
  )
  WITH CHECK (
    (consumer_user_id IS NOT NULL AND consumer_user_id = auth.uid())
    OR lower(consumer_email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
  );

DROP POLICY IF EXISTS "Service role full access consultation_bookings"
  ON public.consultation_bookings;
CREATE POLICY "Service role full access consultation_bookings"
  ON public.consultation_bookings FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMIT;
