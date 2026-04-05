import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, SITE_NAME, CURRENT_YEAR } from "@/lib/seo";

export const metadata: Metadata = {
  title: `Dividend Investing Australia — High-Yield ASX Stocks & ETFs (${CURRENT_YEAR})`,
  description:
    "Guide to dividend investing in Australia — high-yield ASX stocks, franking credits explained, DRPs, dividend ETFs (VHY, SYI, DVDY) and SMSF dividend strategies.",
  alternates: { canonical: `${SITE_URL}/invest/dividend-investing` },
  openGraph: {
    title: `Dividend Investing Australia — High-Yield ASX Stocks & ETFs (${CURRENT_YEAR})`,
    description:
      "Guide to dividend investing in Australia — high-yield ASX stocks, franking credits explained, DRPs, dividend ETFs (VHY, SYI, DVDY) and SMSF dividend strategies.",
    url: `${SITE_URL}/invest/dividend-investing`,
  },
};

export default function DividendInvestingPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: `${SITE_URL}/invest` },
    { name: "Dividend Investing" },
  ]);

  const webPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `Dividend Investing Australia — High-Yield ASX Stocks & ETFs (${CURRENT_YEAR})`,
    url: `${SITE_URL}/invest/dividend-investing`,
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  };

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPage) }}
      />

      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-14 md:py-20">
        <div className="container-custom">
          <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-6" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <span className="text-slate-600">/</span>
            <Link href="/invest" className="hover:text-white transition-colors">Invest</Link>
            <span className="text-slate-600">/</span>
            <span className="text-slate-300">Dividend Investing</span>
          </nav>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-xs font-semibold bg-amber-500 text-slate-900 px-3 py-1 rounded-full">
              Updated {CURRENT_YEAR}
            </span>
            <span className="text-xs font-semibold bg-slate-700 text-slate-200 px-3 py-1 rounded-full">
              Income &amp; Franking Credits
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-4 max-w-3xl">
            Dividend Investing in Australia
          </h1>
          <p className="text-lg text-slate-300 leading-relaxed max-w-2xl">
            Australia&apos;s imputation system makes dividend investing uniquely attractive. Fully franked dividends from major ASX companies effectively deliver tax-free income for many investors — and franking credit refunds for SMSFs and low-income earners.
          </p>
        </div>
      </section>

      {/* Key stats */}
      <section className="py-10 bg-white border-b border-slate-100">
        <div className="container-custom">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { value: "4–6%", label: "Average grossed-up yield (ASX 200)" },
              { value: "30%", label: "Corporate tax rate (franking credit rate)" },
              { value: "$80B+", label: "Annual dividends paid by ASX companies" },
              { value: "70%+", label: "ASX 200 stocks paying dividends" },
            ].map((s) => (
              <div key={s.label} className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center">
                <p className="text-2xl font-extrabold text-amber-600">{s.value}</p>
                <p className="text-xs text-slate-600 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 1: Franking Credits Explained */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 1</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">Franking Credits Explained</h2>

          <div className="prose prose-slate max-w-none">
            <p>
              Australia&apos;s dividend imputation system means company tax paid on profits is passed to shareholders as <strong>franking credits</strong>. When a company pays a fully franked dividend, you receive both the cash dividend and a credit for the 30% corporate tax already paid. This avoids double taxation of the same income.
            </p>

            <h3>How It Works — Example</h3>
          </div>

          <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div className="bg-white rounded-lg p-4 border border-slate-100">
                <p className="text-xs text-slate-500 mb-1">Cash dividend received</p>
                <p className="text-2xl font-extrabold text-slate-900">$700</p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-slate-100">
                <p className="text-xs text-slate-500 mb-1">Franking credit (30/70)</p>
                <p className="text-2xl font-extrabold text-amber-600">$300</p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-slate-100">
                <p className="text-xs text-slate-500 mb-1">Grossed-up income</p>
                <p className="text-2xl font-extrabold text-slate-900">$1,000</p>
              </div>
            </div>
            <p className="text-sm text-slate-500 mt-4 text-center">
              If your marginal tax rate is 30%, the franking credit covers your entire tax liability — <strong>net tax = $0</strong>. If your rate is lower (or you&apos;re in pension phase), you receive a <strong>cash refund</strong> from the ATO.
            </p>
          </div>
        </div>
      </section>

      {/* Section 2: High-Yield ASX Dividend Stocks */}
      <section className="py-14 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 2</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Top ASX Dividend Stocks</h2>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">ASX Code</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">Company</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">Sector</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">Yield</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">Franking</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { code: "CBA", name: "Commonwealth Bank", sector: "Banking", yield: "~3.5%", franking: "Fully franked" },
                  { code: "BHP", name: "BHP Group", sector: "Mining", yield: "~5%", franking: "Partially franked" },
                  { code: "WES", name: "Wesfarmers", sector: "Retail/Diversified", yield: "~3.5%", franking: "Fully franked" },
                  { code: "TLS", name: "Telstra", sector: "Telecommunications", yield: "~4%", franking: "Fully franked" },
                  { code: "WBC", name: "Westpac", sector: "Banking", yield: "~5%", franking: "Fully franked" },
                  { code: "NAB", name: "National Australia Bank", sector: "Banking", yield: "~4.5%", franking: "Fully franked" },
                  { code: "ANZ", name: "ANZ Group", sector: "Banking", yield: "~5%", franking: "Fully franked" },
                  { code: "WOW", name: "Woolworths", sector: "Consumer Staples", yield: "~3%", franking: "Fully franked" },
                  { code: "FMG", name: "Fortescue", sector: "Iron Ore", yield: "~8%", franking: "Fully franked" },
                  { code: "SUN", name: "Suncorp", sector: "Insurance/Banking", yield: "~5%", franking: "Fully franked" },
                ].map((r, i) => (
                  <tr key={r.code} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                    <td className="py-2.5 px-3 font-bold text-amber-700 border-b border-slate-100">{r.code}</td>
                    <td className="py-2.5 px-3 text-slate-800 border-b border-slate-100">{r.name}</td>
                    <td className="py-2.5 px-3 text-slate-500 border-b border-slate-100">{r.sector}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800 border-b border-slate-100">{r.yield}</td>
                    <td className="py-2.5 px-3 text-slate-500 border-b border-slate-100">{r.franking}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400 mt-3">Yields are indicative and change with share prices and dividend announcements. Past dividends are not guaranteed.</p>
        </div>
      </section>

      {/* Section 3: Dividend ETFs */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 3</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Dividend ETFs on the ASX</h2>
          <p className="text-slate-600 leading-relaxed mb-6">
            Dividend ETFs provide diversified high-yield exposure without picking individual stocks.
          </p>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">ETF</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">Manager</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">Strategy</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">MER</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">Yield</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { code: "VHY", manager: "Vanguard", strategy: "High-yield Australian equities", mer: "0.25%", yield: "~5.5%" },
                  { code: "SYI", manager: "SPDR", strategy: "S&P/ASX 200 high dividend yield", mer: "0.35%", yield: "~5%" },
                  { code: "DVDY", manager: "Betashares", strategy: "Dividend Harvester (franked focus)", mer: "0.26%", yield: "~7% (inc. franking)" },
                  { code: "IHD", manager: "iShares", strategy: "S&P/ASX Dividend Opportunities", mer: "0.30%", yield: "~6%" },
                  { code: "RDIV", manager: "Russell", strategy: "Australian Responsible Dividend", mer: "0.29%", yield: "~4.5%" },
                ].map((r, i) => (
                  <tr key={r.code} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                    <td className="py-2.5 px-3 font-bold text-amber-700 border-b border-slate-100">{r.code}</td>
                    <td className="py-2.5 px-3 text-slate-800 border-b border-slate-100">{r.manager}</td>
                    <td className="py-2.5 px-3 text-slate-500 border-b border-slate-100">{r.strategy}</td>
                    <td className="py-2.5 px-3 text-slate-800 border-b border-slate-100">{r.mer}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800 border-b border-slate-100">{r.yield}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Section 4: DRPs */}
      <section className="py-14 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 4</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">Dividend Reinvestment Plans (DRPs)</h2>

          <div className="prose prose-slate max-w-none">
            <p>
              Most major ASX companies offer Dividend Reinvestment Plans (DRPs), allowing you to automatically reinvest dividends into additional shares — often at a small discount (1–2.5%) to the market price. DRPs compound your returns without brokerage costs.
            </p>
            <h3>Key Benefits</h3>
            <ul>
              <li><strong>Compounding</strong> — reinvested dividends buy more shares, which pay more dividends</li>
              <li><strong>No brokerage</strong> — DRP shares are issued directly by the company</li>
              <li><strong>Discount</strong> — some companies offer a 1–2.5% discount on DRP shares</li>
              <li><strong>Dollar-cost averaging</strong> — automatic reinvestment smooths your average entry price</li>
            </ul>
            <h3>Tax Note</h3>
            <p>
              DRP dividends are still <strong>taxable in the year received</strong> even though you don&apos;t receive cash. The ATO treats DRP participation as receiving the dividend and then using it to buy shares. Keep records of each DRP allocation for CGT cost base purposes.
            </p>
          </div>
        </div>
      </section>

      {/* Section 5: SMSF Dividend Strategy */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 5</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">SMSF Dividend Strategies</h2>

          <div className="prose prose-slate max-w-none mb-6">
            <p>
              Dividend investing is the backbone of many SMSF portfolios, particularly for funds in pension phase where the effective tax rate is 0%. In this scenario, fully franked dividends generate <strong>franking credit cash refunds from the ATO</strong>.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="font-bold text-slate-900 mb-4">Accumulation Phase (15% tax)</h3>
              <dl className="space-y-3">
                {[
                  { dt: "Tax on dividends", dd: "15% on grossed-up amount" },
                  { dt: "Franking credit offset", dd: "30% credit > 15% tax = refund" },
                  { dt: "Effective tax", dd: "~0% or net refund on fully franked" },
                  { dt: "Strategy", dd: "High-yield franked stocks + DRP" },
                ].map((item) => (
                  <div key={item.dt} className="flex justify-between gap-3 py-2 border-b border-slate-100 last:border-0">
                    <dt className="text-sm text-slate-500 shrink-0">{item.dt}</dt>
                    <dd className="text-sm font-semibold text-slate-800 text-right">{item.dd}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="font-bold text-slate-900 mb-4">Pension Phase (0% tax)</h3>
              <dl className="space-y-3">
                {[
                  { dt: "Tax on dividends", dd: "0% — exempt from tax" },
                  { dt: "Franking credit", dd: "Full 30% refunded as cash by ATO" },
                  { dt: "Effective yield boost", dd: "+43% on grossed-up basis" },
                  { dt: "Strategy", dd: "Maximum franked dividend income" },
                ].map((item) => (
                  <div key={item.dt} className="flex justify-between gap-3 py-2 border-b border-slate-100 last:border-0">
                    <dt className="text-sm text-slate-500 shrink-0">{item.dt}</dt>
                    <dd className="text-sm font-semibold text-slate-800 text-right">{item.dd}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </section>

      {/* Risk */}
      <section className="py-14 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <div className="bg-red-50 border border-red-200 rounded-xl p-5">
            <h3 className="font-bold text-red-800 mb-2">Key Risks</h3>
            <ul className="text-sm text-red-700 space-y-1.5">
              <li><strong>Dividend cuts</strong> — dividends are not guaranteed; companies can reduce or eliminate them (as many did during COVID)</li>
              <li><strong>Yield trap</strong> — very high yields often signal a falling share price or unsustainable payout; check payout ratio</li>
              <li><strong>Concentration risk</strong> — high-yield ASX portfolios tend to be heavily weighted to banks and resources</li>
              <li><strong>Franking policy risk</strong> — government policy on franking credit refunds could change</li>
              <li><strong>Capital loss</strong> — chasing yield can lead to holding declining businesses; total return matters, not just income</li>
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 bg-white">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-xl p-8 flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-slate-900 mb-1">Build an Income Portfolio with Expert Help</h2>
              <p className="text-sm text-slate-500">
                A financial planner can design a dividend strategy optimised for your tax position — especially valuable for SMSF trustees seeking franking credit refunds.
              </p>
            </div>
            <Link
              href="/advisors/financial-planners"
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors shrink-0"
            >
              Find a Financial Planner &rarr;
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
