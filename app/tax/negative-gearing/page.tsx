import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import SectionHeading from "@/components/SectionHeading";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Negative Gearing Australia (${CURRENT_YEAR}) — How It Works for Property & Shares`,
  description: `How negative gearing works in Australia for property and shares: tax savings by marginal rate, the real after-tax cost, and positive vs neutral gearing explained. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Negative Gearing Australia (${CURRENT_YEAR}) — Property & Shares Guide`,
    description: "How negative gearing works for Australian investors in property and shares — tax savings, real costs, and when it makes sense.",
    url: `${SITE_URL}/tax/negative-gearing`,
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/tax/negative-gearing` },
};

const SECTIONS = [
  {
    heading: "What is negative gearing?",
    body: `Negative gearing occurs when the income from an investment is less than the costs of holding it — primarily interest on a loan used to finance the investment, plus expenses like maintenance, rates, management fees, and depreciation. The resulting loss can be deducted from your other income (salary, business income), reducing your total taxable income.

**The basic formula:**
Rental income (or dividends) − Investment expenses = Net result
If the result is negative: it's a deductible loss — this is negative gearing.

**Example — investment property:**
- Annual rental income: $24,000
- Annual mortgage interest: $32,000
- Council rates, insurance, management fees, repairs: $6,000
- Depreciation (if applicable): $4,000
- Total deductible costs: $42,000
- Net loss: $24,000 − $42,000 = −$18,000

This $18,000 loss is deducted from your salary income. At a 37% marginal rate, this saves $6,660 in income tax.

**Why negative gearing is a strategy (not a mistake):**
Investors accept a current cash loss in exchange for two things: the tax reduction today, and the expected capital growth in the asset's value over time. The tax saving partially offsets the cash shortfall. The strategy only makes financial sense if the expected capital gain exceeds the accumulated net losses (after tax benefits) over the holding period.

**The Australian context:** Approximately 3 million Australians claim negative gearing deductions each year — making it one of the most widely used investment strategies in the country. It's been a feature of Australian tax law for decades and applies to both property and share investments.`,
  },
  {
    heading: "How negative gearing tax savings work — by marginal rate",
    body: `The tax saving from negative gearing depends entirely on your marginal income tax rate. The higher your rate, the more the government effectively subsidises your investment loss.

**The key principle:** A $10,000 investment loss at a 47% marginal rate (including Medicare Levy) saves $4,700 in tax. The same loss at a 19% rate saves only $1,900.

**Example — Property investment at two different income levels:**

Person A earns $200,000 (47% marginal rate):
- Net investment loss: $20,000
- Tax saving: $20,000 × 47% = $9,400
- Actual net cash cost: $20,000 − $9,400 = $10,600

Person B earns $60,000 (32.5% marginal rate):
- Net investment loss: $20,000
- Tax saving: $20,000 × 32.5% = $6,500
- Actual net cash cost: $20,000 − $6,500 = $13,500

Both investors have the same negatively geared property, but Person A receives a larger tax benefit — the government effectively contributes more to their holding costs. This is one reason negative gearing is often described as more beneficial for high-income earners.

**The tax saving doesn't make you money:**
Tax savings reduce the cost of holding the investment — they don't generate profit. If the property doesn't grow in value sufficiently to offset the cumulative net losses (after tax benefits), the strategy produces a negative return overall. The tax saving is a contribution toward holding costs, not a profit in itself.

**Timing consideration:**
Tax benefits from negative gearing reduce your tax in the current year, but the capital gain (when you eventually sell) is taxed — albeit with the 50% CGT discount if held 12+ months. The strategy essentially converts current-year tax losses into future CGT, which is taxed more favourably.`,
  },
  {
    heading: "Negative gearing on property",
    body: `Investment property is the most common negatively geared asset in Australia. The strategy works best when combined with capital growth expectations, strong rental demand, and depreciation deductions.

**Income and expenses for rental properties:**

**Income:** Gross rent, insurance claim reimbursements, letting fees recovered from tenants.

**Deductible expenses:**
- Mortgage interest (the biggest deduction for most investors)
- Council rates and water rates
- Property management fees (typically 7–10% of rent)
- Insurance premiums
- Repairs and maintenance (not capital improvements — these are added to the cost base)
- Depreciation (building allowance on construction costs, and plant & equipment depreciation)
- Accountant fees for managing the investment
- Land tax
- Advertising and letting costs

**Depreciation — the tax-free cashflow advantage:**
Depreciation is a deduction for the wear and tear of the property and its fixtures — but it's a non-cash deduction. You don't write a cheque; the deduction exists because the building and its contents theoretically decline in value over time. This deduction reduces the net rental loss (increasing the tax deduction) without any actual cash outflow.

For a property built after 1987, a building depreciation rate of 2.5% per year applies to the construction cost. Plant and equipment (carpets, blinds, hot water systems, appliances) also depreciate. A quantity surveyor's depreciation schedule maximises this deduction.

**The trap — negative gearing doesn't guarantee profit:**
Many investors focus on the tax savings and underestimate the importance of capital growth. A property that delivers weak or no capital growth while negatively geared produces a real financial loss despite the tax benefit. Location selection and capital growth prospects are the primary drivers of whether negative gearing is financially worthwhile.`,
  },
  {
    heading: "Negative gearing on shares",
    body: `Negative gearing also applies to shares — the same principle allows investors to deduct interest costs on money borrowed to buy shares (through a margin loan or similar financing) against their salary income.

**How share negative gearing works:**
- Take out a margin loan to buy $200,000 of ASX shares
- Margin loan interest rate: 7% = $14,000 annual interest
- Dividend income from shares: $8,000 (4% dividend yield)
- Net loss: $14,000 − $8,000 = $6,000 deductible loss

At a 32.5% marginal rate, this saves $1,950 in income tax annually.

**Key advantage of shares vs property:**
- No stamp duty on acquisition
- Much easier to adjust position size — you can sell part of a portfolio; you can't sell half a house
- Liquidity — shares can be sold quickly if needed; property takes months
- Lower transaction costs and ongoing management costs

**Risk of margin loans:**
The significant additional risk with share negative gearing via margin loans is the margin call. If your share portfolio drops in value below the lender's minimum loan-to-value ratio (LVR), you're required to deposit additional cash, sell shares, or repay part of the loan. In a sharp market decline, this forced selling at low prices can crystallise substantial losses. This is why margin lending for long-term negative gearing requires significant risk tolerance and cash reserves.

**Shares vs property for negative gearing:**
Property offers predictable rental income, less volatile valuations, and no margin calls. Shares offer liquidity, lower costs, and easier diversification. For most Australians, property remains the preferred negatively geared asset — but shares are a viable alternative for those with appropriate risk tolerance.`,
  },
  {
    heading: "When negative gearing doesn't make sense",
    body: `Negative gearing is widely promoted in Australia, but it's not universally advantageous. Understanding when it doesn't make sense protects you from a strategy that could result in long-term financial loss.

**The real after-tax cost:**
Many people focus on the tax saving but underestimate the full cash cost. If you're losing $20,000 per year on a negatively geared property and your tax saving is $7,400 (at 37%), your actual annual cash cost is $12,600. Over 10 years, that's $126,000 in real cash outlays — plus opportunity cost of that capital invested elsewhere.

**Negative gearing doesn't make sense when:**

1. **Capital growth doesn't eventuate:** The entire strategy depends on the asset growing in value. In markets or suburbs with flat or declining prices, negative gearing produces a financial loss with no offsetting capital gain.

2. **Your marginal rate is low:** At a 19% or 32.5% marginal rate, the tax benefit is modest. Many financial planners suggest negative gearing is most rational at 37% or 45% marginal rates.

3. **You can't service the ongoing losses:** If market conditions change (interest rates rise, vacancies increase, rent falls), the losses may be larger than anticipated. Insufficient cash flow to sustain the investment forces a sale — potentially at an inopportune time.

4. **Leverage amplifies losses:** A 20% deposit with 80% borrowing means a 5% property price fall wipes out 25% of your equity. Leverage amplifies losses as readily as it amplifies gains.

5. **You prioritise cash flow:** Negative gearing produces negative cash flow by definition. If you need current income from your investments (e.g., approaching retirement), negative gearing works against you.`,
  },
  {
    heading: "Positive gearing vs neutral gearing",
    body: `Negative gearing is just one point on a spectrum of investment income outcomes. Understanding all three positions helps you make deliberate choices about your investment strategy.

**Positive gearing:**
When investment income exceeds all costs (interest, expenses, depreciation), the result is a net positive income. This rental profit is added to your taxable income.

Example: Property earns $36,000 rent, total costs are $28,000 — positive cash flow of $8,000 taxable at marginal rate.

Pros: Generates current income, reduces reliance on salary to fund the investment, suitable for those needing income (near retirement, lower income).
Cons: Tax is payable on the net income each year; typically occurs in lower-growth regional markets where yields are higher but appreciation is slower.

**Neutral gearing:**
Income exactly equals costs — zero net gain or loss before capital growth. Many investors aim for neutral gearing as a balance: no cash drain, no tax cost, and still benefiting from capital growth.

In practice, neutral gearing often occurs naturally as rents rise over time on a fixed-rate or reduced loan — what starts negatively geared often becomes neutrally or positively geared after 5–10 years.

**The gearing shift over time:**
Most investment properties shift from negative to neutral to positive gearing as:
- Rents increase with inflation and market demand
- The loan balance reduces (if principal-and-interest repayments are made)
- Interest costs reduce as rates shift or the loan is paid down

Planning for this transition — and understanding the tax implications at each stage — is important for long-term investment property management.`,
  },
];

