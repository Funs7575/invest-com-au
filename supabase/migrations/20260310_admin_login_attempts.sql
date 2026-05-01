-- ============================================================================
-- Migration: 20260310_admin_login_attempts.sql
-- Purpose: Create the `admin_login_attempts` rate-limiting table (ip_hash
--          PK, count, reset_at), one index on reset_at for cleanup, and
--          enable RLS with NO policies (deny-all to anon/authenticated;
--          service_role bypasses RLS automatically). Replaces an
--          in-process Map that lost state across serverless invocations.
-- Rollback: DROP the index, DROP the table CASCADE. Live admin
--          rate-limit counters are wiped — operators get one fresh
--          window of brute-force allowance immediately after revert.
-- Risk: medium — admin login endpoints (`/api/admin/login` etc.) write
--       to this table on every attempt; dropping it produces runtime
--       errors until shipped admin auth code reverts to its in-memory
--       fallback, AND any in-flight brute-force protection state is
--       lost (briefly elevated risk window).
-- ============================================================================
--
-- Forward operations:
--   1. CREATE TABLE IF NOT EXISTS admin_login_attempts
--        (ip_hash TEXT PRIMARY KEY, count INT NOT NULL DEFAULT 1,
--         reset_at TIMESTAMPTZ NOT NULL).
--   2. CREATE INDEX idx_admin_login_attempts_reset_at
--        ON admin_login_attempts (reset_at).
--   3. ALTER TABLE admin_login_attempts ENABLE ROW LEVEL SECURITY.
--      -- No policies — deny all anon/authenticated; only service_role
--      -- (used by /api/admin/login server route) reads/writes.
--
-- Rollback (in reverse order):
--   -- Pre-step (operator): confirm shipped `/api/admin/login` no longer
--   -- reads/writes admin_login_attempts (or revert that code first),
--   -- otherwise the route 500s on every attempt.
--   3. (RLS toggle drops with the table.)
--   2. DROP INDEX IF EXISTS idx_admin_login_attempts_reset_at;
--   1. DROP TABLE IF EXISTS admin_login_attempts CASCADE;
--      -- Brief elevated risk window: in-flight rate-limit counters lost.
-- ============================================================================

-- Admin login rate limiting table (replaces in-memory Map)
CREATE TABLE IF NOT EXISTS admin_login_attempts (
  ip_hash TEXT PRIMARY KEY,
  count INT NOT NULL DEFAULT 1,
  reset_at TIMESTAMPTZ NOT NULL
);

-- Auto-cleanup: delete expired entries periodically
CREATE INDEX idx_admin_login_attempts_reset_at ON admin_login_attempts (reset_at);

-- RLS: only service role can access this table
ALTER TABLE admin_login_attempts ENABLE ROW LEVEL SECURITY;
-- No RLS policies = only service role key can read/write
