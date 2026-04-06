import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import Icon from "@/components/Icon";
import SectionHeading from "@/components/SectionHeading";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Invest in Australian Farmland & Agriculture (${CURRENT_YEAR}) — Invest.com.au`,
  description:
    "Guide to farmland investment in Australia. Cropping, grazing, dairy, horticulture, and water rights. FIRB rules for foreign buyers, typical returns, and state-by-state overview.",
  alternates: { canonical: `${SITE_URL}/invest/farmland` },
  openGraph: {
    title: `Invest in Australian Farmland & Agriculture (${CURRENT_YEAR})`,
    description:
      "Guide to farmland investment in Australia. FIRB rules, returns, property types, and water rights.",
    url: `${SITE_URL}/invest/farmland`,
  },
};

export default function FarmlandPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: `${SITE_URL}/invest` },
    { name: "Farmland" },
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
            <span className="text-slate-900 font-medium">Farmland</span>
          </nav>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-xs font-semibold bg-amber-500 text-slate-900 px-3 py-1 rounded-full">
              Updated {CURRENT_YEAR}
            </span>
            <span className="text-xs font-semibold bg-blue-600 text-white px-3 py-1 rounded-full">
              FIRB Applicable
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-4 max-w-3xl text-slate-900">
            Invest in Australian Farmland
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed max-w-2xl mb-8">
            Australia has 450 million hectares of agricultural land. From cropping and grazing to horticulture and water rights — a proven inflation hedge with strong long-run capital growth.
          </p>

          <Link
            href="/invest/farmland/listings"
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-base px-7 py-3.5 rounded-xl transition-colors shadow-lg"
          >
            Browse Farmland Listings
            <Icon name="arrow-right" size={18} />
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="py-10 bg-white border-b border-slate-100">
        <div className="container-custom">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { value: "450M", label: "hectares agricultural land" },
              { value: "13%", label: "foreign owned" },
              { value: "$15M", label: "FIRB threshold" },
              { value: "4–8%", label: "typical total return p.a." },
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
            eyebrow="Property types"
            title="Types of Agricultural Investment in Australia"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-12">
            {[
              { icon: "leaf", title: "Cropping Farms", detail: "Wheat, canola, barley, sorghum, and pulse crops. Predominantly in SA, WA, NSW, and QLD. Scale and rainfall are key factors." },
              { icon: "trending-up", title: "Livestock Stations", detail: "Cattle and sheep grazing. Large station country in NT, WA, and QLD. Long-run land appreciation. Beef exports strong." },
              { icon: "star", title: "Horticulture", detail: "Fruits, vegetables, nuts, and viticulture. Premium returns but higher operational complexity. VIC, QLD, SA, and WA regions." },
              { icon: "building", title: "Dairy Farms", detail: "VIC (Gippsland, Western Districts), SA, WA, and TAS. Regulated milk pricing. Consolidation trend — fewer but larger farms." },
              { icon: "dollar-sign", title: "Water Rights", detail: "Murray-Darling Basin water entitlements traded as a separate asset class. Foreign buyers need FIRB approval over $15M. Long-run capital appreciation." },
              { icon: "globe", title: "Agribusiness", detail: "Vertically integrated operations — processing, cold storage, export logistics. Higher capital but more defensible margin." },
            ].map((item) => (
              <div key={item.title} className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex gap-4">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon name={item.icon} size={20} className="text-green-700" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 mb-1">{item.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>

          <SectionHeading
            eyebrow="FIRB rules"
            title="Foreign Investment Rules for Agricultural Land"
          />

          <div className="prose prose-slate max-w-none mb-12">
            <p>
              All foreign persons (individuals, companies, and trusts) must seek FIRB approval before acquiring an interest in agricultural land with a cumulative value of $15M or more. This threshold is significantly lower than the $268M general commercial threshold.
            </p>

            <h3>Key FIRB Rules for Farmland</h3>
            <ul>
              <li><strong>$15M threshold</strong> — applies to cumulative agricultural land holdings. Once you exceed $15M total agricultural land, all subsequent acquisitions require approval</li>
              <li><strong>Water rights</strong> — separate $15M threshold for water entitlements acquired by foreign persons</li>
              <li><strong>"Marketed widely" requirement</strong> — vendor must have genuinely tested the Australian market before foreign buyer can acquire</li>
              <li><strong>Conditions</strong> — FIRB can impose local management, employment, or reporting obligations</li>
              <li><strong>Exemptions</strong> — certain FTA partner countries have higher thresholds (USA, NZ, Singapore, etc.)</li>
            </ul>

            <h3>ATO Land Register</h3>
            <p>
              The ATO maintains the Foreign Ownership Register for agricultural land. All foreign interests must register holdings even where FIRB approval is not required. Non-compliance attracts civil penalties.
            </p>

            <h3>State Overseas Land Registers</h3>
            <p>
              Separate state registers exist in NSW, QLD, SA, and WA. Compliance is required at both federal (FIRB/ATO) and state level.
            </p>

            <h3>Typical Returns</h3>
            <p>
              Rural property historically returns 4–8% per annum total return (cash income + capital appreciation). Water rights have appreciated significantly over the past decade. Agricultural assets provide natural inflation protection as a hard asset.
            </p>
          </div>

          {/* State guide */}
          <SectionHeading
            eyebrow="By state"
            title="Australia's Agricultural Regions"
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
            {[
              { state: "WA", types: "Wheat, canola, sheep, cattle, horticulture, viticulture", region: "Wheatbelt, Southwest" },
              { state: "QLD", types: "Cattle, sugar cane, cotton, sorghum, tropical horticulture", region: "Channel Country, Darling Downs" },
              { state: "NSW", types: "Cropping, cattle, sheep, cotton, viticulture", region: "Riverina, Central West, Northern Tablelands" },
              { state: "VIC", types: "Dairy, cropping, horticulture, viticulture, sheep", region: "Gippsland, Wimmera, Western Districts" },
              { state: "SA", types: "Cropping, wine grapes, sheep, horticulture", region: "Barossa, Coonawarra, Mid-North" },
              { state: "NT", types: "Cattle stations (largest holdings in Australia)", region: "Barkly Tableland, Victoria River District" },
            ].map((s) => (
              <div key={s.state} className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-lg font-extrabold text-green-700 mb-1">{s.state}</p>
                <p className="text-xs text-slate-500 mb-1">{s.region}</p>
                <p className="text-sm text-slate-700">{s.types}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 bg-white border-t border-slate-100">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-xl p-8 text-center">
            <h2 className="text-2xl font-extrabold text-slate-900 mb-3">Browse Farmland Listings</h2>
            <p className="text-slate-500 text-sm mb-6 max-w-xl mx-auto">
              Cropping, grazing, dairy, and horticulture properties for sale across Australia with FIRB guidance for foreign buyers.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/invest/farmland/listings"
                className="inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-6 py-3 rounded-xl text-sm"
              >
                Browse Farmland for Sale
                <Icon name="arrow-right" size={18} />
              </Link>
              <Link
                href="/find-advisor"
                className="inline-flex items-center justify-center gap-2 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold px-6 py-3 rounded-xl text-sm"
              >
                Browse Rural Professionals
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
