/**
 * Static ETF data for /etfs/[ticker] ISR pages and the ETF screener.
 * Data as at July 2025 — update semi-annually or when ASX data changes.
 * Sources: ASX.com.au, Vanguard, BlackRock iShares, BetaShares product pages.
 */

export type ETFAssetClass =
  | "australian-shares"
  | "us-shares"
  | "international-shares"
  | "global-shares"
  | "bonds"
  | "dividends"
  | "sector"
  | "esg"
  | "emerging-markets"
  | "property";

export type ETFProvider =
  | "Vanguard"
  | "BlackRock iShares"
  | "BetaShares"
  | "SPDR"
  | "VanEck"
  | "Magellan"
  | "Pinnacle"
  | "Global X";

export interface ETF {
  ticker: string;
  name: string;
  provider: ETFProvider;
  assetClass: ETFAssetClass;
  benchmark: string;
  mer: number;
  /** AUM in AUD millions, rounded */
  aumMillions: number;
  distributionYield: number;
  frankingPercent: number;
  distributionFrequency: "quarterly" | "semi-annual" | "annual" | "monthly";
  inceptionYear: number;
  description: string;
  highlights: string[];
  relatedTickers: string[];
  /** Source for data verification */
  dataSource: string;
  dataAsOf: string;
}

