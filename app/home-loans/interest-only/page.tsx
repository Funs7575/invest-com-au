import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Interest-Only Home Loans Explained Australia (${CURRENT_YEAR}) | invest.com.au`,
  description: `What is an interest-only home loan in Australia, how IO vs P&I repayments compare, APRA restrictions, repayment shock, tax deductibility for investors, and when IO makes sense. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Interest-Only Home Loans Explained Australia (${CURRENT_YEAR})`,
    description:
      "Interest-only loans explained — IO vs P&I comparison, worked repayment example, repayment shock, APRA post-2017 rules, negative gearing, offset strategies, and when IO makes sense vs not.",
    url: `${SITE_URL}/home-loans/interest-only`,
    images: [{ url: `/api/og?title=Interest-Only+Home+Loans+Explained`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/home-loans/interest-only` },
};

const HERO_STATS = [
  { label: "IO period (owner-occ)", value: "1–5 years", sub: "Lender dependent" },
  { label: "IO period (investment)", value: "Up to 10 years", sub: "Subject to APRA rules" },
  { label: "Typical IO rate premium", value: "+0.2–0.5%", sub: "Above equivalent P&I rate" },
  { label: "Equity built during IO", value: "Zero", sub: "No principal repaid" },
];

const COMPARISON_ROWS = [
  {
    feature: "Monthly repayment ($600K, 6.5%)",
    io: "$3,250",
    pi: "$3,932",
    notes: "IO saves $682/month",
  },
  {
    feature: "Principal reduced each month",
    io: "$0",
    pi: "~$682 (rises over time)",
    notes: "IO builds no equity",
  },
  {
    feature: "Total interest over 30 years",
    io: "Higher — no principal reduction",
    pi: "Lower — balance shrinks faster",
    notes: "IO costs significantly more long-term",
  },
  {
    feature: "Equity after 5 years",
    io: "None from repayments",
    pi: "~$50,000 (via principal)",
    notes: "Plus any market value gain",
  },
  {
    feature: "APRA serviceability buffer",
    io: "Applied at IO rate + 3%",
    pi: "Applied at P&I rate + 3%",
    notes: "IO assessed more strictly",
  },
  {
    feature: "Repayment after IO period ends",
    io: "Jumps to P&I on remaining balance",
    pi: "Stays the same (P&I from start)",
    notes: 'IO creates "repayment shock"',
  },
  {
    feature: "Lender appetite post-2017",
    io: "Significantly restricted",
    pi: "Preferred by lenders",
    notes: "APRA caps on IO lending",
  },
  {
    feature: "Tax deductibility (investment)",
    io: "100% of IO payment tax-deductible",
    pi: "Only interest portion deductible",
    notes: "IO maximises deductions during IO period",
  },
];

const WORKED_EXAMPLE = {
  loanAmount: "$600,000",
  rate: "6.5%",
  term: "30 years",
  ioMonthly: "$3,250",
  piMonthly: "$3,932",
  piAfterIO: "$4,278",
  ioPeriod: "5 years",
  interestSavedDuringIO: "$40,920 over 5 years",
  balanceAfterIO: "$600,000",
  balanceAfterPIStart: "$600,000",
  extraInterest: "Approx. $80,000 more lifetime interest on IO vs P&I",
};

const APRA_POINTS = [
  {
    title: "2017 IO cap — 30% of new lending",
    desc: "From 2017, APRA required banks to hold IO loans below 30% of new residential mortgage flows. This sharply reduced lender appetite for IO loans and lifted IO rates above P&I rates — a gap that has largely persisted since.",
  },
  {
    title: "Lenders must demonstrate suitability",
    desc: "Lenders are required under responsible lending obligations to demonstrate that an IO loan is suitable for the borrower. Applying for an IO loan without a clear documented reason (investor cash flow management, short-term owner-occupier circumstances) faces higher hurdles.",
  },
  {
    title: "Serviceability assessed on P&I reversion",
    desc: "Even during the IO period, banks stress-test your ability to service the loan as if you were already making P&I repayments — at the standard serviceability buffer of +3%. This means you must qualify for a significantly higher repayment than you actually make.",
  },
  {
    title: "IO rate premium is real",
    desc: "Post-APRA, interest-only loans typically carry a 0.2–0.5% rate premium over the equivalent P&I product. On a $600,000 loan this adds $1,200–$3,000 per year in extra interest — partly offsetting the cash flow benefit for investors.",
  },
];

