-- Seed three new high-value scenarios for launch
-- Covers first home buyers, retirees, and ESG investors

INSERT INTO scenarios (title, slug, hero_title, icon, problem, solution, brokers, considerations)
VALUES
  (
    'First Home Buyer Investing',
    'first-home-buyer',
    'How to invest while saving for your first home',
    '🏠',
    'Australians saving for their first home are often told to keep everything in a savings account — missing out on years of compound growth in the process. The conventional wisdom to "play it safe" ignores that time spent out of the market is time your deposit isn''t compounding.',
    'A smart first home buyer can build a hybrid strategy: keeping the deposit target in high-interest savings while investing surplus funds in low-cost ETFs, and maximising the First Home Super Saver (FHSS) scheme to extract tax savings on contributions made within superannuation.',
    '["commsec", "selfwealth", "superhero", "stake"]',
    '[
      "Separate your deposit target from your investable surplus — only invest money you won''t need for 3+ years",
      "Use the FHSS scheme: salary sacrifice up to $15,000/year into super (total $50,000 limit) and withdraw for your deposit at a reduced tax rate",
      "Shift to more conservative allocations as your purchase date approaches — don''t hold volatile assets with money needed within 12–18 months",
      "Choose CHESS-sponsored brokers so you own shares directly and can transfer holdings later without liquidating",
      "Hold shares over 12 months before selling to access the 50% CGT discount if you need to liquidate for the deposit",
      "First home grants and scheme eligibility are based on property ownership history, not your share portfolio — investing does not disqualify you"
    ]'
  ),
  (
    'Investing in Retirement',
    'retirees',
    'How to generate income and protect wealth after you retire',
    '🌅',
    'Retirees face a unique challenge: they need their portfolio to generate reliable income without depleting capital, across a retirement that may last 25–30 years. The old model of shifting entirely into cash and bonds in retirement fails to account for inflation and longevity risk.',
    'A retirement-phase investor shifts the emphasis from growth to income and capital preservation — using a bucket strategy (cash for near-term needs, income assets for medium-term, growth assets for the long term), maximising franking credit refunds, and structuring assets to minimise CGT and income tax.',
    '["commsec", "nabtrade", "interactive-brokers", "selfwealth"]',
    '[
      "Sequence-of-returns risk: a market crash in the first few years of retirement, combined with forced withdrawals, permanently reduces capital — hold 1–2 years of expenses in cash as a buffer",
      "Fully franked Australian dividends are uniquely valuable in retirement: for low-income retirees, franking credit refunds can add 20–40% to the effective income from Australian shares",
      "Account-based pensions (in super) generate tax-free investment earnings — transitioning to pension phase is a key retirement planning step",
      "SMSF in pension phase: all investment income and capital gains are tax-free (subject to $1.9M transfer balance cap)",
      "Age Pension means-testing: investment income and assets count toward the income and assets tests — plan drawdown to maximise Age Pension entitlement alongside portfolio income",
      "A 65-year-old has a 50% chance of living past 88 — plan for a 25–30 year retirement, which requires continued exposure to growth assets to beat inflation"
    ]'
  ),
  (
    'Ethical & ESG Investing',
    'esg-investing',
    'How to invest in alignment with your values in Australia',
    '🌱',
    'Many Australians want their investments to reflect their environmental, social, and governance values — but face challenges identifying genuinely ethical options, separating marketing claims from real screening methodologies, and finding products that don''t sacrifice returns.',
    'ESG investing in Australia has matured significantly: there are now dedicated ethical ETFs with strong long-term performance, rigorous independent screening methodologies, and platforms that give you visibility into what you actually own. The evidence against ESG investing causing return drag has weakened considerably over the past decade.',
    '["stake", "selfwealth", "interactive-brokers", "moomoo"]',
    '[
      "Greenwashing risk: read the PDS methodology document, not just the marketing — look for specific percentage-based revenue exclusion thresholds, not vague ''avoids harmful industries'' language",
      "Check the top holdings: reputable ESG ETF providers publish daily holdings — verify the actual portfolio matches your values before investing",
      "Best-in-class vs exclusion screening: best-in-class ESG can include the ''most ethical'' oil company — if you want zero fossil fuel exposure, seek funds with explicit sector exclusions",
      "Management fees for ESG ETFs are typically 0.2–0.5% higher than unscreened equivalents — this fee gap compounds over long periods and should be factored into your assessment",
      "Your superannuation has a larger ESG impact than your brokerage account: switching your super to an ethical option (Australian Ethical, Future Super Group) aligns your largest asset pool with your values",
      "Performance: major Australian ESG ETFs like ETHI have matched or outperformed unscreened equivalents over 3 and 5-year periods — the empirical case for a significant return penalty has weakened"
    ]'
  );
