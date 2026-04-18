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
  title: `Invest in Australian Lithium (${CURRENT_YEAR}) — ASX Miners, Processing & Battery Minerals`,
  description:
    "Australian lithium investing — ASX spodumene producers (PLS, MIN, LTR, IGO), Kwinana downstream processing, battery-mineral ETFs, FIRB rules and the EU-Australia FTA pathway.",
  alternates: { canonical: `${SITE_URL}/invest/lithium` },
  openGraph: {
    title: `Invest in Australian Lithium (${CURRENT_YEAR})`,
    description:
      "ASX spodumene producers, downstream processing, battery-mineral ETFs and FIRB rules for international investors.",
    url: `${SITE_URL}/invest/lithium`,
  },
};

const WAYS_TO_INVEST = [
  {
    id: "asx-miners",
    label: "ASX miners",
    body:
      "Direct equity in ASX-listed lithium producers — Pilbara Minerals (PLS), Mineral Resources (MIN), IGO and Liontown. Pure spodumene miners give leverage to spot SC6 pricing but also amplify downside during oversupply cycles like 2023-24. Franking credits have been sparse in the sector given most producers reinvest cashflow into expansion rather than distributions.",
    cta: { label: "Compare ASX brokers", href: "/compare?category=shares" },
  },
  {
    id: "processing",
    label: "Downstream processing",
    body:
      "Kwinana (WA) has become Australia's lithium hydroxide processing hub. Exposure is available via IGO's Tianqi joint venture, Albemarle's Kemerton plant, and the Liontown-Covalent offtake. Downstream processors capture more margin than upstream miners but require heavy capital expenditure and carry technology execution risk.",
    cta: { label: "View project listings", href: "/invest/mining/listings" },
  },
  {
    id: "etfs",
    label: "Battery & lithium ETFs",
    body:
      "Global X Battery Tech & Lithium ETF (ACDC) and VanEck Rare Earths & Critical Metals ETF provide diversified exposure without single-stock risk. Look at the underlying index methodology — some 'lithium' ETFs are heavily weighted to downstream battery manufacturers rather than upstream miners, which materially changes the risk profile.",
    cta: { label: "Browse the ETF hub", href: "/etfs" },
  },
  {
    id: "explorers",
    label: "Junior explorers",
    body:
      "Speculative-end pre-production lithium companies with WA, NT or Quebec tenements. Higher risk/reward profile. Key diligence: pegmatite grade (target >1.2% Li2O), tenement area, metallurgical test work, and path to offtake. Most exits come via acquisition by majors rather than through independent production.",
    cta: { label: "Find specialist advisors", href: "/advisors/resources-fund-managers" },
  },
  {
    id: "project-equity",
    label: "Project equity",
    body:
      "Unlisted project equity or convertible notes into named lithium developments. Foreign investors should budget FIRB approval (sensitive sector under the Critical Minerals Strategic Reserve regime). Best suited to wholesale investors with a specialist adviser and $250K+ to allocate.",
    cta: { label: "View project listings", href: "/invest/listings?vertical=mining" },
  },
];

