-- ============================================================
-- Seed 15 oil-gas editorial articles.
--
-- Idempotent: ON CONFLICT (slug) DO NOTHING — if an article
-- already exists with the same slug, the insert is a no-op.
-- To refresh content, update by slug manually.
-- ============================================================

INSERT INTO public.articles (
  title, slug, excerpt, category, content_type,
  sections, tags, read_time, evergreen, published_at,
  related_verticals, related_advisor_types, status,
  author_name, author_title
) VALUES
-- ───────────────────────────────────────────────────────────
-- 1. Woodside (WDS) deep dive
-- ───────────────────────────────────────────────────────────
(
  'Woodside Energy (WDS): How Australia''s Largest Oil & Gas Producer Actually Makes Money',
  'woodside-energy-wds-how-it-makes-money',
  'A plain-English walk through Woodside''s revenue mix — North West Shelf, Pluto, Scarborough, Sangomar — and what that means for its dividend, PRRT exposure, and sensitivity to Brent.',
  'oil-gas',
  'guide',
  $json$[
    {"heading":"Woodside at a glance","body":"Woodside Energy Group (ASX: WDS) is Australia''s largest integrated oil and gas producer. After the 2022 merger with BHP''s petroleum business, the group sits around the A$55B market-cap mark and is one of the ASX 50''s largest dividend-paying stocks on a fully franked basis.\n\nThe business is unusually concentrated on LNG: roughly three-quarters of revenue comes from LNG sales priced against a mix of JKM, oil-linked contracts, and term supply agreements. The rest is oil (Sangomar in Senegal, Pyrenees in WA) and a small domestic gas business."},
    {"heading":"Where the money comes from","body":"Five assets do almost all of the work. North West Shelf (NWS) is the oldest and has been the cash cow for 30+ years — expect volumes to taper through the late-2020s as reserves deplete. Pluto LNG is a single-train facility that has been the highest-margin asset in the portfolio. Scarborough is the growth project — first LNG in 2026, processed through a second Pluto train, positioned to replace NWS cashflow. Sangomar adds oil exposure and geographic diversification. Trinidad completes the picture with lower-margin legacy gas."},
    {"heading":"How to read a Woodside result","body":"Two numbers explain most of the share-price reaction: realised LNG price per mmBTU and unit production cost. A US$1 move in realised LNG price flows almost dollar-for-dollar to operating profit at current volumes. Everything else — FX, depreciation, hedging, tax — is secondary.\n\nAnalysts watch the LNG Japan-Korea-Marker (JKM) as the spot benchmark but Woodside''s portfolio is mostly oil-linked contracts with a 3-month lag, so today''s JKM is a poor predictor of this quarter''s realised price."},
    {"heading":"The dividend story","body":"Woodside pays out 50-80% of underlying net profit. Dividends are fully franked — a material advantage for Australian resident shareholders and a non-issue for non-residents (franking credits do not refund to non-residents). Yields of 6-10% fully franked have been typical at recent prices.\n\nTwo things can disrupt the dividend: a sharp oil price fall (reduces earnings) or a large capex program (reduces payout ratio). Scarborough is the current capex cycle — watch free cash flow converted to dividend, not just EPS."},
    {"heading":"Tax and PRRT","body":"PRRT — the federal petroleum resource rent tax — is the hidden complication. PRRT is levied on project profits after recouping cumulative costs uplifted at a prescribed rate. Until a project has recouped its historic costs it pays no PRRT. Once it does, PRRT can materially compress dividends even when oil prices are strong. Scarborough and Pluto are newer projects with large uplifted cost pools — they are likely to shield cash for several more years. NWS is mature and PRRT-paying."},
    {"heading":"Who should own Woodside","body":"Woodside fits Australian resident dividend investors who want fully franked yield with a cyclical commodity overlay; retirees inside SMSF pensions where franking refunds are valuable; and non-residents using the Section 855-10 portfolio CGT exemption on a <10% holding.\n\nIt does not fit investors needing stable yield regardless of commodity cycle — Woodside is an oil-linked name and its dividend will compress in oil downturns. Concentrated ex-employee shareholders should consult an energy-focused financial planner before holding >30% of net worth in a single name."}
  ]$json$::jsonb,
  $json$["woodside","WDS","LNG","PRRT","ASX energy","dividends","franking credits","oil-gas"]$json$::jsonb,
  8, true, NOW(),
  ARRAY['oil-gas'], ARRAY['energy_financial_planner','stockbroker_firm']::text[],
  'published',
  'Market Research Team', 'Invest.com.au'
),

-- ───────────────────────────────────────────────────────────
-- 2. Santos vs Woodside
-- ───────────────────────────────────────────────────────────
(
  'Santos (STO) vs Woodside (WDS): Two Majors, Two Very Different Bets',
  'santos-sto-vs-woodside-wds-comparison',
  'Santos and Woodside look similar on the surface. Their portfolios, growth pipelines, and PRRT profiles tell a very different story.',
  'oil-gas',
  'comparison',
  $json$[
    {"heading":"Same sector, different businesses","body":"From a broker''s sector dropdown Woodside and Santos are both ''Australian oil & gas''. From a portfolio construction perspective they''re about as similar as Commonwealth Bank and Macquarie — same industry, fundamentally different revenue drivers, growth profiles, and risk.\n\nWoodside is 75%+ LNG-leveraged, heavily concentrated on Western Australia, and mature. Santos has a much more diversified portfolio: GLNG (Queensland CSG-to-LNG), PNG LNG (19% stake in the ExxonMobil-operated venture), Cooper Basin legacy gas, Bayu-Undan (Timor-Leste), and the Barossa growth project. Roughly half LNG, the rest oil and domestic gas."},
    {"heading":"The growth axis","body":"Santos is deeper into its capex cycle. Barossa (first gas 2026) and Pikka Phase 1 in Alaska are both large, committed projects. Free cash flow is consequently lower today with the promise of recovery once both projects ramp. Woodside has largely completed the heavy Scarborough spend and is starting to see the cash-flow recovery play out.\n\nWhich is the better bet depends on whether you believe 2027-28 LNG prices will hold. If yes, Santos has operational leverage. If no, Woodside''s more mature cashflow is safer."},
    {"heading":"Dividend profile","body":"Woodside has historically paid a higher yield than Santos — typically 6-10% vs 3-6% — mostly because Santos has reinvested cashflow into Barossa and Pikka. Both dividends are fully franked.\n\nFor income-focused investors, Woodside is the obvious choice. For total-return investors betting on successful project execution, Santos offers more upside if things go well and more downside if they don''t."},
    {"heading":"PRRT and tax","body":"PRRT incidence differs meaningfully between the two. Santos''s GLNG and Barossa projects are newer with large uplifted cost pools — low PRRT for years. Woodside''s NWS is PRRT-paying; Scarborough is not yet. Both are disclosing effective tax rates in the 35-45% range including PRRT.\n\nIf PRRT policy changes — a live 2024-26 discussion — it affects both names but more acutely affects the PRRT-paying legacy assets."},
    {"heading":"Commodity and FX exposure","body":"Both companies sell primarily into Asian LNG markets in USD. A 10c move in AUD/USD moves revenue by roughly 10% in AUD terms — meaningful. Both hedge a portion of production but neither hedges multi-year forward at scale.\n\nOil-linked vs spot exposure differs: Woodside has longer-dated oil-linked LNG contracts, Santos has more direct oil (Pikka, Barossa) and spot LNG through GLNG portfolio sales."},
    {"heading":"How to choose","body":"Income-focused retiree or SMSF pension: Woodside, for the higher fully franked yield and mature asset base.\n\nTotal-return, 5-year-plus view on successful project execution: Santos, for the operational leverage to Barossa and Pikka.\n\nMany Australian portfolios hold both — they correlate at ~0.8-0.9, so pair-holding is mostly a stock-picking bet rather than diversification. A specialist advisor can size the blend against your existing sector exposure."}
  ]$json$::jsonb,
  $json$["Woodside","Santos","WDS","STO","ASX","LNG","dividends","oil-gas"]$json$::jsonb,
  7, true, NOW(),
  ARRAY['oil-gas'], ARRAY['energy_financial_planner','stockbroker_firm']::text[],
  'published',
  'Market Research Team', 'Invest.com.au'
),

