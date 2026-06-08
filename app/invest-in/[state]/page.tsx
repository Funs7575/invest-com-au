import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { STATE_SURCHARGES } from "@/lib/firb-data";
import { getInvestStateData } from "@/lib/invest-state-data";
import { getInvestCategoryBySlug } from "@/lib/invest-categories";
import { categoryListingsHref } from "@/lib/invest-listing-routes";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR, UPDATED_LABEL, SITE_NAME } from "@/lib/seo";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import InvestListingCard from "@/components/InvestListingCard";
import { listingUrl } from "@/lib/listing-url";
import Icon from "@/components/Icon";

export const revalidate = 3600;

/**
 * Programmatic /invest-in/[state] landing pages (Wave 8 SEO).
 *
 * One page per Australian state/territory — geo-qualified deal-flow that
 * serves "investment opportunities NSW", "commercial property to buy
 * Victoria"-style intent. Clean dedicated namespace (no collision with
 * the static /invest/<vertical>/ dirs). Combines live per-state listing
 * data with state-specific foreign-buyer surcharge context (reused from
 * lib/firb-data).
 */

const STATES = STATE_SURCHARGES.map((s) => ({
  code: s.stateCode,
  name: s.state,
  surchargePercent: s.surchargePercent,
  landTaxSurchargePercent: s.landTaxSurchargePercent ?? 0,
  notes: s.notes,
}));

function stateByCode(code: string) {
  return STATES.find((s) => s.code.toLowerCase() === code.toLowerCase());
}

