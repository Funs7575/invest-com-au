-- Wave 10 schema — critical gap closures.
--
-- Tables introduced:
--   1. admin_mfa_enrollments      — TOTP secrets + recovery codes per admin
--   2. login_attempts             — brute-force tracking (augments rate-limit-db)
--   3. complaints_register        — ASIC RG 271 IDR register with SLA tracking
--   4. churn_surveys              — subscription cancellation reason capture
--   5. data_integrity_issues      — audit snapshot from the nightly cron
--   6. tmds                       — Target Market Determinations per product
--
-- Extensions to existing tables:
--   - subscriptions               → grace period + pause + dunning counters
--   - professionals               → advisor_tier + tier upgraded/downgraded timestamps

-- ── 1. admin_mfa_enrollments ───────────────────────────────────────
-- One row per admin user who has enrolled a TOTP authenticator.
-- secret_encrypted: the TOTP shared secret, AES-256-GCM encrypted
-- with ADMIN_MFA_KEY env var. We never store plaintext. Recovery
-- codes are stored as SHA-256 hashes so a DB leak doesn't hand
-- the codes out.
CREATE TABLE IF NOT EXISTS public.admin_mfa_enrollments (
  id                bigserial PRIMARY KEY,
  admin_email       text NOT NULL UNIQUE,
  secret_encrypted  text NOT NULL,           -- base64 ciphertext + iv + tag
  recovery_codes    text[] NOT NULL DEFAULT '{}', -- sha-256 hashes
  enrolled_at       timestamptz NOT NULL DEFAULT now(),
  last_verified_at  timestamptz,
  disabled_at       timestamptz
);

CREATE INDEX IF NOT EXISTS idx_admin_mfa_enrollments_active
  ON public.admin_mfa_enrollments (admin_email)
  WHERE disabled_at IS NULL;

ALTER TABLE public.admin_mfa_enrollments ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.admin_mfa_enrollments IS
  'TOTP enrollment per admin. Secret is AES-256-GCM encrypted; recovery codes are SHA-256 hashed.';

