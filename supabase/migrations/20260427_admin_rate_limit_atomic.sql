-- Date: 2026-04-27
-- Audit: docs/audits/codebase-health-2026-04-24.md §7 (K-11)
-- Queue item: K-11
-- Why: /api/admin/login's checkRateLimit had a SELECT → upsert/UPDATE
--   sequence with a TOCTOU race: two concurrent requests for the same IP
--   could both read count=N, both compute newCount=N+1, and both write
--   newCount — losing one increment. In the extreme case, two simultaneous
--   first-attempts both upsert count=1 and both get "4 remaining" when only
--   1 combined attempt should have been recorded against the budget.
--   A UNIQUE constraint on ip_hash would not fix this — ip_hash is already
--   TEXT PRIMARY KEY (unique by definition). The real fix is moving the
--   counter increment into a single atomic INSERT ... ON CONFLICT DO UPDATE
--   executed in one round-trip, closing the race window entirely.
-- Idempotency: CREATE OR REPLACE FUNCTION is idempotent. Safe to re-apply.
-- Rollback: DROP FUNCTION IF EXISTS public.admin_rate_limit_increment(text, bigint);
--   The caller logs a warning and fails-open (doesn't block admin logins) if
--   the function is absent, so reversion is safe without a deploy.

-- IMPORTANT — prior policy state on admin_login_attempts:
--   • RLS enabled: 20260310_admin_login_attempts.sql line 12
--   • Policy "Service role only on admin_login_attempts" ON ALL USING (false):
--     20260310_fix_security_advisories.sql lines 14-17
--   This function runs SECURITY DEFINER (as the migration owner / postgres
--   role), which bypasses RLS. GRANT EXECUTE is restricted to service_role
--   only, consistent with the deny-all policy intent.
--   No new policies are added — the function is the single access path.

CREATE OR REPLACE FUNCTION public.admin_rate_limit_increment(
  p_ip_hash          TEXT,
  p_initial_window_ms BIGINT DEFAULT 60000
)
RETURNS TABLE(attempt_count INT, reset_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  -- Single atomic statement: insert a new row (count=1, fresh window) or
  -- increment an existing active row's count by 1.
  -- If the row's reset_at is already in the past the window has expired;
  -- treat it as a fresh start (count=1) with a new window — same semantics
  -- as the old TypeScript SELECT branch.
  -- The caller is responsible for the backoff-extension UPDATE (non-atomic
  -- but benign: concurrent extensions write the same monotonic value).
  INSERT INTO public.admin_login_attempts (ip_hash, count, reset_at)
    VALUES (
      p_ip_hash,
      1,
      NOW() + (p_initial_window_ms || ' milliseconds')::INTERVAL
    )
  ON CONFLICT (ip_hash) DO UPDATE
    SET count    = CASE
                     WHEN public.admin_login_attempts.reset_at < NOW()
                       THEN 1                                     -- expired → restart
                     ELSE public.admin_login_attempts.count + 1  -- active  → increment
                   END,
        reset_at = CASE
                     WHEN public.admin_login_attempts.reset_at < NOW()
                       THEN NOW() + (p_initial_window_ms || ' milliseconds')::INTERVAL
                     ELSE public.admin_login_attempts.reset_at   -- caller extends for backoff
                   END
  RETURNING public.admin_login_attempts.count,
            public.admin_login_attempts.reset_at;
END;
$$;

-- Restrict to service_role only (matches the table's "deny-all" RLS policy).
REVOKE EXECUTE ON FUNCTION public.admin_rate_limit_increment(TEXT, BIGINT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.admin_rate_limit_increment(TEXT, BIGINT) TO service_role;
