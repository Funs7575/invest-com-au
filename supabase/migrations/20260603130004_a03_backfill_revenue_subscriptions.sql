-- ============================================================================
-- Migration: Backfill public.subscriptions (A-03 batch 1)
-- Date:      2026-05-01 (queued under 20260603 to sort after A-02 batch 1)
-- Audit ref: docs/audits/drift-list.md (A-05 affiliate / finance family,
--            shipped via the A-03 revenue iteration grouping)
-- Queue item: docs/audits/REMEDIATION_QUEUE.md A-03
--
-- Purpose
--   `subscriptions` is declared in `lib/database.types.ts` (line 10770) but
--   the migration tree never CREATEs the table. It is the Stripe-backed
--   user subscription ledger — one row per (auth.users, stripe_subscription),
--   tracking Stripe lifecycle (status, current_period_*, cancel_at_period_end,
--   pause/grace fields) and dunning state.
--
--   Used by 14+ call sites — selected:
--     - app/admin/pro-subscribers/page.tsx                                 (admin: read + update)
--     - app/admin/funnel/page.tsx                                          (admin: count active)
--     - app/api/cron/subscription-dunning/route.ts                         (read + update dunning)
--     - app/api/stripe/cancel-subscription/route.ts                        (read + update cancel flag)
--     - app/api/stripe/refund-subscription/route.ts                        (read on refund)
--     - app/api/stripe/create-checkout/route.ts                            (read existing customer)
--     - app/api/course/purchase/route.ts                                   (read entitlement)
--     - app/api/consultation/book/route.ts                                 (read entitlement)
--     - app/api/fee-profile/route.ts                                       (read entitlement)
--     - app/api/review-incentive/route.ts                                  (read entitlement)
--     - lib/hooks/useSubscription.ts                                       (browser: read own)
--     - lib/server/get-subscription.ts                                     (server: read by user_id)
--     - lib/stripe-webhook/lib/upsert-subscription.ts                      (webhook: upsert)
--     - lib/stripe-webhook/handlers/customer-subscription-paused.ts        (webhook: update)
--     - lib/stripe-webhook/handlers/invoice.ts                             (webhook: update)
--
-- Why it matters
--   Direct revenue + entitlement source of truth — gates every Pro feature
--   (course access, fee-profile downloads, review incentives, consultation
--   booking, etc.). Without this in the migration tree a clean rebuild
--   loses the entitlement check entirely. RLS-critical: per-user data with
--   Stripe identifiers and dunning state.
--
-- Schema source of truth
--   Live DB (verified 2026-05-01 via information_schema.columns +
--   pg_attribute.attidentity) + lib/database.types.ts →
--   Database['public']['Tables']['subscriptions'].
--   - id                       bigint      PK   GENERATED ALWAYS AS IDENTITY
--   - user_id                  uuid        NOT NULL  FK -> auth.users(id) ON DELETE CASCADE
--   - stripe_subscription_id   text        NOT NULL  UNIQUE
--   - stripe_customer_id       text        NOT NULL
--   - status                   text        NOT NULL DEFAULT 'incomplete'
--                                          CHECK IN ('active','trialing','past_due','canceled',
--                                                    'incomplete','incomplete_expired','unpaid','paused')
--   - price_id                 text        NULLABLE
--   - plan_interval            text        NULLABLE  CHECK IN ('month','year')
--   - current_period_start     timestamptz NULLABLE
--   - current_period_end       timestamptz NULLABLE
--   - cancel_at_period_end     boolean     NULLABLE DEFAULT false
--   - canceled_at              timestamptz NULLABLE
--   - created_at               timestamptz NULLABLE DEFAULT now()
--   - updated_at               timestamptz NULLABLE DEFAULT now()
--   - grace_period_until       timestamptz NULLABLE
--   - paused_at                timestamptz NULLABLE
--   - pause_reason             text        NULLABLE
--   - dunning_attempt_count    integer     NULLABLE DEFAULT 0
--   - last_dunning_email_at    timestamptz NULLABLE
--
-- Divergence from types
--   - Types declare `id?: never` on Insert/Update; live DB confirms this is
--     `GENERATED ALWAYS AS IDENTITY` (not bigserial). The two are subtly
--     different: GENERATED ALWAYS rejects manual id assignment outright.
--     Migration uses `GENERATED ALWAYS AS IDENTITY` — trust live DB.
--   - Live DB has CHECK constraints on `status` and `plan_interval` not
--     visible in the type. Migration ports them verbatim.
--   - The type lists `cancel_at_period_end: boolean | null` with no default
--     visible; live DB has DEFAULT false. Migration matches live DB.
--   - The type has no FK target on `user_id`; live DB has
--     FK -> auth.users(id) ON DELETE CASCADE. Migration matches live DB.
--
-- RLS policy chosen — owner-isolation (user reads own row only)
--   - service_role: explicit FOR ALL allow (cron, webhooks, admin tooling).
--   - authenticated: SELECT permitted WHERE user_id = auth.uid() — owner-only.
--   - anon: NO policy — RLS denies.
--   - INSERT/UPDATE/DELETE: NOT granted to anon/authenticated. All writes
--     flow through Stripe webhook handlers (`lib/stripe-webhook/lib/upsert-subscription.ts`,
--     `customer-subscription-paused.ts`, `invoice.ts`) and admin tooling,
--     all of which use the service-role client. The user-cookie hook
--     (`lib/hooks/useSubscription.ts`) and the cancel/refund routes only
--     read; cancellation actually flips Stripe-side first and the change
--     mirrors back via webhook.
--
--   Justification: this is the user's billing relationship — they have a
--   right to read their own subscription state (the Pro account page and
--   the `useSubscription` hook depend on it from the user-cookie client).
--   Cross-user reads would leak Stripe identifiers and dunning history
--   between tenants. Pattern matches the `profiles` owner-isolation policy
--   shipped in A-02 batch 1.
--
-- Idempotency
--   - The body uses `if not exists` on the table — no-op when it exists.
--   - CREATE INDEX IF NOT EXISTS on `user_id` (FK lookup; matches live DB).
--   - The UNIQUE constraint on `stripe_subscription_id` is inlined in the
--     table definition so it attaches atomically.
--   - DROP POLICY IF EXISTS + CREATE POLICY for every policy.
--
-- Risk: low-medium
--   - Forward-only schema add; no data shaping.
--   - Owner-isolation policy is additive against today's behaviour: the
--     `useSubscription` hook already reads via the user-cookie client and
--     filters by `eq('user_id', user.id)` in code; RLS just enforces what
--     code already does.
--   - One ambiguity to flag: a couple of admin/AI-chat routes (e.g.
--     `app/api/admin/ai-chat/route.ts`) reference `email` and `cancelled_at`
--     columns that exist neither in types nor in live DB. That looks like
--     a pre-existing bug in admin tooling — out of scope for this backfill,
--     but logged here so the next person doesn't chase it as a schema gap.
--
-- Rollback
--   BEGIN;
--     DROP POLICY IF EXISTS "service_role full access" ON public.subscriptions;
--     DROP POLICY IF EXISTS "owner read own subscription" ON public.subscriptions;
--     DROP INDEX IF EXISTS idx_subscriptions_user_id;
--     ALTER TABLE public.subscriptions DISABLE ROW LEVEL SECURITY;
--     -- DROP TABLE public.subscriptions;  -- destructive; clean rebuild only
--   COMMIT;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                       bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id                  uuid        NOT NULL,
  stripe_subscription_id   text        NOT NULL,
  stripe_customer_id       text        NOT NULL,
  status                   text        NOT NULL DEFAULT 'incomplete',
  price_id                 text,
  plan_interval            text,
  current_period_start     timestamptz,
  current_period_end       timestamptz,
  cancel_at_period_end     boolean              DEFAULT false,
  canceled_at              timestamptz,
  created_at               timestamptz          DEFAULT now(),
  updated_at               timestamptz          DEFAULT now(),
  grace_period_until       timestamptz,
  paused_at                timestamptz,
  pause_reason             text,
  dunning_attempt_count    integer              DEFAULT 0,
  last_dunning_email_at    timestamptz,
  CONSTRAINT subscriptions_stripe_subscription_id_key UNIQUE (stripe_subscription_id),
  CONSTRAINT subscriptions_status_check
    CHECK (status IN ('active', 'trialing', 'past_due', 'canceled',
                      'incomplete', 'incomplete_expired', 'unpaid', 'paused')),
  CONSTRAINT subscriptions_plan_interval_check
    CHECK (plan_interval IS NULL OR plan_interval IN ('month', 'year')),
  CONSTRAINT subscriptions_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE
);

-- FK lookup — every read on the user-cookie client filters by user_id;
-- matches the index already present in live DB.
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id
  ON public.subscriptions (user_id);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access" ON public.subscriptions;
CREATE POLICY "service_role full access"
  ON public.subscriptions
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Owner-isolation read — the Pro account page and `useSubscription` hook
-- read the current user's own subscription via the user-cookie client.
-- Cross-user reads are forbidden (would leak Stripe identifiers).
DROP POLICY IF EXISTS "owner read own subscription" ON public.subscriptions;
CREATE POLICY "owner read own subscription"
  ON public.subscriptions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- No INSERT/UPDATE/DELETE policies for anon/authenticated: subscription
-- state mutations all flow through Stripe webhook handlers using the
-- service-role client. User-initiated cancellations call Stripe first and
-- the resulting state mirrors back via webhook.

COMMIT;
