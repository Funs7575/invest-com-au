import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Offset Account vs Redraw Facility: Complete Guide (${CURRENT_YEAR}) | invest.com.au`,
  description: `How offset accounts and redraw facilities work, how much you can save, the investor tax trap with redraw, and salary parking strategy. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Offset Account vs Redraw Facility: Complete Guide (${CURRENT_YEAR})`,
    description:
      "Offset reduces daily interest; redraw lets you access overpayments. Key differences, investor tax trap, salary parking strategy, cost analysis, and worked examples.",
    url: `${SITE_URL}/home-loans/offset-redraw`,
    images: [{ url: `/api/og?title=Offset+Account+vs+Redraw+Facility`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/home-loans/offset-redraw` },
};

const HERO_STATS = [
  { label: "Annual saving example", value: "$3,250/yr", sub: "$500K loan, $50K offset at 6.5%" },
  { label: "Offset account fee", value: "$10–$40/mo", sub: "Packaged loan with offset" },
  { label: "Redraw notice period", value: "Same-day+", sub: "Varies by lender" },
  { label: "Best for investors", value: "Offset wins", sub: "Preserves tax deductibility" },
];

const COMPARISON = [
  {
    feature: "Flexibility",
    offset: "Instant access — ATM, EFTPOS, bank transfer anytime",
    redraw: "Next business day or longer; lender can restrict in hardship",
  },
  {
    feature: "Tax implications for investors",
    offset: "Funds stay legally separate — no contamination of loan deductibility",
    redraw: "Redrawing for personal purposes can deem the redrawn portion as personal debt — interest no longer deductible",
  },
  {
    feature: "Availability on basic loans",
    offset: "Rarely — basic (low-rate) loans typically exclude offset",
    redraw: "Usually included even on basic variable loans",
  },
  {
    feature: "Access method",
    offset: "Debit card, internet banking, BPAY — like a normal transaction account",
    redraw: "Online redraw portal or branch request; not a card-accessible account",
  },
  {
    feature: "Effect on interest",
    offset: "Daily — full $1-for-$1 reduction on outstanding principal",
    redraw: "Same daily interest reduction, but funds are locked inside the loan",
  },
  {
    feature: "FHSS compatibility",
    offset: "No direct interaction — offset does not affect FHSS contributions",
    redraw: "Voluntary contributions to loan count as extra repayments; redraw available but FHSS rules do not apply",
  },
  {
    feature: "Partner visibility",
    offset: "Separate account — can be set up as a joint or individual account independently",
    redraw: "Tied to the loan — accessible to all borrowers on the mortgage",
  },
];

const FAQS = [
  {
    q: "How much can an offset account save on a $500,000 home loan?",
    a: "With $50,000 consistently in offset on a $500,000 loan at 6.5% p.a., you save approximately $3,250 per year in interest (6.5% of $50,000). Over a 25-year loan term, maintaining and growing your offset balance compounds those savings — a $50,000 average offset balance could reduce total interest paid by $60,000–$80,000 and shorten the loan term by 2–4 years. The saving grows the higher the offset balance.",
  },
  {
    q: "Why is redraw risky for investment property loans?",
    a: "If you redraw funds from an investment loan for a personal purpose — such as a holiday, home renovation, or personal purchase — the ATO may deem that portion of the loan to be for personal use. This makes the interest on the redrawn amount non-deductible, creating a 'mixed-purpose loan' that is a known ATO audit trigger. An offset account avoids this contamination entirely: your savings remain legally separate from the loan balance, preserving full deductibility of investment interest. For investors, offset is almost always the better choice.",
  },
  {
    q: "What is salary parking and how does it save money?",
    a: "Salary parking means directing your entire salary into your offset account and leaving it there for as long as possible before paying expenses. Because interest is calculated daily on the loan balance minus the offset balance, even a few thousand dollars sitting in your offset for an extra week or fortnight can meaningfully reduce your interest. The strategy is most powerful when combined with a credit card for day-to-day expenses (paid in full each month), so your salary stays in offset for the entire billing cycle.",
  },
  {
    q: "Is 100% offset better than partial offset?",
    a: "Yes — significantly. A 100% offset account means every dollar in the account reduces the interest-bearing loan balance dollar-for-dollar. A partial offset account (for example, 40% offset) means only a fraction of your savings counts — if you have $50,000 in a 40% partial offset, only $20,000 reduces your loan balance. Partial offset accounts are uncommon in modern lending but still exist in some packaged home loans. Always confirm whether the offset is 100% before choosing a loan.",
  },
  {
    q: "Do all home loans have an offset account?",
    a: "No. Basic (low-rate) variable loans and most fixed-rate loans do not include an offset account. Standard variable loans from major and second-tier lenders typically do. The rate difference between a basic loan (no offset) and a standard variable loan (offset included) is often 0.1–0.3% p.a. Whether paying that rate premium is worthwhile depends on how much you consistently keep in offset — if your offset balance is low, a basic loan with a lower rate may cost less overall.",
  },
  {
    q: "Can I have multiple offset accounts?",
    a: "Some lenders — particularly the major banks on their packaged home loan products — allow multiple offset accounts linked to a single mortgage. This can be useful for budgeting: you might run separate offset accounts labelled 'Holidays', 'Emergency Fund', and 'Renovations', all while every dollar in each account reduces your daily mortgage interest. Check your lender's policy and whether there are per-account fees before setting up multiple accounts.",
  },
];

