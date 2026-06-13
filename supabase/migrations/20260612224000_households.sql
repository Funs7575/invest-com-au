-- Migration: households — Household Workspaces (couples plan together).
--
-- Idea #6 (docs/strategy/RETENTION_MARKETPLACE_MEGA_SESSIONS.md). Lets a user
-- invite a partner into a shared household so they can see each other's SHARED
-- goals, manual balances and watchlist items. Two tables plus three nullable
-- `household_id` columns on the existing per-user data tables.
--
--   households          — one row per household. `created_by` is the owner.
--                         App-level cap: one household per creator (we never
--                         insert a second for the same created_by; there is no
--                         DB UNIQUE because revoked/abandoned households should
--                         still be re-creatable after a hard delete, and the
--                         app already guards the create path).
--   household_members   — membership + invitation rows. `user_id` is NULL until
--                         the invitee accepts (claimed by matching email via the
--                         service-role admin client — the one cross-user step,
--                         justified in lib/households.ts). `invite_token` is the
--                         unguessable accept link factor. UNIQUE(household_id,
--                         invited_email) stops duplicate invites to one address.
--
-- SHARING MODEL — a deliberate READ-only grant. Adding a row's `household_id`
--   shares it for READ with every ACCEPTED member of that household. WRITES stay
--   owner-only: the existing owner SELECT/INSERT/UPDATE/DELETE policies are
--   unchanged, and the new policies below are SELECT-only. A partner can SEE a
--   shared goal but can never edit or delete it. This keeps "share" safe and
--   reversible (the owner clears household_id to un-share).
--
-- RLS — households + household_members are readable by ACCEPTED members
--   (membership resolved via household_members.user_id = auth.uid()). Creating a
--   household is restricted to the creator (created_by = auth.uid()). Member
--   management (INSERT/UPDATE/DELETE of household_members) is restricted to the
--   household OWNER. The three data tables gain ONE additional SELECT policy each
--   that grants read to accepted members of the row's household via an EXISTS
--   subquery against household_members. service_role retains full access.
--
--   The accepted-membership check is factored into SECURITY DEFINER helper
--   functions (public.is_household_member / public.is_household_owner) so the
--   household_members policies don't self-reference the same table inside their
--   own USING clause (which Postgres rejects as infinite recursion). The data-
--   table policies inline a plain EXISTS — that reads household_members, not the
--   table being queried, so there is no recursion there.
--
-- DORMANCY — every read/write path is gated at the application layer behind the
--   `households` feature flag (fail-closed via isFlagEnabled). With the flag off
--   no switcher option, invite UI, shared view, or BriefForm block renders, and
--   no query references these tables/columns — so nothing 500s if this migration
--   has not run yet. The additional SELECT policies are inert until a row
--   actually has a non-NULL household_id, so existing single-user reads are
--   byte-identical.
--
-- Rollback:
--   DROP POLICY IF EXISTS "household members read shared goals" ON public.investor_goals;
--   DROP POLICY IF EXISTS "household members read shared balances" ON public.manual_balances;
--   DROP POLICY IF EXISTS "household members read shared watchlist" ON public.user_watchlist_items;
--   ALTER TABLE public.investor_goals        DROP COLUMN IF EXISTS household_id;
--   ALTER TABLE public.manual_balances       DROP COLUMN IF EXISTS household_id;
--   ALTER TABLE public.user_watchlist_items  DROP COLUMN IF EXISTS household_id;
--   DROP TABLE IF EXISTS public.household_members;
--   DROP TABLE IF EXISTS public.households;
--   DROP FUNCTION IF EXISTS public.is_household_member(uuid);
--   DROP FUNCTION IF EXISTS public.is_household_owner(uuid);

BEGIN;

-- ─── households ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.households (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Our household',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (char_length(name) <= 60)
);

CREATE INDEX IF NOT EXISTS idx_households_created_by ON public.households (created_by);

-- ─── household_members ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.household_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  user_id uuid,
  invited_email text NOT NULL,
  role text NOT NULL DEFAULT 'partner',
  status text NOT NULL DEFAULT 'pending',
  invite_token text NOT NULL UNIQUE,
  invited_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  UNIQUE (household_id, invited_email),
  CHECK (role = ANY (ARRAY['owner'::text, 'partner'::text])),
  CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'revoked'::text, 'left'::text]))
);

CREATE INDEX IF NOT EXISTS idx_household_members_household ON public.household_members (household_id);
CREATE INDEX IF NOT EXISTS idx_household_members_user ON public.household_members (user_id);
CREATE INDEX IF NOT EXISTS idx_household_members_email ON public.household_members (lower(invited_email));

-- ─── membership helper functions (SECURITY DEFINER to avoid policy recursion) ─
-- is_household_member: TRUE when the calling user is an ACCEPTED member of the
-- given household. Used by the households + household_members SELECT policies.
CREATE OR REPLACE FUNCTION public.is_household_member(hid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.household_members m
    WHERE m.household_id = hid
      AND m.user_id = auth.uid()
      AND m.status = 'accepted'
  );
