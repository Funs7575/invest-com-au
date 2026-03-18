import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { breadcrumbJsonLd, SITE_URL } from "@/lib/seo";
import { PROPERTY_GENERAL_DISCLAIMER } from "@/lib/compliance";
import Icon from "@/components/Icon";
import ScrollFadeIn from "@/components/ScrollFadeIn";
import PropertyDisclaimer from "@/components/PropertyDisclaimer";

export const metadata = {
  title: "Property Investment Australia — New Developments, Buyer's Agents & Suburb Data",
  description:
    "Australia's property investment hub. Browse new developments, find a buyer's agent, research suburb data, and compare investment loans. Independent, free, no obligation.",
  openGraph: {
    title: "Property Investment Australia — Invest.com.au",
    description: "Browse new developments, find buyer's agents, research suburbs, and compare investment loans.",
    url: "/property",
    images: [{ url: "/api/og?title=Property+Investment+Australia", width: 1200, height: 630 }],
  },
  alternates: { canonical: "/property" },
};

export const revalidate = 3600;

function formatPrice(cents: number): string {
  if (cents >= 100000000) return `$${(cents / 100000000).toFixed(1)}M`;
  if (cents >= 100000) return `$${Math.round(cents / 100000)}k`;
  return `$${(cents / 100).toLocaleString()}`;
}

