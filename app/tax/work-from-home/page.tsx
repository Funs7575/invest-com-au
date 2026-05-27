import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

const FAQS = [
  {
    q: "What is the fixed rate method for WFH deductions?",
    a: "The revised fixed rate method allows you to claim 70 cents per hour worked from home. This covers electricity and gas, internet (the work-related portion), mobile and home phone usage, stationery and computer consumables. The 70 cents/hour rate applies from 1 July 2022 onwards. You must keep a record of actual hours worked from home for the full year — a 4-week representative diary is no longer sufficient. You can additionally claim the decline in value (depreciation) of home office equipment separately under this method.",
  },
  {
    q: "Can I still use the actual cost method?",
    a: "Yes. The actual cost method lets you claim the actual work-related portion of each expense separately. This is more complex but potentially higher if you have significant running costs. You need detailed records: electricity and gas bills (work-related %, usually calculated by floor area or time in use), a phone bill showing work vs private use, internet invoices, and records of equipment purchased. Many taxpayers find the 70c/hour fixed rate easier to apply unless they have unusually high home office costs.",
  },
  {
    q: "Can I claim a deduction for my home itself — mortgage interest or rent?",
    a: "Generally no, unless you are running a genuine home-based business with a dedicated work area used exclusively and regularly for business and not available for private use. An employee working from a desk in their bedroom or shared study cannot claim mortgage interest or rent. The deduction for occupancy costs (rent, mortgage interest, council rates) is only available where the home is a genuine place of business — which triggers capital gains tax consequences when the property is eventually sold (the main residence CGT exemption is reduced).",
  },
  {
    q: "What records do I need for WFH deductions?",
    a: "From 1 July 2022, you must keep a record of actual hours worked from home — a contemporaneous diary, timesheet, roster, or digital record (Teams/Zoom logs, building access records). Under the fixed rate method, you also need records showing you incurred additional running expenses (utility bills, internet bills). Under the actual cost method, you need full expense records and a basis for calculating the work-related proportion (e.g., floor area calculation or time-in-use for electricity).",
  },
  {
    q: "Can I claim a new laptop or monitor purchased for WFH?",
    a: "Yes. If you bought equipment (laptop, monitor, desk, chair, keyboard) primarily for work use, you can claim a deduction. For items costing $300 or less, you can claim the full cost immediately. For items over $300, you claim decline in value (depreciation) over the effective life of the asset (typically 3–5 years for computers, 10–15 years for furniture). If the item is also used privately, only the work-related proportion is deductible. Keep the purchase receipt and document the work vs private use split.",
  },
  {
    q: "Does the 70 cents/hour rate cover internet costs?",
    a: "Yes — under the fixed rate method, the 70c/hour rate covers the work-related portion of your internet connection. You cannot claim internet as a separate expense AND also use the fixed rate method. However, if your internet costs are unusually high (e.g., you have a high-speed dedicated connection primarily for work), the actual cost method may be more beneficial. Under the actual cost method, calculate the work-related portion by dividing work hours online by total household usage.",
  },
];

