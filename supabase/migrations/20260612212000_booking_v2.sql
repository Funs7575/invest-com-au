-- Migration: booking_v2 — First-Party Scheduling v2 (idea #12)
--
-- Adds the small set of columns the scheduling-v2 feature needs ON TOP of the
-- already-present booking tables. Audit result (baseline 00000000000000):
--   - advisor_booking_slots .......... weekly recurring availability template
--                                       (day_of_week/start_time/end_time). Editor
--                                       writes here. No new columns needed.
--   - advisor_bookings ............... concrete consumer bookings (PII). ALREADY
--                                       has confirmation_token, cancelled_at,
--                                       cancellation_reason, and a status CHECK
--                                       that already allows 'completed'/'no_show'.
--                                       We add reschedule + reminder bookkeeping
--                                       and a precise UTC instant for the cron.
--   - advisor_booking_appointments ... Wave-17 concrete free slots (open/taken/
--                                       cancelled). Reused for chat "propose times".
--                                       No new columns needed.
--   - brief_messages ................. chat. We add a `metadata` jsonb so a
--                                       "propose times" message can carry its
--                                       structured slot payload without a new table.
--
-- Everything new is DORMANT behind the `booking_v2` feature flag (fail-closed):
-- with the flag off, the availability editor, slot picker, propose-times action
-- and reminder cron all no-op/hide, and nothing reads these columns, so absence
-- of the columns never 500s existing behaviour. These ADDs are purely additive.
--
-- RLS posture: unchanged. We add NO new tables, so no new policies are required.
-- The existing posture stands:
--   - advisor_booking_slots: public SELECT + service_role ALL.
--   - advisor_bookings: admin SELECT + public INSERT + service_role ALL (PII;
--     all reads happen server-side via the service-role client).
--   - advisor_booking_appointments: service_role ALL.
--   - brief_messages: brief owner/acceptor SELECT/INSERT/UPDATE + service_role ALL.
-- New columns inherit the table's RLS automatically; reminder/token columns are
-- only ever read/written by the service-role client (cron + route handlers).
--
-- Idempotent: every statement is ADD COLUMN IF NOT EXISTS / CREATE INDEX IF NOT
-- EXISTS. Safe to re-run.
--
-- Rollback:
--   ALTER TABLE public.advisor_bookings
--     DROP COLUMN IF EXISTS reschedule_token,
--     DROP COLUMN IF EXISTS reminder_24h_sent_at,
--     DROP COLUMN IF EXISTS reminder_1h_sent_at,
--     DROP COLUMN IF EXISTS rescheduled_from_id,
--     DROP COLUMN IF EXISTS starts_at_utc,
--     DROP COLUMN IF EXISTS booking_tz;
--   DROP INDEX IF EXISTS public.idx_advisor_bookings_reschedule_token;
--   DROP INDEX IF EXISTS public.idx_advisor_bookings_reminder_sweep;
--   ALTER TABLE public.brief_messages DROP COLUMN IF EXISTS metadata;
--   (The feature flag row is data, not schema; delete it from feature_flags
--    separately if desired.)

BEGIN;

-- ── advisor_bookings: reschedule + reminder bookkeeping ──────────────────────

-- A separate one-time token for the reschedule link. Cancel reuses the existing
-- `confirmation_token`; keeping them distinct means revealing one link doesn't
-- expose the other action.
ALTER TABLE public.advisor_bookings
  ADD COLUMN IF NOT EXISTS reschedule_token text;

-- Idempotency stamps for the hourly reminder cron. Set once the corresponding
-- reminder has been dispatched so a re-run inside the same window is a no-op.
ALTER TABLE public.advisor_bookings
  ADD COLUMN IF NOT EXISTS reminder_24h_sent_at timestamp with time zone;

ALTER TABLE public.advisor_bookings
  ADD COLUMN IF NOT EXISTS reminder_1h_sent_at timestamp with time zone;

-- When a booking is created by rescheduling another, point back at the original
-- (which gets status='cancelled'). Lets us tell genuine cancellations from moves
-- and keeps an audit trail. Self-referential FK; ON DELETE SET NULL so deleting
-- an old row doesn't block.
ALTER TABLE public.advisor_bookings
  ADD COLUMN IF NOT EXISTS rescheduled_from_id integer;

-- Precise UTC instant of the booking start. booking_date + booking_time are a
-- timezone-ambiguous wall-clock pair; the reminder cron needs an absolute
-- instant to compute "is this 24h/1h away", and the ICS builder needs it too.
-- Backfilled by the app on write (existing rows stay NULL and are simply not
-- eligible for v2 reminders — correct fail-safe).
ALTER TABLE public.advisor_bookings
  ADD COLUMN IF NOT EXISTS starts_at_utc timestamp with time zone;

-- IANA timezone the wall-clock booking_time is expressed in. Australia/Sydney
-- for the current single-region product; stored explicitly so ICS emits the
-- correct TZID and a future multi-region rollout doesn't silently mis-zone.
ALTER TABLE public.advisor_bookings
  ADD COLUMN IF NOT EXISTS booking_tz text NOT NULL DEFAULT 'Australia/Sydney';

-- Self-FK for the reschedule chain. Guarded so re-running the migration (or
-- running it where the constraint already exists) doesn't error.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'advisor_bookings_rescheduled_from_fkey'
  ) THEN
    ALTER TABLE public.advisor_bookings
      ADD CONSTRAINT advisor_bookings_rescheduled_from_fkey
      FOREIGN KEY (rescheduled_from_id)
      REFERENCES public.advisor_bookings(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Token lookup (reschedule link → row). Partial index keeps it tiny.
CREATE INDEX IF NOT EXISTS idx_advisor_bookings_reschedule_token
  ON public.advisor_bookings (reschedule_token)
  WHERE reschedule_token IS NOT NULL;

-- Reminder sweep: the cron scans confirmed future bookings by starts_at_utc.
-- Partial index on confirmed-with-instant rows so the hourly query is cheap.
CREATE INDEX IF NOT EXISTS idx_advisor_bookings_reminder_sweep
  ON public.advisor_bookings (starts_at_utc)
  WHERE status = 'confirmed' AND starts_at_utc IS NOT NULL;

-- ── brief_messages: structured payload for "propose times" ───────────────────

-- A nullable jsonb carrying optional structured data for a message — used by the
-- chat "propose times" action to attach { kind: 'propose_times', appointmentIds,
-- slots:[{id,startsAt,endsAt}], status }. Plain text messages leave it NULL, so
-- existing rendering is unaffected.
ALTER TABLE public.brief_messages
  ADD COLUMN IF NOT EXISTS metadata jsonb;

-- ── Seed the booking_v2 feature flag (DISABLED — fail-closed) ─────────────────
-- isFlagEnabled() already treats a missing row as "off", so this seed is purely
-- so the flag is visible/toggleable in the admin UI. enabled=false keeps every
-- new surface dormant until a human flips it on (allowlist for staged rollout).
INSERT INTO public.feature_flags (flag_key, description, enabled, rollout_pct)
VALUES (
  'booking_v2',
  'First-party scheduling v2: availability editor, slot picker, ICS invites, reminders, reschedule/cancel, propose-times in chat.',
  false,
  0
)
ON CONFLICT (flag_key) DO NOTHING;

COMMIT;
