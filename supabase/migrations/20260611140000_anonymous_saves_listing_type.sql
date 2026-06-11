-- Extend anonymous_saves.bookmark_type CHECK with 'listing' so anonymous
-- visitors can save marketplace lot pages server-side (the lot-page save
-- button; authed saves use user_bookmarks, which has no type CHECK).
--
-- Until this is applied the feature fails soft: anonymous listing-saves
-- persist in localStorage only (the existing BookmarkButton mirror
-- pattern) and the server insert is silently skipped.
--
-- Rollback strategy: recreate the constraint without 'listing' after
-- deleting any rows with bookmark_type = 'listing':
--   DELETE FROM public.anonymous_saves WHERE bookmark_type = 'listing';
--   ALTER TABLE public.anonymous_saves DROP CONSTRAINT anonymous_saves_bookmark_type_check;
--   ALTER TABLE public.anonymous_saves ADD CONSTRAINT anonymous_saves_bookmark_type_check
--     CHECK (bookmark_type = ANY (ARRAY['article','broker','advisor','scenario','calculator']));

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.constraint_column_usage ccu
    JOIN pg_constraint c ON c.conname = ccu.constraint_name
    WHERE ccu.table_schema = 'public'
      AND ccu.table_name = 'anonymous_saves'
      AND ccu.column_name = 'bookmark_type'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) NOT LIKE '%listing%'
  ) THEN
    ALTER TABLE public.anonymous_saves
      DROP CONSTRAINT anonymous_saves_bookmark_type_check;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'anonymous_saves_bookmark_type_check'
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
