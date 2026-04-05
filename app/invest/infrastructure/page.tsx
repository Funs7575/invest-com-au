import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, SITE_NAME, CURRENT_YEAR } from "@/lib/seo";
import ContextualLeadMagnet from "@/components/ContextualLeadMagnet";

export const metadata: Metadata = {
  title: `Infrastructure Investment Australia — Funds, ASX Stocks & Unlisted (${CURRENT_YEAR})`,
  description:
    "How to invest in infrastructure from Australia — toll roads, airports, utilities, ports. Transurban, APA Group, Atlas Arteria, Magellan Infrastructure Fund and unlisted options.",
  alternates: { canonical: `${SITE_URL}/invest/infrastructure` },
  openGraph: {
    title: `Infrastructure Investment Australia — Funds, ASX Stocks & Unlisted (${CURRENT_YEAR})`,
    description:
      "How to invest in infrastructure from Australia — toll roads, airports, utilities, ports. Transurban, APA Group, Atlas Arteria, Magellan Infrastructure Fund and unlisted options.",
    url: `${SITE_URL}/invest/infrastructure`,
  },
};

export default function InfrastructurePage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: `${SITE_URL}/invest` },
    { name: "Infrastructure" },
  ]);

  const webPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `Infrastructure Investment Australia (${CURRENT_YEAR})`,
    url: `${SITE_URL}/invest/infrastructure`,
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      { "@type": "Question", name: "What is infrastructure investment?", acceptedAnswer: { "@type": "Answer", text: "Infrastructure investment involves owning assets that provide essential services — toll roads, airports, ports, electricity networks, gas pipelines, water utilities, and telecommunications towers. These assets generate stable, long-duration cash flows often linked to inflation, making them attractive for income-focused investors and a core allocation in institutional portfolios." } },
      { "@type": "Question", name: "How do I invest in infrastructure from Australia?", acceptedAnswer: { "@type": "Answer", text: "The easiest route is ASX-listed infrastructure stocks like Transurban (TCL) and APA Group (APA). Infrastructure ETFs like MICH (Magellan, 0.96% MER) and IFRA (VanEck, 0.52% MER) provide diversified global exposure. Unlisted infrastructure funds from managers like IFM Investors and Palisade are accessible through super funds or as wholesale investments." } },
      { "@type": "Question", name: "Is Transurban a good infrastructure investment?", acceptedAnswer: { "@type": "Answer", text: "Transurban (TCL) is the largest ASX-listed infrastructure stock with a $45B+ market cap, operating toll roads in Melbourne, Sydney, and Brisbane. It offers CPI-linked toll escalation providing inflation protection, and yields approximately 4%. However, it carries significant debt, is sensitive to interest rates, and traffic volumes can be affected by economic cycles and remote work trends." } },
      { "@type": "Question", name: "What infrastructure ETF options are available on the ASX?", acceptedAnswer: { "@type": "Answer", text: "MICH (Magellan Infrastructure Fund, 0.96% MER) is an actively managed global infrastructure ETF covering toll roads, airports, utilities, and pipelines, hedged to AUD. IFRA (VanEck FTSE Global Infrastructure, 0.52% MER) offers passive global infrastructure exposure at a lower cost. Both provide diversified access to infrastructure assets worldwide that are not available on the ASX." } },
      { "@type": "Question", name: "Why do super funds invest so heavily in infrastructure?", acceptedAnswer: { "@type": "Answer", text: "Super funds allocate 5-15% to infrastructure because it offers stable, inflation-linked cash flows that match their long-duration liabilities (paying pensions over decades). Infrastructure assets have low correlation to listed equities, providing diversification. IFM Investors, owned by industry super funds, manages $48B+ in infrastructure and has delivered 8-10% long-term returns." } },
      { "@type": "Question", name: "What returns do toll road investments generate?", acceptedAnswer: { "@type": "Answer", text: "Listed toll road operators like Transurban (TCL) and Atlas Arteria (ALX) typically yield 4-5% in distributions plus capital growth driven by traffic volume increases and toll escalation. Total returns have historically been 7-10% p.a. Toll escalation is often CPI-linked or fixed at 4%+ p.a., providing built-in inflation protection that few other asset classes offer." } },
      { "@type": "Question", name: "What is the difference between listed and unlisted infrastructure?", acceptedAnswer: { "@type": "Answer", text: "Listed infrastructure (Transurban, APA Group) trades on the ASX with daily liquidity and price transparency, but is subject to share market volatility. Unlisted infrastructure (IFM Investors, Palisade) is valued quarterly with less volatility but limited liquidity and typically requires wholesale investor status ($500K+ minimum). Several major ASX infrastructure assets have recently been taken private." } },
      { "@type": "Question", name: "How do interest rates affect infrastructure investments?", acceptedAnswer: { "@type": "Answer", text: "Infrastructure stocks are highly interest rate sensitive. Rising rates increase borrowing costs (most infrastructure assets carry significant debt), reduce the present value of long-duration cash flows, and make distribution yields less attractive relative to bonds. Conversely, falling rates tend to boost infrastructure valuations. However, CPI-linked revenues provide some offset during inflationary periods." } },
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
            <span className="text-slate-300">Infrastructure</span>
          </nav>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-xs font-semibold bg-amber-500 text-slate-900 px-3 py-1 rounded-full">
              Updated {CURRENT_YEAR}
            </span>
            <span className="text-xs font-semibold bg-slate-700 text-slate-200 px-3 py-1 rounded-full">
              Toll Roads &middot; Airports &middot; Utilities &middot; Ports
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-4 max-w-3xl">
            Infrastructure Investment in Australia
          </h1>
          <p className="text-lg text-slate-300 leading-relaxed max-w-2xl">
            Infrastructure assets — toll roads, airports, utilities, and ports — offer stable, inflation-linked cash flows. They are a core allocation for Australian super funds and increasingly accessible to retail and foreign investors.
          </p>
        </div>
      </section>

      {/* Key stats */}
      <section className="py-10 bg-white border-b border-slate-100">
        <div className="container-custom">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { value: "$250B+", label: "Australian infrastructure pipeline (govt)" },
              { value: "7–10%", label: "Historical listed infra returns p.a." },
              { value: "4–6%", label: "Typical distribution yield" },
              { value: "CPI-linked", label: "Revenue often inflation-protected" },
            ].map((s) => (
              <div key={s.label} className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center">
                <p className="text-2xl font-extrabold text-amber-600">{s.value}</p>
                <p className="text-xs text-slate-600 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 1: Why Infrastructure */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 1</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">Why Invest in Infrastructure?</h2>

          <div className="prose prose-slate max-w-none">
            <p>
              Infrastructure assets provide essential services — transport, energy, water, telecommunications — that people and businesses depend on regardless of economic conditions. This creates predictable, long-duration cash flows that are often linked to inflation (CPI-indexed tolls, regulated utility tariffs).
            </p>
            <h3>Key Characteristics</h3>
            <ul>
              <li><strong>Inflation protection</strong> — revenues often contractually linked to CPI (e.g., Transurban toll escalation)</li>
              <li><strong>Predictable cash flows</strong> — long-term contracts, regulated returns, or monopoly-like positions</li>
              <li><strong>Low correlation to equities</strong> — provides portfolio diversification</li>
              <li><strong>Income focus</strong> — consistent distributions; attractive for SMSF pension-phase portfolios</li>
              <li><strong>Government pipeline</strong> — Australia has a $250B+ infrastructure investment pipeline providing ongoing opportunities</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Section 2: ASX-Listed Infrastructure */}
      <section className="py-14 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 2</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">ASX-Listed Infrastructure Stocks</h2>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">Code</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">Company</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">Infrastructure Type</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">Market Cap</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">Yield</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { code: "TCL", name: "Transurban Group", type: "Toll roads (Melbourne, Sydney, Brisbane)", cap: "$45B+", yield: "~4%" },
                  { code: "APA", name: "APA Group", type: "Gas pipelines & energy infrastructure", cap: "$12B+", yield: "~5.5%" },
                  { code: "ALX", name: "Atlas Arteria", type: "International toll roads (France, US)", cap: "$6B+", yield: "~4.5%" },
                  { code: "SKI", name: "Spark Infrastructure (acquired)", type: "Was electricity networks; taken private 2022", cap: "N/A", yield: "N/A" },
                  { code: "AST", name: "AusNet Services (acquired)", type: "Was electricity & gas distribution; taken private", cap: "N/A", yield: "N/A" },
                  { code: "SYD", name: "Sydney Airport (acquired)", type: "Taken private in 2022 by consortium", cap: "N/A", yield: "N/A" },
                  { code: "AIA", name: "Auckland International Airport", type: "Airport (ASX dual-listed)", cap: "$10B+", yield: "~2%" },
                  { code: "QUB", name: "Qube Holdings", type: "Ports, logistics, warehousing", cap: "$7B+", yield: "~2.5%" },
                ].map((r, i) => (
                  <tr key={r.code} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                    <td className="py-2.5 px-3 font-bold text-amber-700 border-b border-slate-100">{r.code}</td>
                    <td className="py-2.5 px-3 text-slate-800 border-b border-slate-100">{r.name}</td>
                    <td className="py-2.5 px-3 text-slate-500 border-b border-slate-100">{r.type}</td>
                    <td className="py-2.5 px-3 text-slate-800 border-b border-slate-100">{r.cap}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800 border-b border-slate-100">{r.yield}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mt-6">
            <h3 className="font-bold text-slate-900 mb-2">The Privatisation Trend</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Several major ASX-listed infrastructure assets (Sydney Airport, Spark Infrastructure, AusNet Services) have been taken private by institutional consortiums. This reduces retail access to listed infrastructure and has pushed investors toward infrastructure funds and ETFs.
            </p>
          </div>
        </div>
      </section>

      {/* Lead Magnet */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <ContextualLeadMagnet segment="fee-audit" />
        </div>
      </section>

      {/* Section 3: Infrastructure Funds & ETFs */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 3</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Infrastructure Funds &amp; ETFs</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { name: "Magellan Infrastructure Fund (MICH)", type: "ASX-listed ETF", desc: "Global listed infrastructure — toll roads, airports, utilities, pipelines. Hedged to AUD.", mer: "0.96% MER", yield: "~3.5% yield" },
              { name: "VanEck FTSE Global Infrastructure ETF (IFRA)", type: "ASX-listed ETF", desc: "Passive exposure to global infrastructure companies. Lower cost alternative to Magellan.", mer: "0.52% MER", yield: "~3% yield" },
              { name: "AMP Capital Infrastructure Debt Fund", type: "Unlisted fund", desc: "Senior secured infrastructure debt. Wholesale investors only ($500K minimum). Targets 4–5% above cash rate.", mer: "Wholesale only", yield: "~6–8% target" },
              { name: "IFM Investors (Industry Super)", type: "Via super funds", desc: "One of the world&apos;s largest infrastructure managers ($48B AUM). Retail access primarily through industry super funds (AustralianSuper, Cbus, HESTA).", mer: "Via super fund", yield: "~8–10% long-term" },
              { name: "Palisade Investment Partners", type: "Unlisted fund", desc: "Mid-market Australian infrastructure — social infrastructure, energy, transport. Wholesale investors.", mer: "Wholesale only", yield: "~8–10% target" },
              { name: "Morrison & Co", type: "Unlisted fund", desc: "Global infrastructure manager based in NZ/Australia. Specialises in regulated utilities and transport.", mer: "Wholesale only", yield: "~7–9% target" },
            ].map((f) => (
              <div key={f.name} className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold text-slate-900">{f.name}</p>
                  <span className="text-xs bg-amber-50 text-amber-700 font-semibold px-2 py-0.5 rounded shrink-0">{f.type}</span>
                </div>
                <p className="text-sm text-slate-500 mt-2">{f.desc}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{f.mer}</span>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{f.yield}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 4: SIV & Foreign Investors */}
      <section className="py-14 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 4</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">Infrastructure for Foreign &amp; SIV Investors</h2>

          <div className="prose prose-slate max-w-none">
            <p>
              Infrastructure is a core allocation for foreign institutional investors in Australia, and features in the SIV (Significant Investor Visa) complying investment framework.
            </p>
            <ul>
              <li><strong>SIV compliance</strong> — infrastructure funds can form part of the $3.5M &quot;balancing investment&quot; allocation for the SIV</li>
              <li><strong>FIRB</strong> — direct acquisition of critical infrastructure assets requires FIRB approval; fund investments are generally exempt</li>
              <li><strong>Withholding tax</strong> — MIT withholding tax of 15% (treaty countries) on fund distributions to non-residents</li>
              <li><strong>Institutional allocations</strong> — sovereign wealth funds (GIC, Abu Dhabi Investment Authority) and Canadian pension funds are major investors in Australian infrastructure</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Risk */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <div className="bg-red-50 border border-red-200 rounded-xl p-5">
            <h3 className="font-bold text-red-800 mb-2">Key Risks</h3>
            <ul className="text-sm text-red-700 space-y-1.5">
              <li><strong>Interest rate sensitivity</strong> — infrastructure stocks are highly rate-sensitive; rising rates reduce present value of long-duration cash flows</li>
              <li><strong>Regulatory risk</strong> — government can change tolling agreements, utility tariffs, and concession terms</li>
              <li><strong>Concentration risk</strong> — ASX infrastructure sector is heavily concentrated in Transurban and APA Group</li>
              <li><strong>Traffic/usage risk</strong> — toll road revenues depend on traffic volumes (impacted by pandemics, remote work, economic downturns)</li>
              <li><strong>Privatisation premium</strong> — institutional demand has pushed infrastructure valuations to significant premiums over comparable equity yields</li>
            </ul>
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

      {/* Related guides */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Related Guides</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Explore Related Investment Guides</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { title: "A-REITs", href: "/invest/reits", desc: "ASX-listed property trusts for diversified real estate exposure and income." },
              { title: "Private Credit & P2P Lending", href: "/invest/private-credit", desc: "Private credit funds and P2P platforms offering yields above term deposits." },
              { title: "Bonds & Fixed Income", href: "/invest/bonds", desc: "Government and corporate bonds for stable income and capital preservation." },
              { title: "SMSF Investment Guide", href: "/invest/smsf", desc: "What SMSFs actually invest in — property, shares, crypto and more." },
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
              <h2 className="text-lg font-bold text-slate-900 mb-1">Get Infrastructure Allocation Advice</h2>
              <p className="text-sm text-slate-500">
                A financial planner can help integrate infrastructure into your portfolio for income and inflation protection.
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
