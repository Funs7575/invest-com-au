import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Offset Account vs Redraw Facility (${CURRENT_YEAR}) | invest.com.au`,
  description: `Offset account vs redraw facility — how each works, key differences, tax implications for investors, and which is better for your situation. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Offset Account vs Redraw Facility (${CURRENT_YEAR})`,
    description: "Offset reduces daily interest; redraw lets you access overpayments. Key differences, tax traps for investors, and how much you can save with an offset account.",
    url: `${SITE_URL}/home-loans/offset-redraw`,
    images: [{ url: `/api/og?title=Offset+Account+vs+Redraw+Facility`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/home-loans/offset-redraw` },
};

const COMPARISON = [
  { feature: "How it works", offset: "Linked transaction account; balance offsets loan principal daily", redraw: "Extra repayments stored in loan; access via redraw" },
  { feature: "Interest reduction", offset: "Daily — full $1-for-$1 reduction on principal", redraw: "Same effect on interest, but funds are less accessible" },
  { feature: "Fund accessibility", offset: "Instant — ATM, EFTPOS, bank transfer", redraw: "Usually next business day; some lenders restrict in hardship" },
  { feature: "Tax (investment loans)", offset: "Funds are separate — no contamination of loan deductibility", redraw: "Redrawn personal funds can reduce or eliminate deductibility" },
  { feature: "Account fee", offset: "Some lenders charge $10–$15/month", redraw: "Usually included in loan; no extra fee" },
  { feature: "Available on fixed loans", offset: "Rarely; some at added rate cost", redraw: "Sometimes, but caps apply" },
  { feature: "Available on variable loans", offset: "Yes — most standard variable loans", redraw: "Yes — most standard variable loans" },
];

const FAQS = [
  {
    q: "How much can an offset account save on a $600,000 home loan?",
    a: "Assuming a 6.0% interest rate and $50,000 consistently in offset: annual interest saving ≈ $50,000 × 6.0% = $3,000/year. Over 25 years (with compounding effect on loan term reduction), a consistent $50,000 offset could save $70,000+ in interest and shave 2–4 years off the loan term. The saving grows if you increase the offset balance over time.",
  },
  {
    q: "Why is redraw risky for investment property loans?",
    a: "If you redraw funds from an investment loan for a personal purpose (e.g., holiday, home renovation), the ATO may deem that portion of the loan to be for personal use — making the related interest non-deductible. This 'mixed-purpose loan' problem is a common ATO audit issue. Investors should keep investment loan funds separate from personal funds. An offset account avoids this contamination risk because the savings remain legally separate from the loan.",
  },
  {
    q: "Do all home loans have an offset account?",
    a: "No. Basic (low-rate) variable loans and most fixed-rate loans do not include an offset account. Standard variable loans from major and second-tier lenders typically do. Always check before choosing — the rate difference between a basic loan (no offset) and a standard variable (offset included) may be 0.1–0.3%, which could be worth it depending on how much you keep in offset.",
  },
  {
    q: "Is an offset account the same as a savings account?",
    a: "No — though they function similarly in day-to-day use. An offset account is a transaction account linked to your home loan. Unlike a regular savings account, money in offset doesn't earn interest — instead, it reduces the interest charged on your loan. The effective return equals your mortgage rate (e.g. 6%), which typically exceeds after-tax savings account returns.",
  },
];

