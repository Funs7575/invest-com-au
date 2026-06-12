-- Migration: auction_rounds — sealed bids, best-and-final rounds, counter-offers.
--
-- Idea #11 (docs/strategy/RETENTION_MARKETPLACE_MEGA_SESSIONS.md). Richer auction
-- mechanics on the existing public quote marketplace (advisor_auctions rows with
-- source='public_job', flow_type='auction'; bids in advisor_auction_bids):
--
--   1. SEALED BIDDING (advisor_auctions.bid_visibility):
--      'open'   (default, unchanged) — competing bid amounts are public.
--      'sealed' — advisers see only the bid COUNT until close; the consumer
--                 (the verified owner) always sees amounts. At close the
--                 auction-close cron stamps revealed_at on every bid.
--
--   2. BEST-AND-FINAL ROUND (advisor_auctions.final_round_started_at / _ends_at,
--      advisor_auction_bids.round_number): the consumer may trigger ONE 24h
--      final round among their top <=3 chosen bids. Invited advisers may submit
--      one revised bid (round_number=2). The same cron settles the expired final
--      round (final_round_ends_at < now).
--
--   3. COUNTER-OFFER (advisor_auction_bids.counter_amount / counter_status /
--      counter_at): the consumer may counter a single bid ("would you do it for
--      $X?"). One pending counter per bid. The adviser accepts (which updates the
--      bid amount — "countered ✓") or declines from the portal. No platform money
--      movement — purely a recorded factual price agreement; fees are the
--      adviser's own and the platform never intermediates consumer→adviser money.
--
-- TYPES — counter_amount mirrors advisor_auction_bids.bid_amount, which is an
--   integer storing CENTS (the whole codebase divides by 100 to display dollars).
--
-- DORMANCY — every new mechanic is gated at the application layer behind the
--   `auction_rounds` feature flag (fail-closed via isFlagEnabled). With the flag
--   off, none of these columns is read or written, so existing open-bid behaviour
--   is byte-identical and reads stay fail-soft even before this migration runs.
--
-- RLS — UNCHANGED. Both tables already have RLS enabled with the policies from
--   the baseline ("Public read of public open auctions" / "Advisors read own bids"
--   + service_role full access). These ALTERs add columns only; all sealed-mode
--   gating and counter/round writes go through the service-role admin client from
--   server routes that re-verify the consumer owner email (or the advisor session)
--   exactly like the existing accept flow. No new policies are required.
--
-- Rollback:
--   ALTER TABLE public.advisor_auction_bids
--     DROP COLUMN IF EXISTS round_number,
--     DROP COLUMN IF EXISTS revealed_at,
--     DROP COLUMN IF EXISTS counter_amount,
--     DROP COLUMN IF EXISTS counter_status,
--     DROP COLUMN IF EXISTS counter_at;
--   ALTER TABLE public.advisor_auctions
--     DROP COLUMN IF EXISTS bid_visibility,
--     DROP COLUMN IF EXISTS final_round_started_at,
--     DROP COLUMN IF EXISTS final_round_ends_at;

BEGIN;

-- ─── advisor_auction_bids: round + reveal + counter-offer columns ──────────
ALTER TABLE public.advisor_auction_bids
  ADD COLUMN IF NOT EXISTS round_number integer NOT NULL DEFAULT 1;

ALTER TABLE public.advisor_auction_bids
  ADD COLUMN IF NOT EXISTS revealed_at timestamptz;

-- counter_amount: integer cents, same type/units as bid_amount.
ALTER TABLE public.advisor_auction_bids
  ADD COLUMN IF NOT EXISTS counter_amount integer;

ALTER TABLE public.advisor_auction_bids
  ADD COLUMN IF NOT EXISTS counter_status text;

ALTER TABLE public.advisor_auction_bids
  ADD COLUMN IF NOT EXISTS counter_at timestamptz;

-- counter_status is NULL when no counter is in flight; otherwise one of
-- pending / accepted / declined. Idempotent: only add the constraint once.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'advisor_auction_bids_counter_status_check'
  ) THEN
    ALTER TABLE public.advisor_auction_bids
      ADD CONSTRAINT advisor_auction_bids_counter_status_check
      CHECK (counter_status IS NULL
             OR counter_status = ANY (ARRAY['pending'::text, 'accepted'::text, 'declined'::text]));
  END IF;
END $$;

-- ─── advisor_auctions: sealed-bid + final-round columns ────────────────────
ALTER TABLE public.advisor_auctions
  ADD COLUMN IF NOT EXISTS bid_visibility text NOT NULL DEFAULT 'open';

ALTER TABLE public.advisor_auctions
  ADD COLUMN IF NOT EXISTS final_round_started_at timestamptz;

ALTER TABLE public.advisor_auctions
  ADD COLUMN IF NOT EXISTS final_round_ends_at timestamptz;

-- bid_visibility is open (default) or sealed. Idempotent constraint add.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'advisor_auctions_bid_visibility_check'
  ) THEN
    ALTER TABLE public.advisor_auctions
      ADD CONSTRAINT advisor_auctions_bid_visibility_check
      CHECK (bid_visibility = ANY (ARRAY['open'::text, 'sealed'::text]));
  END IF;
END $$;

COMMIT;
