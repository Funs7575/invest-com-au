-- ============================================================================
-- Migration: 20260316_add_email_capture_context.sql
-- Purpose: Add context JSONB column to email_captures for storing
--          calculator/quiz inputs alongside the email so nurture sequences
--          can personalise based on what the user was calculating.
-- Rollback: ALTER TABLE email_captures DROP COLUMN IF EXISTS context;
-- Risk: low — additive, single nullable JSONB column.
-- ============================================================================
--
-- Forward operations:
--   1. ALTER TABLE email_captures ADD COLUMN IF NOT EXISTS context JSONB;
--
-- Rollback (in reverse order):
--   1. ALTER TABLE email_captures DROP COLUMN IF EXISTS context;
--

ALTER TABLE email_captures ADD COLUMN IF NOT EXISTS context JSONB;
