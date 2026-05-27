import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Home Loan Refinancing Guide Australia (${CURRENT_YEAR}) | invest.com.au`,
  description: `How to refinance your home loan in Australia — breakeven calculation, typical costs, 7-step process, and when refinancing makes financial sense. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Home Loan Refinancing Guide Australia (${CURRENT_YEAR})`,
    description: "Step-by-step refinancing guide: breakeven calculation, discharge fees, application costs, cashback traps, and what to watch for on the new loan.",
    url: `${SITE_URL}/home-loans/refinancing`,
    images: [{ url: `/api/og?title=Home+Loan+Refinancing+Guide`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/home-loans/refinancing` },
};

const STEPS = [
  { step: "1", title: "Calculate your breakeven point", desc: "Divide total switching costs by monthly saving. If breakeven is 12 months and you plan to keep the loan 5+ years, refinancing is likely worthwhile." },
  { step: "2", title: "Check your credit file", desc: "Request a free copy from Equifax, Experian, or illion before applying. Fix any errors. Multiple credit enquiries in a short period can lower your score." },
  { step: "3", title: "Know your LVR", desc: "If your property value has grown, your LVR may have improved — unlocking lower rate tiers. Get a rough estimate from CoreLogic or RP Data before applying." },
  { step: "4", title: "Compare lenders", desc: "Use comparison rate, not headline rate. Compare ongoing fees, offset account quality, and redraw terms — not just the interest rate." },
  { step: "5", title: "Get a valuation", desc: "Most lenders order their own valuation when you apply. The result can affect the rate tier you qualify for. If your LVR is borderline, a higher valuation helps." },
  { step: "6", title: "Submit application", desc: "Prepare: last 2 payslips, last 2 years tax returns (self-employed), bank statements (3 months), existing loan statements, and council rates notice." },
  { step: "7", title: "Discharge and settle", desc: "Your new lender coordinates discharge with your old lender. The process typically takes 4–8 weeks. Discharge fee ($150–$350) is paid to the exiting lender." },
];

const COSTS = [
  { item: "Discharge fee", typical: "$150–$350", notes: "Paid to your existing lender to close the loan" },
  { item: "Break cost (fixed loans)", typical: "$0–$30,000+", notes: "Only applies if exiting a fixed rate early" },
  { item: "Application fee (new lender)", typical: "$0–$600", notes: "Many lenders waive this for refinancers" },
  { item: "Valuation fee", typical: "$0–$300", notes: "Often waived or covered by cashback offer" },
  { item: "Legal/conveyancing fee", typical: "$200–$600", notes: "Mortgage documentation and settlement" },
  { item: "LMI (if LVR > 80%)", typical: "$5,000–$30,000+", notes: "Avoid by maintaining LVR ≤ 80%" },
  { item: "Mortgage registration fee", typical: "$100–$200", notes: "State government charge" },
];

const FAQS = [
  {
    q: "How often should I refinance my home loan?",
    a: "There's no fixed rule, but many financial educators suggest reviewing your home loan rate every 2–3 years. The 'loyalty tax' is real — lenders often offer their best rates to new customers, not existing ones. If your current rate is significantly above market (0.5%+ higher than comparable products), a refinance is worth calculating. A licensed mortgage broker can benchmark your rate against the market at no cost to you.",
  },
  {
    q: "Does refinancing hurt my credit score?",
    a: "A mortgage application creates a 'hard enquiry' on your credit file, which typically reduces your credit score by 5–10 points temporarily. The effect fades within 12 months. If you apply to multiple lenders within a short window, the enquiries are often treated as a single event by the credit bureaus. The long-term benefit of a lower rate far outweighs the short-term score impact for most borrowers.",
  },
  {
    q: "What is a cashback refinance offer and is it worth it?",
    a: "Some lenders offer $2,000–$5,000 cashback to refinancers. These can be worthwhile but check whether the ongoing rate is competitive — a higher rate can easily erode the one-off cashback within 1–2 years. Calculate: (monthly saving on new rate × 12 months) vs cashback amount. If the new rate is 0.3% higher, the cashback advantage disappears quickly on a $500,000 loan.",
  },
  {
    q: "Can I refinance if my property value has fallen?",
    a: "You can apply to refinance with a higher LVR, but you'll face fewer lender options and potentially need to pay LMI again. If your LVR has risen above 80% due to a property value decline, consider whether refinancing is cost-effective. Speak to a licensed mortgage broker who can assess your options across multiple lenders and identify those with higher LVR tolerance.",
  },
];

