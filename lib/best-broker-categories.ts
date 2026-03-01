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
      { label: "Compare All Brokers", href: "/compare" },
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
      { label: "Compare All Brokers", href: "/compare" },
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
      { label: "Compare All Brokers", href: "/compare" },
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
      { label: "Compare All Brokers", href: "/compare" },
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
      { label: "Compare All Brokers", href: "/compare" },
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
      { label: "Compare All Brokers", href: "/compare" },
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
      { label: "Compare All Brokers", href: "/compare" },
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
      { label: "Compare All Brokers", href: "/compare" },
      { label: "Take the Broker Quiz", href: "/quiz" },
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
      { label: "Compare All Brokers", href: "/compare" },
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
      { label: "Compare All Brokers", href: "/compare" },
      { label: "Take the Broker Quiz", href: "/quiz" },
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
      { label: "Compare All Brokers", href: "/compare" },
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
      { label: "Compare All Brokers", href: "/compare" },
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
      { label: "Compare All Brokers", href: "/compare" },
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
