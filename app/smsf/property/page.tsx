import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

const FAQS = [
  {
    q: "Can my SMSF buy my family home?",
    a: "No. An SMSF cannot buy a property from a related party for residential use. The sole purpose test requires the investment to benefit members in retirement, not provide current-day personal use. Residential property purchased by the SMSF must be leased to unrelated parties at arm's length and market rent.",
  },
  {
    q: "Can my business rent premises from my SMSF?",
    a: "Yes, this is one of the most tax-effective SMSF strategies available. An SMSF can acquire commercial property (including the business premises of a related-party entity) and lease it back at market rent under a formal lease agreement. The rent paid by the business is deductible; rental income received by the SMSF is taxed at 15% in accumulation (or 0% in pension phase).",
  },
  {
    q: "What balance do I need before buying property in an SMSF?",
    a: "The commonly-cited minimum is $300,000+, though $500,000+ makes the economics more compelling. Below $300k, setup costs and ongoing audit/compliance fees represent too large a proportion of returns. The ATO's own guidance notes that concentration risk (property as more than 50% of fund assets) also requires specific documentation in the investment strategy.",
  },
  {
    q: "What happens to SMSF property when I retire?",
    a: "As members transition from accumulation to pension phase, the fund's tax rate on income and capital gains drops to 0%. Ideally, property is sold or refinanced in pension phase to crystallize gains tax-free. Some trustees use a TTR pension to bridge this period. Careful planning is needed around segregated vs unsegregated fund accounting.",
  },
  {
    q: "Can an SMSF hold overseas property?",
    a: "Yes, but it is complex. Overseas property must satisfy the sole purpose test and the fund's investment strategy. Stamp duty, land tax, and income tax in the foreign jurisdiction apply. The fund may get a foreign income tax offset for tax paid overseas. Most SMSF auditors and lenders are not set up for foreign property — it is specialist territory.",
  },
  {
    q: "Is SMSF property still a good investment in 2026?",
    a: "The commercial/business premises strategy remains highly tax-effective for eligible small business owners. Pure residential property — bought just for yield — is harder to justify given LRBA rate premiums (typically 1.5–2% above standard investor rates), concentration risk, and liquidity constraints. The economics depend heavily on: rental yield, LRBA rate, fund balance, and tax phase (accumulation vs pension).",
  },
];

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `SMSF Property Investment ${CURRENT_YEAR}: Rules, Tax & Strategy | Invest.com.au`,
  description:
    "Complete guide to SMSF property investment. Residential vs commercial rules, CGT tax treatment, LRBA overview, costs, land tax and the $300k minimum balance.",
  alternates: { canonical: `${SITE_URL}/smsf/property` },
  openGraph: {
    title: `SMSF Property Investment ${CURRENT_YEAR}`,
    description: "Rules, CGT treatment, commercial lease-back strategy, LRBA overview, costs and land tax.",
    url: `${SITE_URL}/smsf/property`,
    type: "website",
  },
};

