import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, absoluteUrl } from "@/lib/seo";
import Icon from "@/components/Icon";
import HubLeadForm from "@/components/leads/HubLeadForm";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Selling a Business in Australia: Complete ${CURRENT_YEAR} Guide | Invest.com.au`,
  description:
    "From valuation to settlement: prepare, price, market and negotiate the sale of an Australian SME. Small-business CGT concessions, broker fees and the 12-month plan.",
  alternates: { canonical: `${SITE_URL}/sell-business` },
  openGraph: {
    title: `Selling a Business in Australia: Complete ${CURRENT_YEAR} Guide`,
    description: "Valuation, broker selection, CGT concessions and the 12-month exit plan.",
    url: `${SITE_URL}/sell-business`,
    type: "website",
  },
};

export default function SellBusinessHubPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Sell a Business", url: absoluteUrl("/sell-business") },
  ]);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <div className="bg-white min-h-screen">
        <section className="bg-slate-900 text-white py-10 md:py-14">
          <div className="container-custom">
            <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-5" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-white">Home</Link>
              <span className="text-slate-600">/</span>
              <span className="text-white font-medium">Sell a Business</span>
            </nav>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-3 max-w-3xl">
              Selling a Business in Australia: Complete {CURRENT_YEAR} Guide
            </h1>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-3xl mb-6">
              From valuation to settlement. Get matched with a specialist business broker, understand the small-business CGT concessions, and access Australia&rsquo;s most active buyer pool.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl">
              {[
                { v: "3–8%", l: "Broker commission", sub: "based on sale price" },
                { v: "6–12 mo", l: "Typical time to sell", sub: "from listing to settlement" },
                { v: "$1.615M", l: "CGT concessions", sub: "lifetime cap (small business)" },
                { v: "12 mo", l: "Recommended prep", sub: "before going to market" },
              ].map((s) => (
                <div key={s.l} className="bg-white/10 border border-white/10 rounded-lg px-3 py-2.5">
                  <dt className="text-[10px] font-bold uppercase text-slate-400 tracking-wide">{s.l}</dt>
                  <dd className="text-xl md:text-2xl font-extrabold text-white mt-0.5">{s.v}</dd>
                  <p className="text-[10px] text-slate-400 mt-0.5">{s.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-12 bg-white">
          <div className="container-custom max-w-6xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">Where do you want to start?</h2>
            <p className="text-sm text-slate-600 mb-6">Four pathways — the one you need depends on how far along you are.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { title: "What's my business worth?", desc: "EBITDA, revenue and asset-based valuation in 60 seconds.", href: "/sell-business/valuation", icon: "calculator" },
                { title: "Find a business broker", desc: "Specialist brokers by industry and deal size.", href: "/advisors/business-brokers", icon: "users" },
                { title: "Exit planning checklist", desc: "12-month preparation roadmap, interactive.", href: "/sell-business/checklist", icon: "clipboard-list" },
                { title: "CGT & tax on sale", desc: "Small-business concessions explained — up to $1.615M lifetime.", href: "/article/selling-a-business-australia-guide", icon: "scale" },
              ].map((c) => (
                <Link key={c.href} href={c.href} className="group rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 p-5 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center mb-3"><Icon name={c.icon} size={20} className="text-amber-700" /></div>
                  <h3 className="font-extrabold text-slate-900 group-hover:text-amber-700 mb-1">{c.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{c.desc}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">The 7-step sale process</h2>
            <p className="text-sm text-slate-600 mb-6">A clean sale takes 6–12 months from broker engagement to settlement. Most failed deals collapse in due diligence — handled in step 6.</p>
            <ol className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                "Valuation",
                "Preparation",
                "Find broker",
                "Marketing",
                "Negotiation",
                "Due diligence",
                "Settlement",
              ].map((s, i) => (
                <li key={s} className="rounded-xl border border-slate-200 bg-white p-4 flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-amber-500 text-slate-900 flex items-center justify-center font-extrabold shrink-0">{i + 1}</span>
                  <span className="text-sm font-bold text-slate-900">{s}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="py-12 bg-white">
          <div className="container-custom max-w-2xl">
            <HubLeadForm
              heading="Get a free business valuation consultation"
              subheading="A specialist broker will run a market-comparable analysis on your industry and provide an indicative range — usually within one business day."
              intent={{ need: "planning", context: ["estate_planning"] }}
              source="sell_business_hub"
              ctaLabel="Get matched with a broker"
              extraFields={[
                { name: "industry", label: "Industry" },
                { name: "annual_revenue", label: "Annual revenue (AUD)", type: "number" },
              ]}
            />
          </div>
        </section>

        <section className="py-10 bg-slate-50 border-t border-slate-200">
          <div className="container-custom max-w-4xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <Link href="/article/selling-a-business-australia-guide" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Sale process deep-dive →</Link>
              <Link href="/article/business-valuation-methods-australia" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Valuation methods →</Link>
              <Link href="/invest/buy-business" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Buyer-side context →</Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