-- ───────────────────────────────────────────────────────────
-- 3. Viva Energy deep dive
-- ───────────────────────────────────────────────────────────
(
  'Viva Energy (VEA): Investing in One of Australia''s Last Two Refineries',
  'viva-energy-vea-investing-guide',
  'Viva Energy operates the Geelong refinery and ~1,340 Shell-branded sites. The FSSP extension to 2030 changes everything about the investment thesis.',
  'oil-gas',
  'guide',
  $json$[
    {"heading":"Why Viva is different from Woodside or Santos","body":"Woodside and Santos are upstream producers — they pull oil and gas out of the ground. Viva Energy (ASX: VEA) is downstream — it takes crude oil and refines it into petrol, diesel, jet fuel and bitumen. The economics are fundamentally different. Upstream producers are leveraged to commodity prices; downstream refiners are leveraged to refining margins (the ''crack spread'') and utilisation.\n\nViva owns the Geelong refinery in Victoria — one of only two remaining domestic refineries — and operates a national network of ~1,340 Shell and Coles Express-branded retail sites."},
    {"heading":"The FSSP subsidy","body":"The Fuel Security Services Payment (FSSP) is a federal payment to the two surviving domestic refineries — Geelong (Viva) and Lytton (Ampol) — designed to keep them running for fuel security reasons. The scheme has been extended to 2030. Payments scale with refinery output: the more Geelong processes, the higher Viva''s FSSP revenue.\n\nBefore FSSP, Australian refining was structurally unprofitable — the BP Kwinana and ExxonMobil Altona closures in 2020-21 demonstrated this. FSSP is the reason Viva is investable today."},
    {"heading":"Refining margins","body":"The Singapore complex refining margin and the Asian gasoline-diesel crack spread are the two numbers that drive the refining segment''s earnings. When regional refining capacity is tight (such as in 2022-23), Viva''s refining segment earns outsized profits. When capacity is ample, margins compress.\n\nFSSP acts as a floor — even at weak crack spreads Geelong doesn''t lose money at the operating level. But it is not a ceiling: in strong margin environments Viva captures the full upside."},
    {"heading":"Retail and commercial","body":"The retail network is a quite different business. Margins come from convenience store sales (higher gross margin than fuel itself), and from the structural fact that fuel retail is a scale game — 1,340 sites is more than any competitor aside from Ampol.\n\nA quiet growth story is the Coles Express co-branding arrangement, which has brought grocery-format convenience retail onto Viva sites. AmpCharge-style EV charging investment is smaller at Viva than Ampol but is building."},
    {"heading":"Dividend and balance sheet","body":"Viva pays a mostly-franked dividend, typically in the 4-7% range. The balance sheet is conservative (net debt/EBITDA under 1x in most years) with the refinery and site portfolio providing a stable asset backing.\n\nFSSP extension to 2030 gives the dividend a durable underpin — but also raises a policy-cliff risk for investors modelling beyond 2030. Any scenario where FSSP is wound back at that point would materially impact refining earnings."},
    {"heading":"Investor fit","body":"Viva fits domestic-focused income investors who want exposure to Australian fuel consumption without taking oil-price directional risk; and thematic investors with a view on Australian energy security policy. It does not fit investors seeking pure oil-price leverage (that''s Woodside/Santos/Karoon territory) or ESG-constrained mandates that exclude refining.\n\nThe FSSP renewal debate in 2029-30 will be the key political and regulatory event to watch over the holding period."}
  ]$json$::jsonb,
  $json$["Viva Energy","VEA","refining","FSSP","Geelong","crack spread","oil-gas"]$json$::jsonb,
  7, true, NOW(),
  ARRAY['oil-gas'], ARRAY['energy_financial_planner','stockbroker_firm']::text[],
  'published',
  'Market Research Team', 'Invest.com.au'
),

-- ───────────────────────────────────────────────────────────
-- 4. Ampol (ALD)
-- ───────────────────────────────────────────────────────────
(
  'Ampol (ALD): From Fuel Retailer to Energy Transition Play',
  'ampol-ald-energy-transition-investment',
  'Ampol runs the Lytton refinery and ~1,900 branded retail sites. Its AmpCharge EV network and on-site renewables investment is reshaping the investment thesis.',
  'oil-gas',
  'guide',
  $json$[
    {"heading":"Ampol at a glance","body":"Ampol (ASX: ALD) is Australia''s largest transport fuels supplier. Two businesses make up almost all of earnings: the Lytton refinery in Brisbane (one of the two remaining domestic refineries, alongside Viva''s Geelong), and a retail and commercial network of around 1,900 branded sites nationally.\n\nCompared to Viva, Ampol is slightly larger on the retail footprint, similar scale on refining output, and somewhat more diversified internationally via Z Energy in New Zealand."},
    {"heading":"The Lytton refinery","body":"Lytton processes around 109,000 barrels of crude per day. Like Viva''s Geelong, it benefits from the Fuel Security Services Payment extended to 2030 and the Minimum Stockholding Obligation.\n\nLytton''s crude feedstock flexibility is somewhat higher than Geelong — Ampol processes a mix of Middle East, Asia-Pacific and West African crudes depending on spreads. This operational lever is a meaningful earnings driver in most years."},
    {"heading":"AmpCharge and the EV pivot","body":"AmpCharge is Ampol''s branded EV charging network, rolled out on existing fuel retail sites. The thesis: Australian motorists transitioning to EVs will charge at the same convenient locations they already refuel, and the convenience-store margin will continue regardless of whether the customer is buying petrol or electrons.\n\nThe revenue contribution is small today but strategically this is how Ampol reframes itself as an energy transition investment rather than a terminal-value fossil fuel name. Expect accelerating capex through the late-2020s."},
    {"heading":"Z Energy and New Zealand","body":"The 2022 acquisition of Z Energy added ~650 retail sites and a refining interest across the Tasman. It diversified Ampol''s earnings geographically and added NZD revenue, but introduced integration risk and some leverage.\n\nZ has been earning its keep operationally. Watch for capital allocation — if Ampol uses cashflow to pay down integration debt rather than returning it to shareholders, dividend growth slows."},
    {"heading":"Dividend and capital allocation","body":"Ampol has historically paid a higher dividend yield than Viva — typically 5-8% fully franked — but the underlying earnings are more volatile because of the commercial (wholesale fuel) business, which has tighter margins. Capital returns have been lumpy: ordinary dividends plus periodic special dividends and buybacks."},
    {"heading":"How to think about Ampol today","body":"The investment thesis is: (1) FSSP-underpinned refining earnings through 2030, (2) structurally defensive retail and commercial network, (3) growing energy-transition optionality from AmpCharge and renewables partnerships, and (4) franked dividend yield in the 5-8% range through the cycle.\n\nThe stock is a reasonable fit for dividend-focused Australian resident investors who want energy exposure without the oil-price beta of Woodside or Santos. Foreign investors get the Section 855-10 portfolio CGT exemption on ASX-listed shares below 10%."}
  ]$json$::jsonb,
  $json$["Ampol","ALD","refining","FSSP","Lytton","EV charging","AmpCharge","oil-gas"]$json$::jsonb,
  7, true, NOW(),
  ARRAY['oil-gas'], ARRAY['energy_financial_planner','stockbroker_firm']::text[],
  'published',
  'Market Research Team', 'Invest.com.au'
),

