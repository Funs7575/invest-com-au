import type { Metadata } from "next";
import Link from "next/link";
import Icon from "@/components/Icon";
import { breadcrumbJsonLd, SITE_URL } from "@/lib/seo";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import { fetchSoldArchive } from "@/lib/listings/sold-archive";
import { formatAudCompact } from "@/lib/listing-kind";
import { pricePerUnit } from "@/lib/listings/vertical-metrics";
import { listingUrl, VERTICAL_TO_CATEGORY } from "@/lib/listing-url";
import { LISTING_VERTICALS } from "@/lib/listing-verticals";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "Recently sold investments — realised prices | Invest.com.au",
  description:
    "Realised sale prices from the Invest.com.au marketplace — farmland, commercial property, businesses, water entitlements and more. Factual sales history, updated as listings close.",
};

/**
 * The browsable sold archive (idea #5) — "For sale | Sold", realestate.com
 * style. Every disclosed sale builds the comps dataset the lot pages and
 * (later) the category price indices stand on; browsing it quietly markets
 * the save-search alerts and the mark-sold flow.
 */
export default async function SoldArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const rows = await fetchSoldArchive({ category, limit: 48 });

  // Category chips: only categories that can hold listings, labelled from
  // the verticals SSOT.
  const categories = Array.from(
    new Set(Object.values(VERTICAL_TO_CATEGORY)),
  ).sort();
  const labelFor = (slug: string) =>
    LISTING_VERTICALS.find((v) => v.slug === slug)?.label ??
    slug.replace(/-/g, " ");

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: `${SITE_URL}/invest` },
    { name: "Recently sold" },
  ]);

  return (
    <main className="bg-slate-50 min-h-screen pb-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />

      <section className="bg-white border-b border-slate-100 py-8">
        <div className="container-custom">
          <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-3" aria-label="Breadcrumb">
            <Link href="/invest" className="hover:text-slate-900 transition-colors">Marketplace</Link>
            <Icon name="chevron-right" size={12} className="text-slate-300" />
            <span className="text-slate-900 font-medium">Recently sold</span>
          </nav>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">
            Recently sold on the marketplace
          </h1>
          <p className="text-sm text-slate-600 max-w-2xl">
            Realised sale prices recorded as listings close — the factual
            history behind every asking price. Sellers choose whether to
            disclose the figure; undisclosed sales still appear.
          </p>
        </div>
      </section>

      <section className="py-6">
        <div className="container-custom">
          <div className="flex flex-wrap gap-2 mb-6" role="navigation" aria-label="Filter sold listings by category">
            <Link
              href="/invest/sold"
              className={`text-xs font-semibold rounded-full border px-3 py-1.5 transition-colors ${
                !category
                  ? "bg-slate-900 border-slate-900 text-white"
                  : "bg-white border-slate-300 text-slate-700 hover:border-slate-500"
              }`}
            >
              All categories
            </Link>
            {categories.map((slug) => (
              <Link
                key={slug}
                href={`/invest/sold?category=${slug}`}
                className={`text-xs font-semibold rounded-full border px-3 py-1.5 capitalize transition-colors ${
                  category === slug
                    ? "bg-slate-900 border-slate-900 text-white"
                    : "bg-white border-slate-300 text-slate-700 hover:border-slate-500"
                }`}
              >
                {labelFor(slug)}
              </Link>
            ))}
          </div>

          {rows.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
              <Icon name="bar-chart" size={28} className="text-slate-300 mx-auto mb-3" />
              <h2 className="text-base font-bold text-slate-900 mb-1">
                No recorded sales {category ? "in this category " : ""}yet
              </h2>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                Sales appear here as sellers close their listings. Save a
                search on the marketplace and we&apos;ll email you when new
                listings go live.
              </p>
              <Link
                href="/invest"
                className="inline-flex items-center gap-2 mt-5 bg-amber-500 hover:bg-amber-400 text-slate-900 text-sm font-bold px-5 py-2.5 rounded-xl transition-colors"
              >
                Browse live listings
                <Icon name="arrow-right" size={14} />
              </Link>
            </div>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {rows.map((row) => {
                const when = row.sold_at
                  ? new Date(row.sold_at).toLocaleDateString("en-AU", { month: "short", year: "numeric" })
                  : null;
                const perUnit = row.sold_price_cents
                  ? pricePerUnit({ ...row, asking_price_cents: row.sold_price_cents })
                  : null;
                const location = [row.location_city, row.location_state].filter(Boolean).join(", ");
                return (
                  <li key={row.id} className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold px-2 py-0.5 rounded-full">
                        <Icon name="check-circle" size={10} />
                        SOLD{when ? ` · ${when}` : ""}
                      </span>
                    </div>
                    <Link
                      href={listingUrl(row)}
                      className="text-sm font-bold text-slate-900 hover:text-amber-700 leading-snug line-clamp-2"
                    >
                      {row.title}
                    </Link>
                    {location && (
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <Icon name="map-pin" size={11} />
                        {location}
                      </p>
                    )}
                    <div className="flex items-baseline justify-between mt-1">
                      <p className="text-base font-extrabold text-slate-900">
                        {row.sold_price_cents ? formatAudCompact(row.sold_price_cents) : "Price undisclosed"}
                      </p>
                      {perUnit && (
                        <p className="text-xs font-semibold text-emerald-800">≈ {perUnit.value}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <p className="mt-10 text-xs text-slate-400 max-w-3xl">
            {GENERAL_ADVICE_WARNING} Realised prices are reported by sellers
            and shown as general information — past sales are not an
            indicator of future prices.
          </p>
        </div>
      </section>
    </main>
  );
}
