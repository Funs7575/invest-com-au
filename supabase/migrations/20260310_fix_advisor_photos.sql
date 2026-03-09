-- Migration: Set branded photo_url for all advisors with NULL photo_url
-- Uses ui-avatars.com with invest.com.au brand purple (#7c3aed)
-- Idempotent: only updates rows where photo_url IS NULL

-- Part 1: Set photo_url for all known advisors by slug
UPDATE professionals
SET photo_url = CASE slug
  WHEN 'james-wong-sydney' THEN 'https://ui-avatars.com/api/?name=James+Wong&background=7c3aed&color=fff&size=200&bold=true'
  WHEN 'maria-papadopoulos-sydney' THEN 'https://ui-avatars.com/api/?name=Maria+Papadopoulos&background=7c3aed&color=fff&size=200&bold=true'
  WHEN 'raj-patel-sydney' THEN 'https://ui-avatars.com/api/?name=Raj+Patel&background=7c3aed&color=fff&size=200&bold=true'
  WHEN 'sophie-laurent-sydney' THEN 'https://ui-avatars.com/api/?name=Sophie+Laurent&background=7c3aed&color=fff&size=200&bold=true'
  WHEN 'michael-oconnor-sydney' THEN 'https://ui-avatars.com/api/?name=Michael+O''Connor&background=7c3aed&color=fff&size=200&bold=true'
  WHEN 'helen-tran-sydney' THEN 'https://ui-avatars.com/api/?name=Helen+Tran&background=7c3aed&color=fff&size=200&bold=true'
  WHEN 'david-kowalski-sydney' THEN 'https://ui-avatars.com/api/?name=David+Kowalski&background=7c3aed&color=fff&size=200&bold=true'
  WHEN 'anthony-nguyen-sydney' THEN 'https://ui-avatars.com/api/?name=Anthony+Nguyen&background=7c3aed&color=fff&size=200&bold=true'
  WHEN 'emma-richardson-sydney' THEN 'https://ui-avatars.com/api/?name=Emma+Richardson&background=7c3aed&color=fff&size=200&bold=true'
  WHEN 'daniel-stavros-sydney' THEN 'https://ui-avatars.com/api/?name=Daniel+Stavros&background=7c3aed&color=fff&size=200&bold=true'
  WHEN 'fatima-hassan-sydney' THEN 'https://ui-avatars.com/api/?name=Fatima+Hassan&background=7c3aed&color=fff&size=200&bold=true'
  WHEN 'margaret-campbell-sydney' THEN 'https://ui-avatars.com/api/?name=Margaret+Campbell&background=7c3aed&color=fff&size=200&bold=true'
  WHEN 'chris-murphy-sydney' THEN 'https://ui-avatars.com/api/?name=Chris+Murphy&background=7c3aed&color=fff&size=200&bold=true'
  WHEN 'wei-chen-sydney' THEN 'https://ui-avatars.com/api/?name=Wei+Chen&background=7c3aed&color=fff&size=200&bold=true'
  WHEN 'luke-thompson-sydney' THEN 'https://ui-avatars.com/api/?name=Luke+Thompson&background=7c3aed&color=fff&size=200&bold=true'
  WHEN 'olivia-martinez-melbourne' THEN 'https://ui-avatars.com/api/?name=Olivia+Martinez&background=7c3aed&color=fff&size=200&bold=true'
  WHEN 'george-papadimitriou-melbourne' THEN 'https://ui-avatars.com/api/?name=George+Papadimitriou&background=7c3aed&color=fff&size=200&bold=true'
  WHEN 'anita-desai-melbourne' THEN 'https://ui-avatars.com/api/?name=Anita+Desai&background=7c3aed&color=fff&size=200&bold=true'
  WHEN 'tom-fitzgerald-melbourne' THEN 'https://ui-avatars.com/api/?name=Tom+Fitzgerald&background=7c3aed&color=fff&size=200&bold=true'
  WHEN 'victoria-aldridge-melbourne' THEN 'https://ui-avatars.com/api/?name=Victoria+Aldridge&background=7c3aed&color=fff&size=200&bold=true'
  WHEN 'sam-ibrahim-melbourne' THEN 'https://ui-avatars.com/api/?name=Sam+Ibrahim&background=7c3aed&color=fff&size=200&bold=true'
  WHEN 'alexander-reid-melbourne' THEN 'https://ui-avatars.com/api/?name=Alexander+Reid&background=7c3aed&color=fff&size=200&bold=true'
  WHEN 'nina-volkov-melbourne' THEN 'https://ui-avatars.com/api/?name=Nina+Volkov&background=7c3aed&color=fff&size=200&bold=true'
  WHEN 'liam-chen-melbourne' THEN 'https://ui-avatars.com/api/?name=Liam+Chen&background=7c3aed&color=fff&size=200&bold=true'
  WHEN 'jenny-le-melbourne' THEN 'https://ui-avatars.com/api/?name=Jenny+Le&background=7c3aed&color=fff&size=200&bold=true'
  WHEN 'patricia-wright-melbourne' THEN 'https://ui-avatars.com/api/?name=Patricia+Wright&background=7c3aed&color=fff&size=200&bold=true'
  WHEN 'nick-constantine-melbourne' THEN 'https://ui-avatars.com/api/?name=Nick+Constantine&background=7c3aed&color=fff&size=200&bold=true'
  WHEN 'ben-walker-brisbane' THEN 'https://ui-avatars.com/api/?name=Ben+Walker&background=7c3aed&color=fff&size=200&bold=true'
  WHEN 'karen-li-brisbane' THEN 'https://ui-avatars.com/api/?name=Karen+Li&background=7c3aed&color=fff&size=200&bold=true'
  WHEN 'josh-anderson-brisbane' THEN 'https://ui-avatars.com/api/?name=Josh+Anderson&background=7c3aed&color=fff&size=200&bold=true'
  WHEN 'rachel-green-brisbane' THEN 'https://ui-avatars.com/api/?name=Rachel+Green&background=7c3aed&color=fff&size=200&bold=true'
  WHEN 'stuart-mackenzie-brisbane' THEN 'https://ui-avatars.com/api/?name=Stuart+Mackenzie&background=7c3aed&color=fff&size=200&bold=true'
  WHEN 'tanya-russo-brisbane' THEN 'https://ui-avatars.com/api/?name=Tanya+Russo&background=7c3aed&color=fff&size=200&bold=true'
  WHEN 'hassan-ali-brisbane' THEN 'https://ui-avatars.com/api/?name=Hassan+Ali&background=7c3aed&color=fff&size=200&bold=true'
  WHEN 'diana-zhou-brisbane' THEN 'https://ui-avatars.com/api/?name=Diana+Zhou&background=7c3aed&color=fff&size=200&bold=true'
  WHEN 'andrew-mitchell-perth' THEN 'https://ui-avatars.com/api/?name=Andrew+Mitchell&background=7c3aed&color=fff&size=200&bold=true'
  WHEN 'lisa-tan-perth' THEN 'https://ui-avatars.com/api/?name=Lisa+Tan&background=7c3aed&color=fff&size=200&bold=true'
  WHEN 'ryan-kelly-perth' THEN 'https://ui-avatars.com/api/?name=Ryan+Kelly&background=7c3aed&color=fff&size=200&bold=true'
  WHEN 'deepak-sharma-perth' THEN 'https://ui-avatars.com/api/?name=Deepak+Sharma&background=7c3aed&color=fff&size=200&bold=true'
  WHEN 'jessica-harris-perth' THEN 'https://ui-avatars.com/api/?name=Jessica+Harris&background=7c3aed&color=fff&size=200&bold=true'
  WHEN 'peter-rossi-adelaide' THEN 'https://ui-avatars.com/api/?name=Peter+Rossi&background=7c3aed&color=fff&size=200&bold=true'
  WHEN 'sarah-campbell-adelaide' THEN 'https://ui-avatars.com/api/?name=Sarah+Campbell&background=7c3aed&color=fff&size=200&bold=true'
  WHEN 'mark-katsaros-adelaide' THEN 'https://ui-avatars.com/api/?name=Mark+Katsaros&background=7c3aed&color=fff&size=200&bold=true'
  WHEN 'catherine-singh-adelaide' THEN 'https://ui-avatars.com/api/?name=Catherine+Singh&background=7c3aed&color=fff&size=200&bold=true'
  WHEN 'robert-jenkins-canberra' THEN 'https://ui-avatars.com/api/?name=Robert+Jenkins&background=7c3aed&color=fff&size=200&bold=true'
  WHEN 'elena-petrov-canberra' THEN 'https://ui-avatars.com/api/?name=Elena+Petrov&background=7c3aed&color=fff&size=200&bold=true'
  WHEN 'philip-chang-canberra' THEN 'https://ui-avatars.com/api/?name=Philip+Chang&background=7c3aed&color=fff&size=200&bold=true'
  WHEN 'amanda-jones-hobart' THEN 'https://ui-avatars.com/api/?name=Amanda+Jones&background=7c3aed&color=fff&size=200&bold=true'
  WHEN 'nathan-williams-hobart' THEN 'https://ui-avatars.com/api/?name=Nathan+Williams&background=7c3aed&color=fff&size=200&bold=true'
  WHEN 'steve-hall-goldcoast' THEN 'https://ui-avatars.com/api/?name=Steve+Hall&background=7c3aed&color=fff&size=200&bold=true'
  WHEN 'tina-nguyen-goldcoast' THEN 'https://ui-avatars.com/api/?name=Tina+Nguyen&background=7c3aed&color=fff&size=200&bold=true'
  WHEN 'marco-santos-darwin' THEN 'https://ui-avatars.com/api/?name=Marco+Santos&background=7c3aed&color=fff&size=200&bold=true'
  WHEN 'laura-smith-newcastle' THEN 'https://ui-avatars.com/api/?name=Laura+Smith&background=7c3aed&color=fff&size=200&bold=true'
  WHEN 'bruce-taylor-wollongong' THEN 'https://ui-avatars.com/api/?name=Bruce+Taylor&background=7c3aed&color=fff&size=200&bold=true'
  WHEN 'zac-miller-sunshinecoast' THEN 'https://ui-avatars.com/api/?name=Zac+Miller&background=7c3aed&color=fff&size=200&bold=true'
  ELSE photo_url
END
WHERE photo_url IS NULL;

-- Part 2: Catch-all for any advisors not listed above
-- Generates a photo_url from the advisor name dynamically
UPDATE professionals
SET photo_url = 'https://ui-avatars.com/api/?name=' || REPLACE(name, ' ', '+') || '&background=7c3aed&color=fff&size=200&bold=true'
WHERE photo_url IS NULL;

