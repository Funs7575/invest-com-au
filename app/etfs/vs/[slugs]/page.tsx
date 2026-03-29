import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import SectionHeading from "@/components/SectionHeading";

export const revalidate = 86400;

interface ETFData {
  ticker: string;
  name: string;
  provider: string;
  index: string;
  mer: number;
  merDisplay: string;
  aum: string;
  aumValue: number; // $B for comparison
  holdings: number;
  yieldDisplay: string;
  franking: string;
  frankingValue: number; // % for comparison
  hedged: boolean;
  frequency: string;
  category: string;
  description: string;
  bestFor: string;
}

const ETF_DATABASE: Record<string, ETFData> = {
  vas: {
    ticker: "VAS",
    name: "Vanguard Australian Shares ETF",
    provider: "Vanguard",
    index: "S&P/ASX 300",
    mer: 0.07,
    merDisplay: "0.07%",
    aum: "$17.5B",
    aumValue: 17.5,
    holdings: 305,
    yieldDisplay: "~3.9–4.2%",
    franking: "~70%",
    frankingValue: 70,
    hedged: false,
    frequency: "Quarterly",
    category: "Australian Shares",
    description: "Australia's most popular index ETF. Tracks the S&P/ASX 300, giving you exposure to Australia's largest 300 listed companies.",
    bestFor: "Long-term investors wanting broad Australian share market exposure",
  },
  a200: {
    ticker: "A200",
    name: "Betashares Australia 200 ETF",
    provider: "Betashares",
    index: "Solactive Australia 200",
    mer: 0.04,
    merDisplay: "0.04%",
    aum: "$6.2B",
    aumValue: 6.2,
    holdings: 200,
    yieldDisplay: "~3.8–4.0%",
    franking: "~70%",
    frankingValue: 70,
    hedged: false,
    frequency: "Quarterly",
    category: "Australian Shares",
    description: "Australia's cheapest ASX 200 ETF. Tracks the Solactive Australia 200 Index with the lowest MER of any Australian equity ETF.",
    bestFor: "Cost-focused investors wanting Australian large-cap exposure",
  },
  stw: {
    ticker: "STW",
    name: "SPDR S&P/ASX 200 ETF",
    provider: "State Street SPDR",
    index: "S&P/ASX 200",
    mer: 0.13,
    merDisplay: "0.13%",
    aum: "$5.0B",
    aumValue: 5.0,
    holdings: 200,
    yieldDisplay: "~4.0–4.3%",
    franking: "~75%",
    frankingValue: 75,
    hedged: false,
    frequency: "Quarterly",
    category: "Australian Shares",
    description: "Australia's oldest ETF, launched in 2001. Tracks the official S&P/ASX 200 with one of the highest franking credit ratios.",
    bestFor: "Investors who want the official S&P/ASX 200 index with high franking",
  },
  ioz: {
    ticker: "IOZ",
    name: "iShares Core S&P/ASX 200 ETF",
    provider: "BlackRock iShares",
    index: "S&P/ASX 200",
    mer: 0.09,
    merDisplay: "0.09%",
    aum: "$4.3B",
    aumValue: 4.3,
    holdings: 200,
    yieldDisplay: "~3.8–4.0%",
    franking: "~72%",
    frankingValue: 72,
    hedged: false,
    frequency: "Quarterly",
    category: "Australian Shares",
    description: "BlackRock's core Australian equity ETF. Tracks the S&P/ASX 200 at a competitive fee with the backing of the world's largest ETF manager.",
    bestFor: "Investors preferring BlackRock/iShares as their ETF provider",
  },
  ivv: {
    ticker: "IVV",
    name: "iShares S&P 500 ETF",
    provider: "BlackRock iShares",
    index: "S&P 500",
    mer: 0.04,
    merDisplay: "0.04%",
    aum: "$8.0B",
    aumValue: 8.0,
    holdings: 500,
    yieldDisplay: "~1.2–1.5%",
    franking: "0%",
    frankingValue: 0,
    hedged: false,
    frequency: "Semi-annual",
    category: "US Shares",
    description: "The most popular US ETF for Australian investors. Tracks the S&P 500 — 500 of the largest US companies — at the lowest available cost.",
    bestFor: "Investors wanting core US/S&P 500 exposure cheaply",
  },
  ndq: {
    ticker: "NDQ",
    name: "Betashares NASDAQ 100 ETF",
    provider: "Betashares",
    index: "NASDAQ 100",
    mer: 0.48,
    merDisplay: "0.48%",
    aum: "$5.5B",
    aumValue: 5.5,
    holdings: 100,
    yieldDisplay: "~0.5–0.8%",
    franking: "0%",
    frankingValue: 0,
    hedged: false,
    frequency: "Semi-annual",
    category: "US Shares",
    description: "Access to the top 100 non-financial NASDAQ companies — dominated by the world's largest technology companies including Apple, Microsoft, and Nvidia.",
    bestFor: "Growth investors wanting concentrated tech exposure",
  },
  vts: {
    ticker: "VTS",
    name: "Vanguard US Total Market ETF",
    provider: "Vanguard",
    index: "CRSP US Total Market",
    mer: 0.03,
    merDisplay: "0.03%",
    aum: "$4.2B",
    aumValue: 4.2,
    holdings: 3700,
    yieldDisplay: "~1.3–1.6%",
    franking: "0%",
    frankingValue: 0,
    hedged: false,
    frequency: "Quarterly",
    category: "US Shares",
    description: "The broadest and cheapest US ETF in Australia. Tracks the entire US share market — over 3,700 companies from large to small cap.",
    bestFor: "Cost-focused investors wanting the broadest US market exposure",
  },
  vgs: {
    ticker: "VGS",
    name: "Vanguard MSCI Index International Shares ETF",
    provider: "Vanguard",
    index: "MSCI World ex-Australia",
    mer: 0.18,
    merDisplay: "0.18%",
    aum: "$9.5B",
    aumValue: 9.5,
    holdings: 1500,
    yieldDisplay: "~1.5–2.0%",
    franking: "0%",
    frankingValue: 0,
    hedged: false,
    frequency: "Semi-annual",
    category: "International Shares",
    description: "Australia's most popular international ETF. Tracks developed market shares across the US, Europe, Japan, and other developed economies.",
    bestFor: "Investors wanting single-ETF global developed market exposure",
  },
  vhy: {
    ticker: "VHY",
    name: "Vanguard Australian Shares High Yield ETF",
    provider: "Vanguard",
    index: "FTSE Australia High Dividend Yield",
    mer: 0.25,
    merDisplay: "0.25%",
    aum: "$3.2B",
    aumValue: 3.2,
    holdings: 60,
    yieldDisplay: "~5.5–6.5%",
    franking: "~85%",
    frankingValue: 85,
    hedged: false,
    frequency: "Quarterly",
    category: "Australian Dividend",
    description: "Australia's leading high-yield ETF. Focuses on ASX companies with above-average dividend yields, generating strong franking credit flow.",
    bestFor: "Income-focused investors and retirees wanting high dividends with strong franking",
  },
  hvst: {
    ticker: "HVST",
    name: "Betashares Dividend Harvester Fund",
    provider: "Betashares",
    index: "Active / Covered Call",
    mer: 0.90,
    merDisplay: "0.90%",
    aum: "$850M",
    aumValue: 0.85,
    holdings: 60,
    yieldDisplay: "~7.5–9.0%",
    franking: "~70%",
    frankingValue: 70,
    hedged: false,
    frequency: "Monthly",
    category: "Australian Dividend",
    description: "A high-income ETF that writes covered calls on Australian shares to boost income above standard dividends. Pays monthly distributions.",
    bestFor: "Retirees maximising monthly income who can sacrifice some capital growth",
  },
};

