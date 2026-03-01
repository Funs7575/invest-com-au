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
