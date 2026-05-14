-- ============================================================
-- MM-14: Seed AI feature flags (Get Matched 3.0 + Match Request Copilot)
--
-- Date: 2026-05-14
-- Why:  Two new AI-driven features land behind feature flags that
--       MUST default OFF so prod traffic incurs zero token cost
--       until an admin explicitly flips them in /admin/feature-flags:
--
--         1. ai_get_matched_v3        — AI-driven Get Matched 3.0
--            question walker (feature #3). When enabled, the
--            /api/get-matched/answer route routes through Claude
--            (claude-haiku-4-5 by default) to pick the next
--            question or signal that we have enough info to
--            resolve a plan.
--
--         2. ai_match_request_copilot — AI copilot for match
--            requests (feature #10, seeded now to avoid a
--            future migration filename collision).
--
--       Both flags follow the standard kill-switch shape
--       (enabled=false, rollout_pct=0, empty allow/deny/segments)
--       so admins can ramp gradually via the /admin/feature-flags UI.
--
-- Idempotency: INSERT ... ON CONFLICT (flag_key) DO NOTHING.
--              Re-applying this migration is a safe no-op. Any
--              admin-toggled state is preserved on re-run.
--
-- Rollback:
--   DELETE FROM public.feature_flags
--     WHERE flag_key IN ('ai_get_matched_v3', 'ai_match_request_copilot')
--     AND updated_by IS NULL; -- preserve hand-edited state
-- ============================================================

BEGIN;

INSERT INTO public.feature_flags
  (flag_key, description, enabled, rollout_pct, allowlist, denylist, segments)
VALUES
  ('ai_get_matched_v3',
   'AI-driven Get Matched 3.0 question walker. When enabled, the next-question decision is made by Claude (claude-haiku-4-5) instead of the rule-based shown_if walker. ANTHROPIC_API_KEY billing applies per token (~$0.0003 per question). Default OFF.',
   false, 0, '{}', '{}', '{}'),

  ('ai_match_request_copilot',
   'AI copilot for match-request enrichment (feature #10). Reserved for future rollout — code path not yet shipped. ANTHROPIC_API_KEY billing applies per token. Default OFF.',
   false, 0, '{}', '{}', '{}')

ON CONFLICT (flag_key) DO NOTHING;

COMMIT;
