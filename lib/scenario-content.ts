/**
 * Rich editorial content for scenario pages.
 * Keyed by scenario slug — renders as sections below the DB content.
 */
export interface ScenarioGuideContent {
  sections: { heading: string; body: string }[];
  faqs: { question: string; answer: string }[];
  relatedLinks: { label: string; href: string }[];
}

export const SCENARIO_CONTENT: Record<string, ScenarioGuideContent> = {
  "day-trading": {
    sections: [
      {
        heading: "What Counts as Day Trading in Australia?",
        body: "Day trading means buying and selling the same security within a single trading day. In Australia, the ATO doesn't have a formal 'day trader' designation — but if you trade frequently, with the intention of making short-term profit, they may classify you as a 'share trader' rather than a 'share investor'. This has significant tax implications: traders can claim losses against other income, but they lose the 50% CGT discount that investors enjoy on assets held over 12 months.",
      },
      {
        heading: "The Real Cost of Day Trading: Brokerage Adds Up Fast",
        body: "Day traders might execute 5-20 trades per day. At $10 per trade, that's $50-$200 per day in brokerage alone — $12,000-$48,000 per year. This is why brokerage cost is the single most important factor for day traders. Brokers offering $0 or sub-$5 trades can save tens of thousands annually. Look for platforms that reward high-volume traders with lower fees.",
      },
      {
        heading: "Platform Speed and Tools Matter",
        body: "For day trading, milliseconds matter. You need a platform with fast execution, real-time Level 2 market depth, advanced charting with indicators (RSI, MACD, Bollinger Bands), and hot-key order entry. Mobile apps alone won't cut it — you need a desktop platform designed for active trading. Some platforms also offer simulated trading (paper trading) so you can practice strategies without risking real money.",
      },
      {
        heading: "Risk Management: The 2% Rule",
        body: "Professional day traders never risk more than 1-2% of their account on a single trade. With a $20,000 account, that means risking no more than $200-$400 per trade. Use stop-loss orders religiously. The majority of retail day traders lose money — academic studies consistently show that fewer than 5% are profitable over a multi-year period. Start with a paper trading account and track your results for at least 3 months before committing real capital.",
      },
    ],
    faqs: [
      {
        question: "Is day trading legal in Australia?",
        answer: "Yes. Day trading is legal in Australia. There are no pattern day trader rules like in the US (which require $25,000 minimum). However, the ATO may classify frequent traders as share traders, which affects how profits and losses are taxed.",
      },
      {
        question: "How much do day traders pay in tax in Australia?",
        answer: "If the ATO classifies you as a share trader, your trading profits are treated as ordinary income (not capital gains). You lose the 50% CGT discount for assets held over 12 months, but you can deduct trading losses against other income. Speak to a tax accountant if you trade frequently.",
      },
      {
        question: "What is the minimum amount needed for day trading in Australia?",
        answer: "There's no legal minimum, but most experienced traders recommend at least $5,000-$10,000 to absorb brokerage costs and maintain proper position sizing. With $0 brokerage brokers, you could technically start with less, but small accounts make it difficult to apply proper risk management.",
      },
    ],
    relatedLinks: [
      { label: "Best for Low Fees", href: "/best/low-fees" },
      { label: "Trade Cost Calculator", href: "/calculators?calc=trade-cost" },
      { label: "Compare All Platforms", href: "/compare" },
    ],
  },

  expats: {
    sections: [
      {
        heading: "Tax Residency Is the First Thing to Sort Out",
        body: "Your tax obligations change the moment you become a non-resident. As an Australian non-resident for tax purposes, you lose the 50% CGT discount, you lose the tax-free threshold ($18,200), and dividends from Australian companies may be subject to withholding tax. The ATO uses a series of tests (domicile, 183-day, superannuation, resides) to determine your tax residency. Get professional tax advice before making investment decisions as an expat.",
      },
      {
        heading: "Which Brokers Accept Non-Residents?",
        body: "Not all Australian brokers accept customers who live overseas. Some will close your account when you notify them of your address change. Others have restrictions on which countries they can serve (often due to local regulations in your new country). The brokers in our recommended list all accept Australian citizens living abroad, but you should verify your specific country is supported before opening an account.",
      },
      {
        heading: "The Double Tax Agreement Advantage",
        body: "Australia has Double Tax Agreements (DTAs) with over 40 countries. These agreements prevent you from being taxed twice on the same income. For expats, this typically means you can claim a foreign income tax offset in one country for tax paid in the other. The specific rules depend on the DTA between Australia and your country of residence. This can significantly reduce your total tax burden on investment income.",
      },
      {
        heading: "Should Expats Keep Their Australian Investments?",
        body: "It depends on your situation. If you plan to return to Australia, keeping Australian investments avoids the hassle of selling and rebuying. If you've moved permanently, you might benefit from selling Australian holdings and reinvesting in your new country's market (avoiding ongoing non-resident withholding tax). Consider the CGT event triggered by selling, the ongoing tax obligations, and your future plans before deciding.",
      },
    ],
    faqs: [
      {
        question: "Do I have to tell my broker I've moved overseas?",
        answer: "Yes. Failing to update your tax residency status with your broker can result in incorrect withholding tax and potential ATO penalties. Most brokers will require updated identity documents (passport, proof of overseas address) when you change your address to an international one.",
      },
      {
        question: "Can I open a new Australian brokerage account from overseas?",
        answer: "It's difficult. Most Australian brokers require you to be an Australian resident to open a new account. If you're already a customer, maintaining your existing account is usually easier than opening a new one. International brokers like Interactive Brokers and Saxo are often better options for expats.",
      },
    ],
    relatedLinks: [
      { label: "Best for US Shares", href: "/best/us-shares" },
      { label: "Best for Low FX Fees", href: "/best/low-fx-fees" },
      { label: "Tax Calculator", href: "/calculators?calc=cgt" },
    ],
  },

  kids: {
    sections: [
      {
        heading: "The Tax Trap: Why You Shouldn't Put Shares in Your Child's Name",
        body: "This is the most common mistake parents make. Unearned income (dividends, interest, capital gains) earned by minors is taxed at penalty rates: 66% on amounts over $416 per year. This is far higher than adult tax rates and is designed to prevent income splitting. If your child earns $1,000 in dividends, they'd pay approximately $385 in tax — compared to $0 for an adult on the same amount (below the tax-free threshold).",
      },
      {
        heading: "Option 1: Informal Trust (Invest in Your Name, for Their Benefit)",
        body: "The simplest approach is to invest in your own name with the intention of gifting the assets to your child when they turn 18. The income is taxed at your marginal rate (typically 19-37%, much lower than the minor penalty rate). When your child turns 18, you can transfer the shares — this triggers a CGT event for you, but by then you may have held the assets long enough to qualify for the 50% CGT discount. Keep a written record that the funds are intended for your child.",
      },
      {
        heading: "Option 2: Investment Bond (Insurance Bond)",
        body: "Investment bonds are tax-paid investments — the fund pays 30% tax internally, and after 10 years, withdrawals are completely tax-free. They can be held in your name with your child as beneficiary. The 30% internal tax rate is higher than the lowest marginal rates, but the 10-year tax-free benefit makes them attractive for long-term investing for children. You can make additional contributions each year up to 125% of the previous year's contribution without resetting the 10-year clock.",
      },
      {
        heading: "Option 3: Superannuation Contributions",
        body: "You can contribute up to $1,000 per year into your child's super fund from non-concessional (after-tax) money. The money is locked until they reach preservation age (currently 60), so this is purely a long-term wealth-building strategy. The advantage is that super is taxed at only 15% on earnings. However, the money is inaccessible for decades, so most parents prefer options that allow their child to access funds for education or a first home.",
      },
    ],
    faqs: [
      {
        question: "At what age can my child have their own share trading account?",
        answer: "Most Australian brokers require you to be 18 to open an account. Some allow custodial accounts (opened by a parent in the child's name), but beware of the minor's penalty tax rates on investment income. When your child turns 18, they can open their own account and you can transfer assets to them.",
      },
      {
        question: "What is the best first investment for a child?",
        answer: "A diversified index ETF (like one tracking the ASX 200 or a global index) is the simplest and most appropriate first investment. It provides broad diversification, low fees, and removes the need to pick individual stocks. Regular small contributions via dollar-cost averaging teaches good investing habits.",
      },
    ],
    relatedLinks: [
      { label: "Best for Beginners", href: "/best/beginners" },
      { label: "Tax Calculator", href: "/calculators?calc=cgt" },
      { label: "Compare All Platforms", href: "/compare" },
    ],
  },

  smsf: {
    sections: [
      {
        heading: "SMSF Broker Requirements: What the ATO Expects",
        body: "The ATO requires that SMSF assets be held separately from personal assets and that the fund's trustee maintains proper records for the annual audit. This means your broker must support trust-level accounts (not just individual accounts), provide clear transaction histories, and ideally integrate with SMSF administration software. Using a personal brokerage account for SMSF investments is a compliance breach that can result in the fund being made non-complying — triggering a tax penalty of up to 45% on the fund's assets.",
      },
      {
        heading: "CHESS Sponsorship: Essential for SMSF Safety",
        body: "CHESS sponsorship is particularly important for SMSFs. When shares are CHESS-sponsored, they're registered under the SMSF's HIN (Holder Identification Number), making ownership crystal clear for your annual audit. If the broker fails, CHESS-sponsored shares can be transferred to another broker because they're registered in the fund's name. For custodial brokers, recovery of assets during broker insolvency can be slower and more complex — not ideal for a super fund holding your retirement savings.",
      },
      {
        heading: "Fees That Matter for SMSF Investors",
        body: "Beyond per-trade brokerage, SMSF investors should check for: platform fees (some brokers charge a monthly/annual fee for trust accounts), data feed costs (real-time pricing may be extra), corporate actions handling (dividend reinvestment, share splits), and reporting fees. Also check whether the broker's reports integrate with your SMSF accounting software (Class Super, BGL, SuperConcepts). Manual reconciliation costs time and accountant fees.",
      },
      {
        heading: "Investment Strategy Considerations for SMSFs",
        body: "SMSFs must have a documented investment strategy that considers diversification, liquidity, the fund's ability to pay benefits, and insurance for members. Your broker choice affects this: some only offer ASX shares, while others provide access to international markets, ETFs, and bonds. For proper diversification, consider a broker that gives you access to multiple asset classes and markets. The investment strategy must be reviewed regularly — at least annually — and updated when circumstances change.",
      },
    ],
    faqs: [
      {
        question: "Can any broker hold SMSF investments?",
        answer: "No. The broker must support trust/SMSF accounts with compliant custody arrangements. Many newer brokers only support individual accounts. Always check that the broker explicitly lists SMSF as a supported account type before opening an account.",
      },
      {
        question: "How much does it cost to run an SMSF?",
        answer: "Total annual SMSF costs typically range from $2,000-$5,000 including accounting, audit, and ASIC fees. Brokerage costs are on top of this. SMSFs generally only make financial sense with balances above $200,000-$300,000 where the percentage cost is comparable to an industry super fund's fees.",
      },
      {
        question: "Can my SMSF invest in international shares?",
        answer: "Yes. SMSFs can invest in international shares as long as the investment strategy allows it and the trustee has properly documented the decision. Ensure your broker supports international trading for SMSF accounts and check the FX conversion costs, as these can eat into returns.",
      },
    ],
    relatedLinks: [
      { label: "Best for SMSF", href: "/best/smsf" },
      { label: "Best for CHESS", href: "/best/chess-sponsored" },
      { label: "Fee Calculator", href: "/calculators?calc=trade-cost" },
    ],
  },

  "first-home-buyer": {
    sections: [
      {
        heading: "Should First Home Buyers Invest at All?",
        body: "The tension between saving for a house deposit and investing is real — but it's a false choice for most Australians. If your property purchase is more than 2–3 years away, the question isn't whether to invest, but how to invest smartly alongside your savings strategy. Every year sitting in a 5% savings account instead of a broadly diversified ETF portfolio is potentially years of compound growth left on the table.\n\nThe key distinction is time horizon. Money earmarked for your deposit in the next 12 months should stay liquid and low-risk — a high-interest savings account or term deposit is appropriate. But if you're 3+ years from buying, the surplus beyond your emergency fund and short-term deposit savings can be invested in growth assets.\n\nHistorically, Australian and global share markets have returned 8–10% annually over 10-year rolling periods — consistently outpacing inflation and high-interest savings rates. Compounding matters: $10,000 invested at 8% for 5 years becomes $14,693. Sitting in a 5% savings account for the same period yields $12,763. The gap widens with time and larger amounts.",
      },
      {
        heading: "The First Home Super Saver (FHSS) Scheme Explained",
        body: "The FHSS scheme is one of the most underutilised tax advantages available to first home buyers. It lets you make voluntary concessional (before-tax) contributions to superannuation and then withdraw them — along with their earnings — to put towards a home deposit.\n\nHere's how it works: you salary sacrifice up to $15,000 per year into super (total of $50,000 across all years since 2017). When you're ready to buy, you apply to the ATO to release those contributions plus an associated earnings amount. The withdrawn amount is taxed at your marginal rate minus a 30% offset, meaning most people pay 15% or less tax on the withdrawal — significantly less than normal income tax.\n\nFor a couple, both partners can use the scheme, doubling the benefit to $100,000. The combination of compulsory super returns, tax savings, and preservation makes FHSS one of the best tools available to first home buyers who are 2+ years from purchasing. You must not have previously owned residential property in Australia, and you must intend to occupy the property for at least 6 months.\n\nImportant caveat: FHSS money is locked in super until you apply for release. Don't contribute money you might need access to before you're ready to buy.",
      },
      {
        heading: "How to Time Your Investment Strategy with Your Property Timeline",
        body: "Your investment strategy should become progressively more conservative as your purchase date approaches. A useful framework:\n\n**4+ years out:** Growth-oriented. Invest a meaningful portion in Australian and global share ETFs. Accept short-term volatility — you have time to recover from downturns. Focus on low-cost index ETFs like VAS, IVV, or a diversified fund like VDHG.\n\n**2–4 years out:** Balanced. Reduce your equity allocation and begin shifting into more stable assets. Consider a blend of share ETFs (60–70%) with some fixed income or high-interest savings (30–40%). This protects against a sharp market downturn that would force you to sell at a loss right before you need the money.\n\n**0–2 years out:** Conservative/capital preservation. Your deposit target is in sight. Move savings progressively into high-interest savings accounts and term deposits. Avoid adding to share investments with money earmarked for the deposit. Any shares you continue holding should be clearly 'long-term portfolio' money you can afford to leave invested if markets fall.\n\nThe biggest mistake first home buyers make is letting the desire to grow their deposit override prudent risk management — and then needing to sell during a downturn, crystallising losses just before settlement.",
      },
      {
        heading: "What to Actually Invest In as a First Home Buyer",
        body: "For simplicity and tax efficiency, broad-market ETFs are the best starting point for most first home buyers investing the non-deposit portion of their savings:\n\n**Australian shares (VAS, A200, IOZ):** Provides exposure to ASX 200/300 companies plus franking credits from dividends. Good for tax-effective income and long-term growth.\n\n**Global shares (IVV, VGS, IWLD):** Diversifies beyond Australia. The S&P 500 and global indices have delivered strong long-term returns. AUD hedged versions reduce currency risk.\n\n**Diversified multi-asset ETFs (VDHG, DHHF):** Single-fund solutions that hold a mix of Australian and global shares, with built-in rebalancing. Ideal for beginners who want simplicity. VDHG holds 90% growth assets; DHHF holds 100%.\n\nAvoid concentrated single-stock bets, speculative assets, or high-fee managed funds. You're building a bridge — you want reliable, low-cost growth with minimal complexity. Choose a CHESS-sponsored broker so you hold shares in your own name and can transfer them easily when you eventually move to a long-term brokerage account.",
      },
      {
        heading: "Tax Considerations for First Home Buyer Investors",
        body: "Investing while saving for a home means you'll need to manage tax alongside your property timeline:\n\n**Capital Gains Tax (CGT):** If you sell investments within 12 months, you pay full CGT on the gain at your marginal rate. Holding over 12 months entitles you to the 50% CGT discount — so whenever possible, structure your selling timetable to exceed 12-month holding periods.\n\n**Dividends and franking credits:** Share dividends are taxable income. However, Australian companies pay dividends with attached franking credits (pre-paid corporate tax), which can reduce your net tax liability. This is generally an advantage for lower-income earners.\n\n**Negative gearing:** If you borrow to invest (not recommended for most first home buyers), you can claim a tax deduction on interest costs. However, adding investment debt while saving for a property deposit significantly increases financial risk.\n\n**FHSS earnings:** The ATO applies an 'associated earnings' rate to FHSS contributions — currently the 90-day bank bill rate plus 3%. These earnings are taxable on withdrawal at your marginal rate minus the 30% offset.",
      },
    ],
    faqs: [
      {
        question: "Can I use the First Home Super Saver scheme if I'm already investing through a broker?",
        answer: "Yes — the FHSS scheme operates entirely within superannuation and is separate from any share brokerage account. You can contribute salary-sacrifice amounts to your super fund through your employer and simultaneously maintain a share portfolio outside super. The two don't interact. The FHSS scheme offers tax advantages that your share brokerage account doesn't, so using both in parallel is often the optimal strategy.",
      },
      {
        question: "Will having a share portfolio affect my eligibility for the First Home Guarantee or other government schemes?",
        answer: "Holding shares or ETFs does not disqualify you from the First Home Guarantee (5% deposit scheme), First Home Owner Grant (FHOG), or stamp duty concessions. These schemes look at whether you've previously owned residential property in Australia — not at your investment portfolio. However, income from your investments (dividends, interest) contributes to your taxable income, which could affect your eligibility for income-tested grants in some states. Check the specific eligibility criteria in your state.",
      },
      {
        question: "How much of my savings should I keep in shares vs cash when saving for a first home?",
        answer: "A useful rule of thumb: keep 100% of your target deposit in cash/term deposits as you approach your purchase date, and invest any surplus savings beyond that target in shares. If your target deposit is $120,000 and you have $150,000 saved, the $120,000 stays in cash and the $30,000 surplus can be in shares. As your timeline shortens (under 2 years), shift the surplus to cash as well. Never invest money you can't afford to have tied up for at least 2–3 years.",
      },
      {
        question: "What happens to my investments if the property market rises faster than I expected?",
        answer: "If property prices rise sharply and you need to increase your deposit target, you may need to sell investments early — potentially triggering CGT and possibly selling at an inopportune time. This is why capital preservation becomes increasingly important as you get closer to buying. Consider setting a concrete deposit target amount and date, and reverse-engineer your savings/investment split from there. Having a buffer beyond the minimum deposit (e.g., saving for 10–20% rather than 5%) reduces the risk of being caught short.",
      },
    ],
    relatedLinks: [
      { label: "Best Brokers for Beginners", href: "/best/beginners" },
      { label: "CHESS-Sponsored Brokers", href: "/best/chess-sponsored" },
      { label: "Compare ETF Platforms", href: "/best/etf-platforms" },
    ],
  },

  "retirees": {
    sections: [
      {
        heading: "Retirement Phase vs Accumulation Phase Investing",
        body: "Retirement changes everything about how you should invest. During your working years (the accumulation phase), you're focused on growing your portfolio — time horizon is long, income is regular, and you can ride out market downturns. In retirement (the drawdown phase), the priorities shift: generating reliable income, managing sequence-of-returns risk, and preserving capital long enough to fund potentially 20–30 years of living.\n\nSequence-of-returns risk is the biggest challenge retirees face: if markets crash in the first few years of retirement and you're forced to sell shares to fund living expenses, you lock in losses and permanently reduce the capital base that needs to fund the rest of your retirement. The solution isn't to avoid growth assets entirely — inflation will erode a cash-only portfolio — but to structure your portfolio so you never need to sell shares in a downturn.\n\nThe classic approach is a 'bucket strategy': keep 1–2 years of living expenses in cash (bucket 1), 3–10 years in lower-risk income assets like bonds or LICs (bucket 2), and the remainder in growth assets like share ETFs (bucket 3). In a down market, you live off buckets 1 and 2, giving bucket 3 time to recover.",
      },
      {
        heading: "Building an Income Portfolio: Dividends, LICs, and ETFs",
        body: "Australian retirees are unusually well-positioned for income investing because of franking credits — a mechanism that makes Australian dividends worth more in tax terms than equivalent income from most other countries.\n\n**High-yield ASX shares:** The big four banks (CBA, NAB, ANZ, WBC), Telstra, BHP, and major retailers consistently pay fully franked dividends. A portfolio focused on these can deliver 4–6% grossed-up yield annually — more than enough to fund living expenses for many retirees.\n\n**Listed Investment Companies (LICs):** LICs like AFIC (Australian Foundation Investment), Argo, and Milton hold diversified ASX portfolios and have 50–80-year track records of paying growing dividends. Their income is more predictable than individual shares and they often smooth dividends by retaining profits in good years.\n\n**Income ETFs:** Options like VHY (Vanguard High Yield ETF), HVST (BetaShares Australian Dividend Harvester), and YMAX provide diversified exposure to high-yield Australian or global shares. The added diversification reduces the income risk of individual company dividend cuts.\n\n**Account-Based Pensions (ABPs):** If you've reached preservation age and accessed super, an account-based pension provides tax-free investment earnings and drawdowns (for those over 60). The minimum annual drawdown is 4–5% depending on your age — the portfolio needs to generate sufficient returns to sustain this without depleting.",
      },
      {
        heading: "Franking Credits in Retirement: Your Tax Advantage",
        body: "Franking credits are often the difference between an adequate and a comfortable retirement for Australian share investors. When a company pays a fully franked dividend, it has already paid 30% corporate tax on the profits. You receive a tax credit for this amount.\n\nFor retirees with low or zero taxable income, franking credits can result in a tax refund — you receive the 30% credit as cash even if you have no tax to offset it against. A retiree with $30,000 in fully franked dividends might receive an additional $12,000+ in franking credit refunds annually — effectively boosting their income by 40%.\n\nThis makes Australian shares uniquely valuable in retirement. A 4% fully franked dividend yield becomes roughly 5.7% grossed-up (before the refund effect for low-income retirees). For SMSF members in pension phase, the entire fund's income (including franking credit refunds) is tax-free, making this advantage even more powerful.\n\nManage your income carefully to stay below the relevant tax and pension thresholds. Mixing international (unfranked) ETFs with domestic (franked) shares can optimise your overall tax position.",
      },
      {
        heading: "SMSF vs Industry Super Fund in Retirement",
        body: "For retirees with substantial balances (generally $500,000+), an SMSF in pension phase offers significant advantages: all investment earnings and drawdowns are tax-free, you have complete investment control (including direct property, international shares, and LICs), and estate planning flexibility is greater than most retail funds.\n\nHowever, SMSFs require ongoing administration, accounting, and audit (typically $2,000–$5,000/year), trustee compliance obligations, and active investment management. If you're comfortable with this — or work with an SMSF accountant — the control and tax efficiency justify the complexity at scale.\n\nIndustry super funds in pension phase also offer tax-free earnings and are competitive for members who don't require bespoke investment control. The major industry funds (AustralianSuper, Australian Retirement Trust, Hostplus) offer pension accounts with low fees and good diversification. For balances under $300,000, an industry fund pension is often more cost-effective than establishing an SMSF.\n\nKey question: do you want to manage your own investment portfolio in retirement? If yes, an SMSF or online broker in your own name is appropriate. If you prefer a managed solution, an industry fund pension plus a separate share portfolio for direct market access is a practical hybrid.",
      },
      {
        heading: "Managing Longevity Risk: How Long Do You Need to Fund?",
        body: "A 65-year-old Australian woman has a 50% chance of living to 89 and a 25% chance of living past 96. For couples, the probability of at least one partner surviving to 90 is even higher. Your investment strategy must account for a 25–30 year retirement, not the 15–20 years previous generations planned for.\n\nThe traditional 60/40 portfolio (60% shares, 40% bonds) was designed for a 20-year retirement. For a 30-year retirement, research suggests higher equity allocations maintain or improve success rates — the additional growth offsets the higher volatility. A 70/30 or 75/25 split may be more appropriate for healthy retirees aged 60–70.\n\nAged care costs are increasingly significant. The median cost of residential aged care in Australia exceeds $100,000 per year, and these costs are inflation-linked. Factor this into your 25+ year projection. Some retirees choose to set aside a separate 'aged care fund' (cash, bonds, or conservative ETFs) to cover this risk without liquidating their broader portfolio under time pressure.",
      },
    ],
    faqs: [
      {
        question: "What is the safest investment for retirees in Australia?",
        answer: "There's no single 'safest' investment — safety depends on the risk you're protecting against. If you're worried about capital loss, high-interest savings accounts and term deposits protect nominal capital. If you're worried about inflation eroding purchasing power, shares and property are 'safer' over 10+ year horizons. Most financial advisers suggest retirees hold 1–2 years of living expenses in cash, with the balance spread across income-generating shares/ETFs and some growth assets to counteract inflation. A balanced portfolio of 50–60% growth assets has historically provided sustainable income for 25–30 year retirements.",
      },
      {
        question: "How do I set up an account-based pension?",
        answer: "Contact your super fund and request to switch your accumulation account to a pension account (also called an income stream). You'll need to have reached preservation age (currently 60 for most people) and meet a condition of release (e.g., retired, turning 65, or starting a transition-to-retirement strategy). The fund will ask you to nominate a drawdown amount (minimum 4–5% depending on your age) and payment frequency. For SMSF members, your SMSF accountant will assist with the pension commencement documentation. Once in pension phase, investment earnings are tax-free.",
      },
      {
        question: "Should I keep investing in shares after I retire?",
        answer: "For most retirees, yes — at least partially. A retirement lasting 25–30 years still requires growth to keep pace with inflation (currently 3–4% in Australia). A cash-only portfolio risks being eroded by inflation over a long retirement. The appropriate equity allocation depends on your other income sources (pension, rental income), expenditure needs, and risk tolerance. A common rule of thumb is holding your age as a percentage in defensive assets — so a 70-year-old might hold 70% defensive (cash, bonds) and 30% growth (shares, property). However, many financial planners now suggest this understates the equity allocation needed for modern longer retirements.",
      },
      {
        question: "How much can I earn before losing my Age Pension?",
        answer: "The Age Pension is means-tested against both income and assets. The income test applies a reduction of $0.50 per fortnight for every dollar of income over the free area ($204/fortnight for singles as of 2026). Investment income (dividends, distributions, rental income) counts as income. Franking credit refunds count as income in the year received. A financial adviser or Centrelink financial information service officer can help optimise your drawdown strategy to maximise Age Pension entitlement alongside investment income.",
      },
    ],
    relatedLinks: [
      { label: "Best for SMSF Investing", href: "/best/smsf" },
      { label: "Best CHESS-Sponsored Brokers", href: "/best/chess-sponsored" },
      { label: "Find a Financial Adviser", href: "/find-advisor" },
    ],
  },

  "esg-investing": {
    sections: [
      {
        heading: "What is ESG Investing and How Does It Work?",
        body: "ESG stands for Environmental, Social, and Governance — three broad categories used to evaluate investments beyond pure financial returns. Environmental factors include a company's carbon emissions, resource usage, and climate risk exposure. Social factors cover labour practices, supply chain standards, and community impact. Governance factors examine board composition, executive pay, and shareholder rights.\n\nESG investing takes several forms:\n\n**Negative screening (exclusion):** Removing sectors or companies from a portfolio — tobacco, weapons, gambling, fossil fuel extraction. Most 'ethical' ETFs use some version of this.\n\n**Positive screening (best-in-class):** Selecting companies that score highest on ESG metrics within each sector, rather than excluding sectors entirely.\n\n**ESG integration:** Incorporating ESG data into standard financial analysis — not as a values overlay but as a risk management tool (e.g., a mining company with high climate transition risk may face future regulatory costs).\n\n**Impact investing:** Actively seeking investments that generate measurable positive social or environmental outcomes alongside financial returns (more common in private equity and bonds than in listed equities).\n\nMost retail ETFs labelled 'ethical' or 'responsible' use a combination of negative screening and ESG integration. The screens vary significantly between funds — what one fund excludes, another may hold.",
      },
      {
        heading: "ESG ETFs Available on the ASX",
        body: "Australian investors have access to a growing range of ESG-oriented ETFs across different asset classes and risk profiles:\n\n**Broad Australian market:**\n- **ETHI (BetaShares Global Sustainability Leaders):** Tracks a global index of companies rated as leaders in ESG practices. Excludes fossil fuels, weapons, tobacco, and companies with significant ESG controversies. AUM over $3bn — the most popular ESG ETF in Australia.\n- **FAIR (BetaShares Australian Sustainability Leaders):** ASX 200 equivalent with screens for fossil fuels, weapons, and significant ESG violators.\n- **RARI (Russell Investments Responsible Australian Shares):** Broad market with negative screens applied.\n\n**Global exposure:**\n- **ESGI (VanEck MSCI International ESG):** Global developed markets, MSCI ESG screening, excludes coal, weapons, tobacco.\n- **VESG (Vanguard ESG Australian Shares):** Vanguard's ESG screening over its ASX-focused universe.\n\n**Green bonds and fixed income:**\n- **ETFS Green Bond ETF** provides exposure to bonds issued to fund environmental projects (renewable energy, green buildings).\n\nMost ESG ETFs charge higher management fees than their unscreened equivalents — typically 0.2–0.7% versus 0.03–0.2% for plain-vanilla index ETFs. Over long periods, this fee gap compounds. Factor this into your evaluation.",
      },
      {
        heading: "How to Evaluate Whether a Fund is Genuinely Ethical",
        body: "Greenwashing is a genuine risk in ESG investing. Some funds labelled 'sustainable' or 'responsible' hold significant positions in fossil fuel companies, defence contractors, or other sectors many investors consider problematic. How to evaluate:\n\n**1. Read the PDS and methodology document.** Every ASX-listed ETF publishes a Product Disclosure Statement. The methodology section explains exactly which screens are applied and how companies are selected or excluded. Look for specifics — 'excludes companies deriving more than 5% of revenue from thermal coal' is more meaningful than 'avoids harmful industries.'\n\n**2. Check the top holdings.** Most ETF providers publish their portfolio holdings daily on their website. Look at the top 20-30 holdings and assess whether they align with your values. If you see oil majors, weapons manufacturers, or tobacco companies in an 'ethical' ETF, the screening methodology may not be as strict as the marketing suggests.\n\n**3. Look for recognised ESG standards.** Methodologies that reference MSCI ESG Ratings, Sustainalytics, or UNPRI (UN Principles for Responsible Investment) frameworks tend to be more rigorous than proprietary in-house screens.\n\n**4. Understand the difference between best-in-class and exclusion.** Best-in-class ESG includes the 'most ESG-friendly' oil company — which still operates in fossil fuels. If you want zero fossil fuel exposure, look for funds that explicitly exclude the sector entirely.",
      },
      {
        heading: "ESG vs Traditional Investing: The Performance Question",
        body: "The long-running debate about whether ESG investing sacrifices returns has become increasingly nuanced. The evidence over the past decade is broadly positive:\n\n**ETHI vs its benchmark:** BetaShares' ETHI ETF has outperformed its unscreened equivalent (IVV/IWLD) over 3 and 5-year periods through 2025. This partly reflects the underweight to energy companies during periods of rising rates and ESG headwinds against traditional energy.\n\n**FAIR vs ASX 200:** Performance has been roughly in line with the ASX 200 over comparable periods, suggesting screens haven't materially hurt returns in the Australian market.\n\n**Academic research:** A 2021 meta-analysis of 2,000+ empirical studies found that ESG investing did not systematically underperform — and in many cases outperformed — over long horizons. The outperformance was attributed to better governance reducing fraud/scandal risk, and ESG leaders having lower regulatory risk exposure.\n\n**The fee drag:** ESG ETFs typically cost 0.2–0.5% more annually than plain-vanilla equivalents. Over 20 years, this represents meaningful return drag that must be offset by investment outperformance or accepted as the 'price' of values-aligned investing.\n\nConclusion: the empirical case for ESG investing imposing a significant return penalty has weakened considerably. For long-term investors with genuine values preferences, the data no longer supports 'you must sacrifice returns to invest ethically.'",
      },
      {
        heading: "Beyond ETFs: Screening Your Entire Broker Relationship",
        body: "For committed ethical investors, it's worth examining the broker relationship itself — not just the ETFs you hold:\n\n**CHESS vs custodial:** CHESS-sponsored brokers hold shares in your name on the ASX register, giving you direct legal ownership. This is generally preferable for any investor, but especially relevant if you're concerned about your broker's counterparty exposure to sectors you've excluded.\n\n**Broker's own investment activities:** Some brokers are subsidiaries of major banks with extensive fossil fuel and mining lending. If this matters to your values, consider independent platforms that aren't embedded in large banking groups.\n\n**International brokers and short selling:** Some international platforms facilitate short selling of shares — including companies you may hold. If you have concerns about your shares being lent and shorted (and the proceeds benefiting practices you object to), check whether your broker offers an opt-out from securities lending.\n\n**Superannuation alignment:** Your super fund likely holds significant assets — reviewing and switching to an ethical super option (such as Australian Ethical Super, Future Super Group, or Aware Super's socially responsible option) can have a far greater values impact than optimising your brokerage ETF selection, since super holds the majority of most Australians' investment wealth.",
      },
    ],
    faqs: [
      {
        question: "Is ESG investing performance worse than regular investing?",
        answer: "Not consistently. Over the past 5–10 years, major ESG ETFs like ETHI have matched or outperformed their unscreened counterparts. The main long-term performance detractors are higher management fees (typically 0.2–0.5% more annually than plain-vanilla ETFs) and potential sector concentration risk (underweight energy, overweight tech). Academic research across thousands of studies shows no systematic ESG performance penalty. Individual fund performance varies significantly — compare the specific fund's track record and fees, not just its ESG label.",
      },
      {
        question: "What are the best ESG ETFs in Australia in 2026?",
        answer: "The most popular and well-established options are: ETHI (BetaShares Global Sustainability Leaders, global developed markets, $3bn+ AUM, strong exclusion screens), FAIR (BetaShares Australian Sustainability Leaders, ASX focus), ESGI (VanEck MSCI International ESG, global), and VESG (Vanguard ESG Australian Shares). For a complete ethical portfolio, consider pairing FAIR (Australian) with ETHI or ESGI (global) for diversification. Check the PDS of each for specific exclusions before investing.",
      },
      {
        question: "How do I know if a fund is genuinely ethical and not greenwashing?",
        answer: "Read the fund's methodology document (in the PDS) rather than the marketing materials. Look for: explicit percentage-based revenue thresholds for exclusions (e.g., 'excludes companies with >5% revenue from coal'), reference to independent ESG ratings providers (MSCI, Sustainalytics), and published daily holdings so you can verify. Check the top 20 holdings yourself on the provider's website. Avoid funds that use vague language like 'avoids harmful industries' without specific definitions. For stricter screens, look for funds that reference the UNPRI framework or TCFD climate alignment.",
      },
      {
        question: "Can I build an ESG portfolio through any ASX broker?",
        answer: "Yes — ETHI, FAIR, VESG, and ESGI all trade on the ASX like any share, so you can buy them through any Australian share broker. The broker itself has no ESG filter on trades; you choose the underlying investment. If you want to build an all-ethical portfolio, simply buy ASX-listed ESG ETFs instead of their unscreened equivalents. The main consideration is brokerage cost — on small regular purchases, the $5–$10 brokerage on low-fee platforms still applies to each ETF purchase.",
      },
    ],
    relatedLinks: [
      { label: "Best ETF Platforms", href: "/best/etf-platforms" },
      { label: "Best for Ethical Investing", href: "/best/ethical-investing" },
      { label: "ETF Investing Guide", href: "/how-to/buy-etfs" },
    ],
  },
};

export function getScenarioContent(slug: string): ScenarioGuideContent | undefined {
  return SCENARIO_CONTENT[slug];
}
