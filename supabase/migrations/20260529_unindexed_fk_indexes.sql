-- Add covering indexes for 37 foreign keys flagged by the Supabase performance
-- advisor (lint 0001_unindexed_foreign_keys). An FK with no covering index makes
-- joins and ON DELETE/UPDATE cascades scan the child table; the cost grows with
-- row count. All these tables are near-empty today (pre-launch) so this is cheap
-- to apply now and prevents the dip as the marketplace fills.
--
-- Forward-only. Idempotent (IF NOT EXISTS). Plain CREATE INDEX (not CONCURRENTLY)
-- so it runs inside the migration transaction; tables are tiny today. NOT
-- auto-applied — apply via the normal migration path (founder/CI on merge).
--
-- Rollback strategy (forward-only prod): a new migration with
--   DROP INDEX IF EXISTS public.<each idx_*>;

CREATE INDEX IF NOT EXISTS idx_advisor_auctions_listing_id
  ON public.advisor_auctions (listing_id);
CREATE INDEX IF NOT EXISTS idx_advisor_auctions_referrer_advisor_id
  ON public.advisor_auctions (referrer_advisor_id);
CREATE INDEX IF NOT EXISTS idx_advisor_auctions_target_firm_id
  ON public.advisor_auctions (target_firm_id);
CREATE INDEX IF NOT EXISTS idx_advisor_auctions_target_professional_id
  ON public.advisor_auctions (target_professional_id);
CREATE INDEX IF NOT EXISTS idx_brief_dispute_messages_sender_user_id
  ON public.brief_dispute_messages (sender_user_id);
CREATE INDEX IF NOT EXISTS idx_brief_disputes_opened_by_user_id
  ON public.brief_disputes (opened_by_user_id);
CREATE INDEX IF NOT EXISTS idx_brief_disputes_resolved_by_user_id
  ON public.brief_disputes (resolved_by_user_id);
CREATE INDEX IF NOT EXISTS idx_brief_messages_sender_professional_id
  ON public.brief_messages (sender_professional_id);
CREATE INDEX IF NOT EXISTS idx_brief_messages_sender_team_id
  ON public.brief_messages (sender_team_id);
CREATE INDEX IF NOT EXISTS idx_brief_messages_sender_user_id
  ON public.brief_messages (sender_user_id);
CREATE INDEX IF NOT EXISTS idx_brief_outcomes_auth_user_id
  ON public.brief_outcomes (auth_user_id);
CREATE INDEX IF NOT EXISTS idx_broker_signups_broker_id
  ON public.broker_signups (broker_id);
CREATE INDEX IF NOT EXISTS idx_expert_team_invitations_invited_by
  ON public.expert_team_invitations (invited_by);
CREATE INDEX IF NOT EXISTS idx_expert_team_invitations_invited_professional_id
  ON public.expert_team_invitations (invited_professional_id);
CREATE INDEX IF NOT EXISTS idx_expert_teams_firm_id
  ON public.expert_teams (firm_id);
CREATE INDEX IF NOT EXISTS idx_expert_teams_lead_professional_id
  ON public.expert_teams (lead_professional_id);
CREATE INDEX IF NOT EXISTS idx_firm_seat_requests_requested_by
  ON public.firm_seat_requests (requested_by);
CREATE INDEX IF NOT EXISTS idx_get_matched_action_plans_converted_brief_id
  ON public.get_matched_action_plans (converted_brief_id);
CREATE INDEX IF NOT EXISTS idx_get_matched_action_plans_intent_slug
  ON public.get_matched_action_plans (intent_slug);
CREATE INDEX IF NOT EXISTS idx_investor_referral_credits_attributed_user_id
  ON public.investor_referral_credits (attributed_user_id);
CREATE INDEX IF NOT EXISTS idx_listing_advisor_opt_ins_lead_id
  ON public.listing_advisor_opt_ins (lead_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_payments_consumer_user_id
  ON public.marketplace_payments (consumer_user_id);
CREATE INDEX IF NOT EXISTS idx_price_drop_notifications_subscription_id
  ON public.price_drop_notifications (subscription_id);
CREATE INDEX IF NOT EXISTS idx_pro_affiliate_credits_attributed_brief_id
  ON public.pro_affiliate_credits (attributed_brief_id);
CREATE INDEX IF NOT EXISTS idx_pro_affiliate_credits_attributed_user_id
  ON public.pro_affiliate_credits (attributed_user_id);
CREATE INDEX IF NOT EXISTS idx_pro_intake_answers_question_id
  ON public.pro_intake_answers (question_id);
CREATE INDEX IF NOT EXISTS idx_quote_qa_advisor_id
  ON public.quote_qa (advisor_id);
CREATE INDEX IF NOT EXISTS idx_quote_qa_parent_id
  ON public.quote_qa (parent_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_professional_id
  ON public.referral_codes (professional_id);
CREATE INDEX IF NOT EXISTS idx_tax_nurture_sends_auth_user_id
  ON public.tax_nurture_sends (auth_user_id);
CREATE INDEX IF NOT EXISTS idx_team_brief_assignments_professional_id
  ON public.team_brief_assignments (professional_id);
CREATE INDEX IF NOT EXISTS idx_team_brief_decisions_brief_id
  ON public.team_brief_decisions (brief_id);
CREATE INDEX IF NOT EXISTS idx_team_brief_decisions_decided_by_professional_id
  ON public.team_brief_decisions (decided_by_professional_id);
CREATE INDEX IF NOT EXISTS idx_team_brief_referrals_from_professional_id
  ON public.team_brief_referrals (from_professional_id);
CREATE INDEX IF NOT EXISTS idx_team_brief_referrals_responded_by_professional_id
  ON public.team_brief_referrals (responded_by_professional_id);
CREATE INDEX IF NOT EXISTS idx_team_fixed_quotes_issued_by_professional_id
  ON public.team_fixed_quotes (issued_by_professional_id);
CREATE INDEX IF NOT EXISTS idx_team_fixed_quotes_team_id
  ON public.team_fixed_quotes (team_id);
