import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Home Loan Refinancing Guide Australia (${CURRENT_YEAR}) | invest.com.au`,
  description: `How to refinance your home loan in Australia — loyalty tax, break-even calculation, switching costs, cash-out equity, 7-step process, and 2 worked examples. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Home Loan Refinancing Guide Australia (${CURRENT_YEAR})`,
    description: "Step-by-step refinancing guide: loyalty tax, break-even calculation, switching costs checklist, cash-out equity access, and when NOT to refinance.",
    url: `${SITE_URL}/home-loans/refinancing`,
    images: [{ url: `/api/og?title=Home+Loan+Refinancing+Guide`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/home-loans/refinancing` },
};

const HERO_STATS = [
  { label: "Average loyalty tax", value: "0.5–1.0%", sub: "Above new-customer rates" },
  { label: "Typical timeline", value: "4–6 weeks", sub: "From application to settlement" },
  { label: "Typical switching costs", value: "$800–$2,000", sub: "Ex. LMI and fixed break costs" },
  { label: "Break-even (example)", value: "4 months", sub: "$800 costs ÷ $200/month saving" },
];

const REASONS_TO_REFINANCE = [
  {
    title: "Escape the loyalty tax",
    icon: "💸",
    desc: "Australian lenders routinely offer their sharpest rates to new borrowers, not long-standing customers. Borrowers who have not refinanced in 3+ years are often paying 0.5–1.0% above what the same lender would give a new customer today. On a $600,000 loan, 0.75% represents $4,500 per year in extra interest.",
  },
  {
    title: "Access equity in your home",
    icon: "🏡",
    desc: "Property price growth can create substantial equity. Refinancing to a higher loan balance (cash-out refinancing) lets you access that equity for renovations, investment property deposits, or other purposes. Lenders typically allow cash-out up to 80% LVR without LMI.",
  },
  {
    title: "Improve your loan structure",
    icon: "🔧",
    desc: "Your financial situation evolves. A loan you took out 5 years ago may no longer fit — you might benefit from moving to a variable rate with a 100% offset account, splitting into fixed and variable portions, or switching from interest-only to principal and interest.",
  },
  {
    title: "Consolidate debt",
    icon: "📊",
    desc: "Refinancing allows you to roll higher-interest debts (car loans, personal loans, credit cards) into your home loan. The consolidated interest rate is lower, but extending short-term debt over a 25-year term increases total interest paid — model the full cost before consolidating.",
  },
];

const SWITCHING_COSTS = [
  { item: "Discharge fee", typical: "~$300", notes: "Paid to your current lender to close the loan; sometimes called a mortgage exit fee" },
  { item: "New lender application fee", typical: "$300–$600", notes: "Many lenders waive this for refinancers; always ask" },
  { item: "Legal / settlement fee", typical: "~$500", notes: "Conveyancer or solicitor prepares the new mortgage documents" },
  { item: "Mortgage registration fee", typical: "$100–$200", notes: "State government charge to register the new mortgage" },
  { item: "Valuation fee", typical: "$0–$300", notes: "Often waived or included in the lender's refinancing offer" },
  { item: "LMI (if LVR above 80%)", typical: "$5,000–$30,000+", notes: "Avoid by maintaining 20%+ equity; government schemes may exempt eligible borrowers" },
  { item: "Break costs (fixed loans only)", typical: "$0–$30,000+", notes: "Can be very large if breaking a fixed rate early — get a quote from your lender before proceeding" },
];