-- ───────────────────────────────────────────────────────────
-- 5. Beach Energy (BPT)
-- ───────────────────────────────────────────────────────────
(
  'Beach Energy (BPT): The Case for Mid-Cap Domestic Gas',
  'beach-energy-bpt-domestic-gas-thesis',
  'Beach Energy is smaller and more domestically focused than Woodside or Santos — which is exactly the point.',
  'oil-gas',
  'analysis',
  $json$[
    {"heading":"What Beach is","body":"Beach Energy (ASX: BPT) is a mid-cap Australian oil and gas producer with a market capitalisation around A$3.4B. Its production is focused on the Cooper Basin (SA/QLD), Otway Basin (VIC), Perth Basin (WA) and Taranaki (New Zealand).\n\nCompared to Woodside and Santos, Beach is: smaller, more domestically-gas-focused, with less LNG exposure. Seven Group Holdings (Kerry Stokes interests) holds ~30% — governance and capital allocation reflect that dominant shareholder."},
    {"heading":"Why domestic gas matters","body":"The East Coast domestic gas market has been structurally tight for years. AEMO and ACCC reports consistently flag Victorian supply risk from 2026-27 onwards as Bass Strait depletes. Beach''s Otway Basin and Waitsia (Perth Basin) assets position it to supply into this shortage — directly to industrial customers and via domgas pricing mechanisms.\n\nWaitsia Stage 2 LNG is the current growth project and is expected to underpin cashflow through the late-2020s. This is domestic gas converted to LNG for export through the North West Shelf infrastructure."},
    {"heading":"Why the stock trades at a discount","body":"Beach typically trades at a P/E discount to Woodside and Santos. Reasons: lower liquidity; more exploration risk (juniors and mid-caps write down more); perception of single-shareholder influence; more commodity-price-volatile revenue mix.\n\nThe discount is partially justified by these factors and partially an opportunity for patient investors willing to do the work on the asset base."},
    {"heading":"Dividends","body":"Beach pays a fully franked dividend — yields have ranged 3-6% depending on the commodity cycle. Beach is more willing than the majors to cut dividends during capex cycles (the FY24 result demonstrated this), so the yield is not as reliable as Woodside''s.\n\nFor income-focused investors, Beach works better as a complement to Woodside or Santos than a substitute. Its dividend correlates with the oil-price cycle more than with a defensive domestic-gas earnings stream."},
    {"heading":"Execution risk","body":"Beach''s story has been clouded historically by project delays — Waitsia Stage 2, Cooper Basin field life extensions, Otway Basin drilling campaigns — and reserves downgrades. The management team has been upgraded through 2023-25 and disclosure quality has improved.\n\nProject execution remains the key thing to watch. A clean Waitsia Stage 2 first gas milestone would materially re-rate the stock. A further delay would re-open the execution-risk discount."},
    {"heading":"Who should hold Beach","body":"Beach fits investors building a diversified ASX energy exposure, where Woodside and Santos cover large-cap LNG and Beach adds mid-cap domestic gas upside. Less suited to income-only portfolios given dividend variability; less suited to passive investors because stock-specific execution risk is meaningful.\n\nConsult a resources-sector-specialist financial planner or fund manager before sizing Beach above ~3-5% of total portfolio — the execution-risk profile is higher than the majors."}
  ]$json$::jsonb,
  $json$["Beach Energy","BPT","domestic gas","Cooper Basin","Otway","Waitsia","oil-gas"]$json$::jsonb,
  7, true, NOW(),
  ARRAY['oil-gas'], ARRAY['energy_financial_planner','resources_fund_manager']::text[],
  'published',
  'Market Research Team', 'Invest.com.au'
),

-- ───────────────────────────────────────────────────────────
-- 6. Karoon Energy (KAR)
-- ───────────────────────────────────────────────────────────
(
  'Karoon Energy (KAR): Australian-Listed, Internationally Exposed',
  'karoon-energy-kar-international-oil',
  'Karoon is ASX-listed but its production is entirely offshore — Brazil and the US Gulf. Here''s why that matters for your portfolio.',
  'oil-gas',
  'analysis',
  $json$[
    {"heading":"Karoon is different","body":"Karoon Energy (ASX: KAR) is headquartered in Melbourne and listed in Australia, but its producing assets are entirely offshore — the Baúna field offshore Brazil (acquired from Petrobras in 2020) and the Who Dat field in the US Gulf of Mexico (acquired from LLOG in 2024).\n\nFor Australian investors this is unusual — most ASX energy names derive at least some revenue from Australia. Karoon is effectively a pure-play international oil producer that happens to be listed on the ASX."},
    {"heading":"Pure Brent exposure","body":"Karoon''s Baúna field sells into the Atlantic Basin at Brent-linked pricing. Unlike Woodside and Santos — which have large LNG portfolios with complex pricing — Karoon''s upstream oil is as close to pure Brent as you get on the ASX.\n\nInvestors wanting direct Brent-oil exposure via a dividend-paying equity have few options; Karoon is the cleanest. A 10% Brent move is roughly a 30% earnings move at Karoon given its operational leverage."},
    {"heading":"No PRRT","body":"Because production is offshore of Australia, Karoon is not subject to PRRT. It does pay Brazilian royalties and income tax, and US Gulf royalties and federal income tax — but the PRRT overhang that affects Woodside and Santos simply doesn''t apply.\n\nThis is a quiet but important structural advantage when oil prices are strong. The flipside: Karoon''s effective tax rate is higher than Australian-domiciled operations in weak price environments."},
    {"heading":"Dividends are newer here","body":"Karoon only started paying dividends in 2023. Yield has been lower than Woodside or Santos — typically 2-4% — because the capital-allocation priority has been reinvesting in Baúna and integrating Who Dat.\n\nAs the business matures and Who Dat is fully integrated, dividend growth is a reasonable expectation through 2026-28. But don''t buy Karoon for dividend yield alone — this is a growth-plus-capital-return story, not an income story."},
    {"heading":"FX and sovereign considerations","body":"Brazilian Real and US Dollar revenues translate back to AUD for Australian shareholders. Karoon does not fully hedge FX exposure. The thesis works best when AUD is weak against USD (revenues translate up) and is drag when AUD is strong.\n\nBrazil sovereign risk and US Gulf regulatory risk are real but well-understood. Karoon operates through established frameworks and hasn''t had a major sovereign incident since acquiring Baúna."},
    {"heading":"Fit in an Australian portfolio","body":"Karoon works as the higher-beta oil exposure in an ASX energy portfolio — complementing Woodside (LNG-heavy) and Santos (diversified) with pure international oil. Position sizing should reflect the operational leverage: a 2-4% allocation gives meaningful oil exposure without overwhelming the portfolio.\n\nForeign investors benefit from Section 855-10 CGT exemption the same as any ASX-listed stock below 10%. Resident investors should note the dividend is typically unfranked due to Karoon''s offshore-source income, so franking-credit value is lower than the major domestic producers."}
  ]$json$::jsonb,
  $json$["Karoon Energy","KAR","Brent","Brazil","US Gulf","oil-gas","ASX"]$json$::jsonb,
  7, true, NOW(),
  ARRAY['oil-gas'], ARRAY['stockbroker_firm','energy_financial_planner']::text[],
  'published',
  'Market Research Team', 'Invest.com.au'
),

