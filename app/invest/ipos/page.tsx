import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, SITE_NAME, CURRENT_YEAR } from "@/lib/seo";

export const metadata: Metadata = {
  title: `Australian IPO Calendar ${CURRENT_YEAR} — Upcoming ASX Listings`,
  description:
    `How to participate in Australian IPOs — the application process, broker access, allocation rules, recent notable ASX listings, and what to watch in ${CURRENT_YEAR}.`,
  alternates: { canonical: `${SITE_URL}/invest/ipos` },
  openGraph: {
    title: `Australian IPO Calendar ${CURRENT_YEAR} — Upcoming ASX Listings`,
    description:
      `How to participate in Australian IPOs — the application process, broker access, allocation rules, recent notable ASX listings, and what to watch in ${CURRENT_YEAR}.`,
    url: `${SITE_URL}/invest/ipos`,
  },
};

export default function IposPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: `${SITE_URL}/invest` },
    { name: "IPO Calendar" },
  ]);

  const webPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `Australian IPO Calendar ${CURRENT_YEAR} — Upcoming ASX Listings`,
    url: `${SITE_URL}/invest/ipos`,
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
      <section className="relative bg-white border-b border-slate-100 overflow-hidden py-8 md:py-12">
        <div className="container-custom">
          <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-6" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-slate-900 transition-colors">Home</Link>
            <span className="text-slate-300">/</span>
            <Link href="/invest" className="hover:text-slate-900 transition-colors">Invest</Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-medium">IPO Calendar</span>
          </nav>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-xs font-semibold bg-amber-500 text-slate-900 px-3 py-1 rounded-full">
              Updated {CURRENT_YEAR}
            </span>
            <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
              ASX New Listings
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-4 max-w-3xl text-slate-900">
            Australian IPO Calendar {CURRENT_YEAR}
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed max-w-2xl">
            Everything you need to know about investing in upcoming ASX IPOs — how to apply, how allocations work, what to look for in a prospectus, and how to track the pipeline.
          </p>
        </div>
      </section>

      {/* What is an IPO */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Overview</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">What is an ASX IPO?</h2>

          <div className="prose prose-slate max-w-none">
            <p>
              An Initial Public Offering (IPO) — also called a &quot;float&quot; or &quot;new listing&quot; — is when a private company sells shares to the public and lists on the Australian Securities Exchange (ASX) for the first time. After listing, those shares trade freely on the ASX like any other stock.
            </p>
            <p>
              Australia has one of the most active IPO markets in the Asia-Pacific. In a typical year, 100–200 new companies list on the ASX, spanning mining, technology, healthcare, property, and financial services.
            </p>
            <h3>Types of ASX Listings</h3>
            <ul>
              <li><strong>IPO (Initial Public Offering)</strong> — new shares sold to the public via a prospectus; company lists for the first time</li>
              <li><strong>Back-door listing / RTO (Reverse Takeover)</strong> — a private company acquires a listed shell to achieve a listing without a full IPO process</li>
              <li><strong>Spin-off / demerger</strong> — a listed company separates a business unit into a new ASX-listed entity (e.g., Endeavour Group from Woolworths)</li>
              <li><strong>Secondary listing</strong> — a company already listed overseas also lists on ASX (e.g., Newmont)</li>
            </ul>
          </div>
        </div>
      </section>

      {/* How to apply */}
      <section className="py-14 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 1</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">How Retail Investors Apply for ASX IPOs</h2>

          <div className="space-y-4 mb-8">
            {[
              {
                step: "1",
                title: "Read the Prospectus",
                desc: "Every ASX IPO requires a prospectus lodged with ASIC. Read it carefully — particularly the risk factors section and use of funds. Available free from the company's website and ASX announcements.",
              },
              {
                step: "2",
                title: "Apply Through a Broker or the Offer Website",
                desc: "Most IPOs offer a direct application via an online application form (linked in the prospectus). Alternatively, several brokers provide facilitated IPO access — you apply through your brokerage platform.",
              },
              {
                step: "3",
                title: "Wait for Allocation",
                desc: "If the IPO is oversubscribed (more applications than shares available), a scale-back applies — you receive fewer shares than you applied for. Under-subscribed IPOs allocate all applicants in full but may be a warning sign.",
              },
              {
                step: "4",
                title: "Shares List on ASX",
                desc: "On listing day, shares begin trading at market price. The opening price may be above (in-demand IPO) or below (disappointing float) the offer price. Your broker will show the position in your account.",
              },
            ].map((s) => (
              <div key={s.step} className="bg-white border border-slate-200 rounded-xl p-5 flex items-start gap-4">
                <span className="w-9 h-9 rounded-full bg-amber-500 text-slate-900 font-extrabold text-sm flex items-center justify-center shrink-0">
                  {s.step}
                </span>
                <div>
                  <p className="font-bold text-slate-900">{s.title}</p>
                  <p className="text-sm text-slate-500 mt-1 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <h3 className="font-bold text-slate-900 mb-4">Brokers That Handle IPO Applications</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { name: "CommSec", detail: "Largest retail broker; CBA-owned; facilitates many IPOs" },
              { name: "Bell Direct", detail: "Active IPO facilitation; research provided" },
              { name: "NAB Trade", detail: "NAB online broker; IPO access via platform" },
              { name: "Selfwealth", detail: "Flat-fee broker; some IPO facilitation" },
              { name: "CMC Markets", detail: "Online broker with IPO access for eligible clients" },
              { name: "Morgans / Shaw", detail: "Full-service brokers; strong IPO allocation access" },
            ].map((b) => (
              <div key={b.name} className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                <p className="font-bold text-slate-900 text-sm">{b.name}</p>
                <p className="text-xs text-slate-500 mt-1">{b.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Upcoming IPOs table */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">IPO Pipeline</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Upcoming ASX Listings</h2>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <p className="text-sm text-amber-900 font-semibold">
              Note: IPO pipelines change daily. Check the <a href="https://www2.asx.com.au/listings/upcoming-listings" className="underline hover:text-amber-700" target="_blank" rel="noopener noreferrer">ASX Upcoming Listings page</a>, your broker&apos;s IPO calendar, or IPO Monitor for the current pipeline. The table below is illustrative.
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 mb-4">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left py-3 px-4 font-semibold text-slate-700 border-b border-slate-200">Company</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700 border-b border-slate-200">Sector</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700 border-b border-slate-200">Offer Price</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700 border-b border-slate-200">Raising</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700 border-b border-slate-200">Expected Listing</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={5} className="py-8 px-4 text-center text-slate-400 text-sm">
                    Check ASX.com.au for current upcoming listings — this data changes daily
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400">
            Source: <a href="https://www2.asx.com.au/listings/upcoming-listings" className="underline hover:text-slate-600" target="_blank" rel="noopener noreferrer">ASX Upcoming Listings</a> — always verify directly with the company prospectus and ASX announcements.
          </p>
        </div>
      </section>

      {/* Recent IPOs */}
      <section className="py-14 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Recent Activity</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Recent Notable ASX Listings (2025–{CURRENT_YEAR})</h2>
          <p className="text-slate-500 text-sm mb-6">
            A selection of notable recent ASX listings across sectors. Always verify current status on ASX.
          </p>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left py-3 px-4 font-semibold text-slate-700 border-b border-slate-200">Company</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700 border-b border-slate-200">Sector</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700 border-b border-slate-200">ASX Code</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700 border-b border-slate-200">Offer Price</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700 border-b border-slate-200">Notes</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { company: "[Check ASX for 2025–2026 listings]", sector: "Technology", code: "—", offer: "—", note: "Verify via ASX announcements" },
                  { company: "[Check ASX for 2025–2026 listings]", sector: "Mining", code: "—", offer: "—", note: "Verify via ASX announcements" },
                  { company: "[Check ASX for 2025–2026 listings]", sector: "Healthcare", code: "—", offer: "—", note: "Verify via ASX announcements" },
                  { company: "[Check ASX for 2025–2026 listings]", sector: "Real Estate / REIT", code: "—", offer: "—", note: "Verify via ASX announcements" },
                ].map((r, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                    <td className="py-3 px-4 text-slate-700 border-b border-slate-100">{r.company}</td>
                    <td className="py-3 px-4 text-slate-500 border-b border-slate-100">{r.sector}</td>
                    <td className="py-3 px-4 font-bold text-amber-700 border-b border-slate-100">{r.code}</td>
                    <td className="py-3 px-4 text-slate-700 border-b border-slate-100">{r.offer}</td>
                    <td className="py-3 px-4 text-slate-400 text-xs border-b border-slate-100">{r.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* IPO performance stats */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 2</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">IPO Performance &amp; Statistics</h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { value: "~10–15%", label: "Average first-day ASX IPO return (historical)" },
              { value: "High", label: "Variance — many IPOs underperform offer price" },
              { value: "6–12 mo", label: "Typical founder/PE lock-up period post-listing" },
              { value: "100–200", label: "New ASX listings per year (typical)" },
            ].map((s) => (
              <div key={s.label} className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center">
                <p className="text-xl font-extrabold text-amber-600">{s.value}</p>
                <p className="text-xs text-slate-600 mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="prose prose-slate max-w-none">
            <h3>IPO Sector Breakdown</h3>
            <p>Australian IPO activity is concentrated in three sectors:</p>
            <ul>
              <li>
                <strong>Mining and resources IPOs</strong> — by far the largest number of new listings; junior explorers, development projects, commodity-specific vehicles. High risk; many fail to produce returns for retail investors.
              </li>
              <li>
                <strong>Technology IPOs</strong> — SaaS, fintech, healthtech. Often unprofitable at listing; valued on revenue multiples. High potential but significant dilution risk.
              </li>
              <li>
                <strong>Property trust IPOs (REITs/LPTs)</strong> — yield-focused; typically lower risk; income distributions begin shortly after listing. Popular with income investors and SMSFs.
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Risks */}
      <section className="py-14 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 3</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">IPO Risks — What Every Investor Must Know</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                risk: "Limited Trading History",
                desc: "IPO companies have no listed track record. Financial projections in prospectuses are forecasts, not guarantees, and are not required to be independently verified.",
              },
              {
                risk: "Scale-Back",
                desc: "In oversubscribed IPOs you receive fewer shares than applied for. You must ensure you have funds for the full application amount, even though your actual allocation may be much smaller.",
              },
              {
                risk: "Lock-Up Expiry",
                desc: "Founders and pre-IPO shareholders typically face a 6–12 month lock-up after listing. When lock-ups expire, insider selling can put downward pressure on the share price.",
              },
              {
                risk: "Pricing Risk",
                desc: "Underwriters set the offer price. In a hot market, IPOs may be priced too high, and the stock falls below offer price on Day 1 and beyond. Do independent analysis.",
              },
              {
                risk: "Liquidity Post-Listing",
                desc: "Small ASX IPOs often have thin trading volumes. Selling a large position may be difficult without impacting the price significantly.",
              },
              {
                risk: "Use of Funds",
                desc: "The prospectus must disclose how IPO proceeds will be used. Watch for companies raising mostly to pay out existing investors rather than fund growth.",
              },
            ].map((r) => (
              <div key={r.risk} className="bg-white border border-slate-200 rounded-xl p-5">
                <p className="font-bold text-slate-900 mb-1">{r.risk}</p>
                <p className="text-sm text-slate-500 leading-relaxed">{r.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How to find IPOs */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 4</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">How to Find Upcoming IPOs</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                source: "ASX Upcoming Listings",
                url: "https://www2.asx.com.au/listings/upcoming-listings",
                desc: "Official ASX pipeline of prospectus lodgements and upcoming listing dates. Updated daily.",
              },
              {
                source: "Broker Research Portals",
                url: null,
                desc: "CommSec, Bell Direct, Morgans, and Shaw and Partners all publish IPO research and offer facilitation for clients.",
              },
              {
                source: "Intelligent Investor",
                url: "https://www.intelligentinvestor.com.au",
                desc: "Independent analysis of ASX IPOs — whether to apply, avoid, or wait for secondary market buying opportunities.",
              },
              {
                source: "IPO Monitor (Australia)",
                url: "https://www.ipomonitor.com.au",
                desc: "Dedicated ASX IPO tracking site with pipeline, statistics, and historic performance data.",
              },
            ].map((s) => (
              <div key={s.source} className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                <p className="font-bold text-slate-900">{s.source}</p>
                <p className="text-sm text-slate-500 mt-1 leading-relaxed">{s.desc}</p>
                {s.url && (
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-amber-600 font-semibold mt-2 inline-flex items-center gap-1 hover:text-amber-700"
                  >
                    Visit &rarr;
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Foreign investors */}
      <section className="py-14 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 5</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">Foreign Investors &amp; ASX IPOs</h2>

          <div className="prose prose-slate max-w-none">
            <p>
              Foreign investors can generally participate in ASX IPOs — share purchases do not require FIRB approval (FIRB applies to acquisitions of control, not portfolio investments). Key considerations for overseas investors:
            </p>
            <ul>
              <li><strong>Non-resident broker account</strong> — open an account with an ASX broker that accepts overseas clients (Interactive Brokers, CMC Markets, and several others accept international clients)</li>
              <li><strong>Prospectus restrictions</strong> — some IPO prospectuses state they are &quot;not available to persons outside Australia and New Zealand&quot;. In that case, overseas applicants cannot participate. This varies by offering.</li>
              <li><strong>Withholding tax on dividends</strong> — post-listing dividends are subject to 30% withholding (or lower DTA rate)</li>
              <li><strong>FIRB not required</strong> — for portfolio acquisitions of less than 20% of a company&apos;s voting shares. Acquisions above threshold thresholds in sensitive sectors require FIRB review.</li>
              <li><strong>Currency</strong> — all ASX transactions are in AUD; foreign investors take AUD/home-currency exchange rate risk</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Advisor CTA */}
      <section className="py-14 bg-white">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-xl p-8 flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-slate-900 mb-1">Need Guidance on ASX IPO Investing?</h2>
              <p className="text-sm text-slate-500">
                A financial adviser can help you evaluate IPO prospectuses, determine appropriate position sizes, and integrate new listings into your broader investment strategy.
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
