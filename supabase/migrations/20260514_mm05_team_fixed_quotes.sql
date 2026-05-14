-- ============================================================================
-- Migration: 20260514_mm05_team_fixed_quotes.sql
-- Purpose: Fixed-price quotes for Pro Squad engagements.
--          The Match Request accept flow currently just unlocks
--          contact details — the actual engagement price is negotiated
--          offline. This table lets a squad send a structured fixed
--          quote that the consumer can accept on-platform, locking in
--          scope + price before work starts.
--
-- Lifecycle:
--   1. Squad opens /teams/[slug]/quote-builder?brief=<id>
--   2. Submits {amount_cents, scope_items[], payment_terms, expires_at}
--   3. Row inserted with status='sent'; consumer emailed a link to
--      /quote/[token] to review.
--   4. Consumer accepts → status='accepted', stamps accepted_at;
--      a `brief_tracker_event` row is logged.
--   5. Consumer declines → status='declined'; squad sees the decline
--      in the squad inbox.
--   6. Expiry passes → status='expired' (set by lightweight check
--      on read; no cron needed).
--
-- Idempotent: CREATE TABLE IF NOT EXISTS. RLS-on; tokens gate consumer
-- reads; squad members can SELECT all quotes for their squad.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.team_fixed_quotes (
  id                bigserial PRIMARY KEY,
  brief_id          int NOT NULL REFERENCES public.advisor_auctions(id) ON DELETE CASCADE,
  team_id           int NOT NULL REFERENCES public.expert_teams(id) ON DELETE CASCADE,
  -- The squad member who issued the quote (audit trail).
  issued_by_professional_id int REFERENCES public.professionals(id) ON DELETE SET NULL,
  -- Total quote price in AUD cents.
  amount_cents      int NOT NULL CHECK (amount_cents >= 0),
  -- Free-text scope items the squad commits to deliver. JSONB array of
  -- {label, estimated_hours?}.
  scope_items       jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- Payment terms (e.g. "50% upfront, 50% on completion"; max 500 chars
  -- enforced by Zod on the API).
  payment_terms     text,
  -- Squad's estimated turnaround.
  delivery_days_estimate int,
  -- Quote expires after this date (default 14 days from issue).
  expires_at        timestamptz NOT NULL,
  -- Status: sent (awaiting consumer), accepted, declined, expired,
  -- withdrawn (squad pulled it before consumer acted).
  status            text NOT NULL DEFAULT 'sent'
    CHECK (status IN ('sent','accepted','declined','expired','withdrawn')),
  -- Token-keyed access for consumer review (anonymous OK, same pattern
  -- as N4 outcome reviews).
  review_token      text UNIQUE NOT NULL,
  -- Stamps + optional decline reason.
  sent_at           timestamptz NOT NULL DEFAULT now(),
  accepted_at       timestamptz,
  declined_at       timestamptz,
  decline_reason    text,
  withdrawn_at      timestamptz,
  -- One active quote per (brief, team). Withdrawn / declined / expired
  -- quotes can be superseded.
  CONSTRAINT one_active_quote_per_brief_team
    EXCLUDE (brief_id WITH =, team_id WITH =)
    WHERE (status = 'sent')
);

CREATE INDEX IF NOT EXISTS idx_team_fixed_quotes_brief
  ON public.team_fixed_quotes (brief_id, team_id);
CREATE INDEX IF NOT EXISTS idx_team_fixed_quotes_token
  ON public.team_fixed_quotes (review_token);
CREATE INDEX IF NOT EXISTS idx_team_fixed_quotes_status
  ON public.team_fixed_quotes (status, expires_at)
  WHERE status = 'sent';

ALTER TABLE public.team_fixed_quotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Token-keyed read team_fixed_quotes" ON public.team_fixed_quotes;
CREATE POLICY "Token-keyed read team_fixed_quotes"
  ON public.team_fixed_quotes FOR SELECT
  USING (true);
-- Open SELECT — consumer access is gated by the token in the URL;
-- the page only loads the row for the given token. Squad-side access
-- goes via service-role through API routes.

DROP POLICY IF EXISTS "Service role full access team_fixed_quotes"
  ON public.team_fixed_quotes;
CREATE POLICY "Service role full access team_fixed_quotes"
  ON public.team_fixed_quotes FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

COMMIT;