const STEPS = [
  {
    step: "1",
    title: "Calculate your break-even point",
    desc: "Divide total switching costs by monthly saving. If break-even is 12 months and you plan to keep the loan 5+ years, refinancing is almost certainly worthwhile. Use the worked example below as a template.",
  },
  {
    step: "2",
    title: "Check your credit file",
    desc: "Request a free copy from Equifax, Experian, or illion before applying. Fix any errors. Multiple credit enquiries in a short window can reduce your score — if rate shopping, do it through a single broker to avoid stacking hard enquiries.",
  },
  {
    step: "3",
    title: "Know your current LVR",
    desc: "If your property has grown in value since you bought, your loan-to-value ratio may have improved — potentially moving you into a lower rate tier or eliminating LMI. Get a rough current estimate from CoreLogic, Domain, or RP Data before applying.",
  },
  {
    step: "4",
    title: "Compare lenders on comparison rate",
    desc: "Use the comparison rate, not the headline rate. Factor in ongoing annual fees, offset account quality, redraw flexibility, and portability. A 0.05% lower rate is irrelevant if the offset account is capped or the annual fee is $395.",
  },
  {
    step: "5",
    title: "Request a formal valuation",
    desc: "Most lenders commission their own valuation when you apply. The result determines your rate tier. If your LVR is borderline between tiers (e.g. 79% vs 80%), a higher valuation can make a meaningful difference to your rate offer.",
  },
  {
    step: "6",
    title: "Submit your application",
    desc: "Prepare: last 2 payslips (or 2 years tax returns if self-employed), 3 months bank statements, 3 months existing loan statements, and council rates notice. Many lenders also require a recent utility bill as proof of address.",
  },
  {
    step: "7",
    title: "Discharge and settle",
    desc: "Your new lender coordinates discharge with your old lender. The process typically takes 4–6 weeks. The discharge fee ($150–$350) is deducted from the payout figure sent to your old lender. You do not need to do anything beyond signing documents.",
  },
];

const WHEN_NOT_TO_REFINANCE = [
  {
    scenario: "You plan to sell within 12–18 months",
    why: "Switching costs are unlikely to be recovered before you sell. If break-even is 10 months and you sell at 12, you are paying costs for only 2 months of net benefit. Hold off unless the rate difference is very large.",
  },
  {
    scenario: "You are in negative equity or close to it",
    why: "Most lenders will not refinance a loan with LVR above 95%. If your property value has fallen below your outstanding loan balance, your options are very limited and LMI costs are likely prohibitive.",
  },
  {
    scenario: "Your fixed rate break costs exceed 12 months of saving",
    why: "Break costs are calculated by the lender and can run to tens of thousands of dollars on large fixed loans in a rate environment where rates have fallen since you fixed. Always get a written break cost quote before deciding.",
  },
  {
    scenario: "Your income or employment has recently changed",
    why: "A recent job change, return from parental leave, or move to self-employment may mean you cannot demonstrate 3–6 months of stable income. Wait until your income history is established before applying to avoid a declined application on your credit file.",
  },
];

const LOAN_STRUCTURES = [
  {
    structure: "Variable + 100% offset",
    best: "Borrowers with a high savings balance; most tax-effective for investment loans",
    benefit: "Savings in the offset reduce interest daily; full flexibility to redraw; no break costs",
  },
  {
    structure: "Split loan (fixed + variable)",
    best: "Borrowers who want rate certainty on part of the loan while retaining flexibility",
    benefit: "Fixed portion protects against rate rises; variable portion retains offset and redraw",
  },
  {
    structure: "Interest-only (IO)",
    best: "Property investors maximising tax deductions; borrowers managing short-term cash flow",
    benefit: "Lower monthly repayments during IO period; but loan balance does not reduce",
  },
  {
    structure: "Principal & interest (P&I)",
    best: "Owner-occupiers focused on building equity and reducing long-term interest cost",
    benefit: "Lenders typically offer lower rates on P&I loans; balance reduces with every payment",
  },
];