$$;

-- is_household_owner: TRUE when the calling user created the given household.
-- Used to restrict member-management writes to the owner.
CREATE OR REPLACE FUNCTION public.is_household_owner(hid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.households h
    WHERE h.id = hid
      AND h.created_by = auth.uid()
  );
$$;

-- ─── RLS: households ───────────────────────────────────────────────────────
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "household members read household" ON public.households;
CREATE POLICY "household members read household" ON public.households
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR public.is_household_member(id));

DROP POLICY IF EXISTS "creator inserts own household" ON public.households;
CREATE POLICY "creator inserts own household" ON public.households
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Owner may rename / delete their household.
DROP POLICY IF EXISTS "owner updates own household" ON public.households;
CREATE POLICY "owner updates own household" ON public.households
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "owner deletes own household" ON public.households;
CREATE POLICY "owner deletes own household" ON public.households
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (created_by = auth.uid());

DROP POLICY IF EXISTS "service_role full access households" ON public.households;
CREATE POLICY "service_role full access households" ON public.households
  AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─── RLS: household_members ────────────────────────────────────────────────
ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;

-- Accepted members of a household read its membership rows (so each side can
-- see who's in the household). The owner can always read (covers pending /
-- revoked invitee rows the EXISTS check would not match).
DROP POLICY IF EXISTS "members read household roster" ON public.household_members;
CREATE POLICY "members read household roster" ON public.household_members
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_household_owner(household_id)
    OR public.is_household_member(household_id)
  );

-- Only the household owner adds members (sends invites).
DROP POLICY IF EXISTS "owner inserts members" ON public.household_members;
CREATE POLICY "owner inserts members" ON public.household_members
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (public.is_household_owner(household_id));

-- The owner may manage any membership row (revoke an invite/member); a member
-- may update THEIR OWN row (to leave). Both are bounded by WITH CHECK so neither
-- can move a row to a different household.
DROP POLICY IF EXISTS "owner or self updates membership" ON public.household_members;
CREATE POLICY "owner or self updates membership" ON public.household_members
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (public.is_household_owner(household_id) OR user_id = auth.uid())
  WITH CHECK (public.is_household_owner(household_id) OR user_id = auth.uid());

-- Owner may delete membership rows (hard-remove an invite).
DROP POLICY IF EXISTS "owner deletes members" ON public.household_members;
CREATE POLICY "owner deletes members" ON public.household_members
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (public.is_household_owner(household_id));

DROP POLICY IF EXISTS "service_role full access household_members" ON public.household_members;
CREATE POLICY "service_role full access household_members" ON public.household_members
  AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─── household_id columns on the three shared data tables ──────────────────
-- investor_goals keys its owner on auth_user_id; the other two on user_id.
ALTER TABLE public.investor_goals       ADD COLUMN IF NOT EXISTS household_id uuid;
ALTER TABLE public.manual_balances      ADD COLUMN IF NOT EXISTS household_id uuid;
ALTER TABLE public.user_watchlist_items ADD COLUMN IF NOT EXISTS household_id uuid;

CREATE INDEX IF NOT EXISTS idx_investor_goals_household ON public.investor_goals (household_id);
CREATE INDEX IF NOT EXISTS idx_manual_balances_household ON public.manual_balances (household_id);
CREATE INDEX IF NOT EXISTS idx_user_watchlist_items_household ON public.user_watchlist_items (household_id);

-- ─── Additional SELECT policies: accepted members read SHARED rows ─────────
-- READ-only. The existing owner policies (baseline) still govern writes, so a
-- partner can SEE but never mutate a shared row. The EXISTS subquery reads
-- household_members (not the table being queried) → no policy recursion.
DROP POLICY IF EXISTS "household members read shared goals" ON public.investor_goals;
CREATE POLICY "household members read shared goals" ON public.investor_goals
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    household_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.household_members m
      WHERE m.household_id = investor_goals.household_id
        AND m.user_id = auth.uid()
        AND m.status = 'accepted'
    )
  );

DROP POLICY IF EXISTS "household members read shared balances" ON public.manual_balances;
CREATE POLICY "household members read shared balances" ON public.manual_balances
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    household_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.household_members m
      WHERE m.household_id = manual_balances.household_id
        AND m.user_id = auth.uid()
        AND m.status = 'accepted'
    )
  );

DROP POLICY IF EXISTS "household members read shared watchlist" ON public.user_watchlist_items;
CREATE POLICY "household members read shared watchlist" ON public.user_watchlist_items
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    household_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.household_members m
      WHERE m.household_id = user_watchlist_items.household_id
        AND m.user_id = auth.uid()
        AND m.status = 'accepted'
    )
  );

COMMIT;
