import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import SectionHeading from "@/components/SectionHeading";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Capital Gains Tax Australia (${CURRENT_YEAR}) — Investor's Complete CGT Guide`,
  description: `How CGT works in Australia: the 50% discount, cost base, tax-loss harvesting, and CGT on shares, property, and crypto. Complete investor guide. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Capital Gains Tax Australia (${CURRENT_YEAR}) — Investor's CGT Guide`,
    description: "How CGT works for Australian investors. 50% discount, cost base calculation, tax-loss harvesting, and strategies.",
    url: `${SITE_URL}/tax/capital-gains`,
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/tax/capital-gains` },
};

const CGT_RATES = [
  { income: "$0 – $18,200", marginalRate: "0%", cgtLess12m: "0%", cgtMore12m: "0%" },
  { income: "$18,201 – $45,000", marginalRate: "19%", cgtLess12m: "19%", cgtMore12m: "9.5%" },
  { income: "$45,001 – $135,000", marginalRate: "32.5%", cgtLess12m: "32.5%", cgtMore12m: "16.25%" },
  { income: "$135,001 – $190,000", marginalRate: "37%", cgtLess12m: "37%", cgtMore12m: "18.5%" },
  { income: "$190,001+", marginalRate: "45%", cgtLess12m: "45%", cgtMore12m: "22.5%" },
];

const SECTIONS = [
  {
    heading: "How CGT works in Australia",
    body: `Capital Gains Tax (CGT) in Australia is not a separate tax — it's part of your income tax. When you make a capital gain (profit from selling an asset), that gain is added to your assessable income for the year and taxed at your marginal income tax rate.

**The basic formula:**
Capital Gain = Proceeds received − Cost Base

If you held the asset for more than 12 months, apply the 50% CGT discount:
Assessable Gain = Capital Gain × 50%

**Example:**
You buy 100 shares of CBA at $80/share ($8,000 total) and sell 18 months later at $110/share ($11,000 total).
- Capital Gain = $11,000 − $8,000 = $3,000
- 50% CGT discount applies (held 12+ months): $3,000 × 50% = $1,500 assessable gain
- If you're in the 32.5% tax bracket: tax = $1,500 × 32.5% = $487.50

Without the discount (sold before 12 months): tax = $3,000 × 32.5% = $975.`,
  },
  {
    heading: "The 50% CGT discount — timing your disposals",
    body: `The 50% CGT discount is one of the most valuable features of the Australian tax system for investors. If you hold a capital asset (shares, property, ETFs, crypto) for more than 12 months before selling, only 50% of your net capital gain is included in assessable income.

**Who qualifies:** Individual investors and trusts qualify. Companies do not receive the CGT discount.

**The 12-month rule in practice:** The clock starts on the date of acquisition (the settlement date or contract date, depending on the asset). For shares, the acquisition date is the trade date.

**Practical implications:**
- If you're close to the 12-month mark, delaying a sale can halve your tax bill
- For a 45% marginal rate taxpayer with a $100,000 gain: tax before 12 months = $45,000; after 12 months = $22,500
- This is why short-term trading is significantly less tax-efficient than long-term investing for high-income earners

**Interaction with income:**
The assessable portion of your capital gain is added to your other income. If adding the gain pushes you into a higher tax bracket, the top portion may be taxed at a higher rate than your ordinary income.`,
  },
  {
    heading: "CGT cost base — what's included",
    body: `Your cost base determines how much of your sale proceeds represents a gain (or loss). Getting the cost base right reduces your CGT liability — and underclaiming costs means paying more tax than you need to.

**What's included in the cost base:**
1. The purchase price of the asset
2. Incidental costs of acquisition: brokerage, conveyancing fees, legal costs, stamp duty (for property)
3. Costs of owning the asset that you couldn't claim as a tax deduction: non-deductible maintenance for investment property
4. Incidental costs of disposal: brokerage on sale, agent commission, legal costs

**What's NOT included:**
- Costs you've already claimed as a tax deduction (e.g. interest on an investment loan)
- GST you've claimed back as an input tax credit

**Cost base records you must keep:**
- Brokerage statements for every purchase and sale
- Property settlement statements
- Records of any improvements or non-deductible expenses
- For scrip-for-scrip rollovers, original cost base carries forward

**FIFO for identical assets:** If you buy the same share at different prices, the ATO generally applies First In, First Out (FIFO) — the earliest-purchased shares are deemed to be sold first.`,
  },
  {
    heading: "Tax-loss harvesting — offsetting gains before 30 June",
    body: `Tax-loss harvesting is the practice of selling investments at a loss to offset capital gains realised in the same financial year. Done correctly before 30 June each year, it can significantly reduce your CGT bill.