export default async function PropertyHubPage() {
  const supabase = await createClient();

  const [{ data: featuredListings }, { data: topSuburbs }] = await Promise.all([
    supabase
      .from("property_listings")
      .select("id, slug, title, city, suburb, state, price_from_cents, rental_yield_estimate, completion_date, property_type, images, sponsored, developer_name")
      .eq("status", "active")
      .eq("featured", true)
      .order("sponsored", { ascending: false })
      .limit(3),
    supabase
      .from("suburb_data")
      .select("suburb, state, median_price_house, rental_yield_house, capital_growth_10yr, distance_to_cbd_km")
      .order("capital_growth_10yr", { ascending: false })
      .limit(5),
  ]);

  const entryCards = [
    {
      icon: "building",
      title: "Browse New Developments",
      desc: "Off-the-plan apartments, townhouses, and house & land packages across Australia.",
      href: "/property/listings",
      color: "from-amber-500 to-amber-400",
      shadow: "shadow-amber-500/20",
    },
    {
      icon: "users",
      title: "Find a Buyer's Agent",
      desc: "Verified buyer's agents who negotiate on your behalf. Free consultation, no obligation.",
      href: "/property/buyer-agents",
      color: "from-slate-800 to-slate-700",
      shadow: "shadow-slate-500/15",
    },
    {
      icon: "bar-chart",
      title: "Suburb Research Tool",
      desc: "Median prices, rental yields, vacancy rates, and capital growth data for top suburbs.",
      href: "/property/suburbs",
      color: "from-emerald-600 to-emerald-500",
      shadow: "shadow-emerald-500/15",
    },
  ];

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd([{ name: "Home", url: SITE_URL }, { name: "Property Investment" }])) }}
      />

      {/* Hero */}
      <section className="relative bg-white border-b border-slate-100">
        <div className="container-custom py-10 md:py-16">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-amber-50 border border-amber-200 rounded-full text-xs font-semibold text-amber-800 mb-4">
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
              New developments &middot; Buyer&apos;s agents &middot; Suburb data
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 leading-[1.1] mb-4 tracking-tight">
              Australia&apos;s #1 property{" "}
              <span className="text-amber-500">investment guide.</span>
            </h1>
            <p className="text-base md:text-lg text-slate-500 mb-6 leading-relaxed max-w-2xl mx-auto">
              Browse new developments, find a verified buyer&apos;s agent, research suburb data, and compare investment loans — all in one place.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/property/listings" className="w-full sm:w-auto px-7 py-3.5 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 shadow-md hover:shadow-lg transition-all text-sm">
                Browse Developments &rarr;
              </Link>
              <Link href="/property/buyer-agents" className="w-full sm:w-auto px-7 py-3.5 border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all text-sm">
                Find a Buyer&apos;s Agent
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Entry Cards */}
      <ScrollFadeIn>
        <section className="py-8 md:py-12 bg-slate-50 border-b border-slate-100">
          <div className="container-custom">
            <div className="grid md:grid-cols-3 gap-3 md:gap-4">
              {entryCards.map((card) => (
                <Link key={card.href} href={card.href} className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 hover:shadow-md hover:border-slate-300 transition-all group">
                  <div className={`w-10 h-10 bg-gradient-to-br ${card.color} rounded-xl flex items-center justify-center mb-3 shadow-md ${card.shadow}`}>
                    <Icon name={card.icon} size={20} className="text-white" />
                  </div>
                  <h2 className="text-base md:text-lg font-bold text-slate-900 mb-1 group-hover:text-slate-700">{card.title}</h2>
                  <p className="text-sm text-slate-500 leading-relaxed">{card.desc}</p>
                  <span className="inline-flex items-center gap-1 mt-3 text-sm font-semibold text-amber-600 group-hover:text-amber-700">
                    Explore <span className="group-hover:translate-x-0.5 transition-transform">&rarr;</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </ScrollFadeIn>

      {/* Featured Listings */}
      {(featuredListings?.length || 0) > 0 && (
        <ScrollFadeIn>
          <section className="py-8 md:py-12 bg-white">
            <div className="container-custom">
              <div className="flex items-start justify-between gap-2 mb-5">
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-slate-900">Featured Developments</h2>
                  <p className="text-xs md:text-sm text-slate-500 mt-1">Hand-picked new developments across Australia</p>
                </div>
                <Link href="/property/listings" className="text-xs md:text-sm font-semibold text-amber-600 hover:text-amber-700 shrink-0 min-h-[44px] inline-flex items-center px-1">
                  View all &rarr;
                </Link>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                {featuredListings!.map((listing) => (
                  <Link
                    key={listing.id}
                    href={`/property/listings/${listing.slug}`}
                    className="border border-slate-200 bg-white rounded-2xl overflow-hidden hover:shadow-md hover:border-slate-300 transition-all group"
                  >
                    <div className="aspect-[16/10] bg-gradient-to-br from-slate-100 to-slate-200 relative flex items-center justify-center">
                      <Icon name="building" size={40} className="text-slate-300" />
                      {listing.sponsored && (
                        <span className="absolute top-2 left-2 text-[0.6rem] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                          Sponsored
                        </span>
                      )}
                    </div>
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[0.65rem] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                          {listing.city} &middot; {listing.suburb}
                        </span>
                      </div>
                      <h3 className="font-bold text-slate-900 group-hover:text-slate-600 transition-colors mb-1">{listing.title}</h3>
                      <p className="text-xs text-slate-400 mb-2">{listing.developer_name}</p>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-bold text-slate-900">From {formatPrice(listing.price_from_cents)}</span>
                        {listing.rental_yield_estimate && (
                          <span className="text-xs text-emerald-600 font-semibold">{listing.rental_yield_estimate}% yield</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        {listing.completion_date && (
                          <span className="text-xs text-slate-400">{listing.completion_date}</span>
                        )}
                        <span className="text-xs font-semibold text-amber-600 group-hover:translate-x-0.5 transition-transform">
                          Enquire &rarr;
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        </ScrollFadeIn>
      )}

      {/* Top Suburbs Snapshot */}
      {(topSuburbs?.length || 0) > 0 && (
        <ScrollFadeIn>
          <section className="py-8 md:py-12 bg-slate-50 border-y border-slate-100">
            <div className="container-custom">
              <div className="flex items-start justify-between gap-2 mb-5">
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-slate-900">Top Investment Suburbs</h2>
                  <p className="text-xs md:text-sm text-slate-500 mt-1">Ranked by 10-year capital growth</p>
                </div>
                <Link href="/property/suburbs" className="text-xs md:text-sm font-semibold text-amber-600 hover:text-amber-700 shrink-0 min-h-[44px] inline-flex items-center px-1">
                  Research all &rarr;
                </Link>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs">Suburb</th>
                      <th className="text-right px-4 py-3 font-semibold text-slate-600 text-xs hidden sm:table-cell">Median House</th>
                      <th className="text-right px-4 py-3 font-semibold text-slate-600 text-xs">Rental Yield</th>
                      <th className="text-right px-4 py-3 font-semibold text-slate-600 text-xs">10yr Growth</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topSuburbs!.map((s) => (
                      <tr key={`${s.suburb}-${s.state}`} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <span className="font-semibold text-slate-900">{s.suburb}</span>
                          <span className="text-xs text-slate-400 ml-1">{s.state}</span>
                        </td>
                        <td className="text-right px-4 py-3 text-slate-700 hidden sm:table-cell">
                          {s.median_price_house ? formatPrice(s.median_price_house) : "—"}
                        </td>
                        <td className="text-right px-4 py-3 text-emerald-600 font-semibold">
                          {s.rental_yield_house ? `${s.rental_yield_house}%` : "—"}
                        </td>
                        <td className="text-right px-4 py-3 text-amber-600 font-bold">
                          {s.capital_growth_10yr ? `${s.capital_growth_10yr}%` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </ScrollFadeIn>
      )}

      {/* Investment Loan CTA */}
      <ScrollFadeIn>
        <section className="py-8 md:py-12 bg-white">
          <div className="container-custom">
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 md:p-10 text-center">
              <h2 className="text-xl md:text-2xl font-bold text-white mb-2">Compare Investment Loans</h2>
              <p className="text-sm text-slate-300 mb-5 max-w-lg mx-auto">
                Compare rates from CBA, Westpac, ANZ, NAB, and more. Find the right investment loan for your property portfolio.
              </p>
              <Link href="/property/finance" className="inline-block px-7 py-3 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 shadow-md hover:shadow-lg transition-all text-sm">
                Compare Loans &rarr;
              </Link>
            </div>
          </div>
        </section>
      </ScrollFadeIn>

      {/* Property Disclaimer */}
      <section className="py-6 md:py-8 bg-white border-t border-slate-100">
        <div className="container-custom">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 md:p-5">
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-xs font-bold text-slate-600 mb-1">Important Information</p>
                <p className="text-[0.65rem] md:text-xs text-slate-500 leading-relaxed">{PROPERTY_GENERAL_DISCLAIMER}</p>
                <PropertyDisclaimer />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