export default function OffsetRedrawPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Home Loans", url: `${SITE_URL}/home-loans` },
    { name: "Offset & Redraw", url: `${SITE_URL}/home-loans/offset-redraw` },
  ]);
  const faqLd = faqJsonLd(FAQS.map((f) => ({ q: f.q, a: f.a })));

  return (
    <div className="bg-white min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      {/* Hero */}
      <div className="bg-gradient-to-br from-teal-900 to-teal-700 text-white py-14">
        <div className="container-custom">
          <nav className="text-sm text-teal-200 mb-4 flex items-center gap-1.5">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <span>/</span>
            <Link href="/home-loans" className="hover:text-white transition-colors">Home Loans</Link>
            <span>/</span>
            <span className="text-white">Offset & Redraw</span>
          </nav>
          <div className="inline-block bg-teal-800 text-teal-200 text-xs font-medium px-3 py-1 rounded-full mb-4">
            General information only — not credit assistance
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
            Offset Account vs Redraw Facility
          </h1>
          <p className="text-lg text-teal-100 max-w-2xl">
            Both reduce the interest you pay — but they work differently and have very different tax implications for investment property borrowers. Here&apos;s what you need to know.
          </p>
        </div>
      </div>

      {/* Interest Saving Callout */}
      <section className="py-10 bg-teal-50">
        <div className="container-custom">
          <div className="bg-white border border-teal-200 rounded-2xl p-6 max-w-3xl mx-auto">
            <h2 className="text-lg font-bold text-slate-900 mb-2">How an Offset Account Reduces Interest</h2>
            <p className="text-slate-600 text-sm">
              If your loan balance is <strong>$500,000</strong> and you have <strong>$40,000</strong> in your offset account, interest is charged daily on only <strong>$460,000</strong>. At 6.0% p.a., that&apos;s a saving of <strong>$2,400/year</strong> compared to having the cash in a separate account. The effective return on offset funds equals your mortgage rate — typically better than after-tax savings account rates.
            </p>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-12 bg-white">
        <div className="container-custom">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Offset vs Redraw: Key Differences</h2>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-5 py-3 font-semibold text-slate-700">Feature</th>
                  <th className="text-left px-5 py-3 font-semibold text-teal-700">Offset Account</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-700">Redraw Facility</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className="px-5 py-3 font-medium text-slate-800">{row.feature}</td>
                    <td className="px-5 py-3 text-slate-600">{row.offset}</td>
                    <td className="px-5 py-3 text-slate-600">{row.redraw}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Investment Warning */}
      <section className="py-12 bg-amber-50">
        <div className="container-custom">
          <div className="bg-white border border-amber-200 rounded-2xl p-8 max-w-3xl mx-auto">
            <h2 className="text-xl font-bold text-slate-900 mb-3">⚠️ Investment Loan Tax Warning</h2>
            <p className="text-slate-600 text-sm mb-3">
              For investment property loans, offset accounts are strongly preferred over redraw. Redrawing funds for personal use from an investment loan can contaminate the loan purpose, potentially making a portion of the interest non-deductible. This is a known ATO audit trigger.
            </p>
            <p className="text-slate-600 text-sm">
              An offset account keeps your savings legally separate — there is no mixing of personal funds with the loan account itself, preserving full deductibility of investment interest.
            </p>
            <Link href="/advisors/tax-agents" className="mt-4 inline-block text-amber-700 text-sm font-medium hover:underline">
              Find a Registered Tax Agent →
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
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Related Guides</h2>
          <div className="flex flex-wrap gap-3">
            {[
              { label: "Variable vs Fixed Rate", href: "/home-loans/variable" },
              { label: "Investment Loans", href: "/home-loans/investment" },
              { label: "Compare Home Loans", href: "/home-loans/compare" },
              { label: "Negative Gearing Guide", href: "/negative-gearing" },
              { label: "Find a Mortgage Broker", href: "/advisors/mortgage-brokers" },
            ].map((l) => (
              <Link key={l.href} href={l.href} className="bg-white border border-slate-200 text-slate-700 text-sm font-medium px-4 py-2 rounded-lg hover:border-teal-300 hover:text-teal-700 transition-colors">
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
          <p><strong>Tax disclaimer:</strong> Tax information is general in nature. Consult a registered tax agent (Tax Practitioners Board) for advice specific to your situation.</p>
          <p>{GENERAL_ADVICE_WARNING}</p>
        </div>
      </footer>
    </div>
  );
}
