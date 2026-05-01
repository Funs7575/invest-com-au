-- ============================================================================
-- Migration: 20260329_update_advisor_photos_portraits.sql
-- Purpose: Update `professionals.photo_url` to point at randomuser.me
--          portrait photos for 54 seeded advisor profiles, replacing
--          earlier placeholder URLs.
-- Rollback: NULL out photo_url for the 54 advisor slugs touched
--           (returns the rows to "no headshot" state). The original
--           pre-seed URLs are not preserved by this migration so a
--           true revert to the prior values requires a snapshot.
-- Risk: medium — these are mock/seeded advisor rows used for the
--       advisor directory UI. Reverse blanks every headshot, breaking
--       portrait rendering on /find-advisor/* until reseeded. If
--       operators have replaced any of these slugs with real-advisor
--       photos since this migration ran, the reverse will also clear
--       those production URLs — inspect live row state before reverse.
-- ============================================================================
--
-- Forward operations:
--   1-54. UPDATE professionals SET photo_url = '<randomuser.me URL>'
--           WHERE slug = '<one of 54 city-prefixed advisor slugs>'.
--           Slugs (in file order): james-wong-sydney,
--           maria-papadopoulos-sydney, raj-patel-sydney,
--           sophie-laurent-sydney, michael-oconnor-sydney,
--           helen-tran-sydney, david-kowalski-sydney,
--           anthony-nguyen-sydney, emma-richardson-sydney,
--           daniel-stavros-sydney, fatima-hassan-sydney,
--           margaret-campbell-sydney, chris-murphy-sydney,
--           wei-chen-sydney, luke-thompson-sydney,
--           olivia-martinez-melbourne, george-papadimitriou-melbourne,
--           anita-desai-melbourne, tom-fitzgerald-melbourne,
--           victoria-aldridge-melbourne, sam-ibrahim-melbourne,
--           alexander-reid-melbourne, nina-volkov-melbourne,
--           liam-chen-melbourne, jenny-le-melbourne,
--           patricia-wright-melbourne, nick-constantine-melbourne,
--           ben-walker-brisbane, karen-li-brisbane,
--           josh-anderson-brisbane, rachel-green-brisbane,
--           stuart-mackenzie-brisbane, tanya-russo-brisbane,
--           hassan-ali-brisbane, diana-zhou-brisbane,
--           andrew-mitchell-perth, lisa-tan-perth, ryan-kelly-perth,
--           deepak-sharma-perth, jessica-harris-perth,
--           peter-rossi-adelaide, sarah-campbell-adelaide,
--           mark-katsaros-adelaide, catherine-singh-adelaide,
--           robert-jenkins-canberra, elena-petrov-canberra,
--           philip-chang-canberra, amanda-jones-hobart,
--           nathan-williams-hobart, steve-hall-goldcoast,
--           tina-nguyen-goldcoast, marco-santos-darwin,
--           laura-smith-newcastle, bruce-taylor-wollongong,
--           zac-miller-sunshinecoast.
--
-- Rollback (in reverse order):
--   1. UPDATE professionals SET photo_url = NULL
--        WHERE slug IN (
--          'zac-miller-sunshinecoast', 'bruce-taylor-wollongong',
--          'laura-smith-newcastle', 'marco-santos-darwin',
--          'tina-nguyen-goldcoast', 'steve-hall-goldcoast',
--          'nathan-williams-hobart', 'amanda-jones-hobart',
--          'philip-chang-canberra', 'elena-petrov-canberra',
--          'robert-jenkins-canberra', 'catherine-singh-adelaide',
--          'mark-katsaros-adelaide', 'sarah-campbell-adelaide',
--          'peter-rossi-adelaide', 'jessica-harris-perth',
--          'deepak-sharma-perth', 'ryan-kelly-perth', 'lisa-tan-perth',
--          'andrew-mitchell-perth', 'diana-zhou-brisbane',
--          'hassan-ali-brisbane', 'tanya-russo-brisbane',
--          'stuart-mackenzie-brisbane', 'rachel-green-brisbane',
--          'josh-anderson-brisbane', 'karen-li-brisbane',
--          'ben-walker-brisbane', 'nick-constantine-melbourne',
--          'patricia-wright-melbourne', 'jenny-le-melbourne',
--          'liam-chen-melbourne', 'nina-volkov-melbourne',
--          'alexander-reid-melbourne', 'sam-ibrahim-melbourne',
--          'victoria-aldridge-melbourne', 'tom-fitzgerald-melbourne',
--          'anita-desai-melbourne', 'george-papadimitriou-melbourne',
--          'olivia-martinez-melbourne', 'luke-thompson-sydney',
--          'wei-chen-sydney', 'chris-murphy-sydney',
--          'margaret-campbell-sydney', 'fatima-hassan-sydney',
--          'daniel-stavros-sydney', 'emma-richardson-sydney',
--          'anthony-nguyen-sydney', 'david-kowalski-sydney',
--          'helen-tran-sydney', 'michael-oconnor-sydney',
--          'sophie-laurent-sydney', 'raj-patel-sydney',
--          'maria-papadopoulos-sydney', 'james-wong-sydney'
--        );
--      -- DESTRUCTIVE: blanks 54 advisor headshots; clears any
--      -- operator-replaced URLs on those rows too.
-- ============================================================================

-- Migration: Update advisor photo URLs to realistic portrait photos
-- Uses randomuser.me API portraits for professional-looking headshots
-- Runs idempotently: updates all existing advisors by slug

UPDATE professionals SET photo_url = 'https://randomuser.me/api/portraits/men/10.jpg'   WHERE slug = 'james-wong-sydney';
UPDATE professionals SET photo_url = 'https://randomuser.me/api/portraits/women/5.jpg'  WHERE slug = 'maria-papadopoulos-sydney';
UPDATE professionals SET photo_url = 'https://randomuser.me/api/portraits/men/32.jpg'   WHERE slug = 'raj-patel-sydney';
UPDATE professionals SET photo_url = 'https://randomuser.me/api/portraits/women/15.jpg' WHERE slug = 'sophie-laurent-sydney';
UPDATE professionals SET photo_url = 'https://randomuser.me/api/portraits/men/45.jpg'   WHERE slug = 'michael-oconnor-sydney';
UPDATE professionals SET photo_url = 'https://randomuser.me/api/portraits/women/25.jpg' WHERE slug = 'helen-tran-sydney';
UPDATE professionals SET photo_url = 'https://randomuser.me/api/portraits/men/55.jpg'   WHERE slug = 'david-kowalski-sydney';
UPDATE professionals SET photo_url = 'https://randomuser.me/api/portraits/men/65.jpg'   WHERE slug = 'anthony-nguyen-sydney';
UPDATE professionals SET photo_url = 'https://randomuser.me/api/portraits/women/12.jpg' WHERE slug = 'emma-richardson-sydney';
UPDATE professionals SET photo_url = 'https://randomuser.me/api/portraits/men/72.jpg'   WHERE slug = 'daniel-stavros-sydney';
UPDATE professionals SET photo_url = 'https://randomuser.me/api/portraits/women/32.jpg' WHERE slug = 'fatima-hassan-sydney';
UPDATE professionals SET photo_url = 'https://randomuser.me/api/portraits/women/45.jpg' WHERE slug = 'margaret-campbell-sydney';
UPDATE professionals SET photo_url = 'https://randomuser.me/api/portraits/men/5.jpg'    WHERE slug = 'chris-murphy-sydney';
UPDATE professionals SET photo_url = 'https://randomuser.me/api/portraits/women/55.jpg' WHERE slug = 'wei-chen-sydney';
UPDATE professionals SET photo_url = 'https://randomuser.me/api/portraits/men/80.jpg'   WHERE slug = 'luke-thompson-sydney';
UPDATE professionals SET photo_url = 'https://randomuser.me/api/portraits/women/20.jpg' WHERE slug = 'olivia-martinez-melbourne';
UPDATE professionals SET photo_url = 'https://randomuser.me/api/portraits/men/15.jpg'   WHERE slug = 'george-papadimitriou-melbourne';
UPDATE professionals SET photo_url = 'https://randomuser.me/api/portraits/women/60.jpg' WHERE slug = 'anita-desai-melbourne';
UPDATE professionals SET photo_url = 'https://randomuser.me/api/portraits/men/25.jpg'   WHERE slug = 'tom-fitzgerald-melbourne';
UPDATE professionals SET photo_url = 'https://randomuser.me/api/portraits/women/70.jpg' WHERE slug = 'victoria-aldridge-melbourne';
UPDATE professionals SET photo_url = 'https://randomuser.me/api/portraits/men/40.jpg'   WHERE slug = 'sam-ibrahim-melbourne';
UPDATE professionals SET photo_url = 'https://randomuser.me/api/portraits/men/50.jpg'   WHERE slug = 'alexander-reid-melbourne';
UPDATE professionals SET photo_url = 'https://randomuser.me/api/portraits/women/38.jpg' WHERE slug = 'nina-volkov-melbourne';
UPDATE professionals SET photo_url = 'https://randomuser.me/api/portraits/men/60.jpg'   WHERE slug = 'liam-chen-melbourne';
UPDATE professionals SET photo_url = 'https://randomuser.me/api/portraits/women/48.jpg' WHERE slug = 'jenny-le-melbourne';
UPDATE professionals SET photo_url = 'https://randomuser.me/api/portraits/women/80.jpg' WHERE slug = 'patricia-wright-melbourne';
UPDATE professionals SET photo_url = 'https://randomuser.me/api/portraits/men/70.jpg'   WHERE slug = 'nick-constantine-melbourne';
UPDATE professionals SET photo_url = 'https://randomuser.me/api/portraits/men/22.jpg'   WHERE slug = 'ben-walker-brisbane';
UPDATE professionals SET photo_url = 'https://randomuser.me/api/portraits/women/8.jpg'  WHERE slug = 'karen-li-brisbane';
UPDATE professionals SET photo_url = 'https://randomuser.me/api/portraits/men/75.jpg'   WHERE slug = 'josh-anderson-brisbane';
UPDATE professionals SET photo_url = 'https://randomuser.me/api/portraits/women/18.jpg' WHERE slug = 'rachel-green-brisbane';
UPDATE professionals SET photo_url = 'https://randomuser.me/api/portraits/men/85.jpg'   WHERE slug = 'stuart-mackenzie-brisbane';
UPDATE professionals SET photo_url = 'https://randomuser.me/api/portraits/women/28.jpg' WHERE slug = 'tanya-russo-brisbane';
UPDATE professionals SET photo_url = 'https://randomuser.me/api/portraits/men/90.jpg'   WHERE slug = 'hassan-ali-brisbane';
UPDATE professionals SET photo_url = 'https://randomuser.me/api/portraits/women/42.jpg' WHERE slug = 'diana-zhou-brisbane';
UPDATE professionals SET photo_url = 'https://randomuser.me/api/portraits/men/8.jpg'    WHERE slug = 'andrew-mitchell-perth';
UPDATE professionals SET photo_url = 'https://randomuser.me/api/portraits/women/52.jpg' WHERE slug = 'lisa-tan-perth';
UPDATE professionals SET photo_url = 'https://randomuser.me/api/portraits/men/18.jpg'   WHERE slug = 'ryan-kelly-perth';
UPDATE professionals SET photo_url = 'https://randomuser.me/api/portraits/men/35.jpg'   WHERE slug = 'deepak-sharma-perth';
UPDATE professionals SET photo_url = 'https://randomuser.me/api/portraits/women/62.jpg' WHERE slug = 'jessica-harris-perth';
UPDATE professionals SET photo_url = 'https://randomuser.me/api/portraits/men/95.jpg'   WHERE slug = 'peter-rossi-adelaide';
UPDATE professionals SET photo_url = 'https://randomuser.me/api/portraits/women/72.jpg' WHERE slug = 'sarah-campbell-adelaide';
UPDATE professionals SET photo_url = 'https://randomuser.me/api/portraits/men/28.jpg'   WHERE slug = 'mark-katsaros-adelaide';
UPDATE professionals SET photo_url = 'https://randomuser.me/api/portraits/women/82.jpg' WHERE slug = 'catherine-singh-adelaide';
UPDATE professionals SET photo_url = 'https://randomuser.me/api/portraits/men/48.jpg'   WHERE slug = 'robert-jenkins-canberra';
UPDATE professionals SET photo_url = 'https://randomuser.me/api/portraits/women/35.jpg' WHERE slug = 'elena-petrov-canberra';
UPDATE professionals SET photo_url = 'https://randomuser.me/api/portraits/men/58.jpg'   WHERE slug = 'philip-chang-canberra';
UPDATE professionals SET photo_url = 'https://randomuser.me/api/portraits/women/90.jpg' WHERE slug = 'amanda-jones-hobart';
UPDATE professionals SET photo_url = 'https://randomuser.me/api/portraits/men/68.jpg'   WHERE slug = 'nathan-williams-hobart';
UPDATE professionals SET photo_url = 'https://randomuser.me/api/portraits/men/78.jpg'   WHERE slug = 'steve-hall-goldcoast';
UPDATE professionals SET photo_url = 'https://randomuser.me/api/portraits/women/65.jpg' WHERE slug = 'tina-nguyen-goldcoast';
UPDATE professionals SET photo_url = 'https://randomuser.me/api/portraits/men/88.jpg'   WHERE slug = 'marco-santos-darwin';
UPDATE professionals SET photo_url = 'https://randomuser.me/api/portraits/women/75.jpg' WHERE slug = 'laura-smith-newcastle';
UPDATE professionals SET photo_url = 'https://randomuser.me/api/portraits/men/3.jpg'    WHERE slug = 'bruce-taylor-wollongong';
UPDATE professionals SET photo_url = 'https://randomuser.me/api/portraits/men/13.jpg'   WHERE slug = 'zac-miller-sunshinecoast';