interface ComparisonData {
  etfA: ETFData;
  etfB: ETFData;
  winner: {
    mer: string;
    aum: string;
    yield: string;
    franking: string;
  };
  analysis: string;
  verdict: string;
}

function buildComparison(a: ETFData, b: ETFData): ComparisonData {
  return {
    etfA: a,
    etfB: b,
    winner: {
      mer: a.mer <= b.mer ? a.ticker : b.ticker,
      aum: a.aumValue >= b.aumValue ? a.ticker : b.ticker,
      yield: a.yieldDisplay > b.yieldDisplay ? a.ticker : b.ticker,
      franking: a.frankingValue >= b.frankingValue ? a.ticker : b.ticker,
    },
    analysis: `${a.ticker} (${a.merDisplay} MER) vs ${b.ticker} (${b.merDisplay} MER) — on a $100,000 portfolio the annual MER cost difference is $${Math.round(Math.abs(a.mer - b.mer) * 1000)}/year.`,
    verdict:
      a.mer <= b.mer && a.aumValue >= b.aumValue
        ? `${a.ticker} wins on cost and liquidity. For most investors, ${a.ticker} is the better choice unless you have a specific reason to prefer ${b.ticker}.`
        : b.mer <= a.mer && b.aumValue >= a.aumValue
        ? `${b.ticker} wins on cost and liquidity. For most investors, ${b.ticker} is the better choice unless you have a specific reason to prefer ${a.ticker}.`
        : `${a.ticker} and ${b.ticker} each have trade-offs. ${a.ticker} offers ${a.mer <= b.mer ? "lower cost" : "higher liquidity"} while ${b.ticker} offers ${b.mer <= a.mer ? "lower cost" : "higher liquidity"}.`,
  };
}

