import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, SITE_NAME, CURRENT_YEAR } from "@/lib/seo";

export const metadata: Metadata = {
  title: `How to Invest in Gold in Australia (${CURRENT_YEAR}) — Physical, ETFs & ASX Miners`,
  description:
    "Four ways to invest in gold in Australia: physical bullion via Perth Mint, gold ETFs (GOLD, PMGOLD, QAU), ASX gold miners (NST, EVN, NEM), and the Perth Mint Certificate Programme.",
  alternates: { canonical: `${SITE_URL}/invest/gold` },
  openGraph: {
    title: `How to Invest in Gold in Australia (${CURRENT_YEAR}) — Physical, ETFs & ASX Miners`,
    description:
      "Four ways to invest in gold in Australia: physical bullion via Perth Mint, gold ETFs (GOLD, PMGOLD, QAU), ASX gold miners (NST, EVN, NEM), and the Perth Mint Certificate Programme.",
    url: `${SITE_URL}/invest/gold`,
  },
};

export default function GoldPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: `${SITE_URL}/invest` },
    { name: "Gold & Precious Metals" },
  ]);

  const webPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `How to Invest in Gold in Australia (${CURRENT_YEAR})`,
    url: `${SITE_URL}/invest/gold`,
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
            <span className="text-slate-300">Gold &amp; Precious Metals</span>
          </nav>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-xs font-semibold bg-amber-500 text-slate-900 px-3 py-1 rounded-full">
              Updated {CURRENT_YEAR}
            </span>
            <span className="text-xs font-semibold bg-slate-700 text-slate-200 px-3 py-1 rounded-full">
              World&apos;s 2nd Largest Gold Producer
            </span>
            <span className="text-xs font-semibold bg-slate-700 text-slate-200 px-3 py-1 rounded-full">
              SMSF-Permitted
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-4 max-w-3xl">
            How to Invest in Gold in Australia
          </h1>
          <p className="text-lg text-slate-300 leading-relaxed max-w-2xl">
            Australia produces more gold than almost any other country. Whether you want physical bullion, ETFs, ASX-listed miners, or the government-backed Perth Mint Certificate Programme — here is everything you need to know.
          </p>
        </div>
      </section>

      {/* Key stats */}
      <section className="py-10 bg-white border-b border-slate-100">
        <div className="container-custom">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { value: "#2", label: "World gold producer by volume" },
              { value: "~320t", label: "Annual Australian gold production" },
              { value: "Govt-backed", label: "Perth Mint (Western Australia)" },
              { value: "GST-free", label: "Investment-grade gold bullion" },
            ].map((s) => (
              <div key={s.label} className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center">
                <p className="text-2xl font-extrabold text-amber-600">{s.value}</p>
                <p className="text-xs text-slate-600 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why gold */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Why Gold</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">Why Investors Buy Gold in Australia</h2>

          <div className="prose prose-slate max-w-none mb-8">
            <p>
              Gold occupies a unique position in Australian investment portfolios. Unlike most assets, gold does not produce cash flow — its value is driven by store-of-value demand, inflation hedging, central bank buying, and its inverse relationship to the US dollar.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                title: "Inflation Hedge",
                desc: "Gold has historically preserved purchasing power over long periods, particularly during inflationary environments.",
              },
              {
                title: "AUD/USD Dynamics",
                desc: "Gold is priced in USD. When the AUD falls against the USD, Australian gold investors see an amplified return in AUD terms.",
              },
              {
                title: "Central Bank Buying",
                desc: "Global central banks — particularly in emerging markets — have been net buyers of gold, supporting long-term demand.",
              },
              {
                title: "Portfolio Diversification",
                desc: "Low correlation to equities and bonds. Tends to perform well during equity market stress events.",
              },
            ].map((c) => (
              <div key={c.title} className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <p className="font-bold text-slate-900 text-sm">{c.title}</p>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4 Ways */}
      <section className="py-14 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 1</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-8">4 Ways to Invest in Gold in Australia</h2>

          <div className="space-y-8">
            {/* Physical bullion */}
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-9 h-9 rounded-full bg-amber-500 text-slate-900 font-extrabold flex items-center justify-center shrink-0">1</span>
                <h3 className="text-lg font-bold text-slate-900">Physical Bullion</h3>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                You own the gold directly — as bars, coins, or via an allocated storage account. The Perth Mint, being Western Australian Government-guaranteed, is the gold standard for Australian physical gold.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { name: "Perth Mint", detail: "Government-guaranteed. Physical gold and Perth Mint Gold Savings Account (online, $50 minimum).", href: "https://www.perthmint.com" },
                  { name: "ABC Bullion", detail: "Sydney-based dealer. Wide range of bars and coins. Allocated and unallocated storage available.", href: null },
                  { name: "The Gold Bullion Company", detail: "National dealer. Online ordering, insured delivery, or vault storage. Wide range of denominations.", href: null },
                ].map((d) => (
                  <div key={d.name} className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                    <p className="font-bold text-slate-900 text-sm">{d.name}</p>
                    <p className="text-xs text-slate-600 mt-1">{d.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Gold ETFs */}
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-9 h-9 rounded-full bg-amber-500 text-slate-900 font-extrabold flex items-center justify-center shrink-0">2</span>
                <h3 className="text-lg font-bold text-slate-900">Gold ETFs (ASX-Listed)</h3>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                The simplest way for most investors. Buy and sell like a share through any broker. Physical gold ETFs hold allocated gold in a vault; you own a pro-rata share of the gold without storage hassle.
              </p>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">ASX Code</th>
                      <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">Fund Name</th>
                      <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">Type</th>
                      <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">~MER p.a.</th>
                      <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">Currency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { code: "GOLD", name: "iShares Physical Gold ETF", type: "Physical gold (USD-unhedged)", mer: "~0.18%", currency: "USD exposure" },
                      { code: "PMGOLD", name: "Perth Mint Physical Gold ETF", type: "Physical gold, Govt-guaranteed vault", mer: "~0.15%", currency: "USD exposure" },
                      { code: "QAU", name: "BetaShares Gold Bullion ETF", type: "Physical gold — currency hedged (AUD)", mer: "~0.59%", currency: "AUD-hedged" },
                      { code: "GDX", name: "VanEck Gold Miners ETF", type: "Equity — ASX & global gold miners", mer: "~0.53%", currency: "Mixed (USD dominant)" },
                    ].map((r, i) => (
                      <tr key={r.code} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                        <td className="py-2.5 px-3 font-bold text-amber-700 border-b border-slate-100">{r.code}</td>
                        <td className="py-2.5 px-3 text-slate-800 border-b border-slate-100">{r.name}</td>
                        <td className="py-2.5 px-3 text-slate-500 border-b border-slate-100">{r.type}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-100">{r.mer}</td>
                        <td className="py-2.5 px-3 text-slate-500 border-b border-slate-100">{r.currency}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-slate-400 mt-2">Verify current fees with the fund manager. GDX holds equities (gold miners), not physical gold.</p>
            </div>

            {/* ASX Gold Miners */}
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-9 h-9 rounded-full bg-amber-500 text-slate-900 font-extrabold flex items-center justify-center shrink-0">3</span>
                <h3 className="text-lg font-bold text-slate-900">ASX-Listed Gold Miners</h3>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                Direct equity in gold mining companies — typically more volatile than physical gold or ETFs, but with potential for operational leverage (a 10% gold price rise can translate to 30%+ earnings growth for an efficient miner). Buy through any ASX broker.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { code: "NST", name: "Northern Star Resources", desc: "Major global gold producer, WA-based" },
                  { code: "EVN", name: "Evolution Mining", desc: "Mid-tier multi-mine producer" },
                  { code: "NEM", name: "Newmont (ASX-listed)", desc: "World's largest gold miner, globally diversified" },
                  { code: "RRL", name: "Regis Resources", desc: "WA producer; Duketon operations" },
                  { code: "GOR", name: "Gold Road Resources", desc: "Gruyere mine (WA) — joint venture with Gold Fields" },
                  { code: "DEG", name: "De Grey Mining", desc: "Major development project (Hemi, WA)" },
                ].map((m) => (
                  <div key={m.code} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <p className="font-bold text-amber-700 text-sm">{m.code}</p>
                    <p className="text-sm font-semibold text-slate-800">{m.name}</p>
                    <p className="text-xs text-slate-500 mt-1">{m.desc}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-3">
                Always verify current ASX listings and company status. Mining equities carry operational, exploration, and management risks beyond gold price exposure.
              </p>
            </div>

            {/* Perth Mint Certificate */}
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-9 h-9 rounded-full bg-amber-500 text-slate-900 font-extrabold flex items-center justify-center shrink-0">4</span>
                <h3 className="text-lg font-bold text-slate-900">Perth Mint Certificate Programme</h3>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                The Perth Mint Certificate Programme (PMCP) is designed for larger investors (typically $10,000+) seeking allocated gold storage backed by the Western Australian Government. Unlike an ETF, the certificate is a direct legal claim on specific gold held in the Perth Mint vault — not a fund unit.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { title: "Government Guarantee", desc: "Backed by the Western Australian Government — one of the few government-guaranteed gold products globally" },
                  { title: "Allocated Storage", desc: "Your specific gold is identified and segregated; not commingled with other investors' holdings" },
                  { title: "International Access", desc: "Perth Mint actively markets to international buyers; a popular choice for Asian and Middle Eastern investors" },
                ].map((f) => (
                  <div key={f.title} className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                    <p className="font-bold text-slate-900 text-sm">{f.title}</p>
                    <p className="text-xs text-slate-600 mt-1">{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Currency considerations */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 2</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">Currency Considerations</h2>

          <div className="prose prose-slate max-w-none">
            <p>
              Gold is universally priced in USD per troy ounce. For Australian investors, this creates a currency dynamic that can amplify or dampen returns:
            </p>
            <ul>
              <li><strong>When AUD weakens vs USD</strong> — gold rises more in AUD terms than in USD terms (positive for unhedged Aussie gold holders)</li>
              <li><strong>When AUD strengthens vs USD</strong> — gold returns in AUD are lower than the underlying USD move</li>
              <li><strong>Currency-hedged ETFs (QAU)</strong> — eliminate AUD/USD noise; you get pure gold price exposure in AUD</li>
              <li><strong>Unhedged ETFs (GOLD, PMGOLD)</strong> — include AUD/USD fluctuation; historically a benefit during Australian dollar weakness events</li>
            </ul>
            <p>
              Historically, the AUD and gold price have been negatively correlated — when global risk sentiment falls, gold rises and the AUD typically falls (being a risk-on currency), amplifying returns for unhedged Australian gold holders.
            </p>
          </div>
        </div>
      </section>

      {/* Tax */}
      <section className="py-14 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 3</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Tax Treatment of Gold Investments</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="font-bold text-slate-900 mb-3">Australian Residents</h3>
              <div className="prose prose-slate max-w-none prose-sm">
                <ul>
                  <li><strong>GST exemption</strong> — investment-grade gold (99.5%+ fineness, bars or coins) is GST-free under the A New Tax System (GST) Act. Jewellery and collectibles are not exempt.</li>
                  <li><strong>Capital Gains Tax (CGT)</strong> — profits on gold held more than 12 months qualify for the 50% CGT discount</li>
                  <li><strong>ETF distributions</strong> — physical gold ETFs do not produce income; only capital gains events occur on sale</li>
                  <li><strong>SMSF</strong> — gold and gold ETFs can be held in SMSF; must be stored separately from personal assets; arm&apos;s-length valuation required</li>
                </ul>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="font-bold text-slate-900 mb-3">Foreign Investors</h3>
              <div className="prose prose-slate max-w-none prose-sm">
                <ul>
                  <li><strong>FIRB</strong> — not required for gold ETF purchases or ASX miner shareholdings below material thresholds</li>
                  <li><strong>Physical gold storage in Australia</strong> — foreign persons can hold gold at the Perth Mint without FIRB approval; gold is a moveable asset, not land</li>
                  <li><strong>CGT for non-residents</strong> — generally not subject to Australian CGT on portfolio share/ETF investments (not Taxable Australian Property)</li>
                  <li><strong>No withholding tax</strong> — physical gold ETFs produce no income, so no withholding issue; miner dividends subject to standard 30% (or DTA rate) withholding</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SMSF gold */}
      <section className="py-10 bg-white border-t border-slate-100">
        <div className="container-custom max-w-4xl">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 flex flex-col md:flex-row items-start gap-5">
            <div className="w-10 h-10 rounded-lg bg-amber-200 flex items-center justify-center shrink-0 mt-0.5">
              <svg className="w-5 h-5 text-amber-800" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-slate-900 mb-2">Gold in Your SMSF</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                SMSFs can legally hold physical gold (bars, coins) and gold ETFs. Physical gold must be stored with an approved custodian (Perth Mint, ABC Bullion secured vault) — it cannot be kept at a trustee&apos;s home. Gold ETFs (GOLD, PMGOLD) held via an SMSF brokerage account are the simplest approach for most SMSF trustees.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Advisor CTA */}
      <section className="py-14 bg-slate-50">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-xl p-8 flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-slate-900 mb-1">Get Personalised Gold Investment Advice</h2>
              <p className="text-sm text-slate-500">
                Whether you are structuring gold exposure for a SMSF, a large physical purchase at the Perth Mint, or ETF allocation within a broader portfolio — speak with a verified Australian financial adviser.
              </p>
            </div>
            <Link
              href="/advisors/financial-planners"
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors shrink-0"
            >
              Find an Adviser &rarr;
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
