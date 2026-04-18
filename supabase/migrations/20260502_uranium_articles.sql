-- ============================================================
-- Seed 15 uranium editorial articles.
-- Idempotent: ON CONFLICT (slug) DO NOTHING.
-- ============================================================

INSERT INTO public.articles (
  title, slug, excerpt, category, content_type,
  sections, tags, read_time, evergreen, published_at,
  related_verticals, related_advisor_types, status,
  author_name, author_title
) VALUES

-- 1. Paladin deep-dive
(
  'Paladin Energy (PDN): Inside the Largest ASX Uranium Producer',
  'paladin-energy-pdn-deep-dive',
  'Langer Heinrich is restarted, long-term contracts are signed, and Paladin is once again a uranium producer. Here''s what matters for Australian investors.',
  'uranium',
  'guide',
  $json$[
    {"heading":"Paladin''s unusual history","body":"Paladin Energy (ASX: PDN) is one of the few ASX-listed companies to go through the full producer-to-zero-to-producer cycle. At its peak in 2007 Paladin was a $7B market cap uranium producer with operations in Namibia and Malawi. The 2011 Fukushima accident crashed uranium prices for a decade; Paladin mothballed Langer Heinrich in 2018 and the equity traded below 10 cents.\n\nThe 2022-23 uranium upcycle — driven by Russia sanctions, SMR demand, and utility under-contracting — enabled the Langer Heinrich restart. First commercial production came in 2024. Paladin is again the largest ASX uranium name by market cap."},
    {"heading":"Langer Heinrich economics","body":"The mine is a heap-leach operation in Namibia with nameplate capacity around 6 million pounds U3O8 per year. Restart ramp-up continued through 2024-25 with production trending toward nameplate.\n\nCost guidance at steady-state is in the mid-US$30s per pound C1, placing Paladin in the middle of the global cost curve. At US$80 uranium prices — close to recent spot — margins are substantial. At US$50, margins compress materially. Uranium-price leverage is the investment case."},
    {"heading":"Contract book","body":"Paladin has signed long-term supply contracts with US and European utilities covering a majority of Langer Heinrich''s near-term production. These contracts are typically priced on a mix of fixed prices, market-linked prices, and ceiling-floor structures.\n\nThe contract book provides revenue visibility and cash-flow stability relative to pure spot exposure. It also means Paladin doesn''t fully capture upward spot spikes — by design. Investors seeking pure spot uranium leverage should look to explorers and early developers, not contracted producers like Paladin."},
    {"heading":"Michelin and the growth pipeline","body":"Michelin in Labrador, Canada was Paladin''s 2023 acquisition via Fission Uranium. It adds a large-scale development-stage project to the portfolio. Timelines are long — production is likely late-2020s to early-2030s — but Paladin now has multi-decade production visibility.\n\nExploration and tenement work continues in Australia, including historic permits. Any meaningful Australian production would face state-level approvals given ongoing bans in most states."},
    {"heading":"Dividends and capital returns","body":"Paladin has not paid dividends during the restart phase — cashflow is being reinvested in ramp-up and growth. As Langer Heinrich stabilises through 2026-27, a dividend policy is likely. Yields are unlikely to match Woodside or Santos initially but could build meaningfully.\n\nFor income investors this makes Paladin a less obvious fit than the oil-gas majors. For total-return investors betting on a continued uranium upcycle, Paladin is the most direct ASX play with proven production."},
    {"heading":"Who should own Paladin","body":"Paladin fits investors who want direct uranium price exposure through a producing company with a multi-mine pipeline. It is less suitable for income-only portfolios given the absence of near-term dividends, and more appropriate for allocations where commodity-price volatility is acceptable.\n\nSizing matters: uranium is volatile and cyclical. A 2-5% portfolio weighting gives meaningful exposure without over-indexing to a single thematic. A resources fund manager or an energy financial planner can help size against other commodity exposures."}
  ]$json$::jsonb,
  $json$["Paladin","PDN","uranium","Langer Heinrich","ASX","uranium-producer"]$json$::jsonb,
  7, true, NOW(),
  ARRAY['uranium'], ARRAY['resources_fund_manager','energy_financial_planner']::text[],
  'published',
  'Market Research Team', 'Invest.com.au'
),

-- 2. Boss Energy
(
  'Boss Energy (BOE): The Honeymoon Restart Story Everyone Missed',
  'boss-energy-boe-honeymoon-restart',
  'Boss restarted in-situ recovery uranium production at Honeymoon in 2024 and bought 30% of Alta Mesa in Texas. The setup is uniquely investable.',
  'uranium',
  'guide',
  $json$[
    {"heading":"Boss at a glance","body":"Boss Energy (ASX: BOE) owns the Honeymoon in-situ recovery (ISR) uranium mine in South Australia and holds 30% of the Alta Mesa ISR operation in Texas through a JV with enCore Energy. Both operations are producing. Boss is one of only two producing ASX uranium companies, the other being Paladin.\n\nMarket cap is roughly A$1.6B at recent prices. The company is debt-free following the 2024 restart and is generating operating cashflow from both JVs."},
    {"heading":"Why ISR matters","body":"In-situ recovery mining uses dilute acid or alkaline solution pumped through the ore body, dissolving uranium which is then pumped back to surface and processed. No open-cut, no tailings dam, minimal surface disturbance. Operating costs are typically materially lower than conventional mining.\n\nISR requires a particular geology — porous sandstone-hosted uranium in a confined aquifer. Honeymoon and Alta Mesa both qualify. Most Australian uranium deposits do not. This geology advantage is part of why Boss has a faster and cheaper path to production than most ASX peers."},
    {"heading":"Honeymoon production","body":"Honeymoon restarted commercial production in April 2024 after approximately 10 years on care and maintenance. Ramp-up targets include around 2.45 million pounds U3O8 annually in the early years with potential expansion.\n\nOperating costs are guided at mid-30s USD per pound at steady state. This is competitive globally and gives Boss meaningful margin at uranium prices above US$60."},
    {"heading":"Alta Mesa","body":"The 30% stake in Alta Mesa diversifies Boss across jurisdictions and adds production today without development risk. Alta Mesa targets around 1.5 million pounds annual production at steady state. Boss''s 30% share represents roughly 450,000 pounds per year.\n\nUS-sited uranium production has strategic value — US utilities are under increasing pressure to diversify away from Russian and Kazakh supply."},
    {"heading":"Capital structure and dividends","body":"Boss raised equity aggressively through 2021-22 during the uranium upturn and has used those funds to fully finance the Honeymoon restart with cash reserves remaining. No debt. No near-term capital raise risk barring a major acquisition.\n\nDividend policy is likely to emerge as Honeymoon ramps into steady-state — possibly in 2026 if uranium prices hold. Investors should not buy Boss for current income; the case is production growth plus uranium price leverage."},
    {"heading":"Risks","body":"Uranium price is the first-order risk: a sustained return to US$40-50 pricing would materially compress margins. Ramp-up execution at Honeymoon is a second risk — ISR operations are technically demanding and wellfield optimisation takes time.\n\nAlta Mesa carries US regulatory risk — NRC licensing, state utility regulation, and the Texas tort environment. Boss''s 30% minority position limits operational control.\n\nFor Australian-resident investors, Boss is a credible alternative to Paladin: smaller scale, cleaner balance sheet, different geographic mix. Many energy-focused portfolios hold both."}
  ]$json$::jsonb,
  $json$["Boss Energy","BOE","uranium","Honeymoon","ISR","ASX"]$json$::jsonb,
  7, true, NOW(),
  ARRAY['uranium'], ARRAY['resources_fund_manager','energy_financial_planner']::text[],
  'published',
  'Market Research Team', 'Invest.com.au'
),

