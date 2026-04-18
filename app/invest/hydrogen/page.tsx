import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getSector,
  listSectorStocks,
  listSectorEtfs,
} from "@/lib/commodities";
import AsxTickerCard from "@/components/commodities/AsxTickerCard";
import EtfComparisonCard from "@/components/commodities/EtfComparisonCard";
import GeneralAdviceWarning from "@/components/commodities/GeneralAdviceWarning";
import Icon from "@/components/Icon";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";

export const revalidate = 1800;

export const metadata: Metadata = {
  title: `Invest in Australian Hydrogen (${CURRENT_YEAR}) — ASX Pure-Plays, Majors & HGEN ETF`,
  description:
    "Australian hydrogen investing — Fortescue, Origin, Hazer, Province, Frontier, the Global X Hydrogen ETF (HGEN), FIRB rules, and the $2B Hydrogen Headstart production credit.",
  alternates: { canonical: `${SITE_URL}/invest/hydrogen` },
  openGraph: {
    title: `Invest in Australian Hydrogen (${CURRENT_YEAR})`,
    description:
      "ASX hydrogen pure-plays, indirect majors, ETFs, and policy drivers — the 2026 investor guide.",
    url: `${SITE_URL}/invest/hydrogen`,
  },
};

const WAYS_TO_INVEST = [
  {
    id: "majors",
    label: "Majors with hydrogen exposure",
    body:
      "Fortescue (FMG) and Origin Energy (ORG) give indirect hydrogen exposure inside established dividend-paying businesses. FMG retains green hydrogen optionality post-2024 scale-back; Origin holds Hunter Valley hub partnerships. Best fit for income investors wanting hydrogen optionality without pure-play volatility.",
    cta: { label: "Compare ASX brokers", href: "/compare?category=shares" },
  },
  {
    id: "pure-plays",
    label: "ASX pure-plays",
    body:
      "Hazer Group (HZR, methane pyrolysis), Province Resources (PRL, HyEnergy), Frontier Energy (FHE, Waroona), Pure Hydrogen (PH2, blue + turquoise), Sparc (SPN, photocatalytic R&D), ReNu Energy (RNE, fuel cells). Small-caps with binary project-stage outcomes. Position sizing should be 0.5-1.5% per name.",
    cta: { label: "Find specialist advisors", href: "/advisors/resources-fund-managers" },
  },
  {
    id: "etfs",
    label: "ETF exposure",
    body:
      "Global X Hydrogen ETF (ASX: HGEN) holds ~25-30 global hydrogen equities — electrolyser makers (Plug Power, Nel, ITM Power), fuel cell producers (Bloom Energy, Ceres Power), and industrial gas majors (Linde, Air Liquide, Air Products). MER ~0.69%. Diversified single-ticket exposure.",
    cta: { label: "Browse the ETF hub", href: "/etfs" },
  },
  {
    id: "project-equity",
    label: "Project equity",
    body:
      "Unlisted equity in named hydrogen projects — HyEnergy, Desert Bloom, NT Hydrogen Hub, Collie Green Hydrogen. Typically wholesale-investor-only with $50K-$250K minimums. FIRB sensitive-sector overlap via ammonia terminals and critical-infrastructure designation.",
    cta: { label: "Find foreign investment lawyer", href: "/advisors/foreign-investment-lawyers" },
  },
  {
    id: "policy-plays",
    label: "Policy-driven thesis",
    body:
      "Hydrogen Headstart Production Credit ($2B, 10-year dollar-per-kg support) materially re-rates project economics for successful applicants. Track Commonwealth + state awards closely — projects with awarded credit have de-risked economics; projects pitching without credit remain speculative.",
    cta: { label: "Read the policy explainer", href: "/article/hydrogen-headstart-production-credit-explained" },
  },
];

