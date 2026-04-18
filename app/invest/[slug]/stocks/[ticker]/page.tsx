import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import { createAdminClient } from "@/lib/supabase/admin";
import Icon from "@/components/Icon";

export const revalidate = 3600;

interface StockRow {
  id: number;
  sector_slug: string;
  ticker: string;
  company_name: string;
  market_cap_bucket: string | null;
  dividend_yield_pct: number | string | null;
  pe_ratio: number | string | null;
  blurb: string | null;
  primary_exposure: string | null;
  included_in_indices: string[] | null;
  foreign_ownership_risk: string | null;
  last_reviewed_at: string | null;
  status: string | null;
}

interface SectorRow {
  slug: string;
  display_name: string;
}

interface BrokerRow {
  slug: string;
  name: string;
  logo_url: string | null;
  asx_fee: string | null;
  rating: number | string | null;
  chess_sponsored: boolean | null;
  tagline: string | null;
  affiliate_url: string | null;
}

async function fetchStock(sectorSlug: string, ticker: string): Promise<StockRow | null> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("commodity_stocks")
      .select("*")
      .eq("sector_slug", sectorSlug)
      .ilike("ticker", ticker)
      .eq("status", "active")
      .maybeSingle();
    return (data as StockRow | null) || null;
  } catch {
    return null;
  }
}

async function fetchSector(slug: string): Promise<SectorRow | null> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("commodity_sectors")
      .select("slug, display_name")
      .eq("slug", slug)
      .eq("status", "active")
      .maybeSingle();
    return (data as SectorRow | null) || null;
  } catch {
    return null;
  }
}

async function fetchRelated(sectorSlug: string, excludeTicker: string): Promise<StockRow[]> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("commodity_stocks")
      .select("id, sector_slug, ticker, company_name, market_cap_bucket, dividend_yield_pct, pe_ratio, blurb, primary_exposure, foreign_ownership_risk, last_reviewed_at, status, included_in_indices")
      .eq("sector_slug", sectorSlug)
      .eq("status", "active")
      .neq("ticker", excludeTicker.toUpperCase())
      .order("display_order", { ascending: true })
      .limit(3);
    return (data as StockRow[] | null) || [];
  } catch {
    return [];
  }
}

async function fetchTopBrokers(): Promise<BrokerRow[]> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("brokers")
      .select("slug, name, logo_url, asx_fee, rating, chess_sponsored, tagline, affiliate_url")
      .eq("status", "active")
      .eq("is_crypto", false)
      .order("rating", { ascending: false })
      .limit(3);
    return (data as BrokerRow[] | null) || [];
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; ticker: string }>;
}): Promise<Metadata> {
  const { slug, ticker } = await params;
  const stock = await fetchStock(slug, ticker);
  if (!stock) return { title: `ASX Stock (${CURRENT_YEAR})` };

  return {
    title: `${stock.ticker} — ${stock.company_name} (ASX) | Invest.com.au`,
    description:
      stock.blurb ||
      `${stock.company_name} (ASX: ${stock.ticker}) — market cap, dividend yield and where to buy this Australian ${ticker.toUpperCase()} stock.`,
    alternates: {
      canonical: `${SITE_URL}/invest/${slug}/stocks/${stock.ticker.toLowerCase()}`,
    },
  };
}

const BUCKET_LABELS: Record<string, string> = {
  mega: "Mega-cap (>A$50B)",
  large: "Large-cap (A$5B – A$50B)",
  mid: "Mid-cap (A$500M – A$5B)",
  small: "Small-cap (A$100M – A$500M)",
  spec: "Speculative (<A$100M)",
};

function formatPct(value: number | string | null): string {
  if (value == null) return "—";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (!Number.isFinite(num)) return "—";
  return `${num.toFixed(2)}%`;
}

function formatPe(value: number | string | null): string {
  if (value == null) return "—";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (!Number.isFinite(num)) return "—";
  return `${num.toFixed(1)}x`;
}

function formatRating(value: number | string | null): string {
  if (value == null) return "—";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (!Number.isFinite(num)) return "—";
  return `${num.toFixed(1)} / 5`;
}