-- 3. Deep Yellow
(
  'Deep Yellow (DYL): The Highest-Quality Uranium Developer on the ASX',
  'deep-yellow-dyl-tumas-development',
  'Tumas in Namibia is shovel-ready. Management has built uranium operations before. First production by late 2027 is the investment case.',
  'uranium',
  'guide',
  $json$[
    {"heading":"Who is Deep Yellow","body":"Deep Yellow (ASX: DYL) is a uranium developer with two main assets: the Tumas project in Namibia (currently being engineered toward first uranium in late 2027) and the Mulga Rock project in Western Australia (earlier stage, subject to state approvals).\n\nThe company''s Managing Director, John Borshoff, previously founded Paladin and led it through its production ramp-up and global expansion — deep operating experience in uranium specifically, not generic mining."},
    {"heading":"Tumas economics","body":"The 2024 Tumas Definitive Feasibility Study was published at a reference uranium price of US$65/lb. Even at that conservative price the project shows attractive economics: around US$65M capex for the first phase, cash costs in the high-US$30s per pound, and a life-of-mine production profile of around 3 million pounds per year.\n\nAt current spot uranium prices above US$80, Tumas shows materially stronger returns. The project is located in a prolific Namibian uranium district — near Rossing, Husab and Langer Heinrich — with established supporting infrastructure."},
    {"heading":"Why management matters","body":"Uranium development is unusual in that the number of teams who have actually built and operated uranium mines this century can be counted on one hand. The regulatory, environmental, and technical rigor is greater than for most commodities. Execution risk is correspondingly higher.\n\nDeep Yellow''s leadership has built uranium operations from exploration through production at Paladin. This reduces a specific category of risk that weighs on most developer-stage uranium equities."},
    {"heading":"Mulga Rock","body":"Mulga Rock is a separate project in Western Australia, historically advanced by Vimy Resources before Deep Yellow''s 2022 acquisition of Vimy. The project holds Commonwealth and state approvals historically but a change in state government uranium-mining position in 2017 has clouded its regulatory path.\n\nInvestors should not assume Mulga Rock in the investment case for Deep Yellow today. Treat any progress there as upside."},
    {"heading":"Dilution and financing","body":"Deep Yellow has funded exploration and DFS from equity, and further equity issuance is likely to support Tumas development. Dilution is the primary valuation risk to current shareholders between now and first production.\n\nA debt-plus-offtake financing package — similar to what Boss used at Honeymoon — would minimise dilution and is one of the key events to watch over 2025-26."},
    {"heading":"Who should own DYL","body":"Deep Yellow fits investors seeking pre-production uranium leverage with reduced execution risk versus generic explorers. It is not for income investors — no dividends for several years. It is not for risk-averse portfolios — development-stage mining always carries material downside in a commodity downturn.\n\nSizing in an energy-focused portfolio might be 1-3% alongside positions in producing Paladin and Boss. A resources fund manager can size against your overall mining exposure."}
  ]$json$::jsonb,
  $json$["Deep Yellow","DYL","uranium","Tumas","Namibia","developer"]$json$::jsonb,
  7, true, NOW(),
  ARRAY['uranium'], ARRAY['resources_fund_manager','mining_tax_advisor']::text[],
  'published',
  'Market Research Team', 'Invest.com.au'
),

-- 4. Bannerman Energy
(
  'Bannerman Energy (BMN): Etango — Size Matters',
  'bannerman-energy-bmn-etango-scale',
  'Etango is one of the largest undeveloped uranium resources globally. Bannerman''s challenge is turning scale into production.',
  'uranium',
  'analysis',
  $json$[
    {"heading":"Etango''s scale","body":"Bannerman Energy (ASX: BMN) owns the Etango project in Namibia — 205 million pounds of U3O8 resource across the deposit portfolio. For context, that''s roughly 30-35 years of potential production at typical mine scale. Few uranium resources globally are larger.\n\nScale cuts both ways. It supports very long mine life and decades of cashflow once in production. It also implies substantial capex — in the hundreds of millions of USD — and a long development timeline."},
    {"heading":"DFS and FID","body":"Bannerman completed the Etango-8 DFS (an 8-million-pound-per-year initial development case) in 2023 and announced Final Investment Decision in 2024. Project financing is now the dominant focus — a mix of debt, offtake prepayments, and equity is expected.\n\nInitial capex is guided around US$317M. That is a significant funding requirement for a company with a market capitalisation around A$650M. Equity issuance is likely to form part of the financing package."},
    {"heading":"Why scale is worth the capex","body":"At Etango''s resource and production scale, operating costs benefit from economies of scale. Cash costs are guided below US$40/lb. At US$80 uranium, margin per pound is US$40+ across an 8 million pound-per-year production profile — roughly US$320M annual operating margin at nameplate.\n\nThat cashflow potential is what justifies the capex. Execution is the variable."},
    {"heading":"Namibia as a jurisdiction","body":"Namibia is a long-established uranium producer with Rossing, Husab and Langer Heinrich operating within a 50km radius of Etango. Infrastructure — roads, water, grid power — is in place. The country has a stable mining code and consistent policy stance on uranium production.\n\nJurisdiction risk is meaningfully lower than emerging-market alternatives (Kazakhstan, Niger). It is higher than North American or Australian production but commensurate with the economic advantages of the geology."},
    {"heading":"Risks","body":"Uranium-price risk: at sustained US$50/lb or lower, Etango economics compress materially. A project of this capex scale is vulnerable to price downturns during construction.\n\nFinancing risk: the dilution or leverage required to fund construction depends on offtake terms and debt availability. A tight financing outcome is meaningfully positive; a diluted package less so.\n\nExecution: first-of-scale uranium projects carry construction risk regardless of the operator''s experience."},
    {"heading":"Investor fit","body":"Bannerman is for investors seeking leveraged exposure to long-duration uranium fundamentals with a 2028+ first-production horizon. Volatility will be high through construction. Position sizing should reflect that — typically a smaller weighting than producing peers.\n\nPair-holding with a producer (Paladin or Boss) and a near-production developer (Deep Yellow) creates a credible ASX uranium basket with diversified risk across the development curve."}
  ]$json$::jsonb,
  $json$["Bannerman","BMN","uranium","Etango","Namibia","developer"]$json$::jsonb,
  6, true, NOW(),
  ARRAY['uranium'], ARRAY['resources_fund_manager']::text[],
  'published',
  'Market Research Team', 'Invest.com.au'
),

