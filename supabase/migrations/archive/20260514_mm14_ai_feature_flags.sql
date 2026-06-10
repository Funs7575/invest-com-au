-- ============================================================
-- MM-14: Seed AI co-pilot feature flags (Marketplace / AI wave)
--
-- Date: 2026-05-14
-- Why: This wave ships two AI features behind kill-switch flags so
--      the corresponding routes return 404 (not 200) by default,
--      guaranteeing zero LLM spend in production traffic until an
--      admin explicitly flips the flag in /admin/automation/flags.
--
--      Flags seeded:
--        1. `ai_match_request_copilot` — AI Match Request co-pilot
--           (feature #10). Powers POST /api/briefs/ai-copilot and the
--           opt-in toggle on /briefs/new. When disabled, the route
--           returns 404 and the toggle is server-side-hidden.
--
--        2. `ai_get_matched_v3` — AI Get Matched 3.0 (feature #3).
--           When enabled, /api/get-matched/answer routes the
--           next-question decision through Claude
--           (claude-haiku-4-5 by default) instead of the rule-based
--           shown_if walker.
--
--      Both default OFF. Flip via admin UI (preferred — preserved on
--      migration re-run) or by running:
--        UPDATE public.feature_flags
--           SET enabled = true
--         WHERE flag_key IN ('ai_match_request_copilot',
--                            'ai_get_matched_v3');
--
-- Idempotency: INSERT ... ON CONFLICT (flag_key) DO NOTHING — re-running
--              this migration is a safe no-op. Any admin-toggled state
--              (rollout_pct, allowlist, enabled) is preserved on re-run
--              because ON CONFLICT DO NOTHING leaves existing rows
--              untouched.
--
-- Rollback:
--   DELETE FROM public.feature_flags
--    WHERE flag_key IN ('ai_match_request_copilot', 'ai_get_matched_v3');
-- ============================================================

BEGIN;

INSERT INTO public.feature_flags
  (flag_key, description, enabled, rollout_pct, allowlist, denylist, segments)
VALUES
  ('ai_match_request_copilot',
   'AI Match Request co-pilot (POST /api/briefs/ai-copilot). When enabled, '
   'the /briefs/new page renders an opt-in toggle that replaces the multi-field '
   'brief form with a single natural-language textarea — Claude extracts a '
   'structured advisor_auctions payload from the description. MUST remain '
   'enabled=false until product sign-off: every flipped-on request costs '
   'Anthropic tokens (~$0.001–0.005 per extraction depending on description '
   'length), and the route is IP-rate-limited to 5/hour as a cost shield. '
   'The route returns 404 (not 403) when this flag is false so anyone '
   'scanning the API surface gets no signal that the feature exists.',
   false, 0, '{}', '{}', '{}'),
  ('ai_get_matched_v3',
   'AI-driven Get Matched 3.0 question walker. When enabled, the '
   '/api/get-matched/answer route routes through Claude (claude-haiku-4-5 '
   'by default) to pick the next question or signal that we have enough '
   'info to resolve a plan. ANTHROPIC_API_KEY billing applies per token '
   '(~$0.0003 per question). Default OFF.',
   false, 0, '{}', '{}', '{}')
ON CONFLICT (flag_key) DO NOTHING;

COMMIT;
