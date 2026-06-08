import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `How to Compare Home Loans in Australia (${CURRENT_YEAR}) | invest.com.au`,
  description: `Beyond the headline rate — comparison rates, ongoing fees, offset quality, LMI, LVR tiers, and the 10-point checklist for choosing the right home loan. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `How to Compare Home Loans in Australia (${CURRENT_YEAR})`,
    description: "The comparison rate, offset account quality, ongoing fees, LMI thresholds, and LVR rate tiers — the full checklist for comparing Australian home loans.",
    url: `${SITE_URL}/home-loans/compare`,
    images: [{ url: `/api/og?title=How+to+Compare+Home+Loans`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/home-loans/compare` },
};

const CHECKLIST = [
  { item: "Comparison rate", why: "Includes most fees in one rate figure — always higher than headline rate", look: "Compare on a $150k/25yr basis; higher comparison rates = hidden fees" },
  { item: "Offset account quality", why: "100% offset reduces daily interest; partial offset is less effective", look: "Confirm it's 100% offset, not a sub-account with restrictions" },
  { item: "Annual & monthly fees", why: "A $400/yr fee equals ~0.08% extra on a $500k loan", look: "Add to effective rate for apples-to-apples comparison" },
  { item: "Extra repayment terms", why: "Caps on extra repayments limit your ability to pay down faster", look: "Unlimited on variable; capped (often $10–30k/yr) on fixed" },
  { item: "Redraw facility", why: "Access to extra repayments — important as an emergency buffer", look: "Instant or next-day? Minimum redraw amount? Any fees?" },
  { item: "LVR rate tiers", why: "Lower LVR = better rate (lenders reward lower-risk borrowers)", look: "Check rates at 60%, 70%, 80%, 90% LVR — drop can be 0.3%+" },
  { item: "Break fees (fixed)", why: "Can be thousands of dollars if you refinance or sell early", look: "Ask for a break cost estimate before committing to fixed" },
  { item: "Portability", why: "Can you take the loan to a new property without refinancing?", look: "Important if you may move within the loan term" },
  { item: "Split loan option", why: "Fix some, keep some variable — hedges rate risk", look: "Most majors offer this; confirm no extra fee" },
  { item: "Revert rate (fixed expiry)", why: "The rate your loan rolls to after fixed period — often much higher", look: "Check SVR vs discounted variable; plan to refix/refinance ahead" },
];

const LVR_TIERS = [
  { lvr: "≤60%", risk: "Very low", typical: "Lowest available rate — best pricing", lmi: "No" },
  { lvr: "60–70%", risk: "Low", typical: "Near-best rates; most competitive products available", lmi: "No" },
  { lvr: "70–80%", risk: "Moderate", typical: "Standard market rates", lmi: "No" },
  { lvr: "80–90%", risk: "Elevated", typical: "Rate premium of 0.2–0.5%; LMI required", lmi: "Yes" },
  { lvr: "90–95%", risk: "High", typical: "Fewer lender options; higher rate and LMI cost", lmi: "Yes — significant" },
];

const FAQS = [
  {
    q: "What is a comparison rate and why does it matter?",
    a: "A comparison rate combines the interest rate and most fees into a single annual percentage figure, standardised on a $150,000 loan over 25 years. It lets you compare the true cost across products. A loan with a low headline rate but high fees may have a higher comparison rate than a slightly higher-rate loan with no fees. Always compare on the comparison rate — not just the advertised rate. Note: comparison rates exclude government charges, LMI, and offset account savings.",
  },
  {
    q: "What is LMI and when does it apply?",
    a: "Lender's Mortgage Insurance (LMI) is an insurance premium charged when your deposit is less than 20% of the purchase price (LVR above 80%). It protects the lender — not you — against default. LMI is typically $5,000–$30,000+ depending on loan size and LVR. It can be paid upfront or capitalised into the loan. Strategies to avoid LMI: 20%+ deposit, the First Home Guarantee (government-backed 5% deposit with no LMI), or a guarantor.",
  },
  {
    q: "Should I use a mortgage broker or go directly to a bank?",
    a: "A mortgage broker accesses 30+ lenders and is paid by the lender — free to you. They can compare rates, product features, and credit policies across the market and match your profile to lenders most likely to approve your application. ASIC data shows brokers generate lower average rates than direct borrowers. For complex situations (self-employed, investment loans, non-residents), a specialist broker is strongly recommended. invest.com.au cannot provide credit assistance — we refer you to licensed mortgage brokers.",
  },
  {
    q: "How often should I compare my home loan?",
    a: "Most financial educators recommend reviewing your home loan rate every 2–3 years. Lenders often offer better rates to new customers than existing ones — the 'loyalty tax'. The 2024 RBA research paper 'The Benefits of Mortgage Rate Competition' found existing borrowers pay 0.3–0.5% more than new borrowers with the same risk profile. If your rate is significantly above current comparison rates, refinancing may save $2,000–$5,000/year.",
  },
];

