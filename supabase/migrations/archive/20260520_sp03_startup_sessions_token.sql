-- Migration: 20260520_sp03_startup_sessions_token.sql
-- Date: 2026-05-20
-- Audit ref: docs/audits/sp-startup-portal-brief.md
-- Queue item: SP-03
-- Why: SP-02 created startup_sessions without session_token. require-startup-session.ts
--      mirrors require-advisor-session.ts which uses a cookie-based session_token lookup
--      as a fallback path. Adding session_token here as a forward-only fix.
-- Idempotency: ADD COLUMN IF NOT EXISTS; DEFAULT '' allows reruns on empty table.
-- Rollback: ALTER TABLE public.startup_sessions DROP COLUMN IF EXISTS session_token;

BEGIN;

ALTER TABLE public.startup_sessions
  ADD COLUMN IF NOT EXISTS session_token text UNIQUE NOT NULL DEFAULT '';

COMMIT;