export default async function HydrogenPage() {
  const sector = await getSector("hydrogen");
  if (!sector) notFound();

  const [stocks, etfs] = await Promise.all([
    listSectorStocks("hydrogen"),
    listSectorEtfs("hydrogen"),
  ]);

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: `${SITE_URL}/invest` },
    { name: sector.display_name },
  ]);

  const heroStats = sector.hero_stats || {};

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />

      {/* Hero */}
      <section className="relative bg-white border-b border-slate-100 overflow-hidden py-8 md:py-12">
        <div className="container-custom">
          <nav
            className="flex items-center gap-1.5 text-xs text-slate-500 mb-6"
            aria-label="Breadcrumb"
          >
            <Link href="/" className="hover:text-slate-900 transition-colors">
              Home
            </Link>
            <Icon name="chevron-right" size={12} className="text-slate-300" />
            <Link href="/invest" className="hover:text-slate-900 transition-colors">
              Invest
            </Link>
            <Icon name="chevron-right" size={12} className="text-slate-300" />
            <span className="text-slate-900 font-medium">{sector.display_name}</span>
          </nav>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800">
              $2B Headstart scheme · Ambition exceeds FID
            </span>
            <span className="text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
              Independent research
            </span>
            <span className="text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
              Updated {CURRENT_YEAR}
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-4 max-w-3xl text-slate-900">
            Invest in Australian Hydrogen
          </h1>
          <p className="text-base md:text-lg text-slate-600 leading-relaxed max-w-2xl mb-6">
            {sector.hero_description}
          </p>

          {Object.keys(heroStats).length > 0 && (
            <dl className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl">
              {Object.entries(heroStats).map(([key, value]) => (
                <div
                  key={key}
                  className="border border-slate-200 rounded-lg bg-slate-50 px-3 py-2"
                >
                  <dt className="text-[10px] font-bold uppercase text-slate-500 tracking-wide">
                    {key.replace(/_/g, " ")}
                  </dt>
                  <dd className="text-sm font-extrabold text-slate-900 mt-0.5">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </section>

      {/* Policy-reality banner */}
      <section className="py-6 md:py-8 bg-sky-50 border-y border-sky-200">
        <div className="container-custom">
          <div className="flex items-start gap-4 max-w-4xl">
            <div className="w-10 h-10 rounded-lg bg-sky-200 flex items-center justify-center shrink-0 mt-0.5">
              <Icon name="alert-triangle" size={20} className="text-sky-800" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold uppercase tracking-wide text-sky-800 mb-1">
                Policy &amp; Reality Check
              </h2>
              <p className="text-sm md:text-base text-sky-900 leading-relaxed">
                The 2024 National Hydrogen Strategy and the A$2B Hydrogen
                Headstart Production Credit make Australia one of the most
                policy-supported green hydrogen markets globally. At the same
                time, project FIDs lag the announcement pipeline significantly
                — most pure-play developers remain pre-production. Exposure here
                is policy-driven and execution-dependent. Budget patience and
                position-size for volatility.
              </p>
              <p className="text-xs text-sky-700 mt-2">
                Sources: Department of Climate Change, Energy, the Environment
                and Water — National Hydrogen Strategy 2024.{" "}
                <span className="italic">
                  General information only, not financial advice.
                </span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ASX stocks grid */}
      {stocks.length > 0 && (
        <section className="py-10 md:py-12 bg-slate-50" id="asx-stocks">
          <div className="container-custom">
            <div className="mb-6">
              <p className="text-xs font-bold uppercase tracking-wider text-sky-600 mb-1">
                Section 1 &middot; Direct exposure
              </p>
              <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900">
                ASX-listed hydrogen stocks
              </h2>
              <p className="text-sm text-slate-500 mt-1 max-w-2xl">
                Editorially reviewed snapshots of ASX hydrogen pure-plays and
                indirect majors. Most pure-plays are small-cap and pre-FID;
                size positions accordingly.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {stocks.map((s) => (
                <AsxTickerCard key={s.id} stock={s} />
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-4">
              <Link
                href="/compare?category=shares"
                className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline"
              >
                Compare brokers that carry these stocks
                <Icon name="arrow-right" size={14} />
              </Link>
              <Link
                href="/invest/renewable-energy/listings"
                className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline"
              >
                Renewable energy project listings
                <Icon name="arrow-right" size={14} />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Ways to invest */}
      <section className="py-10 md:py-12 bg-white" id="ways-to-invest">
        <div className="container-custom">
          <div className="mb-6 max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-wider text-sky-600 mb-1">
              Section 2 &middot; Five ways in
            </p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900">
              Ways to invest in Australian hydrogen
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              From dividend-paying majors to early-stage pure-plays to
              thematic ETFs — each route has different capital requirements
              and risk profile.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 mb-6" role="tablist">
            {WAYS_TO_INVEST.map((w, i) => (
              <a
                key={w.id}
                href={`#${w.id}`}
                className={`inline-flex items-center gap-1.5 text-xs md:text-sm font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                  i === 0
                    ? "bg-sky-600 text-white border-sky-600"
                    : "bg-white text-slate-700 border-slate-200 hover:border-sky-400 hover:text-sky-700"
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-white/20 text-[11px] font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                {w.label}
              </a>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {WAYS_TO_INVEST.map((w, i) => (
              <div
                key={w.id}
                id={w.id}
                className="bg-slate-50 border border-slate-200 rounded-xl p-5 scroll-mt-24"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="w-8 h-8 rounded-full bg-sky-600 text-white font-extrabold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900">{w.label}</h3>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed mb-4">
                  {w.body}
                </p>
                <Link
                  href={w.cta.href}
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline"
                >
                  {w.cta.label}
                  <Icon name="arrow-right" size={14} />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ETFs */}
      {etfs.length > 0 && (
        <section className="py-10 md:py-12 bg-slate-50 border-y border-slate-100">
          <div className="container-custom">
            <div className="mb-5">
              <h2 className="text-xl md:text-2xl font-extrabold text-slate-900">
                ETFs with hydrogen exposure
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                ETF wrappers are the simplest way to get diversified sector
                exposure without picking individual stocks.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              {etfs.map((e) => (
                <EtfComparisonCard key={e.id} etf={e} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Advisor CTA */}
      <section className="py-12 md:py-14 bg-slate-900 text-white" id="find-advisor">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-sky-400 mb-2">
            Section 3 &middot; Get specialist help
          </p>
          <h2 className="text-2xl md:text-3xl font-extrabold mb-3">
            Speak with a hydrogen-aware adviser
          </h2>
          <p className="text-sm md:text-base text-slate-300 leading-relaxed mb-6 max-w-2xl">
            Hydrogen is a policy-driven sector with concentrated regulatory,
            tax, and structural considerations. Project-equity participation
            triggers FIRB and critical-infrastructure review. Our directory is
            filtered to practitioners with sector-relevant experience.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Link
              href="/advisors/resources-fund-managers"
              className="group bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-5 transition-colors"
            >
              <div className="flex items-center gap-3 mb-2">
                <Icon name="bar-chart-2" size={20} className="text-sky-400" />
                <h3 className="text-base font-extrabold text-white group-hover:text-sky-300">
                  Resources fund managers
                </h3>
              </div>
              <p className="text-xs md:text-sm text-slate-300">
                Actively managed funds with hydrogen and energy transition
                mandates.
              </p>
            </Link>

            <Link
              href="/advisors/energy-financial-planners"
              className="group bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-5 transition-colors"
            >
              <div className="flex items-center gap-3 mb-2">
                <Icon name="fuel" size={20} className="text-sky-400" />
                <h3 className="text-base font-extrabold text-white group-hover:text-sky-300">
                  Energy financial planners
                </h3>
              </div>
              <p className="text-xs md:text-sm text-slate-300">
                Fee-for-service AFSL planners experienced with sector-specific
                client profiles.
              </p>
            </Link>

            <Link
              href="/advisors/foreign-investment-lawyers"
              className="group bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-5 transition-colors"
            >
              <div className="flex items-center gap-3 mb-2">
                <Icon name="globe" size={20} className="text-sky-400" />
                <h3 className="text-base font-extrabold text-white group-hover:text-sky-300">
                  Foreign investment lawyers
                </h3>
              </div>
              <p className="text-xs md:text-sm text-slate-300">
                FIRB and critical-infrastructure review specialists for
                cross-border hydrogen project investment.
              </p>
            </Link>

            <Link
              href="/advisors/mining-tax-advisors"
              className="group bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-5 transition-colors"
            >
              <div className="flex items-center gap-3 mb-2">
                <Icon name="calculator" size={20} className="text-sky-400" />
                <h3 className="text-base font-extrabold text-white group-hover:text-sky-300">
                  Mining tax advisors
                </h3>
              </div>
              <p className="text-xs md:text-sm text-slate-300">
                Project structuring, transfer-pricing, and Hydrogen Headstart
                Production Credit tax treatment.
              </p>
            </Link>
          </div>

          <Link
            href="/find-advisor?focus=hydrogen"
            className="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-400 text-slate-900 font-extrabold text-sm md:text-base px-6 py-3 rounded-lg transition-colors"
          >
            Match me with an adviser
            <Icon name="arrow-right" size={16} />
          </Link>
        </div>
      </section>

      {/* Foreign investor note */}
      <section className="py-10 md:py-12 bg-white" id="foreign-investors">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-sky-600 mb-1">
            Section 4 &middot; International investors
          </p>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">
            Foreign investor note
          </h2>

          <div className="prose prose-slate max-w-none mb-6">
            <p>
              Hydrogen project investment by non-residents sits inside a
              rapidly-evolving policy perimeter. Key rules:
            </p>
            <ul>
              <li>
                <strong>Portfolio shares are simple.</strong> Holdings below
                10% of an ASX-listed hydrogen pure-play or major are generally
                exempt from FIRB notification.
              </li>
              <li>
                <strong>Project equity is sensitive.</strong> Direct equity in
                named hydrogen-to-ammonia export projects triggers FIRB plus
                Security of Critical Infrastructure Act review. Budget 90-180
                days and A$120K-$250K legal.
              </li>
              <li>
                <strong>Allied nations fast-track.</strong> US, Japan, Korea,
                EU and UK capital faces streamlined review, reflecting off-take
                market alignment. Japan and Korea are the dominant foreign
                participants.
              </li>
              <li>
                <strong>Tax.</strong> Non-residents holding &lt;10% in
                ASX-listed hydrogen equity qualify for Section 855-10 portfolio
                CGT exemption. Hydrogen producers mostly pay no dividends
                currently — franking is not yet a consideration.
              </li>
            </ul>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/foreign-investment/energy"
              className="inline-flex items-center gap-1.5 text-sm font-bold bg-sky-600 hover:bg-sky-700 text-white px-4 py-2.5 rounded-lg transition-colors"
            >
              Read the energy foreign-investment guide
              <Icon name="arrow-right" size={14} />
            </Link>
            <Link
              href="/firb-fee-estimator"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline"
            >
              FIRB fee estimator
              <Icon name="arrow-right" size={14} />
            </Link>
          </div>
        </div>
      </section>

      <GeneralAdviceWarning sectorDisplayName={sector.display_name} />
    </div>
  );
}
