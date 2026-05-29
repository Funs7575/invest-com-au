-- Wrap auth.uid()/auth.role()/auth.email() in (select …) inside RLS policies.
--
-- The Supabase performance advisor (lint 0003_auth_rls_initplan) flags 112
-- policy clauses across 64 policies that call auth.* per row. Postgres re-runs
-- a bare auth.uid() once for EVERY scanned row; wrapping it as (select auth.uid())
-- makes the planner hoist it to a single once-per-query InitPlan. This is a pure
-- performance optimisation — the returned value is identical, so access control
-- is UNCHANGED. It matters a lot once these user-data tables (holdings, goals,
-- watchlists, saved searches, comparisons, etc.) carry real per-user volume.
--
-- The statements below were generated FROM pg_policies (the live, authoritative
-- normalised policy definitions) with a single regexp_replace wrapping each bare
-- auth.* call — nothing else about each policy (roles, command, structure) is
-- changed. ALTER POLICY only rewrites USING / WITH CHECK, so it's atomic and
-- needs no DROP/CREATE window.
--
-- Forward-only. Re-running is harmless (re-sets the same expression), so no
-- IF-guard is needed. NOT auto-applied — apply via the normal migration path
-- (founder/CI on merge). Rollback is unnecessary (optimisation only); to revert,
-- re-run the ALTERs with the bare auth.*() form.

ALTER POLICY "account_deletion_requests_self_cancel" ON public.account_deletion_requests
  USING (((user_id = (select auth.uid())) AND (status = 'scheduled'::text)))
  WITH CHECK (((user_id = (select auth.uid())) AND (status = ANY (ARRAY['scheduled'::text, 'cancelled'::text]))));
ALTER POLICY "account_deletion_requests_self_insert" ON public.account_deletion_requests
  WITH CHECK ((user_id = (select auth.uid())));
ALTER POLICY "account_deletion_requests_self_read" ON public.account_deletion_requests
  USING ((user_id = (select auth.uid())));
ALTER POLICY "Authenticated owners update own outcome" ON public.brief_outcomes
  USING (((select auth.uid()) = auth_user_id))
  WITH CHECK (((select auth.uid()) = auth_user_id));
ALTER POLICY "brief owner deletes shortlist" ON public.brief_shortlists
  USING (((added_by_user_id = (select auth.uid())) OR (added_by_email = (select auth.email()))));
ALTER POLICY "brief owner inserts shortlist" ON public.brief_shortlists
  WITH CHECK (((added_by_user_id = (select auth.uid())) OR (added_by_email = (select auth.email()))));
ALTER POLICY "brief owner reads shortlist" ON public.brief_shortlists
  USING (((added_by_user_id = (select auth.uid())) OR (added_by_email = (select auth.email()))));
ALTER POLICY "business inserts own account" ON public.business_accounts
  WITH CHECK (((select auth.uid()) = auth_user_id));
ALTER POLICY "business reads own account" ON public.business_accounts
  USING (((select auth.uid()) = auth_user_id));
ALTER POLICY "business updates own account" ON public.business_accounts
  USING (((select auth.uid()) = auth_user_id))
  WITH CHECK (((select auth.uid()) = auth_user_id));
ALTER POLICY "data_export_requests_self_insert" ON public.data_export_requests
  WITH CHECK ((user_id = (select auth.uid())));
ALTER POLICY "data_export_requests_self_read" ON public.data_export_requests
  USING ((user_id = (select auth.uid())));
ALTER POLICY "Service role full access seat_requests" ON public.firm_seat_requests
  USING (((select auth.role()) = 'service_role'::text));
ALTER POLICY "Owners manage own plans" ON public.get_matched_action_plans
  USING ((auth_user_id = (select auth.uid())))
  WITH CHECK ((auth_user_id = (select auth.uid())));
ALTER POLICY "investor deletes own goals" ON public.investor_goals
  USING (((select auth.uid()) = auth_user_id));
ALTER POLICY "investor inserts own goals" ON public.investor_goals
  WITH CHECK (((select auth.uid()) = auth_user_id));
ALTER POLICY "investor reads own goals" ON public.investor_goals
  USING (((select auth.uid()) = auth_user_id));
ALTER POLICY "investor updates own goals" ON public.investor_goals
  USING (((select auth.uid()) = auth_user_id))
  WITH CHECK (((select auth.uid()) = auth_user_id));
ALTER POLICY "investor deletes own holdings" ON public.investor_holdings
  USING (((select auth.uid()) = auth_user_id));
ALTER POLICY "investor inserts own holdings" ON public.investor_holdings
  WITH CHECK (((select auth.uid()) = auth_user_id));
ALTER POLICY "investor reads own holdings" ON public.investor_holdings
  USING (((select auth.uid()) = auth_user_id));
ALTER POLICY "investor updates own holdings" ON public.investor_holdings
  USING (((select auth.uid()) = auth_user_id))
  WITH CHECK (((select auth.uid()) = auth_user_id));
ALTER POLICY "investor deletes own oauth connections" ON public.investor_oauth_connections
  USING (((select auth.uid()) = auth_user_id));
ALTER POLICY "investor inserts own oauth connections" ON public.investor_oauth_connections
  WITH CHECK (((select auth.uid()) = auth_user_id));
ALTER POLICY "investor reads own oauth connections" ON public.investor_oauth_connections
  USING (((select auth.uid()) = auth_user_id));
ALTER POLICY "investor updates own oauth connections" ON public.investor_oauth_connections
  USING (((select auth.uid()) = auth_user_id))
  WITH CHECK (((select auth.uid()) = auth_user_id));
ALTER POLICY "investor inserts own profile" ON public.investor_profiles
  WITH CHECK (((select auth.uid()) = auth_user_id));
