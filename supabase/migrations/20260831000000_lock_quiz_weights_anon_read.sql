-- Lock quiz_weights SELECT to admins only (deny anonymous read).
--
-- quiz_weights holds the tuned per-broker ranking weights that drive the Get
-- Matched quiz. The "Public read quiz weights" policy (SELECT to public USING
-- (true)) made the whole matrix world-readable: the Supabase anon key is
-- embedded in the client bundle, so anyone could call PostgREST directly —
--   GET /rest/v1/quiz_weights?select=*
-- — and extract the full weight matrix, a commercially-sensitive ranking asset.
--
-- After PR #1411 (+ the top-match service-role switch) every legitimate reader
-- reaches the table WITHOUT the anon role:
--   * app/api/quiz/score            — service-role (public quiz scoring)
--   * lib/getmatched/top-match.ts   — service-role (get-matched hero card)
--   * app/admin/quiz-weights        — browser client, authenticated, is_admin()
-- Service-role bypasses RLS; the admin editor's browser session carries an
-- @invest.com.au JWT, so is_admin() is true for it. The existing admin
-- INSERT/UPDATE policies ("Admin can insert/update quiz weights", both
-- is_admin()-scoped) are unchanged. We only re-scope SELECT.
--
-- ⚠️ ORDER OF OPERATIONS — DO NOT MERGE THIS PR UNTIL #1411 IS DEPLOYED.
-- supabase-migrate.yml auto-applies on push to main, and the app deploy lags
-- the migration by ~15-20 min. Applying this before the service-role readers
-- are live degrades the quiz GRACEFULLY (public scoring falls back to the coarse
-- client weights; the get-matched hero card is skipped) until the new code ships
-- — never a hard break, but a real regression window. Merge only after #1411's
-- deploy is confirmed live.
--
-- Idempotent (drop-if-exists + create). Rollback: recreate the dropped policy
--   create policy "Public read quiz weights" on public.quiz_weights
--     for select to public using (true);
-- — NOT recommended (re-opens anonymous extraction of the weight matrix).

drop policy if exists "Public read quiz weights" on public.quiz_weights;
drop policy if exists "Admins read quiz weights" on public.quiz_weights;

create policy "Admins read quiz weights"
  on public.quiz_weights
  for select
  to public
  using (public.is_admin());
