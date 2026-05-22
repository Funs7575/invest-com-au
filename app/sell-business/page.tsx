import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import Icon from "@/components/Icon";
import HubAdvisorCTA from "@/components/HubAdvisorCTA";

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

const sellBusinessFaqLd = faqJsonLd([
  {
    q: "How do I value my business for sale in Australia?",
    a: "Business valuation methods vary by type. Profitable service businesses are typically valued at 2–5× EBITDA (earnings before interest, tax, depreciation, amortisation). Retail and trade businesses typically use a multiple of seller's discretionary earnings (SDE) of 1.5–3×. SaaS and recurring-revenue tech businesses may command 3–8× ARR. Asset-heavy businesses (manufacturing, property) use asset-based approaches. A formal independent valuation by a qualified business valuation specialist gives a defensible number for negotiations with buyers and for tax structuring purposes.",
  },
  {
    q: "What is the small business CGT concession for selling a business in Australia?",
    a: "The small business CGT concessions can significantly reduce or eliminate CGT on the sale of a qualifying business asset. The 15-year exemption allows complete CGT exemption if you've owned the asset for 15+ years and are over 55 or retiring. The 50% active asset reduction applies if the business asset is an 'active asset' used in the business. The retirement exemption allows up to $500,000 lifetime cap to be excluded from CGT if proceeds are contributed to super. All require that your aggregated turnover is under $2M or net assets under $6M.",
  },
  {
    q: "How long does it take to sell a business in Australia?",
    a: "The typical timeline is 6–18 months from listing to settlement. Key phases: preparation and valuation (1–3 months), confidential marketing and initial expressions of interest (2–4 months), due diligence (1–3 months), negotiation and heads of agreement (2–4 weeks), formal legal contracts and settlement (4–8 weeks). Complex businesses with regulatory licences, franchisor approvals, or significant property interests take longer. Working with a business broker and M&A lawyer from the outset reduces surprises.",
  },
  {
    q: "What is a business broker and should I use one?",
    a: "A business broker facilitates the sale of small to medium businesses — similar to a real estate agent for property. They assist with valuation, confidential marketing, buyer screening, negotiation, and transaction management. Fees are typically 5–10% of the sale price (declining to 2–3% for larger transactions). For most owner-operators, a broker pays for themselves by securing a higher price, running a wider competitive process, maintaining confidentiality, and allowing the owner to keep running the business. Businesses below $300K sale price are often sold without a broker.",
  },
]);

export default function SellBusinessHubPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Sell a Business", url: absoluteUrl("/sell-business") },
  ]);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(sellBusinessFaqLd) }} />
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

        <HubAdvisorCTA
          heading="Get a free business valuation consultation"
          subheading="A specialist broker will run a market-comparable analysis on your industry and provide an indicative range — usually within one business day."
          intent={{ need: "planning", context: ["estate_planning"] }}
          source="sell_business_hub"
          ctaLabel="Get matched with a broker"
          extraFields={[
            { name: "industry", label: "Industry" },
            { name: "annual_revenue", label: "Annual revenue (AUD)", type: "number" },
          ]}
          className="py-12 bg-white"
        />

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
