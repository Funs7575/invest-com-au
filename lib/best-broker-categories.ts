import type { Broker } from "./types";
import { CURRENT_YEAR, UPDATED_LABEL, FEES_VERIFIED_LABEL } from "./seo";

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

const yr = CURRENT_YEAR;
const upd = UPDATED_LABEL;
const fv = FEES_VERIFIED_LABEL;

const categories: BestBrokerCategory[] = [
  {
    slug: "beginners",
    title: `Best Brokers for Beginners in Australia (${yr})`,
    h1: "Best Brokers for Beginners in Australia",
    metaDescription:
      `Beginner-friendly Australian brokers compared. Low fees, simple platforms, and strong safety features. ${upd}.`,
    intro:
      `Starting your investing journey? The right broker makes all the difference. We've filtered Australia's trading platforms to find those that combine low fees, intuitive platforms, and strong safety features like CHESS sponsorship. Here are our top picks for ${yr}.`,
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
      { label: "Compare All Platforms", href: "/compare" },
      { label: "Take the Platform Quiz", href: "/quiz" },
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
    title: `Best Brokers for US Shares in Australia (${yr})`,
    h1: "Best Brokers for Buying US Shares from Australia",
    metaDescription:
      `Compare Australian brokers for US share trading. $0 US brokerage, low FX fees, and fractional shares. ${upd}.`,
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
      { label: "Compare All Platforms", href: "/compare" },
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
    title: `Cheapest Online Brokers in Australia (${yr})`,
    h1: "Cheapest Online Brokers in Australia",
    metaDescription:
      `The lowest-fee share trading platforms in Australia. $0 brokerage on ASX and US trades. ${fv}.`,
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
      { label: "Compare All Platforms", href: "/compare" },
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
    title: `Best CHESS-Sponsored Brokers in Australia (${yr})`,
    h1: "Best CHESS-Sponsored Brokers in Australia",
    metaDescription:
      `CHESS-sponsored brokers compared. Your shares held in your name on the ASX register. Safety, fees, and features compared. ${upd}.`,
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
      { label: "Compare All Platforms", href: "/compare?filter=chess" },
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
    title: `Best Brokers for SMSF Trading in Australia (${yr})`,
    h1: "Best Brokers for Self-Managed Super Funds (SMSF)",
    metaDescription:
      `SMSF-compatible Australian brokers compared. Compliant custody, reporting, and fees for self-managed super fund investing. ${upd}.`,
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
      { label: "Compare All Platforms", href: "/compare?filter=smsf" },
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
    title: `Best Crypto Exchanges in Australia (${yr})`,
    h1: "Best Cryptocurrency Exchanges in Australia",
    metaDescription:
      `ASIC-regulated Australian crypto exchanges compared. Fees, security, and supported coins. ${upd}.`,
    intro:
      `Buying Bitcoin, Ethereum, or other cryptocurrencies in Australia? Stick with ASIC-regulated exchanges that offer AUD deposits and transparent fees. Here are the best options for Australian crypto investors in ${yr}.`,
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
      { label: "Compare All Platforms", href: "/compare?filter=crypto" },
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
    title: `Best Brokers for Low FX Fees in Australia (${yr})`,
    h1: "Best Brokers for Low Foreign Exchange Fees",
    metaDescription:
      `Australian brokers with the lowest FX conversion fees for international share trading. Save hundreds on currency conversion. ${upd}.`,
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
      { label: "Compare All Platforms", href: "/compare?filter=low-fx" },
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
  {
    slug: "free-brokerage",
    title: `Best $0 Brokerage Brokers in Australia (${yr})`,
    h1: "Best Free Brokerage Brokers in Australia",
    metaDescription:
      `Australian brokers offering $0 brokerage on ASX trades. How they work, are they safe, and which is best. ${upd}.`,
    intro:
      "Zero-commission trading has arrived in Australia. Several brokers now offer $0 brokerage on ASX share trades, but free doesn't always mean no cost. We've analysed how each $0 broker makes money, whether they're safe, and which one delivers the best overall experience for Australian investors.",
    filter: (b) => b.asx_fee_value === 0,
    sort: (a, b) => (b.rating ?? 0) - (a.rating ?? 0),
    criteria: [
      "$0 brokerage on ASX share trades",
      "ASIC-regulated Australian financial services licence",
      "Transparent revenue model disclosed",
      "Functional trading platform with real-time pricing",
    ],
    sections: [
      {
        heading: "How Do $0 Brokerage Brokers Make Money?",
        body: "If you're not paying brokerage, the broker earns revenue elsewhere. Common models include earning interest on your uninvested cash, charging FX conversion fees on international trades, offering premium subscription tiers, or receiving payment for order flow. None of these are inherently bad, but you should understand the trade-offs. A broker earning 0.70% on FX still costs you $70 on a $10,000 US trade — 'free' brokerage doesn't mean free investing.",
      },
      {
        heading: "Are $0 Brokers Safe for Australian Investors?",
        body: "Safety depends on regulation and custody, not the price you pay. Several $0 brokerage brokers hold Australian Financial Services Licences (AFSL) and are regulated by ASIC. Some are also CHESS-sponsored, meaning your shares are registered in your name on the ASX register. Always check the broker's regulatory status and custody model before opening an account — low fees should never come at the cost of safety.",
      },
      {
        heading: `Which $0 Broker Is Best in ${yr}?`,
        body: "The best $0 broker depends on what you trade. If you only buy ASX shares, focus on platform quality, CHESS sponsorship, and any account fees. If you also trade US shares, compare the FX conversion rates — these vary from 0.25% to 0.70% and represent the real cost of 'free' trading. Our ranking above factors in all of these costs to give you a true total-cost comparison.",
      },
    ],
    relatedLinks: [
      { label: "Compare All Platforms", href: "/compare" },
      { label: "Fee Calculator", href: "/calculators" },
      { label: "Best for Low Fees", href: "/best/low-fees" },
      { label: "Best for Beginners", href: "/best/beginners" },
    ],
    faqs: [
      {
        question: "Is $0 brokerage really free in Australia?",
        answer:
          "The ASX trade itself is free, but there may be other costs. FX conversion fees apply if you trade international shares, and some brokers earn interest on your uninvested cash. Always check the full fee schedule, not just the headline brokerage rate.",
      },
      {
        question: "Are $0 brokerage brokers CHESS-sponsored?",
        answer:
          "Some are, some aren't. CHESS sponsorship is independent of brokerage pricing. Check our comparison table to see which $0 brokers offer CHESS sponsorship, which provides direct share ownership registered in your name on the ASX.",
      },
      {
        question: "What is the catch with zero-commission brokers?",
        answer:
          "The main 'catch' is that revenue comes from other sources — typically FX fees, interest on cash balances, or premium subscriptions. These costs can add up, especially for international traders. Compare total costs, not just brokerage, to find the genuinely cheapest option.",
      },
    ],
  },
  {
    slug: "under-5-dollars",
    title: `Best Brokers Under $5 Per Trade in Australia (${yr})`,
    h1: "Best Brokers Under $5 Per Trade in Australia",
    metaDescription:
      `Australian brokers charging under $5 per ASX trade. The sweet spot between free and full-service. ${fv}.`,
    intro:
      "Brokers charging $1 to $5 per trade sit in the sweet spot between free platforms and traditional full-service brokers. You get low costs without the trade-offs that sometimes come with $0 models. Here are Australia's best sub-$5 brokers, ranked by ASX brokerage from lowest to highest.",
    filter: (b) => b.asx_fee_value != null && b.asx_fee_value <= 5 && b.asx_fee_value > 0,
    sort: (a, b) => (a.asx_fee_value ?? 999) - (b.asx_fee_value ?? 999),
    criteria: [
      "ASX brokerage between $0.01 and $5.00 per trade",
      "ASIC-regulated broker",
      "No mandatory platform or data fees",
      "Not a crypto-only exchange",
    ],
    sections: [
      {
        heading: "Why Pay $3-5 When Some Brokers Are Free?",
        body: "Paying a small brokerage can actually save you money overall. Some $0 brokers charge higher FX fees, earn revenue from your cash balance, or use custodial models instead of CHESS. A $3-5 broker that's CHESS-sponsored with low FX rates may cost you less in total, especially if you trade international shares or hold a significant cash balance.",
      },
      {
        heading: "The Impact of $5 vs $0 Over Time",
        body: "If you invest monthly, the difference between $0 and $5 brokerage is $60 per year. On a $5,000 annual investment, that's 1.2% — worth considering. On $50,000, it's just 0.12% — barely noticeable. The larger your trade sizes, the less brokerage matters relative to FX fees, platform features, and safety.",
      },
      {
        heading: "Best Use Cases for Sub-$5 Brokers",
        body: "These brokers are ideal for investors who want a balance of low cost and strong features. They suit monthly investors buying ASX ETFs or shares, people who want CHESS sponsorship without paying $10-30 per trade, and investors who prioritise platform stability and research tools alongside competitive pricing.",
      },
    ],
    relatedLinks: [
      { label: "Compare All Platforms", href: "/compare" },
      { label: "Best $0 Brokerage", href: "/best/free-brokerage" },
      { label: "Fee Calculator", href: "/calculators" },
      { label: "Best for Low Fees", href: "/best/low-fees" },
    ],
    faqs: [
      {
        question: "Which Australian broker charges under $5 per trade?",
        answer:
          "Several Australian brokers offer brokerage between $1 and $5 per ASX trade. These include both CHESS-sponsored and custodial platforms. Check our ranked list above for the current cheapest options with verified fees.",
      },
      {
        question: "Is $5 per trade expensive for share trading?",
        answer:
          "No. $5 per trade is considered low-cost in Australia. Traditional brokers like CommSec charge $29.95. Even at one trade per month, $5 brokerage costs just $60 per year — a fraction of what full-service platforms charge.",
      },
    ],
  },
  {
    slug: "no-inactivity-fee",
    title: `Best Brokers With No Inactivity Fee in Australia (${yr})`,
    h1: "Best Brokers With No Inactivity Fee in Australia",
    metaDescription:
      `Australian brokers that don't charge inactivity fees. Hold shares long-term without penalties. ${upd}.`,
    intro:
      "Inactivity fees punish you for not trading — the opposite of a buy-and-hold strategy. If you're a long-term investor who buys shares and holds them for years, you need a broker that won't charge you for doing nothing. Here are Australia's best brokers with zero inactivity fees.",
    filter: (b) =>
      !b.inactivity_fee ||
      b.inactivity_fee === "None" ||
      b.inactivity_fee === "$0" ||
      b.inactivity_fee === "No",
    sort: (a, b) => (b.rating ?? 0) - (a.rating ?? 0),
    criteria: [
      "No inactivity or account-keeping fees",
      "ASIC-regulated broker",
      "Suitable for buy-and-hold investors",
      "Not a crypto-only exchange",
    ],
    sections: [
      {
        heading: "Why Do Some Brokers Charge Inactivity Fees?",
        body: "Brokers that charge inactivity fees (typically $10-25 per quarter) are incentivised to keep you trading. This fee model conflicts with long-term investing, where the best strategy is often to buy quality shares or ETFs and hold them for years. If you're building wealth through a buy-and-hold approach, inactivity fees erode your returns for no benefit.",
      },
      {
        heading: "Which Brokers Charge Inactivity Fees?",
        body: "Some international brokers and CFD platforms charge quarterly inactivity fees if you don't place a trade within a set period. Most Australian-focused share brokers have dropped inactivity fees, but it's always worth checking. The brokers listed above all confirm zero inactivity charges, making them ideal for patient, long-term investors.",
      },
      {
        heading: "Long-Term Holding: What Else to Consider",
        body: "Beyond inactivity fees, long-term holders should consider CHESS sponsorship (your shares are safe if the broker fails), dividend reinvestment plan (DRP) support, and corporate action handling. A broker that charges no inactivity fee but lacks CHESS sponsorship may not be the best choice for a decade-long holding period.",
      },
    ],
    relatedLinks: [
      { label: "Compare All Platforms", href: "/compare" },
      { label: "Best for CHESS", href: "/best/chess-sponsored" },
      { label: "Best for Dividend Investing", href: "/best/dividend-investing" },
      { label: "Fee Calculator", href: "/calculators" },
    ],
    faqs: [
      {
        question: "Do Australian brokers charge inactivity fees?",
        answer:
          "Most Australian share brokers do not charge inactivity fees. However, some international brokers and CFD platforms do charge quarterly fees (typically $10-25) if you don't place a trade. Always check the broker's fee schedule before opening an account.",
      },
      {
        question: "What happens if I don't trade for a year?",
        answer:
          "With the brokers listed above, nothing — your account stays open and your shares remain held at no cost. With brokers that charge inactivity fees, you may be charged quarterly until you place a trade or close your account.",
      },
    ],
  },
  {
    slug: "international-shares",
    title: `Best Brokers for International Shares in Australia (${yr})`,
    h1: "Best Brokers for International Shares in Australia",
    metaDescription:
      `Compare Australian brokers for global share trading. Access US, UK, European, and Asian markets with low FX fees. ${upd}.`,
    intro:
      "Investing beyond the ASX gives you access to thousands of companies across the US, UK, Europe, and Asia. But international trading costs vary wildly between brokers — FX fees, brokerage, and market access all differ. We've ranked Australia's best brokers for international shares by total cost.",
    filter: (b) => b.us_fee_value != null && !b.is_crypto,
    sort: (a, b) => {
      const totalA = (a.us_fee_value ?? 999) + (a.fx_rate ?? 999);
      const totalB = (b.us_fee_value ?? 999) + (b.fx_rate ?? 999);
      return totalA - totalB;
    },
    criteria: [
      "Access to US markets (NYSE, NASDAQ) at minimum",
      "FX conversion rate clearly disclosed",
      "ASIC-regulated or holding an Australian licence",
      "Not a crypto-only exchange",
    ],
    sections: [
      {
        heading: "Accessing Global Markets From Australia",
        body: "Australian investors can access international shares through brokers that offer multi-market trading. The most popular markets are the US (NYSE, NASDAQ), UK (LSE), and European exchanges. Some brokers also provide access to Asian markets including Hong Kong, Japan, and Singapore. The key is finding a broker that offers the markets you want at a reasonable total cost — brokerage plus FX conversion.",
      },
      {
        heading: "Multi-Currency Accounts: A Big Advantage",
        body: "If you regularly trade international shares, a multi-currency account can save you significant money. Instead of converting AUD to USD (and back) with every trade, you hold foreign currency and only convert when you need to. This eliminates the round-trip FX cost and is especially valuable for receiving US dividends that you want to reinvest in US shares.",
      },
      {
        heading: "Tax Implications of International Investing",
        body: "Australian residents pay capital gains tax on international shares just like domestic ones. For US shares, you should lodge a W-8BEN form to reduce US withholding tax on dividends from 30% to 15%. This withholding can be claimed as a foreign income tax offset on your Australian tax return. Keep good records — your broker's tax report may not cover international holdings as comprehensively as ASX trades.",
      },
    ],
    relatedLinks: [
      { label: "Best for US Shares", href: "/best/us-shares" },
      { label: "Best for Low FX Fees", href: "/best/low-fx-fees" },
      { label: "FX Fee Calculator", href: "/calculators" },
      { label: "Compare All Platforms", href: "/compare" },
    ],
    faqs: [
      {
        question: "Which Australian broker is best for international shares?",
        answer:
          "The best broker depends on which markets you want to access and your trade size. For US shares, look for low FX rates (under 0.30%) and low or $0 US brokerage. For multi-market access (Europe, Asia), Interactive Brokers typically offers the widest range at competitive rates.",
      },
      {
        question: "Do I need a separate account to buy international shares?",
        answer:
          "No. Most Australian brokers that offer international trading let you access both ASX and overseas markets from a single account. Some brokers offer a multi-currency feature within the same account, so you can hold AUD and USD balances simultaneously.",
      },
      {
        question: "How are international shares taxed in Australia?",
        answer:
          "International shares are subject to Australian capital gains tax. US dividends are subject to withholding tax (15% with a W-8BEN form). You can claim a foreign income tax offset for tax paid overseas. Report all international income in your Australian tax return.",
      },
    ],
  },
  {
    slug: "day-trading",
    title: `Best Brokers for Day Trading in Australia (${yr})`,
    h1: "Best Brokers for Day Trading in Australia",
    metaDescription:
      `Australian brokers for active and day traders. Low brokerage, fast execution, and advanced order types. ${upd}.`,
    intro:
      "Active traders need more than low fees — they need fast execution, reliable platforms, advanced order types, and real-time data. We've identified the best Australian brokers for day trading and frequent trading, ranked by the features that matter most when you're making multiple trades per day.",
    filter: (b) => !b.is_crypto && (b.asx_fee_value ?? 999) <= 5,
    sort: (a, b) => (a.asx_fee_value ?? 999) - (b.asx_fee_value ?? 999),
    criteria: [
      "ASX brokerage of $5 or less per trade",
      "Real-time market data available",
      "Advanced order types (limit, stop-loss, conditional)",
      "Not a crypto-only exchange",
    ],
    sections: [
      {
        heading: "What Do Active Traders Need From a Broker?",
        body: "Day trading and active trading require a different set of features than buy-and-hold investing. Execution speed matters — delays of even a few seconds can affect your fill price. You need advanced order types including stop-losses, trailing stops, and conditional orders to manage risk. Real-time level-2 data helps you see market depth. And with multiple trades per day, brokerage costs compound quickly, so $0-5 per trade is essential.",
      },
      {
        heading: "Platform Speed and Reliability",
        body: "Platform outages during volatile markets are a day trader's nightmare. Look for brokers with proven uptime records, dedicated desktop applications (not just web platforms), and fast order routing. Some brokers offer direct market access (DMA) which routes orders straight to the exchange, reducing latency. If you're trading frequently, test the platform with small trades before committing your capital.",
      },
      {
        heading: "Managing Risk as an Active Trader",
        body: "The majority of day traders lose money — this is well documented by ASIC and global regulators. If you choose to trade actively, use strict risk management: set stop-losses on every trade, never risk more than 1-2% of your capital on a single position, and track your performance honestly. A good broker helps by offering built-in risk tools, but discipline is ultimately on you.",
      },
    ],
    relatedLinks: [
      { label: "Best for Low Fees", href: "/best/low-fees" },
      { label: "Best $0 Brokerage", href: "/best/free-brokerage" },
      { label: "Fee Calculator", href: "/calculators" },
      { label: "Compare All Platforms", href: "/compare" },
    ],
    faqs: [
      {
        question: "What is the best platform for day trading in Australia?",
        answer:
          "The best day trading platform offers low brokerage ($0-5 per trade), fast execution, advanced order types, and real-time data. Our ranking above prioritises these features for active Australian traders.",
      },
      {
        question: "Is day trading legal in Australia?",
        answer:
          "Yes, day trading is legal in Australia. However, ASIC warns that the majority of retail traders lose money. There is no pattern day trader rule in Australia like in the US, so there are no minimum balance requirements specific to day trading.",
      },
      {
        question: "How much do I need to start day trading?",
        answer:
          "There is no legal minimum in Australia, but most experienced traders suggest at least $10,000-20,000 to make day trading viable after accounting for brokerage costs and to allow proper position sizing with sensible risk management.",
      },
    ],
  },
  {
    slug: "dividend-investing",
    title: `Best Brokers for Dividend Investing in Australia (${yr})`,
    h1: "Best Brokers for Dividend Investing in Australia",
    metaDescription:
      `Australian brokers for dividend investors. DRP support, franking credits, and CHESS sponsorship. ${upd}.`,
    intro:
      "Dividend investing is one of the most popular strategies for Australian investors, thanks to our unique franking credit system. The right broker makes dividend investing easier with DRP support, CHESS sponsorship for direct share ownership, and low fees that don't eat into your yield. Here are the best options.",
    filter: (b) => !b.is_crypto && b.chess_sponsored,
    sort: (a, b) => (b.rating ?? 0) - (a.rating ?? 0),
    criteria: [
      "CHESS-sponsored for direct share ownership",
      "Supports dividend reinvestment plans (DRP)",
      "ASIC-regulated broker",
      "Not a crypto-only exchange",
    ],
    sections: [
      {
        heading: "Why CHESS Sponsorship Matters for Dividends",
        body: "When your shares are CHESS-sponsored, dividends are paid directly to you by the company — not routed through the broker. This means you receive franking credits directly, participate in DRP schemes offered by the company, and maintain a clear record of dividend income for tax reporting. Custodial brokers may handle dividends differently, sometimes bundling them or delaying payments.",
      },
      {
        heading: "Dividend Reinvestment Plans (DRP) Explained",
        body: "Many ASX companies offer DRP, which automatically reinvests your dividends into additional shares — often at a small discount to the market price and with no brokerage fees. To participate, you typically need CHESS-sponsored shares registered in your name. This is a powerful tool for compounding returns over decades without paying extra brokerage on each reinvestment.",
      },
      {
        heading: "Franking Credits and Your Tax Return",
        body: "Australia's dividend imputation system means companies attach franking credits to dividends, representing tax already paid at the corporate level. Fully franked dividends from a company paying 30% tax effectively gross up your income. If your marginal tax rate is below 30%, you receive a tax refund on the difference. Your broker's annual tax statement should include franking credit details for your tax return.",
      },
    ],
    relatedLinks: [
      { label: "Best for CHESS", href: "/best/chess-sponsored" },
      { label: "Best for SMSF", href: "/best/smsf" },
      { label: "Compare All Platforms", href: "/compare" },
      { label: "Fee Calculator", href: "/calculators" },
    ],
    faqs: [
      {
        question: "Which broker is best for dividend investing in Australia?",
        answer:
          "The best dividend investing broker is CHESS-sponsored (so you receive dividends and franking credits directly), supports DRP, and charges low brokerage. Our top picks balance all three factors for Australian dividend investors.",
      },
      {
        question: "Do I need CHESS sponsorship to receive franking credits?",
        answer:
          "You receive franking credits regardless of custody model, but CHESS-sponsored brokers make the process more direct. Your shares are in your name, dividends come straight from the company, and tax reporting is clearer. Custodial brokers also pass through franking credits but the process may differ.",
      },
    ],
  },
  {
    slug: "etf-investing",
    title: `Best Brokers for ETF Investing in Australia (${yr})`,
    h1: "Best Brokers for ETF Investing in Australia",
    metaDescription:
      `Australian brokers for ETF investors. Low brokerage for Vanguard, BetaShares, and iShares ETFs. ${upd}.`,
    intro:
      `ETFs are the fastest-growing investment product in Australia, and for good reason — they offer instant diversification at low cost. But your broker choice matters. Brokerage fees on regular ETF purchases can significantly impact long-term returns. Here are the best brokers for building an ETF portfolio in ${yr}.`,
    filter: (b) => !b.is_crypto && (b.asx_fee_value ?? 999) <= 10,
    sort: (a, b) => (a.asx_fee_value ?? 999) - (b.asx_fee_value ?? 999),
    criteria: [
      "ASX brokerage of $10 or less per trade",
      "Access to major ETF issuers (Vanguard, BetaShares, iShares)",
      "Suitable for regular investing and DCA strategies",
      "Not a crypto-only exchange",
    ],
    sections: [
      {
        heading: "Why Brokerage Matters for ETF Investors",
        body: "ETF investors typically buy regularly — monthly or quarterly — using dollar-cost averaging (DCA). If you invest $500 per month and pay $10 brokerage, that's 2% of your investment lost to fees before your ETF even moves. At $0-3 brokerage, the impact drops to under 0.6%. Over 20 years of monthly investing, the fee difference compounds to thousands of dollars in lost returns.",
      },
      {
        heading: "Building a Simple ETF Portfolio",
        body: "Most Australian ETF investors use a core-satellite approach. The core might be a broad market ETF (like Vanguard VAS for ASX 300 or VGS for global shares), while satellites add specific exposure — property, emerging markets, or bonds. You don't need dozens of ETFs. A simple two-fund portfolio of VAS + VGS gives you diversified Australian and global exposure at minimal cost.",
      },
      {
        heading: "Dollar-Cost Averaging With ETFs",
        body: "DCA means investing a fixed amount at regular intervals regardless of market price. This smooths out your average purchase price and removes the stress of timing the market. The key requirement is low or zero brokerage, so your fixed investment amount isn't eroded by fees each month. The brokers ranked above are ideal for this strategy.",
      },
    ],
    relatedLinks: [
      { label: "Best for Low Fees", href: "/best/low-fees" },
      { label: "Best for Beginners", href: "/best/beginners" },
      { label: "Fee Calculator", href: "/calculators" },
      { label: "Compare All Platforms", href: "/compare" },
    ],
    faqs: [
      {
        question: "What is the cheapest way to buy ETFs in Australia?",
        answer:
          "The cheapest way is through a broker offering $0 ASX brokerage. Several Australian brokers now offer this. For regular monthly investments, zero or near-zero brokerage makes the biggest difference to your long-term returns.",
      },
      {
        question: "Can I set up automatic ETF investing in Australia?",
        answer:
          "Some brokers offer auto-invest features that buy your chosen ETFs on a schedule. Others require you to place orders manually. If automation is important, check whether your broker supports recurring buy orders before signing up.",
      },
      {
        question: "How many ETFs do I need in my portfolio?",
        answer:
          "Most investors need only 2-4 ETFs for a well-diversified portfolio. A simple two-fund approach — one Australian market ETF and one international ETF — covers thousands of companies across dozens of countries. Adding more ETFs increases complexity without necessarily improving diversification.",
      },
    ],
  },
  {
    slug: "mobile-app",
    title: `Best Mobile Trading Apps in Australia (${yr})`,
    h1: "Best Mobile Trading Apps in Australia",
    metaDescription:
      `Top-rated mobile share trading apps in Australia. Invest on the go with intuitive design and real-time data. ${upd}.`,
    intro:
      "More Australians are managing their investments from their phones than ever before. A great mobile trading app needs intuitive design, fast execution, real-time data, and reliable notifications. We've ranked Australia's best mobile investing apps based on user experience, features, and overall broker quality.",
    filter: (b) => !b.is_crypto && (b.rating ?? 0) >= 3.5,
    sort: (a, b) => (b.rating ?? 0) - (a.rating ?? 0),
    criteria: [
      "Rating of 3.5/5 or higher in our methodology",
      "Dedicated mobile app (iOS and Android)",
      "Real-time portfolio tracking and alerts",
      "Not a crypto-only exchange",
    ],
    sections: [
      {
        heading: "What Makes a Great Trading App?",
        body: "The best mobile trading apps balance simplicity with functionality. You should be able to check your portfolio, place trades, and set alerts within seconds — without hunting through menus. Key features include biometric login, real-time price updates, push notifications for order fills and price alerts, and a clean portfolio overview showing your holdings and returns at a glance.",
      },
      {
        heading: "Mobile App vs Desktop Platform",
        body: "Most brokers offer both a mobile app and a desktop platform. For everyday portfolio checks and simple buy/sell orders, the mobile app is sufficient. For detailed research, charting, and complex order types, the desktop platform is usually more capable. The ideal broker excels at both — a streamlined app for daily use and a powerful desktop platform when you need it.",
      },
      {
        heading: "Security on Mobile Devices",
        body: "Trading from your phone introduces security considerations. Use biometric authentication (Face ID, fingerprint) rather than just a PIN. Enable two-factor authentication on your brokerage account. Avoid trading on public Wi-Fi networks. The brokers listed above all offer biometric login and two-factor authentication to protect your account on mobile.",
      },
    ],
    relatedLinks: [
      { label: "Best for Beginners", href: "/best/beginners" },
      { label: "Compare All Platforms", href: "/compare" },
      { label: "Take the Platform Quiz", href: "/quiz" },
      { label: "Best for ETF Investing", href: "/best/etf-investing" },
    ],
    faqs: [
      {
        question: "What is the best share trading app in Australia?",
        answer:
          "The best trading app depends on your priorities. For simplicity and design, newer fintech brokers tend to lead. For features and research tools, established brokers often offer more comprehensive apps. Our ranking above balances usability, features, and overall broker quality.",
      },
      {
        question: "Is it safe to trade shares on my phone?",
        answer:
          "Yes, as long as you use proper security measures. Enable biometric login and two-factor authentication, keep your phone's operating system updated, and avoid trading on public Wi-Fi. All reputable Australian brokers encrypt mobile app communications.",
      },
    ],
  },
  {
    slug: "fractional-shares",
    title: `Best Brokers for Fractional Shares in Australia (${yr})`,
    h1: "Best Brokers for Fractional Shares in Australia",
    metaDescription:
      `Australian brokers offering fractional shares. Invest any dollar amount in ASX and US stocks. ${upd}.`,
    intro:
      "Fractional shares let you invest any dollar amount — even $10 — into shares that might otherwise cost hundreds per unit. This is particularly valuable for US stocks like Amazon or Berkshire Hathaway, and for Australian investors who want to dollar-cost average fixed amounts each month. Here are the best brokers offering fractional shares in Australia.",
    filter: (b) => !b.is_crypto && (b.asx_fee_value ?? 999) <= 10,
    sort: (a, b) => (b.rating ?? 0) - (a.rating ?? 0),
    criteria: [
      "Fractional or dollar-based investing available",
      "ASX brokerage of $10 or less per trade",
      "ASIC-regulated broker",
      "Not a crypto-only exchange",
    ],
    sections: [
      {
        heading: "How Fractional Shares Work",
        body: "Instead of buying whole shares (e.g., 1 share of BHP at $45), fractional investing lets you buy a dollar amount (e.g., $20 of BHP, giving you 0.44 shares). The broker handles the fractional ownership behind the scenes. This is especially useful for expensive US stocks — you can invest $50 in a $200 stock without needing to buy a full share.",
      },
      {
        heading: "Which Australian Brokers Offer Fractional Shares?",
        body: "Fractional shares are relatively new in Australia. Most traditional brokers require whole-share purchases, but several newer platforms now support dollar-based investing on US markets. For ASX shares, fractional support is less common due to CHESS settlement rules. Check the brokers above for current fractional share availability on both ASX and international markets.",
      },
      {
        heading: "Fractional Shares for Dollar-Cost Averaging",
        body: "Fractional shares are ideal for DCA strategies. Instead of investing $500 and getting 'as many whole shares as possible', you invest exactly $500 — no leftover cash sitting idle. Over years of monthly investing, this ensures every dollar is working for you. Combined with $0 brokerage, fractional shares make small regular investments highly efficient.",
      },
    ],
    relatedLinks: [
      { label: "Best for ETF Investing", href: "/best/etf-investing" },
      { label: "Best for Beginners", href: "/best/beginners" },
      { label: "Compare All Platforms", href: "/compare" },
      { label: "Fee Calculator", href: "/calculators" },
    ],
    faqs: [
      {
        question: "Can I buy fractional shares in Australia?",
        answer:
          "Yes, some Australian brokers now offer fractional or dollar-based investing, primarily for US shares. For ASX shares, fractional support is more limited due to CHESS settlement requirements. Check our list above for brokers currently offering this feature.",
      },
      {
        question: "Are fractional shares safe?",
        answer:
          "Fractional shares are typically held in a custodial arrangement — the broker owns the full share and allocates your fraction. This means they don't benefit from CHESS sponsorship. However, if the broker is ASIC-regulated, your fractional holdings are protected under Australian financial services law.",
      },
      {
        question: "Do fractional shares pay dividends?",
        answer:
          "Yes. If you own 0.5 of a share and it pays a $1 dividend, you receive $0.50. Dividends are paid proportionally to your fractional ownership. Franking credits also apply proportionally for Australian shares.",
      },
    ],
  },
  {
    slug: "joint-accounts",
    title: `Best Brokers for Joint Accounts in Australia (${yr})`,
    h1: "Best Brokers for Joint Accounts in Australia",
    metaDescription:
      `Australian brokers supporting joint share trading accounts. Invest with your partner under shared ownership. ${upd}.`,
    intro:
      "Investing with a partner or family member? A joint brokerage account lets two people co-own shares and make decisions together. Not all brokers support joint accounts, and the features vary. Here are the best Australian brokers for joint share trading accounts.",
    filter: (b) => !b.is_crypto && b.chess_sponsored,
    sort: (a, b) => (b.rating ?? 0) - (a.rating ?? 0),
    criteria: [
      "Joint account type available",
      "CHESS-sponsored for clear ownership records",
      "ASIC-regulated broker",
      "Not a crypto-only exchange",
    ],
    sections: [
      {
        heading: "Joint Account vs Individual Accounts",
        body: "A joint brokerage account registers shares under both names, creating shared legal ownership. This differs from each person having their own individual account. Joint accounts are common for married couples who want shared ownership of investments, and they simplify estate planning since assets can pass to the surviving account holder without going through probate in most states.",
      },
      {
        heading: "CHESS Sponsorship and Joint Accounts",
        body: "CHESS-sponsored joint accounts register shares under a joint HIN (Holder Identification Number) with both names on the ASX register. This provides clear legal proof of shared ownership. If you're investing significant amounts with a partner, CHESS sponsorship is strongly recommended for the transparency and protection it provides.",
      },
      {
        heading: "Tax Implications of Joint Investing",
        body: "Income and capital gains from a joint account are generally split equally (50/50) between the account holders for tax purposes, regardless of who contributed the funds. Each person reports their share on their individual tax return. Speak to a tax adviser if your situation is more complex — for example, if one partner is in a significantly higher tax bracket, individual accounts may be more tax-effective.",
      },
    ],
    relatedLinks: [
      { label: "Best for CHESS", href: "/best/chess-sponsored" },
      { label: "Best for Trust Accounts", href: "/best/trust-accounts" },
      { label: "Compare All Platforms", href: "/compare" },
      { label: "Take the Platform Quiz", href: "/quiz" },
    ],
    faqs: [
      {
        question: "Which Australian brokers offer joint accounts?",
        answer:
          "Most CHESS-sponsored Australian brokers offer joint accounts, including CommSec, SelfWealth, and CMC Markets. Newer custodial-model brokers may not support joint accounts. Check directly with the broker before signing up.",
      },
      {
        question: "How is tax handled on a joint brokerage account?",
        answer:
          "Income and capital gains from a joint account are typically split 50/50 between account holders. Each person reports their half on their individual tax return. This applies regardless of who funded the account or who placed the trade.",
      },
    ],
  },
  {
    slug: "trust-accounts",
    title: `Best Brokers for Trust & Company Accounts in Australia (${yr})`,
    h1: "Best Brokers for Trust and Company Accounts in Australia",
    metaDescription:
      `Australian brokers supporting trust and company trading accounts. Compliant custody and reporting. ${upd}.`,
    intro:
      "Investing through a trust or company structure offers asset protection and tax flexibility, but requires a broker that supports these account types. Not all platforms do. Here are the best Australian brokers for trust and company share trading accounts, ranked by features and value.",
    filter: (b) => !b.is_crypto && b.smsf_support,
    sort: (a, b) => (b.rating ?? 0) - (a.rating ?? 0),
    criteria: [
      "Trust and/or company account types available",
      "Compliant custody arrangements for entity accounts",
      "ASIC-regulated broker",
      "Not a crypto-only exchange",
    ],
    sections: [
      {
        heading: "Why Invest Through a Trust or Company?",
        body: "Trusts and company structures are popular with Australian investors for asset protection, estate planning, and tax management. A family trust can distribute investment income to beneficiaries in lower tax brackets. A company structure caps the tax rate at 25-30%. Both provide a layer of legal separation between your personal assets and your investments. However, these structures have setup and ongoing compliance costs, so they're typically suited to larger portfolios.",
      },
      {
        heading: "Broker Requirements for Entity Accounts",
        body: "Not all brokers support trust or company accounts. Those that do typically require additional documentation — trust deeds, company registration documents, and identification for all directors or trustees. The account setup process takes longer than an individual account. Brokers that support SMSF accounts often also support trusts and companies, as the compliance framework is similar.",
      },
      {
        heading: "Compliance and Reporting Considerations",
        body: "Trust and company accounts require more rigorous record-keeping for annual tax returns and potential audits. Choose a broker that provides comprehensive tax reporting, including capital gains calculations and dividend income summaries. Integration with accounting software can save significant time. CHESS sponsorship is also valuable as it creates a clear ownership trail registered in the entity's name on the ASX.",
      },
    ],
    relatedLinks: [
      { label: "Best for SMSF", href: "/best/smsf" },
      { label: "Best for CHESS", href: "/best/chess-sponsored" },
      { label: "Compare All Platforms", href: "/compare" },
      { label: "Fee Calculator", href: "/calculators" },
    ],
    faqs: [
      {
        question: "Which Australian brokers support trust accounts?",
        answer:
          "Brokers that support SMSF accounts typically also offer trust and company accounts. These include CommSec, Interactive Brokers, CMC Markets, and SelfWealth. Newer fintech brokers often only support individual accounts, so check before applying.",
      },
      {
        question: "Is it worth investing through a trust in Australia?",
        answer:
          "For larger portfolios (typically $200,000+), a trust can offer meaningful tax and asset protection benefits. However, trusts have setup costs ($1,000-3,000), annual compliance obligations, and require professional advice. Speak to a financial adviser or accountant to determine if a trust structure suits your situation.",
      },
      {
        question: "Can I transfer existing shares into a trust?",
        answer:
          "Yes, but transferring shares from an individual name to a trust triggers a capital gains tax event — the ATO treats it as if you sold and repurchased the shares at market value. Factor in the CGT cost before making the transfer.",
      },
    ],
  },
  {
    slug: "children",
    title: `Best Brokers for Investing for Kids in Australia (${yr})`,
    h1: "Best Brokers for Investing for Children in Australia",
    metaDescription:
      `Australian brokers for investing on behalf of children. Custodial accounts, trust options, and age requirements. ${upd}.`,
    intro:
      "Investing for your children is one of the most powerful wealth-building strategies — time is the ultimate advantage. But minors can't open brokerage accounts in their own name in Australia. Here's how to invest on behalf of your kids, and which brokers make it easiest.",
    filter: (b) => !b.is_crypto && (b.rating ?? 0) >= 3.5,
    sort: (a, b) => (b.rating ?? 0) - (a.rating ?? 0),
    criteria: [
      "Options for investing on behalf of minors",
      "Rating of 3.5/5 or higher in our methodology",
      "ASIC-regulated broker",
      "Not a crypto-only exchange",
    ],
    sections: [
      {
        heading: "How to Invest for Children in Australia",
        body: "In Australia, children under 18 cannot open a share trading account in their own name. Parents have several options: invest in your own name 'on behalf of' the child, set up a family trust with the child as a beneficiary, or use a broker that offers a minor/custodial account (where you trade on the child's behalf until they turn 18). Each option has different tax and ownership implications.",
      },
      {
        heading: "Tax Considerations for Children's Investments",
        body: "The ATO applies special tax rules to children's investment income. Unearned income (dividends, interest, capital gains) above $416 per year is taxed at penalty rates for minors under 18 — up to 66% on amounts over $1,307. This means investing in the parent's name may actually be more tax-effective. A family trust can offer some flexibility. Always consult a tax adviser for your specific situation.",
      },
      {
        heading: "The Power of Starting Early",
        body: "A $5,000 investment growing at 7% per year becomes approximately $19,300 over 20 years and $38,000 over 30 years — without adding a single dollar more. If you invest $100 per month from birth to age 18, the total grows to roughly $45,000 (on $21,600 contributed). Starting early gives compound interest decades to work. Even small, regular contributions can create a meaningful nest egg by the time your child reaches adulthood.",
      },
    ],
    relatedLinks: [
      { label: "Best for Beginners", href: "/best/beginners" },
      { label: "Best for Trust Accounts", href: "/best/trust-accounts" },
      { label: "Fee Calculator", href: "/calculators" },
      { label: "Compare All Platforms", href: "/compare" },
    ],
    faqs: [
      {
        question: "Can I open a share trading account for my child in Australia?",
        answer:
          "Children under 18 cannot open accounts in their own name. You can invest on their behalf using your own account, a minor/custodial account (offered by some brokers), or a family trust with the child as a beneficiary. Each option has different legal and tax implications.",
      },
      {
        question: "What is the best way to invest for kids in Australia?",
        answer:
          "The most common approach is to buy shares or ETFs in the parent's name, earmarked for the child. This avoids the punitive minor tax rates. A family trust is another option for larger amounts. The key is to start early and invest regularly to maximise the benefit of compound growth.",
      },
      {
        question: "At what age can my child open their own brokerage account?",
        answer:
          "In Australia, you must be 18 years old to open a share trading account. Some brokers allow 16-17 year olds with parental consent, but this varies. Once your child turns 18, you can transfer investments to their own account.",
      },
    ],
  },
  {
    slug: "low-minimum-deposit",
    title: `Best Brokers With Low Minimum Deposit in Australia (${yr})`,
    h1: "Best Brokers With Low or No Minimum Deposit in Australia",
    metaDescription:
      `Australian brokers with low or $0 minimum deposit requirements. Start investing with any amount. ${upd}.`,
    intro:
      "You don't need thousands of dollars to start investing. Many Australian brokers have no minimum deposit at all, letting you begin with as little as $50. We've ranked the best low-barrier brokers by cost and features, so you can start building your portfolio today — whatever your budget.",
    filter: (b) => !b.is_crypto && (b.asx_fee_value ?? 999) <= 10,
    sort: (a, b) => (a.asx_fee_value ?? 999) - (b.asx_fee_value ?? 999),
    criteria: [
      "Low or no minimum deposit requirement",
      "ASX brokerage of $10 or less per trade",
      "ASIC-regulated broker",
      "Not a crypto-only exchange",
    ],
    sections: [
      {
        heading: "Do You Need a Minimum Deposit to Start Investing?",
        body: "Many Australian brokers have eliminated minimum deposit requirements entirely. You can open an account and fund it with any amount — even $10. Some brokers do require a minimum first trade size (typically $500 for ASX shares due to ASX marketable parcel rules), but there's no requirement to deposit a large lump sum upfront. This makes investing accessible to students, young professionals, and anyone starting out.",
      },
      {
        heading: "Why Brokerage Matters More Than Minimum Deposit",
        body: "Having no minimum deposit is only half the equation. If you're investing small amounts, brokerage fees matter enormously. A $10 fee on a $200 trade is 5% of your investment — wiped out before the share price even moves. With $0 brokerage, every dollar you invest goes to work immediately. When starting small, prioritise $0 or very low brokerage above all else.",
      },
      {
        heading: "Building a Portfolio With Small Amounts",
        body: "The key to successful small-amount investing is consistency. Invest a fixed amount regularly — even $50 per month adds up. Over 10 years at 7% annual growth, $50/month becomes roughly $8,600 on $6,000 contributed. Use a $0 brokerage broker, choose broad ETFs for instant diversification, and increase your contributions as your income grows. Starting small is infinitely better than not starting at all.",
      },
    ],
    relatedLinks: [
      { label: "Best for Beginners", href: "/best/beginners" },
      { label: "Best $0 Brokerage", href: "/best/free-brokerage" },
      { label: "Fee Calculator", href: "/calculators" },
      { label: "Compare All Platforms", href: "/compare" },
    ],
    faqs: [
      {
        question: "What is the minimum amount to start investing in Australia?",
        answer:
          "Many Australian brokers have no minimum deposit requirement. However, the ASX has a minimum 'marketable parcel' of $500 for initial share purchases. Some brokers offering fractional shares let you invest smaller amounts. You can start building a portfolio with as little as $50-100.",
      },
      {
        question: "Is it worth investing small amounts?",
        answer:
          "Absolutely. Thanks to $0 brokerage and compound growth, even $50 per month can grow into a meaningful portfolio over time. The most important factor is starting early and investing consistently. Small regular investments beat waiting until you have a 'big enough' lump sum.",
      },
      {
        question: "Which broker is best for small investors in Australia?",
        answer:
          "The best broker for small investors combines $0 or very low brokerage (so fees don't eat into small trades), no minimum deposit, and no inactivity fees. Check our ranked list above for the current best options based on verified fees.",
      },
    ],
  },
  {
    slug: "robo-advisors",
    title: `Best Robo-Advisors in Australia (${yr})`,
    h1: "Best Robo-Advisors in Australia",
    metaDescription:
      `Compare Australia's top robo-advisors. Automated portfolio management with Stockspot, Raiz, Spaceship & more. ${upd}.`,
    intro:
      `Robo-advisors automate your investing — you answer a few questions about your goals and risk tolerance, and the platform builds and rebalances a diversified portfolio for you. No stock picking, no decision fatigue. Here are Australia's best robo-advisors for ${yr}.`,
    filter: (b) => b.platform_type === "robo_advisor",
    sort: (a, b) => (b.rating ?? 0) - (a.rating ?? 0),
    criteria: [
      "Automated portfolio construction and rebalancing",
      "ASIC-regulated managed investment scheme or AFSL",
      "Transparent management fees disclosed",
      "Australian-based or serving Australian investors",
    ],
    sections: [
      {
        heading: "What Is a Robo-Advisor?",
        body: "A robo-advisor is a digital platform that uses algorithms to build and manage a diversified investment portfolio on your behalf. You typically complete a risk assessment questionnaire, and the platform allocates your money across a mix of ETFs covering Australian shares, international shares, bonds, and sometimes alternatives. The portfolio is automatically rebalanced as markets move, keeping your asset allocation on target without any effort from you.",
      },
      {
        heading: "Robo-Advisor Fees: What You're Paying For",
        body: "Robo-advisors charge a management fee (typically 0.20%–0.66% per year) on top of the underlying ETF fees (0.04%–0.30%). So your total cost is usually 0.40%–0.90% per year. Compare this to a financial adviser charging 1%+ annually, or actively managed funds charging 1.5%+. For hands-off investors, robo-advisors offer professional portfolio management at a fraction of the traditional cost.",
      },
      {
        heading: "Robo-Advisor vs DIY Investing",
        body: "If you're comfortable choosing your own ETFs and rebalancing periodically, DIY investing through a share broker is cheaper — you avoid the management fee. But many investors prefer the convenience of a robo-advisor: no research, no rebalancing decisions, no temptation to time the market. For amounts under $50,000, the fee difference is often less than $200 per year, which many find worthwhile for the peace of mind.",
      },
    ],
    relatedLinks: [
      { label: "Compare All Platforms", href: "/compare" },
      { label: "Best for Beginners", href: "/best/beginners" },
      { label: "Best for ETF Investing", href: "/best/etf-investing" },
      { label: "Research Tools", href: "/best/research-tools" },
    ],
    faqs: [
      {
        question: "What is the best robo-advisor in Australia?",
        answer:
          "The best robo-advisor depends on your investment amount and goals. Stockspot is popular for its long track record and transparent fees. Raiz appeals to micro-investors with its round-up feature. Spaceship targets younger investors with a tech-focused portfolio. Compare management fees, minimum investments, and portfolio options above.",
      },
      {
        question: "Are robo-advisors safe in Australia?",
        answer:
          "Yes. Australian robo-advisors operate under ASIC regulation and typically hold your investments in a separate trust, protected if the platform fails. Your money is invested in ETFs held by institutional custodians, not in the robo-advisor's own accounts.",
      },
      {
        question: "How much do robo-advisors cost in Australia?",
        answer:
          "Most Australian robo-advisors charge 0.20%–0.66% per year in management fees, plus underlying ETF fees of 0.04%–0.30%. On a $10,000 portfolio, that's roughly $40–$96 per year in total fees. This is significantly cheaper than traditional financial advisers or actively managed funds.",
      },
    ],
  },
  {
    slug: "research-tools",
    title: `Best Investment Research Tools in Australia (${yr})`,
    h1: "Best Investment Research Tools in Australia",
    metaDescription:
      `Compare Australia's top investment research platforms. Simply Wall St, TradingView, Morningstar & more. ${upd}.`,
    intro:
      `Good investment decisions start with good research. These platforms help you analyse stocks, screen for opportunities, and track market data — from visual dashboards to professional-grade charting. Here are the best research tools for Australian investors in ${yr}.`,
    filter: (b) => b.platform_type === "research_tool",
    sort: (a, b) => (b.rating ?? 0) - (a.rating ?? 0),
    criteria: [
      "Stock analysis, screening, or charting tools",
      "Coverage of ASX-listed securities",
      "Free tier or clear pricing structure",
      "Actively maintained and regularly updated",
    ],
    sections: [
      {
        heading: "Why Use a Dedicated Research Tool?",
        body: "Most brokers include basic research — company profiles, price charts, maybe analyst ratings. Dedicated research platforms go much deeper: visual financial analysis (Simply Wall St), professional charting with hundreds of indicators (TradingView), institutional-grade reports (Morningstar), or fundamental screening across thousands of metrics (Stock Doctor). If you're choosing individual stocks rather than ETFs, better research leads to better decisions.",
      },
      {
        heading: "Free vs Paid Research Platforms",
        body: "Most research tools offer a free tier with limited features, plus paid plans unlocking advanced analysis. Free tiers are often sufficient for casual investors who want basic company overviews. Paid plans ($10–$50/month) are worthwhile for active stock pickers who need detailed financials, screening tools, and real-time data. Consider your investing style before paying — if you only buy ETFs, you may not need a premium research subscription.",
      },
      {
        heading: "Combining Research Tools With Your Broker",
        body: "Many investors use a research platform alongside their broker — analyse stocks in one tool, execute trades in another. Some brokers integrate with third-party research (e.g., Morningstar reports inside CMC Markets). Others like TradingView connect directly to brokers for one-click trading from charts. The ideal setup depends on your workflow and how deeply you want to analyse before buying.",
      },
    ],
    relatedLinks: [
      { label: "Compare All Platforms", href: "/compare" },
      { label: "Best for Beginners", href: "/best/beginners" },
      { label: "Best Robo-Advisors", href: "/best/robo-advisors" },
      { label: "Best for Low Fees", href: "/best/low-fees" },
    ],
    faqs: [
      {
        question: "What is the best stock research tool in Australia?",
        answer:
          "It depends on your needs. Simply Wall St is best for visual fundamental analysis. TradingView leads for charting and technical analysis. Morningstar provides the most comprehensive analyst reports. Stock Doctor is popular with serious Australian stock pickers. Most offer free tiers to try before committing.",
      },
      {
        question: "Is Simply Wall St free?",
        answer:
          "Simply Wall St offers a limited free plan that lets you view basic analysis on a small number of stocks. The paid plan (from ~$10/month) unlocks full portfolio tracking, detailed financials, and unlimited company analysis. They frequently offer discounted annual plans.",
      },
      {
        question: "Do I need a research tool if I only buy ETFs?",
        answer:
          "Probably not. ETF investors typically don't need to analyse individual company financials. A basic comparison of ETF fees, holdings, and performance (available free on ETF issuer websites) is usually sufficient. Research tools are most valuable for investors picking individual stocks.",
      },
    ],
  },
  {
    slug: "etf-platforms",
    title: `Best Platforms for ETF Investing in Australia (${yr})`,
    h1: "Best Platforms for ETF Investing in Australia",
    metaDescription:
      `Compare the best platforms for building an ETF portfolio. Share brokers and robo-advisors for passive investing. ${upd}.`,
    intro:
      `Building an ETF portfolio? You have two paths: DIY through a share broker (pick your own ETFs, pay per trade) or automated through a robo-advisor (they pick and rebalance for you, charge an annual fee). Here are the best platforms for ETF investing in ${yr}, covering both approaches.`,
    filter: (b) =>
      b.platform_type === "robo_advisor" ||
      (!b.is_crypto && (b.asx_fee_value ?? 999) <= 10),
    sort: (a, b) => (b.rating ?? 0) - (a.rating ?? 0),
    criteria: [
      "Low-cost access to ASX-listed ETFs",
      "Suitable for regular DCA investing",
      "Robo-advisor OR share broker with sub-$10 brokerage",
      "ASIC-regulated platform",
    ],
    sections: [
      {
        heading: "DIY vs Automated ETF Investing",
        body: "DIY (share broker): You choose which ETFs to buy, place orders yourself, and rebalance manually. Costs are per-trade brokerage ($0–$10). Best for investors who want full control and are comfortable making their own decisions. Automated (robo-advisor): The platform selects and rebalances an ETF portfolio for you based on your risk profile. Costs are an annual management fee (0.20%–0.66%). Best for hands-off investors who want a 'set and forget' approach.",
      },
      {
        heading: "Best ETFs for Australian Portfolios",
        body: "Most Australian ETF portfolios are built around a few core holdings: an Australian market ETF (e.g., VAS, A200), a global market ETF (e.g., VGS, IWLD), and optionally a bond or property ETF for diversification. This 2–3 fund approach gives you exposure to thousands of companies worldwide at very low cost. Both DIY brokers and robo-advisors typically use similar ETF building blocks.",
      },
      {
        heading: "Total Cost Comparison: Broker vs Robo",
        body: "On a $20,000 portfolio invested monthly: A $0 brokerage DIY broker costs $0 per year in brokerage (you pay only ETF management fees of ~0.07%–0.20%). A robo-advisor charges 0.20%–0.66% on top of ETF fees, so $40–$132 more per year. The question is whether the convenience of automated rebalancing is worth that premium for you. For larger portfolios, the fee gap widens; for smaller ones, it's often negligible.",
      },
    ],
    relatedLinks: [
      { label: "Best Robo-Advisors", href: "/best/robo-advisors" },
      { label: "Best for Low Fees", href: "/best/low-fees" },
      { label: "Best for Beginners", href: "/best/beginners" },
      { label: "Compare All Platforms", href: "/compare" },
    ],
    faqs: [
      {
        question: "Should I use a robo-advisor or buy ETFs myself?",
        answer:
          "If you want zero effort and don't mind paying 0.20%–0.66% per year for automation, use a robo-advisor. If you're comfortable placing your own ETF orders monthly and want to save on fees, use a $0-brokerage share broker. Both approaches build diversified ETF portfolios — the difference is cost vs convenience.",
      },
      {
        question: "What is the cheapest way to invest in ETFs in Australia?",
        answer:
          "The cheapest approach is a $0-brokerage share broker combined with low-fee ETFs. This way you pay only the ETF management fee (as low as 0.04% for index funds). Robo-advisors add convenience but at a higher annual cost.",
      },
    ],
  },
  {
    slug: "micro-investing",
    title: `Best Micro-Investing Apps in Australia (${yr})`,
    h1: "Best Micro-Investing Apps in Australia",
    metaDescription:
      `Compare Australian micro-investing apps. Invest spare change and small amounts with Raiz, Spaceship & more. ${upd}.`,
    intro:
      `Micro-investing apps let you start with as little as $5, rounding up everyday purchases or investing small amounts regularly. They lower the barrier to entry for new investors who want to start building wealth without needing thousands of dollars upfront. Here are Australia's best micro-investing options.`,
    filter: (b) =>
      b.platform_type === "robo_advisor" ||
      (b.asx_fee_value === 0 && !b.is_crypto),
    sort: (a, b) => (b.rating ?? 0) - (a.rating ?? 0),
    criteria: [
      "Low or no minimum investment (under $50)",
      "Round-up or small-amount investing features",
      "$0 brokerage or included in management fee",
      "ASIC-regulated platform",
    ],
    sections: [
      {
        heading: "What Is Micro-Investing?",
        body: "Micro-investing platforms let you invest very small amounts — often by rounding up everyday purchases (e.g., a $4.50 coffee rounds to $5, and the $0.50 goes into your portfolio). Others simply allow minimum investments of $1–$5. The idea is to make investing effortless and habitual, turning spare change into a growing portfolio over time.",
      },
      {
        heading: "Round-Ups: Do They Actually Add Up?",
        body: "If you make 5 purchases per day averaging $0.50 in round-ups, that's about $75 per month or $900 per year invested automatically. Over 10 years at 7% annual growth, that grows to roughly $12,500. It's not a retirement strategy on its own, but it's an excellent way to build the investing habit and create a starter portfolio. Many users graduate from round-ups to larger regular investments once they see their portfolio grow.",
      },
      {
        heading: "Watch the Fees on Small Balances",
        body: "Some micro-investing apps charge a flat monthly fee ($2–$5/month). On a $500 balance, a $3.50/month fee equals 8.4% per year — far more than any investment return. These fees only become reasonable as your balance grows. Compare percentage-based fee structures, which scale proportionally, with flat fees that disproportionately impact small balances.",
      },
    ],
    relatedLinks: [
      { label: "Best Robo-Advisors", href: "/best/robo-advisors" },
      { label: "Best for Beginners", href: "/best/beginners" },
      { label: "Best $0 Brokerage", href: "/best/free-brokerage" },
      { label: "Compare All Platforms", href: "/compare" },
    ],
    faqs: [
      {
        question: "What is the best micro-investing app in Australia?",
        answer:
          "Raiz is the most well-known Australian micro-investing app with its round-up feature. Spaceship offers low-minimum investing with a tech-focused portfolio. $0-brokerage share brokers also work for micro-investing if you're comfortable choosing your own investments. Compare fees carefully — flat monthly fees can eat into small balances.",
      },
      {
        question: "Is micro-investing worth it?",
        answer:
          "Yes, as a starting point. Micro-investing builds the habit of regular investing and grows your portfolio with money you wouldn't notice missing. However, for meaningful wealth building, you'll eventually want to increase your contributions beyond just round-ups. Think of micro-investing as the gateway, not the destination.",
      },
      {
        question: "How much can I make with round-up investing?",
        answer:
          "It depends on your spending habits. Typical round-ups add $50–$150 per month. Invested at 7% annual growth over 10 years, $100/month becomes roughly $17,000. It's a useful supplement but should be combined with regular contributions for serious wealth building.",
      },
    ],
  },
  // ──────────────────────────────────────────────
  // Super Funds
  // ──────────────────────────────────────────────
  {
    slug: "super-funds",
    title: `Best Super Funds in Australia (${yr})`,
    h1: "Best Super Funds in Australia",
    metaDescription:
      `Compare Australia's top super funds. Fees, performance, insurance, and investment options reviewed. ${upd}.`,
    intro:
      `Superannuation is your single largest investment outside your home — yet most Australians never actively choose their fund. Switching to a better-performing, lower-fee super fund can mean tens of thousands more at retirement. Here are Australia's best super funds for ${yr}.`,
    filter: (b) => b.platform_type === "super_fund",
    sort: (a, b) => (b.rating ?? 0) - (a.rating ?? 0),
    criteria: [
      "APRA-regulated super fund or AFSL holder",
      "Competitive total fees (admin + investment)",
      "Strong long-term investment performance",
      "Quality insurance and member services",
    ],
    sections: [
      {
        heading: "Why Your Super Fund Choice Matters",
        body: "A 25-year-old earning $70,000 with a high-fee fund (1.5% total fees) versus a low-fee fund (0.5% total fees) can retire with $200,000+ less — just from the fee difference compounding over 40 years. Performance matters too: the gap between the best and worst performing balanced super funds over 10 years is often 2%+ per year. Choosing the right fund is one of the highest-impact financial decisions you can make.",
      },
      {
        heading: "Industry Funds vs Retail Funds vs SMSFs",
        body: "Industry funds (AustralianSuper, HESTA, Cbus) are run as member-owned not-for-profit and typically have lower fees. Retail funds (Colonial First State, MLC) are run by banks/insurers and offer more investment choice but at higher average fees. Self-Managed Super Funds (SMSFs) give you total control but cost $2,000-5,000+ per year to run and are only cost-effective for balances above $200,000-500,000. Most Australians are best served by a high-performing industry fund.",
      },
      {
        heading: "How to Compare Super Funds",
        body: "Focus on three things: total fees (admin fee + investment option fees + insurance premiums), long-term performance (10-year returns of the 'balanced' or 'growth' option), and insurance (default life and TPD cover). Don't just compare headline returns — check whether those returns are after fees and taxes. The ATO's YourSuper comparison tool is a useful starting point, and we build on it with deeper analysis above.",
      },
    ],
    relatedLinks: [
      { label: "Best for SMSF", href: "/best/smsf" },
      { label: "Robo-Advisors", href: "/best/robo-advisors" },
      { label: "Fee Calculator", href: "/calculators" },
      { label: "Compare All Platforms", href: "/compare" },
    ],
    faqs: [
      {
        question: "What is the best performing super fund in Australia?",
        answer:
          "Performance varies year to year, but over 10-year periods, funds like AustralianSuper, Hostplus, UniSuper, and QSuper have consistently ranked among the top performers for their balanced/growth options. Past performance doesn't guarantee future results, but consistent long-term outperformance is a strong signal.",
      },
      {
        question: "Should I switch super funds?",
        answer:
          "If your current fund has high fees and below-average returns compared to alternatives, switching can save you tens of thousands by retirement. Before switching, check whether you'll lose any insurance benefits, and make sure your new fund's insurance cover meets your needs. Rolling over is free and takes 3-5 business days.",
      },
      {
        question: "How much super should I have at my age?",
        answer:
          "As a rough guide: at 30 you might expect $50,000-80,000, at 40 around $150,000-250,000, and at 50 around $300,000-500,000. These vary widely depending on salary, contribution history, and fund performance. The key is whether you're on track for a comfortable retirement — the ASFA Retirement Standard estimates singles need ~$595,000 and couples ~$690,000 at retirement.",
      },
    ],
  },
  // ──────────────────────────────────────────────
  // Property Investing
  // ──────────────────────────────────────────────
  {
    slug: "property-investing",
    title: `Best Property Investing Platforms in Australia (${yr})`,
    h1: "Best Property Investing Platforms in Australia",
    metaDescription:
      `Compare fractional property, REITs, and property investment platforms in Australia. Invest in property from $100. ${upd}.`,
    intro:
      `Property investing no longer requires a $500,000 deposit. Fractional property platforms, REITs, and property syndicates let you invest in Australian real estate from as little as $100. Here are the best property investing platforms for ${yr}.`,
    filter: (b) => b.platform_type === "property_platform",
    sort: (a, b) => (b.rating ?? 0) - (a.rating ?? 0),
    criteria: [
      "ASIC or APRA regulated platform",
      "Transparent fee structure and property reporting",
      "Track record of distributions or capital returns",
      "Accessible minimum investment under $10,000",
    ],
    sections: [
      {
        heading: "Ways to Invest in Property Without Buying a House",
        body: "You don't need to buy a whole property to benefit from real estate returns. REITs (Real Estate Investment Trusts) trade on the ASX like shares and give you exposure to commercial property portfolios. Fractional property platforms like BrickX let you buy 'bricks' in specific residential properties. Property syndicates pool investor money to buy commercial or development sites. Each approach has different risk, return, and liquidity profiles.",
      },
      {
        heading: "REITs vs Fractional Property vs Direct Investment",
        body: "REITs are the most liquid — you can buy and sell on the ASX any trading day. They typically hold diversified portfolios of commercial property (offices, warehouses, retail). Fractional platforms offer exposure to specific residential properties but with less liquidity. Direct property investment gives you full control but requires large capital, a mortgage, and active management. For most investors, REITs offer the best combination of diversification, liquidity, and low minimum investment.",
      },
      {
        heading: "Property vs Shares: The Australian Debate",
        body: "Australians love property, but the data tells an interesting story. Over 30-year periods, Australian shares and property have delivered similar total returns (7-10% per year including income). Shares are more liquid, more diversified, and cheaper to access. Property offers leverage (via a mortgage) and tax benefits like negative gearing. A balanced portfolio can include both — and you don't need a mortgage to get property exposure through REITs and fractional platforms.",
      },
    ],
    relatedLinks: [
      { label: "Best Robo-Advisors", href: "/best/robo-advisors" },
      { label: "Best for ETF Investing", href: "/best/etf-platforms" },
      { label: "Compare All Platforms", href: "/compare" },
      { label: "Fee Calculator", href: "/calculators" },
    ],
    faqs: [
      {
        question: "Can I invest in property with $1,000 in Australia?",
        answer:
          "Yes. ASX-listed REITs can be purchased for the price of a single unit (often under $20). Fractional property platforms like BrickX have minimums as low as $50-100. These let you build property exposure gradually without needing a deposit for a physical property.",
      },
      {
        question: "What is the best REIT in Australia?",
        answer:
          "Popular Australian REITs include Goodman Group (industrial/logistics), Scentre Group (retail), and Stockland (diversified). Vanguard's VAP ETF gives you diversified exposure across all major ASX-listed REITs in a single trade. The best choice depends on whether you want income (higher-yielding REITs) or growth.",
      },
      {
        question: "Is fractional property investing safe?",
        answer:
          "Fractional platforms in Australia must hold an AFSL and operate under ASIC regulation. Your investment is typically held in a trust structure. However, fractional property is less liquid than REITs — you may have to wait to sell your 'bricks'. Understand the platform's liquidity mechanism before investing.",
      },
    ],
  },
  // ──────────────────────────────────────────────
  // CFD & Forex
  // ──────────────────────────────────────────────
  {
    slug: "cfd-forex",
    title: `Best CFD & Forex Brokers in Australia (${yr})`,
    h1: "Best CFD and Forex Brokers in Australia",
    metaDescription:
      `Compare ASIC-regulated CFD and forex brokers. Spreads, leverage, platforms and risk warnings reviewed. ${upd}.`,
    intro:
      `CFDs and forex allow you to trade global markets with leverage — amplifying both gains and losses. These products are complex and high-risk: ASIC data shows that 60-80% of retail CFD accounts lose money. If you understand the risks, here are Australia's best-regulated CFD and forex brokers for ${yr}.`,
    filter: (b) => b.platform_type === "cfd_forex",
    sort: (a, b) => (b.rating ?? 0) - (a.rating ?? 0),
    criteria: [
      "ASIC-regulated with current AFSL",
      "Competitive spreads on major pairs and indices",
      "Professional-grade trading platform (MT4/MT5 or proprietary)",
      "Negative balance protection for retail clients",
    ],
    sections: [
      {
        heading: "What Are CFDs and Forex?",
        body: "CFDs (Contracts for Difference) let you speculate on price movements of shares, indices, commodities, and currencies without owning the underlying asset. Forex (foreign exchange) is the trading of currency pairs like AUD/USD. Both use leverage — meaning you can control a large position with a smaller amount of capital. This magnifies both profits and losses. ASIC caps retail leverage at 30:1 for major forex pairs and 20:1 for indices.",
      },
      {
        heading: "Risk Warning: Most Retail Traders Lose Money",
        body: "ASIC requires all CFD brokers to disclose the percentage of retail accounts that lose money. Most report figures between 60-80%. CFD and forex trading is not investing in the traditional sense — it's short-term speculation with significant risk of losing your entire deposit. Only trade with money you can afford to lose, use stop-loss orders, and never trade with money needed for living expenses.",
      },
      {
        heading: "Choosing a Regulated CFD Broker",
        body: "Always use an ASIC-regulated broker for CFD and forex trading. ASIC provides protections including leverage caps, negative balance protection (so you can't lose more than your deposit), and client money segregation. Offshore brokers may offer higher leverage but provide none of these protections. Key factors to compare: spreads on your preferred instruments, platform quality, overnight funding rates, and customer support availability during Australian trading hours.",
      },
    ],
    relatedLinks: [
      { label: "Compare All Platforms", href: "/compare" },
      { label: "Best for US Shares", href: "/best/us-shares" },
      { label: "Best for Day Trading", href: "/best/day-trading" },
      { label: "Research Tools", href: "/best/research-tools" },
    ],
    faqs: [
      {
        question: "What is the best CFD broker in Australia?",
        answer:
          "The best CFD broker depends on what you trade. For forex, look at spreads on major pairs (EUR/USD, AUD/USD). For indices, compare spreads on ASX 200 and S&P 500 CFDs. All brokers listed above are ASIC-regulated with negative balance protection for retail clients. Compare platforms (MT4/MT5), fees, and available instruments.",
      },
      {
        question: "Is CFD trading legal in Australia?",
        answer:
          "Yes. CFDs are legal and regulated by ASIC in Australia. Since 2021, ASIC has imposed stricter rules including leverage caps (30:1 for major forex), mandatory negative balance protection, and bans on incentive offers to retail traders. These rules aim to protect retail traders from excessive losses.",
      },
      {
        question: "How much money do you need to start CFD trading?",
        answer:
          "Most Australian CFD brokers have minimums of $200-500 to open an account. However, starting with a small balance and high leverage is extremely risky. Financial professionals often suggest only trading with money you can afford to lose entirely, and starting with a demo account to learn the platform.",
      },
    ],
  },
  // ──────────────────────────────────────────────
  // Credit Cards for Investors
  // ──────────────────────────────────────────────
  {
    slug: "credit-cards-investors",
    title: `Best Credit Cards for Investors in Australia (${yr})`,
    h1: "Best Credit Cards for Australian Investors",
    metaDescription:
      `Credit cards with no FX fees, cashback, and rewards optimised for investors. Not all 250 cards — just the 10-15 that matter. ${upd}.`,
    intro:
      `You don't need a generic credit card comparison — you need cards that work for your investing lifestyle. No FX fees when buying US shares, cashback that compounds your returns, and travel rewards from international broker spending. Here are the credit cards that actually matter for Australian investors.`,
    filter: () => false, // Placeholder — credit cards aren't in the brokers table
    sort: (a, b) => (b.rating ?? 0) - (a.rating ?? 0),
    criteria: [
      "No or low foreign transaction fees (for international trading)",
      "Cashback or rewards on everyday spending",
      "No annual fee or high-value offset with rewards",
      "Complementary to an investing strategy",
    ],
    sections: [
      {
        heading: "Why Investors Need Different Credit Cards",
        body: "If you're buying US shares through an international broker or funding a Wise account to convert AUD, foreign transaction fees (typically 2-3%) add up fast. A no-FX-fee card saves you money every time you move money internationally. Cashback cards can funnel extra money into your investments — $500-1,000 per year of cashback reinvested over decades compounds significantly.",
      },
      {
        heading: "Best Cards for No Foreign Transaction Fees",
        body: "A handful of Australian credit cards charge 0% on foreign currency transactions. These are invaluable if you use international brokers, travel for investing conferences, or pay for overseas research subscriptions. Cards from ING, Bankwest, and 28 Degrees have consistently offered no-FX-fee products. Always check the current fee schedule as these change periodically.",
      },
      {
        heading: "Cashback vs Points: What's Better for Investors?",
        body: "For investors, cashback is usually more valuable than points. Cashback gives you real money you can invest immediately. Points are worth variable amounts depending on how you redeem them, and devaluations happen regularly. A 1.5% cashback card earning $1,200/year in cashback, invested at 7% annual growth for 20 years, becomes roughly $52,000. That's the power of combining card rewards with compound investing.",
      },
    ],
    relatedLinks: [
      { label: "Best for Low FX Fees", href: "/best/low-fx-fees" },
      { label: "Best for US Shares", href: "/best/us-shares" },
      { label: "Fee Calculator", href: "/calculators" },
      { label: "Compare All Platforms", href: "/compare" },
    ],
    faqs: [
      {
        question: "What credit card is best for buying international shares?",
        answer:
          "Look for a card with zero foreign transaction fees. Most funding of international broker accounts is done via bank transfer or Wise, not credit card — but for platform subscriptions, research tools, and travel, a no-FX-fee card saves 2-3% per transaction.",
      },
      {
        question: "Can I use a credit card to buy shares?",
        answer:
          "Most Australian brokers don't accept credit card payments for share purchases. You typically need to fund your account via bank transfer (BPAY, direct debit, or PayID). Some crypto exchanges accept credit cards but often charge higher fees. It's generally not advisable to use borrowed money (credit) to invest.",
      },
      {
        question: "Is cashback better than frequent flyer points for investors?",
        answer:
          "Generally yes. Cashback has a fixed, transparent value you can reinvest immediately. Frequent flyer points are subject to devaluations and restrictions. However, if you travel frequently for investing events or international research, premium travel cards may offer better value through lounge access and travel insurance.",
      },
    ],
  },
  // ──────────────────────────────────────────────
  // Savings Accounts for Investors
  // ──────────────────────────────────────────────
  {
    slug: "savings-accounts",
    title: `Best Savings Accounts for Investors in Australia (${yr})`,
    h1: "Best Savings Accounts for Investors",
    metaDescription:
      `High-interest savings accounts for parking cash before investing. Emergency fund and opportunity fund options compared. ${upd}.`,
    intro:
      `Every investor needs a place to park cash — whether it's an emergency fund, a war chest for buying dips, or settlement cash between trades. The interest rate on that cash matters. Here are the best savings accounts for Australian investors.`,
    filter: (b) => b.platform_type === "savings_account", // Now has real savings account data
    sort: (a, b) => (b.rating ?? 0) - (a.rating ?? 0),
    criteria: [
      "Competitive interest rate (at or above RBA cash rate)",
      "No or low conditions for earning bonus interest",
      "Easy withdrawals for investing when opportunities arise",
      "ADI regulated (deposits protected up to $250,000)",
    ],
    sections: [
      {
        heading: "Why Investors Need a High-Interest Savings Account",
        body: "Smart investors keep 3-6 months of expenses in an emergency fund, plus cash ready to deploy when opportunities arise. Parking this cash at 0.01% in a transaction account means losing purchasing power to inflation. A high-interest savings account earning 5%+ means your cash reserve is working while it waits. On $20,000, the difference between 0.01% and 5.3% is over $1,000 per year — that's real money left on the table.",
      },
      {
        heading: "Emergency Fund vs Opportunity Fund",
        body: "Your emergency fund (3-6 months expenses) should be in an account with no withdrawal conditions. Your opportunity fund (cash earmarked for investing) can tolerate slight restrictions like 'deposit $1,000/month' bonus interest conditions, since you're adding to it regularly anyway. Some investors maintain two accounts: one unconditional for emergencies, one with bonus conditions for higher interest on investing reserves.",
      },
      {
        heading: "Term Deposits vs Savings Accounts for Investors",
        body: "Term deposits lock your money for 3-12 months at a fixed rate. Savings accounts offer instant access. For investors, flexibility usually beats a slightly higher rate — you don't want to miss a buying opportunity because your cash is locked in a 12-month term deposit. Exception: if you have a large, defined sum you won't need for a known period, a term deposit removes the temptation to invest it prematurely.",
      },
    ],
    relatedLinks: [
      { label: "Compare All Platforms", href: "/compare" },
      { label: "Best for Beginners", href: "/best/beginners" },
      { label: "Fee Calculator", href: "/calculators" },
      { label: "Robo-Advisors", href: "/best/robo-advisors" },
    ],
    faqs: [
      {
        question: "How much cash should an investor keep in savings?",
        answer:
          "A common guideline is 3-6 months of living expenses as an emergency fund, plus any cash you're accumulating for your next investment. The total depends on your income stability, risk tolerance, and whether you have other liquid assets. Some investors keep 5-10% of their portfolio in cash as an 'opportunity fund' for market dips.",
      },
      {
        question: "Should I put spare cash in a savings account or invest it?",
        answer:
          "Cash needed within 1-2 years should generally stay in savings. Money you won't need for 5+ years is usually better invested (historically, shares have outperformed savings accounts over long periods). Cash for 2-5 years is a judgement call based on your risk tolerance and market conditions.",
      },
      {
        question: "Are savings accounts safe in Australia?",
        answer:
          "Deposits up to $250,000 per person per ADI (Authorised Deposit-taking Institution) are guaranteed by the Australian Government's Financial Claims Scheme. This makes savings accounts one of the safest places for your cash — the guarantee covers bank, credit union, and building society deposits.",
      },
    ],
  },
  // ──────────────────────────────────────────────
  // Money Transfer Services
  // ──────────────────────────────────────────────
  {
    slug: "money-transfers",
    title: `Best Money Transfer Services for Investors (${yr})`,
    h1: "Best Money Transfer Services for Australian Investors",
    metaDescription:
      `Compare Wise, OFX, and Revolut for funding international broker accounts. Cheapest AUD to USD conversion rates. ${upd}.`,
    intro:
      `Buying US or international shares? You need to convert AUD to USD (or other currencies) — and your broker's built-in FX rate is usually the most expensive option. Dedicated money transfer services like Wise, OFX, and Revolut can save you 0.5-2% per transfer. Here's how to fund your international broker for less.`,
    filter: () => false, // Placeholder — money transfer services aren't in the brokers table
    sort: (a, b) => (b.rating ?? 0) - (a.rating ?? 0),
    criteria: [
      "Competitive AUD/USD conversion rates",
      "Low or transparent transfer fees",
      "Fast settlement (1-2 business days)",
      "ASIC or AUSTRAC regulated",
    ],
    sections: [
      {
        heading: "Why Your Broker's FX Rate Costs You Money",
        body: "Most brokers mark up the mid-market exchange rate by 0.5-0.7% (some charge 1%+). On a $10,000 AUD to USD conversion, that's $50-100+ in hidden fees. Dedicated transfer services like Wise typically charge 0.4-0.6% total, and you can see the exact fee before sending. Over a year of regular investing in US shares, switching to Wise or OFX can save hundreds of dollars.",
      },
      {
        heading: "How to Fund an International Broker Account",
        body: "The typical flow: Open a Wise (or similar) account → convert AUD to USD at the mid-market rate → transfer USD to your broker's US bank account. This usually takes 1-2 business days and costs 0.4-0.6% total. Compare this to your broker's built-in conversion which might charge 0.7%+ but is instant. For large or regular transfers, the external route saves meaningful money.",
      },
      {
        heading: "Wise vs OFX vs Revolut for Investors",
        body: "Wise is the most popular for small-to-medium transfers (under $50,000) with transparent pricing and a multi-currency account. OFX specialises in larger transfers ($10,000+) and often offers better rates for bigger amounts with no transfer fees. Revolut offers competitive rates but with monthly limits on fee-free exchanges. For regular US share investing, Wise's simplicity and consistency make it the default choice for most Australian investors.",
      },
    ],
    relatedLinks: [
      { label: "Best for US Shares", href: "/best/us-shares" },
      { label: "Best for Low FX Fees", href: "/best/low-fx-fees" },
      { label: "Best for International Shares", href: "/best/international-shares" },
      { label: "FX Calculator", href: "/calculators?calc=fx" },
    ],
    faqs: [
      {
        question: "What is the cheapest way to convert AUD to USD for investing?",
        answer:
          "Wise typically offers the most competitive rates for amounts under $50,000, charging around 0.4-0.6% total. For larger amounts ($50,000+), OFX often provides better rates with dedicated dealing support. Both are significantly cheaper than most broker's built-in FX conversion.",
      },
      {
        question: "Can I use Wise to fund my Interactive Brokers account?",
        answer:
          "Yes. Many Australian investors use Wise to convert AUD to USD, then transfer the USD to their Interactive Brokers (or Stake, Schwab, etc.) account. This avoids the broker's FX markup. The process typically takes 1-2 business days for the funds to arrive.",
      },
      {
        question: "Is it worth using a money transfer service for small amounts?",
        answer:
          "For amounts under $1,000, the savings may only be $5-10 per transfer. If you invest regularly, those savings compound — $10 saved per month over 20 years invested at 7% becomes roughly $5,200. For irregular small transfers, the convenience of your broker's built-in conversion may outweigh the cost difference.",
      },
    ],
  },
  {
    slug: "term-deposits",
    title: `Best Term Deposit Rates in Australia (${yr})`,
    h1: "Best Term Deposit Rates",
    metaDescription:
      `Compare the highest term deposit rates in Australia for 2026. Judo Bank, ING, Macquarie and more. All government guaranteed to $250,000. ${upd}.`,
    intro:
      `Term deposits lock your money at a fixed rate for a set period — 3 months to 5 years. They're ideal for investors who have a defined sum they won't need and want guaranteed returns with zero market risk. Here are the best rates available right now.`,
    filter: (b) => b.platform_type === "term_deposit",
    sort: (a, b) => (b.rating ?? 0) - (a.rating ?? 0),
    criteria: [
      "Highest rate for 6-month and 12-month terms",
      "Government guarantee (ADI regulated, deposits protected to $250,000)",
      "Reasonable minimum deposit ($1,000 or less preferred)",
      "Flexible term options (3, 6, 9, 12 months minimum)",
    ],
    sections: [
      {
        heading: "How Term Deposits Work",
        body: "You deposit a lump sum with a bank for a fixed term (e.g., 6 months). The bank pays a guaranteed interest rate for that period. At maturity, you get your principal plus interest. The rate is locked in at the time of deposit — it won't go up or down regardless of what the RBA does during your term. All Australian ADI-regulated term deposits are government guaranteed up to $250,000 per person per institution.",
      },
      {
        heading: "When to Choose a Term Deposit Over a Savings Account",
        body: "Term deposits typically pay 0.2-0.5% more than the best savings accounts. The trade-off is you can't access your money during the term without paying an early withdrawal penalty (usually forfeiting most of the interest). Choose a term deposit when: you have a defined sum you won't need for a known period, you want rate certainty (savings rates can drop), or you want to remove the temptation to spend or invest the money prematurely.",
      },
      {
        heading: "Laddering Strategy for Investors",
        body: "Rather than locking all your cash in one term deposit, spread it across multiple terms (e.g., 3-month, 6-month, 12-month). As each matures, reinvest at the best available rate. This gives you regular access to portions of your cash while still earning competitive rates. It also protects against rate changes — if rates drop, only a portion of your deposits renew at the lower rate.",
      },
    ],
    relatedLinks: [
      { label: "Best Savings Accounts", href: "/best/savings-accounts" },
      { label: "Compare All Platforms", href: "/compare" },
      { label: "Portfolio Calculator", href: "/portfolio-calculator" },
    ],
    faqs: [
      {
        question: "Are term deposits government guaranteed in Australia?",
        answer:
          "Yes. All term deposits with Australian ADI-regulated banks are covered by the Financial Claims Scheme, which guarantees deposits up to $250,000 per person per institution. This is backed by the Australian Government.",
      },
      {
        question: "What happens if I withdraw early from a term deposit?",
        answer:
          "Early withdrawal penalties vary by bank. Most will reduce the interest rate significantly — often to the base savings rate or lower. Some banks charge a flat penalty. Always check the early withdrawal terms before locking in.",
      },
      {
        question: "Should I choose a 6-month or 12-month term deposit?",
        answer:
          "If you think interest rates will rise, choose shorter terms so you can reinvest at higher rates sooner. If you think rates will fall, lock in a longer term at today's rate. Currently, 6-month and 12-month rates are very similar in Australia, so the main consideration is when you'll need the money.",
      },
    ],
  },

  // ═══════════════════════════════════════════
  // NEW PROGRAMMATIC SEO CATEGORIES
  // High-intent long-tail keywords
  // ═══════════════════════════════════════════

  {
    slug: "cheapest-broker",
    title: `Cheapest Online Broker Australia (${yr})`,
    h1: "Cheapest Online Broker in Australia",
    metaDescription: `Compare Australia's cheapest brokers by total cost. $0 brokerage platforms ranked by ASX fees, FX rates, and hidden charges. ${upd}.`,
    intro: `Looking for the absolute cheapest way to trade shares in Australia? We've calculated the total annual cost of each broker based on typical trading patterns — not just headline brokerage, but FX fees, inactivity fees, and platform charges. Here are the genuinely cheapest options for ${yr}.`,
    filter: (b) => !b.is_crypto && b.platform_type === "share_broker" && (b.asx_fee_value ?? 999) <= 15,
    sort: (a, b) => (a.asx_fee_value ?? 999) - (b.asx_fee_value ?? 999),
    criteria: ["ASX brokerage under $15", "Low or no FX fees for international trades", "No inactivity or platform fees", "Transparent fee schedule"],
    sections: [
      { heading: "What Makes a Broker 'Cheap'?", body: "Headline brokerage is just one part of the cost. A broker advertising $0 ASX trades might charge 0.7% on FX conversions for US trades — that's $70 on a $10,000 US share purchase. We compare the total cost including brokerage, FX fees, inactivity fees, and account maintenance charges." },
      { heading: "Is $0 Brokerage Really Free?", body: "Several Australian brokers now offer genuine $0 ASX brokerage with no catch. However, they make money elsewhere — usually through wider spreads on US shares, FX conversion margins, or premium subscription tiers. For pure ASX trading, these are genuinely the cheapest option." },
      { heading: "How to Calculate Your Real Trading Cost", body: "Use our switching calculator to enter your trading frequency, average trade size, and US allocation. It calculates the true annual cost with each broker. A trader doing 2 ASX trades per month at $2,000 each might pay $0 with one broker and $720 with another — same trades, same shares." },
    ],
    relatedLinks: [{ label: "Switching Calculator", href: "/switching-calculator" }, { label: "Compare All Fees", href: "/compare" }, { label: "Free Brokerage", href: "/best/free-brokerage" }],
    faqs: [
      { question: "What is the cheapest broker in Australia?", answer: "The cheapest Australian broker for ASX trades offers $0 brokerage. For US shares, cost depends on FX conversion rates. Use our switching calculator to find the cheapest broker for your specific trading pattern." },
      { question: "Is there a catch with $0 brokerage?", answer: "Most $0 brokerage brokers make money on FX margins for international trades and premium features. For ASX-only investors, there's genuinely no catch — your trades execute at market price with no brokerage fee." },
    ],
  },
  {
    slug: "asx-trading-platform",
    title: `Best ASX Trading Platform Australia (${yr})`,
    h1: "Best ASX Trading Platform",
    metaDescription: `Top ASX share trading platforms compared. Fees, CHESS sponsorship, tools, and safety. Independent ratings from our editorial team. ${upd}.`,
    intro: `Choosing an ASX trading platform means balancing fees, platform quality, safety features, and available tools. We test every platform hands-on and rate them across our standardised methodology. Here are the best ASX platforms for ${yr}.`,
    filter: (b) => !b.is_crypto && b.platform_type === "share_broker",
    sort: (a, b) => (b.rating ?? 0) - (a.rating ?? 0),
    criteria: ["Access to ASX-listed shares and ETFs", "Tested and rated by our editorial team", "Regulated by ASIC with AFSL", "Clear fee schedule published online"],
    sections: [
      { heading: "What to Look for in an ASX Platform", body: "The best ASX platforms offer reliable order execution, real-time pricing, a solid mobile app, and CHESS sponsorship. CHESS sponsorship means your shares are held in your name on the ASX register — essential for protecting your investments if the broker fails." },
      { heading: "Commission-Free vs Premium Platforms", body: "Australian investors now have a choice between $0 brokerage platforms and premium platforms with professional tools. If you're a buy-and-hold investor making monthly purchases, a commission-free platform saves you hundreds per year. If you're an active trader who needs advanced charting and Level 2 data, a premium platform may be worth the extra cost." },
    ],
    relatedLinks: [{ label: "Cheapest Broker", href: "/best/cheapest-broker" }, { label: "CHESS Sponsored", href: "/best/chess-sponsored" }, { label: "Compare All", href: "/compare" }],
    faqs: [
      { question: "What is the best platform to buy shares in Australia?", answer: "The best ASX platform depends on your needs. Our top-rated platform balances low fees, strong safety features, and a user-friendly interface. See our full comparison above." },
      { question: "Is CommSec still the best ASX broker?", answer: "CommSec remains Australia's most well-known broker and offers CHESS sponsorship, but newer platforms now offer better fees and modern mobile apps. CommSec's $29.95 brokerage is significantly higher than competitors offering $0-$5 per trade." },
    ],
  },
  {
    slug: "bitcoin-exchange",
    title: `Best Bitcoin Exchange Australia (${yr})`,
    h1: "Best Bitcoin Exchange in Australia",
    metaDescription: `Top Australian Bitcoin exchanges compared. Fees, security, AUSTRAC registration, and ease of use. ${upd}.`,
    intro: `Buying Bitcoin in Australia requires an AUSTRAC-registered exchange. We compare the major Australian exchanges by fees, security features, supported payment methods, and ease of use for both first-time and experienced crypto investors.`,
    filter: (b) => b.is_crypto || b.platform_type === "crypto_exchange",
    sort: (a, b) => (b.rating ?? 0) - (a.rating ?? 0),
    criteria: ["AUSTRAC registered as a digital currency exchange", "Supports AUD deposits via PayID or bank transfer", "Reasonable trading fees (under 1%)", "Strong security (2FA, cold storage)"],
    sections: [
      { heading: "How to Buy Bitcoin in Australia", body: "To buy Bitcoin in Australia: 1) Choose an AUSTRAC-registered exchange, 2) Verify your identity (driver's licence or passport), 3) Deposit AUD via PayID or bank transfer, 4) Place a buy order for Bitcoin. Most exchanges complete this process within 24 hours." },
      { heading: "Exchange Fees Compared", body: "Australian crypto exchange fees typically range from 0.1% to 1% per trade. The cheapest exchanges charge 0.1-0.2% maker/taker fees, while the most expensive charge 1% or more. For a $1,000 Bitcoin purchase, that's a difference of $1 vs $10 in fees." },
      { heading: "Security: What to Look For", body: "The safest Australian exchanges store the majority of customer crypto in offline cold storage, require two-factor authentication, and are registered with AUSTRAC. Crypto is not covered by any government guarantee — if an exchange is hacked, you may lose your funds." },
    ],
    relatedLinks: [{ label: "Compare Crypto Exchanges", href: "/compare?filter=crypto" }, { label: "Crypto Risk Guide", href: "/articles" }, { label: "All Crypto Platforms", href: "/best/crypto" }],
    faqs: [
      { question: "What is the best Bitcoin exchange in Australia?", answer: "The best Australian Bitcoin exchange balances low fees, AUSTRAC registration, strong security, and easy AUD deposits. See our ranked comparison above." },
      { question: "Is Bitcoin legal in Australia?", answer: "Yes, Bitcoin is legal in Australia. Crypto exchanges must register with AUSTRAC as digital currency exchanges. However, crypto is not considered legal tender and is treated as property for tax purposes by the ATO." },
    ],
  },
  {
    slug: "cheapest-crypto-exchange",
    title: `Cheapest Crypto Exchange Australia (${yr})`,
    h1: "Cheapest Crypto Exchange in Australia",
    metaDescription: `Lowest fee crypto exchanges in Australia compared. Trading fees, deposit costs, and spread markups ranked. ${upd}.`,
    intro: `Crypto exchange fees can range from 0.1% to over 2% per trade. On a $10,000 portfolio, that's the difference between $10 and $200 per round trip. We rank Australian exchanges by their true trading cost including spreads.`,
    filter: (b) => b.is_crypto || b.platform_type === "crypto_exchange",
    sort: (a, b) => (a.asx_fee_value ?? 999) - (b.asx_fee_value ?? 999),
    criteria: ["Trading fees under 0.6%", "Free or low-cost AUD deposits", "Transparent fee schedule", "AUSTRAC registered"],
    sections: [
      { heading: "Why Crypto Fees Matter More Than You Think", body: "If you buy $5,000 of Bitcoin with a 1% fee and sell it later with another 1% fee, you've paid $100 in fees — your investment needs to grow 2% just to break even. With a 0.1% fee exchange, the same trades cost $10. Over a year of regular buying, the difference is enormous." },
      { heading: "Watch Out for Hidden Spreads", body: "Some exchanges advertise 'no fees' but build a spread into the price. You might think you're buying Bitcoin at $100,000 but the exchange is actually selling it to you at $100,500 — a hidden 0.5% fee. Always check the actual price you're paying vs the market rate." },
    ],
    relatedLinks: [{ label: "All Crypto Exchanges", href: "/best/crypto" }, { label: "Bitcoin Exchange", href: "/best/bitcoin-exchange" }, { label: "Compare Crypto", href: "/compare?filter=crypto" }],
    faqs: [
      { question: "Which crypto exchange has the lowest fees in Australia?", answer: "The cheapest Australian crypto exchanges charge 0.1-0.2% per trade. However, the cheapest by headline fee may have higher spreads. Check both the fee schedule and the actual prices offered." },
    ],
  },
  {
    slug: "high-interest-savings",
    title: `Highest Interest Savings Account Australia (${yr})`,
    h1: "Highest Interest Savings Account in Australia",
    metaDescription: `Top savings account rates in Australia ranked. Compare bonus rates, conditions, and ongoing rates. Updated ${upd}.`,
    intro: `Looking for the highest interest rate on your savings? We compare every major Australian savings account by both their bonus rate (with conditions) and their ongoing base rate (without conditions). Here's who pays the most in ${yr}.`,
    filter: (b) => b.platform_type === "savings_account",
    sort: (a, b) => (b.asx_fee_value ?? 0) - (a.asx_fee_value ?? 0),
    criteria: ["Available to Australian residents", "ADI authorised (APRA regulated)", "Government deposit guarantee eligible ($250k)", "Interest rate above 4% with conditions"],
    sections: [
      { heading: "Bonus Rate vs Base Rate — What's the Difference?", body: "Most high-interest savings accounts have two rates: a bonus rate (higher, but you need to meet conditions each month) and a base rate (lower, paid regardless). Conditions typically include depositing a minimum amount, making no withdrawals, or growing your balance. If you miss the conditions one month, you drop to the base rate." },
      { heading: "Are Savings Accounts Safe?", body: "All savings accounts from ADI-authorised banks are covered by the Australian Government Deposit Guarantee, which protects up to $250,000 per person per ADI. This means your money is safe even if the bank fails — one of the safest places to keep cash in Australia." },
      { heading: "How to Maximise Your Savings Rate", body: "Set up an automatic transfer on payday to meet deposit conditions. Avoid withdrawals from your high-interest account — keep a separate transaction account for spending. Review rates quarterly, as banks frequently change their bonus rate offers." },
    ],
    relatedLinks: [{ label: "Savings Calculator", href: "/savings-calculator" }, { label: "Compare Savings", href: "/compare?filter=savings" }, { label: "Term Deposits", href: "/best/term-deposits" }],
    faqs: [
      { question: "What is the highest savings rate in Australia right now?", answer: "The highest savings account rates in Australia are currently above 5% with conditions. See our comparison above for the latest rates, updated regularly." },
      { question: "Is my money safe in a savings account?", answer: "Yes. Savings accounts at ADI-authorised banks are covered by the Australian Government Deposit Guarantee up to $250,000 per person per institution." },
    ],
  },
  {
    slug: "best-term-deposit-rates",
    title: `Best Term Deposit Rates Australia (${yr})`,
    h1: "Best Term Deposit Rates in Australia",
    metaDescription: `Highest term deposit rates in Australia compared. 3-month, 6-month, 12-month terms from major banks and challengers. ${upd}.`,
    intro: `Term deposits lock your money away for a fixed period in exchange for a guaranteed interest rate. We compare rates from major banks and challenger banks across different terms to find where you'll earn the most.`,
    filter: (b) => b.platform_type === "term_deposit",
    sort: (a, b) => (b.asx_fee_value ?? 0) - (a.asx_fee_value ?? 0),
    criteria: ["ADI authorised (APRA regulated)", "Government guarantee eligible", "Minimum deposit under $5,000", "Competitive rate above 4%"],
    sections: [
      { heading: "Fixed Rate vs Savings Account", body: "Term deposits guarantee your rate for the full term — even if the RBA cuts rates. Savings accounts can change their rate at any time. If you won't need the money for 6-12 months and want certainty, a term deposit locks in today's rate." },
      { heading: "Short Term vs Long Term", body: "In a falling rate environment, longer terms are better because you lock in the higher rate. In a rising rate environment, shorter terms let you reinvest at higher rates sooner. Currently, the gap between 6-month and 12-month rates is small, so the main factor is when you'll need the money." },
    ],
    relatedLinks: [{ label: "Savings Accounts", href: "/best/high-interest-savings" }, { label: "Compare Term Deposits", href: "/compare?filter=term-deposits" }, { label: "Savings Calculator", href: "/savings-calculator" }],
    faqs: [
      { question: "What is the best term deposit rate in Australia?", answer: "The best term deposit rates in Australia are currently above 4.5% for 12-month terms. Challenger banks often offer higher rates than the big four. See our comparison above for latest rates." },
      { question: "Are term deposits safe?", answer: "Yes. Term deposits at ADI-authorised institutions are covered by the Government Deposit Guarantee up to $250,000 per person per institution." },
    ],
  },
  {
    slug: "best-performing-super",
    title: `Best Performing Super Funds Australia (${yr})`,
    h1: "Best Performing Super Funds in Australia",
    metaDescription: `Top performing Australian super funds ranked by long-term returns, fees, and insurance. Independent comparison. ${upd}.`,
    intro: `Choosing the right super fund can add tens of thousands to your retirement balance. We compare Australia's major super funds by long-term investment performance, fees, insurance options, and member services.`,
    filter: (b) => b.platform_type === "super_fund",
    sort: (a, b) => (b.rating ?? 0) - (a.rating ?? 0),
    criteria: ["APRA regulated", "10+ year investment track record", "Passed YFYS performance test", "Competitive fees below 1%"],
    sections: [
      { heading: "Why Long-Term Returns Matter Most", body: "Super fund returns compound over decades. A fund returning 8% vs 7% per year might not sound like much, but over 30 years that 1% difference turns $100,000 into $1,006,000 vs $761,000 — a $245,000 gap from the same starting balance. Always compare 10-year returns, not 1-year returns." },
      { heading: "The Impact of Fees on Your Super", body: "A seemingly small difference in fees has an outsized impact over a working lifetime. The ATO estimates that a 0.5% reduction in fees could add $100,000 to your super balance by retirement. Industry funds typically charge 0.5-0.8%, while retail funds may charge 1-2%." },
      { heading: "Check the ATO YourSuper Tool", body: "The government's YourSuper comparison tool at ato.gov.au ranks every MySuper product by performance and fees. It also flags funds that have failed the annual performance test — if your fund has failed, you should consider switching." },
    ],
    relatedLinks: [{ label: "Compare Super Funds", href: "/compare?filter=super" }, { label: "SMSF Platforms", href: "/best/smsf" }, { label: "Cheapest Super", href: "/best/cheapest-super" }],
    faqs: [
      { question: "What is the best performing super fund in Australia?", answer: "The best performing super fund depends on the time period and investment option. Over 10 years, several industry funds have consistently outperformed retail funds. See our ranked comparison above." },
      { question: "Should I switch super funds?", answer: "If your fund has failed the YFYS performance test or charges significantly higher fees than competitors, switching may be worthwhile. However, check what insurance you'll lose before switching — death, TPD, and income protection cover may not carry over." },
    ],
  },
  {
    slug: "cheapest-super",
    title: `Cheapest Super Fund Australia — Lowest Fees (${yr})`,
    h1: "Cheapest Super Fund in Australia",
    metaDescription: `Australian super funds ranked by fees. Compare admin fees, investment fees, and total cost. Lower fees = bigger retirement balance. ${upd}.`,
    intro: `The cheapest super fund isn't always the best, but fees matter enormously over a 30+ year timeframe. We rank Australian super funds by their total annual cost including administration fees, investment fees, and insurance premiums.`,
    filter: (b) => b.platform_type === "super_fund",
    sort: (a, b) => (a.asx_fee_value ?? 999) - (b.asx_fee_value ?? 999),
    criteria: ["Total fees below 1%", "APRA regulated", "Passed YFYS performance test", "No exit fees"],
    sections: [
      { heading: "How Super Fees Are Charged", body: "Super funds charge two main fees: an administration fee (fixed or percentage, for running the fund) and an investment fee (percentage, for managing your money). Some also charge insurance premiums. Total fees typically range from 0.5% to 2% per year." },
      { heading: "How Much Do Fees Cost Over a Lifetime?", body: "The ATO estimates that paying just 0.5% more in super fees could cost you $100,000 or more by retirement. On a $200,000 balance, a fund charging 1.5% takes $3,000/year in fees vs $1,000/year for a fund charging 0.5%. Over 20 years, that's $40,000+ difference — money that stays in your retirement balance." },
    ],
    relatedLinks: [{ label: "Best Performing Super", href: "/best/best-performing-super" }, { label: "Compare Super", href: "/compare?filter=super" }, { label: "SMSF", href: "/best/smsf" }],
    faqs: [
      { question: "Which super fund has the lowest fees?", answer: "The cheapest super funds in Australia charge total fees under 0.5-0.6%. Industry funds generally have lower fees than retail funds. See our ranked comparison above." },
      { question: "Are low-fee super funds any good?", answer: "Yes — many of the lowest-fee super funds also have strong long-term investment returns. The ATO's YFYS test shows that low-fee funds frequently outperform high-fee funds." },
    ],
  },
  {
    slug: "ethical-super",
    title: `Best Ethical Super Funds Australia (${yr})`,
    h1: "Best Ethical Super Funds in Australia",
    metaDescription: `Top ethical and sustainable super funds compared. ESG screening, fossil fuel exclusions, performance, and fees. ${upd}.`,
    intro: `Want your super invested ethically? Several Australian super funds now offer dedicated ethical or sustainable investment options that screen out fossil fuels, gambling, weapons, and tobacco. We compare their ESG credentials, performance, and fees.`,
    filter: (b) => b.platform_type === "super_fund",
    sort: (a, b) => (b.rating ?? 0) - (a.rating ?? 0),
    criteria: ["Dedicated ethical/sustainable investment option", "Published ESG screening criteria", "APRA regulated", "Competitive returns vs conventional options"],
    sections: [
      { heading: "What Makes a Super Fund 'Ethical'?", body: "Ethical super funds typically screen out investments in fossil fuels, weapons manufacturing, gambling, tobacco, and companies with poor human rights records. Some go further with positive screening — actively investing in renewable energy, healthcare, and education. Check each fund's published exclusion criteria to ensure it matches your values." },
      { heading: "Do Ethical Funds Perform Worse?", body: "The data increasingly shows that ethical super funds perform comparably to conventional funds — and in some cases better. Over the past 5 years, many ESG-screened options have outperformed their conventional counterparts, partly because avoiding fossil fuel companies proved beneficial during the energy transition." },
    ],
    relatedLinks: [{ label: "Best Performing Super", href: "/best/best-performing-super" }, { label: "Compare Super", href: "/compare?filter=super" }, { label: "Cheapest Super", href: "/best/cheapest-super" }],
    faqs: [
      { question: "What is the best ethical super fund in Australia?", answer: "The best ethical super fund depends on what issues matter to you. Some exclude fossil fuels but invest in gambling companies; others have broader exclusions. Check each fund's published screening criteria." },
      { question: "Do ethical super funds perform worse?", answer: "Not necessarily. Many ethical super options have matched or exceeded conventional fund returns over the past 5-10 years. Performance depends more on overall investment strategy than ethical screening alone." },
    ],
  },
  {
    slug: "super-for-young-people",
    title: `Best Super Fund for Young People Australia (${yr})`,
    h1: "Best Super Fund for Young People",
    metaDescription: `Top super funds for people in their 20s and 30s. Low fees, growth focus, and insurance options for young Australians. ${upd}.`,
    intro: `If you're in your 20s or 30s, your super has decades to grow. The right fund choice now — low fees and a growth-oriented investment strategy — can add hundreds of thousands to your retirement balance. Here's what to look for.`,
    filter: (b) => b.platform_type === "super_fund",
    sort: (a, b) => (b.rating ?? 0) - (a.rating ?? 0),
    criteria: ["Low total fees", "Strong growth/high-growth option", "Good mobile app for tracking", "Competitive insurance premiums for young members"],
    sections: [
      { heading: "Why Young People Should Choose Growth", body: "With 30-40 years until retirement, you can afford more risk in exchange for higher expected returns. A high-growth option (70-90% shares) has historically returned 8-10% per year over long periods vs 5-6% for conservative options. On $50,000, that difference compounds to hundreds of thousands by retirement." },
      { heading: "The Power of Low Fees When You're Young", body: "A 1% fee difference on $50,000 is only $500/year. But that $500 reinvested at 8% for 35 years becomes $86,000. Start with a low-fee fund early and the savings compound dramatically over your working life." },
    ],
    relatedLinks: [{ label: "Cheapest Super", href: "/best/cheapest-super" }, { label: "Best Performing", href: "/best/best-performing-super" }, { label: "Compare Super", href: "/compare?filter=super" }],
    faqs: [
      { question: "What super fund should I choose in my 20s?", answer: "In your 20s, prioritise: 1) Low total fees, 2) A high-growth investment option, 3) Adequate insurance (but don't over-insure). Industry funds typically tick all three boxes." },
    ],
  },
  {
    slug: "cheapest-us-shares",
    title: `Cheapest Way to Buy US Shares from Australia (${yr})`,
    h1: "Cheapest Way to Buy US Shares from Australia",
    metaDescription: `Compare the true cost of buying US shares from Australia. Brokerage, FX rates, and total costs compared. ${upd}.`,
    intro: `Buying US shares from Australia involves two costs: brokerage and FX conversion. Some brokers charge $0 brokerage but have high FX margins, while others charge per-trade but offer better rates. We rank the total cost.`,
    filter: (b) => !b.is_crypto && b.platform_type === "share_broker" && (b.us_fee !== null || b.fx_rate !== null),
    sort: (a, b) => {
      const costA = (a.us_fee_value ?? 5) + ((a.fx_rate ?? 70) / 100) * 50;
      const costB = (b.us_fee_value ?? 5) + ((b.fx_rate ?? 70) / 100) * 50;
      return costA - costB;
    },
    criteria: ["Access to US markets (NYSE, NASDAQ)", "Published FX conversion rate", "Competitive total cost per $5,000 US trade", "Fractional US shares preferred"],
    sections: [
      { heading: "The Hidden Cost: FX Conversion", body: "The biggest cost of buying US shares isn't brokerage — it's the FX conversion. A broker charging 0.7% on a $10,000 conversion takes $70, while one charging 0.2% takes $20. That's a $50 difference on a single trade, and it applies both when you buy and when you sell." },
      { heading: "How to Calculate Your True Cost", body: "True cost per trade = US brokerage + (trade amount × FX rate). For a $5,000 US share purchase: a broker with $0 brokerage and 0.7% FX costs $35, while one with $5 brokerage and 0.2% FX costs $15. The 'free' broker is actually more expensive." },
    ],
    relatedLinks: [{ label: "US Shares Guide", href: "/best/us-shares" }, { label: "Low FX Fees", href: "/best/low-fx-fees" }, { label: "Switching Calculator", href: "/switching-calculator" }],
    faqs: [
      { question: "What is the cheapest way to buy US shares from Australia?", answer: "The cheapest option depends on your trade size. For small trades under $1,000, $0 brokerage brokers are cheapest despite higher FX rates. For large trades over $5,000, brokers with low FX rates (0.2-0.3%) are cheaper even with per-trade brokerage." },
    ],
  },
  {
    slug: "options-trading",
    title: `Best Options Trading Platform Australia (${yr})`,
    h1: "Best Options Trading Platform in Australia",
    metaDescription: `Compare Australian options trading platforms. US & ASX options, fees, margin, and tools. ${upd}.`,
    intro: `Options trading in Australia is available through a handful of brokers offering ASX exchange-traded options and US options. We compare them by fees, available markets, margin requirements, and trading tools.`,
    filter: (b) => !b.is_crypto && b.platform_type === "share_broker" && (b.markets?.includes("options") || b.slug === "interactive-brokers" || b.slug === "cmc-markets" || b.slug === "ig"),
    sort: (a, b) => (b.rating ?? 0) - (a.rating ?? 0),
    criteria: ["ASX and/or US options available", "Competitive options brokerage", "Options analytics and strategy tools", "ASIC regulated"],
    sections: [
      { heading: "ASX Options vs US Options", body: "ASX exchange-traded options are available on the top ~60 ASX stocks and indices. US options (available through international brokers like Interactive Brokers) offer far more choice — options on thousands of US stocks and ETFs. Most serious options traders use US markets for liquidity." },
      { heading: "What You Need to Start Trading Options", body: "Options trading requires approval from your broker, which typically involves answering questions about your experience and risk tolerance. You'll also need enough capital for margin requirements — naked option selling requires significant margin, while buying calls/puts only risks the premium paid." },
    ],
    relatedLinks: [{ label: "Day Trading", href: "/best/day-trading" }, { label: "International Shares", href: "/best/international-shares" }, { label: "CFD Trading", href: "/best/cfd-forex" }],
    faqs: [
      { question: "Can you trade options in Australia?", answer: "Yes. ASX exchange-traded options are available through several Australian brokers. US options are accessible through international brokers like Interactive Brokers that accept Australian clients." },
    ],
  },
  {
    slug: "kids-savings-account",
    title: `Best Kids Savings Account Australia (${yr})`,
    h1: "Best Kids Savings Account in Australia",
    metaDescription: `Top children's savings accounts compared. High interest rates, parental controls, and no monthly fees. ${upd}.`,
    intro: `Teaching your children to save starts with the right account. We compare Australian children's savings accounts by interest rate, age eligibility, parental controls, and fees.`,
    filter: (b) => b.platform_type === "savings_account",
    sort: (a, b) => (b.asx_fee_value ?? 0) - (a.asx_fee_value ?? 0),
    criteria: ["Available for under-18s", "No monthly fees", "Competitive interest rate", "Government deposit guarantee"],
    sections: [
      { heading: "What Makes a Good Kids Account?", body: "The best kids savings accounts offer competitive interest rates (often higher than adult accounts as a marketing tool), no monthly fees, and parental oversight features. Some banks let parents open the account online and manage it through their existing banking app." },
      { heading: "Teaching Kids About Money", body: "A savings account with a debit card (available from age ~14 at most banks) gives teenagers hands-on money management experience. Before that age, regular deposits and watching the interest grow teaches the value of saving." },
    ],
    relatedLinks: [{ label: "Savings Accounts", href: "/best/high-interest-savings" }, { label: "Savings Calculator", href: "/savings-calculator" }, { label: "Best for Children", href: "/best/children" }],
    faqs: [
      { question: "What is the best savings account for a child in Australia?", answer: "The best kids savings accounts offer high interest rates with no monthly fees. Several banks offer rates above 4% for under-18s. Compare the latest rates in our table above." },
    ],
  },
  {
    slug: "foreign-investors",
    title: `Best Brokers for Foreign Investors in Australia (${yr})`,
    h1: "Best Australian Brokers for Foreign Investors & Non-Residents",
    metaDescription: `Best Australian brokers that accept non-residents and foreign investors. Confirmed eligibility, fees, and non-resident notes. ${upd}.`,
    intro: `Most Australian retail brokers require an Australian residential address — leaving non-residents with very limited options. We've filtered platforms to show only those confirmed to accept non-residents or international clients. Whether you're investing from overseas or are a temporary resident, these are the platforms you can actually open an account with.`,
    filter: (b) => b.accepts_non_residents === true,
    sort: (a, b) => (b.rating ?? 0) - (a.rating ?? 0),
    criteria: [
      "Confirmed non-resident eligibility (accepts international address)",
      "ASIC-regulated or holds an Australian financial licence",
      "Account currently open to new non-resident clients",
      "Non-resident account opening documented or verified",
    ],
    sections: [
      {
        heading: "Why Most Australian Brokers Don't Accept Non-Residents",
        body: "Australian retail brokers face strict KYC/AML obligations under the AML/CTF Act and ASIC's client identification requirements. Verifying overseas addresses, foreign passports, and source-of-funds for non-residents adds compliance cost and complexity. Most domestic-focused brokers simply exclude non-residents to manage this risk. The result: international investors have a much narrower choice of platforms compared to Australian residents.",
      },
      {
        heading: "What Non-Residents Need to Open an Account",
        body: "Brokers that accept non-residents will require: a valid passport (the primary ID), proof of overseas residential address (utility bill or bank statement dated within 3 months), declaration of non-resident tax status (important for correct withholding tax treatment), and often source-of-funds documentation for larger initial deposits. Some brokers also require a W-8BEN form if you plan to trade US shares via their platform.",
      },
      {
        heading: "Non-Resident Tax Considerations When Choosing a Broker",
        body: "Ensure the broker you choose can record your non-resident status correctly. If not declared, the broker must withhold at the highest marginal Australian rate on dividends — 47% rather than the standard 30% (or lower DTA rate). Interactive Brokers, as the largest international platform, handles non-resident tax treatment automatically. Domestic platforms vary — some have robust non-resident onboarding; others may handle it poorly.",
      },
    ],
    relatedLinks: [
      { label: "Foreign Investment Hub", href: "/foreign-investment" },
      { label: "Shares for Non-Residents", href: "/foreign-investment/shares" },
      { label: "Best for Expats", href: "/best/expat-investors" },
      { label: "Compare All Platforms", href: "/compare" },
    ],
    faqs: [
      {
        question: "Which Australian brokers accept non-residents without an Australian address?",
        answer:
          "Very few domestic brokers accept true non-residents. Interactive Brokers is the standout — it operates in 200+ countries and doesn't require an Australian address. Most domestic brokers (CommSec, Stake, Moomoo, nabtrade) require an Australian residential address.",
      },
      {
        question: "Do non-residents pay more in fees with Australian brokers?",
        answer:
          "Generally no — fee schedules are the same for residents and non-residents. However, non-residents pay withholding tax on dividends (30% unfranked, reduced by DTA) and interest (10%), which residents don't. This tax drag effectively increases the cost of holding income-generating investments.",
      },
      {
        question: "Can I keep my Australian brokerage account if I move overseas?",
        answer:
          "It depends on the broker. Many domestic brokers will freeze or close your account if you update your address to overseas. Brokers that explicitly accept non-residents (like Interactive Brokers) allow you to hold an account regardless of where you live. If you're planning to move overseas, check your broker's policy before you go.",
      },
    ],
  },
  {
    slug: "expat-investors",
    title: `Best Brokers for Australian Expats (${yr})`,
    h1: "Best Australian Brokers for Expats Living Abroad",
    metaDescription: `Best Australian brokers for expats and non-resident citizens. Which platforms let you keep or open accounts while living overseas. ${upd}.`,
    intro: `Australian expats face a specific challenge: the broker that worked fine while living in Australia may freeze your account the moment you update your address overseas. We've identified the brokers that accept Australian non-resident investors — either keeping existing accounts open or accepting new applications from abroad.`,
    filter: (b) => b.accepts_non_residents === true,
    sort: (a, b) => (b.rating ?? 0) - (a.rating ?? 0),
    criteria: [
      "Accepts non-resident Australian investors (overseas address)",
      "Account retention policy confirmed for expats",
      "ASIC-regulated or internationally licensed",
      "Not crypto-exclusive",
    ],
    sections: [
      {
        heading: "The Biggest Expat Risk: Your Broker Closing Your Account",
        body: "Many domestic Australian brokers (CommSec, nabtrade, Selfwealth, Stake) require an Australian residential address. When you update your address overseas, they may give you 30-90 days notice to close your account and transfer or sell your holdings. If you hold large capital gains positions, a forced sale is a significant tax event. Before moving overseas, check your broker's non-resident policy and consider transferring to a platform that explicitly supports non-residents.",
      },
      {
        heading: "Tax Status for Australian Expats — Critical to Understand",
        body: "Becoming a non-resident for Australian tax purposes has major implications. You lose the 50% CGT discount on shares (for assets held less than 12 months before departure). You lose the main residence CGT exemption (if you later sell your Australian home). The tax-free threshold no longer applies to your Australian income. However, you generally become exempt from Australian CGT on most listed shares — a structural advantage for long-term holders. Check the ATO's residency tests before assuming you're a non-resident.",
      },
      {
        heading: "Keeping Your Australian Investments as an Expat",
        body: "There is generally no prohibition on Australian citizens or PR holders keeping their existing Australian share portfolio while living overseas. The practical issues are: broker policy (above), ongoing tax reporting in Australia for Australian-sourced income, and potentially complex CGT calculations when you return. For expats committed to long-term investing in Australian markets, Interactive Brokers is the most robust solution — full functionality regardless of where you live.",
      },
    ],
    relatedLinks: [
      { label: "Tax Guide for Expats", href: "/foreign-investment/tax" },
      { label: "Shares for Non-Residents", href: "/foreign-investment/shares" },
      { label: "Best for Foreign Investors", href: "/best/foreign-investors" },
      { label: "Find a Tax Agent", href: "/advisors/tax-agents" },
    ],
    faqs: [
      {
        question: "Can I keep my CommSec or nabtrade account as an expat?",
        answer:
          "Most Australian banks' brokers (CommSec, nabtrade) require an Australian residential address and may close your account when you move overseas. Contact them before you leave to check their policy. You may be given a period to transfer your holdings to an ASIC-regulated broker that accepts non-residents.",
      },
      {
        question: "Do I lose my CGT discount when I become a non-resident?",
        answer:
          "For assets you hold at the point of becoming a non-resident, a deemed disposal event may occur — or you can defer the CGT but lose the discount when you eventually sell. For assets acquired after becoming a non-resident, the 50% CGT discount is not available. However, non-residents are generally exempt from Australian CGT entirely on disposals of listed Australian shares (Section 855-10 ITAA 1997) — this exemption replaces (and is often better than) the discount.",
      },
      {
        question: "What is the best broker for Australian expats?",
        answer:
          "Interactive Brokers is widely regarded as the best option for Australian expats — it accepts clients in 200+ countries, has no Australian address requirement, handles non-resident tax treatment correctly, and provides access to both ASX and global markets. Some specialised international brokers also work well for expats trading ASX.",
      },
    ],
  },
  // ─── PERSONA CATEGORIES ────────────────────────────────────────────────────
  {
    slug: "retirees",
    title: `Best Investment Platforms for Retirees Australia (${yr})`,
    h1: "Best Investment Platforms for Retirees in Australia",
    metaDescription: `Compare the best investment platforms for Australian retirees: low fees, pension-mode accounts, dividend focus, and ease-of-use. ${upd}.`,
    intro: `In retirement, simplicity, income generation, and capital preservation matter most. We've selected platforms that suit retirees — those with low or no inactivity fees, quality dividend stocks and ETFs, intuitive interfaces, and local phone support.`,
    filter: (b) =>
      !b.is_crypto &&
      b.platform_type !== "cfd_forex" &&
      (b.asx_fee_value ?? 99) <= 20 &&
      (!b.inactivity_fee || b.inactivity_fee === "None" || b.inactivity_fee === "$0" || b.inactivity_fee === "No"),
    sort: (a, b) => (a.asx_fee_value ?? 99) - (b.asx_fee_value ?? 99),
    criteria: [
      "No inactivity fees",
      "Low brokerage on blue-chip ASX trades",
      "Dividend reinvestment support",
      "Phone or live-chat support",
      "CHESS-sponsored or equivalent safeguards",
    ],
    sections: [
      {
        heading: "Why Retirees Need a Different Type of Broker",
        body: "Active traders benefit from advanced charting and speed. Retirees typically need the opposite: low fees for infrequent trades, reliable income reporting for tax purposes, clear dividend statements, and straightforward account management. Inactivity fees can quietly erode a retirement portfolio when trading frequency is low.",
      },
      {
        heading: "Income vs. Growth Investing in Retirement",
        body: "Many retirees focus on dividend-paying blue-chip shares, LICs, and income ETFs (e.g. VHY, HVST) rather than growth stocks. A good platform for retirees makes it easy to set up dividend reinvestment plans (DRPs), view upcoming ex-dividend dates, and generate annual income reports.",
      },
      {
        heading: "SMSF and Account-Based Pension Considerations",
        body: "If you manage investments through an SMSF or Account-Based Pension, some platforms offer dedicated SMSF accounts with annual audit reports and separate trustee logins. Check whether the platform supports corporate trustee structures and provides the data exports your SMSF auditor needs.",
      },
    ],
    relatedLinks: [
      { label: "Best for Dividends", href: "/best/dividends" },
      { label: "Best SMSF Platforms", href: "/best/smsf" },
      { label: "Best Super Funds", href: "/best/super-funds" },
      { label: "Retirement Calculator", href: "/retirement-calculator" },
    ],
    faqs: [
      {
        question: "What is the best broker for retirees in Australia?",
        answer:
          "Platforms with no inactivity fees, low brokerage, and strong dividend reporting are best for retirees. CommSec, Nabtrade, and Bell Direct are popular among older investors due to their local support and established reputations. For lower-fee options, Pearler is specifically designed for long-term investors and has a clean, simple interface.",
      },
      {
        question: "Do I pay brokerage inside a pension account?",
        answer:
          "Yes — brokerage is charged at the platform level regardless of whether you're in accumulation, pension phase, or a standalone account. The tax treatment of the trades differs (zero tax in pension phase), but brokerage costs are the same.",
      },
      {
        question: "Can I access the pensioner discount through an investment platform?",
        answer:
          "Investment platforms are separate from Centrelink's Age Pension system. However, some brokers offer senior discount brokerage or low-balance waivers — check with the platform directly.",
      },
    ],
  },
  {
    slug: "temporary-residents",
    title: `Best Brokers for Temporary Residents Australia (${yr})`,
    h1: "Best Brokers for Temporary Residents in Australia",
    metaDescription: `Brokers that accept Australian temporary residents on 482, 500, 189, and WHV visas. Invest in ASX shares without an Australian citizenship. ${upd}.`,
    intro: `On a 482 work visa, student visa, or working holiday visa? You can still invest in ASX shares — but not every broker accepts temporary residents. We list the platforms that accept temporary visa holders and explain the tax rules that apply.`,
    filter: (b) => b.accepts_temporary_residents === true,
    sort: (a, b) => (a.asx_fee_value ?? 99) - (b.asx_fee_value ?? 99),
    criteria: [
      "Accepts temporary visa holders",
      "No Australian citizenship required",
      "Online account opening",
      "Withholding tax correctly applied",
    ],
    sections: [
      {
        heading: "Can Temporary Residents Invest in Australian Shares?",
        body: "Yes. There is no legal restriction on temporary residents buying ASX-listed shares. The challenge is finding a broker willing to verify and onboard a temporary resident — some require an Australian residential address, tax file number (TFN), or bank account, which temporary residents may or may not have.",
      },
      {
        heading: "Tax Rules for Temporary Residents",
        body: "Temporary residents are taxed as Australian residents on Australian-source income (including dividends and capital gains on ASX shares) during their stay. When you leave Australia, CGT applies to your Australian assets at that point. The ATO has specific rules — it is worth consulting a tax agent who understands temporary resident tax status.",
      },
      {
        heading: "What Happens to Your Shares When You Leave?",
        body: "When you depart Australia permanently, you may be treated as a non-resident for tax purposes. Some brokers allow you to maintain your account as a non-resident; others will close it. Interactive Brokers and Stake are the most flexible for this transition.",
      },
    ],
    relatedLinks: [
      { label: "Best for Foreign Investors", href: "/best/foreign-investors" },
      { label: "Expat Investors", href: "/best/expat-investors" },
      { label: "Foreign Investment Hub", href: "/foreign-investment" },
      { label: "Super & DASP", href: "/foreign-investment/super" },
    ],
    faqs: [
      {
        question: "Do I need a TFN to invest in Australia on a visa?",
        answer:
          "You don't legally need a TFN to invest, but without one your broker is required to withhold tax at the top marginal rate (47%) from dividends. Eligible temporary residents can apply for a TFN from the ATO — it is worth doing before you start investing.",
      },
      {
        question: "Can I invest on a Working Holiday Visa (subclass 417 or 462)?",
        answer:
          "Yes, Working Holiday makers can invest in ASX shares. You are taxed as a non-resident for the Working Holiday income but your investment income may be taxed differently. Interactive Brokers and Stake are commonly used by WHV holders.",
      },
      {
        question: "What happens to my super when I leave Australia?",
        answer:
          "You can claim your superannuation balance as a Departing Australia Superannuation Payment (DASP) once your visa expires and you leave the country. DASP is taxed at 35% for regular super and 45% for taxed-source balances of working holiday makers.",
      },
    ],
  },
  {
    slug: "high-net-worth",
    title: `Best Brokers for High Net Worth Investors Australia (${yr})`,
    h1: "Best Brokers for High Net Worth Investors in Australia",
    metaDescription: `Premium investment platforms for Australian HNW investors: global access, premium service, competitive institutional-grade pricing, and portfolio tools. ${upd}.`,
    intro: `High net worth investors have different needs: lower per-trade costs at scale, access to international markets, margin lending, bonds, OTC products, and dedicated relationship management. We compare platforms that serve HNW investors with the depth they require.`,
    filter: (b) =>
      !b.is_crypto &&
      (b.us_fee_value != null ||
        (b.chess_sponsored === true && (b.asx_fee_value ?? 99) < 20)),
    sort: (a, b) => (a.asx_fee_value ?? 99) - (b.asx_fee_value ?? 99),
    criteria: [
      "Access to international markets",
      "Competitive pricing at scale",
      "Margin lending or leverage options",
      "Dedicated account management",
      "Research and analytics tools",
    ],
    sections: [
      {
        heading: "What Separates HNW Platforms from Retail Brokers",
        body: "At higher portfolio sizes, per-trade fees matter less than percentage-based custody or platform fees. A $500K portfolio paying 0.2% p.a. in custody fees costs $1,000/year — far more than brokerage. For large portfolios, look at platforms with flat monthly fees or tiered custody charges that cap out at large balances.",
      },
      {
        heading: "Access to International Markets",
        body: "HNW investors typically want global diversification beyond ASX. Interactive Brokers gives access to 135+ markets worldwide, with the ability to hold multi-currency positions, trade US options, and access bonds and fixed income. This breadth is unmatched by domestic-only platforms.",
      },
      {
        heading: "Private Client and Relationship Manager Services",
        body: "Some Australian brokers offer dedicated private client services — Macquarie Private Bank, Morgan Stanley Wealth Management, and Bell Potter all have dedicated HNW divisions. These come with personal relationship managers, structured product access, and estate planning support.",
      },
    ],
    relatedLinks: [
      { label: "Best for Large Portfolios", href: "/best/large-portfolio" },
      { label: "Best for International Shares", href: "/best/international-shares" },
      { label: "Best for Options Trading", href: "/best/options-trading" },
      { label: "Fee Impact Calculator", href: "/fee-impact" },
    ],
    faqs: [
      {
        question: "Which broker is best for large portfolios in Australia?",
        answer:
          "Interactive Brokers is often the best choice for large portfolios due to its low fees, broad market access, and sophisticated tools. For purely ASX portfolios with CHESS sponsorship, CMC Markets and Saxo Bank offer competitive rates for high-volume traders. Private banking services through Macquarie or UBS are suitable for $1M+ portfolios requiring advisory services.",
      },
      {
        question: "Do Australian brokers charge custody fees on large portfolios?",
        answer:
          "Yes — many brokers charge a percentage-based custody or platform fee that can significantly erode returns on large portfolios. Always check whether fees are capped, and compare the total annual cost at your portfolio size rather than just the per-trade fee.",
      },
    ],
  },
  {
    slug: "property-investors",
    title: `Best Brokers for Property Investors Australia (${yr})`,
    h1: "Best Investment Platforms for Australian Property Investors",
    metaDescription: `Investment platforms ideal for property investors wanting share market exposure: REITs, LPTs, gearing strategies, and negative gearing complement. ${upd}.`,
    intro: `Property investors increasingly use the share market to complement bricks-and-mortar — whether through REITs (A-REITs), property ETFs, or geared equity strategies that mirror negative gearing principles. We compare the best platforms for property-focused investors.`,
    filter: (b) =>
      !b.is_crypto &&
      b.platform_type !== "cfd_forex" &&
      b.chess_sponsored === true,
    sort: (a, b) => (a.asx_fee_value ?? 99) - (b.asx_fee_value ?? 99),
    criteria: [
      "Access to ASX-listed REITs and property ETFs",
      "Margin lending or equity leverage",
      "CHESS-sponsored holdings",
      "Tax reporting for property + share portfolios",
      "Dividend reinvestment for income",
    ],
    sections: [
      {
        heading: "Why Property Investors Are Turning to REITs",
        body: "A-REITs (Australian Real Estate Investment Trusts) give property exposure without the entry costs, stamp duty, or illiquidity of direct property. Top A-REITs include Goodman Group (GMG), Scentre Group (SCG), and Dexus (DXS). Alternatively, ETFs like VAP (Vanguard Australian Property Securities) provide diversified exposure to 30+ A-REITs.",
      },
      {
        heading: "Negative Gearing in the Share Market",
        body: "Negative gearing isn't unique to property — you can negatively gear shares too. If you borrow to invest in shares and the interest costs exceed your dividend income, the loss may be deductible against other income. This strategy requires margin lending facilities and a clear understanding of the risks, including margin calls.",
      },
      {
        heading: "Tax Reporting for Mixed Property + Share Portfolios",
        body: "Managing tax across both property and shares requires careful record-keeping. Ensure your broker provides detailed annual tax reports including capital gains summaries, dividend statements, and DRP records that your accountant can reconcile with your property income and expenses.",
      },
    ],
    relatedLinks: [
      { label: "Best for Dividends", href: "/best/dividends" },
      { label: "Negative Gearing Guide", href: "/tax/negative-gearing" },
      { label: "Property Investment Hub", href: "/property" },
      { label: "ETF Hub", href: "/etfs" },
    ],
    faqs: [
      {
        question: "What are the best REITs to buy on ASX?",
        answer:
          "The largest ASX-listed REITs include Goodman Group (GMG), Scentre Group (SCG), Dexus (DXS), Charter Hall (CHC), and Mirvac (MGR). For diversified REIT exposure, the Vanguard Australian Property Securities ETF (VAP) and the SPDR S&P/ASX 200 Listed Property ETF (SLF) are popular low-cost options.",
      },
      {
        question: "Can I negatively gear ASX shares like property?",
        answer:
          "Yes. You can claim interest on borrowings used to purchase income-producing shares as a tax deduction. However, share margin loans carry margin call risk — if your portfolio value falls, the broker may force you to sell holdings to reduce the loan balance. Negative gearing shares is generally considered riskier than property gearing.",
      },
    ],
  },
  {
    slug: "options-trading",
    title: `Best Options Trading Platforms Australia (${yr})`,
    h1: "Best Options Trading Platforms in Australia",
    metaDescription: `Compare the best ASX exchange-traded options (ETOs) and US options platforms available to Australians. Find brokers with low options commissions. ${upd}.`,
    intro: `Options trading in Australia includes ASX Exchange-Traded Options (ETOs) on Australian shares and US options through international platforms. We compare the best options-enabled brokers for Australian investors — from simple covered calls to complex multi-leg strategies.`,
    filter: (b) => !b.is_crypto && b.us_fee_value != null,
    sort: (a, b) => (a.asx_fee_value ?? 99) - (b.asx_fee_value ?? 99),
    criteria: [
      "ASX ETO or US options access",
      "Multi-leg strategy support",
      "Options analytics and Greeks",
      "Competitive options commission structure",
      "Risk management tools",
    ],
    sections: [
      {
        heading: "ASX Exchange-Traded Options (ETOs) vs US Options",
        body: "ASX ETOs are standardised options on Australian shares and indices, settled through the ASX Clear house. US options — available via Interactive Brokers, tastytrade (via IBKR), and Saxo — offer far greater liquidity, tighter spreads, and more liquid contracts. Many sophisticated Australian options traders use US markets due to the depth of the options chain.",
      },
      {
        heading: "Understanding Options Pricing for Australians",
        body: "Options commissions in Australia differ from the US model. ASX brokers typically charge per-contract plus an ASX Clear settlement fee. Interactive Brokers charges a fixed per-contract fee for US options, making it cost-effective for larger trades. Always calculate total per-contract cost including exchange and clearing fees.",
      },
      {
        heading: "Risk Management in Options Trading",
        body: "Options can result in losses that exceed your initial outlay (when selling uncovered options). ASIC requires that retail investors acknowledge understanding of these risks before accessing leveraged derivatives products. Strategies like covered calls (selling calls on shares you own) or cash-secured puts carry defined risk, while naked puts/calls carry unlimited risk.",
      },
    ],
    relatedLinks: [
      { label: "Best for High Net Worth", href: "/best/high-net-worth" },
      { label: "Best CFD Platforms", href: "/best/cfd-forex" },
      { label: "Options Tax Guide", href: "/tax/capital-gains" },
    ],
    faqs: [
      {
        question: "Can Australians trade US options?",
        answer:
          "Yes. Australians can trade US options (equity and ETF options on CBOE, NYSE Arca, etc.) through Interactive Brokers, Saxo Bank, and a handful of other international platforms. The tax treatment of US options gains/losses for Australian residents follows standard CGT rules.",
      },
      {
        question: "What is an ASX Exchange-Traded Option (ETO)?",
        answer:
          "An ASX ETO is a contract giving the right (but not obligation) to buy (call) or sell (put) 100 shares of an ASX-listed company at a specified price before expiry. ETOs are available on the top ~60 ASX shares and some indices. They are settled through ASX Clear, providing central counterparty clearing.",
      },
      {
        question: "Do I need a separate account for options trading in Australia?",
        answer:
          "Most brokers that offer ASX ETOs require a separate options trading account application with an additional risk disclosure form. Interactive Brokers integrates equity and options in one account — you simply apply for options permissions through your account settings.",
      },
    ],
  },
  {
    slug: "large-portfolio",
    title: `Best Brokers for Large Portfolios Australia (${yr})`,
    h1: "Best Brokers for Large Portfolios in Australia",
    metaDescription: `Investment platforms with lowest total cost of ownership for large portfolios $250K+. Compare custody fees, brokerage caps, and CHESS sponsorship. ${upd}.`,
    intro: `As your portfolio grows, per-trade fees matter less but platform and custody fees matter more. A 0.2% annual platform fee on a $1M portfolio costs $2,000/year. We compare the best platforms for large investors — those with competitive total cost of ownership and no percentage-based custody fees.`,
    filter: (b) =>
      !b.is_crypto &&
      b.platform_type !== "cfd_forex" &&
      (b.chess_sponsored === true || b.us_fee_value != null),
    sort: (a, b) => (a.asx_fee_value ?? 99) - (b.asx_fee_value ?? 99),
    criteria: [
      "No or capped custody/platform fees",
      "Flat-fee brokerage structure",
      "CHESS-sponsored direct holdings",
      "Portfolio reporting and performance analytics",
      "Tax-lot tracking and CGT reports",
    ],
    sections: [
      {
        heading: "The Hidden Cost of Percentage-Based Platform Fees",
        body: "Many investment platforms charge a percentage of assets under management as a 'platform fee' — often 0.10–0.25% p.a. On a $500K portfolio this is $500–$1,250/year. On a $2M portfolio it could be $2,000–$5,000/year. Flat-fee or brokerage-only platforms like Selfwealth, CMC, or Interactive Brokers become dramatically cheaper at scale.",
      },
      {
        heading: "CHESS Sponsorship for Large Portfolios",
        body: "For large portfolios, CHESS sponsorship is strongly recommended. CHESS means your shares are registered in your name directly on ASX's settlement system — you hold an HIN (Holder Identification Number). This protects you if your broker becomes insolvent. Broker-sponsored (custodian) models, used by some discount platforms, hold shares on your behalf, adding counterparty risk.",
      },
      {
        heading: "Portfolio Reporting Requirements",
        body: "Large portfolios require comprehensive reporting — CGT cost-base tracking, dividend summaries, corporate action records, and performance attribution. Platforms like CMC Invest, Nabtrade, and Interactive Brokers offer detailed portfolio reporting. For SMSF portfolios, check that your broker provides data exports compatible with your accountant's software (BGL, Class).",
      },
    ],
    relatedLinks: [
      { label: "Best for High Net Worth", href: "/best/high-net-worth" },
      { label: "Fee Impact Calculator", href: "/fee-impact" },
      { label: "Best SMSF Platforms", href: "/best/smsf" },
      { label: "Best for Dividends", href: "/best/dividends" },
    ],
    faqs: [
      {
        question: "At what portfolio size does broker choice really matter?",
        answer:
          "Above $100,000, platform and custody fees can exceed brokerage in annual cost. Above $250,000, you should prioritise zero or capped custody fees over low per-trade brokerage. Above $500,000, it is worth looking at institutional-grade platforms or private client services.",
      },
      {
        question: "Is Interactive Brokers safe for large Australian portfolios?",
        answer:
          "Interactive Brokers is one of the most regulated and financially robust brokers globally. It is regulated by ASIC in Australia and holds client assets separately from company assets. For accounts above $500,000 it may be worth spreading across two brokers to reduce single-counterparty risk.",
      },
      {
        question: "Should I use CHESS-sponsored or custodian model for a large portfolio?",
        answer:
          "CHESS-sponsored is preferable for large portfolios. Your shares are held directly in your name and you can transfer to another broker at any time without selling. If your broker collapses, your shares are safe. Custodian models are generally fine for smaller amounts but add unnecessary risk at scale.",
      },
    ],
  },
  // ─── SAVINGS CATEGORIES ────────────────────────────────────────────────────
  {
    slug: "online-savings-account",
    title: `Best Online Savings Account Australia (${yr})`,
    h1: "Best Online Savings Account in Australia",
    metaDescription: `Top online-only savings accounts compared. Higher rates than branch banks, no fees, instant access. ${upd}.`,
    intro: `Online-only banks consistently offer higher savings rates than traditional banks — they save on branch costs and pass the savings to customers. We compare the best online savings accounts by rate, conditions, and ease of use.`,
    filter: (b) => b.platform_type === "savings_account",
    sort: (a, b) => (b.asx_fee_value ?? 0) - (a.asx_fee_value ?? 0),
    criteria: ["Online account opening", "No branch requirement", "Competitive bonus rate", "Government deposit guarantee"],
    sections: [
      { heading: "Why Online Banks Pay Higher Rates", body: "Online banks don't have branches, which saves them millions in property costs and staff. They pass those savings to customers as higher interest rates. The trade-off? No in-person support — everything is done online or by phone." },
      { heading: "Is My Money Safe With an Online Bank?", body: "Yes. Online banks that are ADI-authorised are covered by the same $250,000 Government Deposit Guarantee as the big four banks. Your money is equally safe whether it's with CBA or an online-only challenger." },
    ],
    relatedLinks: [{ label: "Highest Interest Savings", href: "/best/high-interest-savings" }, { label: "Term Deposits", href: "/best/best-term-deposit-rates" }, { label: "Savings Calculator", href: "/savings-calculator" }],
    faqs: [
      { question: "Are online savings accounts safe?", answer: "Yes. Online savings accounts from ADI-authorised banks are covered by the Australian Government Deposit Guarantee up to $250,000, the same as traditional banks." },
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
