import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

const FAQS = [
  {
    q: "Does passive investing outperform active investing?",
    a: "Over long time horizons (10+ years), most actively managed funds underperform their benchmark index after fees. SPIVA (S&P Indices vs Active) data consistently shows 80-90% of Australian actively managed equity funds underperform the S&P/ASX 200 over 10-year periods after fees. However, this is an average outcome — some active managers do outperform. The challenge is identifying them in advance, before the performance happens.",
  },
  {
    q: "What is the real cost difference between passive and active funds?",
    a: "The average actively managed Australian equity fund charges 0.8–1.2% in management fees (MER) plus potentially a 15–20% performance fee. A comparable passive ETF (e.g., VAS tracking the ASX 300) charges 0.07% per year. On a $500,000 portfolio, 1% in fees versus 0.07% is a difference of ~$4,650 per year. Compounded over 20 years, this fee gap alone (before any performance difference) represents a significant amount of wealth. The fee advantage is the most reliable argument for passive investing.",
  },
  {
    q: "Are there areas where active management adds value?",
    a: "Yes. Active management is more likely to add value in: (1) less efficient markets — small cap stocks, emerging markets, and private credit where less information is priced in; (2) alternative strategies — absolute return, market-neutral, or hedged approaches where the goal is capital protection rather than benchmark-beating; (3) niche sectors (biotech, early-stage resources) where deep specialist knowledge genuinely matters. The evidence against active management is strongest in large-cap developed equity markets (ASX 200, S&P 500) where information is rapidly priced in.",
  },
  {
    q: "Can I combine passive and active investing?",
    a: "Yes — a 'core and satellite' approach is common. Use passive ETFs for the core (60-80% of portfolio), providing broad diversification at low cost, and allocate a smaller 'satellite' portion to active managers or specific tilts (value, small cap, sector) where you have conviction. This limits the damage if your active bets underperform, while retaining some active exposure. Many financial advisers recommend this approach.",
  },
  {
    q: "What does SPIVA data say about the ASX?",
    a: "SPIVA (S&P Indices vs Active) produces semi-annual scorecards comparing active fund performance against benchmarks. For Australian equity funds over the 10-year period to mid-2024: approximately 80% of active large-cap Australian equity funds underperformed the S&P/ASX 200. For mid-small cap funds the underperformance rate is slightly lower but still above 60% over 10 years. SPIVA data covers multiple markets globally and consistently shows similar results.",
  },
  {
    q: "Is an index fund the same as a passive investment?",
    a: "Broadly yes. An index fund (whether an ETF or unlisted managed fund) tracks a market index passively — buying all (or a representative sample of) the stocks in the index in proportion to their weight. 'Passive' simply means not trying to beat the index through active stock selection. All mainstream index ETFs (VAS, IVV, VGS, A200, etc.) are passive investments. Some ETFs, however, use smart-beta or factor strategies that are technically still rules-based but involve more active-like tilts.",
  },
];

