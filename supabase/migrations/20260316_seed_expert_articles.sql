-- Seed: 3 expert advisor articles for launch
-- Creates 3 verified advisor profiles (placeholders) and publishes their articles.
-- Admins can reassign articles to real advisors once they apply via /advisor-apply.

INSERT INTO professionals (
  name, slug, type, status, verified, location_display, location_state,
  bio, specialties, fee_structure, fee_description, email
) VALUES
(
  'Sarah Mitchell',
  'sarah-mitchell-fp',
  'financial_planner',
  'active',
  true,
  'Sydney, NSW',
  'NSW',
  'Sarah is a fee-for-service financial planner with 12 years of experience helping Australian families build wealth and plan for retirement. She specialises in superannuation strategy, investment portfolio construction, and tax-effective structures for high-income earners.',
  ARRAY['Superannuation', 'Retirement Planning', 'Investment Strategy', 'Tax Planning'],
  'fee-for-service',
  'SOA from $3,300. Ongoing advice from $2,200/year.',
  'sarah@placeholder.invest.com.au'
),
(
  'James Okoye',
  'james-okoye-mb',
  'mortgage_broker',
  'active',
  true,
  'Melbourne, VIC',
  'VIC',
  'James is an accredited mortgage broker and former bank lending manager with 9 years of experience across residential, investment, and SMSF lending. He works with first home buyers, property investors, and business owners to secure competitive finance.',
  ARRAY['First Home Buyers', 'Investment Property', 'Refinancing', 'SMSF Lending'],
  'commission',
  'No upfront cost — paid by lender on settlement.',
  'james@placeholder.invest.com.au'
),
(
  'Priya Sharma',
  'priya-sharma-ta',
  'tax_agent',
  'active',
  true,
  'Brisbane, QLD',
  'QLD',
  'Priya is a CPA and registered tax agent with 8 years in public practice. She focuses on investment property tax, capital gains optimisation, and helping small business owners and contractors structure their affairs efficiently.',
  ARRAY['Investment Property Tax', 'Capital Gains', 'Small Business Tax', 'Crypto Tax'],
  'fee-for-service',
  'Tax returns from $250. Ongoing planning from $150/hour.',
  'priya@placeholder.invest.com.au'
)
ON CONFLICT (slug) DO NOTHING;

-- Fetch the IDs we just inserted (or that already exist)
DO $$
DECLARE
  sarah_id integer;
  james_id integer;
  priya_id integer;
