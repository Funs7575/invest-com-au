-- ============================================================================
-- Migration: 20260801_nf20_sms_consent.sql
-- Date: 2026-08-01
-- Audit ref: docs/audits/2026-05-20-new-features-audit.md §5 #20
-- Queue item: NF-20 (Consent fixes — SMS/WhatsApp consent record)
-- Why: Australian Spam Act 2003 s.16 prohibits sending commercial electronic
--      messages (including SMS and WhatsApp) without prior, explicit consent.
--      The `leads` and `professional_leads` tables store user_phone but had no
--      consent field, so advisors had no legal signal before contacting leads
--      via SMS/WhatsApp.
-- Idempotent: ADD COLUMN IF NOT EXISTS — safe to re-run
-- Rollback:
--   ALTER TABLE leads DROP COLUMN IF EXISTS sms_consent;
--   ALTER TABLE professional_leads DROP COLUMN IF EXISTS sms_consent;
-- ============================================================================

BEGIN;

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS sms_consent BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE professional_leads
  ADD COLUMN IF NOT EXISTS sms_consent BOOLEAN NOT NULL DEFAULT FALSE;

COMMIT;
