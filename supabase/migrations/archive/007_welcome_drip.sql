-- ============================================================================
-- Migration: 007_welcome_drip.sql
-- Purpose: Expand broker_notifications.type CHECK constraint to allow
--          welcome-drip types (welcome_drip_1..4) and 4 previously-used
--          types referenced from cron routes (budget_pacing, anomaly,
--          recommendation, re_engagement) that were missing from the
--          original 8-value constraint.
-- Rollback: Drop the 16-value constraint and recreate the original
--          8-value one — only if no rows reference the 8 newly-allowed
--          values.
-- Risk: medium — reverse fails if any broker_notifications row uses one
--       of the 8 new types; admin must DELETE / UPDATE those rows first.
-- ============================================================================
--
-- Forward operations:
--   1. ALTER TABLE broker_notifications DROP CONSTRAINT IF EXISTS
--      broker_notifications_type_check.
--   2. ALTER TABLE broker_notifications ADD CONSTRAINT
--      broker_notifications_type_check CHECK (type IN ( ... 16 values ... )).
--
-- Rollback (in reverse order):
--   -- Pre-step (operator): clear or remap rows using new types, e.g.:
--   --   DELETE FROM broker_notifications
--   --   WHERE type IN ('budget_pacing','anomaly','recommendation',
--   --                  're_engagement','welcome_drip_1','welcome_drip_2',
--   --                  'welcome_drip_3','welcome_drip_4');
--   2. ALTER TABLE broker_notifications DROP CONSTRAINT IF EXISTS
--        broker_notifications_type_check;
--   1. ALTER TABLE broker_notifications ADD CONSTRAINT
--        broker_notifications_type_check
--        CHECK (type IN (
--          'low_balance',
--          'campaign_approved',
--          'campaign_rejected',
--          'campaign_paused',
--          'budget_exhausted',
--          'payment_received',
--          'system',
--          'support_reply'
--        ));
--      -- The reverse ADD CONSTRAINT validates existing rows; will FAIL
--      -- with check_constraint_violation if any row still uses one of
--      -- the 8 new values.
-- ============================================================================

-- Allow welcome drip notification types in broker_notifications.
-- Also adds previously used types (budget_pacing, anomaly, recommendation, re_engagement)
-- that were referenced in cron routes but missing from the original constraint.

ALTER TABLE broker_notifications DROP CONSTRAINT IF EXISTS broker_notifications_type_check;

ALTER TABLE broker_notifications ADD CONSTRAINT broker_notifications_type_check
  CHECK (type IN (
    -- Original types (migration 003)
    'low_balance',
    'campaign_approved',
    'campaign_rejected',
    'campaign_paused',
    'budget_exhausted',
    'payment_received',
    'system',
    'support_reply',
    -- Added by marketplace-stats cron (previously unconstrained)
    'budget_pacing',
    'anomaly',
    'recommendation',
    're_engagement',
    -- Welcome drip series (this migration)
    'welcome_drip_1',
    'welcome_drip_2',
    'welcome_drip_3',
    'welcome_drip_4'
  ));