-- ───────────────────────────────────────────────────────────
-- 7. Crude oil ETFs
-- ───────────────────────────────────────────────────────────
(
  'Crude Oil ETFs Explained: OOO, ENGY, FUEL and the Contango Problem',
  'crude-oil-etfs-australia-explained',
  'Three quite different products, one problem: commodity-ETF roll yield can quietly destroy returns. How to pick the right oil-exposure wrapper.',
  'oil-gas',
  'guide',
  $json$[
    {"heading":"The three main oil ETFs","body":"Australian investors have three main listed wrappers for oil-and-gas ETF exposure. BetaShares Crude Oil Index ETF (ASX: OOO) tracks WTI crude via front-month futures — pure commodity exposure. BetaShares Global Energy Companies ETF (ASX: FUEL) holds equities in global integrated majors (ExxonMobil, Chevron, Shell, BP, TotalEnergies) — exposure to oil prices indirectly through company earnings. Global X Energy ETF and emerging products provide similar equity-based exposure.\n\nThese are structurally different products with different risk profiles."},
    {"heading":"The contango problem","body":"OOO holds front-month WTI crude futures. When the futures curve is in contango (front-month lower than back-month), the fund must sell its expiring front-month contract and buy a more expensive back-month contract. This ''roll yield'' drag erodes returns, even when the spot oil price is flat.\n\nOver long periods in contango markets, commodity ETFs can underperform spot oil by 5-15% per year. The 2020 oil crash — when spot oil prices went negative — made this mechanism infamous but it quietly affects commodity ETFs in most market conditions."},
    {"heading":"When OOO makes sense","body":"OOO works well for short-duration directional bets — if you have a specific view that oil will rise over 1-6 months, OOO captures that. It does not work well as a long-term ''oil in my portfolio'' holding.\n\nIf you want long-term oil exposure, a better alternative is owning equities of oil producers (Woodside, Santos, ExxonMobil) where earnings rise with oil prices, or using FUEL which holds those equities globally in a single wrapper."},
    {"heading":"Currency hedging","body":"OOO is AUD-hedged — a deliberate feature that removes AUD/USD noise from the oil-price exposure. FUEL is also AUD-hedged. For most Australian investors this is the right choice: you want your view on oil prices, not a bundled view on AUD weakening.\n\nUnhedged international oil ETFs exist but require an intentional FX view alongside the oil view."},
    {"heading":"MER and liquidity","body":"OOO MER is around 0.69%. FUEL MER is around 0.57%. Both are reasonable for niche commodity exposure. Liquidity is adequate but not deep — use limit orders rather than market orders, particularly around open and close."},
    {"heading":"Which to choose","body":"Short-term tactical oil exposure: OOO. Long-term structural exposure: FUEL (equities) or a direct basket of Woodside, Santos, ExxonMobil and Shell.\n\nSMSF trustees should note commodity ETFs have specific trustee-reporting implications — check with your SMSF accountant before holding OOO or FUEL in the fund. Record-keeping is simpler with equity ETFs than with commodity ETFs."}
  ]$json$::jsonb,
  $json$["OOO","FUEL","oil ETF","contango","commodity ETF","oil-gas"]$json$::jsonb,
  6, true, NOW(),
  ARRAY['oil-gas'], ARRAY['energy_financial_planner','stockbroker_firm']::text[],
  'published',
  'Market Research Team', 'Invest.com.au'
),

-- ───────────────────────────────────────────────────────────
-- 8. Franking credits on energy dividends
-- ───────────────────────────────────────────────────────────
(
  'Franking Credits on ASX Energy Dividends: The After-Tax Math',
  'franking-credits-asx-energy-dividends',
  'A fully franked 7% yield is not the same as an unfranked 7% yield — and for retirees on low marginal tax rates, the difference is enormous.',
  'oil-gas',
  'guide',
  $json$[
    {"heading":"What franking is","body":"Franking credits — the imputation system — give Australian resident shareholders a credit for corporate tax already paid by the company. When Woodside earns $100 pre-tax, pays $30 in company tax, and distributes the remaining $70 as a fully franked dividend, Australian resident shareholders can claim the $30 as a credit against their own income tax.\n\nThis is why Australian investors will accept slightly lower pre-tax yields on franked dividends than on equivalent-risk unfranked dividends — the after-tax return is the same or better."},
    {"heading":"The math for different tax brackets","body":"Take a $1,000 fully franked dividend. The grossed-up value is $1,429 — meaning the shareholder is treated as having received $1,000 in cash plus $429 in franking credits.\n\nAt 0% marginal rate (SMSF pension phase): tax of $0, refund of $429. After-tax return: $1,429.\nAt 15% marginal rate (SMSF accumulation phase): tax of $214, refund of $215. After-tax: $1,215.\nAt 30% marginal rate: tax of $429, refund of $0. After-tax: $1,000.\nAt 47% marginal rate: tax of $671, net cost of $242. After-tax: $758.\n\nThe franking regime makes fully franked dividends most valuable to investors on the lowest marginal tax rates."},
    {"heading":"Why energy dividends tend to be fully franked","body":"Woodside, Santos, Beach, Viva, and Ampol all pay mostly or fully franked dividends. This reflects that Australian company tax is paid on Australian-sourced income.\n\nKaroon is the outlier — its dividends are typically unfranked or partially franked because its production is offshore. It hasn''t paid enough Australian company tax to fully frank its dividends. This is why the pre-tax yields on Woodside and Santos can be lower than Karoon while the after-tax yield for a resident is similar."},
    {"heading":"Foreign investors and franking","body":"Non-residents cannot claim a franking-credit refund. They are instead exempt from Australian withholding tax on the franked portion — a 0% withholding rate on fully franked dividends, versus 30% on unfranked dividends (reduced by DTA, often to 15%).\n\nPractical result for a US-resident investor holding Woodside: fully franked dividend of $1,000 arrives without Australian tax deducted; the $1,000 is then subject to US tax per US rules. For an unfranked dividend the investor might net $850 after 15% DTA withholding.\n\nThis structural feature is why fully franked dividends appeal disproportionately to sophisticated non-resident investors — there is no Australian withholding friction."},
    {"heading":"The franking-credit refund debate","body":"The Labor government in 2019 campaigned on removing franking-credit refunds for shareholders in pension-phase SMSFs. The proposal was unpopular and has not been re-proposed at national level, but remains a policy risk that energy-dividend investors should factor into long-term plans.\n\nA change that removed refundability would disproportionately affect SMSF pensioners holding fully franked Australian energy stocks — the exact group that currently benefits most. Speaking with an energy financial planner about scenario planning is prudent."},
    {"heading":"Practical takeaway","body":"Always gross up a franked dividend to compare it against an unfranked alternative. A 7% fully franked dividend is 10% grossed up; a 7% unfranked dividend is 7% grossed up. The former is worth dramatically more to an SMSF pensioner.\n\nFor high-marginal-rate Australian residents, the franking benefit is smaller but still worth quantifying. For non-residents, prefer fully franked dividend payers to avoid withholding friction."}
  ]$json$::jsonb,
  $json$["franking credits","imputation","dividends","ASX","SMSF","pension","oil-gas"]$json$::jsonb,
  6, true, NOW(),
  ARRAY['oil-gas'], ARRAY['energy_financial_planner','tax_agent','smsf_accountant']::text[],
  'published',
  'Market Research Team', 'Invest.com.au'
),