-- 5. Boss vs Paladin
(
  'Boss Energy (BOE) vs Paladin (PDN): Choosing Your ASX Uranium Producer',
  'boss-energy-vs-paladin-asx-uranium',
  'Both are producing. Both are investable. They''re very different businesses and work for different portfolios.',
  'uranium',
  'comparison',
  $json$[
    {"heading":"Same category, different bets","body":"Paladin (PDN) and Boss Energy (BOE) are the ASX''s two producing uranium companies — an accurate description, but one that hides how different they are operationally, financially, and in terms of risk exposure.\n\nChoosing between them is not a quality judgment — it''s a fit judgment against what an investor wants from their uranium allocation."},
    {"heading":"Scale and geography","body":"Paladin is larger (market cap around A$3.8B vs Boss''s A$1.6B) and its primary production is Langer Heinrich in Namibia — a conventional heap-leach operation. Boss''s primary production is Honeymoon in South Australia — in-situ recovery — plus a 30% JV interest in Alta Mesa in Texas.\n\nGeographic exposure: Paladin is Namibia-dominant with Canadian development upside; Boss is Australia-dominant with US production.\n\nAustralian production is a meaningful differentiator — Boss is one of very few ASX companies producing uranium from Australian ore bodies, given state-level bans outside SA."},
    {"heading":"Balance sheet and financial risk","body":"Boss is debt-free with substantial cash reserves post-restart — no meaningful balance sheet risk. Paladin has taken on debt to fund Langer Heinrich restart and has a more complex capital structure.\n\nFor conservative allocators this pushes toward Boss. For investors prioritising production scale, Paladin''s larger footprint at similar balance-sheet robustness may justify the additional financial complexity."},
    {"heading":"Contract book and price capture","body":"Paladin has signed a substantial long-term contract book — revenue stability over the next 5+ years with partial upside capture on spot moves. Boss has contracted less of Honeymoon''s production and is more exposed to spot uranium prices.\n\nIf spot uranium rises further, Boss captures more upside proportionally. If spot falls, Paladin''s contract book cushions revenue. The view on uranium price direction should influence the choice."},
    {"heading":"Dividends","body":"Neither pays a dividend in 2026. Both could initiate payments as production stabilises; Boss''s cleaner balance sheet and US-production geographic mix may support an earlier dividend than Paladin''s more complex situation.\n\nFor investors needing current income, neither company fits. For total-return investors, the absence of dividend-yield pressure enables reinvestment into growth projects."},
    {"heading":"Pair-holding","body":"Many ASX uranium investors hold both. The correlation between Boss and Paladin is high — around 0.7-0.8 — because both move on uranium-price moves and sector sentiment. But idiosyncratic exposure differs enough that holding both provides genuine diversification within the sector.\n\nA typical specialist portfolio allocation might be 2-3% in Paladin and 1-2% in Boss, with additional exposure via developers (Deep Yellow, Bannerman) and the ATOM ETF for broader sector capture."}
  ]$json$::jsonb,
  $json$["Boss","Paladin","BOE","PDN","uranium","comparison"]$json$::jsonb,
  6, true, NOW(),
  ARRAY['uranium'], ARRAY['resources_fund_manager','stockbroker_firm']::text[],
  'published',
  'Market Research Team', 'Invest.com.au'
),

-- 6. Uranium ETFs
(
  'Uranium ETFs for Australian Investors: ATOM and the Global Options',
  'uranium-etfs-australia-atom',
  'ATOM gives you the sector in a single ticket. Understanding what it actually holds — and what it doesn''t — matters.',
  'uranium',
  'guide',
  $json$[
    {"heading":"The ASX uranium ETF","body":"Global X Uranium ETF (ASX: ATOM) is the primary ASX-listed vehicle for diversified uranium sector exposure. It holds approximately 40 positions across the global uranium supply chain — mining companies, developers, fuel cycle services, and physical uranium trusts.\n\nMER is around 0.69% — in line with other niche-sector ETFs. The fund is currency-unhedged — returns reflect USD-denominated underlying holdings translated to AUD."},
    {"heading":"What''s in ATOM","body":"Top holdings typically include Cameco (Canada — largest Western uranium producer), Kazatomprom (Kazakhstan — world''s largest producer), NexGen Energy (Canadian developer — Arrow project), Denison Mines (Canadian — Wheeler River), and Sprott Physical Uranium Trust. ASX names including Paladin and Boss feature but at smaller weights.\n\nThis matters: ATOM is a global sector ETF, not an ASX-specific one. If you want concentrated ASX uranium exposure specifically, individual stock picking is still necessary."},
    {"heading":"Physical uranium exposure","body":"The Sprott Physical Uranium Trust (Toronto listed) is a meaningful ATOM holding. The trust buys and holds physical uranium (U3O8) — not futures or equities — and trades at or near spot uranium price.\n\nFor investors who specifically want exposure to uranium price rather than mining company earnings, direct holding of Sprott is an alternative. In Australia this requires an international-equity-enabled broker. Most domestic retail brokers don''t offer Toronto-listed trust access."},
    {"heading":"The US ETF options","body":"URA (Global X Uranium ETF — US listed) and URNM (Sprott Uranium Miners ETF — US listed) are the two heavyweight US-listed uranium ETFs. Both hold broader portfolios than ATOM with different methodologies.\n\nAccessing these requires a US-equity-enabled broker. US withholding tax applies on distributions (15% under DTA with W-8BEN). For SMSF trustees, brokerage account restrictions may limit access."},
    {"heading":"Currency considerations","body":"Uranium is priced in USD. Mining-company earnings are mostly USD. For Australian investors holding unhedged exposure (ATOM, URA, URNM), a weakening AUD amplifies returns on uranium price rises and dampens them on falls.\n\nCurrency-hedged uranium products are not widely available. Investors with a specific AUD/USD view should consider the interaction."},
    {"heading":"When ETFs vs stocks makes sense","body":"ETFs suit investors wanting uranium sector exposure without individual stock-picking risk, SMSF trustees seeking simpler record-keeping, and portfolios where the uranium allocation is under 5% of total equity.\n\nDirect stocks make more sense where an investor wants specific exposures (Australian producer only, developer-stage leverage, specific geography) or wants franking dividends (Paladin and Boss may eventually pay them; foreign-listed ETFs typically don''t produce franked income).\n\nMany portfolios do both: a core ATOM position plus 1-2 stock-specific overlays for conviction names."}
  ]$json$::jsonb,
  $json$["uranium ETF","ATOM","URA","URNM","Sprott","uranium"]$json$::jsonb,
  6, true, NOW(),
  ARRAY['uranium'], ARRAY['energy_financial_planner','stockbroker_firm']::text[],
  'published',
  'Market Research Team', 'Invest.com.au'
),

