-- Migration: rba_polls — RBA cash-rate prediction polls (PR 4.1).
--
-- Design:
--   - rba_polls stores one row per RBA board meeting.
--   - Predictions are stored in the existing forum_votes table with
--     target_type = 'rba_poll'. Vote values: 1=HIKE, 0=HOLD, -1=CUT.
--     The UNIQUE(target_type, target_id, voter_user_id) constraint on
--     forum_votes enforces one prediction per user per poll.
--   - rba_poll_accuracy VIEW computes per-user accuracy across all
--     revealed polls, updated live from forum_votes.
--   - No new RLS needed for forum_votes (existing policies cover it).
--     rba_polls are public-readable; only service_role may write.
--
-- Rollback strategy:
--   DROP VIEW IF EXISTS public.rba_poll_accuracy;
--   DROP TABLE IF EXISTS public.rba_polls;

BEGIN;

CREATE TABLE IF NOT EXISTS public.rba_polls (
  id            bigserial PRIMARY KEY,
  meeting_date  date NOT NULL UNIQUE,
  description   text NOT NULL DEFAULT '',
  status        text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'revealed', 'closed')),
  outcome       smallint
    CHECK (outcome IS NULL OR outcome IN (-1, 0, 1)),
  change_bps    integer,        -- actual change in basis points (e.g. 25, -25, 0)
  decided_at    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON COLUMN public.rba_polls.outcome IS
  '1=HIKE, 0=HOLD, -1=CUT. NULL until status=revealed.';

COMMENT ON COLUMN public.rba_polls.change_bps IS
  'Actual rate change announced by the RBA (e.g. 25 for +0.25pp, -25 for cut).';

CREATE INDEX IF NOT EXISTS rba_polls_status_idx
  ON public.rba_polls (status, meeting_date DESC);

ALTER TABLE public.rba_polls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rba_polls_public_read" ON public.rba_polls;
CREATE POLICY "rba_polls_public_read"
  ON public.rba_polls FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "rba_polls_service_all" ON public.rba_polls;
CREATE POLICY "rba_polls_service_all"
  ON public.rba_polls FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── Accuracy view ────────────────────────────────────────────────────────────
-- Per-user accuracy across all revealed polls. Live — no materialisation
-- needed at current scale.

CREATE OR REPLACE VIEW public.rba_poll_accuracy AS
SELECT
  fv.user_id,
  COUNT(*)::integer                                              AS polls_participated,
  SUM(CASE WHEN fv.value = rp.outcome THEN 1 ELSE 0 END)::integer AS correct_predictions,
  CASE
    WHEN COUNT(*) = 0 THEN 0.0
    ELSE ROUND(
      100.0 * SUM(CASE WHEN fv.value = rp.outcome THEN 1 ELSE 0 END) / COUNT(*),
      1
    )
  END::numeric                                                   AS accuracy_pct
FROM public.forum_votes fv
JOIN public.rba_polls rp
  ON rp.id = fv.target_id
 AND fv.target_type = 'rba_poll'
WHERE rp.status = 'revealed'
  AND rp.outcome IS NOT NULL
GROUP BY fv.user_id;

-- ── Seed: 3 polls (1 revealed historic, 2 upcoming) ─────────────────────────
-- Real RBA meeting schedule (approximate). Seeded for demo / dev.
-- The admin reveal route will update these with real outcomes.

INSERT INTO public.rba_polls (meeting_date, description, status, outcome, change_bps, decided_at)
VALUES
  (
    '2026-05-19',
    'May 2026 RBA Board meeting — cash rate decision.',
    'revealed',
    0,
    0,
    '2026-05-19 05:30:00+00'
  )
ON CONFLICT (meeting_date) DO NOTHING;

-- Upcoming polls: status defaults to 'open' (column default), so it is omitted
-- from the column list. (The original listed `status` with no matching value,
-- which raised "INSERT has more target columns than expressions".)
INSERT INTO public.rba_polls (meeting_date, description)
VALUES
  ('2026-07-07', 'July 2026 RBA Board meeting — cash rate decision.'),
  ('2026-08-04', 'August 2026 RBA Board meeting — cash rate decision.')
ON CONFLICT (meeting_date) DO NOTHING;

COMMIT;
