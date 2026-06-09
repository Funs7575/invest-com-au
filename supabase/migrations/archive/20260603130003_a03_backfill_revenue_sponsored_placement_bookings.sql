-- ============================================================================
-- Migration: Backfill public.sponsored_placement_bookings (A-03 batch 1)
-- Date:      2026-05-01 (queued under 20260603 to sort after A-02 batch 1)
-- Audit ref: docs/audits/drift-list.md (A-06 marketplace family,
--            shipped via the A-03 revenue iteration grouping)
-- Queue item: docs/audits/REMEDIATION_QUEUE.md A-03
--
-- Purpose
--   `sponsored_placement_bookings` is declared in `lib/database.types.ts`
--   (line 10585) but the migration tree never CREATEs the table. It is
--   the booking ledger for sponsored placement slots — one row per paid
--   slot reservation, with the broker, tier, time window, Stripe payment
--   identifiers, and lifecycle timestamps (applied_at, cleared_at).
--
--   Used by 6 call sites:
--     - app/admin/sponsored-queue/page.tsx                          (admin: read)
--     - app/api/advertise/create-checkout/route.ts                  (insert pre-checkout row)
--     - app/api/cron/sponsored-renewal-reminder/route.ts            (read + update)
--     - app/api/cron/sponsored-placement-apply/route.ts             (read + update lifecycle)
--     - app/broker-portal/sponsored-slots/page.tsx                  (broker: read own)
--     - lib/stripe-webhook/handlers/checkout-session-completed.ts   (read + update on payment)
--
-- Why it matters
--   Revenue ledger — every paid sponsored slot has a row here. Drives the
--   admin sponsored queue, the broker-portal "your slots" view, the renewal
--   reminder cron, and the lifecycle cron that flips status from
--   scheduled -> active -> ended. Stripe webhook flow finalises the row
--   after checkout completes.
--
-- Schema source of truth
--   Live DB (verified 2026-05-01 via information_schema.columns) +
--   lib/database.types.ts → Database['public']['Tables']['sponsored_placement_bookings'].
--   - id                         bigint      PK   nextval('sponsored_placement_bookings_id_seq')
--   - broker_slug                text        NOT NULL
--   - tier                       text        NOT NULL  CHECK IN ('featured_partner','editors_pick','deal_of_month')
--   - starts_at                  timestamptz NOT NULL
--   - ends_at                    timestamptz NOT NULL  (CHECK ends_at > starts_at)
--   - amount_cents               bigint      NULLABLE  (paid amount captured post-checkout)
--   - currency                   text        NOT NULL DEFAULT 'AUD'
--   - invoice_ref                text        NULLABLE
--   - notes                      text        NULLABLE
--   - status                     text        NOT NULL DEFAULT 'scheduled'
--                                            CHECK IN ('scheduled','active','ended','cancelled')
--   - created_by                 text        NULLABLE  (admin email or broker session)
--   - created_at                 timestamptz NOT NULL DEFAULT now()
--   - applied_at                 timestamptz NULLABLE  (when status flipped to active)
--   - cleared_at                 timestamptz NULLABLE  (when status flipped to ended)
--   - broker_id                  bigint      NULLABLE  FK -> brokers(id) ON DELETE SET NULL
--   - stripe_session_id          text        NULLABLE  (UNIQUE when set)
--   - stripe_payment_intent_id   text        NULLABLE
--   - stripe_invoice_url         text        NULLABLE
--   - renewal_reminder_sent_at   timestamptz NULLABLE
--
-- Divergence from types
--   - Types declare `amount_cents: number | null`; live DB is `bigint`.
--     Migration uses `bigint`.
--   - Types declare `broker_id: number | null`; live DB is `bigint` with
--     FK to `brokers(id)` (numeric type bigint in `brokers`). Migration
--     mirrors live.
--   - Live DB has CHECK constraints (`status_check`, `tier_check`, and
--     the unnamed `ends_at > starts_at` check) not visible in the type.
--     Migration ports them verbatim.
--   - Live DB has a partial UNIQUE INDEX on `stripe_session_id WHERE NOT NULL`
--     (`idx_sponsored_bookings_session_uniq`) plus three lookup indexes:
--     `idx_sponsored_bookings_active`, `idx_sponsored_bookings_reminder_due`,
--     `idx_sponsored_bookings_window`. Migration ports them.
--
-- FK behaviour (verified live)
--   `broker_id REFERENCES brokers(id) ON DELETE SET NULL`. If a broker
--   directory row is deleted (rare; brokers usually soft-delete), the
--   booking history survives with broker_id nulled — `broker_slug` remains
--   as the immutable historical reference.
--
-- RLS policy chosen — service-role-only (deny anon + authenticated by default)
--   - service_role: explicit FOR ALL allow.
--   - anon + authenticated: NO policy — RLS denies all access by default.
--
--   Justification: revenue ledger with payment identifiers (Stripe
--   session/payment-intent/invoice URL). Every reader is server-side:
--     - admin pages run server-side and use the service-role/admin client.
--     - broker-portal "your slots" view (`app/broker-portal/sponsored-slots/page.tsx`)
--       is a server component that uses the admin client and filters by
--       the authenticated broker's session before returning rows. RLS does
--       not need to enforce broker-isolation here because the page never
--       reaches Supabase from the user-cookie client; the broker session
--       boundary is enforced in app code first.
--     - crons and the Stripe webhook all run service-role.
--   Granting authenticated read would expose every broker's revenue and
--   Stripe identifiers to every other authenticated user — strict deny is
--   correct. Pattern matches `marketplace_invoices` / `wallet_transactions`
--   ownership model elsewhere in the tree.
--
-- Idempotency
--   - The body uses `if not exists` on the table — no-op when it exists.
--   - CREATE INDEX IF NOT EXISTS for FK and lookup indexes.
--   - CREATE UNIQUE INDEX IF NOT EXISTS for the partial Stripe-session uniqueness.
--   - DROP POLICY IF EXISTS + CREATE POLICY for every policy.
--
-- Risk: low
--   - Forward-only schema add; no data shaping.
--   - All callers already use admin/service-role; deny-anon does not
--     change behaviour.
--   - FK depends on `brokers` (created by the marketplace migrations
--     long predating this batch).
--
-- Rollback
--   BEGIN;
--     DROP POLICY IF EXISTS "service_role full access" ON public.sponsored_placement_bookings;
--     DROP INDEX IF EXISTS idx_sponsored_placement_bookings_broker_id;
--     DROP INDEX IF EXISTS idx_sponsored_bookings_window;
--     DROP INDEX IF EXISTS idx_sponsored_bookings_reminder_due;
--     DROP INDEX IF EXISTS idx_sponsored_bookings_active;
--     DROP INDEX IF EXISTS idx_sponsored_bookings_session_uniq;
--     ALTER TABLE public.sponsored_placement_bookings DISABLE ROW LEVEL SECURITY;
--     -- DROP TABLE public.sponsored_placement_bookings;  -- destructive; clean rebuild only
--   COMMIT;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.sponsored_placement_bookings (
  id                         bigserial   NOT NULL,
  broker_slug                text        NOT NULL,
  tier                       text        NOT NULL,
  starts_at                  timestamptz NOT NULL,
  ends_at                    timestamptz NOT NULL,
  amount_cents               bigint,
  currency                   text        NOT NULL DEFAULT 'AUD',
  invoice_ref                text,
  notes                      text,
  status                     text        NOT NULL DEFAULT 'scheduled',
  created_by                 text,
  created_at                 timestamptz NOT NULL DEFAULT now(),
  applied_at                 timestamptz,
  cleared_at                 timestamptz,
  broker_id                  bigint,
  stripe_session_id          text,
  stripe_payment_intent_id   text,
  stripe_invoice_url         text,
  renewal_reminder_sent_at   timestamptz,
  CONSTRAINT sponsored_placement_bookings_pkey PRIMARY KEY (id),
  CONSTRAINT sponsored_placement_bookings_tier_check
    CHECK (tier IN ('featured_partner', 'editors_pick', 'deal_of_month')),
  CONSTRAINT sponsored_placement_bookings_status_check
    CHECK (status IN ('scheduled', 'active', 'ended', 'cancelled')),
  CONSTRAINT sponsored_placement_bookings_check
    CHECK (ends_at > starts_at),
  CONSTRAINT sponsored_placement_bookings_broker_id_fkey
    FOREIGN KEY (broker_id)
    REFERENCES public.brokers(id)
    ON DELETE SET NULL
);

