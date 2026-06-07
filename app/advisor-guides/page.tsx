import Link from "next/link";
import type { Metadata } from "next";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR } from "@/lib/seo";
import Icon from "@/components/Icon";
import { faqJsonLd } from "@/lib/schema-markup";

const ADVISOR_GUIDES_FAQS = [
  {
    q: "What is the difference between a financial planner and a financial advisor in Australia?",
    a: "In Australia, the terms are largely interchangeable in common usage, but there are regulatory distinctions. A 'financial adviser' is a registered individual who holds (or operates as an authorised representative under) an AFSL and is registered on the Financial Advisers Register. 'Financial planner' is a common professional title but not a regulated term — anyone can use it. The relevant regulated designation is 'financial adviser'. Since the Hayne Royal Commission, advisers must hold a relevant degree, pass the FASEA exam, complete CPD, and have a clean conduct record. Look for registration on the ASIC Financial Advisers Register before engaging anyone.",
  },
  {
    q: "When do I need a financial planner versus doing it myself?",
    a: "DIY investing (buying ETFs, managing your own super in a retail fund) works well for most people with straightforward finances. A financial planner adds the most value when: you have complex tax considerations (CGT events, investment structure, deductions); you're planning for retirement and need to sequence super, pension, and other income streams; you have an inheritance or windfall to deploy; you're starting an SMSF; you need insurance coverage analysis; or you're facing a major life event (divorce, redundancy, business sale). For straightforward portfolio building, a robo-advisor or index fund is often adequate without paying 1–2%/yr in advice fees.",
  },
  {
    q: "How much does a financial advisor cost in Australia?",
    a: "Expect to pay $3,000–$6,000 for a comprehensive financial plan (Statement of Advice) from a fee-for-service advisor. Ongoing advice retainers typically run $2,000–$5,000 per year. Some advisors still charge asset-based fees (0.5–1.5% of portfolio per year), which can be very expensive on larger balances. ASIC requires fee disclosure in the advice document. Single-issue or limited advice (e.g. superannuation-only advice) is cheaper — $500–$2,000. Be wary of 'free advice' that's actually product-led distribution — true fee-for-service advisors are paid only by the client, not by product manufacturers.",
  },
  {
    q: "Do I need a mortgage broker or should I go directly to a bank?",
    a: "Mortgage brokers have access to 30–50+ lenders and can match you to a lender whose criteria best fits your situation (employment type, credit history, deposit size, property type). This is especially valuable for non-standard borrowers — self-employed, those with thin credit history, or buying unusual property types. Brokers are paid by the lender (upfront and trail commission), not by you, so their service is free to you — but this means you should verify they're recommending the best product, not the highest-commission one. Going directly to a bank makes sense if you have a strong existing relationship and the bank's product is competitive.",
  },
];

const advisorGuidesFaqLd = faqJsonLd(ADVISOR_GUIDES_FAQS);

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Advisor Guides (${CURRENT_YEAR})`,
  description: "Choose the right financial professional. Compare SMSF accountants, financial planners, tax agents and mortgage brokers — qualifications, costs and more.",
  alternates: { canonical: "/advisor-guides" },
  openGraph: {
    title: "Advisor Guides",
    description: "How to choose the right financial professional for your needs.",
    images: [{ url: "/api/og?title=Advisor+Guides&subtitle=Choose+the+Right+Professional&type=default", width: 1200, height: 630 }],
  },
};

const guides = [
  { slug: "smsf-accountant-vs-diy", title: "SMSF Accountant vs DIY", desc: "When you need professional SMSF help vs managing it yourself", icon: "briefcase" },
  { slug: "financial-planner-vs-robo-advisor", title: "Financial Planner vs Robo-Advisor", desc: "Human advice vs algorithmic investing — which suits you?", icon: "users" },
  { slug: "mortgage-broker-vs-bank", title: "Mortgage Broker vs Bank", desc: "Should you go direct to a bank or use a broker?", icon: "home" },
  { slug: "tax-agent-vs-accountant", title: "Tax Agent vs Accountant", desc: "Understanding the difference and when you need each", icon: "file-text" },
  { slug: "buyers-agent-vs-diy", title: "Buyer's Agent vs DIY", desc: "Is a buyer's agent worth the cost for property investing?", icon: "map-pin" },
  { slug: "compare", title: "SMSF Accountant vs Financial Planner", desc: "Side-by-side comparison of qualifications, costs, and roles", icon: "bar-chart" },
];

export default function AdvisorGuidesPage() {
  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Advisor Guides" },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      {advisorGuidesFaqLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(advisorGuidesFaqLd) }} />
      )}
      <div className="py-5 md:py-12">
        <div className="container-custom max-w-4xl">
          <nav aria-label="Breadcrumb" className="text-xs md:text-sm text-slate-500 mb-3 md:mb-6">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span className="mx-1.5 md:mx-2">/</span>
            <span className="text-slate-700">Advisor Guides</span>
          </nav>

          <h1 className="text-2xl md:text-4xl font-extrabold text-slate-900 mb-2">Advisor Guides</h1>
          <p className="text-sm md:text-base text-slate-500 mb-8 max-w-2xl">
            Not sure which type of financial professional you need? These guides break down the differences in qualifications, costs, and when to use each.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {guides.map(g => (
              <Link key={g.slug} href={`/advisor-guides/${g.slug}`} className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-lg hover:border-violet-200 hover:-translate-y-0.5 transition-all duration-200 group">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-violet-50 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-violet-100 transition-colors">
                    <Icon name={g.icon} size={18} className="text-violet-600" />
                  </div>
                  <div>
                    <h2 className="text-sm md:text-base font-bold text-slate-900 group-hover:text-violet-700 transition-colors">{g.title}</h2>
                    <p className="text-xs text-slate-500 mt-1">{g.desc}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-10 pt-6 border-t border-slate-200">
            <h2 className="text-base font-bold text-slate-900 mb-4">Frequently asked questions</h2>
            <div className="space-y-3">
              {ADVISOR_GUIDES_FAQS.map((faq) => (
                <details key={faq.q} className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden group">
                  <summary className="px-5 py-4 text-sm font-bold text-slate-900 cursor-pointer hover:bg-slate-100 flex items-center justify-between">
                    {faq.q}
                    <span className="text-slate-400 group-open:rotate-180 transition-transform ml-2 shrink-0">▾</span>
                  </summary>
                  <div className="px-5 pb-4">
                    <p className="text-sm text-slate-600 leading-relaxed">{faq.a}</p>
                  </div>
                </details>
              ))}
            </div>
          </div>

          <div className="mt-8 bg-violet-50 border border-violet-200 rounded-xl p-5 text-center">
            <h3 className="text-base font-bold text-slate-900 mb-1">Still not sure?</h3>
            <p className="text-sm text-slate-500 mb-4">Answer 3 quick questions and we&apos;ll match you with the right type of professional.</p>
            <Link href="/find-advisor" className="inline-block px-6 py-2.5 bg-violet-600 text-white text-sm font-bold rounded-lg hover:bg-violet-700 transition-colors">
              Find My Advisor →
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
