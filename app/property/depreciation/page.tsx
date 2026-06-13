import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 86400;

const FAQS = [
  {
    q: "Do I need a quantity surveyor for depreciation?",
    a: "Yes — the ATO requires a quantity surveyor to estimate construction costs and identify depreciable plant and equipment if you don't have the original builder's contract. You cannot self-estimate these figures. A quantity surveyor prepares a Tax Depreciation Schedule that documents every deductible item and the applicable rates. The schedule costs $700–$1,500 and is itself tax deductible. For most investment properties, the depreciation unlocked in Year 1 alone exceeds the cost of the schedule.",
  },
  {
    q: "Can I claim depreciation on a property built before 1987?",
    a: "For Division 43 (building structure), no. The building must have been constructed on or after 20 September 1987 to be eligible for the 2.5% annual building allowance. Properties built before that date have no Div 43 entitlement. However, if you install new plant and equipment yourself after purchasing the property — for example, a new air conditioner or hot water system — those new items are still claimable under Division 40 regardless of the building's age, provided you are the first owner/installer of those items.",  // dated-ok
  },
  {
    q: "What is the difference between Division 40 and Division 43?",
    a: "Division 43 (capital works) applies to the permanent structure of the building — walls, floors, roof, doors, windows, fixed plumbing, and the like. It is claimed at a flat rate of 2.5% per year on the original construction cost, over a maximum of 40 years. Division 40 (plant and equipment) applies to removable or replaceable items — carpets, hot water systems, dishwashers, air conditioning, blinds, ceiling fans, stoves. Each Div 40 item has its own ATO-determined 'effective life' and depreciates at a higher diminishing-value rate over a shorter period. The 2017 Budget change only affected Div 40 for second-hand properties — Div 43 was not changed.",
  },
  {
    q: "Can I claim depreciation on a property I recently renovated?",
    a: "Yes, in most cases. If you carry out a renovation, the construction costs of the renovation work form the basis of a new Div 43 claim at 2.5% per year from the date the work was completed. New plant and equipment you install as part of the renovation (new carpet, new appliances, new hot water system) are also claimable under Div 40 as you are the first owner of those items. A quantity surveyor should update your depreciation schedule after any significant renovation to capture the new entitlements.",
  },
  {
    q: "How does the 2017 budget change affect second-hand property depreciation?",
    a: "From 7:30pm on 9 May 2017, investors who purchase existing (second-hand) residential properties can no longer claim Division 40 depreciation on plant and equipment that was already installed in the property when they bought it. Only the original owner who first installs an item can claim the Div 40 deduction. This means if you buy an existing house with carpet, a hot water system, and an air conditioner already in place, you get no Div 40 deduction on those items. Division 43 (the building allowance) was not affected by this change — you can still claim 2.5% on the construction cost for post-1987 buildings regardless of whether the property is new or second-hand.",  // dated-ok
  },
  {
    q: "Does depreciation reduce my CGT cost base when I sell?",
    a: "For Division 43 (building allowance), yes — Div 43 deductions you have claimed reduce the cost base of the property for CGT purposes. When you sell, your cost base is lower by the total Div 43 claimed, which increases the capital gain. For Division 40 (plant and equipment), the rules are more complex: the depreciable assets have their own book value at the time of sale, and any remaining value is treated separately from the main property CGT calculation. Given this complexity, an accountant should handle the CGT calculation when you sell a property on which you have claimed depreciation.",
  },
];

const DIV40_ITEMS = [
  { item: "Carpet (residential)", life: "10 years", rate: "20%" },
  { item: "Hot water system (electric)", life: "12 years", rate: "16.67%" },
  { item: "Air conditioning (split system)", life: "10 years", rate: "20%" },
  { item: "Dishwasher", life: "10 years", rate: "20%" },
  { item: "Refrigerator", life: "12 years", rate: "16.67%" },
  { item: "Oven / stove", life: "12 years", rate: "16.67%" },
  { item: "Blinds / curtains", life: "10 years", rate: "20%" },
  { item: "Ceiling fans", life: "20 years", rate: "10%" },
];

