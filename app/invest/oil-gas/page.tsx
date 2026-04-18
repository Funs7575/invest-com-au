import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getSector,
  listSectorStocks,
  listSectorEtfs,
  listSectorNewsBriefs,
  getLatestPriceSnapshots,
} from "@/lib/commodities";
import AsxTickerCard from "@/components/commodities/AsxTickerCard";
import EtfComparisonCard from "@/components/commodities/EtfComparisonCard";
import GeneralAdviceWarning from "@/components/commodities/GeneralAdviceWarning";
import EnergyPriceWidget from "@/components/commodities/EnergyPriceWidget";
import Icon from "@/components/Icon";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";

export const revalidate = 1800;

export const metadata: Metadata = {
  title: `Invest in Australian Oil & Gas (${CURRENT_YEAR}) — ASX Stocks, LNG & Refinery Infrastructure`,
  description:
    "Independent Australian guide to oil & gas investing. ASX majors (WDS, STO), refineries (VEA, ALD), LNG royalties, crude ETFs (OOO), FIRB rules, and fuel security context.",
  alternates: { canonical: `${SITE_URL}/invest/oil-gas` },
  openGraph: {
    title: `Invest in Australian Oil & Gas (${CURRENT_YEAR})`,
    description:
      "ASX-listed majors, refineries, LNG royalties, ETFs, and FIRB rules for international investors.",
    url: `${SITE_URL}/invest/oil-gas`,
  },
};

const WAYS_TO_INVEST = [
  {
    id: "asx-shares",
    label: "ASX shares",
    body:
      "The most direct and most liquid route. Woodside (WDS) and Santos (STO) sit in the ASX 50 and are held widely in domestic super funds. Mid-caps (Beach, Karoon) and refiners (Viva Energy, Ampol) add diversification. Franking credits materially boost after-tax yield for Australian residents — less so for non-residents, who instead benefit from the Section 855-10 portfolio CGT exemption on listed shares.",
    cta: { label: "Compare ASX brokers", href: "/compare?category=shares" },
  },
  {
    id: "etfs",
    label: "ETFs",
    body:
      "Crude-price and sector-wide ETFs make oil-gas exposure a single-trade decision. BetaShares OOO tracks currency-hedged WTI crude; global sector ETFs like FUEL and VanEck Global Energy include international majors. ETF wrappers remove single-stock risk and simplify SMSF record-keeping — expect MER in the 0.50%-0.85% band and be aware of roll yield on commodity ETFs.",
    cta: { label: "Browse the ETF hub", href: "/etfs" },
  },
  {
    id: "wholesale-funds",
    label: "Wholesale funds",
    body:
      "Actively managed energy funds — long-only or long-short — give access to research, FX-hedged offshore positions, and unlisted midstream assets. Typical minimums $25K (retail-registered) to $100K+ (wholesale). Fee stack usually 1.0%-1.5% management plus 15%-20% performance over a hurdle. Check the Information Memorandum, AUM, and the PM's personal co-investment.",
    cta: { label: "Compare fund managers", href: "/advisors/resources-fund-managers" },
  },
  {
    id: "project-equity",
    label: "Project equity",
    body:
      "Direct equity or convertible notes into named upstream, midstream, or fuel storage projects. Highest potential return but illiquid and concentration-heavy. Foreign investors should budget FIRB approval (sensitive-sector). Suited to sophisticated or wholesale investors with a specialist adviser and $250K+ to allocate.",
    cta: { label: "View project listings", href: "/invest/listings?vertical=oil-gas" },
  },
  {
    id: "royalties",
    label: "Royalties",
    body:
      "Passive income on the revenue or net profits of a named petroleum operation. Structures include overriding, net-profits, and sliding-scale royalties linked to Brent pricing bands. Tax treatment is ordinary income, not CGT, with PRRT interaction — engage a petroleum royalties advisor before buying a secondary royalty stream.",
    cta: { label: "Find a royalties advisor", href: "/advisors/petroleum-royalties-advisors" },
  },
];