export default function CompareHomeLoanPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Home Loans", url: `${SITE_URL}/home-loans` },
    { name: "How to Compare Home Loans", url: `${SITE_URL}/home-loans/compare` },
  ]);
  const faqLd = faqJsonLd(FAQS.map((f) => ({ q: f.q, a: f.a })));

  return (
    <div className="bg-white min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      {/* Hero */}
      <div className="bg-gradient-to-br from-violet-900 to-violet-700 text-white py-14">
        <div className="container-custom">
          <nav aria-label="Breadcrumb" className="text-sm text-violet-200 mb-4 flex items-center gap-1.5">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <span>/</span>
            <Link href="/home-loans" className="hover:text-white transition-colors">Home Loans</Link>
            <span>/</span>
            <span className="text-white">How to Compare Home Loans</span>
          </nav>
          <div className="inline-block bg-violet-800 text-violet-200 text-xs font-medium px-3 py-1 rounded-full mb-4">
            General information only — not credit assistance
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
            How to Compare Home Loans in Australia
          </h1>
          <p className="text-lg text-violet-100 max-w-2xl">
            The advertised rate is only the start. Comparison rates, offset quality, LVR tiers, and hidden fees all affect what you really pay. Here&apos;s the 10-point framework.
          </p>
        </div>
      </div>

      {/* Checklist Table */}
      <section className="py-12 bg-white">
        <div className="container-custom">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">The 10-Point Home Loan Comparison Checklist</h2>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm" aria-label="10-point home loan comparison checklist">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th scope="col" className="text-left px-5 py-3">Factor</th>
                  <th scope="col" className="text-left px-5 py-3">Why It Matters</th>
                  <th scope="col" className="text-left px-5 py-3">What to Look For</th>
                </tr>
              </thead>
              <tbody>
                {CHECKLIST.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className="px-5 py-3 font-semibold text-violet-700">{row.item}</td>
                    <td className="px-5 py-3 text-slate-600">{row.why}</td>
                    <td className="px-5 py-3 text-slate-500 text-xs">{row.look}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* LVR Tiers */}
      <section className="py-12 bg-slate-50">
        <div className="container-custom">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">LVR Tiers & Their Impact on Rate</h2>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm" aria-label="LVR tiers and impact on home loan rate">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th scope="col" className="text-left px-5 py-3 font-semibold text-slate-700">LVR</th>
                  <th scope="col" className="text-left px-5 py-3 font-semibold text-slate-700">Lender Risk View</th>
                  <th scope="col" className="text-left px-5 py-3 font-semibold text-slate-700">Rate Expectation</th>
                  <th scope="col" className="text-left px-5 py-3 font-semibold text-slate-700">LMI Required?</th>
                </tr>
              </thead>
              <tbody>
                {LVR_TIERS.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className="px-5 py-3 font-semibold text-violet-700">{row.lvr}</td>
                    <td className="px-5 py-3 text-slate-600">{row.risk}</td>
                    <td className="px-5 py-3 text-slate-600">{row.typical}</td>
                    <td className={`px-5 py-3 font-medium ${row.lmi === "No" ? "text-green-600" : "text-red-600"}`}>{row.lmi}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Broker CTA */}
      <section className="py-12 bg-violet-50">
        <div className="container-custom text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-3">Compare Across 30+ Lenders</h2>
          <p className="text-slate-600 mb-6 max-w-xl mx-auto text-sm">A licensed mortgage broker uses this checklist on your behalf — at no cost to you. They&apos;re paid by the lender, and ASIC data shows they typically generate lower rates than going direct.</p>
          <Link href="/advisors/mortgage-brokers" className="inline-block bg-violet-600 text-white font-semibold px-8 py-3 rounded-xl hover:bg-violet-700 transition-colors">
            Find a Licensed Mortgage Broker
          </Link>
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
                  <span className="ml-3 text-slate-400 group-open:rotate-180 transition-transform" aria-hidden="true">▼</span>
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
              { label: "Variable vs Fixed Rate", href: "/home-loans/variable" },
              { label: "Fixed Rate Guide", href: "/home-loans/fixed" },
              { label: "Refinancing Guide", href: "/home-loans/refinancing" },
              { label: "Investment Loans", href: "/home-loans/investment" },
              { label: "Offset & Redraw", href: "/home-loans/offset-redraw" },
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
          <p><strong>Credit disclaimer:</strong> invest.com.au is not licensed to provide credit assistance under the National Consumer Credit Protection Act 2009 (Cth). This page contains general information only and does not constitute a credit recommendation. Please consult a licensed mortgage broker or Australian Credit Licensee for advice specific to your circumstances.</p>
          <p>{GENERAL_ADVICE_WARNING}</p>
        </div>
      </footer>
    </div>
  );
}
