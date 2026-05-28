import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING, NCCP_CREDIT_NOTE } from "@/lib/compliance";

export const revalidate = 86400;

const FAQS = [
  {
    q: "How much equity can I access from my home?",
    a: "Most lenders will lend up to 80% of your property's value in total (including your existing mortgage) without requiring Lenders Mortgage Insurance (LMI). Your usable equity is calculated as: (property value × 0.80) minus your current loan balance. For example, if your home is worth $900,000 and you owe $350,000, your usable equity is $720,000 − $350,000 = $370,000. Some lenders will go to 90% LVR with LMI, which increases the accessible amount but adds a significant one-off LMI premium. The actual amount you can borrow also depends on your income and overall serviceability assessment.",
  },
  {
    q: "Can I use home equity to buy an investment property?",
    a: "Yes — using home equity as a deposit for an investment property is the most common way Australians expand their property portfolio. The typical approach is to access equity from your existing home (via a cash-out refinance, equity loan, or line of credit) and use those funds as the deposit on the investment property loan. You then service two loans: the original home loan (now larger) and the new investment property loan. It is important to ensure the combined repayments are affordable on your current income. A licensed mortgage broker can model the two-loan structure for your specific circumstances.",
  },
  {
    q: "Is the interest on equity loans tax-deductible?",
    a: "It depends on the purpose of the loan, not the security. Under the Australian tax system, interest is deductible only when the borrowed money is used for an income-producing purpose. If you draw equity from your home and use it to purchase an investment property, the interest on that equity loan (or the equity portion of your refinanced loan) is tax-deductible because the purpose is investment. If you use the same equity for a holiday, car, or home renovation that is your primary residence, the interest is not deductible. Keeping loan purposes separate — ideally in separate loan accounts — is essential for accurate record-keeping and ATO compliance. Consult a registered tax agent for advice specific to your situation.",
  },
  {
    q: "What is debt recycling?",
    a: "Debt recycling is a tax strategy that involves converting non-deductible home loan debt (principal residence) into tax-deductible investment debt over time. The basic process is: (1) access equity in your home for an investment purpose (shares, ETFs, or property); (2) the investment generates income and ideally capital growth; (3) use investment income to make additional repayments on your non-deductible home loan, reducing it faster; (4) as you pay down the home loan, you draw the same amount back out for further investment, maintaining tax-deductible debt while eliminating non-deductible debt. The end result is that your home loan converts to an investment loan over time, maximising deductible interest. Debt recycling is a leveraged strategy — if investments fall in value, you still owe the full loan. It is not suitable for everyone and requires careful structuring. Seek advice from a licensed financial adviser and tax agent before implementing.",
  },
  {
    q: "What is the risk of cross-collateralising my properties?",
    a: "Cross-collateralisation occurs when a lender uses multiple properties as security for one or more loans — often used when accessing equity to buy an investment property through the same lender. The risk is that the lender holds a mortgage over both (or all) properties simultaneously. If you default on either loan, the lender can take action against both properties. It also limits your flexibility: you cannot sell one property or refinance without the lender's approval over the entire security package. For these reasons, many property investors and mortgage brokers prefer to keep properties with separate lenders and separate security structures, even if this is administratively more complex.",
  },
  {
    q: "How does accessing equity affect my borrowing capacity for the next property?",
    a: "Accessing equity increases your total debt, which directly reduces your borrowing capacity for future loans. Lenders assess serviceability across all your existing debts — both the home loan (now larger) and any equity facility drawn. A larger combined debt means higher monthly repayments, which consume more of your assessed income under the lender's serviceability buffer (typically at a rate 3% above the loan rate). Additionally, if your LVR increases toward 80%, some lenders may apply a higher interest rate tier. Before accessing equity, it is worth modelling how the additional debt will affect your ability to borrow for the next investment property. A licensed mortgage broker can run serviceability calculations across multiple lender policies.",
  },
];