-- ───────────────────────────────────────────────────────────
-- 9. PRRT explained
-- ───────────────────────────────────────────────────────────
(
  'PRRT Explained: The Hidden Tax That Shapes Every Australian LNG Dividend',
  'prrt-petroleum-resource-rent-tax-explained',
  'PRRT doesn''t appear on most retail investor checklists, but it is the single most important tax lever on Australian oil and gas dividend sustainability.',
  'oil-gas',
  'guide',
  $json$[
    {"heading":"What PRRT is","body":"The Petroleum Resource Rent Tax (PRRT) is a federal tax on the profits of petroleum projects. It applies to oil and gas projects in Commonwealth waters (most offshore Australian production) and, since 2012, to onshore and North West Shelf projects as well.\n\nPRRT is 40% of the project''s ''taxable profit'' — but the definition of taxable profit is where the complexity lies. Cumulative project costs are carried forward and uplifted at a prescribed rate each year until they are recouped. Only after full recoupment does a project start paying PRRT."},
    {"heading":"Why this matters for dividends","body":"A project that is PRRT-paying has materially less free cashflow available for dividends than a project that is still in its cost-recouping phase. This is why Scarborough (new, big cost pool, not PRRT-paying yet) looks so much better for near-term Woodside cashflow than an equivalent-scale legacy project would.\n\nIt also explains why Santos''s GLNG and Barossa projects will be dividend-favourable for years after first production — their uplifted cost pools shelter cash from PRRT for the foreseeable future."},
    {"heading":"The uplift rate debate","body":"Historically PRRT uplift rates were generous — the long-term bond rate plus 5% to 15% depending on the cost category. This meant some legacy projects appeared to never become PRRT-paying, a situation that has generated ongoing political criticism.\n\nThe 2023-24 PRRT review materially changed the uplift regime, compressing the effective shelter. The changes are being phased in through the late-2020s. Existing projects have some transitional relief; new projects sanctioned after 2024 operate under the tighter regime."},
    {"heading":"How to factor PRRT into investment thinking","body":"When analysing an Australian oil and gas producer, separately model: (1) when each project is expected to become PRRT-paying, (2) what the current cost pool balance is, and (3) what the project''s sensitivity to PRRT rule changes would be. This is a lot to ask — most retail investors rely on broker research or specialist analysis for this.\n\nAs a quick heuristic: newer, bigger projects are PRRT-favourable for many years; legacy cash-cow projects are PRRT-paying and more exposed to rule changes."},
    {"heading":"Policy risk","body":"PRRT has been a live political topic since the Greens''s 2022 ''Greedflation'' campaign and it re-emerges in every federal budget cycle. The 2023-24 reform compressed the regime but did not introduce a volume-based royalty, which is the more aggressive reform some political stakeholders have advocated.\n\nFor long-term Woodside and Santos holders, PRRT policy risk is the single largest tail risk to dividend sustainability over a 10-year horizon. Engaging a petroleum royalties advisor or specialist tax agent is worth the cost for portfolios above ~$500K of concentrated ASX energy exposure."},
    {"heading":"What retail investors usually miss","body":"Three things consistently trip up retail analysts: (1) PRRT is a project-level tax, not a company-level tax, so the timing of different projects becoming PRRT-paying is asymmetric; (2) the ''uplifted cost pool'' is not shown on the balance sheet — it is disclosed in tax notes and investor presentations; (3) PRRT credits can be transferred between projects in some circumstances, creating interaction effects with M&A.\n\nThe short version: PRRT is the reason fully franked dividends from ASX oil and gas companies have been so reliable for so long, and the reason rule changes are the single biggest structural risk to that reliability going forward."}
  ]$json$::jsonb,
  $json$["PRRT","petroleum resource rent tax","LNG","dividends","Woodside","Santos","oil-gas"]$json$::jsonb,
  7, true, NOW(),
  ARRAY['oil-gas'], ARRAY['petroleum_royalties_advisor','mining_tax_advisor']::text[],
  'published',
  'Market Research Team', 'Invest.com.au'
),

