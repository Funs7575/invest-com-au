import type { Broker } from "./types";

export interface CostScenario {
  slug: string;
  title: string;
  h1: string;
  metaDescription: string;
  intro: string;
  /** Inputs that define the cost calculation */
  inputs: {
    asxTradesPerMonth?: number;
    usTradesPerMonth?: number;
    avgTradeSize?: number;
    portfolioValue?: number;
    description: string;
  };
  /** Filter — which brokers can serve this scenario */
  filter: (b: Broker) => boolean;
  /** Calculate total annual cost for a broker under this scenario */
  calculateAnnualCost: (b: Broker) => number;
  /** Sort brokers by cost (cheapest first) */
  sort: (a: Broker, b: Broker) => number;
  /** Explain what costs are included */
  costBreakdown: string[];
  /** Editorial content sections */
  sections: { heading: string; body: string }[];
  /** Related internal links */
  relatedLinks: { label: string; href: string }[];
  /** FAQ pairs */
  faqs: { question: string; answer: string }[];
}

/* ─── Calculation helpers ─── */

function annualAsxCost(b: Broker, tradesPerMonth: number): number {
  return (b.asx_fee_value ?? 0) * tradesPerMonth * 12;
}

function annualUsCost(b: Broker, tradesPerMonth: number, avgSize: number): number {
  const brokerage = (b.us_fee_value ?? 0) * tradesPerMonth * 12;
  const fxCost = ((b.fx_rate ?? 0) / 100) * avgSize * tradesPerMonth * 12;
  return brokerage + fxCost;
}

function annualInactivityCost(b: Broker): number {
  if (!b.inactivity_fee || b.inactivity_fee === "None" || b.inactivity_fee === "$0" || b.inactivity_fee === "No") return 0;
  // Parse common formats: "$10/month", "$50/qtr", "$20 per quarter"
  const match = b.inactivity_fee.match(/\$(\d+(?:\.\d+)?)/);
  if (!match) return 0;
  const amount = parseFloat(match[1]);
  if (/month/i.test(b.inactivity_fee)) return amount * 12;
  if (/qtr|quarter/i.test(b.inactivity_fee)) return amount * 4;
  return amount; // assume annual
}

/* ─── Scenarios ─── */

