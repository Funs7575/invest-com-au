import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Variable vs Fixed Rate Home Loan (${CURRENT_YEAR}) | invest.com.au`,
  description: `Variable or fixed? Compare repayment certainty vs flexibility, RBA rate cycle history, break fee risk, and split loan strategy. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Variable vs Fixed Rate Home Loan (${CURRENT_YEAR})`,
    description: "Variable gives flexibility and offset access; fixed gives repayment certainty. RBA cycle data, break fee traps, and split loan strategy explained.",
    url: `${SITE_URL}/home-loans/variable`,
    images: [{ url: `/api/og?title=Variable+vs+Fixed+Rate+Home+Loan`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/home-loans/variable` },
};

const COMPARISON = [
  { feature: "Repayment certainty", variable: "No — moves with RBA cash rate", fixed: "Yes — locked for term" },
  { feature: "Offset account", variable: "Yes — most variable loans", fixed: "Rarely — adds to rate" },
  { feature: "Redraw facility", variable: "Yes — most variable loans", fixed: "Limited or unavailable" },
  { feature: "Extra repayments", variable: "Unlimited, no penalty", fixed: "Capped at $10–30k/yr typically" },
  { feature: "Break cost (exit early)", variable: "Nil or nominal discharge fee", fixed: "Can be $5,000–$30,000+" },
  { feature: "Rate movement risk", variable: "Rises and falls with RBA", fixed: "None during fixed term" },
  { feature: "Current rate premium", variable: "Generally lower than fixed", fixed: "Priced in expected rate moves" },
];

const FAQS = [
  {
    q: "Should I fix my home loan rate now?",
    a: "Whether to fix depends on your view of the RBA cash rate cycle and your personal risk tolerance — not a decision we can make for you. Historically, borrowers who fix have sometimes paid more than those on variable (lenders price in expected moves). A mortgage broker can model both scenarios against your situation. This is general information only — not credit advice.",
  },
  {
    q: "What is a split home loan?",
    a: "A split loan divides your mortgage between a fixed-rate portion and a variable-rate portion. For example, 60% fixed and 40% variable. The variable portion keeps your offset account and extra-repayment flexibility; the fixed portion gives you rate certainty on the bulk of the debt. Most major lenders offer split facilities.",
  },
  {
    q: "What are break costs and how are they calculated?",
    a: "Break costs (also called economic cost fees) apply when you exit a fixed-rate loan before the term ends — by refinancing, selling, or switching to variable. They compensate the lender for the cost of unwinding their wholesale funding. The formula is roughly: (Wholesale rate at fixing − Current wholesale rate) × Remaining loan balance × Remaining term. In a rising rate environment, break costs can be $0; in a falling rate environment they can be $5,000–$30,000+.",
  },
  {
    q: "Does a variable rate loan always have an offset account?",
    a: "Most standard variable rate loans from Australian lenders include a 100% offset account, but some basic (no-frills) variable loans don't. Always confirm before applying. A 100% offset account means every dollar sitting in the linked account reduces the daily interest charged — a $30,000 offset on a $500,000 loan means interest is charged only on $470,000.",
  },
];

