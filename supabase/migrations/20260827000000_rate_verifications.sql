-- PR 8.4: Crowd-sourced rate verification.
--
-- Users who have applied and received a savings or TD rate can report
-- the actual rate they got. Aggregate counts + rates surface as trust
-- signals on broker/product cards.
--
-- Rollback:
--   DROP TABLE IF EXISTS public.rate_verifications;

CREATE TABLE IF NOT EXISTS public.rate_verifications (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  broker_id        integer     NOT NULL REFERENCES public.brokers(id) ON DELETE CASCADE,
  product_kind     text        NOT NULL CHECK (product_kind IN ('savings', 'term_deposit')),
  verified_rate_bps integer    NOT NULL CHECK (verified_rate_bps > 0 AND verified_rate_bps < 5000),
  term_months      integer     CHECK (term_months IS NULL OR (term_months > 0 AND term_months <= 120)),
  comment          text        CHECK (comment IS NULL OR length(comment) <= 500),
  status           text        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending', 'verified', 'rejected')),
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rate_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_verifications FORCE ROW LEVEL SECURITY;

-- Users can insert their own verifications.
CREATE POLICY "user insert own rate verification"
  ON public.rate_verifications
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can read their own verifications.
CREATE POLICY "user read own rate verifications"
  ON public.rate_verifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Public can read verified (approved) verifications.
CREATE POLICY "public read verified rate verifications"
  ON public.rate_verifications
  FOR SELECT
  USING (status = 'verified');

-- Service role has full access (admin moderation + cron auto-approve).
CREATE POLICY "service_role full access rate verifications"
  ON public.rate_verifications
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Unique per user+broker+product_kind per 24h window is enforced at the
-- application layer (simpler than a partial unique index on date).
CREATE INDEX IF NOT EXISTS rate_verifications_broker_product_idx
  ON public.rate_verifications (broker_id, product_kind, status);

CREATE INDEX IF NOT EXISTS rate_verifications_user_idx
  ON public.rate_verifications (user_id, created_at DESC);
