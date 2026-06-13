-- 20260613113000_backfill_professionals_auth_user_id.sql
--
-- Backfill professionals.auth_user_id by verified-email match against auth.users.
--
-- WHY
--   Professional rows created through the application/approval flow
--   (/advisor-apply, admin approval, legacy imports) were never linked to a
--   Supabase auth user — auth_user_id IS NULL. The portal gate
--   (enforcePortalKind) and the account_kind_membership view both key off
--   auth_user_id, so these professionals authenticate yet appear to hold zero
--   workspace kinds and are bounced out of /advisor-portal. As of 2026-06,
--   ~177 of 180 active advisors (98%) were unlinked.
--
--   The application now self-heals this link on login
--   (lib/professional-auth-link.ts, called from the auth callback and the
--   portal gate). This one-shot backfill additionally links every professional
--   who ALREADY has a matching Supabase auth user, so they are unblocked
--   immediately without having to trigger a fresh login.
--
-- SAFETY
--   * Only fills a NULL auth_user_id — never re-points an existing link, so it
--     cannot transfer one professional's identity onto another account.
--   * Links only when the email maps to exactly ONE auth user, and only when
--     that auth user is not already linked to another professional, respecting
--     the partial unique index professionals_auth_user_id_unique.
--   * Case-insensitive email match (auth emails are normalised to lower case).
--   * Pure DML, no schema change; RLS unaffected.
--
-- IDEMPOTENT
--   The `auth_user_id IS NULL` predicate makes re-runs no-ops.
--
-- ROLLBACK
--   No automatic rollback (the link is corrective). To undo a specific link,
--   set that row's auth_user_id back to NULL by id:
--     UPDATE public.professionals SET auth_user_id = NULL WHERE id = <id>;

UPDATE public.professionals AS p
SET auth_user_id = u.id
FROM auth.users AS u
WHERE p.auth_user_id IS NULL
  AND p.status IN ('active', 'pending')
  AND p.email IS NOT NULL
  AND lower(u.email) = lower(p.email)
  -- the email must resolve to exactly one auth user
  AND (
    SELECT count(*) FROM auth.users u2 WHERE lower(u2.email) = lower(p.email)
  ) = 1
  -- and that auth user must not already be linked to another professional
  AND NOT EXISTS (
    SELECT 1 FROM public.professionals x WHERE x.auth_user_id = u.id
  );