**How it works:**
If you have $30,000 in realised capital gains and $15,000 in unrealised losses (shares that have declined), you can sell those losing shares to realise a capital loss of $15,000. This offsets the gains, reducing your assessable gain to $15,000 (before the CGT discount if applicable).

**Key rules:**
1. Capital losses are first applied to current-year capital gains
2. Excess losses carry forward to future years — they don't expire
3. Carried-forward losses must be applied to gains before the 50% discount is applied
4. You cannot use capital losses to offset ordinary income (salary, dividends) — only capital gains

**The 30-day wash sale consideration:**
The ATO has rules around "wash sales" — selling an asset to crystallise a loss and immediately buying it back. If the ATO determines the transaction was entered into for the dominant purpose of obtaining a tax benefit, it may deny the loss. In practice, most advisors suggest waiting 30+ days before repurchasing the same asset.

**Year-end review:**
Review your capital gains position in May–June each year. Identify unrealised losses in your portfolio that could offset realised gains. Consider whether the long-term position in those assets is worth maintaining — don't harvest losses just for tax if you're giving up good long-term investments.`,
  },
  {
    heading: "CGT on shares, property, ETFs, and crypto",
    body: `CGT applies broadly to most assets. The rules are generally consistent, but each asset class has some nuances:

**Shares and ETFs:**
CGT applies when you sell. The acquisition date is the trade date. Dividends and distributions are separate income events — not CGT. Company dividends don't trigger CGT on the shares you hold.

**Investment property:**
The property's cost base includes the purchase price, stamp duty, conveyancing fees, and non-deductible capital improvements. CGT does NOT apply to your principal place of residence (PPOR) — you live in it, so no CGT on sale. For properties that were partly or temporarily rented, partial CGT exemptions may apply.

**ETF distributions:**
ETF distributions can include capital gains distributions (from the ETF manager selling portfolio assets internally). These are included in your assessable income in the year received, even if you reinvest via DRP. Your ETF manager's annual tax statement will detail this.

**Crypto:**
The ATO treats cryptocurrency as a CGT asset — each disposal (sale, swap, or spending) is a CGT event. See our crypto tax guide for detailed treatment.

