import Link from "next/link";
import Icon from "@/components/Icon";
import AsxTickerCard from "@/components/commodities/AsxTickerCard";
import EtfComparisonCard from "@/components/commodities/EtfComparisonCard";
import GeneralAdviceWarning from "@/components/commodities/GeneralAdviceWarning";
import type {
  CommoditySector,
  CommodityStock,
  CommodityEtf,
  CommodityNewsBrief,
} from "@/lib/commodities";

interface Props {
  sector: CommoditySector;
  stocks: CommodityStock[];
  etfs: CommodityEtf[];
  newsBriefs: CommodityNewsBrief[];
}

const ESG_BADGE: Record<string, { label: string; className: string }> = {
  low: { label: "Low ESG risk", className: "bg-emerald-100 text-emerald-800" },
  medium: { label: "Medium ESG risk", className: "bg-amber-100 text-amber-800" },
  high: { label: "High ESG risk", className: "bg-rose-100 text-rose-800" },
};

/**
 * Master renderer for a commodity sector hub page.
 *
 * Every /invest/<sector> page that's driven by commodity_sectors
 * uses this component so they all share the same:
 *   - Hero + breadcrumbs + ESG badge
 *   - Direct-ASX stock list
 *   - ETF list
 *   - News brief feed
 *   - General advice warning footer
 *   - Advisor lead-magnet CTA
 *
 * Adding a new sector is: (1) insert a row into commodity_sectors
 * via /admin/commodity-hubs, (2) create app/invest/<slug>/page.tsx
 * that passes the slug to getSector()/listSectorStocks() and
 * hands the result to this component. No new layout work.
 */
export default function CommodityHub({
  sector,
  stocks,
  etfs,
  newsBriefs,
}: Props) {
  const esgBadge = ESG_BADGE[sector.esg_risk_rating];
  const heroStats = sector.hero_stats || {};

  return (
    <div>
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
            {esgBadge && (
              <span
                className={`text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full ${esgBadge.className}`}
              >
                {esgBadge.label}
              </span>
            )}
            <span className="text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
              Independent research
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-4 max-w-3xl text-slate-900">
            Invest in Australian {sector.display_name}
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

      {/* Direct stocks */}
      {stocks.length > 0 && (
        <section className="py-8 md:py-10 bg-slate-50">
          <div className="container-custom">
            <div className="mb-5">
              <h2 className="text-xl md:text-2xl font-extrabold text-slate-900">
                ASX-listed {sector.display_name.toLowerCase()} stocks
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Direct equity exposure via the Australian market. All CHESS-
                sponsored via any of our compared brokers.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {stocks.map((s) => (
                <AsxTickerCard key={s.id} stock={s} />
              ))}
            </div>
            <div className="mt-6">
              <Link
                href="/compare"
                className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline"
              >
                Compare brokers that carry these stocks
                <Icon name="arrow-right" size={14} />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ETFs */}
      {etfs.length > 0 && (
        <section className="py-8 md:py-10 bg-white">
          <div className="container-custom">
            <div className="mb-5">
              <h2 className="text-xl md:text-2xl font-extrabold text-slate-900">
                ETFs with {sector.display_name.toLowerCase()} exposure
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                ETF wrappers are the simplest way to get diversified
                sector exposure without picking individual stocks.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              {etfs.map((e) => (
                <EtfComparisonCard key={e.id} etf={e} />
              ))}
            </div>
            <div className="mt-6">
              <Link
                href="/etfs"
                className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline"
              >
                Browse the full ETF hub
                <Icon name="arrow-right" size={14} />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* News briefs */}
      {newsBriefs.length > 0 && (
        <section className="py-8 md:py-10 bg-slate-50 border-y border-slate-100">
          <div className="container-custom">
            <div className="mb-5">
              <h2 className="text-xl md:text-2xl font-extrabold text-slate-900">
                Latest {sector.display_name.toLowerCase()} news
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Rapid-publish follow-ups tied to confirmed ASX releases and
                Government announcements. Each piece is reviewed by a named
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
                          {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          },
                        )}
                      </time>
                    </div>
                    {brief.source_url && (
                      <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                        Source: {new URL(brief.source_url).hostname}
                      </p>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Regulator notes */}
      {sector.regulator_notes && (
        <section className="py-6 md:py-8 bg-amber-50 border-y border-amber-200">
          <div className="container-custom max-w-3xl">
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-amber-800 mb-2">
              Regulator notes
            </h2>
            <p className="text-sm text-amber-900">{sector.regulator_notes}</p>
          </div>
        </section>
      )}

      {/* Advisor CTA — highest monetisation path */}
      <section className="py-10 md:py-14 bg-white">
        <div className="container-custom max-w-3xl text-center">
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-3">
            Want {sector.display_name.toLowerCase()} exposure inside your SMSF?
          </h2>
          <p className="text-sm md:text-base text-slate-600 mb-6">
            Sector investing has tax, concentration and custody considerations
            that are worth talking to a licensed advisor about — especially
            inside a self-managed super fund. We hand-match you with
            ASIC-registered specialists.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href={`/find-advisor?focus=${sector.slug}`}
              className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm md:text-base px-6 py-3 rounded-lg transition-colors"
            >
              Find a specialist advisor →
            </Link>
            <Link
              href={`/quiz?vertical=resources`}
              className="text-sm md:text-base font-semibold text-primary hover:underline"
            >
              Take the 30-second quiz
            </Link>
          </div>
        </div>
      </section>

      <GeneralAdviceWarning sectorDisplayName={sector.display_name} />
    </div>
  );
}