const OFFSET_STRATEGY = [
  {
    title: "Extra cash goes into the offset, not the loan",
    desc: "With an IO loan, you cannot make extra repayments that reduce the principal (there is no principal to pay). Instead, surplus cash should go into a 100% offset account linked to the loan. Every dollar in the offset reduces the interest charged — without reducing the tax-deductible loan balance for investors.",
  },
  {
    title: "Offset preserves the deductible debt",
    desc: "For investment properties, a key advantage of using an offset rather than paying down principal: the loan balance (and therefore the fully tax-deductible interest) is preserved. If you paid down the principal you would reduce your deduction; in the offset you get the same economic benefit but maintain the deduction.",
  },
  {
    title: "Offset interest calculation",
    desc: "If you have $50,000 in an offset against a $600,000 IO loan at 6.5%, you only pay interest on $550,000 — saving $3,250/year in interest. The $50,000 earns no explicit return, but the effective return is 6.5% (your loan rate), which is typically higher than a savings account rate.",
  },
];

const SCENARIOS_GOOD = [
  {
    title: "Property investor — negative gearing cash flow",
    desc: "An investor whose rental income does not cover P&I repayments uses IO to reduce the monthly shortfall. The interest is fully tax-deductible, and the negative gearing loss offsets other income. IO allows the investor to hold more properties simultaneously without being cash-flow constrained.",
    badge: "Makes sense",
    badgeColor: "text-green-700 bg-green-50 border-green-200",
  },
  {
    title: "Owner-occupier in early career, income expected to rise",
    desc: "A first-time buyer whose income is lower today but is on a clear professional trajectory (medicine, law, engineering graduate) may use IO for 1–2 years to manage cash flow while building savings. Once income rises, they switch to P&I. Risk: discipline must be maintained — the lower IO repayment cannot become a spending habit.",
    badge: "Makes sense",
    badgeColor: "text-green-700 bg-green-50 border-green-200",
  },
  {
    title: "Owner-occupier converting PPOR to investment property",
    desc: "A borrower who intends to move to a new home within 3–5 years (converting their current home to an investment property) may choose IO now. When the property becomes an investment, the full loan balance is deductible — they have not permanently reduced the deductible principal via premature P&I repayments.",
    badge: "Makes sense",
    badgeColor: "text-green-700 bg-green-50 border-green-200",
  },
];

const SCENARIOS_BAD = [
  {
    title: "Owner-occupier with no clear debt reduction plan",
    desc: "An owner-occupier who simply prefers a lower repayment and has no structured offset savings strategy is building zero equity for years. When the IO period ends, their repayment jumps significantly, they owe the full original balance, and any equity they have comes entirely from market movements — not their own repayments.",
    badge: "Does not make sense",
    badgeColor: "text-red-700 bg-red-50 border-red-200",
  },
  {
    title: "Investor buying at the limit of serviceability",
    desc: "An investor who can only qualify because the IO repayment fits their serviceability is in a fragile position. When the IO period ends, the P&I reversion is mandatory — not optional. If their financial position has not improved materially, they may face hardship or be forced to sell at an inopportune time.",
    badge: "Does not make sense",
    badgeColor: "text-red-700 bg-red-50 border-red-200",
  },
  {
    title: "Borrower planning to rely on future refinance to extend IO",
    desc: "Assuming you can simply refinance to a new IO period at the end of the current one is risky. Credit conditions change, property values fluctuate, and post-APRA restrictions mean lenders may decline a second IO term if the loan has grown relative to the property value or your income has not improved. Do not plan on IO extensions you do not yet have approval for.",
    badge: "Does not make sense",
    badgeColor: "text-red-700 bg-red-50 border-red-200",
  },
];

