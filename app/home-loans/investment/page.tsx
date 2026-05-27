import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Investment Property Loans Australia (${CURRENT_YEAR}) Guide | invest.com.au`,
  description: `Investment home loans explained — interest-only vs P&I, rate premiums, negative gearing tax deductions, APRA restrictions, and loan structuring. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Investment Property Loans Australia (${CURRENT_YEAR}) Guide`,
    description: "IO vs P&I investment loans, lender rate premiums, APRA restrictions, tax deductibility of interest, and why loan structure matters for investors.",
    url: `${SITE_URL}/home-loans/investment`,
    images: [{ url: `/api/og?title=Investment+Property+Loans+Guide`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/home-loans/investment` },
};

const COMPARISON = [
  { feature: "Repayments", io: "Interest only — no principal reduction", pi: "Principal + interest — builds equity" },
  { feature: "Monthly repayment (lower)", io: "Yes — lower cashflow impact", pi: "Higher repayments" },
  { feature: "Loan balance", io: "Does not reduce during IO period", pi: "Reduces from day one" },
  { feature: "Tax deductible interest", io: "Full interest deductible (investment use)", pi: "Full interest deductible (investment use)" },
  { feature: "Interest rate", io: "Typically 0.1–0.3% higher than P&I", pi: "Lower than IO" },
  { feature: "APRA restrictions", io: "Lenders manage IO to ≤30% of new lending", pi: "No special APRA limit" },
  { feature: "After IO period ends", io: "Reverts to P&I — repayments increase sharply", pi: "Consistent throughout loan term" },
  { feature: "Best for", io: "Negative-gearing strategy; cashflow priority", pi: "Equity building; longer-term hold" },
];

const FAQS = [
  {
    q: "Is interest on an investment loan tax deductible?",
    a: "Interest on a loan used to purchase an income-producing investment property is generally tax deductible against your rental income and other income in Australia. This includes interest on the principal, but also on a line of credit or redraw used to fund investment-related expenses. The loan must be used for investment purposes — if funds are mixed with personal use, only the investment-use portion is deductible. Always confirm deductibility with a registered tax agent, as individual circumstances vary.",
  },
  {
    q: "What is an interest-only (IO) home loan?",
    a: "An interest-only loan requires you to pay only the interest component during the IO period (typically 1–5 years). You pay no principal, so the loan balance stays the same. After the IO period, the loan reverts to principal and interest — your repayments increase significantly because you're now repaying the full principal over a shorter remaining term. IO loans are popular with investors for cashflow management and negative gearing strategies.",
  },
  {
    q: "Why do investment loans have higher interest rates?",
    a: "Lenders price investment loans higher (typically 0.2–0.5% above owner-occupier rates) due to APRA's macroprudential framework and the perceived higher default risk on investment properties. APRA requires lenders to hold more capital against investment lending, increasing their funding cost. Rates for IO investment loans are typically the highest tier.",
  },
  {
    q: "Can I use an offset account on an investment loan?",
    a: "Yes — most variable investment loans include an offset account. However, if you're negatively gearing, having a large offset balance reduces your taxable interest deduction (because the interest charged is lower). Some investors prefer to keep cash in a separate account and let the investment loan run at full balance to maximise deductible interest. A tax accountant can advise on the optimal strategy for your situation.",
  },
];