BEGIN
  SELECT id INTO sarah_id FROM professionals WHERE slug = 'sarah-mitchell-fp';
  SELECT id INTO james_id FROM professionals WHERE slug = 'james-okoye-mb';
  SELECT id INTO priya_id FROM professionals WHERE slug = 'priya-sharma-ta';

  IF sarah_id IS NOT NULL THEN
    INSERT INTO advisor_articles (
      professional_id, author_name, author_firm, author_slug,
      title, slug, excerpt, content, category, tags,
      status, featured, read_time, word_count, published_at
    ) VALUES (
      sarah_id,
      'Sarah Mitchell',
      'Mitchell Financial Planning',
      'sarah-mitchell-fp',
      'The Super Contribution Strategy Most Australians Miss',
      'super-contribution-strategy-australians-miss',
      'Most Australians leave thousands on the table by not using carry-forward concessional contributions. Here''s how to use 5 years of unused cap to turbocharge your retirement savings.',
      '## The Super Contribution Strategy Most Australians Miss

Every year, millions of Australians make the standard $27,500 concessional super contribution — salary sacrifice, employer super, or personal deductible — and leave it there. What they don''t realise is that if they''ve had a super balance under $500,000 at any point in the last five years, they can catch up on any year they didn''t max out their cap.

This is called the **carry-forward concessional contribution** rule, and it''s one of the most underutilised strategies I see in financial planning practice.

### How It Works

The ATO keeps a rolling 5-year window of unused concessional contribution space. If your balance was under $500,000 at 30 June in any of those years, you can contribute more than the standard $27,500 cap this year — up to the total unused space accumulated.

**Example:** If you contributed $15,000 in FY2022 (leaving $12,500 unused), $20,000 in FY2023 ($7,500 unused), and $10,000 in FY2024 ($17,500 unused), you have $37,500 in unused cap available — on top of this year''s standard $27,500.

### Who Benefits Most?

This strategy is particularly powerful for:

- **Professionals returning from career breaks** (parental leave, illness, sabbatical) who now have higher income and want to rebuild super fast
- **Business owners** who had lean years and couldn''t afford to contribute much
- **Salary earners approaching 60** who want to reduce taxable income in peak earning years
- **Anyone who received a windfall** (inheritance, business sale, property sale) and wants to shift it into the tax-advantaged super environment

### The Tax Maths

Concessional contributions are taxed at 15% inside super versus your marginal rate outside. At the top marginal rate (47% including Medicare), that''s a 32% tax saving per dollar. On a $50,000 catch-up contribution, that''s potentially $16,000 saved in tax.

### The Practical Trap

Most people discover this strategy too late — after their balance ticks over $500,000 and they''re no longer eligible for the carry-forward. The window closes on the rolling 5-year history once the balance threshold is crossed at 30 June.

If you''re hovering near that threshold, talk to your financial planner before the end of the financial year. Once that window closes, it doesn''t reopen.

### What to Check First

1. Log into myGov and check your ATO super page — it now shows your available carry-forward cap
2. Check your balance at 30 June for each of the past five years
3. Calculate your contribution room and decide how much to top up before 30 June
4. If you''re making a personal deductible contribution (not via employer), lodge a Notice of Intent to Claim form with your fund **before** you lodge your tax return

### A Note on Division 293

High-income earners (over $250,000 combined income + super contributions) pay an additional 15% tax on concessional contributions via Division 293. Even so, the 17% net advantage (32% less 15%) often still makes catch-up contributions worthwhile, especially for those close to retirement with a shorter investment horizon for the tax to compound.

If you''re in this bracket, model the numbers with your adviser before committing.

---

*This article is general information only and does not constitute personal financial advice. Please seek advice from a qualified financial planner before implementing any strategy.*',
      'superannuation',
      ARRAY['superannuation', 'tax', 'retirement', 'concessional contributions', 'carry-forward'],
      'published',
      true,
      7,
      820,
      NOW() - interval '3 days'
    ) ON CONFLICT (slug) DO NOTHING;
  END IF;

  IF james_id IS NOT NULL THEN
    INSERT INTO advisor_articles (
      professional_id, author_name, author_firm, author_slug,
      title, slug, excerpt, content, category, tags,
      status, featured, read_time, word_count, published_at
    ) VALUES (
      james_id,
      'James Okoye',
      'Okoye Finance Group',
      'james-okoye-mb',
      'Why Your Comparison Rate Is Lying to You',
      'why-comparison-rate-lying-to-you',
      'The comparison rate is legally required on every home loan ad — but it can actively mislead you. Here''s what it captures, what it misses, and how to actually compare mortgages.',
      '## Why Your Comparison Rate Is Lying to You

Every home loan advertisement in Australia must show two rates: the interest rate and the comparison rate. The comparison rate was introduced to prevent lenders from advertising a low headline rate and then loading the loan with fees. In theory, it''s a more complete picture.

In practice, it can lead you to make the wrong decision.

### What the Comparison Rate Captures

The comparison rate wraps in most upfront and ongoing fees — application fees, monthly account-keeping fees, annual fees — and converts them into an equivalent interest rate over a standard loan. The legal standard is $150,000 over 25 years.

That''s the problem.

### The $150,000 / 25-Year Trap

Australian median loan size is currently around $620,000. On a loan that size, a $300 annual fee represents a meaningfully smaller proportion of the loan than it does on a $150,000 loan. The comparison rate calculation makes that $300 annual fee look far more significant than it is for most borrowers.

Conversely, offset account value — which is enormous on a large loan — doesn''t appear in the comparison rate at all.

**Result:** A loan with a 0.10% higher interest rate but a fully featured offset account will almost always save more money than a loan with a 0.10% lower rate and no offset, especially at loan sizes above $400,000. But the comparison rate will rank the cheaper-rate product as "better."

### What''s Not in the Comparison Rate

- **Offset account performance** — the biggest driver of long-term cost on large loans
- **Redraw facility flexibility** — particularly important for investors who might access equity
- **Rate change history** — a lender who consistently passes through RBA cuts vs one who lags by months
- **Break costs on fixed rates** — can be enormous if you sell or refinance early
- **Discharge fees** — charged when you leave the loan (some lenders charge $400+)
- **Portability** — whether you can take the loan to a new property without refinancing

### What to Actually Compare

For owner-occupiers with a mortgage over $400,000, I''d rank these factors in order:

1. **Offset account** — full offset, linked to a transaction account you can use daily. This alone can save years off your loan.
2. **Interest rate** — after confirming the offset. A difference of 0.20% on $600,000 is $1,200/year.
3. **Lender rate policy** — how quickly do they pass on RBA cuts? Check their history over the last 2-3 rate cycles.
4. **Fees** — only meaningful if the rate and offset comparison is a tie.

For investors, the calculus shifts slightly toward rate (since offset benefits are reduced for tax-purposes on investment loans) and toward redraw flexibility.

### The Comparison Rate''s Actual Use

The comparison rate is useful for filtering out obviously predatory lenders who charge large upfront fees on top of a low headline rate. It''s also useful for comparing loans of similar size and term.

It''s **not** useful for choosing between a no-frills rate-only product and a full-featured loan with offset. For that comparison, you need to model actual cash flows.

If your broker isn''t doing this modelling for you, ask for it. The difference between the right and wrong product choice over a 25-year loan can easily be $40,000–$80,000.

---

*This article is general information only. Credit decisions depend on individual circumstances. Please consult a licensed mortgage broker before applying.*',
      'property',
      ARRAY['mortgage', 'home loan', 'comparison rate', 'offset account', 'refinancing'],
      'published',
      true,
      6,
      700,
      NOW() - interval '5 days'
    ) ON CONFLICT (slug) DO NOTHING;
  END IF;

  IF priya_id IS NOT NULL THEN
    INSERT INTO advisor_articles (
      professional_id, author_name, author_firm, author_slug,
      title, slug, excerpt, content, category, tags,
      status, featured, read_time, word_count, published_at
    ) VALUES (
      priya_id,
      'Priya Sharma',
      'Sharma Tax & Advisory',
      'priya-sharma-ta',
      'The CGT Discount: What Most Investors Get Wrong',
      'cgt-discount-what-investors-get-wrong',
      'The 50% CGT discount is one of Australia''s most valuable tax concessions — but claiming it at the wrong time, with the wrong structure, or without understanding the interaction with your income can cost you significantly.',
      '## The CGT Discount: What Most Investors Get Wrong

The 50% capital gains tax (CGT) discount is one of the most cited reasons Australians favour property and shares over other investments. Hold an asset for more than 12 months, sell it at a profit, and only half the gain is taxable.

Simple in theory. In practice, I see clients make expensive mistakes with it every tax season.

### Mistake 1: Selling in a High-Income Year

The CGT discount reduces the amount of the gain that''s taxable — it doesn''t reduce the rate at which that gain is taxed. The discounted gain is added to your ordinary income and taxed at your marginal rate.

If you sell a rental property in the same year you receive a large bonus, vest a significant share package, or earn other one-off income, your marginal rate on that gain could be 47% (including Medicare). On a $300,000 discounted gain, that''s $141,000 in tax.

If you''d sold the same property in a lower-income year — the year before the bonus, after winding down your business, or in the first year of retirement — your effective rate on that gain might be 32% or less. The difference on a $300,000 gain: over $40,000.

Timing capital gains is one of the highest-value planning exercises a tax adviser can do. If you''re considering selling an asset, have the conversation before the end of the financial year, not after.

### Mistake 2: Selling Through the Wrong Structure

The 50% CGT discount applies differently depending on your structure:

- **Individuals**: Full 50% discount after 12 months ✓
- **Trusts (discretionary)**: 50% discount available, and the trustee can stream the discounted gain to beneficiaries in the lowest tax brackets — very powerful for family trusts ✓
- **Companies**: No CGT discount at all. Full gain is taxed at 25% (base rate entity) or 30%. For assets with large unrealised gains, holding them in a company can be significantly more expensive ✗
- **SMSFs**: 33% discount (not 50%) for assets held more than 12 months, but the 15% tax rate in accumulation phase still makes it attractive. In pension phase, gains may be tax-free entirely ✓✓

If you hold growth assets in a company structure, it''s worth reviewing whether a trust or individual ownership would have been more tax-efficient. While restructuring existing assets can trigger CGT itself (and stamp duty for property), for new acquisitions the structure choice matters enormously.

### Mistake 3: Ignoring the Main Residence Partial Exemption

If you''ve rented out a property that was at some point your main residence, the CGT calculation becomes proportional — not all-or-nothing.

The main residence exemption applies pro-rata based on the proportion of time the property was your home vs an investment. A property owned for 10 years, 4 of which it was your primary residence, gets a 40% main residence exemption — on top of the 50% CGT discount on the remaining 60% of the gain.

Many clients are unaware they''re entitled to this partial exemption and pay more tax than they need to.

### Mistake 4: The 6-Year Rule — Used Too Late or Not at All

If you move out of your main residence and rent it out without nominating a new main residence, you can continue to treat the original home as your main residence for up to 6 years. During those 6 years, any gain is CGT-free (not just discounted — exempt).

This rule is time-limited and easily missed. You must have lived in the home first. You can only have one main residence at a time. And the 6-year clock resets each time you move back.

For Australians who rent elsewhere while their property earns income, this rule is one of the most valuable — and most frequently missed — in the tax code.

### The Bottom Line

CGT planning is not about avoiding tax. It''s about not overpaying it. The discount exists to encourage long-term investment; the timing, structure, and partial exemptions are the legal mechanisms to use it well.

Talk to your tax adviser before you sell, not after. Once settlement is complete, the options narrow dramatically.

---

*This article is general information only and is not a substitute for professional tax advice. Individual circumstances vary — please consult a registered tax agent before making decisions.*',
      'tax',
      ARRAY['tax', 'capital gains', 'CGT', 'investment property', 'shares', 'property'],
      'published',
      true,
      8,
      900,
      NOW() - interval '7 days'
    ) ON CONFLICT (slug) DO NOTHING;
  END IF;
END $$;
