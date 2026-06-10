-- Migration: 20260602_seed_slo_definitions.sql
--
-- Seeds slo_definitions with the launch SLOs defined in L-06.
-- The slo_definitions table was created in 20260415_wave_7_trust_ops.sql.
--
-- Rollback: DELETE FROM public.slo_definitions WHERE name IN (
--   'lead_delivery_p95_ms', 'advisor_onboarding_p95_ms',
--   'webhook_delivery_p95_ms', 'api_success_rate',
--   'cron_heartbeat_success_rate', 'lead_queue_age_minutes',
--   'webhook_retry_queue_age_minutes', 'api_error_rate'
-- );
--
-- Idempotent: ON CONFLICT (name) DO UPDATE so re-running the migration
-- refreshes targets without duplicating rows.

INSERT INTO public.slo_definitions
  (name, service, metric, target, comparator, window_minutes, evaluation_source, enabled)
VALUES
  -- Lead delivery time: from submission to advisor notification p95 ≤ 5 minutes.
  -- Evaluated via cron_run_log for the confirm-lead-notify cron.
  (
    'lead_delivery_p95_ms',
    'cron',
    'p95_latency_ms',
    300000,
    '<=',
    60,
    '{"cron": "confirm-lead-notify", "description": "time from lead submission to advisor notification email dispatched"}'::jsonb,
    true
  ),

  -- Advisor onboarding pipeline: time from signup to onboarding cron completing p95 ≤ 1 hour.
  -- Evaluates the advisor-onboarding cron execution duration.
  (
    'advisor_onboarding_p95_ms',
    'cron',
    'p95_latency_ms',
    3600000,
    '<=',
    1440,
    '{"cron": "advisor-onboarding", "description": "time for advisor onboarding email sequence to complete after signup"}'::jsonb,
    true
  ),

  -- Stripe webhook processing: from event received to idempotency row marked done p95 ≤ 10 minutes.
  (
    'webhook_delivery_p95_ms',
    'webhook',
    'p95_latency_ms',
    600000,
    '<=',
    60,
    '{"table": "stripe_webhook_idempotency", "description": "time from webhook receipt to final processing status"}'::jsonb,
    true
  ),

  -- API success rate: ≥ 99.5% of requests return non-5xx over a rolling 60-minute window.
  (
    'api_success_rate',
    'api',
    'success_rate',
    0.995,
    '>=',
    60,
    '{"description": "fraction of HTTP requests returning non-5xx status codes"}'::jsonb,
    true
  ),

  -- Heartbeat cron success rate: ≥ 99% of heartbeat runs succeed (cron_run_log status=success).
  (
    'cron_heartbeat_success_rate',
    'cron',
    'success_rate',
    0.990,
    '>=',
    120,
    '{"cron": "heartbeat", "description": "fraction of heartbeat cron runs with status=success in cron_run_log"}'::jsonb,
    true
  ),

  -- Lead notification queue age: oldest unprocessed lead notification ≤ 15 minutes.
  -- Prevents a stale job_queue from silently delaying leads.
  (
    'lead_queue_age_minutes',
    'cron',
    'queue_age_minutes',
    15,
    '<=',
    60,
    '{"table": "job_queue", "type": "send_lead_notification", "description": "age of oldest unprocessed lead notification job"}'::jsonb,
    true
  ),

  -- Stripe webhook retry queue age: oldest retry ≤ 30 minutes to keep webhook lag bounded.
  (
    'webhook_retry_queue_age_minutes',
    'webhook',
    'queue_age_minutes',
    30,
    '<=',
    60,
    '{"table": "job_queue", "type": "stripe_webhook_retry", "description": "age of oldest pending stripe webhook retry job"}'::jsonb,
    true
  ),

  -- API error rate: < 1% of requests return 5xx over a rolling 60-minute window.
  (
    'api_error_rate',
    'api',
    'error_rate',
    0.010,
    '<=',
    60,
    '{"description": "fraction of HTTP requests returning 5xx status codes"}'::jsonb,
    true
  )

ON CONFLICT (name) DO UPDATE SET
  service            = EXCLUDED.service,
  metric             = EXCLUDED.metric,
  target             = EXCLUDED.target,
  comparator         = EXCLUDED.comparator,
  window_minutes     = EXCLUDED.window_minutes,
  evaluation_source  = EXCLUDED.evaluation_source,
  enabled            = EXCLUDED.enabled;
