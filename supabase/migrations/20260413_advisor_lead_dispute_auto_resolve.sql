-- Advisor lead dispute auto-resolution.
--
-- Extends `lead_disputes` so the classifier can record how (and why)
-- it resolved a dispute without human review. Every existing column
-- stays as-is; we only add optional metadata so existing code and
-- admin queries keep working.
--
-- Resolution audit trail we need:
--   auto_resolved_at         — when the classifier made the call
--   auto_resolved_verdict    — 'refund' | 'reject' | 'escalate'
--   auto_resolved_confidence — 'high' | 'medium' | 'low'
--   auto_resolved_reasons    — jsonb array of signal strings (evidence)
--   reason_code              — standardised enum for the dispute reason
--                              (the existing `reason` column is free text
--                              and we keep it for backwards compat; the
--                              classifier operates on reason_code)
--   refunded_cents           — how much credit was refunded (0 on reject)
--
-- This is purely additive — every existing insert/select keeps working.

ALTER TABLE public.lead_disputes
  ADD COLUMN IF NOT EXISTS reason_code text,
  ADD COLUMN IF NOT EXISTS auto_resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS auto_resolved_verdict text,
  ADD COLUMN IF NOT EXISTS auto_resolved_confidence text,
  ADD COLUMN IF NOT EXISTS auto_resolved_reasons jsonb,
  ADD COLUMN IF NOT EXISTS refunded_cents integer DEFAULT 0;

-- Constrain reason_code to the standardised enum so typos in client
-- code surface as 400s at insert time instead of silent "other".
ALTER TABLE public.lead_disputes
  DROP CONSTRAINT IF EXISTS lead_disputes_reason_code_check;

ALTER TABLE public.lead_disputes
  ADD CONSTRAINT lead_disputes_reason_code_check CHECK (
    reason_code IS NULL OR reason_code = ANY (ARRAY[
      'spam_or_fake'::text,
      'wrong_specialty'::text,
      'out_of_area'::text,
      'unreachable'::text,
      'duplicate'::text,
      'under_minimum'::text,
      'other'::text
    ])
  );

-- Same constraint shape for auto_resolved_verdict.
ALTER TABLE public.lead_disputes
  DROP CONSTRAINT IF EXISTS lead_disputes_auto_verdict_check;

ALTER TABLE public.lead_disputes
  ADD CONSTRAINT lead_disputes_auto_verdict_check CHECK (
    auto_resolved_verdict IS NULL OR auto_resolved_verdict = ANY (ARRAY[
      'refund'::text,
      'reject'::text,
      'escalate'::text
    ])
  );

-- And auto_resolved_confidence.
ALTER TABLE public.lead_disputes
  DROP CONSTRAINT IF EXISTS lead_disputes_auto_confidence_check;

ALTER TABLE public.lead_disputes
  ADD CONSTRAINT lead_disputes_auto_confidence_check CHECK (
    auto_resolved_confidence IS NULL OR auto_resolved_confidence = ANY (ARRAY[
      'high'::text,
      'medium'::text,
      'low'::text
    ])
  );

-- Fast lookups for the hourly backfill cron which fetches open disputes.
CREATE INDEX IF NOT EXISTS idx_lead_disputes_pending_created
  ON public.lead_disputes (created_at)
  WHERE status = 'pending';

-- Index for admin view filtering by verdict.
CREATE INDEX IF NOT EXISTS idx_lead_disputes_auto_verdict
  ON public.lead_disputes (auto_resolved_verdict)
  WHERE auto_resolved_verdict IS NOT NULL;

COMMENT ON COLUMN public.lead_disputes.reason_code IS
  'Standardised reason enum for the classifier. NULL for legacy rows created before this migration; those always escalate.';
COMMENT ON COLUMN public.lead_disputes.auto_resolved_verdict IS
  'refund = advisor credit refunded; reject = charge stands; escalate = human review required.';
COMMENT ON COLUMN public.lead_disputes.auto_resolved_confidence IS
  'high = strict rule matched, action taken. medium/low = escalated regardless.';
COMMENT ON COLUMN public.lead_disputes.auto_resolved_reasons IS
  'JSON array of signal strings the classifier used (audit trail).';
COMMENT ON COLUMN public.lead_disputes.refunded_cents IS
  'Amount credited back to the advisor. 0 for reject/escalate verdicts.';
