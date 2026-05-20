/**
 * Static LIC (Listed Investment Company) data for /lic-screener.
 * Data as at May 2026 — update semi-annually.
 * Sources: ASX.com.au, individual LIC annual reports, NTA announcements,
 * Morningstar LIC database, Listed Investment Companies & Trusts Association (LICAT).
 *
 * NTA premium/discount = (share price − post-tax NTA) / post-tax NTA × 100.
 * Negative = trading at a discount (historically the norm for LICs).
 */

export type LICFocus =
  | "australian-shares"
  | "small-mid-cap"
  | "global-shares"
  | "income-dividends"
  | "value"
  | "growth"
  | "alternative";

export type LICManager =
  | "Internal"
  | "WAM Capital"
  | "Platinum"
  | "Magellan"
  | "Antipodes"
  | "Hyperion"
  | "Argo"
  | "AFIC"
  | "Other";

export interface LIC {
  ticker: string;
  name: string;
  manager: LICManager;
  focus: LICFocus;
  description: string;
  /** Pre-tax NTA per share (AUD cents) */
  ntaPreTaxCents: number;
  /** Post-tax NTA per share (AUD cents) */
  ntaPostTaxCents: number;
  /** Approximate share price at data date (AUD cents) */
  sharePriceCents: number;
  /** Annual management cost expressed as % of assets (MER equivalent) */
  managementCostPct: number;
  /** Trailing 12-month dividend yield (%) */
  dividendYield: number;
  /** Franking percentage (0–100) */
  frankingPct: number;
  /** AUM in AUD millions */
  aumMillions: number;
  inceptionYear: number;
  highlights: string[];
  dataSource: string;
  dataAsOf: string;
}

/** Premium or discount to post-tax NTA as a percentage. Negative = discount. */
export function ntaPremiumDiscount(lic: LIC): number {
  if (!lic.ntaPostTaxCents || !lic.sharePriceCents) return 0;
  return ((lic.sharePriceCents - lic.ntaPostTaxCents) / lic.ntaPostTaxCents) * 100;
}

