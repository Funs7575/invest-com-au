import type { Metadata } from "next";
import Link from "next/link";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
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
    images: [{ url: `/api/og?title=${encodeURIComponent("ASX ETF Screener")}&sub=${encodeURIComponent("Filter by MER · Asset Class · Provider · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
};

const ETF_SCREENER_FAQS = faqJsonLd([
  {
    q: "How do I use the ETF screener?",
    a: "Use the filters at the top of the screener to narrow ETFs by asset class (Australian shares, international shares, bonds, property, etc.), maximum MER, and whether you require franking credits. Click any column header to sort the results. Click 'View →' on any ETF row for a full profile including benchmark index, fee impact table, and comparison with similar ETFs.",
  },
  {
    q: "What does MER (Management Expense Ratio) mean for ETFs?",
    a: "The MER (Management Expense Ratio) is the annual fee an ETF issuer deducts from the fund's assets, expressed as a percentage. For example, a 0.07% MER on a $100,000 investment costs $70 per year. The MER is already reflected in the ETF's unit price — you don't pay it separately. Lower MERs compound favourably over long time horizons.",
  },
  {
    q: "What is the difference between an ETF and a managed fund?",
    a: "An ETF (Exchange Traded Fund) trades on the ASX throughout the day like a share, typically tracks a passive index, and usually has lower fees (MERs often 0.04%–0.50%). A managed fund is priced once daily after market close, may be actively managed, and generally has higher fees (MERs often 0.50%–1.50%+). Both hold a diversified basket of assets. ETFs are generally better suited to self-directed investors; managed funds are often accessed via financial advisers.",
  },
  {
    q: "How do I compare ETF performance in Australia?",
    a: "Compare ETFs tracking the same benchmark index — for example, two Australian share ETFs both tracking the ASX 200. Once you have like-for-like benchmarks, the main differentiators are MER (lower is better), tracking error (how closely returns match the index), AUM (larger funds tend to have tighter bid-ask spreads), and distribution yield. Past performance is not a reliable indicator of future returns.",
  },
  {
    q: "What is a good MER for an Australian ETF?",
    a: "For broad-market Australian share ETFs, MERs range from 0.04% to 0.20% — anything under 0.10% is competitive. For international share ETFs, 0.07%–0.25% is typical. Thematic, sector-specific, or actively managed ETFs often charge 0.40%–0.75%. As a general rule, index ETFs with MERs above 0.50% are expensive and worth scrutinising carefully against lower-cost alternatives.",
  },
]);

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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ETF_SCREENER_FAQS) }}
      />

      {/* Hero */}
      <section className="bg-white border-b border-slate-100 py-8 md:py-10">
        <div className="container-custom">
          <nav aria-label="Breadcrumb" className="text-xs text-slate-500 mb-4 flex items-center gap-1.5">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span>/</span>
            <Link href="/etfs" className="hover:text-slate-900">ETFs</Link>
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
          <Link
            href="/find/financial-advisor"
            className="inline-flex items-center px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm rounded-xl transition-colors"
          >
            Find an ETF Adviser &rarr;
          </Link>
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
