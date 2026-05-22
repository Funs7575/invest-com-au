import Link from "next/link";
import { breadcrumbJsonLd, SITE_URL } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { LOAN_COMPARISON_DISCLAIMER, NCCP_CREDIT_NOTE } from "@/lib/compliance";
import Icon from "@/components/Icon";
import ScrollFadeIn from "@/components/ScrollFadeIn";
import PropertyDisclaimer from "@/components/PropertyDisclaimer";
import ComplianceFooter from "@/components/ComplianceFooter";

export const revalidate = 3600;

export const metadata = {
  title: "Investment Loan Comparison — Compare Rates from Major Lenders",
  description:
    "Compare investment loan rates from CBA, Westpac, ANZ, NAB, Macquarie, and more. Find the best rate, LVR, and features for your investment property.",
  alternates: { canonical: "/property/finance" },
};

const LENDERS = [
  { name: "Commonwealth Bank", rate: "6.49%", comparison: "6.55%", maxLvr: "80%", offset: true, interestOnly: true, minLoan: "$100,000" },
  { name: "Westpac", rate: "6.39%", comparison: "6.48%", maxLvr: "80%", offset: true, interestOnly: true, minLoan: "$150,000" },
  { name: "ANZ", rate: "6.44%", comparison: "6.50%", maxLvr: "80%", offset: true, interestOnly: true, minLoan: "$50,000" },
  { name: "NAB", rate: "6.54%", comparison: "6.59%", maxLvr: "80%", offset: true, interestOnly: true, minLoan: "$100,000" },
  { name: "Macquarie Bank", rate: "6.19%", comparison: "6.22%", maxLvr: "70%", offset: true, interestOnly: false, minLoan: "$200,000" },
  { name: "Pepper Money", rate: "6.79%", comparison: "6.99%", maxLvr: "90%", offset: false, interestOnly: true, minLoan: "$50,000" },
  { name: "Liberty Financial", rate: "6.69%", comparison: "6.85%", maxLvr: "85%", offset: false, interestOnly: true, minLoan: "$50,000" },
  { name: "ING", rate: "6.29%", comparison: "6.35%", maxLvr: "80%", offset: true, interestOnly: false, minLoan: "$150,000" },
];

const PROPERTY_FINANCE_FAQS = faqJsonLd([
  {
    q: "What is the typical interest rate for an investment loan in Australia?",
    a: "As of 2026, investment property loan rates from major Australian lenders (CBA, Westpac, ANZ, NAB) typically range from around 6.20% to 6.60% p.a. for variable rates. Fixed rates and rates from smaller lenders and non-banks can vary significantly. The comparison rate — which includes most fees — is a better basis for comparison than the advertised rate alone.",
  },
  {
    q: "What is the maximum LVR for an investment property loan?",
    a: "Most major Australian lenders cap investment property loans at 80% LVR (loan-to-value ratio) without lenders mortgage insurance (LMI). Some non-bank lenders will lend up to 85%–90% LVR, but LMI will apply and the rate is typically higher. APRA guidelines and individual lender credit policies ultimately determine the maximum LVR available.",
  },
  {
    q: "Can I claim interest on an investment loan as a tax deduction?",
    a: "Yes. Interest charged on a loan used to purchase an income-producing investment property is generally tax-deductible in Australia under Section 8-1 of the ITAA 1997. If the property is negatively geared (interest costs exceed rental income), the net loss can be offset against other income, reducing your taxable income. You should consult a registered tax agent for advice specific to your situation.",
  },
  {
    q: "What is the difference between interest-only and principal and interest for investment loans?",
    a: "With an interest-only (IO) investment loan, you only pay the interest component each month — the loan balance does not reduce. Monthly repayments are lower, which can improve cash flow. With a principal and interest (P&I) loan, each repayment reduces the outstanding balance. IO periods are typically limited to 1–5 years by lenders, after which the loan reverts to P&I. IO loans often have a slightly higher interest rate than equivalent P&I loans.",
  },
  {
    q: "How do lenders assess investment loan applications?",
    a: "Australian lenders assess investment loan applications using serviceability calculations that factor in your income, existing debts, living expenses, and the proposed loan repayments at a stress-tested rate (typically 3% above the actual rate). Rental income is usually credited at 70%–80% of the gross rent to account for vacancy and costs. A lower debt-to-income ratio, stable employment history, and good credit score all improve your chances of approval.",
  },
]);

