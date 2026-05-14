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
--        2. `ai_get_matched_v3` — AI Get Matched 3.0 (feature #3,
--           sibling agent). Seeded here so both AI features in the
--           same wave share a single migration and a single rollout
--           audit trail. Sibling agent gates its own routes on this.
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
--              untouched. This is critical: never reset a flag's enabled
--              state via migration once it has been deliberately flipped.
--
--              Race-safe with the sibling MM-14 AI Get Matched agent —
--              whichever migration lands first creates both rows, the
--              second is a clean no-op on both INSERTs.
--
-- Rollback:
--   DELETE FROM public.feature_flags
--    WHERE flag_key IN ('ai_match_request_copilot', 'ai_get_matched_v3');
--   (Safe — pure feature gates, no data dependencies. Any in-flight
--   route call will then evaluate the flag as false and return 404.)
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
   'AI Get Matched 3.0 — Claude-driven intent routing for the /get-matched '
   'flow (sibling-agent feature #3 in the same MM-14 wave). Disabled by '
   'default; flip in the admin UI once the sibling agent ships the route. '
   'Seeded in this shared migration so both AI features in the wave share '
   'a single rollout audit trail.',
   false, 0, '{}', '{}', '{}')
ON CONFLICT (flag_key) DO NOTHING;

COMMIT;
