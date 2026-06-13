-- Listing entities ("Houses") — persistent branded seller organisations.
--
-- The marketplace counterpart of advisor_firms: an optional layer above the
-- personal listing_owner_accounts workspace. Dealer-first by design — the
-- entity_type CHECK deliberately has NO issuer/fund-manager value, so a
-- capital-raising storefront cannot exist until that is a deliberate,
-- founder+legal-signed schema change (REGULATORY-AVOID-LIST §A, CSF).
--
-- All consumer code fails soft until this is applied (feature flag
-- `listing_entities_enabled` + try/catch reads) — nothing breaks if the
-- push waits.
--
-- Rollback strategy: drop the FK column, then the tables —
--   ALTER TABLE public.investment_listings DROP COLUMN IF EXISTS entity_id;
--   DROP TABLE IF EXISTS public.listing_entity_members;
--   DROP TABLE IF EXISTS public.listing_entities;

CREATE TABLE IF NOT EXISTS public.listing_entities (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  entity_type text NOT NULL DEFAULT 'dealer',
  abn text,
  acn text,
  website text,
  location_state text,
  logo_url text,
  header_image_url text,
  tagline text,
  story text,
  highlight_stats jsonb NOT NULL DEFAULT '[]'::jsonb,
  verification_status text NOT NULL DEFAULT 'unverified',
  tier text NOT NULL DEFAULT 'free',
  -- NOTE: no notification/contact columns here by design — every column on
  -- this table is anon-readable via the public SELECT policy below, so
  -- private operational fields (notification email, webhook URLs) must live
  -- in a separate RLS-private table when the notifications wave ships.
  principal_id uuid REFERENCES public.principals(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (length(name) > 0),
  CHECK (char_length(tagline) <= 180),
  CHECK (char_length(story) <= 5000),
  CHECK (char_length(header_image_url) <= 2048),
  CHECK (entity_type = ANY (ARRAY[
    'property_group'::text,
    'company'::text,
    'dealer'::text,
    'brokerage'::text,
    'agency'::text,
    'other'::text
  ])),
  CHECK (verification_status = ANY (ARRAY[
    'unverified'::text, 'pending'::text, 'verified'::text, 'vetted'::text
  ])),
  CHECK (tier = ANY (ARRAY['free'::text, 'pro'::text, 'vetted'::text])),
  CHECK (status = ANY (ARRAY['active'::text, 'suspended'::text, 'archived'::text]))
);

CREATE TABLE IF NOT EXISTS public.listing_entity_members (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  entity_id bigint NOT NULL REFERENCES public.listing_entities(id) ON DELETE CASCADE,
  auth_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entity_id, auth_user_id),
  CHECK (role = ANY (ARRAY['admin'::text, 'member'::text])),
  CHECK (status = ANY (ARRAY['active'::text, 'invited'::text, 'suspended'::text]))
);

ALTER TABLE public.investment_listings
  ADD COLUMN IF NOT EXISTS entity_id bigint REFERENCES public.listing_entities(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_listing_entities_status_active
  ON public.listing_entities (status) WHERE (status = 'active');
CREATE INDEX IF NOT EXISTS idx_listing_entity_members_user
  ON public.listing_entity_members (auth_user_id);
CREATE INDEX IF NOT EXISTS idx_investment_listings_entity
  ON public.investment_listings (entity_id) WHERE (entity_id IS NOT NULL);

ALTER TABLE public.listing_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_entity_members ENABLE ROW LEVEL SECURITY;

-- Public read of active entities (the public profile page).
DROP POLICY IF EXISTS "anon reads active entities" ON public.listing_entities;
CREATE POLICY "anon reads active entities" ON public.listing_entities
  FOR SELECT TO anon, authenticated
  USING (status = 'active');

-- No authenticated write policies — deliberately. A row-level UPDATE
-- policy cannot stop an entity admin from setting service-controlled
-- columns (verification_status='verified', tier='vetted'), because RLS is
-- row-scoped, not column-scoped. Entity self-management ships in the UI
-- wave as service-role API routes with explicit field allow-lists (the
-- pattern every other mutation in this codebase uses); until then the
-- only writer is service_role.
DROP POLICY IF EXISTS "admin members update their entity" ON public.listing_entities;

DROP POLICY IF EXISTS "service_role full access listing_entities" ON public.listing_entities;
CREATE POLICY "service_role full access listing_entities" ON public.listing_entities
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Members see their own membership rows.
DROP POLICY IF EXISTS "members read own membership" ON public.listing_entity_members;
CREATE POLICY "members read own membership" ON public.listing_entity_members
  FOR SELECT TO authenticated
  USING (auth_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "service_role full access listing_entity_members" ON public.listing_entity_members;
CREATE POLICY "service_role full access listing_entity_members" ON public.listing_entity_members
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS update_listing_entities_updated_at ON public.listing_entities;
CREATE TRIGGER update_listing_entities_updated_at
  BEFORE UPDATE ON public.listing_entities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
