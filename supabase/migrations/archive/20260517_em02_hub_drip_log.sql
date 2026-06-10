-- =============================================================================
-- Date:         2026-05-17
-- Audit ref:    EM-02 — hub subscriber drip sequence delivery mechanism
-- Queue item:   em-02-digest-infra
-- Why:          EM-03 seeded newsletter_segments and built the subscription
--               flow. EM-02 adds the send-tracking table (hub_drip_log) so
--               the daily hub-subscriber-drip cron can deliver a 3-step
--               welcome drip to each confirmed hub subscriber exactly once
--               per step, regardless of retries or duplicate cron fires.
-- Idempotent:   Yes — CREATE TABLE IF NOT EXISTS; DROP POLICY IF EXISTS;
--               UNIQUE (email, segment_slug, drip_step) guards double-inserts.
-- Rollback:     DROP TABLE IF EXISTS public.hub_drip_log;
--               (Removes all send history; safe because the cron will simply
--               re-send step 1 to all subscribers on next fire — annoying but
--               not harmful. Only needed if the cron itself is removed.)
-- Prior policy: No prior RLS on this table (new). No policies to drop.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.hub_drip_log (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email        text        NOT NULL,
  segment_slug text        NOT NULL,
  drip_step    smallint    NOT NULL CHECK (drip_step BETWEEN 1 AND 3),
  sent_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT hub_drip_log_unique_send UNIQUE (email, segment_slug, drip_step)
);

CREATE INDEX IF NOT EXISTS idx_hub_drip_log_email_seg
  ON public.hub_drip_log (email, segment_slug);

ALTER TABLE public.hub_drip_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hub_drip_log FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access" ON public.hub_drip_log;
CREATE POLICY "service_role full access"
  ON public.hub_drip_log
  TO service_role
  USING (true)
  WITH CHECK (true);

-- TODO: human review of policy semantics — table is cron-only; no
-- authenticated or anon policies needed. Deny-all for all other roles
-- is intentional (implicit when RLS is enabled with no matching policy).

COMMIT;
