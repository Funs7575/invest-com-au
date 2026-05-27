import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

const FAQS = [
  {
    q: "Is rental property income taxed differently from other income in Australia?",
    a: "No — rental income is added to your assessable income and taxed at your marginal rate, the same as salary or interest. The key difference is that investment property comes with a wide range of tax-deductible expenses that can significantly reduce your net taxable rental income. If your allowable deductions exceed your rental income, you have a rental loss that can offset other income (negative gearing).",
  },
  {
    q: "What rental property expenses are tax-deductible?",
    a: "Immediately deductible expenses include: interest on the investment loan, property management fees, insurance (landlord, building, contents), council rates, land tax, body corporate/strata fees, repairs and maintenance (not improvements), advertising for tenants, pest inspections and cleaning, and bank fees on the loan account. You cannot claim travel to inspect residential rental properties since 2017. Loan establishment costs are deductible over 5 years. Capital improvements are not immediately deductible but can be claimed as capital works (building allowance at 2.5% p.a.).",
  },
  {
    q: "What is the difference between repairs and capital improvements for tax?",
    a: "A repair restores an asset to its original condition (e.g., fixing a broken door, patching a leaking roof). It is immediately deductible. A capital improvement adds value, extends the asset's life, or changes its character (e.g., adding a second bathroom, replacing a roof with a superior material, renovating a kitchen). Capital improvements are not immediately deductible — they are added to the cost base (reducing future CGT) or depreciable as capital works (Div 43) at 2.5% p.a. Initial repairs to a property you just purchased (i.e., repairing pre-existing damage) are also capital and not immediately deductible.",
  },
  {
    q: "How does depreciation work for investment properties?",
    a: "There are two types of depreciation: Division 40 (plant and equipment) covers removable assets like appliances, carpets, hot water systems, blinds — depreciated over their ATO-effective life (5–20 years). Division 43 (capital works) covers the building's structure, roof, walls — claimed at 2.5% p.a. on qualifying construction costs for buildings built after 1985. Important: since the 2017 Budget, investors who buy a second-hand residential property can no longer claim Div 40 depreciation on assets that were already installed when they purchased (only new properties or assets they personally purchased new can be depreciated).",
  },
  {
    q: "What is the 6-year main residence exemption rule for rental properties?",
    a: "If you move out of your home and rent it out, you can continue to treat it as your main residence for CGT purposes for up to 6 years. During this period, any capital gain on sale is CGT-exempt. After 6 years, the CGT exemption is apportioned by time. This rule only applies to one property at a time — if you have another main residence, you must nominate which property gets the exemption. The 6-year clock resets if you move back in.",
  },
  {
    q: "How is CGT calculated when I sell a rental property?",
    a: "CGT = (Sale proceeds − Cost base). Cost base includes: purchase price, stamp duty, conveyancing costs, legal fees on purchase and sale, real estate agent commission, capital improvements, and any non-deductible holding costs. If you have owned the property for more than 12 months, only 50% of the gain is included in assessable income (the CGT discount). The assessable gain is added to your other income for the year and taxed at your marginal rate.",
  },
];

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Investment Property Tax Australia (${CURRENT_YEAR}) — Deductions, Depreciation & CGT`,
  description:
    "Complete tax guide for Australian rental property investors. Deductible expenses, depreciation (Div 40 and Div 43), negative gearing, CGT on sale, 6-year main residence rule, and record keeping.",
  alternates: { canonical: `${SITE_URL}/tax/rental-property` },
  openGraph: {
    title: `Rental Property Tax Guide Australia (${CURRENT_YEAR})`,
    description: "What you can and cannot deduct, depreciation rules, CGT on sale, and the 6-year main residence rule.",
    url: `${SITE_URL}/tax/rental-property`,
  },
};

export default function RentalPropertyTaxPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Tax", url: absoluteUrl("/tax") },
    { name: "Rental Property Tax", url: absoluteUrl("/tax/rental-property") },
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
              <Link href="/tax" className="hover:text-white">Tax</Link>
              <span className="text-slate-600">/</span>
              <span className="text-white font-medium">Rental Property Tax</span>
            </nav>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-xs font-semibold bg-amber-500 text-slate-900 px-3 py-1 rounded-full">Updated {CURRENT_YEAR}</span>
              <span className="text-xs font-semibold bg-orange-600 text-white px-3 py-1 rounded-full">~3M Property Investors</span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-3 max-w-3xl">
              Rental Property Tax: Deductions, Depreciation &amp; CGT
            </h1>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-3xl">
              Investment property comes with a substantial set of tax deductions — but also common traps. This guide covers what you can and cannot deduct, how depreciation works, and the CGT rules when you sell.
            </p>
          </div>
        </section>

        {/* Key Stats */}
        <section className="bg-white py-8 border-b border-slate-100">
          <div className="container-custom">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { v: "~3M", l: "Australian rental property investors", sub: "ATO data, 2025" },
                { v: "2.5%", l: "Building allowance (Div 43)", sub: "Per year over 40 years" },
                { v: "50%", l: "CGT discount", sub: "If held 12+ months" },
                { v: "6 years", l: "Main residence exemption", sub: "If rented after moving out" },
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

        {/* Deductible expenses */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">What you can deduct from rental income</h2>
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              {/* Deductible */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                <h3 className="font-extrabold text-emerald-900 mb-3">Immediately deductible</h3>
                <ul className="space-y-1.5 text-sm text-emerald-800">
                  {[
                    "Loan interest (investment loan only — not principal)",
                    "Property management fees (typically 7–10% of rent)",
                    "Council rates and land tax",
                    "Body corporate / strata fees",
                    "Landlord and building insurance premiums",
                    "Repairs and maintenance (restoring, not improving)",
                    "Advertising costs for new tenants",
                    "Pest inspections, cleaning, and gardening",
                    "Bank fees and charges on the investment loan",
                    "Depreciation (plant/equipment and building allowance)",
                    "Legal fees for lease disputes (not acquisition)",
                    "Accounting and tax agent fees (apportioned to investment)",
                  ].map((item) => (
                    <li key={item} className="flex gap-2"><span className="flex-shrink-0 text-emerald-600">✓</span>{item}</li>
                  ))}
                </ul>
              </div>
              {/* Not deductible */}
              <div className="rounded-xl border border-red-200 bg-red-50 p-5">
                <h3 className="font-extrabold text-red-900 mb-3">NOT immediately deductible</h3>
                <ul className="space-y-1.5 text-sm text-red-800">
                  {[
                    "Stamp duty (add to cost base for CGT)",
                    "Loan principal repayments",
                    "Capital improvements (add to cost base or claim as Div 43)",
                    "Initial purchase repairs (damage pre-existing at purchase)",
                    "Travel to inspect residential rental property (removed 2017)",
                    "Personal costs mixed with investment property use",
                    "Expenses while property is not available to rent (e.g., personal use periods)",
                    "Fines and penalties",
                    "Expenses for borrowing (partially — must be spread over 5 years via s25-25)",
                  ].map((item) => (
                    <li key={item} className="flex gap-2"><span className="flex-shrink-0 text-red-600">✗</span>{item}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Negative vs positive gearing */}
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="font-extrabold text-slate-900 mb-2">Negative gearing vs positive gearing</h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-3">
                When your total allowable deductions (including interest, depreciation, and management fees) exceed your rental income, you have a rental loss — negative gearing. This net loss is deducted from your other income (salary, dividends), reducing your total tax. Around 70% of Australian rental property investors are negatively geared.
              </p>
              <p className="text-sm text-slate-600 leading-relaxed">
                When rental income exceeds expenses — positive gearing — the net income is added to your assessable income and taxed at your marginal rate. Positively geared properties generate immediate taxable income but also provide stronger cash flow.
              </p>
            </div>
          </div>
        </section>

        {/* Depreciation */}
        <section className="py-10 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">Depreciation: Division 40 and Division 43</h2>
            <div className="space-y-4">
              {[
                {
                  title: "Division 43 — Building allowance (capital works)",
                  badge: "2.5% p.a.",
                  body: "Claim 2.5% of the original construction cost of the building (not the land) per year over 40 years, for residential buildings built after 16 September 1987. You don't need to commission new construction — you can claim Div 43 on any rental property built after that date. To claim, you need the original construction cost from the original builder's contract or a quantity surveyor's report. Div 43 deductions reduce your CGT cost base, so they will increase your capital gain when you sell.",
                },
                {
                  title: "Division 40 — Plant and equipment",
                  badge: "Effective life",
                  body: "Depreciable plant and equipment includes: hot water systems, air conditioners, dishwashers, carpets, blinds, ovens, smoke detectors. Each asset is depreciated over its ATO-determined effective life (e.g., carpet: 10 years; hot water system: 12 years). IMPORTANT: Since the 2017-18 Budget, investors purchasing second-hand residential properties can no longer claim Div 40 on assets already installed in the property at purchase. Only assets you personally purchase new (for a new property or newly added to an existing one) are depreciable under Div 40. New residential properties and commercial properties are unaffected.",
                },
                {
                  title: "Quantity surveyor reports",
                  badge: "Recommended",
                  body: "A registered quantity surveyor (QS) report itemises all depreciable assets and capital works for a property, typically costing $500–$1,000. The fee is tax-deductible. For most investment properties (especially new or nearly new), the annual depreciation claim unlocked by a QS report far exceeds its cost in the first year alone. Firms like BMT Tax Depreciation, Washington Brown, and Deppro specialise in investment property QS reports.",
                },
              ].map((item) => (
                <div key={item.title} className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-extrabold text-slate-900">{item.title}</h3>
                    <span className="shrink-0 text-xs font-semibold bg-orange-100 text-orange-700 px-2 py-1 rounded-full">{item.badge}</span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CGT on sale */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">CGT when selling your investment property</h2>
            <div className="space-y-4">
              {[
                {
                  title: "Calculating your capital gain",
                  body: "Capital Gain = Sale price − Cost base. Your cost base includes: original purchase price, stamp duty, conveyancing and legal fees (purchase and sale), building inspection fees, real estate agent commission on sale, capital improvements made during ownership, and any non-deductible holding costs. It does NOT include costs you have already claimed as deductions (e.g., interest) or Div 43 deductions claimed (which reduce your cost base).",
                },
                {
                  title: "The 50% CGT discount",
                  body: "If you have owned the property for more than 12 months before selling, only 50% of your net capital gain is included in your assessable income. For a $200,000 gain, only $100,000 is taxed. At the 37% marginal rate, that is $37,000 in tax rather than $74,000. The discount applies to individuals and trusts — not companies.",
                },
                {
                  title: "The 6-year main residence rule",
                  body: "If a property was your main residence and you subsequently rented it out, you can treat it as your main residence for CGT purposes for up to 6 continuous years after moving out. Any gain during this period is fully CGT-exempt. The 6-year clock resets if you move back in. This rule can only apply to one property at a time — if you have a new main residence, it cannot apply to the old property simultaneously. This is one of the most valuable CGT concessions for former owner-occupiers who became accidental landlords.",
                },
                {
                  title: "Partial main residence exemption (mixed use)",
                  body: "If a property was your main residence for part of the ownership period and an investment property for the rest, the CGT exemption is apportioned by time. Example: Owned for 10 years, rented for 4 years without the 6-year exemption applying → 60% of the gain is exempt, 40% is assessable (then 50% discount if held 12+ months). Work out the days for precision.",
                },
              ].map((item) => (
                <div key={item.title} className="rounded-xl border border-slate-200 bg-white p-5">
                  <h3 className="font-extrabold text-slate-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Record keeping */}
        <section className="py-10 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">Record keeping requirements</h2>
            <p className="text-sm text-slate-600 mb-4">The ATO requires you to keep records for 5 years after lodging the relevant tax return. For property, this extends to 5 years after the year you dispose of the property (because records are needed for CGT calculations).</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                "All rental income statements from your property manager or rental receipts",
                "Loan statements showing interest charged each month",
                "All expense receipts: insurance, rates, repairs, management fees",
                "Depreciation schedule from your quantity surveyor",
                "Records of capital improvements with invoices and dates",
                "Original purchase contracts, settlement statements, and conveyancing documents",
                "Sale contracts and settlement statements when you eventually sell",
                "Correspondence showing the property was available to rent (vacancy ads)",
              ].map((item) => (
                <div key={item} className="flex gap-2 bg-white rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
                  <span className="flex-shrink-0 text-blue-600 font-bold">→</span>
                  {item}
                </div>
              ))}
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
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">{GENERAL_ADVICE_WARNING}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <Link href="/tax" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Tax hub →</Link>
              <Link href="/tax/negative-gearing" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Negative gearing guide →</Link>
              <Link href="/advisors/tax-agents" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Find a tax agent →</Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