const REFINANCE_STEPS = [
  {
    step: 1,
    title: "Start preparing 12 months before IO expiry",
    desc: "The IO period ending is predictable — plan well ahead. Twelve months before expiry, review your financial position, property value, and loan balance. This gives you time to build savings, pay down other debts, and improve your application before the deadline.",
  },
  {
    step: 2,
    title: "Know your current LVR",
    desc: "Get a current property valuation (or use comparable sales data) to understand your loan-to-value ratio. LVR below 80% gives you significantly more refinancing leverage and lender choice. If you are above 80%, you may need to pay down some balance before refinancing to avoid LMI.",
  },
  {
    step: 3,
    title: "Compare rates across lenders",
    desc: "The IO-to-P&I conversion is your best opportunity to renegotiate your rate. Your existing lender may offer a retention rate — but this may not be as competitive as what a competing lender would offer for a clean P&I application. Use this moment to compare the market.",
  },
  {
    step: 4,
    title: "Consider extending IO vs switching to P&I",
    desc: "If you have a legitimate ongoing reason (continuing investment strategy, documented cash flow management), you can apply to extend the IO period rather than convert to P&I. However, APRA restrictions mean lenders are cautious. Assess whether the IO rate premium plus continued zero equity build still makes financial sense at this stage.",
  },
  {
    step: 5,
    title: "Apply and settle before the IO period expires",
    desc: "Allow 6–8 weeks for a refinancing application to be processed and settled. Do not wait until the IO period has already expired — your repayment will revert to P&I automatically on expiry date, and a last-minute application under pressure puts you in a weak negotiating position.",
  },
];

const FAQS = [
  {
    q: "What is an interest-only home loan in Australia?",
    a: "An interest-only (IO) home loan is a loan where repayments cover only the interest charged each month — no principal is repaid during the IO period. At the end of the IO period (typically 1–5 years for owner-occupiers, up to 10 years for investors), the loan automatically reverts to principal and interest repayments on the full original balance, compressed into the remaining loan term. This means the P&I repayments after conversion are higher than if you had started on P&I from the beginning.",
  },
  {
    q: "Why is the repayment higher after the interest-only period ends?",
    a: "When an IO period ends, the lender recalculates your repayment as a P&I repayment over the remaining loan term — not the original 30-year term. For example, on a $600,000 loan with a 5-year IO period and 30-year total term, the P&I repayments after year 5 are calculated to fully repay $600,000 over 25 years (not 30). This shorter remaining term drives the higher monthly repayment. This jump is called repayment shock and is one of the most significant risks of IO loans.",
  },
  {
    q: "Are interest-only loans tax-deductible for investment properties?",
    a: "Yes. For an investment property, the interest you pay on your loan is generally fully tax-deductible as a rental property expense — this applies whether the loan is IO or P&I. During an IO period, your entire monthly repayment is interest (there is no principal component), so the full IO repayment amount is typically tax-deductible. This is one of the cash flow management advantages for property investors using negative gearing strategies. You should consult a registered tax agent or accountant for advice specific to your situation.",
  },
  {
    q: "Why did APRA restrict interest-only lending in 2017?",
    a: "The Australian Prudential Regulation Authority (APRA) implemented a cap on interest-only residential mortgage lending in March 2017 following concerns about housing market overheating, investor credit growth, and the systemic risk of large volumes of loans with no principal reduction. Banks were required to hold new IO lending below 30% of total new residential lending flows. This policy sharply reduced lender appetite for IO products, resulted in IO-specific rate increases, and tightened the qualifying criteria for IO approvals. While APRA removed the formal cap in 2018, the higher IO rates and stricter suitability requirements have largely remained.",
  },
  {
    q: "Can I make extra repayments on an interest-only loan?",
    a: "On a pure interest-only loan, the standard repayment covers interest only and does not reduce the principal balance. Some lenders allow voluntary additional repayments that reduce the principal balance, while others do not permit this during the IO period. A more tax-effective approach for investment properties is to direct surplus cash into a 100% offset account linked to the loan. The offset reduces the interest charged (providing the same economic benefit as a principal repayment) while preserving the full loan balance and therefore the full tax-deductible interest deduction.",
  },
  {
    q: "How do I switch from interest-only to principal and interest?",
    a: "You have two options when an IO period ends. First, your loan automatically converts to P&I on the expiry date — no action is required, but your repayment will increase significantly. Second, you can proactively refinance to a new P&I loan (at your existing lender or a competing lender) before expiry, allowing you to shop for the best rate and structure the repayment schedule to suit your circumstances. Starting this process 6–12 months before expiry is strongly recommended. A licensed mortgage broker can compare current P&I rates across lenders and manage the refinancing process.",
  },
];