export default async function LithiumPage() {
  const sector = await getSector("lithium");
  if (!sector) notFound();

  const [stocks, etfs] = await Promise.all([
    listSectorStocks("lithium"),
    listSectorEtfs("lithium"),
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
            <span className="text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              Critical mineral
            </span>
            <span className="text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
              Independent research
            </span>
            <span className="text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
              Updated {CURRENT_YEAR}
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-4 max-w-3xl text-slate-900">
            Invest in Australian Lithium
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

      {/* Strategic context banner */}
      <section className="py-6 md:py-8 bg-emerald-50 border-y border-emerald-200">
        <div className="container-custom">
          <div className="flex items-start gap-4 max-w-4xl">
            <div className="w-10 h-10 rounded-lg bg-emerald-200 flex items-center justify-center shrink-0 mt-0.5">
              <Icon name="alert-triangle" size={20} className="text-emerald-800" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold uppercase tracking-wide text-emerald-800 mb-1">
                Critical Minerals Context
              </h2>
              <p className="text-sm md:text-base text-emerald-900 leading-relaxed">
                Australia supplies roughly half of the world&rsquo;s mined
                lithium — almost all of it spodumene concentrate from the
                Pilbara and Goldfields. The US-Australia Critical Minerals
                Framework (2025), the EU-Australia Free Trade Agreement (2026),
                and the Critical Minerals Strategic Reserve reshape the
                downstream economics: tariff-free European offtake, Pentagon-backed
                processing support, and government-facilitated offtake pathways
                now underpin project financing. Upstream supply is adjusting to
                the 2023-24 price correction — cycles are real but the
                structural-demand thesis is intact.
              </p>
              <p className="text-xs text-emerald-700 mt-2">
                Sources: Department of Industry, Science and Resources —
                Critical Minerals Strategy.{" "}
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
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">
                Section 1 &middot; Direct exposure
              </p>
              <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900">
                ASX-listed lithium stocks
              </h2>
              <p className="text-sm text-slate-500 mt-1 max-w-2xl">
                Editorially reviewed snapshots of the key ASX lithium
                producers, integrated miners, and strategic names.
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
                href="/invest/mining/listings"
                className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline"
              >
                View mining project listings
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
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">
              Section 2 &middot; Five ways in
            </p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900">
              Ways to invest in Australian lithium
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              From ASX equity to downstream processing to project equity — each
              route has different capital requirements and risk profile.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 mb-6" role="tablist">
            {WAYS_TO_INVEST.map((w, i) => (
              <a
                key={w.id}
                href={`#${w.id}`}
                className={`inline-flex items-center gap-1.5 text-xs md:text-sm font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                  i === 0
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-white text-slate-700 border-slate-200 hover:border-emerald-400 hover:text-emerald-700"
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
                  <span className="w-8 h-8 rounded-full bg-emerald-600 text-white font-extrabold flex items-center justify-center">
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
                ETFs with lithium exposure
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Diversified wrappers — useful for investors who want structural
                exposure without selecting individual mines.
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
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2">
            Section 3 &middot; Get specialist help
          </p>
          <h2 className="text-2xl md:text-3xl font-extrabold mb-3">
            Speak with a resources-specialist adviser
          </h2>
          <p className="text-sm md:text-base text-slate-300 leading-relaxed mb-6 max-w-2xl">
            Lithium equity and project investment has material tax, FIRB and
            structure considerations — particularly where offtake agreements,
            foreign processing partners, or state royalty regimes are involved.
            Our directory is filtered to practitioners with real sector
            experience.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Link
              href="/advisors/resources-fund-managers"
              className="group bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-5 transition-colors"
            >
              <div className="flex items-center gap-3 mb-2">
                <Icon name="bar-chart-2" size={20} className="text-emerald-400" />
                <h3 className="text-base font-extrabold text-white group-hover:text-emerald-300">
                  Resources fund managers
                </h3>
              </div>
              <p className="text-xs md:text-sm text-slate-300">
                Actively managed resources funds — long-only, long-short, and
                critical-minerals strategies with disclosed AUM and track
                records.
              </p>
            </Link>

            <Link
              href="/advisors/mining-lawyers"
              className="group bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-5 transition-colors"
            >
              <div className="flex items-center gap-3 mb-2">
                <Icon name="pickaxe" size={20} className="text-emerald-400" />
                <h3 className="text-base font-extrabold text-white group-hover:text-emerald-300">
                  Mining lawyers
                </h3>
              </div>
              <p className="text-xs md:text-sm text-slate-300">
                Tenement acquisition, joint ventures, offtake structuring and
                FIRB coordination for ASX-listed and unlisted lithium
                transactions.
              </p>
            </Link>

            <Link
              href="/advisors/mining-tax-advisors"
              className="group bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-5 transition-colors"
            >
              <div className="flex items-center gap-3 mb-2">
                <Icon name="calculator" size={20} className="text-emerald-400" />
                <h3 className="text-base font-extrabold text-white group-hover:text-emerald-300">
                  Mining tax advisors
                </h3>
              </div>
              <p className="text-xs md:text-sm text-slate-300">
                State royalty regimes, exploration deductions, transfer-pricing
                on offshore processing and SMSF-friendly structuring.
              </p>
            </Link>

            <Link
              href="/advisors/foreign-investment-lawyers"
              className="group bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-5 transition-colors"
            >
              <div className="flex items-center gap-3 mb-2">
                <Icon name="globe" size={20} className="text-emerald-400" />
                <h3 className="text-base font-extrabold text-white group-hover:text-emerald-300">
                  Foreign investment lawyers
                </h3>
              </div>
              <p className="text-xs md:text-sm text-slate-300">
                FIRB and national-security review specialists for inbound
                capital deploying into Australian critical-mineral projects.
              </p>
            </Link>
          </div>

          <Link
            href="/find-advisor?focus=lithium"
            className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-extrabold text-sm md:text-base px-6 py-3 rounded-lg transition-colors"
          >
            Match me with an adviser
            <Icon name="arrow-right" size={16} />
          </Link>
        </div>
      </section>

      {/* Foreign investor note */}
      <section className="py-10 md:py-12 bg-white" id="foreign-investors">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">
            Section 4 &middot; International investors
          </p>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">
            Foreign investor note
          </h2>

          <div className="prose prose-slate max-w-none mb-6">
            <p>
              Lithium and other battery minerals are classified as sensitive
              sectors under Australia&rsquo;s foreign investment framework.
              Before deploying capital, non-Australian investors should budget
              for:
            </p>
            <ul>
              <li>
                <strong>FIRB is the default for mining.</strong> Direct
                tenement acquisitions and project equity are typically notifiable
                regardless of value. Portfolio share purchases below 10% in
                ASX-listed producers are generally exempt.
              </li>
              <li>
                <strong>Allied-nation fast track.</strong> US, Japan, Korea, EU
                and UK capital benefits from streamlined review under bilateral
                frameworks. Chinese and Russian capital faces heightened
                national-security scrutiny — investment into downstream
                processing is particularly sensitive.
              </li>
              <li>
                <strong>State royalties + CGT.</strong> Direct mining interests
                are Taxable Australian Property — Section 855-10 portfolio CGT
                exemption does not apply. State royalties on lithium are set
                by each resource state and have been under review in WA and QLD.
              </li>
              <li>
                <strong>Structure matters.</strong> Offshore processing joint
                ventures, transfer-pricing on concentrate exports, and the
                interaction of withholding tax with DTA networks are all live
                issues that benefit from upfront structuring.
              </li>
            </ul>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/foreign-investment/energy"
              className="inline-flex items-center gap-1.5 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg transition-colors"
            >
              Read the energy foreign-investment guide
              <Icon name="arrow-right" size={14} />
            </Link>
            <Link
              href="/advisors/foreign-investment-lawyers"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline"
            >
              Find a foreign investment lawyer
              <Icon name="arrow-right" size={14} />
            </Link>
          </div>
        </div>
      </section>

      <GeneralAdviceWarning sectorDisplayName={sector.display_name} />
    </div>
  );
}