export const metadata: Metadata = {
  title: `Property Depreciation Australia (${CURRENT_YEAR}) — Division 40 & 43 Guide`,
  description:
    "How tax depreciation works for Australian investment properties — Div 43 building allowance, Div 40 plant and equipment, and the 2017 rule change.",
  alternates: { canonical: absoluteUrl("/property/depreciation") },
  openGraph: {
    title: `Property Depreciation Australia (${CURRENT_YEAR}) — Div 40 & 43 Explained`,
    description:
      "Complete guide to claiming tax depreciation on Australian investment properties — building allowance, plant and equipment, the 2017 second-hand property rule, and real-world examples.",
    url: absoluteUrl("/property/depreciation"),
    images: [{ url: `/api/og?title=${encodeURIComponent("Property Depreciation Guide")}&sub=${encodeURIComponent("Division 43 · Division 40 · Tax Depreciation Schedule · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
};

export default function PropertyDepreciationPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Property", url: absoluteUrl("/property") },
    { name: "Tax Depreciation", url: absoluteUrl("/property/depreciation") },
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
            <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-5" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-white">Home</Link>
              <span className="text-slate-600">/</span>
              <Link href="/property" className="hover:text-white">Property</Link>
              <span className="text-slate-600">/</span>
              <span className="text-white font-medium">Tax Depreciation</span>
            </nav>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-xs font-semibold bg-amber-500 text-slate-900 px-3 py-1 rounded-full">Updated {CURRENT_YEAR}</span>
              <span className="text-xs font-semibold bg-orange-600 text-white px-3 py-1 rounded-full">Non-cash deduction</span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-3 max-w-3xl">
              Property Depreciation: Division 40 &amp; 43 Explained
            </h1>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-3xl">
              Tax depreciation is one of the most valuable deductions available to Australian property investors — and one of the most misunderstood. This guide covers how Division 43 and Division 40 work, the critical 2017 rule change for second-hand properties, and what you can expect to claim.
            </p>
          </div>
        </section>

        {/* Key Stats */}
        <section className="bg-white py-8 border-b border-slate-100">
          <div className="container-custom">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { v: "2.5%", l: "Division 43 rate", sub: "Per year on construction cost" },
                { v: "40 years", l: "Maximum Div 43 claim period", sub: "From original construction date" },
                { v: "$700–$1,500", l: "Typical QS schedule cost", sub: "Itself tax deductible" },
                { v: "May 2017", l: "Second-hand rule change", sub: "No Div 40 on existing P&E" },
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

        {/* What is property depreciation */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">What is property depreciation?</h2>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed mb-4">
              When you own an investment property, the building and its fixtures decline in value over time through normal wear and tear. The ATO allows you to claim this decline as a tax deduction — even though you are not spending any money in the year you claim it. This makes depreciation a <strong className="text-slate-800">non-cash deduction</strong>: it reduces your taxable income without requiring a cash outlay in that year.
            </p>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed mb-6">
              There are two separate categories of depreciation for investment properties:
            </p>
            <div className="grid md:grid-cols-2 gap-4 mb-8">
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
                <span className="inline-block text-xs font-bold bg-blue-600 text-white px-2 py-0.5 rounded mb-2">Division 43</span>
                <h3 className="font-extrabold text-blue-900 mb-2">Building Allowance (Capital Works)</h3>
                <p className="text-sm text-blue-800 leading-relaxed">The building structure — walls, floors, roof, windows, doors, fixed plumbing. Claimed at 2.5% per year on the original construction cost. Available for buildings built on or after 20 September 1987.</p>  {/* // dated-ok */}
              </div>
              <div className="rounded-xl border border-violet-200 bg-violet-50 p-5">
                <span className="inline-block text-xs font-bold bg-violet-600 text-white px-2 py-0.5 rounded mb-2">Division 40</span>
                <h3 className="font-extrabold text-violet-900 mb-2">Plant &amp; Equipment</h3>
                <p className="text-sm text-violet-800 leading-relaxed">Removable and replaceable items — carpet, hot water system, dishwasher, air conditioning, blinds, ceiling fans, stove. Each item depreciates at its own rate set by the ATO based on its effective life.</p>
              </div>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
              <h3 className="font-extrabold text-amber-900 mb-2">Tax Depreciation Schedule</h3>
              <p className="text-sm text-amber-800 leading-relaxed">
                To claim depreciation correctly, a <strong>registered quantity surveyor</strong> prepares a Tax Depreciation Schedule that identifies all claimable items and calculates the applicable deductions year by year. The ATO requires this — you cannot estimate or self-assess construction costs or plant values. The schedule typically costs $700–$1,500 depending on property type and size, and the fee itself is tax deductible in the year you pay it. Once prepared, the schedule lasts the life of the property (unless you undertake major renovations, which warrant an update).
              </p>
            </div>
          </div>
        </section>

        {/* Division 43 */}
        <section className="py-10 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">Division 43 — Building Allowance</h2>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-6">Capital works deduction on the structure</p>
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="font-extrabold text-slate-900 mb-2">What it covers</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Division 43 applies to the permanent structure of the building — walls, floors, ceilings, roof, windows, doors, internal and external staircases, fixed wiring, fixed plumbing, driveways, and in-ground swimming pools. These are assets that form part of the property itself and cannot be removed without significant damage.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="font-extrabold text-slate-900 mb-2">Rate and claim period</h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-3">
                  The deduction rate is <strong className="text-slate-800">2.5% per year</strong> using the straight-line method. This is applied to the original construction cost — not the land value, and not the price you paid when you bought the property. The maximum claim period is <strong className="text-slate-800">40 years</strong> from the date construction was completed.
                </p>
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 text-sm text-slate-700">
                  <p className="font-bold mb-1">Example:</p>
                  <p>Building constructed in 2010, original construction cost $400,000.</p>
                  <p className="mt-1">Annual Div 43 deduction: $400,000 &times; 2.5% = <strong>$10,000 per year</strong></p>
                  <p className="mt-1 text-slate-500">Claimable from 2010 to 2050 (40 years). If you buy the property in 2024, you can claim 26 remaining years of the 40-year period.</p>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="font-extrabold text-slate-900 mb-2">Eligibility: the 1987 date rule</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  The building must have been constructed on or after <strong className="text-slate-800">20 September 1987</strong> to be eligible for Division 43 deductions. Properties built before this date have no entitlement to the building allowance — no matter when you purchased the property. If you are unsure of the construction date, a quantity surveyor can determine it from council records and other sources.  {/* // dated-ok */}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="font-extrabold text-slate-900 mb-2">Establishing the construction cost</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  You need the original construction cost — not the land value, not the price you paid. If you have the original builder&apos;s contract for a property you built yourself, that document establishes the construction cost. For a property you purchased second-hand, a quantity surveyor will estimate the original construction cost using industry cost indices, comparable projects, and available records. This estimate forms the basis for your Div 43 claim.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="font-extrabold text-slate-900 mb-2">CGT interaction</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Division 43 deductions you claim are <strong className="text-slate-800">not added back to your cost base</strong> when you sell the property. In practice, every dollar of Div 43 you claim reduces your CGT cost base by one dollar, increasing your capital gain on sale. This is the trade-off: depreciation reduces tax now, but increases CGT later. The 50% CGT discount (for assets held 12+ months) typically makes this trade-off worthwhile.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Division 40 */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">Division 40 — Plant &amp; Equipment</h2>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-6">Depreciable assets at their own effective life rates</p>

            <p className="text-sm md:text-base text-slate-600 leading-relaxed mb-6">
              Division 40 applies to removable or replaceable items within the property. Each item has an ATO-determined &quot;effective life&quot; — the period over which it is expected to be useful — and depreciates at a diminishing value rate derived from that life. The ATO publishes effective lives in Tax Ruling TR 2023/1.
            </p>

            {/* Common items table */}
            <div className="rounded-xl border border-slate-200 overflow-hidden mb-8">
              <div className="bg-slate-900 text-white px-5 py-3">
                <h3 className="font-extrabold text-sm">Common plant &amp; equipment items (ATO TR 2023/1)</h3>
              </div>
              <div className="overflow-x-auto">
                <table aria-label="Common plant and equipment depreciation items under ATO TR 2023/1" className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th scope="col" className="text-left px-5 py-3 font-bold text-slate-700">Item</th>
                      <th scope="col" className="text-left px-5 py-3 font-bold text-slate-700">ATO effective life</th>
                      <th scope="col" className="text-left px-5 py-3 font-bold text-slate-700">Diminishing value rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {DIV40_ITEMS.map((row) => (
                      <tr key={row.item} className="hover:bg-slate-50">
                        <td className="px-5 py-3 text-slate-800">{row.item}</td>
                        <td className="px-5 py-3 text-slate-600">{row.life}</td>
                        <td className="px-5 py-3 font-semibold text-amber-700">{row.rate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 text-xs text-slate-500">
                Rates shown are diminishing value. Prime cost (straight-line) rates are lower. Rates sourced from ATO Tax Ruling TR 2023/1.
              </div>
            </div>

            {/* 2017 rule change callout */}
            <div className="rounded-xl border border-red-200 bg-red-50 p-5 mb-6">
              <div className="flex items-start gap-3">
                <span className="shrink-0 text-xs font-bold bg-red-600 text-white px-2 py-1 rounded mt-0.5">Important</span>
                <div>
                  <h3 className="font-extrabold text-red-900 mb-2">2017 Budget Rule Change — Second-Hand Properties</h3>
                  <p className="text-sm text-red-800 leading-relaxed mb-3">
                    From <strong>7:30pm on 9 May 2017</strong> (Federal Budget night), investors who purchase existing residential properties can no longer claim Division 40 depreciation on plant and equipment that was already installed in the property at the time of purchase.  {/* // dated-ok */}
                  </p>
                  <ul className="space-y-1.5 text-sm text-red-800">
                    <li className="flex gap-2"><span className="shrink-0 font-bold text-red-600">&#x2717;</span>You buy an existing house with carpet, hot water system, and dishwasher already installed — <strong>no Div 40 on those items</strong></li>
                    <li className="flex gap-2"><span className="shrink-0 font-bold text-emerald-600">&#x2713;</span>You install a brand-new air conditioner yourself after purchase — <strong>Div 40 claimable</strong> (you are the first owner)</li>
                    <li className="flex gap-2"><span className="shrink-0 font-bold text-emerald-600">&#x2713;</span>You buy a brand-new apartment off the plan — <strong>full Div 40 available</strong> on all plant and equipment</li>
                    <li className="flex gap-2"><span className="shrink-0 font-bold text-emerald-600">&#x2713;</span>Division 43 (building allowance) was <strong>not affected</strong> by this change</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Low-value pooling */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="font-extrabold text-slate-900 mb-2">Low-value pooling</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Individual plant and equipment items that cost less than $1,000 (low-cost assets) can be grouped into a <strong className="text-slate-800">low-value pool</strong> rather than depreciated individually. The pool is depreciated at <strong className="text-slate-800">37.5% in the first year</strong>, then at <strong className="text-slate-800">25% per year diminishing value</strong> thereafter. This simplifies the annual calculation when a property has many small items (smoke detectors, door hardware, light fittings, etc.).
              </p>
            </div>
          </div>
        </section>

        {/* Worked examples */}
        <section className="py-10 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">Worked examples — new vs second-hand property</h2>
            <div className="grid md:grid-cols-2 gap-6">

              {/* New apartment */}
              <div className="rounded-xl border border-emerald-200 bg-white overflow-hidden">
                <div className="bg-emerald-700 text-white px-5 py-3">
                  <h3 className="font-extrabold text-sm">New apartment — purchased 2024</h3>
                </div>
                <div className="p-5 space-y-3 text-sm">
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-600">Purchase price</span>
                    <span className="font-bold text-slate-900">$600,000</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-600">Land value (not depreciable)</span>
                    <span className="font-bold text-slate-500">$100,000</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-600">Building — Div 43 ($350k &times; 2.5%)</span>
                    <span className="font-bold text-emerald-700">$8,750/yr</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-600">Plant &amp; equipment — Div 40 (new items ~$25k)</span>
                    <span className="font-bold text-emerald-700">~$4,500/yr</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-3">
                    <span className="font-bold text-slate-800">Total Year 1 depreciation</span>
                    <span className="font-extrabold text-emerald-800">~$13,250</span>
                  </div>
                  <div className="flex justify-between rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2">
                    <span className="font-bold text-emerald-900">Tax saving at 37% rate</span>
                    <span className="font-extrabold text-emerald-800">~$4,900/yr</span>
                  </div>
                  <p className="text-xs text-slate-500 pt-1">Full Div 40 available — new construction, all items first installed by current owner.</p>
                </div>
              </div>

              {/* Existing house */}
              <div className="rounded-xl border border-orange-200 bg-white overflow-hidden">
                <div className="bg-orange-700 text-white px-5 py-3">
                  <h3 className="font-extrabold text-sm">Existing house (built 1995) — purchased 2024</h3>
                </div>
                <div className="p-5 space-y-3 text-sm">
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-600">Purchase price</span>
                    <span className="font-bold text-slate-900">$800,000</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-600">Land value (not depreciable)</span>
                    <span className="font-bold text-slate-500">$300,000</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-600">Building — Div 43 ($500k &times; 2.5%)</span>
                    <span className="font-bold text-emerald-700">$12,500/yr</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-600">Existing carpet, HWS, etc. — Div 40</span>
                    <span className="font-bold text-red-600">$0 — post-2017 rule</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-600">New A/C installed by owner ($6k &times; 20%)</span>
                    <span className="font-bold text-emerald-700">~$1,200/yr</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-3">
                    <span className="font-bold text-slate-800">Total Year 1 depreciation</span>
                    <span className="font-extrabold text-orange-800">~$13,700</span>
                  </div>
                  <div className="flex justify-between rounded-lg bg-orange-50 border border-orange-200 px-3 py-2">
                    <span className="font-bold text-orange-900">Tax saving at 37% rate</span>
                    <span className="font-extrabold text-orange-800">~$5,070/yr</span>
                  </div>
                  <p className="text-xs text-slate-500 pt-1">Div 43 available because built 1995 (post-1987). No Div 40 on second-hand items under 2017 rules. New owner-installed items still claimable.</p>
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-4">
              Examples are illustrative. Land value allocation, actual construction cost, and the value of existing plant items will vary. Consult a quantity surveyor and tax agent for figures specific to your property.
            </p>
          </div>
        </section>

        {/* Quantity surveyor section */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">Who prepares the depreciation schedule?</h2>
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="font-extrabold text-slate-900 mb-2">ATO requirement for a quantity surveyor</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Tax Ruling TR 97/25 (confirmed by subsequent guidance) requires that construction costs for Division 43 claims be determined by a <strong className="text-slate-800">qualified quantity surveyor</strong> when the original builder&apos;s contract is not available. You cannot estimate the figures yourself, and your accountant cannot estimate them either — it must be a quantity surveyor with the required qualifications. The Australian Institute of Quantity Surveyors (AIQS) maintains a directory of members.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="font-extrabold text-slate-900 mb-2">What the schedule contains</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  A Tax Depreciation Schedule identifies and values all depreciable items in the property — the construction cost (for Div 43) and each individual plant and equipment item (for Div 40). It sets out the deductible amount for each item for each year of the projection period, typically 40 years. Your accountant uses this schedule to complete the depreciation section of your tax return each year without needing to re-engage the quantity surveyor.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="font-extrabold text-slate-900 mb-2">Cost and tax deductibility</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  A depreciation schedule typically costs <strong className="text-slate-800">$700–$1,500</strong> depending on the property type, size, and location. The fee is tax deductible in the year you pay it, as it is an expense incurred in managing your investment property. For most properties, the tax saved from just the first year of depreciation claims more than covers the cost of the schedule.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="font-extrabold text-slate-900 mb-2">When to update the schedule</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  The original schedule lasts the life of the property — there is no need to renew it annually. However, if you carry out significant renovations, add new plant items, or make capital improvements, the schedule should be updated by the quantity surveyor to reflect the new depreciable assets. The cost of an update is generally lower than a full new schedule.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CGT implications */}
        <section className="py-10 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">When depreciation reverses — CGT implications</h2>
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="font-extrabold text-slate-900 mb-2">Division 43 and CGT cost base</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Every dollar of Division 43 (building allowance) you claim during ownership reduces your CGT cost base by one dollar. This means that when you sell, the capital gain is higher by the cumulative amount of Div 43 claimed. There is no separate &quot;depreciation recapture&quot; tax as in some other jurisdictions — the cost-base reduction achieves the same effect. The 50% CGT discount applies to the whole gain, including the portion attributable to Div 43 deductions claimed (provided you&apos;ve held the property for 12+ months).
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="font-extrabold text-slate-900 mb-2">Division 40 and plant disposal</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  When you sell the property, plant and equipment items that have been depreciated under Division 40 are treated separately. The remaining book value of each item (the undepreciated balance) forms part of the tax calculation on disposal. If the sale price allocated to an item exceeds its book value, the difference is assessable income (a &quot;balancing adjustment&quot;). If the sale price is below book value, a deductible loss arises. Because allocating proceeds between building, land, and individual plant items is complex, an accountant with investment property experience should manage the CGT calculation for any property on which Div 40 has been claimed.
                </p>
              </div>
              <div className="rounded-xl border border-amber-100 bg-amber-50 p-5">
                <h3 className="font-extrabold text-amber-900 mb-2">The overall trade-off</h3>
                <p className="text-sm text-amber-800 leading-relaxed">
                  Depreciation deductions are taxed at your full marginal rate during the holding period (because they reduce assessable income now). The resulting higher capital gain is taxed at effectively half your marginal rate (50% CGT discount). This asymmetry — deductions at full rate, gain at half rate — generally makes claiming depreciation financially advantageous over the long term, all else being equal.
                </p>
              </div>
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
            <div className="rounded-xl border border-slate-200 bg-white p-5 mb-6">
              <p className="text-xs text-slate-500 leading-relaxed">{GENERAL_ADVICE_WARNING}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <Link href="/property" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Property hub &#x2192;</Link>
              <Link href="/tax/rental-property" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Rental property tax guide &#x2192;</Link>
              <Link href="/tax/negative-gearing" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Negative gearing guide &#x2192;</Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