const FAQS = [
  {
    q: "How often should I review my home loan rate?",
    a: "Many financial educators suggest reviewing every 2–3 years. The loyalty tax is real — lenders frequently offer their sharpest rates to new customers. If your current rate is more than 0.5% above comparable market products, running the break-even calculation takes less than 10 minutes and is almost always worth it. A licensed mortgage broker can benchmark your rate across 30+ lenders at no cost to you.",
  },
  {
    q: "Does refinancing hurt my credit score?",
    a: "A mortgage application creates a hard enquiry on your credit file, which typically reduces your score by 5–10 points temporarily. The effect fades within 12 months. Rate shopping through a single mortgage broker rather than applying to multiple lenders directly minimises the enquiry impact. The long-term saving from a lower rate almost always outweighs the short-term score impact.",
  },
  {
    q: "What is cash-out refinancing and what can I use it for?",
    a: "Cash-out refinancing means increasing your loan balance above the existing mortgage payout amount to access equity. Common uses include renovations, investment property deposits, shares, and business capital. Lenders typically allow cash-out refinancing up to 80% LVR without LMI. If the funds are used to invest (e.g. buying shares or an investment property), the interest on that portion may be tax deductible — consult a tax adviser for advice specific to your situation.",
  },
  {
    q: "What is a cashback refinance offer and is it worth it?",
    a: "Some lenders offer $2,000–$5,000 cashback to attract refinancers. These can be worthwhile, but check whether the ongoing rate is genuinely competitive. A $3,000 cashback is erased in 15 months on a $500,000 loan if the new rate is 0.3% higher than the best available option. Always compare the ongoing rate first, then treat the cashback as a secondary consideration.",
  },
  {
    q: "Can I refinance if my property value has fallen?",
    a: "You can apply with a higher LVR, but you will face fewer lender options and may need to pay LMI. If your LVR has risen above 80% due to a value decline, consider whether the switching costs are still justified. A mortgage broker can identify lenders with higher LVR tolerance and model whether refinancing still makes financial sense in your situation.",
  },
  {
    q: "How long does refinancing take?",
    a: "Most refinancing applications settle within 4–6 weeks. The timeline breaks down roughly as: application and document submission (1 week), lender assessment and valuation (1–2 weeks), formal approval and document signing (1 week), and discharge/settlement coordination with the outgoing lender (1–2 weeks). Complex applications, self-employed borrowers, or lenders with high application volumes can extend this to 8 weeks.",
  },
];