-- 7. Uranium spot vs long-term
(
  'Uranium Spot vs Long-Term Price: Why Both Matter',
  'uranium-spot-vs-long-term-price',
  'The uranium market runs on two prices simultaneously. Understanding the spread is essential to sizing uranium equity positions.',
  'uranium',
  'guide',
  $json$[
    {"heading":"Two prices, one commodity","body":"Unlike oil or copper, uranium trades in two separate price markets simultaneously. The spot market handles short-term discretionary trades — typically under 12-month delivery. The term market handles long-term utility contracts — typically 5-10 year supply agreements at prices agreed up front or subject to formulae.\n\nThe spread between spot and term prices tells you a lot about where the market is in its cycle."},
    {"heading":"Who trades in each market","body":"Spot buyers are typically traders, speculators, financial vehicles (Sprott Physical Uranium Trust), and utilities covering short-term operational shortfalls. Spot volume is relatively thin — a few million pounds per year in most years.\n\nTerm buyers are primarily nuclear utilities on multi-decade fuel planning horizons. Term contract volume dominates: roughly 120 million pounds of U3O8 are consumed by nuclear reactors globally per year, and most of that is delivered under term contracts signed years in advance."},
    {"heading":"How spot and term typically relate","body":"In balanced markets, spot prices often sit below term prices — utilities pay a premium for the security of long-term supply. In tight markets, spot can overshoot term as speculative and trader activity drives short-term prices.\n\nThrough 2022-24, spot prices spiked above US$100/lb while term prices rose more gradually toward the US$80 range. This is a classic tight-market signature — spot running ahead of term as utilities are slow to re-contract and speculators front-run the adjustment."},
    {"heading":"Why producers care more about term","body":"A uranium producer with long-term supply contracts has revenue visibility. A producer entirely exposed to spot has earnings volatility that makes financing and capital allocation difficult.\n\nThis is why operating producers (Cameco, Kazatomprom, Paladin, Boss) contract most of their production years in advance. The spot market is where marginal volumes get sold — and where speculators set headline prices that media report."},
    {"heading":"What Australian investors should watch","body":"Term contract signings are a leading indicator of sustained producer pricing. When utilities announce multi-year US$75+ contracts — particularly from tier-one counterparties — it signals durable pricing rather than spot spikes.\n\nSpot price swings grab headlines but often don''t translate into producer earnings for the contracted portion of their book. Watch the commentary in Paladin, Boss and Cameco quarterly reports for realised pricing — that''s the number that matters for the bottom line."},
    {"heading":"Implications for equity sizing","body":"Contracted producers (Paladin has a large term book) are lower-beta to spot uranium moves than speculative exposures like developers or the Sprott Physical Uranium Trust.\n\nAn ASX uranium basket that mixes a contracted producer (Paladin), a more spot-exposed producer (Boss), a developer (Deep Yellow or Bannerman), and a physical-uranium proxy (Sprott, via an international-equity-enabled broker) captures different points on the spot-versus-term curve.\n\nMatching portfolio mix to your uranium price thesis — directional spot-up view vs structural utility-restocking view — is where a specialist resources fund manager can add value."}
  ]$json$::jsonb,
  $json$["uranium","spot price","term price","contract market","uranium cycle"]$json$::jsonb,
  6, true, NOW(),
  ARRAY['uranium'], ARRAY['resources_fund_manager','energy_financial_planner']::text[],
  'published',
  'Market Research Team', 'Invest.com.au'
),

-- 8. Australia's uranium ban
(
  'Australia''s Uranium Mining Bans: The Policy Map Most Investors Miss',
  'australia-uranium-mining-bans-policy',
  'Despite holding the world''s largest uranium reserves, Australia only mines in two states. Here''s the state-by-state picture and what might change.',
  'uranium',
  'analysis',
  $json$[
    {"heading":"The policy patchwork","body":"Australia holds roughly 28% of the world''s known uranium reserves — the largest share globally. Yet the country is only the third-largest producer, behind Kazakhstan and Canada. The reason is a patchwork of state-level bans that prevent uranium mining across most of the country despite the federal government permitting export under strict international safeguards.\n\nThis matters for investors because Australian uranium supply growth is state-politics-constrained, not geology-constrained."},
    {"heading":"South Australia","body":"South Australia is the only state with unambiguous permission for conventional and in-situ recovery uranium mining. Olympic Dam (BHP — polymetallic, includes uranium as a byproduct), Four Mile (Heathgate, ISR, privately held) and Honeymoon (Boss Energy, ISR) all operate in SA.\n\nSA''s uranium-friendly stance has been bipartisan across state governments for two decades. This makes SA the most investable uranium jurisdiction in Australia."},
    {"heading":"Western Australia","body":"WA lifted its uranium mining ban in 2008 under a Liberal government. The Labor government that came to power in 2017 reinstated a de facto ban on new projects while permitting a small number of historically-approved projects to continue development (including Toro''s Wiluna).\n\nThe policy is genuinely uncertain and a major swing factor for Mulga Rock (Deep Yellow), Wiluna (Toro), and a pipeline of earlier-stage WA tenements. A future policy shift either direction materially affects valuations."},
    {"heading":"Queensland","body":"Queensland prohibits uranium mining by state legislation. The ban has been politically stable across both Labor and LNP governments. Despite Queensland''s uranium exploration rights held historically (notably Paladin''s Valhalla project), production in Queensland is not possible under current policy.\n\nValhalla and related Queensland resources are not included in most analyst valuations of Paladin for this reason. Policy change would create meaningful upside."},
    {"heading":"NSW and Victoria","body":"NSW prohibits uranium mining by state legislation. Victoria similarly prohibits uranium mining. Both bans are long-standing with no active policy debate.\n\nLimited uranium resources are known in both states — the prohibition is not material to current producer pipelines but closes off exploration."},
    {"heading":"Northern Territory","body":"The NT permits uranium mining. Ranger (Rio Tinto, now closed after 2021 rehabilitation obligations) was the largest historical NT producer. Several early-stage projects exist in the Alligator Rivers region — a major uranium province — but current development requires meeting Kakadu-region environmental and Traditional Owner consultation requirements.\n\nThe Jabiluka project has been held with no development activity under a long-standing agreement. This is a live political and cultural issue."},
    {"heading":"Federal-level factors","body":"Federal export permits are required for uranium regardless of state of origin, and Australia only exports to countries with valid bilateral safeguards agreements under the NPT framework. Federal policy has been stable in permitting export.\n\nThe federal nuclear power ban under the EPBC Act and ARPANSA Act is separate from uranium mining policy — it prevents Australian nuclear power plants, not uranium exports."},
    {"heading":"What could change","body":"Federal Coalition policy in 2024-25 has advocated lifting the nuclear power ban and by implication loosening state-level uranium mining constraints through intergovernmental negotiation. Labor opposes both.\n\nFor uranium-focused investors, state-level policy shifts in WA or QLD would be the single largest catalyst for ASX uranium equities. Watch state elections more closely than commodity prices."}
  ]$json$::jsonb,
  $json$["uranium ban","SA","WA","QLD","mining policy","nuclear","Australia"]$json$::jsonb,
  7, true, NOW(),
  ARRAY['uranium'], ARRAY['mining_lawyer','foreign_investment_lawyer']::text[],
  'published',
  'Market Research Team', 'Invest.com.au'
),

