import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import Icon from "@/components/Icon";
import SectionHeading from "@/components/SectionHeading";
import DirectoryHero from "@/components/directory/DirectoryHero";
import { faqJsonLd } from "@/lib/schema-markup";

const RENEWABLE_FAQS = [
  {
    q: "How can I invest in renewable energy in Australia?",
    a: "Australian investors can access renewable energy through: (1) ASX-listed companies — Meridian Energy, Infigen, AGL, Origin, New Energy Solar; (2) ASX-listed infrastructure funds with clean energy assets (e.g. APA Group, Spark Infrastructure before delisting); (3) unlisted managed funds investing in solar farms, wind projects, or battery storage; (4) direct project co-investment via platforms or family offices; (5) green bonds issued by companies or government entities financing renewable projects. The Australian renewable energy sector is one of the fastest-growing globally, driven by the Emissions Reduction Fund, ARENA grants, and state-level renewable targets.",
  },
  {
    q: "What government incentives exist for renewable energy investors in Australia?",
    a: "Key incentives: (1) ARENA (Australian Renewable Energy Agency) grants for early-stage technology and demonstration projects — available to project developers, not passive investors; (2) the Capacity Investment Scheme — government backstop contracts for new renewable capacity, reducing revenue risk for project owners; (3) Large-scale Generation Certificates (LGCs) — each MWh of accredited renewable electricity earns a certificate worth ~$30–70 that electricity retailers are required to buy; (4) Small-scale Technology Certificates (STCs) for rooftop solar, reducing installation cost by ~20–30%; (5) state-based incentives vary (ACT and Victoria have the most aggressive renewable targets and subsidy programs).",
  },
  {
    q: "What returns can I expect from a renewable energy investment?",
    a: "Stabilised (operational) renewable energy assets typically target 7–10% unlevered IRR, with leverage boosting equity returns to 10–15% in normal conditions. Assets with long-term Power Purchase Agreements (PPAs) or government backstop contracts have more predictable cash flows and can be modelled with higher confidence. Construction-phase investments carry higher risk and target 15–20%+ equity returns. Listed renewable energy stocks and ETFs have been volatile — the global clean energy thematic experienced significant drawdowns in 2022–23 as rates rose, compressing valuations.",
  },
  {
    q: "Can foreign investors invest in Australian renewable energy projects?",
    a: "Yes, with conditions. FIRB approval is required for foreign investment above the monetary threshold in existing renewable energy businesses, and for the acquisition of greenfield sites above certain land thresholds. However, Australian policy actively encourages foreign capital in clean energy — the National Reconstruction Fund and the Clean Energy Finance Corporation both partner with foreign capital on large-scale projects. Many Australian renewable projects are majority foreign-owned (e.g., by European utilities and infrastructure funds). Foreign investors should take advice on the withholding tax treatment of dividends and interest from such investments under applicable tax treaties.",
  },
];