-- FK index — broker_id lookups (admin sponsored queue groups by broker).
CREATE INDEX IF NOT EXISTS idx_sponsored_placement_bookings_broker_id
  ON public.sponsored_placement_bookings (broker_id);

-- Lifecycle scan — the apply cron picks up scheduled+active rows ordered
-- by starts_at to flip status.
CREATE INDEX IF NOT EXISTS idx_sponsored_bookings_active
  ON public.sponsored_placement_bookings (status, starts_at)
  WHERE status IN ('scheduled', 'active');

-- Renewal reminder cron — find active rows whose ends_at is approaching
-- and that haven't been reminded yet.
CREATE INDEX IF NOT EXISTS idx_sponsored_bookings_reminder_due
  ON public.sponsored_placement_bookings (ends_at)
  WHERE status = 'active' AND renewal_reminder_sent_at IS NULL;

-- Window overlap checks — concurrent-slot capacity validation in the
-- create-checkout route.
CREATE INDEX IF NOT EXISTS idx_sponsored_bookings_window
  ON public.sponsored_placement_bookings (starts_at, ends_at);

-- Stripe session idempotency — webhook handler upserts by session_id; the
-- partial unique index prevents duplicate finalisation if Stripe retries.
CREATE UNIQUE INDEX IF NOT EXISTS idx_sponsored_bookings_session_uniq
  ON public.sponsored_placement_bookings (stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;

ALTER TABLE public.sponsored_placement_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsored_placement_bookings FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access" ON public.sponsored_placement_bookings;
CREATE POLICY "service_role full access"
  ON public.sponsored_placement_bookings
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- No anon/authenticated policies — revenue ledger with payment
-- identifiers. Broker-portal access is already gated server-side by the
-- broker session and uses the admin client; granting authenticated read
-- here would leak every broker's Stripe identifiers across tenants.

COMMIT;
