import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

const FAQS = [
  {
    q: "Who actually pays FBT — the employer or the employee?",
    a: "The employer pays FBT. Fringe Benefits Tax is levied on the employer for non-cash benefits they provide to employees or their associates. The employee does not pay FBT directly. However, the cost of FBT is often factored into total remuneration packages, and some employers pass the cost back to employees through reduced salary or package structuring. If the employer does not provide fringe benefits, the employee receives salary or wages instead and pays income tax via PAYG — so FBT and income tax serve as alternative tax collection mechanisms for the same economic benefit.",
  },
  {
    q: "Does FBT affect my income tax return?",
    a: "For most fringe benefits, no — you do not need to include the value of fringe benefits in your personal income tax return or pay extra tax. However, if the total grossed-up value of your fringe benefits exceeds $2,000 in the FBT year, your employer must report a Reportable Fringe Benefits Amount (RFBA) on your income statement. The RFBA is not included in your taxable income (you do not pay income tax on it), but it is included in your 'adjusted taxable income', which affects Medicare Levy Surcharge thresholds, private health insurance rebate tiers, HECS-HELP repayment calculations, and certain government benefit eligibility.",
  },
  {
    q: "What is a reportable fringe benefit amount and how does it affect me?",
    a: "A Reportable Fringe Benefits Amount (RFBA) is the grossed-up value of fringe benefits your employer reports on your income statement when the total exceeds $2,000 for the FBT year. The RFBA is excluded from your taxable income for PAYG purposes — you do not pay income tax on it. However, it is added to your income for calculating: Medicare Levy Surcharge (could trigger 1–1.5% surcharge if you lack private hospital cover), private health insurance rebate tiers, HECS-HELP compulsory repayment thresholds, family tax benefit income tests, and the low income tax offset. Example: $85,000 salary + $10,000 RFBA = $95,000 adjusted taxable income for MLS purposes.",
  },
  {
    q: "Are work laptops and phones subject to FBT?",
    a: "Generally no. Portable electronic devices — laptops, tablets, and mobile phones — provided primarily for work use are exempt from FBT. The exemption covers one device per FBT year for each function (e.g., one laptop and one phone are both exempt in the same year). If an employer provides two laptops of the same function in the same FBT year, only one is exempt. The key condition is that the primary use must be work-related. Tools of trade and briefcases are also exempt. If an employee uses the device substantially for private purposes and the primary purpose is not work, the exemption may not apply.",
  },
  {
    q: "How does a novated lease work with FBT?",
    a: "A novated lease is a three-way agreement between you, your employer, and a finance company. Your employer takes on lease obligations and uses pre-tax salary to pay lease instalments and running costs (fuel, insurance, registration, servicing). The private-use portion of the car creates an FBT liability for your employer. To eliminate this FBT, you typically make a post-tax employee contribution equal to the FBT taxable value ($50,000 car × 20% statutory fraction = $10,000 taxable value). With the post-tax contribution matching the taxable value, FBT is reduced to nil. The benefit is that pre-tax salary funds the lease and running costs — effectively saving you tax at your marginal rate on those amounts.",
  },
  {
    q: "What is the FBT exemption for electric vehicles?",
    a: "From 1 July 2022, eligible zero or low-emission vehicles are exempt from FBT when provided as a car fringe benefit. To qualify: the car must be a zero or low-emission vehicle (battery electric, hydrogen fuel cell, or plug-in hybrid); the value at first retail sale must not exceed the luxury car tax threshold for fuel-efficient vehicles ($89,332 for 2024-25); and the car must be provided to a current employee. This exemption does not apply to plug-in hybrids from 1 April 2025 onwards (they are no longer eligible). The exempt benefit is still reportable — it counts toward the $2,000 RFBA threshold, so it can affect adjusted taxable income calculations even though no FBT is payable.",  // dated-ok
  },
];