const COMPARISON_ROWS = [
  { item: "Electricity & gas", fixed: "Included in 70c/hr rate", actual: "Claim actual work-related proportion" },
  { item: "Internet", fixed: "Included in 70c/hr rate", actual: "Claim actual work-related proportion" },
  { item: "Mobile/home phone", fixed: "Included in 70c/hr rate", actual: "Claim actual work-related portion" },
  { item: "Stationery/consumables", fixed: "Included in 70c/hr rate", actual: "Claim actual cost (work-related)" },
  { item: "Computer/device depreciation", fixed: "Claim separately (not included)", actual: "Claim separately (not included)" },
  { item: "Office furniture depreciation", fixed: "Claim separately (not included)", actual: "Claim separately (not included)" },
  { item: "Rent or mortgage interest", fixed: "Cannot claim", actual: "Only if genuine home business (CGT risk)" },
];

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Work From Home Tax Deductions Australia (${CURRENT_YEAR}) — Fixed Rate & Actual Cost Methods`,
  description: `How to claim working from home deductions in Australia. 70 cents per hour fixed rate method, actual cost method, equipment depreciation, and ATO record-keeping requirements. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Work From Home Tax Deductions Australia (${CURRENT_YEAR})`,
    description: "70c/hr fixed rate, actual cost method, equipment depreciation, and what records the ATO requires. Updated for the 2024–25 tax year.",
    url: `${SITE_URL}/tax/work-from-home`,
    images: [{ url: `/api/og?title=${encodeURIComponent("Work From Home Tax Deductions")}&sub=${encodeURIComponent("70c/hr Fixed Rate · Actual Cost · Equipment · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/tax/work-from-home` },
};

export default function WorkFromHomePage() {
  const faq = faqJsonLd(FAQS);
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Tax", url: absoluteUrl("/tax") },
    { name: "Work From Home Deductions", url: absoluteUrl("/tax/work-from-home") },
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
              <Link href="/tax" className="hover:text-white">Tax</Link>
              <span className="text-slate-600">/</span>
              <span className="text-white font-medium">Work From Home Deductions</span>
            </nav>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-xs font-semibold bg-amber-500 text-slate-900 px-3 py-1 rounded-full">{UPDATED_LABEL}</span>
              <span className="text-xs font-semibold bg-blue-600 text-white px-3 py-1 rounded-full">2024–25 Tax Year</span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-4 max-w-3xl">
              Work From Home Tax Deductions ({CURRENT_YEAR})
            </h1>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-2xl mb-8">
              Two methods to claim WFH expenses: the simplified 70 cents/hour fixed rate, or the actual cost method for those with higher running costs.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Fixed rate per hour", value: "70c" },
                { label: "Immediate write-off (items ≤$300)", value: "100%" },
                { label: "Records required", value: "Full year" },
                { label: "Computer depreciation", value: "3–5 yr" },
              ].map((s) => (
                <div key={s.label} className="bg-white/10 rounded-xl p-4 text-center">
                  <p className="text-2xl font-extrabold text-amber-400">{s.value}</p>
                  <p className="text-xs text-slate-300 mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Two methods comparison */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">Two methods — choose one per year</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="rounded-xl border-2 border-amber-400 bg-amber-50 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-bold bg-amber-500 text-slate-900 px-2 py-0.5 rounded-full">Simpler</span>
                  <h3 className="font-extrabold text-slate-900">Fixed rate method</h3>
                </div>
                <p className="text-3xl font-extrabold text-amber-700 mb-2">70c per hour</p>
                <p className="text-sm text-slate-700 leading-relaxed mb-3">Flat rate covering electricity, gas, internet, phone, and stationery. No need to calculate each expense separately.</p>
                <p className="text-xs font-bold text-slate-600">Best for: most employees with standard home offices</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-bold bg-slate-500 text-white px-2 py-0.5 rounded-full">More complex</span>
                  <h3 className="font-extrabold text-slate-900">Actual cost method</h3>
                </div>
                <p className="text-sm font-extrabold text-slate-700 mb-2">Actual work-related portion of each expense</p>
                <p className="text-sm text-slate-700 leading-relaxed mb-3">Requires detailed records of all expenses and a calculation of the work-related proportion.</p>
                <p className="text-xs font-bold text-slate-600">Best for: home-based businesses, unusually high running costs</p>
              </div>
            </div>

            {/* Comparison table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-extrabold text-slate-700">Expense item</th>
                    <th className="px-4 py-3 text-left font-extrabold text-amber-700">Fixed rate (70c/hr)</th>
                    <th className="px-4 py-3 text-left font-extrabold text-slate-700">Actual cost method</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {COMPARISON_ROWS.map((r) => (
                    <tr key={r.item}>
                      <td className="px-4 py-3 font-bold text-slate-900">{r.item}</td>
                      <td className="px-4 py-3 text-slate-700">{r.fixed}</td>
                      <td className="px-4 py-3 text-slate-700">{r.actual}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Fixed rate detail */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">Fixed rate method: step by step</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {[
                { n: "1", title: "Track hours worked from home", body: "Keep a contemporaneous record of every hour worked from home throughout the entire income year. The ATO no longer accepts a 4-week representative diary." },
                { n: "2", title: "Multiply by 70 cents", body: "Total work-from-home hours × $0.70 = your deductible amount for running expenses. Example: 1,200 hours × 70c = $840." },
                { n: "3", title: "Add equipment separately", body: "Claim decline in value of your home office computer, monitor, desk, and chair on top of the 70c rate — these are not included in the flat rate." },
              ].map((step) => (
                <div key={step.n} className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="w-8 h-8 rounded-full bg-amber-500 text-slate-900 flex items-center justify-center font-extrabold text-sm mb-3">{step.n}</div>
                  <h3 className="font-extrabold text-slate-900 mb-2">{step.title}</h3>
                  <p className="text-sm text-slate-700 leading-relaxed">{step.body}</p>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
              <h3 className="font-extrabold text-amber-900 mb-2">Record-keeping requirement (key change from 2023)</h3>
              <p className="text-sm text-amber-900 leading-relaxed">
                From 1 July 2022 onwards, the ATO requires a record of <strong>actual hours</strong> worked from home for the full year — not a representative sample. Acceptable records include: a diary, timesheet, work calendar, roster, or technology-generated logs (Teams/Zoom meeting history, building access data, etc.). Keep your records for 5 years after the relevant return.
              </p>
            </div>
          </div>
        </section>

        {/* Equipment deductions */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">Equipment and furniture deductions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                <h3 className="font-extrabold text-emerald-900 mb-3">Items ≤$300 — immediate deduction</h3>
                <ul className="space-y-2 text-sm text-slate-700">
                  <li>Keyboard, mouse, headset, webcam</li>
                  <li>Stationery, printer cartridges (if not covered by fixed rate)</li>
                  <li>Small items purchased solely for work</li>
                  <li>Claim the full cost in the year of purchase (work-related % if also used privately)</li>
                </ul>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="font-extrabold text-slate-900 mb-3">Items &gt;$300 — depreciation over effective life</h3>
                <ul className="space-y-2 text-sm text-slate-700">
                  <li>Laptop / desktop computer: effective life 3 years (33%/yr)</li>
                  <li>Monitor: effective life 5 years (20%/yr)</li>
                  <li>Office desk or chair: effective life 10–15 years (10%/yr)</li>
                  <li>Phone: effective life 3 years (33%/yr)</li>
                  <li>Pro rata in the year of purchase (daily rate × days owned)</li>
                </ul>
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm text-blue-900">
                <strong>Private use adjustment:</strong> If equipment is also used personally (e.g., a laptop used for Netflix and work), only the work-related percentage is deductible. Many employees estimate 80–90% work use for a dedicated work laptop. Keep a record of your estimate and its basis.
              </p>
            </div>
          </div>
        </section>

        {/* Home-based business note */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">Home-based businesses — occupancy costs</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="font-extrabold text-slate-900 mb-3">When occupancy costs are deductible</h3>
                <ul className="space-y-2 text-sm text-slate-700">
                  <li>You run a genuine business from home (not just employment)</li>
                  <li>You have a dedicated area used exclusively for business</li>
                  <li>The area is not available for private use (not the kitchen table)</li>
                  <li>Rent, mortgage interest, council rates — deductible by floor area proportion</li>
                </ul>
              </div>
              <div className="rounded-xl border border-red-200 bg-red-50 p-5">
                <h3 className="font-extrabold text-red-900 mb-3">CGT warning — main residence exemption</h3>
                <p className="text-sm text-slate-700 leading-relaxed">
                  Claiming occupancy costs triggers a reduction in your main residence CGT exemption. When you sell the property, a proportion of the gain (based on the percentage of floor space used for business and the time it was used) will be subject to CGT. This can generate a substantial tax bill at sale. Get advice before claiming occupancy costs.
                </p>
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
                    <span className="shrink-0 text-slate-400 group-open:rotate-180 transition-transform">▼</span>
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
              <Link href="/tax" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">
                Tax hub &#8594;
              </Link>
              <Link href="/tax/rental-property" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">
                Rental property tax &#8594;
              </Link>
              <Link href="/advisors/tax-agents" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">
                Find a tax agent &#8594;
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
