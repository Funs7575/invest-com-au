import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import ArticleReadingProgress from "@/components/ArticleReadingProgress";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Work From Home Tax Deductions Australia (${CURRENT_YEAR}) — 67c Fixed Rate & Actual Cost`,
  description: `Working from home deductions: 67c/hr fixed rate, actual cost method, equipment depreciation, and ATO record-keeping. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Work From Home Tax Deductions Australia (${CURRENT_YEAR})`,
    description:
      "67c/hr fixed rate, actual cost method, equipment depreciation, sole trader vs employee rules, and what records the ATO requires for 2024–25.",
    url: `${SITE_URL}/tax/work-from-home`,
    images: [
      {
        url: `/api/og?title=${encodeURIComponent("Work From Home Tax Deductions")}&sub=${encodeURIComponent("67c/hr Fixed Rate · Actual Cost · Equipment · " + CURRENT_YEAR)}`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/tax/work-from-home` },
};

// ─── Data ─────────────────────────────────────────────────────────────────────

const METHOD_COMPARISON = [
  {
    item: "Electricity & gas",
    fixed: "Included in 67c/hr rate",
    actual: "Claim actual work-related proportion",
  },
  {
    item: "Internet",
    fixed: "Included in 67c/hr rate",
    actual: "Claim actual work-related proportion",
  },
  {
    item: "Mobile / home phone",
    fixed: "Included in 67c/hr rate",
    actual: "Claim actual work-related portion",
  },
  {
    item: "Stationery & computer consumables",
    fixed: "Included in 67c/hr rate",
    actual: "Claim actual cost (work-related %)",
  },
  {
    item: "Computer / device depreciation",
    fixed: "Claim separately — NOT included",
    actual: "Claim separately — NOT included",
  },
  {
    item: "Office furniture depreciation",
    fixed: "Claim separately — NOT included",
    actual: "Claim separately — NOT included",
  },
  {
    item: "Rent or mortgage interest",
    fixed: "Cannot claim (employees)",
    actual: "Sole traders only — CGT risk applies",
  },
  {
    item: "Council rates & home insurance",
    fixed: "Cannot claim (employees)",
    actual: "Sole traders only — occupancy % only",
  },
  {
    item: "Record keeping required",
    fixed: "Hours log for full year + evidence of expenses",
    actual: "Hours log + full expense receipts + work-% workings",
  },
];

const FAQS = [
  {
    q: "Which work-from-home method gives the biggest deduction?",
    a: "It depends on your actual costs and hours. The fixed rate method (67c/hour) suits most employees with standard running costs — it is simple and requires only an hours log. The actual cost method is more effort but can produce a higher deduction if you have unusually high home running costs, a fast internet plan used mainly for work, or very high electricity usage. As a rough guide: if your total running costs attributable to work exceed 67c per WFH hour, the actual cost method will be more beneficial.",
  },
  {
    q: "Do I need a separate room dedicated to working from home?",
    a: "No — for the fixed rate and actual cost running-expense methods, you do not need a dedicated room. You can work from the kitchen table, a spare bedroom, or anywhere in the home. A dedicated room only becomes relevant if you are a sole trader or home-based business trying to claim occupancy costs (rent, mortgage interest). In that case the ATO requires a dedicated area used exclusively and regularly for business, not available for private use.",
  },
  {
    q: "Can I claim rent or mortgage interest if I work from home?",
    a: "Employees generally cannot claim occupancy costs (rent, mortgage interest, council rates, building insurance). These costs are not deductible simply because your employer allows remote work. The only exception is for genuine home-based businesses (typically sole traders or contractors) who have a dedicated area of the home used exclusively for the business. Even then, claiming occupancy costs triggers a partial loss of the main residence CGT exemption — a proportion of any future capital gain on the home becomes taxable.",
  },
  {
    q: "What records does the ATO require for WFH deductions?",
    a: "From 1 July 2022, the ATO requires a contemporaneous record of actual hours worked from home for the full income year — a 4-week representative diary is no longer accepted. Acceptable records include: a work calendar, diary, timesheet, roster, or technology-generated logs (Microsoft Teams meeting history, Zoom logs, building access records). You must also have evidence that you incurred additional running expenses (utility bills, internet invoices). Under the actual cost method you additionally need receipts and a written basis for each work-use percentage calculation. Keep all records for 5 years after lodging the relevant return.", // dated-ok — static historical/legal effective date (2026-06-11 sweep)
  },
  {
    q: "Can I switch between WFH deduction methods each year?",
    a: "Yes. You can choose a different method each income year. The ATO does not require consistency across years — you simply pick the method that suits your circumstances for that year when lodging your return. You cannot, however, mix methods within the same income year (e.g., using the fixed rate for some months and actual cost for others). Whichever method you choose applies to your entire WFH deduction for that income year.",
  },
];