const TYPE_ROWS = [
  {
    type: "Type 1",
    meaning: "Employer can claim a GST input tax credit on the benefit",
    grossUp: "2.0802×",
    example: "Company car (employer registered for GST, car has GST component)",
  },
  {
    type: "Type 2",
    meaning: "No GST input tax credit claimable on the benefit",
    grossUp: "1.8868×",
    example: "Loans, accommodation, some entertainment, exempt benefits",
  },
];

const BENEFIT_TYPES = [
  {
    title: "Car fringe benefits",
    badge: "Most common",
    body: "Provided when an employer makes a car available for private use. Two calculation methods: the statutory formula method (taxable value = car cost × statutory fraction of 20%) or the operating cost method (actual cost × private-use %). The statutory formula applies a flat 20% regardless of kilometres driven, making it predictable for budgeting.",
  },
  {
    title: "Car parking fringe benefits",
    badge: "Location-dependent",
    body: "Applies if the employer provides a car parking space at or near the primary place of employment and a commercial parking facility within 1 km of the work premises charges more than $10.40 per day (2024-25 rate). Small business employers with turnover under $10 million and home-garaging arrangements are generally exempt.",
  },
  {
    title: "Loan fringe benefits",
    badge: "Rate-dependent",
    body: "Arises when an employer lends money to an employee at an interest rate below the ATO benchmark rate. The benchmark interest rate for 2024-25 is 7.45% per annum. If an employer lends $50,000 at 0%, the taxable value is $50,000 × 7.45% = $3,725. Common in arrangements involving employer-assisted housing or staff loans.",
  },
  {
    title: "Housing fringe benefits",
    badge: "Common in rural/remote",
    body: "Arises where an employer provides accommodation to an employee. The taxable value is the market rental value of the accommodation less any rent paid by the employee. Remote area housing concessions significantly reduce or eliminate FBT for housing provided in remote locations.",
  },
  {
    title: "Entertainment benefits",
    badge: "Often overlooked",
    body: "Includes meals, functions, alcohol, and entertainment provided to employees. The 50/50 method and actual method are both available. Entertainment provided on business premises on a working day to current employees is a minor benefit and may be exempt. Client entertainment is generally not a fringe benefit but is non-deductible under the entertainment rules.",
  },
  {
    title: "Private health insurance",
    badge: "Salary packaging",
    body: "Where an employer pays private health insurance premiums directly, this is a residual fringe benefit. The taxable value is the premium paid. It is commonly used in NFP salary packaging arrangements where the gross-up and FBT interaction makes it more tax-efficient than the employee paying premiums from after-tax salary.",
  },
];

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Fringe Benefits Tax (FBT) Guide Australia (${CURRENT_YEAR}) — How It Works for Employers & Employees`,
  description:
    "FBT in Australia: 47% rate, Type 1 and 2 gross-up, novated leases, reportable fringe benefits, EV exemption, and exempt benefits explained.",
  alternates: { canonical: `${SITE_URL}/tax/fringe-benefits` },
  openGraph: {
    title: `Fringe Benefits Tax (FBT) Guide Australia (${CURRENT_YEAR})`,
    description:
      "FBT rate, gross-up rates, novated leases, reportable fringe benefits, EV exemption and exempt benefits — complete employer and employee guide.",
    url: `${SITE_URL}/tax/fringe-benefits`,
    images: [
      {
        url: `/api/og?title=${encodeURIComponent("Fringe Benefits Tax (FBT) Guide")}&sub=${encodeURIComponent("47% Rate · Novated Leases · EV Exemption · " + CURRENT_YEAR)}`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
};

export default function FringeBenefitsPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Tax", url: absoluteUrl("/tax") },
    { name: "Fringe Benefits Tax", url: absoluteUrl("/tax/fringe-benefits") },
  ]);
  const faq = faqJsonLd(FAQS);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {faq && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }} />}

      <div className="bg-white min-h-screen">

        {/* Hero */}
        <section className="bg-slate-900 text-white py-10 md:py-14">
          <div className="container-custom max-w-5xl">
            <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-5" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-white">Home</Link>
              <span className="text-slate-600">/</span>
              <Link href="/tax" className="hover:text-white">Tax</Link>
              <span className="text-slate-600">/</span>
              <span className="text-white font-medium">Fringe Benefits Tax</span>
            </nav>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-xs font-semibold bg-amber-500 text-slate-900 px-3 py-1 rounded-full">{UPDATED_LABEL}</span>
              <span className="text-xs font-semibold bg-blue-600 text-white px-3 py-1 rounded-full">FBT Year: 1 Apr &#8211; 31 Mar</span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-4 max-w-3xl">
              Fringe Benefits Tax (FBT) in Australia ({CURRENT_YEAR})
            </h1>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-2xl mb-8">
              FBT is paid by employers on non-cash benefits provided to employees. At 47%, it matches the top marginal income tax rate. Understanding FBT helps employees structure salary packages — and employers manage payroll tax exposure.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "FBT rate", value: "47%" },
                { label: "Type 1 gross-up", value: "2.0802×" },
                { label: "Type 2 gross-up", value: "1.8868×" },
                { label: "RFBA threshold", value: "$2,000" },
              ].map((s) => (
                <div key={s.label} className="bg-white/10 rounded-xl p-4 text-center">
                  <p className="text-2xl font-extrabold text-amber-400">{s.value}</p>
                  <p className="text-xs text-slate-300 mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* What is FBT */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">What is Fringe Benefits Tax?</h2>
            <div className="prose prose-slate max-w-none text-sm leading-relaxed space-y-4 text-slate-700 mb-8">
              <p>
                Fringe Benefits Tax (FBT) is a tax paid by employers on certain non-cash benefits they provide to their employees or the employees&apos; associates (family members). It was introduced to prevent employers and employees from circumventing income tax by replacing salary with non-cash benefits.
              </p>
              <p>
                The FBT year runs from <strong>1 April to 31 March</strong> — different from the standard Australian financial year (1 July to 30 June). Employers must lodge an FBT return and pay any FBT liability by 21 May (or a later date if lodging through a tax agent). The FBT rate is <strong>47%</strong>, intentionally matching the top marginal income tax rate including the Medicare Levy, so that providing a fringe benefit is no more tax-advantageous than paying salary.
              </p>
              <p>
                FBT is calculated on the <strong>grossed-up taxable value</strong> of benefits — not the cost to the employer. The gross-up mechanism accounts for the income tax the employee would have paid if they had received cash instead. This ensures that whether an employee receives $10,000 cash (and pays income tax) or a $10,000 benefit (and the employer pays FBT), the total tax collected by the ATO is broadly equivalent.
              </p>
            </div>

            {/* Key stats cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { v: "47%", l: "FBT rate", sub: "Matches top marginal rate + Medicare" },
                { v: "1 Apr – 31 Mar", l: "FBT year", sub: "Different from financial year" },
                { v: "$2,000", l: "RFBA threshold", sub: "Grossed-up value triggers reporting" },
                { v: "$89,332", l: "EV exemption cap", sub: "Luxury car threshold 2024-25" },
              ].map((s) => (
                <div key={s.l} className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                  <div className="text-xl font-extrabold text-slate-900">{s.v}</div>
                  <div className="text-xs font-bold text-slate-700 mt-0.5">{s.l}</div>
                  <div className="text-xs text-slate-500">{s.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Type 1 vs Type 2 */}
        <section className="py-10 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">Type 1 vs Type 2 benefits</h2>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              Whether a benefit is Type 1 or Type 2 determines the gross-up rate used to calculate FBT. The distinction depends on whether the employer can claim a GST input tax credit on the cost of providing the benefit.
            </p>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-sm" aria-label="FBT Type 1 and Type 2 gross-up rates">
                <thead className="bg-slate-100">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left font-extrabold text-slate-700">Type</th>
                    <th scope="col" className="px-4 py-3 text-left font-extrabold text-slate-700">What it means</th>
                    <th scope="col" className="px-4 py-3 text-right font-extrabold text-amber-700">Gross-up rate</th>
                    <th scope="col" className="px-4 py-3 text-left font-extrabold text-slate-700">Example</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {TYPE_ROWS.map((r) => (
                    <tr key={r.type} className="hover:bg-slate-50">
                      <td className="px-4 py-4 font-extrabold text-slate-900">{r.type}</td>
                      <td className="px-4 py-4 text-slate-700">{r.meaning}</td>
                      <td className="px-4 py-4 text-right font-bold text-amber-700">{r.grossUp}</td>
                      <td className="px-4 py-4 text-slate-600">{r.example}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500 mt-3">
              FBT payable = taxable value &times; gross-up rate &times; 47%. For a $10,000 Type 1 benefit: $10,000 &times; 2.0802 &times; 47% = $9,777. For the same $10,000 as Type 2: $10,000 &times; 1.8868 &times; 47% = $8,868.
            </p>
          </div>
        </section>

        {/* Common benefit types */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">Common types of fringe benefits</h2>
            <div className="space-y-4">
              {BENEFIT_TYPES.map((item) => (
                <div key={item.title} className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-extrabold text-slate-900">{item.title}</h3>
                    <span className="shrink-0 text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-1 rounded-full">{item.badge}</span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Exempt and reduced */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">Exempt benefits and FBT-free salary packaging</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                <h3 className="font-extrabold text-emerald-900 mb-3">Exempt from FBT</h3>
                <ul className="space-y-2 text-sm text-slate-700">
                  <li className="flex gap-2"><span className="text-emerald-600 font-bold shrink-0">&#10003;</span><span>Minor benefits under $300 per occasion (infrequent and irregular — e.g., a Christmas gift)</span></li>
                  <li className="flex gap-2"><span className="text-emerald-600 font-bold shrink-0">&#10003;</span><span>Laptop or portable device provided primarily for work (one per function per year)</span></li>
                  <li className="flex gap-2"><span className="text-emerald-600 font-bold shrink-0">&#10003;</span><span>Briefcases, tools of trade</span></li>
                  <li className="flex gap-2"><span className="text-emerald-600 font-bold shrink-0">&#10003;</span><span>Eligible electric vehicles under $89,332 LMCT (from 1 July 2022)</span></li>  {/* // dated-ok */}
                  <li className="flex gap-2"><span className="text-emerald-600 font-bold shrink-0">&#10003;</span><span>Work-related protective clothing and uniforms</span></li>
                  <li className="flex gap-2"><span className="text-emerald-600 font-bold shrink-0">&#10003;</span><span>Emergency assistance (first aid, emergency accommodation)</span></li>
                </ul>
              </div>
              <div className="rounded-xl border border-purple-200 bg-purple-50 p-5">
                <h3 className="font-extrabold text-purple-900 mb-3">NFP salary packaging caps</h3>
                <p className="text-sm text-slate-700 mb-3 leading-relaxed">
                  Eligible Not-for-Profit (NFP) and charity employees can salary package up to <strong>$15,900 per year</strong> in general living expenses (rent, mortgage, bills) completely FBT-free. Public hospitals and ambulance services have a separate <strong>$17,000 cap</strong>. A further <strong>$2,650</strong> can be packaged for meals and entertainment via a meal entertainment card.
                </p>
                <p className="text-sm text-slate-600">These caps make NFP salary packaging one of the most significant tax benefits available to Australian employees in those sectors.</p>
              </div>
            </div>

            {/* Minor benefits detail */}
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
              <h3 className="font-extrabold text-amber-900 mb-2">Minor benefits exemption — the $300 rule</h3>
              <p className="text-sm text-amber-900 leading-relaxed">
                A benefit is a <strong>minor benefit</strong> (and therefore exempt from FBT) if its taxable value is less than $300 per occasion <em>and</em> it is infrequent and irregular. Common examples: a bottle of wine at Christmas, flowers for a milestone, an end-of-year function ticket. If benefits become regular (e.g., weekly gifts), the minor benefit exemption does not apply even if each individual gift is under $300. The $300 threshold is per benefit per occasion — not an annual aggregate.
              </p>
            </div>
          </div>
        </section>

        {/* Novated lease example */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">Novated leases and FBT: worked example</h2>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              Novated leases are the most popular FBT benefit for employees. Here is how the FBT calculation and employee contribution work together.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 space-y-3">
                <h3 className="font-extrabold text-slate-900">Step-by-step FBT calculation</h3>
                <div className="space-y-2 text-sm">
                  {[
                    { label: "Car cost (GST-inclusive)", value: "$50,000" },
                    { label: "Statutory fraction (all km)", value: "20%" },
                    { label: "Taxable value", value: "$50,000 × 20% = $10,000" },
                    { label: "Gross-up (Type 1)", value: "$10,000 × 2.0802 = $20,802" },
                    { label: "FBT payable (no employee contribution)", value: "$20,802 × 47% = $9,777" },
                  ].map((row) => (
                    <div key={row.label} className="flex justify-between gap-2 border-b border-slate-200 pb-2 last:border-0">
                      <span className="text-slate-600">{row.label}</span>
                      <span className="font-bold text-slate-900 text-right">{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-green-200 bg-green-50 p-5 space-y-3">
                <h3 className="font-extrabold text-green-900">With employee post-tax contribution</h3>
                <div className="space-y-2 text-sm">
                  {[
                    { label: "Taxable value", value: "$10,000" },
                    { label: "Employee post-tax contribution", value: "$10,000" },
                    { label: "Reduced taxable value", value: "$10,000 − $10,000 = $0" },
                    { label: "FBT payable", value: "NIL" },
                    { label: "Employee still benefits from", value: "Pre-tax lease + running costs" },
                  ].map((row) => (
                    <div key={row.label} className="flex justify-between gap-2 border-b border-green-200 pb-2 last:border-0">
                      <span className="text-green-800">{row.label}</span>
                      <span className="font-bold text-green-900 text-right">{row.value}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-green-800 leading-relaxed">
                  By making a post-tax contribution equal to the taxable value, the employee eliminates the employer&apos;s FBT liability while still receiving the pre-tax benefit on lease and running costs (fuel, insurance, registration, servicing).
                </p>
              </div>
            </div>

            {/* EV exemption callout */}
            <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-5">
              <div className="flex items-start gap-3">
                <span className="text-xl shrink-0">&#9889;</span>
                <div>
                  <h3 className="font-extrabold text-blue-900 mb-1">Electric vehicle FBT exemption (from 1 July 2022)</h3>  {/* // dated-ok */}
                  <p className="text-sm text-blue-900 leading-relaxed">
                    Battery electric vehicles (BEVs) and hydrogen fuel cell vehicles with a first retail sale price at or below the luxury car tax threshold for fuel-efficient vehicles (<strong>$89,332 for 2024-25</strong>) are fully exempt from FBT when provided to employees. This makes EVs one of the most tax-effective salary packaging options available. Note: plug-in hybrid electric vehicles (PHEVs) were eligible until 31 March 2025, but are no longer exempt from 1 April 2025. The exempt benefit is still reportable — it counts toward the $2,000 RFBA threshold.  {/* // dated-ok */}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Reportable Fringe Benefits */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">Reportable Fringe Benefits (RFBA) — employee impact</h2>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              When the total grossed-up value of an employee&apos;s fringe benefits exceeds $2,000 in the FBT year, the employer must report a Reportable Fringe Benefits Amount (RFBA) on the employee&apos;s income statement. This has real consequences for the employee even though no additional income tax is levied on the RFBA itself.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="font-extrabold text-slate-900 mb-3">RFBA is NOT included in:</h3>
                <ul className="space-y-2 text-sm text-slate-700">
                  <li className="flex gap-2"><span className="text-green-600 font-bold shrink-0">&#10003;</span><span>Taxable income for PAYG income tax purposes</span></li>
                  <li className="flex gap-2"><span className="text-green-600 font-bold shrink-0">&#10003;</span><span>Super guarantee base (employer SG is not affected)</span></li>
                </ul>
              </div>
              <div className="rounded-xl border border-red-200 bg-red-50 p-5">
                <h3 className="font-extrabold text-red-900 mb-3">RFBA IS included in &ldquo;adjusted taxable income&rdquo; for:</h3>
                <ul className="space-y-2 text-sm text-slate-700">
                  <li className="flex gap-2"><span className="text-red-500 font-bold shrink-0">&#9888;</span><span>Medicare Levy Surcharge threshold ($93,000 singles)</span></li>
                  <li className="flex gap-2"><span className="text-red-500 font-bold shrink-0">&#9888;</span><span>Private health insurance rebate income tiers</span></li>
                  <li className="flex gap-2"><span className="text-red-500 font-bold shrink-0">&#9888;</span><span>HECS-HELP compulsory repayment threshold</span></li>
                  <li className="flex gap-2"><span className="text-red-500 font-bold shrink-0">&#9888;</span><span>Family Tax Benefit income tests</span></li>
                  <li className="flex gap-2"><span className="text-red-500 font-bold shrink-0">&#9888;</span><span>Low income tax offset and low and middle income thresholds</span></li>
                  <li className="flex gap-2"><span className="text-red-500 font-bold shrink-0">&#9888;</span><span>Government co-contribution eligibility</span></li>
                </ul>
              </div>
            </div>

            {/* RFBA example */}
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="font-extrabold text-slate-900 mb-3">Example: Sam&apos;s novated lease and Medicare Levy Surcharge</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                {[
                  { label: "Salary", value: "$85,000", note: "Taxable income" },
                  { label: "RFBA (novated lease)", value: "$10,000", note: "Reported on income statement" },
                  { label: "Adjusted taxable income", value: "$95,000", note: "Used for MLS & rebate tiers" },
                ].map((col) => (
                  <div key={col.label} className="rounded-lg bg-slate-50 p-3 text-center">
                    <div className="text-xs text-slate-500 mb-1">{col.label}</div>
                    <div className="text-xl font-extrabold text-slate-900">{col.value}</div>
                    <div className="text-xs text-slate-500 mt-1">{col.note}</div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                Sam&apos;s taxable income is $85,000 — below the $93,000 Medicare Levy Surcharge singles threshold. However, the $10,000 RFBA lifts adjusted taxable income to $95,000. If Sam does not hold private hospital insurance, the MLS applies at 1% on the full $95,000 adjusted taxable income — an extra $950/year. This can make taking out private hospital cover worthwhile.
              </p>
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
                    <span className="shrink-0 text-slate-500 group-open:rotate-180 transition-transform" aria-hidden="true">&#9660;</span>
                  </summary>
                  <p className="px-5 pb-4 text-sm text-slate-700 leading-relaxed">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Compliance footer */}
        <section className="py-10 bg-slate-50 border-t border-slate-200">
          <div className="container-custom max-w-4xl">
            <div className="rounded-xl border border-slate-200 bg-white p-5 mb-6">
              <p className="text-xs text-slate-500 leading-relaxed">{GENERAL_ADVICE_WARNING}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <Link href="/tax" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">
                Tax hub &#8594;
              </Link>
              <Link href="/tax/salary-sacrifice" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">
                Salary sacrifice guide &#8594;
              </Link>
              <Link href="/tax/work-from-home" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">
                Work from home deductions &#8594;
              </Link>
            </div>
          </div>
        </section>

      </div>
    </>
  );
}
