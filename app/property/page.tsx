import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { breadcrumbJsonLd, SITE_URL } from "@/lib/seo";
import { PROPERTY_GENERAL_DISCLAIMER } from "@/lib/compliance";
import Icon from "@/components/Icon";
import ScrollFadeIn from "@/components/ScrollFadeIn";
import PropertyDisclaimer from "@/components/PropertyDisclaimer";
import { getListingImages } from "@/lib/property-images";

export const metadata = {
  title: "Property Investment Australia — New Developments, Buyer's Agents & Suburb Data",
  description:
    "Australia's property investment hub. Browse new developments, find a buyer's agent, research suburb data, and compare investment loans. Independent, free, no obligation.",
  openGraph: {
    title: "Property Investment Australia",
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

function GrowthBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
        <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="font-bold text-amber-600">{value}%</span>
    </div>
  );
}

const PROPERTY_TYPES = [
  { label: "Apartments", icon: "building-2", type: "apartment", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { label: "Townhouses", icon: "home", type: "townhouse", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { label: "House & Land", icon: "map-pin", type: "house_land", color: "bg-amber-50 text-amber-700 border-amber-200" },
];

export default async function PropertyHubPage() {
  const supabase = await createClient();

  const [{ data: featuredListings }, { data: topSuburbs }] = await Promise.all([
    supabase
      .from("property_listings")
      .select("id, slug, title, city, suburb, state, price_from_cents, price_to_cents, rental_yield_estimate, completion_date, property_type, images, sponsored, featured, developer_name, bedrooms_min, bedrooms_max, firb_approved, off_the_plan")
      .eq("status", "active")
      .eq("featured", true)
      .order("sponsored", { ascending: false })
      .limit(6),
    supabase
      .from("suburb_data")
      .select("suburb, state, median_price_house, rental_yield_house, capital_growth_10yr, distance_to_cbd_km")
      .order("capital_growth_10yr", { ascending: false })
      .limit(6),
  ]);

  const maxGrowth = Math.max(...(topSuburbs || []).map(s => s.capital_growth_10yr ?? 0), 1);

  const stats = [
    { value: "50+", label: "New Developments" },
    { value: "20+", label: "Verified Buyer's Agents" },
    { value: "2,000+", label: "Suburbs Tracked" },
    { value: "Free", label: "No Hidden Fees" },
  ];

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd([{ name: "Home", url: SITE_URL }, { name: "Property Investment" }])) }}
      />

      {/* ── Hero ─────────────────────────────────── */}
      <section className="relative bg-white border-b border-slate-100 overflow-hidden">
        <div className="container-custom py-6 md:py-10 lg:py-12">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-14 items-center">

            {/* Left: text */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-900 border border-slate-800 rounded-full text-xs font-semibold text-white mb-4">
                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
                New developments · Buyer&apos;s agents · Suburb data
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 leading-[1.1] mb-3 tracking-tight">
                Australia&apos;s #1{" "}
                <span className="text-amber-500">property investment</span>{" "}
                guide.
              </h1>
              <p className="text-sm md:text-base text-slate-600 mb-5 leading-relaxed">
                Browse new developments, find a verified buyer&apos;s agent, research suburb data, and compare investment loans — all in one place.
              </p>
              <div className="flex flex-col sm:flex-row items-start gap-2.5 mb-5">
                <Link href="/property/listings" className="w-full sm:w-auto px-6 py-3 bg-amber-500 text-slate-900 font-bold rounded-xl hover:bg-amber-600 shadow-md hover:shadow-lg transition-all text-sm text-center">
                  Browse Developments &rarr;
                </Link>
                <Link href="/property/buyer-agents" className="w-full sm:w-auto px-6 py-3 border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all text-sm text-center">
                  Find a Buyer&apos;s Agent
                </Link>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Icon name="shield-check" size={12} className="text-emerald-500" />
                  Independent — not a developer
                </span>
                <span className="hidden sm:block text-slate-300">·</span>
                <span className="flex items-center gap-1.5">
                  <Icon name="check-circle" size={12} className="text-emerald-500" />
                  Always free, no obligation
                </span>
              </div>
            </div>

            {/* Right: category cards */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: "building", label: "New Developments", sub: "Off-the-plan apartments, townhouses & house and land", href: "/property/listings", iconBg: "bg-amber-500", border: "hover:border-amber-200 hover:bg-amber-50/60" },
                { icon: "users", label: "Buyer's Agents", sub: "Verified agents who negotiate on your behalf", href: "/property/buyer-agents", iconBg: "bg-slate-800", border: "hover:border-slate-300 hover:bg-slate-50" },
                { icon: "bar-chart-2", label: "Suburb Research", sub: "Median prices, yields, vacancy & growth data", href: "/property/suburbs", iconBg: "bg-emerald-600", border: "hover:border-emerald-200 hover:bg-emerald-50/60" },
                { icon: "globe", label: "Foreign Investors", sub: "FIRB guide, stamp duty surcharges & eligible properties", href: "/property/foreign-investment", iconBg: "bg-violet-600", border: "hover:border-violet-200 hover:bg-violet-50/60" },
              ].map((card) => (
                <Link key={card.href} href={card.href} className={`bg-white border border-slate-200 rounded-2xl p-4 md:p-5 transition-all group ${card.border}`}>
                  <div className={`w-9 h-9 ${card.iconBg} rounded-xl flex items-center justify-center mb-3 shadow-sm`}>
                    <Icon name={card.icon} size={18} className="text-white" />
                  </div>
                  <p className="text-sm font-bold text-slate-900 group-hover:text-slate-700 leading-snug mb-1">{card.label}</p>
                  <p className="text-xs text-slate-500 leading-snug">{card.sub}</p>
                </Link>
              ))}
            </div>
          </div>

          {/* Stats bar */}
          <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            {stats.map((s) => (
              <div key={s.label}>
                <p className="text-xl md:text-2xl font-extrabold text-slate-900">{s.value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Listings ─────────────────────── */}
      {(featuredListings?.length || 0) > 0 && (
        <ScrollFadeIn>
          <section className="py-8 md:py-14 bg-white">
            <div className="container-custom">
              <div className="flex items-end justify-between gap-2 mb-6">
                <div>
                  <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">Featured Developments</p>
                  <h2 className="text-xl md:text-3xl font-extrabold text-slate-900">Hand-picked new developments</h2>
                  <p className="text-sm text-slate-500 mt-1">Exclusive listings across Sydney, Melbourne, Brisbane &amp; more.</p>
                </div>
                <Link href="/property/listings" className="text-xs md:text-sm font-bold text-amber-600 hover:text-amber-700 shrink-0 min-h-[44px] inline-flex items-center gap-1 px-1 group">
                  View all <span className="group-hover:translate-x-0.5 transition-transform">&rarr;</span>
                </Link>
              </div>

              {/* Large hero card (first listing) */}
              {featuredListings![0] && (() => {
                const hero = featuredListings![0];
                const heroImgs = getListingImages(hero.slug, hero.images, hero.property_type);
                return (
                  <Link
                    href={`/property/listings/${hero.slug}`}
                    className="block rounded-2xl overflow-hidden border border-slate-200 hover:shadow-xl hover:border-slate-300 transition-all group mb-4 relative"
                  >
                    <div className="aspect-[21/9] md:aspect-[3/1] relative bg-slate-100 overflow-hidden">
                      <Image src={heroImgs[0]} alt={hero.title} fill className="object-cover group-hover:scale-105 transition-transform duration-700" sizes="100vw" priority />
                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent" />
                      {/* Badges top */}
                      <div className="absolute top-3 left-3 flex gap-2">
                        {hero.sponsored && (
                          <span className="text-[0.6rem] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full">Sponsored</span>
                        )}
                        <span className="text-[0.6rem] font-bold uppercase tracking-wider text-white bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full">
                          {hero.city} · {hero.suburb}
                        </span>
                        {hero.property_type && (
                          <span className="text-[0.6rem] font-bold uppercase tracking-wider text-white bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full">
                            {hero.property_type === "house_land" ? "House & Land" : hero.property_type}
                          </span>
                        )}
                      </div>
                      {/* Bottom overlay info */}
                      <div className="absolute bottom-0 left-0 right-0 p-5 md:p-7 flex items-end justify-between">
                        <div>
                          <h3 className="text-xl md:text-2xl font-extrabold text-white mb-1 drop-shadow">{hero.title}</h3>
                          {hero.developer_name && <p className="text-xs text-white/70">{hero.developer_name}</p>}
                        </div>
                        <div className="text-right shrink-0 ml-4">
                          <div className="text-xl md:text-2xl font-extrabold text-white">From {formatPrice(hero.price_from_cents)}</div>
                          {hero.rental_yield_estimate && (
                            <div className="text-xs font-semibold text-emerald-400 mt-0.5">{hero.rental_yield_estimate}% est. yield</div>
                          )}
                          <div className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 text-xs font-bold rounded-lg transition-colors">
                            View Details &rarr;
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })()}

              {/* Remaining listings grid */}
              {(featuredListings!.length > 1) && (
                <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {featuredListings!.slice(1).map((listing) => {
                    const imgs = getListingImages(listing.slug, listing.images, listing.property_type);
                    return (
                      <Link
                        key={listing.id}
                        href={`/property/listings/${listing.slug}`}
                        className="border border-slate-200 bg-white rounded-xl overflow-hidden hover:shadow-lg hover:border-slate-300 transition-all group"
                      >
                        <div className="aspect-[4/3] relative overflow-hidden bg-slate-100">
                          <Image src={imgs[0]} alt={listing.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="(max-width: 768px) 50vw, 33vw" />
                          {/* Gradient overlay bottom */}
                          <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-slate-900/60 to-transparent" />
                          {/* Yield badge */}
                          {listing.rental_yield_estimate && (
                            <div className="absolute bottom-2 right-2 text-[0.6rem] font-bold text-white bg-emerald-600 px-1.5 py-0.5 rounded-md">
                              {listing.rental_yield_estimate}% yield
                            </div>
                          )}
                          {listing.sponsored && (
                            <span className="absolute top-2 left-2 text-[0.55rem] font-bold uppercase tracking-wider text-amber-700 bg-amber-50/90 border border-amber-200 px-1.5 py-0.5 rounded-full">Sponsored</span>
                          )}
                        </div>
                        <div className="p-3">
                          <p className="text-[0.6rem] font-bold uppercase tracking-wider text-slate-400 mb-0.5">{listing.city} · {listing.suburb}</p>
                          <h3 className="text-xs font-bold text-slate-900 group-hover:text-slate-600 transition-colors line-clamp-2 mb-1.5">{listing.title}</h3>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-extrabold text-slate-900">From {formatPrice(listing.price_from_cents)}</span>
                          </div>
                          {listing.completion_date && (
                            <p className="text-[0.6rem] text-slate-400 mt-1">Completion: {listing.completion_date}</p>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}

              {/* View all CTA */}
              <div className="mt-6 text-center">
                <Link href="/property/listings" className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-sm">
                  <Icon name="building" size={16} />
                  Browse All Developments
                </Link>
              </div>
            </div>
          </section>
        </ScrollFadeIn>
      )}

      {/* ── Property Type Cards ───────────────────── */}
      <ScrollFadeIn>
        <section className="py-8 md:py-12 bg-slate-50 border-y border-slate-100">
          <div className="container-custom">
            <div className="flex items-end justify-between gap-2 mb-6">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Browse by Type</p>
                <h2 className="text-xl md:text-2xl font-extrabold text-slate-900">What are you looking for?</h2>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {
                  label: "Apartments & Units",
                  sub: "Off-the-plan & new builds near CBDs. Lower entry price with strong rental demand.",
                  href: "/property/listings?type=apartment",
                  icon: "building",
                  gradient: "from-amber-500 to-amber-400",
                  bg: "bg-amber-50",
                  accent: "text-amber-600",
                  badge: "Most Popular",
                  badgeCls: "bg-amber-100 text-amber-700",
                  stats: [
                    { icon: "trending-down", label: "Lower entry cost" },
                    { icon: "percent", label: "Strong rental yield" },
                    { icon: "globe", label: "FIRB eligible options" },
                  ],
                },
                {
                  label: "Townhouses",
                  sub: "Modern communities close to schools & parks. Great for families wanting space without the land.",
                  href: "/property/listings?type=townhouse",
                  icon: "home",
                  gradient: "from-emerald-600 to-emerald-500",
                  bg: "bg-emerald-50",
                  accent: "text-emerald-600",
                  badge: "High Demand",
                  badgeCls: "bg-emerald-100 text-emerald-700",
                  stats: [
                    { icon: "users", label: "Dual living options" },
                    { icon: "trending-up", label: "Capital growth" },
                    { icon: "settings", label: "Low maintenance" },
                  ],
                },
                {
                  label: "House & Land",
                  sub: "Greenfield estates in growth corridors. Maximise depreciation and save on stamp duty.",
                  href: "/property/listings?type=house_land",
                  icon: "map-pin",
                  gradient: "from-slate-700 to-slate-600",
                  bg: "bg-slate-50",
                  accent: "text-slate-700",
                  badge: "Tax Benefits",
                  badgeCls: "bg-slate-100 text-slate-600",
                  stats: [
                    { icon: "landmark", label: "Stamp duty savings" },
                    { icon: "file-text", label: "Full depreciation" },
                    { icon: "star", label: "Brand new build" },
                  ],
                },
              ].map((type) => (
                <Link key={type.href} href={type.href} className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-lg hover:border-slate-300 transition-all group flex flex-col">
                  {/* Visual header */}
                  <div className={`${type.bg} px-6 pt-7 pb-5 relative`}>
                    <span className={`absolute top-3 right-3 text-[0.6rem] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${type.badgeCls}`}>{type.badge}</span>
                    <div className={`w-14 h-14 bg-gradient-to-br ${type.gradient} rounded-2xl flex items-center justify-center mb-4 shadow-md group-hover:scale-105 transition-transform duration-300`}>
                      <Icon name={type.icon} size={26} className="text-white" />
                    </div>
                    <h3 className="font-extrabold text-slate-900 text-base mb-1">{type.label}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">{type.sub}</p>
                  </div>
                  {/* Stats list */}
                  <div className="px-6 py-4 flex flex-col gap-2 flex-1">
                    {type.stats.map((s) => (
                      <div key={s.label} className="flex items-center gap-2">
                        <Icon name={s.icon} size={13} className={`${type.accent} shrink-0`} />
                        <span className="text-xs text-slate-600">{s.label}</span>
                      </div>
                    ))}
                  </div>
                  {/* CTA footer */}
                  <div className="px-6 pb-5">
                    <span className={`text-xs font-bold ${type.accent} group-hover:underline flex items-center gap-1`}>
                      Browse {type.label.split(" ")[0]} <span className="group-hover:translate-x-0.5 transition-transform">&rarr;</span>
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </ScrollFadeIn>

      {/* ── Top Suburbs ───────────────────────────── */}
      {(topSuburbs?.length || 0) > 0 && (
        <ScrollFadeIn>
          <section className="py-8 md:py-14 bg-white">
            <div className="container-custom">
              <div className="flex items-end justify-between gap-2 mb-6">
                <div>
                  <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Suburb Intelligence</p>
                  <h2 className="text-xl md:text-3xl font-extrabold text-slate-900">Top investment suburbs</h2>
                  <p className="text-sm text-slate-500 mt-1">Ranked by 10-year capital growth — updated quarterly.</p>
                </div>
                <Link href="/property/suburbs" className="text-xs md:text-sm font-bold text-amber-600 hover:text-amber-700 shrink-0 min-h-[44px] inline-flex items-center gap-1 px-1 group">
                  Research all <span className="group-hover:translate-x-0.5 transition-transform">&rarr;</span>
                </Link>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left px-4 md:px-6 py-3 font-semibold text-slate-500 text-xs w-8">#</th>
                        <th className="text-left px-2 py-3 font-semibold text-slate-500 text-xs">Suburb</th>
                        <th className="text-right px-3 py-3 font-semibold text-slate-500 text-xs hidden md:table-cell">Median House</th>
                        <th className="text-right px-3 py-3 font-semibold text-slate-500 text-xs">Rental Yield</th>
                        <th className="text-right px-3 md:px-6 py-3 font-semibold text-slate-500 text-xs">10yr Growth</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topSuburbs!.map((s, i) => (
                        <tr key={`${s.suburb}-${s.state}`} className="border-b border-slate-100 last:border-b-0 hover:bg-amber-50/40 transition-colors">
                          <td className="px-4 md:px-6 py-3.5 text-xs font-bold text-slate-300">
                            {String(i + 1).padStart(2, "0")}
                          </td>
                          <td className="px-2 py-3.5">
                            <span className="font-bold text-slate-900">{s.suburb}</span>
                            <span className="text-xs text-slate-400 ml-1.5 bg-slate-100 px-1.5 py-0.5 rounded-md">{s.state}</span>
                          </td>
                          <td className="text-right px-3 py-3.5 text-slate-700 font-medium hidden md:table-cell">
                            {s.median_price_house ? formatPrice(s.median_price_house) : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="text-right px-3 py-3.5">
                            <span className="text-emerald-600 font-bold">
                              {s.rental_yield_house ? `${s.rental_yield_house}%` : <span className="text-slate-300">—</span>}
                            </span>
                          </td>
                          <td className="text-right px-3 md:px-6 py-3.5">
                            {s.capital_growth_10yr ? (
                              <GrowthBar value={s.capital_growth_10yr} max={maxGrowth} />
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-4 text-center">
                <Link href="/property/suburbs" className="inline-flex items-center gap-2 px-5 py-2.5 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-colors">
                  <Icon name="bar-chart-2" size={14} />
                  Research 2,000+ Suburbs
                </Link>
              </div>
            </div>
          </section>
        </ScrollFadeIn>
      )}

      {/* ── Buyer's Agent CTA ─────────────────────── */}
      <ScrollFadeIn>
        <section className="py-8 md:py-12 bg-slate-50 border-y border-slate-100">
          <div className="container-custom">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Buyer's agent card */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 md:p-8 flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center mb-4">
                    <Icon name="users" size={20} className="text-amber-400" />
                  </div>
                  <h3 className="text-lg md:text-xl font-bold text-white mb-2">Find a Buyer&apos;s Agent</h3>
                  <p className="text-sm text-slate-400 leading-relaxed mb-4">
                    A verified buyer&apos;s agent negotiates on your behalf, giving you access to off-market deals and saving you thousands.
                  </p>
                  <div className="flex flex-wrap gap-2 mb-5">
                    {["Off-market access", "Price negotiation", "Due diligence", "Free consult"].map((tag) => (
                      <span key={tag} className="text-[0.6rem] font-semibold text-slate-300 bg-white/10 px-2 py-1 rounded-md">{tag}</span>
                    ))}
                  </div>
                </div>
                <Link href="/property/buyer-agents" className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-amber-500 hover:bg-amber-400 text-white font-bold text-sm rounded-xl transition-colors shadow-lg shadow-amber-500/20">
                  Browse Verified Agents &rarr;
                </Link>
              </div>

              {/* Finance card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mb-4">
                    <Icon name="landmark" size={20} className="text-blue-700" />
                  </div>
                  <h3 className="text-lg md:text-xl font-bold text-slate-900 mb-2">Compare Investment Loans</h3>
                  <p className="text-sm text-slate-500 leading-relaxed mb-4">
                    Compare rates from CBA, Westpac, ANZ, NAB, Macquarie &amp; more. Find the best rate for your investment portfolio.
                  </p>
                  {/* Rate teaser */}
                  <div className="grid grid-cols-3 gap-2 mb-5">
                    {[
                      { label: "From", value: "6.49%" },
                      { label: "Up to LVR", value: "80%" },
                      { label: "Lenders", value: "8+" },
                    ].map((stat) => (
                      <div key={stat.label} className="bg-slate-50 rounded-lg p-2.5 text-center">
                        <div className="text-sm font-extrabold text-slate-900">{stat.value}</div>
                        <div className="text-[0.6rem] text-slate-400">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <Link href="/property/finance" className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl transition-colors">
                  Compare Loan Rates &rarr;
                </Link>
              </div>
            </div>
          </div>
        </section>
      </ScrollFadeIn>

      {/* ── Foreign Investor Callout ──────────────── */}
      <ScrollFadeIn>
        <section className="py-8 md:py-10 bg-white border-t border-slate-100">
          <div className="container-custom">
            <div className="bg-gradient-to-r from-violet-50 to-slate-50 border border-violet-200 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center gap-5 md:gap-8">
              <div className="w-12 h-12 bg-violet-600 rounded-2xl flex items-center justify-center shrink-0 shadow-md">
                <Icon name="globe" size={22} className="text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-base md:text-lg font-extrabold text-slate-900 mb-1">
                  Buying Australian property as a foreign investor?
                </h3>
                <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
                  Understand FIRB approval requirements, state stamp duty surcharges (7–8%), eligible property types, and application fees before you buy. Our guide covers everything foreign non-residents and temporary visa holders need to know.
                </p>
              </div>
              <Link
                href="/property/foreign-investment"
                className="shrink-0 px-5 py-3 bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm rounded-xl transition-colors shadow-sm text-center whitespace-nowrap"
              >
                Read the FIRB Guide &rarr;
              </Link>
            </div>
          </div>
        </section>
      </ScrollFadeIn>

      {/* ── Property Disclaimer ───────────────────── */}
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
