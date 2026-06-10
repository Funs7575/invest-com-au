-- ============================================================
-- O-01 iter 9 — RLS policy catchup for all remaining zero-policy tables
--
-- Date: 2026-05-07
-- Audit ref: codebase-health-2026-04-24.md §4.2 (rls_enabled_no_policy)
-- Queue item: O-01 (iter 9 of ~9)
-- PR: #(to be assigned)
--
-- Why: 57 public tables had RLS enabled (blocking anon + auth access
-- by default) but zero policies defined. Iters 1–8 wrote policy SQL
-- to the repo but iters 1–4 and 8 were never applied to the live DB
-- via apply_migration. This migration closes the gap in one idempotent
-- pass, covering all 57 tables: 5 with auth.uid()-scoped policies
-- (user-data) and 52 service-role-only (internal/admin/analytics).
--
-- Idempotency: every CREATE POLICY is preceded by DROP POLICY IF
-- EXISTS — safe to re-run. auth.uid() wrapped in (SELECT auth.uid())
-- per audit finding F-4.5.3 (auth_rls_initplan).
--
-- Rollback: for each table, DROP POLICY "service_role full access".
-- User-data tables would revert to deny-all (current callers use
-- admin client so zero behaviour change; future user-cookie callers
-- would break until rollback is reverted).
--
-- After this migration: SELECT COUNT(*) FROM pg_tables t
-- LEFT JOIN pg_policies p ON p.tablename = t.tablename AND p.schemaname = 'public'
-- WHERE t.schemaname = 'public' AND t.rowsecurity = true
-- GROUP BY t.tablename HAVING COUNT(p.policyname) = 0
-- → should return 0 rows.
-- ============================================================

BEGIN;

-- ============================================================
-- PART A: User-data tables — auth.uid()-scoped policies
-- These tables carry per-user data and get both a service_role
-- bypass (explicit, for auditability) and auth.uid()-scoped
-- policies for future user-cookie-client callers.
-- ============================================================

-- user_notifications: per-user inbox (read/update/delete own rows)
DROP POLICY IF EXISTS "service_role full access" ON public.user_notifications;
CREATE POLICY "service_role full access" ON public.user_notifications
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "owner can read" ON public.user_notifications;
CREATE POLICY "owner can read" ON public.user_notifications
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "owner can update" ON public.user_notifications;
CREATE POLICY "owner can update" ON public.user_notifications
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "owner can delete" ON public.user_notifications;
CREATE POLICY "owner can delete" ON public.user_notifications
  FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

-- user_bookmarks: per-user saved items (full CRUD scoped to owner)
DROP POLICY IF EXISTS "service_role full access" ON public.user_bookmarks;
CREATE POLICY "service_role full access" ON public.user_bookmarks
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "owner can read" ON public.user_bookmarks;
CREATE POLICY "owner can read" ON public.user_bookmarks
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "owner can insert" ON public.user_bookmarks;
CREATE POLICY "owner can insert" ON public.user_bookmarks
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "owner can update" ON public.user_bookmarks;
CREATE POLICY "owner can update" ON public.user_bookmarks
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "owner can delete" ON public.user_bookmarks;
CREATE POLICY "owner can delete" ON public.user_bookmarks
  FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

-- user_quiz_history: per-user quiz answers (anon session_id rows
-- stay service-role; only auth.uid()-linked rows get user policy)
DROP POLICY IF EXISTS "service_role full access" ON public.user_quiz_history;
CREATE POLICY "service_role full access" ON public.user_quiz_history
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "owner can read" ON public.user_quiz_history;
CREATE POLICY "owner can read" ON public.user_quiz_history
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "owner can insert" ON public.user_quiz_history;
CREATE POLICY "owner can insert" ON public.user_quiz_history
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);

-- ============================================================
-- PART B: Article engagement — nuanced policies
-- author_email PII on article_comments means no auth SELECT;
-- reads go through admin-mediated API. article_reactions counts
-- are aggregated server-side; per-row SELECT not exposed.
-- ============================================================

