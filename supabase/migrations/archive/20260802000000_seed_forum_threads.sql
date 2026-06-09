-- ============================================================
-- Migration: 20260802000000_seed_forum_threads.sql
-- Purpose: Seed ≥3 realistic AU-investing threads per active
--          forum_category so app/community/page.tsx can be
--          indexed (robots: index). Zero-thread categories look
--          like a dead community to Googlebot and bounce hard.
--
-- Rollback:
--   DELETE FROM public.forum_posts
--     WHERE thread_id IN (
--       SELECT id FROM public.forum_threads
--         WHERE author_name = 'Invest.com.au Community');
--   DELETE FROM public.forum_threads
--     WHERE author_name = 'Invest.com.au Community';
--   UPDATE public.forum_categories SET thread_count = 0, post_count = 0
--     WHERE slug IN (
--       'share-trading','etfs-index-funds','property-investing',
--       'super-retirement','crypto','tax-strategy','beginners','broker-reviews');
--
-- Idempotency: Each thread INSERT is guarded by WHERE NOT EXISTS
--   on (category_slug, title). The opening-post INSERT is guarded
--   on (thread_id, author_name). Safe to re-apply.
-- ============================================================

BEGIN;

-- ─── Shared seed-author placeholder ──────────────────────────
-- Threads inserted here have no real auth.users UUID — they are
-- editorial / moderator-seeded content. author_id is left NULL
-- (permitted by the schema) and author_name is set to the site
-- name so the reader understands their provenance. RLS service_role
-- INSERT policy covers this migration.
-- ──────────────────────────────────────────────────────────────