-- ───────────────────────────────────────────────────────────
-- 10. Fuel Security Services Payment
-- ───────────────────────────────────────────────────────────
(
  'The Fuel Security Services Payment: What It Means for Viva and Ampol Investors',
  'fsspayment-fuel-security-viva-ampol',
  'FSSP is the federal subsidy that keeps Australia''s last two refineries open. Understanding it is essential to the Viva and Ampol investment case.',
  'oil-gas',
  'guide',
  $json$[
    {"heading":"The problem FSSP solves","body":"Between 2003 and 2021, Australia lost five domestic refineries — Clyde, Kurnell, Bulwer Island, Altona, and Kwinana. All closed because Singaporean and Korean refining capacity could produce products more cheaply than Australian refineries, given Australia''s older refineries and high energy costs.\n\nThe 2020-21 closures of BP Kwinana and ExxonMobil Altona left Australia with just two surviving refineries — Viva''s Geelong and Ampol''s Lytton — and prompted the federal government to intervene to prevent further closures."},
    {"heading":"How FSSP works","body":"The Fuel Security Services Payment is a per-litre payment to the two remaining refineries, linked to actual production. Payments are calibrated to keep each refinery operating above a floor level of production and to provide a minimum economic return.\n\nThe scheme was initially legislated through 2027 and extended to 2030 in late 2025. It is backed by a Fuel Security Commitment — each refinery operator commits to maintaining operational capability at agreed levels."},
    {"heading":"What FSSP means for earnings","body":"For Viva and Ampol, FSSP provides a revenue floor — the refinery segments cannot plausibly lose money at the operating level while FSSP is in effect. In years of strong regional refining margins (like 2022-23), the refineries capture the full market upside on top of FSSP. In weak years, FSSP underpins the floor.\n\nThe practical result is that refining-segment EBITDA for both Viva and Ampol has been materially more stable since FSSP began than it was in the pre-FSSP era."},
    {"heading":"The Minimum Stockholding Obligation","body":"FSSP is paired with the Minimum Stockholding Obligation (MSO), which requires fuel suppliers to maintain a prescribed level of petrol and diesel inventory at all times. The MSO increases working capital requirements for fuel retailers and wholesalers — a mild headwind — but also creates a structural demand for fuel storage capacity, which is why Australian fuel storage assets (like the Gladstone terminal listed in our oil-gas marketplace) have seen renewed investment interest."},
    {"heading":"The policy cliff","body":"FSSP is currently extended to 2030. Beyond that, the policy outlook is uncertain. Three scenarios to consider: (1) renewal — most likely given fuel-security politics; (2) phase-out — possible if EV adoption reduces demand enough that domestic refining is no longer deemed strategic; (3) redesign — possible, perhaps replacing FSSP with a different instrument like minimum stockholding at bigger scale.\n\nAny Viva or Ampol investor should be actively watching the 2028-29 policy discussion. A credible signal that FSSP will not be renewed would materially compress both companies'' earnings."},
    {"heading":"Foreign investors and fuel security","body":"FSSP-supported refining and fuel-storage assets are now inside the Security of Critical Infrastructure Act regime — foreign investors acquiring meaningful stakes face national-security review in addition to the standard economic FIRB test.\n\nFor foreign portfolio investors holding less than 10% of Viva or Ampol shares, this is mostly invisible — FIRB portfolio exemptions apply. But for any direct or controlling interest, specialist foreign investment legal advice is essential."}
  ]$json$::jsonb,
  $json$["FSSP","fuel security","Viva","Ampol","refining","MSO","oil-gas"]$json$::jsonb,
  7, true, NOW(),
  ARRAY['oil-gas'], ARRAY['energy_financial_planner','foreign_investment_lawyer']::text[],
  'published',
  'Market Research Team', 'Invest.com.au'
),

-- ───────────────────────────────────────────────────────────
-- 11. LNG export economics
-- ───────────────────────────────────────────────────────────
(
  'LNG Export Economics: JKM, Oil-Linked Contracts, and Why They Matter',
  'lng-export-economics-jkm-oil-linked',
  'Australian LNG producers sell into a market that blends spot JKM pricing with legacy oil-linked contracts — the mix drives dividend predictability.',
  'oil-gas',
  'guide',
  $json$[
    {"heading":"The two LNG price worlds","body":"Australian LNG exports are sold under two fundamentally different pricing regimes. Legacy long-term contracts, mostly signed in 2010-2015, price LNG as a function of oil prices — typically Brent, with a slope factor around 12-15%. Newer contracts and all spot cargoes price against the Japan-Korea-Marker (JKM), a spot LNG benchmark.\n\nThese two price worlds move together in the long run but can diverge dramatically in the short run. JKM spiked above US$70/mmBTU in 2022 while oil-linked contracts were still settling around US$12/mmBTU. The reverse can also occur in oil-price-up / LNG-demand-down scenarios."},
    {"heading":"Who sells under which regime","body":"Woodside''s North West Shelf is heavily oil-linked — legacy contracts with Japanese and Chinese utilities. Pluto is a mix. Scarborough will be a mix, with a modern tilt toward JKM-exposed spot and shorter-term cargoes.\n\nSantos''s GLNG is mostly sold into portfolio-LNG markets with meaningful JKM exposure. PNG LNG (Santos''s 19% stake) is oil-linked. Ichthys (Inpex) is oil-linked. The Australian LNG industry is more oil-linked in aggregate than new entrants from Qatar or the US Gulf."},
    {"heading":"Why the mix matters for dividends","body":"Oil-linked contracts deliver more predictable revenue — LNG price moves with Brent with a 3-6 month lag, giving producers good visibility into quarterly earnings. JKM exposure is much more volatile.\n\nWoodside''s dividend-sustainability argument rests heavily on its oil-linked mix — the company can plan capital returns against relatively predictable LNG revenue. A JKM-dominated portfolio would require a materially more conservative payout ratio to avoid dividend volatility."},
    {"heading":"The contract renewal cycle","body":"Many of the legacy Australian LNG contracts are approaching renewal through 2025-2030. When these contracts renew, they will be repriced at prevailing market terms — typically with a higher JKM-linked component and less oil-linked.\n\nFor investors, this is a slow but structural shift. Woodside and Santos will have higher-variance LNG revenue in the 2030s than they do today. Whether this is a problem depends on whether LNG demand remains structurally tight (higher price variance means higher earnings on average) or softens (higher variance with lower averages)."},
    {"heading":"Spot vs portfolio cargoes","body":"A producer can sell individual cargoes on the spot market or commit them to a long-term contract. The optimal mix depends on expected forward prices, production reliability, and the investor base''s tolerance for earnings volatility.\n\nMost Australian LNG producers manage 20-40% spot exposure — enough to capture upside when spot prices spike, not so much that quarterly earnings become unpredictable. This is a lever management teams actively discuss on earnings calls."},
    {"heading":"How to think about LNG exposure","body":"For dividend-focused investors, Woodside''s heavy oil-linked LNG mix is a positive — it supports payout sustainability. For total-return investors with a specific LNG price view, Santos''s greater JKM exposure offers more upside (and downside).\n\nPure JKM exposure for retail investors is hard to get directly — most Australian-listed products blend exposures. A specialist resources fund manager can build an LNG-focused sub-portfolio if an investor wants concentrated exposure to the thematic."}
  ]$json$::jsonb,
  $json$["LNG","JKM","oil-linked","Woodside","Santos","LNG pricing","oil-gas"]$json$::jsonb,
  7, true, NOW(),
  ARRAY['oil-gas'], ARRAY['resources_fund_manager','energy_financial_planner']::text[],
  'published',
  'Market Research Team', 'Invest.com.au'
),