const FAQS = [
  {
    question: "Can I negatively gear shares in Australia?",
    answer: "Yes. The same principle applies to shares as to property. Interest on money borrowed to purchase income-producing investments (including shares) is generally tax deductible. If your borrowing costs (margin loan interest) exceed your dividend income from those shares, the net loss is deductible against your salary and other income. The key is that the investment must be income-producing — pure speculation without any income component may not qualify for interest deductions. Consult a tax agent if borrowing to invest in growth assets with minimal dividends.",
  },
  {
    question: "What is the difference between negative gearing and capital gains tax?",
    answer: "They operate at different times. Negative gearing provides a tax deduction during the holding period — while you own the investment, losses reduce your current income tax. Capital Gains Tax (CGT) applies when you sell the investment. The interplay is important: negative gearing reduces tax now, but the capital gain on sale is taxed later. However, the 50% CGT discount (for assets held 12+ months) means the future tax on the gain is at roughly half your marginal rate, while the current negative gearing deductions are at your full marginal rate — creating a potential tax timing advantage.",
  },
  {
    question: "Is negative gearing being abolished in Australia?",
    answer: "As of 2026, negative gearing remains fully available for both new and existing investment properties and shares. There have been various political debates and proposals to limit or abolish negative gearing over recent years, but no changes have been enacted. Investors should be aware that negative gearing policy could change with future government decisions, and structuring investments solely around the current tax treatment involves policy risk.",
  },
  {
    question: "How do I claim negative gearing on my tax return?",
    answer: "For investment property, you report all rental income and expenses (including interest, rates, insurance, repairs, and depreciation) in the 'Rental properties' section of your tax return. The net loss flows through to reduce your total taxable income. For shares, deductible investment expenses (margin loan interest, management fees) are reported in the deductions section. Complex situations — multiple properties, mixed personal/investment use, or large portfolios — are best handled by a tax agent experienced in investment income.",
  },
  {
    question: "Does negative gearing still make sense with high interest rates?",
    answer: "Higher interest rates increase the annual loss on a negatively geared investment, which increases the tax deduction — but also increases the real cash outlay. Whether the strategy makes sense depends on the expected capital growth relative to the increased holding costs. When interest rates rise significantly (as they did in 2022–2024), many investors find their losses exceed comfortable servicing levels. The mathematics of negative gearing only work in your favour if the eventual capital gain, net of CGT and accumulated net losses after tax benefits, produces a positive total return.",
  },
];

