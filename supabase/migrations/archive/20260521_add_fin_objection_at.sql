-- Migration: add fin_objection_at to editorial_articles
-- Unblocks Agent #04 (Editorial) Tier 2 auto-publish objection mechanism
-- per .claude/agents/04-editorial.md. When Fin objects to a draft during
-- the 4-hour no-objection window, this timestamp is stamped by the admin
-- route (service_role client + FIN_OBJECTION_EMAILS allowlist check);
-- the auto-publish cron then skips any row where fin_objection_at IS NOT NULL.
--
-- Rollback:
--   DROP INDEX IF EXISTS public.idx_editorial_articles_auto_publish;
--   ALTER TABLE public.editorial_articles DROP COLUMN IF EXISTS fin_objection_at;
--
-- Semantics:
--   - Column is nullable; NULL means "Fin has not objected".
--   - Fin-only write path: app/api/admin/fin-objection/[id] (service_role
--     client + FIN_OBJECTION_EMAILS allowlist check — narrower than
--     ADMIN_EMAILS). No dedicated RLS change — the table's existing RLS
--     already restricts non-service-role write access, and the admin
--     route enforces identity at the HTTP layer.
--   - Agent #04 READS this column; must never write it (enforced via
--     spec forbidden-actions, not RLS).
--   - Partial index idx_editorial_articles_auto_publish targets the
--     auto-publish cron hot-path query:
--       WHERE status = 'review_passed' AND fin_objection_at IS NULL
--     with an additional review_passed_at time filter applied at query
--     time.

ALTER TABLE public.editorial_articles
  ADD COLUMN IF NOT EXISTS fin_objection_at timestamptz NULL;

CREATE INDEX IF NOT EXISTS idx_editorial_articles_auto_publish
  ON public.editorial_articles (status)
  WHERE status = 'review_passed' AND fin_objection_at IS NULL;