const EQUITY_METHODS = [
  {
    method: "Cash-out refinance",
    how: "Refinance to a new, larger loan with a different (or same) lender; receive the difference in cash",
    bestFor: "Lower rate + equity access at once",
  },
  {
    method: "Home equity loan",
    how: "Separate loan secured against the equity in your property, with its own repayment schedule",
    bestFor: "Specific purpose, fixed term",
  },
  {
    method: "Line of credit (LOC)",
    how: "Pre-approved credit facility secured against property; draw and repay as needed up to the limit",
    bestFor: "Flexible, draw as needed",
  },
  {
    method: "Offset / redraw",
    how: "Use extra repayments already made on your mortgage, then redraw those funds",
    bestFor: "Lowest cost; money already there",
  },
  {
    method: "Cross-collateralisation",
    how: "Use existing property as security for a new investment property loan with the same lender",
    bestFor: "Property investors expanding portfolio",
  },
];

const EQUITY_TABLE = [
  { value: "$600,000", max80: "$480,000", balance: "$200,000", usable: "$280,000" },
  { value: "$900,000", max80: "$720,000", balance: "$350,000", usable: "$370,000" },
  { value: "$1,200,000", max80: "$960,000", balance: "$400,000", usable: "$560,000" },
  { value: "$1,500,000", max80: "$1,200,000", balance: "$600,000", usable: "$600,000" },
];

const COMMON_USES = [
  {
    icon: "🏠",
    title: "Investment property deposit",
    desc: "The most common use — equity from your home becomes the deposit on an investment property.",
    good: true,
  },
  {
    icon: "🔨",
    title: "Renovation or upgrade",
    desc: "Expand or improve your existing home — adding a bedroom, kitchen, or granny flat.",
    good: true,
  },
  {
    icon: "📈",
    title: "Share portfolio or ETF investment",
    desc: "Invest in the share market using equity — often paired with a debt recycling strategy.",
    good: true,
  },
  {
    icon: "💼",
    title: "Business investment",
    desc: "Fund business growth or startup costs using property equity as capital.",
    good: true,
  },
  {
    icon: "🔒",
    title: "Emergency LOC buffer",
    desc: "A line of credit held unused as a financial safety net — only drawn if required.",
    good: true,
  },
  {
    icon: "🚫",
    title: "Consumer spending, holidays, cars",
    desc: "Depreciating assets funded by investment borrowings. Interest is not deductible, and the asset loses value while you carry the debt.",
    good: false,
  },
];

const RISKS = [
  {
    title: "Over-leveraging",
    desc: "If property values fall, your LVR rises. At LVR above 80% you may be required to pay LMI, reduce the loan, or face a margin call from your lender.",
  },
  {
    title: "Investment loss risk",
    desc: "Borrowed money invested in shares or property can fall in value — you still owe the full loan regardless of what the investment is worth.",
  },
  {
    title: "Serviceability pressure",
    desc: "Repayments on the larger combined debt must be affordable. An income reduction or rate rise can make the total repayments difficult to meet.",
  },
  {
    title: "Interest rate rises",
    desc: "A variable rate increase applies across the full outstanding balance, not just the equity amount — larger total debt amplifies the impact of rate rises.",
  },
  {
    title: "Cross-collateralisation trap",
    desc: "When the same lender holds security over multiple properties, a default on one can trigger recovery action across all secured properties simultaneously.",
  },
];

