import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import SectionHeading from "@/components/SectionHeading";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Australian Investor Tax Guide (${CURRENT_YEAR}) — CGT, Franking Credits & Strategies`,
  description: `Complete tax guide for Australian investors: capital gains tax, franking credits, negative gearing, crypto tax, and tax strategies. Independent, updated for ${CURRENT_YEAR}. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Tax Strategy Hub — Invest.com.au`,
    description: "Complete tax guide for Australian investors. CGT, franking credits, negative gearing, crypto tax, and tax strategies.",
    url: `${SITE_URL}/tax`,
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/tax` },
};

const TAX_TOPICS = [
  {
    title: "Capital Gains Tax",
    description: "How CGT works in Australia, the 50% discount, cost base calculation, and tax-loss harvesting strategies for share and property investors.",
    href: "/tax/capital-gains",
    icon: "📈",
    keyFact: "50% discount after 12 months",
  },
  {
    title: "Franking Credits",
    description: "How dividend imputation works, how to calculate your franking credit benefit at your tax bracket, and the refund rules for zero-tax investors.",
    href: "/tax/franking-credits",
    icon: "🏦",
    keyFact: "Cash refunds for low-income investors",
  },
  {
    title: "Negative Gearing",
    description: "How negative gearing tax benefits work for property and shares, the real after-tax cost, and when it makes financial sense.",
    href: "/tax/negative-gearing",
    icon: "🔻",
    keyFact: "~3M Australians negatively geared",
  },
  {
    title: "Crypto Tax",
    description: "ATO rules for Bitcoin, Ethereum, DeFi, staking income, NFTs, and crypto-to-crypto swaps. How to calculate CGT on crypto disposals.",
    href: "/tax/crypto",
    icon: "₿",
    keyFact: "Every swap is a CGT event",
  },
  {
    title: "Super Tax Strategies",
    description: "Concessional contribution strategies, salary sacrifice, catch-up contributions, and super to reduce your tax in the accumulation and pension phase.",
    href: "/super",
    icon: "🔵",
    keyFact: "15% contributions tax vs up to 47%",
  },
  {
    title: "SMSF Tax",
    description: "Tax rates inside an SMSF: 15% in accumulation, 0% in pension phase. Investment income, CGT discount, and franking credit refunds inside SMSF.",
    href: "/super/smsf",
    icon: "🏛️",
    keyFact: "0% tax in pension phase",
  },
];

const TAX_RATES = [
  { bracket: "$0 – $18,200", rate: "0%", note: "Tax-free threshold" },
  { bracket: "$18,201 – $45,000", rate: "19%", note: "Plus 2% Medicare Levy" },
  { bracket: "$45,001 – $135,000", rate: "32.5%", note: "Plus 2% Medicare Levy" },
  { bracket: "$135,001 – $190,000", rate: "37%", note: "Plus 2% Medicare Levy" },
  { bracket: "$190,001+", rate: "45%", note: "Plus 2% Medicare Levy" },
];

const KEY_STRATEGIES = [
  {
    strategy: "Tax-Loss Harvesting",
    description: "Sell investments that have declined in value to realise capital losses, which can offset capital gains in the same year. Common at financial year end (before 30 June). Be aware of the 30-day wash sale rule.",
    saving: "Up to $45K tax on $100K gain at 45% rate",
    difficulty: "Medium",
  },
  {
    strategy: "Hold 12+ Months for CGT Discount",
    description: "Qualifying assets held more than 12 months receive a 50% CGT discount. A $100K capital gain becomes only $50K assessable income. This dramatically changes the decision around when to sell.",
    saving: "50% reduction in CGT liability",
    difficulty: "Easy",
  },
  {
    strategy: "Salary Sacrifice to Super",
    description: "Redirect pre-tax salary into super, reducing assessable income taxed at your marginal rate (up to 47%) and paying only 15% contributions tax inside super. Up to $30,000/year concessional limit (FY2025–26).",
    saving: "Up to 32% tax savings on each dollar sacrificed at 47% rate",
    difficulty: "Easy",
  },
  {
    strategy: "Investment Bond Structure",
    description: "Investment bonds are taxed at 30% within the bond structure and become tax-free after 10 years. Suitable for high-income investors as an alternative to super for long-term savings beyond super caps.",
    saving: "30% internal tax rate vs 47% marginal rate",
    difficulty: "Medium",
  },
  {
    strategy: "Spouse Super Contributions",
    description: "If your spouse earns under $37,000, you can contribute to their super and claim a tax offset of up to $540/year. Helps boost a lower-earning partner's super while reducing your tax.",
    saving: "Up to $540/year tax offset",
    difficulty: "Easy",
  },
  {
    strategy: "Testamentary Trust Structure",
    description: "Assets inherited through a testamentary trust (set up in a will) can be distributed among beneficiaries — including minors — at adult marginal rates. Significant tax savings for high-value estates.",
    saving: "Up to $18,200 tax-free per child beneficiary",
    difficulty: "Complex (requires estate planning advice)",
  },
];

