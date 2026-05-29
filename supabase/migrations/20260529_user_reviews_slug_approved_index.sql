-- Covering index for the broker-page approved-reviews query.
--
-- app/broker/[slug]/page.tsx filters user_reviews by
--   (broker_slug = $1 AND status = 'approved') ORDER BY created_at DESC
-- on every ISR regen. The only existing index, idx_user_reviews_broker_published,
-- is on (broker_id, created_at) WHERE status = 'published' — wrong column AND
-- wrong status predicate — so this query sequential-scans user_reviews.
--
-- Forward-only. Idempotent (IF NOT EXISTS). CREATE INDEX CONCURRENTLY is
-- intentionally NOT used so this runs inside the migration transaction;
-- user_reviews is tiny today so the brief lock is negligible. If applied to a
-- large table later, switch to CONCURRENTLY and run outside a transaction.
--
-- Rollback strategy (forward-only prod): apply a new migration with
--   DROP INDEX IF EXISTS public.idx_user_reviews_slug_approved;

CREATE INDEX IF NOT EXISTS idx_user_reviews_slug_approved
  ON public.user_reviews (broker_slug, created_at DESC)
  WHERE status = 'approved';
