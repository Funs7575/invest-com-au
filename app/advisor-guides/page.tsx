import Link from "next/link";
import type { Metadata } from "next";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR } from "@/lib/seo";
import Icon from "@/components/Icon";

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
      <div className="py-5 md:py-12">
        <div className="container-custom max-w-4xl">
          <nav className="text-xs md:text-sm text-slate-500 mb-3 md:mb-6">
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
