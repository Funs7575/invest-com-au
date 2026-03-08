/**
 * Hand-written editorial comparison content for high-traffic versus pages.
 * Each entry adds unique prose that can't be generated from fee data alone —
 * platform experience, UX quality, target audience, and nuanced trade-offs.
 *
 * This content is what separates a thin auto-generated comparison from a
 * genuinely useful comparison that Google ranks highly.
 */

export interface VersusEditorial {
  /** sorted slugs joined with "-vs-" */
  key: string;
  /** One-paragraph summary of the key difference */
  tldr: string;
  /** "Choose X if..." recommendations */
  chooseA: string;
  chooseB: string;
  /** 2-3 editorial sections with real analysis */
  sections: { heading: string; body: string }[];
  /** FAQ pairs for structured data */
  faqs?: { question: string; answer: string }[];
}

const content: VersusEditorial[] = [
  {
    key: "commsec-vs-stake",
    tldr: "Stake offers $0 ASX brokerage and a slick mobile app — ideal for cost-conscious investors. CommSec has Australia's largest platform with CHESS sponsorship and deep research tools, but charges $29.95 per trade. The choice comes down to whether you value rock-bottom fees or the full-service experience.",
    chooseA: "Choose CommSec if you want the most established Australian broker with comprehensive research, CHESS sponsorship, margin lending, and a track record spanning 150+ years. You'll pay more per trade, but you get the full Commonwealth Bank ecosystem.",
    chooseB: "Choose Stake if you want $0 ASX brokerage and a modern mobile-first experience. Stake is CHESS-sponsored and backed by a growing community of younger investors. Best for regular small trades where brokerage costs add up.",
    sections: [
      { heading: "The Fee Gap Is Enormous", body: "CommSec charges $29.95 for ASX trades up to $25,000, while Stake charges $0. For an investor making 2 trades per month, that's $719/year vs $0 — CommSec's fee alone could fund a month of groceries. Both are CHESS-sponsored, so your shares are equally safe." },
      { heading: "Platform Experience", body: "CommSec's platform shows its age in some areas but offers deep market data, analyst reports, and integration with NetBank. Stake's app is purpose-built for modern investors — clean, fast, and social (you can see what other users are trading). If you've used Robinhood, Stake will feel familiar." },
      { heading: "US Shares: Different Models", body: "Stake pioneered commission-free US trading in Australia. CommSec offers US shares too, but at $65.95 per trade plus a 0.6% FX fee. For US share investors, Stake is dramatically cheaper. CommSec's advantage is access to more markets beyond the US." },
    ],
    faqs: [
      { question: "Is Stake or CommSec better?", answer: "Stake is better for fee-conscious investors who primarily trade ASX and US shares. CommSec is better for investors who want comprehensive research, margin lending, and the security of a big-bank broker." },
      { question: "Is Stake as safe as CommSec?", answer: "Both are CHESS-sponsored and ASIC-regulated. Stake holds an AFSL and is covered by a professional indemnity insurance policy. CommSec is backed by Commonwealth Bank. Both are considered safe for Australian investors." },
    ],
  },
  {
    key: "cmc-markets-vs-commsec",
    tldr: "CMC Markets offers $0 brokerage on ASX trades up to $1,000 per day and consistently low fees on larger trades. CommSec charges a flat $29.95. For active traders, CMC is significantly cheaper while still offering professional-grade tools.",
    chooseA: "Choose CMC Markets if you're an active trader who wants professional charting tools, $0 brokerage on daily first trades, and access to international markets at competitive rates.",
    chooseB: "Choose CommSec if you want the simplicity of the CBA banking ecosystem, comprehensive research reports, and don't mind paying a premium for Australia's most recognisable broker brand.",
    sections: [
      { heading: "CMC's Free Daily Trade", body: "CMC Markets gives you one free ASX trade per day (up to $1,000 value). For investors making regular small purchases — like monthly ETF contributions — this means genuine $0 cost. Trades above $1,000 cost $11 or 0.10%, which is still far below CommSec's $29.95." },
      { heading: "Tools and Platform Quality", body: "CMC Markets' platform is built for traders — advanced charting, customisable watchlists, and real-time market data. It's more powerful than CommSec's platform but has a steeper learning curve. CommSec integrates neatly with NetBank which is convenient for CBA customers." },
      { heading: "International Markets", body: "CMC offers free brokerage on US, UK, Canadian, and Japanese shares — a standout offering. CommSec charges $65.95 per international trade. For globally diversified investors, CMC is dramatically cheaper across all markets." },
    ],
    faqs: [
      { question: "Is CMC Markets cheaper than CommSec?", answer: "Yes, significantly. CMC offers $0 on the first ASX trade daily (up to $1,000) and $11 or 0.10% for larger trades. CommSec charges $29.95 per trade. CMC also offers free international share trading." },
    ],
  },
  {
    key: "moomoo-vs-stake",
    tldr: "Both offer $0 ASX brokerage, but they target different investors. Moomoo gives you professional-level tools and market data, while Stake focuses on simplicity and US market access. Moomoo has richer features; Stake has a cleaner experience.",
    chooseA: "Choose Moomoo if you want advanced charting, Level 2 data, analyst ratings, and social trading features — all for $0 brokerage. Best for investors who want more tools without paying more.",
    chooseB: "Choose Stake if you prefer a clean, minimal interface and have a strong focus on US shares. Stake's US trading experience is more mature, with a longer track record in the Australian market.",
    sections: [
      { heading: "Both Are Free — So What's the Difference?", body: "With identical $0 ASX brokerage, the choice comes down to platform experience. Moomoo packs in professional features — real-time Level 2 data, AI-powered stock analysis, institutional flow tracking. Stake keeps things simple with a clean interface focused on quick execution." },
      { heading: "The Free Stock Promotions", body: "Both brokers run promotional offers for new sign-ups. Moomoo typically offers up to 38 free stocks for qualifying deposits, while Stake offers a free US stock (like Nike or GoPro). These promotions change regularly — check the current offers on each platform." },
      { heading: "US Shares", body: "Both offer US share trading, but Stake pioneered it in Australia and has a more established US trading infrastructure. Moomoo's US offering is newer but growing quickly, with more analytical tools available on US stocks than Stake provides." },
    ],
  },
  {
    key: "commsec-vs-selfwealth",
    tldr: "SelfWealth charges a flat $9.50 per trade — a fraction of CommSec's $29.95. Both are CHESS-sponsored. SelfWealth suits cost-conscious investors who don't need CommSec's research tools.",
    chooseA: "Choose CommSec if you value integrated banking, comprehensive research, and don't mind paying $29.95 per trade for the full CBA ecosystem.",
    chooseB: "Choose SelfWealth if you want CHESS sponsorship at a much lower cost ($9.50/trade) and a growing social investing community.",
    sections: [
      { heading: "The Price Difference", body: "On 24 trades per year, CommSec costs $719 in brokerage. SelfWealth costs $228. That's $491 saved annually — real money that stays invested and compounding in your portfolio." },
      { heading: "CHESS Sponsorship on Both", body: "Both CommSec and SelfWealth offer CHESS sponsorship, meaning your shares are held in your name on the ASX register. This is the highest level of ownership protection available in Australia. Some cheaper brokers use custodial models — SelfWealth doesn't." },
    ],
    faqs: [
      { question: "Is SelfWealth as safe as CommSec?", answer: "Both are CHESS-sponsored and ASIC-regulated. SelfWealth uses the same ASX settlement system as CommSec. The main difference is CommSec is backed by CBA (a big-four bank), while SelfWealth is a standalone ASX-listed company." },
    ],
  },
  {
    key: "commsec-vs-interactive-brokers",
    tldr: "Interactive Brokers offers the lowest fees for large and international trades, plus access to 150+ markets globally. CommSec is simpler and more familiar for Australian-only investors. IBKR wins on cost and global access; CommSec wins on simplicity.",
    chooseA: "Choose CommSec if you trade exclusively on the ASX and want a simple, familiar Australian broker integrated with your CBA banking.",
    chooseB: "Choose Interactive Brokers if you trade internationally, want the lowest margin rates, or need access to options, futures, and 150+ global markets.",
    sections: [
      { heading: "Global vs Local", body: "Interactive Brokers gives you access to stocks, options, futures, forex, and bonds across 150+ markets in 33 countries — from the NYSE to the Tokyo Stock Exchange. CommSec is primarily focused on the ASX with limited international access. If you invest globally, IBKR is in a different league." },
      { heading: "Fees for Large Trades", body: "IBKR's tiered pricing starts at 0.08% for ASX trades — on a $50,000 trade, that's $40 vs CommSec's $29.95. But on US trades, IBKR charges $0.005/share (often under $1 per trade) vs CommSec's $65.95. For international investors, IBKR saves thousands per year." },
      { heading: "Complexity Trade-off", body: "IBKR's Trader Workstation is powerful but intimidating. It's designed for professionals and active traders. CommSec's interface is simpler and more familiar to everyday Australians. If you just want to buy ASX shares and ETFs, CommSec's simplicity is an advantage." },
    ],
  },
  {
    key: "ic-markets-vs-pepperstone",
    tldr: "Australia's two biggest CFD/Forex brokers go head-to-head. Both offer tight spreads, MT4/MT5, and ASIC regulation. Pepperstone has better customer service and educational content; IC Markets has marginally tighter spreads on some pairs.",
    chooseA: "Choose IC Markets if you want the tightest possible spreads on major forex pairs and don't need hand-holding — great for experienced traders.",
    chooseB: "Choose Pepperstone if you value strong customer support, educational resources, and a slightly more polished overall experience. Great for intermediate traders moving to CFDs.",
    sections: [
      { heading: "Spreads: Near Identical", body: "Both IC Markets and Pepperstone offer raw spread accounts starting from 0.0 pips on EUR/USD, with commissions of $3-3.50 per side. In practice, the spread difference is negligible — both are among the tightest in the world. The choice between them comes down to other factors." },
      { heading: "Regulation and Safety", body: "Both hold Australian AFSLs and are regulated by ASIC. IC Markets is also regulated by CySEC and FSA. Pepperstone holds licences from ASIC, FCA, CySEC, BaFin, DFSA, and others. Both keep client funds in segregated trust accounts with major Australian banks." },
      { heading: "Platform and Tools", body: "Both offer MT4, MT5, and cTrader. Pepperstone also offers TradingView integration and a proprietary mobile app. IC Markets focuses on raw execution speed for algorithmic traders. For manual traders, Pepperstone's platform ecosystem is slightly more modern." },
    ],
    faqs: [
      { question: "Is IC Markets or Pepperstone better for forex?", answer: "Both are excellent for forex trading with near-identical spreads. Pepperstone has better educational content and customer support. IC Markets has a slight edge on raw execution speed. For most traders, either is a strong choice." },
    ],
  },
  {
    key: "coinspot-vs-swyftx",
    tldr: "Australia's two most popular crypto exchanges. CoinSpot is simpler and has the widest coin selection (400+). Swyftx has lower fees and better charting tools. Both are AUSTRAC-registered.",
    chooseA: "Choose CoinSpot if you want the widest selection of altcoins (400+) and a simple buy/sell interface. Best for crypto explorers who want access to everything.",
    chooseB: "Choose Swyftx if you want lower trading fees (0.6% vs CoinSpot's 1%) and more advanced trading tools like limit orders and portfolio tracking.",
    sections: [
      { heading: "Fees: Swyftx Wins", body: "CoinSpot charges 1% on instant buy/sell and 0.1% on their market. Swyftx charges 0.6% with no hidden spread. On a $5,000 trade, that's $50 vs $30 — over a year of regular buying, Swyftx saves hundreds." },
      { heading: "Coin Selection: CoinSpot Wins", body: "CoinSpot lists 400+ coins — nearly everything in the crypto market. Swyftx lists 320+. For mainstream coins (BTC, ETH, SOL), both are equivalent. If you want obscure altcoins, CoinSpot has better coverage." },
      { heading: "Security", body: "Both are AUSTRAC-registered and store the majority of crypto in cold storage. CoinSpot has been operating since 2013, Swyftx since 2017. Both have strong security track records with no major breaches." },
    ],
  },
  {
    key: "commsec-vs-moomoo",
    tldr: "Moomoo offers $0 ASX brokerage and professional tools; CommSec charges $29.95 but has 150+ years of trust and the CBA banking ecosystem. Moomoo is the modern challenger; CommSec is the established incumbent.",
    chooseA: "Choose CommSec if you want the reliability and integration of Australia's biggest bank-backed broker and don't mind paying for it.",
    chooseB: "Choose Moomoo if you want $0 brokerage, advanced real-time data, and a feature-rich platform without paying a premium.",
    sections: [
      { heading: "The Trust Factor", body: "CommSec is backed by Commonwealth Bank — Australia's largest bank. That heritage carries significant trust. Moomoo is backed by Futu Holdings (NASDAQ-listed, $6B+ market cap) and holds an AFSL. Both are CHESS-sponsored. For risk-averse investors, CommSec's brand recognition provides comfort." },
      { heading: "Features Per Dollar", body: "Moomoo gives you more features for $0 than CommSec gives for $29.95 — Level 2 data, AI stock analysis, analyst consensus, institutional flow tracking. CommSec's research is solid but dated. If features-per-dollar is your metric, Moomoo wins convincingly." },
    ],
  },
  {
    key: "commsec-vs-nabtrade",
    tldr: "Two big-bank brokers with similar pricing ($29.95 vs $14.95) but different strengths. NABtrade is cheaper and has a better platform; CommSec has deeper research integration with CBA.",
    chooseA: "Choose CommSec if you're a CBA customer who values the integrated banking experience and comprehensive analyst research.",
    chooseB: "Choose NABtrade if you want a big-bank broker at nearly half the cost ($14.95 for trades up to $5,000) with CHESS sponsorship.",
    sections: [
      { heading: "Brokerage Comparison", body: "NABtrade charges $14.95 for trades up to $5,000 and $19.95 for trades $5,000-$20,000. CommSec charges $29.95 for trades up to $25,000. For typical investors making $2,000-$5,000 trades, NABtrade is about half the price." },
      { heading: "Both Are CHESS Sponsored", body: "Both CommSec and NABtrade offer CHESS sponsorship — your shares are held directly in your name on the ASX register. Both are backed by big-four Australian banks, so counterparty risk is minimal." },
    ],
  },
  {
    key: "etoro-vs-stake",
    tldr: "eToro brings social trading and copy-trading to Australia; Stake focuses on straightforward $0 brokerage. eToro is unique for its social features but uses a custodial model. Stake is CHESS-sponsored.",
    chooseA: "Choose eToro if you want social trading features — follow successful investors and automatically copy their trades. Also good for crypto alongside shares.",
    chooseB: "Choose Stake if you want CHESS sponsorship, $0 ASX brokerage, and a clean no-frills trading experience.",
    sections: [
      { heading: "Social Trading Is Unique", body: "eToro's standout feature is CopyTrader — automatically replicate the portfolio of successful traders. No other Australian platform offers this. For beginners who want to learn by following experienced investors, it's a compelling proposition." },
      { heading: "Ownership Model: Key Difference", body: "Stake offers CHESS sponsorship — your ASX shares are in your name. eToro uses a custodial model where they hold shares on your behalf. This matters for investor protection: CHESS-sponsored shares are yours regardless of what happens to the broker." },
    ],
  },
];

const contentMap = new Map<string, VersusEditorial>();
for (const c of content) contentMap.set(c.key, c);

/**
 * Get editorial content for a versus comparison.
 * Normalises slug order so stake-vs-commsec and commsec-vs-stake both work.
 */
export function getVersusEditorial(slugs: string[]): VersusEditorial | null {
  const sorted = [...slugs].sort();
  const key = sorted.join("-vs-");
  return contentMap.get(key) || null;
}

export function getAllVersusEditorialKeys(): string[] {
  return content.map(c => c.key);
}
