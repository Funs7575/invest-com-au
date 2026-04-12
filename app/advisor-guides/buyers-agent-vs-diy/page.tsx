import Link from "next/link";
import type { Metadata } from "next";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR } from "@/lib/seo";
import Icon from "@/components/Icon";
import AdvisorPrompt from "@/components/AdvisorPrompt";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Buyers Agent vs DIY Property Search: Is It Worth the Cost? (${CURRENT_YEAR})`,
  description: "Is a buyers agent worth $15k-$25k? We break down the real costs, savings, and when hiring a buyers agent makes financial sense vs searching yourself.",
  openGraph: {
    title: "Buyers Agent vs DIY Property Search",
    description: "Buyers agent fees vs DIY: real cost comparison, negotiation savings, and when each approach makes sense.",
    images: [{ url: "/api/og?title=Buyers+Agent+vs+DIY&subtitle=Is+it+worth+the+cost%3F&type=default", width: 1200, height: 630 }],
  },
  alternates: { canonical: "/advisor-guides/buyers-agent-vs-diy" },
};

const ROWS = [
  { label: "Upfront cost", agent: "$10,000–$25,000 (or 1.5–3% of purchase)", diy: "$0 (your time only)" },
  { label: "Time required", agent: "2-5 hours of your time (briefing + inspections)", diy: "100-300+ hours over months of searching" },
  { label: "Off-market access", agent: "Yes — relationships with agents and developers", diy: "Limited to publicly listed properties" },
  { label: "Negotiation", agent: "Professional — knows agent tactics and market data", diy: "You negotiate directly (emotional involvement risk)" },
  { label: "Due diligence", agent: "Comprehensive — building, pest, strata, zoning checks", diy: "You coordinate everything yourself" },
  { label: "Market knowledge", agent: "Deep local expertise, comparable sales data, growth drivers", diy: "Self-research via Domain, REA, and free tools" },
  { label: "Emotional detachment", agent: "Objective — won't overpay because they 'love the kitchen'", diy: "Hard to stay rational on your dream home" },
  { label: "Typical savings", agent: "$20k–$80k in negotiation savings (industry avg)", diy: "$0 in fees but potential overpayment risk" },
  { label: "Auction bidding", agent: "Experienced bidder with pre-set strategy", diy: "Stressful — easy to get caught in bidding wars" },
  { label: "Post-purchase", agent: "Settlement coordination, tenant placement for investment", diy: "You handle everything" },
];

export default function BuyersAgentVsDiyPage() {
  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Find an Advisor", url: absoluteUrl("/advisors") },
    { name: "Buyers Agent vs DIY" },
  ]);

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      { "@type": "Question", name: "How much does a buyers agent cost in Australia?", acceptedAnswer: { "@type": "Answer", text: "Most charge 1.5-3% of the purchase price or a fixed fee of $10,000-$25,000. On an $800,000 property, expect $12,000-$24,000. Some charge a retainer ($2,000-$5,000) plus a success fee on settlement." } },
      { "@type": "Question", name: "Do buyers agents actually save you money?", acceptedAnswer: { "@type": "Answer", text: "Industry data suggests buyers agents negotiate an average of $20,000-$80,000 below what buyers would pay on their own, which typically exceeds their fee. They also save significant time (100+ hours) and reduce the risk of costly mistakes." } },
      { "@type": "Question", name: "Can I claim buyers agent fees as a tax deduction?", acceptedAnswer: { "@type": "Answer", text: "For investment properties, buyers agent fees are generally not immediately tax-deductible but are added to the cost base of the property, reducing your CGT when you eventually sell. For your home (PPOR), the fee is not deductible." } },
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
            <span className="text-slate-700">Buyers Agent vs DIY</span>
          </nav>

          <h1 className="text-xl md:text-4xl font-extrabold text-slate-900 mb-2 md:mb-4 leading-tight">
            Buyers Agent vs DIY Property Search
          </h1>
          <p className="text-sm md:text-lg text-slate-500 mb-6 md:mb-10 leading-relaxed">
            A buyers agent costs $10k–$25k. Is it worth it — or are you better off doing the legwork yourself?
          </p>

          {/* ROI calculator teaser */}
          <div className="grid grid-cols-2 gap-3 mb-6 md:mb-10">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 md:p-5 text-center">
              <div className="text-lg md:text-2xl font-extrabold text-emerald-700">$20k–$80k</div>
              <div className="text-[0.58rem] md:text-xs text-emerald-600">Average negotiation savings</div>
            </div>
            <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 md:p-5 text-center">
              <div className="text-lg md:text-2xl font-extrabold text-violet-700">100+ hrs</div>
              <div className="text-[0.58rem] md:text-xs text-violet-600">Time saved on searching</div>
            </div>
          </div>

          {/* Comparison table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-6 md:mb-10">
            <div className="grid grid-cols-3 bg-slate-50 border-b border-slate-200">
              <div className="p-2.5 md:p-4" />
              <div className="p-2.5 md:p-4 text-center border-l border-slate-200">
                <div className="flex items-center justify-center gap-1.5 mb-0.5">
                  <Icon name="search" size={14} className="text-slate-600" />
                  <span className="text-xs md:text-sm font-bold text-slate-900">Buyers Agent</span>
                </div>
              </div>
              <div className="p-2.5 md:p-4 text-center border-l border-slate-200">
                <div className="flex items-center justify-center gap-1.5 mb-0.5">
                  <Icon name="user" size={14} className="text-slate-600" />
                  <span className="text-xs md:text-sm font-bold text-slate-900">DIY Search</span>
                </div>
              </div>
            </div>
            {ROWS.map((row, i) => (
              <div key={i} className={`grid grid-cols-3 border-b border-slate-100 last:border-b-0 ${i % 2 === 0 ? "" : "bg-slate-50/50"}`}>
                <div className="p-2.5 md:p-4 flex items-start">
                  <span className="text-[0.62rem] md:text-xs font-bold text-slate-700">{row.label}</span>
                </div>
                <div className="p-2.5 md:p-4 border-l border-slate-100">
                  <span className="text-[0.62rem] md:text-xs text-slate-600">{row.agent}</span>
                </div>
                <div className="p-2.5 md:p-4 border-l border-slate-100">
                  <span className="text-[0.62rem] md:text-xs text-slate-600">{row.diy}</span>
                </div>
              </div>
            ))}
          </div>

          {/* When worth it */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 md:p-6 mb-6 md:mb-10">
            <h2 className="text-base md:text-lg font-bold text-emerald-900 mb-2 flex items-center gap-2">
              <Icon name="check-circle" size={20} className="text-emerald-600" />
              A Buyers Agent Is Worth It When
            </h2>
            <ul className="space-y-1.5 text-xs md:text-sm text-emerald-800">
              <li className="flex items-start gap-2"><span className="text-emerald-600 mt-0.5">&#x2713;</span> Buying interstate or in an unfamiliar market (local knowledge is critical)</li>
              <li className="flex items-start gap-2"><span className="text-emerald-600 mt-0.5">&#x2713;</span> Purchasing an investment property (ROI focus, not emotional)</li>
              <li className="flex items-start gap-2"><span className="text-emerald-600 mt-0.5">&#x2713;</span> Budget over $750k (1-3% fee is worth it for negotiation savings)</li>
              <li className="flex items-start gap-2"><span className="text-emerald-600 mt-0.5">&#x2713;</span> You&apos;re time-poor (senior professionals, business owners)</li>
              <li className="flex items-start gap-2"><span className="text-emerald-600 mt-0.5">&#x2713;</span> Competitive market with multiple bidders (auction expertise matters)</li>
              <li className="flex items-start gap-2"><span className="text-emerald-600 mt-0.5">&#x2713;</span> SMSF property purchase (strict compliance requirements)</li>
            </ul>
          </div>

          {/* When DIY is fine */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 md:p-6 mb-6 md:mb-10">
            <h2 className="text-base md:text-lg font-bold text-blue-900 mb-2 flex items-center gap-2">
              <Icon name="thumbs-up" size={20} className="text-blue-600" />
              DIY Is Fine When
            </h2>
            <ul className="space-y-1.5 text-xs md:text-sm text-blue-800">
              <li className="flex items-start gap-2"><span className="text-blue-600 mt-0.5">&#x2713;</span> Buying in your own suburb where you know the market intimately</li>
              <li className="flex items-start gap-2"><span className="text-blue-600 mt-0.5">&#x2713;</span> Budget-conscious first-home buyer (the fee is a big % of your deposit)</li>
              <li className="flex items-start gap-2"><span className="text-blue-600 mt-0.5">&#x2713;</span> You enjoy the process and have time to dedicate to the search</li>
              <li className="flex items-start gap-2"><span className="text-blue-600 mt-0.5">&#x2713;</span> Buyer&apos;s market with low competition (less negotiation pressure)</li>
            </ul>
          </div>

          {/* Real cost example */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 md:p-6 mb-6 md:mb-10">
            <h2 className="text-base md:text-lg font-bold text-amber-900 mb-2 flex items-center gap-2">
              <Icon name="calculator" size={20} className="text-amber-600" />
              Real Cost Example: $800,000 Property
            </h2>
            <div className="grid grid-cols-2 gap-4 mt-3">
              <div>
                <p className="text-xs font-bold text-amber-900 mb-1">With Buyers Agent</p>
                <div className="space-y-1 text-xs text-amber-800">
                  <p>Agent fee: ~$16,000 (2%)</p>
                  <p>Negotiated price: ~$760,000</p>
                  <p className="font-bold">Net saving: ~$24,000</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-amber-900 mb-1">DIY Purchase</p>
                <div className="space-y-1 text-xs text-amber-800">
                  <p>Agent fee: $0</p>
                  <p>Paid price: ~$800,000</p>
                  <p className="font-bold">Time cost: 100+ hours</p>
                </div>
              </div>
            </div>
            <p className="text-[0.58rem] text-amber-600 mt-3">Illustrative example only. Actual savings vary based on market conditions and negotiation outcomes.</p>
          </div>

          {/* FAQs */}
          <div className="mb-6 md:mb-10">
            <h2 className="text-base md:text-lg font-bold text-slate-900 mb-3">Frequently Asked Questions</h2>
            <div className="space-y-2">
              {[
                { q: "How much does a buyers agent cost?", a: "Most charge 1.5-3% of purchase price or a fixed $10,000-$25,000. On an $800k property, expect $12,000-$24,000. Some offer retainer + success fee models." },
                { q: "Do buyers agents actually save you money?", a: "Industry data suggests average negotiation savings of $20k-$80k — typically exceeding their fee. They also save 100+ hours of search time." },
                { q: "Can I claim the fee as a tax deduction?", a: "For investment properties, the fee is added to your cost base (reduces CGT on sale). For your own home (PPOR), it's not deductible." },
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
            <AdvisorPrompt type="buyers_agent" heading="Find a Buyers Agent" description="Browse verified buyers agents across Australia." context="property" />
            <AdvisorPrompt type="property_advisor" heading="Property Strategy First?" description="Get advice on whether property fits your portfolio." context="property" />
          </div>

          {/* Related guides */}
          <div className="pt-6 border-t border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Related Guides</h3>
            <div className="flex flex-wrap gap-2">
              <Link href="/advisor-guides/how-to-choose-property-investment-advisor" className="text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors font-medium text-slate-600">Property Advisor Guide</Link>
              <Link href="/advisor-guides/mortgage-broker-vs-bank" className="text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors font-medium text-slate-600">Mortgage Broker vs Bank</Link>
              <Link href="/find-advisor" className="text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors font-medium text-slate-600">Find My Advisor Quiz</Link>
            </div>
          </div>

          <div className="mt-6 text-[0.56rem] md:text-xs text-slate-400 text-center leading-relaxed">
            This guide is for informational purposes only and does not constitute financial advice. Always verify a buyers agent holds a real estate licence in the relevant state.
          </div>
        </div>
      </article>
    </>
  );
}
