-- Wave 3: Trust + compliance foundations.
--
-- Tables:
--   1. rate_limit_buckets        — DB-backed token bucket (survives cold starts)
--   2. stripe_webhook_events     — add processing/done status for crash-robust idempotency
--   3. financial_audit_log       — every money movement with who/when/why/old/new
--   4. privacy_data_requests     — GDPR / Privacy Act data export + delete requests
--
-- All tables get RLS enabled and are service-role only.

-- ── 1. rate_limit_buckets ─────────────────────────────────────────
-- Token bucket keyed by (scope, key). `scope` is the endpoint or
-- feature name; `key` is whatever the limiter chose (IP, user id,
-- email, etc). Bucket math is done at write time — we decrement
-- on each call; a background reclaim cron refills buckets that
-- have dropped below their max based on elapsed time since
-- `refilled_at`.
CREATE TABLE IF NOT EXISTS public.rate_limit_buckets (
  scope          text NOT NULL,
  key            text NOT NULL,
  tokens         numeric NOT NULL,      -- current balance
  max_tokens     numeric NOT NULL,      -- bucket capacity
  refill_per_sec numeric NOT NULL,      -- refill rate
  refilled_at    timestamptz NOT NULL DEFAULT now(),
  created_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (scope, key)
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_buckets_refilled
  ON public.rate_limit_buckets (refilled_at);

ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.rate_limit_buckets IS
  'DB-backed token bucket for rate limiting. Survives serverless cold starts unlike the in-memory limiter.';

-- ── 2. stripe_webhook_events status column ───────────────────────
-- The current idempotency check INSERTs on PK and ignores
-- unique_violation. That's atomic but not crash-robust: if the
-- winning thread crashes after the insert but before finishing
-- the work, a retry sees a duplicate and silently drops it.
--
-- Status machine: processing → done | error. A stale 'processing'
-- row older than 5 minutes is considered abandoned and can be
-- retaken by a retry. 'done' is terminal.
ALTER TABLE public.stripe_webhook_events
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'done';

ALTER TABLE public.stripe_webhook_events
  ADD COLUMN IF NOT EXISTS started_at timestamptz;

ALTER TABLE public.stripe_webhook_events
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

ALTER TABLE public.stripe_webhook_events
  DROP CONSTRAINT IF EXISTS stripe_webhook_events_status_check;
ALTER TABLE public.stripe_webhook_events
  ADD CONSTRAINT stripe_webhook_events_status_check CHECK (
    status = ANY (ARRAY['processing'::text, 'done'::text, 'error'::text])
  );

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_status_stale
  ON public.stripe_webhook_events (status, started_at);

-- ── 3. financial_audit_log ────────────────────────────────────────
-- Every credit balance move, refund, billing adjustment, dispute
-- reversal. Indexed by actor + resource so compliance can answer
-- "what did admin X do this month" or "what happened to advisor Y's
-- balance".
CREATE TABLE IF NOT EXISTS public.financial_audit_log (
  id              bigserial PRIMARY KEY,
  actor_type      text NOT NULL,        -- 'admin' | 'system' | 'advisor' | 'user'
  actor_id        text,                 -- email for admins, id for others
  action          text NOT NULL,        -- 'credit' | 'debit' | 'refund' | 'charge' | 'adjustment'
  resource_type   text NOT NULL,        -- 'advisor_credit_balance' | 'lead_billing' | 'invoice'
  resource_id     text NOT NULL,        -- stringified id of the target row
  amount_cents    bigint,               -- signed: positive = money in, negative = money out
  currency        text DEFAULT 'AUD',
  old_value       jsonb,                -- pre-change snapshot (optional)
  new_value       jsonb,                -- post-change snapshot (optional)
  reason          text,                 -- human-readable explanation
  context         jsonb,                -- freeform metadata (stripe event id, etc.)
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_financial_audit_log_actor
  ON public.financial_audit_log (actor_type, actor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_financial_audit_log_resource
  ON public.financial_audit_log (resource_type, resource_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_financial_audit_log_created
  ON public.financial_audit_log (created_at DESC);

ALTER TABLE public.financial_audit_log ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.financial_audit_log IS
  'Every money movement with who/when/why/old/new. AFSL s912D audit requirement.';

ALTER TABLE public.financial_audit_log
  DROP CONSTRAINT IF EXISTS financial_audit_log_actor_type_check;
ALTER TABLE public.financial_audit_log
  ADD CONSTRAINT financial_audit_log_actor_type_check CHECK (
    actor_type = ANY (ARRAY['admin'::text, 'system'::text, 'advisor'::text, 'user'::text, 'cron'::text])
  );

-- ── 4. privacy_data_requests ──────────────────────────────────────
-- Privacy Act + GDPR data subject access requests.
--   - 'export': user requested a download of their data
--   - 'delete': user requested erasure (cascade across known tables)
CREATE TABLE IF NOT EXISTS public.privacy_data_requests (
  id              bigserial PRIMARY KEY,
  request_type    text NOT NULL,        -- 'export' | 'delete'
  email           text NOT NULL,
  verification_token text NOT NULL,     -- random token sent via email for confirmation
  verified_at     timestamptz,
  completed_at    timestamptz,
  result_url      text,                 -- signed URL for an export bundle
  rows_affected   jsonb,                -- { table: count } for delete audits
  requested_by_ip text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_privacy_data_requests_email
  ON public.privacy_data_requests (email, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_privacy_data_requests_status
  ON public.privacy_data_requests (request_type, verified_at, completed_at);

ALTER TABLE public.privacy_data_requests ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.privacy_data_requests
  DROP CONSTRAINT IF EXISTS privacy_data_requests_type_check;
ALTER TABLE public.privacy_data_requests
  ADD CONSTRAINT privacy_data_requests_type_check CHECK (
    request_type = ANY (ARRAY['export'::text, 'delete'::text])
  );