const IMPORTANT_DATES = [
  { date: "1 July", event: "New financial year begins — reset of contribution caps and carry-forward provisions" },
  { date: "30 June", event: "End of financial year — final date to realise tax-loss harvesting, make concessional contributions, pay investment expenses" },
  { date: "31 October", event: "Tax return lodgement deadline for self-lodgers (28 February with a tax agent)" },
  { date: "15 January", event: "PAYG withholding variation deadline — lodge by this date to reduce withholding from 1 March" },
  { date: "28 February", event: "Tax return due if lodging with a registered tax agent" },
  { date: "Various", event: "BAS (Business Activity Statement) due quarterly or monthly for businesses registered for GST" },
];

const FAQS = [
  {
    question: "How is investment income taxed in Australia?",
    answer: "Investment income (dividends, interest, rent) is added to your assessable income and taxed at your marginal rate. Dividends from Australian companies come with franking credits that offset the tax already paid at the corporate level. Capital gains on assets held less than 12 months are taxed at your marginal rate; gains on assets held 12+ months receive a 50% discount before being added to income.",
  },
  {
    question: "What is the best legal way to reduce investment tax in Australia?",
    answer: "The most effective strategies are: (1) holding assets 12+ months for the 50% CGT discount, (2) salary sacrificing to super to reduce assessable income, (3) using tax-loss harvesting before 30 June to offset gains, (4) investing through an SMSF in pension phase (0% tax on income and gains), and (5) using trust structures for income splitting with lower-income family members.",
  },
  {
    question: "Do I need to lodge a tax return if I only have investment income?",
    answer: "Generally yes, if your total investment income (after deductions) exceeds the tax-free threshold ($18,200). Even if tax is withheld at source, you need to lodge to claim deductions, franking credit refunds, and ensure the correct tax is paid. The ATO automatically receives data from brokers and banks — it's important to lodge to reconcile this data.",
  },
  {
    question: "When do I pay tax on capital gains in Australia?",
    answer: "CGT is payable in the financial year you dispose of (sell, gift, or otherwise transfer) the asset. If you sell shares in June 2026, the gain is included in your 2025–26 tax return due by 31 October 2026 (or 28 February 2027 with a tax agent). Tax is not paid at the time of sale — it's calculated and paid when you lodge your annual return.",
  },
  {
    question: "Can I claim investment-related expenses as a tax deduction?",
    answer: "Yes. Expenses incurred in earning assessable investment income are generally deductible. This includes: interest on borrowings to purchase income-producing investments, brokerage fees (as part of cost base, not immediate deduction), investment subscriptions and journals, financial adviser fees (for ongoing investment management advice, not for initial setup), and a portion of home office costs if used for investment management.",
  },
  {
    question: "What records do I need to keep for investment tax?",
    answer: "You must keep records for 5 years after lodging your tax return (or longer for property). Essential records include: trade confirmations for all share purchases and sales (brokerage statements), annual tax reports from your broker (showing dividends, franking credits, capital gains), bank statements for investment accounts, records of all costs associated with investment properties, and crypto transaction history if applicable.",
  },
];

