import type { Broker } from "./types";

export interface BestBrokerCategory {
  slug: string;
  title: string;
  h1: string;
  metaDescription: string;
  intro: string;
  /** Filter function applied to active brokers */
  filter: (b: Broker) => boolean;
  /** Sort function — first result is "top pick" */
  sort: (a: Broker, b: Broker) => number;
  /** What makes a broker qualify for this category */
  criteria: string[];
  /** Section headings and bodies for the editorial content */
  sections: { heading: string; body: string }[];
  /** Related internal links */
  relatedLinks: { label: string; href: string }[];
  /** FAQ pairs for structured data */
  faqs: { question: string; answer: string }[];
}

const categories: BestBrokerCategory[] = [
  {
    slug: "beginners",
    title: "Best Brokers for Beginners in Australia (2026)",
    h1: "Best Brokers for Beginners in Australia",
    metaDescription:
      "Beginner-friendly Australian brokers compared. Low fees, simple platforms, and strong safety features. Updated February 2026.",
    intro:
      "Starting your investing journey? The right broker makes all the difference. We've filtered Australia's trading platforms to find those that combine low fees, intuitive platforms, and strong safety features like CHESS sponsorship. Here are our top picks for 2026.",
    filter: (b) => !b.is_crypto && (b.asx_fee_value ?? 999) <= 10 && (b.rating ?? 0) >= 3.5,
    sort: (a, b) => (b.rating ?? 0) - (a.rating ?? 0),
    criteria: [
      "ASX brokerage under $10 per trade",
      "Rating of 3.5/5 or higher in our methodology",
      "User-friendly platform with mobile app",
      "Not a crypto-only exchange",
    ],
    sections: [
      {
        heading: "What Should Beginners Look For in a Broker?",
        body: "The three things that matter most for new investors are low fees (so small trades aren't eaten by brokerage), a simple platform (so you're not overwhelmed by pro-level tools), and safety (CHESS sponsorship means shares are held in your name, not the broker's). You don't need margin lending, options, or advanced charting when you're starting out.",
      },
      {
        heading: "How Much Does It Cost to Start Investing?",
        body: "Several Australian brokers now offer $0 brokerage on ASX trades, meaning you can start with as little as $50-100 without fees eating into your returns. Even brokers that charge $3-10 per trade are reasonable for beginners making monthly investments. The key is avoiding brokers that charge $20+ per trade, which makes small regular investing uneconomical.",
      },
      {
        heading: "Should Beginners Choose a CHESS-Sponsored Broker?",
        body: "CHESS sponsorship means your shares are registered directly with ASX in your name, rather than held in the broker's custodial account. If the broker goes bankrupt, CHESS-sponsored shares are still yours. For beginners investing their savings, this extra layer of protection is worth prioritising. Our top picks include several CHESS-sponsored options.",
      },
    ],
    relatedLinks: [
      { label: "Compare All Brokers", href: "/compare" },
      { label: "Take the Broker Quiz", href: "/quiz" },
      { label: "How We Verify Fees", href: "/how-we-verify" },
      { label: "Best for US Shares", href: "/best/us-shares" },
    ],
    faqs: [
      {
        question: "What is the best broker for beginners in Australia?",
        answer:
          "The best beginner broker depends on your priorities. For the lowest fees, look at brokers offering $0 ASX brokerage. For maximum safety, choose a CHESS-sponsored broker. Our top overall pick balances both with a high rating from our editorial team.",
      },
      {
        question: "How much money do I need to start investing in Australia?",
        answer:
          "You can start investing with as little as $50 using brokers with $0 brokerage. Most brokers have no minimum deposit requirement, though some suggest starting with $500-1,000 to make the brokerage fees worthwhile if they charge per trade.",
      },
      {
        question: "Is CommSec good for beginners?",
        answer:
          "CommSec is a well-known, CHESS-sponsored broker backed by Commonwealth Bank, but its $29.95 per trade brokerage is expensive for beginners making small, regular investments. Newer brokers offer $0-$5 trades with similar safety features.",
      },
    ],
  },
  {
    slug: "us-shares",
    title: "Best Brokers for US Shares in Australia (2026)",
    h1: "Best Brokers for Buying US Shares from Australia",
    metaDescription:
      "Compare Australian brokers for US share trading. $0 US brokerage, low FX fees, and fractional shares. Updated February 2026.",
    intro:
      "Want to buy Apple, Tesla, or S&P 500 ETFs from Australia? Not all brokers make it easy or affordable. We've compared FX conversion fees, US brokerage costs, and fractional share support to find the best options for Australian investors trading US markets.",
    filter: (b) => !b.is_crypto && b.us_fee_value != null && b.us_fee_value <= 5,
    sort: (a, b) => {
      const totalA = (a.us_fee_value ?? 999) + (a.fx_rate ?? 999);
      const totalB = (b.us_fee_value ?? 999) + (b.fx_rate ?? 999);
      return totalA - totalB;
    },
    criteria: [
      "US share brokerage of $5 or less per trade",
      "FX conversion rate clearly disclosed",
      "Access to major US exchanges (NYSE, NASDAQ)",
      "Not a crypto-only exchange",
    ],
    sections: [
      {
        heading: "The Hidden Cost: FX Conversion Fees",
        body: "When you buy US shares from Australia, your AUD is converted to USD. This currency conversion fee (FX rate) is often the biggest cost — more than the brokerage itself. A broker advertising '$0 US brokerage' might charge 0.70% on FX, meaning a $10,000 trade costs you $70 in hidden currency fees. The best brokers charge under 0.30% FX, saving you hundreds over time.",
      },
      {
        heading: "Fractional Shares: Why They Matter",
        body: "US stocks like Amazon trade above $200 per share. Fractional shares let you invest $50 into a $200 stock by owning 0.25 of a share. This is particularly useful for beginners and DCA (dollar-cost averaging) investors who want to invest fixed amounts regularly without needing to buy whole shares.",
      },
      {
        heading: "Total Cost Comparison: $5,000 US Trade",
        body: "For a typical $5,000 US share purchase, the total cost varies dramatically. A broker with $0 brokerage and 0.70% FX costs you $35. A broker with $1 brokerage and 0.25% FX costs you only $13.50. Always calculate the total cost (brokerage + FX) rather than comparing just one number.",
      },
    ],
    relatedLinks: [
      { label: "FX Fee Calculator", href: "/calculators" },
      { label: "Compare All Brokers", href: "/compare" },
      { label: "Best for Low Fees", href: "/best/low-fees" },
      { label: "Best for Beginners", href: "/best/beginners" },
    ],
    faqs: [
      {
        question: "Can I buy US shares from Australia?",
        answer:
          "Yes. Most Australian online brokers offer access to US markets (NYSE, NASDAQ). You'll need an account with a broker that supports international trading. Your AUD is converted to USD either automatically or via a multi-currency account.",
      },
      {
        question: "What is the cheapest way to buy US shares from Australia?",
        answer:
          "The cheapest approach combines $0 US brokerage with the lowest FX conversion rate. Look for brokers charging under 0.30% on currency conversion. For a $5,000 trade, this saves $20-35 compared to brokers charging 0.70% FX.",
      },
      {
        question: "Do I pay tax on US shares in Australia?",
        answer:
          "Yes. As an Australian tax resident, you pay capital gains tax on profits from US shares. You may also have US withholding tax (15% with W-8BEN form) deducted from US dividends, which can be claimed as a foreign income tax offset on your Australian tax return.",
      },
    ],
  },
  {
    slug: "low-fees",
    title: "Cheapest Online Brokers in Australia (2026)",
    h1: "Cheapest Online Brokers in Australia",
    metaDescription:
      "The lowest-fee share trading platforms in Australia. $0 brokerage on ASX and US trades. Fees verified February 2026.",
    intro:
      "Brokerage fees directly reduce your returns. We've ranked Australia's cheapest trading platforms by total cost — not just headline brokerage, but also FX fees, inactivity charges, and hidden costs. Every fee below is verified against the broker's official pricing page.",
    filter: (b) => !b.is_crypto && (b.asx_fee_value ?? 999) <= 10,
    sort: (a, b) => (a.asx_fee_value ?? 999) - (b.asx_fee_value ?? 999),
    criteria: [
      "ASX brokerage of $10 or less per trade",
      "No hidden platform fees",
      "Fees verified against official pricing page",
      "Not a crypto-only exchange",
    ],
    sections: [
      {
        heading: "Free vs Cheap: What's the Catch?",
        body: "$0 brokerage brokers make money in other ways — typically through FX fees on international trades, interest on uninvested cash, or payment for order flow. This isn't necessarily bad, but it means '$0 brokerage' doesn't always mean '$0 total cost'. Always check the FX rate if you plan to trade international shares.",
      },
      {
        heading: "Does Cheap Mean Unsafe?",
        body: "No. Some of Australia's cheapest brokers are also CHESS-sponsored, meaning your shares are registered in your name with ASX. Low fees reflect modern technology and efficient business models, not corner-cutting on safety. That said, always check whether a broker is regulated by ASIC.",
      },
      {
        heading: "When Higher Fees Are Worth It",
        body: "If you only trade ASX shares a few times per year, the difference between $0 and $10 per trade is negligible ($40-80/year). In that case, prioritise platform quality, research tools, and CHESS sponsorship over saving a few dollars. Fee sensitivity matters most for frequent traders and small regular investors.",
      },
    ],
    relatedLinks: [
      { label: "Compare All Brokers", href: "/compare" },
      { label: "Fee Calculator", href: "/calculators" },
      { label: "Best for Beginners", href: "/best/beginners" },
      { label: "Best for CHESS", href: "/best/chess-sponsored" },
    ],
    faqs: [
      {
        question: "Which Australian broker has the lowest fees?",
        answer:
          "Several Australian brokers now offer $0 brokerage on ASX trades. However, total cost includes FX fees for international trades, so the cheapest broker depends on what you're trading. For ASX-only investors, $0 brokerage brokers are cheapest. For international traders, factor in the FX conversion rate.",
      },
      {
        question: "Are $0 brokerage brokers safe?",
        answer:
          "Yes, as long as they're regulated by ASIC. Some $0 brokerage brokers are also CHESS-sponsored, providing the same share ownership protection as traditional brokers. Check our comparison table for safety details.",
      },
    ],
  },
  {
    slug: "chess-sponsored",
    title: "Best CHESS-Sponsored Brokers in Australia (2026)",
    h1: "Best CHESS-Sponsored Brokers in Australia",
    metaDescription:
      "CHESS-sponsored brokers compared. Your shares held in your name on the ASX register. Safety, fees, and features compared. Updated 2026.",
    intro:
      "CHESS sponsorship means your ASX shares are registered directly in your name on the official ASX register — not held in the broker's custodial account. If the broker goes bust, your shares are still yours. Here are Australia's best CHESS-sponsored brokers ranked by fees, features, and overall value.",
    filter: (b) => !b.is_crypto && b.chess_sponsored,
    sort: (a, b) => (b.rating ?? 0) - (a.rating ?? 0),
    criteria: [
      "CHESS-sponsored (HIN registration with ASX)",
      "ASIC-regulated",
      "Not a crypto-only exchange",
      "Active broker with full trading platform",
    ],
    sections: [
      {
        heading: "What Is CHESS Sponsorship?",
        body: "CHESS (Clearing House Electronic Subregister System) is the ASX's official settlement and registration system. When a broker is 'CHESS-sponsored', your shares are registered under a unique Holder Identification Number (HIN) in your name. This is different from 'custodial' brokers who hold shares in an omnibus account in their own name on your behalf.",
      },
      {
        heading: "CHESS vs Custodial: Does It Really Matter?",
        body: "Yes — especially for larger portfolios. If a CHESS-sponsored broker fails, your shares remain registered in your name and can be transferred to another broker. With custodial models, you're reliant on the broker's (or custodian's) solvency and may face delays recovering assets. For safety-conscious investors, CHESS sponsorship provides meaningful protection.",
      },
      {
        heading: "Can I Transfer My HIN Between Brokers?",
        body: "Yes. Since your shares are registered under your HIN (not the broker's account), you can transfer between CHESS-sponsored brokers without selling. This typically takes 3-5 business days and some brokers charge a transfer fee ($0-$54 per holding). This portability is a major advantage of CHESS sponsorship.",
      },
    ],
    relatedLinks: [
      { label: "Compare All Brokers", href: "/compare?filter=chess" },
      { label: "CHESS Safety Calculator", href: "/calculators" },
      { label: "Best for Beginners", href: "/best/beginners" },
      { label: "Best for SMSF", href: "/best/smsf" },
    ],
    faqs: [
      {
        question: "What does CHESS-sponsored mean?",
        answer:
          "CHESS-sponsored means your shares are registered in your name on the ASX's official register (CHESS) under a unique Holder Identification Number (HIN). This gives you direct ownership rather than beneficial ownership through a custodian.",
      },
      {
        question: "Which brokers in Australia are CHESS-sponsored?",
        answer:
          "Major CHESS-sponsored brokers in Australia include CommSec, SelfWealth, Interactive Brokers, CMC Markets, and Stake. Not all brokers offer CHESS — many newer platforms use custodial models where shares are held in the broker's name.",
      },
      {
        question: "Is CHESS sponsorship safer than custodial?",
        answer:
          "Generally yes. With CHESS sponsorship, shares are registered in your name and protected if the broker fails. With custodial models, your shares are held in the broker's name and may be harder to recover in insolvency. However, both models are regulated by ASIC.",
      },
    ],
  },
  {
    slug: "smsf",
    title: "Best Brokers for SMSF Trading in Australia (2026)",
    h1: "Best Brokers for Self-Managed Super Funds (SMSF)",
    metaDescription:
      "SMSF-compatible Australian brokers compared. Compliant custody, reporting, and fees for self-managed super fund investing. Updated 2026.",
    intro:
      "Running a Self-Managed Super Fund requires a broker that supports SMSF accounts with compliant custody, proper reporting, and reasonable fees. Not all platforms offer SMSF accounts. Here are the brokers that do, ranked by value for SMSF trustees.",
    filter: (b) => !b.is_crypto && b.smsf_support,
    sort: (a, b) => (b.rating ?? 0) - (a.rating ?? 0),
    criteria: [
      "Dedicated SMSF account type available",
      "Compliant custody arrangements",
      "ASIC-regulated",
      "Suitable reporting for annual SMSF audits",
    ],
    sections: [
      {
        heading: "Why Does Your SMSF Need a Specific Broker?",
        body: "SMSF investments must be kept separate from personal assets, and the broker needs to support trust-level accounts (not individual accounts). The broker's custody arrangement also matters for audit compliance. Using a personal trading account for SMSF investments is a compliance breach that can result in penalties from the ATO.",
      },
      {
        heading: "CHESS Sponsorship for SMSF: Essential or Optional?",
        body: "Highly recommended. CHESS sponsorship means shares are registered under the SMSF's HIN, making ownership clear for your annual audit and providing protection if the broker fails. This simplifies compliance and gives trustees peace of mind. All brokers in our SMSF list offer either CHESS or regulated custodial arrangements suitable for super funds.",
      },
      {
        heading: "Fees to Watch in SMSF Accounts",
        body: "Beyond brokerage, check for SMSF-specific fees: account fees (some brokers charge extra for trust/SMSF accounts), data feed fees, and reporting fees. Also consider whether the broker provides tax reporting that integrates with your SMSF accounting software. These ongoing costs can add up for funds with smaller balances.",
      },
    ],
    relatedLinks: [
      { label: "Compare All Brokers", href: "/compare?filter=smsf" },
      { label: "Best for CHESS", href: "/best/chess-sponsored" },
      { label: "Fee Calculator", href: "/calculators" },
      { label: "Best for Low Fees", href: "/best/low-fees" },
    ],
    faqs: [
      {
        question: "Can I use any broker for my SMSF?",
        answer:
          "No. You need a broker that supports SMSF/trust accounts with compliant custody. Not all platforms offer this — many newer brokers only support individual accounts. Check that the broker explicitly lists SMSF as a supported account type.",
      },
      {
        question: "What is the cheapest broker for SMSF?",
        answer:
          "Among SMSF-compatible brokers, costs vary significantly. Some charge $0 brokerage but don't support SMSF. The cheapest SMSF-compatible options tend to be those with lower per-trade fees combined with no SMSF-specific platform charges.",
      },
    ],
  },
  {
    slug: "crypto",
    title: "Best Crypto Exchanges in Australia (2026)",
    h1: "Best Cryptocurrency Exchanges in Australia",
    metaDescription:
      "ASIC-regulated Australian crypto exchanges compared. Fees, security, and supported coins. Updated February 2026.",
    intro:
      "Buying Bitcoin, Ethereum, or other cryptocurrencies in Australia? Stick with ASIC-regulated exchanges that offer AUD deposits and transparent fees. Here are the best options for Australian crypto investors in 2026.",
    filter: (b) => b.is_crypto,
    sort: (a, b) => (b.rating ?? 0) - (a.rating ?? 0),
    criteria: [
      "ASIC-registered digital currency exchange (DCE)",
      "Supports AUD deposits and withdrawals",
      "Transparent fee structure",
      "Crypto-focused platform",
    ],
    sections: [
      {
        heading: "Why Use an Australian Crypto Exchange?",
        body: "Australian crypto exchanges registered with AUSTRAC as digital currency exchanges (DCEs) must comply with anti-money laundering laws and report to authorities. This provides a level of regulatory oversight that offshore exchanges don't. Australian exchanges also support direct AUD bank transfers, avoiding the FX costs of sending money offshore.",
      },
      {
        heading: "Exchange Fees: Maker vs Taker",
        body: "Most crypto exchanges charge 'maker' fees (when you add liquidity with limit orders) and 'taker' fees (when you take liquidity with market orders). Maker fees are usually lower. For beginners, the 'instant buy' feature often costs more than placing a limit order on the exchange's trading platform. Check both fee tiers before choosing.",
      },
      {
        heading: "Security: Not Your Keys, Not Your Coins",
        body: "Keeping crypto on an exchange is convenient for trading but carries counterparty risk. Consider withdrawing long-term holdings to a personal hardware wallet. When comparing exchanges, check their security track record, insurance coverage, and whether they use cold storage for customer funds.",
      },
    ],
    relatedLinks: [
      { label: "Compare All Brokers", href: "/compare?filter=crypto" },
      { label: "Compare Share Brokers", href: "/compare" },
      { label: "Take the Quiz", href: "/quiz" },
    ],
    faqs: [
      {
        question: "Is crypto legal in Australia?",
        answer:
          "Yes. Cryptocurrency is legal to buy, sell, and hold in Australia. Exchanges must be registered with AUSTRAC as digital currency exchanges. Profits from crypto are subject to capital gains tax.",
      },
      {
        question: "What is the best crypto exchange in Australia?",
        answer:
          "The best Australian crypto exchanges are AUSTRAC-registered, support AUD deposits, and have transparent fees. Our top picks are rated on fee structure, supported coins, platform quality, and security features.",
      },
    ],
  },
  {
    slug: "low-fx-fees",
    title: "Best Brokers for Low FX Fees in Australia (2026)",
    h1: "Best Brokers for Low Foreign Exchange Fees",
    metaDescription:
      "Australian brokers with the lowest FX conversion fees for international share trading. Save hundreds on currency conversion. Updated 2026.",
    intro:
      "FX conversion fees are the hidden cost of international investing. Big banks charge 0.60-0.70% — on a $10,000 US trade, that's $60-70 just to convert your currency. We've found brokers charging under 0.50%, saving you hundreds per year if you trade international shares regularly.",
    filter: (b) => !b.is_crypto && b.fx_rate != null && b.fx_rate > 0 && b.fx_rate < 0.5,
    sort: (a, b) => (a.fx_rate ?? 999) - (b.fx_rate ?? 999),
    criteria: [
      "FX conversion rate under 0.50%",
      "Access to international markets",
      "FX rate clearly disclosed",
      "Not a crypto-only exchange",
    ],
    sections: [
      {
        heading: "Why FX Fees Matter More Than Brokerage",
        body: "A $0 brokerage broker with 0.70% FX costs you $70 on a $10,000 US trade. A $2 brokerage broker with 0.25% FX costs you only $27. For international traders, the FX conversion rate is almost always the larger cost. Yet it's often buried in the fine print while '$0 brokerage' is in the headline.",
      },
      {
        heading: "Multi-Currency Accounts: The Best Option",
        body: "Some brokers offer multi-currency accounts where you can hold USD alongside AUD. This means you only pay the FX fee once — when you convert AUD to USD. After that, you can trade US shares and receive dividends in USD without converting back and forth. This saves significant FX costs for active international traders.",
      },
    ],
    relatedLinks: [
      { label: "FX Fee Calculator", href: "/calculators" },
      { label: "Best for US Shares", href: "/best/us-shares" },
      { label: "Compare All Brokers", href: "/compare?filter=low-fx" },
      { label: "Best for Low Fees", href: "/best/low-fees" },
    ],
    faqs: [
      {
        question: "What is a good FX rate for share trading?",
        answer:
          "Anything under 0.30% is excellent. Between 0.30-0.50% is fair. Above 0.50% is expensive. Big banks typically charge 0.60-0.70%. The best international brokers charge as low as 0.002% (Interactive Brokers) to 0.25% (Saxo).",
      },
      {
        question: "How do I avoid FX fees when buying US shares?",
        answer:
          "You can't avoid them entirely, but you can minimise them. Choose a broker with low FX rates, use a multi-currency account if available, and convert larger amounts less frequently rather than converting with each trade.",
      },
    ],
  },
];

export function getCategoryBySlug(slug: string): BestBrokerCategory | undefined {
  return categories.find((c) => c.slug === slug);
}

export function getAllCategories(): BestBrokerCategory[] {
  return categories;
}

export function getAllCategorySlugs(): string[] {
  return categories.map((c) => c.slug);
}
