import Link from "next/link";
import type { Metadata } from "next";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR } from "@/lib/seo";
import Icon from "@/components/Icon";
import AdvisorPrompt from "@/components/AdvisorPrompt";

export const metadata: Metadata = {
  title: `Financial Planner vs Robo-Advisor: Which Is Right for You? (${CURRENT_YEAR})`,
  description: "Honest comparison of human financial planners vs robo-advisors in Australia. Costs, performance, when each makes sense, and when you need both.",
  openGraph: {
    title: "Financial Planner vs Robo-Advisor — Invest.com.au",
    description: "Human financial planner vs robo-advisor: costs, what you get, and when each is the right choice.",
    images: [{ url: "/api/og?title=Financial+Planner+vs+Robo-Advisor&subtitle=Which+is+right+for+you%3F&type=default", width: 1200, height: 630 }],
  },
  alternates: { canonical: "/advisor-guides/financial-planner-vs-robo-advisor" },
};

const ROWS = [
  { label: "Upfront cost", human: "$2,500–$5,500 (SOA)", robo: "$0 (included in management fee)" },
  { label: "Ongoing cost", human: "$2,000–$8,000/year", robo: "0.2%–0.7%/year of balance" },
  { label: "Cost on $100k", human: "$2,000–$8,000/year", robo: "$200–$700/year" },
  { label: "Cost on $500k", human: "$3,000–$10,000/year", robo: "$1,000–$3,500/year" },
  { label: "Personalisation", human: "Fully customised to your situation", robo: "Questionnaire-based risk profiling" },
  { label: "Tax planning", human: "Yes — CGT, structures, deductions", robo: "Basic tax-loss harvesting only" },
  { label: "Insurance advice", human: "Yes — life, TPD, income protection", robo: "No" },
  { label: "Estate planning", human: "Yes — wills, super nominations", robo: "No" },
  { label: "Rebalancing", human: "Manual or semi-annual review", robo: "Automatic, continuous" },
  { label: "Emotional coaching", human: "Yes — prevents panic selling", robo: "No — you manage your own behaviour" },
  { label: "Minimum investment", human: "$0 (but SOA fee applies regardless)", robo: "$0–$500" },
];