export default function TaxHubPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Tax Strategy Hub" },
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
            <span className="text-slate-900 font-medium">Tax Strategy</span>
          </nav>
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 border border-slate-200 rounded-full text-xs font-semibold text-slate-600 mb-4">
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
              Tax Hub · {UPDATED_LABEL}
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-3 tracking-tight text-slate-900">
              Australian Investor{" "}
              <span className="text-amber-600">Tax Guide ({CURRENT_YEAR})</span>
            </h1>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed max-w-2xl">
              Everything Australian investors need to know about tax — capital gains, franking credits,
              negative gearing, crypto, super strategies, and year-end tax planning. Independent guides
              with no financial product bias.
            </p>
          </div>
        </div>
      </section>

      {/* Callouts */}
      <section className="py-8 bg-slate-50 border-b border-slate-200">
        <div className="container-custom">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-amber-200 p-5">
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-1">CGT Discount</p>
              <p className="text-xl font-black text-amber-700">50% off</p>
              <p className="text-xs text-slate-600 mt-1">Assets held 12+ months qualify for a 50% CGT discount before tax is calculated.</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Super Tax Rate</p>
              <p className="text-xl font-black text-slate-900">15% (0% in pension)</p>
              <p className="text-xs text-slate-600 mt-1">Super is taxed at 15% in accumulation phase and 0% in pension phase on income and gains.</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Key Date</p>
              <p className="text-xl font-black text-slate-900">30 June</p>
              <p className="text-xs text-slate-600 mt-1">End of the financial year — the deadline for tax-loss harvesting, super contributions, and investment expense deductions.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Tax Topics */}
      <section className="py-10 md:py-14">
        <div className="container-custom">
          <SectionHeading eyebrow="Tax Guides" title="Investor Tax Topics" sub="In-depth guides to every major investment tax area in Australia." />
          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {TAX_TOPICS.map((topic) => (
              <Link
                key={topic.href}
                href={topic.href}
                className="group block bg-white border border-slate-200 rounded-2xl p-6 hover:border-amber-300 hover:shadow-md transition-all"
              >
                <div className="text-3xl mb-3">{topic.icon}</div>
                <h2 className="text-base font-bold text-slate-900 group-hover:text-amber-700 mb-2 transition-colors">
                  {topic.title}
                </h2>
                <p className="text-xs text-slate-600 leading-relaxed mb-3">{topic.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded font-semibold border border-amber-200">
                    {topic.keyFact}
                  </span>
                  <span className="text-xs font-semibold text-amber-600 group-hover:text-amber-700">
                    Read guide →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Tax Rates */}
      <section className="py-10 bg-slate-50">
        <div className="container-custom">
          <SectionHeading eyebrow="FY2025–26" title="Australian Income Tax Rates" sub="Individual resident tax rates including the 2% Medicare Levy." />
          <div className="mt-6 overflow-x-auto max-w-2xl">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="text-left py-3 px-4 text-xs font-bold">Taxable Income</th>
                  <th className="text-center py-3 px-4 text-xs font-bold">Marginal Rate</th>
                  <th className="text-left py-3 px-4 text-xs font-bold">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {TAX_RATES.map((row) => (
                  <tr key={row.bracket} className="bg-white hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 text-xs font-mono font-semibold text-slate-800">{row.bracket}</td>
                    <td className="py-3 px-4 text-center text-sm font-black text-slate-900">{row.rate}</td>
                    <td className="py-3 px-4 text-xs text-slate-500">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-slate-400 mt-2">Tax rates for FY2025–26. Low Income Tax Offset (LITO) and other offsets may reduce effective tax rates. Verify with ato.gov.au.</p>
          </div>
        </div>
      </section>

      {/* Tax Strategies */}
      <section className="py-10 md:py-12">
        <div className="container-custom">
          <SectionHeading eyebrow="Tax Strategies" title="Legal Ways to Reduce Investment Tax" sub="Evidence-based strategies used by Australian investors — not aggressive schemes." />
          <div className="mt-8 grid sm:grid-cols-2 gap-5">
            {KEY_STRATEGIES.map((s) => (
              <div key={s.strategy} className="bg-white border border-slate-200 rounded-2xl p-6">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h3 className="text-sm font-bold text-slate-900">{s.strategy}</h3>
                  <span className={`shrink-0 text-xs px-2 py-0.5 rounded font-semibold ${
                    s.difficulty === "Easy" ? "bg-green-100 text-green-700" :
                    s.difficulty === "Medium" ? "bg-amber-100 text-amber-700" :
                    "bg-red-100 text-red-700"
                  }`}>
                    {s.difficulty}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed mb-3">{s.description}</p>
                <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  <p className="text-xs font-bold text-green-700">Potential saving:</p>
                  <p className="text-xs text-green-800">{s.saving}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Key Dates */}
      <section className="py-10 bg-slate-50">
        <div className="container-custom max-w-2xl">
          <SectionHeading eyebrow="Calendar" title="Key Investment Tax Dates" />
          <div className="mt-6 space-y-3">
            {IMPORTANT_DATES.map((d) => (
              <div key={d.date} className="flex gap-4 bg-white border border-slate-200 rounded-xl p-4">
                <div className="shrink-0 w-28 text-xs font-bold text-amber-700 bg-amber-50 rounded-lg px-2 py-1 flex items-center justify-center text-center border border-amber-200">
                  {d.date}
                </div>
                <p className="text-xs text-slate-700 leading-relaxed self-center">{d.event}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-10 md:py-12">
        <div className="container-custom max-w-2xl">
          <SectionHeading eyebrow="FAQ" title="Investor Tax Questions" />
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
          <h2 className="text-xl font-extrabold mb-3">Get expert investment tax advice</h2>
          <p className="text-sm text-slate-300 mb-6">
            A specialist investment tax agent can identify strategies that pay for themselves many times over.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/advisors/tax-agents" className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm rounded-xl transition-colors">
              Find a Tax Agent →
            </Link>
            <Link href="/advisors/financial-planners" className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-sm rounded-xl transition-colors">
              Find a Financial Planner →
            </Link>
          </div>
        </div>
      </section>

      <section className="py-6 bg-slate-100 border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <p className="text-xs text-slate-500 leading-relaxed">{GENERAL_ADVICE_WARNING} Tax information is general in nature. Tax laws change — verify current rules with the ATO (ato.gov.au) or a registered tax professional.</p>
        </div>
      </section>
    </div>
  );
}