export default function NegativeGearingPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Tax", url: `${SITE_URL}/tax` },
    { name: "Negative Gearing" },
  ]);

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };

  return (
    <div className="bg-white min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      {/* Hero */}
      <section className="relative bg-white border-b border-slate-100 overflow-hidden py-8 md:py-12">
        <div className="container-custom">
          <nav className="text-xs text-slate-500 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span>/</span>
            <Link href="/tax" className="hover:text-slate-900">Tax</Link>
            <span>/</span>
            <span className="text-slate-900 font-medium">Negative Gearing</span>
          </nav>
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 border border-slate-200 rounded-full text-xs font-semibold text-slate-600 mb-4">
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
              Negative Gearing · {UPDATED_LABEL}
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-3 tracking-tight text-slate-900">
              Negative Gearing Australia{" "}
              <span className="text-amber-600">({CURRENT_YEAR})</span>
              {" "}— How It Works for Property &amp; Shares
            </h1>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed">
              Around 3 million Australians use negative gearing to reduce their tax. We explain exactly how it works,
              what the real after-tax cost is, and when it makes — and doesn't make — financial sense.
            </p>
          </div>
        </div>
      </section>

      {/* Callouts */}
      <section className="py-8 bg-slate-50 border-b border-slate-200">
        <div className="container-custom">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-amber-200 p-5">
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-1">Usage</p>
              <p className="text-xl font-black text-amber-700">~3 Million</p>
              <p className="text-xs text-slate-600 mt-1">Around 3 million Australians claim negative gearing deductions each financial year</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Asset Types</p>
              <p className="text-xl font-black text-slate-900">Property &amp; Shares</p>
              <p className="text-xs text-slate-600 mt-1">Both investment property and shares (via margin loans) can be negatively geared</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Tax Benefit</p>
              <p className="text-xl font-black text-slate-900">Marginal Rate</p>
              <p className="text-xs text-slate-600 mt-1">Tax savings depend entirely on your marginal rate — highest benefit at 45% rate</p>
            </div>
          </div>
        </div>
      </section>

      {/* Content Sections */}
      <section className="py-10 md:py-12 bg-slate-50">
        <div className="container-custom max-w-3xl">
          <SectionHeading eyebrow="Negative Gearing Guide" title="How Negative Gearing Works" />
          <div className="mt-8 space-y-10">
            {SECTIONS.map((sec) => (
              <div key={sec.heading}>
                <h2 className="text-lg font-extrabold text-slate-900 mb-3">{sec.heading}</h2>
                <div className="text-sm text-slate-600 leading-relaxed space-y-3">
                  {sec.body.split("\n\n").map((para, i) => (
                    <p key={i} className="whitespace-pre-line">{para}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-10 md:py-12">
        <div className="container-custom max-w-2xl">
          <SectionHeading eyebrow="FAQ" title="Negative Gearing Questions" />
          <div className="mt-6 divide-y divide-slate-200">
            {FAQS.map((faq) => (
              <details key={faq.question} className="py-4 group">
                <summary className="text-sm font-semibold text-slate-900 cursor-pointer list-none flex items-center justify-between gap-2">
                  {faq.question}
                  <span className="text-slate-400 group-open:rotate-180 transition-transform shrink-0">▾</span>
                </summary>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="container-custom text-center max-w-xl">
          <h2 className="text-xl font-extrabold mb-3">Get expert tax and investment advice</h2>
          <p className="text-sm text-slate-300 mb-6">A tax agent or financial planner can model the real after-tax cost of a negatively geared investment and whether it makes sense for your situation.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/best/tax-agents" className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm rounded-xl transition-colors">
              Find a Tax Agent →
            </Link>
            <Link href="/best/financial-advisors" className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-sm rounded-xl transition-colors">
              Find a Financial Planner →
            </Link>
          </div>
        </div>
      </section>

      <section className="py-6 bg-slate-100 border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <p className="text-xs text-slate-500 leading-relaxed">{GENERAL_ADVICE_WARNING} Negative gearing involves real financial risk. Past tax treatment may change with future legislation. Always seek advice from a registered tax agent and licensed financial adviser before implementing any gearing strategy.</p>
        </div>
      </section>
    </div>
  );
}