-- 9. AUKUS + uranium
(
  'AUKUS and Uranium: What Nuclear Submarines Mean for Australian Supply',
  'aukus-uranium-supply-implications',
  'The AUKUS submarine program uses a different uranium stream from commercial reactors. Here''s what it does — and doesn''t — mean for ASX uranium investors.',
  'uranium',
  'analysis',
  $json$[
    {"heading":"What AUKUS actually is","body":"AUKUS is the 2021 trilateral security agreement between Australia, the UK, and the US. Its most discussed component is the acquisition of nuclear-powered (not nuclear-armed) submarines for the Royal Australian Navy — initially Virginia-class submarines from the US, then a new SSN-AUKUS class built in Australia and the UK.\n\nThe first Virginia-class delivery is expected in the early 2030s. SSN-AUKUS builds begin around the same timeframe with delivery later in the decade."},
    {"heading":"The fuel is HEU, not LEU","body":"US Virginia-class submarines use highly enriched uranium (HEU) — approximately 93% U-235 enriched. This is weapons-grade material but produced under strict non-proliferation safeguards and reserved exclusively for propulsion use.\n\nHEU is produced by the US Department of Energy from a combination of legacy stockpiles and specialised enrichment facilities. The supply chain is completely separate from commercial nuclear fuel, which uses low-enriched uranium (LEU — 3-5% U-235)."},
    {"heading":"What that means for ASX uranium","body":"AUKUS submarines do not create meaningful incremental demand for ASX-listed uranium producers'' output. Paladin, Boss, and other producers sell U3O8 concentrate into the commercial LEU supply chain, not the HEU propulsion chain.\n\nNews flow conflates the two. Investors should discount headlines claiming AUKUS is directly bullish for ASX uranium equities — it is not."},
    {"heading":"The indirect effect that does matter","body":"AUKUS has reframed the Australian domestic conversation about nuclear technology. Federal Coalition policy has moved from opposition to nuclear power toward active advocacy. Labor remains opposed but has softened rhetoric on uranium mining expansion.\n\nThis matters because a future domestic civilian nuclear industry — even hypothetical — would create meaningful Australian uranium demand. Currently Australia exports 100% of its uranium production. Any scenario where 10-30% is consumed domestically would substantially tighten the global market on the margin."},
    {"heading":"Strategic reserve implications","body":"Discussions in 2024-25 around a potential Australian Strategic Uranium Reserve — similar in concept to the US Strategic Petroleum Reserve — would, if implemented, take uranium off the export market and support prices.\n\nThis is a potential policy development rather than a current one. Investors should treat strategic reserve scenarios as upside-optionality rather than base-case assumptions."},
    {"heading":"Practical takeaway","body":"AUKUS is a geopolitical and strategic event that reshapes Australian attitudes toward nuclear technology in ways that will matter over 10-20 year horizons. It does not create near-term demand for ASX uranium equities'' production.\n\nInvestment sizing for ASX uranium should be anchored on commercial demand drivers (utility restocking, SMR development, Russian sanctions, decarbonisation targets) rather than on AUKUS headlines. A foreign-investment lawyer or specialist adviser can help separate durable drivers from speculative narratives."}
  ]$json$::jsonb,
  $json$["AUKUS","uranium","submarines","HEU","LEU","Australia","nuclear"]$json$::jsonb,
  6, true, NOW(),
  ARRAY['uranium'], ARRAY['foreign_investment_lawyer']::text[],
  'published',
  'Market Research Team', 'Invest.com.au'
),

-- 10. SMR demand
(
  'Small Modular Reactors (SMR) and Uranium Demand: The 2030s Thesis',
  'smr-uranium-demand-thesis',
  'AP300, TerraPower, Rolls-Royce SMR. A new generation of reactors is entering deployment — and they all need uranium.',
  'uranium',
  'analysis',
  $json$[
    {"heading":"What SMRs are","body":"Small modular reactors (SMRs) are nuclear reactors with electrical output typically under 300 MWe — much smaller than the 1,000-1,400 MWe conventional Gen-III reactors dominating current nuclear power. They are designed for factory manufacture and on-site assembly, potentially reducing construction timelines and capital cost per unit.\n\nA dozen-plus SMR designs are in various stages of regulatory approval and early deployment globally. Notable designs: Westinghouse AP300, NuScale VOYGR, GE-Hitachi BWRX-300, TerraPower Natrium, Rolls-Royce SMR, and a range of Chinese and Russian designs."},
    {"heading":"Why the deployment narrative has real commercial support","body":"Tech giants (Microsoft, Google, Amazon) have announced multi-gigawatt SMR commitments for data centre baseload power. Utilities across the US, UK, Poland, Romania, and Canada have signed SMR procurement agreements. The UK has selected Rolls-Royce as its preferred SMR partner.\n\nThis is meaningful: SMRs are moving from R&D concept to actual procurement commitments with 2030s delivery timelines. That''s the key shift relative to the last decade."},
    {"heading":"Uranium demand math","body":"A conventional 1,000 MWe pressurised water reactor consumes roughly 200,000 lb U3O8 per year. SMRs are proportional — a 300 MWe SMR consumes around 60,000 lb per year, a 77 MWe NuScale module around 15,000 lb.\n\nIndicative scenarios: if cumulative global SMR deployment reaches 40 GWe by 2040 — a mid-case trajectory — that adds around 8 million lb of annual U3O8 demand on top of conventional reactor demand. In a market currently consuming 180 million lb per year and undersupplied, that is a material incremental demand signal."},
    {"heading":"Fuel cycle considerations","body":"Not all SMRs use the same fuel. Conventional LEU (3-5% enrichment) is used by AP300, BWRX-300, and Rolls-Royce SMR. HALEU (high-assay LEU, up to 19.75% enrichment) is used by TerraPower Natrium, Kairos Hermes, and X-energy Xe-100.\n\nHALEU production capacity is the bottleneck for some SMR deployments. Existing Western enrichment facilities are not sized for HALEU. This affects the timing of demand — HALEU-dependent SMRs may be delayed until fuel supply scales."},
    {"heading":"Timing matters for equity valuation","body":"Most SMR deployments target first-fuel-load between 2028 and 2035. That means meaningful uranium demand impact arrives in the late 2020s and ramps through the 2030s.\n\nFor ASX uranium equities with 2027+ first-production horizons (Deep Yellow, Bannerman, Lotus), this timing is favourable. Production ramps into rising demand. For current producers (Paladin, Boss), the demand supports term contract pricing through their planned operating life."},
    {"heading":"Risks to the thesis","body":"SMR deployment delays are common. Regulatory approval is slower than industry projects. Supply chain constraints (HALEU, specialist components) can delay first fuel loads. Competition from renewable plus storage is genuine.\n\nThe thesis is not ''SMRs will save uranium prices'' — it''s ''SMRs are one of several structural demand drivers alongside utility restocking, decarbonisation commitments, and Russian supply disruption that together support higher long-term uranium prices than the 2011-2022 trough''. Multiple drivers make the thesis more robust than a single narrative."}
  ]$json$::jsonb,
  $json$["SMR","uranium","AP300","TerraPower","SMRs","nuclear","uranium demand"]$json$::jsonb,
  7, true, NOW(),
  ARRAY['uranium'], ARRAY['resources_fund_manager','energy_financial_planner']::text[],
  'published',
  'Market Research Team', 'Invest.com.au'
),