export default function PlannerVsRoboPage() {
  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Find an Advisor", url: absoluteUrl("/advisors") },
    { name: "Financial Planner vs Robo-Advisor" },
  ]);

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      { "@type": "Question", name: "Is a robo-advisor as good as a financial planner?", acceptedAnswer: { "@type": "Answer", text: "For basic, diversified investing — a robo-advisor provides excellent value at a fraction of the cost. But robo-advisors can't help with tax planning, insurance, estate planning, or complex financial decisions. They're complementary rather than interchangeable." } },
      { "@type": "Question", name: "How much does a financial planner cost in Australia?", acceptedAnswer: { "@type": "Answer", text: "A Statement of Advice (SOA) typically costs $2,500–$5,500. Ongoing advice relationships cost $2,000–$8,000 per year depending on complexity. Fee-for-service planners charge these fees directly rather than earning commissions." } },
      { "@type": "Question", name: "Can I use both a financial planner and a robo-advisor?", acceptedAnswer: { "@type": "Answer", text: "Yes — many investors use a financial planner for strategy and tax planning, while investing through a robo-advisor for the low-cost automated portfolio management. The planner designs the strategy; the robo executes it cheaply." } },
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
            <span className="text-slate-700">Financial Planner vs Robo-Advisor</span>
          </nav>

          <h1 className="text-xl md:text-4xl font-extrabold text-slate-900 mb-2 md:mb-4 leading-tight">
            Financial Planner vs Robo-Advisor
          </h1>
          <p className="text-sm md:text-lg text-slate-500 mb-6 md:mb-10 leading-relaxed">
            One costs $3,000+/year, the other costs $200/year on $100k. But they do very different things. Here&apos;s when each makes sense.
          </p>

          {/* Quick answer */}
          <div className="bg-slate-900 text-white rounded-xl p-4 md:p-6 mb-6 md:mb-10">
            <h2 className="text-base md:text-lg font-bold mb-2 flex items-center gap-2">
              <Icon name="zap" size={20} className="text-amber-400" />
              Quick Answer
            </h2>
            <p className="text-sm md:text-base text-slate-300 leading-relaxed">
              <strong>Use a robo-advisor if</strong> you want simple, low-cost, diversified investing and don&apos;t need tax planning or insurance advice.
              <strong> Use a financial planner if</strong> you have complex needs — tax minimisation, SMSF, estate planning, insurance, or a portfolio above $500k
              where the tax savings alone can exceed the planner&apos;s fees.
              <strong> Use both if</strong> you want a planner for strategy and a robo for cheap execution.
            </p>
          </div>

          {/* Comparison table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-6 md:mb-10">
            <div className="grid grid-cols-3 bg-slate-50 border-b border-slate-200">
              <div className="p-2.5 md:p-4" />
              <div className="p-2.5 md:p-4 text-center border-l border-slate-200">
                <div className="flex items-center justify-center gap-1.5">
                  <Icon name="users" size={14} className="text-slate-600" />
                  <span className="text-xs md:text-sm font-bold text-slate-900">Financial Planner</span>
                </div>
              </div>
              <div className="p-2.5 md:p-4 text-center border-l border-slate-200">
                <div className="flex items-center justify-center gap-1.5">
                  <Icon name="cpu" size={14} className="text-slate-600" />
                  <span className="text-xs md:text-sm font-bold text-slate-900">Robo-Advisor</span>
                </div>
              </div>
            </div>
            {ROWS.map((row, i) => (
              <div key={i} className={`grid grid-cols-3 border-b border-slate-100 last:border-b-0 ${i % 2 === 0 ? "" : "bg-slate-50/50"}`}>
                <div className="p-2.5 md:p-4 flex items-start">
                  <span className="text-[0.62rem] md:text-xs font-bold text-slate-700">{row.label}</span>
                </div>
                <div className="p-2.5 md:p-4 border-l border-slate-100">
                  <span className="text-[0.62rem] md:text-xs text-slate-600">{row.human}</span>
                </div>
                <div className="p-2.5 md:p-4 border-l border-slate-100">
                  <span className="text-[0.62rem] md:text-xs text-slate-600">{row.robo}</span>
                </div>
              </div>
            ))}
          </div>

          {/* When to use both */}
          <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 md:p-6 mb-6 md:mb-10">
            <h2 className="text-base md:text-lg font-bold text-violet-900 mb-2 flex items-center gap-2">
              <Icon name="layers" size={20} className="text-violet-600" />
              The Best of Both Worlds
            </h2>
            <p className="text-xs md:text-sm text-violet-800 leading-relaxed mb-3">
              Many sophisticated investors use both. The financial planner provides a one-off SOA ($3,300) that maps out your strategy —
              asset allocation, tax structure, insurance needs, super strategy. Then you implement through a robo-advisor at 0.2–0.5%/year
              instead of paying the planner $5,000+/year for ongoing management. Annual check-in with the planner ($500–$1,000) to adjust.
            </p>
            <p className="text-xs md:text-sm text-violet-800 leading-relaxed">
              <strong>Total cost:</strong> ~$1,000–$2,000/year vs $5,000–$10,000/year for full planner management. You get the strategic advice
              without paying for portfolio management a robot does better anyway.
            </p>
          </div>

          {/* Decision tree */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-6 mb-6 md:mb-10">
            <h2 className="text-base md:text-lg font-bold text-slate-900 mb-3">Quick Decision Guide</h2>
            <div className="space-y-2.5">
              {[
                { q: "I just want to invest and forget about it", a: "Robo-advisor", link: "/best/robo-advisors" },
                { q: "I need help with tax, insurance, and estate planning", a: "Financial planner", link: "/advisors?type=financial_planner" },
                { q: "I have $500k+ and want to minimise CGT", a: "Financial planner (tax savings > fees)", link: "/advisors?type=financial_planner" },
                { q: "I'm starting with $5k–$50k", a: "Robo-advisor (planner fees too high relative to balance)", link: "/best/robo-advisors" },
                { q: "I want strategy advice but don't want to pay for ongoing management", a: "One-off SOA from planner + robo execution", link: "/advisors?type=financial_planner" },
              ].map((item, i) => (
                <Link key={i} href={item.link} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors group">
                  <span className="text-slate-400 text-xs font-bold mt-0.5 shrink-0">Q:</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs md:text-sm text-slate-700">{item.q}</div>
                    <div className="text-xs md:text-sm font-bold text-slate-900 mt-0.5 group-hover:text-blue-700">{item.a} →</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* FAQs */}
          <div className="mb-6 md:mb-10">
            <h2 className="text-base md:text-lg font-bold text-slate-900 mb-3">FAQs</h2>
            <div className="space-y-2">
              {[
                { q: "Is a robo-advisor as good as a financial planner?", a: "For basic diversified investing, yes — often better value. But robos can't help with tax, insurance, estate planning, or complex decisions." },
                { q: "How much does a financial planner cost?", a: "SOA: $2,500–$5,500. Ongoing: $2,000–$8,000/year. Fee-for-service planners charge directly — no commissions." },
                { q: "Can I use both?", a: "Yes — planner for strategy, robo for low-cost execution. Many sophisticated investors do this to get advice without overpaying for management." },
              ].map((faq, i) => (
                <details key={i} className="bg-white border border-slate-200 rounded-lg group">
                  <summary className="px-3.5 py-3 font-semibold text-xs md:text-sm text-slate-800 cursor-pointer hover:bg-slate-50 transition-colors list-none flex items-center justify-between">
                    {faq.q}
                    <span className="text-slate-400 group-open:rotate-180 transition-transform ml-2 shrink-0">▾</span>
                  </summary>
                  <p className="px-3.5 pb-3 text-xs md:text-sm text-slate-600 leading-relaxed">{faq.a}</p>
                </details>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
            <AdvisorPrompt type="financial_planner" heading="Find a Financial Planner" description="Browse verified planners near you." />
            <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
              <h3 className="text-sm font-bold text-violet-900 mb-1">Compare Robo-Advisors</h3>
              <p className="text-xs text-violet-700 mb-3">See fees and features side-by-side.</p>
              <Link href="/best/robo-advisors" className="text-xs font-bold text-violet-700 hover:text-violet-900">Compare Robo-Advisors →</Link>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Related Guides</h3>
            <div className="flex flex-wrap gap-2">
              <Link href="/advisor-guides/how-to-choose-financial-planner" className="text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 font-medium text-slate-600">How to Choose a Financial Planner</Link>
              <Link href="/advisor-guides/compare" className="text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 font-medium text-slate-600">SMSF Accountant vs Financial Planner</Link>
              <Link href="/best/robo-advisors" className="text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 font-medium text-slate-600">Best Robo-Advisors</Link>
            </div>
          </div>
        </div>
      </article>
    </>
  );
}
