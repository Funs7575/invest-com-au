import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import SectionHeading from "@/components/SectionHeading";
import AdvisorPrompt from "@/components/AdvisorPrompt";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Negative Gearing Australia (${CURRENT_YEAR}) — How It Works for Property & Shares`,
  description: `How negative gearing works in Australia for property and shares: tax savings by marginal rate, deductible expenses, CGT interaction, and break-even analysis. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Negative Gearing Australia (${CURRENT_YEAR}) — Property & Shares Guide`,
    description:
      "How negative gearing works for Australian investors — tax savings by income level, deductible expenses, the CGT connection, and when it makes financial sense.",
    url: `${SITE_URL}/tax/negative-gearing`,
    images: [{ url: `/api/og?title=${encodeURIComponent("Negative Gearing Australia")}&sub=${encodeURIComponent("Property · Shares · Tax Savings · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/tax/negative-gearing` },
};

// ─── Data ────────────────────────────────────────────────────────────────────

const DEDUCTIBLE_EXPENSES = [
  {
    expense: "Mortgage interest",
    notes:
      "Only on the investment loan — interest on your home loan (PPOR) is never deductible. The single largest deduction for most investors.",
  },
  {
    expense: "Council rates & water rates",
    notes: "All council levies and water charges payable during investment periods.",
  },
  {
    expense: "Landlord insurance",
    notes: "Building and contents insurance taken out as a landlord. Standard home-and-contents is not sufficient.",
  },
  {
    expense: "Property management fees",
    notes: "Typically 8–10% of gross rent. Includes letting fees and lease renewal fees charged by the property manager.",
  },
  {
    expense: "Repairs and maintenance",
    notes:
      "Restoring the property to its original condition — fixing a broken tap, repainting, patching walls. Capital improvements are not deductible (they go to cost base instead).",
  },
  {
    expense: "Advertising for tenants",
    notes: "Online listing fees, photography, and signage used to attract tenants.",
  },
  {
    expense: "Pest control & inspections",
    notes: "Routine pest inspections and treatments carried out during the tenancy.",
  },
  {
    expense: "Depreciation — Division 43 (building)",
    notes:
      "2.5% per year on the original construction cost for buildings built after 16 September 1987. A quantity surveyor&apos;s report establishes the eligible construction cost.",
  },
  {
    expense: "Depreciation — Division 40 (plant & equipment)",
    notes:
      "Carpets, blinds, hot water systems, appliances, and other fixtures depreciate at ATO-set rates. Requires a depreciation schedule from a quantity surveyor.",
  },
  {
    expense: "Legal costs (excluding acquisition)",
    notes:
      "Lease drafting, debt recovery, and eviction proceedings. Legal costs of purchasing the property are not deductible — they form part of the cost base.",
  },
  {
    expense: "Accounting & tax agent fees",
    notes: "Fees for preparing your tax return and managing the investment income records.",
  },
  {
    expense: "Land tax",
    notes: "Where applicable (state-based — thresholds vary). Generally deductible for investment properties.",
  },
];

const NON_DEDUCTIBLE_EXPENSES = [
  {
    expense: "Capital improvements",
    notes:
      "Adding a deck, renovating the kitchen, or converting the garage are improvements that increase the cost base — not deductible in the year incurred.",
  },
  {
    expense: "Borrowing costs (amortised)",
    notes:
      "Loan establishment fees, mortgage registration, title search, and mortgage broker fees are deductible over the lesser of five years or the loan term — not in full in year one.",
  },
  {
    expense: "Personal use portions",
    notes:
      "If the property was used privately for part of the year, only the investment-use portion of each expense is deductible.",
  },
  {
    expense: "Fines and penalties",
    notes: "ATO penalties, council fines, and similar charges are never deductible.",
  },
  {
    expense: "Principal repayments",
    notes:
      "Loan principal repayments reduce the loan balance — they are not an expense. Only the interest component is deductible.",
  },
];

const TAX_SAVING_BY_INCOME = [
  {
    income: "$150,000",
    mtr: "37%",
    annualLoss: "$8,000",
    taxSaving: "$2,960",
    realCashCost: "$5,040",
  },
  {
    income: "$120,000",
    mtr: "37%",
    annualLoss: "$8,000",
    taxSaving: "$2,960",
    realCashCost: "$5,040",
  },
  {
    income: "$90,000",
    mtr: "32.5%",
    annualLoss: "$8,000",
    taxSaving: "$2,600",
    realCashCost: "$5,400",
  },
  {
    income: "$60,000",
    mtr: "32.5%",
    annualLoss: "$8,000",
    taxSaving: "$2,600",
    realCashCost: "$5,400",
  },
];

const FAQS = [
  {
    q: "How does negative gearing reduce tax?",
    a: "When the costs of an investment — interest, rates, insurance, management fees, and depreciation — exceed the income it earns, the resulting net loss is deducted from your other taxable income (such as your salary). This reduces your total taxable income for the year. If you are in the 37% marginal tax bracket and your investment runs at an $8,000 annual loss, your taxable income falls by $8,000, saving $2,960 in income tax. The tax saving is automatic — it flows through your tax return at the end of the financial year.",
  },
  {
    q: "Can I negatively gear shares as well as property?",
    a: "Yes. The same principle applies to any income-producing investment. If you borrow to buy ASX shares via a margin loan and the annual interest on the loan exceeds the dividends you receive (including franking credits), you have a negatively geared share portfolio. The net loss is deductible against your salary income. The key difference from property is risk: margin loans can trigger margin calls if share prices fall, forcing you to sell at a loss. There is no margin call risk with investment property.",
  },
  {
    q: "What happens when a negatively geared property becomes positively geared?",
    a: "As rents rise over time, the net loss eventually narrows and the property may shift to neutral or positive gearing. When rental income exceeds all deductible expenses (including depreciation), the net surplus is added to your taxable income and taxed at your marginal rate. This is normal and expected for long-term property investors — the transition from negative to positive gearing often happens gradually over 7 to 15 years as rents increase while the loan balance reduces.",
  },
  {
    q: "How much tax do I save from negative gearing?",
    a: "Your tax saving equals the annual net investment loss multiplied by your marginal income tax rate. On an $8,000 annual loss: at 37% you save $2,960 per year; at 32.5% you save $2,600 per year; at 47% (income over $190,000 including Medicare Levy) you save $3,760 per year. The higher your income, the more the government effectively contributes to your holding costs — which is why negative gearing has historically been more popular among high-income earners.",
  },
  {
    q: "Is negative gearing worth it if I am on a low income?",
    a: "Generally, the financial case for negative gearing weakens significantly at lower income levels. If your marginal rate is 19% (income between $18,201 and $45,000), each dollar of investment loss saves only 19 cents in tax. You still bear 81 cents of real cash cost per dollar of loss. On a low income, the tax saving alone rarely offsets the cash drain — the strategy only works if capital growth is substantial and sustained. Many financial planners suggest negative gearing is most rational at the 37% or 45% marginal tax rate thresholds.",
  },
];

// ─── Page ────────────────────────────────────────────────────────────────────

export default function NegativeGearingPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Tax", url: `${SITE_URL}/tax` },
    { name: "Negative Gearing" },
  ]);

  const faqSchema = faqJsonLd(FAQS);

  return (
    <div className="bg-white min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}

      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="relative bg-white border-b border-slate-100 overflow-hidden py-8 md:py-12">
        <div className="container-custom">
          <nav aria-label="Breadcrumb" className="text-xs text-slate-500 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span>/</span>
            <Link href="/tax" className="hover:text-slate-900">Tax</Link>
            <span>/</span>
            <span className="text-slate-900 font-medium">Negative Gearing</span>
          </nav>
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 border border-slate-200 rounded-full text-xs font-semibold text-slate-600 mb-4">
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
              Negative Gearing Guide &middot; {UPDATED_LABEL}
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-3 tracking-tight text-slate-900">
              Negative Gearing Australia{" "}
              <span className="text-amber-600">({CURRENT_YEAR})</span>
              {" "}&mdash; How It Works for Property &amp; Shares
            </h1>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed">
              Negative gearing lets investors deduct investment losses against their income, reducing
              tax while holding an asset that is expected to grow in value. This guide explains how
              it works, the deductions you can claim, the CGT interaction, and when the numbers
              actually make sense.
            </p>
          </div>
        </div>
      </section>

      {/* ── Key stats ───────────────────────────────────────────── */}
      <section className="py-8 bg-slate-50 border-b border-slate-200">
        <div className="container-custom">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-amber-200 p-5">
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-1">Australian investors</p>
              <p className="text-xl font-black text-amber-700">~3 Million</p>
              <p className="text-xs text-slate-600 mt-1">
                Around 3 million Australians claim negative gearing deductions each financial year
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Asset classes</p>
              <p className="text-xl font-black text-slate-900">Property &amp; Shares</p>
              <p className="text-xs text-slate-600 mt-1">
                Both investment property and shares (via margin loans) qualify for negative gearing
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Tax benefit driver</p>
              <p className="text-xl font-black text-slate-900">Marginal Rate</p>
              <p className="text-xs text-slate-600 mt-1">
                Each dollar of loss saves tax at your marginal rate — most valuable above 37%
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── What is negative gearing ─────────────────────────────── */}
      <section className="py-10 md:py-12 bg-white">
        <div className="container-custom max-w-3xl">
          <SectionHeading
            eyebrow="The basics"
            title="What is negative gearing?"
          />
          <div className="mt-6 space-y-4 text-sm text-slate-600 leading-relaxed">
            <p>
              Negative gearing occurs when the income from an investment is less than the costs of
              holding it. The resulting net loss is deductible against your other income &mdash; such as
              salary or business income &mdash; reducing your taxable income and therefore your tax bill
              for the year.
            </p>
            <p>
              The strategy applies to any income-producing investment: residential property,
              commercial property, ASX shares, ETFs, and managed funds. It does{" "}
              <strong>not</strong> apply to your principal place of residence (no rental income), or
              to speculative assets you hold with no genuine intent to earn income.
            </p>
            <p>
              Investors accept a current cash loss in exchange for two things: the tax reduction
              today, and the expected capital growth in the asset&apos;s value over time. The strategy
              only makes financial sense if the eventual capital gain exceeds the accumulated net
              losses (after tax benefits) over the holding period.
            </p>
          </div>
        </div>
      </section>

      {/* ── Worked example ───────────────────────────────────────── */}
      <section className="py-10 md:py-12 bg-slate-50 border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <SectionHeading
            eyebrow="Worked example"
            title="How negative gearing works — step by step"
          />
          <div className="mt-6 space-y-4 text-sm text-slate-600 leading-relaxed">
            <p>
              Consider a $600,000 investment property purchased with an 80% interest-only loan
              ($480,000) at an interest rate of 6.67% per year.
            </p>
          </div>

          {/* Example table */}
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm border-collapse" aria-label="Negative gearing worked example income and expenses">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th scope="col" className="text-left py-3 px-4 text-xs font-bold">Item</th>
                  <th scope="col" className="text-right py-3 px-4 text-xs font-bold">Annual amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr className="bg-white">
                  <td className="py-3 px-4 text-xs text-slate-700">Rental income</td>
                  <td className="py-3 px-4 text-right text-xs font-semibold text-green-700">+$30,000</td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="py-3 px-4 text-xs text-slate-700">Mortgage interest (6.67% on $480,000)</td>
                  <td className="py-3 px-4 text-right text-xs font-semibold text-red-700">&minus;$32,016</td>
                </tr>
                <tr className="bg-white">
                  <td className="py-3 px-4 text-xs text-slate-700">
                    Other expenses (rates, insurance, management, repairs)
                  </td>
                  <td className="py-3 px-4 text-right text-xs font-semibold text-red-700">&minus;$5,984</td>
                </tr>
                <tr className="bg-amber-50 font-semibold">
                  <td className="py-3 px-4 text-xs text-slate-900">
                    <strong>Net investment loss (deductible)</strong>
                  </td>
                  <td className="py-3 px-4 text-right text-xs font-bold text-slate-900">&minus;$8,000</td>
                </tr>
                <tr className="bg-white">
                  <td className="py-3 px-4 text-xs text-slate-700">
                    Tax saving at 37% marginal rate ($8,000 &times; 37%)
                  </td>
                  <td className="py-3 px-4 text-right text-xs font-semibold text-green-700">$2,960</td>
                </tr>
                <tr className="bg-slate-100 font-semibold">
                  <td className="py-3 px-4 text-xs text-slate-900">
                    <strong>Real cash cost after tax saving</strong>
                  </td>
                  <td className="py-3 px-4 text-right text-xs font-bold text-slate-900">$5,040 / year</td>
                </tr>
              </tbody>
            </table>
            <p className="text-xs text-slate-400 mt-2">
              Illustrative only. Rates for FY{CURRENT_YEAR}. Does not include depreciation, which would
              increase the deductible loss further. Always verify with a registered tax agent.
            </p>
          </div>

          <div className="mt-6 space-y-3 text-sm text-slate-600 leading-relaxed">
            <p>
              The $8,000 annual loss reduces taxable income by $8,000, generating a tax saving of
              $2,960 at a 37% marginal rate. The investor pays $5,040 out-of-pocket per year to
              hold the property &mdash; not $8,000 &mdash; because the government absorbs 37 cents of every
              dollar of loss via the reduced tax assessment.
            </p>
            <p>
              The loss flows through automatically in the annual tax return. There is no separate
              application or form &mdash; rental income and expenses are reported in the &quot;Rental
              properties&quot; schedule and the net result reduces total taxable income.
            </p>
          </div>
        </div>
      </section>

      {/* ── Which investments qualify ─────────────────────────────── */}
      <section className="py-10 md:py-12 bg-white border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <SectionHeading
            eyebrow="Eligible investments"
            title="Which investments can be negatively geared?"
          />
          <div className="mt-6 grid sm:grid-cols-2 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
              <p className="text-xs font-bold text-green-800 uppercase tracking-wide mb-3">Eligible</p>
              <ul className="space-y-2 text-xs text-slate-700">
                <li className="flex gap-2">
                  <span className="text-green-600 font-bold shrink-0">&#10003;</span>
                  <span>
                    <strong>Residential investment property</strong> &mdash; the most common negatively
                    geared asset in Australia
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-green-600 font-bold shrink-0">&#10003;</span>
                  <span>
                    <strong>Commercial property</strong> &mdash; offices, retail, and industrial held for
                    rental income
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-green-600 font-bold shrink-0">&#10003;</span>
                  <span>
                    <strong>ASX shares via margin loan</strong> &mdash; margin loan interest deductible
                    against dividend income
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-green-600 font-bold shrink-0">&#10003;</span>
                  <span>
                    <strong>ETFs and managed funds</strong> &mdash; interest on borrowed funds deductible
                    against distribution income
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-green-600 font-bold shrink-0">&#10003;</span>
                  <span>
                    <strong>Holiday rental properties</strong> &mdash; where genuinely available for
                    rent and generating rental income
                  </span>
                </li>
              </ul>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
              <p className="text-xs font-bold text-red-800 uppercase tracking-wide mb-3">Not eligible</p>
              <ul className="space-y-2 text-xs text-slate-700">
                <li className="flex gap-2">
                  <span className="text-red-600 font-bold shrink-0">&#10007;</span>
                  <span>
                    <strong>Your principal place of residence</strong> &mdash; no rental income means
                    no deductible loss
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-red-600 font-bold shrink-0">&#10007;</span>
                  <span>
                    <strong>Speculative assets with no income</strong> &mdash; growth-only crypto or
                    artwork held purely for capital gain
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-red-600 font-bold shrink-0">&#10007;</span>
                  <span>
                    <strong>Private use holiday properties</strong> &mdash; properties primarily for
                    personal enjoyment, not genuine rental
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-red-600 font-bold shrink-0">&#10007;</span>
                  <span>
                    <strong>Assets inside super (accumulation)</strong> &mdash; losses inside super fund
                    do not pass through to your personal tax
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Deductible expenses ─────────────────────────────────── */}
      <section className="py-10 md:py-12 bg-slate-50 border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <SectionHeading
            eyebrow="Deductions"
            title="Deductible expenses for investment property"
          />
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm border-collapse" aria-label="Deductible expenses for investment property">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th scope="col" className="text-left py-3 px-4 text-xs font-bold w-1/3">Expense</th>
                  <th scope="col" className="text-left py-3 px-4 text-xs font-bold">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {DEDUCTIBLE_EXPENSES.map((row, i) => (
                  <tr key={row.expense} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className="py-3 px-4 text-xs font-semibold text-slate-800 align-top">
                      {row.expense}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 leading-relaxed">
                      {row.notes}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-8">
            <h3 className="text-base font-bold text-slate-900 mb-4">Non-deductible expenses</h3>
            <table className="w-full text-sm border-collapse" aria-label="Non-deductible investment property expenses">
              <thead>
                <tr className="bg-red-800 text-white">
                  <th scope="col" className="text-left py-3 px-4 text-xs font-bold w-1/3">Expense</th>
                  <th scope="col" className="text-left py-3 px-4 text-xs font-bold">Why it&apos;s not deductible</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-red-100">
                {NON_DEDUCTIBLE_EXPENSES.map((row, i) => (
                  <tr key={row.expense} className={i % 2 === 0 ? "bg-white" : "bg-red-50"}>
                    <td className="py-3 px-4 text-xs font-semibold text-slate-800 align-top">
                      {row.expense}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 leading-relaxed">
                      {row.notes}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── CGT interaction ─────────────────────────────────────── */}
      <section className="py-10 md:py-12 bg-white border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <SectionHeading
            eyebrow="The full picture"
            title="Negative gearing and CGT — how they work together"
          />
          <div className="mt-6 space-y-4 text-sm text-slate-600 leading-relaxed">
            <p>
              Negative gearing is a holding-period strategy. The annual losses reduce tax now, but
              the expectation is that the asset will grow in value, and the capital gain at sale will
              more than offset the accumulated losses and holding costs.
            </p>
            <p>
              The{" "}
              <strong>50% CGT discount</strong> is what makes the maths work. If you hold the
              property for more than 12 months before selling, only 50% of the net capital gain is
              included in assessable income. At a 37% marginal rate, the effective CGT rate on a
              long-term gain is 18.5% &mdash; while negative gearing deductions are taken at the full
              37% rate. This asymmetry is the tax engine of the strategy.
            </p>
          </div>

          {/* Long-run example */}
          <div className="mt-6 bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm">
            <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-3">
              10-year example at 37% marginal rate
            </p>
            <div className="space-y-2 text-xs text-slate-700">
              <div className="flex justify-between border-b border-amber-100 pb-2">
                <span>Annual net investment loss</span>
                <span className="font-semibold">&minus;$8,000 / year</span>
              </div>
              <div className="flex justify-between border-b border-amber-100 pb-2">
                <span>Annual tax saving at 37%</span>
                <span className="font-semibold text-green-700">+$2,960 / year</span>
              </div>
              <div className="flex justify-between border-b border-amber-100 pb-2">
                <span>Net real cash cost per year</span>
                <span className="font-semibold">&minus;$5,040 / year</span>
              </div>
              <div className="flex justify-between border-b border-amber-100 pb-2 pt-2 font-semibold">
                <span>Total real cash outlay over 10 years</span>
                <span>&minus;$50,400</span>
              </div>
              <div className="flex justify-between border-b border-amber-100 pb-2">
                <span>Capital gain at sale (10 years, $600K &rarr; $800K)</span>
                <span className="font-semibold text-green-700">+$200,000</span>
              </div>
              <div className="flex justify-between border-b border-amber-100 pb-2">
                <span>After 50% CGT discount: assessable gain</span>
                <span className="font-semibold">$100,000</span>
              </div>
              <div className="flex justify-between border-b border-amber-100 pb-2">
                <span>CGT payable at 37%</span>
                <span className="font-semibold text-red-700">&minus;$37,000</span>
              </div>
              <div className="flex justify-between pt-2 font-bold text-slate-900 text-sm">
                <span>Net gain after holding costs and CGT</span>
                <span className="text-green-700">+$112,600</span>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-3">
              Simplified illustration. Excludes loan principal repayments, stamp duty, selling costs,
              and depreciation recapture. Capital growth is not guaranteed.
            </p>
          </div>

          <div className="mt-6 space-y-3 text-sm text-slate-600 leading-relaxed">
            <p>
              Without capital growth, the strategy fails. An investor who incurs $50,400 in net
              holding costs over 10 years on a property that does not grow in value has simply made a
              $50,400 loss &mdash; partially offset by tax savings, but a loss nonetheless. Location and
              capital growth prospects are the primary drivers of whether negative gearing is
              financially worthwhile.
            </p>
          </div>
        </div>
      </section>

      {/* ── Shares negative gearing ─────────────────────────────── */}
      <section className="py-10 md:py-12 bg-slate-50 border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <SectionHeading
            eyebrow="Shares"
            title="Negative gearing on shares and ETFs"
          />
          <div className="mt-6 space-y-4 text-sm text-slate-600 leading-relaxed">
            <p>
              The same deductibility principle applies to shares purchased with a margin loan. If
              margin loan interest exceeds dividend income (plus franking credits), the net loss is
              deductible against salary and other income.
            </p>
          </div>

          <div className="mt-6 bg-white border border-slate-200 rounded-2xl p-5 text-sm">
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-3">
              Share negative gearing — illustrative example
            </p>
            <div className="space-y-2 text-xs text-slate-700">
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span>Portfolio value (ASX shares)</span>
                <span className="font-semibold">$200,000</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span>Margin loan interest (7% per year)</span>
                <span className="font-semibold text-red-700">&minus;$14,000</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span>Dividend income (4% yield)</span>
                <span className="font-semibold text-green-700">+$8,000</span>
              </div>
              <div className="flex justify-between pt-2 font-bold text-slate-900">
                <span>Net deductible loss</span>
                <span>&minus;$6,000</span>
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-4 text-sm text-slate-600 leading-relaxed">
            <p>
              Franking credits attached to Australian dividends count as income in your tax return
              (grossed-up dividend). If you receive $8,000 in cash dividends and $3,428 in franking
              credits (at 30% corporate rate), your assessable dividend income is $11,428 &mdash; which
              narrows the deductible loss.
            </p>
            <p>
              <strong>Key risk with margin lending:</strong> if the share portfolio falls in value
              below the lender&apos;s minimum loan-to-value ratio (LVR), you face a margin call &mdash; forced
              to deposit more cash, sell shares, or repay part of the loan immediately. Sharp market
              falls can crystallise substantial losses at exactly the wrong time. There is no
              equivalent risk in property gearing.
            </p>
            <p>
              Shares offer advantages in return: lower transaction costs, no stamp duty, easier
              diversification, and full liquidity. For investors with adequate cash reserves and risk
              tolerance, share negative gearing is a viable alternative to property.
            </p>
          </div>
        </div>
      </section>

      {/* ── Tax saving by income ─────────────────────────────────── */}
      <section className="py-10 md:py-12 bg-white border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <SectionHeading
            eyebrow="Tax benefit by income"
            title="Annual tax saving at different income levels"
          />
          <p className="text-sm text-slate-600 mt-3 mb-6">
            Using the $8,000 annual net loss from the worked example above. The higher your income,
            the more the tax saving absorbs your holding cost.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse" aria-label="Annual tax saving from negative gearing at different income levels">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th scope="col" className="text-left py-3 px-4 text-xs font-bold">Taxable income</th>
                  <th scope="col" className="text-center py-3 px-4 text-xs font-bold">Marginal rate</th>
                  <th scope="col" className="text-center py-3 px-4 text-xs font-bold">Annual loss</th>
                  <th scope="col" className="text-center py-3 px-4 text-xs font-bold">Tax saving</th>
                  <th scope="col" className="text-center py-3 px-4 text-xs font-bold">Real cash cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {TAX_SAVING_BY_INCOME.map((row, i) => (
                  <tr key={row.income} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className="py-3 px-4 text-xs font-mono text-slate-700">{row.income}</td>
                    <td className="py-3 px-4 text-center text-xs font-bold text-slate-900">
                      {row.mtr}
                    </td>
                    <td className="py-3 px-4 text-center text-xs text-slate-700">{row.annualLoss}</td>
                    <td className="py-3 px-4 text-center text-xs font-semibold text-green-700">
                      {row.taxSaving}
                    </td>
                    <td className="py-3 px-4 text-center text-xs font-semibold text-red-700">
                      {row.realCashCost}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-slate-400 mt-2">
              Excludes Medicare Levy. FY{CURRENT_YEAR} marginal rates. Tax saving does not include
              depreciation deductions, which would increase the saving further.
            </p>
          </div>
        </div>
      </section>

      {/* ── Break-even analysis ──────────────────────────────────── */}
      <section className="py-10 md:py-12 bg-slate-50 border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <SectionHeading
            eyebrow="Break-even"
            title="How much capital growth do you actually need?"
          />
          <div className="mt-6 space-y-4 text-sm text-slate-600 leading-relaxed">
            <p>
              The break-even question for negative gearing is: how much must the property grow each
              year to justify the holding costs? A rough framework compares the yield gap (the
              shortfall between rental yield and borrowing cost) against annual capital growth.
            </p>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 text-xs space-y-2 text-slate-700">
              <p className="font-bold text-slate-900 mb-2">Break-even growth rate — illustrative</p>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span>Property value</span>
                <span className="font-semibold">$600,000</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span>Gross rental yield</span>
                <span className="font-semibold">5.0% = $30,000 / year</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span>Total costs (interest + expenses)</span>
                <span className="font-semibold">6.33% = $38,000 / year</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span>Yield gap (annual cash shortfall)</span>
                <span className="font-semibold text-red-700">&minus;$8,000 / year</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span>After-tax shortfall (at 37% MTR)</span>
                <span className="font-semibold">&minus;$5,040 / year</span>
              </div>
              <div className="flex justify-between pt-2 font-bold text-slate-900">
                <span>
                  Minimum annual capital growth to break even (covers real cash cost)
                </span>
                <span>$5,040 = 0.84% / year</span>
              </div>
            </div>

            <p>
              In this example, the property needs to grow by at least $5,040 per year (0.84%) to
              break even in real cash terms. Any growth above that figure represents a net return. In
              the long run, Australian capital city median house prices have historically averaged
              5–8% annual growth &mdash; well above the break-even threshold &mdash; but this varies
              significantly by location and period.
            </p>
            <p>
              When interest rates rise, the yield gap widens, raising the break-even growth rate
              required. This is why rapid rate increases in 2022&ndash;2024 squeezed the mathematics of
              negative gearing for many investors: higher rates increased the annual loss faster than
              rents could adjust.
            </p>
          </div>
        </div>
      </section>

      {/* ── Positive gearing ────────────────────────────────────── */}
      <section className="py-10 md:py-12 bg-white border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <SectionHeading
            eyebrow="The full spectrum"
            title="Positive gearing — when rent exceeds costs"
          />
          <div className="mt-6 space-y-4 text-sm text-slate-600 leading-relaxed">
            <p>
              When rental income exceeds all deductible costs &mdash; including interest, rates,
              insurance, management fees, and depreciation &mdash; the investment is positively geared.
              The net surplus is added to your taxable income and taxed at your marginal rate.
            </p>
            <p>
              Positive gearing is often found in higher-yield, lower-growth markets: regional towns,
              industrial properties, and some commercial assets. It provides positive cash flow
              immediately, but the tax cost on the income stream reduces the net return.
            </p>
            <p>
              Most long-term investment properties transition naturally from negatively geared to
              neutrally or positively geared as:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs">
              <li>Rents increase with inflation and market demand over time</li>
              <li>
                The loan balance reduces (if principal-and-interest repayments are made rather than
                interest-only)
              </li>
              <li>Depreciation deductions diminish as assets reach the end of their effective life</li>
            </ul>
            <p>
              Planning for the transition &mdash; and understanding the tax implications at each stage
              &mdash; is an important part of long-term investment property management.
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-xs">
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <p className="font-bold text-red-700 mb-1">Negatively geared</p>
                  <p className="text-slate-600">
                    Income &lt; Costs. Net loss deductible. Requires capital growth to justify.
                  </p>
                </div>
                <div>
                  <p className="font-bold text-slate-600 mb-1">Neutrally geared</p>
                  <p className="text-slate-600">
                    Income = Costs. No tax impact. Full exposure to capital growth with no cash drain.
                  </p>
                </div>
                <div>
                  <p className="font-bold text-green-700 mb-1">Positively geared</p>
                  <p className="text-slate-600">
                    Income &gt; Costs. Net income taxable. Positive cash flow, usually lower growth
                    markets.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Risks and criticisms ─────────────────────────────────── */}
      <section className="py-10 md:py-12 bg-slate-50 border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <SectionHeading
            eyebrow="Risks"
            title="Risks, criticisms, and common errors"
          />
          <div className="mt-6 grid sm:grid-cols-2 gap-5">
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Investment risks</h3>
              <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
                <p>
                  <strong>Capital growth not guaranteed.</strong> The entire strategy depends on the
                  asset growing in value. Flat or declining markets produce a financial loss with no
                  offsetting capital gain.
                </p>
                <p>
                  <strong>Interest rate risk.</strong> Rising rates increase the annual loss. When
                  rates move from 2% to 6.5%, the interest component of a $480,000 loan nearly
                  triples from $9,600 to $31,200 per year.
                </p>
                <p>
                  <strong>Vacancy risk.</strong> No tenant means no rental income but costs
                  continue. Even at 95% occupancy, a one-month vacancy wipes out roughly 4 weeks
                  of annual income.
                </p>
                <p>
                  <strong>Policy risk.</strong> Negative gearing has been debated politically.
                  Labor&apos;s 2019 election policy proposed limiting negative gearing to new properties
                  only, which was not enacted. Future governments could revisit this. Structuring
                  investments solely around current tax treatment carries policy risk.
                </p>
                <p>
                  <strong>Illiquidity.</strong> Property cannot be partially sold and takes months
                  to transact. If holding costs become unserviceable, a forced sale at an
                  inopportune time may crystallise a loss.
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Common tax errors</h3>
              <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
                <p>
                  <strong>Claiming improvements as repairs.</strong> Replacing a worn carpet with a
                  new one is a repair (deductible). Upgrading from carpet to hardwood floors is an
                  improvement (cost base, not deductible). The ATO&apos;s data-matching programme
                  cross-references large repair deductions.
                </p>
                <p>
                  <strong>Claiming private use portions.</strong> If you or family stay in an
                  investment property, only the rental-use periods are deductible. The full-year
                  deduction is not available.
                </p>
                <p>
                  <strong>Forgetting to include all rental income.</strong> Rental bond returned
                  to the tenant is not income, but compensation payments, insurance reimbursements,
                  and rent paid by tenants for periods beyond the year end are assessable.
                </p>
                <p>
                  <strong>Incorrectly amortising borrowing costs.</strong> Loan establishment
                  fees, title search fees, and mortgage broker commissions must be spread over the
                  loan term (or five years, whichever is less) &mdash; not claimed in full in year one.
                </p>
                <p>
                  <strong>Not keeping a depreciation schedule.</strong> Many investors leave
                  thousands of dollars of legitimate deductions unclaimed by not commissioning a
                  quantity surveyor&apos;s report at purchase.
                </p>
              </div>
            </div>
          </div>

          {/* ATO data matching note */}
          <div className="mt-6 bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900">
            <strong>ATO property data matching:</strong> The ATO receives property transaction data
            from state revenue offices, rental bond authorities, and property management platforms.
            Rental income omissions and overclaimed deductions are cross-checked automatically.
            Ensure your records match what property managers and agents report to the ATO.
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────── */}
      <section className="py-10 md:py-12 bg-white border-t border-slate-200">
        <div className="container-custom max-w-2xl">
          <SectionHeading eyebrow="FAQ" title="Negative gearing questions answered" />
          <div className="mt-6 divide-y divide-slate-200">
            {FAQS.map((faq) => (
              <details key={faq.q} className="py-4 group">
                <summary className="text-sm font-semibold text-slate-900 cursor-pointer list-none flex items-center justify-between gap-2">
                  {faq.q}
                  <span className="text-slate-400 group-open:rotate-180 transition-transform shrink-0" aria-hidden="true">
                    &#9662;
                  </span>
                </summary>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────── */}
      <section className="py-12 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="container-custom text-center max-w-xl">
          <h2 className="text-xl font-extrabold mb-3">
            Get the numbers modelled for your situation
          </h2>
          <p className="text-sm text-slate-300 mb-6">
            A tax agent or financial planner can calculate the real after-tax cost of a negatively
            geared investment at your specific income level and model whether the required capital
            growth is realistic.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/best/tax-agents"
              className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm rounded-xl transition-colors"
            >
              Find a Tax Agent &rarr;
            </Link>
            <Link
              href="/best/financial-advisors"
              className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-sm rounded-xl transition-colors"
            >
              Find a Financial Planner &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ── AdvisorPrompt ───────────────────────────────────────── */}
      <section className="py-10 bg-white border-t border-slate-200">
        <div className="container-custom max-w-3xl space-y-4">
          <h2 className="text-lg font-bold text-slate-900">Find an investment loan</h2>
          <AdvisorPrompt type="mortgage_broker" />
          <h2 className="text-lg font-bold text-slate-900 pt-2">
            Structure your negative gearing correctly
          </h2>
          <AdvisorPrompt type="tax_agent" />
        </div>
      </section>

      {/* ── Disclaimer ──────────────────────────────────────────── */}
      <section className="py-6 bg-slate-100 border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <p className="text-xs text-slate-500 leading-relaxed">
            {GENERAL_ADVICE_WARNING} Negative gearing involves real financial risk. Past tax
            treatment may change with future legislation. Capital growth is not guaranteed and past
            performance is not indicative of future results. Always seek advice from a registered
            tax agent and licensed financial adviser before implementing any gearing strategy.
          </p>
        </div>
      </section>
    </div>
  );
}