export default function InvestmentLoanPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Home Loans", url: `${SITE_URL}/home-loans` },
    { name: "Investment Loans", url: `${SITE_URL}/home-loans/investment` },
  ]);
  const faqLd = faqJsonLd(FAQS.map((f) => ({ q: f.q, a: f.a })));

  return (
    <div className="bg-white min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-900 to-blue-700 text-white py-14">
        <div className="container-custom">
          <nav className="text-sm text-blue-200 mb-4 flex items-center gap-1.5">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <span>/</span>
            <Link href="/home-loans" className="hover:text-white transition-colors">Home Loans</Link>
            <span>/</span>
            <span className="text-white">Investment Loans</span>
          </nav>
          <div className="inline-block bg-blue-800 text-blue-200 text-xs font-medium px-3 py-1 rounded-full mb-4">
            General information only — not credit assistance
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
            Investment Property Loans Guide
          </h1>
          <p className="text-lg text-blue-100 max-w-2xl">
            Interest-only or principal-and-interest? How APRA restrictions work, why investment rates are higher, and the tax deductibility rules every property investor should understand.
          </p>
        </div>
      </div>

      {/* IO vs P&I Table */}
      <section className="py-12 bg-white">
        <div className="container-custom">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Interest-Only vs Principal & Interest</h2>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-5 py-3 font-semibold text-slate-700">Feature</th>
                  <th className="text-left px-5 py-3 font-semibold text-blue-700">Interest Only (IO)</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-700">Principal & Interest (P&I)</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className="px-5 py-3 font-medium text-slate-800">{row.feature}</td>
                    <td className="px-5 py-3 text-slate-600">{row.io}</td>
                    <td className="px-5 py-3 text-slate-600">{row.pi}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Key stats */}
      <section className="py-12 bg-slate-50">
        <div className="container-custom">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Key Numbers for Investment Borrowers</h2>
          <div className="grid md:grid-cols-4 gap-4">
            {[
              { stat: "0.2–0.5%", label: "Rate premium over owner-occupier" },
              { stat: "≤30%", label: "APRA guidance on IO lending share" },
              { stat: "1–5 yrs", label: "Typical IO period length" },
              { stat: "100%", label: "Interest deductible if investment use" },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 text-center">
                <p className="text-2xl font-extrabold text-blue-700 mb-1">{item.stat}</p>
                <p className="text-xs text-slate-500">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Negative gearing callout */}
      <section className="py-12 bg-blue-50">
        <div className="container-custom">
          <div className="bg-white border border-blue-200 rounded-2xl p-8 max-w-3xl mx-auto">
            <h2 className="text-xl font-bold text-slate-900 mb-3">Investment Loans & Negative Gearing</h2>
            <p className="text-slate-600 text-sm mb-3">
              If your rental income is less than your loan interest + property expenses, you have a negatively geared property. The shortfall is deductible against your other income (e.g. salary), reducing your overall tax. IO loans maximise deductible interest — which is why they&apos;re common among investors using a negative-gearing strategy.
            </p>
            <p className="text-slate-600 text-sm">
              Tax rules around negative gearing are set by the ATO and may change. Always seek advice from a registered tax agent before making investment decisions.
            </p>
            <div className="mt-4 flex gap-3">
              <Link href="/negative-gearing" className="text-blue-600 text-sm font-medium hover:underline">Negative Gearing Guide →</Link>
              <Link href="/advisors/tax-agents" className="text-blue-600 text-sm font-medium hover:underline">Find a Tax Agent →</Link>
            </div>
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
                <summary className="flex items-center justify-between px-5 py-4 cursor-pointer font-medium text-slate-800 hover:bg-slate-50">
                  {faq.q}
                  <span className="ml-3 text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="px-5 pb-4 text-sm text-slate-600 leading-relaxed">{faq.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Related Links */}
      <section className="py-10 bg-slate-50">
        <div className="container-custom">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Related Guides</h2>
          <div className="flex flex-wrap gap-3">
            {[
              { label: "Negative Gearing Guide", href: "/negative-gearing" },
              { label: "Variable vs Fixed Rate", href: "/home-loans/variable" },
              { label: "Refinancing Guide", href: "/home-loans/refinancing" },
              { label: "Compare Home Loans", href: "/home-loans/compare" },
              { label: "Find a Mortgage Broker", href: "/advisors/mortgage-brokers" },
              { label: "Find a Tax Agent", href: "/advisors/tax-agents" },
            ].map((l) => (
              <Link key={l.href} href={l.href} className="bg-white border border-slate-200 text-slate-700 text-sm font-medium px-4 py-2 rounded-lg hover:border-blue-300 hover:text-blue-700 transition-colors">
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Compliance Footer */}
      <footer className="py-8 bg-white border-t border-slate-100">
        <div className="container-custom max-w-3xl text-xs text-slate-500 space-y-2">
          <p><strong>Credit disclaimer:</strong> invest.com.au is not licensed to provide credit assistance under the National Consumer Credit Protection Act 2009 (Cth). This page contains general information only and does not constitute a credit recommendation. Please consult a licensed mortgage broker or Australian Credit Licensee for advice specific to your circumstances.</p>
          <p><strong>Tax disclaimer:</strong> Tax information on this page is general in nature. Please consult a registered tax agent (Tax Practitioners Board) for tax advice specific to your situation.</p>
          <p>{GENERAL_ADVICE_WARNING}</p>
        </div>
      </footer>
    </div>
  );
}