export default function SmsfPropertyPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "SMSF", url: absoluteUrl("/smsf") },
    { name: "Property Investment", url: absoluteUrl("/smsf/property") },
  ]);
  const faq = faqJsonLd(FAQS);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {faq && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }} />}
      <div className="bg-white min-h-screen">

        {/* Hero */}
        <section className="bg-slate-900 text-white py-10 md:py-14">
          <div className="container-custom">
            <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-5" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-white">Home</Link>
              <span className="text-slate-600">/</span>
              <Link href="/smsf" className="hover:text-white">SMSF</Link>
              <span className="text-slate-600">/</span>
              <span className="text-white font-medium">Property Investment</span>
            </nav>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-xs font-semibold bg-amber-500 text-slate-900 px-3 py-1 rounded-full">{UPDATED_LABEL}</span>
              <span className="text-xs font-semibold bg-blue-600 text-white px-3 py-1 rounded-full">Sole Purpose Test Applies</span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-3 max-w-3xl">
              SMSF Property Investment {CURRENT_YEAR}: Rules, Tax &amp; Strategy
            </h1>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-3xl">
              Direct residential and commercial property are both available to SMSFs — but the rules are tight, the lending market is specialist, and the break-even balance is higher than most trustees expect.
            </p>
          </div>
        </section>

        {/* Key Stats */}
        <section className="bg-white py-8 border-b border-slate-100">
          <div className="container-custom">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { v: "$300k+", l: "Minimum recommended balance", sub: "Before buying property in SMSF" },
                { v: "0%", l: "CGT in pension phase", sub: "vs 10% in accumulation (held 12m+)" },
                { v: "60–80%", l: "LVR on LRBA", sub: "Residential / commercial" },
                { v: "Market rent", l: "Related-party commercial leases", sub: "SMSF can lease to your business" },
              ].map((s) => (
                <div key={s.l} className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                  <div className="text-2xl font-extrabold text-slate-900">{s.v}</div>
                  <div className="text-xs font-bold text-slate-700 mt-0.5">{s.l}</div>
                  <div className="text-xs text-slate-500">{s.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* What an SMSF can hold */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">What property an SMSF can and cannot hold</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                <h3 className="font-extrabold text-emerald-900 mb-3">Allowed</h3>
                <ul className="space-y-2 text-sm text-slate-800">
                  <li className="flex gap-2"><span className="flex-shrink-0 text-emerald-600 font-bold">+</span>Residential investment property (arm&apos;s-length tenants only)</li>
                  <li className="flex gap-2"><span className="flex-shrink-0 text-emerald-600 font-bold">+</span>Commercial property leased to a related-party business at market rent</li>
                  <li className="flex gap-2"><span className="flex-shrink-0 text-emerald-600 font-bold">+</span>Unlisted property funds and REITs</li>
                  <li className="flex gap-2"><span className="flex-shrink-0 text-emerald-600 font-bold">+</span>Vacant land (with care — must satisfy investment strategy)</li>
                  <li className="flex gap-2"><span className="flex-shrink-0 text-emerald-600 font-bold">+</span>Overseas property (additional FIRB/reporting rules apply)</li>
                </ul>
              </div>
              <div className="rounded-xl border border-red-200 bg-red-50 p-5">
                <h3 className="font-extrabold text-red-900 mb-3">Forbidden</h3>
                <ul className="space-y-2 text-sm text-slate-800">
                  <li className="flex gap-2"><span className="flex-shrink-0 text-red-600 font-bold">x</span>Buying residential property from a related party</li>
                  <li className="flex gap-2"><span className="flex-shrink-0 text-red-600 font-bold">x</span>Trustees or related parties living in or renting the property</li>
                  <li className="flex gap-2"><span className="flex-shrink-0 text-red-600 font-bold">x</span>Improving property significantly while under LRBA</li>
                  <li className="flex gap-2"><span className="flex-shrink-0 text-red-600 font-bold">x</span>Mixing personal and SMSF holdings on the same title</li>
                  <li className="flex gap-2"><span className="flex-shrink-0 text-red-600 font-bold">x</span>Using the property before retirement</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Commercial property advantage */}
        <section className="py-10 bg-amber-50 border-y border-amber-200">
          <div className="container-custom max-w-4xl">
            <div className="rounded-2xl border border-amber-300 bg-white p-6">
              <div className="flex items-start gap-3 mb-4">
                <span className="shrink-0 text-xs font-semibold bg-amber-500 text-slate-900 px-2 py-1 rounded-full">Most Popular Strategy</span>
                <span className="shrink-0 text-xs font-semibold bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Small Business Owners</span>
              </div>
              <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-3">Commercial lease-back: the SMSF property tax arbitrage</h2>
              <p className="text-sm text-slate-700 leading-relaxed mb-4">
                An SMSF can buy business premises and lease them back to a connected entity (a sole trader, partnership, or company) at market rent. This is the most popular SMSF property strategy for small business owners.
              </p>
              <div className="grid sm:grid-cols-2 gap-3 mb-4">
                {[
                  { label: "Rent paid by the business", detail: "Tax-deductible at company rate (25–30%) or marginal rate (up to 47%)" },
                  { label: "Rent received by SMSF", detail: "Taxed at 15% in accumulation, 0% in pension phase" },
                  { label: "Net tax arbitrage", detail: "Up to 32 cents per dollar of rent (owner on 47% tax rate, SMSF in accumulation)" },
                  { label: "Key requirement", detail: "Formal lease at market rent — get a current market rent appraisal in writing" },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <div className="text-xs font-extrabold text-amber-900 mb-1">{item.label}</div>
                    <div className="text-xs text-slate-700">{item.detail}</div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500">Market rent must be established by an independent valuation and reviewed regularly. ATO can attack under-market leases as a deemed contribution or NALI event.</p>
            </div>
          </div>
        </section>

        {/* CGT and tax treatment */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">CGT and tax treatment inside an SMSF</h2>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-extrabold text-slate-700">Scenario</th>
                    <th className="px-4 py-3 text-right font-extrabold text-slate-700">Tax rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    { scenario: "Rental income — accumulation phase", rate: "15%" },
                    { scenario: "Rental income — pension phase", rate: "0%", highlight: true },
                    { scenario: "Capital gain — accumulation, held under 12 months", rate: "15%" },
                    { scenario: "Capital gain — accumulation, held 12+ months", rate: "10%", note: "15% less 1/3 CGT discount" },
                    { scenario: "Capital gain — pension phase", rate: "0%", highlight: true },
                    { scenario: "Negative cash flow (property loss)", rate: "Offset against other SMSF income (no individual tax benefit)", wide: true },
                  ].map((row) => (
                    <tr key={row.scenario} className={row.highlight ? "bg-emerald-50" : "hover:bg-slate-50"}>
                      <td className="px-4 py-3 text-slate-700">
                        {row.scenario}
                        {row.note && <span className="ml-1 text-xs text-slate-500">({row.note})</span>}
                      </td>
                      <td className={`px-4 py-3 text-right font-bold ${row.highlight ? "text-emerald-700" : row.wide ? "text-slate-600 font-normal text-xs" : "text-slate-900"}`}>
                        {row.rate}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              CGT rates inside an SMSF are materially lower than personal rates. Timing disposals to coincide with pension phase can eliminate CGT entirely on long-held property.
            </p>
          </div>
        </section>

        {/* LRBA summary + link card */}
        <section className="py-10 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">LRBA borrowing — overview</h2>
            <p className="text-sm text-slate-600 mb-5 max-w-3xl">
              A Limited Recourse Borrowing Arrangement (LRBA) allows an SMSF to borrow to purchase a single asset, held in a separate bare trust. If the SMSF defaults, the lender&apos;s recourse is limited to that asset — other fund assets are protected.
            </p>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white mb-6">
              <table className="w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-extrabold text-slate-700">Feature</th>
                    <th className="px-4 py-3 text-left font-extrabold text-slate-700">Residential</th>
                    <th className="px-4 py-3 text-left font-extrabold text-slate-700">Commercial</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    { feature: "Max LVR (typical)", res: "60–70%", com: "Up to 80%" },
                    { feature: "Safe harbour rate 2025–26 (related party)", res: "7.74% p.a.", com: "8.85% p.a." },
                    { feature: "Typical rate premium over investor", res: "+1.5–2.0%", com: "+1.0–1.5%" },
                    { feature: "Year-1 setup costs", res: "$3,500–$8,000", com: "$4,500–$10,000" },
                    { feature: "Related-party lease-back?", res: "No", com: "Yes" },
                  ].map((row) => (
                    <tr key={row.feature} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-bold text-slate-800">{row.feature}</td>
                      <td className="px-4 py-3 text-slate-600">{row.res}</td>
                      <td className="px-4 py-3 text-slate-600">{row.com}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="rounded-xl border border-purple-200 bg-purple-50 p-5 flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold text-purple-700 mb-1">Full LRBA Guide</div>
                <h3 className="font-extrabold text-slate-900 mb-1">SMSF Borrowing (LRBA): Rules, Rates &amp; Risks</h3>
                <p className="text-sm text-slate-600">Bare trust structure, NALI risk, safe harbour rates, lender comparison, and common LRBA mistakes — all on one page.</p>
              </div>
              <Link
                href="/smsf/borrowing"
                className="shrink-0 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm px-4 py-2 whitespace-nowrap"
              >
                LRBA guide →
              </Link>
            </div>
          </div>
        </section>

        {/* Costs */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">Costs to factor in</h2>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-extrabold text-slate-700">Upfront costs</th>
                    <th className="px-4 py-3 text-left font-extrabold text-slate-700">Ongoing costs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    {
                      upfront: "Stamp duty — full rate (no principal place of residence discount)",
                      ongoing: "Council rates and land tax",
                    },
                    {
                      upfront: "LRBA bare trust deed: $500–$1,500",
                      ongoing: "Property management fees: 5–10% of rent",
                    },
                    {
                      upfront: "Legal / SMSF structuring: $2,000–$5,000",
                      ongoing: "Landlord and building insurance",
                    },
                    {
                      upfront: "Building inspections",
                      ongoing: "SMSF annual audit (mandatory)",
                    },
                    {
                      upfront: "Loan application and lender fees",
                      ongoing: "Loan repayments (if LRBA)",
                    },
                    {
                      upfront: "Depreciation schedule: $600–$1,500",
                      ongoing: "Depreciation schedule amortised over life of building",
                    },
                  ].map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-700">{row.upfront}</td>
                      <td className="px-4 py-3 text-slate-700">{row.ongoing}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Land tax */}
        <section className="py-10 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-6">
              <h2 className="text-xl font-extrabold text-orange-900 mb-3">Land tax — important note for SMSF trustees</h2>
              <ul className="space-y-2 text-sm text-slate-800">
                <li className="flex gap-2">
                  <span className="flex-shrink-0 font-bold text-orange-600">!</span>
                  An SMSF does <strong>not</strong> qualify for the owner-occupier or principal place of residence exemption on land tax.
                </li>
                <li className="flex gap-2">
                  <span className="flex-shrink-0 font-bold text-orange-600">!</span>
                  Most states tax SMSF-held investment property at standard investment property rates.
                </li>
                <li className="flex gap-2">
                  <span className="flex-shrink-0 font-bold text-orange-600">!</span>
                  Land tax is a deductible expense inside the SMSF, reducing taxable income.
                </li>
              </ul>
              <div className="mt-4 overflow-x-auto rounded-lg border border-orange-200 bg-white">
                <table className="w-full text-sm">
                  <thead className="bg-orange-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-bold text-slate-700">State</th>
                      <th className="px-3 py-2 text-right font-bold text-slate-700">Threshold (approx.)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-orange-100">
                    {[
                      { state: "NSW", threshold: "$1,075,000" },
                      { state: "VIC", threshold: "$300,000" },
                      { state: "QLD", threshold: "$600,000" },
                      { state: "SA", threshold: "$534,000" },
                      { state: "WA", threshold: "$300,000" },
                    ].map((row) => (
                      <tr key={row.state} className="hover:bg-orange-50">
                        <td className="px-3 py-2 text-slate-700 font-medium">{row.state}</td>
                        <td className="px-3 py-2 text-right text-slate-600">{row.threshold}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-slate-500 mt-2">Thresholds as at {CURRENT_YEAR}. Significant state variation — confirm current rates with a state revenue office or tax adviser before purchasing.</p>
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-3xl">
            <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Frequently asked questions</h2>
            <div className="space-y-3">
              {FAQS.map((item) => (
                <details key={item.q} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                  <summary className="flex items-center justify-between px-5 py-4 cursor-pointer font-bold text-slate-900 hover:bg-slate-50">
                    {item.q}
                  </summary>
                  <div className="px-5 pb-4 text-sm text-slate-700 leading-relaxed">{item.a}</div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Compliance + nav */}
        <section className="py-10 bg-slate-50 border-t border-slate-200">
          <div className="container-custom max-w-4xl">
            <p className="text-xs text-slate-500 mb-2 leading-relaxed">{GENERAL_ADVICE_WARNING}</p>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              This page does not constitute credit assistance. LRBA finance referrals are provided as a referral service only — we are not acting as credit representative or credit licensee under the National Consumer Credit Protection Act 2009 (NCCP).
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <Link href="/smsf" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">SMSF hub →</Link>
              <Link href="/smsf/borrowing" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Full LRBA guide →</Link>
              <Link href="/smsf/setup" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">SMSF setup →</Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