export const LIC_DATA: LIC[] = [
  {
    ticker: "AFI",
    name: "Australian Foundation Investment Company",
    manager: "AFIC",
    focus: "australian-shares",
    description:
      "Australia's oldest and largest LIC. Holds a long-term portfolio of Australian shares managed internally since 1928. Known for growing dividends over decades and low management costs. Flagship income vehicle for conservative long-term investors.",
    ntaPreTaxCents: 920,
    ntaPostTaxCents: 880,
    sharePriceCents: 850,
    managementCostPct: 0.14,
    dividendYield: 3.9,
    frankingPct: 100,
    aumMillions: 10200,
    inceptionYear: 1928,
    highlights: [
      "Australia's largest LIC ($10B+ AUM)",
      "Internally managed — no external manager fee",
      "96-year track record of growing dividends",
      "Fully franked dividend — 0% for SMSF in pension phase",
    ],
    dataSource: "https://www.afi.com.au",
    dataAsOf: "2026-05-01",
  },
  {
    ticker: "ARG",
    name: "Argo Investments",
    manager: "Argo",
    focus: "australian-shares",
    description:
      "Argo invests in a diversified portfolio of ASX-listed companies with a focus on generating long-term capital growth and income. Internally managed since 1946. Consistently trades at or near NTA due to strong retail following and low fees.",
    ntaPreTaxCents: 1145,
    ntaPostTaxCents: 1105,
    sharePriceCents: 1090,
    managementCostPct: 0.16,
    dividendYield: 3.5,
    frankingPct: 100,
    aumMillions: 6900,
    inceptionYear: 1946,
    highlights: [
      "78-year track record",
      "Fully franked dividends since 1990s",
      "Internally managed — ultra-low 0.16% cost",
      "Historically trades near NTA",
    ],
    dataSource: "https://www.argoinvestments.com.au",
    dataAsOf: "2026-05-01",
  },
  {
    ticker: "MLT",
    name: "Milton Corporation",
    manager: "Internal",
    focus: "income-dividends",
    description:
      "Formerly a standalone LIC, Milton merged with Washington H. Soul Pattinson in 2021. Legacy portfolio focused on income generation through diversified ASX blue-chips. High franking credits suit SMSF investors seeking tax-effective income.",
    ntaPreTaxCents: 650,
    ntaPostTaxCents: 625,
    sharePriceCents: 610,
    managementCostPct: 0.15,
    dividendYield: 4.2,
    frankingPct: 100,
    aumMillions: 2800,
    inceptionYear: 1938,
    highlights: [
      "85+ year history",
      "Fully franked dividends",
      "Income-focused portfolio construction",
      "Merged with WHSP 2021 — now part of diversified group",
    ],
    dataSource: "https://www.miltonaust.com.au",
    dataAsOf: "2026-05-01",
  },
  {
    ticker: "WHF",
    name: "Whitefield Industrials",
    manager: "Internal",
    focus: "australian-shares",
    description:
      "Whitefield invests in Australian industrial companies (ex-banks). The ex-bank focus is distinctive — suitable for investors already overweight banking stocks via super or other portfolios. Fully franked dividends, internally managed.",
    ntaPreTaxCents: 625,
    ntaPostTaxCents: 598,
    sharePriceCents: 575,
    managementCostPct: 0.35,
    dividendYield: 3.8,
    frankingPct: 100,
    aumMillions: 510,
    inceptionYear: 1923,
    highlights: [
      "Ex-banks focus — reduces bank concentration",
      "100-year history",
      "Fully franked dividends",
      "Complementary to super funds overweight big-4 banks",
    ],
    dataSource: "https://www.whitefield.com.au",
    dataAsOf: "2026-05-01",
  },
  {
    ticker: "BKI",
    name: "BKI Investment Company",
    manager: "Internal",
    focus: "income-dividends",
    description:
      "BKI targets income through a diversified portfolio of ASX-listed shares. Low cost, internally managed, and consistently fully franked. Suits retirees and SMSF members seeking tax-effective monthly dividend income.",
    ntaPreTaxCents: 188,
    ntaPostTaxCents: 178,
    sharePriceCents: 172,
    managementCostPct: 0.17,
    dividendYield: 4.5,
    frankingPct: 100,
    aumMillions: 1250,
    inceptionYear: 2003,
    highlights: [
      "Semi-annual fully franked dividends",
      "Ultra-low 0.17% management cost",
      "Internally managed — no external manager fee",
      "Focus on income sustainability",
    ],
    dataSource: "https://www.bkilimited.com.au",
    dataAsOf: "2026-05-01",
  },
  {
    ticker: "DJW",
    name: "Djerriwarrh Investments",
    manager: "AFIC",
    focus: "income-dividends",
    description:
      "Managed by AFIC, Djerriwarrh uses covered call options over its equity portfolio to generate additional income. Higher yield than most pure equity LICs but with some capped upside. Suits income-focused investors comfortable with option-enhanced strategies.",
    ntaPreTaxCents: 340,
    ntaPostTaxCents: 325,
    sharePriceCents: 310,
    managementCostPct: 0.55,
    dividendYield: 5.8,
    frankingPct: 100,
    aumMillions: 780,
    inceptionYear: 1995,
    highlights: [
      "Options overlay boosts income above equity-only yield",
      "Managed by AFIC — proven team",
      "Fully franked — tax effective for SMSFs",
      "Higher yield trade-off: some capital growth capped",
    ],
    dataSource: "https://www.djerriwarrh.com.au",
    dataAsOf: "2026-05-01",
  },
  {
    ticker: "MIR",
    name: "Mirrabooka Investments",
    manager: "AFIC",
    focus: "small-mid-cap",
    description:
      "AFIC-managed small-to-mid-cap LIC. Focuses on companies outside the ASX 50 — earlier-stage, higher-growth businesses not yet large enough for mainstream index ETFs. Higher volatility than large-cap LICs but potential for superior long-term returns.",
    ntaPreTaxCents: 370,
    ntaPostTaxCents: 348,
    sharePriceCents: 325,
    managementCostPct: 0.45,
    dividendYield: 3.2,
    frankingPct: 85,
    aumMillions: 640,
    inceptionYear: 1999,
    highlights: [
      "Small-to-mid cap focus — beyond ASX 50",
      "Managed by AFIC — disciplined process",
      "Complements large-cap LICs like AFI or ARG",
      "Long-term growth bias",
    ],
    dataSource: "https://www.mirrabooka.com.au",
    dataAsOf: "2026-05-01",
  },
  {
    ticker: "QVE",
    name: "QV Equities",
    manager: "Other",
    focus: "value",
    description:
      "Managed by Investors Mutual (IML), QVE targets undervalued Australian companies outside the ASX 20. Contrarian value style — buys businesses with strong fundamentals that are temporarily out of favour. Lower correlation to index than market-cap-weighted ETFs.",
    ntaPreTaxCents: 122,
    ntaPostTaxCents: 118,
    sharePriceCents: 110,
    managementCostPct: 0.89,
    dividendYield: 5.1,
    frankingPct: 100,
    aumMillions: 320,
    inceptionYear: 2014,
    highlights: [
      "Ex-top-20 focus — unique alpha opportunity",
      "IML contrarian value discipline",
      "Fully franked high yield",
      "Historically persistent discount to NTA",
    ],
    dataSource: "https://www.qvequities.com.au",
    dataAsOf: "2026-05-01",
  },
  {
    ticker: "WAX",
    name: "WAM Capital",
    manager: "WAM Capital",
    focus: "small-mid-cap",
    description:
      "WAM Capital invests in Australian small-to-mid-cap companies using an active growth-at-reasonable-price style. Known for its strong retail following and reliable fully franked dividends. Manager: Wilson Asset Management.",
    ntaPreTaxCents: 215,
    ntaPostTaxCents: 205,
    sharePriceCents: 215,
    managementCostPct: 1.25,
    dividendYield: 7.2,
    frankingPct: 100,
    aumMillions: 1600,
    inceptionYear: 1999,
    highlights: [
      "Wilson Asset Management — active manager",
      "Small-mid cap growth focus",
      "High fully franked dividend yield",
      "Strong retail investor base — often trades at premium",
    ],
    dataSource: "https://www.wilsonam.com.au",
    dataAsOf: "2026-05-01",
  },
  {
    ticker: "WLE",
    name: "WAM Leaders",
    manager: "WAM Capital",
    focus: "australian-shares",
    description:
      "WAM Leaders targets large-cap ASX companies using Wilson Asset Management's research-driven, activist approach. Lower-risk profile than WAX due to large-cap focus, with the same fully franked income bias.",
    ntaPreTaxCents: 160,
    ntaPostTaxCents: 155,
    sharePriceCents: 158,
    managementCostPct: 1.00,
    dividendYield: 6.5,
    frankingPct: 100,
    aumMillions: 1100,
    inceptionYear: 2016,
    highlights: [
      "Large-cap focus — lower volatility than WAX",
      "Activist overlay — engages with management",
      "Fully franked high yield",
      "WAM franchise retail following",
    ],
    dataSource: "https://www.wilsonam.com.au",
    dataAsOf: "2026-05-01",
  },
  {
    ticker: "PMC",
    name: "Platinum Capital",
    manager: "Platinum",
    focus: "global-shares",
    description:
      "Platinum Capital gives retail investors access to Platinum Asset Management's global contrarian value strategy inside an ASX-listed structure. Invests in international equities — typically undervalued businesses in out-of-favour geographies.",
    ntaPreTaxCents: 175,
    ntaPostTaxCents: 162,
    sharePriceCents: 148,
    managementCostPct: 1.10,
    dividendYield: 3.5,
    frankingPct: 0,
    aumMillions: 510,
    inceptionYear: 1994,
    highlights: [
      "Platinum's 30-year global contrarian track record",
      "Access to international equities via ASX listing",
      "Persistent discount to NTA — contrarian opportunity",
      "Zero franking — income is unfranked",
    ],
    dataSource: "https://www.platinum.com.au",
    dataAsOf: "2026-05-01",
  },
  {
    ticker: "MFF",
    name: "MFF Capital Investments",
    manager: "Other",
    focus: "global-shares",
    description:
      "MFF Capital is managed by Chris Mackay (co-founder of Magellan). Concentrated global portfolio of high-quality compounders — large-cap businesses with durable competitive advantages. Low turnover, long-term holding periods.",
    ntaPreTaxCents: 420,
    ntaPostTaxCents: 385,
    sharePriceCents: 355,
    managementCostPct: 0.65,
    dividendYield: 2.8,
    frankingPct: 20,
    aumMillions: 3200,
    inceptionYear: 2006,
    highlights: [
      "Concentrated global quality compounder portfolio",
      "Chris Mackay — Magellan co-founder pedigree",
      "Significant unrealised gain buffer in pre-tax NTA",
      "Low turnover — long-term holding philosophy",
    ],
    dataSource: "https://www.mffcapital.com.au",
    dataAsOf: "2026-05-01",
  },
  {
    ticker: "TGG",
    name: "Templeton Global Growth Fund",
    manager: "Other",
    focus: "global-shares",
    description:
      "Managed by Franklin Templeton, TGG invests in globally diversified equities using the Templeton deep-value philosophy. Patient, long-term value approach to international markets. Often trades at a material discount to NTA.",
    ntaPreTaxCents: 228,
    ntaPostTaxCents: 218,
    sharePriceCents: 195,
    managementCostPct: 0.97,
    dividendYield: 3.1,
    frankingPct: 10,
    aumMillions: 340,
    inceptionYear: 1987,
    highlights: [
      "Franklin Templeton deep-value discipline",
      "38-year history — through multiple cycles",
      "Often available at >5% discount to NTA",
      "International diversification with ASX liquidity",
    ],
    dataSource: "https://www.franklintempleton.com.au",
    dataAsOf: "2026-05-01",
  },
  {
    ticker: "AMH",
    name: "AMCIL Ltd",
    manager: "AFIC",
    focus: "growth",
    description:
      "Managed by AFIC, AMCIL targets Australian companies with superior long-term earnings growth prospects. Growth tilt distinguishes it from the income-focused AFI. Suitable as a complement to dividend-heavy LICs in a portfolio.",
    ntaPreTaxCents: 155,
    ntaPostTaxCents: 148,
    sharePriceCents: 138,
    managementCostPct: 0.40,
    dividendYield: 2.9,
    frankingPct: 100,
    aumMillions: 420,
    inceptionYear: 2000,
    highlights: [
      "Growth-tilt companion to income-focused AFI",
      "AFIC managed — disciplined process",
      "Often trades at slight discount to NTA",
      "Fully franked dividends",
    ],
    dataSource: "https://www.amcil.com.au",
    dataAsOf: "2026-05-01",
  },
  {
    ticker: "AUI",
    name: "Australian United Investment Co",
    manager: "Internal",
    focus: "income-dividends",
    description:
      "One of Australia's oldest internally managed LICs. AUI invests in a diversified portfolio of ASX-listed companies with a focus on sustainable income. Conservative style, low fees, and a long history of reliable fully franked dividends.",
    ntaPreTaxCents: 1085,
    ntaPostTaxCents: 1048,
    sharePriceCents: 1010,
    managementCostPct: 0.12,
    dividendYield: 3.7,
    frankingPct: 100,
    aumMillions: 1050,
    inceptionYear: 1953,
    highlights: [
      "Ultra-low 0.12% management cost",
      "72-year history of disciplined income investing",
      "Fully franked — attractive for SMSF pension phase",
      "Conservative portfolio — lower volatility",
    ],
    dataSource: "https://www.aui.com.au",
    dataAsOf: "2026-05-01",
  },
];
