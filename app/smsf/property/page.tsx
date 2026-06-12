import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import HubAdvisorCTA from "@/components/HubAdvisorCTA";
import InvestOpportunitiesCallout from "@/components/invest/InvestOpportunitiesCallout";
import ArticleReadingProgress from "@/components/ArticleReadingProgress";
import { categoryListingsHref } from "@/lib/invest-listing-routes";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `SMSF Property Investment ${CURRENT_YEAR}: Rules, Tax & Compliance | Invest.com.au`,
  description:
    "Guide to buying property inside an SMSF — residential vs commercial rules, LRBA borrowing, tax treatment, valuation requirements and compliance traps.",
  alternates: { canonical: `${SITE_URL}/smsf/property` },
  openGraph: {
    title: `SMSF Property Investment ${CURRENT_YEAR}: Rules, Tax & Compliance`,
    description:
      "Residential vs commercial rules, sole purpose test, LRBA, tax rates, and the related-party traps — everything trustees need to know about property in super.",
    url: `${SITE_URL}/smsf/property`,
    type: "website",
    images: [{ url: `/api/og?title=${encodeURIComponent("SMSF Property Investment")}&sub=${encodeURIComponent("LRBA · Sole Purpose Test · Tax & Compliance · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
};

const FAQS = [
  {
    q: "Can my SMSF buy an investment property?",
    a: "Yes. An SMSF can purchase residential or commercial property, provided it meets the sole purpose test (held purely for retirement benefit), is acquired at market value, and complies with the related-party rules. Residential property cannot be acquired from a related party and cannot be occupied or rented by a member or their family. Commercial (business real) property can be acquired from a related party and leased to a related business at market rent.",
  },
  {
    q: "Can I rent my SMSF property to a family member?",
    a: "No — not if the property is residential. The ATO is unambiguous: a residential property held by an SMSF cannot be rented to a fund member or any related party (spouse, children, business partners, or entities they control). This includes using it as a holiday home. Breaching this rule can cause the fund to lose its complying status, triggering a tax rate of 45% on the fund's taxable income.",
  },
  {
    q: "Can my business rent a property from my SMSF?",
    a: "Yes — if the property qualifies as business real property (used wholly and exclusively in a business). An SMSF can acquire business real property from a related party at market value and lease it back to the related business at market rent. Rent payments by the business are tax-deductible at the business level, while rental income in the SMSF is taxed at 15% (accumulation phase) or 0% (pension phase). Independent market rent valuations must be obtained and reviewed regularly.",
  },
  {
    q: "Do I need to use an LRBA to buy property in an SMSF?",
    a: "No. An SMSF with sufficient cash can purchase property outright — this is the simpler and more common structure. A Limited Recourse Borrowing Arrangement (LRBA) is only needed when the SMSF wants to borrow to fund part of the purchase. LRBAs require a separate bare trust, involve higher lending rates than standard investor loans, and add structural complexity. See our LRBA guide at invest.com.au/smsf/borrowing for full details.",
  },
  {
    q: "What tax rate applies to rental income in an SMSF?",
    a: "Rental income earned by an SMSF in accumulation phase is taxed at 15%. If the member whose balance funds the property has fully moved into pension phase, rental income attributable to that pension account is tax-free (0%). Capital gains follow a parallel structure: 10% effective rate if the property is held more than 12 months in accumulation phase (a one-third discount on the 15% rate), or 0% in pension phase. This combination is why long-term commercial property held in an SMSF can be highly tax-efficient.",
  },
];

export default function SmsfPropertyPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "SMSF", url: absoluteUrl("/smsf") },
    { name: "SMSF Property", url: absoluteUrl("/smsf/property") },
  ]);

  const faqSchema = faqJsonLd(FAQS);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}

      <div className="bg-white min-h-screen">
      <ArticleReadingProgress />

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section className="bg-slate-900 text-white py-10 md:py-14">
          <div className="container-custom">
            <nav
              className="flex items-center gap-1.5 text-xs text-slate-500 mb-5"
              aria-label="Breadcrumb"
            >
              <Link href="/" className="hover:text-white">Home</Link>
              <span className="text-slate-600">/</span>
              <Link href="/smsf" className="hover:text-white">SMSF</Link>
              <span className="text-slate-600">/</span>
              <span className="text-white font-medium">SMSF Property</span>
            </nav>

            <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-3">
              {UPDATED_LABEL}
            </p>

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-4 max-w-3xl">
              SMSF Property Investment {CURRENT_YEAR}: Rules, Tax &amp; Compliance
            </h1>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-3xl mb-6">
              SMSFs can invest in both residential and commercial property — but strict rules exist to
              prevent self-dealing. Get the structure wrong and the fund can lose its complying status.
              Get it right, and property held in super is one of Australia&apos;s most tax-efficient
              long-term investment structures.
            </p>

            <div className="flex flex-wrap gap-3 text-sm">
              <span className="inline-flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-full px-3 py-1.5 text-slate-300">
                <span className="text-emerald-400">&#10003;</span> Residential &amp; commercial covered
              </span>
              <span className="inline-flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-full px-3 py-1.5 text-slate-300">
                <span className="text-emerald-400">&#10003;</span> 15% / 0% tax rates explained
              </span>
              <span className="inline-flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-full px-3 py-1.5 text-slate-300">
                <span className="text-emerald-400">&#10003;</span> Related-party traps
              </span>
            </div>
          </div>
        </section>

        {/* ── Residential vs commercial comparison table ────────────────────── */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">
              Residential vs commercial: the key differences
            </h2>
            <p className="text-sm text-slate-600 mb-6 max-w-3xl">
              The ATO treats residential and business real property very differently inside an SMSF.
              Most of the flexibility — including the ability to buy from or lease to a related party —
              only applies to commercial (business real) property.
            </p>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm" aria-label="SMSF residential vs commercial property rules comparison">
                <thead className="bg-slate-100">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left font-extrabold text-slate-700 min-w-[180px]">Rule</th>
                    <th scope="col" className="px-4 py-3 text-left font-extrabold text-slate-700">Residential property</th>
                    <th scope="col" className="px-4 py-3 text-left font-extrabold text-slate-700">Commercial (business real) property</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  <tr>
                    <td className="px-4 py-3 font-bold text-slate-800">Acquire from related party</td>
                    <td className="px-4 py-3 text-red-700 font-semibold">Not permitted</td>
                    <td className="px-4 py-3 text-emerald-700 font-semibold">Permitted at market value</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="px-4 py-3 font-bold text-slate-800">Lease to related party</td>
                    <td className="px-4 py-3 text-red-700 font-semibold">Never permitted</td>
                    <td className="px-4 py-3 text-emerald-700 font-semibold">Permitted at market rent</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-bold text-slate-800">Member / family can occupy</td>
                    <td className="px-4 py-3 text-red-700 font-semibold">Never — including as holiday home</td>
                    <td className="px-4 py-3 text-slate-600">N/A (commercial use required)</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="px-4 py-3 font-bold text-slate-800">LRBA available</td>
                    <td className="px-4 py-3 text-emerald-700 font-semibold">Yes (specialist lenders only)</td>
                    <td className="px-4 py-3 text-emerald-700 font-semibold">Yes (better LVRs available)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-bold text-slate-800">GST on purchase</td>
                    <td className="px-4 py-3 text-slate-600">No GST (residential supply)</td>
                    <td className="px-4 py-3 text-slate-600">GST may apply; SMSF may register to claim input credits</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="px-4 py-3 font-bold text-slate-800">Depreciation</td>
                    <td className="px-4 py-3 text-slate-600">Building allowance + plant &amp; equipment (post-2017 restrictions apply)</td>
                    <td className="px-4 py-3 text-slate-600">Full depreciation available; no post-2017 residential restrictions</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-bold text-slate-800">Rental income tax</td>
                    <td className="px-4 py-3 text-slate-600">15% (accumulation) / 0% (pension phase)</td>
                    <td className="px-4 py-3 text-slate-600">15% (accumulation) / 0% (pension phase)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── Residential property rules ─────────────────────────────────────── */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">
              Residential property: what the rules actually require
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
              <div className="rounded-xl border border-red-200 bg-red-50 p-5">
                <h3 className="font-extrabold text-red-900 mb-3 text-base">What is not permitted</h3>
                <ul className="space-y-2.5 text-sm text-slate-800">
                  <li className="flex gap-2">
                    <span className="text-red-500 shrink-0 font-bold mt-0.5">&#10007;</span>
                    <span>Acquiring the property from a related party (spouse, family member, business partner, or entity you control)</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-red-500 shrink-0 font-bold mt-0.5">&#10007;</span>
                    <span>A fund member, their spouse, children, or other related party living in or renting the property</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-red-500 shrink-0 font-bold mt-0.5">&#10007;</span>
                    <span>Using the property as a holiday home for family — even occasionally</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-red-500 shrink-0 font-bold mt-0.5">&#10007;</span>
                    <span>Renting below market rate to non-related tenants (not arm&apos;s-length)</span>
                  </li>
                </ul>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                <h3 className="font-extrabold text-emerald-900 mb-3 text-base">What is required</h3>
                <ul className="space-y-2.5 text-sm text-slate-800">
                  <li className="flex gap-2">
                    <span className="text-emerald-600 shrink-0 font-bold mt-0.5">&#10003;</span>
                    <span>Purchased at market value, with documented valuation evidence at acquisition</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-emerald-600 shrink-0 font-bold mt-0.5">&#10003;</span>
                    <span>Tenanted by unrelated parties at arm&apos;s-length market rent</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-emerald-600 shrink-0 font-bold mt-0.5">&#10003;</span>
                    <span>Genuinely held for the retirement benefit of members (sole purpose test)</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-emerald-600 shrink-0 font-bold mt-0.5">&#10003;</span>
                    <span>All income collected into the SMSF; all expenses paid from SMSF funds</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
              <p className="text-sm font-bold text-amber-900 mb-1">The sole purpose test</p>
              <p className="text-sm text-amber-900 leading-relaxed">
                The sole purpose test (s 62 SIS Act) requires that the fund be maintained solely for
                the provision of retirement benefits to members. Any arrangement that provides a
                present-day benefit to a member or their associates — including using SMSF property
                personally — is a breach. The ATO actively audits SMSF property arrangements and
                has issued significant penalties for breaches.
              </p>
            </div>
          </div>
        </section>

        {/* ── Commercial / business real property ───────────────────────────── */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">
              Business real property: the commercial strategy
            </h2>
            <p className="text-sm text-slate-600 mb-6 max-w-3xl">
              Commercial property classified as &quot;business real property&quot; has far more flexibility
              inside an SMSF. This is why the structure is particularly popular with small business owners.
            </p>

            <div className="space-y-4 mb-8">
              <div className="rounded-xl border border-slate-200 bg-white p-5 flex gap-4">
                <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center shrink-0 text-amber-600 font-extrabold text-lg">1</div>
                <div>
                  <h3 className="font-extrabold text-slate-900 mb-1">What qualifies as business real property</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    The property must be used &quot;wholly and exclusively&quot; in a business. Classic examples
                    include a warehouse, factory, office building, or retail shop. The ATO has ruled on
                    mixed-use properties: a farm dwelling on the same title as farmland may not qualify
                    (the dwelling is residential use), while the farmland itself may qualify if it is
                    used wholly in a primary production business. Partial-use properties require careful
                    ATO guidance review.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 flex gap-4">
                <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center shrink-0 text-amber-600 font-extrabold text-lg">2</div>
                <div>
                  <h3 className="font-extrabold text-slate-900 mb-1">The business premises strategy</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    A business owner can sell their premises to their SMSF at market value (or contribute
                    it in-specie up to their contribution cap), then lease it back from the SMSF at market
                    rent. Rent paid by the business is a tax deduction at the business level (up to 30%
                    corporate rate or 47% individual marginal rate). That same rent flows into the SMSF
                    and is taxed at 15% — or 0% once the member is in pension phase. Over time the SMSF
                    builds equity in a commercial asset; when sold in pension phase, capital gains are tax-free.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 flex gap-4">
                <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center shrink-0 text-amber-600 font-extrabold text-lg">3</div>
                <div>
                  <h3 className="font-extrabold text-slate-900 mb-1">Arm&apos;s-length rent is non-negotiable</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Even though a related-party lease is permitted for commercial property, the rent must
                    be at market value — not discounted as a favour to the business. The ATO expects
                    independent market rent appraisals at inception and whenever a lease is renewed. An
                    ATO audit that finds below-market rent will characterise the shortfall as a breach,
                    potentially triggering the non-arm&apos;s-length income (NALI) provisions, which tax
                    the income at the top marginal rate (45%) instead of 15%.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── How to purchase ───────────────────────────────────────────────── */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">
              How to purchase property in an SMSF
            </h2>
            <p className="text-sm text-slate-600 mb-6 max-w-3xl">
              Two paths are available: cash purchase (simpler) or borrowing through a Limited Recourse
              Borrowing Arrangement (more complex, but extends the fund&apos;s purchasing power).
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="font-extrabold text-slate-900 mb-3">Cash purchase</h3>
                <ul className="space-y-2 text-sm text-slate-700">
                  <li className="flex gap-2">
                    <span className="text-emerald-500 shrink-0">&#10003;</span>
                    <span>Simpler structure — property is owned directly by the trustee(s) on behalf of the SMSF</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-emerald-500 shrink-0">&#10003;</span>
                    <span>No bare trust, no lender involvement, no ongoing LRBA compliance obligations</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-emerald-500 shrink-0">&#10003;</span>
                    <span>Property can be improved at any time using SMSF funds</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-slate-500 shrink-0">&#10143;</span>
                    <span className="text-slate-600">Fund must have sufficient liquidity after settlement</span>
                  </li>
                </ul>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="font-extrabold text-slate-900 mb-3">LRBA (borrowing)</h3>
                <ul className="space-y-2 text-sm text-slate-700">
                  <li className="flex gap-2">
                    <span className="text-emerald-500 shrink-0">&#10003;</span>
                    <span>Allows the fund to acquire a higher-value asset than cash alone permits</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-emerald-500 shrink-0">&#10003;</span>
                    <span>Lender&apos;s recourse is limited to the property — other fund assets are protected</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-slate-500 shrink-0">&#10143;</span>
                    <span className="text-slate-600">Requires a separate bare (holding) trust; legal costs $2,000&ndash;$5,000</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-slate-500 shrink-0">&#10143;</span>
                    <span className="text-slate-600">Property cannot be improved (beyond repair/maintenance) until the loan is repaid</span>
                  </li>
                </ul>
                <p className="text-xs text-slate-500 mt-3">
                  See our full guide at{" "}
                  <Link href="/smsf/borrowing" className="text-amber-600 hover:underline font-semibold">
                    invest.com.au/smsf/borrowing
                  </Link>
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="font-extrabold text-slate-900 mb-3 text-base">Purchase mechanics and costs</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-700">
                <ul className="space-y-2">
                  <li className="flex gap-2">
                    <span className="text-slate-500 shrink-0">&#10143;</span>
                    <span>Property must be in the name of the trustee(s) &quot;as trustee for [SMSF name]&quot; — not in the personal name of the members</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-slate-500 shrink-0">&#10143;</span>
                    <span>Stamp duty applies in all states; SMSF is treated as a separate purchaser</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-slate-500 shrink-0">&#10143;</span>
                    <span>Conveyancer / solicitor costs: $1,500&ndash;$3,000 for standard residential settlements</span>
                  </li>
                </ul>
                <ul className="space-y-2">
                  <li className="flex gap-2">
                    <span className="text-slate-500 shrink-0">&#10143;</span>
                    <span>All settlement funds must come from the SMSF bank account — not personal funds</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-slate-500 shrink-0">&#10143;</span>
                    <span>SMSF deed and investment strategy must authorise direct property investment before purchase</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-slate-500 shrink-0">&#10143;</span>
                    <span>Building and landlord insurance must be in the trustee&apos;s name on behalf of the SMSF</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── Tax treatment ─────────────────────────────────────────────────── */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">
              Tax treatment: why property in super can be powerful
            </h2>
            <p className="text-sm text-slate-600 mb-6 max-w-3xl">
              The combination of low accumulation-phase tax rates and zero pension-phase tax makes
              long-term property held inside an SMSF one of Australia&apos;s most tax-efficient
              investment vehicles — for those with the right fund size and structure.
            </p>

            <div className="overflow-x-auto rounded-xl border border-slate-200 mb-6">
              <table className="w-full text-sm" aria-label="Tax treatment of SMSF property in accumulation and pension phase">
                <thead className="bg-slate-100">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left font-extrabold text-slate-700">Income or gain type</th>
                    <th scope="col" className="px-4 py-3 text-left font-extrabold text-slate-700">Accumulation phase</th>
                    <th scope="col" className="px-4 py-3 text-left font-extrabold text-slate-700">Pension phase</th>
                    <th scope="col" className="px-4 py-3 text-left font-extrabold text-slate-700">Outside super (comparison)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  <tr>
                    <td className="px-4 py-3 font-bold">Rental income</td>
                    <td className="px-4 py-3 text-slate-700">15%</td>
                    <td className="px-4 py-3 text-emerald-700 font-semibold">0%</td>
                    <td className="px-4 py-3 text-slate-500">Up to 47% (individual MTR)</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="px-4 py-3 font-bold">Capital gain (held &lt;12 months)</td>
                    <td className="px-4 py-3 text-slate-700">15%</td>
                    <td className="px-4 py-3 text-emerald-700 font-semibold">0%</td>
                    <td className="px-4 py-3 text-slate-500">Up to 47%</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-bold">Capital gain (held &gt;12 months)</td>
                    <td className="px-4 py-3 text-slate-700">10% effective (1/3 discount on 15%)</td>
                    <td className="px-4 py-3 text-emerald-700 font-semibold">0%</td>
                    <td className="px-4 py-3 text-slate-500">Up to 23.5% effective (50% CGT discount applied)</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="px-4 py-3 font-bold">Depreciation deduction</td>
                    <td className="px-4 py-3 text-slate-700">Offsets 15% tax</td>
                    <td className="px-4 py-3 text-slate-600">Reduces exempt income</td>
                    <td className="px-4 py-3 text-slate-500">Offsets individual MTR</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
              <p className="text-sm font-bold text-blue-900 mb-1">Why trustees plan for pension phase</p>
              <p className="text-sm text-blue-900 leading-relaxed">
                A property that generates $60,000 per year in rent costs $9,000 in tax in accumulation
                phase (15%). In pension phase, that $9,000 stays in the fund. Over a 10-year hold,
                that&apos;s $90,000 in additional compounding — before any capital gains difference is
                factored in. This is why long-term commercial property held in an SMSF that eventually
                transitions to pension phase can be significantly more tax-efficient than equivalent
                property held personally or in a trust.
              </p>
            </div>
          </div>
        </section>

        {/* ── Valuation requirements ────────────────────────────────────────── */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">
              Valuation requirements
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">At purchase</p>
                <p className="text-sm text-slate-700 leading-relaxed">
                  Property must be acquired at market value. The ATO expects documented evidence —
                  typically an independent valuation from a qualified valuer, comparable sales data,
                  or a real estate agent&apos;s assessment. Self-provided valuations are scrutinised
                  heavily and rarely accepted.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Annual — significant assets</p>
                <p className="text-sm text-slate-700 leading-relaxed">
                  If real property represents a significant proportion of the fund&apos;s total assets,
                  the ATO expects an independent market valuation each year for financial reporting
                  purposes. APRA&apos;s guidance (applied by the ATO to SMSFs) uses a 5% threshold —
                  though the ATO&apos;s 2012 valuation guidelines recommend annual independent valuations
                  for all real property.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Related-party leases</p>
                <p className="text-sm text-slate-700 leading-relaxed">
                  Where a commercial property is leased to a related party, market rent must be
                  substantiated independently — typically a rent appraisal from a commercial agent
                  at the start of each lease and at renewal. A rental shortfall relative to market
                  rate triggers the NALI provisions (45% tax on the shortfall income).
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Ongoing management ────────────────────────────────────────────── */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">
              Ongoing management: getting the administration right
            </h2>

            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="font-extrabold text-slate-900 mb-2">Income and expense flows</h3>
                <p className="text-sm text-slate-700 leading-relaxed">
                  All rental income must be received directly into the SMSF&apos;s dedicated bank account.
                  All expenses — maintenance, insurance, council rates, water rates, property management
                  fees — must be paid from the SMSF&apos;s bank account. Trustees who pay for a property
                  expense from personal funds and then seek reimbursement create a compliance problem
                  unless the transaction is promptly and properly documented as a loan or contribution.
                  The simplest approach: instruct the property manager to collect all rent and hold
                  all invoices for SMSF payment.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="font-extrabold text-slate-900 mb-2">Property management</h3>
                <p className="text-sm text-slate-700 leading-relaxed">
                  Using an independent, licensed property management agent is strongly recommended.
                  An agent maintains arm&apos;s-length rent collection, tenant selection, and maintenance
                  records — all of which are important if the ATO audits the fund. Self-managing the
                  property is permitted, but the trustee must keep meticulous records and charge market
                  rent. Where the property is leased to a related business, an independent agent or
                  at minimum a formal written lease at market terms is essential.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="font-extrabold text-slate-900 mb-2">Maintenance vs improvement</h3>
                <p className="text-sm text-slate-700 leading-relaxed">
                  Under an LRBA, the fund can spend money on repairs and maintenance of the property
                  but cannot carry out improvements that change the character of the asset (which
                  would effectively constitute a new acquisition of a different asset under the LRBA
                  rules). A new roof replacing a failed roof is a repair; adding a second storey is
                  an improvement. If in doubt, obtain written advice from an SMSF specialist before
                  authorising any significant works during an LRBA.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Liquidity risk ────────────────────────────────────────────────── */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">
              Liquidity risk: the problem property owners underestimate
            </h2>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 mb-6">
              <p className="text-base font-extrabold text-amber-900 mb-2">
                Property is illiquid. Superannuation has mandatory cash obligations.
              </p>
              <p className="text-sm text-amber-900 leading-relaxed">
                When a member retires or reaches a condition of release, the SMSF must pay their
                benefit — either as a pension (regular payments) or a lump sum. If the fund&apos;s
                assets are predominantly locked in a property that cannot be quickly sold at a
                fair price, the fund may need to sell at a distressed price or seek bridging
                solutions. The ATO expects trustee investment strategies to explicitly address
                liquidity and the fund&apos;s ability to meet benefit payment obligations.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5 text-center">
                <p className="text-3xl font-extrabold text-slate-900 mb-1">80%+</p>
                <p className="text-sm text-slate-600 leading-relaxed">
                  If property exceeds ~80% of fund assets, the ATO expects explicit justification
                  in the investment strategy — diversification risk must be addressed in writing.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5 text-center">
                <p className="text-3xl font-extrabold text-slate-900 mb-1">12–24 months</p>
                <p className="text-sm text-slate-600 leading-relaxed">
                  A commercial property sale can take this long in a slow market. Cash reserves must
                  cover pension payments and expenses over this window.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5 text-center">
                <p className="text-3xl font-extrabold text-slate-900 mb-1">Written</p>
                <p className="text-sm text-slate-600 leading-relaxed">
                  The investment strategy documenting liquidity planning must be in writing and
                  reviewed regularly. Vague strategies attract ATO scrutiny and audit findings.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Investment strategy documentation ─────────────────────────────── */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">
              Investment strategy: what the ATO requires
            </h2>

            <p className="text-sm text-slate-600 mb-5 max-w-3xl">
              Every SMSF must maintain a written investment strategy that trustees regularly review.
              Where direct property is a significant asset, the ATO expects the strategy to explicitly
              address each of these four considerations.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="font-bold text-slate-900 mb-2">Risk and return</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Why is the expected return from the property appropriate for the members&apos; risk
                  tolerance? How does the illiquidity risk, maintenance risk, and tenant vacancy
                  risk align with the fund&apos;s objectives? Document this in concrete terms —
                  &quot;property is a good investment&quot; is not sufficient.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="font-bold text-slate-900 mb-2">Diversification</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  If a single property dominates the fund, the strategy must acknowledge the
                  concentration and explain why it is nonetheless appropriate — typically because
                  the members have other diversified assets outside super, or the fund size is
                  expected to grow to provide balance over time.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="font-bold text-slate-900 mb-2">Liquidity</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  The fund must be able to pay expenses, cover LRBA repayments, and meet pension
                  or lump sum obligations. Document what cash reserves the trustees will maintain
                  and how they will access liquidity if needed.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="font-bold text-slate-900 mb-2">Members&apos; circumstances</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  The strategy must consider the age, expected retirement timeline, and benefit
                  needs of each member. A 35-year-old has 30+ years for property to compound;
                  a 60-year-old entering pension phase within 5 years has very different liquidity
                  and risk needs.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Common compliance failures ────────────────────────────────────── */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">
              Common compliance failures the ATO finds
            </h2>

            <div className="space-y-3">
              {[
                {
                  label: "Renting to a related party",
                  detail:
                    "The most common residential property breach. A member renting the SMSF property to their child, sibling, or family friend at a discounted rate (or at all, for residential) is a breach of the in-house asset and sole purpose rules.",
                },
                {
                  label: "Member or family occupying the property",
                  detail:
                    "Even a short-term stay by the member or a family member — a holiday weekend or an adult child staying temporarily — is a breach. The property cannot deliver any present-day benefit to a fund member or associate.",
                },
                {
                  label: "Mixing personal and SMSF funds in maintenance",
                  detail:
                    "A trustee pays for urgent repairs personally and forgets to reimburse themselves from the fund within the same financial year. Without documented treatment as a loan, this can be treated as a contribution or a breach of the fund’s investment strategy.",
                },
                {
                  label: "Failure to obtain market valuations",
                  detail:
                    "Property values are carried forward on SMSF financial statements without annual independent valuation. The ATO considers this a compliance failure, particularly if the fund has related-party leases where under-market rent could otherwise go undetected.",
                },
                {
                  label: "Vague investment strategies",
                  detail:
                    "A one-line investment strategy that says “invest in property and shares” does not meet the ATO’s requirements. The strategy must address risk, return, liquidity, diversification, and members’ circumstances in concrete terms.",
                },
                {
                  label: "Borrowing for improvements under LRBA",
                  detail:
                    "Spending SMSF or borrowed funds on significant property improvements while an LRBA is in place can constitute an acquisition of a new asset under the LRBA rules — a breach. Maintenance and repairs are permitted; improvements are not.",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-slate-200 bg-white p-4 flex gap-3"
                >
                  <span className="text-red-500 shrink-0 font-bold mt-0.5 text-base">&#10007;</span>
                  <div>
                    <p className="font-bold text-slate-900 text-sm mb-0.5">{item.label}</p>
                    <p className="text-sm text-slate-600 leading-relaxed">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Related-party transaction rules ───────────────────────────────── */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">
              Related-party rules and the 5% in-house asset limit
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <h3 className="font-extrabold text-slate-900 mb-3 text-base">Who is a &quot;related party&quot;?</h3>
                <ul className="space-y-2 text-sm text-slate-700">
                  <li className="flex gap-2"><span className="shrink-0">&#10143;</span><span>Fund members and their spouses</span></li>
                  <li className="flex gap-2"><span className="shrink-0">&#10143;</span><span>Members&apos; children and their spouses</span></li>
                  <li className="flex gap-2"><span className="shrink-0">&#10143;</span><span>Members&apos; parents, siblings, and their spouses</span></li>
                  <li className="flex gap-2"><span className="shrink-0">&#10143;</span><span>Business partners of a member</span></li>
                  <li className="flex gap-2"><span className="shrink-0">&#10143;</span><span>Companies and trusts where a member or related individual controls &gt;50% or is a trustee</span></li>
                  <li className="flex gap-2"><span className="shrink-0">&#10143;</span><span>Any entity that a related party has a controlling interest in</span></li>
                </ul>
              </div>

              <div>
                <h3 className="font-extrabold text-slate-900 mb-3 text-base">The 5% in-house asset rule</h3>
                <p className="text-sm text-slate-700 leading-relaxed mb-3">
                  An SMSF cannot have more than 5% of its total assets in &quot;in-house assets&quot; — broadly,
                  loans to, investments in, or leases to related parties. Business real property leased
                  to a related party is specifically excluded from this 5% limit, which is why the
                  commercial strategy is so commonly used. Residential property, however, cannot be
                  leased to a related party at all, so the in-house asset limit is not even the first
                  barrier — the prohibition is total.
                </p>
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
                  <strong>Breach consequence:</strong> An SMSF that breaches the in-house asset
                  limit or the related-party rules can be made non-complying by the ATO. A
                  non-complying fund pays 45% tax on its taxable income — potentially destroying
                  decades of tax-preferred savings in a single year.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ ───────────────────────────────────────────────────────────── */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-3xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">
              Frequently asked questions
            </h2>

            <div className="space-y-3">
              {FAQS.map((faq) => (
                <details
                  key={faq.q}
                  className="group rounded-xl border border-slate-200 bg-white overflow-hidden"
                >
                  <summary className="flex items-center justify-between gap-4 px-5 py-4 cursor-pointer select-none list-none font-bold text-slate-900 text-sm hover:bg-slate-50 transition-colors">
                    <span>{faq.q}</span>
                    <span className="shrink-0 text-slate-500 group-open:rotate-180 transition-transform duration-200 text-base" aria-hidden="true">&#8964;</span>
                  </summary>
                  <div className="px-5 pb-5 pt-1">
                    <p className="text-sm text-slate-700 leading-relaxed">{faq.a}</p>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── General advice warning ────────────────────────────────────────── */}
        <section className="py-10 bg-white border-t border-slate-200">
          <div className="container-custom max-w-3xl">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Important — general advice only
              </p>
              <p className="text-xs text-slate-600 leading-relaxed mb-3">{GENERAL_ADVICE_WARNING}</p>
              <p className="text-xs text-slate-600 leading-relaxed">
                SMSF property investment involves complex superannuation, taxation, and conveyancing
                considerations specific to your fund&apos;s circumstances. You should consult a licensed
                SMSF specialist (financial adviser or SMSF specialist auditor) and a qualified mortgage
                broker or SMSF lender before making any investment decision involving property in an
                SMSF.
              </p>
            </div>
          </div>
        </section>

        <HubAdvisorCTA
          heading="Get specialist advice before buying property in your SMSF"
          subheading="SMSF property rules — including the sole-purpose test, related-party restrictions, and LRBA structures — are complex. An SMSF specialist can review your investment strategy and ensure your fund stays compliant."
          intent={{ need: "smsf", context: ["smsf_property", "lrba", "smsf_compliance"] }}
          source="smsf_property"
          ctaLabel="Find an SMSF property specialist"
          className="py-12 bg-amber-50 border-t border-amber-200"
        />

        {/* ── Related links ─────────────────────────────────────────────────── */}
        <section className="py-10 bg-slate-50 border-t border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-base font-extrabold text-slate-900 mb-4">Related SMSF guides</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <Link
                href="/smsf/borrowing"
                className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900"
              >
                SMSF borrowing (LRBA) guide &rarr;
              </Link>
              <Link
                href="/smsf/setup"
                className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900"
              >
                Setting up an SMSF &rarr;
              </Link>
              <Link
                href="/advisors/smsf-specialists"
                className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900"
              >
                Find an SMSF specialist &rarr;
              </Link>
            </div>
          </div>
        </section>

        {/* Cross-link into the marketplace (Wave 6) */}
        <section className="container-custom max-w-5xl pb-12">
          <InvestOpportunitiesCallout
            tone="amber"
            icon="building"
            heading="SMSF-eligible property & income opportunities"
            blurb="Browse commercial property, SDA (NDIS) housing and other LRBA-compatible assets suited to SMSF acquisition — many flagged SMSF-eligible with bare-trust-ready structures. Use the after-tax return estimator on each listing to model the 15% accumulation vs 0% pension outcome."
            href={categoryListingsHref("commercial-property")}
            ctaLabel="Browse SMSF-eligible listings"
            secondary={{ label: "SDA / NDIS housing", href: categoryListingsHref("sda-housing") }}
          />
        </section>

      </div>
    </>
  );
}