const POPULAR_PAIRS = [
  "vas-vs-a200",
  "vas-vs-stw",
  "ioz-vs-vas",
  "ivv-vs-vts",
  "ndq-vs-ivv",
  "vgs-vs-ivv",
  "vhy-vs-hvst",
  "vhy-vs-vas",
  "a200-vs-stw",
  "stw-vs-ioz",
];

export function generateStaticParams() {
  return POPULAR_PAIRS.map((slugs) => ({ slugs }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slugs: string }>;
}): Promise<Metadata> {
  const { slugs } = await params;
  const parts = slugs.split("-vs-");
  if (parts.length !== 2) return {};
  const a = ETF_DATABASE[parts[0]];
  const b = ETF_DATABASE[parts[1]];
  if (!a || !b) return {};
  const title = `${a.ticker} vs ${b.ticker} (${CURRENT_YEAR}) — Which ETF is Better?`;
  const description = `${a.ticker} vs ${b.ticker}: compare MER, AUM, yield, franking credits, and performance. Which is the better ETF for Australian investors in ${CURRENT_YEAR}?`;
  return {
    title,
    description,
    openGraph: { title, description, url: `${SITE_URL}/etfs/vs/${slugs}` },
    twitter: { card: "summary_large_image" },
    alternates: { canonical: `${SITE_URL}/etfs/vs/${slugs}` },
  };
}