export const ETF_DATA: ETF[] = [
  {
    ticker: "VAS",
    name: "Vanguard Australian Shares Index ETF",
    provider: "Vanguard",
    assetClass: "australian-shares",
    benchmark: "S&P/ASX 300 Index",
    mer: 0.07,
    aumMillions: 15200,
    distributionYield: 4.1,
    frankingPercent: 80,
    distributionFrequency: "quarterly",
    inceptionYear: 2009,
    description:
      "Australia's most popular ETF. Tracks the S&P/ASX 300 Index, providing diversified exposure to approximately 300 of the largest companies listed on the ASX — including the big four banks, BHP, Rio Tinto, and the major retailers.",
    highlights: [
      "Ultra-low 0.07% MER",
      "~300 Australian companies",
      "High franking credits (~80%)",
      "$15B+ AUM — Australia's most liquid ETF",
    ],
    relatedTickers: ["A200", "STW", "IOZ"],
    dataSource: "https://www.vanguard.com.au/personal/products/en/detail/8205",
    dataAsOf: "2025-07-01",
  },
  {
    ticker: "A200",
    name: "BetaShares Australia 200 ETF",
    provider: "BetaShares",
    assetClass: "australian-shares",
    benchmark: "Solactive Australia 200 Index",
    mer: 0.04,
    aumMillions: 4800,
    distributionYield: 4.2,
    frankingPercent: 80,
    distributionFrequency: "quarterly",
    inceptionYear: 2018,
    description:
      "The lowest-cost ASX 200 ETF in Australia. Tracks the Solactive Australia 200 Index (virtually identical to the S&P/ASX 200). At 0.04% MER, it saves $30/year vs VAS on a $100,000 investment.",
    highlights: [
      "Lowest MER at 0.04% — cheapest ASX 200 ETF",
      "Top 200 ASX-listed companies",
      "High franking credits",
      "Rapid AUM growth since 2018 launch",
    ],
    relatedTickers: ["VAS", "STW", "IOZ"],
    dataSource: "https://www.betashares.com.au/fund/australia-200-etf/",
    dataAsOf: "2025-07-01",
  },
  {
    ticker: "STW",
    name: "SPDR S&P/ASX 200 Fund",
    provider: "SPDR",
    assetClass: "australian-shares",
    benchmark: "S&P/ASX 200 Index",
    mer: 0.13,
    aumMillions: 5100,
    distributionYield: 4.1,
    frankingPercent: 80,
    distributionFrequency: "quarterly",
    inceptionYear: 2001,
    description:
      "Australia's longest-running ETF, launched in 2001. Tracks the S&P/ASX 200 Index. While the MER (0.13%) is higher than VAS or A200, the fund has deep institutional ownership and very tight bid-ask spreads due to its market longevity.",
    highlights: [
      "Australia's first ETF (2001)",
      "Institutional-grade liquidity",
      "Tight bid-ask spreads",
      "S&P/ASX 200 benchmark",
    ],
    relatedTickers: ["VAS", "A200", "IOZ"],
    dataSource: "https://www.ssga.com/au/en_gb/individual/etfs/funds/spdr-sp-asx-200-fund-stw",
    dataAsOf: "2025-07-01",
  },
  {
    ticker: "IOZ",
    name: "iShares Core S&P/ASX 200 ETF",
    provider: "BlackRock iShares",
    assetClass: "australian-shares",
    benchmark: "S&P/ASX 200 Index",
    mer: 0.09,
    aumMillions: 3700,
    distributionYield: 4.1,
    frankingPercent: 80,
    distributionFrequency: "quarterly",
    inceptionYear: 2010,
    description:
      "BlackRock's flagship Australian shares ETF. Tracks the S&P/ASX 200 with a competitive 0.09% MER. Backed by iShares, the world's largest ETF provider, with strong institutional support and liquidity.",
    highlights: [
      "BlackRock (world's largest ETF provider)",
      "0.09% MER — competitive for ASX 200",
      "S&P/ASX 200 benchmark",
      "Strong liquidity and tight spreads",
    ],
    relatedTickers: ["VAS", "A200", "STW"],
    dataSource: "https://www.blackrock.com/au/individual/products/251864/",
    dataAsOf: "2025-07-01",
  },
  {
    ticker: "IVV",
    name: "iShares S&P 500 ETF",
    provider: "BlackRock iShares",
    assetClass: "us-shares",
    benchmark: "S&P 500 Index",
    mer: 0.04,
    aumMillions: 7900,
    distributionYield: 1.2,
    frankingPercent: 0,
    distributionFrequency: "quarterly",
    inceptionYear: 2000,
    description:
      "The most popular S&P 500 ETF on the ASX. Provides exposure to 500 of the largest US companies — including Apple, Microsoft, Amazon, and Alphabet — in Australian dollars. Currency risk applies (AUD/USD movement affects returns).",
    highlights: [
      "Ultra-low 0.04% MER",
      "500 largest US companies",
      "USD-hedged via IVV or unhedged — choose based on currency view",
      "Second largest ASX ETF by AUM",
    ],
    relatedTickers: ["NDQ", "VTS", "QUS"],
    dataSource: "https://www.blackrock.com/au/individual/products/273816/",
    dataAsOf: "2025-07-01",
  },
  {
    ticker: "NDQ",
    name: "BetaShares NASDAQ 100 ETF",
    provider: "BetaShares",
    assetClass: "us-shares",
    benchmark: "NASDAQ-100 Index",
    mer: 0.22,
    aumMillions: 4300,
    distributionYield: 0.5,
    frankingPercent: 0,
    distributionFrequency: "semi-annual",
    inceptionYear: 2015,
    description:
      "Provides exposure to the NASDAQ 100 — the 100 largest non-financial companies on the NASDAQ exchange, heavily weighted to technology (Apple, Microsoft, Nvidia, Meta). Higher growth potential than S&P 500 but also higher volatility.",
    highlights: [
      "NASDAQ 100 — technology-heavy index",
      "Top 100 NASDAQ non-financial companies",
      "Higher growth potential vs S&P 500",
      "0.22% MER — higher than IVV, justified by active index management",
    ],
    relatedTickers: ["IVV", "QUS", "VTS"],
    dataSource: "https://www.betashares.com.au/fund/nasdaq-100-etf/",
    dataAsOf: "2025-07-01",
  },
  {
    ticker: "VTS",
    name: "Vanguard US Total Market Shares Index ETF",
    provider: "Vanguard",
    assetClass: "us-shares",
    benchmark: "CRSP US Total Market Index",
    mer: 0.03,
    aumMillions: 3800,
    distributionYield: 1.3,
    frankingPercent: 0,
    distributionFrequency: "quarterly",
    inceptionYear: 2009,
    description:
      "The broadest US market ETF available on the ASX — covering approximately 3,700 US companies including large, mid, small, and micro-cap stocks. The lowest MER of any ASX-listed US ETF at 0.03%, but distribution payments may have US withholding tax implications for Australian investors.",
    highlights: [
      "Lowest MER: 0.03% — cheapest US ETF on ASX",
      "~3,700 US companies (total market)",
      "Broader diversification than S&P 500",
      "Note: distributions subject to US withholding tax",
    ],
    relatedTickers: ["IVV", "NDQ", "QUS"],
    dataSource: "https://www.vanguard.com.au/personal/products/en/detail/8212",
    dataAsOf: "2025-07-01",
  },
  {
    ticker: "VGS",
    name: "Vanguard MSCI Index International Shares ETF",
    provider: "Vanguard",
    assetClass: "global-shares",
    benchmark: "MSCI World ex-Australia Index",
    mer: 0.18,
    aumMillions: 9200,
    distributionYield: 1.6,
    frankingPercent: 0,
    distributionFrequency: "quarterly",
    inceptionYear: 2014,
    description:
      "The core global shares ETF for Australian investors. Tracks the MSCI World ex-Australia Index, covering approximately 1,500 large and mid-cap companies across 22 developed market countries — US, Japan, UK, Canada, Europe, and more.",
    highlights: [
      "~1,500 companies across 22 developed markets",
      "No Australian shares (pair with VAS for core portfolio)",
      "0.18% MER",
      "$9B+ AUM — most popular global ETF on ASX",
    ],
    relatedTickers: ["IWLD", "VEU", "VISM"],
    dataSource: "https://www.vanguard.com.au/personal/products/en/detail/8212",
    dataAsOf: "2025-07-01",
  },
  {
    ticker: "IWLD",
    name: "iShares Core MSCI World All Cap ETF",
    provider: "BlackRock iShares",
    assetClass: "global-shares",
    benchmark: "MSCI World IMI (All Cap) Index",
    mer: 0.09,
    aumMillions: 1200,
    distributionYield: 1.4,
    frankingPercent: 0,
    distributionFrequency: "semi-annual",
    inceptionYear: 2018,
    description:
      "Broader than VGS — covers large, mid, AND small-cap companies in developed markets via the MSCI World IMI index (~6,000 securities). Lower MER than VGS at 0.09%, making it attractive for cost-conscious investors who want maximum developed-market diversification.",
    highlights: [
      "~6,000 securities including small-caps",
      "Lower MER than VGS (0.09% vs 0.18%)",
      "MSCI World All Cap — broadest developed market ETF on ASX",
      "Lower AUM than VGS — slightly wider spreads",
    ],
    relatedTickers: ["VGS", "VEU", "VISM"],
    dataSource: "https://www.blackrock.com/au/individual/products/273813/",
    dataAsOf: "2025-07-01",
  },
  {
    ticker: "VHY",
    name: "Vanguard Australian Shares High Yield ETF",
    provider: "Vanguard",
    assetClass: "dividends",
    benchmark: "FTSE Australia High Dividend Yield Index",
    mer: 0.25,
    aumMillions: 2900,
    distributionYield: 5.8,
    frankingPercent: 75,
    distributionFrequency: "quarterly",
    inceptionYear: 2011,
    description:
      "Targets Australian companies with above-average dividend yields — primarily banks, miners, and infrastructure companies. The high franking credit pass-through (75%) makes the grossed-up yield attractive for investors in lower tax brackets or with a self-managed super fund.",
    highlights: [
      "5.8%+ distribution yield (grossed-up higher with franking)",
      "75% franking credits",
      "Ideal for SMSF trustees and retirees",
      "Concentrated in banks, miners, infrastructure",
    ],
    relatedTickers: ["HVST", "SYI", "ZYAU"],
    dataSource: "https://www.vanguard.com.au/personal/products/en/detail/8206",
    dataAsOf: "2025-07-01",
  },
  {
    ticker: "HVST",
    name: "BetaShares Australian Dividend Harvester Fund",
    provider: "BetaShares",
    assetClass: "dividends",
    benchmark: "Dynamic — top 50 ASX dividend payers",
    mer: 0.9,
    aumMillions: 520,
    distributionYield: 7.5,
    frankingPercent: 70,
    distributionFrequency: "monthly",
    inceptionYear: 2014,
    description:
      "Aims to pay monthly income at a level significantly higher than the ASX average by dynamically concentrating in the top dividend payers. Uses a put option overlay to reduce downside volatility, which generates premium income but caps upside. Monthly distributions are popular with retirees.",
    highlights: [
      "Monthly distributions — popular with retirees",
      "7%+ target yield",
      "Put option overlay reduces volatility",
      "Higher MER (0.90%) reflects active management",
    ],
    relatedTickers: ["VHY", "SYI", "ZYAU"],
    dataSource: "https://www.betashares.com.au/fund/australian-dividend-harvester-fund/",
    dataAsOf: "2025-07-01",
  },
  {
    ticker: "VAF",
    name: "Vanguard Australian Fixed Interest Index ETF",
    provider: "Vanguard",
    assetClass: "bonds",
    benchmark: "Bloomberg AusBond Composite 0+ Yr Index",
    mer: 0.2,
    aumMillions: 1600,
    distributionYield: 3.8,
    frankingPercent: 0,
    distributionFrequency: "monthly",
    inceptionYear: 2012,
    description:
      "Core Australian bond ETF covering government and corporate bonds. Inverse relationship with interest rates — bond prices fall when rates rise. Appropriate as a defensive portfolio diversifier alongside growth assets, not as a return-maximiser.",
    highlights: [
      "Core Australian government and corporate bonds",
      "Monthly income distributions",
      "Negative correlation to equities (defensive diversifier)",
      "Duration risk: prices fall when rates rise",
    ],
    relatedTickers: ["IAF", "BOND", "CRED"],
    dataSource: "https://www.vanguard.com.au/personal/products/en/detail/8208",
    dataAsOf: "2025-07-01",
  },
  {
    ticker: "IAF",
    name: "iShares Core Composite Bond ETF",
    provider: "BlackRock iShares",
    assetClass: "bonds",
    benchmark: "Bloomberg AusBond Composite 0+ Yr Index",
    mer: 0.15,
    aumMillions: 900,
    distributionYield: 3.8,
    frankingPercent: 0,
    distributionFrequency: "monthly",
    inceptionYear: 2012,
    description:
      "iShares equivalent to VAF — lower MER (0.15% vs 0.20%) tracking the same Bloomberg AusBond Composite Index. Provides similar defensive bond exposure to VAF; the main difference is the MER and BlackRock vs Vanguard fund management.",
    highlights: [
      "Lower MER than VAF (0.15% vs 0.20%)",
      "Same benchmark as VAF",
      "Monthly income",
      "Defensive bond exposure",
    ],
    relatedTickers: ["VAF", "BOND", "CRED"],
    dataSource: "https://www.blackrock.com/au/individual/products/251857/",
    dataAsOf: "2025-07-01",
  },
  {
    ticker: "VGAD",
    name: "Vanguard MSCI Index International Shares (Hedged) ETF",
    provider: "Vanguard",
    assetClass: "global-shares",
    benchmark: "MSCI World ex-Australia (AUD Hedged) Index",
    mer: 0.21,
    aumMillions: 2800,
    distributionYield: 2.1,
    frankingPercent: 0,
    distributionFrequency: "quarterly",
    inceptionYear: 2015,
    description:
      "Hedged version of VGS — same global developed market exposure but with currency hedging that eliminates AUD/USD and AUD/EUR fluctuations. Appropriate when you expect the AUD to appreciate, removing the benefit of a weaker AUD on international returns.",
    highlights: [
      "Currency-hedged — removes AUD/USD risk",
      "Same index as VGS (MSCI World ex-Australia)",
      "Slightly higher MER (0.21% vs 0.18%) for hedging cost",
      "Outperforms VGS when AUD rises",
    ],
    relatedTickers: ["VGS", "IHVV", "IHWL"],
    dataSource: "https://www.vanguard.com.au/personal/products/en/detail/8210",
    dataAsOf: "2025-07-01",
  },
  {
    ticker: "FEMX",
    name: "VanEck FTSE Emerging Markets ETF",
    provider: "VanEck",
    assetClass: "emerging-markets",
    benchmark: "FTSE Emerging Markets All Cap China A Inclusion Index",
    mer: 0.69,
    aumMillions: 480,
    distributionYield: 2.4,
    frankingPercent: 0,
    distributionFrequency: "semi-annual",
    inceptionYear: 2015,
    description:
      "Emerging markets exposure covering China, India, Taiwan, Brazil, South Korea, and 20+ other developing economies. Higher growth potential than developed markets but higher volatility and geopolitical risk. China is typically the largest country weight.",
    highlights: [
      "25+ emerging market countries",
      "China, India, Taiwan largest weights",
      "Higher growth potential than developed markets",
      "Higher risk — currency, political, regulatory",
    ],
    relatedTickers: ["VGE", "EMKT"],
    dataSource: "https://www.vaneck.com.au/etf/equity/femx/snapshot/",
    dataAsOf: "2025-07-01",
  },
  {
    ticker: "HACK",
    name: "BetaShares Global Cybersecurity ETF",
    provider: "BetaShares",
    assetClass: "sector",
    benchmark: "Nasdaq CTA Cybersecurity Index",
    mer: 0.67,
    aumMillions: 1100,
    distributionYield: 0.3,
    frankingPercent: 0,
    distributionFrequency: "semi-annual",
    inceptionYear: 2016,
    description:
      "Concentrated exposure to global cybersecurity companies — Palo Alto, CrowdStrike, Fortinet, Zscaler, and 30+ others. The sector benefits from long-term tailwinds including increasing cyber attacks, digital transformation, and regulation. High volatility; use as a satellite position.",
    highlights: [
      "30+ global cybersecurity leaders",
      "Palo Alto, CrowdStrike, Fortinet in top holdings",
      "Long-term structural growth tailwind",
      "Use as satellite, not core holding",
    ],
    relatedTickers: ["CLDD", "DRIV", "ETHI"],
    dataSource: "https://www.betashares.com.au/fund/global-cybersecurity-etf/",
    dataAsOf: "2025-07-01",
  },
  {
    ticker: "ETHI",
    name: "BetaShares Global Sustainability Leaders ETF",
    provider: "BetaShares",
    assetClass: "esg",
    benchmark: "Nasdaq Future Global Sustainability Leaders Index",
    mer: 0.59,
    aumMillions: 2100,
    distributionYield: 0.9,
    frankingPercent: 0,
    distributionFrequency: "semi-annual",
    inceptionYear: 2017,
    description:
      "ESG-screened global shares ETF excluding fossil fuels, gambling, weapons, and tobacco. Holds the top ESG-rated large companies from developed markets. Has historically tracked or outperformed unscreened global ETFs, but with lower carbon exposure.",
    highlights: [
      "Excludes fossil fuels, weapons, gambling, tobacco",
      "Largest ESG ETF on ASX by AUM",
      "Developed markets only (no emerging markets)",
      "Competitive long-term performance vs unscreened peers",
    ],
    relatedTickers: ["FAIR", "MSTR", "VGS"],
    dataSource: "https://www.betashares.com.au/fund/global-sustainability-leaders-etf/",
    dataAsOf: "2025-07-01",
  },
  {
    ticker: "MVW",
    name: "VanEck Australian Equal Weight ETF",
    provider: "VanEck",
    assetClass: "australian-shares",
    benchmark: "MVIS Australia Equal Weight Index",
    mer: 0.35,
    aumMillions: 1400,
    distributionYield: 3.7,
    frankingPercent: 65,
    distributionFrequency: "quarterly",
    inceptionYear: 2014,
    description:
      "Equal-weighted ASX exposure — every company in the index holds the same weight (~2%), removing the concentration in big four banks and BHP that occurs in market-cap-weighted ETFs like VAS. Rebalanced quarterly to restore equal weights, giving slight 'buy low, sell high' effect.",
    highlights: [
      "Equal weighting — removes bank/mining concentration",
      "~70 companies at equal ~2% weight",
      "Quarterly rebalancing creates systematic buy-low effect",
      "Higher MER (0.35%) reflects active rebalancing",
    ],
    relatedTickers: ["VAS", "A200", "STW"],
    dataSource: "https://www.vaneck.com.au/etf/equity/mvw/snapshot/",
    dataAsOf: "2025-07-01",
  },
  {
    ticker: "VEU",
    name: "Vanguard All-World ex-US Shares Index ETF",
    provider: "Vanguard",
    assetClass: "international-shares",
    benchmark: "FTSE All-World ex US Index",
    mer: 0.1,
    aumMillions: 1900,
    distributionYield: 2.8,
    frankingPercent: 0,
    distributionFrequency: "quarterly",
    inceptionYear: 2009,
    description:
      "Global diversification excluding the US market — covers developed and emerging markets in Europe, Asia-Pacific, and the Americas (ex-US). Pairs well with VTS (US total market) for a simple two-ETF global portfolio.",
    highlights: [
      "~3,500 companies across 45+ countries",
      "Excludes US — pair with VTS for global coverage",
      "0.10% MER — excellent value for global reach",
      "Emerging and developed markets combined",
    ],
    relatedTickers: ["VGS", "IWLD", "VTS"],
    dataSource: "https://www.vanguard.com.au/personal/products/en/detail/8214",
    dataAsOf: "2025-07-01",
  },
  {
    ticker: "VISM",
    name: "Vanguard MSCI International Small Companies Index ETF",
    provider: "Vanguard",
    assetClass: "international-shares",
    benchmark: "MSCI World ex-Australia Small Cap Index",
    mer: 0.32,
    aumMillions: 780,
    distributionYield: 2.3,
    frankingPercent: 0,
    distributionFrequency: "quarterly",
    inceptionYear: 2018,
    description:
      "International small-cap exposure covering ~3,600 small companies across 23 developed markets. Small-cap stocks historically have delivered higher long-term returns than large-caps, though with more volatility. Useful for enhancing diversification beyond VGS.",
    highlights: [
      "~3,600 international small-cap companies",
      "Historical small-cap premium (higher long-run returns)",
      "Diversifies beyond large-caps in VGS",
      "More volatile than VGS",
    ],
    relatedTickers: ["VGS", "IWLD", "VEU"],
    dataSource: "https://www.vanguard.com.au/personal/products/en/detail/8220",
    dataAsOf: "2025-07-01",
  },
  {
    ticker: "QUS",
    name: "BetaShares S&P 500 Equal Weight ETF",
    provider: "BetaShares",
    assetClass: "us-shares",
    benchmark: "S&P 500 Equal Weight Index",
    mer: 0.29,
    aumMillions: 610,
    distributionYield: 1.0,
    frankingPercent: 0,
    distributionFrequency: "semi-annual",
    inceptionYear: 2016,
    description:
      "Equal-weighted S&P 500 exposure — each of the 500 companies holds the same ~0.2% weight, vs IVV where Apple/Microsoft alone are 7-8%. Reduces the mega-cap concentration risk of market-cap-weighted S&P 500 ETFs. Tends to outperform when small/mid-cap US stocks lead.",
    highlights: [
      "S&P 500 but equal-weighted — reduces mega-cap concentration",
      "Benefits when smaller S&P 500 companies outperform",
      "0.29% MER (higher than IVV 0.04% due to rebalancing)",
      "Good diversifier alongside IVV",
    ],
    relatedTickers: ["IVV", "NDQ", "VTS"],
    dataSource: "https://www.betashares.com.au/fund/sp500-equal-weight-etf/",
    dataAsOf: "2025-07-01",
  },
  {
    ticker: "BOND",
    name: "SPDR S&P/ASX Australian Bond Fund",
    provider: "SPDR",
    assetClass: "bonds",
    benchmark: "S&P/ASX Government Bond Index",
    mer: 0.24,
    aumMillions: 320,
    distributionYield: 3.6,
    frankingPercent: 0,
    distributionFrequency: "monthly",
    inceptionYear: 2012,
    description:
      "Government-only bond exposure — exclusively Australian Commonwealth and semi-government bonds. The highest-credit-quality bond ETF available on the ASX. Appropriate as a capital-preservation holding; will underperform corporate bond ETFs in normal conditions but outperform in credit stress events.",
    highlights: [
      "Government bonds only — highest credit quality",
      "Monthly income",
      "Capital preservation focus",
      "Outperforms corporate bonds in credit crises",
    ],
    relatedTickers: ["VAF", "IAF", "CRED"],
    dataSource: "https://www.ssga.com/au/en_gb/individual/etfs/funds/spdr-sp-asx-australian-bond-fund-bond",
    dataAsOf: "2025-07-01",
  },
  {
    ticker: "CRED",
    name: "BetaShares Australian Investment Grade Corporate Bond ETF",
    provider: "BetaShares",
    assetClass: "bonds",
    benchmark: "Solactive Australian Investment Grade Corporate Bond Select TR Index",
    mer: 0.25,
    aumMillions: 290,
    distributionYield: 4.4,
    frankingPercent: 0,
    distributionFrequency: "monthly",
    inceptionYear: 2019,
    description:
      "Investment-grade corporate bonds from Australian companies — higher yield than government bonds, with moderate credit risk. Provides income diversification relative to equity dividends. Credit spread risk means it can underperform government bonds during economic stress.",
    highlights: [
      "Investment-grade corporate bonds (BBB- or above)",
      "Higher yield than government bond ETFs",
      "Monthly income",
      "Credit risk: spreads widen in recessions",
    ],
    relatedTickers: ["VAF", "IAF", "BOND"],
    dataSource: "https://www.betashares.com.au/fund/australian-investment-grade-corporate-bond-etf/",
    dataAsOf: "2025-07-01",
  },
  {
    ticker: "ZYAU",
    name: "BetaShares S&P/ASX 200 Yield Maximiser Fund",
    provider: "BetaShares",
    assetClass: "dividends",
    benchmark: "S&P/ASX 200 (with options overlay)",
    mer: 0.79,
    aumMillions: 720,
    distributionYield: 7.2,
    frankingPercent: 70,
    distributionFrequency: "quarterly",
    inceptionYear: 2012,
    description:
      "Enhances income from the ASX 200 by selling covered call options over the top holdings. The option premium adds to the distribution yield, but caps capital upside when the market rises strongly. Useful for income-focused investors who accept reduced capital growth potential.",
    highlights: [
      "Covered call overlay on ASX 200",
      "7%+ distribution yield",
      "High franking (70%)",
      "Capital upside capped by options strategy",
    ],
    relatedTickers: ["VHY", "HVST", "SYI"],
    dataSource: "https://www.betashares.com.au/fund/sp-asx-200-yield-maximiser-fund-managed-fund/",
    dataAsOf: "2025-07-01",
  },
];

/** Lookup by ticker symbol (case-insensitive). */
export function getETFByTicker(ticker: string): ETF | undefined {
  return ETF_DATA.find((e) => e.ticker.toLowerCase() === ticker.toLowerCase());
}

/** All tickers — used for generateStaticParams. */
export const ALL_TICKERS = ETF_DATA.map((e) => e.ticker);

/** Filter by asset class. */
export function getETFsByAssetClass(assetClass: ETFAssetClass): ETF[] {
  return ETF_DATA.filter((e) => e.assetClass === assetClass);
}