-- ── 2. login_attempts ──────────────────────────────────────────────
-- Per-email brute-force counter with exponential backoff. Cleared
-- on successful login. The rate-limit-db bucket handles the IP
-- tier; this table handles the email tier so an attacker changing
-- IPs doesn't beat the throttle.
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id              bigserial PRIMARY KEY,
  email           text NOT NULL UNIQUE,
  failure_count   integer NOT NULL DEFAULT 0,
  last_failure_at timestamptz NOT NULL DEFAULT now(),
  locked_until    timestamptz,
  last_ip_hash    text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_locked
  ON public.login_attempts (locked_until)
  WHERE locked_until IS NOT NULL;

ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- ── 3. complaints_register (ASIC RG 271 IDR) ───────────────────────
-- Required by ASIC Regulatory Guide 271 for AFSL holders. Every
-- complaint from a client must be recorded with a 30-day SLA for
-- resolution. Escalation to AFCA after 30 days. Audit-ready.
CREATE TABLE IF NOT EXISTS public.complaints_register (
  id                bigserial PRIMARY KEY,
  complainant_email text NOT NULL,
  complainant_name  text,
  complainant_phone text,
  subject           text NOT NULL,
  body              text NOT NULL,
  category          text NOT NULL,        -- 'lead_billing' | 'advisor_conduct' | 'data_privacy' | 'platform' | 'other'
  severity          text NOT NULL DEFAULT 'standard', -- 'low' | 'standard' | 'high' | 'critical'
  status            text NOT NULL DEFAULT 'submitted', -- 'submitted' | 'acknowledged' | 'under_review' | 'resolved' | 'escalated_afca' | 'closed'
  reference_id      text NOT NULL UNIQUE, -- user-facing ID for correspondence
  assigned_to       text,                 -- admin email
  resolution        text,
  submitted_at      timestamptz NOT NULL DEFAULT now(),
  acknowledged_at   timestamptz,
  resolved_at       timestamptz,
  escalated_at      timestamptz,
  sla_due_at        timestamptz NOT NULL, -- 30 days from submitted_at
  related_advisor_id integer,
  related_broker_slug text,
  related_lead_id   integer,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_complaints_register_status
  ON public.complaints_register (status, sla_due_at);
CREATE INDEX IF NOT EXISTS idx_complaints_register_email
  ON public.complaints_register (complainant_email, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_complaints_register_overdue
  ON public.complaints_register (sla_due_at)
  WHERE status NOT IN ('resolved', 'escalated_afca', 'closed');

ALTER TABLE public.complaints_register ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.complaints_register
  DROP CONSTRAINT IF EXISTS complaints_register_status_check;
ALTER TABLE public.complaints_register
  ADD CONSTRAINT complaints_register_status_check CHECK (
    status = ANY (ARRAY['submitted'::text, 'acknowledged'::text, 'under_review'::text, 'resolved'::text, 'escalated_afca'::text, 'closed'::text])
  );

ALTER TABLE public.complaints_register
  DROP CONSTRAINT IF EXISTS complaints_register_severity_check;
ALTER TABLE public.complaints_register
  ADD CONSTRAINT complaints_register_severity_check CHECK (
    severity = ANY (ARRAY['low'::text, 'standard'::text, 'high'::text, 'critical'::text])
  );

-- ── 4. churn_surveys ───────────────────────────────────────────────
-- Cancellation reason capture. Surfaced in the subscription cancel
-- flow as a short mandatory-one-pick + optional-comment survey.
-- Aggregate view feeds the retention dashboard.
CREATE TABLE IF NOT EXISTS public.churn_surveys (
  id              bigserial PRIMARY KEY,
  subscriber_email text NOT NULL,
  stripe_subscription_id text,
  reason_code     text NOT NULL,   -- 'too_expensive' | 'not_enough_value' | 'missing_feature' | 'switching_product' | 'temporary_pause' | 'other'
  comment         text,
  plan_label      text,
  months_active   integer,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_churn_surveys_created
  ON public.churn_surveys (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_churn_surveys_reason
  ON public.churn_surveys (reason_code, created_at DESC);

ALTER TABLE public.churn_surveys ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.churn_surveys
  DROP CONSTRAINT IF EXISTS churn_surveys_reason_code_check;
ALTER TABLE public.churn_surveys
  ADD CONSTRAINT churn_surveys_reason_code_check CHECK (
    reason_code = ANY (ARRAY['too_expensive'::text, 'not_enough_value'::text, 'missing_feature'::text, 'switching_product'::text, 'temporary_pause'::text, 'other'::text])
  );

-- ── 5. data_integrity_issues ──────────────────────────────────────
-- Audit snapshot from the nightly data_integrity cron.
-- One row per (check_name, run_date); re-runs upsert.
CREATE TABLE IF NOT EXISTS public.data_integrity_issues (
  id              bigserial PRIMARY KEY,
  check_name      text NOT NULL,
  issue_count     integer NOT NULL,
  severity        text NOT NULL DEFAULT 'info',
  sample_ids      jsonb,
  description     text,
  first_seen_at   timestamptz NOT NULL DEFAULT now(),
  last_seen_at    timestamptz NOT NULL DEFAULT now(),
  resolved_at     timestamptz
);

CREATE INDEX IF NOT EXISTS idx_data_integrity_issues_active
  ON public.data_integrity_issues (check_name, last_seen_at DESC)
  WHERE resolved_at IS NULL;

ALTER TABLE public.data_integrity_issues ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.data_integrity_issues
  DROP CONSTRAINT IF EXISTS data_integrity_issues_severity_check;
ALTER TABLE public.data_integrity_issues
  ADD CONSTRAINT data_integrity_issues_severity_check CHECK (
    severity = ANY (ARRAY['info'::text, 'warn'::text, 'critical'::text])
  );

-- ── 6. tmds (Target Market Determinations) ────────────────────────
-- DDO regime under the Corporations Act requires every financial
-- product offered/distributed to have a TMD visible to consumers.
-- One row per product, versioned.
CREATE TABLE IF NOT EXISTS public.tmds (
  id              bigserial PRIMARY KEY,
  product_type    text NOT NULL,    -- 'broker' | 'advisor' | 'fund'
  product_ref     text NOT NULL,    -- slug or id
  product_name    text NOT NULL,
  tmd_url         text NOT NULL,
  tmd_version     text NOT NULL,
  reviewed_at     timestamptz,
  valid_from      timestamptz NOT NULL DEFAULT now(),
  valid_until     timestamptz,
  UNIQUE (product_type, product_ref, tmd_version)
);

CREATE INDEX IF NOT EXISTS idx_tmds_active
  ON public.tmds (product_type, product_ref, valid_from DESC);

ALTER TABLE public.tmds ENABLE ROW LEVEL SECURITY;

-- ── 7. subscriptions dunning + pause columns ──────────────────────
-- Wave 10 dunning flow adds grace periods + pause state.
ALTER TABLE IF EXISTS public.subscriptions
  ADD COLUMN IF NOT EXISTS grace_period_until timestamptz,
  ADD COLUMN IF NOT EXISTS paused_at timestamptz,
  ADD COLUMN IF NOT EXISTS pause_reason text,
  ADD COLUMN IF NOT EXISTS dunning_attempt_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_dunning_email_at timestamptz;

-- ── 8. professionals tier upgrade audit ───────────────────────────
-- Track tier changes + who triggered them so we have a self-service
-- audit trail when advisors upgrade themselves.
ALTER TABLE IF EXISTS public.professionals
  ADD COLUMN IF NOT EXISTS tier_changed_at timestamptz,
  ADD COLUMN IF NOT EXISTS tier_changed_by text,
  ADD COLUMN IF NOT EXISTS tier_change_reason text;
