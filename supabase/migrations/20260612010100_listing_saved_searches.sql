-- Saved listing searches / follows — the alert primitive for the
-- marketplace ("tell me when a water entitlement in VIC under $500k
-- lists", "follow farmland", later "follow this House").
--
-- One table covers all three shapes: `criteria` is a small JSON object of
-- the directory's own filter params (category, state, price band, kind,
-- entity) so the matcher and the browse UI share one vocabulary.
--
-- Consumer code fails soft until applied (alerts UI hides on table-missing
-- errors; the cron no-ops). Cadence: the cron emails at most once per
-- match-run per search and stamps last_notified_at.
--
-- Rollback strategy: DROP TABLE IF EXISTS public.listing_saved_searches;

CREATE TABLE IF NOT EXISTS public.listing_saved_searches (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  auth_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text,
  criteria jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'active',
  last_notified_at timestamptz,
  last_matched_listing_id integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (char_length(label) <= 120),
  CHECK (status = ANY (ARRAY['active'::text, 'paused'::text])),
  -- Criteria stays small — it is a filter object, not a document store.
  CHECK (pg_column_size(criteria) <= 2048)
);

-- A user can keep many searches but not unbounded ones; the API enforces a
-- soft cap, this index serves both the matcher scan and the account list.
CREATE INDEX IF NOT EXISTS idx_listing_saved_searches_user
  ON public.listing_saved_searches (auth_user_id, status);
CREATE INDEX IF NOT EXISTS idx_listing_saved_searches_active
  ON public.listing_saved_searches (status) WHERE (status = 'active');

ALTER TABLE public.listing_saved_searches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner reads own searches" ON public.listing_saved_searches;
CREATE POLICY "owner reads own searches" ON public.listing_saved_searches
  FOR SELECT TO authenticated
  USING (auth_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "owner writes own searches" ON public.listing_saved_searches;
CREATE POLICY "owner writes own searches" ON public.listing_saved_searches
  FOR INSERT TO authenticated
  WITH CHECK (auth_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "owner updates own searches" ON public.listing_saved_searches;
CREATE POLICY "owner updates own searches" ON public.listing_saved_searches
  FOR UPDATE TO authenticated
  USING (auth_user_id = (SELECT auth.uid()))
  WITH CHECK (auth_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "owner deletes own searches" ON public.listing_saved_searches;
CREATE POLICY "owner deletes own searches" ON public.listing_saved_searches
  FOR DELETE TO authenticated
  USING (auth_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "service_role full access listing_saved_searches" ON public.listing_saved_searches;
CREATE POLICY "service_role full access listing_saved_searches" ON public.listing_saved_searches
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS update_listing_saved_searches_updated_at ON public.listing_saved_searches;
CREATE TRIGGER update_listing_saved_searches_updated_at
  BEFORE UPDATE ON public.listing_saved_searches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