-- ───────────────────────────────────────────────────────────
-- 12. Oil & Gas dividends in retirement
-- ───────────────────────────────────────────────────────────
(
  'Australian Oil & Gas Dividends in a Retirement Portfolio',
  'asx-oil-gas-dividends-retirement-portfolio',
  'Fully franked 7% yields are attractive — but concentration risk and cyclicality mean sizing matters more than picking.',
  'oil-gas',
  'guide',
  $json$[
    {"heading":"The appeal","body":"For Australian retirees, ASX oil and gas stocks have a specific structural appeal: fully franked dividends delivering pre-tax yields of 6-10%, translating to materially higher after-tax returns inside an SMSF pension where franking credits refund fully.\n\nCompared to global equity benchmarks yielding 2-3%, or Australian bank stocks in the 4-6% range, a diversified Australian energy basket can sit at the top of a retirement portfolio''s income stack."},
    {"heading":"The risks","body":"Two things will hurt a portfolio that over-indexes to energy: (1) an oil price shock — a prolonged period at US$50-60 Brent would compress dividends sharply; (2) a franking or PRRT policy change that removes the structural after-tax advantage.\n\nNeither is a near-term certainty but both are live tail risks. A 15% portfolio allocation to ASX energy survives both scenarios acceptably. A 40% allocation risks serious retirement-income disruption."},
    {"heading":"Sizing framework","body":"A reasonable framework for retiring investors: total ASX energy exposure no more than 15-20% of the equity portfolio; within that, diversify across at least two of Woodside, Santos, Beach, Viva, Ampol; avoid single-stock concentrations above 5-6% unless there is a specific thesis.\n\nConcentrated employee shareholders inside Woodside or Santos should actively de-risk into retirement — an energy financial planner can map a multi-year CGT-optimised drawdown strategy."},
    {"heading":"Blending with defensive income","body":"ASX energy pairs well inside a retirement portfolio with defensive income sources — hybrid securities, investment-grade credit, and cash. In oil downturns, energy dividend compression is often offset by defensive income holding up, keeping total portfolio income reasonably stable.\n\nThe mistake to avoid: doubling up on cyclical income (energy + banks + miners) without meaningfully defensive counterweights. When cycles coincide, income can compress 30-40% quickly."},
    {"heading":"SMSF considerations","body":"Inside an SMSF in pension phase, fully franked energy dividends are essentially tax-free — the 0% pension-phase tax rate means franking credits refund in full. This is the single most valuable tax environment in Australian investing and is why many retirees hold concentrated energy exposure inside SMSF rather than personally.\n\nTransfer Balance Cap ($1.9M in 2024-25, indexed) limits how much can be in pension phase. Beyond the cap, amounts in accumulation phase pay 15% tax on earnings — franking credits still refund but the structural advantage is smaller."},
    {"heading":"Review cadence","body":"A retirement energy allocation should be reviewed annually — minimum. Events triggering earlier review: (1) a 20%+ price move in Brent, (2) a dividend cut at Woodside or Santos, (3) a federal budget changing PRRT or franking-credit rules, (4) a material change in personal circumstances.\n\nSeeking advice from an energy-sector-specialist financial planner before each major rebalancing decision is usually worth the $3,000-$8,000 SOA cost."}
  ]$json$::jsonb,
  $json$["retirement","SMSF","franking","dividends","ASX","oil-gas","pension"]$json$::jsonb,
  6, true, NOW(),
  ARRAY['oil-gas'], ARRAY['energy_financial_planner','smsf_accountant','financial_planner']::text[],
  'published',
  'Market Research Team', 'Invest.com.au'
),

-- ───────────────────────────────────────────────────────────
-- 13. Energy transition risk
-- ───────────────────────────────────────────────────────────
(
  'Energy Transition Risk: How to Stress-Test an ASX Oil & Gas Holding',
  'energy-transition-risk-stress-test-asx',
  'Terminal value risk is real for oil and gas. Here''s how to quantify it honestly for your ASX energy portfolio.',
  'oil-gas',
  'analysis',
  $json$[
    {"heading":"The honest case for transition risk","body":"Peak oil demand has been forecast many times and still has not arrived globally. But the IEA''s 2024 World Energy Outlook projects peak oil demand between 2028 and 2032 under current policy trajectories, and LNG demand growth decelerating into the 2030s.\n\nEven if the exact dates are wrong, the direction is clear: the oil and gas industry is on a declining long-term volume trajectory. This is terminal-value risk — and it should sit in any ASX energy portfolio analysis."},
    {"heading":"Why it''s not a reason to avoid the sector","body":"Declining volumes do not mean declining profits, at least through the 2030s. In a demand-decline scenario, low-cost producers (typically incumbents with paid-down assets) earn outsized profits as higher-cost capacity exits. Price stays high as supply contracts faster than demand.\n\nShell, ExxonMobil, Woodside, and Santos are all positioned as low-cost producers. In a managed transition scenario they earn more per barrel, not less, for at least a decade."},
    {"heading":"The terminal value question","body":"DCF-based valuation of oil and gas companies is extremely sensitive to the assumed terminal year and terminal growth rate. Analysts routinely use 20-30 year terminal horizons for oil companies, with material terminal value contribution.\n\nA 10-year stress test — assume the company''s cashflow ends in 2035 — typically drops intrinsic value by 15-30%. If your current thesis only holds with a long terminal horizon, you are implicitly betting on oil and gas demand into the 2040s and 2050s."},
    {"heading":"Scenario-based portfolio sizing","body":"A useful exercise: build your ASX energy position sizing with three scenarios. Base case (peak demand 2032, managed decline): normal sizing. Accelerated transition (peak 2028, faster decline): 50% sizing. Extended demand (peak 2040+): 150% sizing.\n\nProbability-weight your subjective view. If you think accelerated transition has 30% probability, base case 50%, and extended 20%, the weighted position size is roughly 95% of your base-case sizing. This is a disciplined way to incorporate transition risk into allocation decisions."},
    {"heading":"What to watch","body":"Signals of accelerating transition: IEA or BP demand-forecast downgrades; major-country EV adoption milestones; announced policy changes on EV subsidies, ICE bans, or carbon pricing; major-oil-company capex shifts into renewables.\n\nSignals of decelerating transition: EV adoption rates plateauing; policy reversals; structural under-investment in new renewables capacity; geopolitical events forcing energy-security-over-climate prioritisation."},
    {"heading":"Who to talk to","body":"Energy transition is genuinely complex and the right answer for a given portfolio depends on time horizon, risk tolerance, and other holdings. A specialist energy financial planner can walk through scenario analysis; a resources fund manager can provide outside-view context on how institutional investors are sizing the thematic; a mining tax advisor can help on structure if direct project investment is in play."}
  ]$json$::jsonb,
  $json$["energy transition","peak oil","scenario analysis","ASX","oil-gas","climate"]$json$::jsonb,
  7, true, NOW(),
  ARRAY['oil-gas'], ARRAY['energy_financial_planner','resources_fund_manager']::text[],
  'published',
  'Market Research Team', 'Invest.com.au'
),

