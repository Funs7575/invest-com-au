import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, SITE_NAME, CURRENT_YEAR } from "@/lib/seo";

export const metadata: Metadata = {
  title: `Hybrid Securities Australia — Bank Hybrids, Yields & Risks (${CURRENT_YEAR})`,
  description:
    "Guide to ASX-listed hybrid securities — CBAPD, NABPF, bank hybrids explained. How hybrids work, yields vs term deposits, risks, and SMSF suitability.",
  alternates: { canonical: `${SITE_URL}/invest/hybrid-securities` },
  openGraph: {
    title: `Hybrid Securities Australia — Bank Hybrids, Yields & Risks (${CURRENT_YEAR})`,
    description:
      "Guide to ASX-listed hybrid securities — CBAPD, NABPF, bank hybrids explained. How hybrids work, yields vs term deposits, risks, and SMSF suitability.",
    url: `${SITE_URL}/invest/hybrid-securities`,
  },
};

export default function HybridSecuritiesPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: `${SITE_URL}/invest` },
    { name: "Hybrid Securities" },
  ]);

  const webPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `Hybrid Securities Australia (${CURRENT_YEAR})`,
    url: `${SITE_URL}/invest/hybrid-securities`,
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
            <span className="text-slate-300">Hybrid Securities</span>
          </nav>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-xs font-semibold bg-amber-500 text-slate-900 px-3 py-1 rounded-full">
              Updated {CURRENT_YEAR}
            </span>
            <span className="text-xs font-semibold bg-slate-700 text-slate-200 px-3 py-1 rounded-full">
              Income &amp; SMSF Popular
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-4 max-w-3xl">
            Hybrid Securities in Australia
          </h1>
          <p className="text-lg text-slate-300 leading-relaxed max-w-2xl">
            ASX-listed hybrid securities from major banks offer yields above term deposits with franking credits. They are hugely popular with SMSF trustees and income-focused investors — but carry risks that many investors don&apos;t fully understand.
          </p>
        </div>
      </section>

      {/* Key stats */}
      <section className="py-10 bg-white border-b border-slate-100">
        <div className="container-custom">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { value: "$45B+", label: "Australian hybrid market outstanding" },
              { value: "5–7%", label: "Typical running yield (gross)" },
              { value: "Franked", label: "Most bank hybrids are fully franked" },
              { value: "$100", label: "Face value per hybrid (ASX traded)" },
            ].map((s) => (
              <div key={s.label} className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center">
                <p className="text-2xl font-extrabold text-amber-600">{s.value}</p>
                <p className="text-xs text-slate-600 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 1: What Are Hybrids */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 1</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">What Are Hybrid Securities?</h2>

          <div className="prose prose-slate max-w-none">
            <p>
              Hybrids are securities that sit between debt (bonds) and equity (shares) in a company&apos;s capital structure. In Australia, bank hybrids — also called Additional Tier 1 (AT1) capital notes — are the most common type. They pay regular floating-rate distributions (usually quarterly), are typically franked, and have a defined call date when the issuer expects to redeem them.
            </p>
            <h3>How Bank Hybrids Work</h3>
            <ul>
              <li><strong>Issue price</strong> — $100 face value; traded on ASX like shares</li>
              <li><strong>Distribution</strong> — floating rate = Bank Bill Swap Rate (BBSW) + a fixed margin (e.g., 2.50–3.50%)</li>
              <li><strong>Franking</strong> — most major bank hybrids are fully franked (30% imputation credit)</li>
              <li><strong>Call date</strong> — issuer can (and typically does) redeem at face value on a specified date (usually 5–8 years after issue)</li>
              <li><strong>Mandatory conversion</strong> — if not called, converts to ordinary shares at a discount to market price</li>
              <li><strong>Loss absorption</strong> — can be written off or converted to equity if the bank&apos;s capital ratio falls below a trigger (CET1 &lt; 5.125%)</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Section 2: Current Hybrids */}
      <section className="py-14 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 2</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Major ASX-Listed Hybrids</h2>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">Code</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">Issuer</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">Margin</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">Franking</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">Call Date</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { code: "CBAPK", issuer: "Commonwealth Bank", margin: "BBSW + 2.75%", franking: "100%", call: "2029" },
                  { code: "NABPH", issuer: "National Australia Bank", margin: "BBSW + 2.95%", franking: "100%", call: "2028" },
                  { code: "WBCPM", issuer: "Westpac", margin: "BBSW + 2.80%", franking: "100%", call: "2029" },
                  { code: "ANZPJ", issuer: "ANZ Group", margin: "BBSW + 2.85%", franking: "100%", call: "2028" },
                  { code: "MQGPE", issuer: "Macquarie Group", margin: "BBSW + 3.30%", franking: "100%", call: "2029" },
                  { code: "SUNPI", issuer: "Suncorp", margin: "BBSW + 3.10%", franking: "100%", call: "2028" },
                  { code: "BENPH", issuer: "Bendigo & Adelaide Bank", margin: "BBSW + 3.40%", franking: "100%", call: "2029" },
                ].map((r, i) => (
                  <tr key={r.code} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                    <td className="py-2.5 px-3 font-bold text-amber-700 border-b border-slate-100">{r.code}</td>
                    <td className="py-2.5 px-3 text-slate-800 border-b border-slate-100">{r.issuer}</td>
                    <td className="py-2.5 px-3 text-slate-800 border-b border-slate-100">{r.margin}</td>
                    <td className="py-2.5 px-3 text-slate-500 border-b border-slate-100">{r.franking}</td>
                    <td className="py-2.5 px-3 text-slate-500 border-b border-slate-100">{r.call}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400 mt-3">
            Codes, margins, and call dates are indicative. New hybrids are issued regularly and older series are called. Always check current ASX listings.
          </p>
        </div>
      </section>

      {/* Section 3: Hybrids vs Alternatives */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 3</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Hybrids vs Term Deposits vs Bonds vs Shares</h2>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">Feature</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">Term Deposit</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">Govt Bond</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">Bank Hybrid</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">Bank Share</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: "Yield", td: "4–5%", bond: "4–4.5%", hybrid: "5–7% (gross)", share: "4–6% (gross)" },
                  { feature: "Franking", td: "No", bond: "No", hybrid: "Yes (most)", share: "Yes" },
                  { feature: "Capital risk", td: "None (ADI guarantee)", bond: "Very low", hybrid: "Moderate", share: "High" },
                  { feature: "Liquidity", td: "Locked (penalty for early break)", bond: "Moderate", hybrid: "High (ASX traded)", share: "High" },
                  { feature: "Seniority (bank failure)", td: "Senior (guaranteed to $250K)", bond: "Senior unsecured", hybrid: "Subordinated (AT1)", share: "Equity (last)" },
                  { feature: "Capital growth", td: "None", bond: "Limited", hybrid: "Limited (trades near $100)", share: "Significant potential" },
                ].map((r, i) => (
                  <tr key={r.feature} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                    <td className="py-2.5 px-3 font-bold text-slate-900 border-b border-slate-100">{r.feature}</td>
                    <td className="py-2.5 px-3 text-slate-800 border-b border-slate-100">{r.td}</td>
                    <td className="py-2.5 px-3 text-slate-800 border-b border-slate-100">{r.bond}</td>
                    <td className="py-2.5 px-3 font-semibold text-amber-700 border-b border-slate-100">{r.hybrid}</td>
                    <td className="py-2.5 px-3 text-slate-800 border-b border-slate-100">{r.share}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Section 4: SMSF */}
      <section className="py-14 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 4</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">Hybrids in an SMSF</h2>

          <div className="prose prose-slate max-w-none">
            <p>
              Hybrids are one of the most popular income investments for SMSF trustees due to their combination of regular distributions, franking credits, and perceived safety (bank-issued).
            </p>
            <ul>
              <li><strong>Accumulation phase</strong> — distributions taxed at 15%, but franking credits (30%) create a net tax refund</li>
              <li><strong>Pension phase</strong> — distributions tax-free; full franking credit cash refund from ATO</li>
              <li><strong>Grossed-up yield</strong> — a 6% cash yield + franking effectively delivers ~8.6% gross in pension phase</li>
              <li><strong>Permitted investment</strong> — hybrids are straightforward to hold in an SMSF via any broker</li>
            </ul>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mt-6">
            <h3 className="font-bold text-slate-900 mb-2">APRA Phase-Out Warning</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              APRA announced in late 2024 that AT1 hybrid instruments will be phased out as a form of bank regulatory capital, following similar moves by international regulators after the Credit Suisse AT1 write-down. Existing hybrids will be called at their scheduled dates and not replaced with new AT1 issuances. Banks will instead use Tier 2 subordinated bonds (which are not franked). This is a major change for income-focused investors — plan accordingly.
            </p>
          </div>
        </div>
      </section>

      {/* Risk */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <div className="bg-red-50 border border-red-200 rounded-xl p-5">
            <h3 className="font-bold text-red-800 mb-2">Key Risks</h3>
            <ul className="text-sm text-red-700 space-y-1.5">
              <li><strong>Loss absorption / write-down</strong> — if the bank&apos;s CET1 ratio falls below 5.125%, hybrids can be written off entirely (you lose 100% of your investment)</li>
              <li><strong>Non-payment of distributions</strong> — distributions are discretionary; the bank can skip payments without default</li>
              <li><strong>Extension risk</strong> — if the issuer chooses not to call, hybrids extend to mandatory conversion (potentially at disadvantageous prices)</li>
              <li><strong>Market price volatility</strong> — while they trade near $100 in calm markets, hybrids can fall significantly in credit stress events (COVID crash: 15–25% drop)</li>
              <li><strong>Complexity</strong> — hybrid terms run to 80+ pages; many retail investors don&apos;t fully understand the risks</li>
              <li><strong>APRA phase-out</strong> — AT1 hybrids will be phased out; existing securities will be called but not replaced</li>
            </ul>
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
              <h2 className="text-lg font-bold text-slate-900 mb-1">Get Income Strategy Advice</h2>
              <p className="text-sm text-slate-500">
                With the APRA hybrid phase-out ahead, now is the time to review your income allocations with a financial planner.
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