const COMPARISON = [
  { aspect: "Goal", passive: "Match index return (minus small fee)", active: "Beat index return (after higher fees)" },
  { aspect: "Fees (typical)", passive: "0.04%–0.3% MER", active: "0.7%–1.5% MER + performance fee" },
  { aspect: "Turnover", passive: "Low — follows index changes only", active: "High — frequent trading decisions" },
  { aspect: "Tax efficiency", passive: "Higher — fewer CGT events", active: "Lower — trading generates CGT" },
  { aspect: "Transparency", passive: "Full — holdings published daily", active: "Limited — may only disclose quarterly" },
  { aspect: "Long-run outperformance", passive: "~80-90% of active funds fail to beat", active: "Possible but rare; difficult to identify in advance" },
  { aspect: "Best suited for", passive: "Core portfolio, efficient markets", active: "Niche exposure, less efficient markets" },
];

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Passive vs Active Investing Australia (${CURRENT_YEAR}) — Which Wins?`,
  description: `Should you invest passively (index ETFs) or with active fund managers? SPIVA data, fee comparison, and when active management can add value in Australia. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Passive vs Active Investing Australia (${CURRENT_YEAR})`,
    description: "SPIVA evidence, the true cost of active management, and a core-satellite framework for Australian investors.",
    url: `${SITE_URL}/invest/passive-vs-active`,
    images: [{ url: `/api/og?title=${encodeURIComponent("Passive vs Active Investing")}&sub=${encodeURIComponent("SPIVA Evidence · Fee Comparison · Australia · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/invest/passive-vs-active` },
};

export default function PassiveVsActivePage() {
  const faq = faqJsonLd(FAQS);
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Invest", url: absoluteUrl("/invest") },
    { name: "Passive vs Active Investing", url: absoluteUrl("/invest/passive-vs-active") },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {faq && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }} />}

      <div className="bg-white min-h-screen">
        {/* Hero */}
        <section className="bg-slate-900 text-white py-10 md:py-14">
          <div className="container-custom max-w-5xl">
            <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-5" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-white">Home</Link>
              <span className="text-slate-600">/</span>
              <Link href="/invest" className="hover:text-white">Invest</Link>
              <span className="text-slate-600">/</span>
              <span className="text-white font-medium">Passive vs Active</span>
            </nav>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-xs font-semibold bg-amber-500 text-slate-900 px-3 py-1 rounded-full">{UPDATED_LABEL}</span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-4 max-w-3xl">
              Passive vs Active Investing Australia ({CURRENT_YEAR})
            </h1>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-2xl mb-8">
              The evidence is clear: most active funds underperform their benchmark after fees. But active management isn&apos;t dead — here&apos;s where it still earns its keep.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Active AU funds underperform (10-yr)", value: "~80%" },
                { label: "Typical active fund MER", value: "0.9%" },
                { label: "VAS (passive ASX ETF) MER", value: "0.07%" },
                { label: "10-yr fee gap on $500K", value: "~$100K+" },
              ].map((s) => (
                <div key={s.label} className="bg-white/10 rounded-xl p-4 text-center">
                  <p className="text-2xl font-extrabold text-amber-400">{s.value}</p>
                  <p className="text-xs text-slate-300 mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Definition section */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
                <h2 className="text-xl font-extrabold text-amber-900 mb-3">Passive investing</h2>
                <p className="text-sm text-slate-700 leading-relaxed mb-3">
                  Track a market index (e.g., ASX 200, S&amp;P 500) by buying all stocks in proportion to their index weight. The goal is to <strong>match</strong> the index return, minus a small fee.
                </p>
                <ul className="space-y-1 text-sm text-slate-700">
                  <li>ETFs and index funds are the main vehicle</li>
                  <li>No stock selection decisions — the index decides</li>
                  <li>Very low cost (0.04%–0.3% MER typical)</li>
                  <li>High tax efficiency due to low turnover</li>
                </ul>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">
                <h2 className="text-xl font-extrabold text-slate-900 mb-3">Active investing</h2>
                <p className="text-sm text-slate-700 leading-relaxed mb-3">
                  Fund managers (or individual investors) select specific stocks/assets trying to <strong>beat</strong> an index benchmark through research, timing, and conviction.
                </p>
                <ul className="space-y-1 text-sm text-slate-700">
                  <li>Managed funds, LICs, hedge funds, stock-picking</li>
                  <li>Human judgment drives portfolio construction</li>
                  <li>Higher cost (0.7%–1.5%+ MER plus performance fees)</li>
                  <li>More trading = more CGT events</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* SPIVA evidence */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">The evidence: SPIVA data</h2>
            <p className="text-sm text-slate-600 mb-6 max-w-2xl">
              S&amp;P Indices vs Active (SPIVA) measures what percentage of actively managed funds fail to beat their benchmark, after fees. The results are consistent across time periods and markets.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {[
                { period: "1 year", rate: "~55%", note: "Active managers have a coin-flip chance short-term" },
                { period: "5 years", rate: "~70%", note: "Compound underperformance: the fee drag compounds" },
                { period: "10 years", rate: "~80%", note: "Long-run evidence is decisive for large-cap AU equity" },
              ].map((r) => (
                <div key={r.period} className="rounded-xl border border-slate-200 bg-white p-5 text-center">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">{r.period} underperformance</p>
                  <p className="text-3xl font-extrabold text-red-600 mb-1">{r.rate}</p>
                  <p className="text-sm font-bold text-slate-700">of active AU equity funds</p>
                  <p className="text-xs text-slate-500 mt-2">{r.note}</p>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm text-blue-900">
                <strong>What this means:</strong> If you randomly pick an active Australian equity fund, you have roughly an 80% chance of underperforming a simple index ETF over 10 years. Even identifying an outperforming manager in advance — before their outperformance — is extremely difficult.
              </p>
            </div>
          </div>
        </section>

        {/* Fee drag worked example */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">The fee drag: $500,000 over 20 years</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                <h3 className="font-extrabold text-emerald-900 mb-4">Passive ETF (VAS, 0.07% MER)</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span>Starting balance</span><span className="font-bold">$500,000</span></div>
                  <div className="flex justify-between"><span>Annual return assumption</span><span className="font-bold">8.0% (gross)</span></div>
                  <div className="flex justify-between"><span>After-fee return</span><span className="font-bold">7.93%</span></div>
                  <div className="flex justify-between border-t border-emerald-200 pt-2 mt-2"><span>Portfolio after 20 years</span><span className="font-extrabold text-emerald-800">~$2,277,000</span></div>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="font-extrabold text-slate-900 mb-4">Active fund (1.0% MER, same gross return)</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span>Starting balance</span><span className="font-bold">$500,000</span></div>
                  <div className="flex justify-between"><span>Annual return assumption</span><span className="font-bold">8.0% (gross)</span></div>
                  <div className="flex justify-between"><span>After-fee return</span><span className="font-bold">7.0%</span></div>
                  <div className="flex justify-between border-t border-slate-200 pt-2 mt-2"><span>Portfolio after 20 years</span><span className="font-extrabold text-slate-700">~$1,934,000</span></div>
                </div>
              </div>
            </div>
            <p className="text-sm text-slate-600 mt-4 text-center">
              Fee drag alone (same gross return): <strong className="text-red-700">~$343,000 less</strong> over 20 years. This does not even account for the likelihood of the active fund also underperforming gross of fees.
            </p>
          </div>
        </section>

        {/* Comparison table */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">Head-to-head comparison</h2>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-extrabold text-slate-700">Aspect</th>
                    <th className="px-4 py-3 text-left font-extrabold text-amber-700">Passive</th>
                    <th className="px-4 py-3 text-left font-extrabold text-slate-700">Active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {COMPARISON.map((r) => (
                    <tr key={r.aspect}>
                      <td className="px-4 py-3 font-bold text-slate-900">{r.aspect}</td>
                      <td className="px-4 py-3 text-slate-700">{r.passive}</td>
                      <td className="px-4 py-3 text-slate-700">{r.active}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* When active can work */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">Where active management has a better chance</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  title: "Less efficient markets",
                  desc: "Small-cap ASX stocks, emerging markets, and private credit where information isn't instantly priced in. Research and local knowledge genuinely matters here.",
                  badge: "Small caps",
                },
                {
                  title: "Absolute return strategies",
                  desc: "Market-neutral, long/short, and capital-preservation strategies where the goal is protecting capital rather than beating an equity index.",
                  badge: "Alternatives",
                },
                {
                  title: "Specialist niches",
                  desc: "Biotech, resources exploration, venture capital — sectors where deep domain expertise drives returns. Must verify the manager's actual edge.",
                  badge: "Niche",
                },
              ].map((c) => (
                <div key={c.title} className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                  <span className="text-xs font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">{c.badge}</span>
                  <h3 className="font-extrabold text-slate-900 mt-3 mb-2">{c.title}</h3>
                  <p className="text-sm text-slate-700 leading-relaxed">{c.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Core-satellite framework */}
        <section className="py-12 bg-amber-50 border-y border-amber-200">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-amber-900 mb-4">Practical approach: core and satellite</h2>
            <p className="text-sm text-amber-900 mb-4 max-w-2xl">
              Most financial planners use a core-and-satellite approach that captures the benefits of both strategies.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-amber-200 bg-white p-5">
                <h3 className="font-extrabold text-slate-900 mb-2">Core (60–80% of portfolio)</h3>
                <p className="text-sm text-slate-700 leading-relaxed">Broad passive ETFs: ASX 200/300 (VAS/A200), global developed markets (VGS/BGBL), fixed income (VAF). Very low cost. Handles most of the long-term compounding.</p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-white p-5">
                <h3 className="font-extrabold text-slate-900 mb-2">Satellite (20–40% of portfolio)</h3>
                <p className="text-sm text-slate-700 leading-relaxed">Active tilts where you have conviction: small-cap value fund, emerging markets manager, specialist sector ETF, individual stock positions, private credit fund. Higher cost but potential for alpha.</p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-3xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">Frequently asked questions</h2>
            <div className="space-y-2">
              {FAQS.map((item) => (
                <details key={item.q} className="group rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                  <summary className="flex items-center justify-between gap-3 px-5 py-4 cursor-pointer list-none font-bold text-slate-900 text-sm hover:bg-slate-100 transition-colors">
                    {item.q}
                    <span className="shrink-0 text-slate-400 group-open:rotate-180 transition-transform">&#9660;</span>
                  </summary>
                  <p className="px-5 pb-4 text-sm text-slate-700 leading-relaxed">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Compliance footer */}
        <section className="py-10 bg-slate-50 border-t border-slate-200">
          <div className="container-custom max-w-3xl">
            <p className="text-xs text-slate-500 leading-relaxed mb-6">{GENERAL_ADVICE_WARNING}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <Link href="/invest/index-funds" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">
                Index funds guide &#8594;
              </Link>
              <Link href="/etfs" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">
                ETF hub &#8594;
              </Link>
              <Link href="/invest/dollar-cost-averaging" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">
                Dollar-cost averaging &#8594;
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
