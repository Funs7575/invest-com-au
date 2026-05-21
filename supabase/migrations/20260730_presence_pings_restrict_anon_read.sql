-- Restrict presence_pings — remove world-readable anon SELECT (audit §5 #9).
--
-- 20260516_mm38_presence.sql created an "anon read presence" policy with
-- USING (true) for anon + authenticated, exposing every professional's and
-- team's last_ping_at (exact online timestamps) to anyone.
--
-- All application reads go through lib/presence/index.ts on the SERVICE-ROLE
-- client (isProOnline / isTeamOnline / getOnlineProsBatch) and return only a
-- coarse "online within 5 minutes" boolean — the raw timestamp is never sent
-- to the client. Writes are service-role only via /api/presence/ping. So the
-- anon/authenticated SELECT policy is unnecessary; dropping it closes the
-- exposure with no functional change. RLS stays enabled (deny-all to anon;
-- service_role bypasses RLS).
--
-- IDEMPOTENT: DROP POLICY IF EXISTS.
-- FORWARD-ONLY: apply to live via Supabase MCP/dashboard.
-- ROLLBACK:
--   CREATE POLICY "anon read presence" ON public.presence_pings
--     FOR SELECT TO anon, authenticated USING (true);
--   (re-exposes online status — only if a client-side presence read is added.)

BEGIN;

DROP POLICY IF EXISTS "anon read presence" ON public.presence_pings;

COMMIT;
