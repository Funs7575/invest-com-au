import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, SITE_NAME, CURRENT_YEAR } from "@/lib/seo";

export const metadata: Metadata = {
  title: `Options & Derivatives Trading Australia (${CURRENT_YEAR})`,
  description:
    "How to trade options, CFDs, warrants and futures in Australia. Best platforms (Interactive Brokers, CMC, IG), ASIC regulation, strategies, and tax treatment.",
  alternates: { canonical: `${SITE_URL}/invest/options-trading` },
  openGraph: {
    title: `Options & Derivatives Trading Australia (${CURRENT_YEAR})`,
    description:
      "How to trade options, CFDs, warrants and futures in Australia. Best platforms (Interactive Brokers, CMC, IG), ASIC regulation, strategies, and tax treatment.",
    url: `${SITE_URL}/invest/options-trading`,
  },
};

export default function OptionsDerivativesPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: `${SITE_URL}/invest` },
    { name: "Options & Derivatives" },
  ]);

  const webPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `Options & Derivatives Trading Australia (${CURRENT_YEAR})`,
    url: `${SITE_URL}/invest/options-trading`,
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
            <span className="text-slate-300">Options &amp; Derivatives</span>
          </nav>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-xs font-semibold bg-amber-500 text-slate-900 px-3 py-1 rounded-full">
              Updated {CURRENT_YEAR}
            </span>
            <span className="text-xs font-semibold bg-red-500 text-white px-3 py-1 rounded-full">
              High Risk — Experienced Traders
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-4 max-w-3xl">
            Options &amp; Derivatives Trading in Australia
          </h1>
          <p className="text-lg text-slate-300 leading-relaxed max-w-2xl">
            ASX-listed options, CFDs, warrants, and futures — how to access them from Australia, which platforms support them, ASIC regulation, and what you need to know before trading.
          </p>
        </div>
      </section>

      {/* Key stats */}
      <section className="py-10 bg-white border-b border-slate-100">
        <div className="container-custom">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { value: "70–80%", label: "Retail CFD traders who lose money (ASIC data)" },
              { value: "$200–1,200", label: "Typical broker CPA (highest category)" },
              { value: "30:1", label: "Max CFD leverage for major pairs (ASIC)" },
              { value: "5+", label: "ASIC-regulated options platforms" },
            ].map((s) => (
              <div key={s.label} className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center">
                <p className="text-2xl font-extrabold text-amber-600">{s.value}</p>
                <p className="text-xs text-slate-600 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 1: Types of Derivatives */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 1</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Types of Derivatives Available in Australia</h2>

          <div className="space-y-4">
            {[
              {
                type: "Exchange-Traded Options (ETOs)",
                desc: "Standardised options contracts listed on the ASX. You can buy or sell call and put options on individual ASX stocks and the XJO index. Settlement is through ASX Clear.",
                risk: "Risk limited to premium paid (for buyers); unlimited for naked writers",
                min: "From ~$500; typically 100 shares per contract",
              },
              {
                type: "Contracts for Difference (CFDs)",
                desc: "Leveraged derivatives that track the price of an underlying asset (shares, indices, forex, commodities) without owning it. ASIC capped retail leverage at 30:1 (major forex) and 20:1 (minor forex/gold) in 2021.",
                risk: "Very high — leveraged losses can exceed deposit; 70–80% of retail CFD traders lose money",
                min: "From $200–$500 depending on platform",
              },
              {
                type: "Warrants",
                desc: "ASX-listed derivatives issued by financial institutions (Citi, Macquarie). Include trading warrants, mini warrants, and instalment warrants. Instalment warrants are popular with SMSFs for leveraged share exposure.",
                risk: "Can expire worthless; leverage amplifies losses",
                min: "From ~$500; traded like shares on ASX",
              },
              {
                type: "Futures",
                desc: "Standardised contracts to buy/sell an asset at a future date. ASX 200 futures (SPI 200), interest rate futures, and commodity futures. Primarily used by institutional traders and sophisticated retail traders.",
                risk: "High — margin calls can force liquidation; leveraged exposure",
                min: "Significant margin requirements ($5,000–$20,000+)",
              },
            ].map((d) => (
              <div key={d.type} className="bg-white border border-slate-200 rounded-xl p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-2">{d.type}</h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-3">{d.desc}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                    <p className="text-xs font-bold text-red-800">Risk Level</p>
                    <p className="text-xs text-red-700 mt-0.5">{d.risk}</p>
                  </div>
                  <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                    <p className="text-xs font-bold text-amber-800">Minimum</p>
                    <p className="text-xs text-amber-700 mt-0.5">{d.min}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 2: Platforms */}
      <section className="py-14 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 2</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Best Platforms for Options &amp; Derivatives</h2>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">Platform</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">Products</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">Regulation</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">Options Fee</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">Best For</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { platform: "Interactive Brokers", products: "Options, futures, CFDs, forex", reg: "ASIC + US SEC", fee: "US$0.65/contract", best: "Serious options traders; US & global options" },
                  { platform: "CMC Markets", products: "CFDs, options, forex, shares", reg: "ASIC (AFSL)", fee: "From $0", best: "CFD trading; integrated share trading" },
                  { platform: "IG Markets", products: "CFDs, forex, options, futures", reg: "ASIC (AFSL)", fee: "From $0", best: "CFDs and forex; extensive education" },
                  { platform: "Saxo Markets", products: "Options, CFDs, futures, forex", reg: "ASIC (AFSL)", fee: "From A$3/contract", best: "Multi-asset derivatives; professional tools" },
                  { platform: "CommSec", products: "ASX ETOs, warrants", reg: "ASIC (AFSL)", fee: "$34.95 + $0.13/contract", best: "ASX exchange-traded options only" },
                  { platform: "ANZ Share Investing", products: "ASX ETOs, warrants", reg: "ASIC (AFSL)", fee: "From $28.00", best: "ANZ customers wanting ASX options" },
                ].map((r, i) => (
                  <tr key={r.platform} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                    <td className="py-2.5 px-3 font-bold text-amber-700 border-b border-slate-100">{r.platform}</td>
                    <td className="py-2.5 px-3 text-slate-800 border-b border-slate-100">{r.products}</td>
                    <td className="py-2.5 px-3 text-slate-500 border-b border-slate-100">{r.reg}</td>
                    <td className="py-2.5 px-3 text-slate-800 border-b border-slate-100">{r.fee}</td>
                    <td className="py-2.5 px-3 text-slate-500 border-b border-slate-100">{r.best}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Section 3: ASIC Regulation */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 3</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">ASIC Regulation &amp; Product Intervention</h2>

          <div className="prose prose-slate max-w-none">
            <p>
              ASIC has implemented significant product intervention orders to protect retail investors from derivatives losses:
            </p>
            <ul>
              <li><strong>CFD leverage caps</strong> — max 30:1 for major forex, 20:1 for minor forex/gold, 10:1 for commodities, 5:1 for shares, 2:1 for crypto</li>
              <li><strong>Negative balance protection</strong> — retail clients cannot lose more than their account balance</li>
              <li><strong>Margin close-out</strong> — positions must be closed when equity falls to 50% of margin required</li>
              <li><strong>Loss disclosure</strong> — CFD providers must prominently display the percentage of retail clients who lose money</li>
              <li><strong>No inducements</strong> — banned bonuses, rebates, and gifts to attract retail CFD traders</li>
              <li><strong>Binary options banned</strong> — ASIC banned sale of binary options to retail clients entirely</li>
            </ul>
            <p>
              Always verify your broker holds a valid ASIC Australian Financial Services Licence (AFSL) before trading derivatives.
            </p>
          </div>
        </div>
      </section>

      {/* Section 4: Common Strategies */}
      <section className="py-14 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 4</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Common Options Strategies for Beginners</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { name: "Covered Call", desc: "Own shares + sell call options against them. Generates premium income but caps upside. Popular with SMSF income strategies.", risk: "Low-moderate" },
              { name: "Protective Put", desc: "Own shares + buy put options as insurance against a fall. Costs a premium but limits downside risk.", risk: "Low (insurance cost)" },
              { name: "Long Call", desc: "Buy a call option to profit from a price rise. Maximum loss is the premium paid. Leveraged upside exposure.", risk: "Moderate (premium at risk)" },
              { name: "Long Put", desc: "Buy a put option to profit from a price fall (or hedge existing positions). Maximum loss is the premium paid.", risk: "Moderate (premium at risk)" },
              { name: "Bull Call Spread", desc: "Buy a lower-strike call + sell a higher-strike call. Defined risk and reward. Lower premium than a naked long call.", risk: "Moderate (defined)" },
              { name: "Iron Condor", desc: "Sell an out-of-the-money call spread + put spread. Profits from low volatility / range-bound markets.", risk: "Moderate (defined)" },
            ].map((s) => (
              <div key={s.name} className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-slate-900">{s.name}</h3>
                  <span className="text-xs bg-amber-50 text-amber-700 font-semibold px-2 py-0.5 rounded shrink-0">{s.risk}</span>
                </div>
                <p className="text-sm text-slate-500 mt-2">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 5: Tax */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 5</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">Tax Treatment of Derivatives</h2>

          <div className="prose prose-slate max-w-none">
            <ul>
              <li><strong>CFDs</strong> — profits and losses are generally assessable/deductible as ordinary income (not capital gains) due to the short-term, leveraged nature</li>
              <li><strong>Exchange-traded options</strong> — tax treatment depends on the strategy. Premiums received by option writers are ordinary income; for buyers, realised gains may be capital gains (50% CGT discount if held 12+ months)</li>
              <li><strong>Futures</strong> — generally treated as revenue assets; gains and losses are on revenue account (ordinary income/deductions)</li>
              <li><strong>Warrants</strong> — capital account treatment is common; 50% CGT discount may apply if held 12+ months</li>
              <li><strong>Hedging</strong> — if derivatives are used to hedge an existing capital asset, they may be treated as capital</li>
            </ul>
            <p className="text-sm text-slate-400">
              Derivatives taxation is complex. The ATO looks at the purpose and nature of each transaction. Seek professional tax advice.
            </p>
          </div>
        </div>
      </section>

      {/* Risk warning */}
      <section className="py-14 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <div className="bg-red-50 border border-red-200 rounded-xl p-5">
            <h3 className="font-bold text-red-800 mb-2">Risk Warning</h3>
            <ul className="text-sm text-red-700 space-y-1.5">
              <li><strong>Leverage magnifies losses</strong> — you can lose more than your initial deposit (though ASIC now requires negative balance protection for retail CFDs)</li>
              <li><strong>Most retail traders lose</strong> — ASIC data shows 70–80% of retail CFD/forex traders are unprofitable</li>
              <li><strong>Complexity</strong> — options and derivatives require understanding of Greeks, margin, time decay, and volatility</li>
              <li><strong>Counterparty risk</strong> — OTC derivatives (CFDs) expose you to the solvency of the issuer</li>
              <li><strong>Not suitable for most investors</strong> — ASIC considers these products high-risk and has imposed significant restrictions to protect retail investors</li>
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
              <h2 className="text-lg font-bold text-slate-900 mb-1">Compare Trading Platforms</h2>
              <p className="text-sm text-slate-500">
                Find the right platform for your derivatives trading — compare fees, products, regulation, and features side by side.
              </p>
            </div>
            <Link
              href="/compare"
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors shrink-0"
            >
              Compare Platforms &rarr;
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