export default function PropertyFinancePage() {
  return (
    <div className="bg-white min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd([
            { name: "Home", url: SITE_URL },
            { name: "Property", url: `${SITE_URL}/property` },
            { name: "Investment Loans" },
          ])),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(PROPERTY_FINANCE_FAQS) }}
      />

      <section className="bg-white border-b border-slate-100">
        <div className="container-custom py-6 md:py-8">
          <nav className="text-xs text-slate-400 mb-3 flex items-center gap-1.5">
            <Link href="/" className="hover:text-slate-600">Home</Link>
            <span>/</span>
            <Link href="/property" className="hover:text-slate-600">Property</Link>
            <span>/</span>
            <span className="text-slate-600">Investment Loans</span>
          </nav>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">Investment Loan Comparison</h1>
          <p className="text-sm text-slate-500">Compare investment property loan rates from Australia&apos;s major lenders. Rates as of March 2026.</p>
        </div>
      </section>

      <ScrollFadeIn>
        <section className="py-6 md:py-8">
          <div className="container-custom">
            <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs">Lender</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600 text-xs">Rate</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600 text-xs hidden sm:table-cell">Comparison</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600 text-xs hidden md:table-cell">Max LVR</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600 text-xs hidden md:table-cell">Offset</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600 text-xs hidden lg:table-cell">Interest Only</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600 text-xs hidden lg:table-cell">Min Loan</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {LENDERS.map((lender, i) => (
                    <tr key={i} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-4">
                        <span className="font-bold text-slate-900">{lender.name}</span>
                      </td>
                      <td className="text-right px-4 py-4 font-bold text-slate-900">{lender.rate}</td>
                      <td className="text-right px-4 py-4 text-slate-500 hidden sm:table-cell">{lender.comparison}</td>
                      <td className="text-right px-4 py-4 text-slate-700 hidden md:table-cell">{lender.maxLvr}</td>
                      <td className="text-center px-4 py-4 hidden md:table-cell">
                        {lender.offset ? (
                          <Icon name="check-circle" size={16} className="text-emerald-500 inline" />
                        ) : (
                          <Icon name="x-circle" size={16} className="text-slate-300 inline" />
                        )}
                      </td>
                      <td className="text-center px-4 py-4 hidden lg:table-cell">
                        {lender.interestOnly ? (
                          <Icon name="check-circle" size={16} className="text-emerald-500 inline" />
                        ) : (
                          <Icon name="x-circle" size={16} className="text-slate-300 inline" />
                        )}
                      </td>
                      <td className="text-right px-4 py-4 text-slate-500 hidden lg:table-cell">{lender.minLoan}</td>
                      <td className="px-4 py-4">
                        <Link
                          href="/find-advisor?type=mortgage-brokers"
                          className="inline-block px-3 py-1.5 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-600 transition-all whitespace-nowrap"
                        >
                          Get a Quote
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-4">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-xs font-bold text-amber-800 mb-1">Loan Comparison Disclaimer</p>
                  <p className="text-[0.65rem] md:text-xs text-amber-700 leading-relaxed">{LOAN_COMPARISON_DISCLAIMER}</p>
                  <p className="text-[0.6rem] text-amber-600 leading-relaxed mt-1">{NCCP_CREDIT_NOTE}</p>
                  <PropertyDisclaimer />
                </div>
              </div>
            </div>
          </div>
        </section>
      </ScrollFadeIn>

      {/* Mortgage Broker Referral */}
      <ScrollFadeIn>
        <section className="py-8 md:py-12 bg-slate-50 border-t border-slate-100">
          <div className="container-custom">
            <div className="max-w-2xl mx-auto text-center">
              <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Icon name="users" size={22} className="text-white" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-2">Need Help Choosing?</h2>
              <p className="text-sm text-slate-500 mb-5">
                A mortgage broker can compare 30+ lenders for you, negotiate better rates, and manage the application process — at no cost to you. The lender pays their fee.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/find-advisor?type=mortgage-brokers"
                  className="w-full sm:w-auto px-7 py-3.5 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 shadow-md hover:shadow-lg transition-all text-sm"
                >
                  Find a Mortgage Broker — Free &rarr;
                </Link>
                <Link
                  href="/advisors/mortgage-brokers"
                  className="w-full sm:w-auto px-7 py-3.5 border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-white hover:border-slate-300 transition-all text-sm"
                >
                  Browse All Brokers
                </Link>
              </div>
              <p className="text-xs text-slate-400 mt-4">
                Invest.com.au is not a lender or mortgage broker. We connect you with verified mortgage brokers who have access to 30+ lenders. We may receive a referral fee.
              </p>
            </div>
          </div>
        </section>
      </ScrollFadeIn>
      <div className="container-custom pb-8"><ComplianceFooter variant="property" /></div>

    </div>
  );
}