const scenarios: CostScenario[] = [
  {
    slug: "10-trades-month",
    title: "Broker Costs for 10 ASX Trades per Month (2026)",
    h1: "How Much Does 10 ASX Trades per Month Cost?",
    metaDescription:
      "Compare the real annual cost of making 10 ASX trades per month across every Australian broker. Brokerage + inactivity fees calculated. Updated 2026.",
    intro:
      "If you're an active ASX investor making around 10 trades per month, brokerage fees add up fast. The difference between the cheapest and most expensive broker can be over $1,000 per year. We've calculated the total annual cost for every Australian broker so you can see exactly what you'd pay.",
    inputs: {
      asxTradesPerMonth: 10,
      avgTradeSize: 2000,
      description: "10 ASX trades/month at ~$2,000 each",
    },
    filter: (b) => !b.is_crypto && b.asx_fee_value != null,
    calculateAnnualCost: (b) => annualAsxCost(b, 10) + annualInactivityCost(b),
    sort: (a, b) => {
      const costA = annualAsxCost(a, 10) + annualInactivityCost(a);
      const costB = annualAsxCost(b, 10) + annualInactivityCost(b);
      return costA - costB;
    },
    costBreakdown: [
      "ASX brokerage × 10 trades × 12 months",
      "Inactivity fees (if applicable)",
      "Does not include FX fees (ASX-only scenario)",
    ],
    sections: [
      {
        heading: "10 Trades a Month: Active Investor Territory",
        body: "Making 10 ASX trades per month puts you firmly in the active investor category. At this frequency, even small differences in brokerage per trade compound significantly. A broker charging $10/trade costs you $1,200/year, while $0 brokerage saves you every dollar. For active traders, fee efficiency is the number one priority.",
      },
      {
        heading: "Watch Out for Inactivity Fees",
        body: "Some brokers charge inactivity fees if you don't trade frequently enough. At 10 trades per month, you'll easily avoid most inactivity thresholds, but it's worth checking. A handful of brokers charge quarterly platform fees regardless of trading activity.",
      },
    ],
    relatedLinks: [
      { label: "Fee Calculator", href: "/calculators" },
      { label: "Compare All Brokers", href: "/compare" },
      { label: "Best for Low Fees", href: "/best/low-fees" },
      { label: "Fee Impact Calculator", href: "/fee-impact" },
    ],
    faqs: [
      {
        question: "How much do 10 ASX trades per month cost?",
        answer:
          "At the cheapest brokers ($0 brokerage), 10 trades per month costs $0 in brokerage. At $5/trade, you'd pay $600/year. At $10/trade, $1,200/year. The broker you choose makes a huge difference at this trading frequency.",
      },
      {
        question: "Is 10 trades per month considered active trading?",
        answer:
          "Yes. Most brokers consider 10+ trades per month as active trading. At this level, you'll qualify for any active trader discounts and easily avoid inactivity fee thresholds. Some platforms offer lower rates for frequent traders.",
      },
    ],
  },
  {
    slug: "us-shares-5000",
    title: "Cost of Buying $5,000 in US Shares from Australia (2026)",
    h1: "What Does a $5,000 US Share Purchase Cost?",
    metaDescription:
      "Compare the real cost of buying $5,000 worth of US shares from Australia. Brokerage + FX conversion fees calculated for every broker. Updated 2026.",
    intro:
      "Buying $5,000 of US shares from Australia involves two costs: brokerage and FX conversion. Most people focus on brokerage but FX is usually the bigger expense. We've calculated the true total cost across every broker, including the often-hidden currency conversion fee.",
    inputs: {
      usTradesPerMonth: 1,
      avgTradeSize: 5000,
      description: "Single $5,000 US share purchase (brokerage + FX)",
    },
    filter: (b) => !b.is_crypto && b.us_fee_value != null && b.fx_rate != null,
    calculateAnnualCost: (b) => {
      const brokerage = b.us_fee_value ?? 0;
      const fxCost = ((b.fx_rate ?? 0) / 100) * 5000;
      return brokerage + fxCost; // One-off cost, not annual
    },
    sort: (a, b) => {
      const costA = (a.us_fee_value ?? 0) + ((a.fx_rate ?? 0) / 100) * 5000;
      const costB = (b.us_fee_value ?? 0) + ((b.fx_rate ?? 0) / 100) * 5000;
      return costA - costB;
    },
    costBreakdown: [
      "US share brokerage (per trade)",
      "FX conversion fee (% of trade value)",
      "Total = brokerage + (FX rate × $5,000)",
    ],
    sections: [
      {
        heading: "FX Fees: The Cost Nobody Talks About",
        body: "A broker advertising '$0 US brokerage' might charge 0.70% on FX conversion — that's $35 on a $5,000 trade. Meanwhile, a broker charging $2 brokerage with 0.20% FX only costs $12 total. Always calculate brokerage + FX together to find the real cheapest option.",
      },
      {
        heading: "One Trade vs Monthly Investing",
        body: "If you're buying US shares as a one-off, the per-trade total cost matters most. If you're investing monthly, multiply the per-trade cost by 12 to see your annual savings. A $20 per-trade difference becomes $240/year for monthly investors.",
      },
    ],
    relatedLinks: [
      { label: "FX Fee Calculator", href: "/calculators" },
      { label: "Best for US Shares", href: "/best/us-shares" },
      { label: "Best for Low FX", href: "/best/low-fx-fees" },
      { label: "Compare All Brokers", href: "/compare" },
    ],
    faqs: [
      {
        question: "What is the cheapest way to buy US shares from Australia?",
        answer:
          "The cheapest way combines low brokerage with a low FX conversion rate. For a $5,000 purchase, the cheapest brokers charge under $15 total (brokerage + FX), while expensive options can cost $40-50+. Check both fees, not just the headline brokerage.",
      },
      {
        question: "Do I pay FX fees every time I buy US shares?",
        answer:
          "Yes, unless you have a multi-currency account with USD already held. Each AUD→USD conversion incurs the FX fee. Some brokers let you hold USD, so you only pay the conversion once.",
      },
    ],
  },
  {
    slug: "beginner-500",
    title: "Starting with $500: Cheapest Broker in Australia (2026)",
    h1: "Starting with $500: Which Broker Is Cheapest?",
    metaDescription:
      "The cheapest Australian brokers for small investors starting with $500. $0 brokerage options, minimum deposits, and real cost comparison. Updated 2026.",
    intro:
      "Starting small? With $500, every dollar of brokerage eats into your returns. A $10 trade fee on a $500 investment is a 2% drag before your shares move. We've ranked brokers by how much you'd actually keep invested after fees — because when you're starting out, every percent matters.",
    inputs: {
      asxTradesPerMonth: 1,
      avgTradeSize: 500,
      description: "1 ASX trade/month of $500 (beginner DCA)",
    },
    filter: (b) => !b.is_crypto && b.asx_fee_value != null,
    calculateAnnualCost: (b) => annualAsxCost(b, 1) + annualInactivityCost(b),
    sort: (a, b) => {
      const costA = annualAsxCost(a, 1) + annualInactivityCost(a);
      const costB = annualAsxCost(b, 1) + annualInactivityCost(b);
      return costA - costB;
    },
    costBreakdown: [
      "ASX brokerage × 1 trade × 12 months",
      "Inactivity fees (if applicable)",
      "Fee as a percentage of your $500 investment shown",
    ],
    sections: [
      {
        heading: "Why $0 Brokerage Matters for Small Investors",
        body: "When you're investing $500 at a time, brokerage is a percentage of your investment, not just a fixed cost. A $10 fee on $500 is 2% — you'd need a 2% return just to break even on each trade. With $0 brokerage, every dollar goes straight into shares. This makes a massive difference for dollar-cost averaging with small amounts.",
      },
      {
        heading: "Watch for Minimum Deposit Requirements",
        body: "Some brokers require a minimum deposit to open an account ($500, $1,000, or more). Others have no minimum at all. If you're starting with $500, choose a broker with no minimum deposit requirement so you can start immediately without needing to save more first.",
      },
      {
        heading: "The Best Strategy for $500",
        body: "With $500, the smartest approach is: choose a $0 brokerage broker, buy a diversified ETF (like an ASX 200 index fund), and then add $500 every month. This dollar-cost averaging approach builds your portfolio steadily while keeping fees at zero. After a year, you'll have $6,000 invested with $0 in fees.",
      },
    ],
    relatedLinks: [
      { label: "Best for Beginners", href: "/best/beginners" },
      { label: "Fee Calculator", href: "/calculators" },
      { label: "Best for Low Fees", href: "/best/low-fees" },
      { label: "Take the Quiz", href: "/quiz" },
    ],
    faqs: [
      {
        question: "Can I invest with just $500 in Australia?",
        answer:
          "Yes. Many Australian brokers have no minimum deposit and $0 brokerage, so you can invest $500 without any fees eating into your returns. Some brokers even offer fractional shares, letting you buy a slice of expensive stocks with smaller amounts.",
      },
      {
        question: "What should I buy with $500?",
        answer:
          "For a first $500 investment, a diversified ASX index ETF (like one tracking the ASX 200) is a solid starting point. It gives you exposure to Australia's largest companies in a single trade. This is not personal financial advice — consider speaking to a financial adviser for guidance tailored to your situation.",
      },
    ],
  },
  {
    slug: "monthly-dca-1000",
    title: "Dollar-Cost Averaging $1,000/Month: Broker Cost Comparison (2026)",
    h1: "DCA $1,000/Month: What Do Broker Fees Cost You?",
    metaDescription:
      "Compare broker fees for $1,000 monthly investing (dollar-cost averaging). Annual brokerage costs calculated for every Australian platform. Updated 2026.",
    intro:
      "Dollar-cost averaging with $1,000 per month into ASX shares is one of the most popular investment strategies in Australia. But with 12 trades per year, brokerage fees can take a real bite. Here's exactly what each broker will cost you annually for this straightforward monthly investing approach.",
    inputs: {
      asxTradesPerMonth: 1,
      avgTradeSize: 1000,
      description: "Monthly $1,000 ASX investment (12 trades/year)",
    },
    filter: (b) => !b.is_crypto && b.asx_fee_value != null,
    calculateAnnualCost: (b) => annualAsxCost(b, 1) + annualInactivityCost(b),
    sort: (a, b) => {
      const costA = annualAsxCost(a, 1) + annualInactivityCost(a);
      const costB = annualAsxCost(b, 1) + annualInactivityCost(b);
      return costA - costB;
    },
    costBreakdown: [
      "ASX brokerage × 12 trades per year",
      "Inactivity fees (if applicable)",
      "Fee as % of $12,000 annual investment shown",
    ],
    sections: [
      {
        heading: "The Power of Monthly Investing",
        body: "Investing $1,000 every month regardless of market conditions (dollar-cost averaging) removes the stress of timing the market. Over time, you buy more shares when prices are low and fewer when prices are high. But to maximise this strategy, you need to minimise the fee drag on each $1,000 purchase.",
      },
      {
        heading: "Annual Fee Impact: $0 vs $120",
        body: "At $0 brokerage, your 12 monthly trades cost nothing — all $12,000 goes into shares. At $10/trade, you lose $120/year to fees. That $120 invested instead of paid in fees would grow significantly over 10-20 years thanks to compound returns. Choosing the right broker for DCA is one of the highest-ROI financial decisions you can make.",
      },
    ],
    relatedLinks: [
      { label: "Fee Impact Calculator", href: "/fee-impact" },
      { label: "Best for Beginners", href: "/best/beginners" },
      { label: "Best for Low Fees", href: "/best/low-fees" },
      { label: "Compare All Brokers", href: "/compare" },
    ],
    faqs: [
      {
        question: "Is $1,000 per month enough to invest?",
        answer:
          "$1,000 per month ($12,000/year) is an excellent amount for building long-term wealth. With $0 brokerage, every dollar goes directly into your investments. Over 10 years at 8% average returns, $12,000/year grows to approximately $187,000.",
      },
      {
        question: "Should I invest weekly or monthly?",
        answer:
          "For most investors, monthly is simpler and cheaper (fewer trades = fewer brokerage fees). Weekly DCA provides slightly better cost averaging but the difference is minimal. If your broker charges $0 brokerage, weekly investing costs the same as monthly — so choose whichever suits your cash flow.",
      },
    ],
  },
  {
    slug: "us-shares-monthly",
    title: "Monthly US Share Investing from Australia: Total Annual Costs (2026)",
    h1: "Monthly US Investing: Brokerage + FX Costs per Year",
    metaDescription:
      "Annual cost of monthly US share investing from Australia. Brokerage + FX conversion fees calculated for $2,000/month across every broker. Updated 2026.",
    intro:
      "Investing $2,000 per month into US shares (AAPL, Tesla, S&P 500 ETFs) from Australia? The annual cost varies dramatically between brokers because of hidden FX conversion fees. We've calculated the full annual cost — brokerage plus FX — for 12 monthly purchases across every platform.",
    inputs: {
      usTradesPerMonth: 1,
      avgTradeSize: 2000,
      description: "Monthly $2,000 US share purchase (12 trades/year)",
    },
    filter: (b) => !b.is_crypto && b.us_fee_value != null && b.fx_rate != null,
    calculateAnnualCost: (b) => annualUsCost(b, 1, 2000),
    sort: (a, b) => annualUsCost(a, 1, 2000) - annualUsCost(b, 1, 2000),
    costBreakdown: [
      "US brokerage × 12 trades per year",
      "FX conversion fee × $2,000 × 12 months",
      "Total = annual brokerage + annual FX costs",
    ],
    sections: [
      {
        heading: "FX Fees Dominate at This Volume",
        body: "At $2,000/month in US shares, you're converting $24,000 AUD to USD per year. A 0.70% FX rate costs you $168/year in currency conversion alone. A 0.20% rate costs just $48. That $120 annual saving compounded over 10 years is worth over $1,800 in additional returns.",
      },
      {
        heading: "Consider a Multi-Currency Account",
        body: "If you invest monthly in US shares, a broker with a USD wallet lets you convert once in a larger batch rather than paying FX on each trade. Some brokers also pay interest on uninvested USD. This can reduce your effective FX cost significantly.",
      },
    ],
    relatedLinks: [
      { label: "Best for US Shares", href: "/best/us-shares" },
      { label: "Best for Low FX", href: "/best/low-fx-fees" },
      { label: "FX Calculator", href: "/calculators" },
      { label: "Compare All Brokers", href: "/compare" },
    ],
    faqs: [
      {
        question: "What is the cheapest broker for monthly US investing?",
        answer:
          "The cheapest broker combines $0 US brokerage with the lowest FX conversion rate. For $2,000/month in US shares, the difference between the cheapest and most expensive broker is typically $150-250/year.",
      },
      {
        question: "Should I convert AUD to USD monthly or in bulk?",
        answer:
          "If your broker charges a flat FX fee per conversion (not percentage-based), bulk conversion is cheaper. If the FX fee is percentage-based (most brokers), it doesn't matter — the total cost is the same either way. Some brokers offer better rates for larger conversions.",
      },
    ],
  },
];

/* ─── Exports ─── */

export function getCostScenarioBySlug(slug: string): CostScenario | undefined {
  return scenarios.find((s) => s.slug === slug);
}

export function getAllCostScenarios(): CostScenario[] {
  return scenarios;
}

export function getAllCostScenarioSlugs(): string[] {
  return scenarios.map((s) => s.slug);
}