export default function VariableVsFixedPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Home Loans", url: `${SITE_URL}/home-loans` },
    { name: "Variable vs Fixed Rate", url: `${SITE_URL}/home-loans/variable` },
  ]);
  const faqLd = faqJsonLd(FAQS.map((f) => ({ q: f.q, a: f.a })));

  return (
    <div className="bg-white min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      {/* Hero */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-700 text-white py-14">
        <div className="container-custom">
          <nav className="text-sm text-slate-400 mb-4 flex items-center gap-1.5">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <span>/</span>
            <Link href="/home-loans" className="hover:text-white transition-colors">Home Loans</Link>
            <span>/</span>
            <span className="text-white">Variable vs Fixed Rate</span>
          </nav>
          <div className="inline-block bg-slate-700 text-slate-300 text-xs font-medium px-3 py-1 rounded-full mb-4">
            General information only — not credit assistance
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
            Variable vs Fixed Rate Home Loan
          </h1>
          <p className="text-lg text-slate-300 max-w-2xl">
            Variable gives you flexibility and offset account access. Fixed gives repayment certainty but comes with break fee risk and usually no offset. Here&apos;s how to think through the decision.
          </p>
        </div>
      </div>

      {/* Comparison Table */}
      <section className="py-12 bg-white">
        <div className="container-custom">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Variable vs Fixed: Key Differences</h2>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-5 py-3 font-semibold text-slate-700">Feature</th>
                  <th className="text-left px-5 py-3 font-semibold text-violet-700">Variable Rate</th>
                  <th className="text-left px-5 py-3 font-semibold text-amber-700">Fixed Rate</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className="px-5 py-3 font-medium text-slate-800">{row.feature}</td>
                    <td className="px-5 py-3 text-slate-600">{row.variable}</td>
                    <td className="px-5 py-3 text-slate-600">{row.fixed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Variable Rate Detail */}
      <section className="py-12 bg-slate-50">
        <div className="container-custom">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Variable Rate Home Loans</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-3 text-green-700">Advantages</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span>100% offset account reduces interest daily</li>
                <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span>Unlimited extra repayments without penalty</li>
                <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span>Redraw access to extra repayments</li>
                <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span>No break fees — switch or sell freely</li>
                <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span>Rate falls when RBA cuts the cash rate</li>
              </ul>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-semibold text-red-700 mb-3">Disadvantages</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-start gap-2"><span className="text-red-400 mt-0.5">✗</span>Rate rises when RBA lifts the cash rate</li>
                <li className="flex items-start gap-2"><span className="text-red-400 mt-0.5">✗</span>Budget unpredictability — repayments change</li>
                <li className="flex items-start gap-2"><span className="text-red-400 mt-0.5">✗</span>Requires discipline to use offset effectively</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Fixed Rate Detail */}
      <section className="py-12 bg-white">
        <div className="container-custom">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Fixed Rate Home Loans</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-semibold text-green-700 mb-3">Advantages</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span>Exact same repayment for the fixed term</li>
                <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span>Protected if RBA raises rates during term</li>
                <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span>Predictable budgeting — suits first-time buyers</li>
              </ul>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-semibold text-red-700 mb-3">Disadvantages</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-start gap-2"><span className="text-red-400 mt-0.5">✗</span>Break fees can be very high if you exit early</li>
                <li className="flex items-start gap-2"><span className="text-red-400 mt-0.5">✗</span>Usually no 100% offset account</li>
                <li className="flex items-start gap-2"><span className="text-red-400 mt-0.5">✗</span>Extra repayments typically capped ($10–30k/yr)</li>
                <li className="flex items-start gap-2"><span className="text-red-400 mt-0.5">✗</span>Miss out if RBA cuts rates during term</li>
                <li className="flex items-start gap-2"><span className="text-red-400 mt-0.5">✗</span>Rate reverts to (often higher) variable when term ends</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Split Loan Callout */}
      <section className="py-12 bg-violet-50">
        <div className="container-custom">
          <div className="bg-white rounded-2xl border border-violet-200 p-8 max-w-3xl mx-auto text-center">
            <div className="text-3xl mb-3">⚖️</div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">The Split Loan Strategy</h2>
            <p className="text-slate-600 mb-4">
              Many borrowers split their loan — fixing a portion (e.g. 60%) for repayment certainty while keeping the remainder variable for offset and extra-repayment flexibility. Most major lenders offer split facilities at no extra cost.
            </p>
            <Link href="/advisors/mortgage-brokers" className="inline-block bg-violet-600 text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-violet-700 transition-colors text-sm">
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
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Explore More Home Loan Guides</h2>
          <div className="flex flex-wrap gap-3">
            {[
              { label: "Fixed Rate Guide", href: "/home-loans/fixed" },
              { label: "Refinancing Guide", href: "/home-loans/refinancing" },
              { label: "Offset & Redraw", href: "/home-loans/offset-redraw" },
              { label: "Compare Home Loans", href: "/home-loans/compare" },
              { label: "Investment Loans", href: "/home-loans/investment" },
              { label: "Find a Mortgage Broker", href: "/advisors/mortgage-brokers" },
            ].map((l) => (
              <Link key={l.href} href={l.href} className="bg-white border border-slate-200 text-slate-700 text-sm font-medium px-4 py-2 rounded-lg hover:border-violet-300 hover:text-violet-700 transition-colors">
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Compliance Footer */}
      <footer className="py-8 bg-white border-t border-slate-100">
        <div className="container-custom max-w-3xl text-xs text-slate-500 space-y-2">
          <p><strong>Credit disclaimer:</strong> invest.com.au is not licensed to provide credit assistance under the National Consumer Credit Protection Act 2009 (Cth). The information on this page is general in nature and does not constitute a credit recommendation. Please consult a licensed mortgage broker or credit licensee for advice specific to your circumstances.</p>
          <p>{GENERAL_ADVICE_WARNING}</p>
        </div>
      </footer>
    </div>
  );
}
