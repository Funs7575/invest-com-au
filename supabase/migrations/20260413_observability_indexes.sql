-- Indexes flagged by the database query audit.
--
-- 1. professional_leads.user_email — used by the cron review-verifier
--    to match advisor reviews against leads. Without this, the cron
--    times out at ~600 unverified reviews.
--
-- 2. broker_signups (broker_slug, email) — same pattern for broker
--    reviews. Composite index supports the equality-on-both lookup
--    used by the verifier.
--
-- 3. wallet_transactions (broker_slug, reference_type, reference_id) —
--    used by the Stripe webhook refund handler to compute the running
--    "already-reversed" total per charge for partial-refund safety.
--    Without this, the lookup is a sequential scan on every refund.

CREATE INDEX IF NOT EXISTS idx_professional_leads_user_email
  ON public.professional_leads (user_email);

CREATE INDEX IF NOT EXISTS idx_broker_signups_slug_email
  ON public.broker_signups (broker_slug, email);

CREATE INDEX IF NOT EXISTS idx_wallet_txn_refund_lookup
  ON public.wallet_transactions (broker_slug, reference_type, reference_id)
  WHERE reference_type IS NOT NULL;
