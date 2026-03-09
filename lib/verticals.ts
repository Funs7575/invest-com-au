import type { PlatformType } from "./types";
import { CURRENT_YEAR, CURRENT_MONTH_YEAR, UPDATED_LABEL, FEES_VERIFIED_LABEL } from "./seo";
import { CRYPTO_WARNING, CFD_WARNING, SUPER_WARNING_SHORT } from "./compliance";

export interface VerticalConfig {
  slug: string;
  platformTypes: PlatformType[];
  title: string;
  h1: string;
  metaDescription: string;
  heroHeadline: string;
  heroSubtext: string;
  color: { bg: string; border: string; text: string; accent: string; gradient: string };
  stats: { label: string; value: string }[];
  subcategories: { label: string; href: string; description: string }[];
  tools: { label: string; href: string; icon: string }[];
  sections: { heading: string; body: string }[];
  faqs: { question: string; answer: string }[];
  disclaimer?: string;
}

const yr = CURRENT_YEAR;
const upd = UPDATED_LABEL;

const VERTICALS: VerticalConfig[] = [
  /* ─── 1. Share Trading ─── */
  {
    slug: "share-trading",
    platformTypes: ["share_broker"],
    title: `Best Share Trading Platforms in Australia (${yr}) — Compare Fees`,
    h1: "Best Share Trading Platforms in Australia",
    metaDescription: `Compare Australia's best share trading platforms for ${yr}. ASX brokerage fees, US share access, CHESS sponsorship, and platform features — all verified monthly.`,
    heroHeadline: "Find Australia's Best Share Trading Platform",
    heroSubtext: `Compare ASX brokerage fees, US share access, CHESS sponsorship, and platform features across ${yr}'s top brokers. Real fees, verified monthly.`,
    color: {
      bg: "bg-amber-50",
      border: "border-amber-200",
      text: "text-amber-700",
      accent: "bg-amber-600",
      gradient: "from-amber-50 to-white",
    },
    stats: [
      { label: "Platforms Compared", value: "20+" },
      { label: "Lowest ASX Brokerage", value: "$0" },
      { label: "CHESS-Sponsored", value: "12+" },
      { label: "Fees Verified", value: FEES_VERIFIED_LABEL },
    ],
    subcategories: [
      { label: "Best for Beginners", href: "/best/beginners", description: "Low-cost platforms with simple interfaces for new investors" },
      { label: "Best for US Shares", href: "/best/us-shares", description: "Top platforms for buying US stocks from Australia" },
      { label: "Lowest Fees", href: "/best/low-fees", description: "The cheapest ASX brokerage and lowest overall costs" },
      { label: "CHESS-Sponsored", href: "/best/chess-sponsored", description: "Brokers that hold shares in your name on the ASX" },
      { label: "Day Trading", href: "/best/day-trading", description: "Platforms built for active and frequent traders" },
      { label: "ETF Investing", href: "/best/etf-investing", description: "Low-fee platforms ideal for passive ETF portfolios" },
      { label: "Dividend Investing", href: "/best/dividend-investing", description: "Platforms with DRP support and income-focused tools" },
      { label: "SMSF", href: "/best/smsf", description: "Brokers with SMSF-compatible accounts and reporting" },
      { label: "Mobile App", href: "/best/mobile-app", description: "Top-rated mobile trading apps for on-the-go investing" },
      { label: "Fractional Shares", href: "/best/fractional-shares", description: "Platforms that let you buy fractions of expensive stocks" },
    ],
    tools: [
      { label: "Compare Platforms", href: "/compare", icon: "bar-chart" },
      { label: "Find Your Match", href: "/quiz", icon: "target" },
      { label: "Fee Impact Calculator", href: "/fee-impact", icon: "calculator" },
      { label: "Savings Calculator", href: "/savings-calculator", icon: "piggy-bank" },
      { label: "Switching Calculator", href: "/switching-calculator", icon: "refresh-cw" },
    ],
    sections: [
      {
        heading: "How Share Trading Works in Australia",
        body: "Share trading in Australia primarily takes place on the ASX (Australian Securities Exchange). When you buy shares through an Australian broker, your holdings are either CHESS-sponsored (held in your name on the ASX subregister via a unique HIN — Holder Identification Number) or held in a custodial/nominee model. CHESS sponsorship gives you direct legal ownership, meaning your shares are protected even if your broker goes under. Most Australian-based brokers offer CHESS sponsorship, while some international platforms use custodial models with lower fees.",
      },
      {
        heading: "Understanding Brokerage Fees in Australia",
        body: `Brokerage is the fee you pay each time you buy or sell shares. In ${yr}, ASX brokerage ranges from $0 (platforms like Webull and moomoo offer zero-commission ASX trades) up to $29.95 at traditional full-service brokers. For US share trading, fees vary even more — from $0 per trade to fixed fees of $5–$10, plus FX conversion charges ranging from 0% to 0.7%. These fees compound significantly over time: an investor making 24 trades per year could save $500+ annually by switching from a $20-per-trade broker to a $0 platform.`,
      },
      {
        heading: "CHESS Sponsorship vs Custodial Models",
        body: "CHESS sponsorship is unique to the Australian market. With a CHESS-sponsored broker, each investor receives a Holder Identification Number (HIN) and their shares are registered directly in their name on the ASX subregister. This means if the broker fails, your shares are still yours. Custodial brokers, by contrast, hold shares in the broker's name on your behalf — often at lower cost. Neither model is inherently better; it depends on your priorities around cost, ownership, and the broker's regulatory standing.",
      },
      {
        heading: `What to Look for in a Trading Platform in ${yr}`,
        body: `Beyond fees, consider the platform's range of markets (ASX, US, UK, Asia), research tools, mobile app quality, customer support hours, and account types (individual, joint, SMSF, company, trust). Tax reporting features — such as pre-filled CGT reports and integration with accounting software — can save hours at tax time. Also check for features like auto-invest, dividend reinvestment plans (DRPs), and conditional order types. Our comparison table above lets you filter by all these factors.`,
      },
    ],
    faqs: [
      {
        question: "What is the cheapest share trading platform in Australia?",
        answer: `As of ${CURRENT_MONTH_YEAR}, several platforms offer $0 brokerage on ASX trades, including Webull and moomoo. However, 'cheapest' depends on your trading pattern — if you also trade US shares, FX conversion fees matter more than brokerage. Use our fee calculator to compare total costs based on your actual trading frequency.`,
      },
      {
        question: "What does CHESS-sponsored mean?",
        answer: "CHESS (Clearing House Electronic Subregister System) is operated by the ASX. When your broker is CHESS-sponsored, your shares are registered in your name with a unique HIN (Holder Identification Number). This means you have direct legal ownership. If the broker goes bust, your shares are still yours and can be transferred to another CHESS-sponsored broker.",
      },
      {
        question: "Can I buy US shares from Australia?",
        answer: "Yes. Most Australian brokers now offer access to US markets (NYSE, NASDAQ). You'll need to complete a W-8BEN form for US tax purposes, which reduces withholding tax on US dividends from 30% to 15%. Compare US trading fees and FX conversion rates — these vary significantly between platforms.",
      },
      {
        question: "How much money do I need to start share trading?",
        answer: "There is no legal minimum to open a brokerage account in Australia. Some platforms have no minimum deposit, while others require $500–$2,000. If you're investing in ASX shares directly, the minimum marketable parcel is $500 worth of shares. Platforms offering fractional shares let you start with as little as $1.",
      },
      {
        question: "Do I pay tax on share trading profits in Australia?",
        answer: "Yes. Profits from selling shares are subject to Capital Gains Tax (CGT). If you hold shares for more than 12 months, you receive a 50% CGT discount. Dividends are taxable income but may include franking credits (tax already paid by the company). We recommend keeping good records and consulting a tax agent for investment-related tax questions.",
      },
      {
        question: "What happens to my shares if my broker goes bankrupt?",
        answer: "If your broker is CHESS-sponsored, your shares are held in your name on the ASX subregister and are not part of the broker's assets — you can transfer them to another broker. For custodial brokers, protections vary. All ASIC-regulated brokers must keep client money in segregated trust accounts, but checking the broker's regulatory status and financial health is prudent.",
      },
    ],
  },

  /* ─── 2. Crypto ─── */
  {
    slug: "crypto",
    platformTypes: ["crypto_exchange"],
    title: `Best Crypto Exchanges in Australia (${yr}) — Compare Fees & Security`,
    h1: "Best Cryptocurrency Exchanges in Australia",
    metaDescription: `Compare Australia's best crypto exchanges for ${yr}. AUSTRAC-registered, AUD deposit methods, fees, supported coins, and security — reviewed and updated ${CURRENT_MONTH_YEAR}.`,
    heroHeadline: "Compare Australia's Crypto Exchanges",
    heroSubtext: `Compare AUSTRAC-registered crypto exchanges. Fees, supported coins, security features, and AUD deposit methods reviewed and updated ${CURRENT_MONTH_YEAR}.`,
    color: {
      bg: "bg-orange-50",
      border: "border-orange-200",
      text: "text-orange-700",
      accent: "bg-orange-600",
      gradient: "from-orange-50 to-white",
    },
    stats: [
      { label: "Exchanges Compared", value: "15+" },
      { label: "All AUSTRAC-Registered", value: "Yes" },
      { label: "Lowest Trading Fee", value: "0%" },
      { label: "Rates Updated", value: CURRENT_MONTH_YEAR },
    ],
    subcategories: [
      { label: "Best Crypto Exchanges", href: "/best/crypto", description: "Top-rated cryptocurrency exchanges for Australian investors" },
      { label: "Best Bitcoin Exchange", href: "/best/bitcoin-exchange", description: "The best platforms specifically for buying and selling Bitcoin" },
      { label: "Cheapest Crypto Exchange", href: "/best/cheapest-crypto-exchange", description: "Lowest-fee crypto exchanges with AUD deposit support" },
    ],
    tools: [
      { label: "Compare Crypto Platforms", href: "/compare?category=crypto", icon: "bar-chart" },
      { label: "Find Your Match", href: "/quiz", icon: "target" },
    ],
    sections: [
      {
        heading: "Crypto Regulation in Australia",
        body: `In Australia, cryptocurrency exchanges must register with AUSTRAC (Australian Transaction Reports and Analysis Centre) as digital currency exchange (DCE) providers. This ensures they comply with anti-money laundering (AML) and counter-terrorism financing (CTF) regulations. However, ASIC does not regulate cryptocurrencies as financial products in most cases, and there is no government compensation scheme for crypto losses. Always verify an exchange's AUSTRAC registration before depositing funds.`,
      },
      {
        heading: "Understanding Crypto Exchange Fees",
        body: `Crypto exchange fees in Australia typically include: trading fees (maker/taker spreads, usually 0%–1%), deposit fees (bank transfer is usually free, card payments 1%–3%), withdrawal fees (varies by coin and network), and spread markup (the hidden difference between buy and sell prices). Some exchanges advertise "zero fees" but make money on wider spreads. We compare the total effective cost for a standard buy-and-hold scenario in our comparison table.`,
      },
      {
        heading: "Security and Self-Custody",
        body: "Exchange security is paramount in crypto. Look for platforms with two-factor authentication (2FA), cold storage for the majority of funds, proof-of-reserves audits, and insurance coverage. For long-term holdings, consider transferring crypto to a personal hardware wallet (self-custody), which removes exchange counterparty risk entirely. Australian exchanges like CoinSpot and Swyftx have strong security track records.",
      },
      {
        heading: `How to Buy Cryptocurrency in Australia (${yr})`,
        body: `To buy crypto in Australia: 1) Choose an AUSTRAC-registered exchange, 2) Verify your identity (KYC — usually takes minutes), 3) Deposit AUD via bank transfer, PayID, or card, 4) Place your first buy order. Most exchanges support instant buy for beginners and advanced order types for experienced traders. Tax-wise, crypto is treated as a CGT asset — keep records of every transaction for your tax return.`,
      },
    ],
    faqs: [
      {
        question: "Is cryptocurrency legal in Australia?",
        answer: "Yes, buying, selling, and holding cryptocurrency is legal in Australia. Exchanges must be registered with AUSTRAC. Crypto is treated as property for tax purposes — you pay Capital Gains Tax on profits when you sell, swap, or spend crypto.",
      },
      {
        question: "What is the safest crypto exchange in Australia?",
        answer: `Safety depends on the exchange's security practices, regulatory compliance, and track record. In ${yr}, look for AUSTRAC registration, cold storage of funds, 2FA, and proof-of-reserves. Our comparison table rates each exchange on these factors.`,
      },
      {
        question: "How is cryptocurrency taxed in Australia?",
        answer: "The ATO treats crypto as a CGT asset. You pay tax when you dispose of crypto (sell, swap, gift, or use it to buy goods). If you hold for more than 12 months, you get the 50% CGT discount. You must report all crypto transactions on your tax return — even small ones.",
      },
      {
        question: "Can I buy Bitcoin with AUD?",
        answer: "Yes. All Australian crypto exchanges accept AUD deposits via bank transfer (often free) or PayID (instant). Some also accept credit/debit cards, though these usually incur a 1%–3% surcharge. You can buy fractional amounts of Bitcoin — you don't need to buy a whole coin.",
      },
      {
        question: "What happens if an Australian crypto exchange goes bust?",
        answer: "Unlike banks, crypto exchanges are not covered by the Australian Government Guarantee Scheme. If an exchange fails, you may lose your funds. This is why security, proof-of-reserves, and self-custody (moving crypto to your own wallet) are important considerations.",
      },
      {
        question: "How do I choose between a crypto exchange and a crypto broker?",
        answer: "Exchanges let you trade directly with other users (lower fees, more coin choices, order book trading). Brokers act as intermediaries and offer simpler interfaces but wider spreads. For beginners, brokers are easier. For cost-conscious or active traders, exchanges are usually better value.",
      },
    ],
    disclaimer: CRYPTO_WARNING,
  },

  /* ─── 3. Savings ─── */
  {
    slug: "savings",
    platformTypes: ["savings_account", "term_deposit"],
    title: `Best Savings Accounts & Term Deposits in Australia (${yr})`,
    h1: "Best Savings Accounts & Term Deposits in Australia",
    metaDescription: `Compare the best high-interest savings accounts and term deposit rates in Australia for ${yr}. Rates verified and updated ${CURRENT_MONTH_YEAR}.`,
    heroHeadline: "Find the Best Savings Rate in Australia",
    heroSubtext: `Compare high-interest savings accounts and term deposit rates from Australia's banks and neobanks. Rates verified and updated ${CURRENT_MONTH_YEAR}.`,
    color: {
      bg: "bg-sky-50",
      border: "border-sky-200",
      text: "text-sky-700",
      accent: "bg-sky-600",
      gradient: "from-sky-50 to-white",
    },
    stats: [
      { label: "Accounts Compared", value: "25+" },
      { label: "Highest Savings Rate", value: "5.50% p.a." },
      { label: "All Gov. Guaranteed", value: "$250k" },
      { label: "Rates Updated", value: CURRENT_MONTH_YEAR },
    ],
    subcategories: [
      { label: "Savings Accounts", href: "/best/savings-accounts", description: "Top everyday and bonus savings accounts ranked by rate" },
      { label: "High-Interest Savings", href: "/best/high-interest-savings", description: "The highest ongoing and bonus interest rates available" },
      { label: "Term Deposit Rates", href: "/best/best-term-deposit-rates", description: "Compare term deposit rates across all major banks" },
      { label: "Online Savings", href: "/best/online-savings-account", description: "Digital-only accounts with the best rates and no branch fees" },
      { label: "Kids' Savings", href: "/best/kids-savings-account", description: "High-rate accounts designed for children and young savers" },
      { label: "Term Deposits", href: "/best/term-deposits", description: "Lock in a rate for 3–60 months with government-guaranteed safety" },
    ],
    tools: [
      { label: "Savings Calculator", href: "/savings-calculator", icon: "calculator" },
      { label: "Compare Savings", href: "/compare?filter=savings", icon: "bar-chart" },
    ],
    sections: [
      {
        heading: "How Savings Accounts Work in Australia",
        body: `Australian savings accounts pay variable interest on your deposited funds. Most high-interest accounts come with conditions — typically you need to deposit a minimum amount each month and make no withdrawals to earn the advertised "bonus" rate. The base rate (what you earn if you miss a condition) is usually much lower. As of ${CURRENT_MONTH_YEAR}, the best conditional rates sit around 5.50% p.a., while the best unconditional rates are around 4.75% p.a.`,
      },
      {
        heading: "Understanding the Government Deposit Guarantee",
        body: "The Australian Government Guarantee Scheme (Financial Claims Scheme) protects deposits up to $250,000 per account holder per ADI (Authorised Deposit-taking Institution). This covers savings accounts and term deposits at banks, building societies, and credit unions. It does NOT cover crypto, shares, or funds held with non-ADI institutions. This guarantee is one of the strongest reasons savers choose bank deposits over alternatives.",
      },
      {
        heading: "Savings Accounts vs Term Deposits",
        body: "Savings accounts offer flexibility — you can withdraw anytime — but rates can change at any time. Term deposits lock your money for a fixed period (typically 3 to 60 months) at a guaranteed rate. If you break a term deposit early, you'll usually lose some or all of the interest. Choose savings if you need access; choose term deposits if you want rate certainty and won't need the money.",
      },
      {
        heading: `Tips for Maximising Your Savings Rate in ${yr}`,
        body: "To get the best rate: 1) Meet all bonus conditions every month (set up automatic deposits), 2) Consider splitting funds across banks if you exceed $250k (for full government guarantee coverage), 3) Review your rate quarterly — banks quietly cut rates after promotional periods, 4) Compare neobanks (online-only banks often offer higher rates due to lower overheads), 5) Use our rate comparison table above and set a rate alert to know when better deals appear.",
      },
    ],
    faqs: [
      {
        question: "What is the best savings account in Australia right now?",
        answer: `The best savings account depends on whether you can meet monthly deposit conditions. As of ${CURRENT_MONTH_YEAR}, top conditional rates are around 5.50% p.a., while the best no-conditions rates sit around 4.75% p.a. Our comparison table is updated monthly to reflect current rates.`,
      },
      {
        question: "Are savings accounts safe in Australia?",
        answer: "Yes. Deposits in Australian banks, building societies, and credit unions are protected by the Government Guarantee Scheme up to $250,000 per person per institution. This makes savings accounts among the safest places to hold cash in Australia.",
      },
      {
        question: "How much interest will I earn on $10,000 in savings?",
        answer: "At 5.50% p.a., $10,000 earns approximately $550 in interest over 12 months (before tax). At the average savings rate of around 3.5%, you'd earn about $350. Use our savings calculator to estimate your returns based on your exact balance and the rate you're comparing.",
      },
      {
        question: "Do I pay tax on savings account interest?",
        answer: "Yes. Interest earned on savings accounts and term deposits is taxable income. Your bank reports it to the ATO. If you provide your TFN to the bank, tax is not withheld at source — instead, you declare the interest on your tax return and pay tax at your marginal rate.",
      },
      {
        question: "What is the best term deposit rate in Australia?",
        answer: `Term deposit rates change frequently. As of ${CURRENT_MONTH_YEAR}, the best 12-month term deposit rates are around 4.80%–5.00% p.a. Shorter terms (3–6 months) sometimes offer promotional rates that are higher. Check our comparison table for the latest rates from all major providers.`,
      },
      {
        question: "Should I choose a savings account or a term deposit?",
        answer: "Choose a savings account if you need flexible access to your money or if variable rates are currently higher than term deposit rates. Choose a term deposit if you want a guaranteed rate and won't need the money for the lock-up period. Many people use both — savings for an emergency fund, term deposits for money they won't need short-term.",
      },
    ],
  },

  /* ─── 4. Super ─── */
  {
    slug: "super",
    platformTypes: ["super_fund"],
    title: `Best Super Funds in Australia (${yr}) — Compare Fees & Returns`,
    h1: "Best Super Funds in Australia",
    metaDescription: `Compare Australia's best super funds for ${yr}. Fees, investment options, insurance, and long-term performance — independent reviews updated ${CURRENT_MONTH_YEAR}.`,
    heroHeadline: "Compare Australia's Best Super Funds",
    heroSubtext: `Compare super fund fees, investment options, insurance, and long-term performance. Independent reviews updated ${CURRENT_MONTH_YEAR}.`,
    color: {
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      text: "text-emerald-700",
      accent: "bg-emerald-600",
      gradient: "from-emerald-50 to-white",
    },
    stats: [
      { label: "Funds Compared", value: "15+" },
      { label: "Lowest Admin Fee", value: "$0 p.a." },
      { label: "Avg 10yr Return", value: "8–9% p.a." },
      { label: "Reviews Updated", value: CURRENT_MONTH_YEAR },
    ],
    subcategories: [
      { label: "Best Super Funds", href: "/best/super-funds", description: "Top-rated super funds across fees, returns, and features" },
      { label: "Best Performing Super", href: "/best/best-performing-super", description: "Highest long-term returns across balanced and growth options" },
      { label: "Cheapest Super Funds", href: "/best/cheapest-super", description: "Lowest-fee super funds for maximising your retirement balance" },
      { label: "Ethical Super", href: "/best/ethical-super", description: "Super funds with strong ESG, ethical, and climate-conscious options" },
      { label: "Super for Young People", href: "/best/super-for-young-people", description: "Best super funds for members under 30 starting their careers" },
      { label: "SMSF", href: "/best/smsf", description: "Self-managed super fund platforms with low admin costs and flexibility" },
    ],
    tools: [
      { label: "Compare Super Funds", href: "/compare?category=super", icon: "bar-chart" },
      { label: "Find Your Match", href: "/quiz", icon: "target" },
      { label: "Fee Impact Calculator", href: "/fee-impact", icon: "calculator" },
    ],
    sections: [
      {
        heading: "How Super Works in Australia",
        body: "Superannuation is Australia's compulsory retirement savings system. Your employer contributes a percentage of your salary (11.5% in 2026) into your super fund, where it's invested until you reach preservation age (currently 60). You can choose your own super fund, investment option, and insurance cover. The money in super is taxed at a concessional rate of 15%, making it one of the most tax-effective ways to build wealth for retirement.",
      },
      {
        heading: "Comparing Super Fund Fees",
        body: `Super fund fees have a massive impact on your retirement balance. A difference of just 0.5% p.a. in fees can cost tens of thousands of dollars over a 30-year career. Fees to compare include: administration fees (fixed dollar or percentage), investment fees (built into returns), insurance premiums (deducted from your balance), and buy-sell spreads. Some funds charge as little as 0.02% p.a. in investment fees for index options, while actively managed options may charge 0.5%–1.0%.`,
      },
      {
        heading: "Investment Returns and Performance",
        body: `Past performance is not a reliable indicator of future returns — but it's still a useful data point. Over 10 years, the best-performing balanced super funds have returned 8–9% p.a. on average. However, returns vary significantly by investment option: growth options (more shares) tend to outperform over long periods but are more volatile. The ATO's YourSuper comparison tool at ato.gov.au provides standardised performance comparisons across all APRA-regulated funds.`,
      },
      {
        heading: "Insurance in Super — What You Need to Know",
        body: "Most super funds provide default insurance cover for death, total and permanent disability (TPD), and income protection. This insurance is paid from your super balance, not your bank account. Before switching super funds, check what insurance you currently hold — switching may cancel existing cover, and you may need to pass health assessments to get new cover. If you have multiple super accounts, you may be paying for duplicate insurance. Consider consolidating, but check insurance implications first.",
      },
    ],
    faqs: [
      {
        question: "How do I choose the best super fund?",
        answer: `Consider fees (the biggest controllable factor), investment options (does the fund offer the risk level you want?), insurance cover, and long-term performance. Use the ATO's YourSuper comparison tool and our independent reviews to compare. Don't just chase last year's top performer — consistency matters more.`,
      },
      {
        question: "Can I switch super funds?",
        answer: "Yes, you can switch super funds at any time using the myGov website linked to your ATO account. The process usually takes 3–5 business days. Before switching, check: 1) Will you lose insurance cover? 2) Are there exit fees on your old fund? 3) Does your new fund accept employer contributions?",
      },
      {
        question: "How much super should I have at my age?",
        answer: "As a rough guide: by 30, aim for $60–80k; by 40, $150–200k; by 50, $300–400k. But these are averages — your target depends on your desired retirement lifestyle, other assets, and retirement age. The ASFA Retirement Standard estimates couples need $690k for a comfortable retirement.",
      },
      {
        question: "What is an SMSF and should I get one?",
        answer: "A Self-Managed Super Fund (SMSF) gives you full control over your investments, including direct shares, property, and crypto. However, it comes with significant compliance obligations and costs ($2,000–$5,000 per year in administration and audit fees). Generally, SMSFs are only cost-effective with balances above $200,000–$300,000.",
      },
      {
        question: "Is my super fund safe?",
        answer: "APRA-regulated super funds are subject to strict prudential standards. Your super is held in trust — it's your money, not the fund's. However, investment returns are not guaranteed, and your balance can go up or down. The government does not guarantee super fund returns (unlike bank deposits under $250k).",
      },
      {
        question: "How are super fund fees calculated?",
        answer: "Super fees typically include: 1) Administration fee (fixed $ or % of balance), 2) Investment fee (% of balance, varies by option), 3) Insurance premiums (deducted from balance). Total fees for a $50,000 balance in a low-cost index fund typically range from $100–$300 per year. Use our fee calculator to compare exact costs.",
      },
    ],
    disclaimer: SUPER_WARNING_SHORT,
  },

  /* ─── 5. CFD & Forex ─── */
  {
    slug: "cfd",
    platformTypes: ["cfd_forex"],
    title: `Best CFD & Forex Brokers in Australia (${yr}) — Compare Spreads`,
    h1: "Best CFD & Forex Brokers in Australia",
    metaDescription: `Compare ASIC-regulated CFD and forex brokers in Australia for ${yr}. Spreads, leverage, platforms, and risk tools — reviewed and updated ${CURRENT_MONTH_YEAR}.`,
    heroHeadline: "Compare Australia's CFD & Forex Brokers",
    heroSubtext: `Compare ASIC-regulated CFD and forex brokers. Spreads, leverage, platforms, and risk tools reviewed. Updated ${CURRENT_MONTH_YEAR}.`,
    color: {
      bg: "bg-rose-50",
      border: "border-rose-200",
      text: "text-rose-700",
      accent: "bg-rose-600",
      gradient: "from-rose-50 to-white",
    },
    stats: [
      { label: "Brokers Compared", value: "12+" },
      { label: "All ASIC-Regulated", value: "Yes" },
      { label: "Lowest Spread (EUR/USD)", value: "0.0 pips" },
      { label: "Reviews Updated", value: CURRENT_MONTH_YEAR },
    ],
    subcategories: [
      { label: "CFD & Forex Brokers", href: "/best/cfd-forex", description: "Top-rated ASIC-regulated CFD and forex trading platforms" },
      { label: "Options Trading", href: "/best/options-trading", description: "Platforms offering ASX and US options trading for Australians" },
    ],
    tools: [
      { label: "Compare CFD Brokers", href: "/compare?category=cfd", icon: "bar-chart" },
      { label: "Find Your Match", href: "/quiz", icon: "target" },
    ],
    sections: [
      {
        heading: "CFD and Forex Trading in Australia",
        body: "Contracts for Difference (CFDs) let you speculate on price movements of shares, indices, forex, commodities, and crypto without owning the underlying asset. In Australia, CFD providers must hold an Australian Financial Services Licence (AFSL) and are regulated by ASIC. Since 2021, ASIC has imposed strict product intervention orders on CFDs, including leverage limits (30:1 for major forex pairs, 20:1 for minor pairs, 10:1 for commodities, 5:1 for shares, 2:1 for crypto) and mandatory negative balance protection.",
      },
      {
        heading: "Understanding CFD Risks",
        body: "CFD trading carries significant risk due to leverage — you can lose more than your initial deposit. ASIC data shows that between 62% and 81% of retail CFD accounts lose money. Before trading CFDs, ensure you understand: how leverage amplifies both gains and losses, overnight financing costs (swap rates), the impact of spreads on breakeven, and the importance of stop-loss orders and risk management. CFDs are not suitable for all investors.",
      },
      {
        heading: "Comparing CFD Broker Spreads and Fees",
        body: `CFD brokers charge primarily through spreads (the difference between buy and sell prices) and/or commissions. Some brokers offer "raw spread" accounts with near-zero spreads but charge a commission per trade ($3–$7 per lot). Others offer "standard" accounts with wider spreads but no commission. Total trading cost = spread + commission + overnight financing. For active traders, even small differences in spread can add up to thousands per year.`,
      },
      {
        heading: `Choosing an ASIC-Regulated CFD Broker in ${yr}`,
        body: `When comparing CFD brokers, prioritise: 1) ASIC regulation and AFSL number (verify on ASIC Connect), 2) Negative balance protection (mandatory for ASIC-regulated brokers), 3) Segregated client funds, 4) Platform choice (MT4, MT5, cTrader, or proprietary), 5) Available markets and instruments, 6) Demo account availability (essential for testing strategies). Avoid unregulated offshore brokers — ASIC cannot protect you if something goes wrong.`,
      },
    ],
    faqs: [
      {
        question: "What is a CFD?",
        answer: "A CFD (Contract for Difference) is a derivative product that lets you speculate on price movements without owning the underlying asset. You profit if the price moves in your predicted direction and lose if it moves against you. Leverage means small price movements can result in large gains or losses relative to your deposit.",
      },
      {
        question: "Is CFD trading legal in Australia?",
        answer: "Yes. CFD trading is legal and regulated in Australia. Providers must hold an AFSL from ASIC. Since 2021, ASIC has imposed product intervention orders including leverage caps and mandatory negative balance protection to protect retail investors.",
      },
      {
        question: "How much do most people lose trading CFDs?",
        answer: "According to broker disclosures required by ASIC, between 62% and 81% of retail CFD accounts lose money. The exact percentage varies by broker and is updated quarterly. This statistic underscores the importance of education, risk management, and only trading with money you can afford to lose.",
      },
      {
        question: "What leverage is available in Australia?",
        answer: "ASIC limits leverage for retail clients: 30:1 for major forex pairs, 20:1 for minor forex and gold, 10:1 for major indices and other commodities, 5:1 for shares and other indices, and 2:1 for crypto CFDs. Professional clients may access higher leverage but lose certain retail protections.",
      },
      {
        question: "What is the best forex trading platform in Australia?",
        answer: `The best forex platform depends on your needs. MetaTrader 4 (MT4) remains the most popular for its charting and Expert Advisor support. MT5 offers more timeframes and order types. cTrader is preferred by some for its modern interface. Our comparison table above rates each broker's platform offering.`,
      },
      {
        question: "How are CFD profits taxed in Australia?",
        answer: "CFD profits are generally taxed as assessable income (not CGT) if you are considered to be 'carrying on a business' of trading. Casual or occasional traders may be subject to CGT instead. The ATO looks at factors like frequency, volume, and purpose of trading. Consult a tax professional for your specific situation.",
      },
    ],
    disclaimer: CFD_WARNING,
  },
];

/** Look up a vertical config by its URL slug */
export function getVerticalBySlug(slug: string): VerticalConfig | undefined {
  return VERTICALS.find((v) => v.slug === slug);
}

/** Return all vertical slugs (used for static param generation) */
export function getAllVerticalSlugs(): string[] {
  return VERTICALS.map((v) => v.slug);
}

export { VERTICALS };
