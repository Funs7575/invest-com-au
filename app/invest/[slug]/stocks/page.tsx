import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import { createAdminClient } from "@/lib/supabase/admin";
import Icon from "@/components/Icon";

export const revalidate = 1800;

interface StockRow {
  id: number;
  ticker: string;
  company_name: string;
  market_cap_bucket: string | null;
  dividend_yield_pct: number | string | null;
  pe_ratio: number | string | null;
  blurb: string | null;
  primary_exposure: string | null;
  foreign_ownership_risk: string | null;
  display_order: number | null;
  status: string | null;
}

interface SectorRow {
  slug: string;
  display_name: string;
  hero_description: string | null;
}

async function fetchSector(slug: string): Promise<SectorRow | null> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("commodity_sectors")
      .select("slug, display_name, hero_description")
      .eq("slug", slug)
      .eq("status", "active")
      .maybeSingle();
    return (data as SectorRow | null) || null;
  } catch {
    return null;
  }
}

async function fetchStocks(sectorSlug: string): Promise<StockRow[]> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("commodity_stocks")
      .select(
        "id, ticker, company_name, market_cap_bucket, dividend_yield_pct, pe_ratio, blurb, primary_exposure, foreign_ownership_risk, display_order, status",
      )
      .eq("sector_slug", sectorSlug)
      .eq("status", "active")
      .order("display_order", { ascending: true });
    return (data as StockRow[] | null) || [];
  } catch {
    return [];
  }
}

export async function generateStaticParams() {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("commodity_sectors")
      .select("slug")
      .eq("status", "active");
    return (data || []).map((row: { slug: string }) => ({ slug: row.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const sector = await fetchSector(slug);
  if (!sector) {
    return { title: `ASX Stocks (${CURRENT_YEAR})` };
  }
  return {
    title: `ASX ${sector.display_name} Stocks (${CURRENT_YEAR}) — Compare Australian ${sector.display_name} Investment Opportunities`,
    description: `Compare ASX-listed ${sector.display_name.toLowerCase()} stocks in Australia. Market cap, dividend yield, P/E ratio, and foreign-ownership risk flags for every active company on the register.`,
    alternates: {
      canonical: `${SITE_URL}/invest/${slug}/stocks`,
    },
    openGraph: {
      title: `ASX ${sector.display_name} Stocks (${CURRENT_YEAR})`,
      url: `${SITE_URL}/invest/${slug}/stocks`,
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

export default async function SectorStocksPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const sector = await fetchSector(slug);
  if (!sector) notFound();
  const stocks = await fetchStocks(slug);

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: `${SITE_URL}/invest` },
    { name: sector.display_name, url: `${SITE_URL}/invest/${slug}` },
    { name: "ASX Stocks" },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <div className="bg-white min-h-screen">
        <section className="bg-slate-900 text-white py-10 md:py-12">
          <div className="container-custom">
            <nav
              className="flex items-center gap-1.5 text-xs text-slate-400 mb-5"
              aria-label="Breadcrumb"
            >
              <Link href="/" className="hover:text-white">Home</Link>
              <span className="text-slate-600">/</span>
              <Link href="/invest" className="hover:text-white">Invest</Link>
              <span className="text-slate-600">/</span>
              <Link href={`/invest/${slug}`} className="hover:text-white">
                {sector.display_name}
              </Link>
              <span className="text-slate-600">/</span>
              <span className="text-white font-medium">ASX Stocks</span>
            </nav>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold leading-tight mb-3">
              ASX {sector.display_name} Stocks
            </h1>
            <p className="text-sm md:text-base text-slate-300 max-w-3xl leading-relaxed">
              Editorially reviewed snapshots of every active ASX-listed {sector.display_name.toLowerCase()} company. Compare market cap, dividend yield, P/E ratio and foreign-ownership risk.
            </p>
          </div>
        </section>

        <section className="py-8 md:py-10 bg-white">
          <div className="container-custom">
            {stocks.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-sm text-slate-500">
                  No active stocks in this sector yet. Check back soon.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-4 py-3 font-bold text-slate-700">
                        Ticker
                      </th>
                      <th className="text-left px-4 py-3 font-bold text-slate-700">
                        Company
                      </th>
                      <th className="text-left px-4 py-3 font-bold text-slate-700 hidden md:table-cell">
                        Market cap
                      </th>
                      <th className="text-left px-4 py-3 font-bold text-slate-700 hidden lg:table-cell">
                        Yield
                      </th>
                      <th className="text-left px-4 py-3 font-bold text-slate-700 hidden lg:table-cell">
                        P/E
                      </th>
                      <th className="text-left px-4 py-3 font-bold text-slate-700 hidden md:table-cell">
                        FIRB
                      </th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stocks.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-extrabold text-amber-700">
                          {s.ticker}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900">
                            {s.company_name}
                          </div>
                          {s.blurb && (
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 max-w-md">
                              {s.blurb}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-700 hidden md:table-cell">
                          {s.market_cap_bucket
                            ? BUCKET_LABELS[s.market_cap_bucket] ?? s.market_cap_bucket
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-700 font-semibold tabular-nums hidden lg:table-cell">
                          {formatPct(s.dividend_yield_pct)}
                        </td>
                        <td className="px-4 py-3 text-slate-700 tabular-nums hidden lg:table-cell">
                          {formatPe(s.pe_ratio)}
                        </td>
                        <td className="px-4 py-3 text-[11px] text-slate-600 hidden md:table-cell">
                          {s.foreign_ownership_risk ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <Link
                            href={`/invest/${slug}/stocks/${s.ticker.toLowerCase()}`}
                            className="text-amber-600 hover:underline text-xs font-bold inline-flex items-center gap-1"
                          >
                            View
                            <Icon name="arrow-right" size={12} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <section className="py-10 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-3xl text-center">
            <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-2">
              Need a broker to buy these stocks?
            </h2>
            <p className="text-sm text-slate-600 mb-5">
              Compare ASX-accessible brokers side by side — fees, CHESS sponsorship, and market access compared transparently.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/compare?category=shares"
                className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm px-5 py-2.5 rounded-lg"
              >
                Compare ASX brokers
                <Icon name="arrow-right" size={14} />
              </Link>
              <Link
                href={`/invest/${slug}/etfs`}
                className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-900 font-bold text-sm px-5 py-2.5 rounded-lg"
              >
                Sector ETFs
                <Icon name="arrow-right" size={14} />
              </Link>
            </div>
          </div>
        </section>

        <section className="py-8 bg-white">
          <div className="container-custom max-w-3xl">
            <p className="text-[11px] text-slate-500 leading-relaxed">
              <strong>General information only.</strong> Market cap, yield and
              P/E figures are editorial snapshots and move intraday. Always
              confirm current figures via your broker or the ASX company
              announcements platform. This page does not constitute personal
              financial product advice — consult a licensed adviser before
              investing.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