-- article_comments: author-scoped UPDATE/DELETE only
-- (no authenticated SELECT — author_email PII risk)
DROP POLICY IF EXISTS "service_role full access" ON public.article_comments;
CREATE POLICY "service_role full access" ON public.article_comments
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "author can update" ON public.article_comments;
CREATE POLICY "author can update" ON public.article_comments
  FOR UPDATE TO authenticated
  USING (author_id IS NOT NULL AND author_id = (SELECT auth.uid()))
  WITH CHECK (author_id IS NOT NULL AND author_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS "author can delete" ON public.article_comments;
CREATE POLICY "author can delete" ON public.article_comments
  FOR DELETE TO authenticated
  USING (author_id IS NOT NULL AND author_id = (SELECT auth.uid()));

-- article_reactions: owner INSERT/DELETE (no auth SELECT —
-- per-user reaction history stays private; aggregates are API-served)
DROP POLICY IF EXISTS "service_role full access" ON public.article_reactions;
CREATE POLICY "service_role full access" ON public.article_reactions
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "owner can insert" ON public.article_reactions;
CREATE POLICY "owner can insert" ON public.article_reactions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()) AND ip_hash IS NULL);
DROP POLICY IF EXISTS "owner can delete" ON public.article_reactions;
CREATE POLICY "owner can delete" ON public.article_reactions
  FOR DELETE TO authenticated USING (user_id = (SELECT auth.uid()));

-- ============================================================
-- PART C: Service-role-only tables
-- All remaining 52 tables are internal/admin/analytics tables
-- with no auth.uid() linkage. Deny all non-service-role access
-- explicitly; service_role bypass is documented via policy name.
-- Covers: admin/audit, observability, analytics, email-based
-- subscriber tables, advisor PII, and config tables.
-- ============================================================

