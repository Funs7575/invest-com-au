import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import { getETFByTicker, ALL_TICKERS, type ETF } from "@/lib/etf-data";
import DividendProjectionWidget from "@/components/etf/DividendProjectionWidget";
import CheckinTrigger from "@/components/streak/CheckinTrigger";

export const revalidate = 3600;

export async function generateStaticParams() {
  return ALL_TICKERS.map((ticker) => ({ ticker: ticker.toLowerCase() }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ticker: string }>;
}): Promise<Metadata> {
  const { ticker } = await params;
  const etf = getETFByTicker(ticker);
  if (!etf) return { title: "ETF Not Found", robots: "noindex" };

  const title = `${etf.ticker} ETF (${CURRENT_YEAR}) — ${etf.name}`;
  const description = `${etf.ticker} ETF review: ${etf.provider}, ${etf.benchmark}, MER ${etf.mer}%, AUM $${etf.aumMillions >= 1000 ? `${(etf.aumMillions / 1000).toFixed(1)}B` : `${etf.aumMillions}M`}. Compare with similar ETFs on invest.com.au.`;

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/etfs/${etf.ticker.toLowerCase()}` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/etfs/${etf.ticker.toLowerCase()}`,
    },
  };
}

function formatAUM(millions: number): string {
  return millions >= 1000
    ? `$${(millions / 1000).toFixed(1)}B`
    : `$${millions}M`;
}

function assetClassLabel(cls: ETF["assetClass"]): string {
  const labels: Record<ETF["assetClass"], string> = {
    "australian-shares": "Australian Shares",
    "us-shares": "US Shares",
    "international-shares": "International Shares",
    "global-shares": "Global Shares",
    "bonds": "Bonds & Fixed Income",
    "dividends": "Australian Dividends",
    "sector": "Sector",
    "esg": "ESG / Sustainability",
    "emerging-markets": "Emerging Markets",
    "property": "Property",
  };
  return labels[cls] ?? cls;
}