export default function RefinancingPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Home Loans", url: absoluteUrl("/home-loans") },
    { name: "Refinancing Guide", url: absoluteUrl("/home-loans/refinancing") },
  ]);
  const faqLd = faqJsonLd(FAQS.map((f) => ({ q: f.q, a: f.a })));

  return (
    <div className="bg-white min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {faqLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />}

      {/* Hero */}
      <div className="bg-gradient-to-br from-emerald-900 to-emerald-700 text-white py-14">
        <div className="container-custom">
          <nav aria-label="Breadcrumb" className="text-sm text-emerald-200 mb-4 flex items-center gap-1.5">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <span>/</span>
            <Link href="/home-loans" className="hover:text-white transition-colors">Home Loans</Link>
            <span>/</span>
            <span className="text-white">Refinancing Guide</span>
          </nav>
          <div className="inline-block bg-emerald-800 text-emerald-200 text-xs font-medium px-3 py-1 rounded-full mb-4">
            General information only — not credit assistance
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
            Home Loan Refinancing Guide
          </h1>
          <p className="text-lg text-emerald-100 max-w-2xl mb-8">
            Most Australians who haven&apos;t refinanced in 3+ years are paying a loyalty tax of 0.5–1.0% above what new borrowers get at the same lender. Here&apos;s the complete guide: break-even calculation, switching costs, cash-out equity access, the 7-step process, and when refinancing isn&apos;t worth it.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {HERO_STATS.map((stat) => (
              <div key={stat.label} className="bg-emerald-800 rounded-xl p-4 border border-emerald-700">
                <p className="text-xs text-emerald-300 mb-1">{stat.label}</p>
                <p className="text-lg font-bold text-white">{stat.value}</p>
                <p className="text-xs text-emerald-300 mt-0.5">{stat.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Why Refinance */}
      <section className="py-12 bg-white">
        <div className="container-custom">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Why Refinance?</h2>
          <p className="text-sm text-slate-500 mb-6">
            Refinancing is not only about chasing a lower rate — there are four distinct reasons borrowers switch lenders.
          </p>
          <div className="grid md:grid-cols-2 gap-5 max-w-4xl">
            {REASONS_TO_REFINANCE.map((r) => (
              <div key={r.title} className="bg-slate-50 rounded-xl border border-slate-200 p-6">
                <div className="text-2xl mb-3">{r.icon}</div>
                <h3 className="font-bold text-slate-900 mb-2">{r.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{r.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The Loyalty Tax */}
      <section className="py-12 bg-slate-50">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">The Loyalty Tax</h2>
          <p className="text-slate-600 mb-4">
            The loyalty tax is the gap between what your existing lender charges you and what the same lender would offer a brand-new customer today. Australian lenders compete aggressively for new borrowers — offering rate discounts and cashback deals — while existing customers quietly roll onto higher back-book rates.
          </p>
          <p className="text-slate-600 mb-5">
            Research from the Reserve Bank of Australia and ACCC has consistently shown this gap ranges from <strong>0.5% to 1.0%</strong> for borrowers who have not renegotiated in several years. On a $600,000 loan at 0.75%, that is $4,500 per year in avoidable interest, or $22,500 over five years.
          </p>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6">
            <h3 className="font-bold text-emerald-900 mb-3">The simple test: call your lender first</h3>
            <p className="text-emerald-800 text-sm leading-relaxed mb-3">
              Before refinancing, call your existing lender and ask for a rate review. Quote the best comparable rate you have found in the market. Retention teams have discretion to discount rates for existing customers — sometimes by 0.2–0.4% — without the cost and effort of a full refinance.
            </p>
            <p className="text-emerald-800 text-sm leading-relaxed">
              If your lender cannot match the market, then refinancing is your next step. Use the break-even calculation below to confirm it is worthwhile.
            </p>
          </div>
        </div>
      </section>

      {/* Break-Even Calculation */}
      <section className="py-12 bg-white">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">The Break-Even Calculation</h2>
          <p className="text-slate-600 mb-6">
            The break-even point is the number of months it takes for your monthly savings to recover the upfront switching costs. Any month beyond break-even is pure saving.
          </p>

          {/* Formula */}
          <div className="bg-slate-900 text-green-400 font-mono text-sm rounded-xl p-5 mb-6">
            <p className="text-slate-400 text-xs mb-2"># Formula</p>
            <p>Break-even months = Total switching costs ÷ Monthly saving</p>
          </div>

          {/* Worked example */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden mb-6">
            <div className="bg-slate-800 text-white px-6 py-4">
              <p className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Worked Example — Standard Refinance</p>
            </div>
            <div className="p-6">
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Switching costs</p>
                  <ul className="space-y-2 text-sm text-slate-700">
                    <li className="flex justify-between"><span>Discharge fee</span><strong>$200</strong></li>
                    <li className="flex justify-between"><span>Application fee (new lender)</span><strong>$300</strong></li>
                    <li className="flex justify-between"><span>Legal / settlement fee</span><strong>$300</strong></li>
                    <li className="flex justify-between border-t border-slate-200 pt-2 mt-2"><span className="font-semibold">Total costs</span><strong className="text-slate-900">$800</strong></li>
                  </ul>
                </div>
                <div className="space-y-3">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                    <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-1">Monthly saving</p>
                    <p className="text-xl font-bold text-emerald-900">$200/month</p>
                    <p className="text-xs text-emerald-700 mt-1">Rate drop of 0.5% on $500,000 loan</p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">Break-even</p>
                    <p className="text-xl font-bold text-blue-900">4 months</p>
                    <p className="text-xs text-blue-700 mt-1">$800 ÷ $200 = 4 months</p>
                  </div>
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-600">
                <strong className="text-slate-800">Net outcome over 5 years:</strong> After recovering $800 in costs at month 4, you save $200/month for the remaining 56 months = <strong className="text-emerald-700">$11,200 in net savings</strong> over 5 years.
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
            <h3 className="font-semibold text-amber-900 mb-2">Break-even under 12 months is a strong signal to proceed</h3>
            <p className="text-amber-800 text-sm leading-relaxed">
              If your break-even is under 12 months and you intend to hold the loan for 3+ years, refinancing almost always makes financial sense. If break-even exceeds 24 months, the case is much weaker and you should confirm the switching costs cannot be reduced (e.g. by negotiating a fee waiver with the new lender).
            </p>
          </div>
        </div>
      </section>

      {/* Switching Costs Checklist */}
      <section className="py-12 bg-slate-50">
        <div className="container-custom">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Switching Costs Checklist</h2>
          <p className="text-sm text-slate-500 mb-6">
            Know what you are paying before you switch. Most standard refinances cost $800–$2,000 excluding LMI and fixed break costs.
          </p>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table aria-label="Home loan refinancing switching costs checklist" className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th scope="col" className="text-left px-5 py-3">Cost item</th>
                  <th scope="col" className="text-left px-5 py-3">Typical amount</th>
                  <th scope="col" className="text-left px-5 py-3">Notes</th>
                </tr>
              </thead>
              <tbody>
                {SWITCHING_COSTS.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className="px-5 py-3 font-medium text-slate-800">{row.item}</td>
                    <td className="px-5 py-3 text-emerald-700 font-semibold">{row.typical}</td>
                    <td className="px-5 py-3 text-slate-500 text-xs">{row.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400 mt-3">
            Fixed-rate break costs can be very large — always get a written break cost quote from your existing lender before proceeding if you are on a fixed rate.
          </p>
        </div>
      </section>

      {/* Cash-Out Refinancing */}
      <section className="py-12 bg-white">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Cash-Out Refinancing: Accessing Your Equity</h2>
          <p className="text-slate-600 mb-4">
            If your property has grown in value since you purchased it, you may have built up equity beyond your original deposit. Cash-out refinancing lets you refinance to a higher loan balance and receive the difference as cash (or a redraw facility) for use at your discretion.
          </p>
          <p className="text-slate-600 mb-5">
            Most lenders allow cash-out up to <strong>80% LVR</strong> without requiring lenders mortgage insurance. Above 80% LVR, LMI applies and can quickly erode the benefit of accessing equity.
          </p>

          {/* Worked example — investor */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden mb-6">
            <div className="bg-slate-800 text-white px-6 py-4">
              <p className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Worked Example — Investor Accessing Equity</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Current situation</p>
                  <ul className="space-y-2 text-sm text-slate-700">
                    <li className="flex justify-between"><span>Property value (now)</span><strong>$900,000</strong></li>
                    <li className="flex justify-between"><span>Existing loan balance</span><strong>$400,000</strong></li>
                    <li className="flex justify-between"><span>Current LVR</span><strong>44%</strong></li>
                    <li className="flex justify-between"><span>Equity</span><strong>$500,000</strong></li>
                  </ul>
                </div>
                <div className="space-y-3">
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">Max new loan at 80% LVR</p>
                    <p className="text-xl font-bold text-blue-900">$720,000</p>
                    <p className="text-xs text-blue-700 mt-1">$900,000 × 80% = $720,000</p>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                    <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-1">Accessible equity</p>
                    <p className="text-xl font-bold text-emerald-900">$320,000</p>
                    <p className="text-xs text-emerald-700 mt-1">$720,000 − $400,000 existing loan</p>
                  </div>
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                <strong>This investor refinances to $720,000</strong>, receives $320,000 equity release, and uses it as a deposit on a second investment property. The interest on the $320,000 increase is deductible against the investment property income, subject to ATO rules. Obtain tax advice before structuring this way.
              </div>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
            <h3 className="font-semibold text-slate-900 mb-2">Tax deductibility of cash-out interest</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              The ATO applies the <strong>purpose test</strong> to interest deductibility. If cash-out funds are used to invest in income-producing assets (investment property, shares), the interest on that drawn amount may be deductible. If used for personal purposes (holiday, car, renovations to the home you live in), the interest is generally not deductible. Mixing purposes requires careful loan splitting to preserve deductibility. Always consult a registered tax agent.
            </p>
          </div>
        </div>
      </section>

      {/* Loan Structure Section */}
      <section className="py-12 bg-slate-50">
        <div className="container-custom">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Refinancing Into a Better Loan Structure</h2>
          <p className="text-sm text-slate-500 mb-6">
            A refinance is an opportunity to choose a loan structure that better fits your current financial goals — not just a lower rate.
          </p>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table aria-label="Loan structures to consider when refinancing" className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th scope="col" className="text-left px-5 py-3">Structure</th>
                  <th scope="col" className="text-left px-5 py-3">Best suited to</th>
                  <th scope="col" className="text-left px-5 py-3">Key benefit</th>
                </tr>
              </thead>
              <tbody>
                {LOAN_STRUCTURES.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className="px-5 py-3 font-semibold text-slate-800">{row.structure}</td>
                    <td className="px-5 py-3 text-slate-600">{row.best}</td>
                    <td className="px-5 py-3 text-slate-500 text-xs">{row.benefit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-5 bg-blue-50 border border-blue-200 rounded-xl p-5 max-w-3xl">
            <p className="text-sm font-semibold text-blue-900 mb-1">The offset account advantage</p>
            <p className="text-sm text-blue-800">
              A 100% offset account means every dollar you hold in the linked savings account reduces the daily interest calculation on your home loan. On a $500,000 loan with $50,000 in offset, you pay interest only on $450,000. Unlike extra repayments, offset funds remain accessible — a significant cash-flow advantage for borrowers who want both interest savings and liquidity. Not all variable loans include a true 100% offset; confirm the offset terms before choosing a lender.
            </p>
          </div>
        </div>
      </section>

      {/* 7-Step Process */}
      <section className="py-12 bg-white">
        <div className="container-custom">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">The 7-Step Refinancing Process</h2>
          <p className="text-sm text-slate-500 mb-6">From decision to settlement — what happens at each stage.</p>
          <div className="grid md:grid-cols-2 gap-4 max-w-4xl">
            {STEPS.map((s) => (
              <div key={s.step} className="flex gap-4 bg-slate-50 rounded-xl p-5 border border-slate-200">
                <div className="w-9 h-9 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {s.step}
                </div>
                <div>
                  <p className="font-semibold text-slate-900 text-sm mb-1">{s.title}</p>
                  <p className="text-xs text-slate-600 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-12 bg-slate-50">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Refinancing Timeline: 4–6 Weeks</h2>
          <p className="text-slate-600 mb-6">
            Most refinances complete within 4–6 weeks. Complex applications (self-employed borrowers, high LVR, or non-standard income) may take 6–8 weeks.
          </p>
          <div className="space-y-4">
            {[
              { week: "Week 1", title: "Application and document submission", desc: "Submit your application, identity documents, payslips, bank statements, and existing loan statements to the new lender." },
              { week: "Weeks 1–2", title: "Assessment and valuation", desc: "The lender assesses your serviceability, orders a property valuation, and runs your credit file. Most valuations are completed within 2–5 business days." },
              { week: "Week 3", title: "Formal approval and loan documents", desc: "Once assessment is complete and the valuation returned, the lender issues formal approval. Loan documents are sent to you for signing." },
              { week: "Weeks 4–5", title: "Discharge coordination and settlement", desc: "Your new lender instructs your existing lender to discharge the mortgage. Settlement is scheduled, the existing loan is paid out, and the new mortgage is registered." },
            ].map((t) => (
              <div key={t.week} className="flex gap-4 bg-white rounded-xl p-5 border border-slate-200">
                <div className="flex-shrink-0 min-w-[72px]">
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">{t.week}</span>
                </div>
                <div>
                  <p className="font-semibold text-slate-900 text-sm mb-1">{t.title}</p>
                  <p className="text-xs text-slate-600 leading-relaxed">{t.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Credit File Impact */}
      <section className="py-12 bg-white">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Credit File Impact When Refinancing</h2>
          <p className="text-slate-600 mb-4">
            Every home loan application creates a <strong>hard enquiry</strong> on your credit file, which can reduce your credit score by 5–10 points temporarily. This effect typically fades within 12 months and does not affect your ability to refinance — but multiple enquiries in a short period send a negative signal to lenders.
          </p>
          <div className="bg-white border border-slate-200 rounded-xl p-5 mb-5 space-y-4">
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full bg-red-100 flex items-center justify-center">
                <span className="text-red-500 text-xs font-bold">✗</span>
              </span>
              <div>
                <p className="font-semibold text-slate-800 text-sm">Applying to multiple lenders directly</p>
                <p className="text-xs text-slate-600 mt-0.5">Each application creates a separate hard enquiry. Three applications in six weeks appear as three enquiries on your credit file — a red flag to lenders that suggests you are being declined repeatedly.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                <span className="text-green-600 text-xs font-bold">✓</span>
              </span>
              <div>
                <p className="font-semibold text-slate-800 text-sm">Using a mortgage broker to compare options</p>
                <p className="text-xs text-slate-600 mt-0.5">A broker runs a single credit check and uses that to assess your eligibility across multiple lenders before submitting a formal application to one. Only the final application creates a hard enquiry on your credit file.</p>
              </div>
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
            <p className="text-sm font-semibold text-slate-800 mb-2">Comprehensive Credit Reporting (CCR)</p>
            <p className="text-sm text-slate-600">
              Australia introduced Comprehensive Credit Reporting in 2018. Your credit file now shows not just defaults and enquiries, but also your repayment history on current loans. If you have consistently made on-time repayments on your existing mortgage, this positive history is visible to prospective lenders — which can offset the minor impact of a new application enquiry.
            </p>
          </div>
        </div>
      </section>

      {/* When NOT to Refinance */}
      <section className="py-12 bg-slate-50">
        <div className="container-custom">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">When NOT to Refinance</h2>
          <p className="text-sm text-slate-500 mb-6">
            There are circumstances where the costs, risks, or timing mean refinancing is not the right move.
          </p>
          <div className="grid md:grid-cols-2 gap-5 max-w-4xl">
            {WHEN_NOT_TO_REFINANCE.map((r) => (
              <div key={r.scenario} className="bg-white rounded-xl border border-red-100 p-6">
                <div className="flex items-start gap-3 mb-3">
                  <span className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full bg-red-100 flex items-center justify-center">
                    <span className="text-red-500 text-xs font-bold">✗</span>
                  </span>
                  <h3 className="font-bold text-slate-900 text-sm">{r.scenario}</h3>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">{r.why}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Worked Example 2 — Owner-occupier */}
      <section className="py-12 bg-white">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Two Worked Examples</h2>
          <p className="text-sm text-slate-500 mb-6">Real-world scenarios showing how the numbers work for different borrower types.</p>

          {/* Example 1 */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden mb-6">
            <div className="bg-emerald-800 text-white px-6 py-4">
              <span className="text-xs font-semibold text-emerald-300 uppercase tracking-wide">Example 1 — Owner-Occupier Rate Switch</span>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid md:grid-cols-3 gap-3 text-sm">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-500 mb-1">Loan balance</p>
                  <p className="font-bold text-slate-900">$550,000</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-500 mb-1">Rate change</p>
                  <p className="font-bold text-slate-900">6.4% → 5.8%</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-500 mb-1">Monthly saving</p>
                  <p className="font-bold text-emerald-700">~$275/month</p>
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-3 text-sm">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-500 mb-1">Total switching costs</p>
                  <p className="font-bold text-slate-900">$1,100</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                  <p className="text-xs text-blue-700 mb-1">Break-even</p>
                  <p className="font-bold text-blue-900">4 months</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                  <p className="text-xs text-emerald-700 mb-1">Net saving (5 years)</p>
                  <p className="font-bold text-emerald-900">~$15,400</p>
                </div>
              </div>
              <p className="text-xs text-slate-500">Moving from a P&amp;I variable to a new lender variable with 100% offset. Switching costs include discharge ($300), application ($500), legal ($300). Break-even at 4 months; 56 months of pure saving at $275/month thereafter.</p>
            </div>
          </div>

          {/* Example 2 */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="bg-slate-800 text-white px-6 py-4">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Example 2 — Investor Accessing Equity for Next Property</span>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid md:grid-cols-3 gap-3 text-sm">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-500 mb-1">Property value</p>
                  <p className="font-bold text-slate-900">$1,100,000</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-500 mb-1">Existing loan</p>
                  <p className="font-bold text-slate-900">$480,000</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-500 mb-1">Current LVR</p>
                  <p className="font-bold text-slate-900">43.6%</p>
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-3 text-sm">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                  <p className="text-xs text-blue-700 mb-1">New loan (at 80% LVR)</p>
                  <p className="font-bold text-blue-900">$880,000</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                  <p className="text-xs text-emerald-700 mb-1">Equity released</p>
                  <p className="font-bold text-emerald-900">$400,000</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <p className="text-xs text-amber-700 mb-1">Used as</p>
                  <p className="font-bold text-amber-900">20% deposit on IP2</p>
                </div>
              </div>
              <p className="text-xs text-slate-500">Investor also improves rate from 6.6% to 6.1% IO by switching lenders, saving approximately $240/month on the existing balance. Switching costs of $1,200 break even in 5 months. The $400,000 equity release becomes a 20% deposit on a $2,000,000 investment property. Interest on the $400,000 is deductible against the new investment property income (subject to tax advice).</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-12 bg-slate-50">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <details key={i} className="group border border-slate-200 rounded-xl overflow-hidden">
                <summary className="flex items-center justify-between px-5 py-4 cursor-pointer font-medium text-slate-800 hover:bg-slate-50 bg-white">
                  {faq.q}
                  <span className="ml-3 text-slate-400 group-open:rotate-180 transition-transform" aria-hidden="true">▼</span>
                </summary>
                <div className="px-5 pb-4 pt-1 text-sm text-slate-600 leading-relaxed bg-white">{faq.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* NCCP CTA */}
      <section className="py-12 bg-emerald-50">
        <div className="container-custom text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-3">Ready to Explore Your Refinancing Options?</h2>
          <p className="text-slate-600 mb-2 max-w-xl mx-auto text-sm">
            A licensed mortgage broker can compare 30+ lenders, calculate your exact break-even, and manage the application process on your behalf — at no cost to you.
          </p>
          <p className="text-xs text-slate-500 mb-6 max-w-xl mx-auto">
            Credit assistance is provided by Australian Credit Licensees. invest.com.au refers borrowers to licensed mortgage brokers under the National Consumer Credit Protection Act 2009 (Cth).
          </p>
          <Link href="/advisors/mortgage-brokers" className="inline-block bg-emerald-600 text-white font-semibold px-8 py-3 rounded-xl hover:bg-emerald-700 transition-colors">
            Find a Licensed Mortgage Broker
          </Link>
        </div>
      </section>

      {/* Related links */}
      <section className="py-10 bg-white">
        <div className="container-custom">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Explore More Home Loan Guides</h2>
          <div className="flex flex-wrap gap-3">
            {[
              { label: "Lenders Mortgage Insurance", href: "/home-loans/lmi" },
              { label: "Bridging Finance", href: "/home-loans/bridging-finance" },
              { label: "Variable vs Fixed Rate", href: "/home-loans/variable" },
              { label: "Fixed Rate Guide", href: "/home-loans/fixed" },
              { label: "Offset & Redraw", href: "/home-loans/offset-redraw" },
              { label: "Interest-Only Loans", href: "/home-loans/interest-only" },
              { label: "Investment Home Loans", href: "/home-loans/investment" },
              { label: "Find a Mortgage Broker", href: "/advisors/mortgage-brokers" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="bg-white border border-slate-200 text-slate-700 text-sm font-medium px-4 py-2 rounded-lg hover:border-slate-400 hover:text-slate-900 transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Compliance Footer */}
      <footer className="py-8 bg-white border-t border-slate-100">
        <div className="container-custom max-w-3xl text-xs text-slate-500 space-y-2">
          <p>
            <strong>Credit disclaimer:</strong> invest.com.au is not licensed to provide credit assistance under the National Consumer Credit Protection Act 2009 (Cth). This page contains general information only and does not constitute a credit recommendation, credit advice, or an offer of credit. All figures and cost estimates on this page are indicative only and vary by lender, loan size, state, and individual circumstances. Always obtain and compare formal quotes before deciding to refinance. Consult a licensed mortgage broker or Australian Credit Licensee for advice specific to your situation.
          </p>
          <p>{GENERAL_ADVICE_WARNING}</p>
        </div>
      </footer>
    </div>
  );
}
