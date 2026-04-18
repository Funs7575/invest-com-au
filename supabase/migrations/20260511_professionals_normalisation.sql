-- ============================================================
-- Professionals data normalisation — pre-launch hygiene.
--
-- 1. Strip "AFSL " prefix from afsl_number.
-- 2. Strip spaces from abn.
-- 3. Label legacy verified rows with verification_method='seeded_data'.
-- 4. Revoke verified=true on incomplete (profile_score=0) seeded rows.
-- 5. Enable booking_enabled where booking_link is populated and the
--    profile is active (Task 4 of the professionals audit).
--
-- Pre-flight counts (production, pre-migration):
--   35 afsl with "AFSL " prefix
--   55 abn with spaces
--   137 verified rows with null verification_method
--   12 rows with profile_score=0 (spec said 9; WHERE clause is specific
--       so we take the actual set)
--   8  ready to enable bookings
-- ============================================================

-- 1. Strip "AFSL " prefix
UPDATE public.professionals
  SET afsl_number = REGEXP_REPLACE(afsl_number, '^AFSL\s*', '')
  WHERE afsl_number LIKE 'AFSL %';

-- 2. Strip spaces from ABN
UPDATE public.professionals
  SET abn = REPLACE(abn, ' ', '')
  WHERE abn IS NOT NULL AND abn LIKE '% %';

-- 3. Legacy verified rows inherit verification_method='seeded_data'
UPDATE public.professionals
  SET verification_method = 'seeded_data'
  WHERE verified = true AND verification_method IS NULL;

-- 4. Revoke verified flag on profile-score=0 rows (incomplete seeds)
UPDATE public.professionals
  SET verified = false,
      verification_notes = COALESCE(verification_notes, '') ||
        CASE WHEN verification_notes IS NULL OR verification_notes = '' THEN '' ELSE E'\n' END ||
        '2026-05-11: auto-unverified because profile_score=0'
  WHERE profile_score = 0 AND verified = true;

-- 5. Enable bookings where a booking link exists (Task 4)
UPDATE public.professionals
  SET booking_enabled = true
  WHERE booking_link IS NOT NULL
    AND booking_link <> ''
    AND booking_enabled IS NOT TRUE
    AND status = 'active';