export default async function StockDetailPage({
  params,
}: {
  params: Promise<{ slug: string; ticker: string }>;
}) {
  const { slug, ticker } = await params;
  const stock = await fetchStock(slug, ticker);
  if (!stock) notFound();
  const sector = await fetchSector(slug);
  const [related, brokers] = await Promise.all([
    fetchRelated(slug, stock.ticker),
    fetchTopBrokers(),
  ]);

  const sectorName = sector?.display_name ?? slug;

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: `${SITE_URL}/invest` },
    { name: sectorName, url: `${SITE_URL}/invest/${slug}` },
    { name: "Stocks", url: `${SITE_URL}/invest/${slug}/stocks` },
    { name: stock.ticker },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <div className="bg-slate-50 min-h-screen">
        <section className="bg-white border-b border-slate-200 py-8 md:py-10">
          <div className="container-custom">
            <nav
              className="flex items-center gap-1.5 text-xs text-slate-500 mb-5"
              aria-label="Breadcrumb"
            >
              <Link href="/" className="hover:text-slate-900">Home</Link>
              <span className="text-slate-300">/</span>
              <Link href="/invest" className="hover:text-slate-900">Invest</Link>
              <span className="text-slate-300">/</span>
              <Link href={`/invest/${slug}`} className="hover:text-slate-900">
                {sectorName}
              </Link>
              <span className="text-slate-300">/</span>
              <Link
                href={`/invest/${slug}/stocks`}
                className="hover:text-slate-900"
              >
                Stocks
              </Link>
              <span className="text-slate-300">/</span>
              <span className="text-slate-900 font-medium">{stock.ticker}</span>
            </nav>

            <div className="flex items-baseline gap-3 mb-2">
              <h1 className="text-3xl md:text-4xl font-extrabold text-amber-700 tabular-nums">
                {stock.ticker}
              </h1>
              <span className="text-sm md:text-base text-slate-500">(ASX)</span>
            </div>
            <p className="text-xl md:text-2xl font-extrabold text-slate-900">
              {stock.company_name}
            </p>
            {stock.blurb && (
              <p className="text-sm md:text-base text-slate-600 leading-relaxed max-w-3xl mt-3">
                {stock.blurb}
              </p>
            )}
          </div>
        </section>

        <section className="py-8 md:py-10">
          <div className="container-custom grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main column */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h2 className="text-lg font-extrabold text-slate-900 mb-4">
                  Key metrics
                </h2>
                <dl className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Metric
                    label="Market cap"
                    value={
                      stock.market_cap_bucket
                        ? BUCKET_LABELS[stock.market_cap_bucket] ??
                          stock.market_cap_bucket
                        : "—"
                    }
                  />
                  <Metric
                    label="Dividend yield"
                    value={formatPct(stock.dividend_yield_pct)}
                  />
                  <Metric label="P/E ratio" value={formatPe(stock.pe_ratio)} />
                  <Metric
                    label="Primary exposure"
                    value={stock.primary_exposure ?? "—"}
                  />
                </dl>
              </div>

              {stock.included_in_indices &&
                stock.included_in_indices.length > 0 && (
                  <div className="bg-white border border-slate-200 rounded-xl p-6">
                    <h2 className="text-lg font-extrabold text-slate-900 mb-3">
                      Index inclusion
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {stock.included_in_indices.map((idx) => (
                        <span
                          key={idx}
                          className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700"
                        >
                          {idx}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              {stock.foreign_ownership_risk && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                  <h3 className="text-xs font-extrabold uppercase tracking-wide text-amber-800 mb-1">
                    Foreign-ownership risk
                  </h3>
                  <p className="text-sm text-amber-900 leading-relaxed">
                    {stock.foreign_ownership_risk}
                  </p>
                </div>
              )}

              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  <strong>General information only.</strong> Market figures are
                  editorial snapshots
                  {stock.last_reviewed_at
                    ? ` (last reviewed ${new Date(
                        stock.last_reviewed_at,
                      ).toLocaleDateString("en-AU", {
                        month: "short",
                        year: "numeric",
                      })})`
                    : ""}{" "}
                  and move intraday. Confirm current prices and dividends via
                  your broker. Invest.com.au does not provide personal
                  financial product advice — engage a licensed adviser before
                  making investment decisions.
                </p>
              </div>
            </div>

            {/* Buy via these brokers sidebar */}
            <aside className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <h2 className="text-base font-extrabold text-slate-900 mb-3">
                  Buy {stock.ticker} via these brokers
                </h2>
                {brokers.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    Compare brokers to buy this stock.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {brokers.map((b) => (
                      <li
                        key={b.slug}
                        className="border border-slate-100 rounded-lg p-3"
                      >
                        <div className="flex items-start justify-between gap-3 mb-1">
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-sm text-slate-900 truncate">
                              {b.name}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              Rating: {formatRating(b.rating)}
                              {b.chess_sponsored ? " · CHESS" : ""}
                            </p>
                          </div>
                          {b.asx_fee && (
                            <span className="text-[11px] font-bold text-slate-700 whitespace-nowrap">
                              {b.asx_fee}
                            </span>
                          )}
                        </div>
                        <Link
                          href={`/broker/${b.slug}`}
                          className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 hover:underline"
                        >
                          View review
                          <Icon name="arrow-right" size={12} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                <Link
                  href="/compare?category=shares"
                  className="mt-4 inline-flex items-center justify-center gap-2 w-full bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm px-4 py-2.5 rounded-lg"
                >
                  Compare all ASX brokers
                  <Icon name="arrow-right" size={14} />
                </Link>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <h3 className="text-sm font-extrabold text-slate-900 mb-2">
                  Prefer diversified exposure?
                </h3>
                <p className="text-xs text-slate-600 mb-3">
                  See {sectorName.toLowerCase()} sector ETFs for a single-ticket
                  wrapper across multiple companies.
                </p>
                <Link
                  href={`/invest/${slug}/etfs`}
                  className="inline-flex items-center gap-1 text-sm font-bold text-amber-600 hover:underline"
                >
                  View {sectorName} ETFs
                  <Icon name="arrow-right" size={12} />
                </Link>
              </div>
            </aside>
          </div>
        </section>

        {related.length > 0 && (
          <section className="py-8 bg-white border-t border-slate-200">
            <div className="container-custom">
              <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-5">
                Related {sectorName.toLowerCase()} stocks
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {related.map((r) => (
                  <Link
                    key={r.id}
                    href={`/invest/${slug}/stocks/${r.ticker.toLowerCase()}`}
                    className="block bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl p-5 transition-colors"
                  >
                    <span className="text-xs font-extrabold text-amber-700">
                      {r.ticker}
                    </span>
                    <p className="text-sm font-bold text-slate-900 mt-1 line-clamp-1">
                      {r.company_name}
                    </p>
                    {r.blurb && (
                      <p className="text-xs text-slate-500 mt-2 line-clamp-2">
                        {r.blurb}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
      <dt className="text-[10px] font-bold uppercase text-slate-500 tracking-wide">
        {label}
      </dt>
      <dd className="text-sm md:text-base font-extrabold text-slate-900 mt-0.5">
        {value}
      </dd>
    </div>
  );
}