export default async function ETFVsPage({
  params,
}: {
  params: Promise<{ slugs: string }>;
}) {
  const { slugs } = await params;
  const parts = slugs.split("-vs-");
  if (parts.length !== 2) notFound();

  const etfA = ETF_DATABASE[parts[0]];
  const etfB = ETF_DATABASE[parts[1]];
  if (!etfA || !etfB) notFound();

  const comparison = buildComparison(etfA, etfB);

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "ETFs", url: `${SITE_URL}/etfs` },
    { name: `${etfA.ticker} vs ${etfB.ticker}` },
  ]);

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `Is ${etfA.ticker} or ${etfB.ticker} better?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: comparison.verdict,
        },
      },
      {
        "@type": "Question",
        name: `What is the MER difference between ${etfA.ticker} and ${etfB.ticker}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: comparison.analysis,
        },
      },
    ],
  };

  const METRICS = [
    { label: "MER (Annual Fee)", a: etfA.merDisplay, b: etfB.merDisplay, winner: comparison.winner.mer, lowerIsBetter: true, description: "Annual management expense ratio charged by the ETF" },
    { label: "AUM", a: etfA.aum, b: etfB.aum, winner: comparison.winner.aum, lowerIsBetter: false, description: "Assets under management — indicates liquidity and fund size" },
    { label: "Holdings", a: etfA.holdings.toLocaleString(), b: etfB.holdings.toLocaleString(), winner: null, lowerIsBetter: false, description: "Number of securities in the portfolio" },
    { label: "Distribution Yield", a: etfA.yieldDisplay, b: etfB.yieldDisplay, winner: comparison.winner.yield, lowerIsBetter: false, description: "Approximate annual income yield (not including franking credits)" },
    { label: "Franking Credits", a: etfA.franking, b: etfB.franking, winner: comparison.winner.franking, lowerIsBetter: false, description: "Estimated franking credit ratio attached to distributions" },
    { label: "Distribution Frequency", a: etfA.frequency, b: etfB.frequency, winner: null, lowerIsBetter: false, description: "How often income is distributed to investors" },
    { label: "Index Tracked", a: etfA.index, b: etfB.index, winner: null, lowerIsBetter: false, description: "The benchmark index the ETF aims to track" },
    { label: "Provider", a: etfA.provider, b: etfB.provider, winner: null, lowerIsBetter: false, description: "The ETF manager" },
  ];

  const otherPairs = POPULAR_PAIRS.filter((p) => p !== slugs).slice(0, 5);

  return (
    <div className="bg-white min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-10 md:py-14">
        <div className="container-custom">
          <nav className="text-xs text-slate-400 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-200">Home</Link>
            <span>/</span>
            <Link href="/etfs" className="hover:text-slate-200">ETFs</Link>
            <span>/</span>
            <span className="text-slate-300">{etfA.ticker} vs {etfB.ticker}</span>
          </nav>
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 border border-amber-500/30 rounded-full text-xs font-semibold text-amber-300 mb-4">
              <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
              ETF Comparison · {UPDATED_LABEL}
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-3 tracking-tight">
              <span className="text-amber-400 font-mono">{etfA.ticker}</span>
              {" vs "}
              <span className="text-amber-400 font-mono">{etfB.ticker}</span>
              <span className="block sm:inline"> — Which ETF Wins in {CURRENT_YEAR}?</span>
            </h1>
            <p className="text-sm md:text-base text-slate-300 leading-relaxed">
              Side-by-side comparison of {etfA.name} and {etfB.name}. MER fees, AUM, yield, franking credits, and our verdict for Australian investors.
            </p>
          </div>
        </div>
      </section>

      {/* Verdict Banner */}
      <section className="py-6 bg-amber-50 border-b border-amber-200">
        <div className="container-custom">
          <div className="max-w-2xl">
            <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-1">Our Verdict</p>
            <p className="text-sm text-slate-800 leading-relaxed font-medium">{comparison.verdict}</p>
            <p className="text-xs text-slate-500 mt-2">{comparison.analysis}</p>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-10 md:py-14">
        <div className="container-custom">
          <SectionHeading eyebrow="Side-by-Side" title={`${etfA.ticker} vs ${etfB.ticker} Comparison`} />
          <div className="mt-6 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="text-left py-3 pr-4 text-xs font-bold text-slate-500 uppercase tracking-wide w-40">Metric</th>
                  <th className="text-center py-3 px-4 text-sm font-black text-amber-700 font-mono w-1/3">{etfA.ticker}</th>
                  <th className="text-center py-3 px-4 text-sm font-black text-blue-700 font-mono w-1/3">{etfB.ticker}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {METRICS.map((metric) => (
                  <tr key={metric.label} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 pr-4">
                      <span className="text-xs font-semibold text-slate-700 block">{metric.label}</span>
                      <span className="text-xs text-slate-400">{metric.description}</span>
                    </td>
                    <td className="text-center py-3 px-4">
                      <span className={`text-sm font-bold ${metric.winner === etfA.ticker ? "text-green-700" : "text-slate-700"}`}>
                        {metric.a}
                      </span>
                      {metric.winner === etfA.ticker && (
                        <span className="ml-2 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-semibold">
                          {metric.lowerIsBetter ? "Cheaper" : "Better"}
                        </span>
                      )}
                    </td>
                    <td className="text-center py-3 px-4">
                      <span className={`text-sm font-bold ${metric.winner === etfB.ticker ? "text-green-700" : "text-slate-700"}`}>
                        {metric.b}
                      </span>
                      {metric.winner === etfB.ticker && (
                        <span className="ml-2 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-semibold">
                          {metric.lowerIsBetter ? "Cheaper" : "Better"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400 mt-3">Data approximate. Verify with ETF providers before investing.</p>
        </div>
      </section>

      {/* ETF Profiles */}
      <section className="py-10 bg-slate-50">
        <div className="container-custom">
          <SectionHeading eyebrow="ETF Profiles" title="About Each ETF" />
          <div className="mt-6 grid sm:grid-cols-2 gap-6">
            {[etfA, etfB].map((etf) => (
              <div key={etf.ticker} className="bg-white border border-slate-200 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="font-black font-mono text-xl text-slate-900">{etf.ticker}</span>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">{etf.category}</span>
                </div>
                <p className="text-sm font-semibold text-slate-800 mb-1">{etf.name}</p>
                <p className="text-xs text-slate-500 mb-1">{etf.provider} · {etf.index}</p>
                <p className="text-xs text-slate-600 leading-relaxed mt-3 mb-4">{etf.description}</p>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-xs font-bold text-amber-800 mb-0.5">Best For</p>
                  <p className="text-xs text-amber-900">{etf.bestFor}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cost Calculator */}
      <section className="py-10 md:py-12">
        <div className="container-custom max-w-2xl">
          <SectionHeading eyebrow="Fee Impact" title="Annual MER Cost Comparison" />
          <div className="mt-6 bg-slate-50 rounded-2xl border border-slate-200 p-6">
            <p className="text-sm text-slate-600 mb-4">The annual cost difference on selected portfolio sizes:</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 text-xs font-bold text-slate-500">Portfolio</th>
                    <th className="text-center py-2 text-xs font-bold text-amber-700 font-mono">{etfA.ticker} ({etfA.merDisplay})</th>
                    <th className="text-center py-2 text-xs font-bold text-blue-700 font-mono">{etfB.ticker} ({etfB.merDisplay})</th>
                    <th className="text-center py-2 text-xs font-bold text-slate-500">Difference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[50000, 100000, 250000, 500000, 1000000].map((portfolio) => {
                    const costA = Math.round(portfolio * etfA.mer / 100);
                    const costB = Math.round(portfolio * etfB.mer / 100);
                    const diff = Math.abs(costA - costB);
                    return (
                      <tr key={portfolio}>
                        <td className="py-2 text-xs font-semibold text-slate-700">${(portfolio / 1000).toFixed(0)}K</td>
                        <td className="text-center py-2 text-xs text-slate-700">${costA.toLocaleString()}/yr</td>
                        <td className="text-center py-2 text-xs text-slate-700">${costB.toLocaleString()}/yr</td>
                        <td className="text-center py-2 text-xs font-bold text-slate-900">${diff.toLocaleString()}/yr</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-10 bg-slate-50">
        <div className="container-custom max-w-2xl">
          <SectionHeading eyebrow="FAQ" title={`${etfA.ticker} vs ${etfB.ticker} — Common Questions`} />
          <div className="mt-6 divide-y divide-slate-200">
            <details className="py-4 group">
              <summary className="text-sm font-semibold text-slate-900 cursor-pointer list-none flex items-center justify-between gap-2">
                Is {etfA.ticker} or {etfB.ticker} the better ETF?
                <span className="text-slate-400 group-open:rotate-180 transition-transform shrink-0">▾</span>
              </summary>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">{comparison.verdict}</p>
            </details>
            <details className="py-4 group">
              <summary className="text-sm font-semibold text-slate-900 cursor-pointer list-none flex items-center justify-between gap-2">
                What is the fee difference between {etfA.ticker} and {etfB.ticker}?
                <span className="text-slate-400 group-open:rotate-180 transition-transform shrink-0">▾</span>
              </summary>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">{comparison.analysis} Over 20 years compounded, this difference becomes significant — use the table above to see the annual cost at your portfolio size.</p>
            </details>
            <details className="py-4 group">
              <summary className="text-sm font-semibold text-slate-900 cursor-pointer list-none flex items-center justify-between gap-2">
                Should I switch from {etfA.ticker} to {etfB.ticker} (or vice versa)?
                <span className="text-slate-400 group-open:rotate-180 transition-transform shrink-0">▾</span>
              </summary>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">Generally, no — not if you're already invested. Switching between similar ETFs triggers CGT on any unrealised gains, and transaction costs apply. The fee saving over future years rarely justifies the immediate tax cost of switching. If you're starting fresh with new money, choose the cheapest option.</p>
            </details>
            <details className="py-4 group">
              <summary className="text-sm font-semibold text-slate-900 cursor-pointer list-none flex items-center justify-between gap-2">
                Can I hold both {etfA.ticker} and {etfB.ticker} at the same time?
                <span className="text-slate-400 group-open:rotate-180 transition-transform shrink-0">▾</span>
              </summary>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">Technically yes, but if they track similar indices (e.g. both ASX 200 ETFs), you're adding complexity without meaningful diversification benefit. There's no reason to hold two ETFs tracking the same market — you'd just be doubling your brokerage and complicating your tax reporting. Pick one and stick with it.</p>
            </details>
          </div>
        </div>
      </section>

      {/* Other Comparisons */}
      <section className="py-8 border-t border-slate-200">
        <div className="container-custom">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-4">Other Comparisons</p>
          <div className="flex flex-wrap gap-3">
            {otherPairs.map((pair) => {
              const [ta, tb] = pair.split("-vs-");
              const ea = ETF_DATABASE[ta];
              const eb = ETF_DATABASE[tb];
              if (!ea || !eb) return null;
              return (
                <Link
                  key={pair}
                  href={`/etfs/vs/${pair}`}
                  className="text-xs bg-white border border-slate-200 px-3 py-2 rounded-lg hover:border-amber-300 text-slate-700 hover:text-amber-700 transition-colors font-mono font-semibold"
                >
                  {ea.ticker} vs {eb.ticker}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-6 bg-slate-100 border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <p className="text-xs text-slate-500 leading-relaxed">{GENERAL_ADVICE_WARNING} ETF data is approximate and subject to change. Always verify current figures with ETF providers and consider your personal circumstances.</p>
        </div>
      </section>
    </div>
  );
}
