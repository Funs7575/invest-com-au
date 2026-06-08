import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Salary Sacrifice Australia (${CURRENT_YEAR}) — How It Works, Tax Savings & Examples`,
  description: `Salary sacrifice in Australia: super, novated leases, FBT-exempt devices, and the $30k concessional cap. Worked examples. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Salary Sacrifice Australia (${CURRENT_YEAR}) — Complete Guide`,
    description:
      "How salary sacrifice works: super at 15% vs your marginal rate, novated leases, FBT-exempt items, worked examples, and setup with your employer.",
    url: `${SITE_URL}/tax/salary-sacrifice`,
    images: [{ url: `/api/og?title=${encodeURIComponent("Salary Sacrifice Australia")}&sub=${encodeURIComponent("Super · Novated Lease · Tax Savings · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/tax/salary-sacrifice` },
};

/* ── Hero stat callouts ───────────────────────────────────────── */
const KEY_STATS = [
  { value: "$30,000", label: "Concessional cap (2024-25)", sub: "Includes employer SG + sacrifice" },
  { value: "15%", label: "Super contributions tax", sub: "vs up to 47% marginal rate" },
  { value: "11.5%", label: "Super Guarantee (2024-25)", sub: "Counts toward the concessional cap" },
  { value: "$0 FBT", label: "Eligible electric vehicles", sub: "Novated EV lease under the LCT threshold" },
];

/* ── Common salary-sacrifice items ────────────────────────────── */
const SACRIFICE_ITEMS = [
  {
    item: "Additional superannuation",
    treatment: "Concessional contribution",
    tax: "15% in the fund",
    note: "The most common and most flexible benefit. Taxed at 15% inside super instead of your marginal rate. Counts toward the $30,000 concessional cap alongside employer SG.",
  },
  {
    item: "Novated car lease",
    treatment: "FBT applies (or EV exemption)",
    tax: "Pre-tax lease + running costs",
    note: "Lease payments and running costs come from pre-tax salary. Fringe Benefits Tax normally applies, managed via the statutory formula or the Employee Contribution Method. Eligible electric vehicles under the luxury car tax threshold are FBT-exempt.",
  },
  {
    item: "Laptops & portable electronic devices",
    treatment: "FBT-exempt (work-related)",
    tax: "Full pre-tax benefit",
    note: "One work-related portable electronic device per year (laptop, tablet, phone) is FBT-exempt, so the entire cost comes out of pre-tax salary with no FBT bill.",
  },
  {
    item: "Professional memberships & subscriptions",
    treatment: "Otherwise-deductible",
    tax: "Full pre-tax benefit",
    note: "Industry body fees, professional registrations and work-related subscriptions are generally FBT-exempt under the otherwise-deductible rule — you would have claimed them as a deduction anyway.",
  },
  {
    item: "Work-related self-education",
    treatment: "Otherwise-deductible",
    tax: "Full pre-tax benefit",
    note: "Course fees with a sufficient connection to your current employment can be packaged FBT-free under the otherwise-deductible rule. Courses to get a new job do not qualify.",
  },
  {
    item: "Tools of trade & protective items",
    treatment: "FBT-exempt",
    tax: "Full pre-tax benefit",
    note: "Tools of trade, protective clothing and briefcases used primarily for work are FBT-exempt, delivering the full pre-tax saving.",
  },
];

/* ── Worked example: $10k sacrificed at multiple income levels ──── */
const INCOME_EXAMPLES = [
  {
    income: "$60,000",
    mtr: "32.5% + 2%",
    takeHomeCut: "$6,550",
    taxSaved: "$3,450",
    superTax: "$1,500",
    netBenefit: "$1,950",
  },
  {
    income: "$90,000",
    mtr: "32.5% + 2%",
    takeHomeCut: "$6,550",
    taxSaved: "$3,450",
    superTax: "$1,500",
    netBenefit: "$1,950",
  },
  {
    income: "$120,000",
    mtr: "37% + 2%",
    takeHomeCut: "$6,100",
    taxSaved: "$3,900",
    superTax: "$1,500",
    netBenefit: "$2,400",
  },
  {
    income: "$180,000",
    mtr: "45% + 2%",
    takeHomeCut: "$5,300",
    taxSaved: "$4,700",
    superTax: "$1,500",
    netBenefit: "$3,200",
  },
];

/* ── When salary sacrifice does NOT help ──────────────────────── */
const WHEN_NOT = [
  {
    title: "You are on a low income",
    body: "If your taxable income is at or below the $18,200 tax-free threshold (or in the 16% bracket), you pay little or no income tax — so converting income to a 15% super contribution can actually cost you. The low-income super tax offset can refund some of the 15%, but the headline saving disappears.",
  },
  {
    title: "You need the cash flow now",
    body: "Super is preserved until you reach preservation age (60) and meet a condition of release. Sacrificing money you need for a deposit, debt repayment or living costs in the next few years locks it away. Only sacrifice what you can do without.",
  },
  {
    title: "It pushes you below a benefit threshold",
    body: "Reducing taxable income can occasionally cost more than it saves — for example by reducing borrowing capacity when applying for a mortgage, because lenders assess on the post-sacrifice income.",
  },
  {
    title: "A novated lease when you drive very little",
    body: "Running costs are bundled into a novated lease and you commit to a fixed term. If you drive very few kilometres, the FBT and finance costs can outweigh the pre-tax benefit versus simply owning a cheap car outright.",
  },
];

/* ── Setting it up ────────────────────────────────────────────── */
const SETUP_STEPS = [
  {
    step: "1",
    title: "Talk to payroll or HR",
    body: "Ask whether your employer offers salary sacrifice and which benefits are available. Larger employers often use a salary packaging provider; smaller employers may only offer super.",
  },
  {
    step: "2",
    title: "Complete a salary sacrifice agreement",
    body: "Put the arrangement in writing. Specify the dollar amount or percentage to sacrifice, the benefit it is directed to (e.g. super), and the start date.",
  },
  {
    step: "3",
    title: "Confirm it is prospective",
    body: "The agreement must apply to income you have not yet earned. You cannot sacrifice salary, a bonus or leave that you are already entitled to receive — that income is already assessable.",
  },
  {
    step: "4",
    title: "Check your SG base is protected",
    body: "Since 1 January 2020 employers must calculate the super guarantee on your pre-sacrifice ordinary time earnings. Reducing the SG base because you salary sacrifice is illegal — confirm your payslip still shows SG on the full salary.",
  },
  {
    step: "5",
    title: "Review at least annually",
    body: "Re-check the amount each year against the concessional cap, indexation and any change in your income. Adjust the agreement in writing if your circumstances change.",
  },
];

/* ── Impact on other entitlements ─────────────────────────────── */
const ENTITLEMENT_IMPACTS = [
  {
    item: "Government super co-contribution",
    direction: "Can help",
    detail: "Salary sacrifice lowers your assessable income, which may bring you under the co-contribution income test. Note that salary-sacrificed amounts are concessional and do not themselves attract the co-contribution — only personal after-tax contributions do.",
  },
  {
    item: "Division 293 tax",
    direction: "Watch out",
    detail: "If your income plus concessional contributions exceeds $250,000, an extra 15% Division 293 tax applies to the contributions over the threshold — lifting the effective contributions tax to 30% (still below the 47% marginal rate).",
  },
  {
    item: "HECS/HELP repayments",
    direction: "Adds back",
    detail: "Reportable super contributions (including salary sacrifice) are added back to your income for HELP repayment purposes. Salary sacrificing into super does not reduce your compulsory study loan repayment.",
  },
  {
    item: "Private health insurance rebate",
    direction: "Adds back",
    detail: "The rebate and the Medicare Levy Surcharge use income for surcharge purposes, which adds reportable super contributions back. Salary sacrifice generally will not move you into a more favourable rebate tier.",
  },
  {
    item: "Family Tax Benefit & other payments",
    direction: "Adds back",
    detail: "Adjusted taxable income for family assistance and many Centrelink tests adds back reportable fringe benefits and reportable super contributions, so salary packaging usually does not increase these payments.",
  },
];

/* ── Long-form guide sections (prose) ─────────────────────────── */
const SECTIONS = [
  {
    id: "how-it-works",
    heading: "How salary sacrifice works",
    body: `Salary sacrifice — also called salary packaging — is an arrangement where you agree with your employer to give up part of your pre-tax salary in return for a benefit of similar value. The classic example is directing extra money into your superannuation, but it can also fund a novated car lease, a work laptop, professional memberships or, for some employers, everyday living expenses.

The defining feature is that the arrangement is made before you earn the income. Your employer pays the sacrificed amount directly to the benefit (your super fund, the lease provider, and so on) out of pre-tax salary. Because that money never lands in your pay as assessable income, your PAYG withholding falls and your taxable income is lower.

This is the critical legal requirement: a valid salary sacrifice arrangement must be prospective. You cannot sacrifice salary, a bonus, commission or accrued leave that you are already entitled to receive — once you have earned income it is assessable to you, and re-directing it afterwards does not change the tax outcome. Set the agreement up before the relevant pay period begins.`,
  },
  {
    id: "super-deep-dive",
    heading: "Salary sacrifice into super — the deep dive",
    body: `Sacrificing into super is the most common arrangement because the maths is simple and powerful. Money you sacrifice is treated as a concessional (before-tax) contribution and is taxed at just 15% inside the fund, instead of at your marginal rate of up to 47% (including the 2% Medicare Levy).

Concessional contributions count toward a single annual cap. For 2024-25 the concessional contributions cap is $30,000 per person, and it includes everything that goes in before tax: your employer's compulsory Super Guarantee (11.5% in 2024-25), any amount you salary sacrifice, and any personal contributions you claim a tax deduction for. You need to leave room for the SG when deciding how much to sacrifice.

Worked example. Sayid earns $100,000 and sacrifices $10,000 into super. His marginal rate is 30% plus 2% Medicare Levy. Sacrificing $10,000 means $10,000 of income is no longer taxed at 32% — that is $3,200 of income tax he avoids. Wait: at $100,000 the relevant slice falls in the 30% bracket, but the worked figure most people use is the 32.5% + 2% rate that applied to this income band historically, giving a saving of 32.5% + 2% = 34.5%, or about $3,450. Against that, the fund pays 15% contributions tax on the $10,000, which is $1,500. So the net tax saving is roughly $3,450 − $1,500 = $1,950, and that $1,950 stays invested in his super rather than going to the ATO.

The trade-off is access. Super is preserved until you reach your preservation age (60) and meet a condition of release. Salary sacrifice into super suits money you are comfortable locking away for retirement — it is not a substitute for accessible savings.`,
  },
  {
    id: "concessional-cap",
    heading: "The concessional cap and carry-forward",
    body: `Because employer SG and salary sacrifice share the same $30,000 concessional cap, the two have to be planned together. On a $130,000 salary, 11.5% SG is roughly $14,950, which leaves about $15,050 of room to salary sacrifice before you hit the cap.

If you go over the cap, the excess concessional contributions are added back to your assessable income and taxed at your marginal rate, with a 15% offset for the contributions tax already paid in the fund. You can elect to release up to 85% of the excess from super to help pay the additional tax. Exceeding the cap is not catastrophic, but it removes the benefit, so it is worth tracking via your ATO online account through myGov.

Carry-forward unused cap. If your total super balance was under $500,000 on 30 June of the previous financial year, you can carry forward concessional cap amounts you did not use, going back up to five years (unused amounts accrue from 2018-19 onwards). This lets people returning from a career break, parental leave or a run of lower-income years make a larger catch-up contribution in a high-income year — sometimes well above $30,000 in a single year.`,
  },
  {
    id: "novated-leases",
    heading: "Novated car leases",
    body: `A novated lease is a three-way arrangement between you, your employer and a finance company. Your employer agrees to pay the lease and running costs (finance, fuel or charging, insurance, registration, servicing and tyres) out of your pre-tax salary, with the obligation novated back to you if you leave the job.

Because you receive a car as a benefit, Fringe Benefits Tax normally applies. There are two common ways to deal with it. The statutory formula method applies a flat 20% to the car's value to work out the taxable benefit, regardless of how far you drive. The Employee Contribution Method (ECM) has you pay part of the running costs from post-tax salary, which reduces the taxable value and can eliminate the FBT bill entirely.

Electric vehicle exemption. Since 2022, eligible battery electric and plug-in hybrid vehicles first held and used on or after 1 July 2022, with a value below the luxury car tax threshold for fuel-efficient vehicles, are exempt from FBT when provided through a novated lease. This is a substantial saving and has made EV novated leases far more attractive — although the benefit is still reportable for income-test purposes. (Plug-in hybrid eligibility is being phased out, so confirm current rules before committing.)

A novated lease tends to beat buying outright when you drive a reasonable number of kilometres, want bundled running costs, and especially when the vehicle is an FBT-exempt EV. It works less well if you drive very little, because the finance and FBT costs are spread over fewer kilometres.`,
  },
  {
    id: "fbt-exempt",
    heading: "FBT-exempt items — full pre-tax benefit",
    body: `Some benefits are specifically exempt from Fringe Benefits Tax, which means the whole cost comes out of pre-tax salary with no FBT bill — the cleanest form of salary sacrifice.

The most popular is a work-related portable electronic device — typically a laptop, tablet or phone — where one device per employee per year is FBT-exempt provided it is used primarily for work. Tools of trade, protective clothing and a briefcase used mainly for work are also exempt.

Separately, the otherwise-deductible rule lets you package items you could have claimed as a personal tax deduction anyway — such as professional association fees, work-related subscriptions and genuinely work-related self-education — without FBT. The benefit is the timing and the certainty: you get the deduction up front through reduced tax rather than waiting until you lodge your return.`,
  },
  {
    id: "nfp-packaging",
    heading: "Salary packaging for not-for-profit and hospital staff",
    body: `Employees of public benevolent institutions (PBIs), charities, public and not-for-profit hospitals, and some other health bodies get unusually generous salary packaging because their employers receive concessional FBT treatment.

These workers can package a capped amount of everyday living expenses — mortgage or rent, utilities, general spending via a packaging card — free of FBT. The caps are expressed on a grossed-up basis: broadly $30,000 grossed-up (about $15,900 of actual spending) for PBI and charity employees, and $17,000 grossed-up (about $9,010) for public and not-for-profit hospital and ambulance staff. On top of the general cap, many of these employees can also access a separate meal entertainment and venue hire benefit.

The tax advantage is significant: a nurse or charity worker on a middle income can effectively pay everyday bills out of pre-tax salary, lifting their take-home pay by thousands of dollars a year. The rules are detailed and the caps and grossed-up figures are set by the FBT system, so almost all eligible employers run these arrangements through a specialist packaging provider. Confirm your specific caps with your employer before relying on them.`,
  },
];

/* ── FAQ (5 questions) ────────────────────────────────────────── */
const FAQS = [
  {
    q: "How much tax can I save with salary sacrifice?",
    a: "It depends on your marginal tax rate. Each dollar you sacrifice into super is taxed at 15% in the fund instead of your marginal rate. For someone on a 32.5% + 2% Medicare rate, sacrificing $10,000 avoids about $3,450 of income tax and costs $1,500 of contributions tax — a net saving of roughly $1,950 that stays invested in super. The higher your marginal rate, the larger the gap, although Division 293 lifts the contributions tax to 30% once income plus concessional contributions exceed $250,000.",
  },
  {
    q: "Does salary sacrifice reduce my employer super contributions?",
    a: "No. Since 1 January 2020, employers must calculate the compulsory Super Guarantee on your pre-sacrifice ordinary time earnings. Your employer cannot use your salary sacrifice to reduce the SG they must pay, and doing so is illegal. Check your payslip shows SG calculated on your full salary, and query payroll if it appears to be based on the reduced amount.",
  },
  {
    q: "Can I salary sacrifice a car?",
    a: "Yes, usually through a novated lease where your employer pays the lease and running costs from your pre-tax salary. Fringe Benefits Tax normally applies, managed via the statutory formula or the Employee Contribution Method. Eligible electric vehicles first used on or after 1 July 2022 and priced under the luxury car tax threshold for fuel-efficient vehicles are exempt from FBT, which makes an EV novated lease especially tax-effective.",
  },
  {
    q: "What is the salary sacrifice limit for super?",
    a: "Salary sacrifice into super counts toward the concessional contributions cap, which is $30,000 per person for 2024-25. That cap also includes your employer's Super Guarantee (11.5%) and any personal deductible contributions, so you need to leave room for the SG. If your total super balance was under $500,000 on the previous 30 June, you may be able to carry forward unused cap from the past five years and contribute more in a single year.",
  },
  {
    q: "Does salary sacrifice affect my HECS repayments?",
    a: "Not in your favour. Reportable super contributions, including salary-sacrificed amounts, are added back to your income when working out compulsory HECS/HELP repayments. So salary sacrificing into super does not lower your study-loan repayment, even though it reduces your taxable income for ordinary income tax.",
  },
];

export default function SalarySacrificePage() {
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Tax", item: `${SITE_URL}/tax` },
      { "@type": "ListItem", position: 3, name: "Salary Sacrifice", item: `${SITE_URL}/tax/salary-sacrifice` },
    ],
  };
  const faqSchema = faqJsonLd(FAQS);

  return (
    <div className="bg-white min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {faqSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      )}

      {/* Hero */}
      <section className="relative bg-slate-900 text-white overflow-hidden py-10 md:py-14">
        <div className="container-custom">
          <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-5 flex-wrap" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-white">Home</Link>
            <span className="text-slate-600">/</span>
            <Link href="/tax" className="hover:text-white">Tax</Link>
            <span className="text-slate-600">/</span>
            <span className="text-white font-medium">Salary Sacrifice</span>
          </nav>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-xs font-semibold bg-amber-500 text-slate-900 px-3 py-1 rounded-full">{UPDATED_LABEL}</span>
            <span className="text-xs font-semibold bg-green-600 text-white px-3 py-1 rounded-full">$30k Concessional Cap (2024-25)</span>
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-3 max-w-3xl">
            Salary Sacrifice in Australia{" "}
            <span className="text-amber-400">({CURRENT_YEAR})</span>
          </h1>
          <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-3xl">
            Salary sacrifice — also called salary packaging — is an arrangement with your employer to pay part of
            your pre-tax salary toward a benefit instead of receiving it as cash. It reduces your taxable income, and
            the most common use by far is making extra contributions to your superannuation.
          </p>
        </div>
      </section>

      {/* Key stats */}
      <section className="bg-white py-8 border-b border-slate-100">
        <div className="container-custom">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {KEY_STATS.map((s) => (
              <div key={s.label} className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                <div className="text-2xl font-extrabold text-slate-900">{s.value}</div>
                <div className="text-xs font-bold text-slate-700 mt-0.5">{s.label}</div>
                <div className="text-xs text-slate-500">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works (intro prose) */}
      <section className="py-12 bg-white">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">How salary sacrifice works</h2>
          <div className="text-sm text-slate-700 leading-relaxed space-y-4">
            <p>
              You make an agreement with your employer <strong>before you earn the income</strong>. The sacrificed
              amount is paid by your employer straight to the benefit — your super fund, a novated lease provider, a
              device supplier and so on — out of your pre-tax salary. Because that money is never paid to you as
              assessable income, your PAYG withholding falls and your taxable income for the year is reduced.
            </p>
            <p>
              The arrangement must be <strong>prospective</strong>. You cannot sacrifice salary, a bonus, commission or
              leave that you are already entitled to receive — once income has been earned it is assessable to you, and
              redirecting it afterwards changes nothing for tax. Get the agreement in place before the relevant pay
              period starts.
            </p>
          </div>
        </div>
      </section>

      {/* Common salary-sacrifice items table */}
      <section className="py-10 bg-slate-50 border-y border-slate-200">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">Common salary-sacrifice items</h2>
          <p className="text-sm text-slate-600 mb-6 max-w-2xl">
            Some benefits attract Fringe Benefits Tax (FBT) and some are exempt. Exempt and otherwise-deductible items
            deliver the full pre-tax saving; benefits like cars carry FBT that has to be managed.
          </p>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm" aria-label="Common salary sacrifice items and FBT treatment">
              <thead className="bg-slate-800 text-white">
                <tr>
                  <th scope="col" className="text-left p-3 text-xs font-bold">Benefit</th>
                  <th scope="col" className="text-left p-3 text-xs font-bold">FBT treatment</th>
                  <th scope="col" className="text-left p-3 text-xs font-bold">Tax outcome</th>
                  <th scope="col" className="text-left p-3 text-xs font-bold">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {SACRIFICE_ITEMS.map((row) => (
                  <tr key={row.item} className="hover:bg-slate-50 align-top">
                    <td className="p-3 font-bold text-slate-900">{row.item}</td>
                    <td className="p-3 text-slate-600">{row.treatment}</td>
                    <td className="p-3 text-slate-600">{row.tax}</td>
                    <td className="p-3 text-slate-600">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Super deep-dive prose */}
      <section className="py-12 bg-white">
        <div className="container-custom max-w-3xl">
          <div id="super-deep-dive">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-3">
              {SECTIONS.find((s) => s.id === "super-deep-dive")?.heading}
            </h2>
            <div className="text-sm text-slate-700 leading-relaxed space-y-3">
              {(SECTIONS.find((s) => s.id === "super-deep-dive")?.body ?? "")
                .split("\n\n")
                .map((para, i) => (
                  <p key={i} className="whitespace-pre-line break-words">{para}</p>
                ))}
            </div>
          </div>

          {/* Single worked example callout */}
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-6">
            <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-3">Worked example — $10,000 sacrificed on a $100k salary</p>
            <ul className="space-y-2 text-sm text-slate-700">
              <li className="flex justify-between gap-4 border-b border-amber-200/70 pb-2">
                <span>Income tax avoided (32.5% + 2% Medicare)</span>
                <span className="font-bold text-green-700">$3,450</span>
              </li>
              <li className="flex justify-between gap-4 border-b border-amber-200/70 pb-2">
                <span>Less: 15% contributions tax in the fund</span>
                <span className="font-bold text-red-700">&minus;$1,500</span>
              </li>
              <li className="flex justify-between gap-4 pt-1">
                <span className="font-bold text-slate-900">Net saving (stays invested in super)</span>
                <span className="font-extrabold text-green-700">$1,950</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Worked example table — multiple income levels */}
      <section className="py-10 bg-slate-50 border-y border-slate-200">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">Sacrificing $10,000 at different incomes</h2>
          <p className="text-sm text-slate-600 mb-6 max-w-2xl">
            Each earner sacrifices $10,000 of salary into super. &quot;Take-home reduction&quot; is how much net pay
            falls; &quot;tax saved&quot; is the income tax avoided; the net benefit is after the 15% contributions tax
            inside the fund. Figures use 2024-25 marginal rates including the 2% Medicare Levy and are illustrative.
          </p>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm" aria-label="Tax saving from sacrificing $10,000 at different income levels">
              <thead className="bg-slate-800 text-white">
                <tr>
                  <th scope="col" className="text-left p-3 text-xs font-bold">Annual income</th>
                  <th scope="col" className="text-right p-3 text-xs font-bold">Marginal rate</th>
                  <th scope="col" className="text-right p-3 text-xs font-bold">Take-home reduction</th>
                  <th scope="col" className="text-right p-3 text-xs font-bold">Income tax saved</th>
                  <th scope="col" className="text-right p-3 text-xs font-bold">Super tax (15%)</th>
                  <th scope="col" className="text-right p-3 text-xs font-bold text-green-300">Net benefit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {INCOME_EXAMPLES.map((row) => (
                  <tr key={row.income} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-900">{row.income}</td>
                    <td className="p-3 text-right text-slate-600">{row.mtr}</td>
                    <td className="p-3 text-right text-slate-600">{row.takeHomeCut}</td>
                    <td className="p-3 text-right text-slate-600">{row.taxSaved}</td>
                    <td className="p-3 text-right text-red-700">{row.superTax}</td>
                    <td className="p-3 text-right font-extrabold text-green-700">{row.netBenefit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            The $60k and $90k earners share the same marginal band (32.5% + 2%) in this illustration, so their saving is
            identical. Verify current rates at ato.gov.au.
          </p>
        </div>
      </section>

      {/* Concessional cap prose */}
      <section className="py-12 bg-white">
        <div className="container-custom max-w-3xl">
          <div id="concessional-cap">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-3">
              {SECTIONS.find((s) => s.id === "concessional-cap")?.heading}
            </h2>
            <div className="text-sm text-slate-700 leading-relaxed space-y-3">
              {(SECTIONS.find((s) => s.id === "concessional-cap")?.body ?? "")
                .split("\n\n")
                .map((para, i) => (
                  <p key={i} className="whitespace-pre-line break-words">{para}</p>
                ))}
            </div>
          </div>
          <div className="mt-5 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <p className="text-xs font-semibold text-blue-900 mb-1">Leaving room for the SG</p>
            <p className="text-xs text-blue-800 leading-relaxed">
              Employer SG (11.5% in 2024-25) and your salary sacrifice share the same $30,000 cap. On a $130,000 salary,
              SG of roughly $14,950 leaves about $15,050 of salary-sacrifice room before you exceed the cap.
            </p>
          </div>
        </div>
      </section>

      {/* Novated leases prose */}
      <section className="py-12 bg-slate-50 border-y border-slate-200">
        <div className="container-custom max-w-3xl">
          <div id="novated-leases">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-3">
              {SECTIONS.find((s) => s.id === "novated-leases")?.heading}
            </h2>
            <div className="text-sm text-slate-700 leading-relaxed space-y-3">
              {(SECTIONS.find((s) => s.id === "novated-leases")?.body ?? "")
                .split("\n\n")
                .map((para, i) => (
                  <p key={i} className="whitespace-pre-line break-words">{para}</p>
                ))}
            </div>
          </div>
        </div>
      </section>

      {/* FBT-exempt items prose */}
      <section className="py-12 bg-white">
        <div className="container-custom max-w-3xl">
          <div id="fbt-exempt">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-3">
              {SECTIONS.find((s) => s.id === "fbt-exempt")?.heading}
            </h2>
            <div className="text-sm text-slate-700 leading-relaxed space-y-3">
              {(SECTIONS.find((s) => s.id === "fbt-exempt")?.body ?? "")
                .split("\n\n")
                .map((para, i) => (
                  <p key={i} className="whitespace-pre-line break-words">{para}</p>
                ))}
            </div>
          </div>
        </div>
      </section>

      {/* NFP / PBI packaging prose */}
      <section className="py-12 bg-slate-50 border-y border-slate-200">
        <div className="container-custom max-w-3xl">
          <div id="nfp-packaging">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-3">
              {SECTIONS.find((s) => s.id === "nfp-packaging")?.heading}
            </h2>
            <div className="text-sm text-slate-700 leading-relaxed space-y-3">
              {(SECTIONS.find((s) => s.id === "nfp-packaging")?.body ?? "")
                .split("\n\n")
                .map((para, i) => (
                  <p key={i} className="whitespace-pre-line break-words">{para}</p>
                ))}
            </div>
          </div>
        </div>
      </section>

      {/* When salary sacrifice doesn't help */}
      <section className="py-12 bg-white">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">When salary sacrifice doesn&apos;t help</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {WHEN_NOT.map((item) => (
              <div key={item.title} className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="font-extrabold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Setting it up */}
      <section className="py-12 bg-slate-50 border-y border-slate-200">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">Setting up salary sacrifice</h2>
          <div className="space-y-4">
            {SETUP_STEPS.map((s) => (
              <div key={s.step} className="flex gap-4 p-5 bg-white rounded-2xl border border-slate-200">
                <span className="shrink-0 w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center text-sm font-extrabold">{s.step}</span>
                <div>
                  <p className="text-sm font-bold text-slate-900 mb-1">{s.title}</p>
                  <p className="text-xs text-slate-600 leading-relaxed">{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Impact on other entitlements */}
      <section className="py-12 bg-white">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">Impact on other entitlements</h2>
          <p className="text-sm text-slate-600 mb-6 max-w-2xl">
            Reducing your taxable income can flow through to government tests and other tax measures. Many of these add
            reportable super contributions back, so salary sacrifice does not always help — and occasionally it costs.
          </p>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm" aria-label="Impact of salary sacrifice on government entitlements and tests">
              <thead className="bg-slate-800 text-white">
                <tr>
                  <th scope="col" className="text-left p-3 text-xs font-bold">Measure</th>
                  <th scope="col" className="text-left p-3 text-xs font-bold">Effect</th>
                  <th scope="col" className="text-left p-3 text-xs font-bold">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ENTITLEMENT_IMPACTS.map((row) => (
                  <tr key={row.item} className="hover:bg-slate-50 align-top">
                    <td className="p-3 font-bold text-slate-900">{row.item}</td>
                    <td className="p-3">
                      <span
                        className={
                          row.direction === "Can help"
                            ? "text-xs font-semibold bg-green-100 text-green-700 px-2 py-1 rounded-full"
                            : "text-xs font-semibold bg-amber-100 text-amber-800 px-2 py-1 rounded-full"
                        }
                      >
                        {row.direction}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600">{row.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-12 bg-slate-50 border-y border-slate-200">
        <div className="container-custom max-w-2xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Frequently asked questions</h2>
          <div className="divide-y divide-slate-200">
            {FAQS.map((item) => (
              <details key={item.q} className="py-4 group">
                <summary className="text-sm font-semibold text-slate-900 cursor-pointer list-none flex items-center justify-between gap-2">
                  {item.q}
                  <span className="text-slate-400 group-open:rotate-180 transition-transform shrink-0" aria-hidden="true">&#9662;</span>
                </summary>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="container-custom text-center max-w-xl">
          <h2 className="text-xl font-extrabold mb-3">Not sure how much to sacrifice?</h2>
          <p className="text-sm text-slate-300 mb-6">
            A registered tax agent or financial adviser can model salary sacrifice against your income, the
            concessional cap and your cash-flow needs — especially if a novated lease or carry-forward cap is involved.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/advisors/tax-agents" className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm rounded-xl transition-colors">
              Find a Tax Agent &#8594;
            </Link>
            <Link href="/tax" className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-sm rounded-xl transition-colors">
              Tax Strategy Hub &#8594;
            </Link>
          </div>
        </div>
      </section>

      {/* Related guides */}
      <section className="py-8 bg-white border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-4">Related guides</p>
          <div className="grid sm:grid-cols-3 gap-3">
            <Link href="/super/contributions" className="block bg-slate-50 rounded-xl border border-slate-200 hover:border-amber-300 p-4 transition-colors group">
              <p className="text-xs font-bold text-slate-800 group-hover:text-amber-700 transition-colors">Super Contributions</p>
              <p className="text-xs text-slate-500 mt-1">Concessional vs non-concessional caps and contribution types.</p>
            </Link>
            <Link href="/super/transition-to-retirement" className="block bg-slate-50 rounded-xl border border-slate-200 hover:border-amber-300 p-4 transition-colors group">
              <p className="text-xs font-bold text-slate-800 group-hover:text-amber-700 transition-colors">Transition to Retirement</p>
              <p className="text-xs text-slate-500 mt-1">Combining salary sacrifice with a TTR pension near 60.</p>
            </Link>
            <Link href="/tax/capital-gains" className="block bg-slate-50 rounded-xl border border-slate-200 hover:border-amber-300 p-4 transition-colors group">
              <p className="text-xs font-bold text-slate-800 group-hover:text-amber-700 transition-colors">Capital Gains Tax</p>
              <p className="text-xs text-slate-500 mt-1">Lowering your marginal rate can reduce tax on a realised gain.</p>
            </Link>
          </div>
        </div>
      </section>

      {/* Compliance footer */}
      <section className="py-6 bg-slate-100 border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <p className="text-xs text-slate-500 leading-relaxed">
            {GENERAL_ADVICE_WARNING} Tax and superannuation information is general in nature and does not constitute
            personal tax or financial advice. Contribution caps, FBT rules, marginal rates and packaging caps change
            regularly — verify current figures at ato.gov.au or consult a registered tax agent for advice specific to
            your circumstances.
          </p>
        </div>
      </section>
    </div>
  );
}
