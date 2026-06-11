-- Extend anonymous_saves.bookmark_type CHECK with 'listing' so anonymous
-- visitors can save marketplace lot pages server-side (the lot-page save
-- button; authed saves use user_bookmarks, which has no type CHECK).
--
-- Until this is applied the feature fails soft: anonymous listing-saves
-- persist in localStorage only (the existing BookmarkButton mirror
-- pattern) and the server insert is silently skipped.
--
-- The drop is by DETECTED name, not a hard-coded one: environments that
-- predate the baseline squash may carry the constraint under a different
-- auto-generated name (e.g. anonymous_saves_type_check), and dropping a
-- hard-coded name there would abort the migration.
--
-- Rollback strategy: recreate the constraint without 'listing' after
-- deleting any rows with bookmark_type = 'listing':
--   DELETE FROM public.anonymous_saves WHERE bookmark_type = 'listing';
--   ALTER TABLE public.anonymous_saves DROP CONSTRAINT anonymous_saves_bookmark_type_check;
--   ALTER TABLE public.anonymous_saves ADD CONSTRAINT anonymous_saves_bookmark_type_check
--     CHECK (bookmark_type = ANY (ARRAY['article','broker','advisor','scenario','calculator']));

DO $$
DECLARE
  stale record;
BEGIN
  -- Drop every CHECK on bookmark_type that does not yet allow 'listing',
  -- whatever it happens to be named in this environment.
  FOR stale IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'anonymous_saves'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) LIKE '%bookmark_type%'
      AND pg_get_constraintdef(c.oid) NOT LIKE '%listing%'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.anonymous_saves DROP CONSTRAINT %I',
      stale.conname
    );
  END LOOP;

  -- Re-add under the canonical name unless a listing-aware CHECK on
  -- bookmark_type already exists (idempotent re-run / drifted name).
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'anonymous_saves'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) LIKE '%bookmark_type%'
  ) THEN
    ALTER TABLE public.anonymous_saves
      ADD CONSTRAINT anonymous_saves_bookmark_type_check
      CHECK (bookmark_type = ANY (ARRAY[
        'article'::text,
        'broker'::text,
        'advisor'::text,
        'scenario'::text,
        'calculator'::text,
        'listing'::text
      ]));
  END IF;
END $$;