export const metadata: Metadata = {
  title: `Accessing Home Equity in Australia (${CURRENT_YEAR}) — Cash-Out, LOC & Debt Recycling`,
  description:
    "How Australian property owners can access equity to invest, renovate, or supplement income — cash-out refinancing, home equity loans, lines of credit, and debt recycling explained.",
  alternates: { canonical: absoluteUrl("/property/equity-access") },
  openGraph: {
    title: `Accessing Home Equity in Australia (${CURRENT_YEAR})`,
    description:
      "Complete guide to accessing property equity in Australia — usable equity calculations, cash-out refinance, LOC, debt recycling, tax deductibility, and risks.",
    url: absoluteUrl("/property/equity-access"),
    images: [{ url: `/api/og?title=Accessing+Home+Equity+in+Australia`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
};

export default function EquityAccessPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Property", url: absoluteUrl("/property") },
    { name: "Accessing Equity", url: absoluteUrl("/property/equity-access") },
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
              <Link href="/property" className="hover:text-white">Property</Link>
              <span className="text-slate-600">/</span>
              <span className="text-white font-medium">Accessing Equity</span>
            </nav>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-xs font-semibold bg-amber-500 text-slate-900 px-3 py-1 rounded-full">Updated {CURRENT_YEAR}</span>
              <span className="text-xs font-semibold bg-blue-600 text-white px-3 py-1 rounded-full">General information only — not credit assistance</span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-3 max-w-3xl">
              Accessing Home Equity in Australia
            </h1>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-3xl">
              How property owners can access the equity in their home to invest, renovate, or supplement income — including cash-out refinancing, home equity loans, lines of credit, and debt recycling.
            </p>
          </div>
        </section>

        {/* Key Stats */}
        <section className="bg-white py-8 border-b border-slate-100">
          <div className="container-custom">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { v: "80% LVR", l: "Typical equity access limit", sub: "Without paying LMI" },
                { v: "90% LVR", l: "Maximum with LMI", sub: "Higher cost, more equity unlocked" },
                { v: "Tax-deductible", l: "Interest if for investment", sub: "Purpose — not security — determines deductibility" },
                { v: "5 methods", l: "Ways to access equity", sub: "Cash-out, LOC, equity loan, redraw, cross-coll" },
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

        {/* What is home equity */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">What is home equity?</h2>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed mb-4">
              Home equity is the difference between what your property is worth and what you still owe on the mortgage. As your property value grows and you pay down your loan, equity builds up — and banks will let you borrow against it.
            </p>
            <div className="bg-slate-900 text-green-400 font-mono text-sm rounded-xl p-4 mb-6">
              Home equity = Current property value &#8722; Outstanding loan balance
            </div>

            {/* Basic equity example */}
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 mb-6">
              <h3 className="font-extrabold text-blue-900 mb-3">Example: total equity</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between border-b border-blue-100 pb-2">
                  <span className="text-blue-800">Property value</span>
                  <span className="font-bold text-blue-900">$1,200,000</span>
                </div>
                <div className="flex justify-between border-b border-blue-100 pb-2">
                  <span className="text-blue-800">Outstanding loan balance</span>
                  <span className="font-bold text-blue-900">$450,000</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="font-extrabold text-blue-900">Total equity</span>
                  <span className="font-extrabold text-blue-900">$750,000</span>
                </div>
              </div>
            </div>

            {/* Usable equity */}
            <h3 className="text-xl font-extrabold text-slate-900 mb-3">Usable equity — what the bank will actually lend</h3>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed mb-4">
              Not all equity is accessible. Lenders typically require the total debt (existing loan plus new borrowing) to stay at or below 80% of the property&apos;s value — the loan-to-value ratio (LVR) threshold that avoids Lenders Mortgage Insurance. The portion of your equity that stays within this cap is called <strong className="text-slate-800">usable equity</strong>.
            </p>
            <div className="bg-slate-900 text-green-400 font-mono text-sm rounded-xl p-4 mb-6">
              Usable equity = (Property value &times; 0.80) &#8722; Current loan balance
            </div>

            {/* Usable equity example */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
              <h3 className="font-extrabold text-emerald-900 mb-3">Example: usable equity on the same property</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between border-b border-emerald-100 pb-2">
                  <span className="text-emerald-800">80% of $1,200,000</span>
                  <span className="font-bold text-emerald-900">$960,000</span>
                </div>
                <div className="flex justify-between border-b border-emerald-100 pb-2">
                  <span className="text-emerald-800">Less current loan balance</span>
                  <span className="font-bold text-emerald-900">$450,000</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="font-extrabold text-emerald-900">Usable equity (at 80% LVR)</span>
                  <span className="font-extrabold text-emerald-900">$510,000</span>
                </div>
              </div>
              <p className="text-xs text-emerald-700 mt-3">Total equity is $750,000 but only $510,000 is accessible without paying LMI — the remaining $240,000 acts as a buffer below the 80% LVR threshold.</p>
            </div>
          </div>
        </section>

        {/* Ways to access equity */}
        <section className="py-10 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">Ways to access equity</h2>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-6">Five methods — each with different structure, cost, and flexibility</p>
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-800 text-white">
                      <th className="text-left px-5 py-3 font-bold">Method</th>
                      <th className="text-left px-5 py-3 font-bold">How it works</th>
                      <th className="text-left px-5 py-3 font-bold">Best for</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {EQUITY_METHODS.map((row, i) => (
                      <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                        <td className="px-5 py-3 font-semibold text-slate-900 whitespace-nowrap">{row.method}</td>
                        <td className="px-5 py-3 text-slate-600">{row.how}</td>
                        <td className="px-5 py-3 text-emerald-700 font-medium">{row.bestFor}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* How banks calculate usable equity */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">How banks calculate usable equity</h2>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed mb-4">
              The usable equity formula is consistent across most Australian lenders: the maximum total debt is capped at 80% of the property&apos;s value (at the standard LVR). Lenders who go to 90% LVR will add Lenders Mortgage Insurance — a one-off premium that protects the lender (not you) in the event of default.
            </p>

            {/* Formula recap box */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 mb-6">
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-extrabold text-slate-900 mb-1">At 80% LVR (no LMI)</p>
                  <div className="bg-slate-900 text-green-400 font-mono text-xs rounded-lg p-3">
                    Usable equity = (Value &times; 0.80) &#8722; Loan balance
                  </div>
                </div>
                <div>
                  <p className="font-extrabold text-slate-900 mb-1">At 90% LVR (with LMI)</p>
                  <div className="bg-slate-900 text-amber-400 font-mono text-xs rounded-lg p-3">
                    Usable equity = (Value &times; 0.90) &#8722; Loan balance
                  </div>
                </div>
              </div>
            </div>

            {/* Table: equity by property value */}
            <h3 className="text-lg font-extrabold text-slate-900 mb-3">Usable equity by property value (at 80% LVR)</h3>
            <div className="rounded-xl border border-slate-200 overflow-hidden mb-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-800 text-white">
                      <th className="text-left px-5 py-3 font-bold">Property value</th>
                      <th className="text-left px-5 py-3 font-bold">80% max loan</th>
                      <th className="text-left px-5 py-3 font-bold">Current balance</th>
                      <th className="text-left px-5 py-3 font-bold text-emerald-300">Usable equity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {EQUITY_TABLE.map((row, i) => (
                      <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                        <td className="px-5 py-3 font-semibold text-slate-900">{row.value}</td>
                        <td className="px-5 py-3 text-slate-600">{row.max80}</td>
                        <td className="px-5 py-3 text-slate-600">{row.balance}</td>
                        <td className="px-5 py-3 font-extrabold text-emerald-700">{row.usable}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="bg-slate-50 border-t border-slate-200 px-5 py-2 text-xs text-slate-500">
                Table assumes current loan balance as shown. Actual usable equity depends on your lender&apos;s valuation and serviceability assessment.
              </div>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <strong className="text-amber-900">Note on lender valuations:</strong> The lender orders its own valuation — which may differ from market estimates. A lower-than-expected valuation reduces your usable equity. If your LVR is borderline, a formal valuation outcome matters significantly.
            </div>
          </div>
        </section>

        {/* Common uses */}
        <section className="py-10 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">Common uses of home equity</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {COMMON_USES.map((use, i) => (
                <div
                  key={i}
                  className={`rounded-xl border p-5 ${
                    use.good
                      ? "border-slate-200 bg-white"
                      : "border-red-200 bg-red-50"
                  }`}
                >
                  <div className="text-2xl mb-2" aria-hidden="true">{use.icon}</div>
                  <h3 className={`font-extrabold mb-1.5 text-sm ${use.good ? "text-slate-900" : "text-red-900"}`}>
                    {use.good ? null : <span className="text-red-600 mr-1">&#x2715;</span>}
                    {use.title}
                  </h3>
                  <p className={`text-xs leading-relaxed ${use.good ? "text-slate-600" : "text-red-700"}`}>{use.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Debt recycling */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">Debt recycling — tax strategy</h2>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed mb-6">
              Debt recycling is a long-term tax strategy that converts non-deductible home loan debt into tax-deductible investment debt over time. The premise is simple: interest on borrowings used for income-producing investments is deductible; interest on your primary residence home loan is not.
            </p>

            {/* Steps */}
            <div className="space-y-3 mb-6">
              {[
                { n: "1", title: "Access equity for investment", desc: "Draw an equity loan (or refinance) for an investment purpose — shares, ETFs, or investment property." },
                { n: "2", title: "Invest the funds", desc: "The investment generates income (dividends, rent) and ideally capital growth over time." },
                { n: "3", title: "Use income to repay home loan faster", desc: "Direct investment income toward additional repayments on your non-deductible home loan, reducing it ahead of schedule." },
                { n: "4", title: "Redraw and reinvest", desc: "As you pay down the home loan, redraw the same amount for further investment. Your non-deductible debt falls; your deductible investment debt remains constant." },
              ].map((step) => (
                <div key={step.n} className="flex gap-4 bg-slate-50 rounded-xl p-5 border border-slate-200">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {step.n}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 text-sm mb-1">{step.title}</p>
                    <p className="text-xs text-slate-600 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Tax benefit box */}
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 mb-5">
              <h3 className="font-extrabold text-blue-900 mb-2">Tax benefit</h3>
              <p className="text-sm text-blue-800 leading-relaxed">
                Interest on the investment-purpose debt is deductible against your assessable income. Interest on the home loan is not. By converting the balance over time, you increase the proportion of your total interest bill that is tax-deductible — effectively having the tax system subsidise a portion of your investment borrowing costs.
              </p>
            </div>

            {/* Warning */}
            <div className="rounded-xl border border-red-200 bg-red-50 p-5">
              <div className="flex items-start gap-3">
                <span className="shrink-0 text-xs font-bold bg-red-600 text-white px-2 py-1 rounded mt-0.5">Warning</span>
                <div>
                  <h3 className="font-extrabold text-red-900 mb-2">Debt recycling is a leveraged strategy</h3>
                  <p className="text-sm text-red-800 leading-relaxed">
                    Debt recycling uses borrowed money to invest. If the underlying investments (property or shares) fall in value, you still owe the full loan. The strategy amplifies both gains and losses. It is only appropriate for long-term investors with stable income, high risk tolerance, and who have received advice from a licensed financial adviser and registered tax agent.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Investment property purchase */}
        <section className="py-10 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">Using equity to buy an investment property</h2>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-6">The most common use of home equity in Australia</p>

            <p className="text-sm md:text-base text-slate-600 leading-relaxed mb-6">
              The most frequent use of home equity is as a deposit on an investment property. Rather than saving a cash deposit over years, the equity in your home is unlocked and directed toward the new purchase. The result is two loans: an enlarged home loan (or a separate equity facility) and a new investment property loan.
            </p>

            <div className="grid md:grid-cols-2 gap-5 mb-6">
              {/* Structure 1 */}
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                <div className="bg-slate-800 text-white px-5 py-3">
                  <h3 className="font-extrabold text-sm">Structure 1 — Single lender</h3>
                </div>
                <div className="p-5 text-sm space-y-3 text-slate-600">
                  <p>Refinance your home loan to include an equity release. The same lender holds both the home loan and the investment property loan, secured against both properties.</p>
                  <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2">
                    <p className="font-bold text-emerald-900 text-xs">Advantage</p>
                    <p className="text-xs text-emerald-800">Simpler application process; single lender relationship.</p>
                  </div>
                  <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2">
                    <p className="font-bold text-red-900 text-xs">Risk</p>
                    <p className="text-xs text-red-800">Cross-collateralisation — both properties are security for both loans. Reduced flexibility to sell or refinance independently.</p>
                  </div>
                </div>
              </div>

              {/* Structure 2 */}
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                <div className="bg-blue-800 text-white px-5 py-3">
                  <h3 className="font-extrabold text-sm">Structure 2 — Separate lenders</h3>
                </div>
                <div className="p-5 text-sm space-y-3 text-slate-600">
                  <p>Access equity from your existing home via Lender A (home loan). Use those funds as the deposit. Take the investment property loan with Lender B, secured only against the investment property.</p>
                  <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2">
                    <p className="font-bold text-emerald-900 text-xs">Advantage</p>
                    <p className="text-xs text-emerald-800">Properties are separate security. Sell or refinance either property independently without the other lender&apos;s involvement.</p>
                  </div>
                  <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
                    <p className="font-bold text-amber-900 text-xs">Consideration</p>
                    <p className="text-xs text-amber-800">More complex — requires two applications and two lender relationships.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tax note */}
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
              <h3 className="font-extrabold text-blue-900 mb-2">Tax deductibility — the purpose test</h3>
              <p className="text-sm text-blue-800 leading-relaxed mb-3">
                Under Australian tax law, interest deductibility is determined by the <strong>purpose</strong> of the borrowing, not the security used. This has a useful consequence for equity-funded investment property purchases:
              </p>
              <ul className="space-y-1.5 text-sm text-blue-800">
                <li className="flex gap-2">
                  <span className="shrink-0 font-bold text-emerald-600">&#x2713;</span>
                  Interest on the <strong>investment property loan</strong> is tax-deductible (loan purpose: income-producing investment).
                </li>
                <li className="flex gap-2">
                  <span className="shrink-0 font-bold text-emerald-600">&#x2713;</span>
                  Interest on the <strong>equity loan or cash-out used as the deposit</strong> is also tax-deductible — because the borrowed money was used to purchase an income-producing investment property.
                </li>
                <li className="flex gap-2">
                  <span className="shrink-0 font-bold text-red-600">&#x2715;</span>
                  Interest on any portion of borrowings used for private purposes (the home itself, renovations to the primary residence) is not deductible.
                </li>
              </ul>
              <p className="text-xs text-blue-700 mt-3">Clean loan separation (separate accounts for separate purposes) is essential to substantiate deductibility claims. Consult a registered tax agent to structure correctly from the outset.</p>
            </div>
          </div>
        </section>

        {/* Risks */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">Risks of accessing equity</h2>
            <div className="space-y-4">
              {RISKS.map((risk, i) => (
                <div key={i} className="rounded-xl border border-red-100 bg-red-50 p-5 flex gap-4">
                  <div className="w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 shrink-0">
                    !
                  </div>
                  <div>
                    <p className="font-extrabold text-red-900 text-sm mb-1">{risk.title}</p>
                    <p className="text-xs text-red-800 leading-relaxed">{risk.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="py-12 bg-slate-50 border-t border-slate-200">
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

        {/* CTA */}
        <section className="py-12 bg-white border-t border-slate-100">
          <div className="container-custom text-center">
            <h2 className="text-2xl font-bold text-slate-900 mb-3">Explore Your Equity Access Options</h2>
            <p className="text-slate-600 mb-6 max-w-xl mx-auto text-sm">
              A licensed mortgage broker can assess your usable equity, model repayment scenarios across lenders, and structure the loan separation required for tax deductibility — at no cost to you.
            </p>
            <Link
              href="/advisors/mortgage-brokers"
              className="inline-block bg-blue-600 text-white font-semibold px-8 py-3 rounded-xl hover:bg-blue-700 transition-colors"
            >
              Find a Licensed Mortgage Broker
            </Link>
          </div>
        </section>

        {/* Compliance Footer */}
        <section className="py-10 bg-slate-50 border-t border-slate-200">
          <div className="container-custom max-w-4xl">
            <div className="rounded-xl border border-slate-200 bg-white p-5 mb-5 space-y-3">
              <p className="text-xs text-slate-500 leading-relaxed">
                <strong className="text-slate-700">Credit disclaimer:</strong> {NCCP_CREDIT_NOTE}
              </p>
              <p className="text-xs text-slate-500 leading-relaxed">{GENERAL_ADVICE_WARNING}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <Link href="/property" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Property hub &#x2192;</Link>
              <Link href="/property/depreciation" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Tax depreciation guide &#x2192;</Link>
              <Link href="/home-loans/refinancing" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Home loan refinancing guide &#x2192;</Link>
            </div>
          </div>
        </section>

      </div>
    </>
  );
}
