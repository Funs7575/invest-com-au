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
import VerticalMarketplaceListings from "@/components/marketplace/VerticalMarketplaceListings";
import Icon from "@/components/Icon";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";

export const revalidate = 1800;

export const metadata: Metadata = {
  title: `Invest in Australian Uranium (${CURRENT_YEAR}) — ASX Producers, Developers & ETFs`,
  description:
    "Australian uranium investing — Paladin (PDN), Boss Energy (BOE), Deep Yellow (DYL), Bannerman (BMN), the Global X ATOM ETF, FIRB rules, and SMR demand thesis.",
  alternates: { canonical: `${SITE_URL}/invest/uranium` },
  openGraph: {
    title: `Invest in Australian Uranium (${CURRENT_YEAR})`,
    description:
      "ASX uranium producers, developers, and ETFs — plus FIRB double-approval rules for foreign investors.",
    url: `${SITE_URL}/invest/uranium`,
  },
};

const WAYS_TO_INVEST = [
  {
    id: "asx-producers",
    label: "ASX producers",
    body:
      "The two producing ASX uranium companies are Paladin Energy (PDN, Langer Heinrich in Namibia) and Boss Energy (BOE, Honeymoon in SA plus 30% Alta Mesa in Texas). Both restarted in 2024. Contract book and spot exposure differs meaningfully between the two — Paladin is more contracted, Boss more spot-exposed. Both are cashflow-generative at current uranium prices and likely to initiate dividends as production stabilises.",
    cta: { label: "Compare ASX brokers", href: "/compare?category=shares" },
  },
  {
    id: "developers",
    label: "Developers",
    body:
      "Deep Yellow (DYL — Tumas, Namibia), Bannerman Energy (BMN — Etango, Namibia), Aura Energy (AEE — Tiris, Mauritania) and Lotus Resources (LOT — Kayelekera restart, Malawi) are the principal development-stage names. All target first uranium between 2026 and 2028. Returns are leveraged to uranium price and project execution; dilution is the primary risk through construction.",
    cta: { label: "Find specialist advisors", href: "/advisors/resources-fund-managers" },
  },
  {
    id: "explorers",
    label: "Explorers",
    body:
      "Alligator Energy (AGE), Elevate Uranium (EL8), 92 Energy (92E), Toro Energy (TOE) and Cauldron Energy (CXU) cover pre-resource-definition exploration. Binary outcomes common — discovery can multi-bag, drill disappointment can halve equity. Position sizing should reflect exploration economics: smaller weights in more names rather than concentration in a single name.",
    cta: { label: "View mining listings", href: "/invest/mining/listings" },
  },
  {
    id: "etfs",
    label: "ETFs",
    body:
      "Global X Uranium ETF (ASX: ATOM) is the primary ASX-listed sector wrapper — ~40 positions including Cameco, Kazatomprom, NexGen, Denison, Sprott Physical Uranium, plus the ASX names. MER ~0.69%. US-listed alternatives URA and URNM offer broader exposure if you hold a US-equity-enabled brokerage account.",
    cta: { label: "Browse the ETF hub", href: "/etfs" },
  },
  {
    id: "royalties",
    label: "Project equity & royalties",
    body:
      "Unlisted project equity and private royalty interests are available but thinly traded — typically bilateral negotiations for $250K+ allocations. Foreign investors face double approval (FIRB + Atomic Energy Act). Suited to wholesale investors with specialist foreign-investment and mining-tax counsel in place.",
    cta: { label: "Find a foreign investment lawyer", href: "/advisors/foreign-investment-lawyers" },
  },
];

