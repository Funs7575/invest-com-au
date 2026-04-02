import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, SITE_NAME, CURRENT_YEAR } from "@/lib/seo";

export const metadata: Metadata = {
  title: `Private Equity & Hedge Fund Investment in Australia (${CURRENT_YEAR})`,
  description:
    "How Australians and foreign investors access private equity and hedge funds — wholesale investor routes, ASX-listed PE, SIV complying funds, returns, and tax treatment.",
  alternates: { canonical: `${SITE_URL}/invest/private-equity` },
  openGraph: {
    title: `Private Equity & Hedge Fund Investment in Australia (${CURRENT_YEAR})`,
    description:
      "How Australians and foreign investors access private equity and hedge funds — wholesale investor routes, ASX-listed PE, SIV complying funds, returns, and tax treatment.",
    url: `${SITE_URL}/invest/private-equity`,
  },
};

export default function PrivateEquityPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: `${SITE_URL}/invest` },
    { name: "Private Equity & Hedge Funds" },
  ]);

  const webPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `Private Equity & Hedge Fund Investment in Australia (${CURRENT_YEAR})`,
    url: `${SITE_URL}/invest/private-equity`,
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
            <span className="text-slate-300">Private Equity &amp; Hedge Funds</span>
          </nav>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-xs font-semibold bg-amber-500 text-slate-900 px-3 py-1 rounded-full">
              Updated {CURRENT_YEAR}
            </span>
            <span className="text-xs font-semibold bg-slate-700 text-slate-200 px-3 py-1 rounded-full">
              Wholesale &amp; Retail Access
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-4 max-w-3xl">
            Private Equity &amp; Hedge Fund Investment in Australia
          </h1>
          <p className="text-lg text-slate-300 leading-relaxed max-w-2xl">
            Australia has a mature private equity sector managing over $40 billion and 170+ hedge funds overseeing ~$120 billion in assets. Here is how both domestic and international investors can access these markets.
          </p>
        </div>
      </section>

      {/* Key stats */}
      <section className="py-10 bg-white border-b border-slate-100">
        <div className="container-custom">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { value: "$40B+", label: "Australian PE assets under management" },
              { value: "170+", label: "Hedge funds operating in Australia" },
              { value: "~$120B", label: "Hedge fund AUM" },
              { value: "15–20%", label: "Historical PE p.a. returns" },
            ].map((s) => (
              <div key={s.label} className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center">
                <p className="text-2xl font-extrabold text-amber-600">{s.value}</p>
                <p className="text-xs text-slate-600 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 1: Introduction & Landscape */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <div className="mb-2">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 1</p>
            <h2 className="text-2xl font-extrabold text-slate-900 mb-4">Introduction &amp; Australian PE Landscape</h2>
          </div>

          <div className="prose prose-slate max-w-none">
            <p>
              Private equity (PE) involves investing in private companies — not listed on a public exchange — in exchange for equity ownership. Hedge funds pool capital from wholesale investors and deploy it across strategies including long/short equity, macro, arbitrage, and alternative credit. Both asset classes are typically restricted to <strong>wholesale (sophisticated) investors</strong> in Australia due to their complexity and risk profile.
            </p>

            <h3>Australian PE Landscape</h3>
            <p>
              The Australian PE industry is anchored by a handful of major domestic managers plus large international firms with local operations:
            </p>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { name: "Macquarie Capital", focus: "Infrastructure, energy, real assets", aum: "Global AUM $900B+" },
              { name: "Pacific Equity Partners (PEP)", focus: "Mid-market Australian buyouts", aum: "~$5B AUM" },
              { name: "BGH Capital", focus: "Large-cap Australian buyouts", aum: "Notable: Healthscope, Virgin Australia" },
              { name: "Archer Capital", focus: "Mid-market growth equity", aum: "Long-standing domestic manager" },
              { name: "Quadrant Private Equity", focus: "Lower mid-market businesses", aum: "$3B+ funds raised" },
              { name: "KKR, Carlyle, Bain Capital", focus: "Global PE with Australian offices", aum: "International mega-funds" },
            ].map((m) => (
              <div key={m.name} className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                <p className="font-bold text-slate-900">{m.name}</p>
                <p className="text-sm text-slate-500 mt-1">{m.focus}</p>
                <p className="text-xs text-amber-600 font-semibold mt-2">{m.aum}</p>
              </div>
            ))}
          </div>

          <div className="prose prose-slate max-w-none mt-8">
            <h3>The Hedge Fund Sector</h3>
            <p>
              Australia has over 170 hedge funds managing approximately $120 billion in assets. Key strategies include:
            </p>
            <ul>
              <li><strong>Long/short equity</strong> — the dominant strategy among Australian hedge funds</li>
              <li><strong>Global macro</strong> — exploiting interest rate and currency movements</li>
              <li><strong>Event-driven</strong> — mergers, restructurings, spin-offs</li>
              <li><strong>Quantitative/systematic</strong> — algorithm-driven strategy execution</li>
              <li><strong>Alternative credit</strong> — private debt and distressed investing</li>
            </ul>
            <p>
              Notable Australian hedge fund managers include Tribeca Investment Partners, Regal Funds Management, L1 Capital, and Allan Gray Australia.
            </p>
          </div>
        </div>
      </section>

      {/* Section 2: How to Access PE in Australia */}
      <section className="py-14 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 2</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">How to Access Private Equity in Australia</h2>

          <div className="space-y-6">
            {/* Wholesale investor route */}
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-3">1. Wholesale Investor Route (Direct PE)</h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                Most Australian PE and hedge funds are restricted to <strong>wholesale (sophisticated) investors</strong> under the Corporations Act. To qualify you must meet one of:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { test: "Asset test", detail: "Net assets of $2.5M or more (excluding principal residence in some cases)" },
                  { test: "Income test", detail: "Gross income of $250,000+ p.a. for each of the last 2 financial years" },
                  { test: "Qualified accountant certificate", detail: "Certified by a qualified accountant confirming wholesale status" },
                  { test: "Professional investor", detail: "AFSL holder, APRA-regulated entity, or body corporate with $10M+ in assets" },
                ].map((t) => (
                  <div key={t.test} className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                    <p className="text-sm font-bold text-amber-800">{t.test}</p>
                    <p className="text-xs text-slate-600 mt-1">{t.detail}</p>
                  </div>
                ))}
              </div>
              <p className="text-sm text-slate-500 mt-4">
                Minimum investment for direct PE funds is typically <strong>$250,000 to $2,000,000</strong>. Lock-up periods of 7–10 years are standard.
              </p>
            </div>

            {/* ASX-listed PE */}
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-3">2. ASX-Listed PE Vehicles (~$10K minimum)</h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                Retail investors can access PE-style returns through listed investment companies (LICs) and ASX-listed funds. These provide liquidity and lower minimums:
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">ASX Code</th>
                      <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">Name</th>
                      <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">Strategy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { code: "VGI", name: "VGI Partners Global Investments", strategy: "Global long/short equity" },
                      { code: "WAX / WAM", name: "WAM Alternatives / WAM Capital", strategy: "Alternative assets, long/short" },
                      { code: "PGF", name: "Pengana International Equities", strategy: "Global equities with alternatives tilt" },
                      { code: "PE1", name: "Pengana Private Equity Trust", strategy: "Global PE fund-of-funds" },
                      { code: "RF1", name: "Regal Investment Fund", strategy: "Multi-strategy alternative" },
                    ].map((r, i) => (
                      <tr key={r.code} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                        <td className="py-2.5 px-3 font-bold text-amber-700 border-b border-slate-100">{r.code}</td>
                        <td className="py-2.5 px-3 text-slate-800 border-b border-slate-100">{r.name}</td>
                        <td className="py-2.5 px-3 text-slate-500 border-b border-slate-100">{r.strategy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Fund of funds */}
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-3">3. Fund-of-Funds</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Fund-of-funds invest across multiple PE or hedge fund managers, providing diversification. They typically have lower minimums than direct PE access ($100K–$500K) but add an additional management fee layer. Suitable for wholesale investors wanting PE exposure across multiple managers without selecting individual funds.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: SIV Complying Funds */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 3</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">SIV Complying PE &amp; VC Funds</h2>
          <p className="text-slate-600 leading-relaxed mb-6">
            The Significant Investor Visa (Subclass 188/888) requires AUD $5 million invested in complying investments. At least $1 million must be invested in <strong>eligible Australian venture capital or private equity funds</strong> managed by ESVCLP (Early Stage Venture Capital Limited Partnerships) or VCMP (Venture Capital Management Partners) registered managers.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {[
              { label: "Minimum SIV PE/VC allocation", value: "$1M", sub: "Of the $5M total SIV requirement" },
              { label: "Emerging company allocation", value: "$500K", sub: "Into emerging/growth companies" },
              { label: "Balanced investment allocation", value: "$3.5M+", sub: "Into managed funds or bonds" },
            ].map((s) => (
              <div key={s.label} className="bg-amber-50 border border-amber-100 rounded-xl p-5 text-center">
                <p className="text-2xl font-extrabold text-amber-600">{s.value}</p>
                <p className="text-sm font-semibold text-slate-800 mt-1">{s.label}</p>
                <p className="text-xs text-slate-500 mt-1">{s.sub}</p>
              </div>
            ))}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
            <h3 className="font-bold text-slate-900 mb-2">Finding SIV-Complying Funds</h3>
            <p className="text-sm text-slate-600 leading-relaxed mb-4">
              The ATO maintains a register of ESVCLP-registered managers. Investment managers offering SIV-complying PE and VC funds include specialist boutiques managing allocations specifically structured to meet SIV requirements. A migration agent and financial adviser experienced in SIV structuring is essential.
            </p>
            <Link
              href="/invest/funds"
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors"
            >
              Browse SIV &amp; Investment Funds &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* Section 4: Risk & Return */}
      <section className="py-14 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 4</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Risk &amp; Return Profile</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="font-bold text-slate-900 mb-4">Private Equity</h3>
              <dl className="space-y-3">
                {[
                  { dt: "Historical returns (Australia)", dd: "15–20% p.a. (illiquidity premium over public equity)" },
                  { dt: "Typical lock-up", dd: "7–10 years; quarterly distributions once operational" },
                  { dt: "Leverage", dd: "2–5x EBITDA typical in buyout funds" },
                  { dt: "Valuation transparency", dd: "Quarterly — based on independent valuation or comparables" },
                  { dt: "Minimum (direct)", dd: "$250,000 – $2,000,000" },
                ].map((item) => (
                  <div key={item.dt} className="flex justify-between gap-3 py-2 border-b border-slate-100 last:border-0">
                    <dt className="text-sm text-slate-500 shrink-0">{item.dt}</dt>
                    <dd className="text-sm font-semibold text-slate-800 text-right">{item.dd}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="font-bold text-slate-900 mb-4">Hedge Funds</h3>
              <dl className="space-y-3">
                {[
                  { dt: "Historical returns (Australia)", dd: "8–12% p.a. (strategy-dependent)" },
                  { dt: "Liquidity", dd: "Monthly to quarterly redemptions (varies by fund)" },
                  { dt: "Fees", dd: "1–2% management + 20% performance fees typical (\"2 and 20\")" },
                  { dt: "Correlation to equity", dd: "Low to moderate; provides portfolio diversification" },
                  { dt: "Minimum", dd: "$100,000 – $1,000,000 (wholesale only)" },
                ].map((item) => (
                  <div key={item.dt} className="flex justify-between gap-3 py-2 border-b border-slate-100 last:border-0">
                    <dt className="text-sm text-slate-500 shrink-0">{item.dt}</dt>
                    <dd className="text-sm font-semibold text-slate-800 text-right">{item.dd}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-xl p-5">
            <h3 className="font-bold text-red-800 mb-2">Key Risks</h3>
            <ul className="text-sm text-red-700 space-y-1.5">
              <li><strong>Illiquidity</strong> — PE capital is locked up for 7–10 years; early exit is rarely possible</li>
              <li><strong>Leverage risk</strong> — PE buyouts are highly leveraged; rising rates compress valuations</li>
              <li><strong>Manager risk</strong> — returns vary dramatically between managers; top-quartile PE significantly outperforms median</li>
              <li><strong>Opacity</strong> — private companies have less disclosure than ASX-listed counterparts</li>
              <li><strong>High minimums</strong> — retail investors face significant access barriers</li>
              <li><strong>Regulatory complexity</strong> — wholesale investor tests, ASIC oversight of fund managers</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Section 5: Tax Treatment */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 5</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Tax Treatment — Domestic &amp; Foreign Investors</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="font-bold text-slate-900 mb-4">Australian Resident Investors</h3>
              <div className="prose prose-slate max-w-none prose-sm">
                <ul>
                  <li><strong>Capital gains</strong> — 50% CGT discount applies to PE returns held more than 12 months if distributed as capital gains</li>
                  <li><strong>Carried interest</strong> — PE fund managers&apos; carried interest (performance fees) treated as ordinary income or capital gains depending on structure; significant ATO scrutiny</li>
                  <li><strong>Trust structures</strong> — most PE funds operate as limited partnerships or unit trusts; income flows through to investors at their marginal rate</li>
                  <li><strong>SMSF</strong> — PE and hedge fund investments are permitted in SMSFs but must satisfy sole purpose test and valuation requirements</li>
                </ul>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="font-bold text-slate-900 mb-4">Non-Resident / Foreign Investors</h3>
              <div className="prose prose-slate max-w-none prose-sm">
                <ul>
                  <li><strong>FIRB</strong> — fund investments generally do not require FIRB approval (applies to direct business acquisitions, not fund interests)</li>
                  <li><strong>Withholding tax on interest</strong> — 10% (or applicable DTA rate)</li>
                  <li><strong>Withholding tax on dividends</strong> — 30% (reduced to 15% under most DTAs)</li>
                  <li><strong>Capital gains</strong> — non-residents not subject to Australian CGT on most portfolio investments (Taxable Australian Property rules apply if fund holds direct real property)</li>
                  <li><strong>Trust fund distributions</strong> — characterisation of distributions (income vs. capital) affects withholding tax</li>
                  <li><strong>DTA relief</strong> — Australia has DTAs with US, UK, Japan, China, and 40+ other countries</li>
                </ul>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-400 mt-4">
            Tax treatment is complex and fact-specific. Always obtain advice from an Australian tax adviser before investing.
          </p>
        </div>
      </section>

      {/* Find a Wealth Manager CTA */}
      <section className="py-14 bg-slate-50">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-xl p-8 flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-slate-900 mb-1">Find a Wealth Manager Specialising in PE</h2>
              <p className="text-sm text-slate-500">
                Access to quality PE and hedge fund managers typically requires a wealth manager or private bank. Connect with a verified Australian wealth manager to explore your options.
              </p>
            </div>
            <Link
              href="/advisors/wealth-managers"
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors shrink-0"
            >
              Find a Wealth Manager &rarr;
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
