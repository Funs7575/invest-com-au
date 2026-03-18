import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { breadcrumbJsonLd, SITE_URL } from "@/lib/seo";
import { OFF_THE_PLAN_WARNING, PROPERTY_DISCLAIMER_SHORT, PROPERTY_INDICATIVE_PRICES, PROPERTY_TAX_NOTE } from "@/lib/compliance";
import Icon from "@/components/Icon";
import PropertyEnquiryForm from "./PropertyEnquiryForm";

export const revalidate = 3600;

function formatPrice(cents: number): string {
  if (cents >= 100000000) return `$${(cents / 100000000).toFixed(1)}M`;
  if (cents >= 100000) return `$${Math.round(cents / 100000)}k`;
  return `$${(cents / 100).toLocaleString()}`;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: listing } = await supabase
    .from("property_listings")
    .select("title, city, suburb, state, description, price_from_cents, rental_yield_estimate")
    .eq("slug", slug)
    .single();

  if (!listing) return { title: "Listing Not Found" };

  return {
    title: `${listing.title} — ${listing.suburb}, ${listing.state} — Property Investment`,
    description: listing.description?.slice(0, 160) || `${listing.title} in ${listing.suburb}, ${listing.city}. From ${formatPrice(listing.price_from_cents)}.`,
    openGraph: {
      title: `${listing.title} — ${listing.suburb} — Invest.com.au`,
      description: listing.description?.slice(0, 160),
      url: `/property/listings/${slug}`,
    },
    alternates: { canonical: `/property/listings/${slug}` },
  };
}