DROP POLICY IF EXISTS "service_role full access" ON public.admin_action_log;
CREATE POLICY "service_role full access" ON public.admin_action_log
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role full access" ON public.admin_mfa_enrollments;
CREATE POLICY "service_role full access" ON public.admin_mfa_enrollments
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- advisor PII — booking details + KYC docs; no public access path
DROP POLICY IF EXISTS "service_role full access" ON public.advisor_booking_appointments;
CREATE POLICY "service_role full access" ON public.advisor_booking_appointments
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role full access" ON public.advisor_kyc_documents;
CREATE POLICY "service_role full access" ON public.advisor_kyc_documents
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- anonymous_saves: session-keyed, no stable auth.uid() linkage
DROP POLICY IF EXISTS "service_role full access" ON public.anonymous_saves;
CREATE POLICY "service_role full access" ON public.anonymous_saves
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role full access" ON public.article_preview_tokens;
CREATE POLICY "service_role full access" ON public.article_preview_tokens
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role full access" ON public.article_quality_scores;
CREATE POLICY "service_role full access" ON public.article_quality_scores
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role full access" ON public.article_scorecard_runs;
CREATE POLICY "service_role full access" ON public.article_scorecard_runs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role full access" ON public.article_templates;
CREATE POLICY "service_role full access" ON public.article_templates
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role full access" ON public.attribution_touches;
CREATE POLICY "service_role full access" ON public.attribution_touches
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role full access" ON public.automation_kill_switches;
CREATE POLICY "service_role full access" ON public.automation_kill_switches
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role full access" ON public.automation_verdict_daily;
CREATE POLICY "service_role full access" ON public.automation_verdict_daily
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role full access" ON public.broker_outreach_log;
CREATE POLICY "service_role full access" ON public.broker_outreach_log
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role full access" ON public.broker_price_snapshots;
CREATE POLICY "service_role full access" ON public.broker_price_snapshots
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role full access" ON public.churn_scores;
CREATE POLICY "service_role full access" ON public.churn_scores
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- churn_surveys: subscriber_email only; no auth.uid() linkage
DROP POLICY IF EXISTS "service_role full access" ON public.churn_surveys;
CREATE POLICY "service_role full access" ON public.churn_surveys
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role full access" ON public.classifier_config;
CREATE POLICY "service_role full access" ON public.classifier_config
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- complaints_register: legal/compliance records; admin-only
DROP POLICY IF EXISTS "service_role full access" ON public.complaints_register;
CREATE POLICY "service_role full access" ON public.complaints_register
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role full access" ON public.cron_run_log;
CREATE POLICY "service_role full access" ON public.cron_run_log
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role full access" ON public.data_integrity_issues;
CREATE POLICY "service_role full access" ON public.data_integrity_issues
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role full access" ON public.dynamic_pricing_rules;
CREATE POLICY "service_role full access" ON public.dynamic_pricing_rules
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role full access" ON public.email_suppression_list;
CREATE POLICY "service_role full access" ON public.email_suppression_list
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- feature_flags: service_role-only per CLAUDE.md admin-client scope
DROP POLICY IF EXISTS "service_role full access" ON public.feature_flags;
CREATE POLICY "service_role full access" ON public.feature_flags
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- financial_audit_log: compliance; deny all non-service-role
DROP POLICY IF EXISTS "service_role full access" ON public.financial_audit_log;
CREATE POLICY "service_role full access" ON public.financial_audit_log
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role full access" ON public.financial_periods;
CREATE POLICY "service_role full access" ON public.financial_periods
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role full access" ON public.form_events;
CREATE POLICY "service_role full access" ON public.form_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role full access" ON public.fraud_signals;
CREATE POLICY "service_role full access" ON public.fraud_signals
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role full access" ON public.i18n_currency_rates;
CREATE POLICY "service_role full access" ON public.i18n_currency_rates
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role full access" ON public.job_queue;
CREATE POLICY "service_role full access" ON public.job_queue
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role full access" ON public.lead_quality_weights;
CREATE POLICY "service_role full access" ON public.lead_quality_weights
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- login_attempts: security data; admin-only read
DROP POLICY IF EXISTS "service_role full access" ON public.login_attempts;
CREATE POLICY "service_role full access" ON public.login_attempts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- newsletter_segments: admin-managed; no subscriber auth.uid() linkage
DROP POLICY IF EXISTS "service_role full access" ON public.newsletter_segments;
CREATE POLICY "service_role full access" ON public.newsletter_segments
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- newsletter_subscriptions: email-keyed (no auth.uid()); admin-managed
DROP POLICY IF EXISTS "service_role full access" ON public.newsletter_subscriptions;
CREATE POLICY "service_role full access" ON public.newsletter_subscriptions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- nps_responses: session/ip_hash keyed; no auth.uid() linkage
DROP POLICY IF EXISTS "service_role full access" ON public.nps_responses;
CREATE POLICY "service_role full access" ON public.nps_responses
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role full access" ON public.photo_moderation_log;
CREATE POLICY "service_role full access" ON public.photo_moderation_log
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- privacy_data_requests: email + verification_token keyed; no auth.uid()
DROP POLICY IF EXISTS "service_role full access" ON public.privacy_data_requests;
CREATE POLICY "service_role full access" ON public.privacy_data_requests
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role full access" ON public.property_suburb_refresh_log;
CREATE POLICY "service_role full access" ON public.property_suburb_refresh_log
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- rate_limit_buckets: internal rate-limiting state; service-role only
DROP POLICY IF EXISTS "service_role full access" ON public.rate_limit_buckets;
CREATE POLICY "service_role full access" ON public.rate_limit_buckets
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- referral_rewards: referrer/referred email-keyed; no auth.uid()
DROP POLICY IF EXISTS "service_role full access" ON public.referral_rewards;
CREATE POLICY "service_role full access" ON public.referral_rewards
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role full access" ON public.retention_rules;
CREATE POLICY "service_role full access" ON public.retention_rules
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role full access" ON public.revenue_attribution_daily;
CREATE POLICY "service_role full access" ON public.revenue_attribution_daily
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role full access" ON public.revenue_reconciliation_runs;
CREATE POLICY "service_role full access" ON public.revenue_reconciliation_runs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role full access" ON public.review_sentiment_facets;
CREATE POLICY "service_role full access" ON public.review_sentiment_facets
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- search_embeddings: vector data; service-role-only per CLAUDE.md scope
DROP POLICY IF EXISTS "service_role full access" ON public.search_embeddings;
CREATE POLICY "service_role full access" ON public.search_embeddings
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role full access" ON public.search_queries;
CREATE POLICY "service_role full access" ON public.search_queries
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role full access" ON public.slo_definitions;
CREATE POLICY "service_role full access" ON public.slo_definitions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role full access" ON public.slo_incidents;
CREATE POLICY "service_role full access" ON public.slo_incidents
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role full access" ON public.sponsored_placements;
CREATE POLICY "service_role full access" ON public.sponsored_placements
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- tmds: internal document management; admin-only
DROP POLICY IF EXISTS "service_role full access" ON public.tmds;
CREATE POLICY "service_role full access" ON public.tmds
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role full access" ON public.warehouse_daily_facts;
CREATE POLICY "service_role full access" ON public.warehouse_daily_facts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role full access" ON public.web_vitals_daily_rollup;
CREATE POLICY "service_role full access" ON public.web_vitals_daily_rollup
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- web_vitals_samples: service_role-only per CLAUDE.md admin-client scope
DROP POLICY IF EXISTS "service_role full access" ON public.web_vitals_samples;
CREATE POLICY "service_role full access" ON public.web_vitals_samples
  FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMIT;