const DEPRECIATION_ITEMS = [
  { asset: "Laptop / desktop computer", life: "3 years", rate: "~33% per year" },
  { asset: "Monitor", life: "5 years", rate: "~20% per year" },
  { asset: "Printer (home office)", life: "5 years", rate: "~20% per year" },
  { asset: "Smartphone", life: "3 years", rate: "~33% per year" },
  { asset: "Office desk", life: "10 years", rate: "~10% per year" },
  { asset: "Office chair", life: "10 years", rate: "~10% per year" },
  { asset: "Bookshelf / filing cabinet", life: "15 years", rate: "~7% per year" },
];

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function WorkFromHomePage() {
  const faq = faqJsonLd(FAQS);
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Tax", url: absoluteUrl("/tax") },
    { name: "Work From Home Deductions", url: absoluteUrl("/tax/work-from-home") },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      {faq && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }}
        />
      )}

      <div className="bg-white min-h-screen">
      <ArticleReadingProgress />

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section className="bg-slate-900 text-white py-10 md:py-14">
          <div className="container-custom max-w-5xl">
            <nav
              className="flex items-center gap-1.5 text-xs text-slate-400 mb-5"
              aria-label="Breadcrumb"
            >
              <Link href="/" className="hover:text-white">
                Home
              </Link>
              <span className="text-slate-600">/</span>
              <Link href="/tax" className="hover:text-white">
                Tax
              </Link>
              <span className="text-slate-600">/</span>
              <span className="text-white font-medium">Work From Home Deductions</span>
            </nav>

            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-xs font-semibold bg-amber-500 text-slate-900 px-3 py-1 rounded-full">
                {UPDATED_LABEL}
              </span>
              <span className="text-xs font-semibold bg-blue-600 text-white px-3 py-1 rounded-full">
                2024–25 Tax Year
              </span>
            </div>

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-4 max-w-3xl">
              Work From Home Tax Deductions ({CURRENT_YEAR})
            </h1>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-2xl mb-8">
              The ATO offers two methods to claim WFH expenses in 2024–25: the simplified 67 cents
              per hour fixed rate, or the actual cost method for those with higher running costs.
              The 80c shortcut method was permanently removed after 2021–22 and cannot be used.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Fixed rate per hour", value: "67c" },
                { label: "Immediate write-off (≤$300)", value: "100%" },
                { label: "Hours records required", value: "Full year" },
                { label: "Computer effective life", value: "3 years" },
              ].map((s) => (
                <div key={s.label} className="bg-white/10 rounded-xl p-4 text-center">
                  <p className="text-2xl font-extrabold text-amber-400">{s.value}</p>
                  <p className="text-xs text-slate-300 mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Three methods overview ────────────────────────────────────────── */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">
              ATO&rsquo;s three WFH methods — only two are current
            </h2>
            <p className="text-sm text-slate-600 mb-8 max-w-3xl">
              The ATO has offered three methods over the years. For 2024–25, only two remain
              available. Choose one method per income year.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {/* Fixed rate */}
              <div className="rounded-xl border-2 border-amber-400 bg-amber-50 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-bold bg-amber-500 text-slate-900 px-2 py-0.5 rounded-full">
                    Available
                  </span>
                  <h3 className="font-extrabold text-slate-900">Fixed rate method</h3>
                </div>
                <p className="text-3xl font-extrabold text-amber-700 mb-2">67c per hour</p>
                <p className="text-sm text-slate-700 leading-relaxed mb-3">
                  Flat rate covering electricity, gas, internet, phone, stationery, and computer
                  consumables. No need to itemise each expense. Depreciation of assets claimed
                  separately.
                </p>
                <ul className="text-xs text-slate-600 space-y-1">
                  {/* // dated-ok — static historical/legal effective date (2026-06-11 sweep) */}
                  <li>Applies from: 1 July 2022</li>
                  <li>Records: full-year hours log + expense evidence</li>
                  <li>Best for: most WFH employees</li>
                </ul>
              </div>

              {/* Actual cost */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-bold bg-slate-500 text-white px-2 py-0.5 rounded-full">
                    Available
                  </span>
                  <h3 className="font-extrabold text-slate-900">Actual cost method</h3>
                </div>
                <p className="text-sm font-extrabold text-slate-700 mb-2">
                  Actual work-related % of each expense
                </p>
                <p className="text-sm text-slate-700 leading-relaxed mb-3">
                  Claim the exact work proportion of each expense: electricity, internet, phone, and
                  depreciation of equipment. Requires detailed records and a calculation basis for
                  each line item.
                </p>
                <ul className="text-xs text-slate-600 space-y-1">
                  <li>Applies: any year</li>
                  <li>Records: full receipts + work-% workings</li>
                  <li>Best for: high running costs or home-based businesses</li>
                </ul>
              </div>

              {/* Shortcut — removed */}
              <div className="rounded-xl border-2 border-red-300 bg-red-50 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-bold bg-red-600 text-white px-2 py-0.5 rounded-full">
                    Removed
                  </span>
                  <h3 className="font-extrabold text-slate-700">Shortcut method</h3>
                </div>
                <p className="text-3xl font-extrabold text-red-400 mb-2 line-through">80c per hour</p>
                <p className="text-sm text-slate-600 leading-relaxed mb-3">
                  The COVID-era shortcut method (80 cents/hour, all-inclusive) was available only
                  {/* // dated-ok — static historical/legal effective date (2026-06-11 sweep) */}
                  for 2019–20, 2020–21, and 2021–22. It ended on 30 June 2022 and cannot be used
                  in 2024–25.
                </p>
                <p className="text-xs font-bold text-red-800">
                  Do not claim this method — the ATO will adjust your return.
                </p>
              </div>
            </div>

            {/* Methods comparison table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-sm" aria-label="Work from home deduction methods comparison: fixed rate vs actual cost">
                <thead className="bg-slate-100">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left font-extrabold text-slate-700 w-1/3">
                      Expense item
                    </th>
                    <th scope="col" className="px-4 py-3 text-left font-extrabold text-amber-700 w-1/3">
                      Fixed rate (67c/hr)
                    </th>
                    <th scope="col" className="px-4 py-3 text-left font-extrabold text-slate-700 w-1/3">
                      Actual cost method
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {METHOD_COMPARISON.map((r) => (
                    <tr key={r.item} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-900 text-xs">{r.item}</td>
                      <td className="px-4 py-3 text-slate-700 text-xs">{r.fixed}</td>
                      <td className="px-4 py-3 text-slate-700 text-xs">{r.actual}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── Fixed rate method deep-dive ───────────────────────────────────── */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">
              Fixed rate method — 67 cents per hour
            </h2>
            <p className="text-sm text-slate-600 mb-8 max-w-3xl">
              {/* // dated-ok — static historical/legal effective date (2026-06-11 sweep) */}
              The revised fixed rate method applies from 1 July 2022. The 67c/hour rate is a
              composite rate covering five categories of running expense. It replaced the earlier
              52c/hour rate and the COVID shortcut.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <h3 className="font-extrabold text-slate-900 mb-3">What 67c/hr covers</h3>
                <ul className="space-y-2 text-sm text-slate-700">
                  <li className="flex items-start gap-2">
                    <span className="text-amber-500 font-bold mt-0.5">&#10003;</span>
                    <span>
                      <strong>Electricity and gas</strong> — the energy used to power and heat/cool
                      your home office area
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-500 font-bold mt-0.5">&#10003;</span>
                    <span>
                      <strong>Internet costs</strong> — the work-related portion of your home
                      internet plan
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-500 font-bold mt-0.5">&#10003;</span>
                    <span>
                      <strong>Mobile and home phone</strong> — work-related call and data costs
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-500 font-bold mt-0.5">&#10003;</span>
                    <span>
                      <strong>Stationery and computer consumables</strong> — pens, paper, printer
                      cartridges, toner
                    </span>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 mb-3">
                  What you can still claim separately
                </h3>
                <ul className="space-y-2 text-sm text-slate-700">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 font-bold mt-0.5">+</span>
                    <span>
                      <strong>Decline in value of depreciating assets</strong> — laptops, monitors,
                      desks, chairs (see depreciation section below)
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 font-bold mt-0.5">+</span>
                    <span>
                      <strong>Dedicated work phone plan</strong> — a phone plan solely for work
                      calls
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 font-bold mt-0.5">+</span>
                    <span>
                      <strong>Professional subscriptions</strong> — industry association memberships,
                      trade publications, professional software
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 font-bold mt-0.5">+</span>
                    <span>
                      <strong>Repair and replacement</strong> of work equipment you already own
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {[
                {
                  n: "1",
                  title: "Track every WFH hour",
                  body: "Keep a contemporaneous record of each day you work from home and how many hours. A work calendar, timesheet, digital log, or roster all qualify. The ATO no longer accepts a 4-week representative diary for the full year — you must log hours for the entire income year from 1 July.",
                },
                {
                  n: "2",
                  title: "Multiply hours × 67c",
                  body: "Total WFH hours for the year × $0.67 = your running-expense deduction. Example: 705 hours × 67c = $472.35. This single figure replaces having to calculate electricity, internet, and phone proportions individually.",
                },
                {
                  n: "3",
                  title: "Add depreciation on top",
                  body: "The 67c rate does not include the decline in value of home office assets. Claim depreciation for your computer, monitor, desk, and chair in addition to the hourly rate. Keep the original purchase receipt and note the work-use percentage.",
                },
              ].map((step) => (
                <div
                  key={step.n}
                  className="rounded-xl border border-slate-200 bg-white p-5"
                >
                  <div className="w-8 h-8 rounded-full bg-amber-500 text-slate-900 flex items-center justify-center font-extrabold text-sm mb-3">
                    {step.n}
                  </div>
                  <h3 className="font-extrabold text-slate-900 mb-2">{step.title}</h3>
                  <p className="text-sm text-slate-700 leading-relaxed">{step.body}</p>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-amber-300 bg-amber-50 p-5">
              <h3 className="font-extrabold text-amber-900 mb-2">
                Record-keeping change from 2023 — no more 4-week sample
              </h3>
              <p className="text-sm text-amber-900 leading-relaxed">
                {/* // dated-ok — static historical/legal effective date (2026-06-11 sweep) */}
                The ATO confirmed in PCG 2023/1 that from 1 July 2022 onwards, a 4-week
                representative diary is no longer sufficient to substantiate WFH claims under the
                fixed rate method. You must keep a record of{" "}
                <strong>actual hours worked from home for the full income year</strong>. Acceptable
                formats include a digital calendar, work roster, timesheet, building swipe records,
                or technology-generated logs such as Microsoft Teams or Zoom meeting history. Records
                must be kept for 5 years after lodging the relevant return.
              </p>
            </div>
          </div>
        </section>

        {/* ── Actual cost method deep-dive ──────────────────────────────────── */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">
              Actual cost method — calculating each expense
            </h2>
            <p className="text-sm text-slate-600 mb-8 max-w-3xl">
              The actual cost method lets you claim the exact work-related proportion of every
              home running expense. It requires more record keeping but can produce a higher
              deduction if your costs are significant.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="font-extrabold text-slate-900 mb-3">Electricity and gas</h3>
                <p className="text-sm text-slate-700 leading-relaxed mb-3">
                  Two ATO-accepted approaches to calculate your work proportion:
                </p>
                <ol className="space-y-2 text-sm text-slate-700 list-decimal list-inside">
                  <li>
                    <strong>Floor space method:</strong> (Home office m&sup2; &divide; Total home
                    m&sup2;) &times; annual energy bill &times; hours-in-use proportion
                  </li>
                  <li>
                    <strong>ATO formula:</strong> Calculate the cost per hour for each appliance
                    (wattage &times; energy rate) and multiply by WFH hours
                  </li>
                </ol>
                <p className="text-xs text-slate-500 mt-3">
                  Keep full utility bills for the year and document your calculation method.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="font-extrabold text-slate-900 mb-3">Phone and internet</h3>
                <p className="text-sm text-slate-700 leading-relaxed mb-3">
                  Options for calculating the work proportion:
                </p>
                <ul className="space-y-2 text-sm text-slate-700">
                  <li>
                    <strong>Phone — itemise:</strong> Go through one month&rsquo;s bill, identify
                    work calls, calculate the percentage, apply to full year
                  </li>
                  <li>
                    <strong>Phone — 25% rule:</strong> If your plan is bundled and you use the
                    phone for work but can&rsquo;t easily separate, 25% is a commonly accepted
                    work-use estimate for incidental use (ATO guidance)
                  </li>
                  <li>
                    <strong>Internet:</strong> Divide work usage hours by total household usage to
                    get a work proportion; apply that to the annual internet plan cost
                  </li>
                </ul>
                <p className="text-xs text-slate-500 mt-3">
                  Keep at least one representative month&rsquo;s itemised bill and your calculation.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 mb-6">
              <p className="text-sm text-blue-900">
                <strong>Diary requirement:</strong> The actual cost method also requires an hours
                log for the full year. In addition, for electricity and phone, you must keep a
                diary or log for a representative 4-week period to establish the work-use pattern —
                this can then be applied across the full year for those specific expenses. The
                full-year hours log is still needed for the work-proportion calculation.
              </p>
            </div>
          </div>
        </section>

        {/* ── What you can always claim ─────────────────────────────────────── */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">
              What you can always claim — regardless of method
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="font-bold text-emerald-800 mb-3 text-sm uppercase tracking-wide">
                  Claimable
                </h3>
                <ul className="space-y-3 text-sm text-slate-700">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold mt-0.5">&#10003;</span>
                    <span>
                      <strong>Dedicated office phone plan</strong> — a plan solely for work calls,
                      claimable in full (minus private-use proportion)
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold mt-0.5">&#10003;</span>
                    <span>
                      <strong>New equipment purchased for work</strong> — laptop, monitor, headset,
                      webcam; claim as immediate deduction (≤$300) or depreciation (&gt;$300)
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold mt-0.5">&#10003;</span>
                    <span>
                      <strong>Repair and replacement of work equipment</strong> — servicing a work
                      laptop, replacing a broken keyboard; claim in full if used solely for work
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold mt-0.5">&#10003;</span>
                    <span>
                      <strong>Professional subscriptions</strong> — industry association fees, trade
                      journals, LinkedIn Premium (if work-related), professional software
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold mt-0.5">&#10003;</span>
                    <span>
                      <strong>Home office furniture</strong> — desk, chair, shelving; depreciated
                      over effective life; work-use proportion applies if used personally
                    </span>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-bold text-red-700 mb-3 text-sm uppercase tracking-wide">
                  Not claimable
                </h3>
                <ul className="space-y-3 text-sm text-slate-700">
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 font-bold mt-0.5">&#10007;</span>
                    <span>
                      <strong>Coffee, tea, and refreshments</strong> — private expense, not
                      deductible even if consumed while working
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 font-bold mt-0.5">&#10007;</span>
                    <span>
                      <strong>General household items</strong> — cleaning products, toilet paper,
                      general décor; not sufficiently work-related
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 font-bold mt-0.5">&#10007;</span>
                    <span>
                      <strong>Mortgage interest or rent</strong> — employees cannot claim occupancy
                      costs; only genuine home-based businesses (sole traders) can consider this,
                      with CGT consequences
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 font-bold mt-0.5">&#10007;</span>
                    <span>
                      <strong>Personal-use portion of anything</strong> — if you use a laptop 30%
                      personally, only 70% of the depreciation is deductible
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 font-bold mt-0.5">&#10007;</span>
                    <span>
                      <strong>Internet and phone under fixed rate (separately)</strong> — if you
                      choose the 67c/hr fixed rate, you cannot also claim phone and internet as
                      separate line items; they are bundled into the rate
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── Depreciation deep-dive ────────────────────────────────────────── */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">
              Depreciation of home office equipment
            </h2>
            <p className="text-sm text-slate-600 mb-6 max-w-3xl">
              Depreciation (the ATO calls it &ldquo;decline in value&rdquo;) is claimable under
              both WFH methods — it is never included in the 67c/hr rate. Rules differ slightly
              between employees and small business owners.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                <h3 className="font-extrabold text-emerald-900 mb-3">
                  Items ≤$300 — immediate full deduction
                </h3>
                <p className="text-sm text-slate-700 mb-3">
                  For employees, any work-related asset costing $300 or less can be written off
                  in full in the year of purchase. The work-use proportion still applies — a $250
                  keyboard used 80% for work = $200 deduction.
                </p>
                <ul className="text-sm text-slate-600 space-y-1">
                  <li>Keyboard, mouse, webcam, headset</li>
                  <li>USB hub, HDMI cables</li>
                  <li>Small desk lamp or document stand</li>
                  <li>Stationery sets (not covered by fixed rate under actual cost method)</li>
                </ul>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="font-extrabold text-slate-900 mb-3">
                  Items &gt;$300 — depreciate over effective life
                </h3>
                <p className="text-sm text-slate-700 mb-3">
                  For employees, assets over $300 are written down over their ATO-determined
                  effective life. Claim is pro-rated from the date of purchase.
                </p>
                <p className="text-xs text-slate-500">
                  Small business owners (sole traders) may be able to use instant asset write-off
                  for assets under the $20,000 threshold — check current ATO thresholds when lodging.
                </p>
              </div>
            </div>

            {/* Depreciation table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white mb-4">
              <table className="w-full text-sm" aria-label="Home office asset depreciation rates and effective life">
                <thead className="bg-slate-100">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left font-extrabold text-slate-700">Asset</th>
                    <th scope="col" className="px-4 py-3 text-center font-extrabold text-slate-700">
                      Effective life
                    </th>
                    <th scope="col" className="px-4 py-3 text-center font-extrabold text-slate-700">
                      Annual deduction rate
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {DEPRECIATION_ITEMS.map((row) => (
                    <tr key={row.asset} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-slate-900 font-medium text-xs">{row.asset}</td>
                      <td className="px-4 py-3 text-center text-slate-700 text-xs">{row.life}</td>
                      <td className="px-4 py-3 text-center text-slate-700 text-xs">{row.rate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-slate-500">
              Effective lives from ATO Tax Ruling TR 2023/1. Verify current rates at ato.gov.au
              before lodging. Work-use proportion applies to all assets.
            </p>
          </div>
        </section>

        {/* ── Sole traders vs employees ─────────────────────────────────────── */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">
              Sole traders vs employees — different rules apply
            </h2>
            <p className="text-sm text-slate-600 mb-8 max-w-3xl">
              Your employment status significantly changes what you can claim. Sole traders and
              contractors running a home-based business have access to occupancy cost deductions
              that employees do not — but with important CGT consequences.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="font-extrabold text-slate-900 mb-3">Employees</h3>
                <ul className="space-y-2 text-sm text-slate-700">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold mt-0.5">&#10003;</span>
                    <span>Running expenses: electricity, internet, phone, stationery</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold mt-0.5">&#10003;</span>
                    <span>Depreciation of work equipment and furniture</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold mt-0.5">&#10003;</span>
                    <span>Professional subscriptions and work-related memberships</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 font-bold mt-0.5">&#10007;</span>
                    <span>
                      <strong>Cannot claim:</strong> mortgage interest, rent, council rates, home
                      insurance (occupancy costs)
                    </span>
                  </li>
                </ul>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="font-extrabold text-slate-900 mb-3">
                  Sole traders (home is place of business)
                </h3>
                <ul className="space-y-2 text-sm text-slate-700">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold mt-0.5">&#10003;</span>
                    <span>All running expenses as above</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold mt-0.5">&#10003;</span>
                    <span>
                      <strong>Occupancy costs:</strong> proportion of rent, mortgage interest,
                      council rates, and insurance based on floor area used for business
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 font-bold mt-0.5">!</span>
                    <span>
                      <strong>CGT warning:</strong> claiming occupancy costs reduces your main
                      residence CGT exemption. When you sell, a portion of the capital gain on the
                      home becomes taxable.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-slate-500 font-bold mt-0.5">&#8594;</span>
                    <span>
                      Must have a dedicated area used <em>exclusively and regularly</em> for
                      business — not the kitchen table
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="rounded-xl border border-red-300 bg-red-50 p-5">
              <h3 className="font-extrabold text-red-900 mb-2">
                CGT and the partial PPOR exemption loss
              </h3>
              <p className="text-sm text-red-800 leading-relaxed">
                If a sole trader claims occupancy costs (mortgage interest, rent) for a portion of
                their home, the main residence (PPOR) exemption is reduced proportionally when the
                property is eventually sold. The formula is broadly: (business floor area &divide;
                total floor area) &times; (years claimed &divide; years owned) &times; capital gain.
                For a property that appreciates significantly, this partial CGT liability can far
                exceed the annual tax saving from the occupancy deduction. Get tax advice before
                claiming occupancy costs.
              </p>
            </div>
          </div>
        </section>

        {/* ── Worked example ────────────────────────────────────────────────── */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">
              Worked example — tax saving under fixed rate method
            </h2>
            <p className="text-sm text-slate-600 mb-8 max-w-3xl">
              How much does a typical WFH deduction save at different income levels?
            </p>

            <div className="rounded-xl border border-amber-300 bg-amber-50 p-6 max-w-2xl mb-6">
              <h3 className="font-extrabold text-amber-900 mb-4">Scenario: 3 days WFH per week</h3>
              <div className="space-y-2 text-sm text-slate-700 mb-4">
                <div className="flex justify-between">
                  <span>Income</span>
                  <span className="font-bold">$90,000</span>
                </div>
                <div className="flex justify-between">
                  <span>WFH days per week</span>
                  <span className="font-bold">3 days</span>
                </div>
                <div className="flex justify-between">
                  <span>Hours per WFH day</span>
                  <span className="font-bold">5 hours</span>
                </div>
                <div className="flex justify-between">
                  <span>Weeks worked per year</span>
                  <span className="font-bold">47 weeks</span>
                </div>
                <div className="border-t border-amber-200 pt-2 flex justify-between">
                  <span>Total WFH hours</span>
                  <span className="font-bold">3 &times; 5 &times; 47 = 705 hours</span>
                </div>
                <div className="flex justify-between">
                  <span>Fixed rate deduction</span>
                  <span className="font-bold">705 &times; $0.67 = $472.35</span>
                </div>
                <div className="border-t border-amber-200 pt-2 flex justify-between">
                  <span>Marginal tax rate (incl. 2% Medicare)</span>
                  <span className="font-bold">34.5%</span>
                </div>
                <div className="flex justify-between text-base font-extrabold text-amber-900">
                  <span>Estimated tax saving</span>
                  <span>$472.35 &times; 34.5% &#8776; <strong>$163</strong></span>
                </div>
              </div>
              <p className="text-xs text-amber-800">
                This is the running-expense deduction only. Adding depreciation on a $1,500 laptop
                (33%/yr &times; 80% work use = $396/yr) would add a further ~$137 tax saving.
                Total estimated tax saving with equipment: ~$300 per year.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 max-w-2xl">
              <p className="text-xs text-slate-600">
                <strong>Note:</strong> Tax savings are estimates. Actual tax saving depends on your
                full tax position including other deductions, offsets, and adjustments. The example
                uses the 2024–25 tax rates. Verify current rates at ato.gov.au.
              </p>
            </div>
          </div>
        </section>

        {/* ── Common mistakes ───────────────────────────────────────────────── */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">
              Common mistakes the ATO flags
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  title: "Forgetting to log hours daily",
                  body: "The most common error. You cannot reconstruct WFH hours from memory at tax time. Start your hours log on 1 July and maintain it throughout the year. A work calendar with WFH days marked is the simplest approach.",
                },
                {
                  title: "Claiming 100% of internet when shared",
                  body: "If household members use the same internet plan for streaming, gaming, or study, only your proportional work usage is deductible. Claiming 100% is a common trigger for ATO review.",
                },
                {
                  title: "Claiming phone and internet separately under fixed rate",
                  body: "The 67c/hr fixed rate already includes the work-related portion of phone and internet. You cannot claim these expenses again as separate line items if you chose the fixed rate method.",
                },
                {
                  title: "Not tracking depreciating assets separately",
                  body: "Depreciation on your laptop, monitor, desk, and chair is NOT included in the 67c rate — it must be claimed separately. Many taxpayers miss this, leaving significant deductions unclaimed.",
                },
                {
                  title: "Sole traders failing to document home office area",
                  body: "To claim occupancy costs, you must have a dedicated area used exclusively for business. The ATO requires you to know the floor area of the business space and the total home floor area to calculate the proportion.",
                },
                {
                  title: "Employees claiming occupancy costs",
                  body: "Mortgage interest, rent, and council rates are not deductible for employees working from home, even if your employer requires remote work. These are occupancy costs available only to home-based businesses.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-xl border border-red-200 bg-white p-5"
                >
                  <h3 className="font-extrabold text-red-900 mb-2 text-sm">{item.title}</h3>
                  <p className="text-sm text-slate-700 leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Record keeping ────────────────────────────────────────────────── */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">
              Record keeping for WFH claims
            </h2>
            <p className="text-sm text-slate-600 mb-8 max-w-3xl">
              The ATO accepts digital records. You do not need paper receipts — a scanned copy,
              PDF, or bank statement showing the purchase is sufficient. Keep records for
              5 years from the date you lodged the relevant return.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="font-extrabold text-slate-900 mb-3 text-sm">Hours records</h3>
                <ul className="space-y-1.5 text-xs text-slate-700">
                  <li>Work calendar (Outlook, Google Calendar) with WFH days marked</li>
                  <li>Employer-approved timesheet or roster</li>
                  <li>Tech logs: Teams/Zoom meeting history, VPN connection logs</li>
                  <li>Building access / swipe card records (if available)</li>
                </ul>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="font-extrabold text-slate-900 mb-3 text-sm">
                  Expense records (fixed rate)
                </h3>
                <ul className="space-y-1.5 text-xs text-slate-700">
                  <li>Utility bills (electricity, gas) showing amounts paid</li>
                  <li>Internet provider invoices</li>
                  <li>Phone bills for at least one representative month</li>
                  <li>Receipts for stationery, consumables &gt;$300</li>
                  <li>Receipts for equipment (for separate depreciation claim)</li>
                </ul>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="font-extrabold text-slate-900 mb-3 text-sm">
                  Additional records (actual cost)
                </h3>
                <ul className="space-y-1.5 text-xs text-slate-700">
                  <li>Full utility bills for the income year</li>
                  <li>Work-use calculation workings (floor area, time proportions)</li>
                  <li>4-week diary establishing electricity/phone usage pattern</li>
                  <li>Internet plan details and work-vs-personal hours breakdown</li>
                  <li>Floor plan or measurements of home office space</li>
                </ul>
              </div>
            </div>

            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm text-blue-900">
                <strong>ATO myDeductions app:</strong> The ATO&rsquo;s free myDeductions tool
                (within the ATO app) lets you photograph receipts, log work-related travel, and
                track other deductions throughout the year. At tax time you can upload the data
                directly to myTax or send it to your tax agent. A spreadsheet or dedicated expense
                tracking app also works — the format doesn&rsquo;t matter as long as the records
                are contemporaneous and accessible for 5 years.
              </p>
            </div>
          </div>
        </section>

        {/* ── How to set up your claim ──────────────────────────────────────── */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">
              Steps to set up your WFH deduction from 1 July
            </h2>
            <ol className="space-y-4">
              {[
                {
                  step: "Choose your method",
                  detail:
                    "Decide between fixed rate (67c/hr) and actual cost. Fixed rate suits most employees. Actual cost suits those with unusually high running costs or a genuine home-based business. You can review your choice before lodging.",
                },
                {
                  step: "Set up your hours log",
                  detail:
                    'Open a spreadsheet, calendar, or the ATO myDeductions app. Mark every day you work from home and the hours worked. Do this daily — trying to reconstruct at tax time is a common failure point. A simple log like "Mon 12 May – WFH 7.5 hrs" is sufficient.',
                },
                {
                  step: "Start collecting expense records",
                  detail:
                    "If using actual cost, save each utility bill and phone invoice as a PDF. If using fixed rate, keep bills as backup evidence that you incurred the running expenses, and retain receipts for any equipment you purchase.",
                },
                {
                  step: "Track depreciating assets",
                  detail:
                    "Note the purchase date and cost of any work equipment bought during the year. Estimate the work-use percentage. For assets already owned, note the date originally purchased so you can calculate the prior-year depreciation already claimed.",
                },
                {
                  step: "Collate at tax time",
                  detail:
                    "Sum your WFH hours and multiply by 67c (fixed rate) or calculate each expense proportion (actual cost). Add your depreciation calculation. These figures go into the 'Work-related deductions' section of your individual tax return.",
                },
                {
                  step: "Lodge via myTax or a tax agent",
                  detail:
                    "myTax pre-fills many income details but does not auto-calculate WFH deductions — you enter them manually. A registered tax agent can help maximise your claim and identify deductions you may have missed.",
                },
              ].map((item, i) => (
                <li
                  key={item.step}
                  className="flex gap-4 bg-white rounded-xl border border-slate-200 p-5"
                >
                  <div className="w-8 h-8 rounded-full bg-amber-500 text-slate-900 flex items-center justify-center font-extrabold text-sm shrink-0 mt-0.5">
                    {i + 1}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 mb-1">{item.step}</h3>
                    <p className="text-sm text-slate-700 leading-relaxed">{item.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── FAQ ───────────────────────────────────────────────────────────── */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-3xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">
              Frequently asked questions
            </h2>
            <div className="space-y-2">
              {FAQS.map((item) => (
                <details
                  key={item.q}
                  className="group rounded-xl border border-slate-200 bg-slate-50 overflow-hidden"
                >
                  <summary className="flex items-center justify-between gap-3 px-5 py-4 cursor-pointer list-none font-bold text-slate-900 text-sm hover:bg-slate-100 transition-colors">
                    {item.q}
                    <span className="shrink-0 text-slate-400 group-open:rotate-180 transition-transform" aria-hidden="true">
                      &#9660;
                    </span>
                  </summary>
                  <p className="px-5 pb-4 text-sm text-slate-700 leading-relaxed">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ───────────────────────────────────────────────────────────── */}
        <section className="py-12 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
          <div className="container-custom text-center max-w-xl">
            <h2 className="text-xl font-extrabold mb-3">
              WFH claim getting complicated? Talk to a tax agent
            </h2>
            <p className="text-sm text-slate-300 mb-6">
              A registered tax agent can review your WFH hours, identify depreciation deductions
              you may have missed, and ensure your claim is properly substantiated.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/advisors/tax-agents"
                className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm rounded-xl transition-colors"
              >
                Find a Tax Agent &#8594;
              </Link>
              <Link
                href="/tax"
                className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-sm rounded-xl transition-colors"
              >
                Tax Strategy Hub &#8594;
              </Link>
            </div>
          </div>
        </section>

        {/* ── Related links ────────────────────────────────────────────────── */}
        <section className="py-10 bg-slate-50 border-t border-slate-200">
          <div className="container-custom max-w-3xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm mb-8">
              <Link
                href="/tax"
                className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900"
              >
                Tax hub &#8594;
              </Link>
              <Link
                href="/tax/rental-property"
                className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900"
              >
                Rental property tax &#8594;
              </Link>
              <Link
                href="/tax/record-keeping"
                className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900"
              >
                Tax record keeping &#8594;
              </Link>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              {GENERAL_ADVICE_WARNING} Tax information is general in nature. ATO rates, thresholds,
              and rules may change. Verify current requirements with the ATO (ato.gov.au) or a
              registered tax agent.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
