import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import ETFScreenerClient from "./ETFScreenerClient";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `ETF Screener Australia (${CURRENT_YEAR}) — Filter & Compare ASX ETFs`,
  description:
    "Screen and compare Australian ETFs by asset class, MER, AUM, yield, and franking credits. Filter 25+ ASX-listed ETFs across Vanguard, iShares, BetaShares, SPDR, and VanEck.",
  alternates: { canonical: `${SITE_URL}/etfs/screener` },
  openGraph: {
    title: `ETF Screener Australia (${CURRENT_YEAR}) — Filter ASX ETFs by MER, Yield & Asset Class`,
    description:
      "Interactive ETF screener for Australian investors. Filter by asset class, MER, AUM, and franking credits.",
    url: `${SITE_URL}/etfs/screener`,
  },
};

export default function ETFScreenerPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "ETFs", url: `${SITE_URL}/etfs` },
    { name: "ETF Screener" },
  ]);

  return (
    <div className="bg-white min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />

      {/* Hero */}
      <section className="bg-white border-b border-slate-100 py-8 md:py-10">
        <div className="container-custom">
          <nav className="text-xs text-slate-500 mb-4 flex items-center gap-1.5">
            <a href="/" className="hover:text-slate-900">Home</a>
            <span>/</span>
            <a href="/etfs" className="hover:text-slate-900">ETFs</a>
            <span>/</span>
            <span className="text-slate-900 font-medium">ETF Screener</span>
          </nav>
          <div className="max-w-2xl">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-3 leading-tight">
              ASX ETF Screener <span className="text-amber-600">({CURRENT_YEAR})</span>
            </h1>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed">
              Filter and compare {CURRENT_YEAR}&apos;s ASX-listed ETFs by asset class, MER, AUM, yield, and franking
              credits. Sort by any column to find the lowest-cost, highest-yield, or largest ETF in each category.
            </p>
          </div>
        </div>
      </section>

      {/* Interactive screener */}
      <ETFScreenerClient />

      {/* How to use */}
      <section className="py-10 bg-slate-50 border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <h2 className="text-base font-extrabold text-slate-900 mb-4">How to Use This ETF Screener</h2>
          <div className="grid sm:grid-cols-2 gap-5">
            {[
              {
                heading: "Compare by MER",
                body: "The MER (Management Expense Ratio) is the annual fee charged as a % of your investment. Lower is better — a 0.04% MER vs 0.30% saves $260/year on $100K. Sort by MER ascending to find the cheapest ETF in each category.",
              },
              {
                heading: "Filter by AUM",
                body: "AUM (Assets Under Management) indicates liquidity. ETFs with $500M+ AUM typically have tighter bid-ask spreads. Sort by AUM descending to find the most liquid ETF in your chosen asset class.",
              },
              {
                heading: "Franking Credits Filter",
                body: "Tick 'Franking credits only' to see Australian ETFs that pass through franking credits. Franking can add 1-2% to the effective yield for investors in lower tax brackets or SMSF members.",
              },
              {
                heading: "View Individual ETF Pages",
                body: "Click 'View →' on any ETF for a full profile including benchmark index, fee impact table, comparison with similar ETFs, and links to the product disclosure statement.",
              },
            ].map((item) => (
              <div key={item.heading} className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="text-sm font-bold text-slate-900 mb-2">{item.heading}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-10 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="container-custom text-center max-w-xl">
          <h2 className="text-xl font-extrabold mb-3">Need help choosing the right ETF?</h2>
          <p className="text-sm text-slate-300 mb-6">
            An AFSL-licensed adviser can build a personalised ETF portfolio based on your tax situation, time horizon, and income needs.
          </p>
          <a
            href="/find/financial-advisor"
            className="inline-flex items-center px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm rounded-xl transition-colors"
          >
            Find an ETF Adviser →
          </a>
        </div>
      </section>

      <section className="py-6 bg-slate-100 border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <p className="text-xs text-slate-500 leading-relaxed">
            ETF data sourced from provider product disclosure statements. MER, AUM, and yield figures are indicative and change over time. {GENERAL_ADVICE_WARNING}
          </p>
        </div>
      </section>
    </div>
  );
}
