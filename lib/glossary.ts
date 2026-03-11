/**
 * Central glossary of financial jargon used across the site.
 * Each term maps to a plain-English definition that a beginner investor
 * can understand without prior financial knowledge.
 *
 * Used by:
 * - JargonTooltip component (inline tooltips)
 * - /glossary page (full A-Z glossary)
 */

export interface GlossaryEntry {
  term: string;
  slug: string;
  definition: string;
  /** Optional category for grouping on the glossary page */
  category?: string;
}

/** Flat lookup for JargonTooltip (backwards-compatible) */
export const GLOSSARY: Record<string, string> = {};

/** Full glossary with categories */
export const GLOSSARY_ENTRIES: GlossaryEntry[] = [
  // ─── General Investing ───
  {
    term: "ASX",
    slug: "asx",
    definition:
      "Australian Securities Exchange — Australia's primary stock exchange where shares, ETFs, and other securities are traded.",
    category: "General",
  },
  {
    term: "ASX Fee",
    slug: "asx-fee",
    definition:
      "The fee your broker charges each time you buy or sell Australian shares (listed on the ASX).",
    category: "Fees",
  },
  {
    term: "US Fee",
    slug: "us-fee",
    definition:
      "The fee to buy or sell US shares — like Apple, Tesla, or US ETFs.",
    category: "Fees",
  },
  {
    term: "FX Rate",
    slug: "fx-rate",
    definition:
      "The currency conversion markup when you buy shares in a foreign currency (e.g. USD). Lower is better.",
    category: "Fees",
  },
  {
    term: "Brokerage",
    slug: "brokerage",
    definition:
      "The fee you pay your broker for executing a buy or sell trade.",
    category: "Fees",
  },
  {
    term: "Management Fee",
    slug: "management-fee",
    definition:
      "An ongoing annual fee charged by a fund, ETF, or robo-advisor for managing your money. Usually shown as a percentage (e.g. 0.50% p.a.).",
    category: "Fees",
  },
  {
    term: "Spread",
    slug: "spread",
    definition:
      "The difference between the buy and sell price of an asset. A tighter spread means lower trading cost.",
    category: "Fees",
  },
  {
    term: "CHESS",
    slug: "chess",
    definition:
      "A system where shares are registered directly in your name on the ASX register — not held by your broker. Safer if the broker goes bust.",
    category: "Share Trading",
  },
  {
    term: "Custodial",
    slug: "custodial",
    definition:
      "A model where your broker holds shares on your behalf (in their name). You still own them, but they aren't registered directly to you on the ASX.",
    category: "Share Trading",
  },
  {
    term: "ETF",
    slug: "etf",
    definition:
      "Exchange-Traded Fund — a basket of investments (shares, bonds, etc.) that trades on the ASX like a single share. A simple way to diversify.",
    category: "General",
  },
  {
    term: "Index Fund",
    slug: "index-fund",
    definition:
      "A fund that tracks a market index (like the ASX 200 or S&P 500) by holding the same stocks in the same proportions.",
    category: "General",
  },
  {
    term: "Dividend",
    slug: "dividend",
    definition:
      "A payment made by a company to its shareholders, usually from profits. Paid quarterly or semi-annually in Australia.",
    category: "General",
  },
  {
    term: "DRP",
    slug: "drp",
    definition:
      "Dividend Reinvestment Plan — instead of receiving cash dividends, you automatically receive more shares in the company.",
    category: "General",
  },
  {
    term: "Market Order",
    slug: "market-order",
    definition:
      "An order to buy or sell immediately at the best available price. Fast, but you don't control the exact price.",
    category: "Share Trading",
  },
  {
    term: "Limit Order",
    slug: "limit-order",
    definition:
      "An order to buy or sell only at a specific price (or better). You control the price, but the trade may not happen if the price isn't reached.",
    category: "Share Trading",
  },
  {
    term: "Dollar Cost Averaging",
    slug: "dollar-cost-averaging",
    definition:
      "Investing a fixed amount at regular intervals (e.g. $500/month) regardless of price. Reduces the impact of market volatility over time.",
    category: "Strategy",
  },

  // ─── Tax & Compliance ───
  {
    term: "CGT",
    slug: "cgt",
    definition:
      "Capital Gains Tax — tax you pay on the profit when you sell shares for more than you paid.",
    category: "Tax",
  },
  {
    term: "Franking Credits",
    slug: "franking-credits",
    definition:
      "Tax credits attached to dividends from Australian companies that have already paid company tax — they can reduce your tax bill.",
    category: "Tax",
  },
  {
    term: "Tax-Loss Harvesting",
    slug: "tax-loss-harvesting",
    definition:
      "Selling investments at a loss to offset capital gains and reduce your tax bill. The loss can be carried forward to future years.",
    category: "Tax",
  },
  {
    term: "Negative Gearing",
    slug: "negative-gearing",
    definition:
      "When the costs of an investment property (interest, maintenance) exceed the rental income. The loss can be deducted from your taxable income.",
    category: "Tax",
  },

  // ─── Regulatory ───
  {
    term: "ASIC",
    slug: "asic",
    definition:
      "Australian Securities & Investments Commission — Australia's financial regulator that oversees brokers, fund managers, and financial advisers.",
    category: "Regulatory",
  },
  {
    term: "ASIC-regulated",
    slug: "asic-regulated",
    definition:
      "ASIC (Australian Securities & Investments Commission) is Australia's financial regulator. All brokers on this site hold an Australian Financial Services Licence.",
    category: "Regulatory",
  },
  {
    term: "AFSL",
    slug: "afsl",
    definition:
      "Australian Financial Services Licence — a licence issued by ASIC that allows a company to provide financial services in Australia.",
    category: "Regulatory",
  },
  {
    term: "AFCA",
    slug: "afca",
    definition:
      "Australian Financial Complaints Authority — a free, independent dispute resolution service. If your broker doesn't resolve a complaint, AFCA can help.",
    category: "Regulatory",
  },
  {
    term: "AUSTRAC",
    slug: "austrac",
    definition:
      "Australian Transaction Reports and Analysis Centre — regulates crypto exchanges and monitors financial transactions for anti-money laundering compliance.",
    category: "Regulatory",
  },
  {
    term: "PDS",
    slug: "pds",
    definition:
      "Product Disclosure Statement — a legal document from the broker that explains a financial product's features, fees, and risks.",
    category: "Regulatory",
  },
  {
    term: "TMD",
    slug: "tmd",
    definition:
      "Target Market Determination — a document that describes who a financial product is designed for.",
    category: "Regulatory",
  },

  // ─── Super ───
  {
    term: "SMSF",
    slug: "smsf",
    definition:
      "Self-Managed Super Fund — a way to manage your own retirement savings and invest directly in shares, ETFs, and more.",
    category: "Super",
  },
  {
    term: "Superannuation",
    slug: "superannuation",
    definition:
      "Australia's compulsory retirement savings system. Your employer contributes a percentage of your salary (currently 11.5%) into a super fund.",
    category: "Super",
  },
  {
    term: "Concessional Contributions",
    slug: "concessional-contributions",
    definition:
      "Super contributions taxed at 15% (instead of your marginal rate). Includes employer contributions and salary sacrifice. Capped at $30,000/year.",
    category: "Super",
  },
  {
    term: "Salary Sacrifice",
    slug: "salary-sacrifice",
    definition:
      "Redirecting part of your pre-tax salary into super. You pay 15% contributions tax instead of your marginal rate, saving tax.",
    category: "Super",
  },

  // ─── Crypto ───
  {
    term: "Blockchain",
    slug: "blockchain",
    definition:
      "A decentralised digital ledger that records all transactions across a network. The technology behind Bitcoin, Ethereum, and other cryptocurrencies.",
    category: "Crypto",
  },
  {
    term: "Wallet",
    slug: "wallet",
    definition:
      "Software or hardware that stores your cryptocurrency private keys. Needed to send, receive, and manage crypto outside of an exchange.",
    category: "Crypto",
  },
  {
    term: "Staking",
    slug: "staking",
    definition:
      "Locking up crypto to support a blockchain network and earn rewards — similar to earning interest. Available on proof-of-stake coins like Ethereum.",
    category: "Crypto",
  },
  {
    term: "DeFi",
    slug: "defi",
    definition:
      "Decentralised Finance — financial services (lending, borrowing, trading) built on blockchain without traditional banks or intermediaries.",
    category: "Crypto",
  },
  {
    term: "Altcoin",
    slug: "altcoin",
    definition:
      "Any cryptocurrency that isn't Bitcoin. Includes Ethereum, Solana, Cardano, and thousands of others. Generally higher risk and more volatile.",
    category: "Crypto",
  },
  {
    term: "Cold Storage",
    slug: "cold-storage",
    definition:
      "Keeping your cryptocurrency offline (on a hardware wallet like Ledger) where hackers can't reach it. The safest way to store large crypto holdings.",
    category: "Crypto",
  },

  // ─── More General ───
  {
    term: "Diversification",
    slug: "diversification",
    definition:
      "Spreading your investments across different assets, sectors, or countries to reduce risk. 'Don't put all your eggs in one basket.'",
    category: "General",
  },
  {
    term: "Compound Interest",
    slug: "compound-interest",
    definition:
      "Earning returns on your returns. e.g. $10,000 at 8% p.a. grows to $21,589 in 10 years because each year's gains also earn returns.",
    category: "General",
  },
  {
    term: "P/E Ratio",
    slug: "pe-ratio",
    definition:
      "Price-to-Earnings ratio — a company's share price divided by its earnings per share. A quick way to gauge if a share is cheap or expensive relative to its profits.",
    category: "General",
  },

  // ─── More Super ───
  {
    term: "MySuper",
    slug: "mysuper",
    definition:
      "A simple, low-cost default super option that every fund must offer. If you don't choose a specific investment option, your money goes into MySuper.",
    category: "Super",
  },
  {
    term: "APRA",
    slug: "apra",
    definition:
      "Australian Prudential Regulation Authority — the regulator that supervises super funds, banks, and insurance companies to ensure they're financially sound.",
    category: "Regulatory",
  },
  {
    term: "Preservation Age",
    slug: "preservation-age",
    definition:
      "The age you can access your super — between 55 and 60 depending on when you were born. Born after 1 July 1964? Your preservation age is 60.",
    category: "Super",
  },

  // ─── CFDs & Forex ───
  {
    term: "CFD",
    slug: "cfd",
    definition:
      "Contract for Difference — a leveraged product that lets you speculate on price movements without owning the asset. High risk — most retail accounts lose money.",
    category: "CFD & Forex",
  },
  {
    term: "Leverage",
    slug: "leverage",
    definition:
      "Borrowing money from your broker to trade a larger position. Magnifies both profits and losses. e.g. 30:1 leverage means $1 controls $30.",
    category: "CFD & Forex",
  },
  {
    term: "Margin",
    slug: "margin",
    definition:
      "The deposit required to open a leveraged position. If your losses exceed your margin, you may face a margin call and forced liquidation.",
    category: "CFD & Forex",
  },
  {
    term: "Pip",
    slug: "pip",
    definition:
      "The smallest price increment in forex trading. For most currency pairs, 1 pip = 0.0001 (e.g. AUD/USD moving from 0.6500 to 0.6501).",
    category: "CFD & Forex",
  },
  {
    term: "Stop-Loss",
    slug: "stop-loss",
    definition:
      "An order that automatically closes your position if the price moves against you by a set amount. Limits potential losses.",
    category: "CFD & Forex",
  },

  {
    term: "Overnight Financing",
    slug: "overnight-financing",
    definition:
      "A fee charged for holding a leveraged CFD position overnight. Also called a swap rate. Costs add up if you hold positions for days or weeks.",
    category: "CFD & Forex",
  },
  {
    term: "Short Selling",
    slug: "short-selling",
    definition:
      "Selling an asset you don't own (borrowing it first) to profit from a price drop. You buy it back later at a lower price. Very risky if the price rises instead.",
    category: "CFD & Forex",
  },

  // ─── Robo-Advisors ───
  {
    term: "Robo-Advisor",
    slug: "robo-advisor",
    definition:
      "An automated investing service that builds and manages a diversified portfolio for you based on your goals and risk tolerance. Low fees, hands-off.",
    category: "Robo-Advisors",
  },
  {
    term: "Risk Tolerance",
    slug: "risk-tolerance",
    definition:
      "How much investment volatility (ups and downs) you're comfortable with. Robo-advisors use this to choose your portfolio mix.",
    category: "Robo-Advisors",
  },
  {
    term: "Rebalancing",
    slug: "rebalancing",
    definition:
      "Adjusting your portfolio back to its target mix (e.g. 60% shares, 40% bonds) when market movements cause it to drift. Robo-advisors do this automatically.",
    category: "Robo-Advisors",
  },
  {
    term: "Micro-Investing",
    slug: "micro-investing",
    definition:
      "Investing tiny amounts (often spare change from round-ups) into a diversified portfolio. Apps like Raiz and Spaceship make this automatic.",
    category: "Robo-Advisors",
  },
  {
    term: "Socially Responsible Investing",
    slug: "socially-responsible-investing",
    definition:
      "Investing in companies that meet environmental, social, and governance (ESG) criteria — avoiding fossil fuels, weapons, or tobacco. Most robo-advisors offer an SRI portfolio option.",
    category: "Robo-Advisors",
  },

  // ─── Research Tools ───
  {
    term: "Fundamental Analysis",
    slug: "fundamental-analysis",
    definition:
      "Evaluating a company's financial health (revenue, earnings, debt) to determine if its share price is fair value. Used by tools like Simply Wall St and Stock Doctor.",
    category: "Share Trading",
  },
  {
    term: "Technical Analysis",
    slug: "technical-analysis",
    definition:
      "Using charts, price patterns, and indicators (RSI, MACD, moving averages) to predict future price movements. Used heavily in platforms like TradingView.",
    category: "Share Trading",
  },
  {
    term: "Stock Screener",
    slug: "stock-screener",
    definition:
      "A tool that filters shares based on criteria you set (e.g. P/E ratio under 15, dividend yield over 4%). Helps find investment opportunities quickly.",
    category: "Share Trading",
  },

  // ─── Property ───
  {
    term: "REIT",
    slug: "reit",
    definition:
      "Real Estate Investment Trust — a company that owns and operates income-producing property. Trades on the ASX like a share, letting you invest in property without buying a house.",
    category: "Property",
  },
  {
    term: "Fractional Property",
    slug: "fractional-property",
    definition:
      "Investing in a portion of a property (e.g. $100 worth) through platforms like BrickX. Lower entry cost than buying a whole property.",
    category: "Property",
  },
  {
    term: "Rental Yield",
    slug: "rental-yield",
    definition:
      "Annual rental income as a percentage of the property's value. e.g. $25,000 rent on a $500,000 property = 5% yield.",
    category: "Property",
  },

  // ─── Platform & Account Types ───
  {
    term: "HIN",
    slug: "hin",
    definition:
      "Holder Identification Number — a unique number assigned to you when your shares are CHESS-sponsored. It starts with an 'X' and lets you transfer shares between brokers without selling.",
    category: "Share Trading",
  },
  {
    term: "Fractional Shares",
    slug: "fractional-shares",
    definition:
      "Buying a portion of a share instead of a whole one. e.g. $50 worth of a $500 share. Offered by some platforms to lower the entry barrier.",
    category: "Share Trading",
  },
  {
    term: "Inactivity Fee",
    slug: "inactivity-fee",
    definition:
      "A fee some platforms charge if you don't trade for a certain period (e.g. 6 or 12 months). Many modern platforms have removed this fee.",
    category: "Fees",
  },
  {
    term: "Paper Trading",
    slug: "paper-trading",
    definition:
      "Practising trades with fake money in a simulated market. A risk-free way to learn before investing real money. Also called a demo account.",
    category: "Share Trading",
  },
  {
    term: "SRS",
    slug: "srs",
    definition:
      "Sponsored Reporting Service — CHESS-sponsored holders receive statements directly from the ASX registry (Computershare or Link Market Services) confirming their holdings.",
    category: "Share Trading",
  },
];

// Populate the flat GLOSSARY lookup from entries
for (const entry of GLOSSARY_ENTRIES) {
  GLOSSARY[entry.term] = entry.definition;
}
