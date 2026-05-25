import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, SITE_NAME, CURRENT_YEAR } from "@/lib/seo";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Investing in Australian Bonds & Fixed Income (${CURRENT_YEAR})`,
  description:
    "Complete guide to Australian fixed income: government bonds, bond ETFs, corporate bonds, hybrids, and private credit — for domestic and foreign investors including SMSFs.",
  alternates: { canonical: `${SITE_URL}/invest/bonds` },
  openGraph: {
    title: `Investing in Australian Bonds & Fixed Income (${CURRENT_YEAR})`,
    description:
      "Complete guide to Australian fixed income: government bonds, bond ETFs, corporate bonds, hybrids, and private credit — for domestic and foreign investors including SMSFs.",
    url: `${SITE_URL}/invest/bonds`,
  },
};

export default function BondsPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: `${SITE_URL}/invest` },
    { name: "Bonds & Fixed Income" },
  ]);

  const webPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `Investing in Australian Bonds & Fixed Income (${CURRENT_YEAR})`,
    url: `${SITE_URL}/invest/bonds`,
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
            <span className="text-slate-900 font-medium">Bonds &amp; Fixed Income</span>
          </nav>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-xs font-semibold bg-amber-500 text-slate-900 px-3 py-1 rounded-full">
              Updated {CURRENT_YEAR}
            </span>
            <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
              SMSF-Friendly
            </span>
            <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
              Foreign Investor Access
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-4 max-w-3xl text-slate-900">
            Investing in Australian Bonds &amp; Fixed Income
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed max-w-2xl">
            From Commonwealth Government Securities to private credit and hybrids — Australia&apos;s fixed income market offers diversification, income, and capital preservation across every risk level.
          </p>
        </div>
      </section>

      {/* Section 1: Overview */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 1</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">Overview of Australian Fixed Income</h2>

          <div className="prose prose-slate max-w-none">
            <p>
              Australia&apos;s fixed income market spans from risk-free Commonwealth Government Securities (CGS) at one end to high-yield private credit at the other. The total Australian bond market exceeds $3 trillion in outstanding issuance, making it one of the most liquid fixed income markets in the Asia-Pacific region.
            </p>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Government Bonds", detail: "Treasury Bonds, Indexed Bonds, Notes", risk: "Low", color: "bg-green-50 border-green-200" },
              { label: "Corporate Bonds", detail: "ASX-listed XTBs, private placements", risk: "Low–Medium", color: "bg-blue-50 border-blue-200" },
              { label: "Hybrid Securities", detail: "Bank AT1 capital instruments", risk: "Medium", color: "bg-amber-50 border-amber-200" },
              { label: "Private Credit", detail: "Direct lending, real estate debt", risk: "Medium–High", color: "bg-orange-50 border-orange-200" },
            ].map((c) => (
              <div key={c.label} className={`border rounded-xl p-4 ${c.color}`}>
                <p className="font-bold text-slate-900 text-sm">{c.label}</p>
                <p className="text-xs text-slate-600 mt-1">{c.detail}</p>
                <p className="text-xs font-semibold text-slate-500 mt-2">Risk: {c.risk}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 bg-amber-50 border border-amber-200 rounded-xl p-5">
            <h3 className="font-bold text-slate-900 mb-2">RBA &amp; the Yield Environment</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              The Reserve Bank of Australia (RBA) sets the cash rate which anchors the short end of the yield curve. Australian government bond yields are available in real time via the RBA website and the Australian Office of Financial Management (AOFM). Always check current yields before making fixed income allocations — rates change frequently.
            </p>
          </div>
        </div>
      </section>

      {/* Section 2: Government Bonds */}
      <section className="py-14 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 2</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Government Bonds — How to Buy</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {[
              {
                type: "Treasury Bonds (TBs)",
                detail: "Fixed coupon, semi-annual payments, 3–30 year maturities. The benchmark for Australian interest rates.",
              },
              {
                type: "Treasury Indexed Bonds (TIBs)",
                detail: "Capital value linked to CPI (inflation). Provide real return above inflation — valued by long-term investors.",
              },
              {
                type: "Treasury Notes",
                detail: "Short-term (< 1 year) discount securities. Used for government cash management. Lower retail relevance.",
              },
            ].map((b) => (
              <div key={b.type} className="bg-white border border-slate-200 rounded-xl p-5">
                <p className="font-bold text-slate-900 text-sm">{b.type}</p>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">{b.detail}</p>
              </div>
            ))}
          </div>

          <h3 className="font-bold text-slate-900 mb-4">Ways to Buy Australian Government Bonds</h3>
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-start gap-3">
                <span className="w-8 h-8 rounded-full bg-amber-500 text-slate-900 font-bold text-sm flex items-center justify-center shrink-0">1</span>
                <div>
                  <p className="font-bold text-slate-900">Direct via AOFM (retail investors)</p>
                  <p className="text-sm text-slate-500 mt-1">The Australian Government Bond Exchange allows retail investors to purchase Commonwealth Government Securities directly. Minimum investment is generally $1,000 with $1,000 increments.</p>
                </div>
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-start gap-3">
                <span className="w-8 h-8 rounded-full bg-amber-500 text-slate-900 font-bold text-sm flex items-center justify-center shrink-0">2</span>
                <div>
                  <p className="font-bold text-slate-900">ASX mFunds</p>
                  <p className="text-sm text-slate-500 mt-1">Bond-focused managed funds accessible through any ASX broker via the mFunds settlement service. No need for a separate platform — transact through your existing broker.</p>
                </div>
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-start gap-3">
                <span className="w-8 h-8 rounded-full bg-amber-500 text-slate-900 font-bold text-sm flex items-center justify-center shrink-0">3</span>
                <div>
                  <p className="font-bold text-slate-900">Bond ETFs (ASX-listed)</p>
                  <p className="text-sm text-slate-500 mt-1">The simplest and most cost-effective way for most investors. Buy and sell like shares with intraday liquidity. See the ETF comparison table below.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Bond ETF Comparison */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 3</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Bond ETF Comparison</h2>
          <p className="text-slate-500 text-sm mb-6">ASX-listed bond ETFs — buy through any broker. Data approximate; verify current fees and composition with the fund manager.</p>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left py-3 px-4 font-semibold text-slate-700 border-b border-slate-200">ASX Code</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700 border-b border-slate-200">Fund</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700 border-b border-slate-200">What it holds</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700 border-b border-slate-200">~MER p.a.</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700 border-b border-slate-200">Duration</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { code: "VAF", name: "Vanguard Australian Fixed Interest", holds: "Broad Australian investment-grade bonds", mer: "0.20%", dur: "~6–7 yrs" },
                  { code: "IAF", name: "iShares Core Composite Bond (AUD)", holds: "Australian composite incl. government + credit", mer: "0.15%", dur: "~5–7 yrs" },
                  { code: "AGVT", name: "BetaShares Aust. Government Bond", holds: "Commonwealth and state government bonds only", mer: "0.22%", dur: "~7–9 yrs" },
                  { code: "VBND", name: "Vanguard Global Aggregate Bond (AUD Hdg)", holds: "Global investment-grade bonds, AUD-hedged", mer: "0.20%", dur: "~7 yrs" },
                  { code: "AAA", name: "BetaShares Aust. High Interest Cash ETF", holds: "Bank deposit accounts (not bonds — ultra-short)", mer: "0.18%", dur: "< 1 day" },
                ].map((r, i) => (
                  <tr key={r.code} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                    <td className="py-3 px-4 font-bold text-amber-700 border-b border-slate-100">{r.code}</td>
                    <td className="py-3 px-4 text-slate-800 border-b border-slate-100">{r.name}</td>
                    <td className="py-3 px-4 text-slate-500 border-b border-slate-100">{r.holds}</td>
                    <td className="py-3 px-4 font-semibold text-slate-700 border-b border-slate-100">{r.mer}</td>
                    <td className="py-3 px-4 text-slate-500 border-b border-slate-100">{r.dur}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400 mt-3">
            MER = Management Expense Ratio. Verify current rates directly with fund managers. Past performance does not guarantee future returns.
          </p>
        </div>
      </section>

      {/* Section 4: Corporate Bonds & Hybrids */}
      <section className="py-14 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 4</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Corporate Bonds &amp; Hybrid Securities</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="font-bold text-slate-900 mb-3">XTBs — Exchange Traded Bonds</h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-3">
                Exchange Traded Bonds (XTBs) are ASX-listed instruments that give retail investors access to specific corporate bonds issued by major Australian companies. Each XTB tracks the cash flows of an underlying bond — coupon and principal — in a listed format accessible from $500.
              </p>
              <p className="text-sm text-slate-600 leading-relaxed">
                Available through ASX; issuers include major banks, utilities, and blue-chip corporates. Search ASX using code prefix &quot;XTB&quot; to see current offerings.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="font-bold text-slate-900 mb-3">Bank Hybrids (AT1 Capital)</h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-3">
                Australian major banks issue Additional Tier 1 (AT1) capital instruments listed on ASX — widely known as &quot;bank hybrids&quot;. These pay a floating rate margin above BBSW and are popular with SMSF investors seeking higher income than term deposits.
              </p>
              <div className="space-y-1.5">
                {[
                  "ANZ Capital Notes (ANZPE, ANZPF, ANZPG series)",
                  "CBA PERLS series (CBAPD, CBAPE, CBAPF)",
                  "NAB Capital Notes (NABPF, NABPG series)",
                  "Westpac Capital Notes (WBCPK, WBCPL)",
                ].map((h) => (
                  <p key={h} className="text-xs text-slate-600 bg-amber-50 rounded px-3 py-1.5">{h}</p>
                ))}
              </div>
              <p className="text-xs text-red-600 mt-3 font-medium">
                Risk note: Hybrids can be written off or converted to equity at the bank&apos;s or APRA&apos;s direction. Not equivalent to bonds.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 5: Private Credit */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 5</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">Private Credit — Australia&apos;s Fastest-Growing Asset Class</h2>
          <p className="text-slate-600 leading-relaxed mb-6">
            Private credit has grown dramatically in Australia as banks have retreated from certain lending segments. Direct lenders now provide construction finance, commercial real estate debt, corporate lending, and infrastructure debt — at yields considerably above government bonds.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {[
              {
                name: "La Trobe Financial",
                focus: "Residential and commercial mortgage lending",
                access: "Retail-accessible credit funds from $5,000",
              },
              {
                name: "Qualitas Real Estate Income Fund (QRI)",
                focus: "ASX-listed; commercial real estate debt",
                access: "Listed on ASX — buy like a share",
              },
              {
                name: "Metrics Credit Partners",
                focus: "ASX-listed; corporate lending",
                access: "Listed fund (MXT, MOT) from $500 via broker",
              },
              {
                name: "Pallas Capital",
                focus: "Commercial real estate construction finance",
                access: "Wholesale investors; typically $100K+ minimum",
              },
            ].map((m) => (
              <div key={m.name} className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                <p className="font-bold text-slate-900">{m.name}</p>
                <p className="text-sm text-slate-500 mt-1">{m.focus}</p>
                <p className="text-xs text-amber-700 font-semibold mt-2">{m.access}</p>
              </div>
            ))}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
            <p className="text-sm text-slate-700 leading-relaxed">
              <strong>Typical private credit yields:</strong> 7–11% p.a. depending on security type and borrower quality. Higher yields reflect illiquidity, credit risk, and structural complexity compared to government bonds. Private credit funds may have quarterly redemption queues.
            </p>
          </div>
        </div>
      </section>

      {/* Section 6: Foreign Investor Considerations */}
      <section className="py-14 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 6</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Foreign Investor Considerations</h2>

          <div className="prose prose-slate max-w-none">
            <p>
              Australian government bonds are popular AUD-denominated instruments with international investors, particularly from Asia and Europe seeking AAA-rated (Commonwealth) paper with above-average yields versus equivalents in other developed markets.
            </p>
            <ul>
              <li><strong>FIRB</strong> — not required for bond or ETF investments. FIRB applies to direct acquisitions of businesses and land, not portfolio securities.</li>
              <li><strong>Withholding tax on interest</strong> — 10% standard rate under Australian domestic law. Reduced to 0–10% under many Double Tax Agreements (DTAs). Many foreign holders of government bonds are exempt under portfolio interest provisions.</li>
              <li><strong>Currency risk</strong> — AUD bond returns are denominated in AUD; foreign investors bear AUD/home currency exchange rate risk. Currency hedging is available but adds cost.</li>
              <li><strong>Access routes</strong> — international investors can purchase Australian bond ETFs through a non-resident broker or international platforms offering ASX access (Interactive Brokers, etc.).</li>
              <li><strong>DTA countries</strong> — US, UK, Japan, China, Singapore, NZ and 40+ others may benefit from reduced withholding rates. Confirm applicable DTA with an Australian tax adviser.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Section 7: SMSF and Bonds */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 7</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">SMSFs &amp; Fixed Income</h2>

          <div className="prose prose-slate max-w-none">
            <p>
              Fixed income is essential for SMSF trustees seeking a diversified, income-generating portfolio — particularly as members approach retirement. Australian Superannuation guidelines recommend increasing defensive allocations (bonds, cash) as members near pension phase.
            </p>
            <h3>SMSF-appropriate fixed income investments</h3>
            <ul>
              <li><strong>Government bonds direct</strong> — highest quality, AOFM-issued, CGT-efficient at pension phase</li>
              <li><strong>Bond ETFs (VAF, IAF, AGVT)</strong> — diversified, liquid, low-cost; easily held in SMSF brokerage account</li>
              <li><strong>Bank hybrids</strong> — popular for income; requires careful risk assessment given write-off provisions</li>
              <li><strong>Private credit funds</strong> — allowed if properly valued; quarterly liquidity may suit SMSF accumulation phase</li>
              <li><strong>Term deposits</strong> — simple, covered by FCS up to $250K per institution; zero-fee</li>
            </ul>
            <p>
              SMSF trustees must ensure all investments are made on commercial terms, properly documented in the Investment Strategy, and consistent with the sole purpose test.
            </p>
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
              <h2 className="text-lg font-bold text-slate-900 mb-1">Speak with a Financial Planner about Fixed Income</h2>
              <p className="text-sm text-slate-500">
                Building a defensive allocation, managing SMSF fixed income, or structuring bond exposure for an overseas investor? Connect with a verified Australian financial planner.
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
