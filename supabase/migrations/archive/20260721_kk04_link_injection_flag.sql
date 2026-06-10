-- ============================================================
-- KK-04 (iter 1): Seed internal_link_injection feature flag
--
-- Date: 2026-05-10
-- Audit ref: codebase-health-2026-04-24.md — KK stream, KK-04
-- Queue item: KK-04 (knowledge graph / internal linking)
-- Why: The keyword auto-linker (lib/keyword-linking.ts) runs on every
--      article render with no kill-switch and no density cap. This migration
--      seeds the feature flag that guards it. Flipping enabled=false in the
--      admin flag panel (/admin/automation/flags) instantly disables all
--      in-prose link injection without a deploy.
--      Seeded enabled=true/rollout_pct=100 to preserve existing behaviour;
--      the flag is additive — it does not change the current render output.
-- Idempotency: INSERT ... ON CONFLICT (flag_key) DO NOTHING — re-running
--              this migration is a safe no-op. Any admin-toggled state is
--              preserved on re-run.
-- Rollback:
--   DELETE FROM public.feature_flags WHERE flag_key = 'internal_link_injection';
-- ============================================================

BEGIN;

INSERT INTO public.feature_flags
  (flag_key, description, enabled, rollout_pct, allowlist, denylist, segments)
VALUES
  ('internal_link_injection',
   'Keyword auto-linker on article pages (lib/keyword-linking.ts). '
   'Kill switch: set enabled=false to strip all in-prose link injection without a deploy. '
   'Per-section density cap is controlled in code via LinkifiedText maxLinks prop.',
   true, 100, '{}', '{}', '{}')
ON CONFLICT (flag_key) DO NOTHING;

COMMIT;
