import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, SITE_NAME, CURRENT_YEAR } from "@/lib/seo";
import ContextualLeadMagnet from "@/components/ContextualLeadMagnet";

export const metadata: Metadata = {
  title: `Best Managed Funds & Index Funds Australia (${CURRENT_YEAR})`,
  description:
    "Compare Australia's best managed funds and index funds — Vanguard, Betashares, iShares, Magellan, Platinum. Fees, returns, minimum investment and platform comparison.",
  alternates: { canonical: `${SITE_URL}/invest/managed-funds` },
  openGraph: {
    title: `Best Managed Funds & Index Funds Australia (${CURRENT_YEAR})`,
    description:
      "Compare Australia's best managed funds and index funds — Vanguard, Betashares, iShares, Magellan, Platinum. Fees, returns, minimum investment and platform comparison.",
    url: `${SITE_URL}/invest/managed-funds`,
  },
};

export default function ManagedFundsPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: `${SITE_URL}/invest` },
    { name: "Managed Funds & Index Funds" },
  ]);

  const webPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `Best Managed Funds & Index Funds Australia (${CURRENT_YEAR})`,
    url: `${SITE_URL}/invest/managed-funds`,
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      { "@type": "Question", name: "What is the difference between an index fund and a managed fund?", acceptedAnswer: { "@type": "Answer", text: "An index fund passively tracks a market index (like the ASX 200 or S&P 500) with minimal human intervention and very low fees (0.04-0.20% MER). An actively managed fund employs fund managers who pick stocks to try to beat the benchmark, charging higher fees (0.50-1.50% MER plus potential performance fees). Over 80% of active managers underperform their index over 10 years after fees." } },
      { "@type": "Question", name: "What is the best index fund in Australia?", acceptedAnswer: { "@type": "Answer", text: "For Australian share exposure, Betashares A200 (MER 0.04%) and iShares IOZ (MER 0.05%) are the cheapest ASX 200 trackers. For global shares, Vanguard VGS (MER 0.18%) tracks developed world markets. For an all-in-one diversified portfolio, VDHG (Vanguard, growth-tilted) and DHHF (Betashares, 100% equities) are popular single-fund solutions." } },
      { "@type": "Question", name: "What is the minimum investment for managed funds in Australia?", acceptedAnswer: { "@type": "Answer", text: "ETF versions of index funds can be bought for the price of a single unit — as low as $30 for IOZ or $130 for A200. Unlisted managed funds typically have higher minimums: Vanguard managed funds start at $500, while many active funds require $5,000-$25,000. Some platforms like InvestSMART and Stockspot have minimums as low as $200." } },
      { "@type": "Question", name: "How are managed fund distributions taxed in Australia?", acceptedAnswer: { "@type": "Answer", text: "Fund distributions are taxed at your marginal rate for income components, with capital gains eligible for the 50% CGT discount if the fund held the underlying assets for 12+ months. Australian equity funds pass through franking credits which reduce your tax bill. Most large funds operate under the AMIT regime, providing clear AMMA tax statements." } },
      { "@type": "Question", name: "What is the difference between an ETF and a managed fund?", acceptedAnswer: { "@type": "Answer", text: "ETFs trade on the ASX like shares and can be bought or sold throughout the day at market price via any broker. Unlisted managed funds are bought and sold directly with the fund manager at end-of-day NAV price, typically with higher minimums and slower settlement. ETFs generally have lower fees and greater tax efficiency due to their structure." } },
      { "@type": "Question", name: "Should I choose Vanguard or Betashares?", acceptedAnswer: { "@type": "Answer", text: "Both are excellent low-cost providers. Betashares offers the cheapest Australian share ETF (A200, 0.04% MER) while Vanguard has a broader range including unlisted managed funds and diversified options like VDHG. Betashares DHHF is a popular all-in-one alternative to Vanguard VDHG with a slightly different allocation. The fee difference between them is minimal." } },
      { "@type": "Question", name: "Can SMSFs invest in index funds?", acceptedAnswer: { "@type": "Answer", text: "Yes, index funds and ETFs are among the most popular SMSF investments. Dividends and distributions are taxed at 15% in accumulation phase or 0% in pension phase. Franking credits from Australian equity ETFs create net tax refunds for SMSFs. Many SMSF platforms like Stake SMSF and CommSec offer low-cost access to ETFs." } },
      { "@type": "Question", name: "What is MER and why does it matter?", acceptedAnswer: { "@type": "Answer", text: "MER (Management Expense Ratio) is the annual percentage fee charged by a fund, deducted from returns before they reach you. A 1% MER difference compounded over 30 years can reduce your final balance by 25% or more. This is why low-cost index funds (0.04-0.20% MER) consistently outperform most higher-fee active funds over the long term." } },
    ],
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-14 md:py-20">
        <div className="container-custom">
          <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-6" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <span className="text-slate-600">/</span>
            <Link href="/invest" className="hover:text-white transition-colors">Invest</Link>
            <span className="text-slate-600">/</span>
            <span className="text-slate-300">Managed Funds &amp; Index Funds</span>
          </nav>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-xs font-semibold bg-amber-500 text-slate-900 px-3 py-1 rounded-full">
              Updated {CURRENT_YEAR}
            </span>
            <span className="text-xs font-semibold bg-slate-700 text-slate-200 px-3 py-1 rounded-full">
              Passive &amp; Active Funds
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-4 max-w-3xl">
            Managed Funds &amp; Index Funds in Australia
          </h1>
          <p className="text-lg text-slate-300 leading-relaxed max-w-2xl">
            Whether you prefer low-cost passive index funds or actively managed strategies, Australia offers a deep market of fund options. Compare by asset class, fees, returns, and minimum investment.
          </p>
        </div>
      </section>

      {/* Key stats */}
      <section className="py-10 bg-white border-b border-slate-100">
        <div className="container-custom">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { value: "$4.7T+", label: "Total funds under management (Australia)" },
              { value: "0.04–0.20%", label: "Typical index fund MER" },
              { value: "0.50–1.50%", label: "Typical active fund MER" },
              { value: "$200", label: "Lowest minimum investment" },
            ].map((s) => (
              <div key={s.label} className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center">
                <p className="text-2xl font-extrabold text-amber-600">{s.value}</p>
                <p className="text-xs text-slate-600 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 1: Index Funds vs Managed Funds */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 1</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">Index Funds vs Active Managed Funds</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="font-bold text-slate-900 mb-4">Index Funds (Passive)</h3>
              <dl className="space-y-3">
                {[
                  { dt: "Strategy", dd: "Track a market index (e.g., ASX 200, S&P 500)" },
                  { dt: "Fees (MER)", dd: "0.04–0.20% p.a." },
                  { dt: "Goal", dd: "Match market returns, minus fees" },
                  { dt: "Best for", dd: "Long-term, cost-conscious investors" },
                  { dt: "Tax efficiency", dd: "High — low turnover means fewer CGT events" },
                ].map((item) => (
                  <div key={item.dt} className="flex justify-between gap-3 py-2 border-b border-slate-100 last:border-0">
                    <dt className="text-sm text-slate-500 shrink-0">{item.dt}</dt>
                    <dd className="text-sm font-semibold text-slate-800 text-right">{item.dd}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="font-bold text-slate-900 mb-4">Active Managed Funds</h3>
              <dl className="space-y-3">
                {[
                  { dt: "Strategy", dd: "Stock picking, sector rotation, active management" },
                  { dt: "Fees (MER)", dd: "0.50–1.50% p.a. + performance fees" },
                  { dt: "Goal", dd: "Beat the benchmark index" },
                  { dt: "Best for", dd: "Investors seeking alpha or niche exposure" },
                  { dt: "Tax efficiency", dd: "Lower — higher turnover generates more CGT" },
                ].map((item) => (
                  <div key={item.dt} className="flex justify-between gap-3 py-2 border-b border-slate-100 last:border-0">
                    <dt className="text-sm text-slate-500 shrink-0">{item.dt}</dt>
                    <dd className="text-sm font-semibold text-slate-800 text-right">{item.dd}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
            <h3 className="font-bold text-slate-900 mb-2">The Evidence</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              S&amp;P SPIVA data consistently shows that over 80% of Australian active fund managers underperform the S&amp;P/ASX 200 over 10-year periods after fees. This has driven a massive shift toward low-cost index funds and ETFs — but top-quartile active managers can still add meaningful value, particularly in less efficient markets like small caps and emerging markets.
            </p>
          </div>
        </div>
      </section>

      {/* Section 2: Top Index Fund Providers */}
      <section className="py-14 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 2</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Top Index Fund Providers in Australia</h2>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">Provider</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">Popular Fund/ETF</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">Index</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">MER</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">Minimum</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { provider: "Vanguard", fund: "VAS / Vanguard Index Fund", index: "ASX 300", mer: "0.07% (ETF) / 0.16% (managed)", min: "$500 (managed)" },
                  { provider: "Betashares", fund: "A200", index: "ASX 200", mer: "0.04%", min: "1 unit (~$130)" },
                  { provider: "iShares (BlackRock)", fund: "IOZ", index: "ASX 200", mer: "0.05%", min: "1 unit (~$30)" },
                  { provider: "Vanguard", fund: "VGS", index: "MSCI World ex-AU", mer: "0.18%", min: "1 unit (~$100)" },
                  { provider: "Betashares", fund: "DHHF", index: "Multi-asset diversified", mer: "0.19%", min: "1 unit (~$30)" },
                  { provider: "Vanguard", fund: "VDHG", index: "Diversified High Growth", mer: "0.27%", min: "1 unit (~$60)" },
                ].map((r, i) => (
                  <tr key={r.fund} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                    <td className="py-2.5 px-3 font-bold text-amber-700 border-b border-slate-100">{r.provider}</td>
                    <td className="py-2.5 px-3 text-slate-800 border-b border-slate-100">{r.fund}</td>
                    <td className="py-2.5 px-3 text-slate-500 border-b border-slate-100">{r.index}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800 border-b border-slate-100">{r.mer}</td>
                    <td className="py-2.5 px-3 text-slate-500 border-b border-slate-100">{r.min}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Lead Magnet */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <ContextualLeadMagnet segment="fee-audit" />
        </div>
      </section>

      {/* Section 3: Top Active Fund Managers */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 3</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Notable Active Fund Managers</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { name: "Magellan Financial Group", focus: "Global equities, infrastructure", aum: "$35B+ AUM", note: "Flagship Global Fund — large-cap quality stocks" },
              { name: "Platinum Asset Management", focus: "Global & Asian equities", aum: "$14B+ AUM", note: "Contrarian, value-oriented international manager" },
              { name: "Hyperion Asset Management", focus: "Australian & global growth equities", aum: "$10B+ AUM", note: "High-conviction growth portfolios" },
              { name: "PM Capital", focus: "Global equities & fixed income", aum: "$4B+ AUM", note: "Concentrated, long-term global value" },
              { name: "Antipodes Partners", focus: "Global equities, long/short", aum: "$8B+ AUM", note: "Pragmatic value investing globally" },
              { name: "GQG Partners", focus: "Global & emerging market equities", aum: "$150B+ AUM", note: "US-based, ASX-listed (GQG), quality-focused" },
            ].map((m) => (
              <div key={m.name} className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                <p className="font-bold text-slate-900">{m.name}</p>
                <p className="text-sm text-slate-500 mt-1">{m.focus}</p>
                <p className="text-xs text-amber-600 font-semibold mt-2">{m.aum}</p>
                <p className="text-xs text-slate-400 mt-1">{m.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 4: Platforms to Access Funds */}
      <section className="py-14 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 4</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Where to Buy Managed &amp; Index Funds</h2>

          <div className="space-y-4">
            {[
              { platform: "Vanguard Personal Investor", desc: "Direct access to Vanguard funds and ETFs. No brokerage on Vanguard ETF purchases. Minimum $500 for managed funds.", fee: "No account fees; $0 brokerage on Vanguard ETFs" },
              { platform: "InvestSMART", desc: "Managed portfolios using low-cost ETFs. Capped fee of $451/year regardless of balance.", fee: "$451/year cap; $0 brokerage" },
              { platform: "Stockspot", desc: "Australia's largest robo-advisor. Automated ETF portfolios based on risk profile.", fee: "0.66% p.a. (under $10K); 0.396% ($500K+)" },
              { platform: "Any ASX Broker", desc: "ETF versions of index funds (VAS, A200, IOZ, VGS, VDHG) can be bought through any ASX broker — Stake, CMC, CommSec, etc.", fee: "Standard brokerage ($0–$9.50 per trade)" },
              { platform: "Netwealth / Hub24 / BT Panorama", desc: "Wrap platforms with access to 200+ managed funds. Typically used via a financial adviser.", fee: "Platform fee 0.10–0.35% p.a." },
            ].map((p) => (
              <div key={p.platform} className="bg-white border border-slate-200 rounded-xl p-5">
                <h3 className="font-bold text-slate-900">{p.platform}</h3>
                <p className="text-sm text-slate-500 mt-1">{p.desc}</p>
                <p className="text-xs text-amber-600 font-semibold mt-2">{p.fee}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 5: Tax Treatment */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 5</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Tax Treatment</h2>

          <div className="prose prose-slate max-w-none">
            <ul>
              <li><strong>Distributions</strong> — fund distributions are taxed at your marginal rate (income components) or concessional rate (capital gains with 50% discount if held 12+ months)</li>
              <li><strong>Franking credits</strong> — Australian equity funds pass through franking credits, reducing your tax bill</li>
              <li><strong>AMIT regime</strong> — most large funds operate under the Attribution Managed Investment Trust regime, providing clear tax statements (AMMA statements)</li>
              <li><strong>CGT on sale</strong> — selling fund units/ETF units is a CGT event; 50% discount applies if held 12+ months</li>
              <li><strong>SMSF</strong> — funds taxed at 15% in accumulation, 0% in pension phase; an excellent structure for index fund investing</li>
              <li><strong>Non-residents</strong> — MIT withholding tax of 15% (treaty countries) or 30% (non-treaty) on fund distributions</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Related guides */}
      <section className="py-14 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Related Guides</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Explore Related Investment Guides</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { title: "Dividend Investing", href: "/invest/dividend-investing", desc: "High-yield ASX stocks, franking credits explained, and dividend ETFs." },
              { title: "A-REITs", href: "/invest/reits", desc: "ASX-listed property trusts for diversified real estate exposure." },
              { title: "SMSF Investment Guide", href: "/invest/smsf", desc: "What SMSFs actually invest in — property, shares, crypto and more." },
              { title: "Bonds & Fixed Income", href: "/invest/bonds", desc: "Government and corporate bonds for stable income and capital preservation." },
            ].map((guide) => (
              <Link key={guide.href} href={guide.href} className="group bg-white border border-slate-200 rounded-xl p-5 hover:border-amber-200 hover:shadow-md transition-all">
                <h3 className="font-bold text-slate-900 group-hover:text-amber-600 transition-colors">{guide.title}</h3>
                <p className="text-sm text-slate-500 mt-1">{guide.desc}</p>
                <span className="inline-flex items-center text-amber-600 text-sm font-semibold mt-2">Read guide →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">FAQ</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {faqSchema.mainEntity.map((faq: { name: string; acceptedAnswer: { text: string } }) => (
              <details key={faq.name} className="group bg-white border border-slate-200 rounded-xl">
                <summary className="flex items-center justify-between px-5 py-4 cursor-pointer text-sm font-bold text-slate-900 hover:text-amber-600 transition-colors">
                  {faq.name}
                  <svg className="w-4 h-4 text-slate-400 shrink-0 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </summary>
                <div className="px-5 pb-4 text-sm text-slate-600 leading-relaxed">{faq.acceptedAnswer.text}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 bg-slate-50">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-xl p-8 flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-slate-900 mb-1">Need Help Choosing the Right Funds?</h2>
              <p className="text-sm text-slate-500">
                A financial planner can build a diversified portfolio tailored to your goals, risk tolerance, and tax situation.
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
