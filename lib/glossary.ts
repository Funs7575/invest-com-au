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
  // ─── Property Investing ───
  {
    term: "LVR",
    slug: "lvr",
    definition:
      "Loan-to-Value Ratio — the percentage of a property's value that you're borrowing. e.g. borrowing $400,000 on a $500,000 property = 80% LVR. Above 80% usually requires Lenders Mortgage Insurance.",
    category: "Property",
  },
  {
    term: "LMI",
    slug: "lmi",
    definition:
      "Lenders Mortgage Insurance — a one-off insurance premium you pay when borrowing more than 80% of a property's value. Protects the lender (not you) if you default. Can cost $5,000–$30,000+.",
    category: "Property",
  },
  {
    term: "Offset Account",
    slug: "offset-account",
    definition:
      "A savings account linked to your mortgage. Money in the offset reduces the loan balance that interest is calculated on. e.g. $50,000 in offset on a $500,000 loan = interest charged on $450,000.",
    category: "Property",
  },
  {
    term: "Capital Growth",
    slug: "capital-growth",
    definition:
      "The increase in an asset's value over time. e.g. a property bought for $600,000 that's now worth $750,000 has had $150,000 (25%) capital growth.",
    category: "Property",
  },
  {
    term: "Equity",
    slug: "equity",
    definition:
      "The portion of a property you actually own — the property's value minus what you owe on the mortgage. Can be used as security to borrow for further investments.",
    category: "Property",
  },
  {
    term: "Settlement",
    slug: "settlement",
    definition:
      "The legal process of transferring property ownership from seller to buyer. In Australia, settlement typically takes 30–90 days after contracts are exchanged.",
    category: "Property",
  },

  // ─── Bonds & Fixed Income ───
  {
    term: "Bond",
    slug: "bond",
    definition:
      "A loan you make to a government or company in exchange for regular interest payments and your money back at maturity. Generally lower risk than shares but lower returns.",
    category: "General",
  },
  {
    term: "Term Deposit",
    slug: "term-deposit",
    definition:
      "A bank deposit where you lock your money away for a fixed period (1 month to 5 years) at a guaranteed interest rate. Safe but inflexible — early withdrawal incurs penalties.",
    category: "General",
  },
  {
    term: "Yield",
    slug: "yield",
    definition:
      "The income return on an investment, expressed as a percentage. e.g. a share paying $2 in annual dividends with a $40 price has a 5% dividend yield.",
    category: "General",
  },
  {
    term: "Coupon Rate",
    slug: "coupon-rate",
    definition:
      "The annual interest rate paid by a bond, expressed as a percentage of its face value. e.g. a $1,000 bond with a 4% coupon pays $40/year in interest.",
    category: "General",
  },

  // ─── Insurance & Protection ───
  {
    term: "Income Protection",
    slug: "income-protection",
    definition:
      "Insurance that replaces up to 75% of your income if you can't work due to illness or injury. Premiums are generally tax-deductible in Australia.",
    category: "Insurance",
  },
  {
    term: "TPD Insurance",
    slug: "tpd-insurance",
    definition:
      "Total and Permanent Disability insurance — pays a lump sum if you become permanently unable to work. Often held inside super to reduce out-of-pocket cost.",
    category: "Insurance",
  },
  {
    term: "Life Insurance",
    slug: "life-insurance",
    definition:
      "Pays a lump sum to your beneficiaries if you die. Can be held inside or outside super. The amount should cover debts, living expenses for dependants, and future goals.",
    category: "Insurance",
  },

  // ─── More Tax & Compliance ───
  {
    term: "Trust",
    slug: "trust",
    definition:
      "A legal structure where a trustee holds assets on behalf of beneficiaries. Family (discretionary) trusts allow flexible distribution of investment income to reduce overall tax.",
    category: "Tax",
  },
  {
    term: "Marginal Tax Rate",
    slug: "marginal-tax-rate",
    definition:
      "The tax rate you pay on each additional dollar of income. In Australia, rates range from 0% (under $18,200) to 45% (over $190,000) plus the 2% Medicare levy.",
    category: "Tax",
  },
  {
    term: "PAYG",
    slug: "payg",
    definition:
      "Pay As You Go — Australia's system for collecting income tax throughout the year (via employer withholding) rather than in one lump sum at tax time.",
    category: "Tax",
  },
  {
    term: "Cost Base",
    slug: "cost-base",
    definition:
      "The original cost of an investment plus associated costs (brokerage, stamp duty). Used to calculate capital gains or losses when you sell.",
    category: "Tax",
  },

  // ─── Advanced Investing ───
  {
    term: "Blue Chip",
    slug: "blue-chip",
    definition:
      "Large, well-established companies with a long history of reliable performance. In Australia, blue chips include BHP, CBA, CSL, and Woolworths. Lower risk but also lower growth potential than small caps.",
    category: "Share Trading",
  },
  {
    term: "Small Cap",
    slug: "small-cap",
    definition:
      "A company with a relatively small market capitalisation (typically under $2 billion in Australia). Higher growth potential but also higher risk and volatility than large caps.",
    category: "Share Trading",
  },
  {
    term: "Market Capitalisation",
    slug: "market-capitalisation",
    definition:
      "The total value of a company's shares — calculated by multiplying the share price by the number of shares on issue. Used to classify companies as large cap, mid cap, or small cap.",
    category: "Share Trading",
  },
  {
    term: "IPO",
    slug: "ipo",
    definition:
      "Initial Public Offering — when a private company lists on the stock exchange for the first time, offering shares to the public. Can be high-reward but also high-risk.",
    category: "Share Trading",
  },
  {
    term: "Vesting",
    slug: "vesting",
    definition:
      "The process by which you gain full ownership of employer-granted shares or options over time. Common in startup and tech company compensation packages.",
    category: "Share Trading",
  },
  {
    term: "ASX 200",
    slug: "asx-200",
    definition:
      "An index of the 200 largest companies listed on the ASX by market capitalisation. The main benchmark for the Australian share market's performance.",
    category: "General",
  },
  {
    term: "Bear Market",
    slug: "bear-market",
    definition:
      "A sustained decline in the market — typically defined as a 20%+ drop from recent highs. The opposite of a bull market. Bear markets are normal and historically temporary.",
    category: "General",
  },
  {
    term: "Bull Market",
    slug: "bull-market",
    definition:
      "A sustained period of rising share prices. Generally defined as a 20%+ rise from recent lows. Bull markets tend to last longer than bear markets.",
    category: "General",
  },
  {
    term: "Volatility",
    slug: "volatility",
    definition:
      "How much an investment's price fluctuates over time. High volatility means bigger price swings (up and down). Crypto and small caps are high volatility; bonds and term deposits are low volatility.",
    category: "General",
  },
  {
    term: "Liquidity",
    slug: "liquidity",
    definition:
      "How quickly and easily an asset can be converted to cash without significantly affecting its price. ASX blue chips and major ETFs are highly liquid; property and unlisted investments are illiquid.",
    category: "General",
  },

  // ─── General Investing (new) ───
  {
    term: "Dollar-Cost Averaging",
    slug: "dollar-cost-averaging",
    definition:
      "Investing a fixed amount at regular intervals regardless of price, automatically buying more units when prices are low and fewer when high. Removes emotion from timing decisions.",
    category: "General",
  },
  {
    term: "Asset Allocation",
    slug: "asset-allocation",
    definition:
      "How you divide your portfolio across different asset classes — shares, bonds, property, cash. Your allocation should reflect your goals and risk tolerance.",
    category: "General",
  },
  {
    term: "Passive Investing",
    slug: "passive-investing",
    definition:
      "An investment approach that tracks a market index rather than trying to beat it. Typically done through ETFs. Lower fees and historically outperforms most active managers over the long term.",
    category: "General",
  },
  {
    term: "Active Investing",
    slug: "active-investing",
    definition:
      "Picking individual shares or timing the market to try to outperform a benchmark. Higher fees and most active fund managers underperform their index over 10+ years.",
    category: "General",
  },
  {
    term: "Portfolio Rebalancing",
    slug: "portfolio-rebalancing",
    definition:
      "Adjusting your portfolio back to your target allocation after market movements shift the weights. E.g. if shares rise to 75% of your portfolio but your target is 70%, you sell some shares to rebalance.",
    category: "General",
  },
  {
    term: "Managed Fund",
    slug: "managed-fund",
    definition:
      "A pooled investment where a professional fund manager makes investment decisions on behalf of investors. Unlike ETFs, most managed funds are not listed on the ASX and are bought/sold at end-of-day prices.",
    category: "General",
  },
  {
    term: "Infrastructure Fund",
    slug: "infrastructure-fund",
    definition:
      "A fund that invests in physical infrastructure assets like toll roads, airports, ports, and utilities. Typically offers stable, inflation-linked income streams. Examples: APA Group, Transurban, IFT.",
    category: "General",
  },

  // ─── Share Trading (new) ───
  {
    term: "Listed Investment Company",
    slug: "listed-investment-company",
    definition:
      "An ASX-listed company that holds a portfolio of investments. Like an ETF but structured as a company. Trades at a premium or discount to its net asset value (NAV). Examples: AFI, MLT, ARG.",
    category: "Share Trading",
  },
  {
    term: "Net Asset Value",
    slug: "net-asset-value",
    definition:
      "The per-unit value of a fund's assets minus liabilities. For ETFs, the share price trades close to NAV. For LICs, the share price can trade at a premium or discount to NAV.",
    category: "Share Trading",
  },
  {
    term: "Earnings Per Share",
    slug: "earnings-per-share",
    definition:
      "A company's net profit divided by the number of shares on issue. Higher EPS generally means the company is more profitable. Used to calculate the P/E ratio.",
    category: "Share Trading",
  },
  {
    term: "Price-to-Book Ratio",
    slug: "price-to-book-ratio",
    definition:
      "A company's share price divided by its book value per share (assets minus liabilities). A ratio below 1 may indicate the shares are undervalued relative to assets.",
    category: "Share Trading",
  },
  {
    term: "Economic Moat",
    slug: "economic-moat",
    definition:
      "A sustainable competitive advantage that protects a company's profits from competitors. Coined by Warren Buffett. Examples: brand strength (CBA), switching costs (Xero), cost advantages (Woolworths).",
    category: "Share Trading",
  },
  {
    term: "Value Investing",
    slug: "value-investing",
    definition:
      "Buying shares that appear underpriced relative to their intrinsic value — often measured by P/E, P/B, or dividend yield. Made famous by Warren Buffett and Benjamin Graham.",
    category: "Share Trading",
  },
  {
    term: "Growth Investing",
    slug: "growth-investing",
    definition:
      "Focusing on companies expected to grow earnings faster than average, often reinvesting profits rather than paying dividends. Examples: tech stocks, small-cap innovators. Higher risk, higher potential return.",
    category: "Share Trading",
  },
  {
    term: "Ex-Dividend Date",
    slug: "ex-dividend-date",
    definition:
      "The date from which new buyers are no longer entitled to receive the upcoming dividend. If you buy shares on or after the ex-dividend date, you won't receive that payment. The share price typically falls by roughly the dividend amount on this date.",
    category: "Share Trading",
  },
  {
    term: "Rights Issue",
    slug: "rights-issue",
    definition:
      "When a company offers existing shareholders the right to buy additional new shares at a discounted price, usually to raise capital. Shareholders can exercise the right (buy the shares) or sell the rights on the ASX.",
    category: "Share Trading",
  },
  {
    term: "Share Buyback",
    slug: "share-buyback",
    definition:
      "When a company repurchases its own shares from the market, reducing the total shares on issue. Often signals management believes the shares are undervalued. Increases earnings per share for remaining shareholders.",
    category: "Share Trading",
  },

  // ─── Super (new) ───
  {
    term: "Accumulation Phase",
    slug: "accumulation-phase",
    definition:
      "The period during your working life when you are building your super balance through contributions and investment returns. Earnings in accumulation phase are taxed at 15%.",
    category: "Super",
  },
  {
    term: "Pension Phase",
    slug: "pension-phase",
    definition:
      "When you convert your super into an income stream (account-based pension) in retirement. Investment earnings and income payments are tax-free (up to the transfer balance cap of $1.9 million in 2026).",
    category: "Super",
  },
  {
    term: "Transition to Retirement",
    slug: "transition-to-retirement",
    definition:
      "A strategy for Australians aged 60-67 who are still working but want to access some of their super as an income stream. Allows salary sacrificing more into super while drawing down a pension, potentially improving tax efficiency.",
    category: "Super",
  },
  {
    term: "Non-Concessional Contributions",
    slug: "non-concessional-contributions",
    definition:
      "After-tax super contributions (i.e. not tax-deductible). The annual cap is $120,000 in 2026. You can make up to $360,000 in one year using the bring-forward rule if you're under 75 and your total super balance allows.",
    category: "Super",
  },
  {
    term: "Bring-Forward Rule",
    slug: "bring-forward-rule",
    definition:
      "Allows you to contribute up to three years of non-concessional contributions in a single year ($360,000 in 2026), if your total super balance is below $1.66 million. Useful for large lump-sum contributions.",
    category: "Super",
  },
  {
    term: "Binding Death Benefit Nomination",
    slug: "binding-death-benefit-nomination",
    definition:
      "A legal instruction to your super fund specifying who receives your super balance when you die. A valid binding nomination overrides the trustee's discretion. Must usually be renewed every 3 years unless 'non-lapsing'.",
    category: "Super",
  },

  // ─── CFD & Forex (new) ───
  {
    term: "Options",
    slug: "options",
    definition:
      "Contracts giving the right (but not obligation) to buy (call option) or sell (put option) an asset at a set price before a set date. Used for hedging or speculation. Complex instruments suitable only for experienced investors.",
    category: "CFD & Forex",
  },
  {
    term: "Futures",
    slug: "futures",
    definition:
      "Contracts obligating you to buy or sell an asset at a predetermined price on a future date. Used by institutional investors to hedge or speculate on commodities, indices, and currencies. High leverage and risk.",
    category: "CFD & Forex",
  },
  {
    term: "Margin Call",
    slug: "margin-call",
    definition:
      "A demand from your broker to deposit more funds when your account falls below the minimum margin requirement. Failure to meet a margin call results in your positions being automatically closed at a loss.",
    category: "CFD & Forex",
  },

  // ─── Property (new) ───
  {
    term: "Gearing",
    slug: "gearing",
    definition:
      "Borrowing money to invest. Positive gearing means rental income exceeds costs (profit). Negative gearing means costs exceed income (a tax-deductible loss). Neutral gearing means income equals costs.",
    category: "Property",
  },
  {
    term: "Stamp Duty",
    slug: "stamp-duty",
    definition:
      "A state government tax on property purchases, calculated as a percentage of the purchase price. One of the largest upfront costs of buying property. Rates vary by state; first home buyers often receive concessions.",
    category: "Property",
  },

  // ─── Tax (new) ───
  {
    term: "Capital Works Deduction",
    slug: "capital-works-deduction",
    definition:
      "A tax deduction for the cost of constructing or renovating income-producing property, claimed at 2.5% per year over 40 years. Different from depreciation, which covers removable items like appliances and carpets.",
    category: "Tax",
  },

  // ─── Super (extended) ───
  {
    term: "Super Guarantee",
    slug: "super-guarantee",
    definition:
      "The minimum percentage of your ordinary-time earnings your employer must contribute to your superannuation. Currently 11.5% (rising to 12% by July 2025). Also known as the Superannuation Guarantee (SG).",
    category: "Super",
  },
  {
    term: "Superannuation Co-contribution",
    slug: "superannuation-co-contribution",
    definition:
      "A government incentive for low-to-middle income earners. If you make after-tax (non-concessional) contributions, the government adds up to $500 to your super. Eligibility depends on your income and employment status.",
    category: "Super",
  },
  {
    term: "Downsizer Contribution",
    slug: "downsizer-contribution",
    definition:
      "Allows Australians aged 55+ who sell their family home to contribute up to $300,000 per person ($600,000 per couple) into super from the sale proceeds. Does not count toward the non-concessional cap.",
    category: "Super",
  },
  {
    term: "First Home Super Saver Scheme",
    slug: "first-home-super-saver-scheme",
    definition:
      "A federal scheme letting first home buyers save for a deposit inside super, where earnings are taxed at a lower rate. You can contribute up to $15,000 per year and withdraw up to $50,000 total (plus earnings) toward your first home.",
    category: "Super",
  },
  {
    term: "Total Super Balance",
    slug: "total-super-balance",
    definition:
      "The total value of all your superannuation interests at 30 June. Once your total super balance exceeds $1.9 million (indexed), your ability to make non-concessional contributions is restricted or eliminated.",
    category: "Super",
  },
  {
    term: "Transfer Balance Cap",
    slug: "transfer-balance-cap",
    definition:
      "The lifetime limit on how much super you can move into a tax-free retirement (pension) phase account. Currently $1.9 million. Amounts above the cap must remain in accumulation phase where earnings are taxed at 15%.",
    category: "Super",
  },
  {
    term: "Sole Purpose Test",
    slug: "sole-purpose-test",
    definition:
      "The legal requirement that a self-managed super fund (SMSF) must be maintained solely for the purpose of providing retirement benefits to members. Breaching it can result in fund disqualification and significant penalties.",
    category: "Super",
  },

  // ─── Tax (extended) ───
  {
    term: "Fringe Benefits Tax",
    slug: "fringe-benefits-tax",
    definition:
      "A tax employers pay on non-cash benefits provided to employees (e.g., a company car, gym membership, or low-interest loan). The FBT rate is 47%. Employees may need to report fringe benefits on their tax return.",
    category: "Tax",
  },
  {
    term: "Division 293 Tax",
    slug: "division-293-tax",
    definition:
      "An additional 15% tax on concessional super contributions for individuals earning over $250,000 per year. Brings their effective super contributions tax from 15% to 30%, closer to their marginal income tax rate.",
    category: "Tax",
  },
  {
    term: "Medicare Levy Surcharge",
    slug: "medicare-levy-surcharge",
    definition:
      "An additional 1–1.5% tax on higher-income earners (singles earning over $93,000; families over $186,000) who don't hold adequate private hospital cover. Encourages private health insurance uptake.",
    category: "Tax",
  },
  {
    term: "Carried Forward Tax Losses",
    slug: "carried-forward-tax-losses",
    definition:
      "Capital losses that can't be offset against capital gains in the current year can be carried forward to offset future capital gains. There is no time limit on using carried-forward capital losses.",
    category: "Tax",
  },
  {
    term: "Trust Distribution",
    slug: "trust-distribution",
    definition:
      "Income or capital paid by a trust to its beneficiaries each financial year. Beneficiaries include the distribution in their own assessable income at their marginal tax rate. Trusts can stream different income types to different beneficiaries.",
    category: "Tax",
  },
  {
    term: "Personal Use Asset",
    slug: "personal-use-asset",
    definition:
      "An asset used primarily for personal enjoyment rather than investment (e.g., a boat, car, or furniture). Capital losses on personal use assets cannot be used to offset other capital gains.",
    category: "Tax",
  },

  // ─── Property (extended) ───
  {
    term: "Depreciation Schedule",
    slug: "depreciation-schedule",
    definition:
      "A report prepared by a quantity surveyor listing the decline in value of a rental property's structure and fittings. Allows investors to claim tax deductions each year without spending additional money.",
    category: "Property",
  },
  {
    term: "Body Corporate",
    slug: "body-corporate",
    definition:
      "Also called an owners' corporation, it is the legal entity made up of all unit/apartment owners in a strata complex. Responsible for managing and maintaining common areas, funded through levies paid by owners.",
    category: "Property",
  },
  {
    term: "Land Tax",
    slug: "land-tax",
    definition:
      "An annual state government tax on the unimproved value of land you own beyond a certain threshold. It does not apply to your principal place of residence. Rates and thresholds vary significantly by state.",
    category: "Property",
  },
  {
    term: "Rental Vacancy Rate",
    slug: "rental-vacancy-rate",
    definition:
      "The percentage of rental properties in a given area that are currently unoccupied. A vacancy rate below 2–3% indicates a tight rental market where landlords have pricing power; above 5% favours tenants.",
    category: "Property",
  },
  {
    term: "Debt Serviceability",
    slug: "debt-serviceability",
    definition:
      "A lender's assessment of your ability to meet loan repayments. Banks apply a buffer (typically 3%) above the current interest rate when assessing whether you can afford a mortgage. Also called a serviceability test.",
    category: "Property",
  },
  {
    term: "Redraw Facility",
    slug: "redraw-facility",
    definition:
      "A home loan feature allowing you to withdraw extra repayments you have made above the minimum. Differs from an offset account — redrawn funds become part of the loan again. May incur fees and have minimum redraw amounts.",
    category: "Property",
  },
  {
    term: "Interest Only Loan",
    slug: "interest-only-loan",
    definition:
      "A loan where you only pay the interest component for a set period (typically 1–5 years), with no repayment of the principal. Popular with property investors for cash flow, but the principal balance does not reduce.",
    category: "Property",
  },

  // ─── Insurance (extended) ───
  {
    term: "Trauma Insurance",
    slug: "trauma-insurance",
    definition:
      "Also called critical illness insurance, it pays a lump sum if you are diagnosed with a specific serious condition (e.g., cancer, heart attack, stroke). Can be used to cover medical expenses, debt repayment, or lifestyle adjustments.",
    category: "Insurance",
  },
  {
    term: "Underwriting",
    slug: "underwriting",
    definition:
      "The process by which an insurer assesses the risk of covering you based on your health, age, occupation, and lifestyle. May result in standard terms, exclusions for pre-existing conditions, premium loadings, or outright decline.",
    category: "Insurance",
  },
  {
    term: "Waiting Period",
    slug: "waiting-period",
    definition:
      "The period you must be disabled or unable to work before your income protection insurance begins paying benefits. Typical options are 14, 30, 60, or 90 days. Longer waiting periods reduce premiums.",
    category: "Insurance",
  },
  {
    term: "Benefit Period",
    slug: "benefit-period",
    definition:
      "The maximum period for which an income protection insurance policy will pay benefits while you are unable to work. Options include 2 years, 5 years, to age 60, or to age 65. Longer benefit periods attract higher premiums.",
    category: "Insurance",
  },

  // ─── Fixed Income ───
  {
    term: "Yield to Maturity",
    slug: "yield-to-maturity",
    definition:
      "The total return anticipated on a bond if held until it matures, expressed as an annual percentage. Accounts for the bond's current price, face value, coupon rate, and time to maturity. The key metric for comparing bonds.",
    category: "Fixed Income",
  },
  {
    term: "Duration",
    slug: "duration",
    definition:
      "A measure of a bond's sensitivity to interest rate changes. The higher the duration, the more its price falls when interest rates rise. A bond with 5-year duration loses roughly 5% of value for each 1% rise in rates.",
    category: "Fixed Income",
  },
  {
    term: "Credit Rating",
    slug: "credit-rating",
    definition:
      "An assessment of a borrower's (government or company) ability to repay debt, issued by agencies like Moody's, S&P, and Fitch. Investment-grade ratings (AAA to BBB) indicate lower default risk; below BBB is high-yield or 'junk'.",
    category: "Fixed Income",
  },
  {
    term: "Hybrid Security",
    slug: "hybrid-security",
    definition:
      "A financial instrument with features of both debt (fixed income) and equity (shares). Australian bank hybrids (e.g., CBA PERLS) pay regular distributions but can be converted to shares or written off if the bank is in financial difficulty.",
    category: "Fixed Income",
  },
  {
    term: "Inflation-Linked Bond",
    slug: "inflation-linked-bond",
    definition:
      "A government bond whose principal and interest payments are adjusted in line with the Consumer Price Index (CPI). Protects investors from inflation eroding their real returns. Australian examples are Treasury Indexed Bonds (TIBs).",
    category: "Fixed Income",
  },

  // ─── Banking & Mortgages ───
  {
    term: "Comparison Rate",
    slug: "comparison-rate",
    definition:
      "A standardised rate that combines a home loan's interest rate and most fees into a single percentage, allowing easier comparisons between products. Required by law in Australian home loan advertising.",
    category: "Banking",
  },
  {
    term: "Debt-to-Income Ratio",
    slug: "debt-to-income-ratio",
    definition:
      "A measure comparing your total debt obligations to your gross annual income. APRA guidance caps most new lending at a debt-to-income ratio of 6x. Used by lenders to assess borrowing risk.",
    category: "Banking",
  },
  {
    term: "Pre-Approval",
    slug: "pre-approval",
    definition:
      "Conditional approval from a lender for a home loan up to a specified amount, based on an assessment of your financial situation. Does not guarantee final approval; property valuation and final checks happen at full application.",
    category: "Banking",
  },
  {
    term: "Lender's Mortgage Insurance",
    slug: "lenders-mortgage-insurance",
    definition:
      "Insurance paid by the borrower (not the lender) when borrowing more than 80% of a property's value (LVR above 80%). Protects the lender if the borrower defaults. Can add tens of thousands of dollars to borrowing costs.",
    category: "Banking",
  },

  // ─── Regulatory / Financial Advice ───
  {
    term: "Statement of Advice",
    slug: "statement-of-advice",
    definition:
      "A written document a licensed financial adviser must provide when giving you personal financial advice. Sets out the advice, the reasons for it, any fees, and the adviser's conflict-of-interest disclosures. You must receive it before implementing advice.",
    category: "Regulatory",
  },
  {
    term: "Financial Services Guide",
    slug: "financial-services-guide",
    definition:
      "A document a licensed financial services business must provide before offering financial services. Describes the services offered, how the business is paid, and how to make a complaint. Required by the Corporations Act.",
    category: "Regulatory",
  },
  {
    term: "Best Interest Duty",
    slug: "best-interest-duty",
    definition:
      "A legal obligation under the Corporations Act requiring licensed financial advisers to act in their clients' best interests when providing personal advice. Introduced after the Hayne Royal Commission to improve consumer protections.",
    category: "Regulatory",
  },
  {
    term: "General Advice",
    slug: "general-advice",
    definition:
      "Financial advice that does not consider your personal circumstances, needs, or objectives. Must include a general advice warning. Compare to 'personal advice', which is tailored to your individual situation and regulated more strictly.",
    category: "Regulatory",
  },
  {
    term: "Personal Advice",
    slug: "personal-advice",
    definition:
      "Financial advice specifically tailored to your personal circumstances, objectives, and financial situation. Providers must be licensed, act in your best interest, and provide a Statement of Advice. The most regulated form of financial advice in Australia.",
    category: "Regulatory",
  },
  {
    term: "Responsible Entity",
    slug: "responsible-entity",
    definition:
      "The ASIC-licensed entity responsible for operating a managed investment scheme, including unit trusts, ETFs, and managed funds. Must act in the interests of fund members and comply with the Corporations Act.",
    category: "Regulatory",
  },
  {
    term: "Target Market Determination",
    slug: "target-market-determination",
    definition:
      "A document issuers must publish describing the type of consumer a financial product is designed for. Part of ASIC's Design and Distribution Obligations (DDO). Advisers must check the TMD before recommending a product.",
    category: "Regulatory",
  },

  // ─── Corporate Finance ───
  {
    term: "EBITDA",
    slug: "ebitda",
    definition:
      "Earnings Before Interest, Taxes, Depreciation, and Amortisation. A widely used measure of a company's core operating profitability, stripping out financing decisions and accounting conventions. Used in valuation ratios like EV/EBITDA.",
    category: "Corporate",
  },
  {
    term: "Free Cash Flow",
    slug: "free-cash-flow",
    definition:
      "The cash a company generates after paying for capital expenditure. Considered a better measure of financial health than net profit because it is harder to manipulate with accounting. Calculated as operating cash flow minus capex.",
    category: "Corporate",
  },
  {
    term: "Enterprise Value",
    slug: "enterprise-value",
    definition:
      "A measure of a company's total value — market capitalisation plus net debt (debt minus cash). Considered a more complete valuation than market cap alone because it accounts for a company's capital structure.",
    category: "Corporate",
  },
  {
    term: "Return on Equity",
    slug: "return-on-equity",
    definition:
      "Net profit as a percentage of shareholders' equity. Measures how efficiently a company uses shareholder capital to generate profit. A consistently high ROE (15%+) is a hallmark of quality businesses with competitive advantages.",
    category: "Corporate",
  },
  {
    term: "Working Capital",
    slug: "working-capital",
    definition:
      "Current assets minus current liabilities. Measures a company's short-term financial health and ability to meet obligations. Negative working capital can signal liquidity issues; very high working capital may indicate inefficiency.",
    category: "Corporate",
  },
  {
    term: "Dilution",
    slug: "dilution",
    definition:
      "The reduction in existing shareholders' ownership percentage when a company issues new shares (e.g., in a capital raise, rights issue, or employee share scheme). Dilution reduces earnings per share if the raised capital does not generate equivalent returns.",
    category: "Corporate",
  },

  // ─── General Investing (extended) ───
  {
    term: "Alpha",
    slug: "alpha",
    definition:
      "The excess return of an investment compared to a benchmark index, after adjusting for risk. An alpha of +2% means the investment outperformed by 2% on a risk-adjusted basis. A core goal of active fund managers.",
    category: "General",
  },
  {
    term: "Beta",
    slug: "beta",
    definition:
      "A measure of an investment's volatility relative to the market (typically the ASX 200 or S&P 500). A beta of 1.0 moves in line with the market; above 1.0 is more volatile; below 1.0 is less volatile. Negative beta moves opposite to the market.",
    category: "General",
  },
  {
    term: "Sharpe Ratio",
    slug: "sharpe-ratio",
    definition:
      "A risk-adjusted return metric calculated by dividing excess return (above the risk-free rate) by standard deviation. Higher is better. A Sharpe ratio above 1.0 is considered good; above 2.0 is excellent. Used to compare funds.",
    category: "General",
  },
  {
    term: "Expense Ratio",
    slug: "expense-ratio",
    definition:
      "The annual fee charged by an ETF or managed fund, expressed as a percentage of assets. Also called the management expense ratio (MER). For Australian ETFs, ranges from 0.03% (Vanguard, BetaShares passives) to 1%+ for active funds.",
    category: "General",
  },
  {
    term: "Benchmark",
    slug: "benchmark",
    definition:
      "A standard index or target used to measure fund performance. Common Australian benchmarks include the S&P/ASX 200 (large-cap Aussie shares), S&P/ASX 300, and MSCI World Index (international shares). Active funds aim to beat their benchmark.",
    category: "General",
  },
  {
    term: "Drawdown",
    slug: "drawdown",
    definition:
      "The peak-to-trough decline in portfolio value during a specific period. A maximum drawdown of 30% means the portfolio fell 30% from its highest point before recovering. A key risk measure alongside volatility.",
    category: "General",
  },
  {
    term: "Correlation",
    slug: "correlation",
    definition:
      "A statistical measure (ranging from -1 to +1) of how closely two assets move together. A correlation of +1 means they move perfectly in sync; -1 means they move in opposite directions. Low correlation between assets reduces portfolio risk.",
    category: "General",
  },
  {
    term: "Systematic Risk",
    slug: "systematic-risk",
    definition:
      "Market-wide risk that cannot be diversified away, such as recessions, interest rate changes, or geopolitical events. Affects all assets to varying degrees. Measured by beta. Contrasted with unsystematic risk, which is company-specific.",
    category: "General",
  },
  {
    term: "Unsystematic Risk",
    slug: "unsystematic-risk",
    definition:
      "Risk specific to an individual company or industry that can be reduced through diversification. Examples include a product recall, regulatory fine, or management scandal. Holding 20+ uncorrelated stocks largely eliminates unsystematic risk.",
    category: "General",
  },

  // ─── Crypto & Web3 (extended) ───
  {
    term: "NFT",
    slug: "nft",
    definition:
      "Non-Fungible Token — a unique digital asset recorded on a blockchain. Unlike cryptocurrencies (which are interchangeable), each NFT is one-of-a-kind. Used for digital art, collectibles, and gaming items. Highly speculative; no fundamental income stream.",
    category: "Crypto",
  },
  {
    term: "Yield Farming",
    slug: "yield-farming",
    definition:
      "A DeFi strategy of providing liquidity or lending crypto assets to decentralised protocols in exchange for interest, fees, or governance token rewards. Can generate high returns but carries smart contract risk, liquidation risk, and impermanent loss.",
    category: "Crypto",
  },
  {
    term: "Smart Contract",
    slug: "smart-contract",
    definition:
      "Self-executing code stored on a blockchain that automatically enforces the terms of an agreement when predefined conditions are met. Underpins DeFi protocols, NFTs, and many blockchain applications. Bugs in smart contracts cannot be reversed.",
    category: "Crypto",
  },
  {
    term: "Gas Fee",
    slug: "gas-fee",
    definition:
      "The transaction fee paid to Ethereum network validators to process and confirm a transaction. Fluctuates based on network congestion. High gas fees (sometimes hundreds of dollars) can make small Ethereum transactions uneconomical.",
    category: "Crypto",
  },
  {
    term: "Hard Fork",
    slug: "hard-fork",
    definition:
      "A backward-incompatible upgrade to a blockchain protocol that creates two separate chains. Holders of the original coin receive an equivalent amount of the new coin. Famous examples include Bitcoin/Bitcoin Cash and Ethereum/Ethereum Classic.",
    category: "Crypto",
  },

  // ─── ETFs & Funds (extended) ───
  {
    term: "Active ETF",
    slug: "active-etf",
    definition:
      "An exchange-traded fund where a portfolio manager actively selects securities rather than tracking an index. Combines the intraday tradability of ETFs with active management. Usually charges higher management fees than passive ETFs.",
    category: "ETFs",
  },
  {
    term: "Thematic ETF",
    slug: "thematic-etf",
    definition:
      "An ETF focused on a specific investment theme such as clean energy, artificial intelligence, cybersecurity, or ageing populations. Higher concentration risk than broad market ETFs; performance depends heavily on the theme materialising.",
    category: "ETFs",
  },
  {
    term: "Distribution Reinvestment Plan",
    slug: "distribution-reinvestment-plan",
    definition:
      "An arrangement allowing ETF or managed fund investors to automatically reinvest their income distributions back into additional units rather than receiving cash. Can be more tax-efficient and avoids brokerage on small purchases.",
    category: "ETFs",
  },
  {
    term: "Tracking Error",
    slug: "tracking-error",
    definition:
      "The difference between an ETF's return and its benchmark index return. Caused by management fees, cash drag, and replication method. A lower tracking error means the ETF closely mirrors its index. Key quality metric for passive ETF investors.",
    category: "ETFs",
  },

  // ─── SMSF (extended) ───
  {
    term: "LRBA",
    slug: "lrba",
    definition:
      "Limited Recourse Borrowing Arrangement — the only way an SMSF can borrow to purchase a single asset (commonly property). The lender's recourse is limited to the purchased asset; other SMSF assets are protected. Complex rules apply; specialist advice essential.",
    category: "Super",
  },
  {
    term: "Arm's Length Rule",
    slug: "arms-length-rule",
    definition:
      "A requirement that SMSF transactions must be conducted as if the parties were unrelated and acting independently. Ensures the fund does not receive sub-market returns or pay inflated prices to related parties. Breaches attract heavy ATO penalties.",
    category: "Super",
  },

  // ─── International Investing ───
  {
    term: "Withholding Tax",
    slug: "withholding-tax",
    definition:
      "Tax deducted at source on dividends or interest paid to foreign investors. For example, the US withholds 15% (under the Australia-US tax treaty) on dividends paid to Australian investors holding US shares directly. May be offset against Australian tax.",
    category: "International",
  },
  {
    term: "Currency Hedging",
    slug: "currency-hedging",
    definition:
      "The practice of using financial instruments to offset the risk of currency movements on international investments. A 'hedged' ETF removes exchange rate risk; an 'unhedged' ETF gives full exposure to foreign currency movements.",
    category: "International",
  },
  {
    term: "American Depositary Receipt",
    slug: "american-depositary-receipt",
    definition:
      "A certificate representing shares in a foreign company, traded on a US exchange in US dollars. Allows US (and Australian) investors to access foreign stocks without the complexity of foreign exchanges. Also abbreviated as ADR.",
    category: "International",
  },
  {
    term: "Emerging Markets",
    slug: "emerging-markets",
    definition:
      "Countries with developing economies and capital markets that offer higher growth potential but greater risk than developed markets. Includes China, India, Brazil, and others. Often accessed through MSCI Emerging Markets ETFs by Australian investors.",
    category: "International",
  },

  // ─── Final batch to reach 200 ───
  {
    term: "Ex-Rights Date",
    slug: "ex-rights-date",
    definition:
      "The date on which a share trades without the entitlement to participate in a rights issue. Buyers on or after the ex-rights date do not receive the rights. The share price typically falls by the value of the right on this date.",
    category: "General",
  },
  {
    term: "Imputation Credit",
    slug: "imputation-credit",
    definition:
      "Another name for a franking credit — the tax credit attached to Australian dividends, reflecting company tax already paid. Shareholders include both the dividend and the imputation credit as income, then claim a tax offset. Excess credits may be refunded.",
    category: "Tax",
  },
  {
    term: "Net Tangible Assets",
    slug: "net-tangible-assets",
    definition:
      "Total assets minus intangible assets (like goodwill and patents) minus liabilities. For LICs and ETFs, NTA per share is a key metric indicating the backing value of each share. Premium to NTA means the share price exceeds underlying asset value.",
    category: "Corporate",
  },
  {
    term: "Perpetual Bond",
    slug: "perpetual-bond",
    definition:
      "A bond with no maturity date that pays interest indefinitely. Common in Australian bank capital structures. Priced primarily on its yield relative to prevailing rates. Most have call provisions allowing the issuer to redeem them after a set period.",
    category: "Fixed Income",
  },
  {
    term: "Retail Investor",
    slug: "retail-investor",
    definition:
      "An individual investor who buys and sells securities for personal accounts, as opposed to professional or institutional investors. In Australia, those who do not meet the 'sophisticated investor' test (net assets > $2.5m or income > $250k) are retail investors with full ASIC protections.",
    category: "Regulatory",
  },
  {
    term: "Wholesale Investor",
    slug: "wholesale-investor",
    definition:
      "An investor who meets ASIC's 'sophisticated' or 'professional' investor tests (typically net assets over $2.5 million or gross income over $250,000). Wholesale investors can access unlisted managed funds, private equity, and other products not available to retail investors.",
    category: "Regulatory",
  },
  {
    term: "Incubator Fund",
    slug: "incubator-fund",
    definition:
      "A small, unlicensed investment fund designed to build a track record before launching as a full regulated fund. ASIC permits incubator funds for up to 20 sophisticated investors and $2 million in assets for a limited period.",
    category: "Regulatory",
  },
  {
    term: "Synthetic ETF",
    slug: "synthetic-etf",
    definition:
      "An ETF that replicates index performance using derivatives (typically total return swaps) rather than holding the underlying securities. Common for accessing markets with restrictions or high transaction costs. Carries counterparty risk alongside market risk.",
    category: "ETFs",
  },
];

// Populate the flat GLOSSARY lookup from entries
for (const entry of GLOSSARY_ENTRIES) {
  GLOSSARY[entry.term] = entry.definition;
}