**Foreign assets:**
Australian tax residents pay CGT on capital gains from foreign assets (shares, property held overseas). The CGT discount is available for individuals. Foreign tax paid may be claimable as a foreign income tax offset (FITO).`,
  },
];

const FAQS = [
  {
    question: "When do I have to pay CGT in Australia?",
    answer: "CGT is not paid at the time of sale — it's included in your income tax assessment for the financial year you sold the asset. If you sell shares in March 2026, the gain is included in your 2025–26 tax return, due 31 October 2026 (or 28 February 2027 with a tax agent). The ATO does not require instalment payments for CGT unless you've been assessed for PAYG instalments.",
  },
  {
    question: "Do I pay CGT if I make a capital loss?",
    answer: "No. Capital losses are used to offset capital gains, not other income. If your total capital losses exceed your gains in a year, the excess loss is carried forward to future years indefinitely. You cannot use capital losses to reduce your salary, dividend, or rental income.",
  },
  {
    question: "What assets are CGT-free in Australia?",
    answer: "Your principal place of residence (PPOR) is generally CGT-free. Other CGT exemptions include: collectables and personal use assets acquired for under $10,000; compensation received for personal injury; some small business concessions (15-year exemption, retirement exemption); and assets held by qualifying superannuation funds in pension phase.",
  },
  {
    question: "Is there CGT on shares inherited from a deceased estate?",
    answer: "Inherited shares receive a cost base reset — you inherit the cost base of the deceased as at their date of death (or original cost if acquired pre-CGT before September 1985). If you sell inherited shares, CGT applies based on the inherited cost base. If the deceased person held the shares for more than 12 months, you also inherit the 50% discount eligibility.",
  },
  {
    question: "How do I report capital gains on my tax return?",
    answer: "Capital gains are reported in the 'Capital gains' section of your individual tax return. Your broker's annual tax statement provides a summary of disposals and gains. You can pre-fill this via the ATO's myTax from income tax year 2024–25 onwards (available for most brokers connected to ATO data matching). For complex situations — multiple properties, crypto, overseas assets — a specialist tax agent is recommended.",
  },
];

export default function CapitalGainsTaxPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Tax Strategy", url: `${SITE_URL}/tax` },
    { name: "Capital Gains Tax" },
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

      <section className="relative bg-white border-b border-slate-100 overflow-hidden py-8 md:py-12">
        <div className="container-custom">
          <nav className="text-xs text-slate-500 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span>/</span>
            <Link href="/tax" className="hover:text-slate-900">Tax Strategy</Link>
            <span>/</span>
            <span className="text-slate-900 font-medium">Capital Gains Tax</span>
          </nav>
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 border border-slate-200 rounded-full text-xs font-semibold text-slate-600 mb-4">
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
              CGT Guide · {UPDATED_LABEL}
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-3 tracking-tight text-slate-900">
              Capital Gains Tax Australia{" "}
              <span className="text-amber-600">({CURRENT_YEAR})</span>
            </h1>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed">
              How CGT works for Australian investors — the 50% discount, cost base calculation,
              tax-loss harvesting, and CGT treatment of shares, property, ETFs, and crypto.
            </p>
          </div>
        </div>
      </section>

      <section className="py-8 bg-slate-50 border-b border-slate-200">
        <div className="container-custom">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-amber-200 p-5">
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-1">CGT Discount</p>
              <p className="text-xl font-black text-amber-700">50%</p>
              <p className="text-xs text-slate-600 mt-1">Assets held 12+ months qualify for a 50% reduction before tax is applied</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Maximum CGT Rate</p>
              <p className="text-xl font-black text-slate-900">22.5%</p>
              <p className="text-xs text-slate-600 mt-1">Effective rate for assets held 12+ months at the top marginal rate (45% × 50%)</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Losses Carry Forward</p>
              <p className="text-xl font-black text-slate-900">Indefinitely</p>
              <p className="text-xs text-slate-600 mt-1">Unused capital losses carry forward to offset future gains — they never expire</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-8 bg-white">
        <div className="container-custom">
          <SectionHeading eyebrow="CGT Rates" title="Effective CGT Rates by Tax Bracket" sub="How the 50% CGT discount affects your effective capital gains tax rate." />
          <div className="mt-6 overflow-x-auto max-w-3xl">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="text-left py-3 px-4 text-xs font-bold">Taxable Income</th>
                  <th className="text-center py-3 px-4 text-xs font-bold">Marginal Rate</th>
                  <th className="text-center py-3 px-4 text-xs font-bold">CGT Rate (&lt;12 months)</th>
                  <th className="text-center py-3 px-4 text-xs font-bold">CGT Rate (12+ months)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {CGT_RATES.map((row) => (
                  <tr key={row.income} className="bg-white hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 text-xs font-mono text-slate-700">{row.income}</td>
                    <td className="py-3 px-4 text-center text-xs font-bold text-slate-900">{row.marginalRate}</td>
                    <td className="py-3 px-4 text-center text-xs font-semibold text-red-700">{row.cgtLess12m}</td>
                    <td className="py-3 px-4 text-center text-xs font-semibold text-green-700">{row.cgtMore12m}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-slate-400 mt-2">Excludes Medicare Levy (2%). Rates for FY2025–26. Verify at ato.gov.au.</p>
          </div>
        </div>
      </section>

      <section className="py-10 md:py-12 bg-slate-50">
        <div className="container-custom max-w-3xl">
          <SectionHeading eyebrow="Complete Guide" title="Capital Gains Tax Explained" />
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

      <section className="py-10 md:py-12">
        <div className="container-custom max-w-2xl">
          <SectionHeading eyebrow="FAQ" title="CGT Questions Answered" />
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

      <section className="py-12 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="container-custom text-center max-w-xl">
          <h2 className="text-xl font-extrabold mb-3">Get CGT advice from a specialist</h2>
          <p className="text-sm text-slate-300 mb-6">
            An investment tax specialist can identify CGT minimisation strategies specific to your portfolio.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/advisors/tax-agents" className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm rounded-xl transition-colors">
              Find a Tax Agent →
            </Link>
            <Link href="/tax" className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-sm rounded-xl transition-colors">
              Tax Strategy Hub →
            </Link>
          </div>
        </div>
      </section>

      <section className="py-6 bg-slate-100 border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <p className="text-xs text-slate-500 leading-relaxed">{GENERAL_ADVICE_WARNING} Tax information is general in nature. Verify current rates with the ATO (ato.gov.au) or a registered tax agent.</p>
        </div>
      </section>
    </div>
  );
}