-- ══════════════════════════════════════════════════════════════
-- 1. share-trading
-- ══════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_thread_id integer;
BEGIN
  -- Thread 1: CommSec vs Stake for US shares
  IF NOT EXISTS (
    SELECT 1 FROM public.forum_threads
      WHERE category_slug = 'share-trading'
        AND title = 'CommSec vs Stake for US shares — which do you actually use?'
  ) THEN
    INSERT INTO public.forum_threads
      (category_slug, title, slug, body, author_name, is_pinned, is_locked, is_removed, reply_count, vote_score)
    VALUES (
      'share-trading',
      'CommSec vs Stake for US shares — which do you actually use?',
      'commsec-vs-stake-us-shares',
      E'I''ve been using CommSec for my ASX portfolio for years, but the US brokerage costs are eye-watering ($19.95 AUD per trade). A colleague keeps raving about Stake at USD $3 flat.\n\nFor those of you who actively trade US stocks — Apple, Nvidia, etc. — which platform have you settled on and why? Key things I care about: CHESS-equivalent safety for US stocks (I know it''s a DRS/DTCC situation), USD holding account to avoid double FX conversion, and a half-decent mobile app.\n\nAlso curious whether anyone has tried Moomoo or Interactive Brokers for this.',
      'Invest.com.au Community',
      false, false, false, 0, 4
    ) RETURNING id INTO v_thread_id;

    INSERT INTO public.forum_posts (thread_id, body, author_name, is_moderator, is_removed, vote_score)
      SELECT v_thread_id,
        E'Switched from CommSec to Stake about 18 months ago for US stuff and haven''t looked back. The USD wallet means you avoid the double FX hit — you convert once when you deposit, then trade at USD prices. CommSec''s FX margin on top of the trade fee was killing my returns on anything under $5k.\n\nFor CHESS protection: US stocks via Stake sit in an Apex Clearing account. It''s SIPC-insured up to USD $500k, which is the US equivalent. Not as clean as ASX CHESS but it''s the industry standard over there.',
        'Invest.com.au Community', false, false, 2
      WHERE NOT EXISTS (
        SELECT 1 FROM public.forum_posts WHERE thread_id = v_thread_id AND author_name = 'Invest.com.au Community'
      );
  END IF;

  -- Thread 2: ASX 200 stock filter methodology
  IF NOT EXISTS (
    SELECT 1 FROM public.forum_threads
      WHERE category_slug = 'share-trading'
        AND title = 'How do you filter for quality ASX 200 stocks? Share your process'
  ) THEN
    INSERT INTO public.forum_threads
      (category_slug, title, slug, body, author_name, is_pinned, is_locked, is_removed, reply_count, vote_score)
    VALUES (
      'share-trading',
      'How do you filter for quality ASX 200 stocks? Share your process',
      'asx-200-stock-filter-methodology',
      E'Curious what quantitative or qualitative filters people actually use before adding a stock to their watchlist. I know everyone says "do your research" but what does that look like in practice?\n\nMy current process:\n1. PE ratio < 20 (or PEG < 1 if the co is growing fast)\n2. ROE > 15% for 3 consecutive years\n3. Net debt/EBITDA < 2x\n4. Free cash flow positive for 5 years\n\nAfter that I read the last 2 annual reports and the most recent half-year results. Feels slow but I''ve avoided a few blowups.\n\nWhat would you add or remove?',
      'Invest.com.au Community',
      false, false, false, 0, 7
    ) RETURNING id INTO v_thread_id;

    INSERT INTO public.forum_posts (thread_id, body, author_name, is_moderator, is_removed, vote_score)
      SELECT v_thread_id,
        E'Solid list. I''d add a quick check on capital allocation history — specifically whether management has bought back shares at sensible prices or issued dilutive equity at the bottom of the cycle. Companies with consistently good buyback timing (BHP, CSL historically) tend to outperform.\n\nAlso: scan the related-party transactions section of the annual report. Long list of RPTs is a yellow flag even when the individual amounts look small.',
        'Invest.com.au Community', false, false, 3
      WHERE NOT EXISTS (
        SELECT 1 FROM public.forum_posts WHERE thread_id = v_thread_id AND author_name = 'Invest.com.au Community'
      );
  END IF;

  -- Thread 3: Franking credits strategy
  IF NOT EXISTS (
    SELECT 1 FROM public.forum_threads
      WHERE category_slug = 'share-trading'
        AND title = 'Maximising franking credits — what''s your strategy going into the 2026 tax year?'
  ) THEN
    INSERT INTO public.forum_threads
      (category_slug, title, slug, body, author_name, is_pinned, is_locked, is_removed, reply_count, vote_score)
    VALUES (
      'share-trading',
      'Maximising franking credits — what''s your strategy going into the 2026 tax year?',
      'maximising-franking-credits-2026',
      E'With the end of FY2026 approaching I''m doing my usual annual review of dividend-franking strategy. Currently holding CBA, WBC, and BHP in my taxable account — all at or near 100% franked.\n\nQuestions for the group:\n1. Do you hold high-franking stocks in your taxable account and growth stocks in super/offset, or vice versa?\n2. Any view on whether the 45-day rule is likely to bite anyone holding for a short-term dividend trade?\n3. For those in a lower marginal tax bracket — how much of your return is effectively the franking refund?\n\nI get that this is general strategy chat, not personal advice — just interested in how others think about it.',
      'Invest.com.au Community',
      false, false, false, 0, 5
    ) RETURNING id INTO v_thread_id;

    INSERT INTO public.forum_posts (thread_id, body, author_name, is_moderator, is_removed, vote_score)
      SELECT v_thread_id,
        E'For the 45-day rule: it''s 45 days exclusive of acquisition and disposal, and the rule only applies if your total franking credits across the year exceed $5,000. Most retail investors are under that threshold, so it''s a non-issue unless you''re dividend-stripping at scale.\n\nOn asset location: the academic consensus (and most fee-only adviser I''ve talked to) is to hold your high-yield, fully-franked Australian stocks in a taxable account if you''re in a lower bracket where the franking refund exceeds your marginal rate — and growth/international assets in super where you can''t access the imputation credits anyway.',
        'Invest.com.au Community', false, false, 4
      WHERE NOT EXISTS (
        SELECT 1 FROM public.forum_posts WHERE thread_id = v_thread_id AND author_name = 'Invest.com.au Community'
      );
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════
-- 2. etfs-index-funds
-- ══════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_thread_id integer;
BEGIN
  -- Thread 1: VAS vs A200 debate
  IF NOT EXISTS (
    SELECT 1 FROM public.forum_threads
      WHERE category_slug = 'etfs-index-funds'
        AND title = 'VAS vs A200 — is the 0.03% MER gap actually worth switching?'
  ) THEN
    INSERT INTO public.forum_threads
      (category_slug, title, slug, body, author_name, is_pinned, is_locked, is_removed, reply_count, vote_score)
    VALUES (
      'etfs-index-funds',
      'VAS vs A200 — is the 0.03% MER gap actually worth switching?',
      'vas-vs-a200-mer-comparison',
      E'After Betashares dropped the A200 MER to 0.04% last month the gap vs VAS (0.07%) is now 0.03% per year. On a $100k portfolio that''s $30/year.\n\nI''m currently in VAS with ~$85k and the CGT hit to switch would be around $2,800 based on my cost base. Break-even is roughly 93 years.\n\nFor new investors starting fresh, A200 seems like a no-brainer. But for existing VAS holders — has anyone actually run the numbers on whether a switch makes sense? Does the slightly broader index (VAS tracks 300 stocks vs A200''s 200) justify any of the fee difference?',
      'Invest.com.au Community',
      false, false, false, 0, 11
    ) RETURNING id INTO v_thread_id;

    INSERT INTO public.forum_posts (thread_id, body, author_name, is_moderator, is_removed, vote_score)
      SELECT v_thread_id,
        E'Your numbers are right and most people in existing VAS positions should just stay put. The extra 100 stocks in VAS (201–300 by market cap) make essentially no performance difference — they account for maybe 3–4% of the index weight combined.\n\nWhere the decision changes: if you''re in an accumulation phase and planning to add significant new capital over the next 5+ years, directing new contributions into A200 while leaving old VAS alone achieves most of the fee saving without the CGT trigger. You end up holding both ETFs but your blended MER drifts down over time.',
        'Invest.com.au Community', false, false, 5
      WHERE NOT EXISTS (
        SELECT 1 FROM public.forum_posts WHERE thread_id = v_thread_id AND author_name = 'Invest.com.au Community'
      );
  END IF;

  -- Thread 2: DCA frequency
  IF NOT EXISTS (
    SELECT 1 FROM public.forum_threads
      WHERE category_slug = 'etfs-index-funds'
        AND title = 'Monthly vs fortnightly DCA — does the frequency actually matter for ETFs?'
  ) THEN
    INSERT INTO public.forum_threads
      (category_slug, title, slug, body, author_name, is_pinned, is_locked, is_removed, reply_count, vote_score)
    VALUES (
      'etfs-index-funds',
      'Monthly vs fortnightly DCA — does the frequency actually matter for ETFs?',
      'dca-frequency-monthly-vs-fortnightly',
      E'My broker (Pearler) lets me set up an auto-invest on a custom schedule. I''m currently doing monthly into VGS + VAS, but I get paid fortnightly and some cash is just sitting idle for up to two weeks.\n\nI know the academic answer is "time in market beats timing the market" and more frequent contributions are marginally better in theory, but does brokerage cost change the calculus? Pearler is $6.50 per trade regardless of size.\n\nFor a $500/fortnight split across two ETFs that''s $13 in brokerage vs $13/month — doubling my brokerage drag. I''m thinking $1,000/month instead. Curious what others do.',
      'Invest.com.au Community',
      false, false, false, 0, 8
    ) RETURNING id INTO v_thread_id;

    INSERT INTO public.forum_posts (thread_id, body, author_name, is_moderator, is_removed, vote_score)
      SELECT v_thread_id,
        E'Monthly wins on brokerage for your numbers. At $1,000/month with two trades, brokerage is 1.3% of the invested amount. Fortnightly at $500 keeps that the same percentage-wise but compounds the dollar drag over time.\n\nRule of thumb: keep brokerage under 0.5% of the trade amount to avoid it meaningfully eating returns. That means $1,300+ per trade at Pearler''s $6.50 fee. At $500/fortnight per ETF you''re above that threshold — but if you''re splitting into two ETFs it''s $250 each, well above 0.5% drag.',
        'Invest.com.au Community', false, false, 4
      WHERE NOT EXISTS (
        SELECT 1 FROM public.forum_posts WHERE thread_id = v_thread_id AND author_name = 'Invest.com.au Community'
      );
  END IF;

  -- Thread 3: hedged vs unhedged
  IF NOT EXISTS (
    SELECT 1 FROM public.forum_threads
      WHERE category_slug = 'etfs-index-funds'
        AND title = 'Hedged vs unhedged international ETFs for an Australian investor — 2026 view'
  ) THEN
    INSERT INTO public.forum_threads
      (category_slug, title, slug, body, author_name, is_pinned, is_locked, is_removed, reply_count, vote_score)
    VALUES (
      'etfs-index-funds',
      'Hedged vs unhedged international ETFs for an Australian investor — 2026 view',
      'hedged-vs-unhedged-etfs-australia-2026',
      E'With AUD sitting around 0.64 USD, there''s a decent argument that it''s undervalued relative to historical ranges. If AUD recovers, an unhedged VGS position loses value on the FX leg even if the underlying index goes up.\n\nVanguard''s VGAD (hedged equivalent of VGS) costs about 0.21% vs 0.18% for VGS — 0.03% higher MER as the hedging cost. The actual hedge cost varies with the AUD/USD interest rate differential though and lately it''s been closer to 1–1.5% effective drag.\n\nFor a long-term buy-and-hold investor (15+ years), does currency risk even matter? Or is it just noise over that horizon?',
      'Invest.com.au Community',
      false, false, false, 0, 9
    ) RETURNING id INTO v_thread_id;

    INSERT INTO public.forum_posts (thread_id, body, author_name, is_moderator, is_removed, vote_score)
      SELECT v_thread_id,
        E'For 15+ year horizon, most research comes down on the side of unhedged. Over very long periods currency tends to mean-revert and the hedging cost (which you pay continuously) outweighs the protection. The 1–1.5% effective drag on VGAD right now because of the AUD/USD rate differential is a real cost, not a theoretical one.\n\nThe case for hedged makes more sense if: (a) you''re closer to drawdown phase (say, 5 years from needing the money), (b) your home currency is one that has historically appreciated rather than depreciated, or (c) you have a specific view that AUD is going to rip higher. None of those apply to most long-term Aussie accumulators.',
        'Invest.com.au Community', false, false, 6
      WHERE NOT EXISTS (
        SELECT 1 FROM public.forum_posts WHERE thread_id = v_thread_id AND author_name = 'Invest.com.au Community'
      );
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════
-- 3. property-investing
-- ══════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_thread_id integer;
BEGIN
  -- Thread 1: Negative gearing worth it
  IF NOT EXISTS (
    SELECT 1 FROM public.forum_threads
      WHERE category_slug = 'property-investing'
        AND title = 'Is negative gearing still worth it in 2026? Running the actual numbers'
  ) THEN
    INSERT INTO public.forum_threads
      (category_slug, title, slug, body, author_name, is_pinned, is_locked, is_removed, reply_count, vote_score)
    VALUES (
      'property-investing',
      'Is negative gearing still worth it in 2026? Running the actual numbers',
      'negative-gearing-worth-it-2026',
      E'My accountant keeps pushing me toward a negatively geared IP (investment property) citing the tax benefits. I ran some numbers and I''m not sure the maths stacks up at current interest rates.\n\nExample: $750k property, 20% deposit ($150k), loan $600k at 6.4% p.a. = $38,400 interest/year. Rental yield in the suburb I''m looking at is about 3.8% = $28,500 gross rent. So the annual shortfall before expenses is $9,900. Add rates, insurance, agent fees, maintenance — probably $15k–$17k total loss per year.\n\nAt a 37% marginal rate, the tax saving is roughly $5,500–$6,300/year. So I''m still out of pocket $9,000–$11,000 per year in cash terms, betting on capital growth covering the gap.\n\nAm I missing something, or is this just a bet on Sydney/Melbourne property prices?',
      'Invest.com.au Community',
      false, false, false, 0, 13
    ) RETURNING id INTO v_thread_id;

    INSERT INTO public.forum_posts (thread_id, body, author_name, is_moderator, is_removed, vote_score)
      SELECT v_thread_id,
        E'You''re not missing anything — that''s exactly what negative gearing is: a cash-flow bet subsidised by the tax system, only profitable if capital growth exceeds your total out-of-pocket cost.\n\nThe break-even capital growth rate in your example: $10,000/year average shortfall on a $750k asset = you need 1.33% real growth per year just to break even before any inflation consideration. Sydney has historically delivered 7–8% per year but there have been 5-year flat patches (2017–2022 in real terms) where negative gearing holders were underwater in total return terms.\n\nThe argument for it: leverage. You''re controlling a $750k asset with $150k, so a 5% capital gain is a 25% return on your equity. The argument against: you''re also leveraged to a 5% capital fall. At current rates, interest-only loans for investment are back above 7% at some lenders — worth shopping.',
        'Invest.com.au Community', false, false, 7
      WHERE NOT EXISTS (
        SELECT 1 FROM public.forum_posts WHERE thread_id = v_thread_id AND author_name = 'Invest.com.au Community'
      );
  END IF;

  -- Thread 2: REIT vs direct property
  IF NOT EXISTS (
    SELECT 1 FROM public.forum_threads
      WHERE category_slug = 'property-investing'
        AND title = 'REITs vs direct property — the case for listed property in a share portfolio'
  ) THEN
    INSERT INTO public.forum_threads
      (category_slug, title, slug, body, author_name, is_pinned, is_locked, is_removed, reply_count, vote_score)
    VALUES (
      'property-investing',
      'REITs vs direct property — the case for listed property in a share portfolio',
      'reits-vs-direct-property-australia',
      E'I keep seeing direct property pushed as the only "real" property investment, but I''ve been getting my property exposure via A-REITs (Goodman Group, Scentre Group, Charter Hall) in my share portfolio.\n\nAdvantages I see with REITs over direct:\n- Liquidity: sell in seconds vs 30-60 days for property\n- Diversification: $10k buys exposure to 50+ assets\n- No landlord headaches or vacancy risk on individual properties\n- Distributions that are often partially tax-sheltered via building depreciation\n\nThe obvious disadvantages: you can''t leverage into REITs the same way, and prices are more volatile short-term.\n\nFor those who hold both — how do you think about the allocation?',
      'Invest.com.au Community',
      false, false, false, 0, 10
    ) RETURNING id INTO v_thread_id;

    INSERT INTO public.forum_posts (thread_id, body, author_name, is_moderator, is_removed, vote_score)
      SELECT v_thread_id,
        E'Both in my portfolio and I think the comparison misses the key distinction: direct property is a leveraged, illiquid, management-intensive asset. REITs are an unleveraged, liquid, passive exposure to commercial/industrial property. They''re really different products.\n\nGoodman Group (GMG) is effectively a bet on global industrial/logistics real estate managed by a world-class operator. You can''t replicate that with a residential IP in Parramatta. Conversely, residential property in a high-demand suburb gives you leverage and CGT discount on gains in a way REITs don''t match.\n\nMy approach: REITs for the commercial/industrial/retail exposure I can''t access directly; direct property only if I found a specific opportunity with compelling yield metrics.',
        'Invest.com.au Community', false, false, 5
      WHERE NOT EXISTS (
        SELECT 1 FROM public.forum_posts WHERE thread_id = v_thread_id AND author_name = 'Invest.com.au Community'
      );
  END IF;

  -- Thread 3: SMSF property
  IF NOT EXISTS (
    SELECT 1 FROM public.forum_threads
      WHERE category_slug = 'property-investing'
        AND title = 'Buying property in an SMSF — is the limited recourse borrowing arrangement worth the complexity?'
  ) THEN
    INSERT INTO public.forum_threads
      (category_slug, title, slug, body, author_name, is_pinned, is_locked, is_removed, reply_count, vote_score)
    VALUES (
      'property-investing',
      'Buying property in an SMSF — is the limited recourse borrowing arrangement worth the complexity?',
      'smsf-property-lrba-complexity',
      E'My SMSF has about $350k in balance after 8 years of contributions. A financial planner (not mine) at a networking event suggested I could buy a commercial property using a limited recourse borrowing arrangement (LRBA) — e.g., buy a $600k commercial premises my business could then lease back from the SMSF.\n\nThe tax angle is attractive (15% concessional rate in accumulation, potentially 0% in pension phase). But the setup complexity and ongoing compliance cost sounds significant.\n\nHas anyone done this? What did the setup actually cost, and what ongoing compliance burden does it add?',
      'Invest.com.au Community',
      false, false, false, 0, 8
    ) RETURNING id INTO v_thread_id;

    INSERT INTO public.forum_posts (thread_id, body, author_name, is_moderator, is_removed, vote_score)
      SELECT v_thread_id,
        E'Done this — commercial property bought via LRBA in our SMSF 4 years ago. The setup cost was around $4,500–$6,000 for the bare trust deed, LRBA-compliant loan (limited recourse from a commercial lender), and legal review. Annual SMSF accounting went from ~$2,000/year to ~$4,500 because of the additional complexity. The ATO also requires an independent valuation each year for assets above a threshold — another ~$800.\n\nThe related-party lease must be at market rent (ATO scrutinises this closely) so you can''t use it as a below-market subsidy for your business. Get an independent lease valuation to document market rate before signing.\n\nWorth it for us because the property has appreciated and the rental income is taxed at 15% vs my 47% marginal rate. But $350k might be too small — most advisers I''ve spoken to suggest $500k+ SMSF balance before an LRBA makes sense given the setup cost and ongoing compliance.',
        'Invest.com.au Community', false, false, 6
      WHERE NOT EXISTS (
        SELECT 1 FROM public.forum_posts WHERE thread_id = v_thread_id AND author_name = 'Invest.com.au Community'
      );
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════
-- 4. super-retirement
-- ══════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_thread_id integer;
BEGIN
  -- Thread 1: Industry super vs retail
  IF NOT EXISTS (
    SELECT 1 FROM public.forum_threads
      WHERE category_slug = 'super-retirement'
        AND title = 'Industry super vs retail — AustralianSuper vs Aware vs Hostplus performance review'
  ) THEN
    INSERT INTO public.forum_threads
      (category_slug, title, slug, body, author_name, is_pinned, is_locked, is_removed, reply_count, vote_score)
    VALUES (
      'super-retirement',
      'Industry super vs retail — AustralianSuper vs Aware vs Hostplus performance review',
      'industry-super-comparison-2026',
      E'Ran a comparison of the 10-year net-of-fees returns for a few major industry funds in their default growth options:\n- AustralianSuper Balanced: 8.9% p.a.\n- Aware Super Growth: 8.4% p.a.\n- Hostplus Balanced: 9.1% p.a.\n- UniSuper Balanced: 8.7% p.a.\n\nAll pulled from the funds'' own PDS/dashboard figures, not APRA directly. A couple of observations:\n1. Hostplus has outperformed partly because of infrastructure and unlisted asset exposure — is that a fair comparison given liquidity risk is different?\n2. Any of these funds have notably worse insurance premium pricing that offsets the performance advantage?\n\nGenerally happy to hear from people who''ve actually switched between them.',
      'Invest.com.au Community',
      false, false, false, 0, 15
    ) RETURNING id INTO v_thread_id;

    INSERT INTO public.forum_posts (thread_id, body, author_name, is_moderator, is_removed, vote_score)
      SELECT v_thread_id,
        E'Good question on unlisted assets. Hostplus (and AustralianSuper to a lesser extent) smooth unlisted infrastructure/property valuations over time — this artificially reduces measured volatility and can make their "10-year returns" look better on paper during market drawdowns because unlisted assets aren''t marked to market daily.\n\nThe APRA performance test uses a risk-adjusted methodology partly to correct for this, but even that''s imperfect. When comparing funds, look at their APRA performance test results (APRA publishes these annually for MySuper products) rather than raw returns.\n\nOn insurance: Hostplus''s default insurance is competitive for under-40s but premiums escalate steeply for 50+. AustralianSuper tends to have more stable insurance pricing across age cohorts. Worth pricing your age band specifically before switching.',
        'Invest.com.au Community', false, false, 8
      WHERE NOT EXISTS (
        SELECT 1 FROM public.forum_posts WHERE thread_id = v_thread_id AND author_name = 'Invest.com.au Community'
      );
  END IF;

  -- Thread 2: Concessional contributions
  IF NOT EXISTS (
    SELECT 1 FROM public.forum_threads
      WHERE category_slug = 'super-retirement'
        AND title = 'Using concessional contribution carry-forward — has anyone actually done it?'
  ) THEN
    INSERT INTO public.forum_threads
      (category_slug, title, slug, body, author_name, is_pinned, is_locked, is_removed, reply_count, vote_score)
    VALUES (
      'super-retirement',
      'Using concessional contribution carry-forward — has anyone actually done it?',
      'concessional-carry-forward-contributions',
      E'My super balance is below $500k so I''m eligible to use the 5-year concessional contribution carry-forward. I had unused concessional cap space from FY2022–FY2025 (roughly $65k worth).\n\nI''m thinking of making a $90k personal deductible contribution this year (current $30k cap + ~$60k carried-forward) to reduce my taxable income. I''m a sole trader so I don''t have an employer making contributions that eat into the cap.\n\nHas anyone done a large carry-forward contribution? Practical questions:\n- Did the ATO system correctly track your unused cap balance?\n- How long did the tax return process take?\n- Any issues with the fund accepting a contribution that large?',
      'Invest.com.au Community',
      false, false, false, 0, 12
    ) RETURNING id INTO v_thread_id;

    INSERT INTO public.forum_posts (thread_id, body, author_name, is_moderator, is_removed, vote_score)
      SELECT v_thread_id,
        E'Did a $75k carry-forward personal deductible contribution (PDC) two years ago. A few practical notes:\n\n1. The ATO MyTax portal shows your available unused cap on the super page — it calculates it automatically from your tax history. Mine was accurate to the dollar.\n\n2. Lodge a "Notice of intent to claim a deduction" (form S290-170) with your super fund BEFORE you lodge your tax return. If you lodge the return first, the ATO treats the contribution as non-concessional and you can''t undo that easily.\n\n3. Most large funds have no issue with a $75–90k contribution but confirm with yours — some smaller retail funds have operational limits or require advance notice for contributions above $50k.\n\n4. The tax saving was significant — essentially bringing forward a lump sum of income into the 15% super environment vs my 47% marginal rate. Refund arrived about 6 weeks after lodgement.',
        'Invest.com.au Community', false, false, 9
      WHERE NOT EXISTS (
        SELECT 1 FROM public.forum_posts WHERE thread_id = v_thread_id AND author_name = 'Invest.com.au Community'
      );
  END IF;

  -- Thread 3: Transition to retirement
  IF NOT EXISTS (
    SELECT 1 FROM public.forum_threads
      WHERE category_slug = 'super-retirement'
        AND title = 'Transition to Retirement (TTR) strategy — who it still works for in 2026'
  ) THEN
    INSERT INTO public.forum_threads
      (category_slug, title, slug, body, author_name, is_pinned, is_locked, is_removed, reply_count, vote_score)
    VALUES (
      'super-retirement',
      'Transition to Retirement (TTR) strategy — who it still works for in 2026',
      'transition-to-retirement-ttr-2026',
      E'TTR strategies seem less popular now that TTR pension earnings are taxed at 15% (the 2017 change removed the 0% tax on TTR earnings). But I keep hearing from people my age (57) that it''s still useful in some situations.\n\nMy situation: still working full-time at 57, marginal rate 37%, super balance $620k. I''ve heard the basic strategy is to salary sacrifice more, draw down a TTR pension to replace the lost take-home pay, and lower your overall tax rate.\n\nBut if TTR earnings are now taxed at 15% anyway, and I''m already making concessional contributions at the $30k cap, is there still a tax arbitrage here?',
      'Invest.com.au Community',
      false, false, false, 0, 9
    ) RETURNING id INTO v_thread_id;

    INSERT INTO public.forum_posts (thread_id, body, author_name, is_moderator, is_removed, vote_score)
      SELECT v_thread_id,
        E'Yes, the tax arbitrage still works, but it''s narrower post-2017. The logic:\n\n1. You salary sacrifice to the $30k concessional cap (contributions taxed at 15% in the fund, saving you 22% vs your 37% marginal rate).\n\n2. Your take-home pay drops. To replace it, you draw a TTR pension. Pension payments from a taxed-element super balance (most people) are included in your assessable income but offset by a 15% tax offset — effective rate of around 22% for most in your age bracket.\n\n3. The fund''s TTR account earnings are taxed at 15% vs your 37% — still a 22% advantage on accumulated earnings.\n\nThe arbitrage is real but the maths is tighter than pre-2017. It mainly works for people in the 37–47% marginal bracket who are near retirement and want to optimise for the last 3–5 years of accumulation. Worth getting modelled by a fee-only adviser before pulling the trigger — the interaction with the transfer balance cap matters.',
        'Invest.com.au Community', false, false, 7
      WHERE NOT EXISTS (
        SELECT 1 FROM public.forum_posts WHERE thread_id = v_thread_id AND author_name = 'Invest.com.au Community'
      );
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════
-- 5. crypto
-- ══════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_thread_id integer;
BEGIN
  -- Thread 1: ATO crypto tax treatment
  IF NOT EXISTS (
    SELECT 1 FROM public.forum_threads
      WHERE category_slug = 'crypto'
        AND title = 'ATO crypto tax treatment — CGT asset vs personal use, and how to handle DeFi'
  ) THEN
    INSERT INTO public.forum_threads
      (category_slug, title, slug, body, author_name, is_pinned, is_locked, is_removed, reply_count, vote_score)
    VALUES (
      'crypto',
      'ATO crypto tax treatment — CGT asset vs personal use, and how to handle DeFi',
      'ato-crypto-tax-cgt-defi-australia',
      E'The ATO''s crypto guidance has evolved significantly over the past few years. Key points as I understand them for FY2026:\n\n1. Most crypto holdings are CGT assets (not personal use assets) if you hold them for investment purposes.\n2. Trading one crypto for another is a CGT event (disposal of the first asset at market value).\n3. DeFi: providing liquidity, staking rewards, and yield farming are generally treated as assessable income at the time received, then as CGT assets going forward.\n4. Airdrops are income at market value on receipt date.\n\nWhat I''m uncertain about: how do people handle cross-chain bridge transactions for tax purposes? And does anyone use crypto tax software (Koinly, Crypto Tax Calculator Australia, CoinLedger) — are they accurate enough to rely on?',
      'Invest.com.au Community',
      false, false, false, 0, 14
    ) RETURNING id INTO v_thread_id;

    INSERT INTO public.forum_posts (thread_id, body, author_name, is_moderator, is_removed, vote_score)
      SELECT v_thread_id,
        E'Your summary is accurate. On bridge transactions: the ATO hasn''t issued specific guidance, but the consensus among crypto-specialist tax advisers is that a bridge is treated as disposal + reacquisition because you''re technically receiving a different token on the destination chain (even if it''s "wrapped ETH" or equivalent). Conservative approach: record as a CGT event at the market value at the time of bridging.\n\nFor software: Crypto Tax Calculator Australia (CTC) is the most widely recommended for Aussie tax because it handles ATO-specific rules (personal use exemption threshold, CGT discount) better than Koinly which is more US-centric in its defaults. CTC''s DeFi module handles Uniswap/Aave/Compound transactions reasonably well but you''ll still need to hand-check any exotic protocol. Export the report, check 10-20 transactions manually against Etherscan, and verify the CGT discount is only applied where >12 months holding.',
        'Invest.com.au Community', false, false, 7
      WHERE NOT EXISTS (
        SELECT 1 FROM public.forum_posts WHERE thread_id = v_thread_id AND author_name = 'Invest.com.au Community'
      );
  END IF;

  -- Thread 2: Bitcoin ETFs in Australia
  IF NOT EXISTS (
    SELECT 1 FROM public.forum_threads
      WHERE category_slug = 'crypto'
        AND title = 'Spot Bitcoin ETFs in Australia — EBTC vs CBTC vs direct custody comparison'
  ) THEN
    INSERT INTO public.forum_threads
      (category_slug, title, slug, body, author_name, is_pinned, is_locked, is_removed, reply_count, vote_score)
    VALUES (
      'crypto',
      'Spot Bitcoin ETFs in Australia — EBTC vs CBTC vs direct custody comparison',
      'spot-bitcoin-etfs-australia-comparison',
      E'Australia now has several spot Bitcoin ETFs trading on the ASX/CBOE. For those who want Bitcoin exposure without managing self-custody, the main options seem to be:\n\n- EBTC (VanEck Bitcoin ETF): 0.25% MER, Coinbase Custody\n- CBTC (CoinShares Bitcoin ETF): 0.29% MER\n- IBTC (BlackRock via iShares): recently launched\n\nFor someone who doesn''t want to manage hardware wallets or seed phrases, is there a meaningful reason to prefer self-custody over an ASX-listed ETF? Custody risk seems to be the main one, but Coinbase Custody is institutional grade.\n\nAlso: does holding via an ETF affect your CGT position differently to direct crypto? I assume both are CGT assets with the 12-month discount applying.',
      'Invest.com.au Community',
      false, false, false, 0, 11
    ) RETURNING id INTO v_thread_id;

    INSERT INTO public.forum_posts (thread_id, body, author_name, is_moderator, is_removed, vote_score)
      SELECT v_thread_id,
        E'CGT treatment: identical for the 12-month discount. ETF units are CGT assets just like directly held Bitcoin — you get the 50% discount if you hold the ETF units for 12+ months. No difference there.\n\nCustody risk comparison: an ASX-listed ETF has counterparty risk to the ETF issuer (e.g., VanEck Australia Pty Ltd) and the sub-custodian (Coinbase Custody). In a Coinbase insolvency scenario, the segregated custody structure should protect ETF holders — Bitcoin is held separately from Coinbase''s own balance sheet — but there''s legal/operational risk in that process.\n\nSelf-custody has zero counterparty risk but replaces it with personal operational risk: lost seed phrases, hardware failure, phishing. For amounts above $50k, most serious holders I know use a hardware wallet (Ledger or Trezor) with the seed phrase split between two physically separate locations. Below that, an ETF is probably the better risk-adjusted option for most people.',
        'Invest.com.au Community', false, false, 6
      WHERE NOT EXISTS (
        SELECT 1 FROM public.forum_posts WHERE thread_id = v_thread_id AND author_name = 'Invest.com.au Community'
      );
  END IF;

  -- Thread 3: Ethereum staking
  IF NOT EXISTS (
    SELECT 1 FROM public.forum_threads
      WHERE category_slug = 'crypto'
        AND title = 'Ethereum staking in Australia — liquid staking vs exchange staking vs solo node'
  ) THEN
    INSERT INTO public.forum_threads
      (category_slug, title, slug, body, author_name, is_pinned, is_locked, is_removed, reply_count, vote_score)
    VALUES (
      'crypto',
      'Ethereum staking in Australia — liquid staking vs exchange staking vs solo node',
      'ethereum-staking-australia-options',
      E'I hold about 4 ETH and am weighing up staking options. Current APR for ETH staking seems to be around 3–4% depending on network activity.\n\nOptions I''ve identified:\n1. Lido (stETH): liquid staking, ~3.8% APR, smart contract risk, no 32 ETH minimum\n2. Rocket Pool (rETH): more decentralised than Lido, similar APR\n3. Exchange staking (Coinbase, Kraken): simpler, exchange takes a cut so effective APR ~2.5%\n4. Solo validator node: requires exactly 32 ETH, full validator rewards, significant technical setup\n\nATO treatment: my understanding is staking rewards are ordinary income at market value on receipt. Has anyone confirmed this with their accountant for liquid staking specifically (where rewards are reflected in the exchange rate of stETH vs ETH)?',
      'Invest.com.au Community',
      false, false, false, 0, 10
    ) RETURNING id INTO v_thread_id;

    INSERT INTO public.forum_posts (thread_id, body, author_name, is_moderator, is_removed, vote_score)
      SELECT v_thread_id,
        E'ATO treatment for liquid staking is genuinely uncertain because the ATO hasn''t issued specific guidance on rebasing tokens vs accumulating tokens. For Lido stETH (rebasing): new stETH tokens are credited to your wallet daily — most advisers treat each daily increment as ordinary income at the ETH market price on that day. For rETH (accumulating): the exchange rate of rETH vs ETH increases over time. Some advisers argue you have no taxable event until you swap back to ETH; others argue there''s a constructive receipt each day. It''s an unsettled area.\n\nI confirmed with my accountant (crypto-specialist firm in Sydney): they treat rETH appreciation as deferred income recognised on disposal/swap, not on accrual. Their reasoning: you don''t receive anything into your wallet daily; the value appreciation is notional until realised. This is a conservative interpretation favourable to the taxpayer but it''s not guaranteed the ATO would agree on audit. Get your own advice.',
        'Invest.com.au Community', false, false, 8
      WHERE NOT EXISTS (
        SELECT 1 FROM public.forum_posts WHERE thread_id = v_thread_id AND author_name = 'Invest.com.au Community'
      );
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════
-- 6. tax-strategy
-- ══════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_thread_id integer;
BEGIN
  -- Thread 1: Tax-loss harvesting
  IF NOT EXISTS (
    SELECT 1 FROM public.forum_threads
      WHERE category_slug = 'tax-strategy'
        AND title = 'Tax-loss harvesting on the ASX — wash sale rules, timing, and practical execution'
  ) THEN
    INSERT INTO public.forum_threads
      (category_slug, title, slug, body, author_name, is_pinned, is_locked, is_removed, reply_count, vote_score)
    VALUES (
      'tax-strategy',
      'Tax-loss harvesting on the ASX — wash sale rules, timing, and practical execution',
      'tax-loss-harvesting-asx-australia',
      E'With some positions down significantly this financial year I''m thinking about crystallising losses to offset capital gains elsewhere in my portfolio. A few questions for people who''ve done this on the ASX:\n\n1. Australia doesn''t have an explicit "wash sale" rule like the US (30 days), but the ATO can apply Part IVA (general anti-avoidance) if the dominant purpose is tax avoidance. How aggressive do you get with re-entering a position?\n\n2. For ETFs — if I sell VAS to crystallise a loss, can I immediately buy VGS + VAF as a temporary "bridge" position (similar asset class exposure), then buy back VAS after 30 days?\n\n3. How do you time this practically — at year end the spreads on some stocks widen and you might give up more in transaction costs than you save.',
      'Invest.com.au Community',
      false, false, false, 0, 16
    ) RETURNING id INTO v_thread_id;

    INSERT INTO public.forum_posts (thread_id, body, author_name, is_moderator, is_removed, vote_score)
      SELECT v_thread_id,
        E'On Part IVA: the dominant purpose test is subjective but practically the ATO has focused on structured tax schemes, not individual investors selling a position at a loss and later rebuying. I asked my accountant directly and their view is that re-entering after 30–45 days is generally safe as long as you can articulate a non-tax reason (e.g., market view changed, rebalancing) and you''re not doing it across dozens of positions annually as a systematic scheme.\n\nOn the VAS → VGS/VAF bridge: yes, this is a common approach. You maintain broad market exposure while being in a genuinely different asset (global equities vs Australian equities). There''s no explicit safe harbour period in Australia, but 30 days before rebuying VAS seems to be the informal consensus.\n\nTiming: I do this in May rather than June because spreads are tighter and there''s less end-of-year institutional activity. The last two weeks of June on ASX mid-caps can be genuinely illiquid.',
        'Invest.com.au Community', false, false, 10
      WHERE NOT EXISTS (
        SELECT 1 FROM public.forum_posts WHERE thread_id = v_thread_id AND author_name = 'Invest.com.au Community'
      );
  END IF;

  -- Thread 2: Investment bond structure
  IF NOT EXISTS (
    SELECT 1 FROM public.forum_threads
      WHERE category_slug = 'tax-strategy'
        AND title = 'Investment bonds for kids'' education savings — is the 10-year rule worth the complexity?'
  ) THEN
    INSERT INTO public.forum_threads
      (category_slug, title, slug, body, author_name, is_pinned, is_locked, is_removed, reply_count, vote_score)
    VALUES (
      'tax-strategy',
      'Investment bonds for kids'' education savings — is the 10-year rule worth the complexity?',
      'investment-bonds-education-savings-children',
      E'We have two kids (4 and 7) and want to start saving for their private school fees / university. Options I''m considering:\n\n1. Investment bond (e.g., Generation Life): earnings taxed at 30% inside the bond, and after 10 years, withdrawals are tax-free. If my marginal rate is 47%, this could be quite effective.\n\n2. Bare trust / informal trust: invest in their names, earnings taxed at their marginal rate (usually nil or 19% for kids with their own income — but hit by the "unearned income" rules at minors'' tax rates).\n\n3. Just hold in our own names (joint): simpler, fully under our control.\n\nFor investment bonds specifically: has anyone done the post-10-year withdrawal? Any gotchas with the insurance company structure that I''m missing?',
      'Invest.com.au Community',
      false, false, false, 0, 11
    ) RETURNING id INTO v_thread_id;

    INSERT INTO public.forum_posts (thread_id, body, author_name, is_moderator, is_removed, vote_score)
      SELECT v_thread_id,
        E'We did the 10-year investment bond route with Generation Life for our now-14-year-old. A few notes from experience:\n\n1. The 30% internal tax rate is the maximum — if the bond''s underlying assets include fully franked dividends, the effective tax rate inside the bond can be lower. Generation Life''s multi-asset growth option has averaged around 23% effective rate due to franking.\n\n2. The 10% annual top-up rule is often misunderstood: each year you can contribute up to 125% of the prior year''s contribution without restarting the 10-year clock. If you don''t contribute in a given year, the clock resets for new contributions (but not the existing balance). So irregular contributions require careful tracking.\n\n3. Withdrawal after 10 years: straightforward — submit the withdrawal form, funds hit your nominated account within 5 business days, no tax payable, no CGT event. The life insurance wrapper means the bond bypasses probate too, which is a bonus.\n\nMinors'' tax rates are a real trap with bare trusts — the ATO taxes unearned trust income at 47% above $416 for under-18s. The investment bond sidesteps this entirely.',
        'Invest.com.au Community', false, false, 8
      WHERE NOT EXISTS (
        SELECT 1 FROM public.forum_posts WHERE thread_id = v_thread_id AND author_name = 'Invest.com.au Community'
      );
  END IF;

  -- Thread 3: CGT discount
  IF NOT EXISTS (
    SELECT 1 FROM public.forum_threads
      WHERE category_slug = 'tax-strategy'
        AND title = 'CGT discount strategies — how are people actually accessing the 50% discount in practice?'
  ) THEN
    INSERT INTO public.forum_threads
      (category_slug, title, slug, body, author_name, is_pinned, is_locked, is_removed, reply_count, vote_score)
    VALUES (
      'tax-strategy',
      'CGT discount strategies — how are people actually accessing the 50% discount in practice?',
      'cgt-discount-strategies-australia',
      E'I understand the basic rule: hold an asset for 12+ months and you get the 50% CGT discount (meaning only half the capital gain is included in your taxable income). But in practice there are some subtleties I want to understand better:\n\n1. For ETFs with internal turnover — does the fund''s trading activity affect my personal 12-month clock? I hold VGS units; VGS internally trades the underlying stocks. My VGS units themselves are over 12 months old.\n\n2. If I acquire shares via a DRIP (dividend reinvestment plan), each parcel has its own 12-month clock. Is there a simple way to manage this without tracking 50 parcels per year?\n\n3. For someone in their 30s who might hold stocks for 20+ years — is there a scenario where the CGT is actually beneficial to trigger (e.g., in a low-income year) rather than defer indefinitely?',
      'Invest.com.au Community',
      false, false, false, 0, 13
    ) RETURNING id INTO v_thread_id;

    INSERT INTO public.forum_posts (thread_id, body, author_name, is_moderator, is_removed, vote_score)
      SELECT v_thread_id,
        E'Answers in order:\n\n1. ETF internal turnover does NOT affect your personal 12-month clock. You hold ETF units; the clock runs from when you bought those units. The fund''s internal trades are invisible to your CGT position because an ETF is a separate legal entity. Your capital gain on VGS units is calculated when you sell your VGS units.\n\n2. DRIP parcels: you''re right that each reinvestment creates a new parcel. Most modern portfolio trackers (Sharesight, etc.) handle this automatically. DRIP parcels from 12+ months ago qualify for the CGT discount; recent ones don''t. Sharesight''s tax report will separate these correctly when you sell.\n\n3. Crystallising gains deliberately in a low-income year is called "gain harvesting" (opposite of loss harvesting). If you have a year with significantly lower income — career break, parental leave, business loss — you might crystallise some gains while your marginal rate is lower. For example, if you''re at the 19% bracket, your effective CGT rate after discount is 9.5% vs 23.5% at the 47% bracket. The saving is real. Rebuy immediately — no wash-sale restriction in Australia.',
        'Invest.com.au Community', false, false, 9
      WHERE NOT EXISTS (
        SELECT 1 FROM public.forum_posts WHERE thread_id = v_thread_id AND author_name = 'Invest.com.au Community'
      );
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════
-- 7. beginners
-- ══════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_thread_id integer;
BEGIN
  -- Thread 1: Getting started $1000
  IF NOT EXISTS (
    SELECT 1 FROM public.forum_threads
      WHERE category_slug = 'beginners'
        AND title = 'Getting started with $1,000 — what would you actually do?'
  ) THEN
    INSERT INTO public.forum_threads
      (category_slug, title, slug, body, author_name, is_pinned, is_locked, is_removed, reply_count, vote_score)
    VALUES (
      'beginners',
      'Getting started with $1,000 — what would you actually do?',
      'getting-started-investing-1000-dollars',
      E'I''m 24, have a stable job, and have finally saved $1,000 I don''t need for at least 5 years. I want to start investing but I''m overwhelmed by the options.\n\nI''ve read a bit and I keep seeing "just buy index funds" as the standard advice, but I don''t know which ones or through which platform. I''ve also seen people talking about picking individual stocks.\n\nBefore I make any decisions: what do you wish someone had told you when you started with a small amount? And what would you actually do with $1,000 if you were 24 again?',
      'Invest.com.au Community',
      true, false, false, 0, 22
    ) RETURNING id INTO v_thread_id;

    INSERT INTO public.forum_posts (thread_id, body, author_name, is_moderator, is_removed, vote_score)
      SELECT v_thread_id,
        E'Welcome! This is the right question to be asking at 24.\n\nThe honest beginner path that works for most people:\n\n1. Pick one broad global ETF to start: VGS (Vanguard MSCI Index International Shares ETF) gives you exposure to ~1,500 companies across 23 developed markets for a 0.18% annual fee. At $1,000 it''s one or two units.\n\n2. Pick a low-brokerage platform: Stake (zero brokerage on ASX ETFs), Pearler ($6.50 flat, has auto-invest), or CommSec Pocket ($2 for trades under $1,000). Stake is probably best for starting small.\n\n3. Set up an automatic monthly contribution — even $100/month. The habit matters more than the amount at this stage.\n\nWhat I wish I''d known at 24: the boring index fund approach beats most stock-picking over 10+ years. Not because picking stocks is impossible, but because the time and emotional energy it takes is usually not worth it vs just DCA''ing an index fund.\n\nOne more thing: max out your super concessional cap before putting extra into a taxable account. Super is the most tax-effective investment vehicle in Australia.',
        'Invest.com.au Community', true, false, 12
      WHERE NOT EXISTS (
        SELECT 1 FROM public.forum_posts WHERE thread_id = v_thread_id AND author_name = 'Invest.com.au Community'
      );
  END IF;

  -- Thread 2: Understanding ETF distributions
  IF NOT EXISTS (
    SELECT 1 FROM public.forum_threads
      WHERE category_slug = 'beginners'
        AND title = 'I just received my first ETF distribution — what does this actually mean?'
  ) THEN
    INSERT INTO public.forum_threads
      (category_slug, title, slug, body, author_name, is_pinned, is_locked, is_removed, reply_count, vote_score)
    VALUES (
      'beginners',
      'I just received my first ETF distribution — what does this actually mean?',
      'first-etf-distribution-explained',
      E'I bought VAS six months ago (about $2,000 worth) and this week I received a $38 distribution into my brokerage account. I was not expecting this and I have a few questions:\n\n1. Is this the equivalent of a dividend?\n2. Do I have to pay tax on it, and how?\n3. My brokerage account says it includes "franking credits" — what are those?\n4. Should I reinvest it manually or is there an automatic option?\n\nSorry if these are basic questions — I couldn''t find a clear explanation anywhere.',
      'Invest.com.au Community',
      false, false, false, 0, 17
    ) RETURNING id INTO v_thread_id;

    INSERT INTO public.forum_posts (thread_id, body, author_name, is_moderator, is_removed, vote_score)
      SELECT v_thread_id,
        E'Not basic at all — these are exactly the right questions to understand.\n\n1. Yes, an ETF distribution is the equivalent of a dividend. VAS holds ~300 ASX companies; when those companies pay dividends, VAS pools them and distributes them to you proportionally. VAS distributes quarterly.\n\n2. Tax: yes, distributions are assessable income in the year you receive them. You''ll get an Annual Tax Statement from your broker after 30 June showing the breakdown. Include it in your tax return under "Australian dividends and distributions." If you use a tax agent or MyTax, there''s a specific section for this.\n\n3. Franking credits: Australian companies pay tax at 30% on their profits before distributing dividends. The ATO gives you a credit for the tax already paid. For a 19%-bracket taxpayer, franking credits can result in a refund. For a 37%-bracket taxpayer, they reduce but don''t eliminate the extra tax owed.\n\n4. Reinvestment: VAS doesn''t have a formal DRIP (dividend reinvestment plan). You''d need to manually buy more units. Many people accumulate distributions in a high-interest account and invest when they have $500–$1,000 to avoid brokerage eating the small amounts.',
        'Invest.com.au Community', false, false, 11
      WHERE NOT EXISTS (
        SELECT 1 FROM public.forum_posts WHERE thread_id = v_thread_id AND author_name = 'Invest.com.au Community'
      );
  END IF;

  -- Thread 3: Emergency fund first
  IF NOT EXISTS (
    SELECT 1 FROM public.forum_threads
      WHERE category_slug = 'beginners'
        AND title = 'Emergency fund before investing — how much is actually "enough"?'
  ) THEN
    INSERT INTO public.forum_threads
      (category_slug, title, slug, body, author_name, is_pinned, is_locked, is_removed, reply_count, vote_score)
    VALUES (
      'beginners',
      'Emergency fund before investing — how much is actually "enough"?',
      'emergency-fund-how-much-before-investing',
      E'Every personal finance resource says "build an emergency fund first" but gives different answers for how much: 3 months, 6 months, 1 year of expenses. I''m 26, renting, no dependants, stable government job.\n\nMy current situation:\n- Monthly expenses: ~$3,200 (rent, groceries, transport, subscriptions)\n- Current savings account: $8,000\n- Investing so far: $0\n\nI''ve been waiting until I have $20k in the emergency fund before I start investing. But my friend says I''m leaving money on the table by not investing in the meantime. Who''s right?',
      'Invest.com.au Community',
      false, false, false, 0, 19
    ) RETURNING id INTO v_thread_id;

    INSERT INTO public.forum_posts (thread_id, body, author_name, is_moderator, is_removed, vote_score)
      SELECT v_thread_id,
        E'Your friend has a point, and the "3–6 months" rule is more nuanced than most resources admit.\n\nThe purpose of an emergency fund is to avoid being forced to sell investments at the wrong time. The size should reflect your actual risk of needing it:\n\n- Stable government job with good leave entitlements: your job risk is low; 2–3 months is probably sufficient.\n- No dependants, no mortgage: no catastrophic single expense lurking.\n- With $8k (2.5 months) and your profile, I''d argue you''re close enough to start investing.\n\nPractical approach many people use: split the monthly surplus. Say you save $800/month — put $400 into the emergency fund until you hit 3 months ($9,600 for you), and $400 into investing from day one. You get both.\n\nOne thing to check: does your job have income protection insurance via super? If so, your effective emergency runway is longer than the cash amount suggests. Most government super funds include income protection that kicks in after 60–90 days of illness/injury.',
        'Invest.com.au Community', false, false, 13
      WHERE NOT EXISTS (
        SELECT 1 FROM public.forum_posts WHERE thread_id = v_thread_id AND author_name = 'Invest.com.au Community'
      );
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════
-- 8. broker-reviews
-- ══════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_thread_id integer;
BEGIN
  -- Thread 1: Pearler review
  IF NOT EXISTS (
    SELECT 1 FROM public.forum_threads
      WHERE category_slug = 'broker-reviews'
        AND title = 'Pearler 12-month review — best broker for long-term ETF investors?'
  ) THEN
    INSERT INTO public.forum_threads
      (category_slug, title, slug, body, author_name, is_pinned, is_locked, is_removed, reply_count, vote_score)
    VALUES (
      'broker-reviews',
      'Pearler 12-month review — best broker for long-term ETF investors?',
      'pearler-broker-review-12-months',
      E'I moved to Pearler from CommSec about 12 months ago for my ETF portfolio and wanted to share a detailed review now I''ve been through a full year of distributions, auto-invest, and CHESS transfers.\n\n**What works well:**\n- Auto-invest is genuinely set-and-forget. I have a monthly buy of VGS + VAS + VGAD configured and it just happens.\n- $6.50 flat brokerage regardless of trade size — predictable costs.\n- CHESS-sponsored (the shares are in your name, not a nominee structure).\n- Tax reporting exports that integrate with tax software.\n\n**What''s less good:**\n- The app is functional but feels dated compared to Stake or Superhero.\n- No US stocks — Pearler is ASX-only.\n- Customer support response times can be 2–3 business days for non-urgent queries.\n\nOverall: 8/10 if you want a boring, reliable ETF auto-invest platform. 5/10 if you want to actively trade or access US markets.',
      'Invest.com.au Community',
      false, false, false, 0, 18
    ) RETURNING id INTO v_thread_id;

    INSERT INTO public.forum_posts (thread_id, body, author_name, is_moderator, is_removed, vote_score)
      SELECT v_thread_id,
        E'Agree with this review. Been on Pearler for 2 years. Two things to add:\n\n1. The CHESS transfer in from CommSec took about 10 business days but was smooth — Pearler''s support team sent step-by-step instructions when I asked.\n\n2. One thing that surprised me: Pearler shares your portfolio data (anonymised) with their "Pearler Community" feature where you can see aggregate allocation trends. You can opt out, but it''s opt-out, not opt-in. Not a dealbreaker, but worth knowing.\n\nFor people choosing between Pearler and Stake for ASX ETFs: Stake is $0 brokerage on ETFs, which undercuts Pearler''s $6.50. But Stake is a nominee structure (not CHESS-sponsored), which matters to some investors from a risk perspective. Both are ASIC-regulated.',
        'Invest.com.au Community', false, false, 8
      WHERE NOT EXISTS (
        SELECT 1 FROM public.forum_posts WHERE thread_id = v_thread_id AND author_name = 'Invest.com.au Community'
      );
  END IF;

  -- Thread 2: moomoo review
  IF NOT EXISTS (
    SELECT 1 FROM public.forum_threads
      WHERE category_slug = 'broker-reviews'
        AND title = 'moomoo Australia review 2026 — genuinely good or just the Futu marketing machine?'
  ) THEN
    INSERT INTO public.forum_threads
      (category_slug, title, slug, body, author_name, is_pinned, is_locked, is_removed, reply_count, vote_score)
    VALUES (
      'broker-reviews',
      'moomoo Australia review 2026 — genuinely good or just the Futu marketing machine?',
      'moomoo-australia-review-2026',
      E'moomoo Australia (owned by Futu Holdings, a Tencent-backed HK brokerage) launched aggressively in Australia with zero brokerage on ASX stocks for 180 days and a bunch of free share promotions. I signed up during the promo and have now been using it for about 8 months with real money.\n\nLooking for others'' experiences. My main concerns going in:\n1. Data sovereignty — Futu is a Chinese-owned company; where does my data go?\n2. Financial stability — is a HK-listed company with Tencent backing a concern for an ASIC-licensed AU broker?\n3. After the 180-day promo: their ASX brokerage is now $0.49% or $3 minimum. Is that competitive post-promo?\n4. The platform has a lot of features (options, US pre-market) that I don''t use — does complexity = risk?',
      'Invest.com.au Community',
      false, false, false, 0, 14
    ) RETURNING id INTO v_thread_id;

    INSERT INTO public.forum_posts (thread_id, body, author_name, is_moderator, is_removed, vote_score)
      SELECT v_thread_id,
        E'Used moomoo for about 6 months. Honest take:\n\nData: moomoo AU''s privacy policy says data can be processed in Singapore, HK, and China. If that concerns you, don''t use it. It''s a real consideration, not just paranoia — Futu is subject to Chinese regulatory requirements.\n\nFinancial stability: ASIC-licensed, Australian client assets held in a segregated trust account at an Australian bank. The HK parent being Tencent-backed is actually a stability positive, not a risk — Futu is a billion-dollar company with extensive capital. The risk would be if ASIC revoked the AU licence, which would trigger a wind-down process with client asset protection.\n\nPost-promo brokerage: $0.49% is expensive for large trades. A $10,000 trade is $49 vs CommSec''s $19.95 and Pearler''s $6.50. moomoo only makes sense post-promo for traders under $600 per trade (where the $3 minimum applies) or for US options where their pricing is genuinely competitive.\n\nMy conclusion: good for the promo period, use it to learn the platform with free brokerage, then evaluate based on your actual trading size.',
        'Invest.com.au Community', false, false, 7
      WHERE NOT EXISTS (
        SELECT 1 FROM public.forum_posts WHERE thread_id = v_thread_id AND author_name = 'Invest.com.au Community'
      );
  END IF;

  -- Thread 3: Interactive Brokers review
  IF NOT EXISTS (
    SELECT 1 FROM public.forum_threads
      WHERE category_slug = 'broker-reviews'
        AND title = 'Interactive Brokers for Australians — is the complexity worth it for a retail investor?'
  ) THEN
    INSERT INTO public.forum_threads
      (category_slug, title, slug, body, author_name, is_pinned, is_locked, is_removed, reply_count, vote_score)
    VALUES (
      'broker-reviews',
      'Interactive Brokers for Australians — is the complexity worth it for a retail investor?',
      'interactive-brokers-australia-review',
      E'I keep seeing IBKR (Interactive Brokers) recommended for international investing — USD $1 per trade for US stocks, multi-currency accounts, global market access. But the platform looks incredibly complex and some reviews suggest it''s designed for institutional traders.\n\nFor a retail Australian investor who wants:\n- Cheap US stock trading\n- A USD holding account to avoid double FX conversion\n- Maybe some exposure to Hong Kong or UK markets\n\nIs IBKR overkill? Or is the complexity overblown and it''s actually manageable once you''re set up? Also curious about the $10/month inactivity fee — how does that work now?',
      'Invest.com.au Community',
      false, false, false, 0, 16
    ) RETURNING id INTO v_thread_id;

    INSERT INTO public.forum_posts (thread_id, body, author_name, is_moderator, is_removed, vote_score)
      SELECT v_thread_id,
        E'IBKR regular user here, about 3 years on the platform. The complexity is real but manageable — and the complexity is in features you don''t have to use. For a buy-and-hold retail investor, you use maybe 10% of the platform.\n\nInactivity fee update: as of 2023 IBKR removed the monthly minimum fee for accounts under USD $25 monthly commission. So for a passive investor making 1–2 trades per month, the effective monthly fee is $0 (unless you generate under the minimum, which was removed). Check their current fee schedule — it has changed multiple times.\n\nThe FX situation is the main reason most people come: you load AUD, convert to USD at near-interbank rates (0.0008% commission, not the 0.5–1% spread most banks/brokers charge), and trade in USD. When you sell, you hold USD. Only convert back to AUD when you actually need the cash. Saves materially on large positions.\n\nFor Hong Kong/UK access: IBKR covers both. HK Stocks are HKD, LSE stocks are GBP — same multi-currency approach applies. The platform is legitimately better than any Australian broker for international access.',
        'Invest.com.au Community', false, false, 11
      WHERE NOT EXISTS (
        SELECT 1 FROM public.forum_posts WHERE thread_id = v_thread_id AND author_name = 'Invest.com.au Community'
      );
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════
-- Update forum_categories aggregate counts
-- Increment thread_count and post_count for each category
-- based on threads actually inserted.
-- Using a count query to stay idempotent with the guards above.
-- ══════════════════════════════════════════════════════════════

UPDATE public.forum_categories fc
SET
  thread_count = (
    SELECT COUNT(*) FROM public.forum_threads ft
      WHERE ft.category_slug = fc.slug
        AND ft.is_removed = false
  ),
  post_count = (
    SELECT COUNT(*) FROM public.forum_posts fp
      INNER JOIN public.forum_threads ft ON ft.id = fp.thread_id
      WHERE ft.category_slug = fc.slug
        AND fp.is_removed = false
        AND ft.is_removed = false
  )
WHERE fc.slug IN (
  'share-trading', 'etfs-index-funds', 'property-investing',
  'super-retirement', 'crypto', 'tax-strategy', 'beginners', 'broker-reviews'
);

COMMIT;