export default function InterestOnlyPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Home Loans", url: absoluteUrl("/home-loans") },
    { name: "Interest-Only Loans", url: absoluteUrl("/home-loans/interest-only") },
  ]);
  const faqLd = faqJsonLd(FAQS.map((f) => ({ q: f.q, a: f.a })));

  return (
    <div className="bg-white min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {faqLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />}

      {/* Hero */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-700 text-white py-14">
        <div className="container-custom">
          <nav aria-label="Breadcrumb" className="text-sm text-slate-400 mb-4 flex items-center gap-1.5">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <span>/</span>
            <Link href="/home-loans" className="hover:text-white transition-colors">Home Loans</Link>
            <span>/</span>
            <span className="text-white">Interest-Only Loans</span>
          </nav>
          <div className="inline-block bg-slate-700 text-slate-300 text-xs font-medium px-3 py-1 rounded-full mb-4">
            General information only — not credit assistance
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
            Interest-Only Home Loans Explained
          </h1>
          <p className="text-lg text-slate-300 max-w-2xl mb-8">
            An interest-only (IO) loan means you only pay the interest on your loan for a set period — your balance never reduces. Here&apos;s how IO compares to P&amp;I, why the repayment jumps when IO ends, how APRA restrictions changed the landscape, and when IO genuinely makes sense versus when it doesn&apos;t.
          </p>
          {/* Key stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {HERO_STATS.map((stat) => (
              <div key={stat.label} className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                <p className="text-xs text-slate-400 mb-1">{stat.label}</p>
                <p className="text-lg font-bold text-white">{stat.value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{stat.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* What is IO */}
      <section className="py-12 bg-white">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">What Is an Interest-Only Home Loan?</h2>
          <p className="text-slate-600 mb-4">
            An interest-only home loan is structured so that your monthly repayment covers <strong>only the interest</strong> charged on the outstanding balance — no part of the payment reduces the principal (the amount you originally borrowed). Your loan balance at the end of the IO period is identical to the balance at the start.
          </p>
          <p className="text-slate-600 mb-4">
            IO periods are typically <strong>1–5 years for owner-occupied properties</strong> and up to <strong>10 years for investment properties</strong>, subject to lender policy and APRA serviceability requirements. When the IO period ends, the loan automatically reverts to principal and interest repayments — calculated over the <em>remaining</em> loan term.
          </p>
          <p className="text-slate-600 mb-5">
            Because no principal has been repaid during the IO period, the P&amp;I repayments after conversion are higher than if you had started on P&amp;I from the beginning. This &ldquo;repayment shock&rdquo; is the most common IO risk that borrowers underestimate.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
            <h3 className="font-bold text-amber-900 mb-2">The equity trade-off</h3>
            <p className="text-amber-800 text-sm leading-relaxed">
              During an IO period, the only way equity grows in your property is through <strong>market value appreciation</strong> — your repayments contribute nothing. In a flat or falling market, an IO borrower can end a 5-year IO period owing exactly what they borrowed, with no equity buffer from repayments if they need to sell or refinance.
            </p>
          </div>
        </div>
      </section>

      {/* IO vs P&I comparison table */}
      <section className="py-12 bg-slate-50">
        <div className="container-custom">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">IO vs P&amp;I: Detailed Comparison</h2>
          <p className="text-sm text-slate-500 mb-6">Based on a $600,000 loan at 6.5% over 30 years.</p>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table aria-label="Interest-only vs principal and interest loan comparison" className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th scope="col" className="text-left px-5 py-3">Feature</th>
                  <th scope="col" className="text-left px-5 py-3 text-blue-300">Interest-only</th>
                  <th scope="col" className="text-left px-5 py-3 text-green-300">Principal &amp; interest</th>
                  <th scope="col" className="text-left px-5 py-3 text-slate-300">Notes</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className="px-5 py-3 font-medium text-slate-800">{row.feature}</td>
                    <td className="px-5 py-3 text-blue-700 font-semibold">{row.io}</td>
                    <td className="px-5 py-3 text-green-700 font-semibold">{row.pi}</td>
                    <td className="px-5 py-3 text-slate-500 text-xs">{row.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Worked example */}
      <section className="py-12 bg-white">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Worked Example: $600K Loan at 6.5%</h2>
          <p className="text-slate-600 mb-6">
            The numbers below illustrate the real repayment difference between IO and P&amp;I — and the repayment shock that occurs when an IO period ends.
          </p>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden mb-6">
            <div className="bg-slate-800 text-white px-6 py-4">
              <p className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Loan assumptions</p>
              <p className="text-xs text-slate-400 mt-1">
                Loan: {WORKED_EXAMPLE.loanAmount} &nbsp;|&nbsp; Rate: {WORKED_EXAMPLE.rate} &nbsp;|&nbsp;
                Term: {WORKED_EXAMPLE.term} &nbsp;|&nbsp; IO period: {WORKED_EXAMPLE.ioPeriod}
              </p>
            </div>
            <div className="p-6 space-y-5">
              {/* Monthly comparison */}
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">IO monthly repayment</p>
                  <p className="text-2xl font-bold text-blue-900">{WORKED_EXAMPLE.ioMonthly}</p>
                  <p className="text-xs text-blue-700 mt-1">Years 1–5 (IO period)</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1">P&amp;I from day 1</p>
                  <p className="text-2xl font-bold text-green-900">{WORKED_EXAMPLE.piMonthly}</p>
                  <p className="text-xs text-green-700 mt-1">Constant, principal reducing</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">P&amp;I after IO expires</p>
                  <p className="text-2xl font-bold text-amber-900">{WORKED_EXAMPLE.piAfterIO}</p>
                  <p className="text-xs text-amber-700 mt-1">
                    Year 6 onwards (25 years left)
                  </p>
                </div>
              </div>

              {/* Repayment shock callout */}
              <div className="bg-red-50 border border-red-200 rounded-xl p-5">
                <h3 className="font-bold text-red-900 mb-2">Repayment shock</h3>
                <p className="text-sm text-red-800 leading-relaxed">
                  After a 5-year IO period, the loan still has <strong>$600,000 outstanding</strong> — none of the principal has been paid. The lender then recalculates repayments to fully repay this balance over the <strong>remaining 25 years</strong>. This produces a P&amp;I repayment of <strong>{WORKED_EXAMPLE.piAfterIO}/month</strong> — a jump of <strong>$1,028/month</strong> compared to the IO repayment, and <strong>$346/month more</strong> than if P&amp;I had been structured from the start.
                </p>
              </div>

              {/* Lifetime cost summary */}
              <div className="bg-slate-900 text-green-400 font-mono text-sm rounded-xl p-4">
                IO monthly saving: $3,932 − $3,250 = $682/month (years 1–5){"\n"}
                Total IO saving years 1–5: {WORKED_EXAMPLE.interestSavedDuringIO}{"\n"}
                Extra lifetime interest (IO vs P&I from day 1): {WORKED_EXAMPLE.extraInterest}
              </div>
            </div>
          </div>

          <p className="text-slate-500 text-xs">
            Figures are illustrative only. Actual repayments depend on rate type (variable/fixed), lender fees, and the exact IO and loan term agreed at origination. Rates used are for comparison only and are not a quote.
          </p>
        </div>
      </section>

      {/* Who uses IO loans */}
      <section className="py-12 bg-slate-50">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Who Uses Interest-Only Loans?</h2>
          <div className="space-y-5">
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="font-bold text-slate-900 mb-2">Property investors (most common use case)</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                The primary users of IO loans are <strong>property investors</strong> managing cash flow alongside a negative gearing strategy. Because the interest on an investment loan is fully tax-deductible, keeping the loan in IO form maximises the deductible expense and minimises the after-tax monthly outflow. The investor retains more cash each month, which can be directed into offset accounts, further investments, or living expenses.
              </p>
              <p className="text-sm text-slate-600 leading-relaxed mt-3">
                A $600,000 investment loan at IO costs $3,250/month — which at a 45% marginal tax rate has an after-tax cost of approximately $1,788/month (assuming the full amount is deductible against rental income and other income). This cash flow efficiency is the core reason investors favour IO.
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="font-bold text-slate-900 mb-2">Owner-occupiers in the early years</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Some owner-occupiers use IO in the first 1–3 years of a home loan to manage cash flow while paying other large upfront costs (stamp duty, renovations, furniture). IO provides breathing room while income stabilises or other debt is paid down. However, owner-occupiers get no tax deduction on the interest, so the cash flow benefit is not tax-amplified — and the full repayment shock risk applies when IO ends.
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="font-bold text-slate-900 mb-2">Borrowers planning to convert PPOR to investment</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                A homeowner who anticipates upgrading to a new home (converting their current property to a rental) may choose IO now to avoid permanently reducing the deductible loan balance before it becomes an investment loan. This is a deliberate tax structuring consideration — seek specific advice from a registered tax agent before using IO for this purpose.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* APRA restrictions */}
      <section className="py-12 bg-white">
        <div className="container-custom">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">APRA Restrictions Post-2017</h2>
          <p className="text-sm text-slate-500 mb-6">
            Regulatory changes since 2017 have materially changed the interest-only market in Australia. Understanding the current environment helps explain why IO loans are harder to get — and more expensive — than they were before 2017.
          </p>
          <div className="grid md:grid-cols-2 gap-5 max-w-4xl">
            {APRA_POINTS.map((item) => (
              <div key={item.title} className="bg-slate-50 rounded-xl border border-slate-200 p-6">
                <h3 className="font-bold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-5 max-w-3xl">
            <p className="text-sm font-semibold text-blue-900 mb-1">Current landscape</p>
            <p className="text-sm text-blue-800">
              APRA formally removed the 30% IO cap in 2018 once the market had cooled. However, lenders have maintained the rate differential between IO and P&amp;I products, and responsible lending suitability requirements remain in place. IO loans are available — but borrowers must demonstrate a clear, documented reason for choosing IO over P&amp;I, and must satisfy serviceability on a P&amp;I basis at the higher serviceability buffer rate.
            </p>
          </div>
        </div>
      </section>

      {/* Offset strategy */}
      <section className="py-12 bg-slate-50">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">IO Period Strategy: Using an Offset Account</h2>
          <p className="text-slate-600 mb-6">
            Because IO repayments do not reduce principal, a disciplined approach to accumulating savings elsewhere is essential. A 100% offset account is the standard vehicle — here is how the strategy works.
          </p>
          <div className="space-y-4">
            {OFFSET_STRATEGY.map((item, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-xl p-6 flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-sm">
                  {i + 1}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 mb-1">{item.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 bg-amber-50 border border-amber-200 rounded-xl p-5">
            <h3 className="font-semibold text-amber-900 mb-2">Important: offset discipline is non-negotiable</h3>
            <p className="text-sm text-amber-800">
              The offset strategy only works if the surplus cash actually accumulates and stays there. An IO loan where the surplus cash is spent rather than saved delivers the worst possible outcome — lower equity, higher lifetime interest cost, and the full repayment shock when IO expires. Treat the offset balance as your mandatory equity substitute during the IO period.
            </p>
          </div>
        </div>
      </section>

      {/* Tax deductibility */}
      <section className="py-12 bg-white">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Tax Deductibility for Investment Properties</h2>
          <p className="text-slate-600 mb-4">
            For properties held as investments, the ATO allows investors to deduct the interest paid on the loan as a rental property expense against their taxable income. This is the foundational principle behind negative gearing in Australia.
          </p>
          <div className="bg-white border border-slate-200 rounded-xl p-6 mb-5">
            <div className="overflow-x-auto">
              <table aria-label="Tax deductibility of IO vs P&I investment loans at 45% marginal tax rate" className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th scope="col" className="text-left py-2 font-semibold text-slate-700">Scenario</th>
                    <th scope="col" className="text-left py-2 font-semibold text-slate-700">Deductible amount</th>
                    <th scope="col" className="text-left py-2 font-semibold text-slate-700">After-tax cost (45% MTR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-3 text-slate-700">IO on $600K at 6.5% ($3,250/month)</td>
                    <td className="py-3 text-green-700 font-semibold">$39,000/year (100%)</td>
                    <td className="py-3 font-semibold text-slate-800">$21,450/year</td>
                  </tr>
                  <tr>
                    <td className="py-3 text-slate-700">P&amp;I on $600K at 6.5% ($3,932/month)</td>
                    <td className="py-3 text-blue-700 font-semibold">~$39,000/year (interest only)</td>
                    <td className="py-3 font-semibold text-slate-800">$21,450/year (interest)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <p className="text-slate-600 text-sm mb-4">
            In the early years of a P&amp;I loan, the interest component of each repayment is high and the principal component is low — so the deductible amount is similar to an IO loan initially. The deductibility advantage of IO grows more significant over time, as P&amp;I progressively reduces the balance (and therefore the interest charged).
          </p>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
            <p className="text-sm font-semibold text-slate-800 mb-2">Tax advice disclaimer</p>
            <p className="text-xs text-slate-500 leading-relaxed">
              This information is general in nature and does not constitute tax advice. The deductibility of investment loan interest depends on your specific circumstances, how the loan is used, and current ATO guidance. You must consult a registered tax agent or accountant before making decisions based on expected tax deductions.
            </p>
          </div>
        </div>
      </section>

      {/* Scenarios: good and bad */}
      <section className="py-12 bg-slate-50">
        <div className="container-custom">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            When IO Makes Sense — and When It Doesn&apos;t
          </h2>
          <p className="text-sm text-slate-500 mb-8">
            IO is the right tool in specific, well-planned situations. In others, it delays equity building without a compensating benefit.
          </p>

          <div className="mb-8">
            <h3 className="text-lg font-bold text-slate-900 mb-4">3 scenarios where IO makes sense</h3>
            <div className="grid md:grid-cols-3 gap-5">
              {SCENARIOS_GOOD.map((s) => (
                <div key={s.title} className="bg-white rounded-xl border border-slate-200 p-6">
                  <div className={`inline-block text-xs font-semibold px-3 py-1 rounded-full border mb-4 ${s.badgeColor}`}>
                    {s.badge}
                  </div>
                  <h4 className="font-bold text-slate-900 mb-2">{s.title}</h4>
                  <p className="text-sm text-slate-600 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-4">3 scenarios where IO does NOT make sense</h3>
            <div className="grid md:grid-cols-3 gap-5">
              {SCENARIOS_BAD.map((s) => (
                <div key={s.title} className="bg-white rounded-xl border border-slate-200 p-6">
                  <div className={`inline-block text-xs font-semibold px-3 py-1 rounded-full border mb-4 ${s.badgeColor}`}>
                    {s.badge}
                  </div>
                  <h4 className="font-bold text-slate-900 mb-2">{s.title}</h4>
                  <p className="text-sm text-slate-600 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Refinancing from IO to P&I */}
      <section className="py-12 bg-white">
        <div className="container-custom">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Refinancing from Interest-Only to P&amp;I: Timing and Rate Strategy
          </h2>
          <p className="text-sm text-slate-500 mb-8">
            The IO-to-P&amp;I conversion is one of the most financially significant transitions in a loan lifecycle. A proactive approach is far better than letting the conversion happen automatically.
          </p>
          <div className="grid md:grid-cols-2 gap-5 max-w-4xl">
            {REFINANCE_STEPS.map((step) => (
              <div key={step.step} className="bg-white rounded-xl border border-slate-200 p-6 flex gap-4">
                <div className="flex-shrink-0 w-9 h-9 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-sm">
                  {step.step}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 mb-1">{step.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-5 max-w-3xl">
            <p className="text-sm font-semibold text-blue-900 mb-1">Rate negotiation leverage</p>
            <p className="text-sm text-blue-800">
              Converting from IO to P&amp;I is one of the few times you hold natural leverage over your lender — they know you are looking at the market. Use this moment to request a rate review. Many borrowers who refinance at IO expiry find they can secure a P&amp;I rate 0.3–0.5% below their existing IO rate, which partially or fully offsets the repayment increase.
            </p>
          </div>
        </div>
      </section>

      {/* NCCP disclaimer / CTA */}
      <section className="py-12 bg-slate-50">
        <div className="container-custom">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-slate-900 mb-3">Talk to a Licensed Mortgage Broker</h2>
            <p className="text-slate-600 mb-4 text-sm">
              Whether you are considering an IO loan for an investment property or approaching the end of an IO period and need to refinance, a licensed mortgage broker can compare products across multiple lenders, model your repayment scenarios, and help you understand whether IO is right for your circumstances — at no cost to you.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-left">
              <p className="text-xs text-amber-800 leading-relaxed">
                <strong>Credit assistance notice:</strong> invest.com.au is not licensed to provide credit assistance under the National Consumer Credit Protection Act 2009 (Cth) and does not provide credit advice. This page is general information only. For credit advice and assistance specific to your situation, we refer you to a licensed mortgage broker or Australian Credit Licensee. Any referral to a mortgage broker is a referral service only — invest.com.au does not act as a credit intermediary.
              </p>
            </div>
            <Link
              href="/advisors/mortgage-brokers"
              className="inline-block bg-slate-800 text-white font-semibold px-8 py-3 rounded-xl hover:bg-slate-900 transition-colors"
            >
              Find a Licensed Mortgage Broker
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-12 bg-white">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <details key={i} className="group border border-slate-200 rounded-xl overflow-hidden">
                <summary className="flex items-center justify-between px-5 py-4 cursor-pointer font-medium text-slate-800 hover:bg-slate-50 bg-white">
                  {faq.q}
                  <span className="ml-3 text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="px-5 pb-4 pt-1 text-sm text-slate-600 leading-relaxed bg-white">{faq.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Related links */}
      <section className="py-10 bg-slate-50">
        <div className="container-custom">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Explore More Home Loan Guides</h2>
          <div className="flex flex-wrap gap-3">
            {([
              ["Investment Home Loans", "/home-loans/investment"],
              ["Refinancing Guide", "/home-loans/refinancing"],
              ["Offset & Redraw", "/home-loans/offset-redraw"],
              ["Variable vs Fixed Rate", "/home-loans/variable"],
              ["Fixed Rate Guide", "/home-loans/fixed"],
              ["Bridging Finance", "/home-loans/bridging-finance"],
              ["Lenders Mortgage Insurance", "/home-loans/lmi"],
              ["Find a Mortgage Broker", "/advisors/mortgage-brokers"],
            ] as [string, string][]).map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className="bg-white border border-slate-200 text-slate-700 text-sm font-medium px-4 py-2 rounded-lg hover:border-slate-400 hover:text-slate-900 transition-colors"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Compliance footer */}
      <footer className="py-8 bg-white border-t border-slate-100">
        <div className="container-custom max-w-3xl text-xs text-slate-500 space-y-2">
          <p>
            <strong>Credit disclaimer:</strong> This information is general in nature and does not constitute credit advice. Credit assistance is provided by licensed credit providers. You should consider whether any credit product is appropriate for your circumstances before applying. invest.com.au is not licensed to provide credit assistance under the National Consumer Credit Protection Act 2009 (Cth). Consult a licensed mortgage broker or Australian Credit Licensee for advice specific to your situation.
          </p>
          <p>{GENERAL_ADVICE_WARNING}</p>
        </div>
      </footer>
    </div>
  );
}