-- ───────────────────────────────────────────────────────────
-- 14. FIRB 2025 amendments
-- ───────────────────────────────────────────────────────────
(
  'FIRB and the 2025 Critical Infrastructure Amendments: What Changed for Foreign Energy Investors',
  'firb-2025-critical-infrastructure-energy',
  'The 2025 SOCI amendments widened the perimeter substantially. Storage, pipelines and LNG jetties now routinely get national-security review.',
  'oil-gas',
  'analysis',
  $json$[
    {"heading":"Before 2025: the narrower regime","body":"Prior to the 2025 amendments, Australia''s foreign investment review of energy assets applied the standard FIRB regime plus a narrower Security of Critical Infrastructure Act (SOCI) layer applying mostly to electricity generation and transmission, water, and a small set of named ''systems of national significance''.\n\nUnder this regime, a foreign acquirer of, say, a mid-sized fuel storage terminal could generally expect economic-benefit FIRB review but avoid the intensive national-security review applied to major gas pipelines."},
    {"heading":"What the 2025 amendments changed","body":"The 2025 amendments substantially widened SOCI''s perimeter. Assets now routinely inside the regime include: LNG export terminals and dedicated pipelines; the two domestic refineries and their crude and product jetties; fuel storage terminals above a capacity threshold; and transmission gas pipelines above a prescribed size.\n\nPractically, this means a foreign acquirer of many assets that previously flew through standard FIRB now faces the Cyber and Infrastructure Security Centre (CISC) review alongside FIRB. Timelines extend accordingly."},
    {"heading":"The new process in practice","body":"Pre-lodgement engagement with Treasury FIRB secretariat and with CISC is now effectively mandatory for any meaningful energy acquisition. A straightforward portfolio investment by an allied-nation institutional investor might still complete in 60-90 days. A direct tenement, pipeline, or storage-terminal acquisition — particularly from a non-allied-nation investor — can run 90-180 days and occasionally longer.\n\nConditions imposed by Treasury have also expanded. Cyber uplift commitments, register-of-owners reporting, and supply-chain transparency requirements are now routine, not exceptional."},
    {"heading":"The allied-nation fast track","body":"The 2025 amendments preserved — and in some respects strengthened — the streamlined path for allied-nation investors. US, Japan, Korea, EU and UK investors benefit from published risk tiers and accelerated pre-lodgement engagement.\n\nThis is not a waiver — FIRB approval still applies — but it is a meaningful timing and predictability advantage. Chinese, Russian, and select other-jurisdiction investors face the full SOCI-plus-FIRB intensity."},
    {"heading":"What this means for investment decisions","body":"Budget increases: legal fees for sensitive-sector FIRB applications have risen from typical $45-80K pre-2025 to $60-150K post-2025 for equivalent scope. Timeline increases: pre-2025 baseline of 60-90 days is now 90-180 days. Closing-risk assumptions in M&A agreements should reflect the new reality — break fees, long-stop dates, and material adverse change clauses all need revisiting.\n\nFor purely portfolio investors staying below 10% of an ASX-listed producer, the changes are largely invisible. For anyone acquiring direct petroleum interests, the game has changed."},
    {"heading":"Advisor strategy","body":"The single highest-ROI expense in the 2025+ regime is pre-lodgement legal engagement. A foreign investment lawyer who has recent experience with CISC-reviewed energy deals can save weeks to months on approval timelines and can materially de-risk conditions imposed.\n\nFor sovereign wealth funds, state-owned enterprises, and other investors likely to attract heightened scrutiny, 3-6 months of advance engagement before signing is increasingly normal. The days of running FIRB applications post-signing as a compliance exercise are over for energy assets."}
  ]$json$::jsonb,
  $json$["FIRB","SOCI","critical infrastructure","foreign investment","national security","oil-gas"]$json$::jsonb,
  7, true, NOW(),
  ARRAY['oil-gas'], ARRAY['foreign_investment_lawyer','mining_lawyer']::text[],
  'published',
  'Market Research Team', 'Invest.com.au'
),

-- ───────────────────────────────────────────────────────────
-- 15. SMSF oil and gas rules
-- ───────────────────────────────────────────────────────────
(
  'SMSF Oil & Gas Investment: Rules, Structures, and Practical Guardrails',
  'smsf-oil-gas-investment-rules-australia',
  'SMSFs can hold ASX energy stocks, energy ETFs, and some unlisted energy funds — with specific rules on in-house assets, NALI, and direct project equity.',
  'oil-gas',
  'guide',
  $json$[
    {"heading":"What''s allowed","body":"ASX-listed oil and gas stocks (Woodside, Santos, Beach, Viva, Ampol, Karoon) and energy ETFs (OOO, FUEL) can be held inside an SMSF with no special approvals. They''re conventional listed investments that don''t trigger any of the SMSF restriction regimes.\n\nThis is by far the most common way SMSF trustees gain oil and gas exposure — and for most SMSFs it is sufficient. The more exotic structures below add return potential but also add trustee obligations."},
    {"heading":"Unlisted energy funds","body":"Wholesale unlisted energy funds (actively managed resources funds like Argyle Resources Capital or Ellerston Global Energy) can be held in an SMSF subject to three conditions: (1) the fund manager holds a valid AFSL covering the scheme; (2) the investment meets the fund''s minimum and wholesale-investor eligibility; (3) the fund is managed at arm''s length — no related-party issues.\n\nMost Australian wholesale resources funds require $100K minimums and a sophisticated-investor certificate. SMSFs above ~$1M in assets comfortably qualify."},
    {"heading":"Direct project equity","body":"Direct investment in unlisted oil and gas projects — joint ventures, convertible notes, project equity — is permitted inside an SMSF but carries significant trustee-compliance obligations. The asset must be held at arm''s length, market-valued annually, and the investment must be within the fund''s documented investment strategy.\n\nPractical reality: for SMSFs under ~$1.5-2M, direct project equity is usually more complexity than it''s worth. Above that scale, it can make sense for sophisticated trustees with a specialist SMSF accountant and an energy financial planner in place."},
    {"heading":"The NALI trap","body":"Non-Arm''s-Length Income (NALI) is the single biggest risk in complex SMSF investments. If an SMSF acquires an asset or income stream at less than arm''s-length value, or at preferential terms, all income from that asset is taxed at 45% instead of the normal 15% (accumulation) or 0% (pension).\n\nThis matters particularly for petroleum royalty interests, which are often purchased from related or semi-related parties. A petroleum royalties advisor plus a specialist SMSF accountant should review any royalty acquisition before the SMSF trustee commits. The paperwork cost ($5-15K typically) is cheap insurance against a NALI ruling."},
    {"heading":"In-house assets and related parties","body":"An SMSF cannot hold more than 5% of its assets as ''in-house assets'' — interests in related parties, related-party loans, and some joint ventures. For SMSF trustees who work in the oil and gas industry, this can be tricky if they want to invest in their employer''s project or a related party''s venture.\n\nThe 5% limit is often triggered accidentally through share-based employee compensation that is then directed into the SMSF. An energy financial planner and an SMSF accountant working together can identify and manage this."},
    {"heading":"Practical SMSF oil and gas allocation","body":"For most SMSFs, a practical oil and gas allocation looks like: 8-15% in a blend of two to four ASX-listed majors and mid-caps; 0-5% in an energy ETF for broader exposure; 0-5% in a wholesale fund for professional management if SMSF is large enough. Total energy 10-20% of the equity portfolio at the top end.\n\nConcentrations above this require a specific thesis and should be discussed with an energy financial planner. A concentrated position in a single energy name above 10% of SMSF assets is increasingly common for SMSF trustees who work in the sector and should be actively managed."}
  ]$json$::jsonb,
  $json$["SMSF","oil-gas","NALI","in-house assets","ASX energy","trustee"]$json$::jsonb,
  7, true, NOW(),
  ARRAY['oil-gas'], ARRAY['smsf_accountant','energy_financial_planner','petroleum_royalties_advisor']::text[],
  'published',
  'Market Research Team', 'Invest.com.au'
)

ON CONFLICT (slug) DO NOTHING;
