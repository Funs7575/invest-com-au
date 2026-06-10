-- ============================================================
-- FF-01: Seed missing feature flags
--
-- Date: 2026-05-09
-- Audit ref: codebase-health-2026-04-24.md §FF-01
-- Queue item: FF-01 (feature-flag audit stream)
-- Why: Eight feature flags are referenced in deployed route handlers
--      and lib helpers via isFlagEnabled() / loadFlag(), but have no
--      row in the feature_flags table. evaluateFlag() returns false for
--      a missing row, so these features are effectively hard-OFF in
--      production even though the code intends them to be controllable
--      kill switches. Affected live surfaces include: AI chat/concierge,
--      advisor enquiry intake, listings checkout, listings enquire,
--      abandoned-shortlist email drip, and three UI elements
--      (report button, exit-intent modal, sponsored boosting).
-- Idempotency: INSERT ... ON CONFLICT (flag_key) DO NOTHING —
--              re-applying this migration is a safe no-op. Existing
--              rows are never overwritten, so any admin-toggled state
--              is preserved on re-run.
-- Rollback:
--   DELETE FROM public.feature_flags
--     WHERE flag_key IN (
--       'ai_generation', 'advisor_enquiry_intake', 'email_drip_send',
--       'stripe_checkout', 'listing_enquiry_intake', 'report_button',
--       'newsletter_exit_intent', 'sponsored_boosting'
--     )
--     AND updated_by IS NULL; -- only delete the seeded rows, not hand-edited ones
--
-- IMPORTANT — stale flags not touched by this migration:
--   advisor_self_service_upgrade, churn_survey_required, semantic_search_ui,
--   exit_intent_modal, abandoned_form_drip — these exist in the DB but are
--   not referenced by isFlagEnabled(). Left for human review; safe to archive
--   or delete once confirmed unused.
-- ============================================================

BEGIN;

INSERT INTO public.feature_flags
  (flag_key, description, enabled, rollout_pct, allowlist, denylist, segments)
VALUES
  -- Launch-ops kill switches: enabled=true / rollout_pct=100 means "fully on".
  -- Flip enabled=false in the admin flag panel (/admin/automation/flags) to halt
  -- the feature during an incident without a code deploy.

  ('ai_generation',
   'AI generation endpoints (admin AI chat + /api/concierge). Kill switch for AI capacity incidents.',
   true, 100, '{}', '{}', '{}'),

  ('advisor_enquiry_intake',
   'Advisor enquiry form intake (/api/advisor-enquiry). Kill switch if advisor mailboxes are overloaded.',
   true, 100, '{}', '{}', '{}'),

  ('email_drip_send',
   'Abandoned-shortlist email drip cron. Kill switch to halt outbound drip without touching cron schedule.',
   true, 100, '{}', '{}', '{}'),

  ('stripe_checkout',
   'Listings Stripe checkout (/api/listings/checkout). Kill switch for payment-processor incidents.',
   true, 100, '{}', '{}', '{}'),

  ('listing_enquiry_intake',
   'Listing enquiry form intake (/api/listings/enquire). Kill switch if listing enquiry volume spikes.',
   true, 100, '{}', '{}', '{}'),

  ('report_button',
   'Report-a-listing button in site header (layout.tsx). Show/hide without a deploy.',
   true, 100, '{}', '{}', '{}'),

  ('newsletter_exit_intent',
   'Newsletter exit-intent modal in site layout. Toggle visibility without a deploy.',
   true, 100, '{}', '{}', '{}'),

  ('sponsored_boosting',
   'Sponsored broker boosting in ranking (lib/sponsorship.ts). Kill switch if sponsorship logic needs disabling.',
   true, 100, '{}', '{}', '{}')

ON CONFLICT (flag_key) DO NOTHING;

COMMIT;