-- 11. Russia sanctions
(
  'Russian Uranium Sanctions: The Western Supply Gap Paladin and Boss Are Filling',
  'russian-uranium-sanctions-supply-gap',
  'The US-EU ban on Russian uranium and enrichment services has reshaped Western utility procurement. Here''s what it means for ASX names.',
  'uranium',
  'analysis',
  $json$[
    {"heading":"The sanctions in plain terms","body":"The US Prohibiting Russian Uranium Imports Act, signed into law in May 2024, bans imports of Russian low-enriched uranium (LEU) into the US. Waivers apply for contracted deliveries through 2027, but new contracting is effectively closed. EU members have followed a similar trajectory with phased reductions in Russian uranium and enrichment services through the late 2020s.\n\nRussia''s Tenex and Rosatom entities had supplied around 24% of US reactor enrichment needs and roughly 20% globally. That share is now forced to move to Western and allied supply sources."},
    {"heading":"Enrichment is the tight point","body":"The bottleneck is enrichment capacity, not uranium itself. Converting mined U3O8 concentrate into reactor fuel requires conversion to UF6, enrichment to 3-5% U-235, and fabrication into fuel assemblies.\n\nNon-Russian Western enrichment capacity — Urenco in Europe, Orano in France, and a small US operation — was near capacity before sanctions. Expanding capacity takes 3-5+ years. Short-term, the West is under-capacity for enrichment, which supports higher prices through the full fuel cycle including raw uranium."},
    {"heading":"Where ASX producers fit","body":"Paladin and Boss both sign contracts with US utilities that include price formulas reflecting tight Western supply. As existing Russian-dependent contracts are repriced or replaced, the pricing environment is favourable for new contracting.\n\nBoss''s 30% Alta Mesa interest is US-sited production — particularly valued in a domestic-preferred procurement environment. Paladin''s Langer Heinrich is Namibian but operated by a Western company with clean safeguards credentials — equally acceptable to US utilities."},
    {"heading":"China as the counterfactual","body":"Chinese utilities are increasing uranium procurement but generally sourcing from central Asian and African producers with pricing less transparent than Western term contracts. The overall global supply-demand balance is tightening as both Western restocking and Chinese reactor buildout accelerate.\n\nFor ASX-listed producers, Chinese demand is a complementary tailwind rather than a primary customer base — US and European utilities remain the core contract counterparties."},
    {"heading":"Duration of the tailwind","body":"Western enrichment expansion — Urenco capacity additions, Centrus Energy''s US HALEU work, Orano expansions — is committed but will take years. The tight Western fuel-cycle environment is likely to persist through the second half of the 2020s.\n\nThis provides multi-year pricing visibility for producers with term contracts. It does not guarantee durably high spot prices, which remain cyclical."},
    {"heading":"Risks","body":"Russia could partially return to Western markets if geopolitics shift. A major nuclear accident could collapse utility reactor operation and demand. Economic downturn could reduce power demand and therefore uranium demand. All are real but low-probability scenarios.\n\nFor ASX uranium investors, the Russia sanctions provide a meaningful structural tailwind that complements SMR demand and utility restocking. The three drivers together are what makes the 2024+ uranium cycle qualitatively different from the 2005-2008 cycle."}
  ]$json$::jsonb,
  $json$["Russia","uranium sanctions","HALEU","enrichment","ASX uranium"]$json$::jsonb,
  6, true, NOW(),
  ARRAY['uranium'], ARRAY['resources_fund_manager','foreign_investment_lawyer']::text[],
  'published',
  'Market Research Team', 'Invest.com.au'
),