ALTER POLICY "investor reads own profile" ON public.investor_profiles
  USING (((select auth.uid()) = auth_user_id));
ALTER POLICY "investor updates own profile" ON public.investor_profiles
  USING (((select auth.uid()) = auth_user_id))
  WITH CHECK (((select auth.uid()) = auth_user_id));
ALTER POLICY "own credits" ON public.investor_referral_credits
  USING ((auth_user_id = (select auth.uid())));
ALTER POLICY "own row" ON public.investor_referral_links
  USING ((auth_user_id = (select auth.uid())));
ALTER POLICY "listing_owner reads own account" ON public.listing_owner_accounts
  USING (((select auth.uid()) = auth_user_id));
ALTER POLICY "listing_owner updates own account" ON public.listing_owner_accounts
  USING (((select auth.uid()) = auth_user_id))
  WITH CHECK (((select auth.uid()) = auth_user_id));
ALTER POLICY "listing_owner upserts own account" ON public.listing_owner_accounts
  WITH CHECK (((select auth.uid()) = auth_user_id));
ALTER POLICY "owner reads own listings" ON public.listings
  USING ((owner_user_id = (select auth.uid())));
ALTER POLICY "owner updates own draft listings" ON public.listings
  USING (((owner_user_id = (select auth.uid())) AND (status = 'draft'::text)))
  WITH CHECK (((owner_user_id = (select auth.uid())) AND (status = 'draft'::text)));
ALTER POLICY "consumer sees own payments" ON public.marketplace_payments
  USING (((consumer_user_id = (select auth.uid())) OR (consumer_email = (select auth.email()))));
ALTER POLICY "Advisor can update own profile" ON public.professionals
  USING ((auth_user_id = (select auth.uid())))
  WITH CHECK ((auth_user_id = (select auth.uid())));
ALTER POLICY "Advisor can view own profile" ON public.professionals
  USING ((auth_user_id = (select auth.uid())));
ALTER POLICY "investor deletes own properties" ON public.property_holdings
  USING (((select auth.uid()) = auth_user_id));
ALTER POLICY "investor inserts own properties" ON public.property_holdings
  WITH CHECK (((select auth.uid()) = auth_user_id));
ALTER POLICY "investor reads own properties" ON public.property_holdings
  USING (((select auth.uid()) = auth_user_id));
ALTER POLICY "investor updates own properties" ON public.property_holdings
  USING (((select auth.uid()) = auth_user_id))
  WITH CHECK (((select auth.uid()) = auth_user_id));
ALTER POLICY "Service role all on referral_claims" ON public.referral_claims
  USING (((select auth.role()) = 'service_role'::text));
ALTER POLICY "User reads own referral claims" ON public.referral_claims
  USING ((claimant_user_id = (select auth.uid())));
ALTER POLICY "Service role all on referral_codes" ON public.referral_codes
  USING (((select auth.role()) = 'service_role'::text));
ALTER POLICY "User reads own referral code" ON public.referral_codes
  USING ((user_id = (select auth.uid())));
ALTER POLICY "users can manage own saved_searches" ON public.saved_searches
  USING ((user_id = (select auth.uid())))
  WITH CHECK ((user_id = (select auth.uid())));
ALTER POLICY "users can manage own calculator state" ON public.user_calculator_state
  USING ((user_id = (select auth.uid())))
  WITH CHECK ((user_id = (select auth.uid())));
ALTER POLICY "user_daily_checkins_own_insert" ON public.user_daily_checkins
  WITH CHECK (((select auth.uid()) = user_id));
ALTER POLICY "user_daily_checkins_own_read" ON public.user_daily_checkins
  USING (((select auth.uid()) = user_id));
ALTER POLICY "user_daily_checkins_own_update" ON public.user_daily_checkins
  USING (((select auth.uid()) = user_id))
  WITH CHECK (((select auth.uid()) = user_id));
ALTER POLICY "user_health_score_log_own_read" ON public.user_health_score_log
  USING (((select auth.uid()) = user_id));
ALTER POLICY "user_rate_memory_own" ON public.user_rate_memory
  USING (((select auth.uid()) = user_id))
  WITH CHECK (((select auth.uid()) = user_id));
ALTER POLICY "Users delete own comparisons" ON public.user_saved_comparisons
  USING (((select auth.uid()) = user_id));
ALTER POLICY "Users insert own comparisons" ON public.user_saved_comparisons
  WITH CHECK (((select auth.uid()) = user_id));
ALTER POLICY "Users read own comparisons" ON public.user_saved_comparisons
  USING (((select auth.uid()) = user_id));
ALTER POLICY "Users update own comparisons" ON public.user_saved_comparisons
  USING (((select auth.uid()) = user_id));
ALTER POLICY "Users delete own shortlist" ON public.user_shortlisted_brokers
  USING (((select auth.uid()) = user_id));
ALTER POLICY "Users insert own shortlist" ON public.user_shortlisted_brokers
  WITH CHECK (((select auth.uid()) = user_id));
ALTER POLICY "Users read own shortlist" ON public.user_shortlisted_brokers
  USING (((select auth.uid()) = user_id));
ALTER POLICY "users can manage own watchlist" ON public.user_watchlist_items
  USING ((user_id = (select auth.uid())))
  WITH CHECK ((user_id = (select auth.uid())));
ALTER POLICY "user reads own watchlist alert pref" ON public.watchlist_alert_preferences
  USING ((user_id = (select auth.uid())));
ALTER POLICY "user writes own watchlist alert pref" ON public.watchlist_alert_preferences
  USING ((user_id = (select auth.uid())))
  WITH CHECK ((user_id = (select auth.uid())));
