-- ============================================================================
-- Migration: 20260511011337_placement_experiments.sql
-- Purpose: W5.26 — sponsored-placement A/B testing infrastructure.
--          Lets editorial run rotations of which broker is in position 1
--          on /best/<slug> pages (e.g. swap Stake ↔ Sharesies for two weeks)
--          and capture CTR/CR per variant to inform sponsorship pricing
--          and ranking heuristics.
--
-- Audit ref: docs/plans/pre-launch-wave-master-prompt.md W5.26
-- Risk: low — additive; new tables; no foreign keys to existing entities.
-- Rollback:
--   DROP FUNCTION IF EXISTS public.increment_placement_event(bigint, text, text);
--   DROP TABLE IF EXISTS public.placement_experiments;
--   (DESTRUCTIVE — discards experiment history. Replay the migration to
--   re-create the schema; aggregated counters are NOT recoverable.)
--
-- Forward operations:
--   1. CREATE TABLE IF NOT EXISTS public.placement_experiments.
--   2. UNIQUE partial index — at most one running experiment per slug.
--   3. Status + slug index for the admin list view.
--   4. RLS: anon SELECT on running/paused rows (server picks the active
--      experiment on /best/<slug>); service_role full access for admin CRUD.
--   5. RPC `increment_placement_event` for atomic counter bumps.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.placement_experiments (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug          text   NOT NULL,                  -- placement key, e.g. "best/low-fees"
  name          text   NOT NULL,
  status        text   NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','running','paused','completed')),
  variants      jsonb  NOT NULL,                  -- [{label, broker_slug|null, weight}]
  metrics       jsonb  NOT NULL DEFAULT '{}'::jsonb,
                                                  -- {label: {impressions:int, clicks:int, conversions:int}}
  notes         text,
  winner_variant text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  started_at    timestamptz,
  ended_at      timestamptz,

  CONSTRAINT placement_experiments_variants_array
    CHECK (jsonb_typeof(variants) = 'array'
           AND jsonb_array_length(variants) >= 2),
  CONSTRAINT placement_experiments_slug_format
    CHECK (slug ~ '^[a-z0-9][a-z0-9/_-]{1,80}$')
);

-- Only one running experiment per placement key — admin UI relies on this
-- to keep "what's live right now" deterministic.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_placement_experiments_running_slug
  ON public.placement_experiments (slug)
  WHERE status = 'running';

CREATE INDEX IF NOT EXISTS idx_placement_experiments_status_slug
  ON public.placement_experiments (status, slug);

ALTER TABLE public.placement_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.placement_experiments FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read live placement experiments" ON public.placement_experiments;
CREATE POLICY "Public can read live placement experiments"
  ON public.placement_experiments FOR SELECT
  USING (status IN ('running', 'paused'));

DROP POLICY IF EXISTS "Service role full access to placement experiments" ON public.placement_experiments;
CREATE POLICY "Service role full access to placement experiments"
  ON public.placement_experiments FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ──────────────────────────────────────────────────────────────────────────
-- RPC: atomic counter bump.
-- The metrics jsonb is shaped as {variant_label: {impressions, clicks, conversions}}.
-- `jsonb_set` writes the path; if the path doesn't exist yet, it creates it.
-- The function refuses bumps for non-live experiments (status not running/paused).
-- ──────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.increment_placement_event(
  p_experiment_id bigint,
  p_variant text,
  p_event_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_count int;
BEGIN
  IF p_event_type NOT IN ('impressions', 'clicks', 'conversions') THEN
    RAISE EXCEPTION 'invalid event_type: %', p_event_type;
  END IF;

  IF p_variant IS NULL OR length(trim(p_variant)) = 0 THEN
    RAISE EXCEPTION 'variant required';
  END IF;

  SELECT COALESCE(
           (metrics -> p_variant ->> p_event_type)::int, 0
         )
    INTO v_current_count
    FROM public.placement_experiments
    WHERE id = p_experiment_id
      AND status IN ('running', 'paused')
    FOR UPDATE;

  IF NOT FOUND THEN
    RETURN; -- silent no-op for completed/draft experiments; client-side cache may lag
  END IF;

  UPDATE public.placement_experiments
  SET metrics = jsonb_set(
        COALESCE(metrics, '{}'::jsonb),
        ARRAY[p_variant, p_event_type],
        to_jsonb(v_current_count + 1),
        true
      ),
      updated_at = now()
  WHERE id = p_experiment_id;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_placement_event(bigint, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_placement_event(bigint, text, text) TO anon, authenticated, service_role;

COMMIT;