-- 12. FIRB for uranium
(
  'FIRB Rules for Uranium Investment: Double Approval and What It Means',
  'firb-uranium-sensitive-sector-rules',
  'Uranium is the most scrutinised sector in the Australian foreign investment regime. Here''s how the double-approval process works.',
  'uranium',
  'guide',
  $json$[
    {"heading":"Uranium is different","body":"Most Australian sectors require only FIRB approval for foreign investors. Uranium requires both FIRB and separate Ministerial approval under the Atomic Energy Act 1953 (Cth). This double-approval regime reflects Australia''s NPT obligations and the requirement that all uranium transactions serve peaceful purposes under international safeguards.\n\nTransactions of any scale in uranium tenements, uranium-producing companies, or uranium processing facilities must clear both processes. Portfolio share acquisitions in ASX-listed uranium companies below FIRB thresholds remain under the general notifiable thresholds."},
    {"heading":"Who triggers FIRB for uranium","body":"Direct acquisition of uranium tenements, mines, or processing facilities: FIRB-notifiable at zero threshold for any foreign person.\n\nAcquisition of shareholdings in ASX-listed uranium companies: FIRB-notifiable at 10% (for foreign government investors or their funds) or 20% (for private foreign investors) — in line with general ASX share acquisition rules.\n\nAcquisition of interests in uranium royalties or offtake rights: typically FIRB-notifiable as interests in Australian real property."},
    {"heading":"The Ministerial approval layer","body":"Separate from FIRB, the Minister for Resources (under delegation from the Prime Minister in some cases) must consent to transfer of ''source material'' — uranium — and interests in uranium-related assets. This approval is administered under the Atomic Energy Act 1953 and associated regulations.\n\nThe Ministerial approval process tests whether the transaction serves peaceful purposes, whether the acquirer is a party to a valid bilateral safeguards agreement with Australia, and whether international obligations are satisfied. This is additional to the economic and national-security tests FIRB applies."},
    {"heading":"Allied-nation investors","body":"Investors from countries with current bilateral safeguards agreements with Australia — US, UK, EU member states, Japan, Korea, Canada, and others — have cleaner Ministerial approval paths. The safeguards framework gives pre-agreed comfort on end-use controls.\n\nInvestors from countries without such agreements face meaningfully more complex review and, in some cases, cannot proceed regardless of FIRB outcome. Chinese uranium investments in Australia face particular scrutiny in the current policy environment."},
    {"heading":"Timing","body":"Pre-lodgement engagement with both FIRB and the Department of Industry, Science and Resources is essential. Typical timelines for combined approval: 90-180 days for straightforward transactions by allied-nation private investors; 6-12 months for sovereign wealth or state-owned enterprise acquirers; longer for first-of-kind structures.\n\nTransaction documents should include long-stop dates of 9-12 months to accommodate the combined approval process. Break-fee and material adverse change clauses need careful drafting."},
    {"heading":"Practical steps","body":"Any non-Australian investor considering a direct uranium investment above portfolio scale should engage a foreign-investment lawyer with specific uranium experience before signing anything binding. The combined-approval process has practitioners who have done it repeatedly and others who haven''t — the difference is measured in months of timeline.\n\nBudget accordingly: legal fees for a combined FIRB + Ministerial uranium application typically run A$120K-$300K for straightforward matters, higher for sovereign or first-of-kind transactions. Government application fees are additional and scale with transaction value per the published fee schedule."}
  ]$json$::jsonb,
  $json$["FIRB","uranium","Atomic Energy Act","Ministerial approval","foreign investment"]$json$::jsonb,
  7, true, NOW(),
  ARRAY['uranium'], ARRAY['foreign_investment_lawyer','mining_lawyer']::text[],
  'published',
  'Market Research Team', 'Invest.com.au'
),

-- 13. Uranium royalties
(
  'Uranium Royalty Structures in Australia: SA, NT, and the State Regimes',
  'uranium-royalty-structures-australia',
  'Royalty frameworks vary meaningfully between the uranium-producing states. For passive investors this changes what you actually earn.',
  'uranium',
  'guide',
  $json$[
    {"heading":"Royalties explained","body":"A royalty is a payment from a mining operator to a resource owner, based on production or revenue. In Australia, minerals (including uranium) are owned by the Crown in right of the state — so state governments are the primary royalty recipients.\n\nA secondary market exists for private royalty interests: tenement owners can grant royalty rights to third parties as part of financing, sale, or partnership arrangements. These are assets investors can hold."},
    {"heading":"South Australia royalty regime","body":"SA levies an ad valorem royalty on uranium (and other metalliferous minerals) at a prescribed rate applied to the value of production. Rates move with policy but are in the 3-5% range historically. The Royalties Act 1970 (SA) governs.\n\nFor investors holding a private royalty over an SA uranium operation, the Crown royalty is paid separately — your private royalty is on top of (or sometimes structured as a net-of-Crown interest in) operating cashflows."},
    {"heading":"Northern Territory royalty regime","body":"The NT operates a profits-based royalty — essentially a 20% levy on net value of production after deductions for operating costs, capital recovery, and prescribed allowances. The profits-based design has been controversial; it produces low Crown royalty payments during early production when capital is being recovered and higher payments once capital is amortised.\n\nThe NT regime also interacts with Aboriginal Land Rights Act payments where uranium is produced on Aboriginal land. These are separate royalty streams administered by Land Councils."},
    {"heading":"Western Australia","body":"WA has a historical uranium royalty framework that would apply if production resumed. The Mining Regulations 1981 (WA) set royalty rates for uranium. Given the current de facto WA uranium mining position, the royalty regime is largely theoretical at the state level.\n\nFor investors in WA-focused developers (Toro, Mulga Rock), the royalty arithmetic is a second-order question — the first-order question is whether production is permitted at all."},
    {"heading":"Private royalty interests","body":"Secondary-market private royalties are an underappreciated investable asset class. A typical structure: a 2-5% net smelter return royalty over a named tenement or production licence, paid as a percentage of revenue after specified deductions.\n\nFor investors seeking yield without direct operational risk, royalty interests provide exposure with more defensive characteristics than equity. Returns depend on operator execution and commodity prices but survive sub-commercial operator earnings more robustly than equity."},
    {"heading":"Tax treatment","body":"For Australian residents, royalty income is ordinary income (not CGT-discounted capital gain). Income is taxed at marginal rates, with any franking credits from royalties paid by Australian-resident entities refunding per the imputation regime.\n\nFor SMSF trustees, royalty income inside the fund is taxed at the concessional rate (15% accumulation, 0% pension). Purchased royalties are generally NOT Non-Arm''s-Length Income (NALI) provided the acquisition was arm''s length — but the rules are complex and recent ATO guidance has tightened enforcement. A petroleum royalties advisor (or uranium-specialist equivalent) should review any royalty purchase before an SMSF trustee commits."},
    {"heading":"Why uranium royalties are niche","body":"Uranium-specific royalty opportunities are rare in Australia. The small number of producing mines (Olympic Dam, Four Mile, Honeymoon) and tightly-held tenement ownership means secondary royalty availability is thin.\n\nMost ASX uranium exposure remains through listed equity and ETF routes. Direct royalty interests typically require specialist advisor introductions and bilateral negotiation — not an exchange-traded product."}
  ]$json$::jsonb,
  $json$["uranium","royalty","SA","NT","WA","royalty structures","passive income"]$json$::jsonb,
  7, true, NOW(),
  ARRAY['uranium'], ARRAY['mining_tax_advisor','petroleum_royalties_advisor']::text[],
  'published',
  'Market Research Team', 'Invest.com.au'
),

