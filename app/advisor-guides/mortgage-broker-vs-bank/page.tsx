import Link from "next/link";
import type { Metadata } from "next";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR } from "@/lib/seo";
import Icon from "@/components/Icon";
import AdvisorPrompt from "@/components/AdvisorPrompt";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Mortgage Broker vs Bank: Which Is Better for Your Home Loan? (${CURRENT_YEAR})`,
  description: "Should you use a mortgage broker or go directly to your bank? We compare rates, service, cost, and when each option makes sense for Australian borrowers.",
  openGraph: {
    title: "Mortgage Broker vs Bank",
    description: "Mortgage broker vs bank direct: who gets you the better deal? Independent comparison for Australian borrowers.",
    images: [{ url: "/api/og?title=Mortgage+Broker+vs+Bank&subtitle=Who+gets+you+the+better+deal%3F&type=default", width: 1200, height: 630 }],
  },
  alternates: { canonical: "/advisor-guides/mortgage-broker-vs-bank" },
};

const ROWS = [
  { label: "Number of lenders", broker: "20–40+ lenders on panel", bank: "1 (their own products only)" },
  { label: "Rate negotiation", broker: "Compares rates across lenders, negotiates on your behalf", bank: "Limited to their internal rate bands" },
  { label: "Cost to you", broker: "Usually free (paid by lender commission)", bank: "Free (no broker commission)" },
  { label: "How they're paid", broker: "Upfront commission (0.5–0.7%) + trail (0.15%/yr) from lender", bank: "Staff salary — no commission incentive" },
  { label: "Best interest duty", broker: "Yes — legally required since 2021 to act in your interest", bank: "No — only required to provide 'not unsuitable' products" },
  { label: "Investment property", broker: "Specialist knowledge of investor lending requirements", bank: "May not prioritise investor-specific features" },
  { label: "Complex situations", broker: "Self-employed, multiple properties, trusts, SMSF lending", bank: "May struggle with non-standard applications" },
  { label: "Application support", broker: "End-to-end support, paperwork, settlement coordination", bank: "Varies — may be hands-off after application" },
  { label: "Ongoing support", broker: "Annual reviews, rate renegotiation, switching advice", bank: "Loyalty often unrewarded — you may need to call to negotiate" },
  { label: "Speed", broker: "Can be faster (knows which lenders are quick to approve)", bank: "Depends on internal processing times" },
];

export default function MortgageBrokerVsBankPage() {
  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Find an Advisor", url: absoluteUrl("/advisors") },
    { name: "Mortgage Broker vs Bank" },
  ]);

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      { "@type": "Question", name: "Do mortgage brokers get you better rates than going to the bank?", acceptedAnswer: { "@type": "Answer", text: "Often yes. Brokers compare 20-40+ lenders and can find competitive rates you wouldn't discover on your own. They also know which lenders are currently offering cashback deals or rate specials. However, some banks offer 'direct-only' rates that brokers can't access." } },
      { "@type": "Question", name: "How much does a mortgage broker cost?", acceptedAnswer: { "@type": "Answer", text: "In most cases, nothing to you directly. Brokers are paid by the lender: typically 0.5-0.7% upfront commission plus 0.15% trail commission. This cost is built into the loan product, so you pay the same rate whether you use a broker or go direct. Some brokers charge fees for complex lending (commercial, SMSF)." } },
      { "@type": "Question", name: "Are mortgage brokers really independent?", acceptedAnswer: { "@type": "Answer", text: "Since January 2021, mortgage brokers are legally required to act in your best interest under the Best Interests Duty. They must recommend the most suitable product, not the highest commission one. However, they can only recommend products from lenders on their panel, which may not include all lenders." } },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      <article className="py-5 md:py-12">
        <div className="container-custom max-w-3xl">
          <nav className="text-xs md:text-sm text-slate-500 mb-3 md:mb-6">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span className="mx-1.5 md:mx-2">/</span>
            <Link href="/advisors" className="hover:text-slate-900">Advisors</Link>
            <span className="mx-1.5 md:mx-2">/</span>
            <span className="text-slate-700">Mortgage Broker vs Bank</span>
          </nav>

          <h1 className="text-xl md:text-4xl font-extrabold text-slate-900 mb-2 md:mb-4 leading-tight">
            Mortgage Broker vs Going Direct to the Bank
          </h1>
          <p className="text-sm md:text-lg text-slate-500 mb-6 md:mb-10 leading-relaxed">
            Over 70% of Australian home loans are now written through brokers. Here&apos;s why — and when going direct might still make sense.
          </p>

          {/* Key stat */}
          <div className="grid grid-cols-3 gap-3 mb-6 md:mb-10">
            {[
              { stat: "70%+", label: "of home loans via brokers" },
              { stat: "$0", label: "cost to most borrowers" },
              { stat: "20-40+", label: "lenders compared" },
            ].map((item, i) => (
              <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl p-3 md:p-4 text-center">
                <div className="text-lg md:text-2xl font-extrabold text-slate-900">{item.stat}</div>
                <div className="text-[0.58rem] md:text-xs text-slate-500">{item.label}</div>
              </div>
            ))}
          </div>

          {/* Comparison table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-6 md:mb-10">
            <div className="grid grid-cols-3 bg-slate-50 border-b border-slate-200">
              <div className="p-2.5 md:p-4" />
              <div className="p-2.5 md:p-4 text-center border-l border-slate-200">
                <div className="flex items-center justify-center gap-1.5 mb-0.5">
                  <Icon name="landmark" size={14} className="text-slate-600" />
                  <span className="text-xs md:text-sm font-bold text-slate-900">Mortgage Broker</span>
                </div>
              </div>
              <div className="p-2.5 md:p-4 text-center border-l border-slate-200">
                <div className="flex items-center justify-center gap-1.5 mb-0.5">
                  <Icon name="building" size={14} className="text-slate-600" />
                  <span className="text-xs md:text-sm font-bold text-slate-900">Bank Direct</span>
                </div>
              </div>
            </div>
            {ROWS.map((row, i) => (
              <div key={i} className={`grid grid-cols-3 border-b border-slate-100 last:border-b-0 ${i % 2 === 0 ? "" : "bg-slate-50/50"}`}>
                <div className="p-2.5 md:p-4 flex items-start">
                  <span className="text-[0.62rem] md:text-xs font-bold text-slate-700">{row.label}</span>
                </div>
                <div className="p-2.5 md:p-4 border-l border-slate-100">
                  <span className="text-[0.62rem] md:text-xs text-slate-600">{row.broker}</span>
                </div>
                <div className="p-2.5 md:p-4 border-l border-slate-100">
                  <span className="text-[0.62rem] md:text-xs text-slate-600">{row.bank}</span>
                </div>
              </div>
            ))}
          </div>

          {/* When to use a broker */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 md:p-6 mb-6 md:mb-10">
            <h2 className="text-base md:text-lg font-bold text-emerald-900 mb-2 flex items-center gap-2">
              <Icon name="check-circle" size={20} className="text-emerald-600" />
              Use a Mortgage Broker When
            </h2>
            <ul className="space-y-1.5 text-xs md:text-sm text-emerald-800">
              <li className="flex items-start gap-2"><span className="text-emerald-600 mt-0.5">&#x2713;</span> You&apos;re a first-home buyer unfamiliar with the lending landscape</li>
              <li className="flex items-start gap-2"><span className="text-emerald-600 mt-0.5">&#x2713;</span> You&apos;re buying an investment property (specialist lending knowledge matters)</li>
              <li className="flex items-start gap-2"><span className="text-emerald-600 mt-0.5">&#x2713;</span> You&apos;re self-employed or have complex income (multiple lenders = more options)</li>
              <li className="flex items-start gap-2"><span className="text-emerald-600 mt-0.5">&#x2713;</span> You want to refinance and aren&apos;t sure what&apos;s available</li>
              <li className="flex items-start gap-2"><span className="text-emerald-600 mt-0.5">&#x2713;</span> You need SMSF lending or trust structures</li>
            </ul>
          </div>

          {/* When to go direct */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 md:p-6 mb-6 md:mb-10">
            <h2 className="text-base md:text-lg font-bold text-blue-900 mb-2 flex items-center gap-2">
              <Icon name="building" size={20} className="text-blue-600" />
              Consider Going Direct When
            </h2>
            <ul className="space-y-1.5 text-xs md:text-sm text-blue-800">
              <li className="flex items-start gap-2"><span className="text-blue-600 mt-0.5">&#x2713;</span> Your bank offers a &quot;direct-only&quot; rate that beats broker-accessible rates</li>
              <li className="flex items-start gap-2"><span className="text-blue-600 mt-0.5">&#x2713;</span> You have a strong existing relationship and negotiation leverage</li>
              <li className="flex items-start gap-2"><span className="text-blue-600 mt-0.5">&#x2713;</span> You&apos;re refinancing within the same bank (retention teams often offer competitive rates)</li>
              <li className="flex items-start gap-2"><span className="text-blue-600 mt-0.5">&#x2713;</span> Your situation is straightforward: PAYG income, single property, good credit</li>
            </ul>
          </div>

          {/* Pro tip */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 md:p-6 mb-6 md:mb-10">
            <h2 className="text-base md:text-lg font-bold text-amber-900 mb-2 flex items-center gap-2">
              <Icon name="zap" size={20} className="text-amber-600" />
              Pro Tip: Use Both
            </h2>
            <p className="text-xs md:text-sm text-amber-800 leading-relaxed">
              The smartest borrowers get a broker quote <em>and</em> check their bank&apos;s direct rate. Use the broker&apos;s research as leverage with your bank, or use the bank&apos;s direct rate to challenge the broker. The best-interest duty means brokers must still find you the best deal they can access.
            </p>
          </div>

          {/* FAQs */}
          <div className="mb-6 md:mb-10">
            <h2 className="text-base md:text-lg font-bold text-slate-900 mb-3">Frequently Asked Questions</h2>
            <div className="space-y-2">
              {[
                { q: "Do mortgage brokers get you better rates than the bank?", a: "Often yes — they compare 20-40+ lenders. However, some banks offer direct-only rates that brokers can't access. The smartest approach is to compare both." },
                { q: "How much does a mortgage broker cost?", a: "Usually nothing to you. Brokers are paid by the lender (0.5-0.7% upfront + 0.15% trail). The rate is the same whether you use a broker or go direct." },
                { q: "Are mortgage brokers really independent?", a: "Since 2021, they're legally required to act in your best interest. However, they can only recommend products from their lender panel, which may not include all lenders." },
              ].map((faq, i) => (
                <details key={i} className="bg-white border border-slate-200 rounded-lg group">
                  <summary className="px-3.5 py-3 font-semibold text-xs md:text-sm text-slate-800 cursor-pointer hover:bg-slate-50 transition-colors list-none flex items-center justify-between">
                    {faq.q}
                    <span className="text-slate-400 group-open:rotate-180 transition-transform ml-2 shrink-0">&#x25BE;</span>
                  </summary>
                  <p className="px-3.5 pb-3 text-xs md:text-sm text-slate-600 leading-relaxed">{faq.a}</p>
                </details>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
            <AdvisorPrompt type="mortgage_broker" heading="Find a Mortgage Broker" description="Browse verified mortgage brokers who compare 20+ lenders." />
            <AdvisorPrompt type="buyers_agent" heading="Also Buying Property?" description="A buyers agent negotiates the purchase on your behalf." context="property" />
          </div>

          {/* Related guides */}
          <div className="pt-6 border-t border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Related Guides</h3>
            <div className="flex flex-wrap gap-2">
              <Link href="/advisor-guides/how-to-choose-mortgage-broker" className="text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors font-medium text-slate-600">Mortgage Broker Guide</Link>
              <Link href="/advisor-guides/how-to-choose-property-investment-advisor" className="text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors font-medium text-slate-600">Property Advisor Guide</Link>
              <Link href="/advisor-guides/compare" className="text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors font-medium text-slate-600">SMSF Accountant vs Financial Planner</Link>
            </div>
          </div>

          <div className="mt-6 text-[0.56rem] md:text-xs text-slate-400 text-center leading-relaxed">
            This guide is for informational purposes only and does not constitute financial advice. Always verify credentials before engaging any mortgage professional.
          </div>
        </div>
      </article>
    </>
  );
}
