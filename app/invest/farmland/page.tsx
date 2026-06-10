import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import Icon from "@/components/Icon";
import SectionHeading from "@/components/SectionHeading";
import DirectoryHero from "@/components/directory/DirectoryHero";
import { faqJsonLd } from "@/lib/schema-markup";

const FARMLAND_FAQS = [
  {
    q: "How do I invest in Australian farmland?",
    a: "Australian investors can access farmland through: (1) direct property purchase — buying a farm outright or in partnership, typically $1M+ entry point; (2) unlisted agricultural managed funds — pooled vehicles investing in cropping, grazing, horticulture, or timber (e.g. Laguna Bay, Kilter Rural); (3) ASX-listed agribusiness companies — Rural Funds Group (RFF), Elders, GrainCorp; or (4) fractional ownership platforms for smaller ticket sizes. Foreign buyers require FIRB approval for agricultural land above the threshold (A$15M for most countries; A$0 for sensitive land from certain nations).",
  },
  {
    q: "What returns can I expect from farmland investment in Australia?",
    a: "Australian farmland has historically returned 8–11% per annum total return — comprising 3–5% cash yield (rent or operating income) and 4–6% land value appreciation. Returns vary significantly by property type: irrigated horticulture and permanent crops (almonds, avocados, wine grapes) tend to yield higher cash returns; broadacre cropping and grazing land tends toward lower yields but steadier appreciation. Water rights in the Murray-Darling Basin can be volatile, adding risk and upside to irrigated holdings.",
  },
  {
    q: "Do foreign investors need FIRB approval to buy Australian farmland?",
    a: "Yes. Foreign persons (non-Australian citizens and non-permanent residents) must apply to FIRB (Foreign Investment Review Board) before purchasing an interest in Australian agricultural land if the cumulative value of the foreign person's agricultural land interests will exceed A$15 million for most countries (lower thresholds apply to some FTA partner countries). There is no minimum threshold for land in sensitive areas. Approval is typically granted with conditions, but FIRB can reject acquisitions deemed contrary to the national interest.",
  },
  {
    q: "What types of Australian farmland offer the best returns?",
    a: "Permanent crops (almonds, macadamias, wine grapes) in irrigated regions offer the highest cash yields (5–8% p.a.) but require water security and specialist management. Irrigated dairy land offers stable income tied to milk prices. Broadacre cropping (wheat, canola, barley) in the grain belt delivers leverage to commodity cycles. Grazing properties (beef, sheep) have lower yields but broad geographic availability. Carbon farming — converting marginal land to soil carbon or vegetation sequestration projects — is an emerging income layer that can be stacked on existing pastoral use.",
  },
];

const farmlandFaqLd = faqJsonLd(FARMLAND_FAQS);

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Invest in Australian Farmland & Agriculture (${CURRENT_YEAR})`,
  description:
    "Guide to farmland investment in Australia. Cropping, grazing, dairy, horticulture and water rights. FIRB rules, typical returns and access options.",
  alternates: { canonical: `${SITE_URL}/invest/farmland` },
  openGraph: {
    title: `Invest in Australian Farmland & Agriculture (${CURRENT_YEAR})`,
    description:
      "Guide to farmland investment in Australia. FIRB rules, returns, property types, and water rights.",
    url: `${SITE_URL}/invest/farmland`,
    images: [{ url: `/api/og?title=${encodeURIComponent("Invest in Australian Farmland")}&sub=${encodeURIComponent("Cropping · Livestock · Water Rights · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
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
      {farmlandFaqLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(farmlandFaqLd) }} />
      )}

      {/* Hero — house-standard compact light header (E3). The old stat band
          rides as pills beside the title; the browse-all entry point lives in
          the light band below, replacing the standalone CTA band (E4). */}
      <DirectoryHero
        tone="light"
        breadcrumbLabel="Farmland"
        headlineLead="Invest in Australian Farmland"
        subtitle="Australia has 450 million hectares of agricultural land. From cropping and grazing to horticulture and water rights — a proven inflation hedge with strong long-run capital growth."
        stats={[
          { v: "450M", l: "hectares agricultural land" },
          { v: "13%", l: "foreign owned" },
          { v: "$15M", l: "FIRB threshold" },
          { v: "4–8%", l: "typical total return p.a." },
        ]}
        containerClassName="container-custom"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/invest/farmland/listings"
            className="inline-flex items-center gap-1.5 rounded-full border border-coral-200 bg-coral-50 px-3 py-1 text-[0.65rem] font-semibold text-coral-700 shadow-sm transition-colors hover:bg-coral-100 md:text-xs"
          >
            Browse all farmland listings →
          </Link>
          <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[0.65rem] font-semibold text-blue-700 md:text-xs">
            FIRB Applicable
          </span>
        </div>
      </DirectoryHero>

      {/* Content */}
      <section className="py-8 md:py-10 bg-white">
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
              <li><strong>&ldquo;Marketed widely&rdquo; requirement</strong> — vendor must have genuinely tested the Australian market before foreign buyer can acquire</li>
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
      <section className="py-8 md:py-10 bg-white border-t border-slate-100">
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

      <section className="py-6 md:py-8 bg-white border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Frequently asked questions</h2>
          <div className="space-y-3">
            {FARMLAND_FAQS.map((faq) => (
              <details key={faq.q} className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden group">
                <summary className="px-5 py-4 text-sm font-bold text-slate-900 cursor-pointer hover:bg-slate-100 flex items-center justify-between">
                  {faq.q}
                  <span className="text-slate-400 group-open:rotate-180 transition-transform ml-2 shrink-0" aria-hidden="true">▾</span>
                </summary>
                <div className="px-5 pb-4">
                  <p className="text-sm text-slate-600 leading-relaxed">{faq.a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