export default async function ETFTickerPage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker } = await params;
  const maybeEtf = getETFByTicker(ticker);
  if (!maybeEtf) notFound();
  const etf = maybeEtf as ETF;

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "ETFs", url: `${SITE_URL}/etfs` },
    { name: etf.ticker },
  ]);

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "FinancialProduct",
    name: etf.name,
    description: etf.description,
    url: `${SITE_URL}/etfs/${etf.ticker.toLowerCase()}`,
    provider: {
      "@type": "Organization",
      name: etf.provider,
    },
  };

  const aumDisplay = formatAUM(etf.aumMillions);
  const grossedUpYield =
    etf.frankingPercent > 0
      ? (etf.distributionYield / (1 - 0.3) * (1 - (1 - etf.frankingPercent / 100) * 0.3)).toFixed(1)
      : null;

  return (
    <div className="bg-white min-h-screen">
      <CheckinTrigger source="etf_view" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />

      {/* Hero */}
      <section className="bg-white border-b border-slate-100 py-8 md:py-10">
        <div className="container-custom">
          <nav aria-label="Breadcrumb" className="text-xs text-slate-500 mb-4 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span>/</span>
            <Link href="/etfs" className="hover:text-slate-900">ETFs</Link>
            <span>/</span>
            <span className="font-semibold text-slate-900">{etf.ticker}</span>
          </nav>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl font-black text-slate-900 tracking-tight">{etf.ticker}</span>
                <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded border border-amber-200">
                  {assetClassLabel(etf.assetClass)}
                </span>
              </div>
              <p className="text-base font-medium text-slate-700 mb-1">{etf.name}</p>
              <p className="text-sm text-slate-500">{etf.provider} · ASX Listed · Since {etf.inceptionYear}</p>
            </div>
            <Link
              href="/find/financial-advisor"
              className="shrink-0 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm rounded-xl transition-colors"
            >
              Get ETF Advice →
            </Link>
          </div>
        </div>
      </section>

      {/* Key metrics */}
      <section className="py-6 bg-slate-50 border-b border-slate-200">
        <div className="container-custom">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-semibold text-slate-500 mb-1">MER</p>
              <p className="text-xl font-black text-slate-900">{etf.mer}%</p>
              <p className="text-xs text-slate-500">per year</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-semibold text-slate-500 mb-1">AUM</p>
              <p className="text-xl font-black text-slate-900">{aumDisplay}</p>
              <p className="text-xs text-slate-500">total assets</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-semibold text-slate-500 mb-1">Yield</p>
              <p className="text-xl font-black text-slate-900">{etf.distributionYield}%</p>
              <p className="text-xs text-slate-500">{etf.distributionFrequency}</p>
            </div>
            {etf.frankingPercent > 0 && (
              <div className="bg-white rounded-xl border border-amber-200 p-4">
                <p className="text-xs font-semibold text-amber-700 mb-1">Franking</p>
                <p className="text-xl font-black text-amber-700">{etf.frankingPercent}%</p>
                <p className="text-xs text-slate-500">of distributions</p>
              </div>
            )}
            {grossedUpYield && (
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <p className="text-xs font-semibold text-slate-500 mb-1">Grossed-up</p>
                <p className="text-xl font-black text-slate-900">{grossedUpYield}%</p>
                <p className="text-xs text-slate-500">incl. franking</p>
              </div>
            )}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-semibold text-slate-500 mb-1">Since</p>
              <p className="text-xl font-black text-slate-900">{etf.inceptionYear}</p>
              <p className="text-xs text-slate-500">inception</p>
            </div>
          </div>
        </div>
      </section>

      {/* Description + Highlights */}
      <section className="py-10 md:py-12">
        <div className="container-custom max-w-4xl">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 mb-3">
                About {etf.ticker}
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">{etf.description}</p>
              <div className="text-sm text-slate-600">
                <p className="font-semibold text-slate-700 mb-1">Benchmark index:</p>
                <p>{etf.benchmark}</p>
              </div>
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 mb-3">Key Highlights</h2>
              <ul className="space-y-2">
                {etf.highlights.map((h) => (
                  <li key={h} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className="mt-0.5 shrink-0 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">✓</span>
                    </span>
                    {h}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* MER cost illustration */}
      <section className="py-8 bg-slate-50 border-y border-slate-200">
        <div className="container-custom max-w-3xl">
          <h2 className="text-base font-extrabold text-slate-900 mb-4">Fee Impact: What {etf.mer}% MER Costs You</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th scope="col" className="text-left py-2.5 px-4 text-xs font-bold">Investment</th>
                  <th scope="col" className="text-right py-2.5 px-4 text-xs font-bold">Annual MER cost</th>
                  <th scope="col" className="text-right py-2.5 px-4 text-xs font-bold">10-year cost (est.)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {[10000, 50000, 100000, 250000, 500000].map((amount) => {
                  const annual = (amount * etf.mer) / 100;
                  const tenYear = annual * 10;
                  return (
                    <tr key={amount} className="bg-white hover:bg-slate-50">
                      <td className="py-2.5 px-4 text-xs font-semibold text-slate-800">
                        ${amount.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 text-xs text-right text-slate-700">
                        ${annual.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-4 text-xs text-right text-slate-600">
                        ${tenYear.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}+
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="text-xs text-slate-400 mt-2">10-year estimate assumes flat investment value and fixed MER. Actual costs compound differently with market movements.</p>
          </div>
        </div>
      </section>

      {/* Dividend income projection — only for ETFs with a declared yield */}
      {etf.distributionYield > 0 && (
        <section className="py-8 border-b border-slate-200">
          <div className="container-custom max-w-3xl">
            <DividendProjectionWidget
              distributionYield={etf.distributionYield}
              frankingPercent={etf.frankingPercent}
              distributionFrequency={etf.distributionFrequency}
              ticker={etf.ticker}
            />
          </div>
        </section>
      )}

      {/* Compare with similar ETFs */}
      {etf.relatedTickers.length > 0 && (
        <section className="py-10">
          <div className="container-custom max-w-3xl">
            <h2 className="text-lg font-extrabold text-slate-900 mb-2">Compare {etf.ticker} with Similar ETFs</h2>
            <p className="text-sm text-slate-600 mb-5">
              {etf.ticker} is often compared with these ETFs in the same category.
            </p>
            <div className="flex flex-wrap gap-3">
              {etf.relatedTickers.map((related) => (
                <Link
                  key={related}
                  href={`/etfs/${related.toLowerCase()}`}
                  className="px-4 py-2 bg-slate-100 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 rounded-xl text-sm font-semibold text-slate-700 hover:text-amber-800 transition-all"
                >
                  {related} →
                </Link>
              ))}
              <Link
                href="/etfs/screener"
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 rounded-xl text-sm font-bold text-black transition-colors"
              >
                ETF Screener →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-10 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="container-custom text-center max-w-xl">
          <h2 className="text-xl font-extrabold mb-3">Is {etf.ticker} right for your portfolio?</h2>
          <p className="text-sm text-slate-300 mb-6">
            An AFSL-licensed adviser can model whether {etf.ticker} fits your tax situation, risk tolerance, and investment goals — free initial consultation.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/find/financial-advisor"
              className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm rounded-xl transition-colors"
            >
              Find an Adviser →
            </Link>
            <Link
              href="/etfs/screener"
              className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-sm rounded-xl transition-colors"
            >
              Compare All ETFs →
            </Link>
          </div>
        </div>
      </section>

      <section className="py-6 bg-slate-100 border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <p className="text-xs text-slate-500 leading-relaxed">
            Data sourced from {etf.provider} product disclosure statements as at {etf.dataAsOf}. {GENERAL_ADVICE_WARNING}
          </p>
        </div>
      </section>
    </div>
  );
}
