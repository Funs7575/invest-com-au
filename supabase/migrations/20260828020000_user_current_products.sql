-- PR 9.3: Persistent switching tracker — user_current_products.
--
-- Users manually record which products they are currently using.
-- The app computes a factual lifetime-cost comparison vs the current
-- best-in-class and surfaces an annual review reminder.
--
-- General information only — not personal financial advice.
--
-- Rollback:
--   DROP TABLE IF EXISTS public.user_current_products;

CREATE TABLE IF NOT EXISTS public.user_current_products (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_kind                text        NOT NULL
                              CHECK (product_kind IN (
                                'broker', 'savings_account', 'term_deposit', 'super', 'crypto'
                              )),
  broker_id                   bigint      REFERENCES public.brokers(id) ON DELETE SET NULL,
  broker_name                 text        NOT NULL,
  started_at                  date        NOT NULL,
  fee_text                    text        CHECK (fee_text IS NULL OR char_length(fee_text) <= 100),
  estimated_trades_pa         integer     CHECK (estimated_trades_pa IS NULL OR (estimated_trades_pa >= 0 AND estimated_trades_pa <= 10000)),
  estimated_balance_cents     bigint      CHECK (estimated_balance_cents IS NULL OR estimated_balance_cents >= 0),
  status                      text        NOT NULL DEFAULT 'active'
                              CHECK (status IN ('active', 'switched', 'closed')),
  last_review_reminder_at     timestamptz,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_current_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_current_products FORCE ROW LEVEL SECURITY;

-- Users can only see and manage their own records
DROP POLICY IF EXISTS "user_own_products_select" ON public.user_current_products;
CREATE POLICY "user_own_products_select"
  ON public.user_current_products FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "user_own_products_insert" ON public.user_current_products;
CREATE POLICY "user_own_products_insert"
  ON public.user_current_products FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "user_own_products_update" ON public.user_current_products;
CREATE POLICY "user_own_products_update"
  ON public.user_current_products FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "service_role_products" ON public.user_current_products;
CREATE POLICY "service_role_products"
  ON public.user_current_products FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS user_current_products_user_idx
  ON public.user_current_products (user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS user_current_products_review_idx
  ON public.user_current_products (status, last_review_reminder_at NULLS FIRST, started_at)
  WHERE status = 'active';