export async function generateStaticParams() {
  return STATES.map((s) => ({ state: s.code.toLowerCase() }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ state: string }>;
}): Promise<Metadata> {
  const { state } = await params;
  const st = stateByCode(state);
  if (!st) return { title: "Invest by state", robots: { index: false } };
  const title = `Investment Opportunities in ${st.name} (${CURRENT_YEAR})`;
  const description = `Browse investment opportunities across ${st.name} (${st.code}) — businesses, commercial property, farmland, projects and funds. Plus ${st.name} foreign-buyer stamp-duty surcharge and FIRB context.`;
  return {
    title: `${title} | ${SITE_NAME}`,
    description,
    alternates: { canonical: absoluteUrl(`/invest-in/${st.code.toLowerCase()}`) },
    openGraph: { title, description, url: absoluteUrl(`/invest-in/${st.code.toLowerCase()}`), type: "website", images: [{ url: `/api/og?title=${encodeURIComponent("Invest in " + st.name + " Australia")}&sub=${encodeURIComponent("FIRB · Foreign Buyer Surcharge · Properties · " + CURRENT_YEAR)}`, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image" },
  };
}

export default async function InvestInStatePage({
  params,
}: {
  params: Promise<{ state: string }>;
}) {
  const { state } = await params;
  const st = stateByCode(state);
  if (!st) notFound();

  const data = await getInvestStateData(st.code);
  const browseHref = `/invest?state=${st.code}`;

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Invest", url: absoluteUrl("/invest") },
    { name: st.name },
  ]);

  // ItemList JSON-LD over the sample listings so the state page is
  // eligible for rich-list previews in search results.
  const itemListJsonLd = data.listings.length > 0
    ? {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: `Investment opportunities in ${st.name}`,
        numberOfItems: data.total,
        itemListElement: data.listings.slice(0, 20).map((l, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: l.title,
          url: absoluteUrl(listingUrl(l)),
        })),
      }
    : null;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {itemListJsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />
      )}

      <div className="container-custom max-w-5xl py-8 md:py-12">
        <nav aria-label="Breadcrumb" className="text-xs md:text-sm text-slate-500 mb-5">
          <Link href="/" className="hover:text-slate-900">Home</Link>
          <span className="mx-1.5">/</span>
          <Link href="/invest" className="hover:text-slate-900">Invest</Link>
          <span className="mx-1.5">/</span>
          <span className="text-slate-700">{st.name}</span>
        </nav>

        <header className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 mb-2">
            {st.name} · {UPDATED_LABEL}
          </p>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">
            Investment opportunities in {st.name}
          </h1>
          <p className="text-base md:text-lg text-slate-600 leading-relaxed">
            Browse live investment opportunities across {st.name} — businesses for sale, commercial
            property, farmland, projects, funds and more. Filter by ticket size, sector and FIRB
            eligibility on the marketplace.
          </p>
          {data.total > 0 && (
            <div className="mt-4">
              <Link
                href={browseHref}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-4 py-2 transition-colors"
              >
                See {data.total} {st.code} {data.total === 1 ? "opportunity" : "opportunities"}
                <Icon name="arrow-right" size={14} />
              </Link>
            </div>
          )}
        </header>

        {/* Category breakdown */}
        {data.byCategory.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl md:text-2xl font-extrabold mb-4">{st.name} opportunities by sector</h2>
            <div className="flex flex-wrap gap-2">
              {data.byCategory.map(({ slug, count }) => {
                const cat = getInvestCategoryBySlug(slug);
                const label = cat?.label ?? slug.replace(/-/g, " ");
                return (
                  <Link
                    key={slug}
                    href={categoryListingsHref(slug, { state: st.code })}
                    className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors capitalize"
                  >
                    {label}
                    <span className="text-emerald-700 tabular-nums">{count}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Foreign-buyer context (state-specific) */}
        <section className="mb-10">
          <h2 className="text-xl md:text-2xl font-extrabold mb-3">
            Foreign buyers: {st.name} surcharges
          </h2>
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 md:p-5">
            <div className="flex items-start gap-3">
              <span className="shrink-0 text-blue-600 mt-0.5"><Icon name="globe" size={18} /></span>
              <div>
                <div className="flex flex-wrap gap-4 mb-2">
                  <div>
                    <p className="text-2xl font-extrabold text-blue-700">{st.surchargePercent}%</p>
                    <p className="text-[0.65rem] uppercase tracking-wide text-blue-700/70 font-semibold">Stamp-duty surcharge</p>
                  </div>
                  {st.landTaxSurchargePercent > 0 && (
                    <div>
                      <p className="text-2xl font-extrabold text-blue-700">{st.landTaxSurchargePercent}%</p>
                      <p className="text-[0.65rem] uppercase tracking-wide text-blue-700/70 font-semibold">Annual land-tax surcharge</p>
                    </div>
                  )}
                </div>
                <p className="text-sm text-blue-900/80 leading-relaxed">{st.notes}</p>
                <p className="text-xs text-blue-700/70 mt-2">
                  Foreign purchasers also need FIRB approval and pay a federal application fee on top of these state surcharges.{" "}
                  <Link href="/property/foreign-investment" className="font-semibold underline underline-offset-2 hover:text-blue-900">FIRB guide</Link>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Sample listings */}
        {data.listings.length > 0 && (
          <section className="mb-10">
            <div className="flex items-center justify-between gap-2 mb-4">
              <h2 className="text-xl md:text-2xl font-extrabold">Latest {st.code} opportunities</h2>
              <Link href={browseHref} className="text-sm font-semibold text-emerald-700 hover:text-emerald-900 inline-flex items-center gap-1">
                View all {data.total}
                <Icon name="arrow-right" size={13} />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {data.listings.map((l) => (
                <InvestListingCard key={l.id} listing={l} />
              ))}
            </div>
          </section>
        )}

        {/* Other states */}
        <section className="mb-10">
          <h2 className="text-lg font-bold mb-3">Browse other states</h2>
          <div className="flex flex-wrap gap-2">
            {STATES.filter((s) => s.code !== st.code).map((s) => (
              <Link
                key={s.code}
                href={`/invest-in/${s.code.toLowerCase()}`}
                className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                {s.name}
              </Link>
            ))}
          </div>
        </section>

        <div className="border border-amber-200 bg-amber-50 rounded-lg px-4 py-3 text-xs text-slate-600 leading-relaxed">
          <strong className="text-slate-700">General Advice Warning:</strong> {GENERAL_ADVICE_WARNING}
        </div>
      </div>
    </>
  );
}