export default function OffsetRedrawPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Home Loans", url: absoluteUrl("/home-loans") },
    { name: "Offset Account vs Redraw", url: absoluteUrl("/home-loans/offset-redraw") },
  ]);
  const faqLd = faqJsonLd(FAQS.map((f) => ({ q: f.q, a: f.a })));

  return (
    <div className="bg-white min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {faqLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />}

      {/* Hero */}
      <div className="bg-gradient-to-br from-teal-900 to-teal-700 text-white py-14">
        <div className="container-custom">
          <nav aria-label="Breadcrumb" className="text-sm text-teal-200 mb-4 flex items-center gap-1.5">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <span>/</span>
            <Link href="/home-loans" className="hover:text-white transition-colors">Home Loans</Link>
            <span>/</span>
            <span className="text-white">Offset &amp; Redraw</span>
          </nav>
          <div className="inline-block bg-teal-800 text-teal-200 text-xs font-medium px-3 py-1 rounded-full mb-4">
            General information only — not credit assistance
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
            Offset Account vs Redraw Facility
          </h1>
          <p className="text-lg text-teal-100 max-w-2xl mb-8">
            Both reduce the interest you pay on your mortgage — but they work differently and have very different tax implications for investment property borrowers. Here&apos;s everything you need to know.
          </p>
          {/* Key stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {HERO_STATS.map((stat) => (
              <div key={stat.label} className="bg-teal-800 rounded-xl p-4 border border-teal-700">
                <p className="text-xs text-teal-300 mb-1">{stat.label}</p>
                <p className="text-lg font-bold text-white">{stat.value}</p>
                <p className="text-xs text-teal-300 mt-0.5">{stat.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* What is an offset account */}
      <section className="py-12 bg-white">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">What Is an Offset Account?</h2>
          <p className="text-slate-600 mb-4">
            An offset account is a <strong>transaction account linked to your mortgage</strong>. Each day, your bank calculates interest on your loan balance minus the balance sitting in your offset account. The offset balance does not earn interest — instead, it <em>reduces</em> the loan balance on which interest is charged.
          </p>
          <p className="text-slate-600 mb-6">
            You can use an offset account exactly like a regular bank account: deposit your salary, pay bills, use a linked debit card. The key difference is that every dollar sitting in the account is silently working to reduce your daily interest charge.
          </p>

          {/* How offset saves callout */}
          <div className="bg-teal-50 border border-teal-200 rounded-2xl p-6">
            <h3 className="font-bold text-teal-900 mb-3">How Offset Savings Work: Concrete Example</h3>
            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <div className="bg-white rounded-xl border border-teal-100 p-4 text-center">
                <p className="text-xs text-slate-500 mb-1">Loan balance</p>
                <p className="text-xl font-bold text-slate-900">$500,000</p>
              </div>
              <div className="bg-white rounded-xl border border-teal-100 p-4 text-center">
                <p className="text-xs text-slate-500 mb-1">Offset balance</p>
                <p className="text-xl font-bold text-teal-700">$50,000</p>
              </div>
              <div className="bg-white rounded-xl border border-teal-100 p-4 text-center">
                <p className="text-xs text-slate-500 mb-1">Interest charged on</p>
                <p className="text-xl font-bold text-green-700">$450,000</p>
              </div>
            </div>
            <p className="text-sm text-teal-800">
              At <strong>6.5% p.a.</strong>, you pay interest on $450,000 instead of $500,000 — saving <strong>$3,250 per year</strong> in interest. The effective return on your $50,000 in offset equals your mortgage rate (6.5%), which typically exceeds after-tax savings account returns.
            </p>
          </div>
        </div>
      </section>

      {/* What is a redraw facility */}
      <section className="py-12 bg-slate-50">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">What Is a Redraw Facility?</h2>
          <p className="text-slate-600 mb-4">
            A redraw facility lets you <strong>access extra repayments you have already made</strong> on your home loan. If your minimum monthly repayment is $2,800 and you consistently pay $3,200, that extra $400 per month accumulates as a &apos;redrawable&apos; balance inside your loan.
          </p>
          <p className="text-slate-600 mb-4">
            Like an offset account, extra repayments reduce your loan balance and therefore reduce your daily interest charge. The practical difference is how you access those funds. A redraw facility is <em>not</em> a transaction account — you request a redraw via your lender&apos;s online portal or branch, and funds are typically available the next business day. Some lenders can restrict access to redraw in hardship situations.
          </p>
          <div className="bg-slate-100 border border-slate-200 rounded-xl p-5">
            <p className="text-sm text-slate-700">
              <strong>Redraw is generally available on basic variable loans</strong> where an offset account is not offered — making it the only interest-saving tool on lower-rate products. For borrowers who do not anticipate needing rapid access to their extra repayments, redraw is functionally similar to offset for owner-occupiers.
            </p>
          </div>
        </div>
      </section>

      {/* Comparison table */}
      <section className="py-12 bg-white">
        <div className="container-custom">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Offset vs Redraw: Key Differences</h2>
          <p className="text-sm text-slate-500 mb-6">Seven dimensions that matter when choosing between the two features.</p>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table aria-label="Offset account vs redraw facility key differences" className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th scope="col" className="text-left px-5 py-3 font-semibold text-slate-700 w-1/4">Feature</th>
                  <th scope="col" className="text-left px-5 py-3 font-semibold text-teal-700 w-3/8">Offset Account</th>
                  <th scope="col" className="text-left px-5 py-3 font-semibold text-slate-700 w-3/8">Redraw Facility</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className="px-5 py-3 font-medium text-slate-800 align-top">{row.feature}</td>
                    <td className="px-5 py-3 text-slate-600 align-top">{row.offset}</td>
                    <td className="px-5 py-3 text-slate-600 align-top">{row.redraw}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Investor tax trap */}
      <section className="py-12 bg-amber-50">
        <div className="container-custom max-w-3xl">
          <div className="bg-white border border-amber-200 rounded-2xl p-8">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <span className="text-amber-700 font-bold text-lg">!</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-1">The Investor Tax Trap with Redraw</h2>
                <p className="text-xs text-amber-700 font-medium uppercase tracking-wide">Critical for investment property owners</p>
              </div>
            </div>
            <p className="text-slate-700 mb-4">
              For <strong>investment property loans</strong>, redraw carries a significant tax risk that does not apply to offset accounts. When you make extra repayments on an investment loan and later redraw those funds for a <em>personal purpose</em> — such as a home renovation, holiday, or personal purchase — the ATO may deem that redrawn portion of the loan to be for personal use.
            </p>
            <p className="text-slate-700 mb-4">
              The result: the interest attributable to the redrawn balance becomes <strong>non-deductible</strong>. This is what accountants call a &apos;mixed-purpose loan&apos; problem, and it is a known ATO audit trigger. Once contaminated, separating the personal and investment components of a single loan account is complex and often irrecoverable.
            </p>
            <div className="bg-amber-50 rounded-xl p-5 mb-4">
              <h3 className="font-semibold text-amber-900 mb-2">Why offset accounts are different</h3>
              <p className="text-sm text-amber-800">
                An offset account is a <em>separate legal account</em> from the loan. Funds in offset are always your personal money — they were never paid into the loan. Withdrawing from an offset account does not change the purpose of the underlying loan or affect its deductibility in any way. For investors, this distinction is critical.
              </p>
            </div>
            <Link href="/advisors/tax-agents" className="text-amber-700 text-sm font-medium hover:underline">
              Find a Registered Tax Agent for investment property advice &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* 100% vs partial offset */}
      <section className="py-12 bg-white">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">100% Offset vs Partial Offset</h2>
          <p className="text-slate-600 mb-6">
            Not all offset accounts work the same way. The most common type — and the one offered by the major banks on packaged variable loans — is a <strong>100% offset</strong> account. Every dollar in the account reduces your interest-bearing loan balance on a dollar-for-dollar basis.
          </p>
          <div className="grid md:grid-cols-2 gap-5">
            <div className="bg-green-50 border border-green-200 rounded-xl p-6">
              <div className="inline-block bg-green-100 text-green-800 text-xs font-semibold px-3 py-1 rounded-full mb-3">
                100% Offset
              </div>
              <p className="text-sm text-slate-700 mb-3">
                Every dollar in offset reduces your loan balance for interest calculation. $50,000 in a 100% offset on a $500,000 loan means interest is charged on exactly $450,000.
              </p>
              <p className="text-xs font-semibold text-green-700">Full savings benefit — this is what to look for</p>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
              <div className="inline-block bg-orange-100 text-orange-800 text-xs font-semibold px-3 py-1 rounded-full mb-3">
                Partial Offset (e.g. 40%)
              </div>
              <p className="text-sm text-slate-700 mb-3">
                Only a portion of your offset balance counts. With 40% partial offset, $50,000 in your account reduces the loan balance by only $20,000. Interest is charged on $480,000 rather than $450,000.
              </p>
              <p className="text-xs font-semibold text-orange-700">Uncommon in modern lending — check your loan terms carefully</p>
            </div>
          </div>
          <p className="text-slate-500 text-sm mt-5">
            When comparing loan products, always confirm whether the offset is 100% before assuming the full savings benefit applies.
          </p>
        </div>
      </section>

      {/* Multiple offset accounts */}
      <section className="py-12 bg-slate-50">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Multiple Offset Accounts: Budgeting Buckets</h2>
          <p className="text-slate-600 mb-4">
            Some lenders — typically the major banks on premium packaged loan products — allow you to link <strong>multiple offset accounts</strong> to a single mortgage. Every dollar in any of those accounts reduces your daily interest charge.
          </p>
          <p className="text-slate-600 mb-4">
            This makes multiple offset accounts a powerful budgeting tool. Common &apos;buckets&apos; borrowers set up include:
          </p>
          <div className="grid sm:grid-cols-2 gap-3 mb-5">
            {[
              { label: "Emergency fund", desc: "3–6 months of expenses, earning mortgage-rate returns" },
              { label: "Holidays / big purchases", desc: "Saves for planned spending while reducing daily interest" },
              { label: "Renovations", desc: "Builds steadily without touching the loan balance" },
              { label: "Tax savings (investors)", desc: "Quarantine future tax payments from spending money" },
            ].map((b) => (
              <div key={b.label} className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="font-semibold text-slate-800 text-sm">{b.label}</p>
                <p className="text-xs text-slate-500 mt-1">{b.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-slate-500 text-sm">
            Check whether your lender charges a per-account fee for additional offset accounts — a $5–$10/month fee per account can erode the benefit if your buckets have small balances.
          </p>
        </div>
      </section>

      {/* Who benefits most */}
      <section className="py-12 bg-white">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Who Benefits Most from an Offset Account?</h2>
          <div className="space-y-4">
            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-sm flex-shrink-0">
                &#10003;
              </div>
              <div>
                <p className="font-semibold text-slate-900">Owner-occupiers with variable income</p>
                <p className="text-sm text-slate-600">Freelancers, commission-based workers, and small business owners who receive irregular lump sums benefit from parking large amounts temporarily — every extra dollar reduces the daily interest charge.</p>
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-sm flex-shrink-0">
                &#10003;
              </div>
              <div>
                <p className="font-semibold text-slate-900">Borrowers saving for a future cost</p>
                <p className="text-sm text-slate-600">If you are accumulating funds for a renovation, tax bill, or large purchase in 12–24 months, parking those savings in offset rather than a separate account means the money earns the equivalent of your mortgage rate while it waits.</p>
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-sm flex-shrink-0">
                &#10003;
              </div>
              <div>
                <p className="font-semibold text-slate-900">Investors wanting to preserve deductibility</p>
                <p className="text-sm text-slate-600">An investor who wants flexibility to access savings without contaminating their investment loan deduction should always choose offset over redraw.</p>
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                ✗
              </div>
              <div>
                <p className="font-semibold text-slate-900">Investors aiming to pay down the investment loan</p>
                <p className="text-sm text-slate-600">Investors who intend to keep savings in the offset permanently to reduce investment debt are potentially giving up tax deductions without benefit. The interest saved by offset is identical to the deduction lost by lowering the loan balance — but offset preserves the flexibility to redeploy those funds without deductibility consequences.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Salary parking strategy */}
      <section className="py-12 bg-teal-50">
        <div className="container-custom max-w-3xl">
          <div className="bg-white border border-teal-200 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Salary Parking Strategy</h2>
            <p className="text-xs text-teal-700 font-semibold uppercase tracking-wide mb-4">How to maximise your offset benefit</p>
            <p className="text-slate-600 mb-4">
              Salary parking means directing your <strong>entire take-home pay directly into your offset account</strong> as soon as it is received, and keeping it there as long as possible before money flows out. Because interest is calculated daily, even a fortnight&apos;s salary sitting in offset before expenses are paid can reduce your annual interest bill meaningfully.
            </p>
            <p className="text-slate-600 mb-4">
              The most effective implementation pairs salary parking with a <strong>credit card for day-to-day expenses</strong>:
            </p>
            <ol className="space-y-3 mb-5">
              {[
                "Salary is deposited directly to offset account on payday",
                "All daily expenses are charged to a rewards credit card (paid in full each month — no interest charged)",
                "Salary remains in offset for the entire billing cycle — typically 45–55 days",
                "Credit card balance is paid in full on the due date from offset",
              ].map((step, i) => (
                <li key={i} className="flex gap-3 items-start text-sm text-slate-700">
                  <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-800 font-bold text-xs flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
            <div className="bg-teal-50 rounded-xl p-4">
              <p className="text-sm text-teal-800">
                <strong>Important:</strong> This strategy only works if you pay the credit card balance in full every month. Any credit card interest will quickly outweigh the offset benefit.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Cost of offset: break-even analysis */}
      <section className="py-12 bg-white">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">The Cost of an Offset Account: Break-Even Analysis</h2>
          <p className="text-slate-600 mb-4">
            Packaged home loans that include an offset account typically cost <strong>$10–$40 per month</strong> in annual package fees versus a basic variable loan at a lower rate with no offset. Before choosing a loan with offset, it is worth calculating whether the interest savings outweigh the extra cost.
          </p>
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mb-5">
            <h3 className="font-semibold text-slate-900 mb-4">Break-Even Calculation</h3>
            <div className="overflow-x-auto">
              <table aria-label="Offset account break-even balance by monthly fee at 6.5% interest rate" className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th scope="col" className="text-left py-2 pr-4 text-slate-600 font-medium">Monthly fee</th>
                    <th scope="col" className="text-left py-2 pr-4 text-slate-600 font-medium">Annual fee cost</th>
                    <th scope="col" className="text-left py-2 text-slate-600 font-medium">Offset balance needed to break even (at 6.5%)</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { fee: "$10/mo", annual: "$120/yr", balance: "~$1,850" },
                    { fee: "$20/mo", annual: "$240/yr", balance: "~$3,700" },
                    { fee: "$30/mo", annual: "$360/yr", balance: "~$5,540" },
                    { fee: "$40/mo", annual: "$480/yr", balance: "~$7,385" },
                  ].map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                      <td className="py-3 pr-4 font-medium text-slate-800">{row.fee}</td>
                      <td className="py-3 pr-4 text-slate-600">{row.annual}</td>
                      <td className="py-3 text-green-700 font-semibold">{row.balance}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500 mt-3">
              Break-even balance = annual fee cost &divide; interest rate. Most borrowers keeping more than $10,000 in offset will clear break-even comfortably.
            </p>
          </div>
          <p className="text-slate-600 text-sm">
            If you consistently keep $50,000+ in offset, even a $40/month fee is trivially justified — you are saving $3,250/year at 6.5%. The analysis is tighter for borrowers with small offset balances; a basic loan may be better value for those with limited savings in offset.
          </p>
        </div>
      </section>

      {/* Redraw vs offset for investors */}
      <section className="py-12 bg-slate-50">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Redraw vs Offset for Investors: Specific Guidance</h2>
          <p className="text-slate-600 mb-5">
            Most property investors should <strong>choose offset over redraw</strong> on investment loans. This is not merely a preference — it is a structural protection for your tax position.
          </p>
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="font-semibold text-slate-900 mb-2">Why offset protects deductibility</h3>
              <p className="text-sm text-slate-600">
                Investment loan interest is deductible to the extent the loan was used to produce income. When you redraw from an investment loan for personal purposes, you change the use of that portion of the loan from income-producing to personal — permanently reducing your allowable deduction. The offset account avoids this because the funds are held in a <em>separate account</em> and were never part of the loan.
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="font-semibold text-slate-900 mb-2">When redraw is acceptable for investors</h3>
              <p className="text-sm text-slate-600">
                Redraw on an investment loan is generally safe when the redrawn funds are used <em>exclusively for investment purposes</em> — for example, redrawing to fund a capital improvement to the investment property, or to purchase additional investment assets. The issue arises only when redrawn funds are used for personal purposes.
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="font-semibold text-slate-900 mb-2">The practical recommendation</h3>
              <p className="text-sm text-slate-600">
                Because investors can never be 100% certain they will not need to access funds for personal purposes, using offset on investment loans is the structurally safer choice. It preserves deductibility regardless of what you later do with the savings. Many accountants and mortgage brokers recommend investors always use offset on investment loans as a standing rule.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Worked examples */}
      <section className="py-12 bg-white">
        <div className="container-custom">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Worked Examples</h2>
          <p className="text-sm text-slate-500 mb-8">Two scenarios showing how offset and redraw play out in practice.</p>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Example 1: Owner-occupier salary parking */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="bg-teal-800 text-white px-6 py-4">
                <p className="text-xs text-teal-300 uppercase tracking-wide font-semibold mb-1">Example 1</p>
                <p className="font-bold text-lg">Owner-Occupier: Salary Parking</p>
              </div>
              <div className="p-6 space-y-4">
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Scenario</p>
                  <ul className="space-y-2 text-sm text-slate-700">
                    <li className="flex justify-between"><span>Loan balance</span><strong>$600,000</strong></li>
                    <li className="flex justify-between"><span>Interest rate</span><strong>6.5% p.a.</strong></li>
                    <li className="flex justify-between"><span>Loan term</span><strong>25 years</strong></li>
                    <li className="flex justify-between"><span>Average offset balance</span><strong>$100,000</strong></li>
                  </ul>
                </div>
                <div className="space-y-3">
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1">Annual interest saved</p>
                    <p className="text-2xl font-bold text-green-900">$6,500/yr</p>
                    <p className="text-xs text-green-700 mt-1">6.5% of $100,000 average offset</p>
                  </div>
                  <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
                    <p className="text-xs font-semibold text-teal-700 uppercase tracking-wide mb-1">Total savings over loan (est.)</p>
                    <p className="text-2xl font-bold text-teal-900">~$38,000+</p>
                    <p className="text-xs text-teal-700 mt-1">Including compounding reduction in loan term</p>
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  A salary earner parks their $8,500/month take-home into offset, uses a credit card for expenses, and pays it off monthly. Average balance maintained throughout the month is approximately $4,000–$6,000 just from salary timing, plus any other savings — bringing the average to $100,000 over time as savings grow.
                </p>
              </div>
            </div>

            {/* Example 2: Investor comparing offset vs redraw */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="bg-amber-800 text-white px-6 py-4">
                <p className="text-xs text-amber-200 uppercase tracking-wide font-semibold mb-1">Example 2</p>
                <p className="font-bold text-lg">Investor: Offset vs Redraw Decision</p>
              </div>
              <div className="p-6 space-y-4">
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Scenario</p>
                  <ul className="space-y-2 text-sm text-slate-700">
                    <li className="flex justify-between"><span>Investment loan</span><strong>$450,000</strong></li>
                    <li className="flex justify-between"><span>Interest rate</span><strong>6.7% p.a.</strong></li>
                    <li className="flex justify-between"><span>Savings available</span><strong>$60,000</strong></li>
                    <li className="flex justify-between"><span>Savings purpose</span><strong>Future PPOR deposit</strong></li>
                  </ul>
                </div>
                <div className="space-y-3">
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-1">If using redraw (wrong choice)</p>
                    <p className="text-sm text-red-800">Extra repayments of $60,000 are made to the loan. Interest saved = $4,020/yr. But when the investor later redraws $60,000 for a home purchase, the ATO may deem the redrawn portion personal debt — interest on $60,000 loses deductibility, costing $4,020/yr in lost deductions.</p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1">If using offset (right choice)</p>
                    <p className="text-sm text-green-800">$60,000 is held in offset. Same $4,020/yr in interest saved. When the investor accesses the $60,000 for the home purchase, the investment loan deductibility is <em>completely unaffected</em> — the money was always in a separate account.</p>
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  The interest saving is identical in both cases while the money is in offset/redraw. The critical difference is what happens <em>when the money is accessed</em>. Offset wins every time for investors with flexible savings.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* NCCP disclaimer + CTA */}
      <section className="py-12 bg-teal-50">
        <div className="container-custom text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-3">Find the Right Loan Structure for Your Situation</h2>
          <p className="text-slate-600 mb-6 max-w-xl mx-auto text-sm">
            The choice between offset and redraw, and which loan product to choose, depends on your income, tax position, and financial goals. A licensed mortgage broker can compare loans across multiple lenders and help you model the real-world impact. This page contains general information only — it is not credit assistance under the National Consumer Credit Protection Act 2009 (Cth).
          </p>
          <Link
            href="/advisors/mortgage-brokers"
            className="inline-block bg-teal-800 text-white font-semibold px-8 py-3 rounded-xl hover:bg-teal-900 transition-colors"
          >
            Find a Licensed Mortgage Broker
          </Link>
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
                  <span className="ml-3 text-slate-400 group-open:rotate-180 transition-transform" aria-hidden="true">&#9660;</span>
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
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Related Guides</h2>
          <div className="flex flex-wrap gap-3">
            {[
              { label: "Variable vs Fixed Rate", href: "/home-loans/variable" },
              { label: "Investment Loans", href: "/home-loans/investment" },
              { label: "Interest-Only Loans", href: "/home-loans/interest-only" },
              { label: "Compare Home Loans", href: "/home-loans/compare" },
              { label: "Negative Gearing Guide", href: "/negative-gearing" },
              { label: "Find a Mortgage Broker", href: "/advisors/mortgage-brokers" },
              { label: "Find a Tax Agent", href: "/advisors/tax-agents" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="bg-white border border-slate-200 text-slate-700 text-sm font-medium px-4 py-2 rounded-lg hover:border-teal-300 hover:text-teal-700 transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Compliance footer */}
      <footer className="py-8 bg-white border-t border-slate-100">
        <div className="container-custom max-w-3xl text-xs text-slate-500 space-y-2">
          <p>
            <strong>Credit disclaimer:</strong> invest.com.au is not licensed to provide credit assistance under the National Consumer Credit Protection Act 2009 (Cth). This page contains general information only and does not constitute a credit recommendation or credit advice. Please consult a licensed mortgage broker or Australian Credit Licensee for advice specific to your circumstances.
          </p>
          <p>
            <strong>Tax disclaimer:</strong> Tax information on this page is general in nature and does not constitute tax advice. The treatment of redraw facilities and offset accounts for tax purposes depends on individual circumstances. Consult a registered tax agent (Tax Practitioners Board) for advice specific to your situation.
          </p>
          <p>{GENERAL_ADVICE_WARNING}</p>
        </div>
      </footer>
    </div>
  );
}