export default function RefinancingPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Home Loans", url: `${SITE_URL}/home-loans` },
    { name: "Refinancing Guide", url: `${SITE_URL}/home-loans/refinancing` },
  ]);
  const faqLd = faqJsonLd(FAQS.map((f) => ({ q: f.q, a: f.a })));

  return (
    <div className="bg-white min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      {/* Hero */}
      <div className="bg-gradient-to-br from-emerald-900 to-emerald-700 text-white py-14">
        <div className="container-custom">
          <nav className="text-sm text-emerald-200 mb-4 flex items-center gap-1.5">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <span>/</span>
            <Link href="/home-loans" className="hover:text-white transition-colors">Home Loans</Link>
            <span>/</span>
            <span className="text-white">Refinancing Guide</span>
          </nav>
          <div className="inline-block bg-emerald-800 text-emerald-200 text-xs font-medium px-3 py-1 rounded-full mb-4">
            General information only — not credit assistance
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
            Home Loan Refinancing Guide
          </h1>
          <p className="text-lg text-emerald-100 max-w-2xl">
            Most Australians who haven&apos;t refinanced in 3+ years are paying a loyalty tax. Here&apos;s the step-by-step process, true cost calculation, and the break-even analysis that tells you if it&apos;s worth it.
          </p>
        </div>
      </div>

      {/* Breakeven Callout */}
      <section className="py-12 bg-emerald-50">
        <div className="container-custom">
          <div className="bg-white border border-emerald-200 rounded-2xl p-8 max-w-3xl mx-auto">
            <h2 className="text-xl font-bold text-slate-900 mb-3">The Refinancing Breakeven Calculation</h2>
            <div className="bg-slate-900 text-green-400 font-mono text-sm rounded-xl p-4 mb-4">
              Breakeven months = Total switching costs ÷ Monthly saving
            </div>
            <p className="text-slate-600 text-sm">
              Example: Switching costs = $1,500. Rate saving on $500,000 loan from 6.5% to 6.0% = $208/month saving. Breakeven = 7.2 months. If you keep the loan for 3+ years, this refinance generates ~$5,500 in net savings.
            </p>
          </div>
        </div>
      </section>

      {/* 7-Step Process */}
      <section className="py-12 bg-white">
        <div className="container-custom">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">The 7-Step Refinancing Process</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {STEPS.map((s) => (
              <div key={s.step} className="flex gap-4 bg-slate-50 rounded-xl p-5 border border-slate-200">
                <div className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {s.step}
                </div>
                <div>
                  <p className="font-semibold text-slate-900 text-sm mb-1">{s.title}</p>
                  <p className="text-xs text-slate-600 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Costs Table */}
      <section className="py-12 bg-slate-50">
        <div className="container-custom">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Typical Refinancing Costs</h2>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="text-left px-5 py-3">Cost Item</th>
                  <th className="text-left px-5 py-3">Typical Range</th>
                  <th className="text-left px-5 py-3">Notes</th>
                </tr>
              </thead>
              <tbody>
                {COSTS.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className="px-5 py-3 font-medium text-slate-800">{row.item}</td>
                    <td className="px-5 py-3 text-emerald-700 font-semibold">{row.typical}</td>
                    <td className="px-5 py-3 text-slate-600">{row.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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

      {/* CTA */}
      <section className="py-12 bg-emerald-50">
        <div className="container-custom text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-3">Ready to Explore Your Refinancing Options?</h2>
          <p className="text-slate-600 mb-6 max-w-xl mx-auto text-sm">A licensed mortgage broker can compare 30+ lenders and model your exact breakeven calculation at no cost to you.</p>
          <Link href="/advisors/mortgage-brokers" className="inline-block bg-emerald-600 text-white font-semibold px-8 py-3 rounded-xl hover:bg-emerald-700 transition-colors">
            Find a Licensed Mortgage Broker
          </Link>
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
