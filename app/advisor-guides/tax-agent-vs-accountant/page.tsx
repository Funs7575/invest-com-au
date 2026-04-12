import Link from "next/link";
import type { Metadata } from "next";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR } from "@/lib/seo";
import Icon from "@/components/Icon";
import AdvisorPrompt from "@/components/AdvisorPrompt";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Tax Agent vs Accountant for Investors: Which Do You Need? (${CURRENT_YEAR})`,
  description: "Should you use a specialist tax agent or a general accountant for your investment tax? We compare qualifications, costs, and when each makes sense for Australian investors.",
  openGraph: {
    title: "Tax Agent vs Accountant for Investors",
    description: "Investment tax specialist vs general accountant: costs, capabilities, and when each is the right choice for your tax return.",
    images: [{ url: "/api/og?title=Tax+Agent+vs+Accountant&subtitle=For+investors&type=default", width: 1200, height: 630 }],
  },
  alternates: { canonical: "/advisor-guides/tax-agent-vs-accountant" },
};

const ROWS = [
  { label: "Primary focus", specialist: "Investment and trading tax specifically", general: "All types of personal and business tax" },
  { label: "CGT expertise", specialist: "Deep — discount method, rollover relief, cost base adjustments, tax-loss harvesting", general: "Basic — may miss complex CGT optimisation strategies" },
  { label: "Crypto tax", specialist: "Experienced with DeFi, staking, airdrops, cross-chain tracking", general: "Often limited — may not understand DeFi income classification" },
  { label: "International income", specialist: "Foreign tax offsets, FITO, treaty benefits, FIF rules", general: "Basic compliance only" },
  { label: "Typical cost", specialist: "$500–$2,000+ per return", general: "$150–$500 per return" },
  { label: "Turnaround", specialist: "May have longer wait during peak season", general: "Usually faster for simple returns" },
  { label: "Proactive advice", specialist: "Yes — year-round tax planning and structuring", general: "Usually reactive — just lodges your return" },
  { label: "Broker integration", specialist: "Imports data from major trading platforms automatically", general: "May require manual data entry" },
  { label: "Trust & structure advice", specialist: "Investment trusts, company structures, SMSF tax", general: "General trust and company compliance" },
  { label: "Regulated by", specialist: "Tax Practitioners Board (TPB)", general: "Tax Practitioners Board (TPB)" },
];

export default function TaxAgentVsAccountantPage() {
  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Find an Advisor", url: absoluteUrl("/advisors") },
    { name: "Tax Agent vs Accountant" },
  ]);

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      { "@type": "Question", name: "When should I use a specialist tax agent instead of a general accountant?", acceptedAnswer: { "@type": "Answer", text: "Use a specialist when you have: frequent share trades with complex CGT calculations, crypto holdings (especially DeFi), international investments, investment properties, or structures like trusts and SMSFs. The additional cost typically pays for itself in tax savings." } },
      { "@type": "Question", name: "Can my regular accountant handle crypto tax?", acceptedAnswer: { "@type": "Answer", text: "Most general accountants can handle basic crypto buy/sell events. However, DeFi activities (liquidity pools, yield farming, cross-chain bridges, airdrops) require specialist knowledge. Incorrect crypto tax reporting can trigger ATO audits." } },
      { "@type": "Question", name: "Is it worth paying more for a specialist tax agent?", acceptedAnswer: { "@type": "Answer", text: "For investors with portfolios over $50k or complex tax situations, specialist agents typically save 2-5x their fee through legitimate deductions, CGT optimisation, and strategic timing of disposals." } },
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
            <span className="text-slate-700">Tax Agent vs Accountant</span>
          </nav>

          <h1 className="text-xl md:text-4xl font-extrabold text-slate-900 mb-2 md:mb-4 leading-tight">
            Tax Agent vs General Accountant for Investors
          </h1>
          <p className="text-sm md:text-lg text-slate-500 mb-6 md:mb-10 leading-relaxed">
            Your investment tax return could save — or cost — you thousands depending on who prepares it. Here&apos;s when a specialist is worth it.
          </p>

          {/* Comparison table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-6 md:mb-10">
            <div className="grid grid-cols-3 bg-slate-50 border-b border-slate-200">
              <div className="p-2.5 md:p-4" />
              <div className="p-2.5 md:p-4 text-center border-l border-slate-200">
                <div className="flex items-center justify-center gap-1.5 mb-0.5">
                  <Icon name="calculator" size={14} className="text-slate-600" />
                  <span className="text-xs md:text-sm font-bold text-slate-900">Investment Tax Specialist</span>
                </div>
              </div>
              <div className="p-2.5 md:p-4 text-center border-l border-slate-200">
                <div className="flex items-center justify-center gap-1.5 mb-0.5">
                  <Icon name="file-text" size={14} className="text-slate-600" />
                  <span className="text-xs md:text-sm font-bold text-slate-900">General Accountant</span>
                </div>
              </div>
            </div>
            {ROWS.map((row, i) => (
              <div key={i} className={`grid grid-cols-3 border-b border-slate-100 last:border-b-0 ${i % 2 === 0 ? "" : "bg-slate-50/50"}`}>
                <div className="p-2.5 md:p-4 flex items-start">
                  <span className="text-[0.62rem] md:text-xs font-bold text-slate-700">{row.label}</span>
                </div>
                <div className="p-2.5 md:p-4 border-l border-slate-100">
                  <span className="text-[0.62rem] md:text-xs text-slate-600">{row.specialist}</span>
                </div>
                <div className="p-2.5 md:p-4 border-l border-slate-100">
                  <span className="text-[0.62rem] md:text-xs text-slate-600">{row.general}</span>
                </div>
              </div>
            ))}
          </div>

          {/* When you need a specialist */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 md:p-6 mb-6 md:mb-10">
            <h2 className="text-base md:text-lg font-bold text-amber-900 mb-2 flex items-center gap-2">
              <Icon name="alert-triangle" size={20} className="text-amber-600" />
              When a Specialist Pays for Itself
            </h2>
            <ul className="space-y-1.5 text-xs md:text-sm text-amber-800">
              <li className="flex items-start gap-2"><span className="text-amber-600 mt-0.5">&#x2713;</span> Portfolio over $50k with frequent trades (CGT optimisation alone can save thousands)</li>
              <li className="flex items-start gap-2"><span className="text-amber-600 mt-0.5">&#x2713;</span> Any crypto holdings beyond simple buy-and-hold (DeFi, staking, airdrops)</li>
              <li className="flex items-start gap-2"><span className="text-amber-600 mt-0.5">&#x2713;</span> International shares or income from foreign sources</li>
              <li className="flex items-start gap-2"><span className="text-amber-600 mt-0.5">&#x2713;</span> Investment property plus shares (interaction between negative gearing and CGT)</li>
              <li className="flex items-start gap-2"><span className="text-amber-600 mt-0.5">&#x2713;</span> Considering structures like family trusts or companies for investing</li>
            </ul>
          </div>

          {/* When a general accountant is fine */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 md:p-6 mb-6 md:mb-10">
            <h2 className="text-base md:text-lg font-bold text-emerald-900 mb-2 flex items-center gap-2">
              <Icon name="check-circle" size={20} className="text-emerald-600" />
              When a General Accountant Is Fine
            </h2>
            <ul className="space-y-1.5 text-xs md:text-sm text-emerald-800">
              <li className="flex items-start gap-2"><span className="text-emerald-600 mt-0.5">&#x2713;</span> Simple salary + a few dividend payments or ETF distributions</li>
              <li className="flex items-start gap-2"><span className="text-emerald-600 mt-0.5">&#x2713;</span> Buy-and-hold strategy with infrequent trades (1-2 CGT events per year)</li>
              <li className="flex items-start gap-2"><span className="text-emerald-600 mt-0.5">&#x2713;</span> No international income or complex structures</li>
              <li className="flex items-start gap-2"><span className="text-emerald-600 mt-0.5">&#x2713;</span> Basic crypto purchases on a single exchange with no DeFi activity</li>
            </ul>
          </div>

          {/* FAQs */}
          <div className="mb-6 md:mb-10">
            <h2 className="text-base md:text-lg font-bold text-slate-900 mb-3">Frequently Asked Questions</h2>
            <div className="space-y-2">
              {[
                { q: "When should I use a specialist tax agent instead of a general accountant?", a: "Use a specialist when you have frequent share trades, crypto (especially DeFi), international investments, or structures like trusts and SMSFs. The savings typically exceed the additional cost." },
                { q: "Can my regular accountant handle crypto tax?", a: "Basic buy/sell events — yes. DeFi activities (liquidity pools, yield farming, bridges, airdrops) — usually not. Incorrect crypto reporting can trigger ATO audits." },
                { q: "Is it worth paying more for a specialist?", a: "For portfolios over $50k or complex situations, specialists typically save 2-5x their fee through CGT optimisation and deductions you'd otherwise miss." },
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
            <AdvisorPrompt type="tax_agent" heading="Find a Tax Agent" description="Browse verified investment tax specialists." context="tax" />
            <AdvisorPrompt type="smsf_accountant" heading="SMSF Tax Help" description="Specialists in SMSF compliance and tax returns." context="smsf" />
          </div>

          {/* Related guides */}
          <div className="pt-6 border-t border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Related Guides</h3>
            <div className="flex flex-wrap gap-2">
              <Link href="/advisor-guides/how-to-choose-tax-agent-investments" className="text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors font-medium text-slate-600">Tax Agent Guide</Link>
              <Link href="/advisor-guides/compare" className="text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors font-medium text-slate-600">SMSF Accountant vs Financial Planner</Link>
              <Link href="/find-advisor" className="text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors font-medium text-slate-600">Find My Advisor Quiz</Link>
            </div>
          </div>

          <div className="mt-6 text-[0.56rem] md:text-xs text-slate-400 text-center leading-relaxed">
            This guide is for informational purposes only and does not constitute financial or tax advice. Always verify credentials on the Tax Practitioners Board register before engaging any professional.
          </div>
        </div>
      </article>
    </>
  );
}
