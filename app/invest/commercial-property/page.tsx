import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import Icon from "@/components/Icon";
import SectionHeading from "@/components/SectionHeading";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Commercial Property Investment Australia (${CURRENT_YEAR}) — Invest.com.au`,
  description:
    "Guide to commercial property investment in Australia. Office, industrial, retail, and hotel assets. Yields, FIRB rules, A-REITs, and direct investment pathways.",
  alternates: { canonical: `${SITE_URL}/invest/commercial-property` },
  openGraph: {
    title: `Commercial Property Investment Australia (${CURRENT_YEAR})`,
    description:
      "Office, industrial, retail, and hotel assets. Yields, FIRB rules, and direct investment pathways.",
    url: `${SITE_URL}/invest/commercial-property`,
  },
};

export default function CommercialPropertyPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: `${SITE_URL}/invest` },
    { name: "Commercial Property" },
  ]);

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />

      {/* Hero */}
      <section className="relative bg-white border-b border-slate-100 overflow-hidden py-8 md:py-12">
        <div className="container-custom">
          <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-6" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-slate-900 transition-colors">Home</Link>
            <Icon name="chevron-right" size={12} className="text-slate-300" />
            <Link href="/invest" className="hover:text-slate-900 transition-colors">Invest</Link>
            <Icon name="chevron-right" size={12} className="text-slate-300" />
            <span className="text-slate-900 font-medium">Commercial Property</span>
          </nav>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-xs font-semibold bg-amber-500 text-slate-900 px-3 py-1 rounded-full">
              Updated {CURRENT_YEAR}
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-4 max-w-3xl text-slate-900">
            Commercial Property Investment in Australia
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed max-w-2xl mb-8">
            From Sydney CBD office towers to Perth industrial sheds. Commercial property offers higher yields than residential with long lease terms and institutional-quality tenants.
          </p>

          <Link
            href="/invest/commercial-property/listings"
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-base px-7 py-3.5 rounded-xl transition-colors shadow-lg"
          >
            Browse Commercial Properties
            <Icon name="arrow-right" size={18} />
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="py-10 bg-white border-b border-slate-100">
        <div className="container-custom">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { value: "5.5–7%", label: "Office prime yield" },
              { value: "4.5–5.5%", label: "Industrial prime yield" },
              { value: "<3%", label: "Industrial vacancy (record low)" },
              { value: "$268M", label: "FIRB threshold (developed)" },
            ].map((s) => (
              <div key={s.label} className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center">
                <p className="text-2xl font-extrabold text-amber-600">{s.value}</p>
                <p className="text-xs text-slate-600 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <SectionHeading
            eyebrow="Asset classes"
            title="Types of Commercial Property"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-12">
            {[
              {
                icon: "building",
                title: "Office",
                detail: "Sydney CBD, Melbourne Docklands, Brisbane CBD, Perth CBD. Prime yields 5.5–7%. Vacancy elevated post-COVID (12–17% in major CBDs) but prime assets resilient. A-Grade leases 5–10 years.",
              },
              {
                icon: "briefcase",
                title: "Industrial & Logistics",
                detail: "Strongest performer — national vacancy <3% (record low). E-commerce demand, supply chain reshoring. Key nodes: outer-western Sydney, Melbourne's west, Brisbane south. Prime yield 4.5–5.5%.",
              },
              {
                icon: "star",
                title: "Retail",
                detail: "Neighbourhood and sub-regional centres outperform (convenience anchor). Large regional malls facing structural headwinds. Strip retail in premium suburbs resilient. Yields 5–7%.",
              },
              {
                icon: "globe",
                title: "Hotels & Hospitality",
                detail: "Tourism recovery tracking 90%+ of 2019 levels. International travel rebuilt. Major operators: Accor, IHG, Hilton. Yields 5–7%. Strata hotel rooms offer lower entry point.",
              },
              {
                icon: "zap",
                title: "Data Centres",
                detail: "Fastest growing commercial property sector globally. Sydney and Melbourne as Asia-Pacific hubs. AI/cloud demand driving development pipeline. Limited supply vs demand.",
              },
              {
                icon: "trending-up",
                title: "Healthcare Property",
                detail: "Medical centres, private hospitals, aged care facilities. Long WALE (weighted average lease expiry). Government-backed tenants (Medicare, PBS). Defensive income profile.",
              },
            ].map((item) => (
              <div key={item.title} className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex gap-4">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon name={item.icon} size={20} className="text-blue-700" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 mb-1">{item.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>

          <SectionHeading
            eyebrow="Investment pathways"
            title="How to Invest in Commercial Property"
          />

          <div className="prose prose-slate max-w-none mb-12">
            <h3>1. Direct Ownership</h3>
            <p>
              Purchase a commercial property outright or via a special purpose vehicle (SPV). Requires significant capital (typically $1M+) but provides direct control, capital growth exposure, and rental income. Foreign buyers require FIRB approval for acquisitions above the relevant threshold.
            </p>

            <h3>2. Listed A-REITs (Most Accessible)</h3>
            <p>
              Australian Real Estate Investment Trusts (A-REITs) listed on the ASX provide diversified commercial property exposure. Major A-REITs:
            </p>
            <ul>
              <li><strong>Goodman Group</strong> — industrial/logistics, global</li>
              <li><strong>Dexus</strong> — office and industrial, Sydney and Melbourne</li>
              <li><strong>Charter Hall</strong> — diversified (office, industrial, retail)</li>
              <li><strong>Scentre Group</strong> — Westfield shopping centres</li>
              <li><strong>GPT Group</strong> — diversified, ASX-listed</li>
            </ul>

            <h3>3. Unlisted Property Funds</h3>
            <p>
              Wholesale property funds managed by institutions (Dexus, Charter Hall, AMP, BlackRock). Typically require $500K minimum investment. Quarterly distributions. Less liquid than REITs but often at premium to NAV. SIV-complying versions available.
            </p>

            <h3>4. Syndicates</h3>
            <p>
              Commercial property syndicates pool capital from 20–100 investors to acquire a single asset. Entry typically $50K–$200K. Registered with ASIC as a managed investment scheme. Liquidity is limited to end of fund term (typically 5–7 years).
            </p>

            <h3>FIRB for Commercial Property</h3>
            <ul>
              <li><strong>Developed commercial land</strong> — $268M general threshold; $1.35B for IFA countries (US, UK, Japan, Canada, South Korea)</li>
              <li><strong>Vacant commercial land</strong> — any amount requires FIRB approval regardless of value</li>
              <li><strong>Developed residential</strong> — foreign buyers may only purchase new dwellings (ban on established dwellings 2025–2027)</li>
            </ul>
          </div>

          {/* Yield guide */}
          <SectionHeading eyebrow="Market data" title="Commercial Property Yield Guide" />
          <div className="overflow-x-auto mb-10">
            <table className="w-full text-sm border border-slate-200 rounded-xl overflow-hidden">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-3 font-semibold text-slate-700">Asset Class</th>
                  <th className="text-left p-3 font-semibold text-slate-700">Prime Yield</th>
                  <th className="text-left p-3 font-semibold text-slate-700">Secondary Yield</th>
                  <th className="text-left p-3 font-semibold text-slate-700">Key Markets</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  { asset: "Office (CBD)", prime: "5.5–7.0%", secondary: "7.5–9.0%", markets: "Sydney, Melbourne, Brisbane" },
                  { asset: "Industrial", prime: "4.5–5.5%", secondary: "5.5–7.0%", markets: "Outer Sydney, Melbourne West" },
                  { asset: "Retail (Neighbourhood)", prime: "5.5–6.5%", secondary: "7.0–9.0%", markets: "All capitals" },
                  { asset: "Hotel", prime: "5.0–7.0%", secondary: "7.0–9.0%", markets: "Sydney, Melbourne, Gold Coast" },
                  { asset: "Data Centre", prime: "5.0–6.0%", secondary: "N/A", markets: "Sydney, Melbourne" },
                ].map((row) => (
                  <tr key={row.asset} className="bg-white hover:bg-slate-50">
                    <td className="p-3 font-medium text-slate-900">{row.asset}</td>
                    <td className="p-3 text-green-700 font-semibold">{row.prime}</td>
                    <td className="p-3 text-slate-600">{row.secondary}</td>
                    <td className="p-3 text-slate-500">{row.markets}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 bg-white border-t border-slate-100">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-xl p-8 text-center">
            <h2 className="text-2xl font-extrabold text-slate-900 mb-3">Browse Commercial Properties for Sale</h2>
            <p className="text-slate-500 text-sm mb-6 max-w-xl mx-auto">
              Office, industrial, retail, and hotel assets with yield data, location details, and direct enquiry.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/invest/commercial-property/listings"
                className="inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-6 py-3 rounded-xl transition-colors text-sm"
              >
                Browse Commercial Properties
                <Icon name="arrow-right" size={16} />
              </Link>
              <Link
                href="/advisors"
                className="inline-flex items-center justify-center gap-2 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold px-6 py-3 rounded-xl transition-colors text-sm"
              >
                Browse Property Professionals
            </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
