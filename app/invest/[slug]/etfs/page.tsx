import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import { createAdminClient } from "@/lib/supabase/admin";
import Icon from "@/components/Icon";

export const revalidate = 1800;

interface EtfRow {
  id: number;
  ticker: string;
  name: string;
  issuer: string | null;
  mer_pct: number | string | null;
  underlying_exposure: string | null;
  domicile: string | null;
  distribution_frequency: string | null;
  blurb: string | null;
  display_order: number | null;
  status: string | null;
}

interface SectorRow {
  slug: string;
  display_name: string;
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

async function fetchEtfs(sectorSlug: string): Promise<EtfRow[]> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("commodity_etfs")
      .select("*")
      .eq("sector_slug", sectorSlug)
      .eq("status", "active")
      .order("display_order", { ascending: true });
    return (data as EtfRow[] | null) || [];
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
  if (!sector) return { title: `Sector ETFs (${CURRENT_YEAR})` };
  return {
    title: `Best ${sector.display_name} ETFs in Australia (${CURRENT_YEAR})`,
    description: `Compare ${sector.display_name.toLowerCase()} ETFs available on the ASX and via Australian brokers — MER, underlying exposure, domicile and distribution frequency.`,
    alternates: { canonical: `${SITE_URL}/invest/${slug}/etfs` },
    openGraph: {
      title: `Best ${sector.display_name} ETFs in Australia (${CURRENT_YEAR})`,
      url: `${SITE_URL}/invest/${slug}/etfs`,
    },
  };
}

function formatMer(value: number | string | null): string {
  if (value == null) return "—";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (!Number.isFinite(num)) return "—";
  return `${num.toFixed(2)}%`;
}

export default async function SectorEtfsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const sector = await fetchSector(slug);
  if (!sector) notFound();
  const etfs = await fetchEtfs(slug);

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: `${SITE_URL}/invest` },
    { name: sector.display_name, url: `${SITE_URL}/invest/${slug}` },
    { name: "ETFs" },
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
              <span className="text-white font-medium">ETFs</span>
            </nav>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold leading-tight mb-3">
              Best {sector.display_name} ETFs in Australia
            </h1>
            <p className="text-sm md:text-base text-slate-300 max-w-3xl leading-relaxed">
              ETF wrappers give you diversified {sector.display_name.toLowerCase()} exposure in a single ticket. Compare MER, underlying index, domicile and distribution frequency across the ASX and Australian-accessible funds.
            </p>
          </div>
        </section>

        <section className="py-8 md:py-10 bg-white">
          <div className="container-custom">
            {etfs.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-sm text-slate-500">
                  No {sector.display_name.toLowerCase()} ETFs listed yet. Check back soon.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-4 py-3 font-bold text-slate-700">Ticker</th>
                      <th className="text-left px-4 py-3 font-bold text-slate-700">Name</th>
                      <th className="text-left px-4 py-3 font-bold text-slate-700 hidden md:table-cell">Issuer</th>
                      <th className="text-left px-4 py-3 font-bold text-slate-700">MER</th>
                      <th className="text-left px-4 py-3 font-bold text-slate-700 hidden lg:table-cell">Exposure</th>
                      <th className="text-left px-4 py-3 font-bold text-slate-700 hidden xl:table-cell">Dom.</th>
                      <th className="text-left px-4 py-3 font-bold text-slate-700 hidden xl:table-cell">Freq.</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {etfs.map((e) => (
                      <tr key={e.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-extrabold text-amber-700">
                          {e.ticker}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900">{e.name}</div>
                          {e.blurb && (
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 max-w-md">
                              {e.blurb}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-700 hidden md:table-cell">
                          {e.issuer ?? "—"}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900 tabular-nums">
                          {formatMer(e.mer_pct)}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600 hidden lg:table-cell line-clamp-2 max-w-xs">
                          {e.underlying_exposure ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600 hidden xl:table-cell">
                          {e.domicile ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600 hidden xl:table-cell">
                          {e.distribution_frequency ?? "—"}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <Link
                            href="/compare?category=shares"
                            className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 hover:underline"
                          >
                            Buy via broker
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
              Prefer direct equity?
            </h2>
            <p className="text-sm text-slate-600 mb-5">
              Compare individual ASX-listed {sector.display_name.toLowerCase()} companies side by side.
            </p>
            <Link
              href={`/invest/${slug}/stocks`}
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm px-5 py-2.5 rounded-lg"
            >
              View {sector.display_name} stocks
              <Icon name="arrow-right" size={14} />
            </Link>
          </div>
        </section>

        <section className="py-8 bg-white">
          <div className="container-custom max-w-3xl">
            <p className="text-[11px] text-slate-500 leading-relaxed">
              <strong>General information only.</strong> MER values are editorial snapshots sourced from each issuer&rsquo;s PDS. ETF prices and distributions move intraday — always check the current PDS before investing. This page is not personal financial product advice.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