export default async function PropertyListingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: listing } = await supabase
    .from("property_listings")
    .select("*, property_developers(id, slug, name, logo_url, website, description, projects_completed, contact_email)")
    .eq("slug", slug)
    .single();

  if (!listing) notFound();

  // Get suburb stats
  const { data: suburbData } = await supabase
    .from("suburb_data")
    .select("*")
    .eq("suburb", listing.suburb)
    .eq("state", listing.state)
    .single();

  // Related listings
  const { data: relatedListings } = await supabase
    .from("property_listings")
    .select("id, slug, title, city, suburb, price_from_cents, rental_yield_estimate")
    .eq("city", listing.city)
    .neq("id", listing.id)
    .eq("status", "active")
    .limit(3);

  const developer = listing.property_developers as {
    id: number; slug: string; name: string; logo_url: string | null;
    website: string | null; description: string | null; projects_completed: number | null; contact_email: string | null;
  } | null;

  const highlights = (listing.investment_highlights as string[]) || [];

  return (
    <div className="bg-white min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd([
            { name: "Home", url: SITE_URL },
            { name: "Property", url: `${SITE_URL}/property` },
            { name: "Listings", url: `${SITE_URL}/property/listings` },
            { name: listing.title },
          ])),
        }}
      />

      <div className="container-custom py-6 md:py-8">
        {/* Breadcrumb */}
        <nav className="text-xs text-slate-400 mb-4 flex items-center gap-1.5">
          <Link href="/" className="hover:text-slate-600">Home</Link>
          <span>/</span>
          <Link href="/property" className="hover:text-slate-600">Property</Link>
          <span>/</span>
          <Link href="/property/listings" className="hover:text-slate-600">Listings</Link>
          <span>/</span>
          <span className="text-slate-600">{listing.title}</span>
        </nav>

        <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Left Column — 2/3 */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image Gallery placeholder */}
            <div className="aspect-[16/9] bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center relative">
              <Icon name="building" size={60} className="text-slate-300" />
              <div className="absolute bottom-3 left-3 flex gap-2">
                {listing.sponsored && (
                  <span className="text-[0.6rem] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">Sponsored</span>
                )}
                <span className="text-[0.65rem] font-bold uppercase tracking-wider text-slate-600 bg-white/90 px-2 py-0.5 rounded-full">
                  {listing.property_type === "house_land" ? "House & Land" : listing.property_type === "townhouse" ? "Townhouse" : "Apartment"}
                </span>
              </div>
            </div>

            {/* Title & Key Stats */}
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  {listing.city} &middot; {listing.suburb}, {listing.state}
                </span>
                {listing.firb_approved && (
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">FIRB Approved</span>
                )}
                {listing.off_the_plan && (
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Off the Plan</span>
                )}
                {listing.status === "coming_soon" && (
                  <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Coming Soon</span>
                )}
              </div>

              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-1">{listing.title}</h1>
              <p className="text-sm text-slate-400">{listing.address_display}</p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-extrabold text-slate-900">{formatPrice(listing.price_from_cents)}</p>
                  <p className="text-[0.65rem] text-slate-400">From (indicative)</p>
                </div>
                {listing.price_to_cents && (
                  <div className="bg-slate-50 rounded-xl p-3 text-center">
                    <p className="text-lg font-extrabold text-slate-900">{formatPrice(listing.price_to_cents)}</p>
                    <p className="text-[0.65rem] text-slate-400">To (indicative)</p>
                  </div>
                )}
                {listing.rental_yield_estimate && (
                  <div className="bg-emerald-50 rounded-xl p-3 text-center">
                    <p className="text-lg font-extrabold text-emerald-700">{listing.rental_yield_estimate}%</p>
                    <p className="text-[0.65rem] text-emerald-600">Est. Yield (pre-tax)</p>
                  </div>
                )}
                {listing.bedrooms_min && (
                  <div className="bg-slate-50 rounded-xl p-3 text-center">
                    <p className="text-lg font-extrabold text-slate-900">
                      {listing.bedrooms_min}{listing.bedrooms_max && listing.bedrooms_max !== listing.bedrooms_min ? `–${listing.bedrooms_max}` : ""}
                    </p>
                    <p className="text-[0.65rem] text-slate-400">Bedrooms</p>
                  </div>
                )}
              </div>
            </div>

            {/* Indicative price note */}
            <p className="text-[0.62rem] text-slate-400 leading-relaxed -mt-2">
              {PROPERTY_INDICATIVE_PRICES}
            </p>

            {/* Description */}
            {listing.description && (
              <div>
                <h2 className="text-lg font-bold text-slate-900 mb-2">About This Development</h2>
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{listing.description}</p>
              </div>
            )}

            {/* Investment Highlights */}
            {highlights.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-slate-900 mb-3">Investment Highlights</h2>
                <ul className="space-y-2">
                  {highlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Icon name="check-circle" size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                      <span className="text-sm text-slate-700">{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Suburb Stats Panel */}
            {suburbData && (
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
                <h2 className="text-lg font-bold text-slate-900 mb-3">
                  {suburbData.suburb}, {suburbData.state} — Suburb Stats
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {suburbData.median_price_house && (
                    <div>
                      <p className="text-xs text-slate-400">Median House</p>
                      <p className="font-bold text-slate-900">{formatPrice(suburbData.median_price_house)}</p>
                    </div>
                  )}
                  {suburbData.median_price_unit && (
                    <div>
                      <p className="text-xs text-slate-400">Median Unit</p>
                      <p className="font-bold text-slate-900">{formatPrice(suburbData.median_price_unit)}</p>
                    </div>
                  )}
                  {suburbData.rental_yield_house && (
                    <div>
                      <p className="text-xs text-slate-400">Rental Yield (House)</p>
                      <p className="font-bold text-emerald-600">{suburbData.rental_yield_house}%</p>
                    </div>
                  )}
                  {suburbData.vacancy_rate != null && (
                    <div>
                      <p className="text-xs text-slate-400">Vacancy Rate</p>
                      <p className="font-bold text-slate-900">{suburbData.vacancy_rate}%</p>
                    </div>
                  )}
                  {suburbData.capital_growth_10yr && (
                    <div>
                      <p className="text-xs text-slate-400">10yr Capital Growth</p>
                      <p className="font-bold text-amber-600">{suburbData.capital_growth_10yr}%</p>
                    </div>
                  )}
                  {suburbData.population && (
                    <div>
                      <p className="text-xs text-slate-400">Population</p>
                      <p className="font-bold text-slate-900">{suburbData.population.toLocaleString()}</p>
                    </div>
                  )}
                </div>
                <Link href="/property/suburbs" className="inline-flex items-center gap-1 mt-3 text-xs font-semibold text-amber-600 hover:text-amber-700">
                  Research more suburbs &rarr;
                </Link>
                <p className="text-[0.62rem] text-slate-400 mt-2 leading-relaxed">{PROPERTY_TAX_NOTE}</p>
              </div>
            )}

            {/* Completion */}
            {listing.completion_date && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Icon name="calendar" size={16} className="text-slate-400" />
                <span>Expected completion: <strong className="text-slate-900">{listing.completion_date}</strong></span>
              </div>
            )}
          </div>

          {/* Right Column — 1/3 Sticky */}
          <div className="lg:col-span-1 space-y-4">
            <div className="lg:sticky lg:top-24 space-y-4">
              {/* Enquiry Form */}
              <PropertyEnquiryForm
                listingId={listing.id}
                listingTitle={listing.title}
                developerName={developer?.name || listing.developer_name || "Developer"}
              />

              {/* Developer Card */}
              {developer && (
                <div className="border border-slate-200 rounded-2xl p-5">
                  <h3 className="text-sm font-bold text-slate-900 mb-2">About the Developer</h3>
                  <p className="font-semibold text-slate-900">{developer.name}</p>
                  {developer.description && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-3">{developer.description}</p>
                  )}
                  {developer.projects_completed && (
                    <p className="text-xs text-slate-400 mt-2">{developer.projects_completed}+ projects completed</p>
                  )}
                  {developer.website && (
                    <a href={developer.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-amber-600 hover:text-amber-700">
                      Visit website &rarr;
                    </a>
                  )}
                </div>
              )}

              {/* Related Listings */}
              {(relatedListings?.length || 0) > 0 && (
                <div className="border border-slate-200 rounded-2xl p-5">
                  <h3 className="text-sm font-bold text-slate-900 mb-3">More in {listing.city}</h3>
                  <div className="space-y-3">
                    {relatedListings!.map((r) => (
                      <Link key={r.id} href={`/property/listings/${r.slug}`} className="block group">
                        <p className="text-sm font-semibold text-slate-900 group-hover:text-amber-600">{r.title}</p>
                        <p className="text-xs text-slate-400">{r.suburb} &middot; From {formatPrice(r.price_from_cents)}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Buyer Agent CTA */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-center">
                <p className="text-sm font-bold text-slate-900 mb-1">Need help buying?</p>
                <p className="text-xs text-slate-500 mb-3">A buyer&apos;s agent can negotiate on your behalf.</p>
                <Link href="/property/buyer-agents" className="inline-block px-5 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800 transition-all">
                  Find a Buyer&apos;s Agent
                </Link>
              </div>

              {/* Off-the-plan Disclaimer */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-[0.6rem] md:text-xs font-bold text-amber-800 mb-1">Off-the-Plan Risk Warning</p>
                <p className="text-[0.56rem] md:text-[0.65rem] text-amber-700 leading-relaxed">{OFF_THE_PLAN_WARNING}</p>
                <p className="text-[0.56rem] md:text-[0.6rem] text-amber-600 mt-1.5">{PROPERTY_DISCLAIMER_SHORT}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