const renewableFaqLd = faqJsonLd(RENEWABLE_FAQS);

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Invest in Renewable Energy Australia (${CURRENT_YEAR})`,
  description:
    "Guide to renewable energy investment in Australia. Solar, wind, battery storage and hydrogen. Government incentives, ARENA grants and project access.",
  alternates: { canonical: `${SITE_URL}/invest/renewable-energy` },
  openGraph: {
    title: `Invest in Renewable Energy Australia (${CURRENT_YEAR})`,
    description:
      "Solar, wind, battery storage, and hydrogen projects seeking co-investment. ARENA, CEFC, and state incentives.",
    url: `${SITE_URL}/invest/renewable-energy`,
    images: [{ url: `/api/og?title=${encodeURIComponent("Renewable Energy Investing Australia")}&sub=${encodeURIComponent("Solar · Wind · Battery Storage · ETFs · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
};

export default function RenewableEnergyPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: `${SITE_URL}/invest` },
    { name: "Renewable Energy" },
  ]);

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      {renewableFaqLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(renewableFaqLd) }} />
      )}

      {/* Hero — house-standard compact light header (E3). The old stat band
          rides as pills beside the title; the browse-all entry point lives in
          the light band below, replacing the standalone CTA band (E4). */}
      <DirectoryHero
        tone="light"
        breadcrumbLabel="Renewable Energy"
        headlineLead="Australia's Renewable Energy Investment Opportunity"
        subtitle="Australia is targeting 82% renewable electricity by 2030. With $100B+ in required investment and world-class solar and wind resources, the opportunity is immense."
        stats={[
          { v: "82%", l: "Renewable target by 2030" },
          { v: "$100B+", l: "Investment needed" },
          { v: "#1", l: "Solar resource quality" },
          { v: "ARENA / CEFC", l: "Government co-investment" },
        ]}
        containerClassName="container-custom"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/invest/renewable-energy/listings"
            className="inline-flex items-center gap-1.5 rounded-full border border-coral-200 bg-coral-50 px-3 py-1 text-[0.65rem] font-semibold text-coral-700 shadow-sm transition-colors hover:bg-coral-100 md:text-xs"
          >
            Browse all renewable energy projects →
          </Link>
          <span className="inline-flex items-center rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-[0.65rem] font-semibold text-teal-700 md:text-xs">
            82% Renewables Target by 2030
          </span>
        </div>
      </DirectoryHero>

      {/* Content */}
      <section className="py-8 md:py-10 bg-white">
        <div className="container-custom max-w-4xl">
          <SectionHeading
            eyebrow="Technologies"
            title="Renewable Energy Technologies in Australia"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-12">
            {[
              { icon: "zap", title: "Solar PV", detail: "Australia has the highest solar irradiance of any continent. Large-scale solar farms in QLD, NSW, SA, and WA. Utility-scale solar is now the cheapest source of new electricity generation." },
              { icon: "trending-up", title: "Wind", detail: "Strong resources in SA, VIC, and WA. Offshore wind in development (Gippsland, Star of the South). SA leads in wind penetration (~70% of electricity)." },
              { icon: "star", title: "Battery Storage (BESS)", detail: "Battery energy storage systems are critical for grid stability as intermittent renewables scale. SA leads with Hornsdale and Torrens Island. $10B+ pipeline nationally." },
              { icon: "leaf", title: "Green Hydrogen", detail: "WA (Pilbara, Geraldton) and QLD have major green hydrogen pilot projects. H2 Perth, AGIG pilot in SA. Long-term export opportunity to Japan, South Korea, Germany." },
              { icon: "building", title: "Pumped Hydro", detail: "Snowy 2.0 (4,500 MW), Pioneer Pumped Hydro (QLD), and smaller projects. Long-duration storage — operates like a giant battery using water reservoirs." },
              { icon: "globe", title: "Grid Infrastructure", detail: "New transmission lines needed to connect remote renewables to population centres. HumeLink, VNI West, Project EnergyConnect — all requiring private co-investment." },
            ].map((item) => (
              <div key={item.title} className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex gap-4">
                <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon name={item.icon} size={20} className="text-teal-700" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 mb-1">{item.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>

          <SectionHeading eyebrow="Incentives" title="Government Incentives for Clean Energy" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12">
            {[
              { name: "ARENA", full: "Australian Renewable Energy Agency", detail: "Grants and concessional loans for renewable energy and clean tech projects. $3.8B+ allocated since inception." },
              { name: "CEFC", full: "Clean Energy Finance Corporation", detail: "Green bank providing debt finance at commercial rates for clean energy, energy efficiency, and low-emission tech." },
              { name: "PTC", full: "Production Tax Credits", detail: "Federal government production tax credits for eligible clean energy projects — modelled on US IRA. New scheme from 2024." },
            ].map((item) => (
              <div key={item.name} className="bg-teal-50 border border-teal-200 rounded-xl p-5">
                <p className="text-xl font-extrabold text-teal-700 mb-1">{item.name}</p>
                <p className="text-xs font-semibold text-teal-600 mb-2">{item.full}</p>
                <p className="text-sm text-slate-600">{item.detail}</p>
              </div>
            ))}
          </div>

          <SectionHeading eyebrow="Investment pathways" title="How to Invest in Renewable Energy" />

          <div className="prose prose-slate max-w-none mb-12">
            <h3>1. Direct Project Co-Investment</h3>
            <p>
              Invest directly alongside the project developer in a utility-scale renewable energy project. Typically requires $1M+ minimum. Returns depend on PPA (Power Purchase Agreement) terms, capacity factor, and operating costs. FIRB may apply for foreign investors in sensitive energy infrastructure.
            </p>

            <h3>2. ASX-Listed Clean Energy Companies</h3>
            <p>
              Direct equity in ASX-listed developers and generators: Neoen, AGL Energy, Origin Energy, Meridian Energy, Contact Energy. Available through any ASX broker from $500.
            </p>

            <h3>3. Clean Energy ETFs</h3>
            <ul>
              <li><strong>ERTH</strong> (BetaShares Climate Change Innovation ETF) — global clean energy and climate solutions</li>
              <li><strong>ETHI</strong> (BetaShares Global Sustainability Leaders ETF) — ESG-screened global equities</li>
              <li><strong>CLNE</strong> (iShares Global Clean Energy ETF) — global clean energy producers</li>
            </ul>

            <h3>4. Green Bonds</h3>
            <p>
              Debt instruments issued by renewable energy developers and financiers. Fixed income with proceeds dedicated to clean energy projects. Available via bond markets and some managed funds.
            </p>

            <h3>5. Critical Minerals</h3>
            <p>
              Investing in Australian lithium, cobalt, nickel, and rare earth companies provides indirect exposure to the energy transition supply chain. The &ldquo;picks and shovels&rdquo; approach to clean energy.
            </p>

            <h3>FIRB for Energy Infrastructure</h3>
            <p>
              Electricity infrastructure is a sensitive sector. Foreign acquisitions of electricity generation, transmission, and distribution assets require FIRB notification under the national interest test. Mandatory notification applies regardless of value for certain critical infrastructure.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-8 md:py-10 bg-white border-t border-slate-100">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-xl p-8 text-center">
            <h2 className="text-2xl font-extrabold text-slate-900 mb-3">Browse Energy Projects Seeking Investment</h2>
            <p className="text-slate-500 text-sm mb-6 max-w-xl mx-auto">
              Solar, wind, battery, and hydrogen projects seeking co-investors. Direct project investment with ARENA and CEFC support.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/invest/renewable-energy/listings"
                className="inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-6 py-3 rounded-xl text-sm"
              >
                Browse Energy Projects
                <Icon name="arrow-right" size={18} />
              </Link>
              <Link
                href="/find-advisor"
                className="inline-flex items-center justify-center gap-2 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold px-6 py-3 rounded-xl text-sm"
              >
                Browse Energy Professionals
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-6 md:py-8 bg-white border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Frequently asked questions</h2>
          <div className="space-y-3">
            {RENEWABLE_FAQS.map((faq) => (
              <details key={faq.q} className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden group">
                <summary className="px-5 py-4 text-sm font-bold text-slate-900 cursor-pointer hover:bg-slate-100 flex items-center justify-between">
                  {faq.q}
                  <span className="text-slate-500 group-open:rotate-180 transition-transform ml-2 shrink-0" aria-hidden="true">▾</span>
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