export default async function OilGasPage() {
  const sector = await getSector("oil-gas");
  if (!sector) notFound();

  const [stocks, etfs, newsBriefs, priceSnapshots] = await Promise.all([
    listSectorStocks("oil-gas"),
    listSectorEtfs("oil-gas"),
    listSectorNewsBriefs("oil-gas"),
    getLatestPriceSnapshots(["brent-crude", "wti-crude", "jkm-lng"]),
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

      <EnergyPriceWidget snapshots={priceSnapshots} />

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
            <span className="text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
              High ESG risk
            </span>
            <span className="text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
              Independent research
            </span>
            <span className="text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
              Updated {CURRENT_YEAR}
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-4 max-w-3xl text-slate-900">
            Invest in Australian Oil &amp; Gas
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

      {/* 1. Fuel security amber banner */}
      <section className="py-6 md:py-8 bg-amber-50 border-y border-amber-200">
        <div className="container-custom">
          <div className="flex items-start gap-4 max-w-4xl">
            <div className="w-10 h-10 rounded-lg bg-amber-200 flex items-center justify-center shrink-0 mt-0.5">
              <Icon name="alert-triangle" size={20} className="text-amber-800" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold uppercase tracking-wide text-amber-800 mb-1">
                Fuel Security Context
              </h2>
              <p className="text-sm md:text-base text-amber-900 leading-relaxed">
                Australia imports around 90% of its refined fuels and retains only
                two operating refineries — Viva Energy&rsquo;s Geelong plant (VIC)
                and Ampol&rsquo;s Lytton plant (QLD). The federal Fuel Security
                Services Payment has been extended to 2030 to keep both
                operating, and a Minimum Stockholding Obligation underpins fuel
                inventory at terminals nationwide. Anyone investing in domestic
                refining, storage, or LNG infrastructure should assume these
                schemes are the base case for the decade — and that policy
                changes materially shift the investment thesis.
              </p>
              <p className="text-xs text-amber-700 mt-2">
                Sources: Department of Climate Change, Energy, the Environment
                and Water — National Fuel Security Plan.{" "}
                <span className="italic">
                  General information only, not financial advice.
                </span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. ASX stocks card grid */}
      {stocks.length > 0 && (
        <section className="py-10 md:py-12 bg-slate-50" id="asx-stocks">
          <div className="container-custom">
            <div className="mb-6">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-600 mb-1">
                Section 1 &middot; Direct exposure
              </p>
              <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900">
                ASX-listed oil &amp; gas stocks
              </h2>
              <p className="text-sm text-slate-500 mt-1 max-w-2xl">
                Direct equity exposure via the Australian market. All are
                CHESS-sponsored via any of our compared brokers. Yields and
                market caps move intraday — figures shown are editorially
                reviewed snapshots.
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
                href="/invest/listings?vertical=oil-gas"
                className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline"
              >
                View oil &amp; gas project listings
                <Icon name="arrow-right" size={14} />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* 3. Ways-to-invest tabs */}
      <section className="py-10 md:py-12 bg-white" id="ways-to-invest">
        <div className="container-custom">
          <div className="mb-6 max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-600 mb-1">
              Section 2 &middot; Five ways in
            </p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900">
              Ways to invest in Australian oil &amp; gas
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Each route has a different liquidity profile, tax treatment and
              minimum. Tap a tab below for the detail.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 mb-6" role="tablist">
            {WAYS_TO_INVEST.map((w, i) => (
              <a
                key={w.id}
                href={`#${w.id}`}
                className={`inline-flex items-center gap-1.5 text-xs md:text-sm font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                  i === 0
                    ? "bg-amber-500 text-white border-amber-500"
                    : "bg-white text-slate-700 border-slate-200 hover:border-amber-400 hover:text-amber-700"
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
                  <span className="w-8 h-8 rounded-full bg-amber-500 text-white font-extrabold flex items-center justify-center">
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

      {/* ETFs — retained from commodity hub pattern */}
      {etfs.length > 0 && (
        <section className="py-10 md:py-12 bg-slate-50 border-y border-slate-100">
          <div className="container-custom">
            <div className="mb-5">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-600 mb-1">
                Supporting detail
              </p>
              <h2 className="text-xl md:text-2xl font-extrabold text-slate-900">
                ETFs with oil &amp; gas exposure
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

      {/* News briefs */}
      {newsBriefs.length > 0 && (
        <section className="py-10 md:py-12 bg-white">
          <div className="container-custom">
            <div className="mb-5">
              <h2 className="text-xl md:text-2xl font-extrabold text-slate-900">
                Latest oil &amp; gas news
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Rapid-publish follow-ups tied to confirmed ASX releases and
                government announcements. Each piece is reviewed by a named
                editor before going live.
              </p>
            </div>
            <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
              {newsBriefs.map((brief) => (
                <li key={brief.id}>
                  <Link
                    href={`/article/${brief.article_slug}`}
                    className="block px-4 py-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-baseline justify-between gap-3 flex-wrap">
                      <p className="text-sm font-bold text-slate-900">
                        {brief.event_title}
                      </p>
                      <time
                        dateTime={brief.event_date}
                        className="text-[11px] text-slate-500"
                      >
                        {new Date(brief.event_date).toLocaleDateString(
                          "en-AU",
                          { day: "numeric", month: "short", year: "numeric" },
                        )}
                      </time>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* 4. Find-advisor CTA */}
      <section className="py-12 md:py-14 bg-slate-900 text-white" id="find-advisor">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-2">
            Section 3 &middot; Get specialist help
          </p>
          <h2 className="text-2xl md:text-3xl font-extrabold mb-3">
            Speak with an energy-specialist adviser
          </h2>
          <p className="text-sm md:text-base text-slate-300 leading-relaxed mb-6 max-w-2xl">
            Concentrated energy exposure — whether from employee shares,
            inherited holdings, or deliberate allocation — carries tax,
            structure, and concentration risks worth talking through with a
            licensed Australian adviser. Our directory is filtered to
            practitioners with real sector experience.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Link
              href="/advisors/energy-financial-planners"
              className="group bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-5 transition-colors"
            >
              <div className="flex items-center gap-3 mb-2">
                <Icon name="fuel" size={20} className="text-amber-400" />
                <h3 className="text-base font-extrabold text-white group-hover:text-amber-300">
                  Energy financial planners
                </h3>
              </div>
              <p className="text-xs md:text-sm text-slate-300">
                Fee-for-service AFSL-authorised planners with experience across
                concentrated ASX energy holdings, refinery-engineer tax
                planning, and SMSF energy infrastructure allocation.
              </p>
            </Link>

            <Link
              href="/advisors/resources-fund-managers"
              className="group bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-5 transition-colors"
            >
              <div className="flex items-center gap-3 mb-2">
                <Icon name="bar-chart-2" size={20} className="text-amber-400" />
                <h3 className="text-base font-extrabold text-white group-hover:text-amber-300">
                  Resources fund managers
                </h3>
              </div>
              <p className="text-xs md:text-sm text-slate-300">
                Wholesale and retail actively managed resources funds — long-only,
                long-short, and energy-transition strategies with disclosed AUM
                and track records.
              </p>
            </Link>

            <Link
              href="/advisors/foreign-investment-lawyers"
              className="group bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-5 transition-colors"
            >
              <div className="flex items-center gap-3 mb-2">
                <Icon name="globe" size={20} className="text-amber-400" />
                <h3 className="text-base font-extrabold text-white group-hover:text-amber-300">
                  Foreign investment lawyers
                </h3>
              </div>
              <p className="text-xs md:text-sm text-slate-300">
                FIRB and national-security review specialists handling
                cross-border acquisitions of Australian energy, LNG, and critical
                infrastructure assets.
              </p>
            </Link>

            <Link
              href="/advisors/petroleum-royalties-advisors"
              className="group bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-5 transition-colors"
            >
              <div className="flex items-center gap-3 mb-2">
                <Icon name="banknote" size={20} className="text-amber-400" />
                <h3 className="text-base font-extrabold text-white group-hover:text-amber-300">
                  Petroleum royalties advisors
                </h3>
              </div>
              <p className="text-xs md:text-sm text-slate-300">
                Specialists on petroleum royalty structures, state royalty
                regimes, PRRT interaction, and secondary-market royalty
                valuations.
              </p>
            </Link>
          </div>

          <Link
            href="/find-advisor?focus=oil-gas"
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-extrabold text-sm md:text-base px-6 py-3 rounded-lg transition-colors"
          >
            Match me with an adviser
            <Icon name="arrow-right" size={16} />
          </Link>
        </div>
      </section>

      {/* 5. Foreign-investor note */}
      <section className="py-10 md:py-12 bg-white" id="foreign-investors">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-600 mb-1">
            Section 4 &middot; International investors
          </p>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">
            Foreign investor note
          </h2>

          <div className="prose prose-slate max-w-none mb-6">
            <p>
              Australian oil, gas, LNG, and fuel-storage assets sit inside one
              of the most scrutinised foreign investment perimeters in the
              OECD. Before committing capital to an Australian energy asset,
              non-Australian investors should budget for the following:
            </p>
            <ul>
              <li>
                <strong>FIRB approval is the default, not the exception.</strong>{" "}
                Direct acquisitions of petroleum tenements, LNG plants, pipelines,
                storage terminals, and most refinery interests are notifiable
                regardless of transaction value. Portfolio share acquisitions
                below 10% of an ASX-listed producer are generally exempt.
              </li>
              <li>
                <strong>Critical infrastructure designation.</strong> Under the
                2025 amendments to the Security of Critical Infrastructure Act,
                many midstream and storage assets — not just the obvious LNG
                plants — are now subject to national-security review in
                addition to the economic benefit test.
              </li>
              <li>
                <strong>Tax.</strong> Non-residents holding &lt;10% of an
                Australian listed company are generally exempt from Australian
                CGT on listed shares (Section 855-10 ITAA 1997). Dividend
                withholding is 30% on unfranked dividends (reduced by applicable
                DTA — often to 15%), 0% on fully franked. Royalty income is
                always subject to withholding.
              </li>
              <li>
                <strong>Cross-border structure matters.</strong> The choice
                between holding via an Australian company, an LLP, a Singapore or
                Netherlands treaty structure, or a trust can move overall tax
                materially and — critically — affect how any future exit is
                taxed.
              </li>
            </ul>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/foreign-investment/energy"
              className="inline-flex items-center gap-1.5 text-sm font-bold bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-lg transition-colors"
            >
              Read the full foreign-investment in energy guide
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

      {/* Research cross-link */}
      <section className="py-8 bg-slate-50 border-t border-slate-200">
        <div className="container-custom max-w-4xl">
          <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col md:flex-row items-start md:items-center gap-5">
            <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <Icon name="file-text" size={22} className="text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-base md:text-lg font-extrabold text-slate-900">
                Australian Energy Investment Report 2026
              </h3>
              <p className="text-sm text-slate-600 mt-1">
                48-page editorial report covering ASX oil &amp; gas, uranium, hydrogen, LNG economics, and the 2025 critical-infrastructure amendments. Free download, email registration required.
              </p>
            </div>
            <Link
              href="/research/australian-energy-investment-report-2026"
              className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm px-5 py-2.5 rounded-lg shrink-0"
            >
              Download report &rarr;
            </Link>
          </div>
        </div>
      </section>

      <GeneralAdviceWarning sectorDisplayName={sector.display_name} />
    </div>
  );
}
