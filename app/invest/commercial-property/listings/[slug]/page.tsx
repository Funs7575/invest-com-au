import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import Icon from "@/components/Icon";
import ListingCard, { type InvestmentListing } from "@/components/ListingCard";
import ListingEnquiryForm from "@/components/ListingEnquiryForm";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("investment_listings")
    .select("title, description, location_city, location_state, key_metrics")
    .eq("slug", slug)
    .eq("vertical", "commercial_property")
    .single();

  if (!data) return { title: "Commercial Property" };
  const yld = (data.key_metrics as Record<string, unknown>)?.yield_percent;
  const location = [data.location_city, data.location_state].filter(Boolean).join(", ");
  const title = `${data.title}${yld ? ` — ${yld}% Yield` : ""}${location ? ` in ${location}` : ""} (${CURRENT_YEAR})`;
  return {
    title,
    description: data.description?.slice(0, 160) ?? `Commercial property for sale. ${location}`,
    alternates: { canonical: `${SITE_URL}/invest/commercial-property/listings/${slug}` },
    openGraph: { title, url: `${SITE_URL}/invest/commercial-property/listings/${slug}` },
  };
}

function formatCents(cents: number): string {
  if (cents >= 1_000_000_00) return `$${(cents / 1_000_000_00).toFixed(1)}M`;
  if (cents >= 1_000_00) return `$${(cents / 1_000_00).toFixed(0)}K`;
  return `$${(cents / 100).toLocaleString("en-AU")}`;
}

export default async function CommercialListingDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: listing } = await supabase
    .from("investment_listings")
    .select("*")
    .eq("slug", slug)
    .eq("vertical", "commercial_property")
    .single();

  if (!listing) notFound();
  const l = listing as InvestmentListing;

  const { data: related } = await supabase
    .from("investment_listings")
    .select("*")
    .eq("vertical", "commercial_property")
    .eq("status", "active")
    .neq("slug", slug)
    .limit(3);

  const relatedListings = (related ?? []) as InvestmentListing[];
  const km = l.key_metrics ?? {};
  const location = [l.location_city, l.location_state].filter(Boolean).join(", ");

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: `${SITE_URL}/invest` },
    { name: "Commercial Property", url: `${SITE_URL}/invest/commercial-property` },
    { name: "Listings", url: `${SITE_URL}/invest/commercial-property/listings` },
    { name: l.title },
  ]);

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />

      <section className="bg-white border-b border-slate-100 py-12">
        <div className="container-custom">
          <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-4" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-slate-900 transition-colors">Home</Link>
            <Icon name="chevron-right" size={12} className="text-slate-300" />
            <Link href="/invest/commercial-property/listings" className="hover:text-slate-900 transition-colors">Commercial Properties</Link>
            <Icon name="chevron-right" size={12} className="text-slate-300" />
            <span className="text-slate-900 font-medium truncate max-w-[160px]">{l.title}</span>
          </nav>

          <div className="flex flex-wrap gap-2 mb-3">
            {l.listing_type === "featured" && (
              <span className="bg-amber-500 text-slate-900 text-xs font-bold px-2.5 py-0.5 rounded-full">Featured</span>
            )}
            {l.firb_eligible && (
              <span className="bg-blue-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">FIRB Eligible</span>
            )}
            {l.industry && (
              <span className="bg-blue-800 text-blue-100 text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize">
                {l.industry.replace(/_/g, " ")}
              </span>
            )}
            {!!km.yield_percent && (
              <span className="bg-green-600 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
                {Number(km.yield_percent).toFixed(1)}% Yield
              </span>
            )}
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold mb-2 text-slate-900">{l.title}</h1>
          {location && (
            <div className="flex items-center gap-1.5 text-slate-600 text-sm">
              <Icon name="map-pin" size={14} />
              {location}
            </div>
          )}
        </div>
      </section>

      <section className="py-10 bg-slate-50">
        <div className="container-custom">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Asking Price</p>
                    <p className="text-3xl font-extrabold text-slate-900">
                      {l.price_display ?? (l.asking_price_cents ? formatCents(l.asking_price_cents) : "Price on application")}
                    </p>
                  </div>
                  {!!km.yield_percent && (
                    <div className="text-right">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Net Yield</p>
                      <p className="text-xl font-bold text-green-700">{Number(km.yield_percent).toFixed(1)}% p.a.</p>
                    </div>
                  )}
                </div>
              </div>

              {Object.keys(km).length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl p-6">
                  <h2 className="text-base font-bold text-slate-900 mb-4">Property Details</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {Object.entries(km).map(([key, value]) => (
                      <div key={key} className="bg-slate-50 rounded-lg p-3">
                        <p className="text-xs text-slate-500 capitalize mb-1">{key.replace(/_/g, " ")}</p>
                        <p className="text-sm font-bold text-slate-900">{String(value)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {l.description && (
                <div className="bg-white border border-slate-200 rounded-xl p-6">
                  <h2 className="text-base font-bold text-slate-900 mb-3">About This Property</h2>
                  <div className="prose prose-slate prose-sm max-w-none">
                    {l.description.split("\n").map((para, i) => (
                      <p key={i}>{para}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-5">
              <div className="bg-white border border-slate-200 rounded-xl p-6 sticky top-20">
                <h2 className="text-base font-bold text-slate-900 mb-1">Enquire About This Property</h2>
                <p className="text-xs text-slate-500 mb-4">Confidential enquiry to the listing agent.</p>
                <ListingEnquiryForm listingId={l.id} listingTitle={l.title} vertical="commercial_property" />
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex gap-6">
                <div className="text-center">
                  <p className="text-lg font-bold text-slate-900">{l.views ?? 0}</p>
                  <p className="text-xs text-slate-500">Views</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-slate-900">{l.enquiries ?? 0}</p>
                  <p className="text-xs text-slate-500">Enquiries</p>
                </div>
              </div>
            </div>
          </div>

          {relatedListings.length > 0 && (
            <div className="mt-12">
              <h2 className="text-xl font-extrabold text-slate-900 mb-6">Similar Commercial Properties</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {relatedListings.map((rel) => (
                  <ListingCard key={rel.id} listing={rel} vertical="commercial_property" />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="py-10 bg-white border-t border-slate-100">
        <div className="container-custom text-center">
          <Link
            href="/invest/commercial-property/listings"
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-6 py-3 rounded-xl transition-colors"
          >
            Browse All Commercial Properties
            <Icon name="arrow-right" size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}
