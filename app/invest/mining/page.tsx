import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import Icon from "@/components/Icon";
import SectionHeading from "@/components/SectionHeading";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Invest in Australian Mining (${CURRENT_YEAR}) — Invest.com.au`,
  description:
    "Complete guide to mining investment in Australia. Lithium, gold, iron ore, copper, and rare earths. ASX miners, ETFs, direct project investment, and FIRB rules for foreign investors.",
  alternates: { canonical: `${SITE_URL}/invest/mining` },
  openGraph: {
    title: `Invest in Australian Mining (${CURRENT_YEAR})`,
    description:
      "Complete guide to mining investment in Australia. Lithium, gold, iron ore, copper, and rare earths.",
    url: `${SITE_URL}/invest/mining`,
  },
};

export default function MiningPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: `${SITE_URL}/invest` },
    { name: "Mining" },
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
            <span className="text-slate-900 font-medium">Mining</span>
          </nav>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-xs font-semibold bg-amber-500 text-slate-900 px-3 py-1 rounded-full">
              Updated {CURRENT_YEAR}
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-4 max-w-3xl text-slate-900">
            Invest in Australian Mining
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed max-w-2xl mb-8">
            Australia is the world's largest exporter of iron ore and lithium. Explore how to access direct project investments, ASX-listed miners, and ETFs.
          </p>

          <Link
            href="/invest/listings?vertical=mining"
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-base px-7 py-3.5 rounded-xl transition-colors shadow-lg"
          >
            Browse Mining Opportunities
            <Icon name="arrow-right" size={18} />
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="py-10 bg-amber-50 border-b border-amber-100">
        <div className="container-custom">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { value: "33%", label: "of Australia's FDI" },
              { value: "#1", label: "Iron Ore Exporter" },
              { value: "Top 5", label: "Lithium Producer" },
              { value: "$130B+", label: "Annual Exports" },
            ].map((s) => (
              <div key={s.label} className="bg-white border border-amber-100 rounded-xl p-4 text-center">
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
            eyebrow="Commodities"
            title="Key Australian Mining Commodities"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-12">
            {[
              { icon: "trending-up", commodity: "Iron Ore", detail: "World's largest exporter. Pilbara, WA. BHP, Rio Tinto, Fortescue. $130B+ in annual exports. Key demand driver: Chinese steel production." },
              { icon: "zap", commodity: "Lithium", detail: "World's largest producer. WA's Pilbara and Goldfields regions. Battery metals boom driven by EV transition. Pilbara Minerals, Liontown, Albemarle." },
              { icon: "star", commodity: "Gold", detail: "Top 5 global producer. WA Goldfields, NSW, QLD, VIC. Safe haven asset. Newmont, Northern Star, Evolution, De Grey Mining." },
              { icon: "globe", commodity: "Rare Earths", detail: "Critical to wind turbines, EV motors, defence electronics. Mt Weld (Lynas), Arafura Rare Earths. Growing strategic importance." },
              { icon: "briefcase", commodity: "Copper", detail: "Olympic Dam (BHP) is world's 4th largest Cu deposit. Demand driven by electrification. QLD copper projects expanding." },
              { icon: "leaf", commodity: "LNG & Coal", detail: "Queensland and WA LNG exporters. Thermal and coking coal. Santos, Woodside, Whitehaven, Yancoal. Transition risk to consider." },
            ].map((item) => (
              <div key={item.commodity} className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex gap-4">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon name={item.icon} size={20} className="text-amber-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 mb-1">{item.commodity}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>

          <SectionHeading
            eyebrow="Investment methods"
            title="How to Invest in Australian Mining"
          />

          <div className="prose prose-slate max-w-none mb-12">
            <h3>1. ASX-Listed Miners (Most Accessible)</h3>
            <p>
              Buy shares directly through any ASX broker. Large caps: BHP, Rio Tinto, Fortescue, Newcrest. Mid-caps and juniors: Pilbara Minerals, Liontown, De Grey Mining. Higher liquidity, regulated disclosure, lower entry cost.
            </p>

            <h3>2. Mining ETFs (Diversified Exposure)</h3>
            <ul>
              <li><strong>MNRS</strong> (VanEck Gold Miners ETF) — exposure to global gold miners including ASX-listed</li>
              <li><strong>QRE</strong> (BetaShares Resources Sector ETF) — broad Australian resources exposure</li>
              <li><strong>ETLM</strong> (Global X Battery Tech and Lithium ETF) — lithium and battery metals</li>
            </ul>

            <h3>3. Direct Project Investment (For Accredited Investors)</h3>
            <p>
              Invest directly into unlisted mining projects — exploration tenements, joint ventures, or private placement in pre-IPO companies. Higher risk, higher potential return. Requires FIRB approval for foreign investors acquiring tenements or significant stakes.
            </p>

            <h3>4. Royalty Streams</h3>
            <p>
              Purchase a royalty on future production from a mining project. Less capital-intensive than direct ownership. Sandstorm Gold, Wheaton Precious Metals, and Australian royalty vehicles offer this exposure.
            </p>

            <h3>FIRB for Mining Investment</h3>
            <p>
              Mining is a "sensitive sector." Foreign acquisitions of exploration licences, mining tenements, or stakes in mining companies have lower FIRB thresholds than general commercial investment. The $268M general threshold applies to ASX shares for most countries, but direct tenement acquisitions have specific rules. FIRB can impose conditions including local employment requirements.
            </p>
          </div>

          {/* Investment stages */}
          <SectionHeading
            eyebrow="Project stages"
            title="Understanding Mining Project Stages"
          />
          <div className="space-y-3 mb-10">
            {[
              { stage: "Explorer", risk: "Very High", desc: "Early-stage drilling to determine if a resource exists. No revenue. Typically ASX-listed junior miners or private tenement holders." },
              { stage: "Developer", risk: "High", desc: "Resource confirmed, feasibility study complete, seeking finance for mine construction. Pre-production cash flow." },
              { stage: "Producer", risk: "Medium", desc: "Mine in operation, generating revenue. Risk includes commodity price, production costs, and mine life." },
              { stage: "Royalty / Streamer", risk: "Lower", desc: "Receives a percentage of production or revenue without operating a mine. More defensive exposure." },
            ].map((s) => (
              <div key={s.stage} className="flex gap-4 bg-white border border-slate-200 rounded-xl p-5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-slate-900 text-sm">{s.stage}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      s.risk === "Very High" ? "bg-red-100 text-red-700" :
                      s.risk === "High" ? "bg-orange-100 text-orange-700" :
                      s.risk === "Medium" ? "bg-amber-100 text-amber-700" :
                      "bg-green-100 text-green-700"
                    }`}>{s.risk} Risk</span>
                  </div>
                  <p className="text-sm text-slate-600">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Browse CTA */}
      <section className="py-14 bg-white border-t border-slate-100">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-xl p-8 text-center">
            <h2 className="text-2xl font-extrabold text-slate-900 mb-3">Browse Mining Investment Opportunities</h2>
            <p className="text-slate-500 text-sm mb-6 max-w-xl mx-auto">
              Direct project investments, joint ventures, and co-investment opportunities in Australian mining and resources.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/invest/listings?vertical=mining"
                className="inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-6 py-3 rounded-xl text-sm"
              >
                Browse Mining Opportunities
                <Icon name="arrow-right" size={18} />
              </Link>
              <Link
                href="/find-advisor"
                className="inline-flex items-center justify-center gap-2 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold px-6 py-3 rounded-xl text-sm"
              >
                Browse Mining Professionals
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
