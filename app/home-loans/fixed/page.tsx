import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Fixed Rate Home Loan Guide Australia (${CURRENT_YEAR}) | invest.com.au`,
  description: `How fixed rate home loans work in Australia — break costs, term options, rate reversion, and when fixing makes sense. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Fixed Rate Home Loan Guide Australia (${CURRENT_YEAR})`,
    description: "Fixed rate home loans explained: 1–5 year terms, break cost calculation, extra repayment limits, and what happens at the end of your fixed period.",
    url: `${SITE_URL}/home-loans/fixed`,
    images: [{ url: `/api/og?title=Fixed+Rate+Home+Loan+Guide`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/home-loans/fixed` },
};

const TERMS = [
  { term: "1 year", use: "Hedge against a single expected rate move; short commitment", risk: "Refix risk in 12 months" },
  { term: "2 years", use: "Most popular — balances certainty vs commitment", risk: "Break costs manageable" },
  { term: "3 years", use: "Medium-term certainty; suits those not planning to sell or refinance", risk: "Higher break cost exposure" },
  { term: "5 years", use: "Long-term lock-in; rare in Australia vs US mortgages", risk: "Large break costs; may miss rate falls" },
];

const FAQS = [
  {
    q: "How are fixed rate home loan break costs calculated?",
    a: "Break costs (economic cost fees) are calculated using the difference between the wholesale interest rate at the time you fixed and the current wholesale rate, multiplied by the remaining loan balance and remaining fixed term. When wholesale rates have fallen since you fixed, break costs can be substantial ($5,000–$30,000+). When wholesale rates have risen, break costs may be nil. The exact formula varies by lender. Always request a break cost estimate in writing before refinancing or selling.",
  },
  {
    q: "What happens when my fixed rate period ends?",
    a: "At the end of the fixed term, your loan automatically rolls onto the lender's standard variable rate (SVR) — which is typically higher than discounted variable rates offered to new customers. Most borrowers should refinance, negotiate a new rate, or refix before the rollover date. Lenders are required to notify you before expiry. Mark your calendar 2–3 months before the revert date.",
  },
  {
    q: "Can I make extra repayments on a fixed rate loan?",
    a: "Most fixed rate loans allow extra repayments but cap them at $10,000–$30,000 per year. Exceeding the cap may trigger a fee. If you plan to make significant extra repayments, a variable loan with redraw is often better. Some split loans allow you to direct extra repayments to the variable portion, which has no limit.",
  },
  {
    q: "Do fixed rate home loans have offset accounts?",
    a: "Most do not — or they offer a partial offset only, which typically adds 0.1–0.3% to the fixed rate. A true 100% offset account is rare on fixed rate products. If offset account access is important to you (e.g. you park your income in offset to reduce daily interest), a variable rate loan or split structure is usually better suited.",
  },
];

export default function FixedRateHomeLoanPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Home Loans", url: `${SITE_URL}/home-loans` },
    { name: "Fixed Rate Home Loans", url: `${SITE_URL}/home-loans/fixed` },
  ]);
  const faqLd = faqJsonLd(FAQS.map((f) => ({ q: f.q, a: f.a })));

  return (
    <div className="bg-white min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      {/* Hero */}
      <div className="bg-gradient-to-br from-amber-900 to-amber-700 text-white py-14">
        <div className="container-custom">
          <nav className="text-sm text-amber-200 mb-4 flex items-center gap-1.5">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <span>/</span>
            <Link href="/home-loans" className="hover:text-white transition-colors">Home Loans</Link>
            <span>/</span>
            <span className="text-white">Fixed Rate</span>
          </nav>
          <div className="inline-block bg-amber-800 text-amber-200 text-xs font-medium px-3 py-1 rounded-full mb-4">
            General information only — not credit assistance
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
            Fixed Rate Home Loan Guide
          </h1>
          <p className="text-lg text-amber-100 max-w-2xl">
            Repayment certainty at a price — fixed rate loans protect you from rate rises but impose break costs if you exit early and usually come without an offset account.
          </p>
        </div>
      </div>

      {/* How It Works */}
      <section className="py-12 bg-white">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">How Fixed Rate Home Loans Work</h2>
          <div className="prose prose-slate max-w-none text-sm text-slate-600 space-y-4">
            <p>
              A fixed rate home loan locks your interest rate for a set period — typically 1, 2, 3, or 5 years. During that term, your repayments are identical regardless of RBA cash rate decisions, meaning your budget is predictable.
            </p>
            <p>
              After the fixed period ends, the loan automatically rolls onto the lender&apos;s standard variable rate (SVR). This &quot;revert rate&quot; is often significantly higher than discounted variable rates. Borrowers should plan to refinance or refix 2–3 months before their fixed term expires.
            </p>
          </div>
        </div>
      </section>

      {/* Term Options */}
      <section className="py-12 bg-slate-50">
        <div className="container-custom">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Fixed Term Options</h2>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="text-left px-5 py-3">Fixed Term</th>
                  <th className="text-left px-5 py-3">Typical Use</th>
                  <th className="text-left px-5 py-3">Key Risk</th>
                </tr>
              </thead>
              <tbody>
                {TERMS.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className="px-5 py-3 font-semibold text-amber-800">{row.term}</td>
                    <td className="px-5 py-3 text-slate-600">{row.use}</td>
                    <td className="px-5 py-3 text-slate-600">{row.risk}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Break Costs Callout */}
      <section className="py-12 bg-white">
        <div className="container-custom">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 max-w-3xl mx-auto">
            <h2 className="text-xl font-bold text-slate-900 mb-3">⚠️ Break Cost Warning</h2>
            <p className="text-slate-600 text-sm mb-4">
              If you exit a fixed rate loan early — by refinancing, selling, or switching to variable — you may owe significant break costs (economic cost fees). In a falling rate environment, break costs can reach $5,000–$30,000 or more. These are not capped and can exceed any refinancing benefit.
            </p>
            <p className="text-slate-600 text-sm">
              Always request a break cost estimate from your current lender <strong>before</strong> signing with a new lender. A licensed mortgage broker can model the true net saving after break costs.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-12 bg-slate-50">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <details key={i} className="group border border-slate-200 rounded-xl overflow-hidden bg-white">
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
      <section className="py-10 bg-white">
        <div className="container-custom">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Explore More Home Loan Guides</h2>
          <div className="flex flex-wrap gap-3">
            {[
              { label: "Variable vs Fixed Rate", href: "/home-loans/variable" },
              { label: "Refinancing Guide", href: "/home-loans/refinancing" },
              { label: "Offset & Redraw", href: "/home-loans/offset-redraw" },
              { label: "Compare Home Loans", href: "/home-loans/compare" },
              { label: "Investment Loans", href: "/home-loans/investment" },
              { label: "Find a Mortgage Broker", href: "/advisors/mortgage-brokers" },
            ].map((l) => (
              <Link key={l.href} href={l.href} className="bg-white border border-slate-200 text-slate-700 text-sm font-medium px-4 py-2 rounded-lg hover:border-amber-300 hover:text-amber-700 transition-colors">
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
          <p>{GENERAL_ADVICE_WARNING}</p>
        </div>
      </footer>
    </div>
  );
}