-- 14. SMSF uranium
(
  'SMSF Uranium Investment: Rules, Risks, and Sizing',
  'smsf-uranium-investment-rules',
  'Uranium stocks and ETFs are fine for SMSFs. Direct development equity is a different conversation.',
  'uranium',
  'guide',
  $json$[
    {"heading":"What''s straightforward","body":"ASX-listed uranium stocks (Paladin, Boss, Deep Yellow, Bannerman, etc.) and the Global X Uranium ETF (ATOM) are conventional listed investments with no special SMSF trustee obligations beyond the normal investment-strategy and sole-purpose test requirements.\n\nFor most SMSF trustees, this is sufficient exposure. Uranium sector allocation of 2-5% of SMSF equity portfolio is a reasonable starting range for investors with a thematic view."},
    {"heading":"The in-house assets trap","body":"If an SMSF trustee works for a uranium company or has related-party exposure, the 5% in-house assets limit becomes relevant. Employer-scheme share issuance — common in small-cap uranium explorers — can accidentally push an SMSF above the 5% limit.\n\nAn SMSF accountant should review any uranium employer exposure inside the fund annually. A breach triggers deemed income and reporting obligations that compound over time if not addressed."},
    {"heading":"Unlisted wholesale uranium funds","body":"Wholesale-investor unlisted funds covering uranium exposure exist, primarily within broader resources-fund mandates. SMSFs can hold these subject to: (1) the fund manager''s AFSL; (2) SMSF meeting wholesale-investor eligibility ($2.5M+ net assets or $250K+ gross income); (3) arm''s-length acquisition.\n\nMinimums are typically $100K-$500K. Liquidity terms vary — some funds have monthly redemption, others have 1-3 year lock-ups. Check terms carefully before committing SMSF capital."},
    {"heading":"Direct project equity","body":"Direct investment in unlisted uranium development projects (private placements, convertible notes, tenement-level interests) inside an SMSF is permitted but carries significant trustee-compliance obligations.\n\nRequirements: (1) investment must fit documented investment strategy; (2) asset must be independently valued annually; (3) the SIS Act sole-purpose test must be satisfied — the investment must be for the SMSF''s retirement benefits, not a side-business or family arrangement; (4) arm''s-length acquisition and pricing.\n\nFor SMSFs under ~A$1.5M in assets, direct uranium project equity is generally not worth the compliance overhead. Above that scale it can make sense with specialist advice."},
    {"heading":"NALI risk","body":"Non-Arm''s-Length Income (NALI) is the worst-case SMSF outcome. If an SMSF acquires a uranium royalty, tenement interest, or project equity at less than arm''s-length value, or receives income at non-arm''s-length terms, ALL income from that asset is taxed at 45% instead of the normal 15% or 0%.\n\nFor uranium royalty purchases in particular — typically bilateral negotiations with potentially related parties — NALI risk is real. A specialist SMSF accountant plus a mining tax advisor reviewing the transaction is cheap insurance against a multi-year tax hit."},
    {"heading":"Practical SMSF uranium strategy","body":"For most SMSF trustees a practical uranium exposure looks like: 1-3% of total equity in 2-3 ASX producers and developers; 1-2% in ATOM for diversified sector exposure; total uranium 3-5% of equity.\n\nFor SMSFs above A$2M in pension phase, a small (1-2%) allocation to an unlisted wholesale uranium fund can enhance professional management and access to wholesale deal flow. For SMSFs under A$1M, stay listed and simple.\n\nConcentration risk matters. A single uranium explorer at >3% of SMSF assets is position-sizing that warrants a specialist review before committing."}
  ]$json$::jsonb,
  $json$["SMSF","uranium","NALI","in-house assets","ASX","trustee"]$json$::jsonb,
  7, true, NOW(),
  ARRAY['uranium'], ARRAY['smsf_accountant','mining_tax_advisor','resources_fund_manager']::text[],
  'published',
  'Market Research Team', 'Invest.com.au'
),

-- 15. Utility restocking
(
  'Utility Restocking: The Quiet Driver of the Uranium Price Cycle',
  'utility-restocking-uranium-price-driver',
  'Nuclear utilities under-contracted during the 2011-2020 slump. The restocking that''s now underway is the primary demand driver in this cycle.',
  'uranium',
  'analysis',
  $json$[
    {"heading":"What utility restocking means","body":"Nuclear utilities typically maintain 2-3 years of uranium inventory and contract 5-10 years of future supply in advance of consumption. This is operational conservatism — reactor fuel contracts don''t benefit from short-term price shopping, and utilities are motivated to secure supply long before physical need.\n\nBetween 2011 and 2020, Fukushima-induced uncertainty plus low spot prices led utilities to run down inventories and delay long-term contracting. Industry-wide coverage — the share of reactor needs that were under contract — fell from typical 90%+ coverage to around 60% by 2020."},
    {"heading":"The restocking unwind","body":"From 2022 onwards, utilities globally have been catching up. Sustained contract volume — 160+ million pounds per year — is substantially above replacement levels. This excess demand over production is the primary force driving uranium prices higher through 2023-25.\n\nThe restocking process is likely to continue through the second half of the 2020s as utilities restore typical inventory levels and extend contract coverage."},
    {"heading":"Why this matters for price","body":"Restocking demand is additive to reactor operation demand. When utilities are restocking, total uranium demand temporarily exceeds the annual production rate — pushing prices higher regardless of underlying reactor fleet changes.\n\nEven without new reactor builds or SMR deployment, restocking alone supports tighter markets than 2011-2021. Combined with Russian supply restrictions and gradually growing reactor demand, the price support is robust."},
    {"heading":"When will restocking slow?","body":"Industry analysts estimate industry-wide contract coverage should return to historical 85-90% levels by 2027-2029. At that point, the demand-pulse of restocking subsides and the market is more purely balanced on reactor operation demand vs production.\n\nThe question then becomes whether SMR deployment, new reactor builds, and sustained reactor life extensions maintain the demand pull. This is where the 2025+ supply-demand picture shifts from demand-pulse to structural."},
    {"heading":"Implications for producer pricing","body":"Term contract pricing through 2027-2028 has been strong — reflecting restocking-era utility willingness to pay for security of supply. Long-term contract pricing settling in the US$75-85/lb range is favourable for producers'' cashflow visibility.\n\nFor ASX producers (Paladin, Boss) signing term contracts now, the revenue floor is well-above historical averages. For developers (Deep Yellow, Bannerman, Lotus) signing offtake as part of project financing, offtake pricing similarly reflects the current strong utility bid."},
    {"heading":"Risk to the thesis","body":"If utility restocking completes more quickly than expected — for example if utilities decide to run with thinner coverage given low probability of supply disruption — demand could soften in late 2020s. Conversely, supply disruptions (Kazakhstan issues, African political events, Russian supply tail risk) could extend the restocking effect.\n\nThis is why specialist resources fund managers closely watch contract volume and coverage ratio as the leading indicator. For retail investors, Paladin and Boss quarterly reports + Cameco commentary are accessible proxies for utility sentiment."}
  ]$json$::jsonb,
  $json$["uranium","utility restocking","contract coverage","uranium cycle","demand driver"]$json$::jsonb,
  6, true, NOW(),
  ARRAY['uranium'], ARRAY['resources_fund_manager','energy_financial_planner']::text[],
  'published',
  'Market Research Team', 'Invest.com.au'
)

ON CONFLICT (slug) DO NOTHING;
