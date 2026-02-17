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
      { label: "Compare All Brokers", href: "/compare" },
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
      { label: "Compare All Brokers", href: "/compare" },
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
};

export function getScenarioContent(slug: string): ScenarioGuideContent | undefined {
  return SCENARIO_CONTENT[slug];
}
