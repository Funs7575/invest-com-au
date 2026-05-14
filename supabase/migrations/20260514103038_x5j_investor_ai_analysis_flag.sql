-- ============================================================
-- X5j: Seed investor_ai_analysis_enabled feature flag
--
-- Date: 2026-05-14
-- Audit ref: docs/plans/investor-account-end-to-end-plan.md Phase 4 / PR-X5j
-- Why: Phase 4 of the investor-account roadmap builds the AI portfolio
--      analysis engine. Pre-AFSL we are NOT allowed to ship a personalized
--      analysis surface — Corporations Act s766B(6)/(7) factual-information
--      carve-outs limit us to comparison and factual computation only, and
--      personalized AI commentary on a specific user's portfolio sits
--      uncomfortably close to "personal advice" without a licence. AFSL
--      grant is expected ~2026-11.
--
--      This flag MUST remain enabled=false until AFSL grants. The route
--      handler at app/api/account/holdings/ai-analysis returns 404 unless
--      this flag evaluates true. Even when flipped on, every AI output
--      passes filterFactualOutput() before reaching the user.
--
-- Idempotency: INSERT ... ON CONFLICT (flag_key) DO NOTHING — re-running
--              this migration is a safe no-op. Any admin-toggled state
--              (e.g. once AFSL grants and the flag is flipped on) is
--              preserved on re-run.
-- Rollback:
--   DELETE FROM public.feature_flags WHERE flag_key = 'investor_ai_analysis_enabled';
--   (Safe — pure feature gate, no data dependencies.)
-- ============================================================

BEGIN;

INSERT INTO public.feature_flags
  (flag_key, description, enabled, rollout_pct, allowlist, denylist, segments)
VALUES
  ('investor_ai_analysis_enabled',
   'AI portfolio analysis route (POST /api/account/holdings/ai-analysis). '
   'PRE-AFSL GATE: must remain enabled=false until AFSL grants (~2026-11). '
   'Flipping enabled=true while we are operating under the s766B(6)/(7) '
   'factual-information carve-out would expose the platform to a personal-advice '
   'finding under Corporations Act s911A. See docs/plans/investor-account-end-to-end-plan.md '
   'Phase 4 / PR-X5j for the compliance rationale.',
   false, 0, '{}', '{}', '{}')
ON CONFLICT (flag_key) DO NOTHING;

COMMIT;
