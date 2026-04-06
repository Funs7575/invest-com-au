import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import Icon from "@/components/Icon";
import SectionHeading from "@/components/SectionHeading";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Invest in Renewable Energy Australia (${CURRENT_YEAR}) — Invest.com.au`,
  description:
    "Guide to renewable energy investment in Australia. Solar, wind, battery storage, and hydrogen projects. Government incentives, ARENA grants, and direct project investment.",
  alternates: { canonical: `${SITE_URL}/invest/renewable-energy` },
  openGraph: {
    title: `Invest in Renewable Energy Australia (${CURRENT_YEAR})`,
    description:
      "Solar, wind, battery storage, and hydrogen projects seeking co-investment. ARENA, CEFC, and state incentives.",
    url: `${SITE_URL}/invest/renewable-energy`,
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

      {/* Hero */}
      <section className="relative bg-white border-b border-slate-100 overflow-hidden py-8 md:py-12">
        <div className="container-custom">
          <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-6" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-slate-900 transition-colors">Home</Link>
            <Icon name="chevron-right" size={12} className="text-slate-300" />
            <Link href="/invest" className="hover:text-slate-900 transition-colors">Invest</Link>
            <Icon name="chevron-right" size={12} className="text-slate-300" />
            <span className="text-slate-900 font-medium">Renewable Energy</span>
          </nav>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-xs font-semibold bg-amber-500 text-slate-900 px-3 py-1 rounded-full">
              Updated {CURRENT_YEAR}
            </span>
            <span className="text-xs font-semibold bg-teal-600 text-white px-3 py-1 rounded-full">
              82% Renewables Target by 2030
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-4 max-w-3xl text-slate-900">
            Australia&#39;s Renewable Energy Investment Opportunity
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed max-w-2xl mb-8">
            Australia is targeting 82% renewable electricity by 2030. With $100B+ in required investment and world-class solar and wind resources, the opportunity is immense.
          </p>

          <Link
            href="/invest/renewable-energy/projects"
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-base px-7 py-3.5 rounded-xl transition-colors shadow-lg"
          >
            Browse Energy Projects
            <Icon name="arrow-right" size={18} />
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="py-10 bg-teal-50 border-b border-teal-100">
        <div className="container-custom">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { value: "82%", label: "Renewable target by 2030" },
              { value: "$100B+", label: "Investment needed" },
              { value: "#1", label: "Solar resource quality" },
              { value: "ARENA / CEFC", label: "Government co-investment" },
            ].map((s) => (
              <div key={s.label} className="bg-white border border-teal-100 rounded-xl p-4 text-center">
                <p className="text-2xl font-extrabold text-teal-700">{s.value}</p>
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
              Investing in Australian lithium, cobalt, nickel, and rare earth companies provides indirect exposure to the energy transition supply chain. The "picks and shovels" approach to clean energy.
            </p>

            <h3>FIRB for Energy Infrastructure</h3>
            <p>
              Electricity infrastructure is a sensitive sector. Foreign acquisitions of electricity generation, transmission, and distribution assets require FIRB notification under the national interest test. Mandatory notification applies regardless of value for certain critical infrastructure.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 bg-slate-900 text-white">
        <div className="container-custom text-center">
          <h2 className="text-2xl md:text-3xl font-extrabold mb-4">Browse Energy Projects Seeking Investment</h2>
          <p className="text-slate-300 text-base mb-8 max-w-xl mx-auto">
            Solar, wind, battery, and hydrogen projects seeking co-investors. Direct project investment with ARENA and CEFC support.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/invest/renewable-energy/projects"
              className="inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-8 py-4 rounded-xl transition-colors text-base"
            >
              Browse Energy Projects
              <Icon name="arrow-right" size={18} />
            </Link>
            <Link
              href="/find-advisor"
              className="inline-flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold px-8 py-4 rounded-xl transition-colors text-base"
            >
              Find an Energy Advisor
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