export default async function UraniumPage() {
  const sector = await getSector("uranium");
  if (!sector) notFound();

  const [stocks, etfs] = await Promise.all([
    listSectorStocks("uranium"),
    listSectorEtfs("uranium"),
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
            <span className="text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-yellow-100 text-yellow-800">
              Sensitive sector · Double approval
            </span>
            <span className="text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
              Independent research
            </span>
            <span className="text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
              Updated {CURRENT_YEAR}
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-4 max-w-3xl text-slate-900">
            Invest in Australian Uranium
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

      {/* Sensitive-sector banner */}
      <section className="py-6 md:py-8 bg-yellow-50 border-y border-yellow-200">
        <div className="container-custom">
          <div className="flex items-start gap-4 max-w-4xl">
            <div className="w-10 h-10 rounded-lg bg-yellow-200 flex items-center justify-center shrink-0 mt-0.5">
              <Icon name="alert-triangle" size={20} className="text-yellow-800" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold uppercase tracking-wide text-yellow-800 mb-1">
                Regulatory Context
              </h2>
              <p className="text-sm md:text-base text-yellow-900 leading-relaxed">
                Uranium is the most scrutinised sector in the Australian foreign
                investment regime. Transactions require both FIRB approval{" "}
                <em>and</em> separate Ministerial consent under the Atomic
                Energy Act 1953. State-level mining bans in Queensland, NSW, and
                Victoria — plus a de facto ban on new projects in WA — mean
                Australian domestic uranium supply is policy-constrained, not
                geology-constrained. South Australia and the Northern Territory
                are the practical production jurisdictions today.
              </p>
              <p className="text-xs text-yellow-700 mt-2">
                Sources: Atomic Energy Act 1953 (Cth); state mining legislation
                (QLD, NSW, VIC, WA).{" "}
                <span className="italic">
                  General information only, not financial or legal advice.
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
              <p className="text-xs font-bold uppercase tracking-wider text-yellow-600 mb-1">
                Section 1 &middot; Direct exposure
              </p>
              <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900">
                ASX-listed uranium stocks
              </h2>
              <p className="text-sm text-slate-500 mt-1 max-w-2xl">
                Editorially reviewed snapshots of ASX uranium producers,
                developers, and explorers. Market caps move intraday — data is
                reviewed against public sources and dated below each card.
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
            <p className="text-xs font-bold uppercase tracking-wider text-yellow-600 mb-1">
              Section 2 &middot; Five ways in
            </p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900">
              Ways to invest in Australian uranium
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              From producing majors to early-stage explorers to sector ETFs —
              each route has different capital requirements and risk profiles.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 mb-6" role="tablist">
            {WAYS_TO_INVEST.map((w, i) => (
              <a
                key={w.id}
                href={`#${w.id}`}
                className={`inline-flex items-center gap-1.5 text-xs md:text-sm font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                  i === 0
                    ? "bg-yellow-600 text-white border-yellow-600"
                    : "bg-white text-slate-700 border-slate-200 hover:border-yellow-400 hover:text-yellow-700"
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
                  <span className="w-8 h-8 rounded-full bg-yellow-600 text-white font-extrabold flex items-center justify-center">
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
                ETFs with uranium exposure
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
          <p className="text-xs font-bold uppercase tracking-wider text-yellow-400 mb-2">
            Section 3 &middot; Get specialist help
          </p>
          <h2 className="text-2xl md:text-3xl font-extrabold mb-3">
            Speak with a uranium-aware adviser
          </h2>
          <p className="text-sm md:text-base text-slate-300 leading-relaxed mb-6 max-w-2xl">
            Uranium investment has regulatory, tax, and structure considerations
            that go well beyond generic resources investing — particularly for
            foreign investors, SMSFs, and royalty-interest buyers. Our directory
            is filtered to practitioners with real sector experience.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Link
              href="/advisors/resources-fund-managers"
              className="group bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-5 transition-colors"
            >
              <div className="flex items-center gap-3 mb-2">
                <Icon name="bar-chart-2" size={20} className="text-yellow-400" />
                <h3 className="text-base font-extrabold text-white group-hover:text-yellow-300">
                  Resources fund managers
                </h3>
              </div>
              <p className="text-xs md:text-sm text-slate-300">
                Actively managed resources funds with uranium exposure
                including wholesale and retail-registered structures.
              </p>
            </Link>

            <Link
              href="/advisors/foreign-investment-lawyers"
              className="group bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-5 transition-colors"
            >
              <div className="flex items-center gap-3 mb-2">
                <Icon name="globe" size={20} className="text-yellow-400" />
                <h3 className="text-base font-extrabold text-white group-hover:text-yellow-300">
                  Foreign investment lawyers
                </h3>
              </div>
              <p className="text-xs md:text-sm text-slate-300">
                FIRB and Atomic Energy Act Ministerial approval specialists for
                cross-border uranium acquisitions.
              </p>
            </Link>

            <Link
              href="/advisors/mining-lawyers"
              className="group bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-5 transition-colors"
            >
              <div className="flex items-center gap-3 mb-2">
                <Icon name="pickaxe" size={20} className="text-yellow-400" />
                <h3 className="text-base font-extrabold text-white group-hover:text-yellow-300">
                  Mining lawyers
                </h3>
              </div>
              <p className="text-xs md:text-sm text-slate-300">
                Tenement acquisition, joint venture, offtake structuring and
                state-level mining approval experience.
              </p>
            </Link>

            <Link
              href="/advisors/mining-tax-advisors"
              className="group bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-5 transition-colors"
            >
              <div className="flex items-center gap-3 mb-2">
                <Icon name="calculator" size={20} className="text-yellow-400" />
                <h3 className="text-base font-extrabold text-white group-hover:text-yellow-300">
                  Mining tax advisors
                </h3>
              </div>
              <p className="text-xs md:text-sm text-slate-300">
                State royalty regimes (SA, NT), cross-border structuring, and
                SMSF uranium tax treatment.
              </p>
            </Link>
          </div>

          <Link
            href="/find-advisor?focus=uranium"
            className="inline-flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-extrabold text-sm md:text-base px-6 py-3 rounded-lg transition-colors"
          >
            Match me with an adviser
            <Icon name="arrow-right" size={16} />
          </Link>
        </div>
      </section>

      {/* Foreign investor note */}
      <section className="py-10 md:py-12 bg-white" id="foreign-investors">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-yellow-600 mb-1">
            Section 4 &middot; International investors
          </p>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">
            Foreign investor note
          </h2>

          <div className="prose prose-slate max-w-none mb-6">
            <p>
              Uranium is the most tightly-scrutinised sector in the Australian
              foreign investment regime. Non-Australian investors should budget
              for:
            </p>
            <ul>
              <li>
                <strong>Double approval.</strong> FIRB approval{" "}
                <em>and</em> separate Ministerial consent under the Atomic
                Energy Act 1953. Transactions can proceed only if both approvals
                are granted.
              </li>
              <li>
                <strong>Bilateral safeguards.</strong> Australia only exports
                uranium — and only permits foreign acquisitions in the uranium
                sector — to jurisdictions that hold current bilateral safeguards
                agreements. Chinese and Russian capital faces particular
                restrictions.
              </li>
              <li>
                <strong>Timeline and cost.</strong> Combined approval typically
                runs 90-180 days for allied-nation private investors. Legal
                fees for combined FIRB + Ministerial applications typically
                A$120K-$300K.
              </li>
              <li>
                <strong>Portfolio share exemption.</strong> Holdings below 10%
                of an ASX-listed uranium company are generally exempt from FIRB
                notification. Above 10% the full double-approval regime
                applies.
              </li>
            </ul>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/foreign-investment/energy"
              className="inline-flex items-center gap-1.5 text-sm font-bold bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2.5 rounded-lg transition-colors"
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

      <VerticalMarketplaceListings
        vertical="uranium"
        accent="yellow"
        id="marketplace"
        sub="Twelve active uranium opportunities — ASX producers and developers plus named project-equity deals. Register interest directly with the listing contact."
      />

      <GeneralAdviceWarning sectorDisplayName={sector.display_name} />
    </div>
  );
}
